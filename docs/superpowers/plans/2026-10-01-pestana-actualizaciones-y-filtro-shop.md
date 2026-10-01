# Pestaña «Actualizaciones» y filtro de categoría de la Shop — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el progreso.

**Objetivo:** Añadir al centro de scripts una tercera pestaña «Actualizaciones» que liste solo los scripts con versión publicada más nueva, un filtro de categoría con pastillas y número en las dos vistas de la Shop, y un debounce de 250 ms en la búsqueda.

**Arquitectura:** La lógica que decide qué se muestra vive en un módulo puro y comprobable en Node (`src/script-shop-view.js`), no en `userscripts.js`. El motivo es concreto: `tests/launcher-preview-preload.js` está vedado (Ruling R-03) y su catálogo tiene un solo script, así que con el harness no se puede comprobar que un filtro filtre. `userscripts.js` se limita a inyectar el estado, pintar lo que le devuelven y cablear el DOM. Es el mismo motivo por el que el orden del catálogo ya vive en `src/script-shop-order.js`.

**Stack técnico:** Electron 43, Node 22+, JavaScript plano sin dependencias nuevas. Pruebas con `node:assert/strict` y el runner de `scripts/run-tests.cjs`. Cero dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-01-pestana-actualizaciones-y-filtro-shop-design.md` — el plan argumenta desde la spec, y quien lo ejecute tiene que leer las dos.

## Restricciones globales

- **Cero dependencias nuevas.** Ni en `package.json`, ni scripts, ni librerías.
- **Nada se publica.** `git push` y `git.tag` son del usuario, siempre.
- **R-03**: no tocar `tests/launcher-preview-preload.js`. Es compartido y está vedado; su catálogo de un solo script es la razón de que este plan exista.
- **No tocar** `src/game-theme.js`.
- **Español con tildes** en comentarios, textos de interfaz y mensajes de aserción.
- **Rutas con `path.join`**, nunca concatenadas a mano.
- **Nada de `git add -A`**: hay ficheros ajenos al proyecto (`CONTEXTO-PROYECTO.md`, `ANALISIS-COMPLETO-PROYECTO.md`, `.superpowers/`).
- **Nada de `git checkout` para restaurar sabotajes**: revierte al último commit y se lleva trabajo sin commitear. La copia se toma en el script de sabotaje, en ese instante.
- **En PowerShell no escribir código con comillas dobles dentro de `node -e`**: la consola se las come y el fallo se confunde con un problema del código bajo prueba. Para mutaciones, un fichero de script; para cambios, la herramienta de edición.
- **Medir el código de salida con `Start-Process -Wait -PassThru` y leer `.ExitCode`**. Un `| Select-Object -First` corta la tubería y devuelve `exit=-1` aunque la suite pase.
- **El puerto de Node va en verde entre tareas.** El contrato de completado incluye la suite del proyecto, no solo la del fichero propio.

## Enfoque de la revisión

Cinco clases de entrada o modo de fallo que la spec sugiere y que ninguna prueba ejercita todavía. Están aquí porque una spec es un documento de visión: su silencio sobre una entrada no es permiso para que esa entrada rompa el programa. Cada línea tiene su prueba en la tarea que es dueña del código.

1. **Una categoría que existe en el catálogo pero no en el conjunto base** (por ejemplo «Combate» solo tiene scripts que no son una actualización, y estás en la pestaña de Actualizaciones). La respuesta razonable es cero filas con un mensaje que diga que el filtro es lo que filtró — **no** todas las filas, y **no** el mensaje de «Shop vacía».
2. **Un campo del desglose que el badge pide y el registro no tiene** (por ejemplo, si alguien declara `{ campo: 'updates' }` en un badge y llama a `set()` sin desglose). La respuesta razonable es que ese badge pinte 0 y se esconda, sin excepción.
3. **Una categoría vacía o en blanco en el catálogo**, o una categoría que solo difiere en mayúsculas de otra («market» frente a «Market»). La respuesta razonable es que se agrupen en la misma pastilla y que no serene una pastilla en blanco.
4. **Al cerrar y reabrir el centro de scripts con un valor guardado corrupto o de una versión antigua** (por ejemplo `pokegrid:scripts-view:v1` con `"banana"`). La respuesta razonable es que se ignore y empiece en «Mis scripts».
5. **Una búsqueda que no encuentra nada mientras hay categoría activa.** La respuesta razonable es el mensaje de «no hay resultados» con el filtro de categoría **respetado**, y al borrar la búsqueda las filas vuelven.

---

### Tarea 1: El módulo puro de la vista

**Ficheros:**
- Crear: `src/script-shop-view.js`
- Crear: `tests/script-shop-view-smoke.js`

**Interfaces:**
- Consume: `orderShopCatalog(entries)` de `src/script-shop-order.js`.
- Produce:
  - `buildShopView({ scripts, view, query, category, stateOf, isNew })` → `{ rows, categories, counts }`
  - `debounce(fn, ms)` → función con `.cancelar()` y `.ahora(...args)`
  - `categoryKey(item)` → clave de categoría normalizada, en minúsculas y sin espacios sobrantes, `'utilidades'` si falta

**Nota de alcance:** esta tarea **no toca el DOM**. Al terminar, el módulo existe y está probado, pero nada en la aplicación lo usa todavía. La puerta de Node sigue en verde.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `tests/script-shop-view-smoke.js`:

```js
const assert = require('node:assert/strict');
const { buildShopView, categoryKey, debounce } = require('../src/script-shop-view');

const item = (over) => ({
  id: 'x', name: 'X', category: 'Utilidades', author: 'DiegoT34', summary: '',
  description: '', tags: [], games: [], version: '1.0.0', sha256: 'a'.repeat(64),
  featured: false, publishedAt: '2026-01-01T00:00:00Z', ...over
});

const ESTADO_TODOS = { available: 'available', update: 'update' };

// --- El conjunto base depende de la vista ---------------------------------------------
const catalogo = [
  item({ id: 'a', name: 'Nuevo', category: 'Market' }),
  item({ id: 'b', name: 'Viejo', category: 'Market', version: '2.0.0' }),
  item({ id: 'c', name: 'Destacado', category: 'Combate', featured: true })
];

