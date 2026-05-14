import { createApiClient, ApiError } from '@wati/api-client';
import { CONFIG } from '../config';

export const api = createApiClient({ baseUrl: CONFIG.API_URL });
export { ApiError };
