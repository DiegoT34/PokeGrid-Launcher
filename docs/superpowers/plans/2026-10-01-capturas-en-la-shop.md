# Capturas de pantalla en la ficha de la Script Shop — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el progreso.

**Objetivo:** Poder adjuntar capturas de pantalla a un script publicado en la Shop, y que se vean en su bloque de información dentro de la tarjeta.

**Arquitectura:** La decisión —qué capturas hay, cuáles valen y cuántas son— vive en un módulo puro comprobable en Node (`src/script-shop-screenshots.js`), igual que el orden del catálogo y la vista de la Shop. El proceso principal amplía su cargador de imágenes, que **ya existe** y ya devuelve `data:` URLs, con una segunda caché propia. El renderer solo pinta, y **descarga al abrir los detalles**, nunca al pintar.

**Stack técnico:** Electron 43, Node 22+, JavaScript plano, cero dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-01-capturas-en-la-shop-design.md` — el plan argumenta desde la spec, y quien lo ejecute tiene que leer las dos.

> **Alcance: solo el launcher.** La herramienta publicadora
> (`C:\Users\Shockviny\Downloads\PokeGrid-Script-Shop`) es otro proyecto con su propia
> spec. Este plan no la toca ni siquiera para leerla.

## Restricciones globales

- **Cero dependencias nuevas.**
- **Nada se publica.** `git push` y `git.tag` son del usuario, siempre.
- **R-03**: no tocar `tests/launcher-preview-preload.js`. Su catálogo tiene **un solo script
  y ningún `screenshots`**, y esa limitación es la razón de que la lógica viva en un
  módulo puro.
- **No tocar** `src/game-theme.js` ni `src/preload.js` más allá de lo explícito aquí.
- **`schemaVersion` se queda en `1`.** `normalizeScriptShopCatalog` rechaza cualquier
  otro valor, así que subirlo dejaría sin Shop a todos los launchers antiguos.
- **Español con tildes** en comentarios, textos de interfaz y mensajes de aserción.
- **Rutas con `path.join`**, nunca concatenadas.
- **Nada de `git add -A`**: hay ficheros ajenos (`CONTEXTO-PROYECTO.md`,
  `ANALISIS-COMPLETO-PROYECTO.md`, `.superpowers/`).
- **Restaurar sabotajes desde una copia hecha en ese instante**, nunca con `git checkout`:
  revierte al último commit y se lleva el trabajo sin commitear.
- **En PowerShell no escribir código con comillas dobles dentro de `node -e`**: la consola
  se las come. Para mutaciones, un fichero de script; para cambios, la herramienta de
  edición.
- **Medir el código de salida con `Start-Process -Wait -PassThru`**.
- **El puerto de Node va en verde entre tareas.**

## Enfoque de la revisión

Cinco clases de entrada o modo de fallo que la spec sugiere y que ninguna prueba ejercita.
Cada línea tiene su prueba en la tarea que es dueña del código.

1. **Una captura con la URL mal escrita** (tirones de la ruta, `http://`, un archivo de otro
   repositorio, un sha que no es de 40 hexadecimales). Lo razonable: esa captura **no**
   aparece, las demás **sí**, y el catálogo entero sigue funcionando.
2. **Más de 6 capturas en `catalog.json`.** Lo razonable: se muestran las 6 primeras y el
   resto se descarta, sin error y sin cortar el catálogo por la mitad.
3. **Una captura que existe en el catálogo pero que al descargarse responde 404, o no es una
   imagen, o pesa más de 2 MB.** Lo razonable: un hueco con el nombre del archivo, no una
   tarjeta rota ni un icono de imagen rota.
4. **Abrir los detalles de una tarjeta y volver a cerrarlos y abrirlos.** Lo razonable: no
   se descarga nada la segunda vez.
5. **Una captura cuyo nombre no empieza por el id del script** —copiada de otro script—.
   Lo razonable: se descarta, porque si no un script puede apropiarse de las capturas de otro.

---

### Tarea 1: El módulo puro de las capturas

**Ficheros:**
- Crear: `src/script-shop-screenshots.js`
- Crear: `tests/script-shop-screenshots-smoke.js`
- Modificar: `src/index.html` (una etiqueta `<script>`, para que el navegador lo cargue)
- Modificar: `tests/script-shop-smoke.js` (que la etiqueta exista y vaya antes de `userscripts.js`)

**Interfaces:**
- Consume: nada.
- Produce:
  - `CAPTURAS_LIMITE` → `6`
  - `esCapturaDeShop(url, id)` → `true | false`. Acepta `URL` o cadena.
  - `planCapturas(item)` → `{ tiene: boolean, total: number, urls: string[] }`, con
    `total` como máximo `CAPTURAS_LIMITE`
  - Expuesto en `window.pokeGridShopScreenshots` para el renderer

**Nota de alcance:** este módulo no toca nada. Al terminar existe y está probado, pero la
aplicación todavía no lo usa.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `tests/script-shop-screenshots-smoke.js`:

