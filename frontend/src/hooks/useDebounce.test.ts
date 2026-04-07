import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'initial' }
        });

        expect(result.current).toBe('initial');
    });

    it('should update value after delay', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'initial' }
        });

        rerender({ value: 'updated' });
        
        expect(result.current).toBe('initial');

        vi.advanceTimersByTime(500);

        expect(result.current).toBe('updated');
    });

    it('should cancel previous timer when value changes rapidly', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'first' }
        });

        rerender({ value: 'second' });
        vi.advanceTimersByTime(300);
        
        rerender({ value: 'third' });
        vi.advanceTimersByTime(300);

        expect(result.current).toBe('first');

        vi.advanceTimersByTime(200);

        expect(result.current).toBe('third');
    });

    it('should handle different delay values', () => {
        const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
            initialProps: { value: 'test', delay: 1000 }
        });

        rerender({ value: 'updated', delay: 1000 });
        vi.advanceTimersByTime(500);
        expect(result.current).toBe('test');

        vi.advanceTimersByTime(500);
        expect(result.current).toBe('updated');
    });

    it('should cleanup timer on unmount', () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
        
        const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'test' }
        });

        rerender({ value: 'updated' });
        unmount();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});
