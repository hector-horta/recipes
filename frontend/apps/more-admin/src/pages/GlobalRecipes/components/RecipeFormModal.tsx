import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Clock, 
  Users, 
  AlertTriangle,
  Image as ImageIcon,
  Wand2,
  X,
  Filter,
  Sparkles,
  ArrowRight,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import type { Recipe, RecipeFormData, Tag } from '../types';
import { T } from '../constants';

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
  setActiveLang,
  tags,
  imageFeedback,
  setImageFeedback,
  createMutation,
  updateMutation,
  refreshImageMutation
}) => {
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipe) {
      updateMutation.mutate({ id: editingRecipe.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleTag = (tagKey: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey)
        ? prev.tags.filter(k => k !== tagKey)
        : [...prev.tags, tagKey]
    }));
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '', unit: '' }]
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, '']
    }));
  };

  const moveIngredient = (index: number, direction: 'up' | 'down') => {
    const newIngredients = [...formData.ingredients];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newIngredients.length) return;
    [newIngredients[index], newIngredients[newIndex]] = [newIngredients[newIndex], newIngredients[index]];
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...formData.instructions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSteps.length) return;
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setFormData({ ...formData, instructions: newSteps });
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
            
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                  {t('recipes.form.essential_info')}
                </div>
                <div className="flex p-1 rounded-xl" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
                  <button
                    type="button"
                    onClick={() => setActiveLang('es')}
                    className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                    style={activeLang === 'es' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
                  >
                    {t('common.language_es')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLang('en')}
                    className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all"
                    style={activeLang === 'en' ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
                  >
                    {t('common.language_en')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <AnimatePresence mode="wait">
                    {activeLang === 'es' ? (
                      <motion.div 
                        key="title-es"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-2"
                      >
                        <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                          {t('recipes.form.title_es')}
                        </label>
                        <input
                          placeholder={t('recipes.form.placeholder_title')}
                          className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                          style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                          value={formData.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              title: val,
                            }));
                          }}
                          required
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="title-en"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-2"
                      >
                        <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                          {t('recipes.form.title_en')}
                        </label>
                        <input
                          placeholder={t('recipes.form.placeholder_title')}
                          className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                          style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                          value={formData.titleEn}
                          onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                          required
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                        <Clock size={12} style={{ color: T.primary }} /> {t('recipes.form.prep_time')}
                      </label>
                      <input
                        type="number"
                        className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                        style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                        value={formData.prepTimeMinutes}
                        onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                        <Clock size={12} style={{ color: T.primary }} /> {t('recipes.form.cook_time')}
                      </label>
                      <input
                        type="number"
                        className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                        style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                        value={formData.cookTimeMinutes}
                        onChange={(e) => setFormData({ ...formData, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

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
                    className="flex gap-4 items-end p-4 rounded-2xl group"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                  >
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => moveIngredient(idx, 'up')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === 0}><ChevronUp size={16} /></button>
                      <button type="button" onClick={() => moveIngredient(idx, 'down')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === formData.ingredients.length - 1}><ChevronDown size={16} /></button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.ingredient_label')}</label>
                      <input
                        placeholder={t('recipes.form.name_placeholder')}
                        className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                        value={ing.name}
                        onChange={(e) => {
                          const newIngs = [...formData.ingredients];
                          newIngs[idx].name = e.target.value;
                          setFormData({ ...formData, ingredients: newIngs });
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.amount_label')}</label>
                      <input
                        placeholder="0"
                        className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                        value={ing.amount}
                        onChange={(e) => {
                          const newIngs = [...formData.ingredients];
                          newIngs[idx].amount = e.target.value;
                          setFormData({ ...formData, ingredients: newIngs });
                        }}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <label className="text-[10px] font-black uppercase opacity-60" style={{ color: T.muted }}>{t('recipes.form.unit_label')}</label>
                      <input
                        placeholder={t('recipes.form.unit_placeholder')}
                        className="w-full h-10 rounded-lg px-3 outline-none font-medium transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                        value={ing.unit}
                        onChange={(e) => {
                          const newIngs = [...formData.ingredients];
                          newIngs[idx].unit = e.target.value;
                          setFormData({ ...formData, ingredients: newIngs });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }))}
                      className="p-3 rounded-xl transition-all"
                      style={{ color: T.danger }}
                    >
                      <X size={20} />
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

            <section className="space-y-6">
              <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                {t('recipes.form.steps')}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.form.difficulty_label')}</label>
                  <select
                    className="w-full h-12 px-4 rounded-xl outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                    value={(formData as any).difficulty || 'medium'}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  >
                    <option value="easy">○ {t('recipes.difficulty.easy')}</option>
                    <option value="medium">◒ {t('recipes.difficulty.medium')}</option>
                    <option value="hard">● {t('recipes.difficulty.hard')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.form.status_label')}</label>
                  <div className="flex p-1 rounded-xl h-12" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
                    {(['draft', 'published', 'archived'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormData({ ...formData, status })}
                        className="flex-1 rounded-lg text-[9px] font-black uppercase transition-all"
                        style={(formData as any).status === status ? { backgroundColor: T.surface, color: T.primary } : { color: T.muted }}
                      >
                        {t(`recipes.status.${status}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                    <AlertTriangle size={14} style={{ color: T.primary }} /> {t('recipes.form.sibo_risk_label')}
                  </label>
                  <div className="flex gap-2 h-12">
                    {(['safe', 'caution', 'avoid'] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData({ ...formData, safetyLevel: level as any })}
                        className="flex-1 rounded-xl text-[10px] font-black uppercase transition-all border-2"
                        style={formData.safetyLevel === level
                          ? level === 'safe' ? { backgroundColor: T.success, borderColor: T.success, color: T.dark }
                            : level === 'caution' ? { backgroundColor: T.warning, borderColor: T.warning, color: T.dark }
                            : { backgroundColor: T.danger, borderColor: T.danger, color: T.white }
                          : { backgroundColor: T.surfaceHi, borderColor: T.outline, color: T.muted }}
                      >
                        {t(`recipes.sibo_risk.${level}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

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
                      className="flex gap-4 items-start p-4 rounded-3xl group"
                      style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                    >
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ backgroundColor: T.primary, color: T.dark }}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col gap-1 items-center">
                           <button 
                             type="button" 
                             onClick={() => moveStep(idx, 'up')}
                             disabled={idx === 0}
                             className="p-1 rounded transition-colors disabled:opacity-0"
                             style={{ color: T.muted }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                           >
                             <ChevronUp size={14} className="opacity-40" />
                           </button>
                           <button 
                             type="button" 
                             onClick={() => moveStep(idx, 'down')}
                             disabled={idx === formData.instructions.length - 1}
                             className="p-1 rounded transition-colors disabled:opacity-0"
                             style={{ color: T.muted }}
                             onMouseEnter={(e) => e.currentTarget.style.backgroundColor = T.surface}
                             onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                           >
                             <ChevronDown size={14} className="opacity-40" />
                           </button>
                        </div>
                      </div>
                      <textarea
                        className="flex-1 rounded-2xl px-6 py-4 text-sm font-medium outline-none transition-all min-h-[100px] resize-none"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                        placeholder={t('recipes.form.step_placeholder', { index: idx + 1 })}
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...formData.instructions];
                          newSteps[idx] = e.target.value;
                          setFormData({ ...formData, instructions: newSteps });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            instructions: prev.instructions.filter((_, i) => i !== idx)
                          }));
                        }}
                        className="p-3 rounded-xl transition-all self-start" style={{ color: T.danger }}
                      >
                        <Trash2 size={20} />
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

          </form>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
              <ImageIcon size={16} style={{ color: T.primary }} /> {t('recipes.ai.title')}
            </label>
            <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden relative group" style={{ backgroundColor: T.surfaceHi, border: `2px solid ${T.outline}` }}>
              <AnimatePresence mode="wait">
                {formData.imageUrl ? (
                  <motion.img 
                    key={formData.imageUrl}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={formData.imageUrl} 
                    alt={t('recipes.ai.image_alt')} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full p-8 text-center"
                    style={{ color: T.muted }}
                  >
                    <ImageIcon size={64} strokeWidth={1} className="mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest leading-tight">{t('recipes.ai.no_image')}</p>
                    <p className="text-[10px] font-medium mt-2">{t('recipes.ai.no_image_hint')}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {refreshImageMutation.isPending && (
                <div className="absolute inset-0 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-20" style={{ backgroundColor: T.dark80, color: T.text }}>
                  <Loader2 size={48} className="animate-spin mb-4 text-brand-primary" />
                  <p className="text-lg font-black tracking-tight leading-tight">{t('recipes.ai.processing')}</p>
                  <p className="text-xs font-medium opacity-70 mt-2 italic">{t('recipes.ai.processing_hint')}</p>
                </div>
              )}
            </div>

            {editingRecipe && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 backdrop-blur-md p-6 rounded-[2rem] relative overflow-hidden"
                style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
              >
                <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: T.primary05 }} />
                
                <div className="flex items-center gap-2">
                  <Wand2 size={16} style={{ color: T.primary }} />
                  <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: T.text }}>{t('recipes.ai.title')}</h4>
                </div>
                <textarea
                  placeholder={t('recipes.ai.feedback_placeholder')}
                  className="w-full rounded-2xl px-4 py-4 text-xs font-medium outline-none min-h-[120px] resize-none transition-all placeholder:italic"
                  style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                  value={imageFeedback}
                  onChange={(e) => setImageFeedback(e.target.value)}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => refreshImageMutation.mutate({ id: editingRecipe.id, issue: imageFeedback })}
                  disabled={refreshImageMutation.isPending}
                  className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 relative group transition-all"
                  style={{ backgroundColor: T.surface, color: T.primary, border: `1px solid ${T.primary}` }}
                >
                  <Sparkles size={14} className="group-hover:animate-spin-slow" />
                  <span>{refreshImageMutation.isPending ? t('recipes.ai.processing_btn') : t('recipes.ai.regenerate_btn')}</span>
                  {refreshImageMutation.isPending && (
                    <motion.div 
                      layoutId="btn-shimmer"
                      className="absolute inset-0 bg-white/10"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                  )}
                </motion.button>
              </motion.div>
            )}
          </section>

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

      <div className="mt-10 pt-8 flex flex-col md:flex-row gap-4" style={{ borderTop: `1px solid ${T.outline}` }}>
        <button
          type="button"
          className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
          style={{ backgroundColor: T.surfaceHi, color: T.text, border: `1px solid ${T.outline}` }}
          onClick={onClose}
        >
          {t('common.discard_changes')}
        </button>
        <button
          form="recipe-form"
          type="submit"
          className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          style={{ backgroundColor: T.primary, color: T.dark }}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <span>{editingRecipe ? t('recipes.form.save_edit') : t('recipes.form.save_create')}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};