```js
const assert = require('node:assert/strict');
const {
  CAPTURAS_LIMITE,
  esCapturaDeShop,
  planCapturas
} = require('../src/script-shop-screenshots');

const RAIZ = 'https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop';
const buena = (nombre) => `${RAIZ}/main/screenshots/${nombre}`;
const id = 'market-helper';

// --- Qué se acepta -------------------------------------------------------------------
assert.equal(esCapturaDeShop(buena('market-helper-1.png'), id), true, 'Una captura normal se acepta.');
assert.equal(esCapturaDeShop(buena('market-helper-2.jpg'), id), true, 'Los jpg también.');
assert.equal(esCapturaDeShop(buena('market-helper-3.JPEG'), id), true, 'La extensión no distingue mayúsculas.');
assert.equal(esCapturaDeShop(buena('market-helper-4.webp'), id), true, 'Los webp también.');
assert.equal(esCapturaDeShop(buena('market-helper-5.gif'), id), true, 'Los gif también.');
assert.equal(esCapturaDeShop(`${RAIZ}/${'a'.repeat(40)}/screenshots/market-helper-1.png`, id), true,
  'Un commit de 40 hexadecimales vale igual que main: es lo que hace assertScriptShopDownloadUrl.');
assert.equal(esCapturaDeShop(buena('market-helper-1.png')), true,
  'Sin id se acepta si el nombre encaja; quien exige el prefijo es quien llama con id.');

// --- Qué se rechaza, y por qué --------------------------------------------------------
// Cada motivo es una razon distinta, y por eso hay una linea por motivo y no una sola.
const rechazos = [
  ['otra rama corta', `${RAIZ}/dev/screenshots/market-helper-1.png`, 'Una rama suelta no vale.'],
  ['sha de 39 hexadecimales', `${RAIZ}/${'a'.repeat(39)}/screenshots/market-helper-1.png`, 'Un sha de 39 no vale.'],
  ['otro repositorio', 'https://raw.githubusercontent.com/Otro/Repo/main/screenshots/market-helper-1.png', 'Solo el repositorio oficial.'],
  ['otra carpeta', `${RAIZ}/main/otra/market-helper-1.png`, 'Solo dentro de screenshots/.'],
  ['http', 'http://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png', 'Nada de http.'],
  ['con query', `${buena('market-helper-1.png')}?v=1`, 'Con query no vale.'],
  ['con fragmento', `${buena('market-helper-1.png')}#x`, 'Con fragmento no vale.'],
  ['con credenciales', `https://user:pass@raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png`, 'Con credenciales no vale.'],
  ['otra extension', buena('market-helper-1.exe'), 'Solo imagenes.'],
  ['sin extension', buena('market-helper-1'), 'Sin extension no se sabe que es.'],
  ['id equivocado', buena('otro-script-1.png'), 'No puede usar las capturas de otro script.'],
  // El host se comprueba aparte de la ruta, y por eso necesita su propia linea: un host
  // ajeno con la ruta EXACTAMENTE igual es lo que un catálogo escrito a mano podría
  // colar, y es justo lo que la revision de la tarea 1 encontró ausente.
  ['host ajeno', 'https://otro-sitio.example/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png', 'Un host que no es GitHub no vale, aunque la ruta sea exacta.'],
  ['host que imita al bueno', 'https://raw.githubusercontent.com.otro-sitio.example/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png', 'Un host que empieza por el bueno no vale.'],
  ['otro esquema', 'ftp://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png', 'Solo https.'],
  ['prefijo sin guion', buena('market-helperx-1.png'), 'El guion separa los prefijos: market-helper no puede usar las capturas de market-helperx.']
];
for (const [nombre, url, motivo] of rechazos) {
  assert.equal(esCapturaDeShop(url, id), false, `${nombre}: ${motivo} (${url})`);
}

// Textos raros que tienen que salir sin reventar.
for (const raro of [null, undefined, '', 'no-es-una-url', 42, {}]) {
  assert.equal(esCapturaDeShop(raro, id), false, `Con ${JSON.stringify(raro) ?? 'undefined'} se rechaza sin reventar.`);
}

// --- El plan -------------------------------------------------------------------------
const sinCapturas = planCapturas({ id: 'x', screenshots: [] });
assert.deepEqual(sinCapturas, { tiene: false, total: 0, urls: [] }, 'Sin capturas no hay galería.');

const ausentes = planCapturas({ id: 'x' });
assert.deepEqual(ausentes, { tiene: false, total: 0, urls: [] }, 'El campo puede no existir.');

const conTres = planCapturas({ id: 'x', screenshots: [buena('x-1.png'), buena('x-2.png'), buena('x-3.png')] });
assert.equal(conTres.tiene, true, 'Con capturas hay galería.');
assert.equal(conTres.total, 3, 'Y se cuentan.');
assert.equal(conTres.urls.length, 3, 'Y se devuelven.');

// Más de 6: se recortan, no se rompe nada.
const muchas = Array.from({ length: 12 }, (_, i) => buena(`x-${i + 1}.png`));
const recortado = planCapturas({ id: 'x', screenshots: muchas });
assert.equal(CAPTURAS_LIMITE, 6, `El tope son 6 capturas, no ${CAPTURAS_LIMITE}.`);
assert.equal(recortado.total, 6, 'Con 12 capturas se muestran 6.');
assert.deepEqual(recortado.urls, muchas.slice(0, 6), 'Y son las 6 primeras, en orden.');

