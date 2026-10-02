const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- Los cinco iconos del encargo existen y dibujan algo ----------------------
const bloque = renderer.slice(renderer.indexOf('const LAUNCHER_ICON_PATHS'));
const fin = bloque.indexOf('\n});');
const tabla = bloque.slice(0, fin);

for (const nombre of ['user', 'zoomOut', 'zoomIn', 'expand', 'collapse', 'refresh', 'pin', 'trash', 'close']) {
  const linea = tabla.split('\n').find((una) => una.trim().startsWith(`${nombre}:`));
  assert.ok(linea, `El icono "${nombre}" tiene que estar en LAUNCHER_ICON_PATHS.`);
  assert.ok(/<path|<circle/.test(linea), `El icono "${nombre}" tiene que dibujar algo, no una cadena vacía.`);
}

// --- Ningún emoji se queda en los botones de los tres paneles ------------------
const panelTemplate = html.slice(html.indexOf('<template id="panelTemplate">'));
const finTemplate = panelTemplate.indexOf('</template>');
const markup = panelTemplate.slice(0, finTemplate);

assert.ok(!markup.includes('&#128100;'), 'El botón de datos de la cuenta todavía lleva el emoji 👤.');
assert.ok(!markup.includes('&#9855;'), 'El botón de posición de Capture Log todavía lleva el emoji ↺.');
assert.ok(!markup.includes('&#128716;'), 'El botón de fijar de Capture Log todavía lleva el emoji 📌.');

assert.ok(!/<button class="mini-button zoom-out"[^>]*>−<\/button>/.test(markup),
  'El botón de zoom out sigue con el glifo −.');
assert.ok(!/<button class="mini-button zoom-in"[^>]*>\+<\/button>/.test(markup),
  'El botón de zoom in sigue con el glifo +.');
assert.ok(!/<button class="mini-button reload"[^>]*>↻<\/button>/.test(markup),
  'El botón de recargar sigue con el glifo ↻.');
assert.ok(!/<button class="mini-button expand"[^>]*>⛶<\/button>/.test(markup),
  'El botón de agrandar sigue con el glifo ⛶.');

// --- Los cuatro botones de Capture Log reciben SVG al crear el panel -----------
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
const zonaIconos = renderer.slice(renderer.indexOf("huntPanel.querySelector('.hunt-float-position-reset')"));
const limite = renderer.indexOf('  captureLogPanel,');
const conectando = zonaIconos.slice(0, limite - (renderer.length - zonaIconos.length));
assert.equal(
  /panel\.captureLogPanel|panel\.huntPanel|panel\.accountInfoPanel|panel\.accountInfoButton/.test(conectando),
  false,
  'Los iconos se conectan con las variables locales, no con panel.*: en ese punto el objeto panel no existe todavía y sale un ReferenceError.'
);

// --- El botón de datos de la cuenta también -----------------------------------
const iconoUser = renderer.slice(renderer.indexOf("huntPanel.querySelector('.hunt-float-position-reset')"));
assert.ok(/accountInfoButton\.innerHTML = launcherUiIcon\('user'\)/.test(iconoUser),
  'El botón de datos de la cuenta tiene que recibir launcherUiIcon("user").');

// --- Los cuatro que se quedaron EN BLANCO, que es el fallo que había ----------
// Estos botones se vaciaron en el HTML y nunca se conectaron, así que salían sin
// nada dentro. Es justo lo que se veía en la captura.
for (const [variable, icono] of [
  ['zoomOutButton', 'zoomOut'],
  ['zoomInButton', 'zoomIn'],
  ['reloadButton', 'refresh'],
  ['expandPanelButton', 'expand']
]) {
  assert.ok(new RegExp(`${variable}\\.innerHTML = launcherUiIcon\\('${icono}'\\)`).test(renderer),
    `${variable} se quedó en blanco: tiene que recibir launcherUiIcon("${icono}").`);
}

