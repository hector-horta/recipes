import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHomeData, useRandomRecipes } from './useHomeData';
import { useAuth } from '../AuthContext';

vi.mock('../AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn()
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHomeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch top favorites when user is not logged in', async () => {
    const mockUser = null;
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
    
    const mockResponse = {
      type: 'top_favorites',
      recipes: [
        { id: '1', title: 'Recipe 1', imageUrl: '/img1.jpg', prepTimeMinutes: 20, estimatedCost: 2, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useHomeData(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.topFavorites).toHaveLength(1);
    });
  });

  it('should return empty community favorites when not logged in', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => useHomeData(), { wrapper: createWrapper() });

    expect(result.current.communityFavorites).toEqual([]);
    expect(result.current.userFavoriteIds).toBeUndefined();
  });

  it('should fetch community favorites when user is logged in', async () => {
    const mockUser = { id: 'user-1', displayName: 'Test User' };
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as any);
    
    const mockResponse = {
      type: 'community_favorites',
      recipes: [
        { id: '1', title: 'Popular Recipe', imageUrl: '/img1.jpg', prepTimeMinutes: 20, estimatedCost: 2, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] }
      ],
      userFavoriteIds: ['1']
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useHomeData(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.communityFavorites).toHaveLength(1);
      expect(result.current.userFavoriteIds).toContain('1');
    });
  });

  it('should handle empty top favorites response', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    
    const mockResponse = { type: 'top_favorites', recipes: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useHomeData(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.topFavorites).toEqual([]);
    });
  });

  it('should set isLoading correctly', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as any);
    
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useHomeData(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});

describe('useRandomRecipes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch random recipes', async () => {
    const mockResponse = {
      type: 'random',
      recipes: [
        { id: '1', title: 'Random Recipe', imageUrl: '/img1.jpg', prepTimeMinutes: 20, estimatedCost: 2, ingredients: [], instructions: [], summary: '', safetyLevel: 'safe' as const, siboAllergiesTags: [] }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useRandomRecipes(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.randomRecipes).toHaveLength(1);
    });
  });

  it('should return empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useRandomRecipes(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.randomRecipes).toEqual([]);
    });
  });

  it('should have refresh function', async () => {
    const mockResponse = { type: 'random', recipes: [] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useRandomRecipes(), { wrapper: createWrapper() });

    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should return isLoading state', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useRandomRecipes(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });
});