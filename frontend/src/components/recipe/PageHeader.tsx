
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import { useAuth } from '../../AuthContext';

interface PageHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSearchActive: boolean;
  hasFavorites: boolean;
  isQuotaExhausted: boolean;
  showLoader: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function PageHeader({
  searchQuery,
  setSearchQuery,
  isSearchActive,
  hasFavorites,
  isQuotaExhausted,
  showLoader,
  isRefreshing,
  onRefresh
}: PageHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
      <div className="text-center sm:text-left">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-forest tracking-tight mb-4">
          {user ? t('home.greeting', { name: user.displayName.split(' ')[0] }) : t('home.defaultGreeting')}
        </h1>
        <p className="text-brand-text-muted font-medium">
          {isSearchActive 
            ? t('home.searchResults', { query: searchQuery })
            : hasFavorites 
              ? t('home.hasFavorites')
              : t('home.noFavorites')}
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-md w-full mt-6 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted group-focus-within:text-brand-teal transition-colors" />
          <input 
            type="text"
            placeholder={t('home.searchPlaceholder')}
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-brand-sage/20 rounded-2xl text-sm text-brand-forest placeholder:text-brand-text-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isQuotaExhausted && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('home.quotaWarning')}
          </div>
        )}

        {/* Status Indicator (Online Search) */}
        {showLoader && (
          <div className="mt-4 flex items-center gap-2.5 text-brand-teal/80 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">
            <Globe className="w-3.5 h-3.5 animate-[spin_3s_linear_infinite]" />
            <span>{t('common.searching')}</span>
          </div>
        )}
      </div>
      
      <button 
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-brand-sage/20 text-brand-forest font-bold text-sm hover:bg-brand-sage/5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {t('common.update')}
      </button>
    </div>
  );
}
