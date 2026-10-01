const assert = require('node:assert/strict');
const { buildShopView, categoryKey, debounce } = require('../src/script-shop-view');

const item = (over) => ({
  id: 'x', name: 'X', category: 'Utilidades', author: 'DiegoT34', summary: '',
  description: '', tags: [], games: [], version: '1.0.0', sha256: 'a'.repeat(64),
  featured: false, publishedAt: '2026-01-01T00:00:00Z', ...over
});

const ESTADO_TODOS = { available: 'available', update: 'update' };

// --- El conjunto base depende de la vista ---------------------------------------------
// Fechas distintas a propósito: con la misma, el desempate por nombre mandaría y esta
// aserción no comprobaría el orden por fecha, que es de lo que se trata.
const catalogo = [
  item({ id: 'a', name: 'Nuevo', category: 'Market', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'b', name: 'Viejo', category: 'Market', version: '2.0.0', publishedAt: '2026-09-01T00:00:00Z' }),
  item({ id: 'c', name: 'Destacado', category: 'Combate', featured: true, publishedAt: '2026-05-01T00:00:00Z' })
];

const conEstado = (filas, estados) => (entrada) => {
  const key = estados[entrada.id] || 'available';
  return { key, label: key, installed: ESTADO_TODOS[key] === 'available' ? null : { version: '1.0.0' } };
};
const ningunoNuevo = () => false;

const shop = buildShopView({ scripts: catalogo, view: 'shop', stateOf: conEstado(catalogo, {}), isNew: ningunoNuevo });
assert.deepEqual(shop.rows.map((i) => i.id), ['c', 'b', 'a'],
  `En la vista Shop sale todo el catálogo. Obtenido: ${shop.rows.map((i) => i.id).join(', ')}`);

const updates = buildShopView({ scripts: catalogo, view: 'updates', stateOf: conEstado(catalogo, { b: 'update' }), isNew: ningunoNuevo });
assert.deepEqual(updates.rows.map((i) => i.id), ['b'],
  `En Actualizaciones solo entra lo que tiene versión nueva. Obtenido: ${updates.rows.map((i) => i.id).join(', ')}`);
assert.equal(updates.counts.published, 3, 'El recuento de publicados cuenta el catálogo entero, no las filas.');
assert.equal(updates.counts.updates, 1, 'El recuento de actualizaciones cuenta el catálogo entero.');

// Una vista desconocida cae en Shop en vez de dejar al usuario sin nada.
const vistaRara = buildShopView({ scripts: catalogo, view: 'inventada', stateOf: conEstado(catalogo, {}), isNew: ningunoNuevo });
assert.equal(vistaRara.rows.length, 3, 'Una vista desconocida tiene que caer en Shop, no dejar la lista vacía.');

// --- Búsqueda ---------------------------------------------------------------------------
const conBusqueda = (q) => buildShopView({
  scripts: [item({ id: 'a', name: 'Calculadora' }), item({ id: 'b', name: 'Otro' })],
  view: 'shop', query: q, stateOf: conEstado([], {}), isNew: ningunoNuevo
});
assert.deepEqual(conBusqueda('calc').rows.map((i) => i.id), ['a'], 'La búsqueda mira el nombre.');
assert.deepEqual(conBusqueda('CALC').rows.map((i) => i.id), ['a'], 'La búsqueda ignora mayúsculas.');
assert.deepEqual(conBusqueda('  calc  ').rows.map((i) => i.id), ['a'], 'La búsqueda recorta espacios.');
assert.equal(conBusqueda('no-existe').rows.length, 0, 'Una búsqueda sin resultados devuelve cero filas, no todas.');
assert.equal(conBusqueda('no-existe').counts.filtered, true, 'Con una búsqueda activa, `filtered` es true.');

