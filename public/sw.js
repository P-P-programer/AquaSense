const CACHE_NAME = 'aquasense-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.php',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // Si falla el cache de assets estáticos, continúa igual
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
          if (cacheName !== CACHE_NAME) {
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

  // No cachear peticiones a API ni a rutas dinámicas
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) {
    return;
  }

  // Cache-first para assets estáticos
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request).then(res => {
          // Clonar ANTES de consumir el body
          const resClone = res.clone();
          
          // Cachear solo respuestas exitosas
          if (res.status === 200 && request.method === 'GET') {
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, resClone));
          }
          
          return res;
        }).catch(() => {
          // Si falla fetch y no hay cache, retorna offline page si existe
          return caches.match('/');
        })
      })
    );
  }
});