# Control del farmeo por Telegram — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un userscript que lee en qué hunt está cada una de las 4 cuentas y las envía a otra hunt desde un chat de Telegram, todas a la vez o una sola.

**Architecture:** Cuatro páginas del juego ejecutan el mismo userscript. Se coordinan por el almacén compartido cifrado del gestor de userscripts: un registro por página, un turno de escucha con caducidad, y un bus de comandos con id único. La página que tiene el turno habla con Telegram; las demás obedecen.

**Tech Stack:** JavaScript en el mundo de la página (sin dependencias), `GM_*` del gestor de userscripts de PokeGrid, Electron 43 para las pruebas, `node:vm` para las pruebas puras.

**Spec:** `docs/superpowers/specs/2026-10-23-control-por-telegram-design.md`

## Global Constraints

- **Cero dependencias nuevas.** Todo con lo que ya hay (`node:vm`, Electron, el DOM).
- **Español con tildes** en todo lo que ve el usuario. Directo, sin rodeos.
- **No se toca `src/renderer.js`.** La automatización del modo farmeo se queda como está.
- **Una sola ruta para lo mismo.** Si un canal de IPC se sustituye, el viejo desaparece y se actualiza su llamador; no quedan dos.
- **El token nunca se escribe en claro** en `localStorage` ni en el código. Solo en el almacén cifrado (`GM_setSharedValue`).
- **`GM_xmlhttpRequest` solo a `api.telegram.org`**, declarado con `@connect`.
- **Los datos de un botón de Telegram no pasan de 64 bytes.**
- **Las pruebas del área, en orden, o no se compila.** Toda prueba nueva entra en `herramientas/area-entera.ps1` en su sitio.
- **Los mensajes de commit sin comillas graves ni ideogramas.**

## Review Focus

Cada línea de aquí es una entrada que el diseño no menciona y que puede romper el programa. Cada una tiene su prueba en la tarea que la implementa.

1. **Un mensaje del bot que llega dos veces** (Telegram reintenta si el acuse tarda). El usuario espera que la cuenta viaje **una** vez, no dos.
2. **Un `callback_query` de un usuario que no está en la lista blanca.** El usuario espera que no pase nada y que el bot no conteste con datos.
3. **`/ir` con un texto vacío, con tildes, o con un nombre que aparece en tres mapas.** El usuario espera coincidencias útiles, no un error ni el primer resultado al azar.
4. **Una página que se cierra mientras tiene el turno.** El usuario espera que otra lo recoja y que el bot siga contestando.
5. **El juego sin el mapa abierto, con el buscador cerrado, o con el marcador no visible.** El usuario espera que el viaje ocurra igual, o un error que diga qué pasó.

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `userscripts/PokeGrid-Telegram-Control.user.js` | **Nuevo.** El script entero: configuración, Telegram, turno, bus y viaje. |
| `tests/control-telegram-puro-smoke.js` | **Nuevo.** Pruebas puras con `node:vm`: config, comandos, búsqueda, formato. |
| `tests/control-telegram-navegador-smoke.js` | **Nuevo.** Electron con una página de mapa falsa: lector, viaje y doble ejecución. |
| `tests/fixtures/mapa-falso.html` | **Nuevo.** DOM mínimo con el mismo marcado que usa el juego. |
| `src/main.js` | Canal `userscripts:bundled-script` con lista blanca. |
| `src/preload.js` | `loadBundledUserScript(name)`. |
| `src/userscripts.js` | Sincronización genérica de scripts incluidos. |
| `tests/ipc-sender-guard-smoke.js` | Clasificar el canal nuevo. |
| `herramientas/comprobar-patrones.cjs` | Invariantes del script. |
| `herramientas/area-entera.ps1` | Las pruebas nuevas, en su sitio. |
| `userscripts/INSTALACION-TELEGRAM.md` | Cómo se configura el bot de control. |

---

## Task 1: Canal de scripts incluidos con lista blanca

Hoy `userscripts:bundled-telegram` está clavado a un nombre de fichero. Para que quepan dos scripts, pasa a recibir el nombre, validado contra una lista.

**Files:**
- Modify: `src/main.js:2560-2576`
- Modify: `src/preload.js`
- Modify: `src/userscripts.js:278`
- Test: `tests/ipc-sender-guard-smoke.js:46`

**Interfaces:**
- Produces: canal `userscripts:bundled-script` con firma `(event, name: string) => { ok, code, sourceUrl } | { ok:false, error }`.
- Produces: `window.pokeGrid.loadBundledUserScript(name)`.
- Consumes: nada.

- [ ] **Step 1: Escribir la prueba que falla**

En `tests/ipc-sender-guard-smoke.js`, cambia la entrada de la lista y añade una comprobación de que el canal nuevo existe con lista blanca:

```js
// Antes: 'userscripts:bundled-telegram',
'userscripts:bundled-script',
```

Y al final del fichero, junto a las demás comprobaciones de forma:

```js
// El canal de scripts incluidos recibe un NOMBRE. Si aceptara una ruta, un script podria leer
// cualquier fichero del disco con solo llamarlo; por eso hay lista blanca.
assert.match(mainSource, /const BUNDLED_SCRIPT_NAMES = new Set\(\[/,
  'El canal de scripts incluidos tiene que validar el nombre contra una lista blanca.');
assert.match(mainSource, /if \(!BUNDLED_SCRIPT_NAMES\.has\(name\)\)/,
  'Y tiene que rechazar lo que no este en la lista.');
assert.doesNotMatch(mainSource, /'userscripts:bundled-telegram'/,
  'El canal viejo se sustituye, no se duplica.');
```

- [ ] **Step 2: Ejecutar la prueba y ver que falla**

Run: `node tests/ipc-sender-guard-smoke.js`
Expected: FAIL — `'userscripts:bundled-telegram'` sigue clasificado y no existe `BUNDLED_SCRIPT_NAMES`.

- [ ] **Step 3: Implementar el canal**

En `src/main.js`, sustituye el manejador de la línea 2560 por:

