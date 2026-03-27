import { useState, useEffect, useCallback } from 'react';
import { Recipe } from '../types/recipe';
import { SecureAPI } from '../api/PrivacyProxy';
import { SecureVault } from '../security/SecureVault';
import { useAuth } from '../AuthContext';
import { MOCK_RECIPE_DATA } from '../api/MockData';

// Regla de Oro: Ingredientes prohibidos para SIBO (FODMAPs críticos)
// Solo se aplica si el usuario tiene SIBO activo en su perfil médico.
const SIBO_FORBIDDEN_INGREDIENTS = [
  'ajo', 'cebolla', 'puerro', 'cebollín', 'chalota', 
  'garlic', 'onion', 'leek', 'shallot', 'scallion',
  'ajo en polvo', 'cebolla en polvo', 'garlic powder', 'onion powder'
];

export function useWatiSearch() {
  const { user } = useAuth();
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
        number: user ? 15 : 10 // Pide 15 si tiene cuenta para asegurar que queden 10 tras filtros de alergias/SIBO
      };
      
      if (isInitialOrEmpty) {
        searchParams.sort = 'random';
      }

        const medicalProfile = user ? SecureVault.fromUserProfile(user) : undefined;
        const data = await SecureAPI.fetchSafeRecipes(trimmed, medicalProfile, false, searchParams);
      
      // 2. Seguridad de la Guatita (SIBO Filter - Client Side)
      const hasSIBO = medicalProfile?.conditions?.includes('SIBO') || false;

      const safeResults = data.filter((recipe: any) => {
        if (!hasSIBO) return true;

        const titleContent = (recipe.title || '').toLowerCase();
        const ingredientsContent = (recipe.ingredients || [])
          .map((i: any) => (i.name || '').toLowerCase())
          .join(' ');
        
        const isForbidden = SIBO_FORBIDDEN_INGREDIENTS.some((forbidden: string) => 
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

      // Filtro final para asegurar exactamente 10 recetas que no sean inseguras
      const finalSafeRecipes = mappedResults
        .filter((r: Recipe) => r.safetyLevel !== 'unsafe')
        .slice(0, 10);

      setResults(finalSafeRecipes);
    } catch (error: any) {
      console.error('[useWatiSearch] Error:', error);
      setError(error.message);
      if (error.message.includes('Quota Exhausted')) {
        setIsQuotaExhausted(true);
        const fallback = MOCK_RECIPE_DATA.map((r: any) => ({
          ...r,
          safetyLevel: 'safe' as const
        }));
        setResults(fallback);
      } else if (error.message?.includes('402') || error.message?.includes('quota') || error.message?.includes('aborted')) {
        setIsQuotaExhausted(true);
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
  }, [user]); // CRÍTICO: user debe estar en deps para evitar stale closure (user siempre null sin esto)

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
