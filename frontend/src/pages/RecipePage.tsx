import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { Recipe } from '../types/recipe';
import { Button } from '../components/ui/Button';
import { useFavorites } from '../hooks/useFavorites';
import { useMergedDisplayRecipes } from '../hooks/useMergedDisplayRecipes';
import { TopNav } from '../components/recipe/TopNav';
import { PageHeader } from '../components/recipe/PageHeader';
import { RecipeGrid } from '../components/recipe/RecipeGrid';
import { Pagination } from '../components/recipe/Pagination';
import { PageLayout } from '../components/recipe/PageLayout';
import { SearchFeedback } from '../components/recipe/SearchFeedback';
import { AllergenSafetyGate } from '../components/recipe/AllergenSafetyGate';
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
  filteredUnsafeCount?: number;
  filteredAllergens?: string[];
  includeUnsafe?: boolean;
  setIncludeUnsafe?: (val: boolean) => void;
  onLogoClick: () => void;
}

export function RecipePage({
  onSelectRecipe,
  onOpenLogin,
  onOpenOnboarding,
  query: searchQuery,
  setQuery: setSearchQuery,
  results: recipes,
  isLoading: hookLoading,
  isPending,
  isSearching,
  isQuotaExhausted,
  refresh,
  filteredUnsafeCount = 0,
  filteredAllergens = [],
  setIncludeUnsafe,
  includeUnsafe = false,
  onLogoClick
}: RecipePageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { favorites, toggleFavorite, isFavorited, isLoading: favsLoading } = useFavorites();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSelectRecipeClick = (recipe: Recipe) => {
    if (!user) {
      onOpenLogin();
      return;
    }
    onSelectRecipe(recipe);
  };

  const isSearchActive = searchQuery.trim().length >= 3;
  const { displayRecipes, totalPages } = useMergedDisplayRecipes({
    recipes,
    favorites,
    isSearchActive,
    currentPage,
    itemsPerPage
  });

  const isLoading = (hookLoading || favsLoading || isPending) && displayRecipes.length === 0;
  const isRefreshing = (hookLoading || isPending) && displayRecipes.length > 0;
  
  const isListEmpty = !isLoading && !isRefreshing && displayRecipes.length === 0;
  const showSafetyGate = isSearchActive && isListEmpty && filteredUnsafeCount > 0;
  const showSearchFeedback = isSearchActive && isListEmpty && !showSafetyGate;

  return (
    <>
      <TopNav 
        onOpenLogin={onOpenLogin} 
        onOpenOnboarding={onOpenOnboarding} 
        onLogoClick={onLogoClick}
      />
      <PageLayout>
        <PageHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearchActive={isSearchActive}
          hasFavorites={favorites.length > 0}
          isQuotaExhausted={isQuotaExhausted}
          showLoader={hookLoading || isPending}
          isSearching={isSearching}
          onOpenLogin={onOpenLogin}
        />

        {!isListEmpty && (
          <>
            {includeUnsafe && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900 leading-none mb-1">
                      {t('recipe.safety.overrideActive')}
                    </h3>
                    <p className="text-amber-700 text-sm">
                      {t('recipe.safety.overrideActiveDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <RecipeGrid
              recipes={displayRecipes}
              isLoading={isLoading}
              isPending={isPending || hookLoading}
              isFavorited={isFavorited}
              onToggleFavorite={toggleFavorite}
              onSelectRecipe={handleSelectRecipeClick}
              onTagClick={(tag) => {
                setSearchQuery(tag);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            {!user && (
              <div className="flex justify-center mt-12 mb-8">
                <Button 
                  variant="secondary"
                  onClick={refresh}
                  disabled={isRefreshing}
                  isLoading={isRefreshing}
                  leftIcon={!isRefreshing && <RefreshCw className="w-4 h-4" />}
                  className="shadow-sm font-bold min-w-[200px] hover:bg-brand-sage/10 active:scale-95 transition-all hover:shadow-md"
                >
                  {t('common.moreRecipes')}
                </Button>
              </div>
            )}
          </>
        )}


        {showSafetyGate && (
          <AllergenSafetyGate 
            searchTerm={searchQuery}
            filteredCount={filteredUnsafeCount}
            allergens={filteredAllergens}
            onOverride={() => setIncludeUnsafe?.(true)}
            onDismiss={() => setSearchQuery('')}
          />
        )}

        {showSearchFeedback && <SearchFeedback searchTerm={searchQuery} onGoHome={() => setSearchQuery('')} />}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          hidden={!user || isSearchActive || isListEmpty}
        />
      </PageLayout>
    </>
  );
}
