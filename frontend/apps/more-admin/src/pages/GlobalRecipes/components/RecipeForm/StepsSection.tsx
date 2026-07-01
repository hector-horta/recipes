import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronUp, ChevronDown, Loader2, Languages, Trash2, Info } from 'lucide-react';
import { T } from '../../constants';
import type { RecipeFormData } from '../../types';

interface StepsSectionProps {
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  translatingFields: Record<string, boolean>;
  handleTranslateField: (text: string, from: 'es' | 'en', to: 'es' | 'en', fieldKey: string, onTranslation: (translated: string) => void) => Promise<void>;
  addStep: () => void;
  moveStep: (index: number, direction: 'up' | 'down') => void;
}

export const StepsSection: React.FC<StepsSectionProps> = ({
  formData,
  setFormData,
  translatingFields,
  handleTranslateField,
  addStep,
  moveStep
}) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
          <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
          {t('recipes.form.steps')} ({formData.instructions.length})
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={addStep}
          className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: T.surface, color: T.primary, border: `1px solid ${T.primary}` }}
        >
          <Plus size={14} /> {t('recipes.form.add_step')}
        </motion.button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {formData.instructions.map((step, idx) => (
            <motion.div 
              key={`step-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col md:flex-row gap-4 items-start p-4 rounded-3xl group"
              style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
            >
              {/* Order and Reorder Buttons */}
              <div className="flex flex-col gap-2 mt-1 shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black" style={{ backgroundColor: T.primary, color: T.dark }}>
                  {idx + 1}
                </div>
                <div className="flex flex-col gap-1 items-center">
                   <button 
                     type="button" 
                     onClick={() => moveStep(idx, 'up')}
                     disabled={idx === 0}
                     className="p-1 rounded transition-colors disabled:opacity-0"
                     style={{ color: T.muted }}
                   >
                     <ChevronUp size={14} className="opacity-40" />
                   </button>
                   <button 
                     type="button" 
                     onClick={() => moveStep(idx, 'down')}
                     disabled={idx === formData.instructions.length - 1}
                     className="p-1 rounded transition-colors disabled:opacity-0"
                     style={{ color: T.muted }}
                   >
                     <ChevronDown size={14} className="opacity-40" />
                   </button>
                </div>
              </div>

              {/* Textareas */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Step ES */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase opacity-60 flex items-center justify-between" style={{ color: T.muted }}>
                    <span>Instrucción (ES)</span>
                    <button
                      type="button"
                      disabled={translatingFields[`step-${idx}-es`]}
                      onClick={() => handleTranslateField(step.es || '', 'es', 'en', `step-${idx}-es`, (val) => {
                        const newSteps = [...formData.instructions];
                        newSteps[idx] = { ...newSteps[idx], en: val };
                        setFormData({ ...formData, instructions: newSteps });
                      })}
                      className="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[8px] font-black uppercase"
                      style={{ color: T.primary }}
                    >
                      {translatingFields[`step-${idx}-es`] ? <Loader2 size={8} className="animate-spin" /> : <Languages size={8} />}
                      Traducir a EN
                    </button>
                  </label>
                  <textarea
                    className="w-full rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all min-h-[90px] resize-none"
                    style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                    placeholder={`Paso ${idx + 1} en español`}
                    value={step.es || ''}
                    onChange={(e) => {
                      const newSteps = [...formData.instructions];
                      newSteps[idx] = { ...newSteps[idx], es: e.target.value };
                      setFormData({ ...formData, instructions: newSteps });
                    }}
                  />
                </div>

                {/* Step EN */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase opacity-60 flex items-center justify-between" style={{ color: T.muted }}>
                    <span>Instruction (EN)</span>
                    <button
                      type="button"
                      disabled={translatingFields[`step-${idx}-en`]}
                      onClick={() => handleTranslateField(step.en || '', 'en', 'es', `step-${idx}-en`, (val) => {
                        const newSteps = [...formData.instructions];
                        newSteps[idx] = { ...newSteps[idx], es: val };
                        setFormData({ ...formData, instructions: newSteps });
                      })}
                      className="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[8px] font-black uppercase"
                      style={{ color: T.primary }}
                    >
                      {translatingFields[`step-${idx}-en`] ? <Loader2 size={8} className="animate-spin" /> : <Languages size={8} />}
                      Traducir a ES
                    </button>
                  </label>
                  <textarea
                    className="w-full rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all min-h-[90px] resize-none"
                    style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                    placeholder={`Step ${idx + 1} in English`}
                    value={step.en || ''}
                    onChange={(e) => {
                      const newSteps = [...formData.instructions];
                      newSteps[idx] = { ...newSteps[idx], en: e.target.value };
                      setFormData({ ...formData, instructions: newSteps });
                    }}
                  />
                </div>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    instructions: prev.instructions.filter((_, i) => i !== idx)
                  }));
                }}
                className="p-3 rounded-xl transition-all self-start shrink-0" style={{ color: T.danger }}
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {formData.instructions.length === 0 && (
          <div className="py-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2" style={{ borderColor: T.primary15, color: T.muted }}>
            <Info size={24} className="opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t('recipes.form.no_steps')}</p>
          </div>
        )}
      </div>
    </section>
  );
};
