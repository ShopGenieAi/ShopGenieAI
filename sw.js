// ShopGenieAI — Service Worker
// Cache the app shell for offline/fast load. API calls always go to network.

const CACHE_NAME = 'sgai-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for shell ──────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for API calls and external resources
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return; // Let the browser handle it normally
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache valid GET responses for shell pages
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
