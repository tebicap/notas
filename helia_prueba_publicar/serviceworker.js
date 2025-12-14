CACHE_NAME = 'v5'; // actualizar nro cada vez que actualizo otros archivos para que los recargue

const ASSETS = [
        './',
        './index.html',
        './estilos.css',
        './scripts.js',
        './fuente/OpenSans.woff2',
        //imágenes:
        './imagenes/icono_instalada_192.png',
        './imagenes/icono_instalada_512.png',
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

// FETCH pre-cache
const PRECACHE_URLS = new Set(ASSETS); // ← Set es mucho más rápido para búsquedas
// FETCH
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
    return;
  }

  if (PRECACHE_URLS.has(new URL(event.request.url).pathname)) {
    event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
  }
});
