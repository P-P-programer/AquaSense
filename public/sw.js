// Versión del cache basada en timestamp (se actualiza en cada deploy)
const CACHE_VERSION = 'aquasense-cache-' + new Date().toISOString().split('T')[0];
const URLS_TO_CACHE = [
  '/',
  '/index.php',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png'
];

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
          // Eliminar caches antiguos (no del día actual)
          if (!cacheName.includes(new Date().toISOString().split('T')[0])) {
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
  const url = new URL(request.url);

  // No cachear peticiones a API, sanctum, o rutas dinámicas
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) {
    return;
  }

  if (request.method === 'GET') {
    // Para archivos con hash (assets de Vite como .js?v=xxx, .css?v=xxx)
    // Usar stale-while-revalidate: sirve del caché inmediatamente, actualiza en background
    if (/\.(js|css)(\?.*)?$/.test(url.pathname) && url.search.includes('v=')) {
      event.respondWith(
        caches.open(CACHE_VERSION).then(cache => {
          return cache.match(request).then(response => {
            const fetchPromise = fetch(request).then(res => {
              const resClone = res.clone();
              if (res.status === 200) {
                cache.put(request, resClone);
              }
              return res;
            }).catch(() => response);
            return response || fetchPromise;
          });
        })
      );
    }
    // Para HTML y otros recursos dinámicos, usar network-first
    // Intenta la red primero, cae al caché si falla
    else {
      event.respondWith(
        fetch(request)
          .then(res => {
            const resClone = res.clone();
            if (res.status === 200) {
              caches.open(CACHE_VERSION).then(cache => {
                cache.put(request, resClone);
              });
            }
            return res;
          })
          .catch(() => {
            return caches.match(request) || caches.match('/');
          })
      );
    }
  }
});