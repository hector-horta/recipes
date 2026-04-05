import { Op } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    const { query, number = 10 } = params;

    const where = { status: 'published' };

    if (query && query.trim()) {
      const q = query.trim();
      where[Op.or] = [
        { title_es: { [Op.iLike]: `%${q}%` } },
        { title_en: { [Op.iLike]: `%${q}%` } },
        { tags: { [Op.overlap]: [q] } }
      ];
    }

    if (userProfile && userProfile.intolerances && userProfile.intolerances.length > 0) {
      const intolerances = userProfile.intolerances.map(i => i.toLowerCase());
      if (intolerances.includes('sibo')) {
        where.sibo_risk_level = { [Op.ne]: 'avoid' };
      }
    }

    const cacheKey = `recipes:${query || ''}:${JSON.stringify(where)}`;

    try {
      if (redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`[Cache] Redis Hit para clave: ${cacheKey}`);
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      console.warn('[Cache] Error leyendo de Redis:', err.message);
    }

    const recipes = await Recipe.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(number, 10) || 10
    });

    const results = recipes.map(r => this.normalizeRecipe(r.toJSON()));

    return results;
  }

  static normalizeRecipe(recipe) {
    const ingredients = (recipe.ingredients || []).map(i => ({
      id: i.name?.es || i.name || 'unknown',
      name: i.name?.es || i.name || 'Desconocido',
      nameEn: i.name?.en || '',
      quantity: i.quantity || '',
      unit: i.unit || '',
      siboAlert: i.siboAlert || false
    }));

    const instructions = (recipe.steps || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => s.instruction?.es || s.instruction || '');

    if (instructions.length === 0) {
      instructions.push('Sin instrucciones disponibles.');
    }

    const imageUrl = recipe.image_url || '';

    return {
      id: recipe.id,
      title: recipe.title_es,
      titleEn: recipe.title_en,
      imageUrl,
      prepTimeMinutes: recipe.prep_time_minutes || 0,
      estimatedCost: 2,
      ingredients,
      instructions,
      instructionsEn: (recipe.steps || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(s => s.instruction?.en || ''),
      summary: '',
      safetyLevel: recipe.sibo_risk_level === 'safe' ? 'safe' : (recipe.sibo_risk_level === 'caution' ? 'review' : 'unsafe'),
      siboAllergiesTags: recipe.tags || [],
      siboAlerts: recipe.sibo_alerts || []
    };
  }
}
