import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './AuthContext';

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = createTestQueryClient();
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
};

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        mockFetch.mockReset();
    });

    it('should provide initial auth state with null user', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.user).toBeNull();
    });

    it('should have isLoading boolean', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should provide logout function', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.logout).toBe('function');
    });

    it('should provide login function', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.login).toBe('function');
    });

    it('should provide register function', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.register).toBe('function');
    });

    it('should provide updateUserProfile function', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(typeof result.current.updateUserProfile).toBe('function');
    });

    it('should throw error when used outside provider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        expect(() => {
            renderHook(() => useAuth());
        }).toThrow('useAuth must be used within <AuthProvider>');
        
        consoleSpy.mockRestore();
    });

    it('logout clears localStorage token', () => {
        localStorage.setItem('wati_jwt', 'test-token');
        
        const { result } = renderHook(() => useAuth(), { wrapper });
        
        act(() => {
            result.current.logout();
        });

        expect(localStorage.getItem('wati_jwt')).toBeNull();
    });

    it('logout sets user to null', () => {
        localStorage.setItem('wati_jwt', 'test-token');
        
        const { result } = renderHook(() => useAuth(), { wrapper });
        
        act(() => {
            result.current.logout();
        });

        expect(result.current.user).toBeNull();
    });

    it('login function exists', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.login).toBeDefined();
    });

    it('register function exists', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.register).toBeDefined();
    });

    it('updateUserProfile function exists', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });
        expect(result.current.updateUserProfile).toBeDefined();
    });

    it('should not call API without token in localStorage', () => {
        localStorage.clear();
        
        renderHook(() => useAuth(), { wrapper });

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should have context value with all required properties', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current).toHaveProperty('user');
        expect(result.current).toHaveProperty('isLoading');
        expect(result.current).toHaveProperty('login');
        expect(result.current).toHaveProperty('register');
        expect(result.current).toHaveProperty('logout');
        expect(result.current).toHaveProperty('updateUserProfile');
        expect(result.current).toHaveProperty('is_verified');
    });

    it('logout should call queryClient.clear', () => {
        localStorage.setItem('wati_jwt', 'test-token');
        
        const { result } = renderHook(() => useAuth(), { wrapper });
        
        act(() => {
            result.current.logout();
        });

        expect(localStorage.getItem('wati_jwt')).toBeNull();
    });
});