// --- Capturas y Hunt, que eran formas con pseudo-elementos CSS ----------------
assert.ok(/captureLogButton\.querySelector\('\.capture-pokeball-icon'\)\.outerHTML = launcherUiIcon\('capture'/.test(renderer),
  'El icono de Capturas era un pokeball hecho con CSS. Tiene que ser un SVG.');
assert.ok(/hunt-toggle \.hunt-coin-sword-icon'\)\.outerHTML = launcherUiIcon\('hunt'/.test(renderer),
  'El icono de Hunt era una moneda con una espada hecha con CSS. Tiene que ser un SVG.');

// --- Y sus reglas CSS desaparecidas ------------------------------------------
// Si el SVG sustituye a la forma dibujada, las reglas de la forma sobran. Si
// volvieran, pelearían con el SVG por el mismo sitio.
assert.equal(styles.includes('.capture-pokeball-icon'), false,
  'Quedan reglas CSS del pokeball dibujado. Con el SVG de encima, sobran y estorban.');
assert.equal(styles.includes('.hunt-coin-sword-icon'), false,
  'Quedan reglas CSS de la moneda con espada. Con el SVG de encima, sobran y estorban.');

// --- Agrandar y recoger usan innerHTML, no textContent -------------------------
// Ojo: `expandButton` a secas es el botón del NAVEGADOR EMBEBIDO, que es otra
// función y queda fuera del encargo. El de cada cuenta es `item.expandButton`,
// dentro del panels.forEach de toggleExpanded.
const lineaExpand = renderer.split('\n').find((una) => una.includes('item.expandButton.textContent'));
assert.equal(lineaExpand, undefined,
  'item.expandButton sigue usando textContent, y un SVG no se pinta con textContent.');
assert.ok(/item\.expandButton\.innerHTML = launcherUiIcon\(item === expandedPanel \? 'collapse' : 'expand'\)/.test(renderer),
  'El botón de agrandar tiene que alternar entre los iconos collapse y expand.');

// --- El menú del launcher, con iconos nuevos ----------------------------------
// Los once botones tenían un emoji o un glifo suelto dentro —una diana, un rombo,
// un </>, una campana, un ↻— que son de otro sistema visual que el panel entero.
for (const [selector, icono] of [
  ['#farmButton', 'timer'],
  ['#pokepediaButton', 'book'],
  ['#scriptsButton', 'code'],
  ['#statisticsButton', 'chartColumn'],
  ['#notificationButton', 'bell'],
  ['#accountsButton', 'users'],
  ['#cleanupMemoryButton', 'trash'],
  ['#loginAllButton', 'play'],
  ['#reloadAllButton', 'refresh'],
  ['#updateLauncherButton', 'download'],
  ['#viewModeButton', 'layout']
]) {
  assert.ok(renderer.includes(`'${selector}': '${icono}'`),
    `${selector} no tiene icono propio en ICONOS_MENU.`);
}
console.log('ok  los once botones del menú tienen icono propio.');

// --- Y que el botón de farmeo, que se rehace entero, también lo lleva ---------
// setFarmButtonRunning reconstruye el innerHTML del botón en cada cambio de
// estado. Arreglar solo el HTML del template no basta: el emoji vuelve en cuanto
// se pulsa, y fue justo lo que pasó.
assert.ok(/\$\{launcherUiIcon\('play'\)\}<span>Farmeando<\/span>/.test(renderer),
  'El estado «Farmeando» tiene que llevar SVG: ese botón se rehace entero en cada cambio.');
assert.ok(/\$\{launcherUiIcon\('timer'\)\}<span>Modo farmeo<\/span>/.test(renderer),
  'El estado «Modo farmeo» tiene que llevar SVG, por lo mismo.');
assert.ok(/icon\.innerHTML = launcherUiIcon\(updateLauncherState\.icono \|\| 'download'\)/.test(renderer),
  'El botón de actualizar se repinta entero: con textContent volvería el glifo.');
console.log('ok  los tres botones que se rehacen enteros también llevan SVG.');

// --- El orden de la llamada, que es donde esto se rompió -----------------------
// Las tablas de iconos son `const`. Una función que las lee, llamada antes de su
// declaración, cae en zona muerta temporal: `launcherUiIcon` está izada pero al
// leer `LAUNCHER_ICON_PATHS` revienta. El síntoma es el panel entero en blanco, y
// las pruebas solo dicen «se agotó el tiempo esperando» sin decir por qué. Pasó,
// y Were 15 de 27 suites.
//
// Aquí no se puede ejecutar el renderer, así que se comprueba el orden en el
// fuente: la llamada tiene que ir después de las dos declaraciones.
const lineaDe = (texto) => renderer.slice(0, renderer.indexOf(texto)).split('\n').length;
const LLAMADA = '\naplicarIconosMenu();';
assert.ok(renderer.includes(LLAMADA), 'No encuentro la llamada a aplicarIconosMenu().');
const iLlamada = lineaDe(LLAMADA);
const iMenu = lineaDe('const ICONOS_MENU');
const iIconos = lineaDe('const LAUNCHER_ICON_PATHS');
const iFabrica = lineaDe('function launcherUiIcon(');
assert.ok(iMenu < iLlamada,
  `aplicarIconosMenu() se llama en la línea ${iLlamada} y ICONOS_MENU se declara en la ${iMenu}: antes de su declaración.`);
assert.ok(iIconos < iLlamada,
  `aplicarIconosMenu() se llama en la línea ${iLlamada} y LAUNCHER_ICON_PATHS se declara en la ${iIconos}: antes de su declaración.`);
assert.ok(iFabrica < iLlamada,
  `aplicarIconosMenu() se llama en la línea ${iLlamada}, antes de definir launcherUiIcon en la ${iFabrica}.`);
console.log(`ok  la llamada (L${iLlamada}) va después de ICONOS_MENU (L${iMenu}), LAUNCHER_ICON_PATHS (L${iIconos}) y launcherUiIcon (L${iFabrica}).`);

// --- Y que el grosor de trazo sea uno solo para todos --------------------------
const grosores = new Set([...renderer.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]));
assert.equal(grosores.size, 1,
  `Hay ${grosores.size} grosores de trazo distintos (${[...grosores].join(', ')}). Un juego de iconos con grosores mezclados no parece un pack.`);
console.log(`ok  un solo grosor de trazo: ${[...grosores][0]}.`);

console.log('Launcher icons smoke passed: los iconos de los paneles y los once del menú, todos del mismo pack, con la llamada en su sitio.');