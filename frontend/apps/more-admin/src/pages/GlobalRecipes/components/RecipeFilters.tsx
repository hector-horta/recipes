import React from 'react';
import { Search, Filter, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { T } from '../constants';
import type { Tag } from '../types';

interface RecipeFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredCount: number;
  tags: Tag[] | undefined;
  activeLang: 'es' | 'en';
  selectedTags: string[];
  toggleFilterTag: (tagKey: string) => void;
}

export const RecipeFilters: React.FC<RecipeFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filteredCount,
  tags,
  activeLang,
  selectedTags,
  toggleFilterTag,
}) => {
  const { t } = useTranslation();

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2" size={20} style={{ color: T.muted }} />
          <input
            type="text"
            placeholder={t('recipes.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 rounded-2xl outline-none transition-all font-medium"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.muted }}>
          <Filter size={16} />
          <span>{t('recipes.ui.results_count', { count: filteredCount })}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mr-2" style={{ color: T.muted }}>
          <Sparkles size={14} style={{ color: T.primary }} /> {t('recipes.filter_allergens')}
        </div>
        {tags?.map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleFilterTag(tag.key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={selectedTags.includes(tag.key)
              ? { backgroundColor: T.primary, color: T.dark, transform: 'scale(1.05)' }
              : { backgroundColor: T.surfaceHi, color: T.muted, border: `1px solid ${T.outline}` }}
          >
            {t(`tags.items.${tag.key}`, { defaultValue: activeLang === 'es' ? tag.es : tag.en })}
          </button>
        ))}
      </div>
    </div>
  );
};
