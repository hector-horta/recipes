export class RecipeProvider {
  static async getRecipes(params) {
    const { query, excludeIngredients, diet, number } = params;

    const queryParams = new URLSearchParams({
      query: query || '',
      excludeIngredients: excludeIngredients || '',
      diet: diet || '',
      apiKey: process.env.SPOONACULAR_KEY || '',
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      number: number || '12'
    });

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
      return this.normalizeRecipes(data.results || []);
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
