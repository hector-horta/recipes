import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Languages } from 'lucide-react';
import { logger } from '../utils/logger';
import { useTagOperations } from '../hooks/useTagOperations';
import { TagTable } from '../components/tags/TagTable';
import { TagFormModal } from '../components/tags/TagFormModal';

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

export const Tags: React.FC = () => {
  const { t } = useTranslation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      logger.info('ADMIN_TAGS_VIEW');
      isFirstRender.current = false;
    }
  }, []);

  const {
    isModalOpen, setIsModalOpen,
    editingTag, setEditingTag,
    newTag, setNewTag,
    searchTerm, setSearchTerm,
    tags,
    isLoading,
    createMutation,
    updateMutation,
    deleteMutation
  } = useTagOperations();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: T.primary08, color: T.primary }}>
              <Languages size={24} />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight" style={{ color: T.text }}>
              {t('tags.title')}
            </h2>
          </div>
          <p className="font-medium" style={{ color: T.muted }}>{t('tags.subtitle')}</p>
        </motion.div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingTag(null); setNewTag({ key: '', es: '', en: '' }); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all group"
          style={{ backgroundColor: T.primary, color: 'var(--surface-dark)' }}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('tags.create')}</span>
        </motion.button>
      </div>

      {/* Tag Table */}
      <motion.div variants={itemVariants}>
        <TagTable
          tags={tags}
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setEditingTag={setEditingTag}
          setIsModalOpen={setIsModalOpen}
          deleteMutation={deleteMutation}
        />
      </motion.div>

      {/* Tag Form Modal */}
      <TagFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingTag={editingTag}
        setEditingTag={setEditingTag}
        newTag={newTag}
        setNewTag={setNewTag}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />
    </motion.div>
  );
};
