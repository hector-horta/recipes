import { useTranslation } from 'react-i18next';
import { UtensilsCrossed } from 'lucide-react';
import { RecipeCard, RecipeCardSkeleton } from '../RecipeCard';
import { Recipe } from '../../types/recipe';

interface RecipeGridProps {
  recipes: Recipe[];
  isLoading: boolean;
  isPending: boolean;
  isFavorited: (id: string) => boolean;
  onToggleFavorite: (payload: { id: string, title: string, imageUrl: string }) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onTagClick?: (tag: string) => void;
}

export function RecipeGrid({
  recipes,
  isLoading,
  isPending,
  isFavorited,
  onToggleFavorite,
  onSelectRecipe,
  onTagClick
}: RecipeGridProps) {
  const { t } = useTranslation();
  const itemsPerPage = 10;

  if (!isLoading && recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-brand-sage/10 rounded-full flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-10 h-10 text-brand-sage" />
        </div>
        <h3 className="text-2xl font-bold text-brand-forest mb-2">{t('home.noRecipes')}</h3>
        <p className="text-brand-text-muted max-w-xs mb-8">
          {t('home.noRecipesDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {(isLoading || isPending) ? (
        Array.from({ length: itemsPerPage }).map((_, idx) => (
          <RecipeCardSkeleton key={`skeleton-${idx}`} />
        ))
      ) : (
        recipes.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              isFavorited={isFavorited(recipe.id)}
              onToggleFavorite={() => onToggleFavorite({ id: recipe.id, title: recipe.title, imageUrl: recipe.imageUrl })}
              onCookNow={() => onSelectRecipe(recipe)} 
              onTagClick={onTagClick}
            />
          ))
      )}
    </div>
  );
}

