import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { 
  Building2, Plus, Search, Loader2, Pencil, Power, ArrowRight, 
  Trash2, Shield, Upload, FileSpreadsheet
} from 'lucide-react';
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

interface TenantUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  role: 'admin' | 'user';
  joinedAt: string;
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

  // Tab State for Edit Modal
  const [activeTab, setActiveTab] = useState<'info' | 'users' | 'bulk'>('info');

  // Single User State in Users Tab
  const [newUser, setNewUser] = useState({ displayName: '', email: '', role: 'user' as 'admin' | 'user' });

  // Bulk CSV Upload State
  const [file, setFile] = useState<File | null>(null);
  const [parsedUsers, setParsedUsers] = useState<Array<any>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  React.useEffect(() => {
    if (isFirstRender.current) {
      logger.info('ADMIN_TENANTS_VIEW');
      isFirstRender.current = false;
    }
  }, []);

  // Fetch all organizations
  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => api.get<Organization[]>('/admin/organizations'),
  });

  // Fetch detailed organization data (only when editing)
  const { data: orgDetail, isLoading: isLoadingDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['organization', editingOrg?.id],
    queryFn: () => api.get<any>(`/admin/organizations/${editingOrg?.id}`),
    enabled: !!editingOrg?.id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => api.post('/admin/organizations', data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '' });
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
      setEditingOrg(null);
      setIsModalOpen(false);
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
      api.post(`/admin/organizations/${editingOrg?.id}/users`, data),
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setNewUser({ displayName: '', email: '', role: 'user' });
      toast.success(t('tenants.messages.create_success'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('tenants.messages.error_create'));
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/admin/organizations/${editingOrg?.id}/users/${userId}`),
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success(t('tenants.messages.update_success'));
    },
    onError: (err: any) => {
      toast.error(err?.message || t('tenants.messages.error_update'));
    }
  });

  const bulkUploadMutation = useMutation({
    mutationFn: (users: Array<any>) =>
      api.post(`/admin/organizations/${editingOrg?.id}/users/bulk`, { users }),
    onSuccess: (data: any) => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setFile(null);
      setParsedUsers([]);
      
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      updateMutation.mutate({ 
        id: editingOrg.id, 
        data: { 
          name: editingOrg.name, 
          slug: editingOrg.slug,
          is_active: editingOrg.status === 'active'
        } 
      });
    } else {
      if (!newTenant.name || !newTenant.slug) return;
      createMutation.mutate(newTenant);
    }
  };

  // CSV parsing logic
  const handleCSVFile = (selectedFile: File) => {
    setIsParsing(true);
    setParseError(null);
    setParsedUsers([]);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          throw new Error('Empty file content.');
        }

        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length === 0) {
          throw new Error('No lines found in the CSV.');
        }

        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));

        const displayNameIdx = headers.findIndex(h => h.toLowerCase() === 'displayname' || h.toLowerCase() === 'name');
        const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
        const roleIdx = headers.findIndex(h => h.toLowerCase() === 'role');

        if (emailIdx === -1) {
          throw new Error("Missing 'email' column in the header.");
        }
        if (displayNameIdx === -1) {
          throw new Error("Missing 'displayName' or 'name' column in the header.");
        }

        const rows: Array<any> = [];
        for (let i = 1; i < lines.length; i++) {
          const rowLine = lines[i];
          const values = rowLine.split(separator).map(v => v.trim().replace(/^["']|["']$/g, ''));
          
          if (values.length < Math.max(displayNameIdx, emailIdx) + 1) {
            continue;
          }

          const email = values[emailIdx];
          const displayName = values[displayNameIdx];
          let role = 'user';
          if (roleIdx !== -1 && values[roleIdx]) {
            const roleVal = values[roleIdx].toLowerCase();
            if (roleVal === 'admin' || roleVal === 'user') {
              role = roleVal;
            }
          }

          if (email && displayName) {
            rows.push({ displayName, email, role });
          }
        }

        if (rows.length === 0) {
          throw new Error('No valid user rows could be parsed from the CSV.');
        }

        if (rows.length > 500) {
          throw new Error('Limit exceeded: A maximum of 500 users is allowed per bulk request.');
        }

        setParsedUsers(rows);
      } catch (err: any) {
        setParseError(err.message);
        toast.error(err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Error reading file.');
      setIsParsing(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0]);
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
          onClick={() => { 
            setEditingOrg(null); 
            setNewTenant({ name: '', slug: '' }); 
            setActiveTab('info');
            setIsModalOpen(true); 
          }}
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
                              onClick={() => { 
                                setEditingOrg(org); 
                                setActiveTab('info');
                                setIsModalOpen(true); 
                              }}
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
        onClose={() => { 
          setIsModalOpen(false); 
          setEditingOrg(null); 
          setFile(null);
          setParsedUsers([]);
          setParseError(null);
        }}
        title={editingOrg ? t('tenants.modal.update_title') : t('tenants.modal.create_title')}
        maxWidth={editingOrg ? 'max-w-4xl' : 'max-w-md'}
      >
        {/* Navigation Tabs (Only when editing an existing tenant) */}
        {editingOrg && (
          <div className="flex gap-2 border-b pb-4 mb-6" style={{ borderColor: T.outline }}>
            {(['info', 'users', 'bulk'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setFile(null);
                  setParsedUsers([]);
                  setParseError(null);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={
                  activeTab === tab
                    ? { backgroundColor: T.primary, color: T.dark }
                    : { color: T.muted }
                }
              >
                {t(`tenants.modal.tab_${tab}`)}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content Panels */}
        {activeTab === 'info' || !editingOrg ? (
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

            {/* Operational Status (Only displayed when editing) */}
            {editingOrg && (
              <div className="space-y-3">
                <label className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                  {t('tenants.modal.status_label')}
                </label>
                <select
                  value={editingOrg.status}
                  onChange={(e) => setEditingOrg({ ...editingOrg, status: e.target.value as 'active' | 'suspended' })}
                  className="w-full h-14 rounded-2xl px-5 outline-none font-bold text-lg transition-all"
                  style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}
                >
                  <option value="active">{t('tenants.modal.status_active')}</option>
                  <option value="suspended">{t('tenants.modal.status_suspended')}</option>
                </select>
              </div>
            )}

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
        ) : activeTab === 'users' ? (
          <div className="space-y-8 p-1">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin" style={{ color: T.primary }} size={32} />
                <p className="text-sm font-semibold" style={{ color: T.muted }}>Loading collaborator list...</p>
              </div>
            ) : (
              <>
                {/* User Listing Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-extrabold tracking-tight" style={{ color: T.text }}>
                    {t('tenants.modal.users_title')}
                  </h4>
                  
                  <div className="overflow-hidden rounded-2xl border" style={{ borderColor: T.outline, backgroundColor: T.surface }}>
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: T.surfaceHi }}>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                              {t('tenants.modal.user_name')}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                              {t('tenants.modal.user_role')}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                              {t('tenants.modal.user_joined')}
                            </th>
                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: T.muted }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {orgDetail?.users && orgDetail.users.length > 0 ? (
                            orgDetail.users.map((user: TenantUser) => (
                              <tr key={user.id} className="transition-all hover:bg-[rgba(255,255,255,0.02)]" style={{ borderTop: `1px solid ${T.outline}` }}>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-sm" style={{ color: T.text }}>{user.displayName}</span>
                                    <span className="text-xs" style={{ color: T.muted }}>{user.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border"
                                    style={
                                      user.role === 'admin'
                                        ? { borderColor: T.primary15, color: T.primary, backgroundColor: T.primary08 }
                                        : { borderColor: T.outline, color: T.muted, backgroundColor: T.surfaceHi }
                                    }
                                  >
                                    <Shield size={12} />
                                    <span>{user.role === 'admin' ? t('tenants.modal.user_role_admin') : t('tenants.modal.user_role_user')}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold" style={{ color: T.muted }}>
                                  {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => {
                                      if (confirm(t('tenants.modal.remove_user_confirm'))) {
                                        removeUserMutation.mutate(user.id);
                                      }
                                    }}
                                    disabled={removeUserMutation.isPending}
                                    className="p-2 rounded-lg text-[var(--danger)] hover:bg-[rgba(248,113,113,0.08)] transition-all disabled:opacity-50"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold" style={{ color: T.muted }}>
                                No associated collaborators.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Inline User Registration Section */}
                <div className="p-6 rounded-2xl border border-dashed space-y-4" style={{ borderColor: T.outline, backgroundColor: T.surfaceHi }}>
                  <h5 className="text-md font-bold tracking-tight flex items-center gap-2" style={{ color: T.text }}>
                    <Plus size={18} style={{ color: T.primary }} />
                    <span>{t('tenants.modal.add_user_title')}</span>
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder={t('tenants.modal.user_name')}
                        value={newUser.displayName}
                        onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl outline-none font-medium text-sm transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                      />
                    </div>
                    <div className="space-y-1">
                      <input
                        type="email"
                        placeholder={t('tenants.modal.user_email')}
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full h-11 px-4 rounded-xl outline-none font-medium text-sm transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                        className="flex-1 h-11 px-3 rounded-xl outline-none font-medium text-sm transition-all"
                        style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, color: T.text }}
                      >
                        <option value="user">{t('tenants.modal.user_role_user')}</option>
                        <option value="admin">{t('tenants.modal.user_role_admin')}</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (!newUser.displayName || !newUser.email) {
                            toast.error('All user fields are required.');
                            return;
                          }
                          addUserMutation.mutate(newUser);
                        }}
                        disabled={addUserMutation.isPending}
                        className="px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center shrink-0"
                        style={{ backgroundColor: T.primary, color: T.dark }}
                      >
                        {addUserMutation.isPending ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          t('tenants.modal.add_user_btn')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Bulk CSV Upload Tab */
          <div className="space-y-6 p-1">
            <div className="flex flex-col">
              <h4 className="text-lg font-extrabold tracking-tight" style={{ color: T.text }}>
                {t('tenants.modal.bulk_title')}
              </h4>
              <p className="text-xs font-semibold mt-1" style={{ color: T.muted }}>
                {t('tenants.modal.bulk_hint')}
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all ${
                dragActive ? 'scale-[1.01]' : ''
              }`}
              style={{
                borderColor: dragActive ? T.primary : T.outline,
                backgroundColor: dragActive ? T.primary08 : T.surface
              }}
            >
              <div className="p-4 rounded-full" style={{ backgroundColor: T.surfaceHi, color: T.primary }}>
                <Upload size={32} />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm" style={{ color: T.text }}>
                  Drag & Drop CSV file here, or{' '}
                  <label className="cursor-pointer underline" style={{ color: T.primary }}>
                    browse files
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCSVFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </p>
                {file && (
                  <p className="text-xs font-mono mt-2" style={{ color: T.primary }}>
                    Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                  </p>
                )}
              </div>
            </div>

            {/* Limit Warning */}
            <div className="p-4 rounded-2xl text-xs font-bold" style={{ backgroundColor: T.warning12, color: T.warning }}>
              {t('tenants.modal.bulk_warning')}
            </div>

            {/* Errors / Parsing Status */}
            {isParsing && (
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: T.text }}>
                <Loader2 className="animate-spin text-sm" style={{ color: T.primary }} />
                <span>{t('tenants.modal.bulk_parsing')}</span>
              </div>
            )}

            {parseError && (
              <div className="p-4 rounded-2xl text-xs font-bold" style={{ backgroundColor: T.danger08, color: T.danger }}>
                ❌ {parseError}
              </div>
            )}

            {/* File Preview */}
            {!isParsing && parsedUsers.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                  <FileSpreadsheet size={16} style={{ color: T.primary }} />
                  <span>{t('tenants.modal.bulk_preview')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: T.primary08, color: T.primary }}>
                    {parsedUsers.length} row(s)
                  </span>
                </h5>

                <div className="overflow-hidden rounded-2xl border" style={{ borderColor: T.outline, backgroundColor: T.surface }}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: T.surfaceHi }}>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                          Name
                        </th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                          Email
                        </th>
                        <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedUsers.slice(0, 5).map((user, i) => (
                        <tr key={i} className="text-xs" style={{ borderTop: `1px solid ${T.outline}` }}>
                          <td className="px-5 py-3 font-semibold" style={{ color: T.text }}>{user.displayName}</td>
                          <td className="px-5 py-3 font-mono" style={{ color: T.muted }}>{user.email}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-md border font-black uppercase text-[9px]"
                              style={
                                user.role === 'admin'
                                  ? { borderColor: T.primary15, color: T.primary, backgroundColor: T.primary08 }
                                  : { borderColor: T.outline, color: T.muted }
                              }
                            >
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Upload Action */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                  <button
                    type="button"
                    onClick={() => bulkUploadMutation.mutate(parsedUsers)}
                    disabled={bulkUploadMutation.isPending}
                    className="w-full h-14 rounded-2xl text-md font-black tracking-tight flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                    style={{ backgroundColor: T.primary, color: T.dark }}
                  >
                    {bulkUploadMutation.isPending ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span>{t('tenants.modal.bulk_upload_btn')}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
