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
      // Si el favorito incluye datos de la receta real, usarlos
      const recipeData = (f as any).recipe;
      if (recipeData) {
        const ingredients = (recipeData.ingredients || []).map((i: any) => ({
          id: i.name?.es || i.name || 'unknown',
          name: i.name?.es || i.name || 'Desconocido',
          nameEn: i.name?.en || '',
          quantity: i.quantity || '',
          unit: typeof i.unit === 'object' ? (i.unit?.es || '') : (i.unit || ''),
          unitEn: typeof i.unit === 'object' ? (i.unit?.en || '') : '',
          siboAlert: i.siboAlert || false
        }));

        const instructions = (recipeData.steps || [])
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((s: any) => s.instruction?.es || s.instruction || '');

        const tags = (recipeData.tags || [])
          .map((t: any) => typeof t === 'object' && t.es ? t : { es: t, en: t })
          .filter((t: any) => t.es && t.es.trim() !== '');

        return {
          id: recipeData.id,
          title: recipeData.title_es,
          titleEn: recipeData.title_en,
          imageUrl: recipeData.image_url || f.image || '',
          prepTimeMinutes: recipeData.prep_time_minutes || 20,
          estimatedCost: 2,
          ingredients,
          instructions: instructions.length > 0 ? instructions : ['Sin instrucciones disponibles.'],
          instructionsEn: (recipeData.steps || [])
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((s: any) => s.instruction?.en || ''),
          summary: '',
          safetyLevel: recipeData.sibo_risk_level === 'safe' ? 'safe' : (recipeData.sibo_risk_level === 'caution' ? 'review' : 'unsafe'),
          siboAllergiesTags: [{ es: t('recipe.favorite'), en: t('recipe.favorite') }, ...tags],
          siboAlerts: recipeData.sibo_alerts || []
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
