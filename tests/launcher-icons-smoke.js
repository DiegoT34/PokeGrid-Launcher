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

console.log('Launcher icons smoke passed: cinco iconos nuevos y los nueve botones con SVG.');