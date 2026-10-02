# Cristal, tipografía y coste de los tres paneles en vivo — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa `superpowers:executing-plans` o `superpowers:subagent-driven-development` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Rediseñar Capture Log, Hunt Analyzer y Datos de la cuenta en cristal iOS oscuro con iconos SVG y tipografía Segoe UI Variable, arreglar que los paneles no se reajustan al maximizar (y pueden quedar recortados), y bajar el coste por segundo de los sondeos sin tocar qué datos se leen.

**Arquitectura:** Cuatro ficheros y ninguno nuevo salvo un módulo puro. La geometría de los paneles flotantes se extrae a un módulo sin DOM para poder probarla con `node` sin lanzar Electron. El material de cristal es un bloque de tokens CSS que los tres paneles comparten, para que sean el mismo material por construcción. El detalle de un Pokémon pasa de ser una tarjeta flotante posicionada a mano a ser un hermano de su fila, colocado por el CSS.

**Stack:** Electron 43.1.1, Node plano para las pruebas, CSS puro. Cero dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-02-cristal-y-rendimiento-design.md`

## Restricciones globales

Aplican a todas las tareas salvo que la tarea diga otra cosa.

- **Cero dependencias nuevas.** Ni un paquete, ni una fuente, ni un `@font-face`. Tipografía con lo que trae Windows.
- **Nada se publica.** Ni `git push` ni `git tag`. Eso es del usuario al final.
- **No se toca qué se lee.** Ni `captureLogPanelSnapshotScript`, ni `huntAnalyzerSnapshotScript`, ni las llamadas a la API, ni la lectura de tokens, ni qué campos se interpretan. El rendimiento solo cambia el **cuándo** y el **cuánto**.
- **Ninguna prueba puede pasar con lo que debería fallar.** Toda prueba nueva tiene que fallar contra el código de hoy, y eso se comprueba ejecutándola antes de implementar. La única excepción es la aserción de retrocompatibilidad de la Tarea 3, que tiene que pasar antes y después, y se dice explícitamente.
- **Verificar antes de afirmar.** Ninguna cifra de este plan se da por buena sin haberla leído en el código. Si al implementar una cifra no se confirma, se para y se corrige la spec antes de seguir.
- **Un commit por tarea.** Si P4 rompe algo, `git bisect` tiene que señalar la tarea exacta.
- **Rutas con `path.join`.** Nada de cadenas con barras invertidas.
- **Todo en español con tildes**, incluidos los textos de la interfaz y los comentarios del código.

## Foco de revisión

Cinco clases de entrada o fallo que la spec sugiere pero que ninguna prueba del plan cubre tal cual, y que son las que más probablemente molestarían a alguien usando el launcher. Cada línea tiene su prueba en la tarea indicada.

1. **Una geometría guardada antes de este cambio, sin `baseWidth` ni `baseParent`.** Quien actualice el launcher ya tiene esos paneles en su máquina. Una versión razonable espera que su posición y su tamaño sigan ahí. → Tarea 3, paso 2, aserción `geometría vieja sin referencias`.
2. **Estás leyendo el detalle de un Pokémon y llega una captura nueva.** Hoy `renderer.js:3763` cierra el detalle y `3764` reconstruye la lista. Una versión razonable espera que lo que estabas leyendo siga abierto. → Tarea 6, paso 2.
3. **Un panel fijado con el botón de fijar y luego se maximiza la ventana.** Una versión razonable espera que se quede exacto donde se puso, pero entero y sin recortarse. → Tarea 3, paso 2, aserción `fijado tras maximizar`.
4. **Un icono de drop que nunca resuelve, con las nueve métricas presentes.** Una versión razonable espera ver las métricas. Hoy ve un mensaje de error. → Tarea 7, paso 2.
5. **La cuenta se estrecha por debajo del suelo del panel** (por debajo de 300 px en Capture Log, 280 en Hunt). Una versión razonable espera el panel entero, más pequeño, no la mitad. → Tarea 3, paso 2, aserción `suelo que no cabe`.

---

### Tarea 1: Los cinco iconos que faltan y los cuatro de Capture Log que nunca se conectaron

De los botones que el encargo cubre, Hunt Analyzer y el cierre de Datos de la cuenta ya reciben SVG (`renderer.js:8592-8597`). Los cuatro de Capture Log (`index.html:631-636`) se quedan con emoji porque nadie los sustituye, y los cinco de la barra de cada cuenta (`index.html:584,591,593,594,595`) son texto.

**Ficheros:**
- Crear: `tests/launcher-icons-smoke.js`
- Modificar: `src/renderer.js:7526-7547` (cinco entradas en `LAUNCHER_ICON_PATHS`), `src/renderer.js:8592-8598` (los cuatro de Capture Log), `src/renderer.js:4757` (agrandar/recoger)

**Interfaces:**
- Consume: nada de tareas anteriores.
- Produce: `launcherUiIcon(name)` acepta los nombres nuevos `user`, `zoomOut`, `zoomIn`, `expand`, `collapse`, que ya acepta `refresh`, `pin`, `reset`, `trash`, `close`, `star`.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/launcher-icons-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

// --- Los cinco iconos del encargo existen y dibujan algo -------------------------
const bloque = renderer.slice(renderer.indexOf('const LAUNCHER_ICON_PATHS'));
const fin = bloque.indexOf('\n});');
const tabla = bloque.slice(0, fin);

for (const nombre of ['user', 'zoomOut', 'zoomIn', 'expand', 'collapse', 'refresh', 'pin', 'trash', 'close']) {
  const linea = tabla.split('\n').find((una) => una.trim().startsWith(`${nombre}:`));
  assert.ok(linea, `El icono "${nombre}" tiene que estar en LAUNCHER_ICON_PATHS.`);
  assert.ok(/<path|<circle/.test(linea), `El icono "${nombre}" tiene que dibujar algo, no una cadena vacía.`);
}

// --- Ningún emoji se queda en los botones de los tres paneles ------------------
const sinSvg = ['&#128100;', '&#128716;', '&times;', '&#8635;', '&#8634;', '&#8722;', '&#8629;', '&#9855;', '&#9998;'];
const panelTemplate = html.slice(html.indexOf('<template id="panelTemplate">'));
const finTemplate = panelTemplate.indexOf('</template>');
const markup = panelTemplate.slice(0, finTemplate);

// Los cuatro botones de Capture Log que hoy llevan emoji literal.
assert.ok(!markup.includes('&#9855;'), 'El botón de posición de Capture Log todavía lleva el emoji ↺.');
assert.ok(!markup.includes('&#128716;'), 'El botón de fijar de Capture Log todavía lleva el emoji 📌.');

// Ningún botón del panel puede quedarse con texto plano donde debería haber icono.
assert.ok(!/<button class="mini-button zoom-out"[^>]*>−<\/button>/.test(markup),
  'El botón de zoom out sigue con el glifo −.');
assert.ok(!/<button class="mini-button zoom-in"[^>]*>\+<\/button>/.test(markup),
  'El botón de zoom in sigue con el glifo +.');

// --- Los cuatro botones de Capture Log reciben SVG al crear el panel ------------
for (const selector of [
  '.capture-float-position-reset', '.capture-float-pin', '.capture-float-delete', '.capture-float-close'
]) {
  const re = new RegExp(`querySelector\\('${selector.replace('.', '\\.')}'\\)\\.innerHTML = launcherUiIcon\\('`);
  assert.ok(re.test(renderer), `El botón "${selector}" de Capture Log tiene que recibir launcherUiIcon.`);
}

// --- Y con la LOCAL, no con panel.algo ---------------------------------------
// En el punto donde se conectan los iconos, el objeto panel todavía no existe:
// se ensambla en renderer.js:8622. Escribir panel.captureLogPanel ahí es un
// ReferenceError en runtime, y node --check NO lo ve porque es sintácticamente
// válido. Esta aserción lo caza.
const zonaIconos = renderer.slice(renderer.indexOf("launcherUiIcon('refresh')"));
const hastaPanel = renderer.slice(0, renderer.indexOf('captureLogPanel,'));
const conectando = zonaIconos.slice(0, Math.max(0, hastaPanel.length - (renderer.length - zonaIconos.length)));
assert.equal(/panel\.captureLogPanel|panel\.huntPanel|panel\.accountInfoPanel|panel\.accountInfoButton/.test(conectando), false,
  'Los iconos se conectan con las variables locales, no con panel.*: en ese punto el objeto panel no existe todavía y sale un ReferenceError.');

// --- Agrandar y recoger usan innerHTML, no textContent --------------------------
const lineaExpand = renderer.split('\n').find((una) => una.includes('expandButton.textContent'));
assert.equal(lineaExpand, undefined,
  'expandButton sigue usando textContent, y un SVG no se pinta con textContent.');

