// Mamasar Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'mamasar-pwa-v1';

const STATIC_PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
];

// 1. Install Event: Cache Core App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches, enable navigation preload & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (_) {}
      }
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// 3. Fetch Event Strategy:
// - Non-GET requests: Network only
// - API calls (/api/*): Network only
// - HTML Page Navigation: Network-First (with Navigation Preload) -> Cache -> offline.html fallback
// - Static Assets (images, css, js, fonts): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Skip dynamic API and authenticated private routes from caching (Use preload or direct network)
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/masuk') ||
    url.pathname.startsWith('/buka-toko') ||
    url.pathname.startsWith('/daftar-kader') ||
    url.pathname.startsWith('/daftar-petugas')
  ) {
    if (request.mode === 'navigate') {
      event.respondWith(
        (async () => {
          try {
            const preload = await event.preloadResponse;
            if (preload) return preload;
          } catch (_) {}
          return fetch(request);
        })()
      );
    }
    return;
  }

  // Strategy A: HTML Page Navigations (Network-First -> Cache -> Offline Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          let preload = null;
          try {
            preload = await event.preloadResponse;
          } catch (_) {}

          const networkResponse = preload || (await fetch(request));
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        } catch (_) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match('/offline.html');
          return (
            offlinePage ||
            new Response('Sedang offline', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        }
      })()
    );
    return;
  }

  // Strategy B: Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.includes('/_astro/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
