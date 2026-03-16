import { useState, useEffect } from 'react';
import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';
import { SecureAPI } from '../api/PrivacyProxy';

// Simulación de una API de recetas de Wati
export const fetchDummySafeRecipes = async (): Promise<Recipe[]> => {
  // Modelado basado en la estructura real de Spoonacular (Results de complexSearch)
  const mockApiResults = [
    {
      id: 644387,
      title: "Garlicky Roasted Asparagus",
      image: "https://spoonacular.com/recipeImages/644387-556x370.jpg",
      readyInMinutes: 25,
      pricePerServing: 112.54,
      extendedIngredients: [
        { id: 11011, name: "asparagus", originalName: "1 lb asparagus" },
        { id: 4053, name: "olive oil", originalName: "1 tbsp olive oil" },
        { id: 2047, name: "salt", originalName: "1/4 tsp salt" },
        { id: 10211215, name: "garlic powder", originalName: "1 tsp garlic powder" }
      ],
      diets: ["gluten free", "dairy free", "paleolithic", "lacto ovo vegetarian", "primal", "vegan"],
      summary: "Fresh roasted asparagus with a garlic kick.",
      analyzedInstructions: [{
        steps: [
          { step: "Preheat oven to 400°F (200°C)." },
          { step: "Toss asparagus with olive oil, salt, and garlic powder." },
          { step: "Roast for 15-20 minutes until tender." }
        ]
      }]
    },
    {
      id: 716406,
      title: "Asparagus and Pea Soup with Rocket",
      image: "https://spoonacular.com/recipeImages/716406-556x370.jpg",
      readyInMinutes: 20,
      pricePerServing: 184.22,
      extendedIngredients: [
        { id: 11011, name: "asparagus", originalName: "250g asparagus" },
        { id: 11304, name: "peas", originalName: "150g peas" },
        { id: 11959, name: "rocket", originalName: "50g rocket" },
        { id: 6194, name: "chicken stock", originalName: "500ml chicken stock" }
      ],
      diets: ["gluten free", "dairy free", "paleolithic", "primal"],
      summary: "A light and vibrant green soup.",
      analyzedInstructions: [{
        steps: [
          { step: "Boil chicken stock in a pot." },
          { step: "Add asparagus and peas, cook for 5 minutes." },
          { step: "Blend with rocket until smooth." }
        ]
      }]
    },
    {
      id: 633535,
      title: "Pasta with Garlic and Scallions",
      image: "https://spoonacular.com/recipeImages/633535-556x370.jpg",
      readyInMinutes: 15,
      pricePerServing: 95.88,
      extendedIngredients: [
        { id: 20420, name: "pasta", originalName: "200g pasta" },
        { id: 11291, name: "scallions", originalName: "3 scallions, chopped" },
        { id: 2047, name: "salt", originalName: "pinch of salt" }
      ],
      diets: ["vegan", "dairy free"],
      summary: "A simple and delicious pasta dish with garlic and scallions.",
      analyzedInstructions: [{
        steps: [
          { step: "Boil water and cook pasta." },
          { step: "Sauté garlic and scallions in olive oil." },
          { step: "Mix pasta with the sautéed ingredients and salt." }
        ]
      }]
    }
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      const mapped = mockApiResults.map(apiRecipe => ({
        id: apiRecipe.id.toString(),
        title: apiRecipe.title,
        imageUrl: apiRecipe.image,
        prepTimeMinutes: apiRecipe.readyInMinutes,
        estimatedCost: Math.min(3, Math.max(1, Math.ceil(apiRecipe.pricePerServing / 100))),
        ingredients: apiRecipe.extendedIngredients.map(ing => ({
          id: ing.id.toString(),
          name: ing.name,
          isBorderlineSafe: false
        })),
        instructions: apiRecipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || ["Keep it secret, keep it safe."],
        summary: apiRecipe.summary,
        safetyLevel: 'safe' as const,
        siboAllergiesTags: apiRecipe.diets.slice(0, 3)
      }));
      resolve(mapped);
    }, 1500);
  });
};

export function RecipePage({ onSelectRecipe }: { onSelectRecipe: (recipe: Recipe) => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Llamado a la API real de Wati
        const rawData = await SecureAPI.fetchSafeRecipes('');
        
        // Mapeo de la respuesta cruda de Spoonacular a nuestra interfaz Recipe local
        const mappedRecipes: Recipe[] = rawData.map((apiRecipe: any) => {
          // Evaluar riesgo basándonos en el securityDisclosure de SecurityScrubber
          const disclosure = apiRecipe.securityDisclosure;
          let calculatedSafetyLevel: 'safe' | 'review' | 'unsafe' = 'safe';
          
          if (disclosure) {
             if (disclosure.riskLevel === 'DANGER') calculatedSafetyLevel = 'unsafe';
             else if (disclosure.riskLevel === 'WARNING') calculatedSafetyLevel = 'review';
          }

          return {
            id: apiRecipe.id ? apiRecipe.id.toString() : `api-${Math.random()}`,
            title: apiRecipe.title || 'Receta Sin Título',
            imageUrl: apiRecipe.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            prepTimeMinutes: apiRecipe.readyInMinutes || 30,
            estimatedCost: Math.min(3, Math.max(1, Math.ceil((apiRecipe.pricePerServing || 150) / 100))),
            ingredients: (apiRecipe.extendedIngredients || []).map((ing: any) => ({
              id: ing.id ? ing.id.toString() : `ing-${Math.random()}`,
              name: ing.originalName || ing.name || 'Ingrediente',
              isBorderlineSafe: disclosure?.findings?.some((f: string) => f.toLowerCase().includes(ing.name?.toLowerCase())) || false
            })).slice(0, 5), // Limitamos para UI rápida
            instructions: apiRecipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || [],
            summary: apiRecipe.summary,
            safetyLevel: calculatedSafetyLevel,
            siboAllergiesTags: apiRecipe.diets?.slice(0, 3) || ['Seguro'],
          };
        });

        setRecipes(mappedRecipes);
      } catch (error) {
        console.error("Error fetching recipes", error);
        // Opcional: usar dummy si falla la carga (ej. perfil no configurado temporalmente en dev)
        const dummyData = await fetchDummySafeRecipes();
        setRecipes(dummyData);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera de la página */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
            Tus Recetas Seguras
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl">
            Resultados generados a partir de tu perfil de SIBO y sensibilidades alimentarias.
          </p>
        </div>

        {/* 
          RecipeGrid: Contenedor Responsivo
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <RecipeCardSkeleton key={`skeleton-${idx}`} />
            ))
          ) : (
            recipes
              .filter(recipe => recipe.safetyLevel !== 'unsafe')
              .map((recipe) => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  onCookNow={() => onSelectRecipe(recipe)} 
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}
