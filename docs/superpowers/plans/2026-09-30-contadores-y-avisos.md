# Contadores y avisos del launcher — Plan de implementación

> **Para trabajadores agénticos:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendada) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** que el launcher avise de las tres cosas que hoy no avisa —scripts por actualizar, notificaciones sin leer y versión nueva del launcher— con una bolita de color por origen en el botón de 3 rayas, y que cada contador tenga el color de su origen.

**Arquitectura:** un registro de avisos nuevo (`src/notification-hub.js`) cargado como `<script>` antes de los otros dos módulos, que es el dueño de todos los badges de sus fuentes. Las tres fuentes publican su recuento con `set(id, count)`; el hub reparte a la bolita del menú y al badge del botón. Para las actualizaciones se añade un canal IPC **de solo lectura** (`app:peek-update`), porque el `app:check-update` existente no comprueba: instala y cierra el launcher.

**Stack técnico:** Electron 43.1.1, JavaScript CommonJS plano en el proceso principal y scripts planos en el renderer. Sin bundler. Sin dependencias nuevas.

**Especificación:** `docs/superpowers/specs/2026-09-30-contadores-y-avisos-design.md`

## Restricciones globales

Aplican a todas las tareas. Cada tarea las cumple implícitamente.

- **Cero dependencias nuevas.** Ni `dependencies` ni `devDependencies`. Ni una.
- **Spanish** en textos visibles, mensajes y comentarios, **con tildes**. Identificadores en inglés.
- **Windows.** Rutas siempre con `path.join`. Nunca concatenadas a mano.
- **Escrituras atómicas** en disco: `.tmp` + `fs.renameSync`.
- **No se pierde funcionalidad.** Nada que hoy se vea o se pueda hacer desaparece.
- **No tocar `src/game-theme.js`.** Está excluido del Plan 1 entero, pertenece al Plan 5.
- **No usar `git add -A`.** En el árbol hay ficheros ajenos (`CONTEXTO-PROYECTO.md`, `.superpowers/`) y un plan modificado sin stagear.
- **Rutas de `src/` con finales de línea LF en el repositorio y `core.autocrlf=true`.** Al revertir un sabotaje con `git checkout`, git reescribe a CRLF y el hash cambia aunque el contenido sea idéntico. **Antes de revertir, comprobar con `git cat-file blob HEAD:<fichero>` cuál es la forma canónica y restituírla byte a byte.** Al commitear, comprobar con `git hash-object` que el blob es el que se quería.

### Excepción declarada: `src/updater.js`

El Plan 1 prohíbe tocar `src/updater.js` porque pertenece al **Plan 4 (reescritura del actualizador)**. La Tarea 3 **sí lo toca**, y solo para añadir `peekLatestVersion`, una función pura que:

- no comparte estado con el flujo de actualización,
- no llama a `prepareUpdate` ni a `launchPreparedUpdate`,
- no se puede eliminar sin quitar el sondeo en segundo plano.

**Condición para que el Plan 4 lo arrastre:** `peekLatestVersion` debe quedar exportada en el `module.exports` de `updater.js` (línea ~615) y anotada en la especificación del Plan 4. Si se pierde al reescribir el actualizador, el sondeo deja de funcionar en silencio.

### Conflictos de reglas que hay que saber

| Regla del Plan 1 | Qué pasa aquí |
|---|---|
| `REQUIRED_SCRIPT_ELEMENTS` (`userscripts.js:42-44`) solo lista ids que necesita el módulo de scripts | La Tarea 2 **sí** añade los ids nuevos de los badges, porque sin ellos el módulo no puede pintarlos, y esa lista es la que avisa de un id olvidado |
| Ninguna tarea toca `src/updater.js` | Excepción declarada arriba, con condición de arrastre |

## Foco de revisión

Las cinco clases de entrada o fallo que la especificación insinúa pero que ninguna prueba cubre hoy, y que son las que más probablemente muerdan a alguien usando el launcher. Cada una tiene su prueba en la tarea indicada.

1. **Sin red al arrancar.** El launcher se abre sin conexión, el sondeo falla y **la bolita de versión nueva debe seguir ahí**, no apagarse. (Tarea 4)
2. **Release publicada sin assets.** Una release con tag pero sin ZIP ni `.sha256` no es "no hay versión nueva": es un error de publicación. El sondeo no debe tragarse ese error y reportar que estás al día. (Tarea 3)
3. **Dos fuentes con el mismo color.** Nada en runtime lo detecta; solo una prueba que compare los tres tokens de `AVISOS`. Sin ella, el requisito entero de "colores distintos" se pierde en un refactor. (Tarea 1)
4. **Más de 99 elementos pendientes.** Las bolitas no llevan número, pero los badges de botón sí, y hoy muestran `99+`. Hay que fijar qué se ve con 200 scripts nuevos y que no se rompa el ancho del badge. (Tarea 1)
5. **Contadores que se pisan entre sí.** Hoy tres badges comparten un número escrito en un solo sitio, lo que hace que "se pisen" sea casi imposible. Al separarlos, un error podría limpiar el recuento equivocado y apagar un aviso que sí existe. (Tarea 2)

---

### Tarea 1: El registro de avisos y las bolitas del menú

**Ficheros:**
- Crear: `src/notification-hub.js`
- Modificar: `src/index.html:665-667` (carga del script) y `:13-16` (el botón de 3 rayas)
- Modificar: `src/styles.css` (al final)
- Prueba: `tests/notification-hub-smoke.js` (nueva, Electron)
- Prueba: `tests/notification-hub-static-smoke.js` (nueva, Node)

**Interfaces:**
- Consume: nada de tareas anteriores.
- Produce: `window.pokeGridNotifications` con `set(id, count)`, `get(id)`, `seen(id)`, `limpiar(id)`, `dibujar()`, `alCambiar(fn)` y `fuentes`. Los ids válidos son exactamente `'scripts'`, `'notifications'` y `'updater'`. También produce `window.POKEGRID_AVISOS` y `window.__pokeGridBadgeLegacy(element, total, title)`. La Tarea 2 y la Tarea 3 publican aquí.

- [ ] **Paso 1: Escribir la prueba estática que falla**

Crear `tests/notification-hub-static-smoke.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fuente = fs.readFileSync(path.join(__dirname, '..', 'src', 'notification-hub.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

// Las tres fuentes, cada una con su color. Este requisito entero se pierde en un
// refactor si nadie lo mira, porque en runtime dos colores iguales no fallan nada.
for (const [id, color] of [['scripts', 'var(--warning)'], ['notifications', 'var(--danger)'], ['updater', 'var(--success)']]) {
  assert.ok(fuente.includes(`id: '${id}'`), `Falta la fuente '${id}' en el registro.`);
  assert.ok(fuente.includes(color), `La fuente '${id}' no usa ${color}.`);
}

const colores = fuente.match(/var\(--(warning|danger|success)\)/g) || [];
assert.equal(new Set(colores).size, 3,
  `Las tres fuentes tienen que usar tres colores distintos. Hay ${colores.length} apariciones y ${new Set(colores).size} distintos.`);

// Las tres bolitas existen siempre en el DOM, en orden fijo.
const bolitas = html.match(/id="hamburgerAvisoDot(?:Shop|Notas|Actualizador)"/g) || [];
assert.equal(bolitas.length, 3, `Se esperaban 3 bolitas en el botón del menú, hay ${bolitas.length}.`);
assert.deepEqual(bolitas, [
  'id="hamburgerAvisoDotShop"',
  'id="hamburgerAvisoDotNotas"',
  'id="hamburgerAvisoDotActualizador"'
], 'Las bolitas tienen que estar en orden fijo: shop, notificaciones, actualizador.');

// El hub se carga antes que los dos módulos que van a publicar en el.
const orden = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const hub = orden.indexOf('notification-hub.js');
assert.ok(hub > -1, 'No se carga notification-hub.js.');
assert.ok(hub < orden.indexOf('userscripts.js') && hub < orden.indexOf('renderer.js'),
  `notification-hub.js tiene que cargarse antes que los dos módulos. Orden actual: ${orden.join(', ')}`);

console.log('Notification hub static smoke passed: 3 fuentes, 3 colores, 3 bolitas en orden.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\notification-hub-static-smoke.js`
Expected: FAIL con `ENOENT` al leer `src/notification-hub.js`.

