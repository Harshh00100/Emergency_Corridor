// The build injects the hashed app assets and a versioned cache name.
const CACHE_NAME = 'emergency-corridor-shell-__CACHE_VERSION__';
const SHELL = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('emergency-corridor-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match('./index.html')).then((cached) => cached || fetch(request)));
    return;
  }
  // Same-origin immutable assets may be served with Vary: Origin by preview hosts.
  event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(request, { ignoreVary: true })).then((cached) => cached || fetch(request)));
});