```js
// Los scripts que viajan dentro del launcher. La lista es blanca y no un directorio: el canal recibe
// un NOMBRE, y sin la lista un nombre con `..` leeria cualquier fichero del disco. Se declara junto al
// manejador para que anadir un script obligue a tocar aqui.
const BUNDLED_SCRIPT_NAMES = new Set([
  'PokeGrid-Telegram-Alerts.user.js',
  'PokeGrid-Telegram-Control.user.js'
]);
ipcMain.handle('userscripts:bundled-script', (event, rawName) => {
  const rechazo = mainWindowSenderRefusal(event);
  if (rechazo) return rechazo;
  try {
    const name = path.basename(String(rawName || ''));
    if (!BUNDLED_SCRIPT_NAMES.has(name)) throw new Error('Ese script no va incluido en el launcher.');
    const file = path.join(bundledUserScriptsPath(), name);
    if (!fs.existsSync(file)) throw new Error('No se encontró el script incluido.');
    if (fs.statSync(file).size > USER_SCRIPT_CODE_LIMIT) throw new Error('El script supera 10 MB.');
    return {
      ok: true,
      name,
      code: fs.readFileSync(file, 'utf8'),
      sourceUrl: `pokegrid-bundled://${name}`
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
```

En `src/preload.js`, sustituye `loadBundledTelegramAlerts` por:

```js
loadBundledUserScript: (name) => ipcRenderer.invoke('userscripts:bundled-script', name),
```

- [ ] **Step 4: Actualizar el llamador**

En `src/userscripts.js:275-289`, cambia la llamada:

```js
const bundled = await window.pokeGrid.loadBundledUserScript('PokeGrid-Telegram-Alerts.user.js');
if (!bundled.ok || !bundled.code) return rows;
```

- [ ] **Step 5: Ejecutar las pruebas y ver que pasan**

Run: `node tests/ipc-sender-guard-smoke.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/preload.js src/userscripts.js tests/ipc-sender-guard-smoke.js
git commit -m "El canal de scripts incluidos valida el nombre contra una lista blanca"
```

---

## Task 2: Sincronizar los scripts incluidos

`updateBundledTelegramScript` solo **actualiza** uno que ya exista: si el usuario nunca lo instaló, no aparece nunca, aunque el comentario diga lo contrario. Se generaliza.

**Files:**
- Modify: `src/userscripts.js:275-289`
- Modify: `src/userscripts.js:1092`
- Test: `tests/control-telegram-puro-smoke.js` (se crea aquí, mínimo)

**Interfaces:**
- Produces: `sincronizarScriptsIncluidos(rows, deps)` donde `deps = { load(name), save(value) }`, devuelve `Promise<rows>`.
- Consumes: `loadBundledUserScript` de la Task 1.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `tests/control-telegram-puro-smoke.js`:

```js
// Pruebas puras del control por Telegram. Sin DOM y sin Electron: se carga el fuente del script en
// un contexto de `node:vm` con dobles de GM_* y se prueban las funciones que no tocan la pagina.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.join(__dirname, '..');
const codigo = fs.readFileSync(
  path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');

function cargar() {
  const contexto = vm.createContext({
    __PG_CONTROL_TEST__: true,
    console,
    setTimeout,
    clearTimeout,
    crypto: { randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }
  });
  vm.runInContext(codigo, contexto, { filename: 'control-telegram.user.js' });
  return contexto.__pgControl;
}

const api = cargar();
assert.ok(api, 'El script tiene que exponer sus funciones puras cuando se carga para pruebas.');

// --- Comandos
assert.deepEqual(api.parsearComando('/ir blastoise'),
  { accion: 'ir', argumento: 'blastoise' });
assert.deepEqual(api.parsearComando('/ir@MiBot Blastoise'),
  { accion: 'ir', argumento: 'Blastoise' },
  'Telegram añade @nombreDelBot cuando el bot está en un grupo.');
assert.deepEqual(api.parsearComando('/estado'),
  { accion: 'estado', argumento: '' });
assert.deepEqual(api.parsearComando('hola'),
  { accion: '', argumento: '' },
  'Un texto suelto sin barra no es un comando.');
assert.deepEqual(api.parsearComando('/ir'),
  { accion: 'ir', argumento: '' });

// --- Busqueda
const catalogo = [
  { slug: 'blastoise', nombre: 'Blastoise', mapa: 'Kanto', zona: 'Ruta 12', nivel: 45 },
  { slug: 'blastoise-orre', nombre: 'Blastoise', mapa: 'Orre', zona: 'Cueva', nivel: 60 },
  { slug: 'charizard', nombre: 'Charizard', mapa: 'Kanto', zona: 'Ruta 3', nivel: 40 },
  // Con tilde a proposito: el catalogo del juego las trae y el usuario escribe sin ellas la mitad de
  // las veces. Sin normalizar los dos lados, «pokemon» no encuentra «Pokémon» nunca.
  { slug: 'pokemon-x', nombre: 'Pokémon X', mapa: 'Kanto', zona: 'Ruta 1', nivel: 10 }
];
assert.equal(api.buscarHunts(catalogo, 'blast').length, 2);
assert.equal(api.buscarHunts(catalogo, 'BLASTOISE').length, 2, 'La busqueda no distingue mayusculas.');
assert.equal(api.buscarHunts(catalogo, 'char').length, 1);
assert.equal(api.buscarHunts(catalogo, 'pokemon').length, 1, 'Buscar sin tilde encuentra lo que la tiene.');
assert.equal(api.buscarHunts(catalogo, 'POKÉMON').length, 1, 'Y buscar con tilde tambien.');
assert.equal(api.buscarHunts(catalogo, 'zzz').length, 0);
assert.equal(api.buscarHunts(catalogo, '').length, 0, 'Sin texto no se devuelve el catalogo entero.');
assert.equal(api.buscarHunts(catalogo, 'blast', 1).length, 1, 'El limite se respeta.');

// --- Normalizacion de configuracion
assert.deepEqual(api.normalizarConfig(null),
  { token: '', autorizados: [], orre: false });
assert.deepEqual(api.normalizarConfig({ token: 'abc', autorizados: ['1', 1, 'x'], orre: true }),
  { token: 'abc', autorizados: ['1', 'x'], orre: true },
  'Los ids se normalizan a texto sin repetir.');
assert.deepEqual(api.normalizarConfig({ token: '  123:AAA  ' }).token, '123:AAA');

// --- Barra de seguridad
assert.equal(api.autorizado({ autorizados: ['111'] }, 111), true, 'El id se compara como texto.');
assert.equal(api.autorizado({ autorizados: ['111'] }, '222'), false, 'Otro id no entra.');
assert.equal(api.autorizado({ autorizados: [] }, 111), false, 'Sin lista, nadie entra.');
assert.equal(api.autorizado({}, 111), false, 'Una configuracion rota no autoriza a nadie.');

// --- Botones
assert.deepEqual(api.parsearCallback('a:estado'), { tipo: 'estado' });
assert.deepEqual(api.parsearCallback('h:abc123:2'),
  { tipo: 'elegirCuenta', corto: 'abc123', indice: 2 });
assert.deepEqual(api.parsearCallback('a:abc123:2:todas'),
  { tipo: 'viajar', corto: 'abc123', indice: 2, destino: 'todas' });
assert.deepEqual(api.parsearCallback('a:abc123:0:pagina-9'),
  { tipo: 'viajar', corto: 'abc123', indice: 0, destino: 'pagina-9' });
assert.deepEqual(api.parsearCallback('basura'), { tipo: '' },
  'Un boton que no se reconoce no puede interpretarse como una orden.');
assert.ok(api.parsearCallback('a:abc123:2:todas') === api.parsearCallback('a:abc123:2:todas'),
  'El mismo boton siempre da lo mismo.');

console.log('Control Telegram (puro) OK: comandos, busqueda y configuracion.');
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: FAIL — no existe `userscripts/PokeGrid-Telegram-Control.user.js`.

- [ ] **Step 3: Crear el esqueleto del script con las funciones puras**

Crea `userscripts/PokeGrid-Telegram-Control.user.js`. En esta tarea solo el esqueleto y las funciones puras; el resto llega en las siguientes.

```js
// ==UserScript==
// @name         PokeGrid Telegram Control
// @namespace    pokegrid.telegram-control
// @version      1.0.0
// @description  Lee en que hunt esta cada cuenta y las envia a otra desde Telegram.
// @author       PokeGrid
// @match        https://poke.idleworld.online/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        PokeGrid_sharedStorage
// @connect      api.telegram.org
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // --- Comandos -------------------------------------------------------------
  //
  // Telegram entrega «/ir@MiBot algo» cuando el bot esta en un grupo. Si no se quita el sufijo, el
  // comando no coincide con nada y el bot se queda mudo justo en el caso de cuatro cuentas en un grupo.
  function parsearComando(texto) {
    const limpio = String(texto || '').trim();
    if (!limpio.startsWith('/')) return { accion: '', argumento: '' };
    const [cabeza, ...resto] = limpio.slice(1).split(/\s+/);
    return {
      accion: cabeza.split('@')[0].toLowerCase(),
      argumento: resto.join(' ').trim()
    };
  }

  // --- Busqueda de hunts ----------------------------------------------------
  //
  // Se normaliza sin tildes porque el catalogo del juego las trae y el usuario escribe sin ellas
  // la mitad de las veces. Sin esto, buscar «pokemon» no encuentra «Pokémon».
  function normalizarTexto(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }

  function buscarHunts(catalogo, texto, limite = 6) {
    const buscado = normalizarTexto(texto);
    if (!buscado) return [];
    const lista = Array.isArray(catalogo) ? catalogo : [];
    const puntuar = (hunt) => {
      const nombre = normalizarTexto(hunt.nombre);
      if (nombre === buscado) return 0;
      if (nombre.startsWith(buscado)) return 1;
      if (nombre.includes(buscado)) return 2;
      return 3;
    };
    return lista
      .filter((hunt) => normalizarTexto(hunt.nombre).includes(buscado)
        || normalizarTexto(hunt.slug).includes(buscado))
      .sort((a, b) => puntuar(a) - puntuar(b) || a.nombre.localeCompare(b.nombre))
      .slice(0, Math.max(1, limite));
  }

  // --- Botones --------------------------------------------------------------
  // Los datos de un boton de Telegram no pueden pasar de 64 bytes, asi que llevan solo la forma
  // corta. El detalle de la hunt vive en el almacen, bajo el identificador corto.
  function parsearCallback(datos) {
    const texto = String(datos || '');
    if (texto === 'a:estado') return { tipo: 'estado' };
    const elige = texto.match(/^h:([a-z0-9]+):(\d+)$/);
    if (elige) return { tipo: 'elegirCuenta', corto: elige[1], indice: Number(elige[2]) };
    const orden = texto.match(/^a:([a-z0-9]+):(\d+):(.+)$/);
    if (orden) {
      return { tipo: 'viajar', corto: orden[1], indice: Number(orden[2]), destino: orden[3] };
    }
    return { tipo: '' };
  }

  // La puerta de seguridad, en una sola funcion. La usan el mensaje y el boton, y por eso esta aqui:
  // si la comprobacion se copiara en cada sitio, un dia uno de los dos se olvidaria de mirarla.
  function autorizado(config, id) {
    const lista = Array.isArray(config?.autorizados) ? config.autorizados : [];
    return lista.includes(String(id ?? ''));
  }

  // --- Configuracion --------------------------------------------------------
  function normalizarConfig(bruta) {
    const valor = bruta && typeof bruta === 'object' ? bruta : {};
    const ids = Array.isArray(valor.autorizados) ? valor.autorizados : [];
    return {
      token: String(valor.token || '').trim(),
      autorizados: [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))],
      orre: valor.orre === true
    };
  }

  // --- Para las pruebas -----------------------------------------------------
  //
  // Sin `document` no hay pagina que decorar: el script solo tiene que dejar sus funciones puras a
  // mano. Es la unica concesion que se hace por poder probarlo, y no cambia nada en produccion.
  //
  // ESTE BLOQUE VA AL FINAL DEL IIFE, siempre. Las tareas siguientes anaden funciones y las suman a
  // estas dos listas; si el bloque se quedara en medio, el `return` cortaria el script antes de
  // definirlas y el bot arrancaria sin viaje ni lector.
  if (typeof document === 'undefined') {
    globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig };
    return;
  }

  globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig };
})();
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: PASS.

- [ ] **Step 5: Generalizar la sincronización**

En `src/userscripts.js`, sustituye `updateBundledTelegramScript` por:

```js
// Los scripts que van dentro del launcher y se mantienen solos.
//
// Antes esto solo ACTUALIZABA uno que ya existiera, asi que un script incluido que el usuario nunca
// habia instalado no aparecia nunca y el comentario que decia «se instala en cada arranque» mentia.
// Ahora, si falta, se instala DESACTIVADO: aparece en la lista y el usuario decide en que cuentas.
  async function sincronizarScriptsIncluidos(rows) {
    const incluidos = [
      'PokeGrid-Telegram-Alerts.user.js',
      'PokeGrid-Telegram-Control.user.js'
    ];
    let lista = rows.slice();
    for (const nombre of incluidos) {
      const cargado = await window.pokeGrid.loadBundledUserScript(nombre);
      if (!cargado.ok || !cargado.code) continue;
      const version = parseMetadata(cargado.code).version?.[0] || '0';
      const namespace = parseMetadata(cargado.code).namespace?.[0] || '';
      const existente = lista.find((script) => script.namespace === namespace);
      if (existente) {
        if (compareVersions(version, existente.version) <= 0) continue;
        const resultado = await window.pokeGrid.saveUserScript({
          id: existente.id,
          code: cargado.code,
          enabled: existente.enabled,
          accounts: existente.accounts,
          sourceUrl: cargado.sourceUrl
        });
        if (resultado.ok) lista = resultado.scripts || lista;
        continue;
      }
      const resultado = await window.pokeGrid.saveUserScript({
        code: cargado.code,
        enabled: false,
        accounts: [],
        sourceUrl: cargado.sourceUrl
      });
      if (resultado.ok) lista = resultado.scripts || lista;
    }
    return lista;
  }
```

Y en `loadScripts` (línea 1092):

```js
scripts = await sincronizarScriptsIncluidos(result.scripts || []);
```

- [ ] **Step 6: Ejecutar las pruebas y ver que pasan**

Run: `node tests/control-telegram-puro-smoke.js && node tests/ipc-sender-guard-smoke.js && node --check src/userscripts.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js tests/control-telegram-puro-smoke.js src/userscripts.js
git commit -m "Esqueleto del control por Telegram y scripts incluidos que se instalan solos"
```

---

## Task 3: Lector del estado de la página

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`
- Create: `tests/fixtures/mapa-falso.html`
- Create: `tests/control-telegram-navegador-smoke.js`

**Interfaces:**
- Produces: `leerEstadoPagina(): { ready, trainerName, location, leader: { nombre, nivel, hp, maxHp } | null }`
- Consumes: nada.

- [ ] **Step 1: Crear la página falsa**

Crea `tests/fixtures/mapa-falso.html`, con el mismo marcado que usa el juego para lo que se lee:

```html
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Mapa falso</title></head>
<body>
  <div class="game-root">
    <div class="phud-tloc">Kanto · Ruta 12</div>
    <div class="pg-player-meta">Entrenador: SHOCKVOR · Nivel 85</div>
    <div class="pg-team-slot" data-slot="0">
      <span class="pg-team-name">Blastoise</span>
      <span class="pg-team-level">Nv. 85</span>
      <span class="pg-team-hp">120 / 180</span>
    </div>
    <div class="game-dock">
      <button class="dock-btn" data-guide="map">Mapa</button>
    </div>
    <div class="map-window" hidden>
      <input class="map-filter-q" type="search" aria-label="Buscar">
      <button class="map-area" data-map-slug="kanto" aria-selected="true">Kanto</button>
      <button class="hunt-marker" data-hunt-slug="blastoise">Blastoise</button>
      <button class="hunt-marker" data-hunt-slug="charizard">Charizard</button>
      <button class="map-travel" data-travel="blastoise" hidden>Viajar</button>
    </div>
  </div>
  <script>
    // El juego real no pinta los 451 marcadores de golpe: los filtra al escribir en el buscador. Esta
    // pagina falsa imita eso con un marcador que SOLO existe despues de buscar «onix», que es lo que
    // hace falta para probar el camino del buscador y no solo el del marcador que ya estaba.
    document.querySelector('.map-filter-q').addEventListener('input', (evento) => {
      const valor = String(evento.target.value || '').toLowerCase();
      if (valor.includes('onix') && !document.querySelector('[data-hunt-slug="onix"]')) {
        const marcador = document.createElement('button');
        marcador.className = 'hunt-marker';
        marcador.dataset.huntSlug = 'onix';
        marcador.textContent = 'Onix';
        document.querySelector('.map-window').insertBefore(
          marcador, document.querySelector('.map-travel'));
      }
    });

    // Y pulsar un marcador descubre el boton de viajar, como en el juego. Sin esto, el boton de viajar
    // no aparece nunca y el viaje falla siempre por el mismo sitio.
    document.querySelector('.map-window').addEventListener('click', (evento) => {
      const marcador = evento.target.closest('.hunt-marker');
      if (!marcador) return;
      const viajar = document.querySelector('.map-travel');
      viajar.dataset.travel = marcador.dataset.huntSlug;
      viajar.hidden = false;
    });

    // Y viajar mueve la ubicacion, que es lo que el script espera para confirmar la llegada.
    document.querySelector('.map-travel').addEventListener('click', () => {
      document.querySelector('.phud-tloc').textContent =
        `Kanto · ${document.querySelector('.map-travel').dataset.travel}`;
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Escribir la prueba que falla**

Crea `tests/control-telegram-navegador-smoke.js`:

```js
// Pruebas del control por Telegram con una pagina de verdad. El script se inyecta en una ventana de
// Electron con un DOM que imita el del juego, y con dobles de GM_* en el mundo principal.
const assert = require('node:assert/strict');
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const script = require('node:fs').readFileSync(
  path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');
const fixture = `file://${path.join(__dirname, 'fixtures', 'mapa-falso.html').replace(/\\/g, '/')}`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false } });
  try {
    await ventana.loadURL(fixture);
    await ventana.webContents.executeJavaScript(`(() => {
      globalThis.__almacen = {};
      globalThis.GM_info = { script: { account: { index: 0, label: 'SHOCKVOR' } } };
      globalThis.GM_getSharedValue = async (k, d) => (k in __almacen ? __almacen[k] : d);
      globalThis.GM_setSharedValue = async (k, v) => { __almacen[k] = v; };
      globalThis.GM_deleteSharedValue = async (k) => { delete __almacen[k]; };
      globalThis.GM_getValue = (k, d) => d;
      globalThis.GM_setValue = () => {};
      globalThis.GM_addStyle = () => {};
      globalThis.GM_xmlhttpRequest = () => {};
      return true;
    })()`);
    await ventana.webContents.executeJavaScript(script);

    const estado = await ventana.webContents.executeJavaScript('__pgControl.leerEstadoPagina()');
    assert.equal(estado.ready, true, 'La pagina esta dentro del juego.');
    assert.equal(estado.trainerName, 'SHOCKVOR');
    assert.equal(estado.location, 'Kanto · Ruta 12');
    assert.equal(estado.leader.nombre, 'Blastoise');
    assert.equal(estado.leader.nivel, 85);
    assert.equal(estado.leader.hp, 120);
    assert.equal(estado.leader.maxHp, 180);

    console.log('Control Telegram (navegador) OK: lector del estado.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  ventana.destroy();
  app.exit(process.exitCode || 0);
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `node tests/lanzar.cjs tests/control-telegram-navegador-smoke.js`
Expected: FAIL — `__pgControl.leerEstadoPagina` no existe.

- [ ] **Step 4: Implementar el lector**

Añade en el script, antes del bloque de pruebas:

```js
  // --- Leer el estado de esta cuenta ---------------------------------------
  //
  // Es la version corta del lector del launcher: aqui solo hace falta entrenador, sitio y el primer
  // Pokemon. Los movimientos, objetos e IV que lee el modo farmeo son para recomendar hunts, y el bot
  // no recomienda: informa y obedece.
  function texto(elemento) {
    return String(elemento?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function primerElemento(selectores) {
    for (const selector of selectores) {
      const encontrado = document.querySelector(selector);
      if (encontrado) return encontrado;
    }
    return null;
  }

  function leerEstadoPagina() {
    const sitio = texto(primerElemento(['.phud-tloc', '.pg-player-meta', '[class*="trainer-meta"]']));
    const meta = texto(primerElemento(['.pg-player-meta', '[class*="trainer-meta"]']));
    const entrenador = (meta.match(/(?:entrenador|trainer)[:\s]+([^\u00b7|]+)/i)?.[1] || '').trim();
    const nivel = Number(sitio.match(/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*(\d+)/i)?.[1] || 0) || null;

    const ranura = document.querySelector('.pg-team-slot, [class*="team-slot"]');
    let leader = null;
    if (ranura) {
      const hp = texto(ranura.querySelector('[class*="hp"]')).match(/(\d+)\s*\/\s*(\d+)/);
      leader = {
        nombre: texto(ranura.querySelector('[class*="name"]')),
        nivel: Number(texto(ranura.querySelector('[class*="level"]')).replace(/\D/g, '')) || null,
        hp: hp ? Number(hp[1]) : null,
        maxHp: hp ? Number(hp[2]) : null
      };
      if (!leader.nombre) leader = null;
    }

    return {
      ready: location.pathname.startsWith('/play') && Boolean(document.body),
      trainerName: entrenador,
      location: sitio,
      level: nivel,
      leader
    };
  }
```

Y añade `leerEstadoPagina` a los dos objetos `__pgControl`.

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `node tests/lanzar.cjs tests/control-telegram-navegador-smoke.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js tests/control-telegram-navegador-smoke.js tests/fixtures/mapa-falso.html
git commit -m "El control por Telegram lee entrenador, sitio y lider de la pagina"
```

---

## Task 4: El turno y el bus de comandos

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`
- Modify: `tests/control-telegram-puro-smoke.js`

**Interfaces:**
- Produces: `intentarTurno(almacen, pageId, ahora): Promise<boolean>` — `almacen` es `{ leer(k,d), escribir(k,v) }`.
- Produces: `debeEjecutar(ultimoId, comando): boolean`.
- Produces: `CLAVES` con `{ turno, comando, registro, config, catalogo, resultado, pendiente }`.

- [ ] **Step 1: Escribir la prueba que falla**

Añade al final de `tests/control-telegram-puro-smoke.js`:

```js
// --- Turno ---------------------------------------------------------------
function almacenFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    datos,
    leer: async (k, d) => (k in datos ? datos[k] : d),
    escribir: async (k, v) => { datos[k] = v; },
    borrar: async (k) => { delete datos[k]; }
  };
}

