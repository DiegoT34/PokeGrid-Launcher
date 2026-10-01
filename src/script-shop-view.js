'use strict';

// Qué se muestra en la vista de la Shop: qué filas, qué pastillas de categoría y qué
// recuentos. Sin DOM y sin estado, para que se pueda probar en Node con catálogos de
// 200 entradas. El harness de previsualización devuelve un catálogo de un solo script y
// está vedado (R-03), así que la comprobación real no puede vivir en userscripts.js.
//
// El estado de cada script no se mueve aquí: se inyecta con stateOf e isNew, porque
// depende de lo instalado y de lo que el usuario ya ha visto, y eso vive dentro de
// userscripts.js.

// El orden viene de otro módulo, y en Node se pide con require y en el navegador se
// lee de window, porque un script cargado con <script> no puede hacer require.
//
// El binding local no se llama igual que la función, a propósito: script-shop-order.js
// declara `orderShopCatalog` como función de primer nivel, y al cargarlo con <script>
// esa función vive en el ámbito global. Un `let orderShopCatalog` aquí choca con ella y
// el navegador responde «Identifier has already been declared», que es un error de
// carga: el módulo entero no aparece y el fallo se ve lejos, en quien usa pokeGridShopView.
const resolverOrden = () => {
  if (typeof module !== 'undefined' && module.exports) {
    return require('./script-shop-order').orderShopCatalog;
  }
  if (typeof window !== 'undefined' && window.pokeGridShopOrder) {
    return window.pokeGridShopOrder.orderShopCatalog;
  }
  return null;
};
const ordenCatalogo = resolverOrden();
if (typeof ordenCatalogo !== 'function') {
  throw new Error('script-shop-view.js necesita el orden: cargalo despues de script-shop-order.js.');
}

const SIN_CATEGORIA = 'utilidades';

// Igual que normalizeSearchText de renderer.js, y por el mismo motivo: es lo que hace
// ya todas las demás búsquedas del launcher. Sin quitar los diacríticos, quien escriba
// «configuracion» no encuentra «Configuración», y la tilde esconde el script.
function normaliza(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Clave con la que se agrupan y se comparan las categorías. Recortar y pasar a
// minúsculas hace que «Market» y «market» sean la misma pastilla en vez de dos, y una
// categoría en blanco cae en «utilidades» en vez de crear una pastilla invisible.
// También sin diacríticos, por lo mismo que la búsqueda: «Categoría» y «Categoria» son
// la misma categoría.
function categoryKey(item) {
  return normaliza((item && item.category) || '') || SIN_CATEGORIA;
}

function coincideBusqueda(item, consulta) {
  if (!consulta) return true;
  const texto = normaliza([
    item && item.name,
    item && item.summary,
    item && item.description,
    item && item.category,
    item && item.author,
    ...(Array.isArray(item && item.tags) ? item.tags : []),
    ...(Array.isArray(item && item.games) ? item.games : [])
  ].join(' '));
  return texto.includes(consulta);
}

// Las pastillas con su número se calculan sobre base + búsqueda, ANTES del filtro de
// categoría. Es la regla que más fácil se olvida y la que más caro sale: si se
// calcularan después, al elegir «Combate» las demás pastillas pasarían a decir 0 y no
// se podría saltar a otra categoría sin volver a «Todas».
function categoriaConNumero(base, consulta) {
  const cuenta = new Map();
  for (const item of base) {
    if (!coincideBusqueda(item, consulta)) continue;
    const clave = categoryKey(item);
    const anterior = cuenta.get(clave);
    // Se guarda el nombre tal como vino la primera vez, para que la pastilla se lea
    // «Market» y no «market».
    if (anterior) anterior.count += 1;
    else cuenta.set(clave, { key: clave, name: String((item && item.category) || '').trim() || 'Utilidades', count: 1 });
  }
  return [...cuenta.values()].sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'es'));
}

function buildShopView({ scripts, view = 'shop', query = '', category = '', stateOf, isNew } = {}) {
  const lista = Array.isArray(scripts) ? scripts : [];
  const estado = typeof stateOf === 'function' ? stateOf : () => ({ key: 'available', installed: null });
  const nuevo = typeof isNew === 'function' ? isNew : () => false;
  const consulta = normaliza(query);
  const clave = normaliza(category);

  const conEstado = lista.map((item) => {
    const valor = estado(item) || {};
    return { item, key: valor.key || 'available', installed: Boolean(valor.installed) };
  });

  // Los cuatro recuentos del resumen miden cómo está la Shop, no qué se está viendo.
  // Por eso no cambian al escribir ni al filtrar.
  const counts = {
    published: lista.length,
    installed: conEstado.filter((e) => e.installed).length,
    updates: conEstado.filter((e) => e.key === 'update').length,
    newScripts: conEstado.filter((e) => nuevo(e.item)).length,
    total: 0,
    showing: 0,
    filtered: Boolean(consulta || clave)
  };
  counts.total = counts.updates + counts.newScripts;

  // Conjunto base según la vista. Una vista desconocida cae en Shop: mejor mostrar de
  // más que dejar al usuario con una lista vacía sin explicación.
  const base = view === 'updates' ? conEstado.filter((e) => e.key === 'update') : conEstado;

  const categories = categoriaConNumero(base.map((e) => e.item), consulta);

  const filtrado = base.filter((e) => coincideBusqueda(e.item, consulta)
    && (!clave || categoryKey(e.item) === clave));

  const rows = ordenCatalogo(filtrado.map((e) => e.item));
  counts.showing = rows.length;

  return { rows, categories, counts };
}

// Cinco líneas, y en el mismo fichero porque un módulo entero para esto sería más ruido
// que ayuda. Lo que importa es que también es comprobable: `cancelar` es lo que evita
// que un render salga dentro de un panel ya oculto, y `ahora` es la tecla Enter.
function debounce(fn, ms) {
  let pendiente = 0;
  const envuelto = (...args) => {
    if (pendiente) clearTimeout(pendiente);
    pendiente = setTimeout(() => { pendiente = 0; fn(...args); }, ms);
  };
  envuelto.cancelar = () => {
    if (pendiente) { clearTimeout(pendiente); pendiente = 0; }
  };
  envuelto.ahora = (...args) => {
    envuelto.cancelar();
    return fn(...args);
  };
  return envuelto;
}

// Vive en los dos sitios. En Node se prueba con require; en el navegador lo carga una
// etiqueta <script>, y ahí `module` no existe. El typeof del require y el del exports
// hacen falta los dos: uno evita que falle al cargar, el otro evita que falle al
// exportar. Los dos fallos son silenciosos desde fuera —el módulo simplemente no
// aparece— y se Navarrean con la prueba del DOM, no con la de Node.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildShopView, categoryKey, debounce };
}
if (typeof window !== 'undefined') {
  window.pokeGridShopView = { buildShopView, categoryKey, debounce };
}