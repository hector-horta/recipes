
import { useTranslation } from 'react-i18next';
import { Search, AlertCircle, Globe, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AuthGuard } from '../auth/AuthGuard';



interface PageHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSearchActive: boolean;
  hasFavorites: boolean;
  isQuotaExhausted: boolean;
  showLoader: boolean;
  isRefreshing: boolean;
  isSearching: boolean;
  onRefresh: () => void;
  onOpenLogin: () => void;
}

export function PageHeader({
  searchQuery,
  setSearchQuery,
  isSearchActive,
  hasFavorites,
  isQuotaExhausted,
  showLoader,
  isRefreshing,
  isSearching,
  onRefresh,
  onOpenLogin
}: PageHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <>
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
        
        {/* Guarded Search & Status Section */}
        <AuthGuard fallback={null}>
          {/* Search Bar */}
          <div className="relative max-w-md w-full mt-6 group">
            <label htmlFor="search-input" className="sr-only">
              {t('home.searchPlaceholder')}
            </label>
            <Input 
              id="search-input"
              className="search-input"
              aria-label={t('home.searchPlaceholder')}
              variant="light"
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            />
            


            {isSearching && (
              <span className="absolute right-3 top-5 -translate-y-1/2 text-xs text-brand-teal/70 font-medium">
                {t('common.searching')}
              </span>
            )}
          </div>


          {isQuotaExhausted && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-[10px] font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('home.quotaWarning')}
            </div>
          )}

          {/* Status Indicator (Online Search) */}
          {showLoader && !isSearching && (
            <div className="mt-4 flex items-center gap-2.5 text-brand-teal/80 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-pulse">
              <Globe className="w-3.5 h-3.5 animate-[spin_3s_linear_infinite]" />
              <span>{t('common.searching')}</span>
            </div>
          )}
        </AuthGuard>
      </div>
      
      <AuthGuard>
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
      </AuthGuard>
      </div>

      {!user && (
        <div className="w-full bg-gradient-to-r from-brand-forest/5 to-brand-mint/10 border border-brand-sage/20 rounded-3xl py-8 px-6 sm:px-10 mb-12 shadow-sm animate-fade-in">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div className="flex-1 max-w-3xl">
              <h3 className="font-black text-brand-forest flex flex-col md:flex-row items-center md:justify-start gap-3 text-xl sm:text-2xl mb-4">
                <Sparkles className="w-6 h-6 text-brand-teal" />
                {t('home.ctaTitle')}
              </h3>
              <p className="text-brand-text-muted font-medium text-base sm:text-lg leading-relaxed">
                {t('home.ctaDesc')}
              </p>
            </div>
            <Button size="lg" variant="primary" onClick={onOpenLogin} className="shrink-0 w-full md:w-auto shadow-xl hover-lift font-bold tracking-wide">
              {t('home.ctaButton')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
