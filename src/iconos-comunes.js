// La regla de qué se puede descargar como icono de una pestaña.
//
// POR QUÉ ESTO ES UN FICHERO PROPIO Y NO UNA FUNCIÓN DENTRO DE main.js
//
// Porque es la única pieza de esta entrega que una prueba necesita poder EJECUTAR en vez de leer.
// Una función de primer nivel de `src/main.js` no se puede alcanzar desde una prueba: `require` no
// expone el interior de un módulo, y la función no es una global.
//
// Dos veces escribí que la regla estaba probada. Las dos veces lo que había era un `grep` del texto
// en el fichero, que pasa igual de contento si la función desaparece y las tres constantes se
// quedan en un comentario. Un `grep` sobre un texto no prueba un comportamiento.
//
// Aquí la regla se ejecuta de verdad, con la tabla de formatos completa y los casos que la
// implementación descarga, y además se usa desde el proceso principal, así que no hay dos versiones
// que puedan divergir.
//
// QUÉ ACEPTA Y QUÉ NO
//
// Solo formatos que el navegador pinta de verdad, hasta 256 KB. Los SVG quedan fuera a propósito: un
// SVG de una web es un documento entero con scripts dentro, y lo que se pone en una pestaña es un
// icono de 14 píxeles.

const ICONO_MAXIMO_BYTES = 256 * 1024;

const TIPOS_DE_IMAGEN = new Set([
  'image/png',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/gif',
  'image/jpeg',
  'image/webp'
]);

// `content-type` puede venir con parametros: `image/png; charset=binary`. Se queda solo con el tipo.
function tipoDeImagen(contentType) {
  return String(contentType || '').split(';')[0].trim().toLowerCase();
}

function esIconoAdmisible(contentType, bytes) {
  return TIPOS_DE_IMAGEN.has(tipoDeImagen(contentType))
    && Number.isInteger(bytes) && bytes > 0 && bytes <= ICONO_MAXIMO_BYTES;
}

// Solo el tipo, para descartar antes de leer: si lo que llega no es una imagen, no hay nada que
// descargar ni nada que medir.
function esTipoDeIcono(contentType) {
  return TIPOS_DE_IMAGEN.has(tipoDeImagen(contentType));
}

// El `content-length` se mira ANTES de leer, cuando viene. Un sitio que dice 400 MB no se descarga:
// se descarta leyendo seis números. Cuando no viene —porque el servidor lo manda por troceado o
// porque miente— no hay nada que mirar y se lee con tope, que es lo que hace `esIconoAdmisible` sobre
// el total ya leído.
function esTamanoAdmisible(contentLength) {
  if (!contentLength) return true;
  return Number(contentLength) <= ICONO_MAXIMO_BYTES;
}

module.exports = {
  ICONO_MAXIMO_BYTES,
  TIPOS_DE_IMAGEN,
  tipoDeImagen,
  esTipoDeIcono,
  esIconoAdmisible,
  esTamanoAdmisible
};