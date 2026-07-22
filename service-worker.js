// Popcorn Beauty Wireless — Service Worker
//
// IMPORTANT DESIGN NOTE: this app gets updated frequently (new features, bug fixes), and
// stale cached versions have been a real, repeated problem during development. This
// service worker is deliberately built "network-first" for the app shell — it always
// tries to fetch the latest index.html/app code from the network first, and only falls
// back to a cached copy if the network is unreachable (i.e. actually offline). That's the
// opposite of a typical "cache-first for speed" PWA setup, traded off on purpose so a
// deployed fix is never invisible behind a stale cache.

// Bump this string on every deploy that changes cached file contents. Old caches are
// deleted automatically on activate, so bumping this is what forces a clean slate.
const CACHE_VERSION = 'pb-wireless-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate this new service worker as soon as it finishes installing, instead of
  // waiting for every open tab to close first.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  // Take control of any already-open tabs immediately, rather than only new page loads.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Successful network fetch — cache a copy for offline fallback, then serve it.
        const copy = networkResponse.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        return networkResponse;
      })
      .catch(() =>
        // Network failed (actually offline) — fall back to whatever's cached.
        caches.match(event.request).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