(async () => {
  const primero = almacenFalso();
  assert.equal(await api.intentarTurno(primero, 'pagina-a', 1000), true,
    'Sin turno, la primera pagina lo coge.');
  assert.equal(await api.intentarTurno(almacenFalso(primero.datos), 'pagina-b', 1000), false,
    'Con el turno vivo, la segunda no lo coge.');

  const caducado = almacenFalso({ [api.CLAVES.turno]: { pageId: 'pagina-a', hasta: 500 } });
  assert.equal(await api.intentarTurno(caducado, 'pagina-b', 1000), true,
    'Un turno caducado lo puede coger otra pagina.');

  // --- Idempotencia
  assert.equal(api.debeEjecutar('', { id: 'x1' }), true, 'Un comando nuevo se ejecuta.');
  assert.equal(api.debeEjecutar('x1', { id: 'x1' }), false, 'El mismo comando no se repite.');
  assert.equal(api.debeEjecutar('x1', { id: 'x2' }), true, 'Uno distinto si.');

  console.log('Control Telegram (puro) OK: turno e idempotencia.');
})().catch((error) => { console.error(error); process.exit(1); });
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: FAIL — `intentarTurno` no existe.

- [ ] **Step 3: Implementar**

```js
  const CLAVES = Object.freeze({
    config: 'pgc:config',
    turno: 'pgc:turno',
    comando: 'pgc:comando',
    catalogo: 'pgc:catalogo',
    registro: (pageId) => `pgc:registro:${pageId}`,
    resultado: (id, pageId) => `pgc:resultado:${id}:${pageId}`,
    pendiente: (corto) => `pgc:pendiente:${corto}`
  });

  const TURNO_MS = 15_000;
  const TURNO_RENOVAR_MS = 10_000;

  // El turno no es la garantia de correccion —eso lo hace el id del comando—, es lo que evita que las
  // cuatro paginas pidan mensajes a la vez y se coman un 409. Por eso se puede robar cuando caduca sin
  // miedo: como mucho habra dos pidiendo un momento, y la que pierda se aparta.
  async function intentarTurno(almacen, pageId, ahora) {
    const actual = await almacen.leer(CLAVES.turno, null);
    if (actual && actual.pageId !== pageId && Number(actual.hasta) > ahora) return false;
    await almacen.escribir(CLAVES.turno, { pageId, hasta: ahora + TURNO_MS });
    return true;
  }

  function debeEjecutar(ultimoId, comando) {
    if (!comando || !comando.id) return false;
    return String(ultimoId || '') !== String(comando.id);
  }
```

