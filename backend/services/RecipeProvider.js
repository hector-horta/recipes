import { Op, where, cast, col } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';
import { MEDICAL_TRIGGERS } from '../config/medicalTriggers.js';
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

    const userIntolerances = userProfile?.intolerances || [];
    const hasSiboFilter = userIntolerances.some(i => i.toLowerCase() === 'sibo');

    // Identificar activadores médicos para las intolerancias del usuario
    const activeTriggers = [];
    userIntolerances.forEach(intolerance => {
      const triggers = MEDICAL_TRIGGERS[intolerance.toLowerCase()];
      if (triggers) activeTriggers.push(...triggers);
    });

    const cachePayload = {
      q: query || '',
      n: number,
      intolerances: userIntolerances.sort(),
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

    const requestedLimit = parseInt(number, 10) || 10;

    // Buscamos todas las candidatas y filtramos por intolerancias específicas si es necesario
    const recipes = await Recipe.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: activeTriggers.length > 0 ? requestedLimit * 5 : requestedLimit
    });

    let results = recipes.map(r => this.normalizeRecipe(r.toJSON()));

    // Filtrado por intolerancias (Personalización)
    if (userIntolerances.length > 0) {
      results = results.filter(recipe => {
        // 1. Filtrado SIBO (usando campo específico sibo_risk_level)
        if (hasSiboFilter && recipe.safetyLevel === 'unsafe') {
          return false;
        }

        // 2. Filtrado General por Ingredientes (Triggers)
        // Si el usuario tiene intolerancias, comprobamos si alguno de los ingredientes de la receta
        // contiene palabras prohibidas según MEDICAL_TRIGGERS.
        const ingredientsString = recipe.ingredients
          .map(ing => (ing.name || '').toLowerCase())
          .join(' ');

        const hasForbiddenIngredient = activeTriggers.some(trigger => 
          ingredientsString.includes(trigger.toLowerCase())
        );

        if (hasForbiddenIngredient) {
          return false;
        }

        return true;
      });
    }

    // Aplicar límite final después del filtrado
    results = results.slice(0, requestedLimit);

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
      isBorderlineSafe: i.siboAlert || i.isBorderlineSafe || false
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
