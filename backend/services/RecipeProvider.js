import { Op, where, cast, col } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';
import crypto from 'crypto';

const CACHE_TTL_SECONDS = 3600; // 1 hour

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    const { query, number = 10 } = params;

    const whereClause = { status: 'published' };

    if (query && query.trim()) {
      const q = query.trim();
      whereClause[Op.or] = [
        { title_es: { [Op.iLike]: `%${q}%` } },
        { title_en: { [Op.iLike]: `%${q}%` } },
        where(cast(col('tags'), 'text'), { [Op.iLike]: `%${q}%` })
      ];
    }

    const hasSiboFilter = userProfile && userProfile.intolerances && userProfile.intolerances.some(i => i.toLowerCase() === 'sibo');
    if (hasSiboFilter) {
      whereClause.sibo_risk_level = { [Op.ne]: 'avoid' };
    }

    const cachePayload = {
      q: query || '',
      n: number,
      sibo: hasSiboFilter ? 1 : 0
    };
    const cacheHash = crypto.createHash('md5').update(JSON.stringify(cachePayload)).digest('hex');
    const cacheKey = `recipes:${cacheHash}`;

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
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(number, 10) || 10
    });

    const results = recipes.map(r => this.normalizeRecipe(r.toJSON()));

    try {
      if (redisClient.isReady) {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(results));
        console.log(`[Cache] Cached query results for key: ${cacheKey} (TTL: 1h)`);
      }
    } catch (err) {
      console.warn('[Cache] Error writing to Redis:', err.message);
    }

    return results;
  }

  static normalizeRecipe(recipe) {
    const ingredients = (recipe.ingredients || []).map(i => ({
      id: i.name?.es || i.name || 'unknown',
      name: i.name?.es || i.name || 'Desconocido',
      nameEn: i.name?.en || '',
      quantity: i.quantity || '',
      unit: typeof i.unit === 'object' ? (i.unit?.es || '') : (i.unit || ''),
      unitEn: typeof i.unit === 'object' ? (i.unit?.en || '') : '',
      siboAlert: i.siboAlert || false
    }));

    const instructions = (recipe.steps || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => s.instruction?.es || s.instruction || '');

    if (instructions.length === 0) {
      instructions.push('Sin instrucciones disponibles.');
    }

    const imageUrl = recipe.image_url || '';

    const siboAllergiesTags = (recipe.tags || [])
      .map(t => typeof t === 'object' && t.es ? t : { es: t, en: t })
      .filter(t => t.es && t.es.trim() !== '');

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
      siboAllergiesTags,
      siboAlerts: recipe.sibo_alerts || []
    };
  }

  static async clearCache() {
    try {
      if (redisClient.isReady) {
        const keys = await redisClient.keys('recipes:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
          console.log(`[Cache] Invalidadas ${keys.length} claves de recetas`);
        }
      }
    } catch (err) {
      console.warn('[Cache] Error invalidando cache:', err.message);
    }
  }
}
