import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart3, ChefHat } from 'lucide-react';

const T = {
  surface:    'var(--surface-organic)',
  surfaceHi:  'var(--surface-light)',
  outline:    'var(--outline)',
  outlineSt:  'var(--outline-strong)',
  text:       'var(--brand-text)',
  muted:      'var(--brand-text-muted)',
  primary:    'var(--brand-primary)',
  primary08:  'rgba(0, 255, 194, 0.08)',
  primary15:  'rgba(0, 255, 194, 0.15)',
  neutral10:  'rgba(131, 149, 140, 0.10)',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.outline}`,
  borderRadius: '1.25rem',
  overflow: 'hidden',
};

interface RecentLogsTableProps {
  stats: any;
}

export const RecentLogsTable: React.FC<RecentLogsTableProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <div style={cardStyle}>
      <div className="p-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.outline}` }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: T.neutral10, color: T.outlineSt }}>
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold" style={{ color: T.text }}>
            {t('dashboard.low_conversion')}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: T.muted }}>
            {t('dashboard.low_conversion_subtitle')}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ backgroundColor: T.surfaceHi }}>
              {[
                t('dashboard.table.recipe'),
                t('dashboard.table.views'),
                t('dashboard.table.favorites'),
                t('dashboard.table.conv_ratio'),
                t('dashboard.table.action'),
              ].map((col, i) => (
                <th key={i} className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`} style={{ color: T.muted }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats?.low_conversion_recipes.map((recipe: any) => (
              <tr key={recipe.recipe_id} style={{ borderTop: `1px solid ${T.outline}` }} className="transition-colors hover:bg-surfaceHi">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.primary08, color: T.primary }}>
                      <ChefHat size={16} />
                    </div>
                    <span className="font-semibold" style={{ color: T.text }}>{recipe.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium" style={{ color: T.muted }}>{recipe.views}</td>
                <td className="px-6 py-4 font-medium" style={{ color: T.muted }}>{recipe.favorites}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: T.outline, maxWidth: '6rem' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(recipe.conversionRate * 100, 100)}%`, backgroundColor: T.primary }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: T.primary }}>
                      {(recipe.conversionRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    to={`/recipes?edit=${recipe.recipe_id}`}
                    className="text-xs font-bold transition-all px-3 py-1.5 rounded-lg border"
                    style={{ color: T.primary, backgroundColor: T.primary08, borderColor: T.primary15 }}
                  >
                    {t('dashboard.table.review')}
                  </Link>
                </td>
              </tr>
            ))}
            {stats?.low_conversion_recipes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center italic" style={{ color: T.muted }}>
                  {t('dashboard.table.no_conversion')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