const conEstado = (catalogo, estados) => (entrada) => {
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
const conFacetas = () => buildShopView({
  scripts: [
    item({ id: 'a', category: 'Market' }),
    item({ id: 'b', category: 'Market' }),
    item({ id: 'c', category: 'Combate' })
  ],
  view: 'shop', category: 'Combate', stateOf: conEstado([], {}), isNew: ningunoNuevo
});
const facetas = conFacetas();
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
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\script-shop-view-smoke.js`
Expected: FAIL con `Cannot find module '../src/script-shop-view'`.

- [ ] **Paso 3: Escribir el módulo**

Crear `src/script-shop-view.js`:

```js
'use strict';

// Qué se muestra en la vista de la Shop: qué filas, qué pastillas de categoría y qué
// recuentos. Sin DOM y sin estado, para que se pueda probar en Node con catálogos de
// 200 entradas. El harness de previsualización devuelve un catálogo de un solo script y
// está vedado (R-03), así que la comprobación real no puede vivir en userscripts.js.
//
// El estado de cada script no se mueve aquí: se inyecta con stateOf e isNew, porque
// depende de lo instalado y de lo que el usuario ya ha visto, y eso vive dentro de
// userscripts.js.

const { orderShopCatalog } = require('./script-shop-order');

const SIN_CATEGORIA = 'utilidades';

// Clave con la que se agrupan y se comparan las categorías. Recortar y pasar a
// minúsculas hace que «Market» y «market» sean la misma pastilla en vez de dos, y una
// categoría en blanco cae en «utilidades» en vez de crear una pastilla invisible.
function categoryKey(item) {
  return String((item && item.category) || '').trim().toLowerCase() || SIN_CATEGORIA;
}

function normaliza(valor) {
  return String(valor ?? '').trim().toLowerCase();
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

  const rows = orderShopCatalog(filtrado.map((e) => e.item));
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

module.exports = { buildShopView, categoryKey, debounce };
```

- [ ] **Paso 4: Ejecutar y verificar que pasa**

Run: `node tests\script-shop-view-smoke.js`
Expected: PASS con `Script shop view smoke passed: vista, busqueda, categoria, facetas, recuentos, entradas raras, 200 entradas y debounce.`

- [ ] **Paso 5: Correr la puerta de Node**

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes, incluida la nueva.

- [ ] **Paso 6: Sabotear para comprobar que muerde**

Cada sabotaje copia `src\script-shop-view.js` **en ese instante**, lo muta, corre la prueba, y lo restaura comprobando el hash con `git hash-object src/script-shop-view.js`.

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | En `categoriaConNumero`, cambia el `continue` por no filtrar: el bucle cuenta **todas** las categorías en vez de solo las que sobreviven a la búsqueda | `Con búsqueda activa, las pastillas cuentan solo lo que sobrevive a la búsqueda.` |
| 2 | Mueve el filtro de categoría **antes** de calcular `categories`, de modo que las facetas se calculen ya filtradas | `Al elegir Combate, Market tiene que seguir diciendo 2.` |
| 3 | Quita `Number(...)` del `debounce`: deja `llamadas` a 0 siempre | `Tras la pausa se ejecuta una sola vez, no tres.` |
| 4 | En `buildShopView`, cambia `view === 'updates'` por `false` | `En Actualizaciones solo entra lo que tiene versión nueva.` |
| 5 | En `counts`, usa `filtered.length` en vez de `conEstado` para `installed` | `Los recuentos son los del catálogo, no los de las filas.` |

Que el sabotaje 2 sea el que más duele es lo esperado: la función seguiría siendo «correcta» salvo por un detalle de cuándo se calcula, y ninguna otra prueba lo detectaría.

- [ ] **Paso 7: Commit**

```bash
git add src/script-shop-view.js tests/script-shop-view-smoke.js
git commit -m "Anadir el modulo puro que decide que se muestra en la vista de la Shop"
```

---

### Tarea 2: El registro de avisos, con un número por badge

**Ficheros:**
- Modificar: `src/notification-hub.js` (la función `pintarUno`, el método `set` y la lista `badgeIds` de la fuente `scripts`)
- Modificar: `tests/notification-hub-static-smoke.js`
- Modificar: `tests/notification-hub-smoke.js`

**Interfaces:**
- Consume: nada de tareas anteriores. Es la base de la Tarea 4.
- Produce:
  - `set(id, total, desglose)` — el tercer argumento es opcional; sin él, todo funciona igual que ahora
  - Una entrada de `badgeIds` puede ser una cadena (usa `total`) o `{ id, campo }` (lee `desglose[campo]`)

- [ ] **Paso 1: Escribir la prueba estática que falla**

En `tests/notification-hub-static-smoke.js`, antes del `console.log`, añadir:

```js
// Una fuente puede pintar un número distinto en cada uno de sus badges. Con la tercera
// pestaña hace falta: la de Shop dice cuántos scripts nuevos quedan sin ver y la de
// Actualizaciones cuántos hay sin actualizar, y salen del mismo recuento.
assert.match(fuente, /\{\s*id:\s*'scriptShopUpdateBadge',\s*campo:\s*'newScripts'\s*\}/,
  "El badge de la pestaña Shop tiene que leer su campo del desglose: 'newScripts'.");
assert.match(fuente, /\{\s*id:\s*'scriptShopUpdatesBadge',\s*campo:\s*'updates'\s*\}/,
  "El badge de la pestaña Actualizaciones tiene que leer su campo del desglose: 'updates'.");
assert.match(fuente, /set\(id, total, desglose\)/,
  'set() tiene que aceptar el desglose como tercer argumento.');
assert.match(fuente, /Number\.isFinite\(Number\(valor\)\)/,
  'Un campo ausente tiene que acabar en 0, no propagar NaN al texto del badge.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\notification-hub-static-smoke.js`
Expected: FAIL en `El badge de la pestaña Shop tiene que leer su campo del desglose`.

- [ ] **Paso 3: Escribir la prueba de Electron que falla**

En `tests/notification-hub-smoke.js`, añadir antes del `console.log`:

```js
    // Los tres sitios que muestran un número quieren números distintos: la bolita del
    // menú y el botón de arriba suman el total, la pestaña Shop muestra los nuevos sin
    // ver y la de Actualizaciones los que hay sin actualizar.
    const porBadge = await ponerYLeerVentana(ventana, `
      window.pokeGridNotifications.set('scripts', 5, { newScripts: 3, updates: 2 });
      const leer = (id) => {
        const nodo = document.getElementById(id);
        return nodo ? { texto: nodo.textContent, oculto: nodo.hidden } : null;
      };
      return {
        menu: leer('hamburgerAvisoDotShop'),
        boton: leer('scriptsMenuBadge'),
        shop: leer('scriptShopUpdateBadge'),
        updates: leer('scriptShopUpdatesBadge')
      };
    `);
    assert.ok(porBadge.menu, 'La bolita del menú existe y la pinta el registro.');
    assert.equal(porBadge.menu.oculto, false, 'Con total 5 la bolita del menú se ve.');
    assert.equal(porBadge.boton.texto, '5', `El botón de Scripts muestra el total, no "${porBadge.boton.texto}".`);
    assert.equal(porBadge.shop.texto, '3', `La pestaña Shop muestra los nuevos sin ver, no "${porBadge.shop.texto}".`);
    assert.equal(porBadge.updates.texto, '2', `La pestaña Actualizaciones muestra las actualizaciones, no "${porBadge.updates.texto}".`);

    // Un badge que pide un campo que no viene no rompe nada: pinta 0 y se esconde.
    const sinDesglose = await ponerYLeerVentana(ventana, `
      window.pokeGridNotifications.set('scripts', 4);
      const nodo = document.getElementById('scriptShopUpdatesBadge');
      return { texto: nodo.textContent, oculto: nodo.hidden };
    `);
    assert.equal(sinDesglose.oculto, true,
      `Sin desglose el badge de Actualizaciones se esconde, en vez de romper. Obtenido: "${sinDesglose.texto}".`);
    assert.equal(sinDesglose.texto, '0', 'Y su texto es 0, no NaN ni undefined.');

    // Y sin desglose, el resto sigue igual que antes: una fuente corriente no se entera.
    const sinDesgloseTotal = await ponerYLeerVentana(ventana, `
      window.pokeGridNotifications.set('scripts', 4);
      return document.getElementById('scriptsMenuBadge').textContent;
    `);
    assert.equal(sinDesgloseTotal, '4', 'Sin desglose, un badge normal sigue viendo el total.');
```

Y añadir junto a los otros ayudantes del fichero, junto a `ponerYLeer`:

```js
const ponerYLeerVentana = (window, cuerpo) => window.webContents.executeJavaScript(`(() => { ${cuerpo} })()`);
```

- [ ] **Paso 4: Ejecutar y verificar que falla**

Run con `Start-Process -Wait -PassThru` sobre `node_modules\electron\dist\electron.exe` con `tests\notification-hub-smoke.js`
Expected: FAIL con `TypeError` o `elele: leer('scriptShopUpdatesBadge')` nulo, porque `#scriptShopUpdatesBadge` todavía no existe en el HTML.

- [ ] **Paso 5: Extender el registro**

En `src/notification-hub.js`:

Cambiar el `pintarUno`, sustituyendo el bucle de badges:

```js
  // Un id puede no existir todavía: updateLauncherBadge llega en una tarea posterior.
  for (const entrada of aviso.badgeIds) {
    // Una entrada es una cadena, y usa el total, o un objeto con el campo del desglose
    // que le toca. El registro se quedó corto cuando la Shop tuvo tres sitios con
    // números distintos y una sola fuente: por eso una entrada puede leer del desglose.
    const id = typeof entrada === 'string' ? entrada : entrada.id;
    const campo = typeof entrada === 'string' ? '' : String(entrada.campo || '');
    const valor = campo ? aviso.desglose[campo] : aviso.count;
    // Si el campo no viene, 0 en vez de NaN. Un badge con «NaN» escrito encima es peor
    // que un badge escondido.
    const total = Number.isFinite(Number(valor)) ? Number(valor) : 0;
    const badge = document.getElementById(id);
    if (!badge) continue;
    badge.textContent = textoContador(total);
    badge.hidden = total === 0;
    badge.style.background = aviso.color;
    badge.style.color = '#17140a';
    badge.title = `${aviso.titulo}: ${total} pendiente${total === 1 ? '' : 's'}`;
    badge.setAttribute('aria-label', badge.title);
  }
```

En el `estado` inicial, añadir `desglose: {}` al objeto de cada aviso:

```js
  Object.assign({}, aviso, { count: 0, vistoHasta: 0, desglose: {} })
```

En `set`, sustituir la firma y guardar el desglose:

```js
  set(id, total, desglose) {
    const aviso = estado.get(String(id || ''));
    if (!aviso) {
      console.error(`[PokeGrid] Fuente de aviso desconocida: ${id}`);
      return 0;
    }
    aviso.count = total;
    aviso.desglose = desglose && typeof desglose === 'object' ? desglose : {};
    dibujar();
    return total;
  },
```

Y cambiar `badgeIds` de la fuente `scripts`:

```js
    badgeIds: Object.freeze([
      { id: 'scriptShopUpdateBadge', campo: 'newScripts' },
      'scriptsMenuBadge',
      { id: 'scriptShopUpdatesBadge', campo: 'updates' }
    ])
```

- [ ] **Paso 6: Ejecutar y verificar que pasa**

Run: `node tests\notification-hub-static-smoke.js` → PASS.
Run: `node_modules\electron\dist\electron.exe tests\notification-hub-smoke.js` → PASS.

- [ ] **Paso 7: Correr la puerta de Node**

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes.

- [ ] **Paso 8: Sabotear para comprobar que muerde**

| # | Mutación en `src/notification-hub.js` | Aserción que debe caer |
|---|---|---|
| 1 | Quita la guarda `Number.isFinite(Number(valor))` y escribe `valor` tal cual | `Y su texto es 0, no NaN ni undefined.` |
| 2 | `const campo = ...` devuelve siempre `''`, así que todo badge usa el total | `La pestaña Shop muestra los nuevos sin ver` |
| 3 | Cambia `total` por `aviso.count` en el texto del badge de laShop | `El botón de Scripts muestra el total` |

En la 2 y la 3 hay que comprobar que la puerta estática también falla: es la que vigila que los badges sigan leyendo su campo.

- [ ] **Paso 9: Commit**

```bash
git add src/notification-hub.js tests/notification-hub-smoke.js tests/notification-hub-static-smoke.js
git commit -m "Pintar un numero distinto en cada badge de la Shop a partir de un desglose"
```

---

### Tarea 3: La tercera pestaña, las pastillas y su estilo

**Ficheros:**
- Modificar: `src/index.html` (dentro de `nav.scripts-view-tabs` y dentro de `#scriptShopView`)
- Modificar: `src/styles.css` (al final)
- Modificar: `src/userscripts.js` (solo la lista `REQUIRED_SCRIPT_ELEMENTS`, líneas 30 y 42-44)
- Modificar: `tests/multi-game-userscripts-static-smoke.js`

**Interfaces:**
- Consume: nada.
- Produce: en el DOM, `#scriptShopUpdatesTab`, `#scriptShopUpdatesBadge`, `#scriptShopCategories`, `#scriptShopEyebrow`, `#scriptShopIntro`. La Tarea 4 los usa.

**Nota de alcance:** esta tarea pone la estructura, no el comportamiento. Al terminar, la pestaña existe y se ve, pero al pulsarla no ocurre nada todavía, porque el cableado es la Tarea 4. La puerta de Node está en verde.

- [ ] **Paso 1: Escribir la prueba estática que falla**

En `tests/multi-game-userscripts-static-smoke.js`, añadir antes del `console.log`:

```js
// La tercera pestaña y el filtro de categoría tienen que existir en el HTML. Si el
// nombre se cambia en un sitio y no en el otro, REQUIRED_SCRIPT_ELEMENTS avisa.
for (const id of ['#scriptShopUpdatesTab', '#scriptShopUpdatesBadge', '#scriptShopCategories', '#scriptShopEyebrow', '#scriptShopIntro']) {
  assert.ok(html.includes(`id="${id.slice(1)}"`), `${id} tiene que existir en index.html.`);
}
// Y las dos vistas comparten sección: la de Actualizaciones no es un segundo contenedor,
// es la misma con otro filtro. Dos secciones obligarían a duplicar el render entero.
assert.doesNotMatch(html, /id="scriptShopUpdatesView"/,
  'Actualizaciones no necesita una segunda sección: la de Shop sirve para las dos vistas.');

// Y el estilo existe, no solo el marcado. Sin esto, vaciar el bloque del CSS deja las
// pastillas en el sitio pero sin forma, y ninguna otra prueba lo nota.
assert.match(css, /\.script-shop-category\b/, 'El estilo de las pastillas tiene que existir.');
assert.match(css, /\.script-shop-category\[aria-pressed="true"\]/,
  'La pastilla elegida tiene que verse distinta de las demás.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: FAIL en `#scriptShopUpdatesTab tiene que existir en index.html.`

- [ ] **Paso 3: Añadir la pestaña en el HTML**

En `src\index.html`, dentro de `<nav class="scripts-view-tabs">`, después del botón `#scriptShopTab`:

```html
          <button id="scriptShopUpdatesTab" class="scripts-view-tab" type="button" aria-selected="false">
            <span aria-hidden="true">&#8635;</span> Actualizaciones
            <i id="scriptShopUpdatesBadge" hidden>0</i>
          </button>
```

- [ ] **Paso 4: Añadir el contenedor de pastillas y los(ids del encabezado)**

En `src/index.html`, dentro de `#scriptShopView`: dar `id` al `<span class="eyebrow">` y al `<p>` de la introducción, y añadir el contenedor de pastillas justo **antes** de `#scriptShopGrid`:

```html
            <div>
              <span class="eyebrow" id="scriptShopEyebrow">CAT&Aacute;LOGO OFICIAL POKEGRID</span>
              <h2 id="scriptShopHeading">Shop de scripts</h2>
              <p id="scriptShopIntro">Instala y actualiza scripts publicados por DiegoT34, con verificaci&oacute;n de integridad antes de guardarlos.</p>
            </div>
```

```html
          <div id="scriptShopCategories" class="script-shop-categories" role="group" aria-label="Filtrar por categor&iacute;a"></div>
```

- [ ] **Paso 5: Registrar los ids nuevos**

En `src/userscripts.js`, en las listas de `REQUIRED_SCRIPT_ELEMENTS`:

- En la primera lista, añadir `'#scriptShopUpdatesTab'` y `'#scriptShopCategories'`.
- En la lista de la vista Shop, añadir `'#scriptShopUpdatesBadge'`, `'#scriptShopEyebrow'`, `'#scriptShopIntro'`.

- [ ] **Paso 6: El estilo de las pastillas**

Añadir al final de `src/styles.css`:

```css
/* Pastillas de categoría de la Shop. Con número, y solo con las que existen de verdad
   en el catálogo: un «Combate» vacío no aparece, porque una pastilla sin nada detrás
   promete algo que no hay. Se fija el ancho con ch-unit para que cambiar el número no
   mueva el resto de la fila. */
.script-shop-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 2px;
}

.script-shop-categories:empty {
  display: none;
}

.script-shop-category {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 999px;
  background: rgba(255, 255, 255, .05);
  color: inherit;
  font: 600 12px/1 system-ui, sans-serif;
  cursor: pointer;
}

.script-shop-category:hover {
  border-color: rgba(255, 255, 255, .28);
}

.script-shop-category[aria-pressed="true"] {
  background: var(--warning);
  border-color: var(--warning);
  color: #17140a;
}

.script-shop-category-count {
  min-width: 1.6ch;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .28);
  font-size: 11px;
  text-align: center;
}

.script-shop-category[aria-pressed="true"] .script-shop-category-count {
  background: rgba(0, 0, 0, .22);
}
```

- [ ] **Paso 7: Ejecutar y verificar que pasa**

Run: `node tests\multi-game-userscripts-static-smoke.js` → PASS.
Run: `node scripts\run-tests.cjs node` → todas verdes.

- [ ] **Paso 8: Sabotear para comprobar que muerde**

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | Quita `id="scriptShopCategories"` del HTML | `REQUIRED_SCRIPT_ELEMENTS apunta a ids que no existen` |
| 2 | Cambia `id="scriptShopUpdatesBadge"` por `id="scriptShopUpdateBadge2"` | igual, por la lista |
| 3 | Borra del CSS todo el bloque `.script-shop-category*` | `El estilo de las pastillas tiene que existir.` |

- [ ] **Paso 9: Commit**

```bash
git add src/index.html src/styles.css src/userscripts.js tests/multi-game-userscripts-static-smoke.js
git commit -m "Anadir la tercera pestana de actualizaciones y las pastillas de categoria"
```

---

### Tarea 4: Cablear la vista en `userscripts.js`

**Ficheros:**
- Modificar: `src/userscripts.js` (declaraciones, `renderScriptShop`, `switchScriptsView`, `updateScriptShopBadge`, `scriptShopNotificationCounts`, y los escuchadores de búsqueda y pestañas)
- Modificar: `tests/script-shop-smoke.js` (comprobación estática del debounce)

**Interfaces:**
- Consume: `buildShopView`, `categoryKey`, `debounce` de `src/script-shop-view.js` (Tarea 1); `set(id, total, desglose)` de `src/notification-hub.js` (Tarea 2); los ids del DOM de la Tarea 3.
- Produce: nada para tareas siguientes. Cierra el comportamiento.

- [ ] **Paso 1: Escribir la prueba que falla**

En `tests/script-shop-smoke.js`, antes del `console.log`:

```js
// El debounce de la búsqueda. Se comprueba estáticamente porque con el catálogo del
// harness, de un script, no hay forma de medir un retardo real: la sensación no se
// prueba. Lo que sí se prueba es que el input pase por el debounce, y si alguien
// revierte esto a una llamada directa, la puerta falla.
assert.match(userscripts, /debounce\(renderScriptShop,\s*\d+\)/,
  'El render de la Shop tiene que ir envuelto en debounce.');
assert.doesNotMatch(userscripts, /scriptShopSearch\.addEventListener\('input',\s*renderScriptShop\s*\)/,
  'El input de la búsqueda no puede llamar al render directamente: eso es justo lo que rehace las tarjetas en cada tecla.');
assert.match(userscripts, /renderScriptShopDebounced\.ahora\(\)/,
  'La tecla Enter tiene que saltarse la espera: quien pulsa Enter espera ya.');
assert.match(userscripts, /renderScriptShopDebounced\.cancelar\(\)/,
  'Al cambiar de pestaña hay que cancelar la espera, o el render salta dentro de un panel ya oculto.');
assert.match(userscripts, /buildShopView\(\{/,
  'La vista tiene que construirse con buildShopView, no a mano.');
assert.match(userscripts, /buildShopView\(\{[^}]*view:\s*activeScriptsView/,
  'buildShopView tiene que recibir la vista activa.');
```

Y la prueba del DOM, tambien antes de cablear nada. Se escribe aqui y no al final a proposito:
si se escribiera despues de implementar, nunca habria visto fallar al codigo, y una prueba
que no ha visto fallar no prueba nada. Lo que sale es un fallo de verdad: no hay ningun
pastilla renderizada todavia.

Crear `tests/script-shop-dom-smoke.js`:

```js
const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-shop-dom-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

// Lo que el catálogo del harness puede demostrar, y no más. Trae un solo script, así
// que aquí se comprueba la estructura del DOM y los estados, no el filtrado. El
// filtrado se prueba en Node, con catálogos de 200 entradas, y para eso existe el
// módulo puro: es el motivo de que este proyecto no dependa del harness.
app.whenReady().then(async () => {
  let ventana = null;
  try {
    ventana = new BrowserWindow({
      show: false, width: 1360, height: 840,
      webPreferences: {
        preload: path.join(__dirname, 'launcher-preview-preload.js'),
        contextIsolation: true, sandbox: false,
        backgroundThrottling: false, webviewTag: true
      }
    });
    await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    const hayTres = await ventana.webContents.executeJavaScript(`(() => ({
      instaladas: Boolean(document.querySelector('#installedScriptsTab')),
      shop: Boolean(document.querySelector('#scriptShopTab')),
      updates: Boolean(document.querySelector('#scriptShopUpdatesTab')),
      badge: Boolean(document.querySelector('#scriptShopUpdatesBadge')),
      pastillas: Boolean(document.querySelector('#scriptShopCategories'))
    }))()`);
    assert.deepEqual(hayTres, { instaladas: true, shop: true, updates: true, badge: true, pastillas: true },
      `Las tres pestañas y el filtro tienen que existir. Obtenido: ${JSON.stringify(hayTres)}`);

    // Abrir el centro de scripts y entrar en Shop.
    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptsButton').click(); true`);
    await waitFor(ventana, "!document.querySelector('#scriptShopView').hidden");
    await waitFor(ventana, "document.querySelectorAll('#scriptShopCategories .script-shop-category').length > 0");

    const shop = await ventana.webContents.executeJavaScript(`(() => ({
      seleccionada: document.querySelector('#scriptShopTab').getAttribute('aria-selected'),
      updatesSeleccionada: document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected'),
      buscadorVisible: !document.querySelector('#scriptShopSearch').hidden,
      pastillas: [...document.querySelectorAll('#scriptShopCategories .script-shop-category')].map((b) => ({
        nombre: b.querySelector('span').textContent,
        numero: b.querySelector('.script-shop-category-count').textContent,
        pulsada: b.getAttribute('aria-pressed')
      }))
    }))()`);
    assert.equal(shop.seleccionada, 'true', 'En Shop, su pestaña queda marcada.');
    assert.equal(shop.updatesSeleccionada, 'false', 'Y la de Actualizaciones no.');
    assert.equal(shop.buscadorVisible, true, 'En Shop se ve el buscador.');
    assert.equal(shop.pastillas.length, 2, `Con el catálogo del harness hay «Todas» y una categoría. Obtenido: ${JSON.stringify(shop.pastillas)}`);
    assert.equal(shop.pastillas[0].nombre, 'Todas', 'La primera pastilla es «Todas».');
    assert.equal(shop.pastillas[0].pulsada, 'true', 'Y «Todas» viene pulsada.');
    assert.equal(shop.pastillas[1].numero, '1', 'La categoría del catálogo tiene una entrada.');

    // La pastilla filtra de verdad, en el DOM.
    await ventana.webContents.executeJavaScript(
      `document.querySelectorAll('#scriptShopCategories .script-shop-category')[1].click(); true`
    );
    await wait(300);
    const filtrada = await ventana.webContents.executeJavaScript(`(() => ({
      tarjetas: document.querySelectorAll('#scriptShopGrid .script-shop-card').length,
      mostrando: document.querySelector('#scriptShopSummary').textContent.includes('mostrando')
    }))()`);
    assert.equal(filtrada.tarjetas, 1, 'Elegir la categoría deja su tarjeta y quita las demás.');
    assert.equal(filtrada.mostrando, true, 'Con filtro activo el resumen dice cuántas se están mostrando.');

    // Volver a «Todas».
    await ventana.webContents.executeJavaScript(
      `document.querySelectorAll('#scriptShopCategories .script-shop-category')[0].click(); true`
    );
    await wait(300);
    const todas = await ventana.webContents.executeJavaScript(`(() => ({
      tarjetas: document.querySelectorAll('#scriptShopGrid .script-shop-card').length,
      mostrando: document.querySelector('#scriptShopSummary').textContent.includes('mostrando')
    }))()`);
    assert.equal(todas.tarjetas, 1, '«Todas» vuelve a quitar el filtro.');
    assert.equal(todas.mostrando, false, 'Sin filtro, el resumen no dice cuántas se muestran.');

    // La pestaña de Actualizaciones: sin búsqueda y con el estado de "al día", porque
    // el único script del harness no está instalado y no hay nada que actualizar.
    const updates = await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#scriptShopUpdatesTab').click();
      await new Promise((r) => setTimeout(r, 400));
      return {
        seleccionada: document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected'),
        shopSeleccionada: document.querySelector('#scriptShopTab').getAttribute('aria-selected'),
        buscadorVisible: !document.querySelector('#scriptShopSearch').hidden,
        encabezado: document.querySelector('#scriptShopHeading').textContent,
        eyebrow: document.querySelector('#scriptShopEyebrow').textContent,
        vacio: document.querySelector('#scriptShopGrid .script-shop-empty')?.textContent || '',
      };
    })()`);
    assert.equal(updates.seleccionada, 'true', 'Al entrar en Actualizaciones, su pestaña queda marcada.');
    assert.equal(updates.shopSeleccionada, 'false', 'Y la de Shop deja de estarlo.');
    assert.equal(updates.buscadorVisible, false, 'En Actualizaciones no hay buscador: es de Shop.');
    assert.equal(updates.encabezado, 'Actualizaciones', 'El encabezado dice en qué vista estás.');
    assert.match(updates.vacio, /Estás al día/,
      `Sin actualizaciones tiene que decir que estás al día, no "no hay resultados". Obtenido: "${updates.vacio}"`);

    // Y la pestaña se recuerda al reabrir.
    await ventana.webContents.executeJavaScript(`document.querySelector('#closeScriptsButton')?.click(); true`);
    await wait(200);
    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptsButton').click(); true`);
    await wait(400);
    const recordada = await ventana.webContents.executeJavaScript(
      "document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected')"
    );
    assert.equal(recordada, 'true', 'La pestaña elegida se recuerda al reabrir el centro de scripts.');

    console.log(JSON.stringify({ ok: true, hayTres, shop, filtrada, todas, updates, recordada }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});