// El orden es el del catálogo: es el orden en que se enseñan.
assert.deepEqual(recortado.urls[0], muchas[0], 'La primera del catálogo es la primera que se ve.');

// No muta lo que recibe.
const entrada = { id: 'x', screenshots: muchas.slice() };
const antes = entrada.screenshots.slice();
planCapturas(entrada);
assert.deepEqual(entrada.screenshots, antes, 'No se puede recortar el array del catálogo en sitio.');

// --- Lo que el cargador va a necesitar ------------------------------------------------
// La comprobación que se hace dentro, repetida por fuera con una cadena, es la que usa el
// proceso principal. Si divergieran, el cargador aceptaría algo que el catálogo ya
// descartó, o al revés.
assert.equal(esCapturaDeShop(buena('market-helper-1.png'), id), esCapturaDeShop(new URL(buena('market-helper-1.png')), id),
  'La comprobación tiene que dar lo mismo con cadena y con URL.');

console.log('Script shop screenshots smoke passed: aceptadas, rechazadas por motivo, plan y recorte a 6.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\script-shop-screenshots-smoke.js`
Expected: FAIL con `Cannot find module '../src/script-shop-screenshots'`.

- [ ] **Paso 3: Escribir el módulo**

Crear `src/script-shop-screenshots.js`:

```js
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
```

- [ ] **Paso 4: Cargar el módulo en el navegador**

Un módulo que existe y que nadie carga es un módulo que no existe. `userscripts.js` lo
usará en la Tarea 3, y sin esta etiqueta `window.pokeGridShopScreenshots` será `undefined`
y `planCapturas(item)` reventará con un TypeError al pintar la primera tarjeta.

En `src/index.html`, en el bloque de scripts:

```html
    <script src="script-shop-order.js"></script>
    <script src="script-shop-view.js"></script>
    <script src="script-shop-screenshots.js"></script>
```

Y en `tests/script-shop-smoke.js`, antes del `console.log`:

```js
// El modulo tiene que cargarse en el navegador y antes de quien lo usa. Un modulo
// puro que nadie carga es un modulo que no existe, y el fallo es un TypeError al
// pintar la primera tarjeta, lejos de la causa.
{
  const orden = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const pos = orden.indexOf('script-shop-screenshots.js');
  assert.ok(pos > -1, 'script-shop-screenshots.js tiene que cargarse en index.html.');
  assert.ok(pos < orden.indexOf('userscripts.js'),
    `Y antes de userscripts.js, que es quien lo usa. Orden actual: ${orden.join(', ')}`);
}
```

- [ ] **Paso 5: Ejecutar y verificar que pasa**

Run: `node tests\script-shop-screenshots-smoke.js`
Expected: PASS con `Script shop screenshots smoke passed: aceptadas, rechazadas por motivo, plan y recorte a 6.`
Run: `node tests\script-shop-smoke.js` → PASS.

- [ ] **Paso 6: Correr el puerto de Node**

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes.

- [ ] **Paso 7: Sabotear para comprobar que muerde**

Cada sabotaje copia `src\script-shop-screenshots.js` **en ese instante**, lo muta, corre la
prueba y lo restaura comprobando `git hash-object src/script-shop-screenshots.js`.

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | Quita el `&& (!clave \|\| ...)` del prefijo, dejando que cualquier nombre encaje | `No puede usar las capturas de otro script.` |
| 2 | Cambia `(?:main\|[a-f0-9]{40})` por `[a-z0-9]{0,40}` | `Una rama suelta no vale.` |
| 3 | Cambia `CAPTURAS_LIMITE` por `12` | `El tope son 6 capturas, no 12.` |
| 4 | Quita `.slice(0, CAPTURAS_LIMITE)` y usa la lista entera | `Con 12 capturas se muestran 6.` |
| 5 | Quita el `try/catch` del `new URL`, que es lo que protege el caso `undefined` | `Con undefined se rechaza sin reventar.` |
| 6 | **Quita la comprobación de `url.hostname`** | `Un host que no es GitHub no vale, aunque la ruta sea exacta.` |

El 5 lo escribí mal en el plan: describía un `has`/`get` que el código no tiene. Lo que
protege ese caso es el `try/catch` alrededor de `new URL`.

El 6 es el que encontró la revisión de la tarea 1, y es el más importante: sin él, un host
ajeno con la ruta exacta pasaba, y en la Tarea 2 esa comprobación es la frontera de
seguridad del `net.fetch` del proceso principal.

- [ ] **Paso 8: Commit**

```bash
git add src/script-shop-screenshots.js tests/script-shop-screenshots-smoke.js
git commit -m "Anadir el modulo puro que decide que capturas tiene un script de la Shop"
```

---

### Tarea 2: El proceso principal — catálogo, cargador y segunda caché

**Ficheros:**
- Modificar: `src/main.js` (`SCRIPT_SHOP_CATALOG_LIMIT`, `normalizeScriptShopCatalog`, `loadAllowedImageDataUrl`, y el recuento de caché de la línea ~1669)
- Modificar: `tests/script-shop-smoke.js`

**Interfaces:**
- Consume: `esCapturaDeShop(url, id)` de `src/script-shop-screenshots.js` (Tarea 1).
- Produce: `normalizeScriptShopCatalog` devuelve `screenshots: string[]` ya filtrado; el
  canal `assets:image-data-url` acepta capturas de la Shop; `SCRIPT_SHOP_CATALOG_LIMIT`
  pasa a `1_000_000`.

- [ ] **Paso 1: Escribir la prueba que falla**

En `tests/script-shop-smoke.js`, antes del `console.log`:

```js
// El limite del catalogo. Medido: con 200 scripts y 6 capturas con URL completa se
// llegaba al 96,7% de 512 KB, y al pasarse loadScriptShopCatalog lanza y deja la Shop
// entera en blanco para todos. Con 1 MB queda en el 48%.
assert.match(main, /const SCRIPT_SHOP_CATALOG_LIMIT = 1_000_000;/,
  'El limite del catalogo tiene que ser 1 MB. A 512 KB, 200 scripts con capturas no caben.');

// Las capturas viajan en el catalogo, y una captura mala NO tumba el catalogo.
// Es la excepcion deliberada a la regla de downloadUrl, y sin prueba se convierte en
// norma por accidente.
assert.match(main, /screenshots:/, 'El catalogo normalizado tiene que llevar screenshots.');
assert.match(main, /esCapturaDeShop\(/, 'La validacion de capturas tiene que pasar por el modulo.');

// La segunda cache. La de sprites aguanta 48 porque un sprite pesa 20 KB; una captura no,
// y en base64 crece un 33%: 48 capturas de 2 MB serian 128 MB.
assert.match(main, /const CAPTURAS_CACHE_LIMIT = 24;/,
  'Las capturas necesitan su propia cache y su propio tope.');
assert.match(main, /const shopScreenshotCache = new Map\(\);/, 'Y su propio almacen.');
assert.match(main, /esCaptura \? shopScreenshotCache : remoteImageCache/,
  'Una captura va a su cache y un sprite a la suya.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\script-shop-smoke.js`
Expected: FAIL en `El limite del catalogo tiene que ser 1 MB`.

- [ ] **Paso 3: Las constantes y la caché nueva**

En `src/main.js`, junto a las constantes de la imagen, añadir:

```js
const REMOTE_IMAGE_CACHE_LIMIT = 48;
// Las capturas van a su propia cache. Compartirla con los sprites no vale: esos pesan
// 20 KB y 48 de ellos son nada, pero una captura pesa mucho mas y en base64 crece otro
// 33%. 48 capturas de 2 MB serian 128 MB en memoria, y abrir un catalogo grande podria
// dejar al launcher sin ella. Con 24 entradas el peor caso son unos 65 MB.
const CAPTURAS_CACHE_LIMIT = 24;
```

Y junto a `const remoteImageCache = new Map();`:

```js
const shopScreenshotCache = new Map();
```

- [ ] **Paso 4: El cargador acepta capturas**

En `loadAllowedImageDataUrl`, sustituir desde `const isGameAsset` hasta el final de la
función:

```js
  const isGameAsset = ['poke.idleworld.online', 'pokexguides.com'].includes(url.hostname);
  const isPokeApiSprite = url.hostname === 'raw.githubusercontent.com' &&
    /^\/PokeAPI\/sprites\/master\/sprites\/pokemon\/(?:other\/official-artwork\/)?[1-9]\d{0,3}\.png$/.test(url.pathname);
  // Las capturas de la Shop. Sin id: la comprobacion fuerte, la del prefijo contra el id
  // del script, ya la hizo el catálogo al normalizar y lo que llega aqui ya esta
  // filtrado. Esta es la frontera de seguridad: decide de donde se descarga.
  const isShopScreenshot = esCapturaDeShop(url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (!isGameAsset && !isPokeApiSprite && !isShopScreenshot)) {
    throw new Error('Origen de sprite no permitido.');
  }
  const cache = isShopScreenshot ? shopScreenshotCache : remoteImageCache;
  const limite = isShopScreenshot ? CAPTURAS_CACHE_LIMIT : REMOTE_IMAGE_CACHE_LIMIT;
  if (cache.has(url.href)) return readLruCache(cache, url.href);
  const request = net.fetch(url.href, { cache: 'force-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el sprite (${response.status}).`);
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) throw new Error('El recurso no es una imagen.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 2_000_000) throw new Error('El sprite supera el tamaño permitido.');
    return `data:${contentType};base64,${bytes.toString('base64')}`;
  }).catch((error) => {
    cache.delete(url.href);
    throw error;
  });
  return writeLruCache(cache, url.href, request, limite);
