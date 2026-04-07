import { useTranslation } from 'react-i18next';
import { ChefHat, CheckCircle, Loader2, Home } from 'lucide-react';
import { useSearchFeedback } from '../../hooks/useSearchFeedback';
import { useAuth } from '../../AuthContext';

interface SearchFeedbackProps {
  searchTerm: string;
  onGoHome: () => void;
}

export function SearchFeedback({ searchTerm, onGoHome }: SearchFeedbackProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSubmitting, submitted, error, suggestToChef } = useSearchFeedback();

  const handleGoHome = () => {
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('suggest_back_to_home', { term: searchTerm });
    }
    onGoHome();
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('suggest_dismiss', { term: searchTerm });
    }
    onGoHome();
  };

  if (submitted) {
    return (
      <div className="bg-brand-mint/10 border border-brand-mint/30 rounded-3xl p-8 max-w-md mx-auto text-center animate-in fade-in zoom-in">
        <CheckCircle className="w-12 h-12 text-brand-mint mx-auto mb-4" />
        <h3 className="text-lg font-bold text-brand-forest mb-2">
          {t('searchFeedback.submittedTitle')}
        </h3>
        <p className="text-brand-text-muted text-sm mb-6">
          {t('searchFeedback.submittedDesc', { term: searchTerm })}
        </p>
        <button
          onClick={handleGoHome}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-forest text-white font-semibold rounded-xl hover:bg-brand-forest/90 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          {t('searchFeedback.backToHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-brand-sage/10 border border-brand-sage/20 rounded-3xl p-8 max-w-lg mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
      <ChefHat className="w-14 h-14 text-brand-teal mx-auto mb-5" />

      <h3 className="text-xl font-bold text-brand-forest mb-3">
        {t('searchFeedback.title')}
      </h3>

      <p className="text-brand-text-muted text-sm leading-relaxed mb-6">
        {t('searchFeedback.desc', { term: searchTerm })}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => suggestToChef(searchTerm, user?.id)}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-forest text-white font-semibold rounded-xl hover:bg-brand-forest/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('searchFeedback.submitting')}
            </>
          ) : (
            <>
              <ChefHat className="w-4 h-4" />
              {t('searchFeedback.suggestButton')}
            </>
          )}
        </button>

        <button
          onClick={handleDismiss}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-sage/30 text-brand-text-muted font-semibold rounded-xl hover:bg-brand-sage/10 transition-colors text-sm"
        >
          <Home className="w-4 h-4" />
          {t('searchFeedback.dismissButton')}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-xs font-medium mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
