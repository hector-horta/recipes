import { Op, where, cast, col } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';
import { MEDICAL_TRIGGERS } from '../config/medical.js';
import { ActivityLogger } from './ActivityLogger.js';
import crypto from 'crypto';

const CACHE_TTL_SECONDS = 3600; // 1 hour

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    let { query, number = 10 } = params;
    
    // Security: Ensure query is a string and reasonable length
    if (typeof query !== 'string') query = '';
    query = query.trim().slice(0, 200);

    const whereClause = { status: 'published' };

    if (query) {
      const q = query;
      // Handle simple Spanish plurals for the search query (rough approximation)
      const baseQ = q.toLowerCase().endsWith('es') ? q.slice(0, -2) : (q.toLowerCase().endsWith('s') ? q.slice(0, -1) : q);
      
      const searchTerms = [q];
      if (baseQ !== q && baseQ.length > 2) searchTerms.push(baseQ);

      const orConditions = [];
      searchTerms.forEach(term => {
        orConditions.push({ title_es: { [Op.iLike]: `%${term}%` } });
        orConditions.push({ title_en: { [Op.iLike]: `%${term}%` } });
        orConditions.push(where(cast(col('tags'), 'text'), { [Op.iLike]: `%${term}%` }));
        orConditions.push(where(cast(col('ingredients'), 'text'), { [Op.iLike]: `%${term}%` }));
      });

      whereClause[Op.or] = orConditions;
    }

    const userIntolerances = userProfile?.intolerances || [];
    const hasSiboFilter = userIntolerances.some(i => i.toLowerCase() === 'sibo');

    const cachePayload = {
      q: query || '',
      n: number,
      intolerances: userIntolerances.sort(),
      severities: userProfile?.severities || {}
    };
    const cacheHash = crypto.createHash('md5').update(JSON.stringify(cachePayload)).digest('hex');
    const cacheKey = `recipes:${cacheHash}`;

    try {
      if (redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          ActivityLogger.info('Redis cache hit', { cacheKey });
          return JSON.parse(cached);
        }
      }
    } catch (err) {
      ActivityLogger.warn('Redis cache read error', { error: err.message, cacheKey });
    }

    const requestedLimit = Math.min(Math.max(parseInt(number, 10) || 10, 1), 50);
    
    // Identificar si necesitamos un buffer para el filtrado post-DB
    const hasFilters = userIntolerances.length > 0;

    ActivityLogger.info('Recipe search initiated', { query, number: requestedLimit, hasFilters });

    // Buscamos candidatos
    const recipes = await Recipe.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: hasFilters ? requestedLimit * 5 : requestedLimit
    });

    let results = recipes.map(r => this.normalizeRecipe(r.toJSON(), userProfile));

    // Collect unsafe metadata before filtering
    let filteredUnsafeCount = 0;
    const filteredAllergenSet = new Set();

    if (hasFilters) {
      const unsafeRecipes = results.filter(r => r.safetyLevel === 'unsafe');
      filteredUnsafeCount = unsafeRecipes.length;

      // Collect which allergens triggered the filtering
      unsafeRecipes.forEach(r => {
        if (r._matchedAllergens) {
          r._matchedAllergens.forEach(a => filteredAllergenSet.add(a));
        }
      });

      // Only filter if the user did NOT request to include unsafe recipes
      const includeUnsafe = params.includeUnsafe === 'true';
      if (!includeUnsafe) {
        results = results.filter(recipe => recipe.safetyLevel !== 'unsafe');
      }
    }

    // Aplicar límite final después del filtrado
    results = results.slice(0, requestedLimit);

    // Strip internal metadata before sending to client
    results = results.map(({ _matchedAllergens, ...rest }) => rest);

    const response = {
      recipes: results,
      filteredUnsafeCount,
      filteredAllergens: [...filteredAllergenSet]
    };

    try {
      if (redisClient.isReady) {
        await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response));
        ActivityLogger.info('Cached search results', { cacheKey, ttl: CACHE_TTL_SECONDS });
      }
    } catch (err) {
      ActivityLogger.warn('Redis cache write error', { error: err.message, cacheKey });
    }

    return response;
  }

  static normalizeRecipe(recipe, userProfile) {
    const profile = userProfile || {};
    const userIntolerances = profile.intolerances || [];
    const userSeverities = profile.severities || {};
    const hasSibo = userIntolerances.some(i => i.toLowerCase() === 'sibo');
    
    // Función para normalizar texto (quitar acentos)
    const normalize = (text) => 
      (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
      const lowerIntolerance = (intolerance || '').toLowerCase();
      // Extraer ID base (ej: 'egg_anafilaxis' -> 'egg')
      const baseId = lowerIntolerance.split('_')[0].split('-')[0];
      
      // Si la receta ya tiene una curación SIBO (avoid/caution), no re-evaluamos triggers de SIBO 
      if (baseId === 'sibo' && siboCurated) return;
      
      const triggers = MEDICAL_TRIGGERS[baseId];
      if (triggers) {
        // Almacenamos triggers mapeados a su baseId para evaluar severidad después
        triggers.forEach(t => activeTriggers.push({ text: t, baseId }));
      }
    });

    let foundMaxSeverity = null; // 'low' or 'high'
    const matchedAllergenIds = new Set();

    // Preparar regexps por adelantado
    const triggerRegexes = activeTriggers.map(trigger => {
      const normalizedTrigger = normalize(trigger.text);
      const escapedTrigger = normalizedTrigger.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\s)${escapedTrigger}(?:s|es)?(?:\\s|$|[.,;])`, 'i');
      return { trigger, regex };
    });

    const ingredients = (recipe.ingredients || []).map(i => {
      let isBorderlineSafe = false;
      const ingNameEs = i.name?.es || i.name || 'Desconocido';
      const normalizedIngName = normalize(ingNameEs);
      
      // La advertencia de ingrediente limitado original SÓLO aplica si el usuario tiene SIBO
      if (hasSibo && (i.siboAlert || i.isBorderlineSafe)) {
        isBorderlineSafe = true;
      }
      
      // Verificar si este ingrediente dispara alguna intolerancia
      triggerRegexes.forEach(({ trigger, regex }) => {
        if (regex.test(normalizedIngName)) {
          const severity = (userSeverities[trigger.baseId] || 'severe').toLowerCase();
          const isHighSeverity = severity === 'severe' || severity === 'anaphylactic';
          
          // Logic to handle matching ingredients for intolerances
          matchedAllergenIds.add(trigger.baseId);
          isBorderlineSafe = true;

          if (isHighSeverity) {
            foundMaxSeverity = 'high';
          } else if (foundMaxSeverity !== 'high') {
            foundMaxSeverity = 'low';
          }
        }
      });
      
      return {
        id: i.name?.es || i.name || 'unknown',
        name: ingNameEs,
        nameEn: i.name?.en || '',
        quantity: i.quantity || '',
        unit: typeof i.unit === 'object' ? (i.unit?.es || '') : (i.unit || ''),
        unitEn: typeof i.unit === 'object' ? (i.unit?.en || '') : '',
        isBorderlineSafe
      };
    });

    // Trace completed normalization (removed debug logs)

    if (foundMaxSeverity === 'high') {
      safetyLevel = 'unsafe';
    } else if (foundMaxSeverity === 'low') {
      safetyLevel = 'review';
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
      siboAlerts: recipe.sibo_alerts || [],
      _matchedAllergens: [...matchedAllergenIds]
    };
  }

  static async clearCache() {
    try {
      if (redisClient.isReady) {
        const keys = await redisClient.keys('recipes:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
          ActivityLogger.info('Invalidated recipe cache', { keysCount: keys.length });
        }
      }
    } catch (err) {
      ActivityLogger.warn('Error invalidating cache', { error: err.message });
    }
  }
}
