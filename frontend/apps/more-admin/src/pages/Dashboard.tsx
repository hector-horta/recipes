import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  BarChart3,
  TrendingUp,
  SearchX,
  AlertCircle,
  Cpu,
  ArrowUpRight,
  Clock,
  RefreshCcw,
  ChefHat
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';

interface Stats {
  generated_at: string;
  top_searches: { term: string; count: number | string }[];
  failed_searches: { term: string; count: number | string }[];
  low_conversion_recipes: {
    recipe_id: string;
    title: string;
    views: number;
    favorites: number;
    conversionRate: number;
  }[];
  nvidia: {
    uptime_percent_24h: number | null;
    success_24h: number;
    failures_24h: number;
  };
  ingest_by_day: { day: string; action: string; count: number | string }[];
}

// ─── Design tokens (inline for clarity) ─────────────────────────────────────
const T = {
  surface:    'var(--surface-organic)',   // #1C2024 — card background
  surfaceHi:  'var(--surface-light)',     // #272A2E — elevated rows / inputs
  lowest:     'var(--surface-lowest)',    // #0B0F12 — icon backgrounds
  outline:    'var(--outline)',           // #3A4A43
  outlineSt:  'var(--outline-strong)',    // #83958C
  text:       'var(--brand-text)',        // #E0E2E8
  muted:      'var(--brand-text-muted)', // #B9CBC1
  primary:    'var(--brand-primary)',     // #00FFC2
  primary14:  'rgba(0, 255, 194, 0.14)',
  primary15:  'rgba(0, 255, 194, 0.15)',
  primary20:  'rgba(0, 255, 194, 0.20)',
  primary08:  'rgba(0, 255, 194, 0.08)', // Added primary08
  danger:     'var(--danger)',            // #F87171
  danger08:   'rgba(248, 113, 113, 0.08)',
  danger15:   'rgba(248, 113, 113, 0.15)',
  warning:    'var(--warning)',           // #FFB703
  warning08:  'rgba(255, 183, 3, 0.08)',
  warning15:  'rgba(255, 183, 3, 0.15)',
  success:    'var(--success)',           // #00FFC2
  neutral08:  'rgba(131, 149, 140, 0.08)',
  neutral10:  'rgba(131, 149, 140, 0.10)',
  neutral15:  'rgba(131, 149, 140, 0.15)',
  outline50:  'rgba(58, 74, 67, 0.50)',
  black50:    'rgba(0, 0, 0, 0.50)',
  shadowLg:   '0 12px 48px -12px rgba(0, 0, 0, 0.50)',
} as const;

// ─── Stat variant configs ────────────────────────────────────────────────────
const variantConfig = {
  success: { color: T.primary, bg: T.primary08, border: T.primary15 },
  info:    { color: T.outlineSt, bg: T.neutral08, border: T.neutral15 },
  danger:  { color: T.danger, bg: T.danger08, border: T.danger15 },
  warning: { color: T.warning, bg: T.warning08, border: T.warning15 },
};

// ─── Shared card style ───────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  backgroundColor: T.surface,
  border: `1px solid ${T.outline}`,
  borderRadius: '1.25rem',
  overflow: 'hidden',
};

