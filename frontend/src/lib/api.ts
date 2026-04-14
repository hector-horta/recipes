import { CONFIG } from '../config';

/**
 * Wati API Client
 * Centraliza la lógica de peticiones, manejo de errores y seguridad (cookies).
 */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Use CONFIG.API_URL as the safe base
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${CONFIG.API_URL}${cleanEndpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include' as RequestCredentials, // Requerido para HttpOnly cookies
  };

  try {
    const response = await fetch(url, config);

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

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined }),
    
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
