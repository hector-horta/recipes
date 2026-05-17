import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { T } from '../constants';
import type { Recipe } from '../types';

interface RecipeTableProps {
  recipesLoading: boolean;
  filteredRecipes: Recipe[];
  selectedIds: string[];
  activeLang: 'es' | 'en';
  toggleAll: () => void;
  toggleSelection: (id: string) => void;
  handleEdit: (recipe: Recipe) => void;
  deleteMutation: { mutate: (id: string) => void };
  setSearchTerm: (term: string) => void;
  setSelectedTags: (tags: string[]) => void;
}

export const RecipeTable: React.FC<RecipeTableProps> = ({
  recipesLoading,
  filteredRecipes,
  selectedIds,
  activeLang,
  toggleAll,
  toggleSelection,
  handleEdit,
  deleteMutation,
  setSearchTerm,
  setSelectedTags,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr style={{ backgroundColor: T.surfaceHi }}>
            <th className="px-8 py-5 w-10">
              <input
                type="checkbox"
                className="w-5 h-5 rounded-lg transition-all cursor-pointer"
                style={{ accentColor: T.primary }}
                checked={selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0}
                onChange={toggleAll}
              />
            </th>
            <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
              {t('dashboard.table.recipe')}
            </th>
            <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
              {t('recipes.difficulty')}
            </th>
            <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
              {t('recipes.sibo_risk')}
            </th>
            <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest" style={{ color: T.muted }}>
              {t('common.status')}
            </th>
            <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-right" style={{ color: T.muted }}>
              {t('common.actions')}
            </th>
          </tr>
        </thead>
        <tbody style={{ borderTop: `1px solid ${T.outline}` }}>
          <AnimatePresence mode="popLayout">
            {recipesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`loading-${i}`} className="animate-pulse">
                  <td colSpan={6} className="px-8 py-6">
                    <div className="h-16 rounded-2xl w-full" style={{ backgroundColor: T.surfaceHi }} />
                  </td>
                </tr>
              ))
            ) : filteredRecipes.map((recipe) => (
              <motion.tr
                layout
                key={recipe.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="transition-all group"
                style={{ borderTop: `1px solid ${T.outline}`, backgroundColor: selectedIds.includes(recipe.id) ? T.primary05 : 'transparent' }}
                onMouseEnter={(e) => { if (!selectedIds.includes(recipe.id)) (e.currentTarget as HTMLElement).style.backgroundColor = T.surfaceHi; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = selectedIds.includes(recipe.id) ? T.primary05 : 'transparent'; }}
              >
                <td className="px-8 py-6">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg transition-all cursor-pointer"
                    style={{ accentColor: T.primary }}
                    checked={selectedIds.includes(recipe.id)}
                    onChange={() => toggleSelection(recipe.id)}
                  />
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300" style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}>
                      {recipe.imageUrl ? (
                        <img 
                          src={recipe.imageUrl} 
                          alt={t('recipes.image_alt', { title: activeLang === 'es' ? recipe.title : recipe.titleEn })} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <ChefHat size={28} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-lg leading-tight truncate" style={{ color: T.text }}>
                        {activeLang === 'es' ? recipe.title : recipe.titleEn}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(recipe.id);
                            toast.success(t('recipes.messages.copy_slug_success'));
                          }}
                          className="text-[10px] font-black font-mono uppercase px-2 py-0.5 rounded transition-colors"
                          style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}
                        >
                          {recipe.id}
                        </button>
                        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: T.muted }}>
                          <Clock size={12} />
                          {recipe.prepTimeMinutes + recipe.cookTimeMinutes} {t('recipes.ui.minutes_suffix')}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full"
                    style={(recipe as any).difficulty === 'easy'
                      ? { backgroundColor: T.success15, color: T.success }
                      : (recipe as any).difficulty === 'medium'
                      ? { backgroundColor: T.warning15, color: T.warningBadge }
                      : { backgroundColor: T.danger15, color: T.danger }}
                  >
                    {t(`recipes.difficulty.${(recipe as any).difficulty}`)}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2.5 h-2.5 rounded-full shadow-sm" 
                      style={{ 
                        backgroundColor: recipe.safetyLevel === 'safe' ? T.success :
                                         recipe.safetyLevel === 'review' ? T.warning : T.danger 
                      }} 
                    />
                    <span className="text-sm font-bold capitalize" style={{ color: T.text }}>{t(`recipes.sibo_risk.${recipe.safetyLevel}`)}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span
                    className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                    style={(recipe as any).status === 'published'
                      ? { backgroundColor: T.primary12, color: T.primary }
                      : (recipe as any).status === 'draft'
                      ? { backgroundColor: T.warning12, color: T.warning }
                      : { backgroundColor: T.muted12, color: T.grey }}
                  >
                    {(recipe as any).status === 'published' ? `● ${t('recipes.status.published')}` : (recipe as any).status === 'draft' ? `○ ${t('recipes.status.draft')}` : t('recipes.status.archived')}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(recipe)}
                      className="p-3 rounded-xl transition-all"
                      style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                      title={t('recipes.edit_recipe')}
                    >
                      <Pencil size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (confirm(t('recipes.messages.confirm_delete'))) {
                          deleteMutation.mutate(recipe.id);
                        }
                      }}
                      className="p-3 rounded-xl transition-all"
                      style={{ backgroundColor: T.danger08, color: T.danger, border: `1px solid ${T.danger15}` }}
                      title={t('recipes.delete_recipe')}
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
          {!recipesLoading && filteredRecipes?.length === 0 && (
            <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <td colSpan={6} className="px-8 py-20 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>
                    <ChefHat size={40} strokeWidth={1} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-xl" style={{ color: T.text }}>{t('recipes.no_results')}</p>
                    <p className="font-medium" style={{ color: T.muted }}>{t('recipes.no_results_subtitle')}</p>
                  </div>
                  <button
                    onClick={() => { setSearchTerm(''); setSelectedTags([]); }}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
                  >
                    {t('recipes.clear_filters')}
                  </button>
                </div>
              </td>
            </motion.tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
