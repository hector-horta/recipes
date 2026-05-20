import { Op } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { ActivityLogger } from './ActivityLogger.js';
import { RecipeProvider } from './RecipeProvider.js';

export class NutriRecipeService {
  /**
   * Obtiene recetas visibles para la organización del nutricionista:
   * las de su organización (organizationId) y las globales (null).
   * Soporta paginación opcional a través de number y offset.
   */
  static async getNutriRecipes(organizationId, number, offset) {
    const whereClause = {
      [Op.or]: [
        { organization_id: organizationId },
        { organization_id: null }
      ]
    };

    if (number !== undefined || offset !== undefined) {
      const limit = Math.min(Math.max(parseInt(number, 10) || 10, 1), 100);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const { count, rows } = await Recipe.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit,
        offset: parsedOffset,
        distinct: true,
        col: 'Recipe.id'
      });
      return { recipes: rows, total: count };
    } else {
      const recipes = await Recipe.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });
      return recipes;
    }
  }

  /**
   * Crea una receta asociada a la organización del nutricionista.
   * Limpia el caché de RecipeProvider tras la creación.
   */
  static async createNutriRecipe(organizationId, data) {
    if (!organizationId) {
      const error = new Error('Se requiere organization_id para crear una receta de organización.');
      error.status = 400;
      throw error;
    }

    const recipeData = {
      ...data,
      organization_id: organizationId,
      source_type: 'manual'
    };

    const recipe = await Recipe.create(recipeData);
    ActivityLogger.log('NUTRI_RECIPE_CREATE', { recipeId: recipe.id, organizationId, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return recipe;
  }

  /**
   * Actualiza una receta específica de la organización.
   * No permite modificar recetas globales u otras organizaciones.
   */
  static async updateNutriRecipe(id, organizationId, data) {
    const recipe = await Recipe.findByPk(id);

    if (!recipe || recipe.organization_id !== organizationId) {
      const error = new Error('Receta no encontrada o no autorizada.');
      error.status = 404;
      throw error;
    }

    // Asegurar que no se altere la pertenencia a la organización
    const updateData = {
      ...data,
      organization_id: organizationId
    };

    await recipe.update(updateData);
    ActivityLogger.log('NUTRI_RECIPE_UPDATE', { recipeId: recipe.id, organizationId, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return recipe;
  }

  /**
   * Elimina una receta específica de la organización.
   */
  static async deleteNutriRecipe(id, organizationId) {
    const recipe = await Recipe.findByPk(id);

    if (!recipe || recipe.organization_id !== organizationId) {
      const error = new Error('Receta no encontrada o no autorizada.');
      error.status = 404;
      throw error;
    }

    await recipe.destroy();
    ActivityLogger.log('NUTRI_RECIPE_DELETE', { recipeId: id, organizationId, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return { message: 'Receta de organización eliminada correctamente' };
  }
}
