import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const T = {
  surface:    'var(--surface-organic)',
  surfaceHi:  'var(--surface-light)',
  lowest:     'var(--surface-lowest)',
  outline:    'var(--outline)',
  outlineSt:  'var(--outline-strong)',
  text:       'var(--brand-text)',
  muted:      'var(--brand-text-muted)',
  primary:    'var(--brand-primary)',
  primary15:  'rgba(0, 255, 194, 0.15)',
  primary20:  'rgba(0, 255, 194, 0.20)',
  danger:     'var(--danger)',
  outline50:  'rgba(58, 74, 67, 0.50)',
  shadowLg:   '0 12px 48px -12px rgba(0, 0, 0, 0.50)',
} as const;

const cardStyle: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.outline}`,
  borderRadius: '1.25rem',
  overflow: 'hidden',
};

interface PerformancePanelsProps {
  stats: any;
}

export const PerformancePanels: React.FC<PerformancePanelsProps> = ({ stats }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      style={{
        ...cardStyle,
        borderRadius: '1.5rem',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Watermark icon */}
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', opacity: 0.04 }}>
        <BarChart3 size={120} strokeWidth={1} style={{ color: T.primary }} />
      </div>

      {/* Chart header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: T.lowest, color: T.primary, border: `1px solid ${T.outline}`, boxShadow: `0 0 20px ${T.primary15}` }}
          >
            <BarChart3 size={26} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: T.text }}>
              {t('dashboard.ingest_activity')}
            </h3>
            <p className="text-sm font-medium" style={{ color: T.muted }}>
              {t('dashboard.ingest_subtitle')}
            </p>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-6 px-4 py-2 rounded-2xl" style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: T.primary }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
              {t('dashboard.legend_success')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: T.danger }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.muted }}>
              {t('dashboard.legend_failure')}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={stats?.ingest_by_day || []}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.primary} stopOpacity={0.25} />
                <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.outline50} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: T.outlineSt, fontSize: 11, fontWeight: 600 }}
              dy={15}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: T.muted, fontSize: 11, fontWeight: 600 }}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: T.surface,
                border: `1px solid ${T.outline}`,
                borderRadius: '1rem',
                boxShadow: T.shadowLg,
                padding: '0.75rem 1rem',
                backdropFilter: 'blur(10px)',
              }}
              itemStyle={{ color: T.primary, fontWeight: 700 }}
              labelStyle={{ color: T.text, fontWeight: 900, marginBottom: '4px' }}
              cursor={{ stroke: T.primary20, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={T.primary}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorCount)"
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