Añade `CLAVES`, `intentarTurno` y `debeEjecutar` a `__pgControl`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js tests/control-telegram-puro-smoke.js
git commit -m "Turno de escucha con caducidad y comandos que no se ejecutan dos veces"
```

---

## Task 5: Transporte de Telegram

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`
- Modify: `tests/control-telegram-puro-smoke.js`

**Interfaces:**
- Produces: `llamarTelegram(token, metodo, parametros): Promise<{ok, result}|{ok:false, error}>`, usando `GM_xmlhttpRequest`.
- Produces: `formatearEstado(registros): string`.
- Consumes: nada.

- [ ] **Step 1: Escribir la prueba que falla**

Añade a la prueba pura:

```js
// --- Formato del estado --------------------------------------------------
const estadoTexto = api.formatearEstado([
  { accountIndex: 0, trainerName: 'SHOCKVOR', location: 'Kanto · Ruta 12',
    leader: { nombre: 'Blastoise', nivel: 85 }, at: 1000 },
  { accountIndex: 1, trainerName: 'SHOCKOR', location: '', leader: null, at: 1000 }
], 1000);
assert.ok(estadoTexto.includes('SHOCKVOR'), 'Sale el entrenador.');
assert.ok(estadoTexto.includes('Kanto · Ruta 12'), 'Sale el sitio.');
assert.ok(estadoTexto.includes('Blastoise'), 'Sale el lider.');
assert.ok(estadoTexto.includes('sin leer'), 'Una cuenta sin sitio se marca, no se omite.');
const viejo = api.formatearEstado([
  { accountIndex: 0, trainerName: 'SHOCKVOR', location: 'Kanto', leader: null, at: 0 }
], 120_000);
assert.ok(/2 min|hace/.test(viejo), 'Un dato viejo se marca con su edad.');
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: FAIL — `formatearEstado` no existe.

- [ ] **Step 3: Implementar**

```js
  // --- Telegram -------------------------------------------------------------
  function llamarTelegram(token, metodo, parametros) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `https://api.telegram.org/bot${token}/${metodo}`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(parametros || {}),
        timeout: 35_000,
        onload: (respuesta) => {
          let cuerpo = null;
          try { cuerpo = JSON.parse(respuesta.responseText || '{}'); } catch { cuerpo = null; }
          if (!cuerpo) return resolve({ ok: false, error: 'Telegram no devolvió JSON.' });
          if (!cuerpo.ok) return resolve({ ok: false, error: cuerpo.description || 'Telegram rechazó la petición.' });
          resolve({ ok: true, result: cuerpo.result });
        },
        onerror: () => resolve({ ok: false, error: 'No se pudo conectar con Telegram.' }),
        ontimeout: () => resolve({ ok: false, error: 'Telegram no contestó.' })
      });
    });
  }

  // La edad del dato se dice. Un registro de hace dos minutos es informacion; una cuenta que
  // desaparece de la lista sin decirlo, no.
  function edadTexto(at, ahora) {
    const segundos = Math.max(0, Math.round((ahora - Number(at || 0)) / 1000));
    if (segundos < 60) return '';
    if (segundos < 3600) return ` · hace ${Math.round(segundos / 60)} min`;
    return ` · hace ${Math.round(segundos / 3600)} h`;
  }

  function formatearEstado(registros, ahora) {
    const lista = (Array.isArray(registros) ? registros : [])
      .slice()
      .sort((a, b) => Number(a.accountIndex) - Number(b.accountIndex));
    if (!lista.length) return 'No hay ninguna cuenta registrada todavía.';
    return lista.map((fila) => {
      const nombre = fila.trainerName || `Cuenta ${Number(fila.accountIndex) + 1}`;
      const sitio = fila.location || 'sin leer';
      const lider = fila.leader && fila.leader.nombre
        ? ` · ${fila.leader.nombre}${fila.leader.nivel ? ` Nv. ${fila.leader.nivel}` : ''}`
        : '';
      return `${nombre}: ${sitio}${lider}${edadTexto(fila.at, ahora)}`;
    }).join('\n');
  }
