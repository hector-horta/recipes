import { Op, where, cast, col } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { redisClient } from '../config/redis.js';
import { MEDICAL_TRIGGERS } from '../config/medical.js';
import { ActivityLogger } from './ActivityLogger.js';
import { TagService } from './TagService.js';
import crypto from 'crypto';

const CACHE_TTL_SECONDS = 3600; // 1 hour

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    let { query, number = 10 } = params;
    
    // Fetch tags for translation
    const allTags = await TagService.getAllTags();
    const tagMap = Object.fromEntries(
      allTags.map(t => [TagService.normalizeKey(t.key), t])
    );
    // console.log('DEBUG tagMap keys:', Object.keys(tagMap));
    // console.log('DEBUG postre entry:', tagMap['postre']);

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
      severities: userProfile?.severities || {},
      uid: userProfile?.id || 'anonymous'
    };
    const cacheHash = crypto.createHash('md5').update(JSON.stringify(cachePayload)).digest('hex');
    const cacheKey = `recipes:v2:${cacheHash}`;

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

    // Fetch user favorites if authenticated
    const favoriteIds = new Set();
    if (userProfile && userProfile.id) {
      const { FavoriteRecipe } = await import('../models/FavoriteRecipe.js');
      const favorites = await FavoriteRecipe.findAll({
        where: { user_id: userProfile.id },
        attributes: ['recipe_id']
      });
      favorites.forEach(f => favoriteIds.add(f.recipe_id));
    }

    let results = recipes.map(r => this.normalizeRecipe(r.toJSON(), userProfile, tagMap, favoriteIds.has(r.id)));

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

  static normalizeRecipe(recipe, userProfile, tagMap = {}, isFavorite = false) {
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

    const CANONICAL_CATEGORIES = [
      { key: 'bebestible', es: 'Bebestible', en: 'Drink', keywords: ['jugo', 'batido', 'te', 'cafe', 'bebida', 'chocolate caliente', 'infusion', 'smoothie', 'juice', 'drink', 'tea', 'coffee'] },
      { key: 'postre', es: 'Postre', en: 'Dessert', keywords: ['postre', 'dulce', 'torta', 'galleta', 'helado', 'pudin', 'mousse', 'dessert', 'sweet', 'cake', 'cookie', 'ice cream'] },
      { key: 'entrada', es: 'Entrada', en: 'Starter Dish', keywords: ['entrada', 'sopa', 'ensalada', 'aperitivo', 'starter', 'soup', 'salad', 'appetizer'] },
      { key: 'plato_principal', es: 'Plato Principal', en: 'Main Course', keywords: ['plato principal', 'fondo', 'almuerzo', 'cena', 'guiso', 'estofado', 'main course', 'dinner', 'lunch', 'stew'] },
      { key: 'snack', es: 'Snack', en: 'Snack', keywords: ['snack', 'picoteo', 'tentempie', 'frutos secos', 'chips', 'snack'] },
      { key: 'aderezo_salsa', es: 'Aderezo/Salsa', en: 'Dressing/Salsa', keywords: ['salsa', 'aderezo', 'dip', 'aliño', 'vinagreta', 'dressing', 'vinaigrette', 'sauce', 'mayonnaise', 'mayonesa', 'pesto', 'hummus'] }
    ];

    const DIETARY_HIGHLIGHTS = [
      { key: 'vegano', es: 'Vegano', en: 'Vegan' },
      { key: 'sin_gluten', es: 'Sin Gluten', en: 'Gluten-free' },
      { key: 'low_fodmap', es: 'Bajo en FODMAP', en: 'Low FODMAP' }
    ];

    const rawTags = recipe.tags || [];
    const processedTags = rawTags.map(t => {
      const isString = typeof t === 'string';
      const tagObj = isString ? { es: t, en: t } : t;
      const key = TagService.normalizeKey(tagObj.key || tagObj.es || '');
      
      if (tagMap[key]) {
        return { es: tagMap[key].es, en: tagMap[key].en, key };
      }
      
      return { 
        es: tagObj.es || '', 
        en: tagObj.en || tagObj.es || '',
        key
      };
    });

    // 1. Filter allowed tags (Categories + Dietary)
    const allowedKeys = [...CANONICAL_CATEGORIES, ...DIETARY_HIGHLIGHTS].map(c => c.key);
    let finalTags = processedTags.filter(t => allowedKeys.includes(t.key));

    // Special mapping: SIBO/Fodmap related tags -> Low FODMAP
    const legacyFodmapKeys = ['sibo', 'fodmap', 'sibo_safe', 'bajo_en_fodmap'];
    if (processedTags.some(t => legacyFodmapKeys.includes(t.key))) {
      const lowFodmapTag = DIETARY_HIGHLIGHTS.find(d => d.key === 'low_fodmap');
      if (!finalTags.some(t => t.key === 'low_fodmap')) {
        finalTags.push({ es: lowFodmapTag.es, en: lowFodmapTag.en, key: lowFodmapTag.key });
      }
    }

    // 2. Auto-Categorization (Heuristic)
    if (!finalTags.some(t => CANONICAL_CATEGORIES.map(c => c.key).includes(t.key))) {
      const searchText = ` ${recipe.title_es} ${recipe.title_en} ${ingredients.map(i => i.name).join(' ')} `.toLowerCase();
      
      const detectedCategories = CANONICAL_CATEGORIES.filter(cat => 
        cat.keywords.some(k => {
          // Use word-like matching to avoid "test" matching "te"
          const regex = new RegExp(`\\b${k}\\b`, 'i');
          return regex.test(searchText);
        })
      );

      detectedCategories.forEach(cat => {
        if (!finalTags.some(t => t.key === cat.key)) {
          finalTags.push({ es: cat.es, en: cat.en, key: cat.key });
        }
      });
    }

    // Filter by SIBO context (only show Low FODMAP related if user has SIBO or if it's explicitly tagged)
    // Actually, user wants to keep these 3 regardless or filtered?
    // "Keep the 'vegan', 'gluten free' and 'SIBO-Safe' [Low FODMAP]"
    // I will show all finalTags found.

    const siboAllergiesTags = finalTags.map(({ key, ...rest }) => rest);

    return {
      id: recipe.id,
      title: recipe.title_es,
      titleEn: recipe.title_en,
      imageUrl,
      prepTimeMinutes: recipe.prep_time_minutes || 0,
      cookTimeMinutes: recipe.cook_time_minutes || 0,
      totalTimeMinutes: (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0),
      estimatedCost: 2,
      ingredients,
      instructions,
      instructionsEn: (recipe.steps || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(s => s.instruction?.en || ''),
      summary: '',
      safetyLevel,
      isFavorite,
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
