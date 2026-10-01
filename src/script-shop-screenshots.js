'use strict';

// Qué capturas tiene un script de la Shop, cuáles valen y cuántas se enseñan.
//
// Vive en un módulo puro, y no dentro de main.js, por el mismo motivo que
// script-shop-order.js y script-shop-view.js: main.js arranca Electron y no se puede
// importar en Node, y el harness de previsualización devuelve un catálogo de un solo
// script sin capturas (R-03). Aquí se prueba con rutas malas de verdad, que es lo que
// pasa cuando alguien escribe el catálogo a mano.
//
// No hace falta require: no depende de nada, y eso evita el reparto entre entornos que
// tienen los otros dos módulos.

// Seis. Con ocho, 200 scripts llegarían al 82% del límite del catálogo; con seis, al 73%.
const CAPTURAS_LIMITE = 6;

// Exactamente el mismo molde que assertScriptShopDownloadUrl, que es lo que ya acepta
// las descargas de la Shop. La ruta está clavada al repositorio oficial, a la carpeta
// screenshots/, y a main o a un commit de 40 hexadecimales.
const RUTA_CAPTURA = /^\/DiegoT34\/PokeGrid-Script-Shop\/(?:main|[a-f0-9]{40})\/screenshots\/([^/]+)$/i;
const NOMBRE_CAPTURA = /^[a-z0-9][a-z0-9._-]{0,99}\.(?:png|jpe?g|webp|gif)$/i;

// `id` es opcional a propósito: el proceso principal necesita la comprobación sin
// conocer el script, y quien conoce el id —el catálogo— exige además el prefijo, que es
// lo que impide que un script se apropie de las capturas de otro.
function esCapturaDeShop(rawUrl, id) {
  let url;
  try {
    url = rawUrl instanceof URL ? rawUrl : new URL(String(rawUrl || ''));
  } catch {
    return false;
  }
  // El host se comprueba **aparte de** la ruta, y es lo más importante de esta función.
  // La ruta sola no dice nada: un catálogo escrito a mano puede apuntar a
  // `https://otro-sitio.example/DiegoT34/PokeGrid-Script-Shop/main/screenshots/x-1.png`,
  // que tiene la ruta exactamente igual y un host que no es el nuestro. En la Tarea 2
  // esta comprobación es la frontera de seguridad del `net.fetch` del proceso principal,
  // y ese `fetch` no está sujeto al CSP, así que la lista blanca es lo único que hay.
  if (url.hostname !== 'raw.githubusercontent.com') return false;
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return false;
  const encontrado = RUTA_CAPTURA.exec(url.pathname);
  if (!encontrado) return false;
  const nombre = encontrado[1];
  if (!NOMBRE_CAPTURA.test(nombre)) return false;
  if (!id) return true;
  return nombre.toLowerCase().startsWith(`${String(id).toLowerCase()}-`);
}

// El recorte va aquí y no al pintar, para que el número que se enseña y el número de
// peticiones sean el mismo. Recortar más tarde significaría descargar imágenes que luego
// no se ven.
function planCapturas(item) {
  const lista = Array.isArray(item && item.screenshots) ? item.screenshots.slice(0, CAPTURAS_LIMITE) : [];
  return { tiene: lista.length > 0, total: lista.length, urls: lista };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CAPTURAS_LIMITE, esCapturaDeShop, planCapturas };
}
if (typeof window !== 'undefined') {
  window.pokeGridShopScreenshots = { CAPTURAS_LIMITE, esCapturaDeShop, planCapturas };
}
