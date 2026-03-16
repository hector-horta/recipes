import { useState } from 'react';
import { RecipePage } from './pages/RecipePage';
import { RecipeDetailPage } from './pages/RecipeDetailPage';
import { Recipe } from './types/recipe';

function App() {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  return (
    <main>
      {selectedRecipe ? (
        <RecipeDetailPage 
          recipe={selectedRecipe} 
          onBack={() => setSelectedRecipe(null)} 
        />
      ) : (
        <RecipePage onSelectRecipe={setSelectedRecipe} />
      )}
    </main>
  );
}

export default App;
