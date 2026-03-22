import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { RecipePage } from './pages/RecipePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { LoginModal } from './components/LoginModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Recipe } from './types/recipe';
import { MedicalRegistry } from './api/MedicalRegistry';
import { SecurityScrubber } from './api/SecurityScrubber';

// ── App Component ──────────────────────────────────────────
export type ModalState = 'none' | 'login' | 'onboarding';

function App() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    async function initMedicalSystems() {
      try {
        await MedicalRegistry.syncTriggers();
        await SecurityScrubber.initialize();
      } catch (err) {
        console.error('[App] Failed to initialize medical systems:', err);
      } finally {
        setIsInitialized(true);
      }
    }
    initMedicalSystems();
  }, []);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeModal, setActiveModal] = useState<ModalState>('none');

  const handleLoginSuccess = (userData?: any) => {
    // Check if onboarding is needed (use userData if available, otherwise fallback)
    const needsOnboarding = userData ? !userData.onboardingComplete : !user?.onboardingComplete;
    
    if (needsOnboarding) {
      setActiveModal('onboarding');
    } else {
      setActiveModal('none');
    }
  };

  const handleOnboardingClose = () => {
    setActiveModal('none');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-brand-forest flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
        <p className="text-white/40 text-xs font-black uppercase tracking-widest">Wati se está preparando...</p>
      </div>
    );
  }

  return (
    <>
      {/* Main content — always visible */}
      {selectedRecipe ? (
        <RecipeDetailPage
          recipe={selectedRecipe}
          onBack={() => setSelectedRecipe(null)}
        />
      ) : (
        <RecipePage
          onSelectRecipe={setSelectedRecipe}
          onOpenLogin={() => setActiveModal('login')}
          onOpenOnboarding={() => setActiveModal('onboarding')}
        />
      )}

      {/* Modals — overlaid on top */}
      {activeModal === 'login' && (
        <LoginModal
          onClose={() => setActiveModal('none')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {activeModal === 'onboarding' && user && (
        <OnboardingModal
          onClose={handleOnboardingClose}
        />
      )}
    </>
  );
}

export default App;
