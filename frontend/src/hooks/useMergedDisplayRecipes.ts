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

    const favoriteRecipes: Recipe[] = favorites.map((f) => {
      // Si el favorito incluye datos de la receta real (ya normalizada por el backend), usarlos directamente
      const recipeData = (f as any).recipe;
      if (recipeData) {
        return {
          ...recipeData,
          imageUrl: recipeData.imageUrl || f.image || ''
        };
      }

      // Fallback para favoritos sin datos de receta (compatibilidad)
      return {
        id: f.recipe_id,
        title: f.title,
        imageUrl: f.image,
        prepTimeMinutes: 20,
        estimatedCost: 2,
        ingredients: [],
        instructions: [],
        summary: '',
        safetyLevel: 'safe',
        isFavorite: true,
        siboAllergiesTags: [{ es: t('recipe.favorite'), en: t('recipe.favorite') }]
      };
    });

    const allMerged = [...favoriteRecipes, ...recipes.filter(r => !favoriteIds.has(r.id))];
    const start = (currentPage - 1) * itemsPerPage;
    return allMerged.slice(start, start + itemsPerPage);
  }, [isSearchActive, recipes, favorites, currentPage, itemsPerPage, t]);

  const favoriteIds = new Set(favorites.map((f) => f.recipe_id));
  const totalItems = isSearchActive ? recipes.length : favorites.length + recipes.filter(r => !favoriteIds.has(r.id)).length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return { displayRecipes, totalPages };
}
