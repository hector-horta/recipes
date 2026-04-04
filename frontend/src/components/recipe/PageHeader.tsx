
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

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
          <Input 
            variant="light"
            type="text"
            placeholder={t('home.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
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
      
      <Button 
        variant="secondary"
        onClick={onRefresh}
        disabled={isRefreshing}
        isLoading={isRefreshing}
        leftIcon={!isRefreshing && <RefreshCw className="w-4 h-4" />}
        className="shadow-sm"
      >
        {t('common.update')}
      </Button>
    </div>
  );
}
