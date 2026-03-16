import { ArrowLeft, Clock, ChefHat, ListChecks } from 'lucide-react';
import { Recipe } from '../types/recipe';

interface RecipeDetailPageProps {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetailPage({ recipe, onBack }: RecipeDetailPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero Section with Image */}
      <div className="relative h-[40vh] sm:h-[50vh] w-full bg-slate-100">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        
        {/* Navigation Header */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center">
          <button 
            onClick={onBack}
            className="p-2 sm:p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors shadow-lg"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Title and Badge Over Image */}
        <div className="absolute bottom-0 inset-x-0 p-8 sm:p-12 text-white">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.siboAllergiesTags.map(tag => (
                <span key={tag} className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold tracking-wider uppercase border border-white/20 text-white">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 drop-shadow-md">
              {recipe.title}
            </h1>
            <div className="flex items-center gap-6 text-sm font-medium text-white/90">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <Clock className="w-5 h-5 text-sky-300" />
                {recipe.prepTimeMinutes} min. de preparación
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
                className="text-lg text-slate-600 mb-12 prose prose-slate"
                dangerouslySetInnerHTML={{ __html: recipe.summary }}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              
              {/* Ingredients List */}
              <section>
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600">
                    <ListChecks className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Ingredientes</h2>
                </div>
                <ul className="space-y-4">
                  {recipe.ingredients.map((ing, idx) => (
                    <li key={ing.id || idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-sky-100 hover:shadow-sm transition-all group">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-sky-500 group-hover:border-sky-200 shadow-sm shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-slate-700 font-medium pt-1 capitalize">{ing.name}</span>
                      {ing.isBorderlineSafe && (
                        <span className="ml-auto px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded uppercase tracking-tighter self-center">
                          Límite Personal
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Instructions List */}
              <section>
                <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-4">
                  <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
                    <ChefHat className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">Preparación</h2>
                </div>
                <div className="space-y-8">
                  {recipe.instructions.length > 0 ? (
                    recipe.instructions.map((step, idx) => (
                      <div key={idx} className="relative pl-10">
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-black shadow-sm">
                          {idx + 1}
                        </div>
                        <p className="text-slate-700 leading-relaxed text-lg">
                          {step}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No hay instrucciones disponibles para esta receta.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="border-t border-slate-50 py-12 text-center bg-slate-50/50">
        <p className="text-slate-400 text-sm font-medium">Bon Appétit • Cocina Segura con Wati</p>
      </div>
    </div>
  );
}