- [ ] **Paso 3: Escribir el módulo del registro**

Crear `src/notification-hub.js`:

```js
'use strict';

// Registro central de avisos del launcher.
//
// Vivir en un fichero propio, y no dentro de renderer.js, es deliberado:
// userscripts.js y renderer.js son IIFE distintas sin ámbito compartido, y el
// hub tiene que ser accesible para las dos. Se carga antes que ellas.
//
// El hub es el dueño de todos los badges de sus fuentes, incluida la bolita del
// botón de 3 rayas. Antes el mismo número de la Shop se escribía a mano en tres
// sitios distintos; añadir dos fuentes más así habría sido escribirlo cinco veces.

const AVISOS = Object.freeze([
  Object.freeze({ id: 'scripts', color: 'var(--warning)', titulo: 'Shop de scripts', dotId: 'hamburgerAvisoDotShop', badgeId: 'scriptsMenuBadge' }),
  Object.freeze({ id: 'notifications', color: 'var(--danger)', titulo: 'Notificaciones', dotId: 'hamburgerAvisoDotNotas', badgeId: 'notificationBadge' }),
  Object.freeze({ id: 'updater', color: 'var(--success)', titulo: 'Actualizaciones del launcher', dotId: 'hamburgerAvisoDotActualizador', badgeId: 'updateLauncherBadge' })
]);

// La actualización del launcher no se apaga al mirar: sigue pendiente hasta que se
// instala de verdad. Si se apagara al visitarla, el usuario podría perder la única
// vez que ve que tiene algo pendiente.
const PENDIENTE_SIEMPRE = Object.freeze(['updater']);

const estado = new Map(AVISOS.map((aviso) => [aviso.id, Object.assign({}, aviso, { count: 0, visto: false })]));
const suscriptores = new Set();

function textoContador(count) {
  return count > 99 ? '99+' : String(count);
}

function pintarUno(aviso) {
  const pendiente = aviso.count > 0 && (!aviso.visto || PENDIENTE_SIEMPRE.includes(aviso.id));
  const texto = `${aviso.titulo}: ${aviso.count} pendiente${aviso.count === 1 ? '' : 's'}`;
  const dot = document.getElementById(aviso.dotId);
  if (dot) {
    dot.hidden = !pendiente;
    dot.style.background = aviso.color;
    dot.title = texto;
  }
  const badge = document.getElementById(aviso.badgeId);
  if (badge) {
    badge.textContent = textoContador(aviso.count);
    badge.hidden = aviso.count === 0;
    badge.style.background = aviso.color;
    badge.style.color = '#17140a';
    badge.title = texto;
    badge.setAttribute('aria-label', texto);
  }
}

function dibujar() {
  for (const aviso of estado.values()) pintarUno(aviso);
  for (const fn of suscriptores) {
    try {
      fn();
    } catch (error) {
      console.error(`[PokeGrid] Un suscriptor de avisos falló: ${error.message}`);
    }
  }
}

const pokeGridNotifications = Object.freeze({
  fuentes: AVISOS,
  set(id, count) {
    const aviso = estado.get(String(id || ''));
    if (!aviso) {
      console.error(`[PokeGrid] Fuente de aviso desconocida: ${id}`);
      return 0;
    }
    const total = Math.max(0, Number(count) || 0);
    aviso.count = total;
    // Un recuento que baja a cero se da por visto: si no hay nada pendiente, no
    // tiene sentido seguir marcando que no se ha mirado.
    if (total === 0) aviso.visto = true;
    dibujar();
    return total;
  },
  get(id) {
    const aviso = estado.get(String(id || ''));
    return aviso ? Object.assign({}, aviso) : null;
  },
  seen(id) {
    const aviso = estado.get(String(id || ''));
    if (!aviso || PENDIENTE_SIEMPRE.includes(aviso.id)) {
      // Una fuente que queda pendiente siempre no se marca como vista, ni aunque
      // se llame a seen(). Es a propósito y la prueba lo fija.
      return false;
    }
    aviso.visto = true;
    dibujar();
    return true;
  },
  limpiar(id) {
    const aviso = estado.get(String(id || ''));
    if (!aviso) return 0;
    const total = aviso.count;
    aviso.count = 0;
    aviso.visto = true;
    dibujar();
    return total;
  },
  dibujar,
  alCambiar(fn) {
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }
});

window.POKEGRID_AVISOS = AVISOS;
window.pokeGridNotifications = pokeGridNotifications;

// El badge de la Shop deja de escribirse a mano: pasa a hablar con el hub, que es
// quien lo pinta. Sin esto seguiríamos con tres copias del mismo número en tres
// sitios, y es justo lo que este módulo viene a quitar.
window.__pokeGridBadgeLegacy = function badgeLegacy(element, total, title) {
  if (!element) return;
  element.textContent = textoContador(total);
  element.hidden = total === 0;
  element.title = title;
  element.setAttribute('aria-label', title);
};
```

- [ ] **Paso 4: Añadir las tres bolitas al HTML**

En `src/index.html:13-16`, sustituir el badge del botón por las tres bolitas:

```html
      <button id="topbarToggle" class="topbar-toggle" type="button" aria-expanded="false" aria-controls="globalActions" aria-label="Abrir men&uacute; del launcher" title="Abrir men&uacute; del launcher">
        <span class="hamburger-icon" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="hamburger-avises" aria-hidden="true">
          <i id="hamburgerAvisoDotShop" class="hamburger-aviso-dot" hidden></i>
          <i id="hamburgerAvisoDotNotas" class="hamburger-aviso-dot" hidden></i>
          <i id="hamburgerAvisoDotActualizador" class="hamburger-aviso-dot" hidden></i>
        </span>
      </button>
```

Y en `src/index.html:665-667`, cargar el hub antes de los otros:

```html
    <script src="game-theme.js"></script>
    <script src="notification-hub.js"></script>
    <script src="userscripts.js"></script>
    <script src="renderer.js"></script>
```

- [ ] **Paso 5: Estilos de las bolitas**

Añadir al final de `src/styles.css`:

```css
/* Bolitas de aviso del botón de 3 rayas. Una por fuente, en orden fijo. No
   llevan número a propósito: un 3 no dice qué hay pendiente, el color sí. El color
   lo pone el hub en línea, así que aquí solo va la forma. */
.hamburger-avises {
  position: absolute;
  top: -4px;
  right: -5px;
  display: flex;
  gap: 3px;
  pointer-events: none;
  z-index: 3;
}

.hamburger-aviso-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 2px solid #111820;
  background: transparent;
}

.hamburger-aviso-dot[hidden] { display: none; }
```

- [ ] **Paso 6: Escribir la prueba de Electron que falla**

Crear `tests/notification-hub-smoke.js`:

