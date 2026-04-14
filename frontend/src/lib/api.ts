/**
 * Wati API Client
 * Centraliza la lógica de peticiones, manejo de errores y seguridad (cookies).
 */

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include' as RequestCredentials, // Requerido para HttpOnly cookies
  };

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

  // Si no hay contenido (204 No Content), devolver null
  if (response.status === 204) return null as any;

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),
    
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
