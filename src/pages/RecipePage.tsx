import { useState, useEffect } from 'react';
import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';
import { SecureAPI } from '../api/PrivacyProxy';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserCircle, Settings } from 'lucide-react';

interface RecipePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
}

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

export function RecipePage({ onSelectRecipe, onOpenLogin, onOpenOnboarding }: RecipePageProps) {
  const { user, logout } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const rawData = await SecureAPI.fetchSafeRecipes('');
        const mappedRecipes: Recipe[] = rawData.map((apiRecipe: any) => {
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
            })).slice(0, 5),
            instructions: apiRecipe.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) || [],
            summary: apiRecipe.summary,
            safetyLevel: calculatedSafetyLevel,
            siboAllergiesTags: apiRecipe.diets?.slice(0, 3) || ['Seguro'],
          };
        });
        setRecipes(mappedRecipes);
      } catch (error) {
        console.error("Error fetching recipes", error);
        const dummyData = await fetchDummySafeRecipes();
        setRecipes(dummyData);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #34d399, #059669)'
            }}>
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-extrabold text-slate-800 tracking-tight">Wati</span>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
              >
                Crear Cuenta
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenOnboarding}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Alergias
                </button>
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-700 leading-tight">{user.displayName}</p>
                    <button onClick={logout} className="text-[10px] text-slate-400 hover:text-red-400 transition-colors">
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              {user ? 'Tus Recetas Seguras' : 'Descubre Recetas'}
            </h1>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl">
              {user
                ? 'Resultados generados a partir de tu perfil de alergias y sensibilidades alimentarias.'
                : 'Crea una cuenta para personalizar las recetas según tus alergias e intolerancias.'}
            </p>
          </div>

          {/* RecipeGrid */}
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
    </div>
  );
}
