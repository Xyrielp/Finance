// Service worker disabled to prevent refresh issues
// Will be re-enabled after fixing compatibility
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});