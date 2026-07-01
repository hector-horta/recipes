import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Building2, Plus } from 'lucide-react';
import { logger } from '../utils/logger';
import { useTenantQueries } from '../hooks/useTenantQueries';
import { useTenantOperations } from '../hooks/useTenantOperations';
import { TenantTable } from '../components/tenants/TenantTable';
import { OrganizationModal } from '../components/tenants/OrganizationModal';

const T = {
  primary:   'var(--brand-primary)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
} as const;

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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      logger.info('ADMIN_TENANTS_VIEW');
      isFirstRender.current = false;
    }
  }, []);

  const {
    isModalOpen, setIsModalOpen,
    editingOrg, setEditingOrg,
    newTenant, setNewTenant,
    searchTerm, setSearchTerm,
    activeTab, setActiveTab,
    newUser, setNewUser,
    file,
    parsedUsers,
    parseError,
    isParsing,
    dragActive,
    handleCSVFile,
    handleDrag,
    handleDrop,
    handleResetBulkState
  } = useTenantOperations();

  const {
    organizations,
    isLoading,
    orgDetail,
    isLoadingDetail,
    createMutation,
    updateMutation,
    toggleStatusMutation,
    addUserMutation,
    removeUserMutation,
    bulkUploadMutation
  } = useTenantQueries(editingOrg?.id);

  // Wrap mutations to set editingOrg properly on creation success
  const wrappedCreateMutation = {
    ...createMutation,
    mutate: (data: { name: string; slug: string }) => {
      createMutation.mutate(data, {
        onSuccess: (res: any) => {
          setEditingOrg({
            id: res.id,
            name: res.name,
            slug: res.slug,
            status: 'active',
            createdAt: res.createdAt || new Date().toISOString(),
            userCount: 0
          });
          setNewTenant({ name: '', slug: '' });
          setActiveTab('users');
        }
      });
    }
  };

  const wrappedUpdateMutation = {
    ...updateMutation,
    mutate: (arg: { id: string; data: { name: string; slug: string; is_active?: boolean } }) => {
      updateMutation.mutate(arg, {
        onSuccess: () => {
          setEditingOrg(null);
          setIsModalOpen(false);
        }
      });
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">
      {/* Header */}
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
          style={{ backgroundColor: T.primary, color: 'var(--surface-dark)' }}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('tenants.create')}</span>
        </motion.button>
      </div>

      {/* Tenant Table list */}
      <motion.div variants={itemVariants}>
        <TenantTable
          organizations={organizations}
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setEditingOrg={setEditingOrg}
          setActiveTab={setActiveTab}
          setIsModalOpen={setIsModalOpen}
          toggleStatusMutation={toggleStatusMutation}
        />
      </motion.div>

      {/* Tenant Detail/Creation Modal */}
      <OrganizationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingOrg(null);
        }}
        editingOrg={editingOrg}
        setEditingOrg={setEditingOrg}
        newTenant={newTenant}
        setNewTenant={setNewTenant}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        createMutation={wrappedCreateMutation}
        updateMutation={wrappedUpdateMutation}
        orgDetail={orgDetail}
        isLoadingDetail={isLoadingDetail}
        newUser={newUser}
        setNewUser={setNewUser}
        addUserMutation={addUserMutation}
        removeUserMutation={removeUserMutation}
        file={file}
        parsedUsers={parsedUsers}
        parseError={parseError}
        isParsing={isParsing}
        dragActive={dragActive}
        handleCSVFile={handleCSVFile}
        handleDrag={handleDrag}
        handleDrop={handleDrop}
        handleResetBulkState={handleResetBulkState}
        bulkUploadMutation={bulkUploadMutation}
      />
    </motion.div>
  );
};
