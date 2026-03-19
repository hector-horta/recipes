const CACHE_NAME = 'wati-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  // Note: In a production build, these would be the hashed asset names from the dist folder.
  // For dev mode, we cache the source files that Vite serves.
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar SIEMPRE en desarrollo de Vite
  if (
    url.pathname.startsWith('/@') || 
    url.pathname.startsWith('/node_modules/') || 
    url.pathname.includes('.hot-update.') ||
    url.hostname === 'localhost' && !url.pathname.match(/\.(html|css|js|tsx|png|jpg|svg)$/) ||
    url.href.includes('spoonacular.com') || 
    url.href.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
