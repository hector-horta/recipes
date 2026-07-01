import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';
import type { RecipeFormData, Tag } from '../types';

interface UseRecipeIngestionProps {
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  tags: Tag[] | undefined;
}

export const useRecipeIngestion = ({ setFormData, tags }: UseRecipeIngestionProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [droppedFiles, setDroppedFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const droppedFilesRef = useRef(droppedFiles);

  useEffect(() => {
    droppedFilesRef.current = droppedFiles;
  }, [droppedFiles]);

  useEffect(() => {
    return () => {
      droppedFilesRef.current.forEach(f => URL.revokeObjectURL(f.preview));
    };
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const addFiles = (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Por favor, selecciona archivos de imagen válidos.');
      return;
    }
    setDroppedFiles(prev => {
      const combined = [...prev];
      for (const file of imageFiles) {
        if (combined.length >= 2) break;
        combined.push({ file, preview: URL.createObjectURL(file) });
      }
      if (combined.length > 2) {
        toast.error('Máximo 2 imágenes por receta.');
        return combined.slice(0, 2);
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setDroppedFiles(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const processDroppedImages = async () => {
    if (droppedFiles.length === 0) return;
    setIsProcessing(true);
    setProcessingStep('Extrayendo texto de la receta (OCR)...');

    const progressInterval = setInterval(() => {
      setProcessingStep(prev => {
        if (prev.includes('OCR')) return 'Estructurando ingredientes y pasos con IA...';
        if (prev.includes('IA')) return 'Traduciendo receta y generando ilustración...';
        return 'Finalizando receta...';
      });
    }, 3000);

    try {
      let data: { recipe: any };
      if (droppedFiles.length === 2) {
        const [b64_1, b64_2] = await Promise.all([
          fileToBase64(droppedFiles[0].file),
          fileToBase64(droppedFiles[1].file)
        ]);
        data = await api.post('/ingest/images', {
          imageBase64_1: b64_1,
          mimeType1: droppedFiles[0].file.type,
          imageBase64_2: b64_2,
          mimeType2: droppedFiles[1].file.type,
          saveToDb: false,
          generateImage: true
        });
      } else {
        const imageBase64 = await fileToBase64(droppedFiles[0].file);
        data = await api.post('/ingest/image', {
          imageBase64,
          mimeType: droppedFiles[0].file.type,
          saveToDb: false,
          generateImage: true
        });
      }

      if (data && data.recipe) {
        const recipe = data.recipe;
        const mappedIngredients = (recipe.ingredients || []).map((ing: any) => ({
          name: typeof ing.name === 'object' ? { es: ing.name?.es || '', en: ing.name?.en || '' } : { es: ing.name || '', en: ing.name || '' },
          amount: String(ing.quantity || ing.amount || ''),
          unit: typeof ing.unit === 'object' ? { es: ing.unit?.es || '', en: ing.unit?.en || '' } : { es: ing.unit || '', en: ing.unit || '' }
        }));

        const mappedInstructions = (recipe.steps || recipe.instructions || []).map((step: any) => {
          let esVal = step.instruction ? (typeof step.instruction === 'object' ? step.instruction.es || '' : step.instruction) : (step.es || '');
          let enVal = step.instruction ? (typeof step.instruction === 'object' ? step.instruction.en || esVal : step.instruction) : (step.en || esVal);
          return { es: esVal, en: enVal, type: step.type || 'active', durationMinutes: step.durationMinutes || step.duration_minutes || 0 };
        });

        const mappedTags: string[] = [];
        if (Array.isArray(recipe.tags)) {
          recipe.tags.forEach((t: any) => {
            const match = tags?.find(avail => 
              typeof t === 'string' 
                ? avail.key.toLowerCase() === t.toLowerCase() || avail.es.toLowerCase() === t.toLowerCase() || avail.en.toLowerCase() === t.toLowerCase()
                : avail.es.toLowerCase() === (t.es || '').toLowerCase() || avail.en.toLowerCase() === (t.en || '').toLowerCase() || avail.key.toLowerCase() === (t.es || '').toLowerCase()
            );
            if (match) mappedTags.push(match.key);
            else if (typeof t === 'string') mappedTags.push(t);
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

        droppedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setDroppedFiles([]);
        toast.success('¡Receta importada y procesada con éxito!');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al procesar la imagen de la receta');
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return {
    isDragging,
    setIsDragging,
    isProcessing,
    processingStep,
    droppedFiles,
    fileInputRef,
    addFiles,
    removeFile,
    processDroppedImages
  };
};
