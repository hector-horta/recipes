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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-brand-text-muted">
        <Loader2 className="animate-spin mb-4" size={48} />
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
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-brand-forest">{t('dashboard.title')}</h2>
          <p className="text-brand-text-muted mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <button 
          onClick={() => {
            refetch();
            logger.info('ADMIN_DASHBOARD_REFRESH');
          }}
          className="flex items-center gap-2 text-brand-sage bg-brand-sage/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-sage/20 transition-all"
        >
          <RefreshCcw size={16} />
          {t('common.update')}
        </button>
      </div>

      {/* Grid de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={t('dashboard.stats.uptime')}
          value={stats?.nvidia.uptime_percent_24h ? `${stats.nvidia.uptime_percent_24h}%` : 'N/A'}
          icon={<Cpu size={24} />}
          description={t('dashboard.stats.last_24h')}
          variant="success"
        />
        <StatCard 
          title={t('dashboard.stats.success_ingest')}
          value={stats?.nvidia.success_24h || 0}
          icon={<ArrowUpRight size={24} />}
          description={t('dashboard.stats.today')}
          variant="info"
        />
        <StatCard 
          title={t('dashboard.stats.failed_ingest')}
          value={stats?.nvidia.failures_24h || 0}
          icon={<AlertCircle size={24} />}
          description={t('dashboard.stats.today')}
          variant="danger"
        />
        <StatCard 
          title={t('dashboard.stats.success_rate')}
          value={stats?.nvidia.uptime_percent_24h ? `${Math.round(stats.nvidia.uptime_percent_24h)}%` : '0%'}
          icon={<TrendingUp size={24} />}
          description={t('dashboard.stats.nvidia_api')}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Searches */}
        <div className="bg-white rounded-3xl shadow-xl shadow-brand-forest/5 border border-brand-sage/10 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-sage/10 text-brand-sage flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-xl font-bold text-brand-forest">{t('dashboard.top_searches')}</h3>
          </div>
          <div className="space-y-3">
            {stats?.top_searches.map((search, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-brand-cream/30 rounded-xl">
                <span className="font-medium text-brand-text capitalize">{search.term || t('common.empty')}</span>
                <span className="bg-brand-sage text-white px-3 py-1 rounded-lg text-xs font-bold">
                  {search.count} {t('common.searches')}
                </span>
              </div>
            ))}
            {stats?.top_searches.length === 0 && (
              <p className="text-center text-brand-text-muted py-8 italic">{t('dashboard.no_data')}</p>
            )}
          </div>
        </div>

        {/* Failed Searches */}
        <div className="bg-white rounded-3xl shadow-xl shadow-brand-forest/5 border border-brand-sage/10 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-400 flex items-center justify-center">
              <SearchX size={20} />
            </div>
            <h3 className="text-xl font-bold text-brand-forest">{t('dashboard.failed_searches')}</h3>
          </div>
          <div className="space-y-3">
            {stats?.failed_searches.map((search, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl">
                <span className="font-medium text-red-900 capitalize">{search.term || t('common.empty')}</span>
                <span className="text-red-400 text-xs font-bold">
                  {search.count} {t('dashboard.stats.today')}
                </span>
              </div>
            ))}
            {stats?.failed_searches.length === 0 && (
              <p className="text-center text-brand-text-muted py-8 italic">{t('dashboard.congratulations')}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Ingest Activity Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-brand-forest/5 border border-brand-sage/10 p-8 space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart3 size={120} strokeWidth={1} className="text-brand-forest" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-forest text-white flex items-center justify-center shadow-lg shadow-brand-forest/20">
              <BarChart3 size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-brand-forest tracking-tight">{t('dashboard.ingest_activity')}</h3>
              <p className="text-sm text-brand-text-muted font-medium">{t('dashboard.ingest_subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 bg-brand-cream/50 p-2 rounded-2xl px-4 border border-brand-sage/10">
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-sage shadow-sm shadow-brand-sage/50" />
                <span className="text-xs font-bold text-brand-forest uppercase tracking-wider">{t('dashboard.legend_success')}</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm shadow-red-400/50" />
                <span className="text-xs font-bold text-brand-forest uppercase tracking-wider">{t('dashboard.legend_failure')}</span>
             </div>
          </div>
        </div>
        
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.ingest_by_day || []}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a6741" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4a6741" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '24px', 
                  border: '1px solid rgba(74, 103, 65, 0.1)', 
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                  padding: '16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ color: '#4a6741', fontWeight: 'bold' }}
                labelStyle={{ color: '#1a2e1a', fontWeight: '900', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#4a6741" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorCount)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Low Conversion Recipes */}
      <div className="bg-white rounded-3xl shadow-xl shadow-brand-forest/5 border border-brand-sage/10 overflow-hidden">
        <div className="p-6 border-b border-brand-sage/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-forest/10 text-brand-forest flex items-center justify-center">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-brand-forest">{t('dashboard.low_conversion')}</h3>
            <p className="text-xs text-brand-text-muted mt-1">{t('dashboard.low_conversion_subtitle')}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-cream/30">
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">{t('dashboard.table.recipe')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">{t('dashboard.table.views')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">{t('dashboard.table.favorites')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest">{t('dashboard.table.conv_ratio')}</th>
                <th className="px-6 py-4 text-sm font-semibold text-brand-forest text-right">{t('dashboard.table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-sage/5">
              {stats?.low_conversion_recipes.map((recipe) => (
                <tr key={recipe.recipe_id} className="hover:bg-brand-cream/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-sage/10 flex items-center justify-center text-brand-sage">
                        <ChefHat size={16} />
                      </div>
                      <span className="font-semibold text-brand-text">{recipe.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-brand-text-muted">{recipe.views}</td>
                  <td className="px-6 py-4 font-medium text-brand-text-muted">{recipe.favorites}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-brand-cream rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-brand-forest" 
                          style={{ width: `${Math.min(recipe.conversionRate * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-brand-forest">{(recipe.conversionRate * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/recipes?edit=${recipe.recipe_id}`}
                      className="text-xs font-bold text-brand-sage hover:underline bg-brand-sage/5 px-3 py-1.5 rounded-lg transition-all hover:bg-brand-sage/10"
                    >
                      {t('dashboard.table.review')}
                    </Link>
                  </td>
                </tr>
              ))}
              {stats?.low_conversion_recipes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-brand-text-muted italic">
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

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  description: string;
  variant: 'success' | 'danger' | 'info' | 'warning';
}> = ({ title, value, icon, description, variant }) => {
  const styles = {
    success: 'bg-green-50 text-green-600 border-green-100',
    danger: 'bg-red-50 text-red-600 border-red-100',
    info: 'bg-brand-sage/10 text-brand-sage border-brand-sage/20',
    warning: 'bg-brand-cream text-brand-forest border-brand-sage/10'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-3xl border shadow-lg shadow-black/5 bg-white space-y-4`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles[variant].split(' ')[0]} ${styles[variant].split(' ')[1]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-brand-forest mt-1">{value}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-brand-sage/5 flex items-center gap-2 text-xs text-brand-text-muted">
        <Clock size={14} />
        {description}
      </div>
    </motion.div>
  );
};