const conAcentos = buildShopView({
  scripts: [item({ id: 'a', name: 'Configuración' })], view: 'shop', query: 'configuracion',
  stateOf: conEstado([], {}), isNew: ningunoNuevo
});
assert.equal(conAcentos.rows.length, 1,
  'Buscar sin la tilde tiene que encontrar el texto con tilde. Sin esto, la tilde esconde el script.');

// --- Categoría: coincidencia exacta, y vacía devuelve cero ------------------------------
const conCategoria = (c) => buildShopView({
  scripts: [item({ id: 'a', category: 'Market' }), item({ id: 'b', category: 'Combate' })],
  view: 'shop', category: c, stateOf: conEstado([], {}), isNew: ningunoNuevo
});
assert.deepEqual(conCategoria('Market').rows.map((i) => i.id), ['a'], 'El filtro de categoría coincide exacto.');
assert.deepEqual(conCategoria('Com').rows.map((i) => i.id), [], 'Una categoría que no existe devuelve cero filas, no todas.');
assert.equal(conCategoria('Com').counts.showing, 0, 'Y el recuento de lo mostrado también es cero.');

// Una categoría en blanco cae en «Utilidades», no crea una pastilla vacía.
assert.equal(categoryKey({ category: '' }), 'utilidades', 'Una categoría en blanco cae en utilidades.');
assert.equal(categoryKey({ category: '  ' }), 'utilidades', 'Una categoría con solo espacios también.');
assert.equal(categoryKey({ category: '  Market  ' }), 'market', 'La clave se recorta y se pasa a minúsculas.');
assert.equal(categoryKey({}), 'utilidades', 'Sin categoría, utilidades.');
assert.equal(categoryKey(null), 'utilidades', 'Sobre null no revienta.');

// Dos que solo difieren en mayúsculas son la misma categoría.
const mayusculas = buildShopView({
  scripts: [item({ id: 'a', category: 'Market' }), item({ id: 'b', category: 'market' }), item({ id: 'c', category: 'Utilidades' })],
  view: 'shop', stateOf: conEstado([], {}), isNew: ningunoNuevo
});
assert.equal(mayusculas.categories.length, 2,
  `Mayúsculas distintas son la misma categoría. Pastillas: ${JSON.stringify(mayusculas.categories)}`);
assert.deepEqual(mayusculas.categories.map((c) => c.count).sort((a, b) => a - b), [1, 2], 'Y los números se suman.');
assert.ok(mayusculas.categories.some((c) => c.name === 'Market' || c.name === 'market'),
  'La pastilla guarda un nombre que se puede leer, no la clave en minúsculas.');

// --- LA REGLA: los números no se mueven al filtrar ---------------------------------------
const facetas = buildShopView({
  scripts: [
    item({ id: 'a', category: 'Market' }),
    item({ id: 'b', category: 'Market' }),
    item({ id: 'c', category: 'Combate' })
  ],
  view: 'shop', category: 'Combate', stateOf: conEstado([], {}), isNew: ningunoNuevo
});
const porNombre = Object.fromEntries(facetas.categories.map((c) => [c.key, c.count]));
assert.equal(porNombre.market, 2,
  'Al elegir Combate, Market tiene que seguir diciendo 2. Si dice 0 no se puede saltar a otra categoría sin volver a Todas.');
assert.equal(facetas.counts.showing, 1, 'Pero lo mostrado sí baja a 1.');
assert.deepEqual(facetas.rows.map((i) => i.id), ['c'], 'Y sale solo la de Combate.');
assert.equal(facetas.counts.published, 3, 'Los recuentos del resumen no cambian al filtrar.');

// La búsqueda también forma parte del conjunto de las facetas.
const facetaBuscada = buildShopView({
  scripts: [item({ id: 'a', name: 'Calculadora', category: 'Market' }), item({ id: 'b', name: 'Reloj', category: 'Market' })],
  view: 'shop', query: 'calc', stateOf: conEstado([], {}), isNew: ningunoNuevo
});
assert.equal(facetaBuscada.categories[0].count, 1, 'Con búsqueda activa, las pastillas cuentan solo lo que sobrevive a la búsqueda.');

