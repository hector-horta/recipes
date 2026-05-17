import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

import { T, containerVariants, itemVariants } from './constants';
import { useRecipeQueries } from './hooks/useRecipeQueries';
import { useRecipeState } from './hooks/useRecipeState';
import { useRecipeMutations } from './hooks/useRecipeMutations';

import { RecipeHeader } from './components/RecipeHeader';
import { RecipeFilters } from './components/RecipeFilters';
import { RecipeTable } from './components/RecipeTable';
import { RecipeGrid } from './components/RecipeGrid';
import { RecipeFormModal } from './components/RecipeFormModal';

export const GlobalRecipes: React.FC = () => {
  const { t } = useTranslation();

  useEffect(() => {
    logger.info('ADMIN_GLOBAL_RECIPES_VIEW');
  }, []);

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const [totalRecipes, setTotalRecipes] = React.useState(0);

  const { recipesQuery, tagsQuery } = useRecipeQueries(currentPage, pageSize, setTotalRecipes);
  const recipes = recipesQuery.data;
  const recipesLoading = recipesQuery.isLoading;
  const tags = tagsQuery.data;

  const {
    isModalOpen,
    setIsModalOpen,
    editingRecipe,
    formData,
    setFormData,
    viewMode,
    setViewMode,
    activeLang,
    setActiveLang,
    selectedIds,
    setSelectedIds,
    searchTerm,
    setSearchTerm,
    selectedTags,
    setSelectedTags,
    imageFeedback,
    setImageFeedback,
    filteredRecipes,
    toggleSelection,
    toggleAll,
    toggleFilterTag,
    handleEdit,
    handleCloseModal,
    handleNew
  } = useRecipeState(recipes);

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    bulkUpdateStatusMutation,
    bulkDeleteMutation,
    refreshImageMutation
  } = useRecipeMutations({
    setIsModalOpen,
    setSelectedIds,
    setFormData,
    setImageFeedback
  });

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      <RecipeHeader 
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleNew={handleNew}
      />

      <motion.div
        variants={itemVariants}
        className="rounded-[2rem] overflow-hidden"
        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}` }}
      >
        <RecipeFilters 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredCount={filteredRecipes?.length || 0}
          tags={tags}
          selectedTags={selectedTags}
          toggleFilterTag={toggleFilterTag}
          activeLang={activeLang}
        />

        {viewMode === 'table' ? (
          <RecipeTable 
            filteredRecipes={filteredRecipes}
            recipesLoading={recipesLoading}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            toggleAll={toggleAll}
            handleEdit={handleEdit}
            deleteMutation={deleteMutation}
            activeLang={activeLang}
            setSearchTerm={setSearchTerm}
            setSelectedTags={setSelectedTags}
          />
        ) : (
          <RecipeGrid 
            filteredRecipes={filteredRecipes}
            recipesLoading={recipesLoading}
            selectedIds={selectedIds}
            toggleSelection={toggleSelection}
            handleEdit={handleEdit}
            deleteMutation={deleteMutation}
            activeLang={activeLang}
          />
        )}
      </motion.div>

      {/* ─── Pagination ─── */}
      {totalRecipes > pageSize && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px', borderRadius: '12px',
              border: `1px solid ${currentPage === 1 ? T.outline : T.primary}`,
              backgroundColor: currentPage === 1 ? 'transparent' : T.primary08,
              color: currentPage === 1 ? T.muted : T.primary,
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '13px',
            }}
          >
            {t('recipes.ui.prev', '← Anterior')}
          </button>

          {Array.from({ length: Math.ceil(totalRecipes / pageSize) }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                border: `1px solid ${page === currentPage ? T.primary : T.outline}`,
                backgroundColor: page === currentPage ? T.primary12 : 'transparent',
                color: page === currentPage ? T.primary : T.muted,
                cursor: 'pointer', fontWeight: 800, fontSize: '13px',
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalRecipes / pageSize), p + 1))}
            disabled={currentPage >= Math.ceil(totalRecipes / pageSize)}
            style={{
              padding: '8px 16px', borderRadius: '12px',
              border: `1px solid ${currentPage >= Math.ceil(totalRecipes / pageSize) ? T.outline : T.primary}`,
              backgroundColor: currentPage >= Math.ceil(totalRecipes / pageSize) ? 'transparent' : T.primary08,
              color: currentPage >= Math.ceil(totalRecipes / pageSize) ? T.muted : T.primary,
              cursor: currentPage >= Math.ceil(totalRecipes / pageSize) ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '13px',
            }}
          >
            {t('recipes.ui.next', 'Siguiente →')}
          </button>

          <span style={{ color: T.muted, fontSize: '12px', fontWeight: 600, marginLeft: '12px' }}>
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecipes)} {t('recipes.ui.of_total', 'de')} {totalRecipes}
          </span>
        </div>
      )}

      {/* ─── Bulk Actions Bar ─── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6"
          >
            <div className="rounded-[2rem] p-6 shadow-2xl flex items-center justify-between gap-6" style={{ backgroundColor: T.surface, border: `1px solid ${T.primary}` }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: T.primary12, color: T.primary }}>
                  {selectedIds.length}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: T.text }}>{t('recipes.selected_count', { count: selectedIds.length })}</p>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] uppercase tracking-widest font-black transition-colors"
                    style={{ color: T.muted }}
                  >
                    {t('recipes.ui.discard_selection')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'published' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                >
                  {t('recipes.ui.publish')}
                </button>
                <button
                  onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedIds, status: 'draft' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
                >
                  {t('recipes.ui.draft')}
                </button>
                <div className="w-[1px] h-8 mx-1" style={{ backgroundColor: T.outline }} />
                <button
                  onClick={() => {
                    if (window.confirm(t('recipes.messages.confirm_bulk_delete', { count: selectedIds.length }))) {
                      bulkDeleteMutation.mutate(selectedIds);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  style={{ backgroundColor: T.danger12, color: T.danger, border: `1px solid ${T.danger20}` }}
                >
                  <Trash2 size={14} /> {t('common.delete')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RecipeFormModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingRecipe={editingRecipe}
        formData={formData}
        setFormData={setFormData}
        activeLang={activeLang}
        setActiveLang={setActiveLang}
        tags={tags}
        imageFeedback={imageFeedback}
        setImageFeedback={setImageFeedback}
        createMutation={createMutation}
        updateMutation={updateMutation}
        refreshImageMutation={refreshImageMutation}
      />
    </motion.div>
  );
};
