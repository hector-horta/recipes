import { Op } from 'sequelize';
import { NutritionalPlan } from '../models/NutritionalPlan.js';
import { Recipe } from '../models/Recipe.js';
import { Ingredient } from '../models/Ingredient.js';
import { User } from '../models/User.js';

export class IngredientConsolidatorService {
  /**
   * Consolida todos los ingredientes requeridos para los planes nutricionales activos de los pacientes provistos.
   * 
   * @param {Array<string>} patientIds - Lista de IDs de pacientes (UUIDs)
   * @returns {Promise<Object>} Resultado de la consolidación
   */
  static async consolidateIngredients(patientIds) {
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return { success: true, patients: [], ingredients: [] };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Obtener los planes activos de los pacientes
    const activePlans = await NutritionalPlan.findAll({
      where: {
        patient_id: { [Op.in]: patientIds },
        start_date: { [Op.lte]: todayStr },
        end_date: { [Op.gte]: todayStr }
      },
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'display_name', 'email']
        }
      ]
    });

    if (activePlans.length === 0) {
      return {
        success: true,
        patients: [],
        ingredients: [],
        message: 'No se encontraron planes nutricionales activos para los pacientes seleccionados en el rango de fechas de hoy.'
      };
    }

    // Listado de pacientes incluidos
    const patients = activePlans.map(plan => ({
      id: plan.patient.id,
      displayName: plan.patient.display_name,
      email: plan.patient.email,
      planTitle: plan.title
    }));

    // 2. Contar la frecuencia de aparición de cada receta en los planes
    // Estructura: { [recipeId]: count }
    const recipeCounts = {};

    activePlans.forEach(plan => {
      const meals = Array.isArray(plan.meals) ? plan.meals : [];
      meals.forEach(daySchedule => {
        const dayMeals = Array.isArray(daySchedule.meals) ? daySchedule.meals : [];
        dayMeals.forEach(meal => {
          if (meal.recipeId) {
            recipeCounts[meal.recipeId] = (recipeCounts[meal.recipeId] || 0) + 1;
          }
        });
      });
    });

    const recipeIds = Object.keys(recipeCounts);
    if (recipeIds.length === 0) {
      return { success: true, patients, ingredients: [] };
    }

    // 3. Obtener los datos completos de las recetas con sus ingredientes asociados
    const recipes = await Recipe.findAll({
      where: { id: { [Op.in]: recipeIds } },
      include: [
        {
          model: Ingredient,
          as: 'recipeIngredients',
          through: { attributes: ['quantity', 'quantity_numeric', 'unit_es', 'unit_en', 'sibo_alert'] }
        }
      ]
    });

    // 4. Consolidar ingredientes
    // Agrupación por: ingredientId + unit_es (para evitar sumar gramos con tazas directamente)
    const consolidationMap = {};

    recipes.forEach(recipe => {
      const servings = recipe.servings || 1;
      const occurrences = recipeCounts[recipe.id] || 0;
      // Factor: proporción que representa cada porción consumida sobre el total de porciones de la receta base
      const portionFactor = occurrences / servings;

      const recIngredients = recipe.recipeIngredients || [];
      recIngredients.forEach(ing => {
        const join = ing.RecipeIngredient || {};
        const unitEs = (join.unit_es || '').trim().toLowerCase();
        const unitEn = (join.unit_en || unitEs).trim().toLowerCase();

        // Clave única de agrupación
        const key = `${ing.id}_${unitEs}`;

        const qtyNum = join.quantity_numeric ? parseFloat(join.quantity_numeric) : null;

        if (!consolidationMap[key]) {
          consolidationMap[key] = {
            ingredientId: ing.id,
            nameEs: ing.name_es,
            nameEn: ing.name_en,
            unitEs: join.unit_es || '',
            unitEn: join.unit_en || '',
            totalQuantityNumeric: 0,
            hasNumeric: true,
            rawQuantities: [], // Para reportar textos si no es sumable
            siboAlert: false
          };
        }

        const item = consolidationMap[key];

        if (join.sibo_alert) {
          item.siboAlert = true;
        }

        if (qtyNum !== null && !isNaN(qtyNum)) {
          item.totalQuantityNumeric += qtyNum * portionFactor;
          // Guardar el aporte individual redondeado a 2 decimales para la lista de traza
          item.rawQuantities.push(`${(qtyNum * portionFactor).toFixed(2)} ${item.unitEs}`.trim());
        } else {
          item.hasNumeric = false;
          if (join.quantity) {
            item.rawQuantities.push(`${join.quantity} ${item.unitEs}`.trim());
          }
        }
      });
    });

    // 5. Convertir mapa de consolidación a un arreglo estructurado
    const consolidatedList = Object.values(consolidationMap).map(item => {
      let finalQuantityString = '';

      if (item.hasNumeric && item.totalQuantityNumeric > 0) {
        // Redondear a 2 decimales si tiene decimales significativos
        const rounded = Math.round(item.totalQuantityNumeric * 100) / 100;
        finalQuantityString = `${rounded}`;
      } else {
        // Si no es completamente numérico, consolidar en base a texto o marcar como "necesario"
        const uniqueRaw = [...new Set(item.rawQuantities)];
        finalQuantityString = uniqueRaw.length > 0 ? uniqueRaw.join(' + ') : 'al gusto';
      }

      return {
        ingredientId: item.ingredientId,
        nameEs: item.nameEs,
        nameEn: item.nameEn,
        quantity: finalQuantityString,
        quantityNumeric: item.hasNumeric ? item.totalQuantityNumeric : null,
        unitEs: item.unitEs,
        unitEn: item.unitEn,
        siboAlert: item.siboAlert
      };
    });

    // Ordenar ingredientes alfabéticamente por nombre en español
    consolidatedList.sort((a, b) => a.nameEs.localeCompare(b.nameEs));

    return {
      success: true,
      patients,
      ingredients: consolidatedList
    };
  }
}
