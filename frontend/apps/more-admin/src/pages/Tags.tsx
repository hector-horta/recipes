import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Tag as TagIcon, Search, Plus, Trash2, Pencil, Loader2, ArrowRight, Languages } from 'lucide-react';
import { Modal } from '../components/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

interface Tag {
  id: string;
  key: string;
  es: string;
  en: string;
}

// ─── Design tokens ─────────────────────────────────────────────────────────
const T = {
  dark:      'var(--surface-dark)',
  surface:   'var(--surface-organic)',
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
  primary08: 'rgba(0, 255, 194, 0.08)',
  primary15: 'rgba(0, 255, 194, 0.15)',
  danger:    'var(--danger)',
  danger08:  'rgba(248, 113, 113, 0.08)',
  danger15:  'rgba(248, 113, 113, 0.15)',
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

export const Tags: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState({ key: '', es: '', en: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isFirstRender.current) {
      logger.info('ADMIN_TAGS_VIEW');
      isFirstRender.current = false;
    }
  }, []);

  const { data: tags, isLoading } = useQuery({
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: { key: editingTag.key, es: editingTag.es, en: editingTag.en } });
    } else {
      createMutation.mutate(newTag);
    }
  };

  const filteredTags = tags?.filter(
    (tag) =>
      tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── helpers ──────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    backgroundColor: T.surfaceHi,
    border: `1px solid ${T.outline}`,
    color: T.text,
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">

      {/* ── Header ── */}
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
          style={{ backgroundColor: T.primary, color: T.dark }}
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('tags.create')}</span>
        </motion.button>
      </div>

      {/* ── Table card ── */}
      <motion.div variants={itemVariants} style={cardStyle}>

        {/* Search */}
        <div className="p-6" style={{ borderBottom: `1px solid ${T.outline}` }}>
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: T.muted }} />
            <input
              type="text"
              placeholder={t('tags.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-5 py-3 rounded-xl outline-none font-medium transition-all"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ backgroundColor: T.surfaceHi }}>
                {[t('tags.table.key'), t('tags.table.es'), t('tags.table.en'), t('tags.table.actions')].map((col, i) => (
                  <th
                    key={i}
                    className={`px-8 py-5 text-xs font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`}
                    style={{ color: T.muted }}
                  >
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
                        <td colSpan={4} className="px-8 py-6">
                          <div className="h-12 rounded-2xl w-full" style={{ backgroundColor: T.surfaceHi }} />
                        </td>
                      </tr>
                    ))
                  : filteredTags?.map((tag) => (
                      <motion.tr
                        layout
                        key={tag.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="transition-all group"
                        style={{ borderTop: `1px solid ${T.outline}` }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = T.surfaceHi)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                      >
                        {/* Key */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                              style={{ backgroundColor: T.primary08, color: T.primary }}
                            >
                              <TagIcon size={22} strokeWidth={2.5} />
                            </div>
                            <code
                              className="text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg"
                              style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}
                            >
                              {tag.key}
                            </code>
                          </div>
                        </td>

                        {/* ES */}
                        <td className="px-8 py-6">
                          <span className="font-bold text-lg" style={{ color: T.text }}>{tag.es}</span>
                        </td>

                        {/* EN */}
                        <td className="px-8 py-6">
                          <span className="font-bold text-lg" style={{ color: T.muted }}>{tag.en}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => { setEditingTag(tag); setIsModalOpen(true); }}
                              className="p-3 rounded-xl transition-all"
                              style={{ backgroundColor: T.primary08, color: T.primary, border: `1px solid ${T.primary15}` }}
                              title={t('common.edit')}
                            >
                              <Pencil size={18} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => {
                                if (confirm(t('tags.messages.confirm_delete'))) {
                                  deleteMutation.mutate(tag.id);
                                }
                              }}
                              className="p-3 rounded-xl transition-all"
                              style={{ backgroundColor: T.danger08, color: T.danger, border: `1px solid ${T.danger15}` }}
                              title={t('common.delete')}
                            >
                              <Trash2 size={18} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
              </AnimatePresence>

              {!isLoading && filteredTags?.length === 0 && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: T.surfaceHi, color: T.muted }}
                      >
                        <TagIcon size={32} />
                      </div>
                      <p className="font-bold" style={{ color: T.muted }}>{t('tags.table.no_tags')}</p>
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
        onClose={() => { setIsModalOpen(false); setEditingTag(null); }}
        title={editingTag ? t('tags.modal.update_title') : t('tags.modal.create_title')}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-6">

          {/* Key */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: T.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: T.primary }} />
              {t('tags.modal.key_label')}
            </label>
            <input
              type="text"
              placeholder={t('tags.modal.key_placeholder')}
              className="w-full h-14 rounded-2xl px-5 outline-none font-mono lowercase text-lg transition-all"
              style={inputStyle}
              value={editingTag ? editingTag.key : newTag.key}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                if (editingTag) setEditingTag({ ...editingTag, key: val });
                else setNewTag({ ...newTag, key: val });
              }}
              required
              disabled={!!editingTag}
            />
            {!editingTag && (
              <p className="text-[11px] font-medium italic pl-1" style={{ color: T.muted }}>
                {t('tags.modal.immutable_hint')}
              </p>
            )}
          </div>

          {/* ES / EN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-black uppercase tracking-widest" style={{ color: T.text }}>
                {t('tags.modal.es_label')}
              </label>
              <input
                type="text"
                placeholder={t('tags.modal.es_placeholder')}
                className="w-full h-14 rounded-2xl px-5 outline-none font-bold text-lg transition-all"
                style={inputStyle}
                value={editingTag ? editingTag.es : newTag.es}
                onChange={(e) => {
                  if (editingTag) setEditingTag({ ...editingTag, es: e.target.value });
                  else setNewTag({ ...newTag, es: e.target.value });
                }}
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-black uppercase tracking-widest" style={{ color: T.text }}>
                {t('tags.modal.en_label')}
              </label>
              <input
                type="text"
                placeholder={t('tags.modal.en_placeholder')}
                className="w-full h-14 rounded-2xl px-5 outline-none font-bold text-lg transition-all"
                style={inputStyle}
                value={editingTag ? editingTag.en : newTag.en}
                onChange={(e) => {
                  if (editingTag) setEditingTag({ ...editingTag, en: e.target.value });
                  else setNewTag({ ...newTag, en: e.target.value });
                }}
                required
              />
            </div>
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
                  <span>{editingTag ? t('tags.modal.submit_update') : t('tags.modal.submit_create')}</span>
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
