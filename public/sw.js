const CACHE_NAME = 'echoes-shell-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/altar-art.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (
            response.ok &&
            (request.destination === 'script' ||
              request.destination === 'worker' ||
              request.destination === 'style' ||
              request.destination === 'image' ||
              request.destination === 'font' ||
              request.destination === 'manifest' ||
              request.mode === 'navigate' ||
              url.pathname.endsWith('.wasm'))
          ) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (request.mode === 'navigate') {
            const cachedHtml = (await caches.match('/index.html')) || (await caches.match('/'));
            if (cachedHtml) return cachedHtml;
          }
          throw new Error('Offline and this asset is not cached yet.');
        });
    }),
  );
});
