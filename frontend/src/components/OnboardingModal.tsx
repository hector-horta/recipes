import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import { WatiLogo } from './WatiLogo';
import { Button } from './ui/Button';
import { X, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const API_URL = '';

interface IntoleranceItem {
  id: string;
  label: string;
  emoji: string;
  desc: string;
}

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();

  const SEVERITY_OPTIONS: { value: 'mild' | 'moderate' | 'severe' | 'anaphylactic'; label: string; activeClasses: string }[] = [
    { value: 'mild',         label: t('onboarding.mild'),        activeClasses: '!bg-[#74C6E6] !text-white border-[#74C6E6]' },
    { value: 'moderate',     label: t('onboarding.moderate'),    activeClasses: '!bg-yellow-400 !text-slate-900 border-yellow-400' },
    { value: 'severe',       label: t('onboarding.severe'),      activeClasses: '!bg-orange-500 !text-white border-orange-500' },
    { value: 'anaphylactic', label: t('onboarding.anaphylactic'),activeClasses: '!bg-red-600 !text-white border-red-600' },
  ];

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['medical', 'catalog'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/medical/catalog`);
      if (!response.ok) throw new Error('Failed to fetch catalog');
      const data: IntoleranceItem[] = await response.json();
      return data.map(item => ({
        ...item,
        label: t(`intolerances.${item.id}`, { defaultValue: item.label }),
        desc: t(`intolerances.${item.id}Desc`, { defaultValue: item.desc })
      }));
    },
    staleTime: 1000 * 60 * 30,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>(user?.intolerances || []);
  const [severities, setSeverities] = useState<Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>>(user?.severities || {});
  const [step, setStep] = useState<'select' | 'severity'>('select');
  const [isSaving, setIsSaving] = useState(false);

  const toggleIntolerance = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      handleSave();
      return;
    }
    const newSeverities = { ...severities };
    selectedIds.forEach(id => {
      if (!newSeverities[id]) newSeverities[id] = 'moderate';
    });
    setSeverities(newSeverities);
    setStep('severity');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const conditions: string[] = [];
      const intolerances = selectedIds;
      await updateUserProfile({
        intolerances,
        severities,
        conditions,
        onboardingComplete: true
      });
      onClose();
    } catch (err) {
      console.error('[Onboarding] Save error:', err);
    } finally {
      setIsSaving(false);
    }
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
            <WatiLogo size={120} variant="white" />
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
          ) : step === 'select' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {catalog.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIntolerance(item.id)}
                    className={`
                      relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-300
                      ${isSelected
                        ? 'bg-brand-mint/20 border-brand-mint shadow-lg shadow-brand-forest/40'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                    `}
                  >
                    <div className={`
                      absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300
                      ${isSelected 
                        ? 'bg-brand-mint border-brand-mint scale-110 shadow-md shadow-brand-mint/20' 
                        : 'bg-transparent border-white/20 scale-100'}
                    `}>
                      <Check className={`w-3.5 h-3.5 transition-colors ${isSelected ? 'text-white stroke-[4]' : 'text-transparent'}`} />
                    </div>
                    <span className="text-3xl mb-2">{item.emoji}</span>
                    <span className="text-xs font-black tracking-wide text-white">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-white/60 mt-1 font-bold leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedIds.map(id => {
                const item = catalog.find(c => c.id === id);
                if (!item) return null;
                const currentSeverity = severities[id] || 'moderate';
                return (
                  <div key={id} className="rounded-2xl border border-brand-mint bg-brand-mint/20 p-5 shadow-lg shadow-brand-forest/40">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <p className="text-white font-black text-sm">{item.label}</p>
                        <p className="text-white/60 text-[10px] font-bold">{item.desc}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SEVERITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSeverities(prev => ({ ...prev, [id]: opt.value }))}
                          className={`
                            py-2.5 px-2 rounded-xl text-[10px] font-black border transition-all duration-200 uppercase tracking-tighter
                            ${currentSeverity === opt.value
                              ? `${opt.activeClasses} shadow-lg scale-105`
                              : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 flex gap-3 shrink-0 border-t border-white/5">
          {step === 'select' && (
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
            disabled={isLoading}
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
