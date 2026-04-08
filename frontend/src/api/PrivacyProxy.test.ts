import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputSanitizer, SecureAPI } from './PrivacyProxy.js';

vi.mock('../db/db', () => ({
    db: {
        searchCache: {
            get: vi.fn().mockResolvedValue(null),
            put: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined)
        },
        cachedRecipes: {
            where: vi.fn(() => ({
                anyOf: vi.fn(() => ({ toArray: vi.fn(() => []) }))
            })),
            bulkPut: vi.fn().mockResolvedValue(undefined)
        }
    }
}));

vi.mock('../utils/imageCache', () => ({
    cacheRecipeImages: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../security/SecureVault', () => ({
    SecureVault: {
        loadProfile: vi.fn().mockReturnValue(null),
        fromUserProfile: vi.fn().mockReturnValue({})
    }
}));

vi.mock('./SecurityScrubber', () => ({
    SecurityScrubber: {
        analyze: vi.fn((recipe) => recipe)
    }
}));

vi.mock('dompurify', () => ({
    default: {
        sanitize: vi.fn((input) => input.replace(/<[^>]*>/g, ''))
    }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('InputSanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('clean', () => {
    it('should remove dangerous characters', () => {
      expect(InputSanitizer.clean("test'value")).toBe('testvalue');
      expect(InputSanitizer.clean('test"quote')).toBe('testquote');
      expect(InputSanitizer.clean('test;injection')).toBe('testinjection');
    });

    it('should remove SQL injection patterns', () => {
      expect(InputSanitizer.clean("'; DROP TABLE users;--")).toBe('DROP TABLE users--');
      expect(InputSanitizer.clean("1' OR '1'='1")).toBe('1 OR 11');
    });

    it('should remove XSS script tags', () => {
      expect(InputSanitizer.clean('<script>alert(1)</script>')).toBe('alert1');
    });

    it('should handle multiple dangerous patterns', () => {
      const malicious = "<script>' OR 1=1; DROP TABLE--</script>";
      expect(InputSanitizer.clean(malicious)).toBe('OR 11 DROP TABLE--');
    });

    it('should trim whitespace', () => {
      expect(InputSanitizer.clean('  test  ')).toBe('test');
    });

    it('should handle empty strings', () => {
      expect(InputSanitizer.clean('')).toBe('');
      expect(InputSanitizer.clean('   ')).toBe('');
    });

    it('should preserve safe characters', () => {
      expect(InputSanitizer.clean('hello-world')).toBe('hello-world');
      expect(InputSanitizer.clean('test_underscore')).toBe('test_underscore');
      expect(InputSanitizer.clean('normal text')).toBe('normal text');
    });

    it('should remove curly braces', () => {
      expect(InputSanitizer.clean('test{}')).toBe('test');
    });

    it('should remove dollar signs', () => {
      expect(InputSanitizer.clean('$100')).toBe('100');
    });

    it('should handle unicode characters', () => {
      expect(InputSanitizer.clean('tëst')).toBe('tëst');
      expect(InputSanitizer.clean('日本語')).toBe('日本語');
    });

    it('should handle very long strings', () => {
      const long = 'a'.repeat(10000);
      const result = InputSanitizer.clean(long);
      expect(result).toBe(long);
    });
  });
});

describe('SecureAPI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should sanitize input query', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test<script>');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('query=test'),
            expect.any(Object)
        );
    });

    it('should throw error on non-ok response', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        await expect(SecureAPI.fetchSafeRecipes('test')).rejects.toThrow('[Network] Petición abortada.');
    });

    it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(SecureAPI.fetchSafeRecipes('test')).rejects.toThrow('Network error');
    });

    it('should include auth token when available', async () => {
        localStorage.setItem('wati_jwt', 'test-token');
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/recipes'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-token'
                })
            })
        );
    });

    it('should apply extra params to request', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test', undefined, false, { number: '20', sort: 'random' });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('number=20'),
            expect.any(Object)
        );
    });

    it('should check cache when forceRefresh is false', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test', undefined, false);

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip cache when forceRefresh is true', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test', undefined, true);

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should skip cache when sort is random', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test', undefined, false, { sort: 'random' });

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should use default number of 10 when not specified', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('number=10'),
            expect.any(Object)
        );
    });

    it('should use external profile when provided', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1, title_es: 'Test' }]
        });

        await SecureAPI.fetchSafeRecipes('test', { allergies: ['peanuts'], intolerances: [], conditions: [], severities: {} });

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should return empty array when API returns empty', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const result = await SecureAPI.fetchSafeRecipes('nonexistent');

        expect(result).toEqual([]);
    });

    it('should return recipes when API returns data', async () => {
        const mockRecipes = [
            { id: 1, title_es: 'Recipe 1', ingredients: [] },
            { id: 2, title_es: 'Recipe 2', ingredients: [] }
        ];
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRecipes
        });

        const result = await SecureAPI.fetchSafeRecipes('test');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
    });

    it('should handle missing extraParams gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('test');

        expect(mockFetch).toHaveBeenCalled();
    });

    it('should build correct URL with query param', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        await SecureAPI.fetchSafeRecipes('pasta carbonara');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('query=pasta+carbonara'),
            expect.any(Object)
        );
    });

    it('should return cached recipes when cache hit', async () => {
        const cachedData = [
            { id: '1', data: { id: 1, title_es: 'Cached Recipe', ingredients: [{ name: 'Sugar' }] } },
            { id: '2', data: { id: 2, title_es: 'Cached Recipe 2', ingredients: [{ name: 'Salt' }] } }
        ];

        const { db } = await import('../db/db');
        db.searchCache.get = vi.fn().mockResolvedValue({
            query: 'test',
            results: ['1', '2']
        });
        db.cachedRecipes.where = vi.fn().mockReturnValue({
            anyOf: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue(cachedData)
            })
        });

        const result = await SecureAPI.fetchSafeRecipes('test');

        expect(result).toHaveLength(2);
        expect(result[0].title_es).toBe('Cached Recipe');
    });

    it('should clear cache when cached recipes count mismatches', async () => {
        const { db } = await import('../db/db');
        db.searchCache.get = vi.fn().mockResolvedValue({
            query: 'test',
            results: ['1', '2', '3']
        });
        db.cachedRecipes.where = vi.fn().mockReturnValue({
            anyOf: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([
                    { id: '1', data: { id: 1, title_es: 'Recipe 1', ingredients: [] } }
                ])
            })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1, title_es: 'New Recipe', ingredients: [] }]
        });

        await SecureAPI.fetchSafeRecipes('test');

        expect(db.searchCache.delete).toHaveBeenCalled();
    });

    it('should fetch from API when cache has old schema', async () => {
        const { db } = await import('../db/db');
        db.searchCache.get = vi.fn().mockResolvedValue({
            query: 'test',
            results: ['1']
        });
        db.cachedRecipes.where = vi.fn().mockReturnValue({
            anyOf: vi.fn().mockReturnValue({
                toArray: vi.fn().mockResolvedValue([
                    { id: '1', data: { id: 1, title_es: 'Old Recipe' } }
                ])
            })
        });

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 1, title_es: 'New Recipe', ingredients: [] }]
        });

        await SecureAPI.fetchSafeRecipes('test');

        expect(mockFetch).toHaveBeenCalled();
    });
});