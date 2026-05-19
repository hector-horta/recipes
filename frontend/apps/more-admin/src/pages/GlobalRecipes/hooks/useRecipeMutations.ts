import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { RecipeFormData } from '../types';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../utils/logger';

interface UseRecipeMutationsProps {
  setIsModalOpen: (isOpen: boolean) => void;
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setFormData: React.Dispatch<React.SetStateAction<RecipeFormData>>;
  setImageFeedback: (feedback: string) => void;
}

export const useRecipeMutations = ({
  setIsModalOpen,
  setSelectedIds,
  setFormData,
  setImageFeedback
}: UseRecipeMutationsProps) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const createMutation = useMutation({
    mutationFn: (data: RecipeFormData) => {
      const payload = {
        title_es: data.title,
        title_en: data.titleEn,
        prep_time_minutes: data.prepTimeMinutes,
        cook_time_minutes: data.cookTimeMinutes,
        servings: data.servings,
        difficulty: data.difficulty,
        status: data.status,
        sibo_risk_level: data.safetyLevel,
        ingredients: data.ingredients,
        steps: data.instructions,
        tags: data.tags,
        image_url: data.imageUrl
      };
      return api.post('/admin/recipes', payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setIsModalOpen(false);
      logger.info('ADMIN_RECIPE_CREATE', { id: data.id, slug: data.slug });
      toast.success(t('recipes.create_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_CREATE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecipeFormData }) => {
      const payload = {
        title_es: data.title,
        title_en: data.titleEn,
        prep_time_minutes: data.prepTimeMinutes,
        cook_time_minutes: data.cookTimeMinutes,
        servings: data.servings,
        difficulty: data.difficulty,
        status: data.status,
        sibo_risk_level: data.safetyLevel,
        ingredients: data.ingredients,
        steps: data.instructions,
        tags: data.tags,
        image_url: data.imageUrl
      };
      console.log('UPDATING RECIPE PAYLOAD:', JSON.stringify(payload, null, 2));
      return api.put(`/admin/recipes/${id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setIsModalOpen(false);
      logger.info('ADMIN_RECIPE_UPDATE', { id: variables.id, slug: (variables.data as any).slug });
      toast.success(t('recipes.update_success'));
    },
    onError: (error: any, variables) => {
      logger.error('ADMIN_RECIPE_UPDATE_FAILED', { id: variables.id, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/recipes/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      logger.info('ADMIN_RECIPE_DELETE', { id });
      toast.success(t('recipes.delete_success'));
    },
    onError: (error: any, id) => {
      logger.error('ADMIN_RECIPE_DELETE_FAILED', { id, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => 
      Promise.all(ids.map(id => api.put(`/admin/recipes/${id}`, { status }))),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setSelectedIds([]);
      logger.info('ADMIN_RECIPE_BULK_UPDATE', { count: variables.ids.length, status: variables.status });
      toast.success(t('recipes.bulk_update_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_BULK_UPDATE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => 
      Promise.all(ids.map(id => api.delete(`/admin/recipes/${id}`))),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setSelectedIds([]);
      logger.info('ADMIN_RECIPE_BULK_DELETE', { count: ids.length });
      toast.success(t('recipes.bulk_delete_success'));
    },
    onError: (error: any) => {
      logger.error('ADMIN_RECIPE_BULK_DELETE_FAILED', { error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  const refreshImageMutation = useMutation({
    mutationFn: ({ id, issue }: { id: string; issue: string }) => 
      api.post(`/ingest/${id}/refresh-image`, { issue }),
    onSuccess: (data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['global-recipes'] });
      setFormData(prev => ({ ...prev, imageUrl: data.recipe.image_url }));
      setImageFeedback('');
      logger.info('ADMIN_RECIPE_IMAGE_REFRESH', { id: variables.id });
      toast.success(t('recipes.regenerate_success'));
    },
    onError: (error: any, variables) => {
      logger.error('ADMIN_RECIPE_IMAGE_REFRESH_FAILED', { id: variables.id, error: error?.message });
      toast.error(error?.message || t('recipes.error_generic'));
    }
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    bulkUpdateStatusMutation,
    bulkDeleteMutation,
    refreshImageMutation
  };
};
