CACHE_NAME = 'v2'; //caché actualizado para que cargue archivos como nuevos

const ASSETS = [
        './',           // index.html
        './estilos.css',
        './scripts.js',
        './fuente/OpenSans.woff2',
        //imágenes:
        './imagenes/arrastre.svg',
        './imagenes/biblioteca_nuevo.svg',
        './imagenes/escrituralibre_boton_enviar.svg',
        './imagenes/menuapp_cerrar.svg',
        './imagenes/nota_boton_copy.svg',
        './imagenes/nota_boton_paste.svg',
        './imagenes/biblioteca_boton_enviar.svg',
        './imagenes/botones_separador_barravert.svg',
        './imagenes/escrituralibre_boton_minimizar.svg',
        './imagenes/menuapp.svg',
        './imagenes/nota_boton_deshacer.svg',
        './imagenes/nota_encabezado_biblioteca.svg',
        './imagenes/biblioteca_encabezado_cruz.svg',
        './imagenes/encabezado_biblioteca.svg',
        './imagenes/logoapp_editable.svg',
        './imagenes/nota_boton_borrar.svg',
        './imagenes/nota_boton_edit.svg',
        './imagenes/nota_encabezado_plus.svg',
        './imagenes/biblioteca_libro.svg',
        './imagenes/encabezado_libro.svg',
        './imagenes/logoapp.svg',
        './imagenes/nota_boton_confirmar.svg',
        './imagenes/nota_boton_menosbotones.svg',
        './imagenes/nota_masbotones.svg'
];

// INSTALACIÓN
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVACIÓN (limpia cachés viejos)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', event => {
  const req = event.request;

  // 1) NAVEGACIÓN (HTML) → network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./'))
    );
    return;
  }

  // 2) RESTO → cache-first
  event.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});
