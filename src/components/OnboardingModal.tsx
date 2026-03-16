import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ShieldCheck, ChevronRight, AlertTriangle, Check } from 'lucide-react';

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
  { value: 'mild',         label: 'Leve',       color: 'text-sky-400',    bgColor: 'bg-sky-500/15 border-sky-500/30' },
  { value: 'moderate',     label: 'Moderada',   color: 'text-amber-400',  bgColor: 'bg-amber-500/15 border-amber-500/30' },
  { value: 'severe',       label: 'Severa',     color: 'text-orange-400', bgColor: 'bg-orange-500/15 border-orange-500/30' },
  { value: 'anaphylactic', label: 'Anafilaxis', color: 'text-red-400',    bgColor: 'bg-red-500/15 border-red-500/30' },
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { user, updateUserProfile } = useAuth();

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
      const intolerances = selectedIds.filter(id => {
        if (id === 'sibo') { conditions.push('SIBO'); return false; }
        return true;
      });
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
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col"
        style={{
          background: 'linear-gradient(145deg, rgba(30,41,59,0.97), rgba(15,23,42,0.98))',
          backdropFilter: 'blur(24px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pt-7 pb-4 px-7 text-center shrink-0">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-2" style={{
            background: 'linear-gradient(135deg, #34d399, #059669)'
          }}>
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {step === 'select' ? '¿Qué alimentos debes evitar?' : 'Nivel de severidad'}
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            {step === 'select'
              ? 'Selecciona tus intolerancias. Puedes cambiarlas más tarde.'
              : 'Ajusta la severidad para personalizar alertas.'}
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-7 pb-4">
          {step === 'select' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {INTOLERANCE_CATALOG.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIntolerance(item.id)}
                    className={`
                      relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-300
                      ${isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-900/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className="text-2xl mb-1.5">{item.emoji}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedIds.map(id => {
                const item = INTOLERANCE_CATALOG.find(c => c.id === id)!;
                const currentSeverity = severities[id] || 'moderate';
                return (
                  <div key={id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <p className="text-white font-bold text-sm">{item.label}</p>
                        <p className="text-slate-500 text-[10px]">{item.desc}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SEVERITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSeverities(prev => ({ ...prev, [id]: opt.value }))}
                          className={`
                            py-2 px-2 rounded-xl text-[10px] font-bold border transition-all duration-200
                            ${currentSeverity === opt.value
                              ? `${opt.bgColor} ${opt.color}`
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}
                          `}
                        >
                          {opt.value === 'anaphylactic' && <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />}
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
        <div className="px-7 pb-6 pt-3 flex gap-2.5 shrink-0 border-t border-white/5">
          {step === 'severity' && (
            <button
              type="button"
              onClick={() => setStep('select')}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={step === 'select' ? handleNext : handleSave}
            disabled={isSaving}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}
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
