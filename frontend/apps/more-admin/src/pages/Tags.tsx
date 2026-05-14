import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Tag as TagIcon, Search, Plus, Trash2, Pencil, Loader2, ArrowRight, Languages } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Button, Input } from '@wati/ui-kit';
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

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
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
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof newTag }) => 
      api.put(`/admin/tags/${id}`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['global-tags'] });
      setEditingTag(null);
      setIsModalOpen(false);
      toast.success(t('tags.messages.update_success'));
      logger.info('ADMIN_TAG_UPDATE', { tagId: id, key: data.key });
    },
    onError: (error: any) => {
      logger.error('ADMIN_TAG_UPDATE_FAIL', error);
      toast.error(error?.message || t('common.error_generic'));
    }
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
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateMutation.mutate({ 
        id: editingTag.id, 
        data: { key: editingTag.key, es: editingTag.es, en: editingTag.en } 
      });
    } else {
      createMutation.mutate(newTag);
    }
  };

  const filteredTags = tags?.filter(tag => 
    tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-forest/10 text-brand-forest rounded-lg">
              <Languages size={24} />
            </div>
            <h2 className="text-4xl font-extrabold text-brand-forest tracking-tight">{t('tags.title')}</h2>
          </div>
          <p className="text-brand-text-muted font-medium">{t('tags.subtitle')}</p>
        </motion.div>
        
        <motion.button 
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingTag(null);
            setNewTag({ key: '', es: '', en: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-brand-forest text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-brand-forest/30 transition-all group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>{t('tags.create')}</span>
        </motion.button>
      </div>

      {/* Main Content Table */}
      <motion.div 
        variants={itemVariants}
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-brand-forest/5 border border-brand-sage/20 overflow-hidden"
      >
        <div className="p-8 border-b border-brand-sage/10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-text-muted/60" size={20} />
            <input
              type="text"
              placeholder={t('tags.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-brand-cream/40 border-2 border-transparent focus:border-brand-sage/30 rounded-2xl outline-none transition-all placeholder:text-brand-text-muted/40 text-brand-forest font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream/20">
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('tags.table.key')}</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('tags.table.es')}</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest">{t('tags.table.en')}</th>
                <th className="px-8 py-5 text-xs font-bold text-brand-forest uppercase tracking-widest text-right">{t('tags.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sage/10">
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`loading-${i}`} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6">
                        <div className="h-12 bg-brand-cream/60 rounded-2xl w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredTags?.map((tag) => (
                  <motion.tr 
                    layout
                    key={tag.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="hover:bg-brand-cream/30 transition-all group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-sage/15 text-brand-sage flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
                           <TagIcon size={22} strokeWidth={2.5} />
                        </div>
                        <code className="text-[11px] font-bold font-mono text-brand-teal bg-brand-teal/10 px-3 py-1.5 rounded-lg border border-brand-teal/20">
                          {tag.key}
                        </code>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-bold text-brand-forest text-lg">{tag.es}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-bold text-brand-text-muted text-lg">{tag.en}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            setEditingTag(tag);
                            setIsModalOpen(true);
                          }}
                          className="p-3 bg-brand-sage/10 text-brand-sage hover:bg-brand-sage hover:text-white rounded-xl transition-all shadow-sm"
                          title={t('common.edit')}
                        >
                          <Pencil size={18} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if (confirm(t('tags.messages.confirm_delete'))) {
                              deleteMutation.mutate(tag.id);
                            }
                          }}
                          className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
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
                      <div className="w-16 h-16 bg-brand-cream/50 rounded-full flex items-center justify-center text-brand-text-muted/30">
                        <TagIcon size={32} />
                      </div>
                      <p className="text-brand-text-muted font-bold">{t('tags.table.no_tags')}</p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTag(null);
        }}
        title={editingTag ? t('tags.modal.update_title') : t('tags.modal.create_title')}
      >
        <form onSubmit={handleSubmit} className="p-2 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-brand-teal rounded-full" />
              {t('tags.modal.key_label')}
            </label>
            <Input
              placeholder={t('tags.modal.key_placeholder')}
              className="h-14 rounded-2xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all text-lg font-mono lowercase"
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
              <p className="text-[11px] text-brand-text-muted font-medium italic pl-1">
                {t('tags.modal.immutable_hint')}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                {t('tags.modal.es_label')}
              </label>
              <Input
                placeholder={t('tags.modal.es_placeholder')}
                className="h-14 rounded-2xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all text-lg font-bold"
                value={editingTag ? editingTag.es : newTag.es}
                onChange={(e) => {
                  if (editingTag) setEditingTag({ ...editingTag, es: e.target.value });
                  else setNewTag({ ...newTag, es: e.target.value });
                }}
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-sm font-black text-brand-forest uppercase tracking-widest flex items-center gap-2">
                {t('tags.modal.en_label')}
              </label>
              <Input
                placeholder={t('tags.modal.en_placeholder')}
                className="h-14 rounded-2xl border-2 border-brand-sage/10 focus:border-brand-sage/40 transition-all text-lg font-bold"
                value={editingTag ? editingTag.en : newTag.en}
                onChange={(e) => {
                  if (editingTag) setEditingTag({ ...editingTag, en: e.target.value });
                  else setNewTag({ ...newTag, en: e.target.value });
                }}
                required
              />
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4"
          >
            <Button 
              type="submit" 
              className="w-full h-16 rounded-[1.25rem] text-lg font-black tracking-tight shadow-xl shadow-brand-forest/20 flex items-center justify-center gap-3"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <span>{editingTag ? t('tags.modal.submit_update') : t('tags.modal.submit_create')}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </Button>
          </motion.div>
        </form>
      </Modal>
    </motion.div>
  );
};