```js
const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-avises-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

const estadoDe = (window) => window.webContents.executeJavaScript(`(() => {
  const leer = (id) => {
    const nodo = document.getElementById(id);
    return { oculto: nodo.hidden, color: nodo.style.background, titulo: nodo.title };
  };
  return {
    shop: leer('hamburgerAvisoDotShop'),
    notas: leer('hamburgerAvisoDotNotas'),
    actualizador: leer('hamburgerAvisoDotActualizador'),
    hayHub: typeof window.pokeGridNotifications === 'object'
  };
})()`);

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
    await waitFor(ventana, 'window.pokeGridNotifications');

    const inicial = await estadoDe(ventana);
    assert.equal(inicial.hayHub, true, 'El registro tiene que estar expuesto.');
    assert.equal(inicial.shop.oculto, true, 'Sin recuentos ninguna bolita se ve.');
    assert.equal(inicial.notas.oculto, true, 'Sin recuentos ninguna bolita se ve.');
    assert.equal(inicial.actualizador.oculto, true, 'Sin recuentos ninguna bolita se ve.');

    // Cada fuente pinta con su color, y solo se ve si tiene algo pendiente.
    await ventana.webContents.executeJavaScript(`(() => {
      window.pokeGridNotifications.set('scripts', 3);
      window.pokeGridNotifications.set('notifications', 1);
      return true;
    })()`);
    await wait(150);
    const dos = await estadoDe(ventana);
    assert.equal(dos.shop.oculto, false, 'Con 3 scripts pendientes la bolita se ve.');
    assert.equal(dos.shop.color, 'var(--warning)', `La bolita de la Shop usa su color, no ${dos.shop.color}.`);
    assert.ok(/3 pendientes/.test(dos.shop.titulo), `El título dice cuántos, no "${dos.shop.titulo}".`);
    assert.equal(dos.notas.oculto, false, 'Con 1 notificación pendiente la bolita se ve.');
    assert.equal(dos.notas.color, 'var(--danger)', `La bolita de notificaciones usa su color, no ${dos.notas.color}.`);
    assert.equal(dos.actualizador.oculto, true, 'La bolita del actualizador sigue oculta.');

    // Verla apaga la de contenido.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.seen('scripts'); return true; })()`);
    await wait(150);
    const trasVer = await estadoDe(ventana);
    assert.equal(trasVer.shop.oculto, true, 'Ver las pendientes apaga la bolita de contenido.');

    // ...pero la del actualizador no se apaga nunca al mirar.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.set('updater', 1); return true; })()`);
    await wait(150);
    const conActualizador = await estadoDe(ventana);
    assert.equal(conActualizador.actualizador.oculto, false, 'Con versión nueva la bolita se ve.');
    assert.equal(conActualizador.actualizador.color, 'var(--success)', `La del actualizador usa su color, no ${conActualizador.actualizador.color}.`);

    const visto = await ventana.webContents.executeJavaScript(`(() => window.pokeGridNotifications.seen('updater'))()`);
    assert.equal(visto, false, 'seen() sobre el actualizador tiene que ser un no-op.');
    await wait(150);
    const trasMirar = await estadoDe(ventana);
    assert.equal(trasMirar.actualizador.oculto, false, 'Mirar la versión nueva NO puede apagar su bolita.');

    // Limpiar sí la apaga: esa es la vía que usa la instalación terminada.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.limpiar('updater'); return true; })()`);
    await wait(150);
    const trasInstalar = await estadoDe(ventana);
    assert.equal(trasInstalar.actualizador.oculto, true, 'Solo al instalar se apaga la del actualizador.');

    // Más de 99: el badge dice 99+, no el número entero.
    const muchos = await ventana.webContents.executeJavaScript(`(() => {
      window.pokeGridNotifications.set('scripts', 150);
      return document.getElementById('scriptsMenuBadge').textContent;
    })()`);
    assert.equal(muchos, '99+', `Con 150 pendientes el badge debe decir 99+, dice "${muchos}".`);

    // Una fuente que no existe avisa en vez de romper.
    const error = await ventana.webContents.executeJavaScript(`(() => {
      const avisos = [];
      const original = console.error;
      console.error = (mensaje) => { avisos.push(String(mensaje)); };
      window.pokeGridNotifications.set('no-existe', 2);
      console.error = original;
      return avisos.join(' ');
    })()`);
    assert.ok(/Fuente de aviso desconocida/.test(error),
      `Una fuente desconocida tiene que avisar, no romperse. Mensaje: "${error}"`);

    console.log(JSON.stringify({ ok: true, inicial, dos, trasVer, trasInstalar, muchos }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});
```

- [ ] **Paso 7: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\notification-hub-smoke.js`
Expected: PASS con `{"ok":true,...}`

Run: `node tests\notification-hub-static-smoke.js`
Expected: PASS con `Notification hub static smoke passed: 3 fuentes, 3 colores, 3 bolitas en orden.`

- [ ] **Paso 8: Sabotear para comprobar que las aserciones muerden**

Con las pruebas en verde, sabotagea **cada** cosa y comprueba que la aserción correspondiente falla. Pega los cuatro rojos:

1. Pon el color de `scripts` igual al de `notifications` → la prueba estática tiene que fallar con `3 colores distintos`.
2. Quita `limpiar()` del módulo → falla `Solo al instalar se apaga la del actualizador`.
3. Quita `'updater'` de `PENDIENTE_SIEMPRE` → falla `seen() sobre el actualizador tiene que ser un no-op`.
4. Cambia `count > 99` por `count > 999` en `textoContador` → falla la aserción de `99+`.

**Restaura el código después de cada sabotaje y verifica con `git hash-object src/notification-hub.js` que el fichero quedó byte a byte como estaba.** Si un sabotaje se queda en el árbol, el commit publicará lo contrario de lo que diga el informe.

- [ ] **Paso 9: Commit**

```bash
git add src/notification-hub.js src/index.html src/styles.css tests/notification-hub-smoke.js tests/notification-hub-static-smoke.js
git commit -m "Anadir el registro de avisos y las bolitas del boton de menu"
```

---

### Tarea 2: Que las fuentes publiquen su recuento al registro

**Ficheros:**
- Modificar: `src/userscripts.js` (`setMenuBadge` en `:577-583`, `updateScriptShopBadge` en `:596-607`, y las dos escrituras a mano de `#scriptShopUpdateBadge` en `:602-603`)
- Modificar: `src/userscripts.js:36-52` (`REQUIRED_SCRIPT_ELEMENTS`)
- Modificar: `src/renderer.js:1391-1396` (`renderNotifications`)
- Modificar: `src/styles.css:442-460` (colores de `.menu-update-badge`)
- Prueba: extender `tests/script-shop-smoke.js` y `tests/multi-game-userscripts-static-smoke.js`

**Interfaces:**
- Consume: `window.pokeGridNotifications.set(id, count)`, `.seen(id)`, `.limpiar(id)` de la Tarea 1.
- Produce: nada nuevo. La Tarea 3 publica la fuente `updater`.

- [ ] **Paso 1: Escribir la prueba que falla**

En `tests/script-shop-smoke.js`, añadir al final, antes del `console.log`:

```js
    // El número de la Shop lo publica el registro y el badge lo pinta el hub. Tres
    // escrituras a mano del mismo número eran el problema que esto arregla.
    const avisos = await mainWindow.webContents.executeJavaScript(`(() => {
      const leer = (id) => {
        const nodo = document.getElementById(id);
        return { texto: nodo.textContent, oculto: nodo.hidden, color: nodo.style.background };
      };
      return {
        publicado: window.pokeGridNotifications.get('scripts'),
        badgeBoton: leer('scriptsMenuBadge'),
        badgePestana: leer('scriptShopUpdateBadge'),
        bolitaMenu: leer('hamburgerAvisoDotShop')
      };
    })()`);
    assert.ok(avisos.publicado, 'La fuente scripts tiene que estar publicada en el registro.');
    assert.equal(avisos.badgeBoton.color, 'var(--warning)', `El badge del botón Scripts usa su color, no ${avisos.badgeBoton.color}.`);
    assert.equal(avisos.badgePestana.color, 'var(--warning)', `El badge de la pestaña usa su color, no ${avisos.badgePestana.color}.`);
    assert.equal(avisos.badgeBoton.texto, avisos.badgePestana.texto,
      'Los dos badges muestran el mismo número, y los pone el hub, no el código a mano.');
```

Y en `tests/multi-game-userscripts-static-smoke.js`, añadir al final:

```js
// Los badges los pinta el hub. Este check existe para que, si alguien vuelve a
// escribirlos a mano, salte en vez de volver a haber dos fuentes de verdad.
assert.doesNotMatch(manager, /scriptShopUpdateBadge\.textContent\s*=/);
assert.doesNotMatch(manager, /hamburgerScriptBadge/);
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\script-shop-smoke.js`
Expected: FAIL en `El badge del boton Scripts usa su color`.

- [ ] **Paso 3: Que la Shop publique al registro**

