import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../Modal';
import { CollaboratorsSection } from './CollaboratorsSection';
import { BulkUserImportSection } from './BulkUserImportSection';
import type { Organization } from '../../hooks/useTenantQueries';

const T = {
  dark:      'var(--surface-dark)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary08: 'rgba(0, 255, 194, 0.08)',
} as const;

interface OrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingOrg: Organization | null;
  setEditingOrg: React.Dispatch<React.SetStateAction<Organization | null>>;
  newTenant: { name: string; slug: string };
  setNewTenant: React.Dispatch<React.SetStateAction<{ name: string; slug: string }>>;
  activeTab: 'info' | 'users' | 'bulk';
  setActiveTab: (tab: 'info' | 'users' | 'bulk') => void;
  createMutation: any;
  updateMutation: any;
  orgDetail: any;
  isLoadingDetail: boolean;
  newUser: { displayName: string; email: string; role: 'admin' | 'user' };
  setNewUser: React.Dispatch<React.SetStateAction<{ displayName: string; email: string; role: 'admin' | 'user' }>>;
  addUserMutation: any;
  removeUserMutation: any;
  file: File | null;
  parsedUsers: Array<any>;
  parseError: string | null;
  isParsing: boolean;
  dragActive: boolean;
  handleCSVFile: (file: File) => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleResetBulkState: () => void;
  bulkUploadMutation: any;
}

export const OrganizationModal: React.FC<OrganizationModalProps> = ({
  isOpen,
  onClose,
  editingOrg,
  setEditingOrg,
  newTenant,
  setNewTenant,
  activeTab,
  setActiveTab,
  createMutation,
  updateMutation,
  orgDetail,
  isLoadingDetail,
  newUser,
  setNewUser,
  addUserMutation,
  removeUserMutation,
  file,
  parsedUsers,
  parseError,
  isParsing,
  dragActive,
  handleCSVFile,
  handleDrag,
  handleDrop,
  handleResetBulkState,
  bulkUploadMutation
}) => {
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
    handleResetBulkState();
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editingOrg ? t('tenants.modal.update_title') : t('tenants.modal.create_title')}
      maxWidth="max-w-4xl"
    >
      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b pb-4 mb-6" style={{ borderColor: T.outline }}>
        {(['info', 'users', 'bulk'] as const).map((tab) => {
          const isDisabled = !editingOrg && tab !== 'info';
          return (
            <button
              key={tab}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (isDisabled) return;
                setActiveTab(tab);
                handleResetBulkState();
              }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5"
              style={
                activeTab === tab
                  ? { backgroundColor: T.primary, color: T.dark }
                  : isDisabled
                  ? { color: 'rgba(255, 255, 255, 0.2)', cursor: 'not-allowed' }
                  : { color: T.muted }
              }
              title={isDisabled ? "Inscribir tenant primero para habilitar" : undefined}
            >
              <span>{t(`tenants.modal.tab_${tab}`)}</span>
              {isDisabled && <span className="text-[10px] opacity-65">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'info' || !editingOrg ? (
        <form onSubmit={handleSubmitInfo} className="p-2 space-y-6 max-w-xl mx-auto">
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded" style={{ color: T.primary, backgroundColor: T.primary08 }}>
                wati.app/{'{'+'slug'}{'}'} 
              </div>
            </div>
            <p className="text-[11px] font-medium italic pl-1" style={{ color: T.muted }}>
              {t('tenants.modal.slug_hint')}
            </p>
          </div>

          {/* Status field */}
          {editingOrg && (
            <div className="space-y-3">
              <label className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
                {t('tenants.modal.status_label')}
              </label>
              <select
                value={editingOrg.status}
                onChange={(e) => setEditingOrg({ ...editingOrg, status: e.target.value as any })}
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
        <CollaboratorsSection
          orgDetail={orgDetail}
          isLoadingDetail={isLoadingDetail}
          newUser={newUser}
          setNewUser={setNewUser}
          addUserMutation={addUserMutation}
          removeUserMutation={removeUserMutation}
        />
      ) : (
        <BulkUserImportSection
          file={file}
          parsedUsers={parsedUsers}
          parseError={parseError}
          isParsing={isParsing}
          dragActive={dragActive}
          handleCSVFile={handleCSVFile}
          handleDrag={handleDrag}
          handleDrop={handleDrop}
          bulkUploadMutation={bulkUploadMutation}
        />
      )}
    </Modal>
  );
};
