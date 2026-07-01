import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, SearchX } from 'lucide-react';

const T = {
  surface:    'var(--surface-organic)',
  surfaceHi:  'var(--surface-light)',
  lowest:     'var(--surface-lowest)',
  outline:    'var(--outline)',
  text:       'var(--brand-text)',
  muted:      'var(--brand-text-muted)',
  primary:    'var(--brand-primary)',
  primary08:  'rgba(0, 255, 194, 0.08)',
  danger:     'var(--danger)',
  danger08:   'rgba(248, 113, 113, 0.08)',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.outline}`,
  borderRadius: '1.25rem',
  overflow: 'hidden',
};

interface SearchPanelsProps {
  stats: any;
}

export const SearchPanels: React.FC<SearchPanelsProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Top Searches */}
      <div style={cardStyle}>
        <div className="flex items-center gap-3 p-6" style={{ borderBottom: `1px solid ${T.outline}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.primary08, color: T.primary }}>
            <TrendingUp size={20} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: T.text }}>
            {t('dashboard.top_searches')}
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {stats?.top_searches.map((search: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: T.surfaceHi }}>
              <span className="font-medium capitalize" style={{ color: T.text }}>
                {search.term || t('common.empty')}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-lg" style={{ backgroundColor: T.primary, color: T.lowest }}>
                {search.count} {t('common.searches')}
              </span>
            </div>
          ))}
          {stats?.top_searches.length === 0 && (
            <p className="text-center py-8 italic" style={{ color: T.muted }}>
              {t('dashboard.no_data')}
            </p>
          )}
        </div>
      </div>

      {/* Failed Searches */}
      <div style={cardStyle}>
        <div className="flex items-center gap-3 p-6" style={{ borderBottom: `1px solid ${T.outline}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.danger08, color: T.danger }}>
            <SearchX size={20} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: T.text }}>
            {t('dashboard.failed_searches')}
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {stats?.failed_searches.map((search: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: T.surfaceHi }}>
              <span className="font-medium capitalize" style={{ color: T.text }}>
                {search.term || t('common.empty')}
              </span>
              <span className="text-xs font-bold" style={{ color: T.danger }}>
                {search.count} {t('dashboard.stats.today')}
              </span>
            </div>
          ))}
          {stats?.failed_searches.length === 0 && (
            <p className="text-center py-8 italic" style={{ color: T.muted }}>
              {t('dashboard.congratulations')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
