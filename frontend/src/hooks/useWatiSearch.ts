import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Recipe } from '../types/recipe';
import { SecureAPI } from '../api/PrivacyProxy';
import { SecureVault } from '../security/SecureVault';
import { useAuth } from '../AuthContext';
import { MOCK_RECIPE_DATA } from '../api/MockData';

const SIBO_FORBIDDEN_INGREDIENTS = [
  'ajo', 'cebolla', 'puerro', 'cebollín', 'chalota', 
  'garlic', 'onion', 'leek', 'shallot', 'scallion',
  'ajo en polvo', 'cebolla en polvo', 'garlic powder', 'onion powder'
];

const MOCK_FALLBACK = MOCK_RECIPE_DATA.map((r: any) => ({
  ...r,
  safetyLevel: 'safe' as const
}));

function isQuotaError(err: unknown): boolean {
  const msg = (err as Error)?.message || '';
  return msg.includes('Quota Exhausted') || msg.includes('402') || msg.includes('quota') || msg.includes('aborted');
}

async function fetchRecipes(query: string, userId: string | undefined) {
  const userObj = userId ? { id: userId } : undefined;
  const searchParams: any = { 
    query: query.trim(), 
    number: userObj ? 15 : 10
  };
  
  if (!query.trim()) {
    searchParams.sort = 'random';
  }

  const medicalProfile = userObj ? SecureVault.fromUserProfile(userObj as any) : undefined;
  const data = await SecureAPI.fetchSafeRecipes(query.trim(), medicalProfile, false, searchParams);

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

  const finalSafeRecipes = mappedResults
    .filter((r: Recipe) => r.safetyLevel !== 'unsafe')
    .slice(0, 10);

  return finalSafeRecipes;
}

export function useWatiSearch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: results = [], isLoading, error, isFetching } = useQuery({
    queryKey: ['recipes', debouncedQuery, user?.id],
    queryFn: async () => {
      try {
        return await fetchRecipes(debouncedQuery, user?.id);
      } catch (err: unknown) {
        if (isQuotaError(err)) {
          return MOCK_FALLBACK;
        }
        throw err;
      }
    },
    enabled: debouncedQuery.trim().length === 0 || debouncedQuery.trim().length >= 3,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  const isQuotaExhausted = error !== null && isQuotaError(error);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      const timer = setTimeout(() => {
        setDebouncedQuery(query);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [query]);

  const isPending = isFetching && results.length === 0;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['recipes', debouncedQuery, user?.id] });
  }, [queryClient, debouncedQuery, user?.id]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isPending,
    error: isQuotaExhausted ? null : error,
    isQuotaExhausted,
    refresh
  };
}
