import { useTranslation } from 'react-i18next';
import { ChefHat, ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { useSearchFeedback } from '../../hooks/useSearchFeedback';
import { useAuth } from '../../AuthContext';

interface SearchFeedbackProps {
  searchTerm: string;
}

export function SearchFeedback({ searchTerm }: SearchFeedbackProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isSubmitting, submitted, error, suggestToChef } = useSearchFeedback();

  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' recipe')}`;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="bg-brand-mint/10 border border-brand-mint/30 rounded-3xl p-8 max-w-md text-center animate-in fade-in zoom-in">
          <CheckCircle className="w-12 h-12 text-brand-mint mx-auto mb-4" />
          <h3 className="text-lg font-bold text-brand-forest mb-2">
            {t('searchFeedback.submittedTitle')}
          </h3>
          <p className="text-brand-text-muted text-sm">
            {t('searchFeedback.submittedDesc', { term: searchTerm })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="bg-brand-sage/10 border border-brand-sage/20 rounded-3xl p-8 max-w-lg text-center animate-in fade-in slide-in-from-bottom-4">
        <ChefHat className="w-14 h-14 text-brand-teal mx-auto mb-5" />

        <h3 className="text-xl font-bold text-brand-forest mb-3">
          {t('searchFeedback.title')}
        </h3>

        <p className="text-brand-text-muted text-sm leading-relaxed mb-6">
          {t('searchFeedback.desc', { term: searchTerm })}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-5">
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

          <a
            href={googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-sage/30 text-brand-forest font-semibold rounded-xl hover:bg-brand-sage/10 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            {t('searchFeedback.googleButton')}
          </a>
        </div>

        {error && (
          <p className="text-red-500 text-xs font-medium mt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
