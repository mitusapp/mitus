// public/sw-mitus.js
const THUMBS = 'mitus-thumbs-v1';
const WEB    = 'mitus-web-v1';
const MAX_THUMBS = 5000;
const MAX_WEB    = 800;

// Limitar tamaño del cache (naive LRU)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo cachear recursos del Storage público
  const isStorage = url.pathname.includes('/storage/v1/object/public/event-media/');
  if (!isStorage || event.request.method !== 'GET') return;

  // Distinguir thumbs y web por nombre (-t.webp / -w.webp)
  const isThumb   = url.pathname.endsWith('-t.webp');
  const cacheName = isThumb ? THUMBS : WEB;
  const maxEntries = isThumb ? MAX_THUMBS : MAX_WEB;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);

    // 1) Si está en cache → devolverlo
    const cached = await cache.match(event.request);
    if (cached) return cached;

    // 2) Si no, ir a red y guardar (incluye respuestas opacas no-cors)
    try {
      const resp = await fetch(event.request);

      if (resp && (resp.ok || resp.type === 'opaque')) {
        try {
          await cache.put(event.request, resp.clone());
          await trimCache(cacheName, maxEntries);
        } catch (_) { /* ignore put/trim errors */ }
      }

      return resp;
    } catch (err) {
      // 3) Si falla la red y no hay cache, error (o puedes devolver un fallback)
      return Response.error();
    }
  })());
});