```

Y en la parte superior del fichero, junto a los demás `require` de módulos puros:

```js
const { esCapturaDeShop } = require('./script-shop-screenshots');
```

- [ ] **Paso 5: El límite del catálogo y el campo `screenshots`**

Cambiar `const SCRIPT_SHOP_CATALOG_LIMIT = 512_000;` por:

```js
// 1 MB. Medido con las entradas reales del catálogo, no estimado: 200 scripts con 6
// capturas con URL completa llegarían al 96,7% de 512 KB, y al pasarse esta constante
// loadScriptShopCatalog lanza y deja la Shop en blanco para todos y sin aviso. Con 1 MB
// quedan en el 48%, con sitio para los próximos campos.
const SCRIPT_SHOP_CATALOG_LIMIT = 1_000_000;
```

En `normalizeScriptShopCatalog`, dentro del `.map`, añadir `screenshots` al objeto
devuelto:

```js
      // Las capturas se filtran y no se lanza. Es la excepción deliberada a la regla de
      // downloadUrl, y el motivo es que la descarga es imprescindible —sin ella no se
      // puede instalar— mientras que una captura es decoración. Una URL mal escrita en
      // una captura no puede dejar sin Shop a todo el mundo.
      screenshots: (Array.isArray(row?.screenshots) ? row.screenshots : [])
        .filter((url) => esCapturaDeShop(url, id))
        .slice(0, CAPTURAS_LIMITE),