```

Y registrar la suite en `scripts/run-tests.cjs`, en la lista de Electron, junto a
`userscripts-manager-smoke.js`.

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\script-shop-smoke.js`
Expected: FAIL en `El render de la Shop tiene que ir envuelto en debounce.`

- [ ] **Paso 3: Declaraciones y estado nuevo**

En `src/userscripts.js`, junto a las demás constantes de la Shop:

```js
const SCRIPT_SHOP_VIEW_KEY = 'pokegrid:scripts-view:v1';
const SCRIPT_SHOP_VISTAS = ['installed', 'shop', 'updates'];
const SCRIPT_SHOP_DEBOUNCE_MS = 250;
```

Y reemplazar la declaración de `activeScriptsView`:

```js
  // La pestaña se recuerda; la categoría no. Es una decisión de trabajo, no una
  // preferencia del launcher, así que al reabrir se empieza en «Todas». Un valor
  // guardado que no sea una de las tres pestañas se ignora en vez de dejar al usuario
  // en una vista que no existe.
  let activeScriptsView = 'installed';
  let scriptShopCategory = '';
```

Con su cargador, colocado junto a `loadScriptShopSeen`:

```js
  function loadScriptShopView() {
    try {
      const value = String(localStorage.getItem(SCRIPT_SHOP_VIEW_KEY) || '').trim();
      return SCRIPT_SHOP_VISTAS.includes(value) ? value : 'installed';
    } catch {
      return 'installed';
    }
  }

  function saveScriptShopView(view) {
    try { localStorage.setItem(SCRIPT_SHOP_VIEW_KEY, String(view)); } catch {}
  }
```

