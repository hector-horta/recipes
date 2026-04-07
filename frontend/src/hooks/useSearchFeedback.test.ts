import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchFeedback } from './useSearchFeedback';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSearchFeedback', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useSearchFeedback());

        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.submitted).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('should submit suggestion successfully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Suggestion recorded' })
        });

        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('pasta carbonara', 'user-123');
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term: 'pasta carbonara', userId: 'user-123' })
        });
        expect(result.current.submitted).toBe(true);
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('should handle submission error', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Server error' })
        });

        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('invalid term');
        });

        expect(result.current.error).toBe('Server error');
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.submitted).toBe(false);
    });

    it('should handle network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('test term');
        });

        expect(result.current.error).toBe('Network error');
    });

    it('should not submit empty terms', async () => {
        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('   ');
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.current.isSubmitting).toBe(false);
    });

    it('should reset state on reset', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ message: 'Success' })
        });

        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('test');
        });

        expect(result.current.submitted).toBe(true);

        act(() => {
            result.current.reset();
        });

        expect(result.current.submitted).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.isSubmitting).toBe(false);
    });

    it('should trim whitespace from term', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({})
        });

        const { result } = renderHook(() => useSearchFeedback());

        await act(async () => {
            await result.current.suggestToChef('  padded term  ');
        });

        expect(mockFetch).toHaveBeenCalledWith('/api/suggestions', expect.objectContaining({
            body: JSON.stringify({ term: 'padded term', userId: undefined })
        }));
    });
});
