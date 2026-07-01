import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Search, Pencil, Power } from 'lucide-react';
import type { Organization } from '../../hooks/useTenantQueries';

const T = {
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

interface TenantTableProps {
  organizations: Organization[] | undefined;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setEditingOrg: (org: Organization) => void;
  setActiveTab: (tab: 'info' | 'users' | 'bulk') => void;
  setIsModalOpen: (open: boolean) => void;
  toggleStatusMutation: any;
}

export const TenantTable: React.FC<TenantTableProps> = ({
  organizations,
  isLoading,
  searchTerm,
  setSearchTerm,
  setEditingOrg,
  setActiveTab,
  setIsModalOpen,
  toggleStatusMutation
}) => {
  const { t } = useTranslation();

  const filteredOrgs = organizations?.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: T.surface, border: `1px solid ${T.outline}`, borderRadius: '1.5rem', overflow: 'hidden' }}>
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
        <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl shrink-0" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.muted }}>
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
                <th key={i} className={`px-8 py-5 text-xs font-bold uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`} style={{ color: T.muted }}>
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
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                            style={org.status === 'active' ? { backgroundColor: T.primary08, color: T.primary } : { backgroundColor: T.danger08, color: T.danger }}
                          >
                            <Building2 size={22} strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-lg" style={{ color: T.text }}>{org.name}</span>
                            <span className="text-xs font-medium" style={{ color: T.muted }}>ID: {org.id.slice(0, 8)}…</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-8 py-6">
                        <code className="text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg" style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}>
                          {org.slug}
                        </code>
                      </td>

                      <td className="px-8 py-6">
                        <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter" style={org.status === 'active' ? { backgroundColor: T.primary12, color: T.primary } : { backgroundColor: T.warning12, color: T.warning }}>
                          {org.status === 'active' ? t('tenants.table.status_online') : t('tenants.table.status_suspended')}
                        </span>
                      </td>

                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}`, color: T.text }}>
                            {org.userCount}
                          </div>
                          <span className="text-sm font-bold" style={{ color: T.muted }}>{t('tenants.table.users_suffix')}</span>
                        </div>
                      </td>

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
                              const action = org.status === 'active' ? t('tenants.actions.suspend').toLowerCase() : t('tenants.actions.activate').toLowerCase();
                              if (confirm(t('tenants.messages.confirm_status', { action }))) {
                                toggleStatusMutation.mutate(org.id);
                              }
                            }}
                            className="p-3 rounded-xl transition-all"
                            style={org.status === 'active' ? { backgroundColor: T.danger08, color: T.danger, border: `1px solid ${T.danger15}` } : { backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
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
    </div>
  );
};
