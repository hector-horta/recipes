import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, ChevronUp, ChevronDown, Loader2, Languages, X } from 'lucide-react';
import { T } from '../../constants';
import type { RecipeFormData } from '../../types';

interface IngredientsSectionProps {
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  translatingFields: Record<string, boolean>;
  handleTranslateField: (text: string, from: 'es' | 'en', to: 'es' | 'en', fieldKey: string, onTranslation: (translated: string) => void) => Promise<void>;
  addIngredient: () => void;
  moveIngredient: (index: number, direction: 'up' | 'down') => void;
}

export const IngredientsSection: React.FC<IngredientsSectionProps> = ({
  formData,
  setFormData,
  translatingFields,
  handleTranslateField,
  addIngredient,
  moveIngredient
}) => {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
        <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
        {t('recipes.form.ingredients')}
      </div>

      <div className="space-y-4">
        {formData.ingredients.map((ing, idx) => (
          <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={idx}
            className="flex flex-col md:flex-row gap-4 items-center p-4 rounded-2xl group relative"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
          >
            {/* Reorder Controls */}
            <div className="flex md:flex-col gap-2 shrink-0">
              <button type="button" onClick={() => moveIngredient(idx, 'up')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === 0}><ChevronUp size={16} /></button>
              <button type="button" onClick={() => moveIngredient(idx, 'down')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === formData.ingredients.length - 1}><ChevronDown size={16} /></button>
            </div>

            {/* Qty */}
            <div className="w-full md:w-20 space-y-1">
              <label className="text-[9px] font-black uppercase opacity-60" style={{ color: T.muted }}>Cantidad</label>
              <input
                placeholder="e.g. 150"
                className="w-full h-10 rounded-lg px-2 outline-none font-bold text-center transition-all text-xs"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                value={ing.amount}
                onChange={(e) => {
                  const newIngs = [...formData.ingredients];
                  newIngs[idx].amount = e.target.value;
                  setFormData({ ...formData, ingredients: newIngs });
                }}
              />
            </div>

            {/* Unit ES */}
            <div className="w-full md:w-28 space-y-1">
              <label className="text-[9px] font-black uppercase opacity-60" style={{ color: T.muted }}>Unidad (ES)</label>
              <input
                placeholder="g, ml, taza"
                className="w-full h-10 rounded-lg px-3 outline-none font-bold transition-all text-xs"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                value={ing.unit?.es || ''}
                onChange={(e) => {
                  const newIngs = [...formData.ingredients];
                  newIngs[idx].unit = {
                    es: e.target.value,
                    en: newIngs[idx].unit?.en || ''
                  };
                  setFormData({ ...formData, ingredients: newIngs });
                }}
              />
            </div>

            {/* Unit EN */}
            <div className="w-full md:w-28 space-y-1">
              <label className="text-[9px] font-black uppercase opacity-60" style={{ color: T.muted }}>Unidad (EN)</label>
              <input
                placeholder="g, ml, cup"
                className="w-full h-10 rounded-lg px-3 outline-none font-bold transition-all text-xs"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                value={ing.unit?.en || ''}
                onChange={(e) => {
                  const newIngs = [...formData.ingredients];
                  newIngs[idx].unit = {
                    es: newIngs[idx].unit?.es || '',
                    en: e.target.value
                  };
                  setFormData({ ...formData, ingredients: newIngs });
                }}
              />
            </div>

            {/* Ingredient Name (ES) */}
            <div className="flex-1 w-full space-y-1 relative">
              <label className="text-[9px] font-black uppercase opacity-60 flex items-center justify-between" style={{ color: T.muted }}>
                <span>Ingrediente (ES)</span>
                <button
                  type="button"
                  disabled={translatingFields[`ing-${idx}-es`]}
                  onClick={() => handleTranslateField(ing.name?.es || '', 'es', 'en', `ing-${idx}-es`, (val) => {
                    const newIngs = [...formData.ingredients];
                    newIngs[idx].name = { es: newIngs[idx].name?.es || '', en: val };
                    setFormData({ ...formData, ingredients: newIngs });
                  })}
                  className="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[8px] font-black uppercase"
                  style={{ color: T.primary }}
                >
                  {translatingFields[`ing-${idx}-es`] ? <Loader2 size={8} className="animate-spin" /> : <Languages size={8} />}
                  Traducir a EN
                </button>
              </label>
              <input
                placeholder="Ej. Cebolla morada"
                className="w-full h-10 rounded-lg px-3 outline-none font-bold transition-all text-xs"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                value={ing.name?.es || ''}
                onChange={(e) => {
                  const newIngs = [...formData.ingredients];
                  newIngs[idx].name = {
                    es: e.target.value,
                    en: newIngs[idx].name?.en || ''
                  };
                  setFormData({ ...formData, ingredients: newIngs });
                }}
              />
            </div>

            {/* Ingredient Name (EN) */}
            <div className="flex-1 w-full space-y-1 relative">
              <label className="text-[9px] font-black uppercase opacity-60 flex items-center justify-between" style={{ color: T.muted }}>
                <span>Ingredient (EN)</span>
                <button
                  type="button"
                  disabled={translatingFields[`ing-${idx}-en`]}
                  onClick={() => handleTranslateField(ing.name?.en || '', 'en', 'es', `ing-${idx}-en`, (val) => {
                    const newIngs = [...formData.ingredients];
                    newIngs[idx].name = { es: val, en: newIngs[idx].name?.en || '' };
                    setFormData({ ...formData, ingredients: newIngs });
                  })}
                  className="opacity-60 hover:opacity-100 transition-opacity flex items-center gap-0.5 text-[8px] font-black uppercase"
                  style={{ color: T.primary }}
                >
                  {translatingFields[`ing-${idx}-en`] ? <Loader2 size={8} className="animate-spin" /> : <Languages size={8} />}
                  Traducir a ES
                </button>
              </label>
              <input
                placeholder="e.g. Red onion"
                className="w-full h-10 rounded-lg px-3 outline-none font-bold transition-all text-xs"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                value={ing.name?.en || ''}
                onChange={(e) => {
                  const newIngs = [...formData.ingredients];
                  newIngs[idx].name = {
                    es: newIngs[idx].name?.es || '',
                    en: e.target.value
                  };
                  setFormData({ ...formData, ingredients: newIngs });
                }}
              />
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }))}
              className="p-2 rounded-xl transition-all self-center md:self-end md:mb-1 shrink-0"
              style={{ color: T.danger }}
            >
              <X size={18} />
            </button>
          </motion.div>
        ))}

        <button
          type="button"
          onClick={addIngredient}
          className="w-full py-4 border-2 border-dashed rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          style={{ borderColor: T.primary15, color: T.primary }}
        >
          <Plus size={20} /> {t('recipes.form.add_ingredient')}
        </button>
      </div>
    </section>
  );
};
