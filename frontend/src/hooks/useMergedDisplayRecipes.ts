import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Recipe } from '../types/recipe';
import { FavoriteItem } from './useFavorites';

interface UseMergedDisplayRecipesOptions {
  recipes: Recipe[];
  favorites: FavoriteItem[];
  isSearchActive: boolean;
  currentPage: number;
  itemsPerPage?: number;
}

export function useMergedDisplayRecipes({
  recipes,
  favorites,
  isSearchActive,
  currentPage,
  itemsPerPage = 10
}: UseMergedDisplayRecipesOptions) {
  const { t } = useTranslation();

  const displayRecipes: Recipe[] = useMemo(() => {
    if (isSearchActive) return recipes;

    const favoriteIds = new Set(favorites.map((f) => f.recipe_id));

    const favoriteRecipes: Recipe[] = favorites.map((f) => ({
      id: f.recipe_id,
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
    }

    const needed = itemsPerPage - favoriteRecipes.length;
    const filteredRecommendations = recipes.filter(r => !favoriteIds.has(r.id));
    const fill = filteredRecommendations.slice(0, needed);
    return [...favoriteRecipes, ...fill];
  }, [isSearchActive, recipes, favorites, currentPage, itemsPerPage, t]);

  const totalPages = Math.ceil(favorites.length / itemsPerPage);

  return { displayRecipes, totalPages };
}