// ─── Component ───────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get<Stats>('/admin/stats'),
  });

  useEffect(() => {
    logger.info('ADMIN_DASHBOARD_VIEW');
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh]"
        style={{ color: T.muted }}
      >
        <Loader2 className="animate-spin mb-4" size={48} style={{ color: T.primary }} />
        <p className="font-medium animate-pulse">{t('dashboard.loading_stats')}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-12"
    >
      {/* ── Page header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className="text-3xl font-bold"
            style={{ color: T.text }}
          >
            {t('dashboard.title')}
          </h2>
          <p className="mt-1" style={{ color: T.muted }}>
            {t('dashboard.subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            refetch();
            logger.info('ADMIN_DASHBOARD_REFRESH');
          }}
          className="flex items-center gap-2 text-sm font-medium transition-all"
          style={{
            color: T.primary,
            backgroundColor: T.primary08,
            border: `1px solid ${T.primary15}`,
            borderRadius: '0.75rem',
            padding: '0.5rem 1rem',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = T.primary14)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = T.primary08)}
        >
          <RefreshCcw size={16} />
          {t('common.update')}
        </button>
      </div>

      {/* ── Stat cards grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('dashboard.stats.uptime')}
          value={stats?.nvidia.uptime_percent_24h ? `${stats.nvidia.uptime_percent_24h}%` : 'N/A'}
          icon={<Cpu size={22} />}
          description={t('dashboard.stats.last_24h')}
          variant="success"
        />
        <StatCard
          title={t('dashboard.stats.success_ingest')}
          value={stats?.nvidia.success_24h || 0}
          icon={<ArrowUpRight size={22} />}
          description={t('dashboard.stats.today')}
          variant="info"
        />
        <StatCard
          title={t('dashboard.stats.failed_ingest')}
          value={stats?.nvidia.failures_24h || 0}
          icon={<AlertCircle size={22} />}
          description={t('dashboard.stats.today')}
          variant="danger"
        />
        <StatCard
          title={t('dashboard.stats.success_rate')}
          value={stats?.nvidia.uptime_percent_24h ? `${Math.round(stats.nvidia.uptime_percent_24h)}%` : '0%'}
          icon={<TrendingUp size={22} />}
          description={t('dashboard.stats.nvidia_api')}
          variant="warning"
        />
      </div>

      {/* ── Search panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Searches */}
        <div style={cardStyle}>
          <div
            className="flex items-center gap-3 p-6"
            style={{ borderBottom: `1px solid ${T.outline}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: T.primary08, color: T.primary }}
            >
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: T.text }}>
              {t('dashboard.top_searches')}
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {stats?.top_searches.map((search, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: T.surfaceHi }}
              >
                <span className="font-medium capitalize" style={{ color: T.text }}>
                  {search.term || t('common.empty')}
                </span>
                <span
                  className="text-xs font-bold px-3 py-1 rounded-lg"
                  style={{ backgroundColor: T.primary, color: T.lowest }}
                >
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
          <div
            className="flex items-center gap-3 p-6"
            style={{ borderBottom: `1px solid ${T.outline}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: T.danger08, color: T.danger }}
            >
              <SearchX size={20} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: T.text }}>
              {t('dashboard.failed_searches')}
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {stats?.failed_searches.map((search, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ backgroundColor: T.surfaceHi }}
              >
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

      {/* ── Ingest Activity Chart ── */}
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
          <div
            className="flex items-center gap-6 px-4 py-2 rounded-2xl"
            style={{ backgroundColor: T.surfaceHi, border: `1px solid ${T.outline}` }}
          >
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
                  <stop offset="5%"  stopColor={T.primary} stopOpacity={0.25} />
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

      {/* ── Low Conversion Recipes table ── */}
      <div style={cardStyle}>
        <div
          className="p-6 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${T.outline}` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: T.neutral10, color: T.outlineSt }}
          >
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
                  <th
                    key={i}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-widest ${i === 4 ? 'text-right' : ''}`}
                    style={{ color: T.muted }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats?.low_conversion_recipes.map((recipe) => (
                <tr
                  key={recipe.recipe_id}
                  style={{ borderTop: `1px solid ${T.outline}` }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = T.surfaceHi)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent')}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: T.primary08, color: T.primary }}
                      >
                        <ChefHat size={16} />
                      </div>
                      <span className="font-semibold" style={{ color: T.text }}>
                        {recipe.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium" style={{ color: T.muted }}>
                    {recipe.views}
                  </td>
                  <td className="px-6 py-4 font-medium" style={{ color: T.muted }}>
                    {recipe.favorites}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: T.outline, maxWidth: '6rem' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(recipe.conversionRate * 100, 100)}%`,
                            backgroundColor: T.primary,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold" style={{ color: T.primary }}>
                        {(recipe.conversionRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/recipes?edit=${recipe.recipe_id}`}
                      className="text-xs font-bold transition-all px-3 py-1.5 rounded-lg"
                      style={{
                        color: T.primary,
                        backgroundColor: T.primary08,
                        border: `1px solid ${T.primary15}`,
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = T.primary15)}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = T.primary08)}
                    >
                      {t('dashboard.table.review')}
                    </Link>
                  </td>
                </tr>
              ))}
              {stats?.low_conversion_recipes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center italic"
                    style={{ color: T.muted }}
                  >
                    {t('dashboard.table.no_conversion')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// ─── StatCard ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  variant: 'success' | 'danger' | 'info' | 'warning';
}> = ({ title, value, icon, description, variant }) => {
  const v = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      style={{
        backgroundColor: 'var(--surface-organic)',
        border: '1px solid var(--outline)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: v.bg, color: v.color, border: `1px solid ${v.border}` }}
        >
          {icon}
        </div>
        {/* Value */}
        <div className="text-right">
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--brand-text-muted)' }}
          >
            {title}
          </p>
          <p
            className="text-2xl font-black mt-1"
            style={{ color: v.color }}
          >
            {value}
          </p>
        </div>
      </div>
      {/* Footer */}
      <div
        className="pt-4 flex items-center gap-2 text-xs"
        style={{
          borderTop: '1px solid var(--outline)',
          color: 'var(--brand-text-muted)',
        }}
      >
        <Clock size={14} />
        {description}
      </div>
    </motion.div>
  );
};
