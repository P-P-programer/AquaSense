const swUrl = new URL(self.location.href);
const BUILD_VERSION = swUrl.searchParams.get('v') || 'dev';
const CACHE_VERSION = `aquasense-cache-${BUILD_VERSION}`;
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png'
];

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        console.log('[PWA] No se pudieron cachear todos los assets');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('aquasense-cache-') && cacheName !== CACHE_VERSION) {
            console.log('[PWA] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // No cachear peticiones a API, sanctum, o rutas dinámicas
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) {
    return;
  }

  const isStaticAsset = url.pathname.startsWith('/build/assets/')
    || url.pathname === '/manifest.json'
    || url.pathname.endsWith('.png')
    || url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(cache => {
        return cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(response => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }

            return response;
          }).catch(() => cached);

          return cached || networkFetch;
        });
      })
    );

    return;
  }

  // HTML y navegación: network-first para traer siempre versión nueva en deploy.
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.status === 200) {
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(request, res.clone());
          });
        }

        return res;
      })
      .catch(() => {
        return caches.match(request) || caches.match('/');
      })
  );
});