En `src/userscripts.js`, sustituir el cuerpo de `updateScriptShopBadge` (`:596-607`) por:

```js
function updateScriptShopBadge() {
  const { updates, newScripts, total } = scriptShopNotificationCounts();
  const details = [
    newScripts ? `${newScripts} script${newScripts === 1 ? '' : 's'} nuevo${newScripts === 1 ? '' : 's'}` : '',
    updates ? `${updates} actualización${updates === 1 ? '' : 'es'}` : ''
  ].filter(Boolean).join(' y ') || 'No hay novedades de scripts';
  // Un solo recuento publicado. El hub pinta los tres sitios que lo muestran, así
  // que no pueden dejar de coincidir entre ellos.
  window.pokeGridNotifications.set('scripts', total);
  scriptsButton.title = details;
}
```

**Las dos líneas que escribían `#scriptShopUpdateBadge` a mano (`:602-603`) se borran**, no se dejan. Y `#hamburgerScriptBadge` desaparece del código: ya no existe en el HTML.

En `src/userscripts.js`, sustituir `setMenuBadge` (`:577-583`) por una envoltura que delega en el hub:

```js
// El hub es quien pinta. Esto queda para las llamadas que todavía no son una
// fuente declarada, y se puede borrar cuando no quede ninguna.
function setMenuBadge(element, total, title) {
  window.__pokeGridBadgeLegacy?.(element, total, title);
}
```

- [ ] **Paso 4: Añadir los ids nuevos a la lista de comprobación**

En `REQUIRED_SCRIPT_ELEMENTS` (`src/userscripts.js`, la lista empieza alrededor de `:36`), añadir `'#hamburgerAvisoDotShop'` junto al resto de ids de badge. `#updateLauncherBadge` lo añade la Tarea 3, cuando ese elemento exista en el HTML.

- [ ] **Paso 5: Que las notificaciones publiquen su recuento**

En `src/renderer.js`, sustituir el principio de `renderNotifications` (`:1391-1396`) por:

```js
function renderNotifications() {
  const unread = launcherNotifications.filter((notification) => !notification.read).length;
  // Al registro, no a mano: el badge lo pinta el hub con su color. Las dos líneas
  // que escribían notificationBadge directamente sobran.
  window.pokeGridNotifications.set('notifications', unread);
  notificationButton.classList.toggle('has-unread', unread > 0);
```

Borrar las dos líneas que escribían `notificationBadge.textContent` y `notificationBadge.hidden`.

Y en el punto donde se marcan las notificaciones como leídas (busca el lugar donde se llama a `renderNotifications()` tras marcarlas), añadir `window.pokeGridNotifications.seen('notifications');` justo antes.

- [ ] **Paso 6: Colores de los badges**

En `src/styles.css`, sustituir el bloque `.menu-update-badge` (`:442-460`) por:

```css
/* El fondo y el color los pone el hub en línea, uno por fuente: la Shop en ámbar,
   las notificaciones en rojo, el actualizador en verde. Aquí queda la forma. */
.menu-update-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  border: 2px solid #111820;
  border-radius: 999px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, .32);
  font: 900 8px/1 system-ui;
  pointer-events: none;
}
.menu-update-badge[hidden] { display: none; }
.menu-update-badge.is-hamburger { top: -6px; right: -6px; }
.menu-update-badge.is-scripts { top: 50%; right: 8px; transform: translateY(-50%); }
```

- [ ] **Paso 7: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\script-shop-smoke.js`
Expected: PASS

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: PASS con `Multi-game userscript static smoke passed: ...`

Run: `node scripts\run-tests.cjs node`
Expected: todas las suites de Node verdes

- [ ] **Paso 8: Sabotear para comprobar que muerde**

1. Vuelve a escribir `#scriptShopUpdateBadge.textContent = '9'` a mano dentro de `updateScriptShopBadge` → la aserción estática tiene que fallar.
2. Cambia `set('scripts', total)` por `set('notifications', total)` → la prueba tiene que fallar con `El badge del boton Scripts usa su color`, porque los dos badges saldrían rojos.

Restaura con `git checkout` y **verifica los finales de línea con `git cat-file blob HEAD:<fichero>`** antes de volver a stagear.

- [ ] **Paso 9: Commit**

```bash
git add src/userscripts.js src/renderer.js src/styles.css tests/script-shop-smoke.js tests/multi-game-userscripts-static-smoke.js
git commit -m "Que la Shop y las notificaciones publiquen su recuento al registro"
```

---

### Tarea 3: El canal de solo lectura para detectar actualizaciones

**Ficheros:**
- Modificar: `src/updater.js` (nueva función `peekLatestVersion`, después de `readLatestRelease`, que acaba en `:99`; y `module.exports`, en `:615`)
- Modificar: `src/main.js` (nuevo handler, después de `app:check-update`, que acaba en `:1644`; y el `require` de `updater.js`)
- Modificar: `src/preload.js` (nuevo método, junto a `checkForUpdates`, en `:16`)
- Modificar: `src/index.html:50` (badge nuevo sobre `#updateLauncherButton`)
- Modificar: `src/styles.css` (estilo del badge del botón Actualizar)
- Modificar: `src/userscripts.js` (`REQUIRED_SCRIPT_ELEMENTS`, añadir `'#updateLauncherBadge'`)
- Prueba: `tests/update-peek-smoke.js` (nueva, Node)

**Interfaces:**
- Consume: `fetchChecked` (`updater.js:59`), `compareVersions` (`updater.js:31`) y `UPDATE_API_URL` (`updater.js:9`) de `src/updater.js`.
- Produce: `updater.peekLatestVersion(net, currentVersion)` → `{ hayActualizacion: boolean, actual: string, masReciente: string, releaseUrl: string }`. Canal IPC `app:peek-update` → `{ ok, hayActualizacion, actual, masReciente, releaseUrl, error }`. Preload `peekForUpdates()`.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `tests/update-peek-smoke.js`:

```js
const assert = require('node:assert/strict');
const { peekLatestVersion } = require('../src/updater');

// `net` falso: el sondeo no descarga nada, solo pregunta. Por eso esta prueba
// vive en Node puro, sin red y sin arrancar Electron.
function netQueDevuelve(cuerpo) {
  return {
    fetch: async () => ({ ok: true, status: 200, json: async () => cuerpo })
  };
}

(async () => {
  // Hay versión más reciente.
  const hay = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v0.23.9', html_url: 'https://github.com/x/y/releases/tag/v0.23.9' }),
    '0.23.5'
  );
  assert.equal(hay.hayActualizacion, true, '0.23.9 sobre 0.23.5 es una actualización.');
  assert.equal(hay.masReciente, '0.23.9', 'Hay que decir cuál es la versión nueva.');
  assert.equal(hay.actual, '0.23.5', 'Hay que decir cuál es la instalada.');
  assert.equal(hay.releaseUrl, 'https://github.com/x/y/releases/tag/v0.23.9', 'Hay que decir dónde está.');

  // Misma versión: no hay nada pendiente.
  const igual = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.5' }), '0.23.5');
  assert.equal(igual.hayActualizacion, false, 'La misma versión no es actualización.');

  // Versión publicada más vieja: tampoco.
  const vieja = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.4' }), '0.23.5');
  assert.equal(vieja.hayActualizacion, false, 'Una versión más vieja no es actualización.');

  // Tag sin prefijo v también vale.
  const sinV = await peekLatestVersion(netQueDevuelve({ tag_name: '0.23.9' }), '0.23.5');
  assert.equal(sinV.masReciente, '0.23.9', 'El tag sin v tiene que leerse bien.');

  // Una release SIN assets no es "no hay versión nueva": es que está mal publicada.
  // El sondeo no puede tragarse eso y decir que estás al día.
  const sinAssets = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.9', assets: [] }), '0.23.5');
  assert.equal(sinAssets.hayActualizacion, true,
    'Una release sin ZIP sigue siendo una versión nueva: el error es de quien la publicó, no del launcher.');

  // Borrador o previa no cuentan.
  const borrador = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v9.0.0', draft: true, prerelease: false }), '0.23.5'
  );
  assert.equal(borrador.hayActualizacion, false, 'Un borrador no es una versión estable.');
  const previa = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v9.0.0', draft: false, prerelease: true }), '0.23.5'
  );
  assert.equal(previa.hayActualizacion, false, 'Una previa no es una versión estable.');

  // Formato imposible: error explícito, nunca un falso negativo.
  await assert.rejects(
    () => peekLatestVersion(netQueDevuelve({ tag_name: 'no-es-version' }), '0.23.5'),
    /no es v.lida/i,
    'Un tag con formato imposible tiene que dar error, no decir que no hay nada.'
  );

  // Red caída: el error se propaga. Quien llama decide si conserva lo que sabía.
  const caido = { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) };
  await assert.rejects(
    () => peekLatestVersion(caido, '0.23.5'),
    /GitHub no respondi/i,
    'Si GitHub falla, el error tiene que llegar a quien llama.'
  );

  console.log('Update peek smoke passed: hay version, misma, vieja, sin assets, borrador, previa, formato malo y red caida.');
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\update-peek-smoke.js`
Expected: FAIL con `peekLatestVersion is not a function`.

