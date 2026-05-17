import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChefHat, BookOpen, Plus, Filter } from 'lucide-react';
import { T, itemVariants } from '../constants';

interface RecipeHeaderProps {
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  handleNew: () => void;
}

export const RecipeHeader: React.FC<RecipeHeaderProps> = ({ viewMode, setViewMode, handleNew }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: T.primary08, color: T.primary }}>
            <ChefHat size={28} />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>{t('recipes.title')}</h2>
        </div>
        <p className="font-medium" style={{ color: T.muted }}>{t('recipes.subtitle')}</p>
      </motion.div>
      
      <div className="flex items-center gap-4">
        <div className="p-1 rounded-2xl flex" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
          <button
            onClick={() => setViewMode('table')}
            className="p-2 rounded-xl transition-all"
            style={viewMode === 'table' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
            title={t('recipes.view_table')}
          >
            <Filter size={20} className="rotate-90" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className="p-2 rounded-xl transition-all"
            style={viewMode === 'grid' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
            title={t('recipes.view_grid')}
          >
            <BookOpen size={20} />
          </button>
        </div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNew}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all group"
          style={{ backgroundColor: T.primary, color: T.dark }}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('recipes.create')}</span>
        </motion.button>
      </div>
    </div>
  );
};
