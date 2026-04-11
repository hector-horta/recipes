import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Recipe } from '../types/recipe';
import { useDebounce } from './useDebounce';
import { useAuth } from '../AuthContext';

async function fetchRecipes(query: string, token?: string | null): Promise<Recipe[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('number', '20');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api/recipes?${params.toString()}`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status}`);
  return res.json();
}

export function useWatiSearch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  const shouldSearch = debouncedQuery.trim().length === 0 || debouncedQuery.trim().length >= 3;

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['recipes', debouncedQuery, user?.id],
    queryFn: () => fetchRecipes(debouncedQuery, localStorage.getItem('wati_jwt')),
    enabled: shouldSearch,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: 1,
  });

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
    refresh
  };
}
