import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../Modal';
import type { Tag } from '../../hooks/useTagOperations';

const T = {
  surfaceHi: 'var(--surface-light)',
  outline:   'var(--outline)',
  text:      'var(--brand-text)',
  muted:     'var(--brand-text-muted)',
  primary:   'var(--brand-primary)',
} as const;

const inputStyle: React.CSSProperties = {
  backgroundColor: T.surfaceHi,
  border: `1px solid ${T.outline}`,
  color: T.text,
};

interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTag: Tag | null;
  setEditingTag: React.Dispatch<React.SetStateAction<Tag | null>>;
  newTag: { key: string; es: string; en: string };
  setNewTag: React.Dispatch<React.SetStateAction<{ key: string; es: string; en: string }>>;
  createMutation: any;
  updateMutation: any;
}

export const TagFormModal: React.FC<TagFormModalProps> = ({
  isOpen,
  onClose,
  editingTag,
  setEditingTag,
  newTag,
  setNewTag,
  createMutation,
  updateMutation
}) => {
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
    setEditingTag(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      updateMutation.mutate({ id: editingTag.id, data: { key: editingTag.key, es: editingTag.es, en: editingTag.en } });
    } else {
      createMutation.mutate(newTag);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
            style={{ backgroundColor: T.primary, color: 'var(--surface-dark)' }}
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
  );
};
