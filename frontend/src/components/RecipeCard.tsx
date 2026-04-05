import { AlertCircle, Clock, Heart } from 'lucide-react';
import { Recipe } from '../types/recipe';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { useCachedImage } from '../hooks/useCachedImage';

interface RecipeCardProps {
  recipe: Recipe;
  onCookNow: (recipe: Recipe) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export function RecipeCard({ recipe, onCookNow, isFavorited, onToggleFavorite }: RecipeCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'es';
  const displayTitle = lang === 'en' && recipe.titleEn ? recipe.titleEn : recipe.title;
  const hasBorderlineIngredients = recipe.ingredients.some(ing => ing.isBorderlineSafe);
  const { imageSrc, loading } = useCachedImage(recipe.imageUrl);

  const safetyColor = recipe.safetyLevel === 'safe' 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : recipe.safetyLevel === 'review'
      ? 'bg-amber-50 text-amber-900 border-amber-200'
      : 'bg-red-50 text-red-900 border-red-200';

  const safetyText = recipe.safetyLevel === 'safe'
    ? t('recipe.safe')
    : recipe.safetyLevel === 'review'
      ? t('recipe.review')
      : t('recipe.avoid');

  return (
    <article 
      onClick={() => onCookNow(recipe)}
      className="group relative flex flex-col bg-white rounded-2xl border border-brand-sage/10 overflow-hidden cursor-pointer hover-lift shadow-sm animate-fade-in"
    >
      {/* Image Container */}
      <div className="relative h-56 w-full overflow-hidden shrink-0 bg-brand-cream">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-brand-sage/10" />
        ) : imageSrc ? (
          <img 
            src={imageSrc} 
            alt={recipe.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
        
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border tracking-wide uppercase ${safetyColor}`}>
            {safetyText}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(e);
          }}
          className={`absolute top-4 right-4 backdrop-blur-md transition-all shadow-sm border border-white/20 active:scale-90 ${
            isFavorited 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-white/80 text-slate-500 hover:text-red-500 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </Button>

        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md bg-white/90 text-slate-700 shadow-sm border border-slate-200/50 tracking-wide flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {recipe.prepTimeMinutes} {t('common.min')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="text-xl font-bold text-brand-forest leading-tight line-clamp-2">
            {displayTitle}
          </h3>
          
          {hasBorderlineIngredients && (
            <div className="group/tooltip relative shrink-0 pt-0.5">
              <AlertCircle className="w-5 h-5 text-amber-500 cursor-help" />
              <div className="absolute right-0 bottom-full mb-2 w-56 p-2.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-10 shadow-xl font-medium">
                {t('recipe.borderlineTooltip')}
                <svg className="absolute text-slate-800 h-2 w-full left-0 top-full translate-x-[4.5rem]" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve">
                  <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
          {recipe.siboAllergiesTags.map((tag, idx) => {
            const displayTag = lang === 'en' ? tag.en : tag.es;
            return (
              <span key={idx} className="px-2.5 py-1 rounded-md bg-brand-forest/5 text-brand-forest text-[10px] font-bold tracking-wider uppercase border border-brand-forest/10">
                {displayTag}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse shadow-sm animate-fade-in">
      <div className="h-56 w-full bg-slate-200/60"></div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between gap-4 mb-4">
          <div className="h-6 bg-slate-200/80 rounded-md w-3/4"></div>
          <div className="h-5 w-5 bg-slate-200/80 rounded-full shrink-0"></div>
        </div>
        <div className="flex gap-2 mb-6">
          <div className="h-5 bg-slate-200/60 rounded w-20"></div>
          <div className="h-5 bg-slate-200/60 rounded w-24"></div>
        </div>
        <div className="h-12 bg-slate-200/80 rounded-xl w-full"></div>
      </div>
    </div>
  );
}
