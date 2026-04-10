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

    const cachePayload = {
      q: query || '',
      n: number,
      intolerances: userIntolerances.sort()
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
    
    // Identificar si necesitamos un buffer para el filtrado post-DB
    const hasFilters = userIntolerances.length > 0;

    // Buscamos candidatos
    const recipes = await Recipe.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: hasFilters ? requestedLimit * 5 : requestedLimit
    });

    let results = recipes.map(r => this.normalizeRecipe(r.toJSON(), userIntolerances));

    // Filtrado por intolerancias (Personalización)
    if (hasFilters) {
      results = results.filter(recipe => recipe.safetyLevel !== 'unsafe');
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

  static normalizeRecipe(recipe, userIntolerances = []) {
    const hasSibo = userIntolerances.some(i => i.toLowerCase() === 'sibo');
    
    const ingredients = (recipe.ingredients || []).map(i => {
      let isBorderlineSafe = false;
      
      // La advertencia de ingrediente limitado SÓLO aplica si el usuario tiene SIBO
      if (hasSibo && (i.siboAlert || i.isBorderlineSafe)) {
        isBorderlineSafe = true;
      }
      
      return {
        id: i.name?.es || i.name || 'unknown',
        name: i.name?.es || i.name || 'Desconocido',
        nameEn: i.name?.en || '',
        quantity: i.quantity || '',
        unit: typeof i.unit === 'object' ? (i.unit?.es || '') : (i.unit || ''),
        unitEn: typeof i.unit === 'object' ? (i.unit?.en || '') : '',
        isBorderlineSafe
      };
    });

    // 2. Determinar safetyLevel dinámicamente
    let safetyLevel = 'safe';

    // A) Evaluación por campo SIBO (si el usuario tiene SIBO)
    let siboCurated = false;
    if (hasSibo) {
      if (recipe.sibo_risk_level === 'avoid') {
        safetyLevel = 'unsafe';
        siboCurated = true;
      } else if (recipe.sibo_risk_level === 'caution') {
        safetyLevel = 'review';
        siboCurated = true;
      }
    }

    // B) Evaluación por ingredientes (Triggers)
    // Identificar activadores médicos para las intolerancias del usuario
    const activeTriggers = [];
    userIntolerances.forEach(intolerance => {
      const lowerIntolerance = intolerance.toLowerCase();
      // Si la receta ya tiene una curación SIBO (avoid/caution), no re-evaluamos triggers de SIBO 
      // para evitar que un 'caution' de miel sea sobreescrito por un 'avoid' genérico de la lista de triggers.
      if (lowerIntolerance === 'sibo' && siboCurated) return;
      
      const triggers = MEDICAL_TRIGGERS[lowerIntolerance];
      if (triggers) activeTriggers.push(...triggers);
    });

    const ingredientsString = ingredients
      .map(ing => (ing.name || '').toLowerCase())
      .join(' ');

    const hasForbiddenIngredient = activeTriggers.some(trigger => 
      ingredientsString.includes(trigger.toLowerCase())
    );

    // Los triggers siempre marcan como 'unsafe' (Evitar)
    if (hasForbiddenIngredient) {
      safetyLevel = 'unsafe';
    }

    const instructions = (recipe.steps || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => s.instruction?.es || s.instruction || '');

    if (instructions.length === 0) {
      instructions.push('Sin instrucciones disponibles.');
    }

    const imageUrl = recipe.image_url || '';

    const allTags = (recipe.tags || [])
      .map(t => typeof t === 'object' && t.es ? t : { es: t, en: t })
      .filter(t => t.es && t.es.trim() !== '');

    const siboAllergiesTags = allTags.filter(t => {
      const tagText = t.es.toLowerCase();
      const isSiboRelated = tagText.includes('sibo') || tagText.includes('fructanos') || tagText.includes('fodmap');
      if (isSiboRelated) return hasSibo;
      return true;
    });

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
      safetyLevel,
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
