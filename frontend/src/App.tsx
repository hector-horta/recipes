import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { RecipePage } from './pages/RecipePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { LoginModal } from './components/LoginModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Recipe } from './types/recipe';

export type ModalState = 'none' | 'login' | 'onboarding';

function App() {
  const { user } = useAuth();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeModal, setActiveModal] = useState<ModalState>('none');

  const handleLoginSuccess = () => {
    // After login/register, check if onboarding is needed
    setActiveModal('onboarding');
  };

  const handleOnboardingClose = () => {
    setActiveModal('none');
  };

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
