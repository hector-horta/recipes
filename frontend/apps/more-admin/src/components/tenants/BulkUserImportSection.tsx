import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Upload, Loader2, FileSpreadsheet, ArrowRight } from 'lucide-react';

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
  warning:   'var(--warning)',
  warning12: 'rgba(255, 183, 3, 0.12)',
} as const;

interface BulkUserImportSectionProps {
  file: File | null;
  parsedUsers: Array<any>;
  parseError: string | null;
  isParsing: boolean;
  dragActive: boolean;
  handleCSVFile: (file: File) => void;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  bulkUploadMutation: any;
}

export const BulkUserImportSection: React.FC<BulkUserImportSectionProps> = ({
  file,
  parsedUsers,
  parseError,
  isParsing,
  dragActive,
  handleCSVFile,
  handleDrag,
  handleDrop,
  bulkUploadMutation
}) => {
  const { t } = useTranslation();

  return (
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
  );
};
