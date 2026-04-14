import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../AuthContext';
import { trackEvent } from '../utils/analytics';

export interface FavoriteItem {
  id: string;
  user_id: string;
  recipe_id: string;
  title: string;
  image: string;
}

const authHeaders = () => ({});

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id, user?.intolerances, user?.severities],
    queryFn: async () => {
      if (!user) return [];
      const res = await fetch(`/api/favorites`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      return res.json() as Promise<FavoriteItem[]>;
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async (recipe: { id: string; title: string; imageUrl: string }) => {
      const res = await fetch(`/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          recipeId: recipe.id,
          title: recipe.title,
          image: recipe.imageUrl
        })
      });
      if (!res.ok) throw new Error('Failed to toggle favorite');
      return res.json();
    },
    onSuccess: (data, recipe) => {
      // Event Tracking
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
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id, user?.intolerances, user?.severities] });
      const previous = queryClient.getQueryData<FavoriteItem[]>(['favorites', user?.id, user?.intolerances, user?.severities]) ?? [];
      const exists = previous.some(f => f.recipe_id === recipe.id);

      queryClient.setQueryData<FavoriteItem[]>(['favorites', user?.id, user?.intolerances, user?.severities], prev => {
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
        queryClient.setQueryData(['favorites', user?.id, user?.intolerances, user?.severities], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id, user?.intolerances, user?.severities] });
    },
  });

  const isFavorited = (recipeId: string) => {
    return favorites.some(f => f.recipe_id === recipeId);
  };

  return {
    favorites,
    isLoading,
    toggleFavorite: toggleMutation.mutateAsync,
    isFavorited,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] })
  };
}
