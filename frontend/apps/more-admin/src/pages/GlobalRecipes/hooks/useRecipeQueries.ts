import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import type { Recipe, Tag } from '../types';

const mapRawToRecipe = (raw: any): Recipe => ({
  id: raw.id,
  title: raw.title_es,
  titleEn: raw.title_en,
  prepTimeMinutes: raw.prep_time_minutes || 0,
  cookTimeMinutes: raw.cook_time_minutes || 0,
  servings: raw.servings || 1,
  difficulty: raw.difficulty || 'medium',
  status: raw.status || 'draft',
  safetyLevel: raw.sibo_risk_level || 'safe',
  ingredients: raw.ingredients || [],
  instructions: Array.isArray(raw.steps)
    ? raw.steps.map((s: any) => typeof s === 'string' ? s : (s.instruction?.es || s.instruction || ''))
    : [],
  tags: Array.isArray(raw.tags)
    ? raw.tags.map((t: any) => typeof t === 'string' ? t : (t.key || t.es || ''))
    : [],
  imageUrl: raw.image_url || '',
  imageFilename: raw.image_filename || '',
  createdAt: raw.created_at
});

export const useRecipeQueries = (currentPage: number, pageSize: number, setTotalRecipes: (total: number) => void) => {
  const recipesQuery = useQuery({
    queryKey: ['global-recipes', currentPage, pageSize],
    queryFn: async () => {
      const data = await api.get<{ recipes: any[]; total: number }>(`/admin/recipes?number=${pageSize}&offset=${(currentPage - 1) * pageSize}`);
      setTotalRecipes(data.total || 0);
      return data.recipes.map(mapRawToRecipe);
    },
  });

  const tagsQuery = useQuery({
    queryKey: ['global-tags'],
    queryFn: () => api.get<Tag[]>('/admin/tags'),
  });

  return { recipesQuery, tagsQuery };
};
