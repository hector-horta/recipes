import type { ApiClientConfig } from '@wati/types';
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
export declare function createApiClient(config: ApiClientConfig): ApiClient;
//# sourceMappingURL=client.d.ts.map