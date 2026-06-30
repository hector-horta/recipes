import type { ApiClientConfig } from '@wati/types';
import { ApiError } from './errors';

/**
 * API client instance with typed HTTP methods.
 */
export interface ApiClient {
  get: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  delete: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

/**
 * Factory function to create a configured API client.
 * Each app provides its own baseUrl via config.
 *
 * @example
 * ```ts
 * import { createApiClient } from '@wati/api-client';
 * const api = createApiClient({ baseUrl: '/api' });
 * const recipes = await api.get<Recipe[]>('/recipes');
 * ```
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${config.baseUrl}${cleanEndpoint}`;

    const fetchConfig: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include' as RequestCredentials,
    };

    try {
      const response = await fetch(url, fetchConfig);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Error desconocido en el servidor' };
        }

        throw new ApiError(
          response.status,
          errorData.error || response.statusText,
          errorData.code
        );
      }

      if (response.status === 204) return null as any;
      return response.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, err instanceof Error ? err.message : 'Network Error');
    }
  }

  return {
    get: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),

    put: <T>(endpoint: string, data?: any, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),

    delete: <T>(endpoint: string, options?: RequestInit) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
  };
}
