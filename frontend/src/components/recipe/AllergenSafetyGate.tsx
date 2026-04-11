import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ShieldOff, Search } from 'lucide-react';

interface AllergenSafetyGateProps {
  searchTerm: string;
  filteredCount: number;
  allergens: string[];
  onOverride: () => void;
  onDismiss: () => void;
}

export function AllergenSafetyGate({
  searchTerm,
  filteredCount,
  allergens,
  onOverride,
  onDismiss
}: AllergenSafetyGateProps) {
  const { t } = useTranslation();

  // Analytics: track gate shown
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('safety_gate_shown', {
        query: searchTerm,
        filteredCount,
        allergens: allergens.join(',')
      });
    }
  }, [searchTerm, filteredCount, allergens]);

  const handleOverride = () => {
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('safety_gate_override', {
        query: searchTerm,
        filteredCount,
        allergens: allergens.join(',')
      });
    }
    onOverride();
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined' && (window as any).umami) {
      (window as any).umami.track('safety_gate_dismissed', {
        query: searchTerm,
        filteredCount,
        allergens: allergens.join(',')
      });
    }
    onDismiss();
  };

  const allergenLabels = allergens
    .map(id => t(`intolerances.${id}`, id))
    .join(', ');

  return (
    <div className="bg-red-50 border border-red-200/40 rounded-3xl p-8 max-w-lg mx-auto text-center animate-in fade-in slide-in-from-bottom-4">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <ShieldAlert className="w-7 h-7 text-red-600" />
      </div>

      <h3 className="text-xl font-bold text-brand-forest mb-3">
        {t('safetyGate.title')}
      </h3>

      <p className="text-brand-text-muted text-sm leading-relaxed mb-6">
        {t('safetyGate.desc', { count: filteredCount, allergens: allergenLabels })}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleOverride}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors text-sm"
        >
          <ShieldOff className="w-4 h-4" />
          {t('safetyGate.overrideButton')}
        </button>

        <button
          onClick={handleDismiss}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-brand-sage/30 text-brand-text-muted font-semibold rounded-xl hover:bg-brand-sage/10 transition-colors text-sm"
        >
          <Search className="w-4 h-4" />
          {t('safetyGate.dismissButton')}
        </button>
      </div>
    </div>
  );
}
