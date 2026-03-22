import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '../types/recipe';
import { SecureAPI } from '../api/PrivacyProxy';
import { MOCK_RECIPE_DATA } from '../api/MockData';

// Regla de Oro: Ingredientes prohibidos para SIBO (FODMAPs críticos)
const FORBIDDEN_INGREDIENTS = [
  'ajo', 'cebolla', 'puerro', 'cebollín', 'chalota', 
  'garlic', 'onion', 'leek', 'shallot', 'scallion',
  'ajo en polvo', 'cebolla en polvo', 'garlic powder', 'onion powder'
];

export function useWatiSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    
    // Si el usuario borra todo, mostramos 10 al azar de nuevo en lugar de limpiar
    const isInitialOrEmpty = trimmed === '';
    
    if (trimmed.length > 0 && trimmed.length < 3) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsQuotaExhausted(false);

    try {
      // 1. Configuración de la Búsqueda
      const searchParams: any = { 
        query: trimmed, 
        number: 10 
      };
      
      if (isInitialOrEmpty) {
        searchParams.sort = 'random';
      }

      const data = await SecureAPI.fetchSafeRecipes(trimmed, undefined, false, searchParams);
      
      // 2. Seguridad de la Guatita (SIBO Filter - Client Side)
      const safeResults = data.filter((recipe: any) => {
        const titleContent = (recipe.title || '').toLowerCase();
        const ingredientsContent = (recipe.ingredients || [])
          .map((i: any) => (i.name || '').toLowerCase())
          .join(' ');
        
        const isForbidden = FORBIDDEN_INGREDIENTS.some(forbidden => 
          titleContent.includes(forbidden) || ingredientsContent.includes(forbidden)
        );

        return !isForbidden;
      });

      // Mapeo al formato de la UI (similar a RecipePage anterior)
      const mappedResults: Recipe[] = safeResults.map((r: any) => ({
        id: r.id.toString(),
        title: r.title,
        imageUrl: r.imageUrl,
        prepTimeMinutes: r.prepTimeMinutes,
        estimatedCost: r.estimatedCost,
        ingredients: (r.ingredients || []).map((i: any) => ({
          ...i,
          isBorderlineSafe: false
        })),
        instructions: r.instructions,
        summary: r.summary,
        safetyLevel: r.securityDisclosure?.riskLevel === 'SAFE' ? 'safe' : (r.securityDisclosure?.riskLevel === 'WARNING' ? 'review' : 'unsafe'),
        siboAllergiesTags: r.siboAllergiesTags
      }));

      setResults(mappedResults);
    } catch (err: any) {
      console.error('[useWatiSearch] Error:', err);
      
      // 3. Optimización y Ahorro de Créditos (Error 402 fallback)
      if (err.message?.includes('402') || err.message?.includes('quota') || err.message?.includes('aborted')) {
        setIsQuotaExhausted(true);
        // Fallback a datos locales
        const fallback = MOCK_RECIPE_DATA.map((r: any) => ({
          ...r,
          safetyLevel: 'safe' as const
        }));
        setResults(fallback);
      } else {
        setError('Error al conectar con el servidor.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce Effect: 600ms
  useEffect(() => {
    // Si la query es válida para buscar, marcamos como pendiente inmediatamente
    const trimmed = query.trim();
    if (trimmed.length >= 3 || trimmed === '') {
      setIsPending(true);
    }

    const timer = setTimeout(() => {
      performSearch(query);
      setIsPending(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isPending,
    error,
    isQuotaExhausted,
    refresh: () => performSearch(query)
  };
}
