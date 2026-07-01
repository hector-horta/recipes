import { useTranslation } from 'react-i18next';

interface DietSelectionStepProps {
  diet: string;
  setDiet: (diet: string) => void;
  dailyCalories: number;
  setDailyCalories: (calories: number) => void;
}

export function DietSelectionStep({ diet, setDiet, dailyCalories, setDailyCalories }: DietSelectionStepProps) {
  const { t } = useTranslation();
  const DIET_OPTIONS = ['None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo', 'SIBO'];

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <span className="text-xl">🥗</span> {t('onboarding.nutritionalProfile', { defaultValue: 'Tu perfil nutricional' })}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs font-bold mb-2">
            {t('onboarding.primaryDiet', { defaultValue: 'Dieta Principal' })}
          </label>
          <select 
            value={diet} 
            onChange={(e) => setDiet(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {DIET_OPTIONS.map(opt => (
              <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs font-bold mb-2">
            {t('onboarding.dailyCalories', { defaultValue: 'Objetivo Diario (Calorías)' })}
          </label>
          <input 
            type="number"
            value={dailyCalories}
            onChange={(e) => setDailyCalories(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
}
