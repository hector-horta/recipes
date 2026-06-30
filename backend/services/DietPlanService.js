import { Op } from 'sequelize';
import { NutritionalPlan } from '../models/NutritionalPlan.js';
import { User } from '../models/User.js';
import { Recipe } from '../models/Recipe.js';
import { ActivityLogger } from './ActivityLogger.js';

export class DietPlanService {
  /**
   * Crea un nuevo plan nutricional para un paciente.
   * Valida que el paciente exista y que no se solape con otro plan activo del mismo paciente.
   */
  static async createPlan(data, creatorId, organizationId) {
    const { patient_id, title, start_date, end_date, meals, notes } = data;

    // Verificar que el paciente exista
    const patient = await User.findByPk(patient_id);
    if (!patient) {
      const error = new Error('El paciente especificado no existe.');
      error.status = 404;
      throw error;
    }

    // Validar solapamiento de fechas para este paciente
    const overlapping = await NutritionalPlan.findOne({
      where: {
        patient_id,
        [Op.or]: [
          {
            start_date: { [Op.between]: [start_date, end_date] }
          },
          {
            end_date: { [Op.between]: [start_date, end_date] }
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: start_date } },
              { end_date: { [Op.gte]: end_date } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      const error = new Error(`El paciente ya tiene un plan alimentario asignado entre ${overlapping.start_date} y ${overlapping.end_date}.`);
      error.status = 409;
      throw error;
    }

    const plan = await NutritionalPlan.create({
      patient_id,
      organization_id: organizationId || null,
      created_by: creatorId,
      title,
      start_date,
      end_date,
      meals,
      notes
    });

    ActivityLogger.log('NUTRI_PLAN_CREATE', { planId: plan.id, patientId: patient_id, creatorId });
    return plan;
  }

  /**
   * Obtiene la lista de planes nutricionales creados por el profesional
   * o asociados a su organización.
   */
  static async getPlans(creatorId, organizationId) {
    const whereClause = {
      [Op.or]: [
        { created_by: creatorId }
      ]
    };

    if (organizationId) {
      whereClause[Op.or].push({ organization_id: organizationId });
    }

    const plans = await NutritionalPlan.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'display_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return plans;
  }

  /**
   * Obtiene los detalles de un plan nutricional por su ID.
   */
  static async getPlanDetails(id, creatorId, organizationId) {
    const plan = await NutritionalPlan.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['id', 'display_name', 'email']
        }
      ]
    });

    if (!plan) {
      const error = new Error('Plan nutricional no encontrado.');
      error.status = 404;
      throw error;
    }

    // Verificar autorización
    if (plan.created_by !== creatorId && plan.organization_id !== organizationId) {
      const error = new Error('No autorizado para ver este plan.');
      error.status = 403;
      throw error;
    }

