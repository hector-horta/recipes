import { redisClient } from '../config/redis.js';

export class RecipeProvider {
  static async getRecipes(params, userProfile) {
    let { query, excludeIngredients, diet, number } = params;

    // Smart Injection: Automate GDPR/Health limits server-side
    if (userProfile) {
      if (userProfile.diet && userProfile.diet !== 'None') {
        diet = userProfile.diet === 'SIBO' ? 'Low FODMAP' : userProfile.diet; 
        // Map SIBO to Spoonacular's equivalent Low FODMAP
      }
      if (userProfile.intolerances && userProfile.intolerances.length > 0) {
        const finalIntolerances = userProfile.intolerances.filter(item => {
          if (item.toLowerCase() === 'sibo') {
            diet = 'Low FODMAP'; // Elevate SIBO intolerance to Diet parameter
            return false;
          }
          return true;
        });

        if (finalIntolerances.length > 0) {
          const intolerancesStr = finalIntolerances.join(',');
          excludeIngredients = excludeIngredients ? `${excludeIngredients},${intolerancesStr}` : intolerancesStr;
        }
      }
      if (userProfile.excluded_ingredients) {
        excludeIngredients = excludeIngredients ? `${excludeIngredients},${userProfile.excluded_ingredients}` : userProfile.excluded_ingredients;
      }
    }

    const queryParams = new URLSearchParams({
      query: query || '',
      excludeIngredients: excludeIngredients || '',
      diet: diet || '',
      apiKey: process.env.SPOONACULAR_KEY || '',
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      maxReadyTime: '30',
      number: number || '12'
    });

    // Create a cache key excluding the API key for security/consistency if key changes
    const cacheKeyParams = new URLSearchParams(queryParams);
    cacheKeyParams.delete('apiKey');
    const cacheKey = `recipes:${cacheKeyParams.toString()}`;

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

    const SPOONACULAR_API_URL = 'https://api.spoonacular.com/recipes';
    const url = `${SPOONACULAR_API_URL}/complexSearch?${queryParams.toString()}`;
    
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!res.ok) {
        throw new Error(`Spoonacular API error: ${res.statusText}`);
      }

      const data = await res.json();
      const normalized = this.normalizeRecipes(data.results || []);

      try {
        if (redisClient.isReady) {
          await redisClient.setEx(cacheKey, 900, JSON.stringify(normalized)); // 900s = 15 min
          console.log(`[Cache] Guardado en Redis: ${cacheKey}`);
        }
      } catch (err) {
        console.warn('[Cache] Error guardando en Redis:', err.message);
      }

      return normalized;
    } catch (error) {
      console.error('[RecipeProvider] Error fetching recipes:', error);
      throw error;
    }
  }

  static normalizeRecipes(results) {
    return results.map(r => {
      // Gather all distinct ingredients (from extendedIngredients and from instructions if possible)
      const ingredientMap = new Map();
      
      if (r.extendedIngredients) {
        r.extendedIngredients.forEach(i => {
           if (i.name) ingredientMap.set(i.name.toLowerCase(), { id: (i.id || Math.random()).toString(), name: i.name });
        });
      }
      
      if (r.analyzedInstructions) {
         r.analyzedInstructions.forEach(inst => {
            inst.steps?.forEach(step => {
               step.ingredients?.forEach(i => {
                  if (i.name && !ingredientMap.has(i.name.toLowerCase())) {
                     ingredientMap.set(i.name.toLowerCase(), { id: (i.id || Math.random()).toString(), name: i.name });
                  }
               });
            });
         });
      }

      return {
        id: r.id.toString(),
        title: r.title || 'Untitled Recipe',
        imageUrl: r.image || '',
        prepTimeMinutes: r.readyInMinutes || 0,
        estimatedCost: Math.min(3, Math.max(1, Math.ceil((r.pricePerServing || 0) / 100))),
        ingredients: Array.from(ingredientMap.values()),
        instructions: r.analyzedInstructions?.[0]?.steps.map(s => s.step) || [r.instructions || ''],
        summary: r.summary || '',
        siboAllergiesTags: r.diets?.slice(0, 3) || []
      };
    });
  }
}
