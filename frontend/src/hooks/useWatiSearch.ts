import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Recipe, RecipeSearchResponse } from '../types/recipe';
import { useDebounce } from './useDebounce';
import { useAuth } from '../AuthContext';

async function fetchRecipes(
  query: string,
  token?: string | null,
  includeUnsafe?: boolean
): Promise<RecipeSearchResponse> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('number', '20');
  if (includeUnsafe) params.set('includeUnsafe', 'true');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/recipes?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status}`);
  const data = await res.json();

  // Backwards-compatible: if the backend returns a plain array (no auth), wrap it
  if (Array.isArray(data)) {
    return { recipes: data, filteredUnsafeCount: 0, filteredAllergens: [] };
  }

  return data as RecipeSearchResponse;
}

export function useWatiSearch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [includeUnsafe, setIncludeUnsafe] = useState(false);
  const debouncedQuery = useDebounce(query, 500);

  // Reset override when search query changes
  useEffect(() => {
    setIncludeUnsafe(false);
  }, [debouncedQuery]);

  const shouldSearch = debouncedQuery.trim().length === 0 || debouncedQuery.trim().length >= 3;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recipes', debouncedQuery, user?.id, includeUnsafe],
    queryFn: () => fetchRecipes(debouncedQuery, localStorage.getItem('wati_jwt'), includeUnsafe),
    enabled: shouldSearch,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const results = data?.recipes ?? [];
  const filteredUnsafeCount = data?.filteredUnsafeCount ?? 0;
  const filteredAllergens = data?.filteredAllergens ?? [];

  // Umami Event Tracking: search_success / search_failed
  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();
    if (trimmedQuery.length < 3) return;
    if (typeof window === 'undefined' || !(window as any).umami) return;

    if (results.length > 0) {
      (window as any).umami.track('search_success', {
        query: trimmedQuery,
        resultsCount: results.length
      });
    } else {
      (window as any).umami.track('search_failed', {
        query: trimmedQuery,
        resultsCount: 0
      });
    }
  }, [results.length, debouncedQuery]);

  const isSearching = isFetching && query !== debouncedQuery;
  const isPending = isFetching && results.length === 0 && !isSearching;

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['recipes', debouncedQuery] });
  }, [queryClient, debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isSearching,
    isPending,
    error: null,
    isQuotaExhausted: false,
    refresh,
    filteredUnsafeCount,
    filteredAllergens,
    includeUnsafe,
    setIncludeUnsafe
  };
}
