import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureAPI } from './PrivacyProxy';
import { db } from '../db/db';
vi.mock('../db/db', () => ({
    db: {
        searchCache: {
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn()
        },
        cachedRecipes: {
            where: vi.fn().mockReturnValue({
                anyOf: vi.fn().mockReturnValue({
                    toArray: vi.fn()
                })
            }),
            bulkPut: vi.fn()
        }
    }
}));

vi.mock('./SecurityScrubber', () => ({
    SecurityScrubber: {
        analyze: vi.fn(recipe => recipe)
    }
}));

// Mock fetch
global.fetch = vi.fn();

describe('PrivacyProxy - Search Caching', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return results from cache if query exists', async () => {
        const mockQuery = 'dessert';
        const mockIds = ['1', '2'];
        const mockRecipes = [
            { id: '1', data: { id: '1', ingredients: [] } },
            { id: '2', data: { id: '2', ingredients: [] } }
        ];

        (db.searchCache.get as any).mockResolvedValue({ query: mockQuery, results: mockIds });
        (db.cachedRecipes.where('').anyOf([]).toArray as any).mockResolvedValue(mockRecipes);

        const results = await SecureAPI.fetchSafeRecipes(mockQuery);

        expect(db.searchCache.get).toHaveBeenCalledWith(mockQuery);
        expect(results).toHaveLength(2);
        expect(results[0].id).toBe('1');
    });

    it('should fetch from API if cache is empty and save to cache', async () => {
        const mockQuery = 'pizza';
        const apiData = [{ id: 101, title: 'Pizza Margherita' }];
        
        (db.searchCache.get as any).mockResolvedValue(null);
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => apiData
        });

        const results = await SecureAPI.fetchSafeRecipes(mockQuery);

        expect(global.fetch).toHaveBeenCalled();
        expect(db.cachedRecipes.bulkPut).toHaveBeenCalled();
        expect(db.searchCache.put).toHaveBeenCalledWith(expect.objectContaining({
            query: mockQuery,
            results: ['101']
        }));
        expect(results).toHaveLength(1);
    });

    it('should handle cache collision correctly (different queries same recipe)', async () => {
        // Query A -> [Recipe 1]
        // Query B -> [Recipe 1, Recipe 2]
        
        const queryA = 'dess';
        const queryB = 'dessert';

        // Mocking behavior for Query A then Query B
        (db.searchCache.get as any).mockResolvedValue(null);
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1 }]
        });

        await SecureAPI.fetchSafeRecipes(queryA);
        
        expect(db.searchCache.put).toHaveBeenCalledWith(expect.objectContaining({
            query: queryA,
            results: ['1']
        }));

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1 }, { id: 2 }]
        });

        await SecureAPI.fetchSafeRecipes(queryB);

        expect(db.searchCache.put).toHaveBeenCalledWith(expect.objectContaining({
            query: queryB,
            results: ['1', '2']
        }));
    });

    it('should handle random sorting (no cache)', async () => {
        const mockQuery = 'healthy';
        const apiData = [{ id: 202, title: 'Salad' }];

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => apiData
        });

        // Test with isRandom = true
        await SecureAPI.fetchSafeRecipes(mockQuery, undefined, false, { sort: 'random' });

        expect(db.searchCache.put).not.toHaveBeenCalled();
    });
});

