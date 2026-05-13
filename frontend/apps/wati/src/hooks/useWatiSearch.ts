import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RecipeSearchResponse } from '../types/recipe';
import { useDebounce } from './useDebounce';
import { useAuth } from '../AuthContext';
import { api, ApiError } from '../lib/api';
import { logger } from '../utils/logger';

const ITEMS_PER_PAGE = 10;

async function fetchRecipes(
  query: string,
  includeUnsafe?: boolean,
  refreshKey?: number,
  offset?: number
): Promise<RecipeSearchResponse> {
  const params = new URLSearchParams();
  if (query?.trim()) params.set('query', query.trim());
  params.set('number', ITEMS_PER_PAGE.toString());
  if (offset && offset > 0) params.set('offset', offset.toString());
  if (includeUnsafe) params.set('includeUnsafe', 'true');
  if (refreshKey) params.set('refreshKey', refreshKey.toString());

  const data = await api.get<RecipeSearchResponse | any[]>(`/recipes?${params.toString()}`);

  // Backwards-compatible: if the backend returns a plain array (no auth), wrap it
  if (Array.isArray(data)) {
    return { recipes: data, total: data.length, filteredUnsafeCount: 0, filteredAllergens: [] };
  }

  return data as RecipeSearchResponse;
}

export function useWatiSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [includeUnsafe, setIncludeUnsafe] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedQuery = useDebounce(query, 500);

  // Sync URL with query results when they change significantly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({ ...window.history.state }, '', newUrl);
  }, [debouncedQuery]);

  // Reset override and page when search query changes
  useEffect(() => {
    setIncludeUnsafe(false);
    setCurrentPage(1);
  }, [debouncedQuery]);

  // Security: Basic character validation and length limit
  const sanitizedQuery = debouncedQuery
    .replace(/-/g, ' ')
    .replace(/[^\w\s\u00C0-\u00FF]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  const shouldSearch = sanitizedQuery.length === 0 || sanitizedQuery.length >= 2;

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['recipes', sanitizedQuery, user?.id, user?.intolerances, user?.severities, includeUnsafe, refreshKey, currentPage],
    queryFn: () => fetchRecipes(sanitizedQuery, includeUnsafe, refreshKey, offset),
    enabled: shouldSearch,
    staleTime: 1000 * 60 * 5, // Improved performance: 5 mins cache for recipes
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry on 401 or 403
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return false;
      return failureCount < 2;
    },
  });

  const results = data?.recipes ?? [];
  const total = data?.total ?? 0;
  const filteredUnsafeCount = data?.filteredUnsafeCount ?? 0;
  const filteredAllergens = data?.filteredAllergens ?? [];
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Event Tracking: search_success / search_failed
  useEffect(() => {
    const trimmedQuery = sanitizedQuery.trim();
    if (trimmedQuery.length < 2) return;

    if (results.length > 0) {
      logger.track('SEARCH_SUCCESS', {
        query: trimmedQuery,
        resultsCount: results.length
      });
    } else if (!isLoading && !isFetching && !error) {
      logger.track('SEARCH_FAILED', {
        query: trimmedQuery,
        resultsCount: 0
      });
    }
  }, [results.length, sanitizedQuery, isLoading, isFetching, !!error]);

  const isSearching = isFetching && query !== debouncedQuery;
  const isPending = isFetching && results.length === 0 && !isSearching;

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    isSearching,
    isPending,
    error: error instanceof ApiError ? error.message : (error instanceof Error ? error.message : null),
    isQuotaExhausted: error instanceof ApiError && error.status === 402,
    refresh,
    filteredUnsafeCount,
    filteredAllergens,
    includeUnsafe,
    setIncludeUnsafe,
    total,
    totalPages,
    currentPage,
    setCurrentPage
  };
}

