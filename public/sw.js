// Minimal app-shell service worker: stale-while-revalidate for static assets (so the app opens
// instantly and works offline once visited), always-network for /api/* (coaching calls need a
// live round trip and must never serve stale/cached advice).
const CACHE = 'lc-shell-v2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/icons.js',
  '/js/effects.js',
  '/js/radar.js',
  '/js/app.js',
  '/js/sphere3d.js',
  '/js/orb3d.js',
  '/js/vendor/three.module.min.js',
  '/manifest.json',
  '/data/topics.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
