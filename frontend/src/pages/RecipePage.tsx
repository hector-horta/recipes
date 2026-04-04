import { useState } from 'react';
import { Recipe } from '../types/recipe';
import { useFavorites } from '../hooks/useFavorites';
import { useMergedDisplayRecipes } from '../hooks/useMergedDisplayRecipes';
import { TopNav } from '../components/recipe/TopNav';
import { PageHeader } from '../components/recipe/PageHeader';
import { RecipeGrid } from '../components/recipe/RecipeGrid';
import { Pagination } from '../components/recipe/Pagination';
import { PageLayout } from '../components/recipe/PageLayout';

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
  const { favorites, toggleFavorite, isFavorited, isLoading: favsLoading } = useFavorites();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  return (
    <>
      <TopNav onOpenLogin={onOpenLogin} onOpenOnboarding={onOpenOnboarding} />
      <PageLayout>
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
      </PageLayout>
    </>
  );
}