// --- Recuentos ---------------------------------------------------------------------------
const conRecuentos = buildShopView({
  scripts: [
    item({ id: 'a', category: 'Market' }),
    item({ id: 'b', category: 'Market', version: '2.0.0' }),
    item({ id: 'c', category: 'Combate', version: '3.0.0' })
  ],
  view: 'shop', category: 'market',
  stateOf: conEstado([], { b: 'update', c: 'update' }),
  isNew: (i) => i.id === 'a'
});
assert.deepEqual(conRecuentos.counts,
  { published: 3, installed: 2, updates: 2, newScripts: 1, total: 3, showing: 2, filtered: true },
  `Los recuentos son los del catálogo, no los de las filas. Obtenidos: ${JSON.stringify(conRecuentos.counts)}`);

// --- Entradas degeneradas ---------------------------------------------------------------
for (const raro of [null, undefined, 'texto', 42, {}]) {
  const salida = buildShopView({ scripts: raro, view: 'shop' });
  assert.deepEqual(salida.rows, [], `Con scripts = ${JSON.stringify(raro) ?? 'undefined'} sale una lista vacía.`);
  assert.deepEqual(salida.categories, [], 'Y ninguna pastilla.');
  assert.equal(salida.counts.published, 0, 'Y cero publicados.');
}

// Sin stateOf ni isNew no revienta, y trata todo como disponible.
const sinInyectar = buildShopView({ scripts: [item({ id: 'a' })] });
assert.equal(sinInyectar.rows.length, 1, 'Sin stateOf todo está disponible y sale todo.');
assert.equal(sinInyectar.counts.updates, 0, 'Y no hay actualizaciones.');

// --- No muta lo que recibe ---------------------------------------------------------------
const entrada = [item({ id: 'b', name: 'B', publishedAt: '2026-05-01T00:00:00Z' }), item({ id: 'a', name: 'A' })];
const antes = entrada.map((i) => i.id);
buildShopView({ scripts: entrada, view: 'shop', stateOf: conEstado([], {}), isNew: ningunoNuevo });
assert.deepEqual(entrada.map((i) => i.id), antes, 'No se puede reordenar el array recibido.');

// --- Catálogo grande: esto es lo que el debounce protege -------------------------------
const muitos = Array.from({ length: 200 }, (_, i) => item({ id: `s${String(i).padStart(3, '0')}`, category: i % 2 ? 'Par' : 'Impar' }));
const grande = buildShopView({ scripts: muitos, view: 'shop', query: 'x', stateOf: conEstado([], {}), isNew: ningunoNuevo });
assert.equal(grande.rows.length, 200, 'Los 200 scripts se devuelven: el módulo no recorta, el debounce es lo que evita repintarlos.');

// --- debounce ---------------------------------------------------------------------------
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let llamadas = 0;
  const d = debounce(() => { llamadas += 1; }, 60);
  d(); d(); d();
  assert.equal(llamadas, 0, 'Con tres llamadas seguidas no se ha ejecutado ninguna todavía.');
  await esperar(160);
  assert.equal(llamadas, 1, 'Tras la pausa se ejecuta una sola vez, no tres.');

  d();
  d.cancelar();
  await esperar(160);
  assert.equal(llamadas, 1, 'Cancelar impide la llamada pendiente.');

  d.ahora();
  assert.equal(llamadas, 2, 'ahora() ejecuta al instante: es la vía de la tecla Enter.');

  d();
  d.ahora();
  await esperar(160);
  assert.equal(llamadas, 3, 'ahora() también limpia lo que hubiera pendiente, para que no se ejecute dos veces.');

  console.log('Script shop view smoke passed: vista, busqueda, categoria, facetas, recuentos, entradas raras, 200 entradas y debounce.');
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});