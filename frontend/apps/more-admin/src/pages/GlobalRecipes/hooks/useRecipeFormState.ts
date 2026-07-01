import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../../lib/api';
import type { RecipeFormData } from '../types';

interface UseRecipeFormStateProps {
  formData: RecipeFormData;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
}

export const useRecipeFormState = ({ formData, setFormData }: UseRecipeFormStateProps) => {
  const [translatingFields, setTranslatingFields] = useState<Record<string, boolean>>({});

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
      const data = await api.post<{ translation: string }>('/admin/translate', { text, from, to });
      onTranslation(data.translation);
      toast.success('Traducido con éxito');
    } catch (error: any) {
      toast.error(error?.message || 'Error al traducir');
    } finally {
      setTranslatingFields(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const toggleTag = (tagKey: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey) ? prev.tags.filter(k => k !== tagKey) : [...prev.tags, tagKey]
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

  return {
    translatingFields,
    handleTranslateField,
    toggleTag,
    addIngredient,
    addStep,
    moveIngredient,
    moveStep
  };
};