- [ ] **Paso 3: Escribir `peekLatestVersion`**

En `src/updater.js`, insertar después de que termine `readLatestRelease` (que acaba en la línea 99, justo antes de `downloadFile`):

```js
// Comprobación de versión nueva sin descargar nada. Deliberadamente distinta de
// readLatestRelease: aquella valida el ZIP y su firma, y por eso lanza si la
// release está mal publicada. Un sondeo que la reutilizara convertiría "has
// publicado un tag sin adjuntar los assets" en "estás al día", que es un falso
// negativo justo cuando más hace falta avisar. Aquí no se mira ningún asset,
// solo el tag.
async function peekLatestVersion(net, currentVersion) {
  const response = await fetchChecked(net, UPDATE_API_URL, { cache: 'no-store' });
  const release = await response.json();
  const actual = String(currentVersion || '').trim();
  if (release?.draft || release?.prerelease) {
    // Sin publicación estable todavía: no hay nada que ofrecer.
    return { hayActualizacion: false, actual, masReciente: actual, releaseUrl: release?.html_url || '' };
  }
  const latestVersion = String(release?.tag_name || '').replace(/^v/i, '');
  const comparison = compareVersions(latestVersion, actual);
  if (comparison === null) throw new Error('La versión publicada en GitHub no es válida.');
  return {
    hayActualizacion: comparison > 0,
    actual,
    masReciente: latestVersion,
    releaseUrl: release?.html_url || ''
  };
}
```

- [ ] **Paso 4: Exportar la función**

En `src/updater.js`, añadir `peekLatestVersion` al `module.exports` (empieza en `:615`), junto a `compareVersions`.

- [ ] **Paso 5: El canal IPC**

En `src/main.js`, añadir `peekLatestVersion` al `require` de `./updater` que ya existe. Después, justo después del handler `app:check-update` (que acaba en `:1644`), añadir:

```js
// Canal de solo lectura para el sondeo en segundo plano. A propósito NO comparte
// código con prepareUpdate ni con launchPreparedUpdate: app:check-update
// descarga, instala, borra la versión anterior y cierra el launcher. Si el sondeo
// usara ese canal, la aplicación se cerraría sola cada pocas horas.
ipcMain.handle('app:peek-update', async (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return { ok: false, hayActualizacion: false, error: 'Solicitud no autorizada.' };
  }
  const actual = app.getVersion();
  if (!app.isPackaged && !process.env.POKEGRID_ALLOW_DEV_UPDATE_CHECK) {
    return { ok: true, hayActualizacion: false, actual, masReciente: actual };
  }
  try {
    return { ok: true, ...(await peekLatestVersion(net, actual)) };
  } catch (error) {
    return { ok: false, hayActualizacion: false, actual, masReciente: actual, error: error.message };
  }
});
```

- [ ] **Paso 6: El método del preload**

En `src/preload.js`, junto a `checkForUpdates` (`:16`):

```js
  peekForUpdates: () => ipcRenderer.invoke('app:peek-update'),
```

- [ ] **Paso 7: El badge del botón Actualizar**

En `src/index.html:50`, añadir el badge dentro de `#updateLauncherButton`:

```html
<button id="updateLauncherButton" class="button button-secondary button-update" type="button" title="Buscar y aplicar actualizaciones del launcher"><span id="updateLauncherBadge" class="menu-update-badge is-update" hidden>0</span><span class="top-action-icon" aria-hidden="true">&#10515;</span><span class="update-launcher-copy"><span>Actualizar</span><small class="update-launcher-version" aria-label="Versión actual">Cargando versión…</small></span></button>
```

En `src/styles.css`, añadir:

```css
.menu-update-badge.is-update {
  top: -7px;
  right: -7px;
}
```

En `REQUIRED_SCRIPT_ELEMENTS` de `src/userscripts.js`, añadir `'#updateLauncherBadge'`.

- [ ] **Paso 8: Ejecutar y verificar que pasa**

Run: `node tests\update-peek-smoke.js`
Expected: PASS con `Update peek smoke passed: hay version, misma, vieja, sin assets, borrador, previa, formato malo y red caida.`

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes

- [ ] **Paso 9: Sabotear para comprobar que muerde**

1. Cambia `hayActualizacion: comparison > 0` por `comparison >= 0` → falla `La misma version no es actualizacion`.
2. Cambia el cuerpo de `peekLatestVersion` por una llamada a `readLatestRelease(net, currentVersion)` y devuelve su `status === 'available'` → falla `Una release sin ZIP sigue siendo una version nueva`, porque `readLatestRelease` lanza cuando no hay assets.

Restaura y verifica con `git hash-object src/updater.js`.

- [ ] **Paso 10: Commit**

```bash
git add src/updater.js src/main.js src/preload.js src/index.html src/styles.css src/userscripts.js tests/update-peek-smoke.js
git commit -m "Anadir el canal de solo lectura para detectar actualizaciones"
```

---

### Tarea 4: El sondeo en segundo plano, y que sin red no se apague la bolita

**Ficheros:**
- Modificar: `src/renderer.js` (módulo de sondeo antes de `initialize()`; llamada desde `initialize()`, después de leer `currentLauncherVersion`)
- Prueba: `tests/update-poll-persistence-smoke.js` (nueva, Electron)

**Interfaces:**
- Consume: `window.pokeGridNotifications.set('updater', n)` y `.limpiar('updater')` (Tarea 1), `window.pokeGrid.peekForUpdates()` (Tarea 3), y `updateLauncherButton`, que ya está declarado en el renderer.
- Produce: `window.pokeGridUpdatePoll` con `arrancar()`, `run({ forzar })`, `restaurar()`, `recordar(masReciente)`, `olvidar()`, `pendienteGuardada()`. Llave de `localStorage`: `pokegrid:launcher-update-pending:v1`.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `tests/update-poll-persistence-smoke.js`:

