// Service worker mínimo — solo existe para que el navegador permita
// instalar esta página como app. No cachea nada ni intercepta datos.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No se intercepta nada — todas las peticiones van directo a la red.
});
