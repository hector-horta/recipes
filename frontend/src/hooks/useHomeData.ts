import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Recipe } from '../types/recipe';

interface HomeData {
  type: string;
  recipes: Recipe[];
  userFavoriteIds?: string[];
}

async function fetchTopFavorites(): Promise<HomeData> {
  const res = await fetch('/api/home/top-favorites');
  if (!res.ok) throw new Error('Failed to fetch top favorites');
  return res.json();
}

async function fetchCommunityFavorites(): Promise<HomeData & { userFavoriteIds: string[] }> {
  const res = await fetch('/api/home/community-favorites');
  if (!res.ok) throw new Error('Failed to fetch community favorites');
  return res.json();
}

export function useHomeData() {
  const { user } = useAuth();
  
  const { data: topFavorites, isLoading: loadingTop } = useQuery({
    queryKey: ['home', 'top-favorites'],
    queryFn: fetchTopFavorites,
    staleTime: 1000 * 60 * 5,
  });

  const { data: communityFavorites, isLoading: loadingCommunity } = useQuery({
    queryKey: ['home', 'community-favorites'],
    queryFn: fetchCommunityFavorites,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = user ? (loadingTop || loadingCommunity) : loadingTop;

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).umami) return;
    if (topFavorites?.recipes) {
      (window as any).umami.track('home_top_favorites', {
        count: topFavorites.recipes.length,
        type: topFavorites.type
      });
    }
  }, [topFavorites]);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).umami) return;
    if (user && communityFavorites?.recipes) {
      (window as any).umami.track('home_community_favorites', {
        count: communityFavorites.recipes.length,
        userHasFavorited: (communityFavorites.userFavoriteIds?.length || 0) > 0
      });
    }
  }, [communityFavorites, user]);

  if (!user) {
    return {
      topFavorites: topFavorites?.recipes || [],
      communityFavorites: [],
      userFavorites: [],
      isLoading,
    };
  }

  return {
    topFavorites: communityFavorites?.recipes || [],
    communityFavorites: communityFavorites?.recipes || [],
    userFavorites: [],
    userFavoriteIds: communityFavorites?.userFavoriteIds || [],
    isLoading,
  };
}

export function useRandomRecipes() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['home', 'random'],
    queryFn: async () => {
      const res = await fetch('/api/home/random');
      if (!res.ok) throw new Error('Failed to fetch random recipes');
      const data = await res.json();
      return data.recipes as Recipe[];
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).umami) return;
    if (data) {
      (window as any).umami.track('home_random', {
        count: data.length
      });
    }
  }, [data]);

  const refresh = () => {
    (window as any).umami?.track('home_random_refresh');
    queryClient.invalidateQueries({ queryKey: ['home', 'random'] });
  };

  return {
    randomRecipes: data || [],
    isLoading,
    refresh,
  };
}