Y asignarla al arrancar, sustituyendo `let activeScriptsView = 'installed';` por:

```js
  let activeScriptsView = loadScriptShopView();
```

- [ ] **Paso 4: El render, con `buildShopView`**

En `src/userscripts.js`, sustituir el cuerpo de `renderScriptShop` desde el principio de la búsqueda hasta el final del bucle de tarjetas. La parte de carga vacía se queda igual. El bloque nuevo:

```js
    const vista = buildShopView({
      scripts: scriptShopCatalog.scripts,
      view: activeScriptsView,
      query: scriptShopSearch.value,
      category: scriptShopCategory,
      stateOf: scriptShopState,
      isNew: (item) => !installedShopScript(item.id) && scriptShopSeen[item.id] !== scriptShopSignature(item)
    });
    const { rows, categories, counts } = vista;

    // Un solo publicación al registro: el hub reparte el total a la bolita del menú y
    // al botón de arriba, y cada campo del desglose al badge que lo pide. Esos tres
    // números son distintos a propósito: la bolita avisa de contenido sin ver, y la
    // pestaña de Actualizaciones avisa de lo que hay que instalar.
    window.pokeGridNotifications.set('scripts', counts.total, {
      newScripts: counts.newScripts,
      updates: counts.updates
    });
    scriptsButton.title = [
      counts.newScripts ? `${counts.newScripts} script${counts.newScripts === 1 ? '' : 's'} nuevo${counts.newScripts === 1 ? '' : 's'}` : '',
      counts.updates ? `${counts.updates} actualización${counts.updates === 1 ? '' : 'es'}` : ''
    ].filter(Boolean).join(' y ') || 'No hay novedades de scripts';

    // El encabezado cambia con la vista, porque son dos destinos distintos y el mismo
    // título haría dudar de en cuál se está.
    const enActualizaciones = activeScriptsView === 'updates';
    scriptShopEyebrow.textContent = enActualizaciones ? 'PENDIENTES DE INSTALAR' : 'CATÁLOGO OFICIAL POKEGRID';
    scriptShopHeading.textContent = enActualizaciones ? 'Actualizaciones' : 'Shop de scripts';
    scriptShopIntro.textContent = enActualizaciones
      ? 'Solo los scripts publicados por DiegoT34 que tienen una versión más nueva que la que tienes instalada.'
      : 'Instala y actualiza scripts publicados por DiegoT34, con verificación de integridad antes de guardarlos.';
    // La búsqueda y el botón de verificar son de Shop. En Actualizaciones sobrarían, y
    // dos cajas que se ignoran la una a la otra confunden. Se oculta el contenedor
    // entero, no el input suelto: ocultar solo el input deja la lupa huérfana y el
    // hueco donde estaba el botón.
    scriptShopTools.hidden = enActualizaciones;

    scriptShopSummary.innerHTML = `
      <span><b>${counts.published}</b> publicados</span>
      <span><b>${counts.installed}</b> instalados</span>
      <span class="${counts.updates ? 'has-updates' : ''}"><b>${counts.updates}</b> actualizaciones</span>
      ${counts.filtered ? `<span><b>${counts.showing}</b> mostrando</span>` : ''}
      <small>${scriptShopCatalog.stale ? 'Copia guardada · GitHub no respondió' : `Catálogo ${escapeHtml(scriptShopCatalog.updatedAt || 'actual')}`}</small>`;

    renderScriptShopCategories(categories);

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'script-shop-empty';
      // Cuatro mensajes distintos porque son cuatro situaciones distintas. Un "no hay
      // resultados" cuando lo que pasa es que estás al día manda a la gente a buscar
      // un problema que no tiene.
      if (!scriptShopCatalog.scripts.length) {
        empty.innerHTML = '<span aria-hidden="true">📦</span><strong>La Shop está lista</strong><small>Los scripts aparecerán aquí cuando DiegoT34 los publique en el catálogo.</small>';
      } else if (enActualizaciones && !counts.updates) {
        empty.innerHTML = '<span aria-hidden="true">✅</span><strong>Estás al día</strong><small>No hay actualizaciones pendientes de los scripts que tienes instalados.</small>';
      } else if (scriptShopCategory) {
        empty.innerHTML = '<span aria-hidden="true">⌕</span><strong>Nada por aquí</strong><small>No hay nada en «' + escapeHtml(categoryNameFor(categories)) + '»' + (enActualizaciones ? ' con actualizaciones pendientes' : '') + '. Prueba otra categoría.</small>';
      } else {
        empty.innerHTML = '<span aria-hidden="true">⌕</span><strong>No hay resultados</strong><small>Prueba otra palabra.</small>';
      }
      scriptShopGrid.appendChild(empty);
      return;
    }
```

