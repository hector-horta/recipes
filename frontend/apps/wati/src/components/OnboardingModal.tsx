import { useOnboardingState } from '../hooks/useOnboardingState';
import { IntoleranceSelectionStep } from './onboarding/steps/IntoleranceSelectionStep';
import { SeveritySelectionStep } from './onboarding/steps/SeveritySelectionStep';
import { WatiLogo } from './WatiLogo';
import { Button } from '@wati/ui-kit';
import { X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { t } = useTranslation();
  const {
    catalog,
    isLoading,
    isError,
    refetch,
    selectedIds,
    severities,
    setSeverities,
    step,
    setStep,
    isSaving,
    error,
    toggleIntolerance,
    handleNext,
    handleSave
  } = useOnboardingState({ onSaveSuccess: onClose });

  const handleSeverityChange = (id: string, severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic') => {
    setSeverities(prev => ({ ...prev, [id]: severity }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-brand-forest/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] rounded-3xl border border-white/5 shadow-2xl flex flex-col glass-organic"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 hover:bg-white/10 text-white/40 hover:text-white bg-white/5"
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Header */}
        <div className="pt-8 pb-4 px-8 text-center shrink-0">
          <div className="inline-flex items-center justify-center mb-2">
            <WatiLogo size={180} variant="white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {step === 'select' ? t('onboarding.whatToProtect') : t('onboarding.sensitivityLevel')}
          </h2>
          <p className="text-white/70 text-xs mt-1 font-medium italic">
            {step === 'select'
              ? t('onboarding.selectForYou')
              : t('onboarding.adjustForRecipes')}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 pb-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{t('onboarding.loadingCatalog')}</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-red-400 text-xs font-bold">{t('common.error')}</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60">
                {t('common.retry')}
              </Button>
            </div>
          ) : step === 'select' ? (
            <IntoleranceSelectionStep
              catalog={catalog}
              selectedIds={selectedIds}
              toggleIntolerance={toggleIntolerance}
              theme="mint"
            />
          ) : (
            <SeveritySelectionStep
              catalog={catalog}
              selectedIds={selectedIds}
              severities={severities}
              onSeverityChange={handleSeverityChange}
              theme="mint"
            />
          )}
          {error && (
            <p className="text-red-400 text-[10px] font-bold text-center mt-4">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 flex gap-3 shrink-0 border-t border-white/5">
          {step === 'severity' && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setStep('select')}
              className="flex-1 text-white/60 bg-white/5 border border-white/5 hover:bg-white/10"
            >
              {t('common.back')}
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={step === 'select' ? handleNext : handleSave}
            isLoading={isSaving}
            disabled={isLoading || isError}
            rightIcon={!isSaving && <ChevronRight className="w-4 h-4" />}
          >
            {step === 'select'
              ? (selectedIds.length === 0 ? t('common.skip') : t('common.next'))
              : t('common.saveAndContinue')}
          </Button>
        </div>
      </div>
    </div>
  );
}
