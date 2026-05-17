import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Recipe, Tag } from '../types';

export const useRecipeQueries = (currentPage: number, pageSize: number, setTotalRecipes: (total: number) => void) => {
  const recipesQuery = useQuery({
    queryKey: ['global-recipes', currentPage, pageSize],
    queryFn: async () => {
      const data = await api.get<{ recipes: Recipe[]; total: number }>(`/recipes?number=${pageSize}&offset=${(currentPage - 1) * pageSize}`);
      setTotalRecipes(data.total || 0);
      return data.recipes;
    },
  });

  const tagsQuery = useQuery({
    queryKey: ['global-tags'],
    queryFn: () => api.get<Tag[]>('/admin/tags'),
  });

  return { recipesQuery, tagsQuery };
};
