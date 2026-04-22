import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheImage, getCachedImage, getImageSource, cacheRecipeImages } from './imageCache';
import { db } from '../db/db';

vi.mock('../db/db', () => ({
    db: {
        cachedImages: {
            get: vi.fn(),
            put: vi.fn()
        }
    }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('imageCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('cacheImage', () => {
        it('should return null for empty URL', async () => {
            const result = await cacheImage('');
            expect(result).toBe(null);
        });

        it('should return cached image if exists', async () => {
            (db.cachedImages.get as any).mockResolvedValue({ base64: 'data:image/jpeg;base64,abc123' });

            const result = await cacheImage('https://example.com/image.jpg');

            expect(result).toBe('data:image/jpeg;base64,abc123');
            expect(db.cachedImages.get).toHaveBeenCalledWith('https://example.com/image.jpg');
        });

        it('should fetch and cache image if not in cache', async () => {
            (db.cachedImages.get as any).mockResolvedValue(null);
            
            const mockBlob = new Blob(['image data'], { type: 'image/jpeg' });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                blob: async () => mockBlob
            });

            const result = await cacheImage('https://example.com/image.jpg');

            expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg');
            expect(db.cachedImages.put).toHaveBeenCalled();
            expect(result).toMatch(/^data:image\/jpeg;base64,/);
        });

        it('should return null on fetch error', async () => {
            (db.cachedImages.get as any).mockResolvedValue(null);
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await cacheImage('https://example.com/image.jpg');

            expect(result).toBe(null);
        });

        it('should return null on non-OK response', async () => {
            (db.cachedImages.get as any).mockResolvedValue(null);
            mockFetch.mockResolvedValueOnce({ ok: false });

            const result = await cacheImage('https://example.com/image.jpg');

            expect(result).toBe(null);
        });
    });

    describe('getCachedImage', () => {
        it('should return null for empty URL', async () => {
            const result = await getCachedImage('');
            expect(result).toBe(null);
        });

        it('should return cached base64 if exists', async () => {
            (db.cachedImages.get as any).mockResolvedValue({ base64: 'data:image/png;base64,xyz789' });

            const result = await getCachedImage('https://example.com/image.png');

            expect(result).toBe('data:image/png;base64,xyz789');
        });

        it('should return null if not in cache', async () => {
            (db.cachedImages.get as any).mockResolvedValue(null);

            const result = await getCachedImage('https://example.com/image.png');

            expect(result).toBe(null);
        });

        it('should handle database errors gracefully', async () => {
            (db.cachedImages.get as any).mockRejectedValue(new Error('DB error'));

            const result = await getCachedImage('https://example.com/image.png');

            expect(result).toBe(null);
        });
    });

    describe('getImageSource', () => {
        it('should return empty string for undefined URL', async () => {
            const result = await getImageSource(undefined as any);
            expect(result).toBe('');
        });

        it('should return cached image if available', async () => {
            (db.cachedImages.get as any).mockResolvedValue({ base64: 'cached-data' });

            const result = await getImageSource('https://example.com/img.jpg');

            expect(result).toBe('cached-data');
        });

        it('should cache and return image if not cached', async () => {
            (db.cachedImages.get as any).mockResolvedValue(null);
            
            const mockBlob = new Blob(['data'], { type: 'image/jpeg' });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                blob: async () => mockBlob
            });

            await getImageSource('https://example.com/img.jpg');

            expect(db.cachedImages.put).toHaveBeenCalled();
        });

        it('should return original URL on cache failure', async () => {
            const url = 'https://example.com/fallback.jpg';
            (db.cachedImages.get as any).mockResolvedValue(null);
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await getImageSource(url);

            expect(result).toBe(url);
        });
    });

    describe('cacheRecipeImages', () => {
        it('should cache all unique image URLs from recipes', async () => {
            const recipes = [
                { imageUrl: 'https://example.com/1.jpg' },
                { imageUrl: 'https://example.com/2.jpg' },
                { imageUrl: 'https://example.com/1.jpg' },
                { imageUrl: null },
                { imageUrl: 'https://example.com/3.jpg' }
            ];

            (db.cachedImages.get as any).mockResolvedValue(null);
            mockFetch.mockResolvedValue({ ok: true, blob: async () => new Blob([]) });

            await cacheRecipeImages(recipes as any);

            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(mockFetch).toHaveBeenCalledWith('https://example.com/1.jpg');
            expect(mockFetch).toHaveBeenCalledWith('https://example.com/2.jpg');
            expect(mockFetch).toHaveBeenCalledWith('https://example.com/3.jpg');
        });

        it('should handle empty recipe array', async () => {
            await cacheRecipeImages([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should use Promise.allSettled to handle individual failures', async () => {
            const recipes = [
                { imageUrl: 'https://example.com/ok.jpg' },
                { imageUrl: 'https://example.com/fail.jpg' }
            ];

            mockFetch
                .mockResolvedValueOnce({ ok: true, blob: async () => new Blob([]) })
                .mockRejectedValueOnce(new Error('Failed'));

            await expect(cacheRecipeImages(recipes as any)).resolves.not.toThrow();
        });
    });
});
