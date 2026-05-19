import { Recipe } from '../models/Recipe.js';
import { ActivityLogger } from './ActivityLogger.js';
import { RecipeProvider } from './RecipeProvider.js';

export class AdminRecipeService {
  /**
   * Obtiene las recetas globales de Wati (organization_id = null)
   * soporta paginación opcional a través de number y offset.
   */
  static async getGlobalRecipes(number, offset) {
    if (number !== undefined || offset !== undefined) {
      const limit = Math.min(Math.max(parseInt(number, 10) || 10, 1), 100);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

      const { count, rows } = await Recipe.findAndCountAll({
        where: { organization_id: null },
        order: [['created_at', 'DESC']],
        limit,
        offset: parsedOffset
      });
      return { recipes: rows, total: count };
    } else {
      const recipes = await Recipe.findAll({
        where: { organization_id: null },
        order: [['created_at', 'DESC']]
      });
      return recipes;
    }
  }

  /**
   * Crea una nueva receta global, forzando manual y organization_id a null.
   * Limpia el caché de RecipeProvider tras la creación.
   */
  static async createGlobalRecipe(data) {
    const recipeData = {
      ...data,
      organization_id: null,
      source_type: 'manual'
    };

    const recipe = await Recipe.create(recipeData);
    ActivityLogger.log('ADMIN_RECIPE_CREATE', { recipeId: recipe.id, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return recipe;
  }

  /**
   * Actualiza una receta global por ID.
   * Limpia el caché de RecipeProvider tras la actualización.
   */
  static async updateGlobalRecipe(id, data) {
    const recipe = await Recipe.findByPk(id);

    if (!recipe) {
      const error = new Error('Receta no encontrada.');
      error.status = 404;
      throw error;
    }

    await recipe.update(data);
    ActivityLogger.log('ADMIN_RECIPE_UPDATE', { recipeId: recipe.id, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return recipe;
  }

  /**
   * Elimina una receta global por ID.
   * Limpia el caché de RecipeProvider tras la eliminación.
   */
  static async deleteGlobalRecipe(id) {
    const recipe = await Recipe.findByPk(id);

    if (!recipe) {
      const error = new Error('Receta no encontrada.');
      error.status = 404;
      throw error;
    }

    await recipe.destroy();
    ActivityLogger.log('ADMIN_RECIPE_DELETE', { recipeId: id, title: recipe.title_es });
    await RecipeProvider.clearCache();
    return { message: 'Receta eliminada correctamente' };
  }
}