    return plan;
  }

  /**
   * Actualiza un plan nutricional existente.
   */
  static async updatePlan(id, data, creatorId, organizationId) {
    const plan = await NutritionalPlan.findByPk(id);

    if (!plan) {
      const error = new Error('Plan nutricional no encontrado.');
      error.status = 404;
      throw error;
    }

    // Verificar autorización
    if (plan.created_by !== creatorId && plan.organization_id !== organizationId) {
      const error = new Error('No autorizado para modificar este plan.');
      error.status = 403;
      throw error;
    }

    const { title, start_date, end_date, meals, notes, patient_id } = data;
    const activePatientId = patient_id || plan.patient_id;
    const activeStartDate = start_date || plan.start_date;
    const activeEndDate = end_date || plan.end_date;

    // Validar solapamiento de fechas excluyendo el plan actual
    const overlapping = await NutritionalPlan.findOne({
      where: {
        id: { [Op.ne]: id },
        patient_id: activePatientId,
        [Op.or]: [
          {
            start_date: { [Op.between]: [activeStartDate, activeEndDate] }
          },
          {
            end_date: { [Op.between]: [activeStartDate, activeEndDate] }
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: activeStartDate } },
              { end_date: { [Op.gte]: activeEndDate } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      const error = new Error(`El paciente ya tiene otro plan alimentario asignado entre ${overlapping.start_date} y ${overlapping.end_date}.`);
      error.status = 409;
      throw error;
    }

    await plan.update({
      title: title !== undefined ? title : plan.title,
      start_date: start_date !== undefined ? start_date : plan.start_date,
      end_date: end_date !== undefined ? end_date : plan.end_date,
      meals: meals !== undefined ? meals : plan.meals,
      notes: notes !== undefined ? notes : plan.notes,
      patient_id: activePatientId
    });

    ActivityLogger.log('NUTRI_PLAN_UPDATE', { planId: plan.id, patientId: activePatientId, creatorId });
    return plan;
  }

  /**
   * Elimina un plan nutricional existente.
   */
  static async deletePlan(id, creatorId, organizationId) {
    const plan = await NutritionalPlan.findByPk(id);

    if (!plan) {
      const error = new Error('Plan nutricional no encontrado.');
      error.status = 404;
      throw error;
    }

    // Verificar autorización
    if (plan.created_by !== creatorId && plan.organization_id !== organizationId) {
      const error = new Error('No autorizado para eliminar este plan.');
      error.status = 403;
      throw error;
    }

    await plan.destroy();
    ActivityLogger.log('NUTRI_PLAN_DELETE', { planId: id, patientId: plan.patient_id, creatorId });
    return { message: 'Plan nutricional eliminado correctamente' };
  }

  /**
   * Obtiene el plan alimenticio activo para un paciente de Wati (start_date <= hoy <= end_date)
   * poblando los datos de cada receta referenciada en la programación de comidas.
   */
  static async getActivePlanForPatient(patientId) {
    const today = new Date().toISOString().split('T')[0];

    const plan = await NutritionalPlan.findOne({
      where: {
        patient_id: patientId,
        start_date: { [Op.lte]: today },
        end_date: { [Op.gte]: today }
      },
      order: [['created_at', 'DESC']]
    });

    if (!plan) {
      return null;
    }

    // Extraer identificadores de recetas únicos
    const meals = plan.meals || [];
    const recipeIds = new Set();
    for (const dayPlan of meals) {
      for (const meal of dayPlan.meals || []) {
        if (meal.recipeId) {
          recipeIds.add(meal.recipeId);
        }
      }
    }

    const recipeMap = {};
    if (recipeIds.size > 0) {
      const recipes = await Recipe.findAll({
        where: { id: { [Op.in]: Array.from(recipeIds) } },
        attributes: ['id', 'title_es', 'title_en', 'slug', 'image_url', 'difficulty', 'prep_time_minutes']
      });
      for (const recipe of recipes) {
        recipeMap[recipe.id] = recipe.toJSON();
      }
    }

    // Mapear recetas de vuelta en la estructura de comidas
    const populatedMeals = meals.map(dayPlan => ({
      ...dayPlan,
      meals: (dayPlan.meals || []).map(meal => ({
        ...meal,
        recipe: recipeMap[meal.recipeId] || null
      }))
    }));

    return {
      id: plan.id,
      title: plan.title,
      start_date: plan.start_date,
      end_date: plan.end_date,
      notes: plan.notes,
      meals: populatedMeals,
      created_at: plan.created_at,
      updated_at: plan.updated_at
    };
  }

  /**
   * Obtiene una lista de pacientes únicos a quienes el profesional o su organización
   * les ha asignado planes previamente.
   */
  static async getUniquePatients(creatorId, organizationId) {
    const whereClause = {
      [Op.or]: [
        { created_by: creatorId }
      ]
    };

    if (organizationId) {
      whereClause[Op.or].push({ organization_id: organizationId });
    }

    const plans = await NutritionalPlan.findAll({
      where: whereClause,
      attributes: ['patient_id'],
      group: ['patient_id']
    });

    const patientIds = plans.map(p => p.patient_id);
    if (patientIds.length === 0) {
      return [];
    }

    const patients = await User.findAll({
      where: { id: { [Op.in]: patientIds } },
      attributes: ['id', 'display_name', 'email']
    });

    return patients;
  }
}
