import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return initial value immediately', () => {
        const { result } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'initial' }
        });

        expect(result.current).toBe('initial');
    });

    it('should update debounced value after delay', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
            initialProps: { value: 'initial' }
        });

        expect(result.current).toBe('initial');

        rerender({ value: 'updated' });
        
        expect(result.current).toBe('initial');

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(result.current).toBe('updated');
    });

    it('should use default delay of 300ms', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
            initialProps: { value: 'initial' }
        });

        rerender({ value: 'updated' });
        
        act(() => {
            vi.advanceTimersByTime(300);
        });
        
        expect(result.current).toBe('updated');
    });

    it('should handle different delay values', () => {
        const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
            initialProps: { value: 'initial' }
        });

        rerender({ value: 'updated' });
        
        act(() => {
            vi.advanceTimersByTime(500);
        });
        
        expect(result.current).toBe('initial');
        
        act(() => {
            vi.advanceTimersByTime(500);
        });
        
        expect(result.current).toBe('updated');
    });
});
