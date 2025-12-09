// public/sw-mitus.js

// Nombres de los caches (subo versión para invalidar los viejos)
const THUMBS    = 'mitus-thumbs-v2';
const WEB       = 'mitus-web-v2';
const APP_SHELL = 'app-shell-v3';
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
  // Precarga opcional del index actual (solo para fallback offline)
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(APP_SHELL);
      const res = await fetch('/index.html', { cache: 'no-store' });
      if (res.ok) await cache.put('/index.html', res.clone());
    } catch (e) {
      // No bloquea la instalación
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borrar TODOS los caches que no sean los actuales
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

  // 1) Navegaciones: NO tocamos nada, dejamos que pase directo a red
  if (req.mode === 'navigate') {
    return; // no event.respondWith → el SW no interfiere
  }

  // 2) Solo manejamos GET
  if (req.method !== 'GET') return;

  // 3) Cache de imágenes: Supabase Storage y Unsplash
  const isStorage = url.pathname.includes('/storage/v1/object/public/event-media/');
  const isUnsplash = url.hostname === 'images.unsplash.com';
  const isImageExt = /\.(webp|avif|jpg|jpeg|png|gif)$/i.test(url.pathname);

  if (!isStorage && !(isUnsplash && isImageExt)) {
    // Cualquier otra cosa (JS, CSS, fuentes, etc.) → no la tocamos
    return;
  }

  // Distinguir thumbs y web solo para Storage
  const isThumb   = isStorage && url.pathname.endsWith('-t.webp');
  const cacheName = isThumb ? THUMBS : WEB;
  const maxEntries = isThumb ? MAX_THUMBS : MAX_WEB;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);

    // Cache first
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === 'opaque')) {
        try {
          await cache.put(req, resp.clone());
          await trimCache(cacheName, maxEntries);
        } catch (_) {}
      }
      return resp;
    } catch {
      return Response.error();
    }
  })());
});
