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
  ChevronDown,
  Languages,
  Upload
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import type { Recipe, RecipeFormData, Tag } from '../types';
import { T } from '../constants';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';

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

  const [translatingFields, setTranslatingFields] = React.useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [processingStep, setProcessingStep] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processImageFile(files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Extrayendo texto de la receta (OCR)...');

    const progressInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev.includes('OCR')) {
          return 'Estructurando ingredientes y pasos con IA...';
        } else if (prev.includes('IA')) {
          return 'Traduciendo receta y generando ilustración...';
        } else if (prev.includes('ilustración')) {
          return 'Finalizando receta...';
        }
        return prev;
      });
    }, 3000);

    try {
      const imageBase64 = await fileToBase64(file);
      const mimeType = file.type;

      interface IngestImageResponse {
        status: string;
        recipe: any;
        rawText: string;
        saveToDb: boolean;
      }

      const data = await api.post<IngestImageResponse>('/ingest/image', {
        imageBase64,
        mimeType,
        saveToDb: false,
        generateImage: true
      });

      if (data && data.recipe) {
        const recipe = data.recipe;

        // Map ingredients defensively
        const mappedIngredients = (recipe.ingredients || []).map((ing: any) => ({
          name: typeof ing.name === 'object' ? {
            es: ing.name?.es || '',
            en: ing.name?.en || ''
          } : {
            es: ing.name || '',
            en: ing.name || ''
          },
          amount: String(ing.quantity || ing.amount || ''),
          unit: typeof ing.unit === 'object' ? {
            es: ing.unit?.es || '',
            en: ing.unit?.en || ''
          } : {
            es: ing.unit || '',
            en: ing.unit || ''
          }
        }));

        // Map instructions/steps defensively
        const mappedInstructions = (recipe.steps || recipe.instructions || []).map((step: any) => {
          let esVal = '';
          let enVal = '';
          if (step.instruction) {
            if (typeof step.instruction === 'object') {
              esVal = step.instruction.es || '';
              enVal = step.instruction.en || esVal;
            } else {
              esVal = step.instruction;
              enVal = step.instruction;
            }
          } else {
            esVal = step.es || '';
            enVal = step.en || esVal;
          }

          return {
            es: esVal,
            en: enVal,
            type: step.type || 'active',
            durationMinutes: step.durationMinutes || step.duration_minutes || 0
          };
        });

        // Map tags
        const mappedTags: string[] = [];
        if (Array.isArray(recipe.tags)) {
          recipe.tags.forEach((t: any) => {
            if (typeof t === 'string') {
              const match = tags?.find(avail => 
                avail.key.toLowerCase() === t.toLowerCase() || 
                avail.es.toLowerCase() === t.toLowerCase() || 
                avail.en.toLowerCase() === t.toLowerCase()
              );
              if (match) {
                mappedTags.push(match.key);
              } else {
                mappedTags.push(t);
              }
            } else if (t && typeof t === 'object') {
              const esVal = (t.es || '').toLowerCase();
              const enVal = (t.en || '').toLowerCase();
              const match = tags?.find(avail => 
                avail.es.toLowerCase() === esVal || 
                avail.en.toLowerCase() === enVal || 
                avail.key.toLowerCase() === esVal ||
                avail.key.toLowerCase() === enVal
              );
              if (match) {
                mappedTags.push(match.key);
              }
            }
          });
        }

        setFormData({
          title: recipe.title_es || (recipe.title && recipe.title.es) || '',
          titleEn: recipe.title_en || (recipe.title && recipe.title.en) || '',
          prepTimeMinutes: recipe.prep_time_minutes || recipe.prepTimeMinutes || 0,
          cookTimeMinutes: recipe.cook_time_minutes || recipe.cookTimeMinutes || 0,
          servings: recipe.servings || 1,
          difficulty: recipe.difficulty || 'medium',
          status: 'draft',
          safetyLevel: recipe.sibo_risk_level || recipe.siboRiskLevel || recipe.safetyLevel || 'safe',
          ingredients: mappedIngredients,
          instructions: mappedInstructions,
          tags: mappedTags,
          imageUrl: recipe.image_url || recipe.imageUrl || ''
        });

        toast.success('¡Receta importada y procesada con éxito!');
      } else {
        throw new Error('No se recibió la receta procesada');
      }
    } catch (error: any) {
      console.error('OCR import error:', error);
      toast.error(error?.message || 'Error al procesar la imagen de la receta');
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleTranslateField = async (
    text: string,
    from: 'es' | 'en',
    to: 'es' | 'en',
    fieldKey: string,
    onTranslation: (translated: string) => void
  ) => {
    if (!text.trim()) {
      toast.error('Por favor, ingresa texto para traducir');
      return;
    }
    setTranslatingFields(prev => ({ ...prev, [fieldKey]: true }));
    try {
      const data = await api.post<{ translation: string }>('/admin/translate', {
        text,
        from,
        to
      });
      onTranslation(data.translation);
      toast.success('Traducido con éxito');
    } catch (error: any) {
      toast.error(error?.message || 'Error al traducir');
    } finally {
      setTranslatingFields(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

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
      ingredients: [...prev.ingredients, { name: { es: '', en: '' }, amount: '', unit: { es: '', en: '' } }]
    }));
  };

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      instructions: [...prev.instructions, { es: '', en: '', type: 'active', durationMinutes: 0 }]
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
            
            {!editingRecipe && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                  Importar desde imagen
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {isProcessing ? (
                  <div 
                    className="w-full py-12 rounded-[2rem] border border-dashed flex flex-col items-center justify-center p-6 text-center backdrop-blur-md relative overflow-hidden transition-all duration-300"
                    style={{ backgroundColor: T.surfaceHi, borderColor: T.primary, color: T.text }}
                  >
                    <Loader2 size={36} className="animate-spin mb-4" style={{ color: T.primary }} />
                    <p className="text-sm font-black uppercase tracking-widest leading-tight">Procesando receta con IA</p>
                    <p className="text-xs font-bold mt-2 opacity-80" style={{ color: T.primary }}>{processingStep}</p>
                    <p className="text-[10px] opacity-60 mt-3 max-w-sm">Esto puede tardar unos segundos mientras leemos el texto, estructuramos los ingredientes y generamos la ilustración.</p>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFileSelect}
                    className="w-full py-10 rounded-[2rem] border border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden"
                    style={{ 
                      backgroundColor: isDragging ? T.primary05 : T.surfaceHi, 
                      borderColor: isDragging ? T.primary : T.outline, 
                      color: T.text 
                    }}
                  >
                    <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ backgroundColor: T.primary12 }} />
                    
                    <Upload size={32} strokeWidth={1.5} className="mb-3 transition-transform group-hover:-translate-y-1 duration-300" style={{ color: T.primary }} />
                    <p className="text-xs font-black uppercase tracking-widest leading-tight">Arrastra la imagen de una receta aquí</p>
                    <p className="text-[10px] font-bold mt-1.5 opacity-60">o haz clic para explorar tus archivos locales</p>
                    <div className="mt-4 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.muted }}>
                      <Sparkles size={10} style={{ color: T.primary }} /> OCR + Autotraducción + Ilustración IA
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-xs" style={{ color: T.muted }}>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: T.outline }} />
                  {t('recipes.form.essential_info')}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.primary }}>
                  <Sparkles size={10} /> Edición Simultánea ES / EN
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center justify-between" style={{ color: T.text }}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                      Título (ES)
                    </span>
                    <button
                      type="button"
                      disabled={translatingFields['title_es']}
                      onClick={() => handleTranslateField(formData.title, 'es', 'en', 'title_es', (val) => setFormData(p => ({ ...p, titleEn: val })))}
                      className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ color: T.primary }}
                    >
                      {translatingFields['title_es'] ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                      Traducir a EN
                    </button>
                  </label>
                  <input
                    placeholder="Ej. Sopa de calabaza"
                    className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                    value={formData.title}
                    onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center justify-between" style={{ color: T.text }}>
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                      Título (EN)
                    </span>
                    <button
                      type="button"
                      disabled={translatingFields['title_en']}
                      onClick={() => handleTranslateField(formData.titleEn, 'en', 'es', 'title_en', (val) => setFormData(p => ({ ...p, title: val })))}
                      className="text-[10px] uppercase font-black tracking-widest flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                      style={{ color: T.primary }}
                    >
                      {translatingFields['title_en'] ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                      Traducir a ES
                    </button>
                  </label>
                  <input
                    placeholder="e.g. Pumpkin soup"
                    className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                    value={formData.titleEn}
                    onChange={(e) => setFormData(p => ({ ...p, titleEn: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                    <Clock size={12} style={{ color: T.primary }} /> Tiempo de preparación (min)
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
                    <Clock size={12} style={{ color: T.primary }} /> Tiempo de cocción (min)
                  </label>
                  <input
                    type="number"
                    className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                    value={formData.cookTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                    <Users size={12} style={{ color: T.primary }} /> Raciones
                  </label>
                  <input
                    type="number"
                    className="w-full h-12 rounded-xl px-4 outline-none transition-all font-bold"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                    value={formData.servings || 1}
                    onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                  />
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
                    className="flex flex-col md:flex-row gap-4 items-center p-4 rounded-2xl group relative"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                  >
                    {/* Reorder and Delete Controls */}
                    <div className="flex md:flex-col gap-2 shrink-0">
                      <button type="button" onClick={() => moveIngredient(idx, 'up')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === 0}><ChevronUp size={16} /></button>
                      <button type="button" onClick={() => moveIngredient(idx, 'down')} className="disabled:opacity-30 transition-colors" style={{ color: T.muted }} disabled={idx === formData.ingredients.length - 1}><ChevronDown size={16} /></button>
                    </div>

                    {/* Numeric Qty */}
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
                      className="flex flex-col md:flex-row gap-4 items-start p-4 rounded-3xl group"
                      style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                    >
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

                      {/* Side-by-side steps textareas */}
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
