const CACHE_NAME = 'finance-tracker-v3';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './chart.min.js',
  './fontawesome.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Don't cache non-successful responses
            if (!fetchResponse || fetchResponse.status !== 200) {
              return fetchResponse;
            }
            
            // Clone the response
            const responseToCache = fetchResponse.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return fetchResponse;
          })
          .catch(() => {
            // If network fails, return cached version
            return caches.match(event.request);
          });
      })
  );
});