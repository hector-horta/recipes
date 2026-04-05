import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Recipe } from '../types/recipe';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

async function fetchRecipes(query: string): Promise<Recipe[]> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('number', '20');

  const res = await fetch(`${API_URL}/api/recipes?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.status}`);
  return res.json();
}

export function useWatiSearch() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['recipes', debouncedQuery],
    queryFn: () => fetchRecipes(debouncedQuery),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: 1,
  });

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
    queryClient.invalidateQueries({ queryKey: ['recipes', debouncedQuery] });
  }, [queryClient, debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isPending,
    error: null,
    isQuotaExhausted: false,
    refresh
  };
}
