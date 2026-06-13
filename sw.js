// Gezroni Service Worker — network-first with cache fallback
const CACHE_NAME = 'gezroni-v15-20260613-landing-v1.2';

const PRECACHE_URLS = [
  '/',
  '/src/styles/tokens.css',
  '/src/styles/screens.css',
  '/icons/web/32_favicon.png',
  '/icons/android/192.png',
  '/manifest.json',
];

// ── Install: pre-cache shell assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache ─────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests on the same origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache a clone of successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
