let apiUrl = import.meta.env.VITE_API_URL || '/api';

// If running in the browser and the URL is the docker internal network or localhost:5001,
// fallback to the local proxy path '/api'.
if (typeof window !== 'undefined' && (apiUrl.includes('backend:') || apiUrl.includes('localhost:5001'))) {
  apiUrl = '/api';
} else {
  // Ensure we have the /api suffix if it's a full URL
  apiUrl = apiUrl.replace(/\/$/, '') + (apiUrl.endsWith('/api') ? '' : '/api');
}

export const CONFIG = {
  API_URL: apiUrl,
};
