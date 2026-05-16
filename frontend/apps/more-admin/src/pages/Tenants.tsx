import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Building2, Plus, Search, Loader2, Pencil, Power, ArrowRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  userCount: number;
}

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  dark:      'var(--surface-dark)',
  lowest:    'var(--surface-lowest)',
  surface:   'var(--surface-organic)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  primary12: 'rgba(0, 255, 194, 0.12)',
  primary15: 'rgba(0, 255, 194, 0.15)',
  danger:    'var(--danger)',
  danger08:  'rgba(248, 113, 113, 0.08)',
  danger15:  'rgba(248, 113, 113, 0.15)',
  warning:   'var(--warning)',
  warning12: 'rgba(255, 183, 3, 0.12)',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.outline}`,
  borderRadius: '1.5rem',
  overflow: 'hidden',
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const Tenants: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      logger.info('ADMIN_TENANTS_VIEW');
      isFirstRender.current = false;
    }
  }, []);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<Organization[]>('/admin/organizations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => api.post('/admin/organizations', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '' });
      toast.success(t('tenants.create_success'));
      logger.info('ADMIN_ORG_CREATE', { organizationId: data.id, name: data.name });
    },
    onError: (err) => {
      logger.error('ADMIN_ORG_CREATE_FAIL', err);
      toast.error(err?.message || t('tenants.messages.error_create'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; slug: string } }) =>
      api.put(`/admin/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setEditingOrg(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: { name: editingOrg.name, slug: editingOrg.slug } });
    } else {
      if (!newTenant.name || !newTenant.slug) return;
      createMutation.mutate(newTenant);
    }
  };

  const filteredOrgs = organizations?.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.primary08, color: T.primary }}>
              <Building2 size={24} />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
              {t('common.tenants')}
            </h2>
          </div>
          <p className="font-medium" style={{ color: T.muted }}>{t('tenants.subtitle')}</p>
        </motion.div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingOrg(null); setNewTenant({ name: '', slug: '' }); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all group"
          style={{ backgroundColor: T.primary, color: T.dark }}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('tenants.create')}</span>
        </motion.button>
      </div>

      {/* ── Table card ── */}
      <motion.div variants={itemVariants} style={cardStyle}>

        {/* Search row */}
        <div className="p-6 flex flex-col md:flex-row items-center gap-6" style={{ borderBottom: `1px solid ${T.outline}` }}>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: T.muted }} />
            <input
              type="text"
              placeholder={t('tenants.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3 rounded-xl outline-none font-medium transition-all"
              style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
            />
          </div>
          <div
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl shrink-0"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.muted }}
          >
            <span>{t('tenants.total')}:</span>
            <span className="font-bold" style={{ color: T.primary }}>{filteredOrgs?.length || 0}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: T.surfaceHi }}>
                {[t('tenants.table.org'), t('tenants.table.id'), t('tenants.table.status'), t('tenants.table.users'), t('tenants.table.actions')].map((col, i) => (
                  <th key={i} className={`px-8 py-5 text-xs font-bold uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`} style={{ color: T.muted }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={`sk-${i}`} className="animate-pulse">
                        <td colSpan={5} className="px-8 py-6">
                          <div className="h-12 rounded-2xl w-full" style={{ backgroundColor: T.surfaceHi }} />
                        </td>
                      </tr>
                    ))
                  : filteredOrgs?.map((org) => (
                      <motion.tr
                        layout
                        key={org.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="transition-all group"
                        style={{ borderTop: `1px solid ${T.outline}` }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = T.surfaceHi)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                      >
                        {/* Name */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                              style={org.status === 'active'
                                ? { backgroundColor: T.primary08, color: T.primary }
                                : { backgroundColor: T.danger08, color: T.danger }}
                            >
                              <Building2 size={22} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-lg" style={{ color: T.text }}>{org.name}</span>
                              <span className="text-xs font-medium" style={{ color: T.muted }}>ID: {org.id.slice(0, 8)}…</span>
                            </div>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="px-8 py-6">
                          <code
                            className="text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg"
                            style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}
                          >
                            {org.slug}
                          </code>
                        </td>

                        {/* Status */}
                        <td className="px-8 py-6">
                          <span
                            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter"
                            style={org.status === 'active'
                              ? { backgroundColor: T.primary12, color: T.primary }
                              : { backgroundColor: T.warning12, color: T.warning }}
                          >
                            {org.status === 'active' ? t('tenants.table.status_online') : t('tenants.table.status_suspended')}
                          </span>
                        </td>

                        {/* Users */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                            >
                              {org.userCount}
                            </div>
                            <span className="text-sm font-bold" style={{ color: T.muted }}>{t('tenants.table.users_suffix')}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => { setEditingOrg(org); setIsModalOpen(true); }}
                              className="p-3 rounded-xl transition-all"
                              style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                              title={t('tenants.actions.edit')}
                            >
                              <Pencil size={18} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                const action = org.status === 'active'
                                  ? t('tenants.actions.suspend').toLowerCase()
                                  : t('tenants.actions.activate').toLowerCase();
                                if (confirm(t('tenants.messages.confirm_status', { action }))) {
                                  toggleStatusMutation.mutate(org.id);
                                }
                              }}
                              className="p-3 rounded-xl transition-all"
                              style={org.status === 'active'
                                ? { backgroundColor: T.danger08, color: T.danger, border: `1px solid ${T.danger15}` }
                                : { backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                              title={org.status === 'active' ? t('tenants.actions.suspend') : t('tenants.actions.activate')}
                            >
                              <Power size={18} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
              </AnimatePresence>

              {!isLoading && filteredOrgs?.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>
                        <Building2 size={32} />
                      </div>
                      <p className="font-bold" style={{ color: T.muted }}>{t('tenants.table.no_tenants')}</p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ── Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingOrg(null); }}
        title={editingOrg ? t('tenants.modal.update_title') : t('tenants.modal.create_title')}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-6">

          {/* Name field */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
              {t('tenants.modal.name_label')}
            </label>
            <input
              type="text"
              placeholder={t('tenants.modal.name_placeholder')}
              className="w-full h-14 rounded-2xl px-5 outline-none font-bold text-lg transition-all"
              style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
              value={editingOrg ? editingOrg.name : newTenant.name}
              onChange={(e) => {
                if (editingOrg) setEditingOrg({ ...editingOrg, name: e.target.value });
                else setNewTenant({ ...newTenant, name: e.target.value });
              }}
              required
            />
          </div>

          {/* Slug field */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
              {t('tenants.modal.slug_label')}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={t('tenants.modal.slug_placeholder')}
                className="w-full h-14 rounded-2xl px-5 pr-36 outline-none font-mono lowercase text-lg transition-all"
                style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                value={editingOrg ? editingOrg.slug : newTenant.slug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                  if (editingOrg) setEditingOrg({ ...editingOrg, slug: val });
                  else setNewTenant({ ...newTenant, slug: val });
                }}
                required
              />
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded"
                style={{ color: T.primary, backgroundColor: T.primary08 }}
              >
                wati.app/{'{'+'slug'}{'}'} 
              </div>
            </div>
            <p className="text-[11px] font-medium italic pl-1" style={{ color: T.muted }}>
              {t('tenants.modal.slug_hint')}
            </p>
          </div>

          {/* Submit */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full h-16 rounded-[1.25rem] text-lg font-black tracking-tight flex items-center justify-center gap-3 transition-all disabled:opacity-60"
              style={{ backgroundColor: T.primary, color: T.dark }}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span>{editingOrg ? t('tenants.modal.submit_update') : t('tenants.modal.submit_create')}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </motion.div>
        </form>
      </Modal>
    </motion.div>
  );
};
