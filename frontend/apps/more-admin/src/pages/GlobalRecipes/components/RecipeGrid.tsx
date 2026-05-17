import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Pencil, Trash2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { T } from '../constants';
import type { Recipe } from '../types';

interface RecipeGridProps {
  recipesLoading: boolean;
  filteredRecipes: Recipe[];
  selectedIds: string[];
  activeLang: 'es' | 'en';
  toggleSelection: (id: string) => void;
  handleEdit: (recipe: Recipe) => void;
  deleteMutation: { mutate: (id: string) => void };
}

export const RecipeGrid: React.FC<RecipeGridProps> = ({
  recipesLoading,
  filteredRecipes,
  selectedIds,
  activeLang,
  toggleSelection,
  handleEdit,
  deleteMutation,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {recipesLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`loading-grid-${i}`} className="aspect-[4/5] animate-pulse rounded-[2.5rem]" style={{ backgroundColor: T.surfaceHi }} />
            ))
          ) : filteredRecipes?.map((recipe) => (
            <motion.div
              layout
              key={recipe.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -10 }}
              className="group rounded-[2.5rem] p-4 transition-all relative flex flex-col"
              style={selectedIds.includes(recipe.id)
                ? { backgroundColor: T.primary05, border: `1px solid ${T.primary}` }
                : { backgroundColor: T.surface, border: `1px solid ${T.outline}` }}
            >
              <div className="aspect-square rounded-[2rem] overflow-hidden mb-4 relative" style={{ backgroundColor: T.surfaceHi }}>
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg transition-all shadow-md cursor-pointer"
                    style={{ accentColor: T.primary }}
                    checked={selectedIds.includes(recipe.id)}
                    onChange={() => toggleSelection(recipe.id)}
                  />
                </div>
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={t('recipes.image_alt', { title: activeLang === 'es' ? recipe.title : recipe.titleEn })}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: T.outline }}>
                    <ChefHat size={64} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <span
                    className="backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black"
                    style={(recipe as any).status === 'published'
                      ? { backgroundColor: T.primary85, color: T.dark }
                      : { backgroundColor: T.warning85, color: T.dark }}
                  >
                    {(recipe as any).status === 'published' ? t('recipes.status.published') : (recipe as any).status === 'draft' ? t('recipes.status.draft') : t('recipes.status.archived')}
                  </span>
                </div>
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6 rounded-[2rem]"
                  style={{ backgroundImage: `linear-gradient(to top, ${T.dark80}, transparent, transparent)` }}
                >
                   <div className="flex gap-2">
                     <button 
                       onClick={() => handleEdit(recipe)}
                       className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                       style={{ backgroundColor: T.text, color: T.dark }}
                     >
                       <Pencil size={14} /> {t('common.edit')}
                     </button>
                     <button 
                       onClick={() => {
                         if (confirm(t('recipes.messages.confirm_delete'))) deleteMutation.mutate(recipe.id);
                       }}
                        className="p-2.5 rounded-xl"
                       style={{ backgroundColor: T.danger, color: T.white }}
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                </div>
              </div>
              
              <div className="px-2 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ 
                      backgroundColor: recipe.safetyLevel === 'safe' ? T.success :
                                       recipe.safetyLevel === 'review' ? T.warning : T.danger 
                    }} 
                  />
                  <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: T.muted }}>
                    {t('recipes.risk_label')} {t(`recipes.sibo_risk.${recipe.safetyLevel}`)}
                  </span>
                </div>
                <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1" style={{ color: T.text }}>
                  {activeLang === 'es' ? recipe.title : recipe.titleEn}
                </h3>
                <div className="flex items-center justify-between text-[11px] font-bold" style={{ color: T.muted }}>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock size={12} /> {recipe.prepTimeMinutes + recipe.cookTimeMinutes}{t('recipes.ui.minutes_short')}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {(recipe as any).servings}</span>
                  </div>
                  <span className="uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>{t(`recipes.difficulty.${(recipe as any).difficulty}`)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!recipesLoading && filteredRecipes?.length === 0 && (
        <div className="py-20 text-center">
          <p style={{ color: T.muted }}>{t('recipes.no_results_found')}</p>
        </div>
      )}
    </div>
  );
};
