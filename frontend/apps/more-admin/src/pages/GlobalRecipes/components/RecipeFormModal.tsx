import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowRight, Filter, Info } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import type { Recipe, RecipeFormData, Tag } from '../types';
import { T } from '../constants';
import { useRecipeFormState } from '../hooks/useRecipeFormState';
import { useRecipeIngestion } from '../hooks/useRecipeIngestion';
import { BasicDetailsSection } from './RecipeForm/BasicDetailsSection';
import { IngredientsSection } from './RecipeForm/IngredientsSection';
import { StepsSection } from './RecipeForm/StepsSection';
import { ImageSection } from './RecipeForm/ImageSection';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRecipe: Recipe | null;
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  activeLang: 'es' | 'en';
  setActiveLang: (lang: 'es' | 'en') => void;
  tags: Tag[] | undefined;
  imageFeedback: string;
  setImageFeedback: (feedback: string) => void;
  createMutation: any;
  updateMutation: any;
  refreshImageMutation: any;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  isOpen,
  onClose,
  editingRecipe,
  formData,
  setFormData,
  activeLang,
  setActiveLang: _setActiveLang,
  tags,
  imageFeedback,
  setImageFeedback,
  createMutation,
  updateMutation,
  refreshImageMutation
}) => {
  const { t } = useTranslation();

  const {
    translatingFields,
    handleTranslateField,
    toggleTag,
    addIngredient,
    addStep,
    moveIngredient,
    moveStep
  } = useRecipeFormState({ formData, setFormData });

  const {
    isDragging,
    setIsDragging,
    isProcessing,
    processingStep,
    droppedFiles,
    fileInputRef,
    addFiles,
    removeFile,
    processDroppedImages
  } = useRecipeIngestion({ setFormData, tags });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRecipe ? t('recipes.ui.edit_recipe') : t('recipes.create')}
      maxWidth="max-w-[80vw]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8 pr-6 pb-6">
          <form onSubmit={handleSubmit} id="recipe-form" className="space-y-10">
            <ImageSection
              formData={formData}
              editingRecipe={editingRecipe}
              imageFeedback={imageFeedback}
              setImageFeedback={setImageFeedback}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              isProcessing={isProcessing}
              processingStep={processingStep}
              droppedFiles={droppedFiles}
              fileInputRef={fileInputRef}
              addFiles={addFiles}
              removeFile={removeFile}
              processDroppedImages={processDroppedImages}
              refreshImageMutation={refreshImageMutation}
            />

            <BasicDetailsSection
              formData={formData}
              setFormData={setFormData}
              translatingFields={translatingFields}
              handleTranslateField={handleTranslateField}
            />

            <IngredientsSection
              formData={formData}
              setFormData={setFormData}
              translatingFields={translatingFields}
              handleTranslateField={handleTranslateField}
              addIngredient={addIngredient}
              moveIngredient={moveIngredient}
            />

            <StepsSection
              formData={formData}
              setFormData={setFormData}
              translatingFields={translatingFields}
              handleTranslateField={handleTranslateField}
              addStep={addStep}
              moveStep={moveStep}
            />
          </form>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
              <Filter size={16} style={{ color: T.primary }} /> {t('recipes.form.tags_allergens')}
            </label>
            <div className="flex flex-wrap gap-2 p-6 rounded-[2rem] max-h-[300px] overflow-y-auto custom-scrollbar" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
              {tags?.map(tag => {
                const label = activeLang === 'es' ? tag.es : tag.en;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.key)}
                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all"
                    style={formData.tags.includes(tag.key)
                      ? { backgroundColor: T.primary, color: T.dark }
                      : { backgroundColor: T.surface, color: T.muted, border: `1px solid ${T.outline}` }}
                  >
                    {t(`tags.items.${tag.key}`, { defaultValue: label })}
                  </button>
                );
              })}
              {tags?.length === 0 && <p className="text-xs italic text-center w-full py-4 opacity-40" style={{ color: T.muted }}>{t('recipes.form.no_tags_hint')}</p>}
            </div>
          </section>

          <div className="p-6 rounded-[2rem]" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: T.text }}>
              <Info size={12} style={{ color: T.primary }} /> {t('recipes.form.style_guide')}
            </h4>
            <ul className="text-[10px] space-y-2 font-medium" style={{ color: T.muted }}>
              <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_slug')}</span></li>
              <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_ingredients')}</span></li>
              <li className="flex gap-2"><span style={{ color: T.primary }}>•</span><span>{t('recipes.form.style_guide_sibo')}</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 flex flex-col md:flex-row justify-end gap-3" style={{ borderTop: `1px solid ${T.outline}` }}>
        <button
          type="button"
          className="w-full md:w-auto px-6 h-10 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all"
          style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
          onClick={onClose}
        >
          {t('common.discard_changes')}
        </button>
        <button
          form="recipe-form"
          type="submit"
          className="w-full md:w-auto px-8 h-10 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{ backgroundColor: T.primary, color: T.dark }}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <>
              <span>{editingRecipe ? t('recipes.form.save_edit') : t('recipes.form.save_create')}</span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};
