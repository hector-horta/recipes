// Re-export from @wati/api-client for backwards compatibility.
// New code should import directly from '@wati/api-client'.
import { createApiClient } from '@wati/api-client';
import { CONFIG } from '../config';

export { ApiError } from '@wati/api-client';
export type { ApiClient } from '@wati/api-client';

/**
 * Wati API Client — pre-configured instance using app CONFIG.
 * This maintains the exact same API as the original module.
 */
export const api = createApiClient({ baseUrl: CONFIG.API_URL });
