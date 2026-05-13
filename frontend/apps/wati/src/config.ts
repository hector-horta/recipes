let apiUrl = import.meta.env.VITE_API_URL || '/api';

// If running in the browser and the URL is the docker internal network,
// fallback to the local proxy path.
if (typeof window !== 'undefined' && apiUrl.includes('backend:')) {
  apiUrl = '/api';
}

export const CONFIG = {
  API_URL: apiUrl,
  BASE_URL: apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) || '' : apiUrl,
  IS_PRODUCTION: import.meta.env.PROD,
  VERSION: '1.0.0',
};
