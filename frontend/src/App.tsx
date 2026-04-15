import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { RecipePage } from './pages/RecipePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { LoginModal } from './components/LoginModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Recipe } from './types/recipe';
import { MedicalRegistry } from './api/MedicalRegistry';
import { SecurityScrubber } from './api/SecurityScrubber';

import { useWatiSearch } from './hooks/useWatiSearch';

// ── App Component ──────────────────────────────────────────
export type ModalState = 'none' | 'login' | 'onboarding';

function App() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchProps = useWatiSearch();
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
  const [notification, setNotification] = useState<string | null>(null);

  // Handle verification status from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'verified') {
      setNotification(t('auth.verificationSuccess'));
      // Clean up URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Auto-hide notification
      setTimeout(() => setNotification(null), 6000);
    }
  }, [t]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const recipeId = event.state?.recipeId;
      if (recipeId) {
        const stored = sessionStorage.getItem(`recipe_${recipeId}`);
        if (stored) {
          setSelectedRecipe(JSON.parse(stored));
        }
      } else {
        setSelectedRecipe(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectRecipe = (recipe: Recipe) => {
    sessionStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(recipe));
    setSelectedRecipe(recipe);
    history.pushState({ recipeId: recipe.id }, '');
  };

  const handleBack = () => {
    if (selectedRecipe) {
      history.back();
    }
  };

  const handleLoginSuccess = (userData?: any) => {
    const needsOnboarding = userData ? !userData.onboarding_completed : !user?.onboarding_completed;
    
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
        <p className="text-white/40 text-xs font-black uppercase tracking-widest">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      {selectedRecipe ? (
        <RecipeDetailPage
          recipe={selectedRecipe}
          onBack={handleBack}
        />
      ) : (
        <RecipePage
          {...searchProps}
          onSelectRecipe={handleSelectRecipe}
          onOpenLogin={() => setActiveModal('login')}
          onOpenOnboarding={() => setActiveModal('onboarding')}
        />
      )}

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

      {/* Verification Notification */}
      {notification && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-brand-forest text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-brand-mint/20 backdrop-blur-xl">
            <div className="w-10 h-10 bg-brand-mint/20 rounded-xl flex items-center justify-center text-brand-mint">
              <CheckCircle size={24} />
            </div>
            <p className="font-bold text-sm tracking-tight">{notification}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} className="opacity-40" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