Y el bucle de tarjetas pasa a usar `rows` en vez de `rows` filtrado a mano: sustituir `for (const item of rows) {` por el mismo bucle, **sin cambios**, porque `rows` ya viene ordenado y filtrado. Se elimina el cálculo manual de `query` y del `filter` que había justo antes.

**Ojo:** el código actual calcula `const query = ...` y `const rows = (scriptShopCatalog.scripts || []).filter(...)`, y también `installedCount` y `updateCount`. Los cuatro se borran: los reemplazan `counts`.

- [ ] **Paso 5: Las pastillas**

Después de `renderScriptShop`, añadir:

```js
  // Las pastillas. «Todas» primero y luego solo las categorías que existen en el
  // conjunto base, con su número. Los números no se mueven al elegir una: eso es lo
  // que permite saltar de una a otra sin volver a «Todas».
  function renderScriptShopCategories(categories) {
    if (!scriptShopCategories) return;
    scriptShopCategories.replaceChildren();
    const total = categories.reduce((suma, c) => suma + c.count, 0);
    const opcion = (nombre, clave, cuenta, activo) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'script-shop-category';
      boton.setAttribute('aria-pressed', String(activo));
      boton.dataset.category = clave;
      const texto = document.createElement('span');
      texto.textContent = nombre;
      const numero = document.createElement('span');
      numero.className = 'script-shop-category-count';
      numero.textContent = String(cuenta);
      boton.append(texto, numero);
      boton.addEventListener('click', () => {
        scriptShopCategory = clave;
        renderScriptShop();
      });
      return boton;
    };
    scriptShopCategories.appendChild(opcion('Todas', '', total, !scriptShopCategory));
    for (const categoria of categories) {
      scriptShopCategories.appendChild(opcion(categoria.name, categoria.key, categoria.count, scriptShopCategory === categoria.key));
    }
    // Si la categoría guardada en memoria ya no existe —el catálogo cambió— se vuelve a
    // «Todas». Dejarla puesta dejaría una lista vacía sin explicación.
    if (scriptShopCategory && !categories.some((c) => c.key === scriptShopCategory)) {
      scriptShopCategory = '';
    }
  }

  function categoryNameFor(categories) {
    const encontrada = categories.find((c) => c.key === scriptShopCategory);
    return encontrada ? encontrada.name : scriptShopCategory;
  }
```

