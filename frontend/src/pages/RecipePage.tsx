import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../types/recipe';
import { useFavorites } from '../hooks/useFavorites';
import { useHomeData, useRandomRecipes } from '../hooks/useHomeData';
import { TopNav } from '../components/recipe/TopNav';
import { PageHeader } from '../components/recipe/PageHeader';
import { RecipeGrid } from '../components/recipe/RecipeGrid';
import { Pagination } from '../components/recipe/Pagination';
import { PageLayout } from '../components/recipe/PageLayout';
import { SearchFeedback } from '../components/recipe/SearchFeedback';
import { useAuth } from '../AuthContext';

interface RecipePageProps {
  onSelectRecipe: (recipe: Recipe) => void;
  onOpenLogin: () => void;
  onOpenOnboarding: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: Recipe[];
  isLoading: boolean;
  isPending: boolean;
  isSearching: boolean;
  isQuotaExhausted: boolean;
  refresh: () => void;
}

export function RecipePage({
  onSelectRecipe,
  onOpenLogin,
  onOpenOnboarding,
  query: searchQuery,
  setQuery: setSearchQuery,
  results: searchResults,
  isLoading: searchLoading,
  isPending,
  isSearching,
  isQuotaExhausted,
  refresh
}: RecipePageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { favorites, toggleFavorite, isFavorited, isLoading: favsLoading } = useFavorites();
  
  const { 
    topFavorites, 
    communityFavorites, 
    userFavoriteIds, 
    isLoading: homeLoading 
  } = useHomeData();
  const { randomRecipes, refresh: refreshRandom, isLoading: randomLoading } = useRandomRecipes();
  
  const [currentPage, setCurrentPage] = useState(1);

  const isSearchActive = searchQuery.trim().length >= 3;
  
  const displayRecipes = isSearchActive 
    ? searchResults 
    : user 
      ? [...communityFavorites, ...randomRecipes].slice(0, 10)
      : topFavorites.slice(0, 10);

  const isLoading = (searchLoading || homeLoading || randomLoading || favsLoading) && displayRecipes.length === 0;
  const isRefreshing = searchLoading && displayRecipes.length > 0;
  const showSearchFeedback = isSearchActive && !isLoading && !isRefreshing && displayRecipes.length === 0;

  const isShowingUserFavorites = !isSearchActive && user && favorites.length > 0;

  return (
    <>
      <TopNav onOpenLogin={onOpenLogin} onOpenOnboarding={onOpenOnboarding} />
      <PageLayout>
        {!isSearchActive && !isShowingUserFavorites && user && communityFavorites.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-black text-brand-forest mb-4 flex items-center gap-2">
              <span>🏆</span> {t('home.communityFavorites')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {communityFavorites.map((recipe) => {
                const isUserFavorite = userFavoriteIds?.includes(recipe.id) || false;
                return (
                  <div 
                    key={recipe.id} 
                    className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                      isUserFavorite 
                        ? 'border-brand-mint bg-gradient-to-br from-brand-mint/20 to-brand-forest/10' 
                        : 'border-brand-sage/30 bg-white/50'
                    }`}
                    onClick={() => onSelectRecipe(recipe)}
                  >
                    {isUserFavorite && (
                      <div className="absolute -top-2 -right-2 bg-brand-mint text-brand-forest text-xs font-bold px-2 py-1 rounded-full shadow-md">
                        ✨ {t('home.thanksToYou')}
                      </div>
                    )}
                    <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-brand-sage/20">
                      {recipe.imageUrl && (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-brand-forest line-clamp-2">{recipe.title}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isSearchActive && user && favorites.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-black text-brand-forest mb-4 flex items-center gap-2">
              <span>❤️</span> {t('home.myFavorites')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {favorites.slice(0, 5).map((fav) => (
                <div 
                  key={fav.recipe_id}
                  className="p-3 rounded-2xl border-2 border-rose-200 bg-rose-50/50 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    const recipe = favorites.find(f => f.recipe_id === fav.recipe_id);
                    if (recipe) {
                      const recipeData = (recipe as any).recipe;
                      if (recipeData) {
                        onSelectRecipe({
                          id: recipeData.id,
                          title: recipeData.title_es,
                          imageUrl: recipeData.image_url,
                          prepTimeMinutes: recipeData.prep_time_minutes || 20,
                          estimatedCost: 2,
                          ingredients: [],
                          instructions: [],
                          summary: '',
                          safetyLevel: 'safe',
                          siboAllergiesTags: [],
                          siboAlerts: []
                        });
                      }
                    }
                  }}
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-brand-sage/20">
                    {fav.image && (
                      <img src={fav.image} alt={fav.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="text-sm font-bold text-brand-forest line-clamp-2">{fav.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <PageHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchActive={isSearchActive}
          hasFavorites={favorites.length > 0}
          isQuotaExhausted={isQuotaExhausted}
          showLoader={searchLoading || isPending}
          isRefreshing={isRefreshing}
          isSearching={isSearching}
          onRefresh={user ? refreshRandom : refresh}
          onOpenLogin={onOpenLogin}
        />

        {!showSearchFeedback && (
          <RecipeGrid
            recipes={displayRecipes}
            isLoading={isLoading}
            isPending={isPending || searchLoading}
            isFavorited={isFavorited}
            onToggleFavorite={toggleFavorite}
            onSelectRecipe={onSelectRecipe}
          />
        )}

        {showSearchFeedback && <SearchFeedback searchTerm={searchQuery} onGoHome={() => setSearchQuery('')} />}

        <Pagination
          currentPage={currentPage}
          totalPages={1}
          onPageChange={setCurrentPage}
          hidden={isSearchActive}
        />
      </PageLayout>
    </>
  );
}
