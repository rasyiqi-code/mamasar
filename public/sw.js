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

// 2. Activate Event: Clean up outdated caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event Strategy:
// - Non-GET requests: Network only
// - API calls (/api/*): Network only
// - HTML Page Navigation: Network-First with cache fallback, then offline.html fallback
// - Static Assets (images, css, js, fonts): Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // Skip dynamic API and admin mutation routes from caching
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  // Strategy A: HTML Page Navigations (Network-First -> Cache -> Offline Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Sedang offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
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