La comprobación de que la categoría sigue existiendo va **después** de pintar, y no antes: `categories` está calculado sobre el conjunto base, así que si el filtro dejaba la lista vacía, `categories` no está vacío y la comprobación no se dispararía nunca.

- [ ] **Paso 6: Declarar los elementos nuevos**

Junto a los demás `document.querySelector` de la Shop:

```js
  const scriptShopUpdatesTab = document.querySelector('#scriptShopUpdatesTab');
  const scriptShopCategories = document.querySelector('#scriptShopCategories');
  const scriptShopEyebrow = document.querySelector('#scriptShopEyebrow');
  const scriptShopHeading = document.querySelector('#scriptShopHeading');
  const scriptShopIntro = document.querySelector('#scriptShopIntro');
  const scriptShopTools = document.querySelector('.script-shop-tools');
```

- [ ] **Paso 7: El debounce y la conmutación de pestañas**

Declarar, después de la definición de `renderScriptShop`:

```js
  // 250 ms. Es lo que evita rehacer todas las tarjetas en cada tecla con un catálogo
  // de 200 entradas. Enter no espera, y cancelar es lo que impide que un render salga
  // dentro de un panel ya oculto.
  const renderScriptShopDebounced = debounce(renderScriptShop, SCRIPT_SHOP_DEBOUNCE_MS);
```

