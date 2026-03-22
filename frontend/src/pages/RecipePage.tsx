import { RecipeCard, RecipeCardSkeleton } from '../components/RecipeCard';
import { Recipe } from '../types/recipe';
import { useAuth } from '../AuthContext';
import { WatiLogo } from '../components/WatiLogo';
import { UserCircle, Settings, LogOut, RefreshCw, Search, FlaskConical, Radio, AlertCircle, UtensilsCrossed, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { useMemo, useState } from 'react';

interface RecipePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: Recipe[];
  isLoading: boolean;
  isPending: boolean;
  isQuotaExhausted: boolean;
  refresh: () => void;
}

// ... fetchDummySafeRecipes stays same (internal logic) ...
// ── Components ──

export function RecipePage({ 
  onSelectRecipe, 
  onOpenLogin, 
  onOpenOnboarding,
  query: searchQuery,
  setQuery: setSearchQuery,
  results: recipes,
  isLoading: hookLoading,
  isPending,
  isQuotaExhausted,
  refresh
}: RecipePageProps) {
  const { user, logout } = useAuth();
  
  const { favorites, toggleFavorite, isFavorited, isLoading: favsLoading } = useFavorites();
  
  // Pagination state for favorites
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Logic: Merging Favorites + Random
  const isSearchActive = searchQuery.trim().length >= 3;
  
  const displayRecipes: Recipe[] = useMemo(() => {
    if (isSearchActive) return recipes;

    // Create a set of favorite IDs for efficient lookup
    const favoriteIds = new Set(favorites.map((f: any) => f.spoonacular_id.toString()));

    // Mapping favorites logic
    const favoriteRecipes: Recipe[] = favorites.map((f: any) => ({
      id: f.spoonacular_id.toString(),
      title: f.title,
      imageUrl: f.image,
      prepTimeMinutes: 20, 
      estimatedCost: 2,
      ingredients: [],
      instructions: [],
      summary: '',
      safetyLevel: 'safe',
      siboAllergiesTags: ['Favorito']
    }));

    if (favoriteRecipes.length >= itemsPerPage) {
      const start = (currentPage - 1) * itemsPerPage;
      return favoriteRecipes.slice(start, start + itemsPerPage);
    } else {
      const needed = itemsPerPage - favoriteRecipes.length;
      // Filter out recipes that are already in favorites
      const filteredRecommendations = recipes.filter(r => !favoriteIds.has(r.id));
      const fill = filteredRecommendations.slice(0, needed);
      return [...favoriteRecipes, ...fill];
    }
  }, [isSearchActive, recipes, favorites, currentPage]);

  const isLoading = (hookLoading || favsLoading || isPending) && displayRecipes.length === 0;
  const isRefreshing = (hookLoading || isPending) && displayRecipes.length > 0;
  
  const totalPages = Math.ceil(favorites.length / itemsPerPage);
  
  const API_MODE = import.meta.env.VITE_API_MODE || 'MOCK';

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-sage/20">
      {/* ── Top Navigation Bar ── */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-brand-sage/10 shadow-sm/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <WatiLogo size={32} />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-brand-forest tracking-tight">Wati</span>
              <div className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-current uppercase tracking-widest ${API_MODE === 'MOCK' ? 'text-brand-sage border-brand-sage/30 bg-brand-sage/5' : 'text-brand-celeste border-brand-celeste/30 bg-brand-celeste/5'}`}>
                {API_MODE === 'MOCK' ? <FlaskConical size={8} /> : <Radio size={8} />}
                {API_MODE === 'MOCK' ? 'Desarrollo' : 'En Vivo'}
              </div>
            </div>
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
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-forest tracking-tight mb-4">
                {user ? `Hola, ${user.displayName.split(' ')[0]}` : 'Nutrición consciente'}
              </h1>
              <p className="text-brand-text-muted font-medium">
                {isSearchActive 
                  ? `Mostrando resultados para "${searchQuery}"` 
                  : favorites.length > 0 
                    ? 'Tus favoritas y algunas recomendaciones para hoy:'
                    : 'Explora nuestras recomendaciones seguras:'}
              </p>
              {/* Search Bar */}
              <div className="relative max-w-md w-full mt-6 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted group-focus-within:text-brand-teal transition-colors" />
                <input 
                  type="text"
                  placeholder="Buscar ingredientes o platos..."
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sage/20 rounded-2xl text-sm text-brand-forest placeholder:text-brand-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isQuotaExhausted && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Estamos en modo ahorro: Usando catálogo de respaldo local por alta demanda.
                </div>
              )}

              {/* Status Indicator (Online Search) */}
              {(hookLoading || isPending) && (
                <div className="mt-4 flex items-center gap-2.5 text-brand-teal/80 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">
                  <Globe className="w-3.5 h-3.5 animate-[spin_3s_linear_infinite]" />
                  <span>Buscando...</span>
                </div>
              )}
            </div>
            <button 
                onClick={refresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-brand-sage/20 text-brand-forest font-bold text-sm hover:bg-brand-sage/5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualizar
            </button>
          </div>

          {/* RecipeGrid or Empty State */}
          {!isLoading && recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-brand-sage/10 rounded-full flex items-center justify-center mb-6">
                <UtensilsCrossed className="w-10 h-10 text-brand-sage" />
              </div>
              <h3 className="text-2xl font-bold text-brand-forest mb-2">No encontramos recetas</h3>
              <p className="text-brand-text-muted max-w-xs mb-8">
                Prueba con otros ingredientes o términos más generales para que podamos ayudarte.
              </p>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 rounded-2xl bg-brand-forest text-white font-bold text-sm shadow-lg shadow-brand-forest/20 hover:scale-105 transition-all"
              >
                Ver recomendaciones
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {(hookLoading || isPending) ? (
                  Array.from({ length: itemsPerPage }).map((_, idx) => (
                    <RecipeCardSkeleton key={`skeleton-${idx}`} />
                  ))
                ) : (
                  displayRecipes
                    .filter(recipe => recipe.safetyLevel !== 'unsafe')
                    .map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        isFavorited={isFavorited(recipe.id)}
                        onToggleFavorite={() => toggleFavorite({ id: recipe.id, title: recipe.title, imageUrl: recipe.imageUrl })}
                        onCookNow={() => onSelectRecipe(recipe)} 
                      />
                    ))
                )}
              </div>

              {/* Paginator */}
              {!isSearchActive && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12 pb-8">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev: number) => prev - 1)}
                    className="p-2 rounded-xl border border-brand-sage/20 text-brand-forest disabled:opacity-30 hover:bg-brand-sage/5 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-bold text-brand-forest">
                    Página <span className="px-2 py-1 rounded-lg bg-brand-sage/10">{currentPage}</span> de {totalPages}
                  </span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev: number) => prev + 1)}
                    className="p-2 rounded-xl border border-brand-sage/20 text-brand-forest disabled:opacity-30 hover:bg-brand-sage/5 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
