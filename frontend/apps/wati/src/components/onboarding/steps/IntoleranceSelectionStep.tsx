import { Check } from 'lucide-react';
import { IntoleranceItem } from '../../../hooks/useOnboardingState';

interface IntoleranceSelectionStepProps {
  catalog: IntoleranceItem[];
  selectedIds: string[];
  toggleIntolerance: (id: string) => void;
  theme?: 'mint' | 'emerald';
}

export function IntoleranceSelectionStep({
  catalog,
  selectedIds,
  toggleIntolerance,
  theme = 'mint'
}: IntoleranceSelectionStepProps) {
  const isMint = theme === 'mint';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {catalog.map(item => {
        const isSelected = selectedIds.includes(item.id);
        
        const selectedBtnClass = isMint
          ? 'bg-brand-mint/20 border-brand-mint shadow-lg shadow-brand-forest/40'
          : 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-900/20';

        const labelClass = isSelected
          ? (isMint ? 'text-white' : 'text-emerald-300')
          : 'text-white';

        const checkBgClass = isSelected
          ? (isMint ? 'bg-brand-mint border-brand-mint scale-110 shadow-md shadow-brand-mint/20' : 'bg-emerald-500 border-emerald-500 scale-110 shadow-md shadow-emerald-500/20')
          : 'bg-transparent border-white/20 scale-100';

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleIntolerance(item.id)}
            className={`
              relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-300
              ${isSelected
                ? selectedBtnClass
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
            `}
          >
            <div className={`
              absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
              ${checkBgClass}
            `}>
              <Check className={`w-3 h-3 transition-colors ${isSelected ? 'text-white stroke-[4]' : 'text-transparent'}`} />
            </div>
            <span className="text-3xl mb-2">{item.emoji}</span>
            <span className={`text-sm font-black tracking-wide ${labelClass}`}>
              {item.label}
            </span>
            <span className="text-[10px] text-white/60 mt-1 font-bold leading-tight">{item.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