Sustituir `switchScriptsView`:

```js
  function switchScriptsView(view) {
    const destino = SCRIPT_SHOP_VISTAS.includes(view) ? view : 'installed';
    activeScriptsView = destino;
    if (destino !== 'installed') saveScriptShopView(destino);
    const enShop = destino === 'shop';
    const enActualizaciones = destino === 'updates';
    installedScriptsView.hidden = enShop || enActualizaciones;
    scriptShopView.hidden = !(enShop || enActualizaciones);
    installedScriptsTab.classList.toggle('is-active', destino === 'installed');
    scriptShopTab.classList.toggle('is-active', enShop);
    scriptShopUpdatesTab.classList.toggle('is-active', enActualizaciones);
    installedScriptsTab.setAttribute('aria-selected', String(destino === 'installed'));
    scriptShopTab.setAttribute('aria-selected', String(enShop));
    scriptShopUpdatesTab.setAttribute('aria-selected', String(enActualizaciones));
    // La búsqueda es de Shop: al salir de ella, lo que se escribió no se aplica a otra
    // vista. La caja está oculta mientras no estamos en Shop, así que dejarlo puesto
    // haría reaparecer el filtro sin que nadie lo escribiera.
    if (destino !== 'shop') scriptShopSearch.value = '';
    if (destino === 'shop') scriptShopCategory = '';
    // Un render pendiente dentro de un panel oculto es un render en el sitio
    // equivocado.
    renderScriptShopDebounced.cancelar();
    if ((enShop || enActualizaciones) && scriptShopCatalog) {
      // Ver lo nuevo se marca al abrir Shop, y solo al abrir Shop. Si se marcara al
      // abrir cualquier pestaña, el contador de Shop se vaciaría sin que el usuario
      // hubiera pasado por Shop nunca.
      if (enShop) markScriptShopCatalogSeen();
      renderScriptShop();
    } else if (enShop || enActualizaciones) {
      loadScriptShop(false);
    }
  }
```

