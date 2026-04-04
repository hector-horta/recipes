import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../types/recipe';
import { useFavorites } from '../hooks/useFavorites';
import { TopNav } from '../components/recipe/TopNav';
import { PageHeader } from '../components/recipe/PageHeader';
import { RecipeGrid } from '../components/recipe/RecipeGrid';
import { Pagination } from '../components/recipe/Pagination';

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
  const { t } = useTranslation();
  
  const { favorites, toggleFavorite, isFavorited, isLoading: favsLoading } = useFavorites();
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const isSearchActive = searchQuery.trim().length >= 3;
  
  const displayRecipes: Recipe[] = useMemo(() => {
    if (isSearchActive) return recipes;

    const favoriteIds = new Set(favorites.map((f: any) => f.spoonacular_id.toString()));

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
      siboAllergiesTags: [t('recipe.favorite')]
    }));

    if (favoriteRecipes.length >= itemsPerPage) {
      const start = (currentPage - 1) * itemsPerPage;
      return favoriteRecipes.slice(start, start + itemsPerPage);
    } else {
      const needed = itemsPerPage - favoriteRecipes.length;
      const filteredRecommendations = recipes.filter(r => !favoriteIds.has(r.id));
      const fill = filteredRecommendations.slice(0, needed);
      return [...favoriteRecipes, ...fill];
    }
  }, [isSearchActive, recipes, favorites, currentPage, t]);

  const isLoading = (hookLoading || favsLoading || isPending) && displayRecipes.length === 0;
  const isRefreshing = (hookLoading || isPending) && displayRecipes.length > 0;
  
  const totalPages = Math.ceil(favorites.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-brand-cream font-sans selection:bg-brand-sage/20">
      <TopNav onOpenLogin={onOpenLogin} onOpenOnboarding={onOpenOnboarding} />

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSearchActive={isSearchActive}
            hasFavorites={favorites.length > 0}
            isQuotaExhausted={isQuotaExhausted}
            showLoader={hookLoading || isPending}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
          />

          <RecipeGrid 
            recipes={displayRecipes}
            isLoading={isLoading}
            isPending={isPending || hookLoading}
            isFavorited={isFavorited}
            onToggleFavorite={toggleFavorite}
            onSelectRecipe={onSelectRecipe}
          />

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            hidden={isSearchActive}
          />
        </div>
      </div>
    </div>
  );
}
