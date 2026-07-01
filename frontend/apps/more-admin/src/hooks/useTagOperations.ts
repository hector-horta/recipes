import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

export interface Tag {
  id: string;
  key: string;
  es: string;
  en: string;
}

export const useTagOperations = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState({ key: '', es: '', en: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const tagsQuery = useQuery({
    queryKey: ['global-tags'],
    queryFn: () => api.get<Tag[]>('/admin/tags'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newTag) => api.post('/admin/tags', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      setIsModalOpen(false);
      setNewTag({ key: '', es: '', en: '' });
      toast.success(t('tags.messages.create_success'));
      logger.info('ADMIN_TAG_CREATE', { tagId: data.id, key: data.key });
    },
    onError: (error: any) => {
      logger.error('ADMIN_TAG_CREATE_FAIL', error);
      toast.error(error?.message || t('common.error_generic'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof newTag }) =>
      api.put(`/admin/tags/${id}`, data),
    onSuccess: (data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      setEditingTag(null);
      setIsModalOpen(false);
      toast.success(t('tags.messages.update_success'));
      logger.info('ADMIN_TAG_UPDATE', { tagId: variables.id, key: data.key });
    },
    onError: (error: any) => {
      logger.error('ADMIN_TAG_UPDATE_FAIL', error);
      toast.error(error?.message || t('common.error_generic'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/tags/${id}`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      toast.success(t('tags.messages.delete_success'));
      logger.info('ADMIN_TAG_DELETE', { tagId: id });
    },
    onError: (error: any) => {
      logger.error('ADMIN_TAG_DELETE_FAIL', error);
      toast.error(error?.message || t('common.error_generic'));
    },
  });

  return {
    isModalOpen, setIsModalOpen,
    editingTag, setEditingTag,
    newTag, setNewTag,
    searchTerm, setSearchTerm,
    tags: tagsQuery.data,
    isLoading: tagsQuery.isLoading,
    createMutation,
    updateMutation,
    deleteMutation
  };
};