```

Añade `formatearEstado` a `__pgControl`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node tests/control-telegram-puro-smoke.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js tests/control-telegram-puro-smoke.js
git commit -m "Transporte de Telegram y formato del estado de las cuentas"
```

---

## Task 6: Catálogo y viaje

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`
- Modify: `tests/control-telegram-navegador-smoke.js`
- Modify: `tests/fixtures/mapa-falso.html`

**Interfaces:**
- Produces: `viajarA(destino, opciones): Promise<{ok, mensaje}>` con `destino = { slug, nombre, mapa, zona }` y `opciones = { orre: boolean }`.
- Produces: `leerCatalogo(): Promise<Array<{slug, nombre, mapa, zona, nivel}>>`.

- [ ] **Step 1: Escribir la prueba que falla**

Añade a `tests/control-telegram-navegador-smoke.js`, antes del `console.log` final:

```js
    // --- Viaje
    const viaje = await ventana.webContents.executeJavaScript(
      `__pgControl.viajarA({ slug: 'blastoise', nombre: 'Blastoise', mapa: 'kanto' }, { orre: false })`);
    assert.equal(viaje.ok, true, `El viaje tiene que funcionar: ${viaje.mensaje}`);
    const despues = await ventana.webContents.executeJavaScript(`(() => ({
      mapaAbierto: !document.querySelector('.map-window').hidden,
      ubicacion: document.querySelector('.phud-tloc').textContent.trim(),
      viajePulsado: document.querySelector('.map-travel').dataset.pulsado === 'true'
    }))()`);
    assert.equal(despues.mapaAbierto, true, 'El viaje abre el mapa si estaba cerrado.');
    assert.equal(despues.viajePulsado, true, 'Y pulsa viajar.');

    // --- Un destino que no esta en el mapa hasta que se busca
    const porBuscador = await ventana.webContents.executeJavaScript(
      `__pgControl.viajarA({ slug: 'onix', nombre: 'Onix' }, { orre: false })`);
    assert.equal(porBuscador.ok, true,
      `El viaje tiene que funcionar tambien buscando: ${porBuscador.mensaje}`);

    // --- Un destino que no existe
    const fallo = await ventana.webContents.executeJavaScript(
      `__pgControl.viajarA({ slug: 'no-existe', nombre: 'NoExiste' }, { orre: false })`);
    assert.equal(fallo.ok, false, 'Un destino que no esta en el mapa tiene que fallar.');
    assert.ok(/no encontr/i.test(fallo.mensaje), `El error dice que no lo encontro: ${fallo.mensaje}`);
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node tests/lanzar.cjs tests/control-telegram-navegador-smoke.js`
Expected: FAIL — `viajarA` no existe.

- [ ] **Step 3: Implementar el catálogo y el viaje**

Añade al script:

```js
  const ESPERA_MS = 12_000;

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function esperarA(condicion, ms = ESPERA_MS) {
    const inicio = Date.now();
    while (Date.now() - inicio < ms) {
      const valor = condicion();
      if (valor) return valor;
      await esperar(100);
    }
    return null;
  }

  function visible(elemento) {
    if (!elemento || elemento.hidden) return false;
    const estilo = getComputedStyle(elemento);
    const caja = elemento.getBoundingClientRect();
    return estilo.display !== 'none' && estilo.visibility !== 'hidden'
      && caja.width > 0 && caja.height > 0;
  }

  // El catalogo sale del endpoint del propio juego, el mismo que usa el modo farmeo. No hace falta
  // abrir el mapa ni tocar la interfaz para saber que hunts hay.
  async function leerCatalogo() {
    const respuesta = await fetch('/api/game/map-markers', { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('No se pudo leer el catálogo de hunts.');
    const datos = await respuesta.json();
    const lista = Array.isArray(datos) ? datos : (datos?.markers || datos?.hunts || []);
    return lista.map((fila) => ({
      slug: String(fila.slug || fila.huntSlug || fila.id || '').trim(),
      nombre: String(fila.name || fila.huntName || fila.label || '').trim(),
      mapa: String(fila.map || fila.mapSlug || fila.world || '').trim(),
      zona: String(fila.area || fila.region || fila.zone || '').trim(),
      nivel: Number(fila.level || fila.requiredLevel || 0) || 0
    })).filter((hunt) => hunt.slug && hunt.nombre);
  }

  async function viajarA(destino, opciones = {}) {
    try {
      const mapa = document.querySelector('.map-window, [data-map-window], .map-overlay');
      if (!visible(mapa)) {
        const botonMapa = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button')]
          .find((boton) => /map|mapa/i.test(`${boton.dataset?.guide || ''} ${boton.textContent || ''}`));
        if (!botonMapa) return { ok: false, mensaje: 'No encontré el botón Mapa.' };
        botonMapa.click();
      }
      const ventanaMapa = await esperarA(() => {
        const actual = document.querySelector('.map-window, [data-map-window], .map-overlay');
        return visible(actual) ? actual : null;
      });
      if (!ventanaMapa) return { ok: false, mensaje: 'El mapa no abrió a tiempo.' };

      const buscado = normalizarTexto(destino.slug);
      let marcador = [...document.querySelectorAll('.hunt-marker, [data-hunt-slug], [data-teleport-slug]')]
        .find((elemento) => normalizarTexto(elemento.dataset?.huntSlug
          || elemento.dataset?.teleportSlug || elemento.dataset?.slug) === buscado);

      if (!marcador) {
        const buscador = document.querySelector('.map-filter-q, input[type="search"]');
        if (buscador) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(buscador, destino.nombre); else buscador.value = destino.nombre;
          buscador.dispatchEvent(new Event('input', { bubbles: true }));
          marcador = await esperarA(() => [...document.querySelectorAll('.hunt-marker, [data-hunt-slug]')]
            .find((elemento) => normalizarTexto(elemento.dataset?.huntSlug) === buscado) || null, 6000);
        }
      }
      if (!marcador) return { ok: false, mensaje: `No encontré ${destino.nombre} en el mapa.` };

      marcador.click();
      const viajar = await esperarA(() => {
        const boton = document.querySelector('.map-travel, [data-travel], .map-enter');
        return visible(boton) ? boton : null;
      }, 5000);
      if (!viajar) return { ok: false, mensaje: 'Apareció el marcador pero no el botón de viajar.' };
      viajar.dataset.pulsado = 'true';
      viajar.click();

      // El aviso de Orre se detecta pero NO se acepta solo. Aceptarlo mueve la cuenta a una zona con
      // reglas distintas, y eso lo decide una persona con el interruptor del panel.
      const aviso = await esperarA(() => {
        const texto = String(document.body.textContent || '');
        return /orre/i.test(texto) && /(deseas entrar|quieres entrar|still want to enter)/i.test(texto)
          ? true : null;
      }, 2000);
      if (aviso && !opciones.orre) {
        return { ok: false, mensaje: 'El destino es de Orre y el permiso está apagado.' };
      }

      const llegada = await esperarA(() => {
        const sitio = String(document.querySelector('.phud-tloc')?.textContent || '');
        return normalizarTexto(sitio).includes(normalizarTexto(destino.nombre)) ? sitio : null;
      });
      return llegada
        ? { ok: true, mensaje: `En ${llegada}` }
        : { ok: false, mensaje: 'Viajé, pero el juego no confirmó la llegada.' };
    } catch (error) {
      return { ok: false, mensaje: error.message || 'Falló el viaje.' };
    }
  }
```

Añade `viajarA` y `leerCatalogo` a `__pgControl`.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node tests/lanzar.cjs tests/control-telegram-navegador-smoke.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js tests/control-telegram-navegador-smoke.js tests/fixtures/mapa-falso.html
git commit -m "Catalogo de hunts y viaje con aviso de Orre bajo permiso explicito"
```

---

## Task 7: El bucle del bot

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `bucle()` que arranca solo si hay configuración.

- [ ] **Step 1: Implementar el bucle**

```js
  // --- Estado compartido ----------------------------------------------------
  const almacen = {
    leer: (clave, porDefecto) => GM_getSharedValue(clave, porDefecto),
    escribir: (clave, valor) => GM_setSharedValue(clave, valor),
    borrar: (clave) => GM_deleteSharedValue(clave)
  };

  const PAGE_ID = (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random()}`).slice(0, 36);
  let ultimoIdEjecutado = GM_getValue('ultimoId', '');
  let turnoPropio = false;

  async function registrar() {
    const estado = leerEstadoPagina();
    await almacen.escribir(CLAVES.registro(PAGE_ID), {
      pageId: PAGE_ID,
      accountIndex: Number(GM_info?.script?.account?.index ?? -1),
      label: String(GM_info?.script?.account?.label || ''),
      ...estado,
      at: Date.now()
    });
  }

  async function registros() {
    // El almacen no sabe listar claves, asi que se guarda un indice aparte.
    const indice = await almacen.leer('pgc:indice', []);
    const filas = [];
    for (const pageId of indice) {
      const fila = await almacen.leer(CLAVES.registro(pageId), null);
      if (fila) filas.push(fila);
    }
    return filas;
  }

  async function mantenerIndice() {
    const indice = await almacen.leer('pgc:indice', []);
    if (indice.includes(PAGE_ID)) return;
    await almacen.escribir('pgc:indice', [...indice, PAGE_ID]);
  }

  function boton(texto, dato) {
    return { text: texto, callback_data: dato };
  }

  async function emitirComando(config, accion, destino, cuentas) {
    const comando = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      accion,
      destino,
      cuentas,
      desde: Date.now()
    };
    await almacen.escribir(CLAVES.comando, comando);
    return comando;
  }

  // El resultado de un viaje tarda: hay que abrir el mapa, buscar, viajar y esperar la llegada. El bot
  // promete avisar cuando acabe, asi que esta funcion espera a que cada cuenta escriba su linea y las
  // manda juntas. Si una no contesta en 40 s se dice «sin respuesta» en vez de callarse: una cuenta
  // cerrada y una que fallo son cosas distintas, y el silencio no distingue entre las dos.
  async function informarResultados(config, chatId, comandoId, esperados) {
    const inicio = Date.now();
    const lineas = new Map();
    const limite = 40_000;
    while (Date.now() - inicio < limite) {
      for (const pageId of esperados) {
        if (lineas.has(pageId)) continue;
        const fila = await almacen.leer(CLAVES.resultado(comandoId, pageId), null);
        if (fila) lineas.set(pageId, fila);
      }
      if (lineas.size >= esperados.length) break;
      await esperar(1000);
    }
    const nombres = new Map((await registros()).map((fila) => [fila.pageId, fila.trainerName || 'Cuenta']));
    const texto = esperados.map((pageId) => {
      const fila = lineas.get(pageId);
      const nombre = nombres.get(pageId) || 'Cuenta';
      if (!fila) return `${nombre}: sin respuesta (¿cuenta cerrada?)`;
      return `${nombre}: ${fila.ok ? '✓' : '✗'} ${fila.mensaje}`;
    }).join('\n');
    await llamarTelegram(config.token, 'sendMessage', { chat_id: chatId, text: texto });
    for (const pageId of esperados) await almacen.borrar(CLAVES.resultado(comandoId, pageId));
  }

  async function atenderMensaje(config, mensaje) {
    if (!autorizado(config, mensaje.from?.id)) {
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: mensaje.chat.id,
        text: `No autorizado.\nTu id de Telegram es ${mensaje.from?.id}.`
      });
      return;
    }
    const { accion, argumento } = parsearComando(mensaje.text);
    const chatId = mensaje.chat.id;
    if (accion === 'estado' || accion === 'start') {
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: formatearEstado(await registros(), Date.now()),
        reply_markup: { inline_keyboard: [[boton('Actualizar', 'a:estado')]] }
      });
      return;
    }
    if (accion === 'ir') {
      if (!argumento) {
        await llamarTelegram(config.token, 'sendMessage', {
          chat_id: chatId, text: 'Dime a qué hunt: /ir blastoise'
        });
        return;
      }
      let catalogo = await almacen.leer(CLAVES.catalogo, null);
      if (!catalogo) {
        catalogo = await leerCatalogo();
        await almacen.escribir(CLAVES.catalogo, catalogo);
      }
      const encontrados = buscarHunts(catalogo, argumento);
      if (!encontrados.length) {
        await llamarTelegram(config.token, 'sendMessage', {
          chat_id: chatId, text: `No encontré ninguna hunt que se parezca a «${argumento}».`
        });
        return;
      }
      // La lista se guarda ENTERA, no solo el primero: el boton de cada coincidencia lleva su indice
      // y sin la lista no habria a que indice apuntar.
      const corto = Math.random().toString(36).slice(2, 10);
      await almacen.escribir(CLAVES.pendiente(corto), { hunts: encontrados, creadoEn: Date.now() });
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: '¿A qué hunt las mando?',
        // Un boton por fila. Seis etiquetas largas en la misma fila no se leen en un movil.
        reply_markup: {
          inline_keyboard: encontrados.slice(0, 6).map((hunt, indice) => [
            boton(`${hunt.nombre} · ${hunt.mapa || '—'} · Nv.${hunt.nivel || '?'}`, `h:${corto}:${indice}`)
          ])
        }
      });
    }
  }

  // Los botones.
  //
  // Se contesta SIEMPRE al callback, aunque sea para rechazarlo: si no se contesta, el boton se queda
  // girando en el movil y parece que el bot esta muerto. Y el rechazo no dice nada del estado de las
  // cuentas: un desconocido no puede sacar informacion pulsando.
  async function atenderCallback(config, consulta) {
    const contestar = (texto) => llamarTelegram(config.token, 'answerCallbackQuery', {
      callback_query_id: consulta.id, text: texto
    });
    if (!autorizado(config, consulta.from?.id)) {
      await contestar('No autorizado.');
      return;
    }
    const chatId = consulta.message?.chat?.id;
    const elegido = parsearCallback(consulta.data);

    if (elegido.tipo === 'estado') {
      await contestar('Actualizando…');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId, text: formatearEstado(await registros(), Date.now())
      });
      return;
    }

    if (elegido.tipo === 'elegirCuenta') {
      const pendiente = await almacen.leer(CLAVES.pendiente(elegido.corto), null);
      const hunt = pendiente?.hunts?.[elegido.indice];
      if (!hunt) { await contestar('Esa lista caducó. Vuelve a escribir /ir.'); return; }
      const filas = await registros();
      await contestar('Elige a quién.');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: `${hunt.nombre} · ${hunt.mapa || '—'} · Nv.${hunt.nivel || '?'}\n¿A quién la mando?`,
        reply_markup: {
          inline_keyboard: [
            [boton('Las 4', `a:${elegido.corto}:${elegido.indice}:todas`)],
            ...filas.map((fila) => [
              boton(fila.trainerName || 'Cuenta', `a:${elegido.corto}:${elegido.indice}:${fila.pageId}`)
            ])
          ]
        }
      });
      return;
    }

    // Este es el segundo toque: elegir el destino es la confirmacion de mover las cuatro.
    if (elegido.tipo === 'viajar') {
      const pendiente = await almacen.leer(CLAVES.pendiente(elegido.corto), null);
      const hunt = pendiente?.hunts?.[elegido.indice];
      if (!hunt) { await contestar('Esa lista caducó. Vuelve a escribir /ir.'); return; }
      const comando = await emitirComando(config, 'ir', hunt, elegido.destino);
      await contestar('Enviado.');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: `Viajando a ${hunt.nombre}. Te digo el resultado en unos segundos.`
      });
      await almacen.borrar(CLAVES.pendiente(elegido.corto));
      // Sin `await`: el bucle tiene que seguir contestando mientras los viajes ocurren. Si se esperara
      // aqui, el bot dejaria de responder 40 segundos y pareceria caido.
      const esperados = elegido.destino === 'todas'
        ? (await registros()).map((fila) => fila.pageId)
        : [elegido.destino];
      informarResultados(config, chatId, comando.id, esperados).catch(() => {});
      return;
    }

    await contestar('No entendí ese botón.');
  }

  async function bucle() {
    const config = normalizarConfig(await almacen.leer(CLAVES.config, null));
    if (!config.token || !config.autorizados.length) return;
    await mantenerIndice();
    await registrar();
    let offset = Number(await almacen.leer('pgc:offset', 0)) || 0;
    let proximaRenovacion = 0;

    while (true) {
      try {
        const ahora = Date.now();
        if (turnoPropio && ahora >= proximaRenovacion) {
          await almacen.escribir(CLAVES.turno, { pageId: PAGE_ID, hasta: ahora + TURNO_MS });
          proximaRenovacion = ahora + TURNO_RENOVAR_MS;
        } else if (!turnoPropio) {
          turnoPropio = await intentarTurno(almacen, PAGE_ID, ahora);
          proximaRenovacion = ahora + TURNO_RENOVAR_MS;
        }

        // Obedecer: cualquier pagina, tenga turno o no.
        const comando = await almacen.leer(CLAVES.comando, null);
        if (debeEjecutar(ultimoIdEjecutado, comando)
            && (comando.cuentas === 'todas' || comando.cuentas === PAGE_ID)) {
          ultimoIdEjecutado = comando.id;
          GM_setValue('ultimoId', ultimoIdEjecutado);
          const resultado = comando.accion === 'ir'
            ? await viajarA(comando.destino, { orre: config.orre })
            : { ok: false, mensaje: 'Comando desconocido.' };
          await almacen.escribir(CLAVES.resultado(comando.id, PAGE_ID), {
            ...resultado, at: Date.now()
          });
        }

        if (turnoPropio) {
          const respuesta = await llamarTelegram(config.token, 'getUpdates', {
            offset, timeout: 25, allowed_updates: ['message', 'callback_query']
          });
          if (!respuesta.ok) { turnoPropio = false; await esperar(5000); continue; }
          for (const actualizacion of respuesta.result || []) {
            offset = Math.max(offset, Number(actualizacion.update_id) + 1);
            await almacen.escribir('pgc:offset', offset);
            if (actualizacion.message) await atenderMensaje(config, actualizacion.message);
            if (actualizacion.callback_query) await atenderCallback(config, actualizacion.callback_query);
          }
        } else {
          await esperar(1500);
        }
      } catch (error) {
        await esperar(3000);
      }
    }
  }

  registrar().catch(() => {});
  bucle().catch(() => {});
