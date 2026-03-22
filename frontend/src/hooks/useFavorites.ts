import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

export interface FavoriteItem {
  id: string;
  user_id: string;
  spoonacular_id: number;
  title: string;
  image: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('wati_jwt');
      const res = await fetch(`${API_URL}/api/favorites`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error('[useFavorites] Error fetching:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const toggleFavorite = async (recipe: { id: string | number; title: string, imageUrl: string }) => {
    if (!user) return false;

    const spoonacularId = Number(recipe.id);
    const token = localStorage.getItem('wati_jwt');
    
    try {
      const res = await fetch(`${API_URL}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          spoonacularId,
          title: recipe.title,
          image: recipe.imageUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistic / Local update
        if (data.favorited) {
            setFavorites(prev => [{
                spoonacular_id: spoonacularId,
                title: recipe.title,
                image: recipe.imageUrl,
                id: data.data.id,
                user_id: user.id
            } as FavoriteItem, ...prev]);
        } else {
            setFavorites(prev => prev.filter(f => f.spoonacular_id !== spoonacularId));
        }
        return data.favorited;
      }
    } catch (error) {
      console.error('[useFavorites] Error toggling:', error);
    }
    return false;
  };

  const isFavorited = (spoonacularId: string | number) => {
    return favorites.some(f => f.spoonacular_id === Number(spoonacularId));
  };

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    isLoading,
    toggleFavorite,
    isFavorited,
    refresh: fetchFavorites
  };
}