```js
const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-sondeo-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

const LLAVE = 'pokegrid:launcher-update-pending:v1';

// El sondeo no se puede esperar en la prueba: son 6 horas. Lo que se prueba es la
// parte que decide, que es la persistencia y la regla de "sin red no se apaga".
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
    await waitFor(ventana, 'window.pokeGridNotifications && window.pokeGridUpdatePoll');

    // Un sondeo con red trae la versión pendiente y la guarda.
    const conRed = await ventana.webContents.executeJavaScript(`(async () => {
      window.pokeGrid.peekForUpdates = async () => ({ ok: true, hayActualizacion: true, actual: '0.23.5', masReciente: '0.23.9' });
      await window.pokeGridUpdatePoll.run({ forzar: true });
      return {
        guardada: localStorage.getItem(${JSON.stringify(LLAVE)}),
        pendiente: window.pokeGridNotifications.get('updater').count
      };
    })()`);
    assert.equal(conRed.guardada, '0.23.9', 'La versión pendiente se guarda para sobrevivir a un arranque sin red.');
    assert.equal(conRed.pendiente, 1, 'Con versión nueva hay una pendiente.');

    // Un sondeo SIN red no puede borrar lo que ya se sabía.
    const sinRed = await ventana.webContents.executeJavaScript(`(async () => {
      window.pokeGridNotifications.limpiar('updater');
      window.pokeGrid.peekForUpdates = async () => ({ ok: false, hayActualizacion: false, error: 'GitHub no respondió correctamente (HTTP 503).' });
      await window.pokeGridUpdatePoll.run({ forzar: true });
      return {
        guardada: localStorage.getItem(${JSON.stringify(LLAVE)}),
        pendiente: window.pokeGridNotifications.get('updater').count
      };
    })()`);
    assert.equal(sinRed.guardada, '0.23.9', 'Un fallo de red no puede borrar la versión pendiente que ya se sabía.');
    assert.equal(sinRed.pendiente, 1, 'Sin red se conserva el aviso, no se apaga.');

    // Un sondeo con red que dice que no hay nada nuevo sí limpia de verdad.
    const alDia = await ventana.webContents.executeJavaScript(`(async () => {
      window.pokeGrid.peekForUpdates = async () => ({ ok: true, hayActualizacion: false, actual: '0.23.5', masReciente: '0.23.5' });
      await window.pokeGridUpdatePoll.run({ forzar: true });
      return {
        guardada: localStorage.getItem(${JSON.stringify(LLAVE)}),
        pendiente: window.pokeGridNotifications.get('updater').count
      };
    })()`);
    assert.equal(alDia.guardada, null, 'Cuando estás al día se olvida la versión pendiente.');
    assert.equal(alDia.pendiente, 0, 'Cuando estás al día no queda bolita.');

    // Al arrancar sin comprobar nada, se repinta lo que había guardado.
    const alArrancar = await ventana.webContents.executeJavaScript(`(() => {
      localStorage.setItem(${JSON.stringify(LLAVE)}, '0.23.9');
      window.__pokeGridCurrentVersion = '0.23.5';
      window.pokeGridUpdatePoll.restaurar();
      return window.pokeGridNotifications.get('updater').count;
    })()`);
    assert.equal(alArrancar, 1, 'Al arrancar, sin red, se repinta lo que se sabía.');

    // Y si la versión guardada es la que ya tienes, no hay nada pendiente.
    const yaEsta = await ventana.webContents.executeJavaScript(`(() => {
      localStorage.setItem(${JSON.stringify(LLAVE)}, '0.23.5');
      window.pokeGridUpdatePoll.restaurar();
      return window.pokeGridNotifications.get('updater').count;
    })()`);
    assert.equal(yaEsta, 0, 'Si la versión guardada es la que ya tienes, no hay bolita.');

    console.log(JSON.stringify({ ok: true, conRed, sinRed, alDia, alArrancar, yaEsta }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\update-poll-persistence-smoke.js`
Expected: FAIL con `Tiempo agotado esperando: window.pokeGridNotifications && window.pokeGridUpdatePoll`.

- [ ] **Paso 3: Escribir el módulo de sondeo**

En `src/renderer.js`, antes de `function initialize(`, añadir:

```js
// Sondeo de actualizaciones del launcher.
//
// No espera a que el usuario pulse nada: comprueba al arrancar y luego cada 6
// horas. La versión pendiente se guarda en localStorage porque un arranque sin red
// no puede borrar lo que ya se sabía; si se borrara, quien abra el launcher sin
// conexión perdería el aviso hasta que recuperase la red.
const ACTUALIZACION_LLAVE = 'pokegrid:launcher-update-pending:v1';
const ACTUALIZACION_CADA_MS = 6 * 60 * 60 * 1000;

const pokeGridUpdatePoll = {
  ultimaPasada: 0,
  temporizador: 0,

  recordar(masReciente) {
    if (masReciente) window.localStorage.setItem(ACTUALIZACION_LLAVE, String(masReciente));
  },
  olvidar() {
    window.localStorage.removeItem(ACTUALIZACION_LLAVE);
  },
  pendienteGuardada() {
    try {
      return String(window.localStorage.getItem(ACTUALIZACION_LLAVE) || '').trim();
    } catch {
      return '';
    }
  },

  // Repinta lo que ya se sabía, sin preguntar a nadie. Para el arranque.
  restaurar() {
    const guardada = this.pendienteGuardada();
    const actual = String(window.__pokeGridCurrentVersion || '').trim();
    const hay = Boolean(guardada) && (!actual || guardada !== actual);
    window.pokeGridNotifications.set('updater', hay ? 1 : 0);
    return guardada;
  },

  async run({ forzar = false } = {}) {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimaPasada < ACTUALIZACION_CADA_MS) return null;
    this.ultimaPasada = ahora;
    let resultado = null;
    try {
      resultado = await window.pokeGrid.peekForUpdates();
    } catch (error) {
      this.restaurar();
      return { ok: false, error: error.message };
    }
    if (!resultado || !resultado.ok) {
      // Fallo de red o error de GitHub: se conserva lo que se sabía y no se avisa.
      // Un fallo no puede ser motivo para tapar un aviso que ya era verdad.
      this.restaurar();
      return resultado;
    }
    if (resultado.hayActualizacion) {
      this.recordar(resultado.masReciente);
      window.pokeGridNotifications.set('updater', 1);
      updateLauncherButton.title = `Hay una versión nueva: ${resultado.masReciente}. Púlsala para instalarla.`;
    } else {
      this.olvidar();
      window.pokeGridNotifications.set('updater', 0);
    }
    return resultado;
  },

  arrancar() {
    this.restaurar();
    this.run({ forzar: true });
    window.clearInterval(this.temporizador);
    this.temporizador = window.setInterval(() => this.run(), ACTUALIZACION_CADA_MS);
  }
};
window.pokeGridUpdatePoll = pokeGridUpdatePoll;
```

- [ ] **Paso 4: Arrancar el sondeo**

En `initialize()`, **después** de que `currentLauncherVersion` esté leída (hoy se pinta en `renderer.js:157-163`), añadir:

```js
  // Guardar la versión local para que el sondeo pueda decidir, y arrancar el
  // sondeo. Va después de leer la versión, no antes: sin ella no se puede saber si
  // la pendiente guardada es la que ya tienes.
  window.__pokeGridCurrentVersion = currentLauncherVersion;
  window.pokeGridUpdatePoll.arrancar();
```

