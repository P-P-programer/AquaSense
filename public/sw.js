
// Manejar notificaciones push
self.addEventListener('push', event => {
  if (!event.data) return;

  let pushData;
  try {
    pushData = event.data.json();
  } catch (e) {
    pushData = {
      title: 'AquaSense',
      body: event.data.text() || 'Nueva notificación',
      icon: '/build/assets/icon-192.png',
      badge: '/build/assets/badge-72.png',
    };
  }

  const options = {
    body: pushData.body || '',
    icon: pushData.icon || '/build/assets/icon-192.png',
    badge: pushData.badge || '/build/assets/badge-72.png',
    tag: pushData.tag || 'aquasense-notification',
    requireInteraction: pushData.requireInteraction || false,
    data: pushData.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title, options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Buscar si ya hay una ventana abierta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }

      // Si no hay ventana, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
const swUrl = new URL(self.location.href);
const BUILD_VERSION = swUrl.searchParams.get('v') || 'dev';
const CACHE_VERSION = `aquasense-cache-${BUILD_VERSION}`;
const API_CACHE_VERSION = `aquasense-api-cache-${BUILD_VERSION}`;
const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon-192.png'
];
const API_CACHEABLE_PREFIXES = [
  '/api/stats',
  '/api/registros',
  '/api/alerts',
  '/api/cities',
  '/api/me/alert-preferences',
];

function isCacheableApiRequest(url, request) {
  if (request.method !== 'GET') return false;
  if (url.origin !== self.location.origin) return false;
  return API_CACHEABLE_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

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
          const isStaticCache = cacheName.startsWith('aquasense-cache-') && cacheName !== CACHE_VERSION;
          const isApiCache = cacheName.startsWith('aquasense-api-cache-') && cacheName !== API_CACHE_VERSION;

          if (isStaticCache || isApiCache) {
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

  if (url.pathname.startsWith('/sanctum/')) {
    return;
  }

  // API de lectura seleccionada: network-first con fallback a cache.
  if (isCacheableApiRequest(url, request)) {
    event.respondWith((async () => {
      const apiCache = await caches.open(API_CACHE_VERSION);

      try {
        const networkResponse = await fetch(request);

        if (networkResponse && networkResponse.ok) {
          await apiCache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (_) {
        const cached = await apiCache.match(request);
        if (cached) {
          return cached;
        }

        return new Response(
          JSON.stringify({ message: 'Sin conexión y sin cache disponible.' }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    })());

    return;
  }

  // Otras APIs no se cachean en SW.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  const isStaticAsset = url.pathname.startsWith('/build/assets/')
    || url.pathname === '/manifest.json'
    || url.pathname.endsWith('.png')
    || url.pathname.endsWith('.ico');

  if (isStaticAsset) {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);

        const networkFetch = fetch(request)
          .then(async response => {
            if (response && response.ok) {
              const responseToCache = response.clone();
              await cache.put(request, responseToCache);
            }

            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })());

    return;
  }

  // HTML y navegación: network-first para traer siempre versión nueva en deploy.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);

        if (response && response.ok) {
          const cache = await caches.open(CACHE_VERSION);
          const responseToCache = response.clone();
          await cache.put(request, responseToCache);
        }

        return response;
      } catch (error) {
        return caches.match(request) || caches.match('/');
      }
    })());
});