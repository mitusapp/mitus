// public/sw-mitus.js
const THUMBS = 'mitus-thumbs-v1';
const WEB    = 'mitus-web-v1';
const APP_SHELL = 'app-shell-v2'; // ⬅️ bump para forzar index nuevo
const MAX_THUMBS = 5000;
const MAX_WEB    = 1500;

// Limitar tamaño del cache (naive LRU)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('install', (event) => {
  // Precargar el "app shell" para navegación offline (siempre el index ACTUAL)
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(APP_SHELL);
      const res = await fetch('/index.html', { cache: 'no-store' });
      if (res.ok) await cache.put('/index.html', res.clone());
    } catch (e) {
      // ignora errores de precache (no bloquea la instalación)
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purga caches viejos de app-shell u otros desconocidos
  event.waitUntil((async () => {
    const keep = new Set([THUMBS, WEB, APP_SHELL]);
    const names = await caches.keys();
    await Promise.all(
      names.map((n) => (keep.has(n) ? Promise.resolve() : caches.delete(n)))
    );
  })());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Navegaciones SPA: si no hay red, servir index.html desde caché
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Evita servir un index antiguo por caches intermedios
        return await fetch(req, { cache: 'no-store' });
      } catch {
        const cache = await caches.open(APP_SHELL);
        const cached = await cache.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // 2) Solo manejamos GET para recursos
  if (req.method !== 'GET') return;

  // 3) Cache de imágenes: Storage público (Supabase) y portadas Unsplash
  const isStorage = url.pathname.includes('/storage/v1/object/public/event-media/');
  const isUnsplash = url.hostname === 'images.unsplash.com';
  const isImageExt = /\.(webp|avif|jpg|jpeg|png|gif)$/i.test(url.pathname);

  // Si no es Storage ni (Unsplash + extensión de imagen) → no intervenimos
  if (!isStorage && !(isUnsplash && isImageExt)) return;

  // Distinguir thumbs y web (-t.webp / -w.webp) solo para Storage (en Unsplash no aplica)
  const isThumb   = isStorage && url.pathname.endsWith('-t.webp');
  const cacheName = isThumb ? THUMBS : WEB;
  const maxEntries = isThumb ? MAX_THUMBS : MAX_WEB;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);

    // 3.1 Cache first
    const cached = await cache.match(req);
    if (cached) return cached;

    // 3.2 Network → cache (permite opaque para CORS)
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === 'opaque')) {
        try {
          await cache.put(req, resp.clone());
          await trimCache(cacheName, maxEntries);
        } catch (_) { /* ignore put/trim errors */ }
      }
      return resp;
    } catch {
      // 3.3 Sin red y no está en caché
      return Response.error();
    }
  })());
});