- [ ] **Paso 5: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\update-poll-persistence-smoke.js`
Expected: PASS con `{"ok":true,...}`

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes

- [ ] **Paso 6: Sabotear para comprobar que muerde**

1. En la rama `if (!resultado || !resultado.ok)`, sustituye `this.restaurar()` por `window.pokeGridNotifications.set('updater', 0)` → falla `Sin red se conserva el aviso, no se apaga`. **Es la aserción más importante del proyecto**: es exactamente el fallo que tnía el usuario.
2. En `restaurar()`, quita la comparación `guardada !== actual` → falla `Si la versión guardada es la que ya tienes, no hay bolita`.

Restaura y verifica con `git hash-object src/renderer.js`.

- [ ] **Paso 7: Commit**

```bash
git add src/renderer.js tests/update-poll-persistence-smoke.js
git commit -m "Sondear actualizaciones al arrancar y cada seis horas sin apagar avisos sin red"
```

---

### Tarea 5: Pedir confirmación antes de instalar

**Ficheros:**
- Modificar: `src/renderer.js:9640-9670` (handler de `updateLauncherButton`)
- Prueba: extender `tests/update-poll-persistence-smoke.js`

**Interfaces:**
- Consume: `pokeGridUpdatePoll` (`olvidar`, `restaurar`), `window.pokeGridNotifications.set('updater', 0)` y `window.pokeGrid.peekForUpdates()` (Tarea 4 y 3).
- Produce: nada nuevo.

- [ ] **Paso 1: Escribir la prueba que falla**

En `tests/update-poll-persistence-smoke.js`, antes del `console.log`, añadir:

```js
    // Pulsar el botón con versión nueva tiene que PREGUNTAR. Hoy no pregunta:
    // instalar sin avisar es justo lo que hace el canal que estamos respetando.
    const instalar = await ventana.webContents.executeJavaScript(`(async () => {
      window.__preguntas = [];
      const confirmOriginal = window.confirm;
      window.confirm = (texto) => { window.__preguntas.push(String(texto)); return false; };
      window.__llamadoInstall = 0;
      window.pokeGrid.checkForUpdates = async () => {
        window.__llamadoInstall += 1;
        return { ok: true, status: 'installing', currentVersion: '0.23.5', latestVersion: '0.23.9' };
      };
      window.pokeGrid.peekForUpdates = async () => ({ ok: true, hayActualizacion: true, actual: '0.23.5', masReciente: '0.23.9' });
      document.querySelector('#updateLauncherButton').click();
      await new Promise((r) => setTimeout(r, 600));
      const resultado = {
        preguntas: window.__preguntas,
        llamadoInstall: window.__llamadoInstall,
        pendiente: window.pokeGridNotifications.get('updater').count
      };
      window.confirm = confirmOriginal;
      return resultado;
    })()`);
    assert.equal(instalar.preguntas.length, 1, `Instalar tiene que pedir confirmación una vez. Preguntas: ${JSON.stringify(instalar.preguntas)}`);
    assert.ok(/0\.23\.9/.test(instalar.preguntas[0]), `La pregunta dice qué versión hay, no "${instalar.preguntas[0]}".`);
    assert.equal(instalar.llamadoInstall, 0, 'Si se cancela, no puede haberse llamado al canal que instala.');
    assert.equal(instalar.pendiente, 1, 'Cancelar la instalación NO puede apagar el aviso: sigue pendiente.');

    // Aceptando, sí se llama al canal que instala y se apaga la bolita.
    const aceptando = await ventana.webContents.executeJavaScript(`(async () => {
      window.confirm = () => true;
      window.__llamadoInstall = 0;
      document.querySelector('#updateLauncherButton').click();
      await new Promise((r) => setTimeout(r, 600));
      const resultado = { llamadoInstall: window.__llamadoInstall, pendiente: window.pokeGridNotifications.get('updater').count };
      window.confirm = window.__confirmOriginal;
      return resultado;
    })()`);
    assert.equal(aceptando.llamadoInstall, 1, `Aceptando se instala una vez, no ${aceptando.llamadoInstall}.`);
    assert.equal(aceptando.pendiente, 0, 'Solo al instalar se apaga la bolita del actualizador.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\update-poll-persistence-smoke.js`
Expected: FAIL en `Instalar tiene que pedir confirmación una vez`.

- [ ] **Paso 3: Preguntar antes de instalar**

En `src/renderer.js:9640-9670`, sustituir el handler completo de `updateLauncherButton` por:

```js
updateLauncherButton.addEventListener('click', async () => {
  updateLauncherButton.disabled = true;
  updateLauncherButton.setAttribute('aria-busy', 'true');
  setUpdateLauncherState('◌', 'Buscando', true);
  try {
    // Primero mirar, instalar después. app:check-update descarga, instala, borra la
    // versión anterior y cierra el launcher, así que no puede ser lo primero.
    const peek = await window.pokeGrid.peekForUpdates();
    if (!peek || !peek.ok) throw new Error(peek?.error || 'No se pudo buscar la actualización.');

    if (!peek.hayActualizacion) {
      setUpdateLauncherState('✓', 'Está actualizado');
      updateLauncherButton.title = `Versión actual ${peek.actual}`;
      window.pokeGridUpdatePoll.olvidar();
      window.pokeGridNotifications.set('updater', 0);
      return;
    }

    const aceptado = window.confirm(
      'Hay una versión nueva del launcher.\n\n' +
      `Versión actual: ${peek.actual}\n` +
      `Versión disponible: ${peek.masReciente}\n\n` +
      'Se descargará y se instalará. El launcher se cerrará al terminar.\n\n' +
      '¿Continuar?'
    );
    if (!aceptado) {
      // Cancelar no apaga el aviso: sigue pendiente hasta que se instale de verdad.
      setUpdateLauncherState('↓', 'Actualización pendiente');
      return;
    }

    const result = await window.pokeGrid.checkForUpdates();
    if (!result.ok) throw new Error(result.error || 'No se pudo completar la actualización.');
    currentLauncherVersion = String(result.currentVersion || currentLauncherVersion || '').trim();
    if (result.status === 'installing') {
      window.pokeGridUpdatePoll.olvidar();
      window.pokeGridNotifications.set('updater', 0);
      setUpdateLauncherState('↓', `Instalando ${result.latestVersion}`);
      updateLauncherButton.title = `Instalando la versión ${result.latestVersion}`;
    } else {
      setUpdateLauncherState('✓', 'Está actualizado');
    }
  } catch (error) {
    setUpdateLauncherState('!', 'Error de actualización');
    updateLauncherButton.title = error.message || 'No se pudo actualizar.';
    window.setTimeout(() => {
      if (!updateLauncherButton.disabled) setUpdateLauncherState('↓', 'Actualización pendiente');
    }, 4000);
  } finally {
    updateLauncherButton.disabled = false;
    updateLauncherButton.removeAttribute('aria-busy');
  }
});
```

- [ ] **Paso 4: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\update-poll-persistence-smoke.js`
Expected: PASS

Run: `node scripts\run-tests.cjs node`
Expected: todas verdes

- [ ] **Paso 5: Sabotear para comprobar que muerde**

1. Quita el `window.confirm` → falla `Instalar tiene que pedir confirmación una vez`.
2. Cambia `if (!aceptado)` por `if (false)` → falla `Si se cancela, no puede haberse llamado al canal que instala`.
3. Mueve el `window.pokeGridNotifications.set('updater', 0)` del `if (result.status === 'installing')` a antes del `confirm` → falla `Cancelar la instalación NO puede apagar el aviso`.

Restaura y verifica con `git hash-object src/renderer.js`.

- [ ] **Paso 6: Commit**

```bash
git add src/renderer.js tests/update-poll-persistence-smoke.js
git commit -m "Preguntar antes de instalar una actualizacion y no tapar el aviso al cancelar"
```

---

### Tarea 6: Orden de la Shop por fecha, con los destacados primero

**Ficheros:**
- Crear: `src/script-shop-order.js`
- Modificar: `src/main.js` (el `require` de la parte superior y el `sort` de `normalizeScriptShopCatalog`, en `:892`)
- Prueba: `tests/script-shop-order-smoke.js` (nueva, Node)

**Interfaces:**
- Consume: el campo `publishedAt` que la lista blanca de `main.js:886` ya conserva y que hoy no usa nadie.
- Produce: `orderShopCatalog(entries)` y `publicationDate(item)`, en `src/script-shop-order.js`. El **proyecto 2** reutilizará `orderShopCatalog` para la pestaña "Actualizaciones".

**Por qué un módulo aparte y no dentro de `main.js`:** el orden no se puede probar desde una prueba de Electron, porque el harness de previsualización (`tests/launcher-preview-preload.js:179-193`) devuelve un catálogo **fijo** de un solo script, no el que produce `main.js`. Y `main.js` no se puede importar en Node porque arranca Electron. Es el mismo motivo por el que `account-model.js` y `credentials.js` son módulos puros aparte: **lógica comprobable sin arrancar la aplicación**. Meter el orden dentro de `main.js` lo dejaría sin probar.

- [ ] **Paso 1: Escribir la prueba que falla**

Crear `tests/script-shop-order-smoke.js`:

```js
const assert = require('node:assert/strict');
const { orderShopCatalog, publicationDate } = require('../src/script-shop-order');

const item = (over) => ({
  id: 'x', name: 'X', featured: false, publishedAt: '2026-01-01T00:00:00Z', ...over
});

// Destacados primero, y dentro de cada grupo de más reciente a más antigua.
const orden = orderShopCatalog([
  item({ id: 'a', name: 'Antiguo', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'b', name: 'Reciente', publishedAt: '2026-09-01T00:00:00Z' }),
  item({ id: 'c', name: 'Destacado viejo', featured: true, publishedAt: '2025-01-01T00:00:00Z' }),
  item({ id: 'd', name: 'Destacado nuevo', featured: true, publishedAt: '2026-05-01T00:00:00Z' })
]);
assert.deepEqual(orden.map((i) => i.id), ['d', 'c', 'b', 'a'],
  `Destacados primero y por fecha dentro. Orden obtenido: ${orden.map((i) => i.id).join(', ')}`);

// Sin publishedAt va al final, porque no se sabe cuándo se publicó.
const sinFecha = orderShopCatalog([
  item({ id: 'con', name: 'Con fecha', publishedAt: '2020-01-01T00:00:00Z' }),
  item({ id: 'sin', name: 'Sin fecha', publishedAt: '' })
]);
assert.deepEqual(sinFecha.map((i) => i.id), ['con', 'sin'], 'Sin publishedAt va al final.');

// Una fecha que no se entiende también cae al final, y sin reventar.
const invalida = orderShopCatalog([
  item({ id: 'buena', name: 'Buena', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'mala', name: 'Mala', publishedAt: 'no-es-una-fecha' })
]);
assert.deepEqual(invalida.map((i) => i.id), ['buena', 'mala'], 'Una publishedAt inválida cae al final, no revienta.');

// featured ordena esté venga como booleano, texto o número.
const banderas = orderShopCatalog([
  item({ id: 'f', featured: false, name: 'F' }),
  item({ id: 't', featured: true, name: 'T' }),
  item({ id: 'x', featured: 'sí', name: 'X' })
]);
assert.deepEqual(banderas.map((i) => i.id), ['t', 'x', 'f'], 'featured ordena venga como venga.');

// Empate de fecha: desempate por nombre, para que el orden sea estable.
const empate = orderShopCatalog([
  item({ id: 'z', name: 'Zeta', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'a', name: 'Alfa', publishedAt: '2026-01-01T00:00:00Z' })
]);
assert.deepEqual(empate.map((i) => i.id), ['a', 'z'], 'Con la misma fecha el orden tiene que ser estable.');

// No muta la entrada: el llamante no puede verse afectado.
const entrada = [
  item({ id: 'b', name: 'B', publishedAt: '2026-05-01T00:00:00Z' }),
  item({ id: 'a', name: 'A', publishedAt: '2026-06-01T00:00:00Z' })
];
const copia = entrada.map((i) => i.id);
orderShopCatalog(entrada);
assert.deepEqual(entrada.map((i) => i.id), copia, 'No se puede mutar el array recibido.');

assert.equal(publicationDate({ publishedAt: '1970-01-02T00:00:00Z' }), 86400000, 'publicationDate devuelve milisegundos.');
assert.equal(publicationDate({}), Number.NEGATIVE_INFINITY, 'Sin fecha vale -infinito, para que caiga al final.');

console.log('Script shop order smoke passed: destacados, fecha, sin fecha, fecha invalida, empate y no mutacion.');
```

- [ ] **Paso 2: Ejecutar y verificar que falla**

Run: `node tests\script-shop-order-smoke.js`
Expected: FAIL con `Cannot find module` de `src/script-shop-order`.

- [ ] **Paso 3: Escribir el módulo**

Crear `src/script-shop-order.js`:

```js
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
  const marca = Date.parse(String(item?.publishedAt || ''));
  return Number.isFinite(marca) ? marca : Number.NEGATIVE_INFINITY;
}

