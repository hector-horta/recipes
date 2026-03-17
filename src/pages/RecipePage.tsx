import { useState, useEffect } from 'react';
import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';
import { useAuth } from '../context/AuthContext';
import { WatiLogo } from '../components/WatiLogo';
import { UserCircle, Settings, LogOut } from 'lucide-react';

interface RecipePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
}

// ... fetchDummySafeRecipes stays same (internal logic) ...
export const fetchDummySafeRecipes = async (): Promise<Recipe[]> => {
  const mockApiResults = [
    {
      id: 715415,
      title: "Red Lentil Soup with Chicken and Turnips",
      image: "https://img.spoonacular.com/recipes/715415-556x370.jpg",
      readyInMinutes: 55,
      pricePerServing: 2.44,
      diets: ["gluten free", "dairy free"],
      summary: "A hearty and nutritious soup with lentils, chicken, and fresh vegetables. One portion contains about 25g of protein and 340 calories.",
      ingredients: [
        { id: "1", name: "Red lentils", isBorderlineSafe: false },
        { id: "2", name: "Chicken breast", isBorderlineSafe: false },
        { id: "3", name: "Turnips", isBorderlineSafe: false },
        { id: "4", name: "Carrots", isBorderlineSafe: false },
        { id: "5", name: "Celery", isBorderlineSafe: false },
        { id: "6", name: "Onion", isBorderlineSafe: false },
        { id: "7", name: "Garlic", isBorderlineSafe: false },
        { id: "8", name: "Vegetable stock", isBorderlineSafe: false }
      ],
      instructions: [
        "Sauté onion, carrots, and celery in a large pot until softened.",
        "Add garlic and red lentils, stirring for 1 minute.",
        "Add vegetable stock and chicken breast.",
        "Bring to a boil, then simmer for 25-30 minutes until lentils are soft and chicken is cooked.",
        "Shred chicken and serve hot."
      ]
    },
    {
      id: 716406,
      title: "Asparagus and Pea Soup",
      image: "https://img.spoonacular.com/recipes/716406-556x370.jpg",
      readyInMinutes: 20,
      pricePerServing: 1.85,
      diets: ["gluten free", "dairy free", "paleolithic"],
      summary: "This fresh, green soup is perfect for a light lunch. It's packed with vitamins from asparagus and peas.",
      ingredients: [
        { id: "1", name: "Asparagus", isBorderlineSafe: false },
        { id: "2", name: "Peas", isBorderlineSafe: false },
        { id: "3", name: "Onion", isBorderlineSafe: false },
        { id: "4", name: "Garlic", isBorderlineSafe: false },
        { id: "5", name: "Vegetable broth", isBorderlineSafe: false },
        { id: "6", name: "Olive oil", isBorderlineSafe: false }
      ],
      instructions: [
        "Chop the onion, garlic, and asparagus.",
        "Sauté onion and garlic in olive oil until translucent.",
        "Add asparagus and peas, cooking for 2 minutes.",
        "Pour in the vegetable broth and simmer for 10-12 minutes.",
        "Blend the soup until smooth and creamy."
      ]
    },
    {
      id: 644387,
      title: "Garlicky Kale",
      image: "https://img.spoonacular.com/recipes/644387-556x370.jpg",
      readyInMinutes: 45,
      pricePerServing: 0.69,
      diets: ["gluten free", "dairy free", "paleolithic"],
      summary: "A simple and delicious side dish that pairs well with any protein. High in Vitamin K and A.",
      ingredients: [
        { id: "1", name: "Kale", isBorderlineSafe: false },
        { id: "2", name: "Garlic", isBorderlineSafe: false },
        { id: "3", name: "Olive oil", isBorderlineSafe: false },
        { id: "4", name: "Salt", isBorderlineSafe: false }
      ],
      instructions: [
        "Wash and thoroughly dry the kale leaves.",
        "Remove the tough stems and chop the leaves into bite-sized pieces.",
        "Heat olive oil in a large pan over medium heat.",
        "Sauté minced garlic until fragrant but not brown.",
        "Add kale in batches, stirring until wilted and tender.",
        "Season with salt and serve."
      ]
    },
    {
      id: 715446,
      title: "Slow Cooker Beef Stew",
      image: "https://img.spoonacular.com/recipes/715446-556x370.jpg",
      readyInMinutes: 490,
      pricePerServing: 3.25,
      diets: ["gluten free", "dairy free"],
      summary: "A comforting, slow-cooked beef stew perfect for chilly days. Tender beef and well-developed flavors.",
      ingredients: [
        { id: "1", name: "Beef broth", isBorderlineSafe: false },
        { id: "2", name: "Stew meat", isBorderlineSafe: false },
        { id: "3", name: "New potatoes", isBorderlineSafe: false },
        { id: "4", name: "Carrots", isBorderlineSafe: false },
        { id: "5", name: "Onion", isBorderlineSafe: false },
        { id: "6", name: "Celery", isBorderlineSafe: false },
        { id: "7", name: "Seasoning", isBorderlineSafe: false }
      ],
      instructions: [
        "Mix beef broth, seasoning, and a bit of water in the slow cooker.",
        "Add the stew meat, halved potatoes, sliced carrots, onions, and celery.",
        "Stir everything well to combine with the liquid.",
        "Cover and cook on low for 8 hours until beef is fork-tender."
      ]
    }
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      const mapped = mockApiResults.map(apiRecipe => ({
        id: apiRecipe.id.toString(),
        title: apiRecipe.title,
        imageUrl: apiRecipe.image,
        prepTimeMinutes: apiRecipe.readyInMinutes,
        estimatedCost: Math.min(3, Math.max(1, Math.ceil(apiRecipe.pricePerServing))),
        ingredients: apiRecipe.ingredients,
        instructions: apiRecipe.instructions,
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
        // Mock mode: using high-quality synchronized local data
        const dummyData = await fetchDummySafeRecipes();
        setRecipes(dummyData);
      } catch (error) {
        console.error("Error loading mock recipes", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-sage/20">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <WatiLogo size={32} />
            <span className="text-xl font-extrabold text-brand-forest tracking-tight">Wati</span>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-brand-teal/20 hover:shadow-brand-teal/40 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, var(--brand-sage), var(--brand-teal))' }}
              >
                Entrar / Registrarse
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenOnboarding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-brand-forest bg-brand-sage/10 hover:bg-brand-sage/20 transition-all border border-brand-sage/20"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Alergias
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-brand-sage/20">
                  <div className="w-9 h-9 rounded-full bg-brand-mint/20 flex items-center justify-center border border-brand-mint/30">
                    <UserCircle className="w-6 h-6 text-brand-forest" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-extrabold text-brand-forest leading-tight">{user.displayName}</p>
                    <button onClick={logout} className="flex items-center gap-1 text-[10px] font-bold text-brand-text-muted hover:text-danger transition-colors">
                      <LogOut size={10} />
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
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center sm:text-left">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-forest tracking-tight mb-4">
              {user ? 'Recetas para tu bienestar' : 'Nutrición consciente'}
            </h1>
            <p className="text-lg text-brand-text-muted max-w-2xl leading-relaxed">
              {user
                ? 'Platos seleccionados cuidadosamente para nutrirte respetando tus intolerancias y salud digestiva.'
                : 'Descubre cómo la comida puede ser tu mejor medicina. Personaliza tu experiencia según tus necesidades.'}
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
