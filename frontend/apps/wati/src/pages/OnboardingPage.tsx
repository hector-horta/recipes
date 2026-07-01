import { useNavigate } from 'react-router-dom';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { DietSelectionStep } from '../components/onboarding/steps/DietSelectionStep';
import { IntoleranceSelectionStep } from '../components/onboarding/steps/IntoleranceSelectionStep';
import { SeveritySelectionStep } from '../components/onboarding/steps/SeveritySelectionStep';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@wati/ui-kit';

export function OnboardingPage() {
  const navigate = useNavigate();
  const {
    catalog,
    isLoading,
    isError,
    refetch,
    selectedIds,
    severities,
    setSeverities,
    diet,
    setDiet,
    dailyCalories,
    setDailyCalories,
    step,
    setStep,
    isSaving,
    toggleIntolerance,
    handleNext,
    handleSave
  } = useOnboardingState({ onSaveSuccess: () => navigate('/') });

  const handleSeverityChange = (id: string, severity: 'mild' | 'moderate' | 'severe' | 'anaphylactic') => {
    setSeverities(prev => ({ ...prev, [id]: severity }));
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Cargando catálogo...</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <p className="text-red-400 text-sm font-bold">Error al cargar datos</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60">
                Reintentar
              </Button>
            </div>
          ) : step === 'select' ? (
            <div className="space-y-8">
              {/* Diet and calories inputs */}
              <DietSelectionStep
                diet={diet}
                setDiet={setDiet}
                dailyCalories={dailyCalories}
                setDailyCalories={setDailyCalories}
              />

              {/* Grid of intolerances */}
              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-left">
                  <span className="text-xl">⚠️</span> Intervenciones (Alergias / Intolerancias)
                </h3>
                <IntoleranceSelectionStep
                  catalog={catalog}
                  selectedIds={selectedIds}
                  toggleIntolerance={toggleIntolerance}
                  theme="emerald"
                />
              </div>
            </div>
          ) : (
            <SeveritySelectionStep
              catalog={catalog}
              selectedIds={selectedIds}
              severities={severities}
              onSeverityChange={handleSeverityChange}
              theme="emerald"
            />
          )}
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 inset-x-0 p-4" style={{
        background: 'linear-gradient(to top, #0f172a 60%, transparent)'
      }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          {step === 'severity' && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setStep('select')}
              className="flex-1 text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10"
            >
              Atrás
            </Button>
          )}
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={step === 'select' ? handleNext : handleSave}
            isLoading={isSaving}
            disabled={isSaving || isLoading || isError}
            rightIcon={!isSaving && <ChevronRight className="w-4 h-4" />}
          >
            {step === 'select'
              ? (selectedIds.length === 0 ? 'Omitir' : 'Siguiente')
              : 'Guardar y Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
