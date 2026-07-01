import { Op } from 'sequelize';
import { Recipe } from '../models/Recipe.js';
import { Ingredient } from '../models/Ingredient.js';
import { redisClient } from '../config/redis.js';
import { ActivityLogger } from './ActivityLogger.js';
import { TagService } from './TagService.js';
import crypto from 'crypto';
import { evaluateSafety } from '../utils/SecurityScrubber.js';
import { expandSearchTerms, processRecipeTags } from '../utils/recipeHelpers.js';

const CACHE_TTL_SECONDS = 3600; // 1 hour
let lastCacheInvalidation = 0;
const CACHE_INVALIDATION_COOLDOWN_MS = 2000; // 2 seconds

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    let { query, number = 10, offset = 0 } = params;
    let organizationId = params.organizationId || userProfile?.organization_id || null;

    // Security: Only super_admin can query specifically for other organizations
    if (userProfile && userProfile.role !== 'super_admin') {
      if (organizationId !== null && organizationId !== userProfile.organization_id) {
        organizationId = userProfile.organization_id;
      }
    }
    
    // Fetch tags for translation
    const allTags = await TagService.getAllTags();
    const tagMap = Object.fromEntries(
      allTags.map(t => [TagService.normalizeKey(t.key), t])
    );

    // Security: Ensure query is a string and reasonable length
    if (typeof query !== 'string') query = '';
    query = query.trim().slice(0, 200);

    const whereClause = { 
      status: 'published',
      [Op.or]: [
        { organization_id: null }, // Global recipes
        { organization_id: organizationId } // Organization-specific recipes
      ]
    };

    if (query) {
      const orConditions = expandSearchTerms(query);
      whereClause[Op.and] = [
        { [Op.or]: [
          { organization_id: null },
          { organization_id: organizationId }
        ]},
        { [Op.or]: orConditions }
      ];
    } else {
      whereClause[Op.or] = [
        { organization_id: null },
        { organization_id: organizationId }
      ];
    }

    const userIntolerances = userProfile?.intolerances || [];
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const cachePayload = {
      q: query || '',
      n: number,
      o: parsedOffset,
      orgId: organizationId || 'global',
      intolerances: userIntolerances.sort(),
      severities: userProfile?.severities || {},
      uid: userProfile?.id || 'anonymous',
      rKey: params.refreshKey || '',
      unsafe: params.includeUnsafe === 'true'
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
    const hasFilters = userIntolerances.length > 0;

    ActivityLogger.info('Recipe search initiated', { query, number: requestedLimit, offset: parsedOffset, hasFilters, refreshKey: params.refreshKey });

    const order = [['created_at', 'DESC']];
    let totalCount = 0;
    let recipes = [];

    if (query) {
      const matchingRecipes = await Recipe.unscoped().findAll({
        attributes: ['id'],
        where: whereClause,
        include: [
          {
            model: Ingredient,
            as: 'recipeIngredients',
            attributes: []
          }
        ],
        raw: true,
        subQuery: false
      });

      const allIds = Array.from(new Set(matchingRecipes.map(r => r.id)));
      totalCount = allIds.length;

      const pageIds = hasFilters 
        ? allIds.slice(0, requestedLimit * 5) 
        : allIds.slice(parsedOffset, parsedOffset + requestedLimit);

      if (pageIds.length > 0) {
        recipes = await Recipe.findAll({
          where: { id: pageIds },
          order
        });
      }
    } else {
      totalCount = await Recipe.count({
        where: whereClause,
        distinct: true,
        col: 'id'
      });

      recipes = await Recipe.findAll({
        where: whereClause,
        order,
        offset: hasFilters ? 0 : parsedOffset,
        limit: hasFilters ? requestedLimit * 5 : requestedLimit
      });
    }

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

    let filteredUnsafeCount = 0;
    const filteredAllergenSet = new Set();

    if (hasFilters) {
      const unsafeRecipes = results.filter(r => r.safetyLevel === 'unsafe');
      filteredUnsafeCount = unsafeRecipes.length;

      unsafeRecipes.forEach(r => {
        if (r._matchedAllergens) {
          r._matchedAllergens.forEach(a => filteredAllergenSet.add(a));
        }
      });

      const includeUnsafe = params.includeUnsafe === 'true';
      if (!includeUnsafe) {
        results = results.filter(recipe => recipe.safetyLevel !== 'unsafe');
      }
    }

    if (hasFilters) {
      results = results.slice(parsedOffset, parsedOffset + requestedLimit);
    } else {
      results = results.slice(0, requestedLimit);
    }

    results = results.map(({ _matchedAllergens, ...rest }) => rest);

    const response = {
      recipes: results,
      total: totalCount,
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
    const { safetyLevel, ingredients, matchedAllergenIds } = evaluateSafety(recipe, userProfile);

    const instructions = (recipe.steps || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(s => s.instruction?.es || s.instruction || '');

    if (instructions.length === 0) {
      instructions.push('Sin instrucciones disponibles.');
    }

    const siboAllergiesTags = processRecipeTags(recipe, ingredients, tagMap);

    return {
      id: recipe.id,
      title: recipe.title_es,
      titleEn: recipe.title_en,
      imageUrl: recipe.image_url || '',
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
      _matchedAllergens: matchedAllergenIds
    };
  }

  static async clearCache(force = true) {
    try {
      if (!redisClient.isReady) return;

      const now = Date.now();
      const timeSinceLast = now - lastCacheInvalidation;
      if (!force && timeSinceLast < CACHE_INVALIDATION_COOLDOWN_MS) {
        ActivityLogger.info('Cache invalidation skipped (cooldown)', { timeSinceLast });
        return;
      }

      let batch = [];
      let totalDeleted = 0;

      for await (const result of redisClient.scanIterator({
        MATCH: 'recipes:*',
        COUNT: 100
      })) {
        const keys = Array.isArray(result) ? result : [result];
        for (const key of keys) {
          batch.push(key);
          if (batch.length >= 100) {
            await redisClient.del(batch);
            totalDeleted += batch.length;
            batch = [];
          }
        }
      }

      if (batch.length > 0) {
        await redisClient.del(batch);
        totalDeleted += batch.length;
      }

      lastCacheInvalidation = Date.now();

      if (totalDeleted > 0) {
        ActivityLogger.info('Invalidated recipe cache', { keysCount: totalDeleted });
      }
    } catch (err) {
      ActivityLogger.warn('Error invalidating cache', { error: err.message });
    }
  }
}
