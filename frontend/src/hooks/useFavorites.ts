import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../utils/analytics';
import { api, ApiError } from '../lib/api';

export interface FavoriteItem {
  id: string;
  user_id: string;
  recipe_id: string;
  title: string;
  image: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['favorites', user?.id, user?.intolerances, user?.severities];

  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return [];
      try {
        return await api.get<FavoriteItem[]>('/favorites');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return [];
        throw err;
      }
    },
    enabled: !!user,
    retry: 1,
  });

  const toggleMutation = useMutation({
    mutationFn: async (recipe: { id: string; title: string; imageUrl: string }) => {
      return await api.post<{ favorited: boolean }>('/favorites', {
        recipeId: recipe.id,
        title: recipe.title,
        image: recipe.imageUrl
      });
    },
    onSuccess: (data, recipe) => {
      if (data?.favorited) {
        trackEvent('recipe_favorited', {
          title: recipe.title,
          id: recipe.id
        });
      } else {
        trackEvent('recipe_unfavorited', {
          title: recipe.title,
          id: recipe.id
        });
      }
    },
    onMutate: async (recipe) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FavoriteItem[]>(queryKey) ?? [];
      const exists = previous.some(f => f.recipe_id === recipe.id);

      queryClient.setQueryData<FavoriteItem[]>(queryKey, prev => {
        if (!prev) return [];
        if (exists) {
          return prev.filter(f => f.recipe_id !== recipe.id);
        }
        return [{
          recipe_id: recipe.id,
          title: recipe.title,
          image: recipe.imageUrl,
          id: Date.now().toString(),
          user_id: user!.id
        } as FavoriteItem, ...prev];
      });

      return { previous };
    },
    onError: (_err, _recipe, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const isFavorited = (recipeId: string) => {
    return favorites.some(f => f.recipe_id === recipeId);
  };

  return {
    favorites,
    isLoading,
    error: error instanceof ApiError ? error.message : (error instanceof Error ? error.message : null),
    toggleFavorite: toggleMutation.mutateAsync,
    isFavorited,
    refresh: () => queryClient.invalidateQueries({ queryKey })
  };
}