```

- [ ] **Step 2: Comprobar la sintaxis y las pruebas puras**

Run: `node --check userscripts/PokeGrid-Telegram-Control.user.js && node tests/control-telegram-puro-smoke.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js
git commit -m "El bucle del bot: turno, comandos y resultados"
```

---

## Task 8: El panel de configuración

**Files:**
- Modify: `userscripts/PokeGrid-Telegram-Control.user.js`

- [ ] **Step 1: Implementar el panel**

Un botón flotante discreto que abre un panel con token, ids autorizados e interruptor de Orre. Usa `GM_addStyle` con prefijo `pgc-` y guarda con `normalizarConfig`.

```js
  function montarPanel() {
    GM_addStyle(`
      .pgc-boton { position: fixed; left: 10px; bottom: 10px; z-index: 2147483000;
        width: 30px; height: 30px; border-radius: 50%; border: 1px solid #4a6fa5;
        background: #101827; color: #cfe4ff; font-size: 14px; cursor: pointer; }
      .pgc-panel { position: fixed; left: 10px; bottom: 48px; z-index: 2147483001;
        width: 300px; padding: 12px; border-radius: 10px; border: 1px solid #4a6fa5;
        background: #0d1622; color: #e6eef7; font: 12px/1.4 system-ui; display: grid; gap: 8px; }
      .pgc-panel[hidden] { display: none; }
      .pgc-panel input { width: 100%; padding: 6px; border-radius: 6px;
        border: 1px solid #2b3f54; background: #071019; color: #e6eef7; }
      .pgc-panel label { display: grid; gap: 3px; font-size: 10px; letter-spacing: .08em; }
      .pgc-estado { color: #8fa6ba; font-size: 10px; }
    `);
    const botonAbrir = document.createElement('button');
    botonAbrir.type = 'button';
    botonAbrir.className = 'pgc-boton';
    botonAbrir.textContent = '✈';
    botonAbrir.title = 'Control por Telegram';

    const panel = document.createElement('div');
    panel.className = 'pgc-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <label>TOKEN DE BOTFATHER<input data-campo="token" type="password" autocomplete="off"></label>
      <label>IDS AUTORIZADOS (separados por comas)<input data-campo="autorizados" type="text"></label>
      <label><span><input data-campo="orre" type="checkbox"> Permitir viajar a Orre</span></label>
      <button data-accion="guardar" type="button">Guardar</button>
      <span class="pgc-estado"></span>`;

    document.body.append(botonAbrir, panel);
    botonAbrir.addEventListener('click', () => { panel.hidden = !panel.hidden; });

    const campo = (nombre) => panel.querySelector(`[data-campo="${nombre}"]`);
    const estado = panel.querySelector('.pgc-estado');

    (async () => {
      const config = normalizarConfig(await almacen.leer(CLAVES.config, null));
      campo('token').value = config.token;
      campo('autorizados').value = config.autorizados.join(', ');
      campo('orre').checked = config.orre;
    })();

    panel.querySelector('[data-accion="guardar"]').addEventListener('click', async () => {
      const token = campo('token').value.trim();
      if (token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
        estado.textContent = 'El token no tiene el formato de BotFather.';
        return;
      }
      const config = normalizarConfig({
        token,
        autorizados: campo('autorizados').value.split(','),
        orre: campo('orre').checked
      });
      await almacen.escribir(CLAVES.config, config);
      estado.textContent = config.token && config.autorizados.length
        ? 'Guardado. Recarga las cuentas para que arranque.'
        : 'Guardado, pero falta el token o los ids.';
    });
  }
```

Y llama a `montarPanel()` antes de `bucle()`.

- [ ] **Step 2: Comprobar sintaxis**

Run: `node --check userscripts/PokeGrid-Telegram-Control.user.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add userscripts/PokeGrid-Telegram-Control.user.js
git commit -m "Panel de configuracion del bot dentro del juego"
```

---

## Task 9: Documentación e invariantes

**Files:**
- Modify: `userscripts/INSTALACION-TELEGRAM.md`
- Modify: `herramientas/comprobar-patrones.cjs`
- Modify: `herramientas/area-entera.ps1`

- [ ] **Step 1: Documentar la instalación**

Añade a `userscripts/INSTALACION-TELEGRAM.md` una sección «Bot de control» con los pasos reales: crear el bot en BotFather, abrir el panel, pegar el token, mandar `/estado` para que el bot devuelva el id, añadirlo, recargar las cuentas.

- [ ] **Step 2: Añadir invariantes**

En `herramientas/comprobar-patrones.cjs`, en el bloque de lo que tiene que estar:

```js
  ['el control por Telegram declara los permisos que usa',
    /@grant\s+GM_xmlhttpRequest[\s\S]{0,200}@grant\s+PokeGrid_sharedStorage/, scriptControl],
  ['y solo habla con api.telegram.org',
    /@connect\s+api\.telegram\.org/, scriptControl],
  ['y no escribe el token en el almacenamiento local',
    !/localStorage[\s\S]{0,80}token/i.test(scriptControl), scriptControl],
```

con `const scriptControl = fs.readFileSync(path.join(root, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');` arriba.

- [ ] **Step 3: Añadir las pruebas al área**

En `herramientas/area-entera.ps1`, junto a `launcher-iconos`:

```powershell
  @{ nombre = 'control-telegram-puro'; comando = 'node'; args = @('tests\control-telegram-puro-smoke.js'); espera = 40 },
  @{ nombre = 'control-telegram-navegador'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\control-telegram-navegador-smoke.js'); espera = 120 },
```

- [ ] **Step 4: Pasar la puerta**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\area-entera.ps1`
Expected: todas pasan, incluidas las dos nuevas.

- [ ] **Step 5: Commit**

```bash
git add userscripts/INSTALACION-TELEGRAM.md herramientas/comprobar-patrones.cjs herramientas/area-entera.ps1
git commit -m "Documentacion e invariantes del control por Telegram"
```

---

## Task 10: Prueba real y entrega

**Files:**
- Modify: `REGISTRO.md`

- [ ] **Step 1: Probar con el bot de verdad**

1. BotFather → `/newbot` → token.
2. En el juego, panel ✈ → token → Guardar.
3. Escríbele `/estado`. El bot contesta «No autorizado. Tu id es N».
4. Pega el id en el panel → Guardar → recargar las cuentas.
5. `/estado` → las 4 cuentas con su hunt y su líder.
6. `/ir blastoise` → botones → elegir → «Las 4» → confirmar.
7. Comprobar en el juego que las 4 viajaron y que el bot dijo el resultado de cada una.

- [ ] **Step 2: Anotar lo que falle**

Si el viaje falla en el juego real (selectores distintos a la página falsa), se corrige en `viajarA()` y se añade el caso a `tests/fixtures/mapa-falso.html`.

- [ ] **Step 3: Entrada en el registro**

Añade una sección al principio de `REGISTRO.md` con la versión, lo que se añadió y **por qué** el turno no es la garantía de corrección.

- [ ] **Step 4: Commit**

```bash
git add REGISTRO.md userscripts/PokeGrid-Telegram-Control.user.js
git commit -m "Control del farmeo por Telegram, probado con el bot real"
```

---

## Self-review

**Cobertura de la especificación**

| Sección de la especificación | Tarea |
|---|---|
| Un userscript en cada página | 2, 7 |
| Cada script sabe qué cuenta es | 3, 7 |
| Almacén compartido, claves y por qué separadas | 4, 7 |
| Turno con caducidad y 409 | 4, 7 |
| Bus de comandos y `id` único | 4, 7 |
| Telegram: config, token, seguridad | 5, 8 |
| Comandos y botones con 64 bytes | 7 |
| Catálogo desde `/api/game/map-markers` | 6 |
| Viaje recortado y Orre apagado | 6 |
| Errores y latencia | 6, 7 |
| Ficheros y canal con lista blanca | 1, 2 |
| Pruebas | 3, 4, 5, 6, 9 |
| Fuera de alcance | — (no se implementa nada de eso) |

**Puntos que el plan resuelve y la especificación no detallaba**

- `pgc:indice`: el almacén no permite listar claves, así que hace falta un índice de páginas.
- `pgc:offset` se guarda en el almacén, no en memoria, para que el `offset` viaje con el turno.

**Riesgo abierto que se cierra en la Task 10:** los selectores del viaje se han escrito contra una página falsa. Si el juego real usa otros, se corrigen ahí.