```

Y traer `CAPTURAS_LIMITE` al `require` del paso 4:

```js
const { CAPTURAS_LIMITE, esCapturaDeShop } = require('./script-shop-screenshots');
```

Además, **descartar en silencio no escallar: avisar**. Justo antes del `return` del objeto,
dentro del `.map`, añadir:

```js
      if (Array.isArray(row?.screenshots) && row.screenshots.some((url) => !esCapturaDeShop(url, id))) {
        console.error(`[PokeGrid] La entrada ${id} tiene capturas que no son del repositorio oficial de la Shop y se han descartado.`);
      }
```

- [ ] **Paso 6: El recuento de caché**

En la línea ~1669, donde se cuentan las entradas para el presupuesto, incluir la caché
nueva:

```js
  const cachedEntries = remoteImageCache.size + pokeApiSpeciesCache.size + shopScreenshotCache.size;
```

- [ ] **Paso 7: Ejecutar y verificar que pasa**

Run: `node tests\script-shop-smoke.js` → PASS.
Run: `node --check src\main.js` → exit 0.
Run: `node scripts\run-tests.cjs node` → todas verdes.

- [ ] **Paso 8: Sabotear para comprobar que muerde**

| # | Mutación en `src/main.js` | Aserción que debe caer |
|---|---|---|
| 1 | Vuelve a `512_000` | `El limite del catalogo tiene que ser 1 MB.` |
| 2 | Cambia `isShopScreenshot ? shopScreenshotCache : remoteImageCache` por `remoteImageCache` | `Una captura va a su cache y un sprite a la suya.` |
| 3 | Quita `&& !isShopScreenshot` de la condición del cargador | La estática no lo c Directly: es una prueba de comportamiento, ver más abajo |

El 3 **no lo caza ninguna aserción estática**, y eso hay que decirlo. Añadir en
`tests/script-shop-smoke.js` una comprobación de que `esCapturaDeShop` aparece **dentro**
del cuerpo de `loadAllowedImageDataUrl`:

```js
{
  const cuerpo = main.slice(main.indexOf('async function loadAllowedImageDataUrl'), main.indexOf('async function resolvePokeApiSpecies'));
  assert.match(cuerpo, /!isShopScreenshot/, 'El cargador tiene que aceptar capturas: sin esto, una captura pasa la lista y el cargador la rechaza.');
  assert.match(cuerpo, /isShopScreenshot \? shopScreenshotCache : remoteImageCache/, 'Y cada clase de imagen va a su cache.');
}
```

- [ ] **Paso 9: Commit**

```bash
git add src/main.js tests/script-shop-smoke.js
git commit -m "Aceptar capturas de la Shop en el catalogo y en el cargador, con cache propia"
```

---

### Tarea 3: La galería en la tarjeta

**Ficheros:**
- Modificar: `src/index.html` (el visor)
- Modificar: `src/styles.css` (galería y visor)
- Modificar: `src/userscripts.js` (la galería dentro de `<details>`, el cargador perezoso y el visor)
- Modificar: `tests/multi-game-userscripts-static-smoke.js`
- Modificar: `tests/script-shop-smoke.js` (aserciones estáticas de la descarga perezosa)

**Interfaces:**
- Consume: `planCapturas(item)` de `src/script-shop-screenshots.js` (Tarea 1);
  `window.pokeGrid.loadImageDataUrl` de `src/preload.js:24` (ya existe).
- Produce: nada para tareas siguientes.

**Lo que esta tarea NO puede probar, y por qué.** El catálogo del harness tiene un script
**sin capturas** y está vedado (R-03), así que no hay forma de ver una miniatura real en una
prueba. Lo que sí se comprueba, y es lo que protege de las 1.200 peticiones:

- **Estático**: `loadImageDataUrl` **no** aparece en el cuerpo de `renderScriptShop`. Si
  alguien descarga al pintar, la aserción lo dice aunque en ejecución no se note con un
  solo script.
- **Electron**: sin capturas no se crea galería, y abrir y cerrar los detalles no lanza
  ningún error.

- [ ] **Paso 1: Escribir las pruebas que fallan**

En `tests/multi-game-userscripts-static-smoke.js`, antes del `console.log`:

```js
// El visor de capturas. Sin el, pulsar una miniatura no tendria donde abrirse.
for (const id of ['#scriptShopViewer', '#scriptShopViewerImage', '#scriptShopViewerClose']) {
  assert.ok(htmlHasId(id), `${id} tiene que existir en index.html.`);
}
assert.match(css, /^\.script-shop-gallery\s*\{/m, 'La galeria necesita estilo.');
assert.match(css, /^\.script-shop-viewer\s*\{/m, 'El visor necesita estilo.');
assert.match(css, /\.script-shop-shot\.is-error/, 'El hueco de una captura que falla necesita estilo propio.');
```

En `tests/script-shop-smoke.js`, antes del `console.log`:

```js
// La descarga es perezosa y esto es lo que lo protege. Con 200 scripts y 6 capturas son
// 1200 imagenes posibles; descargarlas al pintar dispararia 1200 peticiones al abrir la
// Shop. El harness tiene un script sin capturas, asi que aqui no se observa ninguna
// peticion: se comprueba que la llamada NO esta en el render.
//
// El recorte va de "function renderScriptShop(" hasta "function renderScriptShopCategories("
// y las funciones nuevas van DESPUES de esa segunda. Si el ayudante se metiera entre las
// dos, la asercion leeria su propio codigo como si fuera el del render y pasaria sin
// comprobar nada, que es el peor fallo posible de una comprobacion de este tipo.
{
  const desde = manager.indexOf('function renderScriptShop(');
  const hasta = manager.indexOf('function renderScriptShopCategories(');
  const cuerpo = manager.slice(desde, hasta);
  assert.ok(desde > -1 && hasta > desde, 'No se ha encontrado el cuerpo de renderScriptShop.');
  assert.doesNotMatch(cuerpo, /loadImageDataUrl/,
    'renderScriptShop no puede descargar imagenes: se descarga al abrir los detalles.');
  assert.match(manager, /addEventListener\('toggle'/, 'La descarga tiene que ir en el toggle de los detalles.');
  assert.match(manager, /planCapturas\(item\)/, 'La galeria se decide con el modulo puro.');
  // Y que el ayudante este despues de donde acaba el recorte, no dentro.
  assert.ok(manager.indexOf('function cargarCapturasDeShop') > hasta,
    'cargarCapturasDeShop va despues de renderScriptShopCategories, o la comprobacion de arriba leeria su codigo.');
  // El hueco de una captura que falla: una captura que responde 404, o no es imagen, o
  // pesa mas de 2 MB. El comportamiento no se puede observar con el harness, asi que al
  // menos se fija que el camino de error existe y pinta el hueco.
  assert.match(manager, /classList\.add\('is-error'\)/, 'Una captura que no se puede cargar tiene que pintar un hueco.');
}
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\multi-game-userscripts-static-smoke.js` → FAIL en `#scriptShopViewer tiene que existir en index.html.`
Run: `node tests\script-shop-smoke.js` → FAIL en `renderScriptShop no puede descargar imagenes`.

- [ ] **Paso 3: El visor en el HTML**

En `src/index.html`, justo después del cierre de `#scriptShopView`:

```html
        <div id="scriptShopViewer" class="script-shop-viewer" role="dialog" aria-modal="true" aria-label="Captura ampliada" hidden>
          <button id="scriptShopViewerClose" class="script-shop-viewer-close" type="button" aria-label="Cerrar la captura">&times;</button>
          <img id="scriptShopViewerImage" alt="">
        </div>
```

- [ ] **Paso 4: El estilo**

Añadir al final de `src/styles.css`:

```css
/* Galería de capturas. Dentro del bloque de detalles de la tarjeta, al principio: quien
   abre los detalles quiere ver la captura, no leer texto. */
.script-shop-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.script-shop-gallery:empty {
  display: none;
}

.script-shop-shot {
  width: 88px;
  height: 66px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, .16);
  border-radius: 8px;
  background: rgba(255, 255, 255, .06);
  cursor: pointer;
  overflow: hidden;
}

.script-shop-shot img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* El hueco de una captura que no se pudo cargar. Un icono de imagen rota sería peor que
   un hueco con el nombre: el nombre dice qué falta, para poder avisar en vez de-callar. */
.script-shop-shot.is-error {
  display: grid;
  place-items: center;
  padding: 4px;
  border-style: dashed;
  border-color: rgba(255, 102, 120, .55);
  color: rgba(255, 255, 255, .7);
  font: 600 9px/1.2 system-ui, sans-serif;
  text-align: center;
  word-break: break-all;
  cursor: default;
}

.script-shop-shot.is-error img {
  display: none;
}

/* El visor. Un solo elemento reutilizado, no uno por miniatura. */
.script-shop-viewer {
  position: fixed;
  inset: 0;
  z-index: 320;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(8, 10, 14, .88);
}

.script-shop-viewer[hidden] {
  display: none;
}

.script-shop-viewer img {
  max-width: 100%;
  max-height: 100%;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .6);
}

.script-shop-viewer-close {
  position: absolute;
  top: 18px;
  right: 22px;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 50%;
  background: rgba(255, 255, 255, .08);
  color: inherit;
  font: 400 22px/1 system-ui, sans-serif;
  cursor: pointer;
}
```

- [ ] **Paso 5: Declarar los elementos del visor**

En `src/userscripts.js`, junto a los demás `document.querySelector` de la Shop:

```js
  const scriptShopViewer = document.querySelector('#scriptShopViewer');
  const scriptShopViewerImage = document.querySelector('#scriptShopViewerImage');
  const scriptShopViewerClose = document.querySelector('#scriptShopViewerClose');
```

Y añadirlos a `REQUIRED_SCRIPT_ELEMENTS`, en la lista de la vista Shop:
`'#scriptShopViewer', '#scriptShopViewerImage', '#scriptShopViewerClose',`

- [ ] **Paso 6: La galería dentro de la tarjeta**

En `renderScriptShop`, después de `card.innerHTML = ...` y **antes** de los escuchadores de
los botones, añadir:

```js
      // La galería va dentro de los detalles y antes de la descripción: quien abre los
      // detalles quiere ver la captura. El contenedor se crea vacío y se rellena al
      // abrir, porque descargar al pintar serían 1200 peticiones con un catálogo lleno.
      const plan = window.pokeGridShopScreenshots.planCapturas(item);
      if (plan.tiene) {
        const galeria = document.createElement('div');
        galeria.className = 'script-shop-gallery';
        const detalles = card.querySelector('details');
        if (detalles) {
          detalles.prepend(galeria);
          detalles.addEventListener('toggle', () => {
            if (detalles.open) cargarCapturasDeShop(galeria, plan);
          });
        }
      }
```

Y **después de `renderScriptShopDebounced`** —que va justo detrás de
`renderScriptShopCategories`—, el cargador y el visor. El sitio importa: una comprobación
del plan recorta el texto de `renderScriptShop` hasta `renderScriptShopCategories`, y si
el ayudante cayera entre las dos, esa comprobación leería su propio código como si fuera
el del render y pasaría sin comprobar nada.

```js
  // Descarga perezosa. El guard `dataset.cargado` evita volver a pedir lo que ya está:
  // abrir y cerrar los detalles cinco veces son cinco usos, no cinco descargas.
  async function cargarCapturasDeShop(galeria, plan) {
    if (galeria.dataset.cargado === '1') return;
    galeria.dataset.cargado = '1';
    for (const url of plan.urls) {
      const nombre = String(url).split('/').pop() || 'captura';
      const figura = document.createElement('button');
      figura.type = 'button';
      figura.className = 'script-shop-shot';
      figura.title = nombre;
      const imagen = document.createElement('img');
      imagen.alt = nombre;
      imagen.loading = 'lazy';
      figura.append(imagen);
      galeria.appendChild(figura);
      const dataUrl = await window.pokeGrid.loadImageDataUrl(url).catch((error) => {
        // Un hueco con el nombre, no un icono de imagen rota. El nombre dice qué falta,
        // que es lo que permite avisar en vez de fallar en silencio.
        figura.classList.add('is-error');
        figura.textContent = nombre;
        figura.title = `No se pudo cargar ${nombre}: ${error.message}`;
        figura.disabled = true;
        return '';
      });
      if (dataUrl) {
        imagen.src = dataUrl;
        figura.addEventListener('click', () => abrirVisorDeCaptura(dataUrl, nombre));
      }
    }
  }

  function abrirVisorDeCaptura(dataUrl, nombre) {
    if (!scriptShopViewer || !scriptShopViewerImage) return;
    scriptShopViewerImage.src = dataUrl;
    scriptShopViewerImage.alt = nombre;
    scriptShopViewer.hidden = false;
    scriptShopViewerClose?.focus();
  }

  function cerrarVisorDeCaptura() {
    if (!scriptShopViewer || scriptShopViewer.hidden) return;
    scriptShopViewer.hidden = true;
    // Se suelta el data: URL. Con seis capturas abiertas a la vez son varios MB de
    // base64 en un atributo src que ya no se está mirando.
    scriptShopViewerImage.removeAttribute('src');
  }
```

- [ ] **Paso 7: Los escuchadores del visor**

Junto a los escuchadores de las pestañas de la Shop:

```js
  scriptShopViewerClose?.addEventListener('click', cerrarVisorDeCaptura);
  scriptShopViewer?.addEventListener('click', (event) => {
    // Pulsar fuera de la imagen cierra; pulsar la imagen no.
    if (event.target === scriptShopViewer) cerrarVisorDeCaptura();
  });
```

Y **una sola vez**, en el manejador de la tecla Escape que ya existe para cerrar el modal de
scripts. Localízalo con:

```bash
node "C:\Users\Shockviny\AppData\Local\Temp\opencode\contar.js" src/userscripts.js
```

y buscando `Escape`. Dentro de ese manejador, añade antes del final:

```js
    if (!scriptShopViewer.hidden) { cerrarVisorDeCaptura(); return; }
```

Si no hay un manejador de Escape para el modal, créalo junto a los demás escuchadores:

```js
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && scriptShopViewer && !scriptShopViewer.hidden) {
      event.preventDefault();
      cerrarVisorDeCaptura();
    }
  });
```

- [ ] **Paso 8: Ejecutar y verificar que pasa**

Run: `node tests\multi-game-userscripts-static-smoke.js` → PASS.
Run: `node tests\script-shop-smoke.js` → PASS.
Run: `node --check src\userscripts.js` → exit 0.
Run: `node scripts\run-tests.cjs node` → todas verdes.

- [ ] **Paso 9: El registro de los ids**

Run: `node tests\multi-game-userscripts-static-smoke.js` 2>&1 | Select-String "REQUIRED_SCRIPT_ELEMENTS apunta"
Expected: sin salida. Si aparece, es que un id está en la lista y no en el HTML.

- [ ] **Paso 10: Sabotear para comprobar que muerde**

| # | Mutación | Aserción que debe caer |
|---|---|---|
| 1 | Quita `detalles.addEventListener('toggle', ...)` | `La descarga tiene que ir en el toggle de los detalles.` |
| 2 | Mete `loadImageDataUrl` dentro de `renderScriptShop` | `renderScriptShop no puede descargar imagenes.` |
| 3 | Quita `if (galeria.dataset.cargado === '1') return;` | Ninguna prueba lo caza: es un problema de tráfico, no de resultado. **Añado la aserción antes de dar la tarea por buena**: `assert.match(manager, /dataset\.cargado === '1'/)` en `tests/script-shop-smoke.js`, y se repite el sabotaje |
| 4 | Borra `.script-shop-shot.is-error` del CSS | `El hueco de una captura que falla necesita estilo propio.` |

La 3 es el hueco real de esta tarea, y el paso lo dice en vez de esconderlo.

- [ ] **Paso 11: Commit**

```bash
git add src/index.html src/styles.css src/userscripts.js tests/multi-game-userscripts-static-smoke.js tests/script-shop-smoke.js
git commit -m "Ensenar las capturas del script en su tarjeta y abrirla grande al pulsarla"
```

---

### Tarea 4: Documentación y cierre

**Ficheros:**
- Modificar: `README.md`
- Modificar: `docs/SCRIPT_SHOP.md`

- [ ] **Paso 1: El README**

En la lista de características, después de la línea de la Shop online:

```markdown
- **Capturas de pantalla** en la ficha de cada script, hasta seis, visibles en su bloque de información. Se descargan solo al abrirlo, así que abrir la Shop no descarga ni una.
```

- [ ] **Paso 2: El documento de la Shop**

En `docs/SCRIPT_SHOP.md`, añadir una sección `## Capturas de pantalla` después de
`## Categorías`:

````markdown
## Capturas de pantalla

Un script puede llevar hasta **seis** capturas, que se ven en el bloque de información de su
ficha, antes de la descripción.

Se publican en la carpeta `screenshots/` del repositorio, **planas y con el id del script
como prefijo**:

```text
screenshots/mi-herramienta-1.png
screenshots/mi-herramienta-2.png
```

Y en `catalog.json`, la entrada lleva:

```json
"screenshots": [
  "https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/mi-herramienta-1.png",
  "https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/mi-herramienta-2.png"
]
```

Cuatro reglas que el launcher hace cumplir:

- **El nombre tiene que empezar por el id del script.** Es lo que impide que un script se
  apropie de las capturas de otro. No lo escribas a mano: cuando la herramienta publicadora
  lo soporte, lo generará.
- **Solo `png`, `jpg`, `webp` y `gif`, y hasta 2 MB cada una.** El launcher no recomprime:
  una captura de 4K pesa más y se ve bien en el visor.
- **La URL tiene que ser del repositorio oficial**, en `main` o en un commit completo de 40
  hexadecimales. Cualquier otra se descarta al leer el catálogo, con un aviso en la consola.
- **Una captura con la URL mal escrita no tumba el catálogo**, a diferencia de
  `downloadUrl`. Se descarta esa captura y el resto se ven con normalidad.

Las capturas se descargan **al abrir el bloque de información**, no al abrir la Shop. Un
catálogo de 200 scripts con seis capturas son 1.200 imágenes, y descargarlas todas de golpe
sería absurdo.
````

- [ ] **Paso 3: Comprobar que nada se rompió**

Run: `node scripts\run-tests.cjs node` → todas verdes.
Run: `node_modules\electron\dist\electron.exe tests\script-shop-dom-smoke.js` → PASS.
Run: `node_modules\electron\dist\electron.exe tests\userscripts-manager-smoke.js` → PASS.
Run: `node_modules\electron\dist\electron.exe tests\launcher-visual-smoke.js` → PASS.

- [ ] **Paso 4: Commit**

```bash
git add README.md docs/SCRIPT_SHOP.md
git commit -m "Documentar como publicar capturas y como se ven en la ficha"
```

---

## Antes de dar esto por terminado

1. `node scripts\run-tests.cjs node` en verde.
2. `node scripts\run-tests.cjs electron` en verde, **una vez al final**. Se sabe que
   `dynamic-accounts-proxy-smoke.js` tarda unos 900 s en una máquina sin salida al juego, y
   que `accounts-backup-restore-smoke.js` **ya falla desde antes de la v0.23.4**. Si vuelve a
   salir, comparar con el ledger antes de investigar.
3. Cada suite nueva por separado con `Start-Process -Wait -PassThru`.
4. Bump de versión y un solo build. **Nada de publicar.**