// Destacados primero y, dentro de cada grupo, de la más reciente a la más
// antigua. El desempate por nombre hace que el orden sea estable entre recargas:
// sin él, dos entradas con la misma fecha podrían cambiar de sitio cada vez que se
// recarga el catálogo, y el usuario vería tarjetas saltando.
function orderShopCatalog(entries) {
  return [...(Array.isArray(entries) ? entries : [])].sort((a, b) => {
    const destacados = Number(Boolean(b?.featured)) - Number(Boolean(a?.featured));
    if (destacados !== 0) return destacados;
    const fecha = publicationDate(b) - publicationDate(a);
    if (fecha !== 0) return fecha;
    return String(a?.name || '').localeCompare(String(b?.name || ''), 'es');
  });
}

module.exports = { publicationDate, orderShopCatalog };
```

- [ ] **Paso 4: Cablear `main.js`**

En `src/main.js`, añadir el `require` junto a los demás de la parte superior:

```js
const { orderShopCatalog } = require('./script-shop-order');
```

Y **sustituir**, en el `return` de `normalizeScriptShopCatalog` (`main.js:892`), la línea del `sort`, que es exactamente esta:

```js
    scripts: scripts.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'es'))
```

por:

```js
    scripts: orderShopCatalog(scripts)
```

**Sustituye, no añadas.** Si las dos se quedan, el `sort` viejo gana y la prueba seguirá verde mientras el orden sigue siendo el viejo. Si al terminar la prueba pasa y el orden no cambia, mira esto primero.

- [ ] **Paso 5: Ejecutar y verificar que pasa**

Run: `node tests\script-shop-order-smoke.js`
Expected: PASS con `Script shop order smoke passed: destacados, fecha, sin fecha, fecha invalida, empate y no mutacion.`

Run: `node_modules\electron\dist\electron.exe tests\script-shop-smoke.js`
Expected: PASS. No se rompe nada de lo que ya comprobaba.

Run: `node scripts\run-tests.cjs node`
Expected: 9/9 suites verdes (7 anteriores más las 2 nuevas).

- [ ] **Paso 6: Sabotear para comprobar que muerde**

1. Sustituye la comparación de fechas por la de nombre → falla `Destacados primero y por fecha dentro`.
2. Quita la línea de los destacados, dejando solo el orden por fecha → falla `Destacados primero y por fecha dentro`.
3. Cambia `Number.NEGATIVE_INFINITY` por `0` en `publicationDate` → falla `Sin publishedAt va al final`.
4. Quita el `[...]` y ordena `entries` en sitio → falla `No se puede mutar el array recibido`.

Restaura y verifica con `git hash-object src/script-shop-order.js`.

- [ ] **Paso 7: Commit**

```bash
git add src/script-shop-order.js src/main.js tests/script-shop-order-smoke.js
git commit -m "Ordenar el catalogo por fecha con los destacados primero"
```

---

## Cierre del plan

### Qué queda para los proyectos siguientes

Este plan **no** incluye, a propósito. Cada cosa está anotada en la especificación §8:

- **Proyecto 2** — la pestaña "Actualizaciones" (reutiliza `orderShopCatalog` y las reglas de recuento de la Tarea 6), el filtro por categoría, y el debounce de la búsqueda, que hoy rehace todas las tarjetas en cada tecla con un techo de 200.
- **Proyecto 3** — vista de lista y de tarjeta, imagen en la tarjeta (con el límite del CSP de `img-src`), panel de detalle y favoritos.
- **Proyecto 4** — Capture Log y Hunt Analyzer.
- **Proyecto aparte** — la herramienta publicadora, que es el repositorio `DiegoT34/PokeGrid-Script-Shop`.

### Antes de dar esto por terminado

1. `node scripts\run-tests.cjs node` en verde.
2. `node scripts\run-tests.cjs electron` en verde, **una vez al final**, no en cada tarea. Ya se sabe que `dynamic-accounts-proxy-smoke.js` tarda unos 900 s en una máquina sin salida al juego y tiene presupuesto propio en el runner.
3. Cada suite nueva ejecutada por separado con `Start-Process -Wait -PassThru`, para leer su salida sin que la tubería se trague la línea del aserto. **Un `| Select-Object -First` corta la tubería y devuelve `exit=-1` aunque la suite pase**; ya pasó dos veces en este repo.
4. Bump de versión y un solo build. **Nada de publicar**: `git push` y `git tag` son del usuario.