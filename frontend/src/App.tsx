import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { RecipePage } from './pages/RecipePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { LoginModal } from './components/LoginModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Recipe } from './types/recipe';
import { MedicalRegistry } from './api/MedicalRegistry';
import { SecurityScrubber } from './api/SecurityScrubber';

import { useWatiSearch } from './hooks/useWatiSearch';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerificationBanner } from './components/VerificationBanner';

// ── App Component ──────────────────────────────────────────
export type ModalState = 'none' | 'login' | 'onboarding';

function App() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchProps = useWatiSearch();
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Simple routing state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

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

  // Handle browser back/forward buttons and deep links
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setCurrentPath(window.location.pathname);
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

  // Handle auto-open login from query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true') {
      setActiveModal('login');
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('login');
      window.history.replaceState({}, '', newUrl.pathname);
    }
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

  const handleGoHome = () => {
    setSelectedRecipe(null);
    searchProps.setQuery('');
    setCurrentPath('/');
    // Clear URL query param if any
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    window.history.pushState({}, '', '/');
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-brand-forest flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-mint/30 border-t-brand-mint rounded-full animate-spin" />
        <p className="text-white/40 text-xs font-black uppercase tracking-widest">{t('common.loading')}</p>
      </div>
    );
  }

  // Route Rendering logic
  const renderContent = () => {
    if (currentPath === '/verify') {
      return <VerifyEmailPage />;
    }
    if (currentPath === '/reset-password') {
      return <ResetPasswordPage />;
    }

    if (selectedRecipe) {
      return (
        <RecipeDetailPage
          recipe={selectedRecipe}
          onBack={handleBack}
          onLogoClick={handleGoHome}
        />
      );
    }

    return (
      <RecipePage
        {...searchProps}
        onSelectRecipe={handleSelectRecipe}
        onOpenLogin={() => setActiveModal('login')}
        onOpenOnboarding={() => setActiveModal('onboarding')}
        onLogoClick={handleGoHome}
      />
    );
  };

  return (
    <>
      <VerificationBanner />
      {renderContent()}

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
