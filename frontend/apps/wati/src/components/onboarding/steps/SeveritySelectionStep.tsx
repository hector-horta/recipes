import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IntoleranceItem } from '../../../hooks/useOnboardingState';

interface SeveritySelectionStepProps {
  catalog: IntoleranceItem[];
  selectedIds: string[];
  severities: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  onSeverityChange: (id: string, severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic') => void;
  theme?: 'mint' | 'emerald';
}

export function SeveritySelectionStep({
  catalog,
  selectedIds,
  severities,
  onSeverityChange,
  theme = 'mint'
}: SeveritySelectionStepProps) {
  const { t } = useTranslation();
  const isMint = theme === 'mint';

  const SEVERITY_OPTIONS: {
    value: 'mild' | 'moderate' | 'severe' | 'anaphylactic';
    label: string;
    activeClassesMint: string;
    activeClassesEmerald: string;
  }[] = [
    {
      value: 'mild',
      label: t('onboarding.mild', { defaultValue: 'Leve' }),
      activeClassesMint: '!bg-[#74C6E6] !text-white border-[#74C6E6]',
      activeClassesEmerald: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    },
    {
      value: 'moderate',
      label: t('onboarding.moderate', { defaultValue: 'Moderada' }),
      activeClassesMint: '!bg-yellow-400 !text-slate-900 border-yellow-400',
      activeClassesEmerald: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    {
      value: 'severe',
      label: t('onboarding.severe', { defaultValue: 'Severa' }),
      activeClassesMint: '!bg-orange-500 !text-white border-orange-500',
      activeClassesEmerald: 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    },
    {
      value: 'anaphylactic',
      label: t('onboarding.anaphylactic', { defaultValue: 'Anafilaxis' }),
      activeClassesMint: '!bg-red-600 !text-white border-red-600',
      activeClassesEmerald: 'bg-red-500/15 text-red-400 border-red-500/30'
    }
  ];

  return (
    <div className="space-y-4">
      {selectedIds.map(id => {
        const item = catalog.find(c => c.id === id);
        if (!item) return null;
        const currentSeverity = severities[id] || 'moderate';

        const cardClass = isMint
          ? 'rounded-2xl border border-brand-mint bg-brand-mint/20 p-5 shadow-lg shadow-brand-forest/40'
          : 'rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md';

        return (
          <div key={id} className={cardClass}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{item.emoji}</span>
              <div className="text-left">
                <p className="text-white font-black text-sm">{item.label}</p>
                <p className={`${isMint ? 'text-white/60' : 'text-slate-500'} text-xs font-bold`}>{item.desc}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITY_OPTIONS.map(opt => {
                const isActive = currentSeverity === opt.value;
                const activeStyle = isMint ? opt.activeClassesMint : opt.activeClassesEmerald;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onSeverityChange(id, opt.value)}
                    className={`
                      py-2.5 px-2 rounded-xl text-[10px] sm:text-xs font-black border transition-all duration-200 uppercase tracking-tighter
                      ${isActive
                        ? `${activeStyle} shadow-lg scale-105`
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}
                    `}
                  >
                    {!isMint && opt.value === 'anaphylactic' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
