import { ArrowLeft, Clock, ChefHat, ListChecks, Heart } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Recipe } from '../types/recipe';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import { useCachedImage } from '../hooks/useCachedImage';

interface RecipeDetailPageProps {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetailPage({ recipe, onBack }: RecipeDetailPageProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'es';
  const displayTitle = lang === 'en' && recipe.titleEn ? recipe.titleEn : recipe.title;
  const displayInstructions = lang === 'en' && recipe.instructionsEn?.length ? recipe.instructionsEn : recipe.instructions;
  const { toggleFavorite, isFavorited } = useFavorites();
  const favorited = isFavorited(recipe.id);
  const { imageSrc, loading } = useCachedImage(recipe.imageUrl);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({ id: recipe.id, title: displayTitle, imageUrl: recipe.imageUrl });
  };

  return (
    <div className="min-h-screen bg-brand-cream font-sans">
      {/* Hero Section with Image */}
      <div className="relative h-[40vh] sm:h-[50vh] w-full bg-brand-forest/10">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-brand-sage/10" />
        ) : imageSrc ? (
          <img 
            src={imageSrc} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-forest/90 via-brand-forest/40 to-transparent"></div>
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/50 to-transparent"></div>
        
        {/* Navigation Header */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10">
          <button 
            onClick={onBack}
            className="p-2 sm:p-3 rounded-2xl bg-black/20 backdrop-blur-xl text-white hover:bg-black/30 transition-all border border-white/10 shadow-xl"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-6 h-6 drop-shadow-sm" />
          </button>

          <button 
            onClick={handleToggle}
            className={`p-3 rounded-2xl backdrop-blur-xl transition-all border shadow-xl active:scale-95 ${
              favorited 
                ? 'bg-red-500 text-white border-red-400' 
                : 'bg-black/20 text-white hover:bg-black/30 border-white/10'
            }`}
            aria-label={favorited ? t('recipe.removeFavorite') : t('recipe.addFavorite')}
          >
            <Heart className={`w-6 h-6 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Title and Badge Over Image */}
        <div className="absolute bottom-0 inset-x-0 p-8 sm:p-12 text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.siboAllergiesTags.map((tag, idx) => {
                const displayTag = lang === 'en' ? tag.en : tag.es;
                return (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-black/30 backdrop-blur-md text-xs font-bold tracking-wider uppercase border border-white/20 text-white">
                    {displayTag}
                  </span>
                );
              })}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 drop-shadow-md">
              {displayTitle}
            </h1>
            <div className="flex items-center gap-6 text-sm font-medium">
              <span className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10">
                <Clock className="w-5 h-5 text-brand-mint" />
                {t('recipe.prepTime', { min: recipe.prepTimeMinutes })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-6 sm:px-12 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Info */}
          <div className="lg:col-span-12">
            {recipe.summary && (
              <div 
                className="text-lg text-brand-text-muted mb-12 prose prose-brand leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(recipe.summary) }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              
              {/* Ingredients List */}
              <section>
                <div className="flex items-center gap-3 mb-8 border-b border-brand-sage/10 pb-4">
                  <div className="p-3 bg-brand-sage/10 rounded-2xl text-brand-forest border border-brand-sage/20">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-brand-forest">{t('recipe.ingredients')}</h2>
                </div>
                <ul className="space-y-3.5">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={ing.id || idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-brand-sage/10 hover:border-brand-mint/40 hover-lift shadow-sm group">
                      <div className="w-8 h-8 rounded-full bg-brand-cream border border-brand-sage/20 flex items-center justify-center text-xs font-black text-brand-teal group-hover:bg-brand-mint group-hover:text-brand-forest transition-colors">
                        {idx + 1}
                      </div>
                      <span className="text-brand-text font-bold capitalize">
                        {ing.quantity && <span className="text-brand-teal font-black">{ing.quantity} </span>}
                        {ing.unit && <span className="text-brand-text-muted text-sm">{ing.unit} </span>}
                        {lang === 'en' && ing.nameEn ? ing.nameEn : ing.name}
                      </span>
                      {ing.isBorderlineSafe && (
                        <span className="ml-auto px-2 py-1 text-[9px] font-black bg-brand-peach/20 text-brand-forest border border-brand-peach/40 rounded-lg uppercase tracking-tight">
                          {t('recipe.personalLimit')}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Instructions List */}
              <section>
                <div className="flex items-center gap-3 mb-8 border-b border-brand-sage/10 pb-4">
                  <div className="p-3 bg-brand-mint/10 rounded-2xl text-brand-forest border border-brand-mint/20">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black text-brand-forest">{t('recipe.preparation')}</h2>
                </div>
                <div className="space-y-10">
                  {displayInstructions.length > 0 ? (
                    displayInstructions.map((step, idx) => (
                      <div key={idx} className="relative pl-12">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-brand-forest text-brand-cream flex items-center justify-center text-sm font-black shadow-md">
                          {idx + 1}
                        </div>
                        <p className="text-brand-text leading-relaxed text-lg font-medium">
                          {step}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-brand-text-muted italic">{t('recipe.noInstructions')}</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="border-t border-brand-sage/10 py-16 text-center bg-brand-sage/5">
        <p className="text-brand-text-muted text-sm font-bold tracking-wide flex items-center justify-center gap-2">
          {t('recipe.mindfulNutrition')} <span className="text-brand-teal">&bull;</span> Wati
        </p>
      </div>
    </div>
  );
}
