// public/sw-mitus.js
// Versión "apagado": limpia caches antiguos y se desregistra.
// Se usa para desinstalar cualquier Service Worker previo que
// esté causando pantalla en blanco.

self.addEventListener('install', (event) => {
  // activarse inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // 1) Borrar todos los caches que haya creados versiones anteriores
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch (e) {
      // ignorar errores de limpieza
    }

    try {
      // 2) Desregistrar este Service Worker para futuras visitas
      await self.registration.unregister();
    } catch (e) {
      // ignorar errores de unregister
    }
  })());

  // Tomar control de las pestañas actuales para poder limpiar
  self.clients.claim();
});

// 3) No interceptamos NINGUNA petición
self.addEventListener('fetch', () => {
  // no-op
});
