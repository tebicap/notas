self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('v1').then(c =>
      c.addAll([
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
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
