import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Cpu, ArrowUpRight, AlertCircle, TrendingUp, RefreshCcw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { logger } from '../utils/logger';
import { StatCard } from '../components/dashboard/StatCard';
import { SearchPanels } from '../components/dashboard/SearchPanels';
import { PerformancePanels } from '../components/dashboard/PerformancePanels';
import { RecentLogsTable } from '../components/dashboard/RecentLogsTable';

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

const T = {
  muted:      'var(--brand-text-muted)',
  primary:    'var(--brand-primary)',
  primary08:  'rgba(0, 255, 194, 0.08)',
  primary15:  'rgba(0, 255, 194, 0.15)',
  text:       'var(--brand-text)',
} as const;

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
      <div className="flex flex-col items-center justify-center min-h-[60vh]" style={{ color: T.muted }}>
        <Loader2 className="animate-spin mb-4" size={48} style={{ color: T.primary }} />
        <p className="font-medium animate-pulse">{t('dashboard.loading_stats')}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: T.text }}>{t('dashboard.title')}</h2>
          <p className="mt-1" style={{ color: T.muted }}>{t('dashboard.subtitle')}</p>
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
        >
          <RefreshCcw size={16} />
          {t('common.update')}
        </button>
      </div>

      {/* KPI Cards Grid */}
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

      <SearchPanels stats={stats} />

      <PerformancePanels stats={stats} />

      <RecentLogsTable stats={stats} />
    </motion.div>
  );
};
