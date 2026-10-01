'use strict';

// Orden del catálogo de la Script Shop.
//
// Vive en un fichero propio, y no dentro de main.js, por la misma razón que
// account-model.js: main.js arranca Electron y no se puede importar en Node, y el
// harness de previsualización devuelve un catálogo fijo en vez del real. Aquí la
// función es pura y se prueba sin arrancar nada.
//
// publishedAt ya venía en el catálogo y la lista blanca de main.js ya lo conserva;
// lo que no había era que nadie lo usara para ordenar nada.

// Una entrada sin fecha, o con fecha que no se entiende, se trata como la más
// antigua: no sabemos cuándo se publicó, y ponerla por delante sería mentir.
function publicationDate(item) {
  const marca = Date.parse(String((item && item.publishedAt) || ''));
  return Number.isFinite(marca) ? marca : Number.NEGATIVE_INFINITY;
}

// Destacados primero y, dentro de cada grupo, de la más reciente a la más
// antigua. El desempate por nombre hace que el orden sea estable entre recargas:
// sin él, dos entradas con la misma fecha podrían cambiar de sitio cada vez que se
// recarga el catálogo, y el usuario vería tarjetas saltando.
//
// featured se lee con Boolean a propósito. En el catálogo llega como booleano, pero
// un publicador que lo mande como "sí" no debe ser la razón de que un destacado
// acabe al final de la lista.
function orderShopCatalog(entries) {
  return [...(Array.isArray(entries) ? entries : [])].sort((a, b) => {
    const destacados = Number(Boolean(b && b.featured)) - Number(Boolean(a && a.featured));
    if (destacados !== 0) return destacados;
    const fecha = publicationDate(b) - publicationDate(a);
    // Al desempate por nombre se cae en dos casos: fecha cero, que es un empate real, y
// NaN, que es -infinito menos -infinito cuando las dos entradas no tienen fecha.
// Cuando solo una la tiene, la resta da -infinito sin más, que es un orden válido y
// el correcto: la que no tiene fecha va detrás. Una guarda con isFinite se tragaba
// los tres casos y dejaba que el nombre mandara sobre la fecha, que es justo lo que
// no se quiere.
if (fecha !== 0 && !Number.isNaN(fecha)) return fecha;
return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'es');
  });
}

module.exports = { publicationDate, orderShopCatalog };