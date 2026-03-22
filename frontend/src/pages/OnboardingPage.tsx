import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { ShieldCheck, ChevronRight, AlertTriangle, Check } from 'lucide-react';

// ── Catálogo de intolerancias (keys del HIDDEN_TRIGGERS_DB) ──
const INTOLERANCE_CATALOG = [
  { id: 'dairy',     label: 'Lácteos',            emoji: '🥛', desc: 'Leche, queso, mantequilla' },
  { id: 'egg',       label: 'Huevo',              emoji: '🥚', desc: 'Huevo y derivados' },
  { id: 'gluten',    label: 'Gluten',             emoji: '🌾', desc: 'Trigo, cebada, centeno' },
  { id: 'grain',     label: 'Grano',              emoji: '🌿', desc: 'Avena, arroz, quinoa' },
  { id: 'peanut',    label: 'Maní',               emoji: '🥜', desc: 'Maní y derivados' },
  { id: 'seafood',   label: 'Pescado',            emoji: '🐟', desc: 'Salmón, atún, anchoas' },
  { id: 'sesame',    label: 'Sésamo',             emoji: '🫘', desc: 'Semillas y aceite de sésamo' },
  { id: 'shellfish', label: 'Mariscos',           emoji: '🦐', desc: 'Camarón, langosta, cangrejo' },
  { id: 'soy',       label: 'Soja',               emoji: '🫛', desc: 'Tofu, salsa de soja, tempeh' },
  { id: 'sulfite',   label: 'Sulfitos',           emoji: '🍷', desc: 'Vino, frutos secos, conservas' },
  { id: 'tree_nut',  label: 'Frutos Secos',       emoji: '🌰', desc: 'Almendras, nueces, avellanas' },
  { id: 'wheat',     label: 'Trigo',              emoji: '🍞', desc: 'Harina, pan, sémola' },
  { id: 'corn',      label: 'Maíz',               emoji: '🌽', desc: 'Jarabe de maíz, dextrosa' },
  { id: 'sibo',      label: 'SIBO',               emoji: '🦠', desc: 'Dieta baja en FODMAPs' },
];

const SEVERITY_OPTIONS: { value: 'mild' | 'moderate' | 'severe' | 'anaphylactic'; label: string; color: string; bgColor: string }[] = [
  { value: 'mild',         label: 'Leve',          color: 'text-sky-400',    bgColor: 'bg-sky-500/15 border-sky-500/30' },
  { value: 'moderate',     label: 'Moderada',      color: 'text-amber-400',  bgColor: 'bg-amber-500/15 border-amber-500/30' },
  { value: 'severe',       label: 'Severa',        color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-500/30' },
  { value: 'anaphylactic', label: 'Anafilaxis',    color: 'text-red-400',    bgColor: 'bg-red-500/15 border-red-500/30' },
];

export function OnboardingPage() {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<string[]>(user?.intolerances || []);
  const [severities, setSeverities] = useState<Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>>(user?.severities || {});
  const [diet, setDiet] = useState<string>(user?.diet || 'None');
  const [dailyCalories, setDailyCalories] = useState<number>(user?.daily_calories || 2000);
  const [step, setStep] = useState<'select' | 'severity'>('select');
  const [isSaving, setIsSaving] = useState(false);
  
  const DIET_OPTIONS = ['None', 'Vegan', 'Vegetarian', 'Keto', 'Paleo', 'SIBO'];

  const toggleIntolerance = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selectedIds.length === 0) {
      // Sin intolerancias, guardar directamente
      handleSave();
      return;
    }
    // Asignar severidad por defecto 'moderate' a los nuevos
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
        diet,
        daily_calories: dailyCalories,
        intolerances,
        severities,
        conditions,
        onboardingComplete: true
      });
      navigate('/');
    } catch (err) {
      console.error('[Onboarding] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)'
    }}>
      {/* Header */}
      <header className="pt-10 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{
          background: 'linear-gradient(135deg, #34d399, #059669)'
        }}>
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          {step === 'select' ? '¿Qué alimentos debes evitar?' : 'Nivel de severidad'}
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          {step === 'select'
            ? 'Selecciona tus intolerancias o alergias alimentarias. Puedes cambiarlas más tarde.'
            : 'Ajusta la severidad de cada intolerancia para personalizar tus alertas.'}
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        <div className="max-w-2xl mx-auto">
          {step === 'select' ? (
            <div className="space-y-8">
              {/* ── Dieta y Calorías ── */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">🥗</span> Tu perfil nutricional
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-xs font-bold mb-2">Dieta Principal</label>
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
                    <label className="block text-slate-400 text-xs font-bold mb-2">Objetivo Diario (Calorías)</label>
                    <input 
                      type="number"
                      value={dailyCalories}
                      onChange={(e) => setDailyCalories(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* ── Grid de intolerancias ── */}
              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Intervenciones (Alergias / Intolerancias)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {INTOLERANCE_CATALOG.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIntolerance(item.id)}
                    className={`
                      relative flex flex-col items-center text-center p-5 rounded-2xl border transition-all duration-300
                      ${isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-900/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                    `}
                  >
                    {/* Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-3xl mb-2">{item.emoji}</span>
                    <span className={`text-sm font-bold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
                </div>
              </div>
            </div>
          ) : (
            /* ── Lista de severidades ── */
            <div className="space-y-4">
              {selectedIds.map(id => {
                const item = INTOLERANCE_CATALOG.find(c => c.id === id)!;
                const currentSeverity = severities[id] || 'moderate';
                return (
                  <div key={id} className="rounded-2xl border border-white/10 bg-white/5 p-5" style={{
                    backdropFilter: 'blur(12px)'
                  }}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{item.label}</p>
                        <p className="text-slate-500 text-xs">{item.desc}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SEVERITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSeverities(prev => ({ ...prev, [id]: opt.value }))}
                          className={`
                            py-2.5 px-3 rounded-xl text-xs font-bold border transition-all duration-200
                            ${currentSeverity === opt.value
                              ? `${opt.bgColor} ${opt.color}`
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}
                          `}
                        >
                          {opt.value === 'anaphylactic' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
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
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 inset-x-0 p-4" style={{
        background: 'linear-gradient(to top, #0f172a 60%, transparent)'
      }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          {step === 'severity' && (
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex-1 py-3.5 rounded-xl font-bold text-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={step === 'select' ? handleNext : handleSave}
            disabled={isSaving}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #34d399, #059669)'
            }}
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {step === 'select'
                  ? (selectedIds.length === 0 ? 'Omitir' : 'Siguiente')
                  : 'Guardar y Continuar'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
