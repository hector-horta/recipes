import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Recipe } from '../types/recipe';
import { useDebounce } from './useDebounce';

async function fetchRecipes(query: string): Promise<Recipe[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('number', '20');

  const res = await fetch(`/api/recipes?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status}`);
  return res.json();
}

export function useWatiSearch() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  const shouldSearch = debouncedQuery.trim().length === 0 || debouncedQuery.trim().length >= 3;

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['recipes', debouncedQuery],
    queryFn: () => fetchRecipes(debouncedQuery),
    enabled: shouldSearch,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: 1,
  });

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
