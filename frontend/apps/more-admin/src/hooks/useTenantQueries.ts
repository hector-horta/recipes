import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  userCount: number;
}

export interface TenantUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  role: 'admin' | 'user';
  joinedAt: string;
}

export const useTenantQueries = (editingOrgId?: string) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const organizationsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<Organization[]>('/admin/organizations'),
  });

  const orgDetailQuery = useQuery({
    queryKey: ['organization', editingOrgId],
    queryFn: () => api.get<any>(`/admin/organizations/${editingOrgId}`),
    enabled: !!editingOrgId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => api.post('/admin/organizations', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('tenants.create_success'));
      logger.info('ADMIN_ORG_CREATE', { organizationId: data.id, name: data.name });
    },
    onError: (err: any) => {
      logger.error('ADMIN_ORG_CREATE_FAIL', err);
      toast.error(err?.message || t('tenants.messages.error_create'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; slug: string; is_active?: boolean } }) =>
      api.put(`/admin/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('tenants.messages.update_success'));
    },
    onError: (error: any) => {
      toast.error(error?.message || t('tenants.messages.error_update'));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/organizations/${id}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error?.message || t('tenants.messages.error_status'));
    },
  });

  const addUserMutation = useMutation({
    mutationFn: (data: { displayName: string; email: string; role: 'admin' | 'user' }) =>
      api.post(`/admin/organizations/${editingOrgId}/users`, data),
    onSuccess: () => {
      orgDetailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('tenants.messages.create_success'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('tenants.messages.error_create'));
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/organizations/${editingOrgId}/users/${userId}`),
    onSuccess: () => {
      orgDetailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('tenants.messages.update_success'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('tenants.messages.error_update'));
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: (users: Array<any>) =>
      api.post(`/admin/organizations/${editingOrgId}/users/bulk`, { users }),
    onSuccess: (data: any) => {
      orgDetailQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      const msg = t('tenants.modal.bulk_success', {
        created: data.created,
        associated: data.associated,
        errors: data.errors.length
      });
      toast.success(msg);

      if (data.errors.length > 0) {
        logger.warn('ADMIN_BULK_UPLOAD_PARTIAL_ERRORS', data.errors);
        toast(
          `Failed: ${data.errors.length} user(s)\n${data.errors.slice(0, 3).map((e: any) => `Row ${e.row}: ${e.reason}`).join('\n')}${data.errors.length > 3 ? '\n...' : ''}`,
          { icon: '⚠️', duration: 6000 }
        );
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Error processing bulk upload.');
    }
  });

  return {
    organizations: organizationsQuery.data,
    isLoading: organizationsQuery.isLoading,
    orgDetail: orgDetailQuery.data,
    isLoadingDetail: orgDetailQuery.isLoading,
    refetchDetail: orgDetailQuery.refetch,
    createMutation,
    updateMutation,
    toggleStatusMutation,
    addUserMutation,
    removeUserMutation,
    bulkUploadMutation
  };
};
