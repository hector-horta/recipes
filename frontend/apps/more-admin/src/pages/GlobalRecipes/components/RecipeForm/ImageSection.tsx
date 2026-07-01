import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Loader2, Sparkles, Wand2, Plus, X, Upload } from 'lucide-react';
import { T } from '../../constants';
import type { Recipe, RecipeFormData } from '../../types';

interface ImageSectionProps {
  formData: RecipeFormData;
  editingRecipe: Recipe | null;
  imageFeedback: string;
  setImageFeedback: (feedback: string) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  isProcessing: boolean;
  processingStep: string;
  droppedFiles: { file: File; preview: string }[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (index: number) => void;
  processDroppedImages: () => Promise<void>;
  refreshImageMutation: any;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  formData,
  editingRecipe,
  imageFeedback,
  setImageFeedback,
  isDragging,
  setIsDragging,
  isProcessing,
  processingStep,
  droppedFiles,
  fileInputRef,
  addFiles,
  removeFile,
  processDroppedImages,
  refreshImageMutation
}) => {
  const { t } = useTranslation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
      {/* OCR/Ingestion section (only for new recipes) */}
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
            multiple
            className="hidden" 
          />
          
          {isProcessing ? (
            <div 
              className="w-full py-12 rounded-[2rem] border border-dashed flex flex-col items-center justify-center p-6 text-center backdrop-blur-md relative overflow-hidden transition-all duration-300"
              style={{ backgroundColor: T.surfaceHi, borderColor: T.primary, color: T.text }}
            >
              <Loader2 size={36} className="animate-spin mb-4" style={{ color: T.primary }} />
              <p className="text-sm font-black uppercase tracking-widest leading-tight">Procesando {droppedFiles.length > 1 ? `${droppedFiles.length} imágenes` : 'receta'} con IA</p>
              <p className="text-xs font-bold mt-2 opacity-80" style={{ color: T.primary }}>{processingStep}</p>
              <p className="text-[10px] opacity-60 mt-3 max-w-sm">Esto puede tardar unos segundos mientras leemos el texto, estructuramos los ingredientes y generamos la ilustración.</p>
            </div>
          ) : droppedFiles.length > 0 ? (
            <div className="space-y-4">
              <div className={`grid gap-4 ${droppedFiles.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {droppedFiles.map((df, idx) => (
                  <div 
                    key={idx}
                    className="relative rounded-2xl overflow-hidden group"
                    style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
                  >
                    <img 
                      src={df.preview} 
                      alt={`Imagen ${idx + 1}`} 
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
                      style={{ backgroundColor: T.dark80, color: T.danger }}
                    >
                      <X size={16} />
                    </button>
                    <div 
                      className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider backdrop-blur-md"
                      style={{ backgroundColor: T.dark80, color: T.white }}
                    >
                      {droppedFiles.length === 2 ? (idx === 0 ? 'Foto 1' : 'Foto 2') : 'Foto de receta'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                {droppedFiles.length < 2 && (
                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    className="flex-1 py-3 rounded-xl border border-dashed font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:opacity-80"
                    style={{ borderColor: T.outline, color: T.muted }}
                  >
                    <Plus size={14} /> Agregar 2ª foto (opcional)
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={processDroppedImages}
                  className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: T.primary, color: T.dark }}
                >
                  <Sparkles size={14} /> Procesar con IA {droppedFiles.length === 2 ? '(2 fotos)' : ''}
                </motion.button>
              </div>
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
              <p className="text-xs font-black uppercase tracking-widest leading-tight">Arrastra hasta 2 fotos de una receta aquí</p>
              <p className="text-[10px] font-bold mt-1.5 opacity-60">o haz clic para explorar tus archivos locales</p>
              <div className="mt-4 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.muted }}>
                <Sparkles size={10} style={{ color: T.primary }} /> OCR + Autotraducción + Ilustración IA
              </div>
            </div>
          )}
        </section>
      )}

      {/* Image Preview & AI Generation Section */}
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
    </div>
  );
};
