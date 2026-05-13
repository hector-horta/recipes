import { createApiClient, ApiError } from '@wati/api-client';
import { CONFIG } from '../config';

// Wati-specific API instance configured with its baseUrl
export const api = createApiClient({ baseUrl: CONFIG.API_URL });
export { ApiError };
