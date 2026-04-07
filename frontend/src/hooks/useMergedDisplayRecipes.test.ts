import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMergedDisplayRecipes } from './useMergedDisplayRecipes';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key === 'recipe.favorite' ? 'Favorite' : key
    })
}));

describe('useMergedDisplayRecipes', () => {
    const mockRecipes = [
        { id: '1', title: 'Recipe 1', imageUrl: '/img1.jpg', prepTimeMinutes: 20, estimatedCost: 2, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] },
        { id: '2', title: 'Recipe 2', imageUrl: '/img2.jpg', prepTimeMinutes: 30, estimatedCost: 3, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] },
        { id: '3', title: 'Recipe 3', imageUrl: '/img3.jpg', prepTimeMinutes: 25, estimatedCost: 2, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] },
    ];

    const mockFavorites = [
        { id: 'f1', user_id: 'u1', recipe_id: 'fav1', title: 'Favorite Recipe', image: '/fav.jpg' }
    ];

    it('should return only recipes in search mode', () => {
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: mockFavorites,
            isSearchActive: true,
            currentPage: 1
        }));

        expect(result.current.displayRecipes).toEqual(mockRecipes);
        expect(result.current.totalPages).toBe(1);
    });

    it('should merge favorites with recipes when not searching', () => {
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: mockFavorites,
            isSearchActive: false,
            currentPage: 1,
            itemsPerPage: 10
        }));

        expect(result.current.displayRecipes).toHaveLength(4);
        expect(result.current.displayRecipes[0].id).toBe('fav1');
        expect(result.current.displayRecipes[0].siboAllergiesTags).toContainEqual({ es: 'Favorite', en: 'Favorite' });
    });

    it('should fill remaining slots with recipes when favorites < itemsPerPage', () => {
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: [mockFavorites[0]],
            isSearchActive: false,
            currentPage: 1,
            itemsPerPage: 5
        }));

        expect(result.current.displayRecipes).toHaveLength(4);
        expect(result.current.displayRecipes[0].id).toBe('fav1');
        expect(result.current.displayRecipes[1].id).toBe('1');
    });

    it('should exclude favorited recipes from recommendations', () => {
        const favRecipe = mockRecipes[0];
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: [{ id: 'f1', user_id: 'u1', recipe_id: favRecipe.id, title: favRecipe.title, image: '/fav.jpg' }],
            isSearchActive: false,
            currentPage: 1,
            itemsPerPage: 10
        }));

        const displayedIds = result.current.displayRecipes.map(r => r.id);
        expect(displayedIds).not.toContain(favRecipe.id);
    });

    it('should paginate favorites only when favorites >= itemsPerPage', () => {
        const manyFavorites = Array.from({ length: 15 }, (_, i) => ({
            id: `f${i}`,
            user_id: 'u1',
            recipe_id: `fav${i}`,
            title: `Favorite ${i}`,
            image: `/fav${i}.jpg`
        }));

        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: manyFavorites,
            isSearchActive: false,
            currentPage: 2,
            itemsPerPage: 10
        }));

        expect(result.current.displayRecipes).toHaveLength(10);
        expect(result.current.totalPages).toBe(2);
    });

    it('should handle empty favorites', () => {
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: mockRecipes,
            favorites: [],
            isSearchActive: false,
            currentPage: 1
        }));

        expect(result.current.displayRecipes).toEqual(mockRecipes);
        expect(result.current.totalPages).toBe(0);
    });

    it('should handle empty recipes in non-search mode', () => {
        const { result } = renderHook(() => useMergedDisplayRecipes({
            recipes: [],
            favorites: mockFavorites,
            isSearchActive: false,
            currentPage: 1
        }));

        expect(result.current.displayRecipes).toHaveLength(1);
        expect(result.current.displayRecipes[0].id).toBe('fav1');
    });
});