console.log('Launcher icons smoke passed: cinco iconos nuevos y los nueve botones con SVG.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\launcher-icons-smoke.js
```

Se espera `AssertionError`: `El icono "user" tiene que estar en LAUNCHER_ICON_PATHS.` Si pasa, la prueba está mal: revísala antes de seguir.

- [ ] **Paso 3: añadir los cinco iconos**

En `src/renderer.js`, dentro de `LAUNCHER_ICON_PATHS`, antes del cierre. Trazo de 1,9, `stroke="currentColor"`, que es lo que usa el resto:

```javascript
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.5-4.5M8 11h6"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.5-4.5M8 11h6M11 8v6"/>',
  expand: '<path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5"/>',
  collapse: '<path d="M4 9h5V4M20 9h-5V4M20 15h-5v5M4 15h5v5"/>',
```

- [ ] **Paso 4: conectar los cuatro botones de Capture Log**

**Ojo con las variables, que es donde esto se rompe.** En `renderer.js:8592-8597` el objeto `panel` **todavía no existe**: se ensambla más abajo, en 8622 (`captureLogPanel`), 8654 (`huntPanel`) y 8662 (`accountInfoPanel`). El código que ya está ahí usa las **locales**, no `panel`. Si escribes `panel.captureLogPanel` en este punto, sale un `ReferenceError` al crear cada cuenta y **no arranca ninguna cuenta**.

Las tres locales ya existen y están en el mismo ámbito: `captureLogPanel` (8561), `huntPanel` (8580) y `accountInfoButton` (8585).

En `src/renderer.js`, justo debajo de la línea 8597, añade:

```javascript
  captureLogPanel.querySelector('.capture-float-position-reset').innerHTML = launcherUiIcon('refresh');
  captureLogPanel.querySelector('.capture-float-pin').innerHTML = launcherUiIcon('pin');
  captureLogPanel.querySelector('.capture-float-delete').innerHTML = launcherUiIcon('trash');
  captureLogPanel.querySelector('.capture-float-close').innerHTML = launcherUiIcon('close');
  accountInfoButton.innerHTML = launcherUiIcon('user');
```

Las cinco, con la **local**, sin `panel.`.

- [ ] **Paso 5: cambiar `expandButton` a `innerHTML`**

En `src/renderer.js:4757`, dentro del `panels.forEach`:

```javascript
    item.expandButton.innerHTML = launcherUiIcon(item === expandedPanel ? 'collapse' : 'expand');
```

El `title` de la línea siguiente no se toca.

- [ ] **Paso 6: vaciar los emojis del `panelTemplate`**

En `src/index.html`, dentro de `panelTemplate`: en la línea 584, el contenido del botón `account-info-toggle` pasa a estar vacío (`aria-label` ya lo describe); en 591 y 593, vacíos; en 594, vacío; en 595, vacío. En 631, 632 y 634, vacíos. El botón de la línea 636 se deja para la Tarea 6, porque su `×` lo sustituye la línea 8597-equivalente de la Tarea 1 paso 4; si al implementarlo sigue con `&times;`, cámbialo también ahí.

Los botones se quedan con su `title` y su `aria-label`, que es lo que un lector de pantalla necesita. El icono lo pone `launcherUiIcon` al crear el panel.

El `×` del botón de cierre de Capture Log también se vacía aquí, y lo sustituye la línea de `launcherUiIcon('close')` del paso 4.

**Comprueba con `node --check src\renderer.js` antes de ejecutar nada.** Un `panel.captureLogPanel` donde toca una local es un `ReferenceError` en runtime que `node --check` **no** ve, porque sintácticamente es válido; por eso la prueba de este paso busca literalmente `panel.captureLogPanel` en el bloque.

- [ ] **Paso 7: ejecutar la prueba y las de siempre**

```
node tests\launcher-icons-smoke.js
node scripts\run-tests.cjs node
```

Los dos en verde.

- [ ] **Paso 8: commit**

```
git add tests/launcher-icons-smoke.js src/renderer.js src/index.html
git commit -m "Poner los nueve botones de los paneles y de la barra con iconos SVG"
```

---

### Tarea 2: La geometría de los paneles flotantes, en un módulo puro

El arreglo de que los paneles no se reajustan se prueba con `node` sin Electron **solo si la aritmética está en un módulo sin DOM**. Esta tarea crea ese módulo y lo deja probado. La Tarea 3 lo conecta.

Hoy todo vive en `renderer.js:7077-7173` y depende de `getBoundingClientRect()` y de `localStorage`, así que no se puede probar sin ventana.

**Ficheros:**
- Crear: `src/float-geometry.js`
- Crear: `tests/float-geometry-smoke.js`

**Interfaces:**
- Consume: nada.
- Produce: `calcularFloatGeometry(geometry, parentRect, kind)` y `resolverSuelo(kind, parentRect)`, ambos puros. `kind` es `'hunt'` o `'capture'`. Devuelven `{ width, height, left, top }` en píxeles CSS, ya recortados al padre, con `width <= parentRect.width - 14` y `height <= parentRect.height - 56` **siempre**.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/float-geometry-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const { calcularFloatGeometry, resolverSuelo } = require('../src/float-geometry');

// Padre de una cuenta corriente en la rejilla.
const ANCHO = 620;
const ALTO = 520;
const padre = (width = ANCHO, height = ALTO) => ({ width, height });

// --- El suelo nunca supera al padre --------------------------------------------
// Este es el bug. Con minWidth = 300 y un padre de 280, el panel mide 300 y
// .panel tiene overflow: hidden, o sea que se recorta y no se ve entero.
const estrecho = padre(280, 400);
for (const kind of ['capture', 'hunt']) {
  const suelo = resolverSuelo(kind, estrecho);
  assert.ok(suelo.width <= estrecho.width - 14,
    `El suelo de ${kind} (${suelo.width}) no puede superar al padre menos el margen (${estrecho.width - 14}).`);
  assert.ok(suelo.height <= estrecho.height - 56,
    `El alto del suelo de ${kind} (${suelo.height}) no puede superar al padre menos el margen.`);
}

const guardadoEstrecho = { left: 7, top: 49, width: 300, height: 250, locked: false };
const enEstrecho = calcularFloatGeometry(guardadoEstrecho, estrecho, 'capture');
assert.ok(enEstrecho.left + enEstrecho.width <= estrecho.width,
  `El panel se sale por la derecha: ${enEstrecho.left} + ${enEstrecho.width} > ${estrecho.width}.`);
assert.ok(enEstrecho.top + enEstrecho.height <= estrecho.height,
  `El panel se sale por abajo: ${enEstrecho.top} + ${enEstrecho.height} > ${estrecho.height}.`);

// --- Al maximizar crece, y se detiene en el tope --------------------------------
// Hoy no crece nada: el min() exterior con el valor guardado manda.
const guardado = {
  left: 20, top: 60, width: 300, height: 250, locked: false,
  baseWidth: 300, baseHeight: 250,
  baseParent: { width: ANCHO, height: ALTO }
};
const grande = padre(1400, 1100);
const alMaximizar = calcularFloatGeometry(guardado, grande, 'capture');
assert.ok(alMaximizar.width > guardado.width,
  `Al maximizar el ancho tiene que crecer: se queda en ${alMaximizar.width}, igual que antes.`);
assert.ok(alMaximizar.height > guardado.height,
  `Al maximizar el alto tiene que crecer: se queda en ${alMaximizar.height}.`);
assert.ok(alMaximizar.width <= 300 * 1.5 + 0.001,
  `El crecimiento se pasa del tope del 1,5x: ${alMaximizar.width} > 450.`);
assert.ok(alMaximizar.height <= 250 * 1.5 + 0.001,
  `El crecimiento en alto se pasa del tope: ${alMaximizar.height} > 375.`);
assert.ok(alMaximizar.left + alMaximizar.width <= grande.width, 'Al maximizar se sale por la derecha.');
assert.ok(alMaximizar.top + alMaximizar.height <= grande.height, 'Al maximizar se sale por abajo.');

// --- X e Y se escalan por separado ----------------------------------------------
// El padre crece solo en horizontal: el ancho crece y el alto se queda igual.
// Si la fórmula mezclara razonX y razonY, el alto se movería y esto falla.
const enHorizontal = calcularFloatGeometry(guardado, padre(1400, ALTO), 'capture');
assert.ok(enHorizontal.width > guardado.width, 'Con el padre más ancho, el panel tiene que crecer en ancho.');
assert.equal(enHorizontal.height, guardado.height,
  'Con la misma altura de padre, el alto no puede cambiar. Si cambia, razonX y razonY están mezcladas.');

// Y al revés.
const enVertical = calcularFloatGeometry(guardado, padre(ANCHO, 1100), 'capture');
assert.equal(enVertical.width, guardado.width,
  'Con el mismo ancho de padre, el ancho no puede cambiar.');
assert.ok(enVertical.height > guardado.height, 'Con el padre más alto, el panel tiene que crecer en alto.');

// --- Un panel fijado no se mueve, pero tampoco se recorta ----------------------
const fijado = { ...guardado, locked: true };
const fijadoGrande = calcularFloatGeometry(fijado, grande, 'capture');
assert.equal(fijadoGrande.width, guardado.width, 'Un panel fijado no cambia de ancho al maximizar.');
assert.equal(fijadoGrande.left, guardado.left, 'Un panel fijado no cambia de posición al maximizar.');
assert.ok(fijadoGrande.left + fijadoGrande.width <= grande.width,
  'Un panel fijado tampoco puede salirse del padre.');

// Un panel fijado en una cuenta que se ha estrechado: entero, más pequeño.
const fijadoEstrecho = calcularFloatGeometry({ ...guardadoEstrecho, locked: true }, estrecho, 'capture');
assert.ok(fijadoEstrecho.left + fijadoEstrecho.width <= estrecho.width,
  'Un panel fijado en una cuenta estrecha se recorta. No debería.');

console.log('Float geometry smoke passed: suelo, crecimiento con tope, ejes separados, fijado y cuenta estrecha.');
```

Ojo con los dos helpers del final: son un andamiaje para no repetir el suelo, y hay que ajustarlos si al implementar la fórmula cambia. Lo que no puede cambiar es lo que verifican: **X e Y tienen que ser independientes**.

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\float-geometry-smoke.js
```

Se espera `Cannot find module '../src/float-geometry'`.

- [ ] **Paso 3: escribir el módulo**

`src/float-geometry.js`:

```javascript
'use strict';

// La geometría de los paneles flotantes, en un módulo puro.
//
// Vive fuera de renderer.js por un motivo concreto: toda la aritmética es
// calculable con dos números, y si vive aquí se puede probar con `node` sin
// lanzar Electron ni abrir una ventana. renderer.js:7091-7107 hacía esta misma
// cuenta contra getBoundingClientRect() y localStorage, y por eso no había
// forma de comprobar nada sin el juego delante.

// Los suelos de los paneles. Vienen de lo que necesita cada panel para que su
// cabecera y sus herramientas quepan. Los mismos valores que tenía renderer.js.
const SUELOS = {
  capture: { width: 300, height: 250 },
  hunt: { width: 280, height: 230 }
};

// Cuánto puede crecer un panel al maximizar la ventana, como múltiplo de lo que
// el usuario ajustó a mano. Pasado este tope se queda quieto: un panel que se
// come la pantalla no ayuda a nadie.
const TOPE_CRECIMIENTO = 1.5;

// Margen contra el borde del padre. El horizontal es el que ya usaba el CSS en
// styles.css:4068; el vertical deja sitio a la cabecera del panel de la cuenta,
// que ocupa los primeros píxeles de la columna.
const MARGEN_X = 14;
const MARGEN_Y = 56;

// Separación mínima contra el borde del padre al colocar el panel. El mínimo
// vertical es 49 porque por encima de la barra de la cuenta no se puede.
const BORDE_X = 7;
const BORDE_Y = 7;
const BORDE_MIN_Y = 49;

// El suelo de un panel nunca puede superar lo que cabe en el padre. Este es el
// arreglo del bug: renderer.js calculaba Math.max(300, parentRect.width - 14),
// y ese 300 se pasaba de grande cuando la cuenta era más estrecha, así que el
// panel se salía y .panel, que tiene overflow: hidden, lo recortaba.
function resolverSuelo(kind, parentRect) {
  const suelo = SUELOS[kind] || SUELOS.capture;
  return {
    width: Math.max(0, Math.min(suelo.width, (parentRect.width || 0) - MARGEN_X)),
    height: Math.max(0, Math.min(suelo.height, (parentRect.height || 0) - MARGEN_Y))
  };
}

function calcularFloatGeometry(geometry, parentRect, kind) {
  const parentWidth = parentRect.width || 0;
  const parentHeight = parentRect.height || 0;
  const suelo = resolverSuelo(kind, parentRect);
  const anchoMax = Math.max(0, parentWidth - MARGEN_X);
  const altoMax = Math.max(0, parentHeight - MARGEN_Y);

  // Lo que el panel medía cuando el usuario lo ajustó a mano, y el padre que
  // había en ese momento. Sin estas referencias no hay con qué escalar, así que
  // un panel guardado por una versión anterior se escala 1:1, que es lo
  // correcto: el usuario aún no lo ha tocado.
  const baseWidth = Number(geometry.baseWidth) || Number(geometry.width) || suelo.width;
  const baseHeight = Number(geometry.baseHeight) || Number(geometry.height) || suelo.height;
  const parentBase = geometry.baseParent || null;

  // Un panel fijado con el botón de fijar no se escala: se queda donde lo puso
  // el usuario y con el tamaño que le dio. Aun así se recorta al padre, porque
  // si la cuenta se estrecha, un panel fijado que se sale queda recortado igual
  // que uno suelto, y eso no lo arregla el candado.
  const fijado = geometry.locked === true;
  const razonX = fijado ? 1 : (parentBase && parentBase.width > 0 ? parentWidth / parentBase.width : 1);
  const razonY = fijado ? 1 : (parentBase && parentBase.height > 0 ? parentHeight / parentBase.height : 1);

  // Tres techos, en este orden: el suelo, para que no se corte; el tope de
  // crecimiento, para que no se coma la pantalla; y lo que cabe, que es el
  // único que puede bajar el panel por debajo del suelo.
  const width = Math.min(
    Math.max(suelo.width, baseWidth * razonX),
    baseWidth * TOPE_CRECIMIENTO,
    anchoMax
  );
  const height = Math.min(
    Math.max(suelo.height, baseHeight * razonY),
    baseHeight * TOPE_CRECIMIENTO,
    altoMax
  );

  // La posición se escala con la misma razón que el tamaño, para que un panel
  // no se vaya de su esquina al cambiar la proporción de la ventana, y después
  // se recorta contra el padre.
  const left = Math.min(
    Math.max(BORDE_X, (Number(geometry.left) || BORDE_X) * razonX),
    Math.max(BORDE_X, parentWidth - width - BORDE_X)
  );
  const top = Math.min(
    Math.max(BORDE_MIN_Y, (Number(geometry.top) || BORDE_MIN_Y) * razonY),
    Math.max(BORDE_MIN_Y, parentHeight - height - BORDE_Y)
  );

  return { width, height, left, top };
}

// Lo que hay que guardar en localStorage para poder escalar la próxima vez: la
// geometría de siempre más las dos referencias. La primera vez, si no hay
// referencias, se toman de lo que ya había: el usuario aún no ha ajustado ese
// panel a mano, así que su tamaño actual es su tamaño de referencia.
function referenciaDeGuardado(geometry, parentRect, kind) {
  const suelo = resolverSuelo(kind, parentRect);
  return {
    baseWidth: Number(geometry.baseWidth) || Number(geometry.width) || suelo.width,
    baseHeight: Number(geometry.baseHeight) || Number(geometry.height) || suelo.height,
    baseParent: {
      width: Math.max(1, Number(parentRect.width) || 1),
      height: Math.max(1, Number(parentRect.height) || 1)
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUELOS, TOPE_CRECIMIENTO, MARGEN_X, MARGEN_Y, resolverSuelo, calcularFloatGeometry, referenciaDeGuardado };
}
if (typeof window !== 'undefined') {
  window.pokeGridFloatGeometry = { SUELOS, TOPE_CRECIMIENTO, MARGEN_X, MARGEN_Y, resolverSuelo, calcularFloatGeometry, referenciaDeGuardado };
}
```

- [ ] **Paso 4: ejecutar la prueba y ver que pasa**

```
node tests\float-geometry-smoke.js
node scripts\run-tests.cjs node
```

Los dos en verde. Si la prueba de ejes independientes falla, la fórmula está mezclando `razonX` y `razonY`; es el fallo más fácil de cometer aquí.

- [ ] **Paso 5: añadir `index.html`**

En `src/index.html`, junto a los demás módulos del navegador, antes de `script-shop-screenshots.js`:

```html
    <script src="float-geometry.js"></script>
```

- [ ] **Paso 6: commit**

```
git add src/float-geometry.js src/index.html tests/float-geometry-smoke.js
git commit -m "Sacar la geometria de los paneles flotantes a un modulo puro y probar el recorte y el tope"
```

---

### Tarea 3: Conectar el módulo puro y quitar el tamaño del estilo inline

Con la aritmética probada, aquí se arregla de verdad el bug. La parte que importa: **`applyFloatGeometry` deja de escribir el tamaño**, para que el CSS pueda reaccionar.

**Ficheros:**
- Modificar: `src/renderer.js:7077-7173` (`floatGeometryKey`, `applyFloatGeometry`, `saveFloatGeometry`)
- Modificar: `src/styles.css:1286-1308` y `1138-1160` (los dos paneles flotantes)

**Interfaces:**
- Consume: `calcularFloatGeometry`, `referenciaDeGuardado` y `resolverSuelo` de `src/float-geometry.js`, expuestos como `window.pokeGridFloatGeometry`.
- Produce: `applyFloatGeometry(panel, kind)` escribe en estilo inline **solo `left` y `top`**, y pone el tamaño en las propiedades personalizadas `--float-w` y `--float-h` del elemento. El CSS las lee con `width: min(var(--float-w), calc(100% - 14px))`.

- [ ] **Paso 1: escribir la prueba que falla primero**

Amplía `tests/float-geometry-smoke.js` con el caso de retrocompatibilidad, que es el único del plan que tiene que **pasar antes y después**:

```javascript
// --- Una geometría guardada por una versión anterior sigue valiendo ------------
// Esta aserción TIENE QUE PASAR ANTES del arreglo. Si falla ahora, el arreglo
// va a romperle el panel a quien ya tiene el launcher instalado.
const viejo = { left: 37, top: 52, width: 300, height: 250, locked: false };
const conPadreIgual = calcularFloatGeometry(viejo, padre(), 'capture');
assert.equal(conPadreIgual.width, viejo.width, 'Sin referencias, el ancho tiene que ser el guardado.');
assert.equal(conPadreIgual.height, viejo.height, 'Sin referencias, el alto tiene que ser el guardado.');
assert.equal(conPadreIgual.left, viejo.left, 'Sin referencias, la posición tiene que ser la guardada.');
assert.equal(conPadreIgual.top, viejo.top, 'Sin referencias, la posición tiene que ser la guardada.');

// Y con el padre más grande tampoco se mueve, porque no hay con qué escalar.
const viejoGrande = calcularFloatGeometry(viejo, grande, 'capture');
assert.equal(viejoGrande.width, viejo.width,
  'Sin referencias no hay escala, así que maximizar tampoco debe mover el panel.');
```

- [ ] **Paso 2: ejecutarla y confirmar que pasa**

```
node tests\float-geometry-smoke.js
```

Tiene que pasar. **Si falla, para.** Significa que la fórmula del módulo no respeta la retrocompatibilidad y hay que arreglarla antes de conectar nada.

- [ ] **Paso 3: reescribir `applyFloatGeometry`**

En `src/renderer.js`, sustituye el cuerpo de `applyFloatGeometry` (ahora 7091-7108) por:

```javascript
function applyFloatGeometry(panel, kind) {
  const floatPanel = kind === 'hunt' ? panel.huntPanel : panel.captureLogPanel;
  const pinButton = floatPanel.querySelector(`.${kind}-float-pin`);
  const geometry = readFloatGeometry(panel, kind);
  const locked = geometry?.locked === true;
  floatPanel.classList.toggle('is-geometry-locked', locked);
  pinButton.classList.toggle('is-active', locked);
  pinButton.setAttribute('aria-pressed', String(locked));
  pinButton.title = locked ? 'Desbloquear tamaño y posición' : 'Fijar tamaño y posición';
  const parentRect = panel.element.getBoundingClientRect();

  if (!geometry || !Number.isFinite(Number(geometry.left))) {
    // Sin geometría guardada el CSS manda, y sus valores por defecto ya llevan
    // el suelo y el margen. No hay nada que escribir.
    floatPanel.style.removeProperty('--float-w');
    floatPanel.style.removeProperty('--float-h');
    return;
  }

  const medida = window.pokeGridFloatGeometry.calcularFloatGeometry(geometry, parentRect, kind);

  // El tamaño NO va en estilo inline a propósito. Mientras el JS escriba width y
  // height, el CSS no puede reaccionar, y el `min(280px, calc(100% - 14px))` de
  // styles.css:4068 no sirve de nada porque inline gana a cualquier regla. Aquí
  // solo se calculan y se pasan como propiedades personalizadas; el CSS las
  // envuelve en su propio min(), que es quien recorta si el padre encoge más de
  // lo previsto.
  floatPanel.style.setProperty('--float-w', `${Math.round(medida.width)}px`);
  floatPanel.style.setProperty('--float-h', `${Math.round(medida.height)}px`);
  floatPanel.style.left = `${Math.round(medida.left)}px`;
  floatPanel.style.top = `${Math.round(medida.top)}px`;
  floatPanel.style.right = 'auto';
  floatPanel.style.bottom = 'auto';
}
```

Fíjate en que la firma ha cambiado: **ya no acepta `geometry` como tercer argumento.** Los tres sitios que se lo pasaban (`7131`, `7142` y el que llama con `null` en el botón de restablecer) hay que actualizarlos:

- `setupFloatGeometry` (7131): `applyFloatGeometry(panel, kind)`.
- El botón de fijar (7136): `applyFloatGeometry(panel, kind)`.
- El botón de restablecer (7138-7143): quita el `floatPanel.removeAttribute('style')`, que borraría también las propiedades personalizadas y las de posición de golpe, y déjalo así:

```javascript
  resetButton.addEventListener('click', () => {
    localStorage.removeItem(floatGeometryKey(panel, kind));
    floatPanel.classList.remove('is-geometry-locked');
    floatPanel.style.removeProperty('--float-w');
    floatPanel.style.removeProperty('--float-h');
    floatPanel.style.removeProperty('left');
    floatPanel.style.removeProperty('top');
    applyFloatGeometry(panel, kind);
  });
```

- [ ] **Paso 4: `saveFloatGeometry` guarda las referencias**

En `src/renderer.js:7110-7124`, el objeto que se guarda pasa a ser:

```javascript
  const parentRect = panel.element.getBoundingClientRect();
  const rect = floatPanel.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const previa = readFloatGeometry(panel, kind) || {};
  const referencia = window.pokeGridFloatGeometry.referenciaDeGuardado(previa, parentRect, kind);
  const geometry = {
    left: Math.round(rect.left - parentRect.left),
    top: Math.round(rect.top - parentRect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    locked: floatPanel.classList.contains('is-geometry-locked'),
    baseWidth: referencia.baseWidth,
    baseHeight: referencia.baseHeight,
    baseParent: referencia.baseParent
  };
  localStorage.setItem(floatGeometryKey(panel, kind), JSON.stringify(geometry));
```

Y `readFloatGeometry` tiene que **limpiar** una geometría incompleta en vez de devolverla tal cual. Si no, un objeto sin `baseParent` se escala 1:1 pero `baseParent` se rellena con el padre actual en la siguiente escritura, y a partir de ahí empieza a escalar desde un padre equivocado. Añade al final de `readFloatGeometry`:

```javascript
  const parentRect = panel.element.getBoundingClientRect();
  const referencia = window.pokeGridFloatGeometry.referenciaDeGuardado(geometry, parentRect, kind);
  return {
    ...geometry,
    baseWidth: referencia.baseWidth,
    baseHeight: referencia.baseHeight,
    baseParent: referencia.baseParent
  };
```

Para eso `readFloatGeometry` necesita el `kind`. Cambia su firma a `readFloatGeometry(panel, kind)` y actualiza los dos sitios que la llaman.

- [ ] **Paso 5: el tamaño por CSS**

En `src/styles.css`, en `.capture-float-panel` (1286) y `.hunt-float-panel` (1138), sustituye el `width` y el `height` fijos por el que usa las propiedades personalizadas, **manteniendo el suelo por debajo del `min()`** que ya tienen:

```css
  width: min(var(--float-w, 430px), calc(100% - 14px));
  min-width: min(280px, calc(100% - 14px));
  height: min(var(--float-h, 320px), calc(100% - 56px));
  min-height: min(230px, calc(100% - 56px));
```

Repite con los suelos de `capture` (300 y 250) donde toque. Y en el bloque moderno de `hunt-float-panel` (4066), lo mismo. Los valores por defecto tras `--float-w` y `--float-h` son los que hoy fija el CSS.

Comprueba también el `resize` de la línea 7172: `window.addEventListener('resize', () => requestAnimationFrame(() => applyFloatGeometry(panel, kind)))`. Se queda igual, y ahora funciona mejor, porque el CSS también reacciona por su cuenta.

- [ ] **Paso 6: escribir la prueba estática que falla primero**

Crea `tests/float-geometry-wiring-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- applyFloatGeometry NO puede escribir el tamaño en estilo inline ----------
const bloque = renderer.slice(renderer.indexOf('function applyFloatGeometry('));
const fin = bloque.indexOf('\nfunction ');
const cuerpo = bloque.slice(0, fin < 0 ? bloque.length : fin);

assert.ok(!/style\.width\s*=/.test(cuerpo),
  'applyFloatGeometry sigue escribiendo width en estilo inline, y eso impide que el CSS recorte.');
assert.ok(!/style\.height\s*=/.test(cuerpo),
  'applyFloatGeometry sigue escribiendo height en estilo inline.');
assert.ok(/--float-w/.test(cuerpo), 'applyFloatGeometry tiene que pasar el ancho en --float-w.');
assert.ok(/--float-h/.test(cuerpo), 'applyFloatGeometry tiene que pasar el alto en --float-h.');
assert.ok(/style\.left\s*=/.test(cuerpo), 'La posición la sigue escribiendo el JS, porque tiene que ser absoluta.');
assert.ok(/style\.top\s*=/.test(cuerpo), 'La posición la sigue escribiendo el JS.');

// --- Los dos paneles leen las propiedades personalizadas -----------------------
for (const selector of ['.capture-float-panel', '.hunt-float-panel']) {
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*--float-w`);
  assert.ok(re.test(styles), `${selector} tiene que usar --float-w en su width.`);
}

// --- El botón de restablecer no borra el style entero -------------------------
const reset = renderer.slice(renderer.indexOf('resetButton.addEventListener'));
const finReset = reset.indexOf('});');
assert.ok(!/removeAttribute\('style'\)/.test(reset.slice(0, finReset)),
  'El botón de restablecer borra el style entero, y con él las propiedades personalizadas.');

console.log('Float geometry wiring smoke passed: sin tamaño en inline, CSS con --float-w y --float-h, reset limpio.');
```

- [ ] **Paso 7: ejecutarla y ver que falla**

```
node tests\float-geometry-wiring-smoke.js
```

Se espera `applyFloatGeometry sigue escribiendo width en estilo inline`. **Si pasa antes del paso 3, la prueba está mal.**

- [ ] **Paso 8: ejecutar todo**

```
node tests\float-geometry-smoke.js
node tests\float-geometry-wiring-smoke.js
node scripts\run-tests.cjs node
node scripts\run-tests.cjs electron
```

Los cuatro en verde. El de Electron es el que de verdad comprueba que los paneles se abren: un error de referencia en `readFloatGeometry` no lo ve `node`.

- [ ] **Paso 9: commit**

```
git add src/renderer.js src/styles.css tests/float-geometry-wiring-smoke.js tests/float-geometry-smoke.js
git commit -m "Reajustar los paneles flotantes al redimensionar y dejar que el CSS controle su tamano"
```

---

### Tarea 4: La tipografía, fuera la pila condensada

Hoy los paneles piden `"Arial Narrow", "Bahnschrift Condensed", "Roboto Condensed", "Segoe UI"`. De esas cuatro, dos no existen en un Windows normal: «Roboto Condensed» no viene con el sistema y «Arial Narrow» no está en Windows 11. Lo que se ve casi siempre es Segoe UI metida en una pila que la espera condensada.

**Ficheros:**
- Crear: `tests/panel-typography-smoke.js`
- Modificar: `src/styles.css:3592` y `3818`, y las declaraciones de los tres paneles

**Interfaces:**
- Consume: nada.
- Produce: dos familias declaradas en `:root`: `--tipo-display` y `--tipo-texto`.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/panel-typography-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- La pila condensada desaparece de todo el CSS -----------------------------
for (const fuente of ['Arial Narrow', 'Bahnschrift Condensed', 'Roboto Condensed']) {
  assert.equal(styles.includes(`"${fuente}"`), false,
    `"${fuente}" sigue en el CSS. No existe en Windows 11 y hace que el texto se vea estrecho.`);
}

// --- Las dos familias nuevas están declaradas ---------------------------------
assert.ok(/--tipo-display:\s*"/.test(styles), 'Falta --tipo-display en :root.');
assert.ok(/--tipo-texto:\s*"/.test(styles), 'Falta --tipo-texto en :root.');

// --- Los tres paneles las usan -------------------------------------------------
for (const selector of ['.hunt-float-panel', '.capture-float-panel', '.account-info-card']) {
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*font-family:\\s*var\\(--tipo`);
  assert.ok(re.test(styles), `${selector} tiene que declarar font-family con var(--tipo-...).`);
}

// --- Ningún @font-face: cero ficheros nuevos en el paquete ---------------------
assert.equal(styles.includes('@font-face'), false,
  'Ha aparecido un @font-face, y este proyecto no añade ficheros de fuente.');

// --- Las cifras grandes usan la familia de display ----------------------------
// Es donde se nota: los números de Hunt Analyzer.
const cebra = /(\.(?:capture|hunt)-[a-z-]*(?:value|total|amount|metric)[a-z-]*\s*\{[^}]*font-family:\s*var\(--tipo-display)/;
assert.ok(cebra.test(styles),
  'Las cifras grandes de las métricas tienen que usar --tipo-display, que es donde se gana la presencia.');

console.log('Panel typography smoke passed: sin pila condensada, dos familias, tres paneles, sin ficheros.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\panel-typography-smoke.js
```

Se espera `"Arial Narrow" sigue en el CSS`.

- [ ] **Paso 3: declarar las familias**

En `src/styles.css`, dentro del `:root` que ya existe, añade:

```css
  /* Dos familias y ni un fichero más. "Segoe UI Variable" viene con Windows 11
     y tiene tamaño óptico real: Display para títulos y cifras, Text para el
     resto. En Windows 10 cae a Segoe UI, que es lo que ya se ve hoy.
     Lo que se sustituye es la pila condensada anterior, dos de cuyos miembros
     no existen en Windows 11. */
  --tipo-display: "Segoe UI Variable Display", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  --tipo-texto: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
```

- [ ] **Paso 4: aplicarlas a los tres paneles**

En `src/styles.css:3592` y `3818`, sustituye la pila condensada por `font-family: var(--tipo-texto);`. Revisa además el bloque moderno (3581+ y 3807+) por si repite la pila, y haz lo mismo.

Y en el bloque moderno de Hunt y en el de account-info, pon las cifras grandes con `font-family: var(--tipo-display)`. Concretamente: el valor de cada métrica de Hunt (`.hunt-float-metric-value` o el nombre que tenga), el contador de capturas (`.capture-float-count`), y los valores de las wallets y del progreso en `.account-info`.

Lee los nombres de clase exactos antes de editar. Si alguno no se llama como creo, usa el que haya: lo que no puede pasar es dejar las cifras con `--tipo-texto`.

- [ ] **Paso 5: ejecutarlo todo**

```
node tests\panel-typography-smoke.js
node scripts\run-tests.cjs node
```

En verde.

- [ ] **Paso 6: commit**

```
git add src/styles.css tests/panel-typography-smoke.js
git commit -m "Cambiar la tipografia de los paneles a Segoe UI Variable y quitar la pila condensada rota"
```

---

### Tarea 5: El material de cristal, un solo bloque para los tres paneles

Si el cristal se define en tres sitios, los tres Ends son tres cristales parecidos que divergen en seis meses. Aquí se define una vez.

**Ficheros:**
- Crear: `tests/glass-material-smoke.js`
- Modificar: `src/styles.css`, bloque nuevo antes de `.account-info-card` (1108), y los tres paneles

**Interfaces:**
- Consume: nada.
- Produce: seis propiedades personalizadas en `:root`: `--glass-bg`, `--glass-edge`, `--glass-fill`, `--glass-line`, `--glass-shine`, `--glass-sombra`, y un borde `--glass-radio`.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/glass-material-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- Los siete tokens existen --------------------------------------------------
for (const token of ['--glass-bg', '--glass-edge', '--glass-fill', '--glass-line', '--glass-shine', '--glass-sombra', '--glass-radio']) {
  const re = new RegExp(`${token}:`);
  assert.ok(re.test(styles), `Falta el token ${token} en :root.`);
}

// --- Los tres paneles los usan, y ninguno tiene su propio fondo ---------------
for (const selector of ['.hunt-float-panel', '.capture-float-panel', '.account-info-card']) {
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*var\\(--glass-bg\\)`);
  assert.ok(re.test(styles), `${selector} tiene que usar var(--glass-bg), no un color propio.`);
  const reBorde = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*var\\(--glass-edge\\)`);
  assert.ok(reBorde.test(styles), `${selector} tiene que usar var(--glass-edge).`);
}

// --- El reflejo del borde superior existe y usa el token ---------------------
assert.ok(/\.hunt-float-panel::before\s*\{/.test(styles) || /--glass-shine/.test(styles),
  'Falta el reflejo del borde superior, que es lo que hace que se vea como vidrio.');

// --- backdrop-filter con saturación, no solo blur ----------------------------
// Un blur sin saturación deja el color del juego apagado detrás del cristal.
const backdrop = styles.match(/backdrop-filter:[^;]+/g) || [];
assert.ok(backdrop.some((una) => una.includes('--glass-filtro')) || backdrop.some((una) => /blur\([^)]+\)\s*saturate/.test(una)),
  `Ninguna regla combina blur con saturate. Se han encontrado: ${JSON.stringify(backdrop)}`);

console.log('Glass material smoke passed: siete tokens, tres paneles con el mismo material, reflejo y saturación.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\glass-material-smoke.js
```

Se espera `Falta el token --glass-bg en :root.`

- [ ] **Paso 3: declarar los tokens**

En `src/styles.css`, dentro del `:root`:

```css
  /* El material de los tres paneles en vivo. Uno solo, para que sean el mismo
     cristal por construcción y no tres parecidos que divergen.
     Es translúcido pero NO difumina el juego: un <webview> de Electron se
     dibuja en una capa de composición aparte y backdrop-filter no la alcanza.
     Lo que se ve de verdad es el tono, el reflejo del borde y la profundidad. */
  --glass-bg: linear-gradient(180deg, rgba(58,68,84,.52), rgba(26,32,42,.62) 55%, rgba(18,22,29,.70));
  --glass-edge: rgba(255,255,255,.22);
  --glass-fill: rgba(255,255,255,.10);
  --glass-line: rgba(255,255,255,.08);
  --glass-shine: rgba(255,255,255,.13);
  --glass-sombra: 0 30px 70px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.16), inset 0 -1px 0 rgba(255,255,255,.05);
  --glass-filtro: blur(30px) saturate(1.7) brightness(1.06);
  --glass-radio: 20px;
```

- [ ] **Paso 4: una regla compartida para los tres**

Añade una regla agrupada, una sola vez:

```css
/* El material. Los tres paneles en vivo lo comparten; ninguno define su propio
   fondo. Si mañana se toca el cristal, se toca aquí y una vez. */
.hunt-float-panel,
.capture-float-panel,
.account-info-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-edge);
  border-radius: var(--glass-radio);
  box-shadow: var(--glass-sombra);
  backdrop-filter: var(--glass-filtro);
  -webkit-backdrop-filter: var(--glass-filtro);
}

/* El reflejo: una banda de luz en el borde superior. Es el detalle que hace que
   se lea como vidrio y no como un rectángulo oscuro. */
.hunt-float-panel::before,
.capture-float-panel::before,
.account-info-card::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 44%;
  border-radius: var(--glass-radio) var(--glass-radio) 0 0;
  background: linear-gradient(180deg, var(--glass-shine), transparent);
  pointer-events: none;
}
```

Esta regla tiene que ir **después** de los bloques existentes de los tres paneles, para que gane. Comprueba que los tres tienen `position: relative` o `absolute`; si no, añádelo, porque `::before` con `position: absolute` no se coloca sin un padre posicionado.

- [ ] **Paso 5: vaciar los fondos propios**

Quita el `background` y el `border-color`/`border` propios de `.capture-float-panel` (1286), `.hunt-float-panel` (1138), `.account-info-card` (1108), y de sus bloques modernos (3581+, 3807+, 4066+, 4139+).

**Los colores de acento se quedan.** El verde del dinero y el balance, el ámbar de los suministros, el rojo de eliminar, el azul de la hora: ya significan algo y no se tocan. El cristal es el mismo; los acentos no.

- [ ] **Paso 6: las filas y baldosas, como vidrio apilado**

Sustituye los fondos opacos de las filas por el relleno del cristal:

```css
.capture-flat-row,
.capture-detail-stats .capture-detail-stat,
.hunt-float-metric,
.account-info-metric,
.account-info-progress,
.account-info-membership {
  background: var(--glass-fill);
  border-color: var(--glass-line);
}
```

Lee los nombres reales de las clases antes de editar; la lista de arriba es el orden de magnitud, no el catálogo.

- [ ] **Paso 7: el detalle, más denso que el panel**

`.capture-detail-popover` (1597) lleva su propio material, más denso, para que se lea por encima del panel sin necesitar un borde grueso:

```css
.capture-detail-popover {
  position: static;
  background: linear-gradient(180deg, rgba(66,78,96,.80), rgba(30,37,48,.88));
  border: 1px solid rgba(255,255,255,.30);
  box-shadow: 0 20px 46px rgba(0,0,0,.60), inset 0 1.5px 0 rgba(255,255,255,.22);
  backdrop-filter: blur(40px) saturate(1.9) brightness(1.1);
}
```

El `position: static` es lo que hace posible la Tarea 6. **No lo quites después.**

- [ ] **Paso 8: ejecutarlo todo**

```
node tests\glass-material-smoke.js
node scripts\run-tests.cjs node
node scripts\run-tests.cjs electron
```

En verde. El de Electron importa: si el material tapa algo o rompe un `container-type`, se ve ahí y no en `node`.

- [ ] **Paso 9: commit**

```
git add src/styles.css tests/glass-material-smoke.js
git commit -m "Poner los tres paneles en vivo con el mismo material de cristal iOS"
```

---

### Tarea 6: El detalle se expande en la fila y sobrevive a las capturas nuevas

Hoy `capture-detail-popover` es `position: absolute` y `renderer.js:3716-3724` lo coloca midiendo rectángulos: si no cabe debajo de la fila, salta por encima y tapa las anteriores. Además **se cierra solo**: `renderCaptureLog` (3761-3764) compara una firma y, en cuanto llega una captura nueva, llama a `hideCaptureDetail` y reconstruye la lista.

- [ ] **Paso 1: escribir la prueba que falla**

Crea `tests/capture-detail-expand-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- El popover ya no se posiciona a mano -------------------------------------
const mostrar = renderer.slice(renderer.indexOf('function showCaptureDetail('));
const fin = mostrar.indexOf('\nfunction ');
const cuerpo = mostrar.slice(0, fin < 0 ? mostrar.length : fin);
assert.equal(cuerpo.includes('getBoundingClientRect'), false,
  'showCaptureDetail sigue midiendo rectángulos para colocar el detalle.');
assert.equal(cuerpo.includes('tooltip.style.top'), false,
  'El detalle ya no se coloca a mano: lo coloca el CSS.');
assert.equal(cuerpo.includes('tooltip.style.left'), false,
  'El detalle ya no se coloca a mano.');

// --- Se inserta junto a su fila ------------------------------------------------
assert.ok(/\.after\(/.test(cuerpo) || /insertAdjacentElement/.test(cuerpo),
  'El detalle tiene que insertarse como hermano de su fila.');

// --- Las estadísticas solo se pintan si hay valor -----------------------------
const pintar = renderer.slice(renderer.indexOf('const stats = document.createElement'));
const finPintar = pintar.indexOf('tooltip.append(');
const cuerpoPintar = pintar.slice(0, finPintar < 0 ? pintar.length : finPintar);
assert.ok(/some\(/.test(cuerpoPintar) || /every\(/.test(cuerpoPintar),
  'Antes de pintar las seis casillas hay que comprobar si alguna tiene valor.');
assert.ok(/if \(hayEstad/.test(renderer),
  'Falta la decisión de si se pintan las estadísticas o no.');

// --- El detalle se reabre tras reconstruir la lista ---------------------------
const render = renderer.slice(renderer.indexOf('function renderCaptureLog('));
assert.ok(/captureDetailKey/.test(render),
  'renderCaptureLog tiene que reabrir el detalle que estaba abierto, porque hoy lo cierra.');

// --- Sin posicionamiento absoluto en el CSS -----------------------------------
const popover = styles.slice(styles.indexOf('.capture-detail-popover {'));
const bloquePopover = popover.slice(0, popover.indexOf('}'));
assert.equal(/position:\s*absolute/.test(bloquePopover), false,
  'El popover sigue en absolute, que es lo que hace que se salga de la lista.');

// --- El emoji de Fuerza es un SVG ---------------------------------------------
assert.equal(renderer.includes('💪'), false, 'El emoji de Fuerza sigue ahí.');

console.log('Capture detail expand smoke passed: sin posicionamiento manual, hermano de su fila, estadísticas condicionales y reapertura.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\capture-detail-expand-smoke.js
```

Se espera `showCaptureDetail sigue midiendo rectángulos para colocar el detalle.`

- [ ] **Paso 3: insertar el detalle junto a su fila**

En `renderer.js:3715-3724`, sustituye el bloque de posicionamiento por:

```javascript
  tooltip.hidden = false;
  // El detalle es hermano de su fila, no una caja flotante. El CSS lo coloca y
  // la lista se abre como una Rowland más: nada queda tapado.
  row.after(tooltip);
```

Y en `showCaptureDetail`, antes de eso, quita el `tooltip.remove()` o el `tooltip.dataset.tier` si estorban; el `dataset.tier` se conserva, que es lo que tiñe el borde del color del tier.

Comprueba también `hideCaptureDetail` (3615-3625): sigue haciendo `tooltip.replaceChildren()`, y eso está bien. Lo que hay que añadir es que **el detalle se esconda sin perder su lugar**, y con `row.after()` eso ya no hace falta.

- [ ] **Paso 4: las estadísticas, solo si hay valor**

En `renderer.js:3685-3708`. Antes de crear las seis casillas:

```javascript
  const hayEstadisticas = [
    capture.stats?.hp, capture.stats?.attack, capture.stats?.defense,
    capture.stats?.specialAttack, capture.stats?.specialDefense, capture.stats?.speed
  ].some((value) => value !== null && value !== undefined && value !== '');
```

Y el `tooltip.append` final (3708) pasa a ser condicional:

```javascript
  tooltip.append(head, summary);
  if (hayEstadisticas) {
    tooltip.append(statsTitle, stats);
  }
```

El bloque que crea `stats` y `statsTitle` (3685-3691) se queda donde está, pero solo se **añade** al tooltip si hay valor. Como ya se está en el DOM si el detalle se reutiliza, `replaceChildren` en `hideCaptureDetail` lo limpia para la siguiente.

- [ ] **Paso 5: el emoji de Fuerza**

En `renderer.js:3709-3714`:

```javascript
  if (capture.power) {
    const power = document.createElement('div');
    power.className = 'capture-detail-power';
    power.innerHTML = `${launcherUiIcon('trend')} <span>Fuerza ${escapeHtml(String(capture.power))}</span>`;
    tooltip.appendChild(power);
  }
```

`escapeHtml` porque el número viene del juego. Los iconos SVG llevan `aria-hidden="true"` en `launcherUiIcon`, así que no cambian lo que lee un lector de pantalla.

- [ ] **Paso 6: reabrir el detalle tras reconstruir**

En `renderer.js:3763`, donde hoy está `hideCaptureDetail(panel)`. La idea: guardar la clave, dejar que se reconstruya, y volver a abrir la misma fila si sigue en la lista.

```javascript
  // Antes de tirar la lista, acordarse de qué detalle estaba abierto. Cuando
  // llega una captura nueva la lista se reconstruye entera, y sin esto el
  // detalle se cerraría mientras estás leyendo sus estadísticas.
  const detalleAbierto = panel.captureDetailKey;
  panel.captureLogSignature = signature;
  hideCaptureDetail(panel);
  panel.captureLogList.replaceChildren();
```

Y al final del `visibleRows.forEach` (después de 3780), una vez construidas todas las filas:

```javascript
  if (detalleAbierto) reabrirCaptureDetail(panel, detalleAbierto);
```

Y `reabrirCaptureDetail`, junto a `showCaptureDetail`:

```javascript
function reabrirCaptureDetail(panel, key) {
  const fila = panel.captureLogList.querySelector(`[data-capture-key="${CSS.escape(key)}"]`);
  const captura = key && panel.captureLogSnapshot?.rows?.find((uno) => String(uno.key || uno.id || uno.captureNumber || '') === key);
  if (!fila || !captura) return;
  showCaptureDetail(panel, captura, fila);
}
```

**Comprueba que la fila lleva `data-capture-key`.** Si no lo lleva, añádelo al crearla, en el `visibleRows.forEach`, con la misma expresión que usa `captureDetailKey`. Sin eso esta función no encuentra nada y el detalle no se reabre: es un fallo silencioso, el peor tipo, así que la prueba de abajo lo cubre.

- [ ] **Paso 7: la prueba de Electron del comportamiento**

Añade a `tests/capture-detail-expand-smoke.js`, o crea `tests/capture-detail-electron-smoke.js` si el runner separa las de Electron. Usa el patrón de `tests/account-profile-reader-smoke.js`, que ya trae `loadRendererFunction`. La prueba comprueba tres cosas en una ventana real:

```javascript
// 1. Con dos filas, al abrir el detalle de la segunda, el detalle queda DESPUÉS
//    de la segunda fila en el DOM, no flotando sobre la lista.
assert.ok(fila2.compareDocumentPosition(detalle) & Node.DOCUMENT_POSITION_FOLLOWING,
  'El detalle no ha quedado después de su fila.');

// 2. Al añadir una fila nueva y volver a renderizar, el detalle sigue abierto
//    y apunta a la misma captura.
assert.equal(panel.captureLogTooltip.hidden, false,
  'El detalle se ha cerrado al llegar una captura nueva, y el usuario estaba leyéndolo.');
assert.equal(panel.captureDetailKey, claveOriginal,
  'El detalle se ha reabierto sobre otra captura.');

// 3. Con las estadísticas vacías, el rótulo no está en el DOM.
assert.equal(detalle.querySelector('.capture-detail-stats-title'), null,
  'Con las estadísticas vacías no debería pintarse el rótulo de "no disponibles".');
```

- [ ] **Paso 8: ejecutarlo todo**

```
node tests\capture-detail-expand-smoke.js
node scripts\run-tests.cjs node
node scripts\run-tests.cjs electron
```

En verde. Si el punto 2 falla con `undefined` en `captureDetailKey`, es que `data-capture-key` no está en la fila: vuelve al paso 6.

- [ ] **Paso 9: commit**

```
git add src/renderer.js src/styles.css tests/capture-detail-expand-smoke.js
git commit -m "Expandir el detalle del Pokemon en su fila y no cerrarlo al llegar capturas nuevas"
```

---

### Tarea 7: Renderizar primero, hidratar después

Esta es la medida que más valor tiene, porque **arregla un fallo real**, no un riesgo futuro.

`hydrateHuntDropIcons` (`renderer.js:4462-4474`) recorre los drops con `Promise.all` — en paralelo — y el 4.000 ms de `renderer.js:4651` es un único `withTimeout` sobre la llamada entera. Cuando ese techo se agota, `withTimeout` rechaza, el `catch` de `refreshPanelHuntAnalyzer` (4653) pinta el estado de error, y `renderHuntAnalyzer` **nunca se ejecuta** porque está después del `await` (4652).

Los iconos vienen de URLs externas de objetos del juego. **Una sola URL lenta borra las nueve métricas.**

**Ficheros:**
- Crear: `tests/hunt-icon-hydration-smoke.js`
- Modificar: `src/renderer.js:4462-4474` y `4647-4656`

**Interfaces:**
- Consume: nada.
- Produce: `hidratarIconosHunt(panel, snapshot)` que **nunca rechaza**. Pinta los drops sin icono de inmediato y actualiza la celda cuando el icono llega.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/hunt-icon-hydration-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// --- refreshPanelHuntAnalyzer dibuja ANTES de hidratar ------------------------
const refresco = renderer.slice(renderer.indexOf('async function refreshPanelHuntAnalyzer('));
const fin = refresco.indexOf('\nfunction ');
const cuerpo = refresco.slice(0, fin < 0 ? refresco.length : fin);

const lineaRender = cuerpo.split('\n').findIndex((una) => una.includes('renderHuntAnalyzer'));
const lineaHidrata = cuerpo.split('\n').findIndex((una) => una.includes('hidratarIconosHunt') || una.includes('hydrateHuntDropIcons'));

assert.ok(lineaRender >= 0, 'No encuentro la llamada a renderHuntAnalyzer.');
assert.ok(lineaHidrata >= 0, 'No encuentro la hidratación de iconos.');
assert.ok(lineaRender < lineaHidrata,
  'El panel tiene que dibujarse ANTES de hidratar los iconos. Hoy se hidrata antes, y por eso un icono lento lo deja en error.');
assert.ok(!/await withTimeout\(hydrate/.test(cuerpo),
  'La hidratación no puede ir con await antes de dibujar: si se cuelga, no se dibuja nada.');
assert.ok(!/await .*hydrateHuntDropIcons/.test(cuerpo),
  'La hidratación no puede esperarse.');

// --- La hidratación no puede rejeutar ------------------------------------------
const hidrata = renderer.slice(renderer.indexOf('async function hidratarIconosHunt'));
const finHidrata = hidrata.indexOf('\nfunction ');
const cuerpoHidrata = hidrata.slice(0, finHidrata < 0 ? hidrata.length : finHidrata);
assert.equal(/throw /.test(cuerpoHidrata), false,
  'La hidratación no puede lanzar: si lanza, vuelve a tumbar el panel.');
assert.ok(/catch/.test(cuerpoHidrata),
  'La hidratación tiene que capturar su propio error, si no el que viene de una URL mala sale al catch del refresco.');

console.log('Hunt icon hydration smoke passed: dibuja antes de hidratar, la hidratación no rejeuta.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\hunt-icon-hydration-smoke.js
```

Se espera `El panel tiene que dibujarse ANTES de hidratar los iconos.`

- [ ] **Paso 3: la hidratación que no puede tumbar nada**

Sustituye `hydrateHuntDropIcons` (4462-4474) por:

```javascript
async function hidratarIconosHunt(panel, snapshot) {
  if (!snapshot?.drops?.length || typeof window.pokeGrid?.loadImageDataUrl !== 'function') return;
  const celdas = panel.huntContent.querySelectorAll('[data-drop-icon]');
  const indice = new Map();
  celdas.forEach((celda) => indice.set(String(celda.dataset.dropIndex), celda));

  // Cada icono va por su cuenta y captura su propio fallo. Una URL mala se
  // queda sin icono y el resto del panel sigue vivo, que es justo lo que no
  // pasaba antes: una sola URL lenta tumbaba las nueve métricas.
  snapshot.drops.forEach((drop, posicion) => {
    if (!/^https:\/\//i.test(drop.icon || '')) return;
    let request = huntDropIconCache.get(drop.icon);
    if (!request) {
      request = window.pokeGrid.loadImageDataUrl(drop.icon)
        .catch(() => '')
        .then((dataUrl) => {
          if (dataUrl && indice.get(String(posicion))) indice.get(String(posicion)).src = dataUrl;
          return dataUrl;
        });
      rememberLauncherCache(huntDropIconCache, drop.icon, request, 48);
    }
    request.then((dataUrl) => {
      if (dataUrl) drop.icon = dataUrl;
    }).catch(() => {});
  });
}
```

Fíjate en que **no hay `await` dentro del bucle**: cada icono va por su cuenta, y la función se devuelve enseguida. El `catch(() => '')` del `then` de la petición.ensure que una URL rota no propague.

- [ ] **Paso 4: dibujar antes de hidratar**

`hydrateHuntDropIcons` tiene **tres** puntos de llamada, no uno. Los tres tienen que cambiarse, y el segundo tiene además el mismo bug con otro techo. Revísalos uno a uno:

| Punto de llamada | Qué hay hoy | Qué pasa |
|---|---|---|
| `renderer.js:4651` | `withTimeout(..., 4000, ...)` y `renderHuntAnalyzer` en 4652, **después** | El bug principal |
| `renderer.js:7714` | `withTimeout(..., 3000, ...)` y `renderHuntAnalyzer` en 7717, **también después** | **El mismo bug**, con otro techo |
| `renderer.js:10035` | `await hydrateHuntDropIcons(previewSnapshot)` y `renderHuntAnalyzer` justo después | El camino de previsualización, mismo orden |

En el primero, `refreshPanelHuntAnalyzer` (4647-4656):

```javascript
async function refreshPanelHuntAnalyzer(panel) {
  if (!panel?.huntOpen || panel.huntPreview) return;
  try {
    const snapshot = await withTimeout(panel.webview.executeJavaScript(huntAnalyzerSnapshotScript()), PANEL_READ_TIMEOUT_MS, 'Hunt Analyzer no respondió a tiempo.');
    // Se dibuja primero. Los iconos son una mejora cosmetic: si tardan o
    // fallan, el panel ya está en pantalla con sus datos y solo se pierde el
    // icono. Antes era al revés, y por eso un icono lento lo dejaba entero en
    // error, con las nueve métricas sin pintar.
    renderHuntAnalyzer(panel, snapshot);
    await hidratarIconosHunt(panel, snapshot);
  } catch (error) {
    renderHuntAnalyzer(panel, { ok: false, error: cleanFarmError(error) });
  }
}
```

El `await hidratarIconosHunt` se queda: la función ya no rechaza y se devuelve rápido, así que no hace falta quitarlo. Si en la prueba sale que hay que quitarlo, quítalo.

En el segundo, `renderer.js:7714`, el orden es el mismo de revés: primero `renderHuntAnalyzer`, después hidratar. Y el `withTimeout` de 3.000 ms se quita, porque `hidratarIconosHunt` ya no rechaza.

En el tercero, `renderer.js:10035`, lo mismo: `renderHuntAnalyzer` antes que la hidratación.

**Si dejas uno de los tres como está, la prueba de Electron del paso 6 puede pasar en el camino bueno y fallar en el malo**, según por dónde entre el panel. Los tres tienen que cambiar.

- [ ] **Paso 5: marcar las celdas de icono**

En `renderHuntAnalyzer`, la fila de cada drop necesita `data-drop-index` y una celda con `data-drop-icon`, para que la hidratación sepa a quién parchear. Hoy la celda es la que pinta `drop.icon`. Añade el atributo `data-drop-index="${posicion}"` a la celda del icono, con la posición del drop dentro de `snapshot.drops`.

Esto es un cambio pequeño en el HTML que genera `renderHuntAnalyzer`, y es **de presentación**: ni lee un dato nuevo ni interpreta uno distinto.

- [ ] **Paso 6: la prueba de Electron del fallo real**

Crea `tests/hunt-icon-hydration-electron-smoke.js`, con el patrón de `account-profile-reader-smoke.js`:

```javascript
// Un drop cuyo icono nunca resuelve, con las nueve métricas presentes.
const panel = montarPanelConSnapshot({ metrics: nueveMetricas, drops: [{ name: 'Venom Stone', icon: 'https://ejemplo.example/nunca-resuelve.png' }] });
await refrescoConIconoQueNoTermina(panel);
assert.equal(panel.huntContent.querySelectorAll('.hunt-float-metric').length, 9,
  'Las nueve métricas tienen que estar pintadas aunque un icono no llegue. Una versión razonable las muestra.');
assert.equal(panel.huntState.classList.contains('is-error'), false,
  'Un icono lento no puede dejar el panel en error.');

// Y el caso inverso: una URL que tarda 10 s pero acaba resolviendo.
const panel2 = montarPanelConSnapshot({ metrics: nueveMetricas, drops: [{ name: 'Sticky Hand', icon: urlLenta } });
await refresco(panel2);
assert.equal(panel2.huntContent.querySelectorAll('.hunt-float-metric').length, 9,
  'Las métricas tienen que estar ya pintadas antes de que el icono llegue.');
await esperar(11000);
assert.equal(panel2.huntContent.querySelector('[data-drop-icon]').src.startsWith('data:'), true,
  'Cuando el icono llega, su celda tiene que actualizarse sola.');
```

Los dos casos **tienen que fallar contra el código de hoy**. El primero, porque las métricas no se pintan. El segundo, porque a los 4 segundos el panel ya está en error y no se recupera.

Y hay un **tercer caso que es el que más se cuela**: el mismo fallo por el segundo punto de llamada (`renderer.js:7714`). Monta el panel de esa manera —que es como se lee cuando entra el perfil— y repite la aserción del icono que nunca resuelve. Si solo arreglas el primer punto de llamada, esta aserción sigue fallando.

```javascript
// El mismo icono que nunca resuelve, pero entrando por el segundo camino.
const panel3 = montarPanelPorElSegundoCamino({ metrics: nueveMetricas, drops: [{ name: 'Venom Stone', icon: 'https://ejemplo.example/nunca.png' }] });
await esperar(3500);
assert.equal(panel3.huntContent.querySelectorAll('.hunt-float-metric').length, 9,
  'El segundo punto de llamada sigue hidratar antes de dibujar, así que un icono lento deja el panel vacío.');
```

- [ ] **Paso 7: ejecutarlo todo**

```
node tests\hunt-icon-hydration-smoke.js
node scripts\run-tests.cjs node
node scripts\run-tests.cjs electron
```

En verde.

- [ ] **Paso 8: commit**

```
git add src/renderer.js tests/hunt-icon-hydration-smoke.js tests/hunt-icon-hydration-electron-smoke.js
git commit -m "Dibujar el Hunt Analyzer antes de hidratar iconos para que uno lento no tumbe el panel"
```

---

### Tarea 8: Bajar el sondeo de Hunt y cachear el diálogo

`pollHuntAnalyzers` corre cada 1.500 ms (`renderer.js:10165`) y es el único sondeo por debajo de 3.000: los otros cinco están entre 3.500 y 4.000. Por cada cuenta con el panel abierto inyecta `huntAnalyzerSnapshotScript` (4239-4443, 205 líneas) con 26 apariciones de `querySelector`, una de ellas un `querySelectorAll('*')` sobre el diálogo y otra un `.sort()` que llama a `querySelectorAll('*').length` sobre cada candidato.

Dos cambios: la frecuencia y la caché del diálogo. **Ninguno toca qué se lee.**

**Ficheros:**
- Crear: `tests/hunt-poll-budget-smoke.js`
- Modificar: `src/renderer.js:10165`, y el principio de `huntAnalyzerSnapshotScript` (4239-4280)

**Interfaces:**
- Consume: nada.
- Produce: `const HUNT_SONDEO_MS = 3000;` a nivel de módulo, junto a las constantes de tiempo que ya hay.

- [ ] **Paso 1: escribir la prueba que falla**

`tests/hunt-poll-budget-smoke.js`:

```javascript
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// --- La frecuencia es una constante, y es 3.000 --------------------------------
const lineaSondeo = renderer.split('\n').find((una) => una.includes('setInterval(pollHuntAnalyzers'));
assert.ok(lineaSondeo, 'No encuentro el setInterval de pollHuntAnalyzers.');
assert.ok(lineaSondeo.includes('HUNT_SONDEO_MS'),
  'La frecuencia tiene que ser una constante con nombre, no un número suelto.');

const constante = renderer.split('\n').find((una) => una.match(/const HUNT_SONDEO_MS\s*=\s*\d+/));
assert.ok(constante, 'Falta la constante HUNT_SONDEO_MS.');
assert.equal(Number(constante.match(/=\s*(\d+)/)[1]), 3000,
  'La frecuencia tiene que ser 3000 ms. Hoy es 1500 y es el único sondeo por debajo de 3000.');

// --- Ningún sondeo por debajo de 3.000, para que no vuelva a colarse uno -----
const sondeos = renderer.match(/setInterval\([^,]+,\s*(\d+)\)/g) || [];
const rapidos = sondeos.map((una) => Number(una.match(/,\s*(\d+)\)/)[1])).filter((ms) => ms > 0 && ms < 3000);
assert.deepEqual(rapidos, [1000],
  `Solo updatePanelLiveClocks puede estar por debajo de 3000. Se han encontrado: ${JSON.stringify(rapidos)}`);

// --- El script cachea el diálogo en vez de buscarlo cada vez ----------------
const script = renderer.slice(renderer.indexOf('function huntAnalyzerSnapshotScript'));
const bloque = script.slice(0, 8000);
assert.ok(/__pokeGridHuntDialogo/.test(bloque),
  'El script tiene que guardar el diálogo encontrado en una variable de la webview y reutilizarlo.');
assert.ok(/findDialog\(\)\s*\|\||diálogo/.test(bloque) || /if \(dialogo\)/.test(bloque),
  'Antes de buscar con querySelectorAll, tiene que reusar el diálogo que ya encontró.');
assert.ok(!/const\s+dialogo\s*=\s*findDialog\(\);/.test(bloque),
  'El diálogo se sigue buscando siempre: eso es lo caro, con su querySelectorAll y su sort().');

// --- Pero solo si la webview sigue viva --------------------------------------
assert.ok(/!dialogo\.isConnected/.test(bloque) || /dialogo\.isConnected/.test(bloque),
  'La caché tiene que comprobar que el diálogo sigue en el DOM; si el juego lo replaces, hay que buscarlo otra vez.');
assert.ok(/huntAnalyzerSnapshotScriptLegacy/.test(renderer),
  'El camino legacy de la Tarea 4 tiene que seguir en el repo hasta que se compruebe.');

console.log('Hunt poll budget smoke passed: 3000 ms, sin sondeos rápidos nuevos, diálogo cacheado con comprobación de conexión.');
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\hunt-poll-budget-smoke.js
```

Se espera `Falta la constante HUNT_SONDEO_MS.`

- [ ] **Paso 3: la constante y el `setInterval`**

Junto a las constantes de tiempo que ya hay arriba del todo, añade:

```javascript
// Antes 1500. Es el único sondeo por debajo de 3000, y con ocho cuentas abierta
// son ocho scripts de 205 líneas cada 1500 ms. En un panel que se lee mirando,
// nadie nota 300 ms.
const HUNT_SONDEO_MS = 3000;
```

Y en la línea 10165:

```javascript
window.setInterval(pollHuntAnalyzers, HUNT_SONDEO_MS);
```

- [ ] **Paso 4: cachear el diálogo**

En `huntAnalyzerSnapshotScript`, el principio (4239-4280). Hoy empieza con:

```javascript
const findDialog = () => {
  return [...document.querySelectorAll(...)].sort(...)[0] || ...
};
let dialog = findDialog();
```

Cámbialo por:

```javascript
// El diálogo se busca una vez y se guarda en la propia webview. Volver a
// buscarlo cada vuelta era lo más caro de este script: un querySelectorAll
// sobre todos los candidatos y un sort() que llama a querySelectorAll('*').length
// sobre cada uno. Si el juego lo reemplaza, isConnected lo detecta y se busca
// otra vez.
let dialogo = window.__pokeGridHuntDialogo;
if (dialogo && !dialogo.isConnected) dialogo = null;
if (!dialogo) {
  dialogo = findDialog();
  if (dialogo) window.__pokeGridHuntDialogo = dialogo;
}
let dialog = dialogo;
```

Todo lo demás del script se queda igual. **No se toca qué se lee**: es la misma búsqueda, ejecutada una vez en vez de en cada vuelta.

- [ ] **Paso 5: comprobar que el dialogueo se guarda con la referencia viva**

El `findDialog` actual ya devuelve un elemento del DOM, así que `isConnected` sirve. Pero comprueba que **el elemento que se esconde y se lee es el mismo que se guarda**. Si el script sustituye `dialog` por otro elemento más adelante, la caché no sirve y hay que guardar ese. Lee el bloque completo antes de dar esto por bueno.

- [ ] **Paso 6: el perfil de coste, como prueba**

Añade a `tests/hunt-poll-budget-smoke.js` un conteo real, no una estimación:

```javascript
// El perfil: cuántas veces se llama al script por segundo con 1, 4 y 8 cuentas.
const llamadasPorSegundo = (cuentas, intervalo) => Math.round((cuentas * 1000) / intervalo);
assert.equal(llamadasPorSegundo(1, 1500), 1, 'Control: una cuenta cada 1500 ms.');
assert.equal(llamadasPorSegundo(1, HUNT), 0, 'Una cuenta a 3000 ms da menos de una llamada por segundo.');
assert.equal(llamadasPorSegundo(8, 1500), 5, 'Control: ocho cuentas cada 1500 ms.');
assert.equal(llamadasPorSegundo(8, HUNT), 3, 'Ocho cuentas a 3000 ms.');
assert.ok(llamadasPorSegundo(8, HUNT) * 2 <= llamadasPorSegundo(8, 1500),
  'Con ocho cuentas, la carga por segundo tiene que bajar a la mitad o menos.');
```

**El control es lo importante.** Las aserciones con `1500` a la izquierda son el valor viejo, y si el número cambia sin querer, la comparación de la mitad no significaría nada. Es la comprobación floja que este repo ya ha pagado.

- [ ] **Paso 7: ejecutarlo todo**

```
node tests\hunt-poll-budget-smoke.js
node scripts\run-tests.cjs node
node scripts\run-tests.cjs electron
```

En verde. Si la prueba de la lista de sondeos rápidos falla, mira cuál se coló: `updatePanelLiveClocks` a 1.000 es el único permitido.

- [ ] **Paso 8: commit**

```
git add src/renderer.js tests/hunt-poll-budget-smoke.js
git commit -m "Bajar el sondeo de Hunt Analyzer a 3000 ms y cachear el dialogo por webview"
```

---

### Tarea 9: La prueba de integración de los tres paneles y la ZIP

Cada tarea se probó sola. Esto es lo que comprueba que **P1, P2, P3 y P4 conviven**, porque los cuatro tocan `renderer.js`.

**Ficheros:**
- Crear: `tests/three-panels-integration-smoke.js`
- Modificar: `package.json` (subir a 0.23.9)

**Interfaces:**
- Consume: todo lo anterior.
- Produce: una prueba de Electron que abre y cierra los tres paneles en una cuenta, y el ZIP de 0.23.9.

- [ ] **Paso 1: escribir la prueba de integración**

`tests/three-panels-integration-smoke.js`, con el patrón de `account-profile-reader-smoke.js` (`app`, `BrowserWindow`, `show: false`):

```javascript
// Monta un panel con los tres paneles de P4 abiertos a la vez.
const panel = montarPanel({ cuentas: 1 });

// 1. Los tres se abren.
panel.setCaptureLogOpen(true);
panel.setHuntAnalyzerOpen(true);
panel.setAccountInfoOpen(true);
await settled(panel);
assert.equal(panel.captureLogPanel.hidden, false, 'Capture Log no se abre.');
assert.equal(panel.huntPanel.hidden, false, 'Hunt Analyzer no se abre.');
assert.equal(panel.accountInfoPanel.hidden, false, 'Datos de la cuenta no se abre.');

// 2. Los tres tienen el material de cristal, no un fondo propio.
for (const [nombre, el] of [['capture', panel.captureLogPanel], ['hunt', panel.huntPanel], ['datos', panel.accountInfoPanel]]) {
  const fondo = getComputedStyle(el).backgroundImage;
  assert.ok(fondo.includes('gradient'), `El panel ${nombre} no tiene el gradiente de cristal.`);
  assert.ok(getComputedStyle(el).backdropFilter.includes('blur'), `El panel ${nombre} no tiene el desenfoque de cristal.`);
}

// 3. Maximizar la ventana: los tres crecen y ninguno se sale de su cuenta.
const antes = [panel.captureLogPanel, panel.huntPanel].map((el) => el.getBoundingClientRect().width);
await redimensionarVentana(1400, 1100);
await settled(panel);
for (const [indice, el] of [panel.captureLogPanel, panel.huntPanel].entries()) {
  const caja = el.getBoundingClientRect();
  assert.ok(caja.width >= antes[indice] - 1, `El panel ${indice} se ha encogido al maximizar.`);
  assert.ok(caja.left >= 0 && caja.right <= 1400 + 1, `El panel ${indice} se sale por el lado al maximizar.`);
}

// 4. Estrechar por debajo del suelo: entero, más pequeño, no recortado.
await redimensionarVentana(260, 420);
await settled(panel);
for (const el of [panel.captureLogPanel, panel.huntPanel]) {
  const caja = el.getBoundingClientRect();
  assert.ok(caja.left >= -1 && caja.right <= 261, 'El panel se sale de una cuenta tan estrecha.');
  assert.ok(caja.top >= -1 && caja.bottom <= 421, 'El panel se sale por abajo en una cuenta tan estrecha.');
}

// 5. Cerrar los tres y comprobar que no queda ninguno colgado.
panel.setCaptureLogOpen(false);
panel.setHuntAnalyzerOpen(false);
panel.setAccountInfoOpen(false);
await settled(panel);
assert.equal(panel.captureLogPanel.hidden, true, 'Capture Log no se cierra.');
assert.equal(panel.huntPanel.hidden, true, 'Hunt Analyzer no se cierra.');
assert.equal(panel.accountInfoPanel.hidden, true, 'Datos de la cuenta no se cierra.');

// 6. Y con cuatro cuentas a la vez, para el caso que te preocupaba.
const muchos = montarPanel({ cuentas: 4 });
for (const p of muchos) { p.setCaptureLogOpen(true); p.setHuntAnalyzerOpen(true); }
await settled(muchos);
assert.equal(muchos.filter((p) => p.huntPanel.hidden === false).length, 4,
  'Los cuatro Hunt Analyzer tienen que estar abiertos.');
```

- [ ] **Paso 2: ejecutarla antes de tocar nada más**

```
node tests\three-panels-integration-smoke.js
```

Los puntos 1 y 5 tienen que pasar ya. **Los puntos 2, 3 y 4 tienen que fallar**, porque el material y el arreglo de geometría son de las tareas anteriores. Si pasan, algo se ha quedado sin hacer y hay que volver a él antes de seguir.

- [ ] **Paso 3: subir la versión**

En `package.json`, `"version": "0.23.9"`. Es un cambio de diseño y de coste por segundo que se nota, y por eso es menor y no parche.

- [ ] **Paso 4: compilar**

`electron-builder` llama a `pnpm config list` y **pnpm no está en el PATH**. Instálalo solo en ese proceso:

```
$env:PATH = "$env:TEMP\opencode\pnpm-shim;$env:PATH"
pnpm install
pnpm run build -- --win portable
```

Si `pnpm-shim` ya no existe, hay que rehacerlo. **Comprueba que existe antes de compilar**, o la compilación falla con un error que no menciona pnpm.

- [ ] **Paso 5: verificar el ZIP como se hizo con P3**

Extrae el ZIP a una carpeta limpia y comprueba, uno a uno y midiendo el hash de cada fichero:

- que el paquete arranca,
- que los tres paneles se abren en una cuenta,
- que el material de cristal se ve (el `backdrop-filter` está en el CSS empaquetado),
- que la tipografía es la nueva (`Segoe UI Variable` en el CSS, y **cero** `@font-face`),
- que los nueve botones llevan SVG.

Los doce puntos de la verificación de P3, más los cinco de arriba. **`dist\` está en `.gitignore`, así que nada de esto se commitea.**

- [ ] **Paso 6: el SHA-256 y elledger**

```
(Get-FileHash dist-0239\IDLE-POKE-LAUNCHER-0.23.9-portatil.zip -Algorithm SHA256).Hash.ToLower()
```

Anota el hash en el ledger de P4, junto a la lista de tareas y su estado.

- [ ] **Paso 7: la revisión antes de darlo por bueno**

Este es el punto que más hadolpeado en P3 y en la publicadora: **cinco comprobaciones flojas las encontró la revisión, ninguna yo.** Pasa el plan por un revisor fresco con esta pregunta, y solo con esta:

> ¿Hay aquí alguna comprobación que **pase con lo que debería fallar**?

Y una segunda, sobre lo que este proyecto **no** arregla:

> ¿Hay alguna afirmación en un commit de este proyecto que diga que el acoplamiento con el DOM del juego está arreglado, cuando la spec dice explícitamente que no?

- [ ] **Step 8: commit**

```
git add tests/three-panels-integration-smoke.js package.json
git commit -m "Probar los tres paneles a la vez y subir a 0.23.9"
```

- [ ] **Paso 9: la ZIP, para que la pruebes**

Deja el ZIP en `dist-0239` y **no publiques nada**. Ni `git push` ni `git tag`.

Dile al usuario el nombre del fichero, el tamaño y el SHA-256, y que el launcher que pruebe ya lleva P1, P2, P3 y P4 dentro. Lo único que no va incluido es la publicadora, que es otro repositorio (`PokeGrid-Script-Shop`, en `a42583e`, sin publicar) y no forma parte del launcher.

---

## Lo que este plan NO arregla

Escrito aquí para que no se lea al revés en seis meses.

**El acoplamiento frágil con el DOM y el texto del juego sigue entero.**

Hunt Analyzer no tiene API: el launcher abre el panel del juego, lo esconde y lee las tarjetas buscando etiquetas por texto. `findLabel` busca un texto; si el juego renombra «Sesiones» por «Partidas», devuelve la tarjeta equivocada y **enseña un número que no es el de esa métrica**. No falla: miente.

Capture Log tiene un problema gemelo: la respuesta de la API se interpreta puntuando objetos, buscando claves como `pokemonname` o `tier`. Si el juego renombra un campo, deja de detectarlo y devuelve menos filas **sin error**.

Ese es el peor modo de fallo que tiene este código. Este plan no lo toca, y la Tarea 7 es lo más cerca que se llega — pero a los iconos, no a los datos.