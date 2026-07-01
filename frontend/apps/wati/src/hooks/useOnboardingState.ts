import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';

export interface IntoleranceItem {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

interface UseOnboardingStateProps {
  onSaveSuccess: () => void;
}

export function useOnboardingState({ onSaveSuccess }: UseOnboardingStateProps) {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // States
  const [selectedIds, setSelectedIds] = useState<string[]>(user?.intolerances || []);
  const [severities, setSeverities] = useState<Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>>(user?.severities || {});
  const [diet, setDiet] = useState<string>(user?.diet || 'None');
  const [dailyCalories, setDailyCalories] = useState<number>(user?.daily_calories || 2000);
  const [conditions] = useState<string[]>(user?.conditions || []);
  const [step, setStep] = useState<'select' | 'severity'>('select');

  // Fetch catalog
  const { data: catalog = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['medical', 'catalog'],
    queryFn: async () => {
      const data = await api.get<IntoleranceItem[]>('/medical/catalog');
      return data.map(item => ({
        ...item,
        label: t(`intolerances.${item.id}`, { defaultValue: item.label }),
        desc: t(`intolerances.${item.id}Desc`, { defaultValue: item.desc })
      }));
    },
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

  const toggleIntolerance = (id: string) => {
    setError(null);
    if (catalog.length > 0 && !catalog.some(item => item.id === id)) {
      console.warn(`[Onboarding] Attempted to toggle invalid intolerance: ${id}`);
      return;
    }

    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      handleSave();
      return;
    }
    const newSeverities = { ...severities };
    selectedIds.forEach(id => {
      if (!newSeverities[id]) newSeverities[id] = 'moderate';
    });
    setSeverities(newSeverities);
    setStep('severity');
  };

  const handleSave = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const intolerances = selectedIds;
      
      // Sync conditions: if 'sibo' is in intolerances, it must also be in conditions for the security engine
      const updatedConditions = [...conditions];
      if (intolerances.includes('sibo') && !updatedConditions.includes('SIBO')) {
        updatedConditions.push('SIBO');
      } else if (!intolerances.includes('sibo')) {
        const index = updatedConditions.indexOf('SIBO');
        if (index > -1) updatedConditions.splice(index, 1);
      }

      await updateUserProfile({
        diet,
        daily_calories: dailyCalories,
        intolerances,
        severities,
        conditions: updatedConditions,
        onboarding_completed: true
      });
      onSaveSuccess();
    } catch (err) {
      console.error('[Onboarding] Error al guardar el perfil:', err);
      setError(t('common.errorPersistence', { defaultValue: 'Error al guardar. Inténtalo de nuevo.' }));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    catalog,
    isLoading,
    isError,
    refetch,
    selectedIds,
    setSelectedIds,
    severities,
    setSeverities,
    diet,
    setDiet,
    dailyCalories,
    setDailyCalories,
    step,
    setStep,
    isSaving,
    error,
    toggleIntolerance,
    handleNext,
    handleSave
  };
}