- [ ] **Paso 8: Los escuchadores**

Sustituir el escuchador de búsqueda:

```js
  scriptShopSearch.addEventListener('input', renderScriptShopDebounced);
  // Enter aplica ya. Escribir letra a letra espera; pulsar Enter es una decisión.
  scriptShopSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      renderScriptShopDebounced.ahora();
    }
  });
```

Y añadir junto al de la pestaña de Shop:

```js
  scriptShopUpdatesTab.addEventListener('click', () => switchScriptsView('updates'));
```

- [ ] **Paso 9: Retirar el recuento manual**

`scriptShopNotificationCounts` deja de usarse: el recuento sale de `buildShopView`. **Bórrala** y borra también la llamada a `updateScriptShopBadge()` que había al principio de `renderScriptShop`, porque su contenido lo hace ahora el bloque nuevo del Paso 4.

Comprueba que no queda ninguna referencia:

```bash
node "C:\Users\Shockviny\AppData\Local\Temp\opencode\contar.js" src/userscripts.js
```

Esperado: `scriptShopNotificationCounts` en 0 apariciones y `updateScriptShopBadge` en 0.

- [ ] **Paso 10: Ejecutar y verificar que pasa**

Run: `node tests\script-shop-smoke.js` → PASS.
Run: `node_modules\electron\dist\electron.exe tests\script-shop-dom-smoke.js` → PASS con `{"ok":true,...}`.
Run: `node_modules\electron\dist\electron.exe tests\userscripts-manager-smoke.js` → PASS.
Run: `node scripts\run-tests.cjs node` → todas verdes.

- [ ] **Paso 11: Sabotear para comprobar que muerde**

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | Vuelve a `scriptShopSearch.addEventListener('input', renderScriptShop)` | `El input de la búsqueda no puede llamar al render directamente` |
| 2 | Quita la llamada a `renderScriptShopDebounced.cancelar()` de `switchScriptsView` | `Al cambiar de pestaña hay que cancelar la espera` |
| 3 | Sustituye `view: activeScriptsView` por `view: 'shop'` fijo | `buildShopView tiene que recibir la vista activa` |
| 4 | Mueve `markScriptShopCatalogSeen()` fuera del `if (enShop)` | Ninguna prueba estática lo caza. **Añádela antes de dar la tarea por buena**: `assert.match(userscripts, /if \(enShop\) markScriptShopCatalogSeen\(\);/)` en `tests/script-shop-smoke.js`, y repite el sabotaje. |

La 4 es el hueco real de esta tarea, y el paso lo dice en vez de esconderlo.

- [ ] **Paso 12: Commit**

```bash
git add src/userscripts.js tests/script-shop-smoke.js
git commit -m "Filtrar por categoria, anadir la vista de actualizaciones y esperar antes de repintar"
```

---

### Tarea 5: Documentación y cierre

**Ficheros:**
- Modificar: `README.md`

**Interfaces:**
- Consume: todo lo de las tareas 1 a 4.
- Produce: nada.

- [ ] **Paso 1: La prueba del DOM ya existe**

Se escribió en el paso 1 de la Tarea 4, antes de cablear nada, y se ejecutó en verde
en el paso 10 de esa misma tarea. Aquí no se repite: esta tarea es documentación y
cierre.

- [ ] **Paso 2: Comprobar que las dos pruebas de la Tarea 4 siguen en verde**

Run: `node_modules\electron\dist\electron.exe tests\script-shop-dom-smoke.js`
Expected: PASS con `{"ok":true,...}`.

- [ ] **Paso 3: Correr las puertas**

Run: `node scripts\run-tests.cjs node` → todas verdes.
Run: `node_modules\electron\dist\electron.exe tests\userscripts-manager-smoke.js` → PASS.
Run: `node_modules\electron\dist\electron.exe tests\launcher-visual-smoke.js` → PASS.

La puerta de Electron completa se corre **una vez, al final**, no en esta tarea.

- [ ] **Paso 4: Documentar**

En `README.md`, en la lista de características, después de la línea de la Shop online:

```markdown
- Pestaña **Actualizaciones** en el centro de scripts: solo los scripts con versión publicada más nueva que la instalada, con su propio contador.
- Filtro de categoría por pastillas, con el número de cada una. Los números no cambian al elegir una, para poder saltar de una categoría a otra sin volver a «Todas».
```

Y en `docs/SCRIPT_SHOP.md`, añadir una sección corta:

```markdown
## Categorías

El campo `category` de cada script es una cadena libre de hasta 60 caracteres. El
launcher agrupa por él y muestra una pastilla por cada categoría que exista de verdad en
el catálogo, con el número de scripts que la tienen. Un script sin `category` cae en
`Utilidades`.
```

- [ ] **Paso 5: Sabotear para comprobar que muerde**

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | En `renderScriptShopCategories`, quita `boton.dataset.category = clave` y haz que el `click` siempre ponga `''` | `Elegir la categoría deja su tarjeta y quita las demás.` |
| 2 | En `switchScriptsView`, quita `if (destino === 'shop') scriptShopCategory = '';` | `Sin filtro, el resumen no dice cuántas se muestran.` |
| 3 | Quita `if (enShop) markScriptShopCatalogSeen();` | `La pestaña elegida se recuerda al reabrir` no; cae la del contador, que hay que mirar aparte |

Si el 3 no cae en ninguna prueba, **añade la aserción estática** que la Tarea 4 dejó anotada y repite. No lo des por comprobado sin verlo.

- [ ] **Paso 6: Commit**

```bash
git add tests/script-shop-dom-smoke.js scripts/run-tests.cjs README.md docs/SCRIPT_SHOP.md
git commit -m "Probar la tercera pestana y el filtro de categoria en el DOM, y documentarlos"
```

---

## Antes de dar esto por terminado

1. `node scripts\run-tests.cjs node` en verde.
2. `node scripts\run-tests.cjs electron` en verde, **una vez al final**. Se sabe que
   `dynamic-accounts-proxy-smoke.js` tarda unos 900 s en una máquina sin salida al
   juego y tiene presupuesto propio en el runner.
3. Cada suite nueva ejecutada por separado con `Start-Process -Wait -PassThru`.
4. **Ojo con la puerta de Electron**: ya se sabe que
   `accounts-backup-restore-smoke.js` falla desde antes de la v0.23.4, en dos versiones
   publicadas. No es de este proyecto. Si vuelve a salir, comparar con el ledger antes
   de investigar, no después.
5. Bump de versión y un solo build. **Nada de publicar.**