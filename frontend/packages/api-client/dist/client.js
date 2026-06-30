import { ApiError } from './errors';
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
export function createApiClient(config) {
    async function request(endpoint, options = {}) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${config.baseUrl}${cleanEndpoint}`;
        const fetchConfig = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        };
        try {
            const response = await fetch(url, fetchConfig);
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                }
                catch {
                    errorData = { error: 'Error desconocido en el servidor' };
                }
                throw new ApiError(response.status, errorData.error || response.statusText, errorData.code);
            }
            if (response.status === 204)
                return null;
            return response.json();
        }
        catch (err) {
            if (err instanceof ApiError)
                throw err;
            throw new ApiError(0, err instanceof Error ? err.message : 'Network Error');
        }
    }
    return {
        get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
        post: (endpoint, data, options) => request(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
        put: (endpoint, data, options) => request(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
        delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
    };
}
//# sourceMappingURL=client.js.map