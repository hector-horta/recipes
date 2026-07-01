import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon, Search, Pencil, Trash2 } from 'lucide-react';
import type { Tag } from '../../hooks/useTagOperations';

const T = {
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

const inputStyle: React.CSSProperties = {
  backgroundColor: T.surfaceHi,
  border: `1px solid ${T.outline}`,
  color: T.text,
};

interface TagTableProps {
  tags: Tag[] | undefined;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setEditingTag: (tag: Tag) => void;
  setIsModalOpen: (open: boolean) => void;
  deleteMutation: any;
}

export const TagTable: React.FC<TagTableProps> = ({
  tags,
  isLoading,
  searchTerm,
  setSearchTerm,
  setEditingTag,
  setIsModalOpen,
  deleteMutation
}) => {
  const { t } = useTranslation();

  const filteredTags = tags?.filter(
    (tag) =>
      tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.es.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={cardStyle}>
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
                <th key={i} className={`px-8 py-5 text-xs font-bold uppercase tracking-widest ${i === 3 ? 'text-right' : ''}`} style={{ color: T.muted }}>
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
                    >
                      {/* Key */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: T.primary08, color: T.primary }}>
                            <TagIcon size={22} strokeWidth={2.5} />
                          </div>
                          <code className="text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg" style={{ color: T.primary, backgroundColor: T.primary08, border: `1px solid ${T.primary15}` }}>
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
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: T.surfaceHi, color: T.muted }}>
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
    </div>
  );
};
