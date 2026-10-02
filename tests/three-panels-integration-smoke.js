const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// --- El material, el tamaño y la tipografía, leídos del CSS real -------------
// Esta prueba no necesita ventana para lo que importa: si el material y la
// geometría están en el CSS y en el módulo puro, están. Lo que necesita ventana
// es que los tres paneles a la vez convivan, y eso lo hace la de Electron.
const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

// --- 1. Los tres paneles comparten el material -------------------------------
const ancla = styles.indexOf('.hunt-float-panel,\n.capture-float-panel,\n.account-info-card {');
assert.ok(ancla > 0, 'No encuentro la regla agrupada del material.');
const grupo = styles.slice(ancla, styles.indexOf('}', ancla));
for (const token of ['--glass-bg', '--glass-edge', '--glass-sombra', '--glass-filtro']) {
  assert.ok(grupo.includes(token), `La regla compartida del material tiene que usar ${token}.`);
}

// --- 2. Los tres están en el template y se pueden abrir -----------------------
for (const [clase, aria] of [
  ['capture-float-panel', 'Capture Log'],
  ['hunt-float-panel', 'Hunt Analyzer'],
  ['account-info-card', 'Datos de la cuenta']
]) {
  assert.ok(html.includes(`class="${clase}"`), `El template tiene que traer .${clase}.`);
  assert.ok(html.includes(`aria-label="${aria}"`), `Falta el aria-label de ${aria}.`);
}

// --- 3. El módulo de geometría está cargado antes que renderer.js ------------
const indiceScript = html.indexOf('src="float-geometry.js"');
const indiceRenderer = html.indexOf('src="renderer.js"');
assert.ok(indiceScript > 0, 'float-geometry.js no está cargado en index.html.');
assert.ok(indiceScript < indiceRenderer,
  'float-geometry.js tiene que cargarse ANTES que renderer.js: el renderer lo usa al aplicar la geometría.');

// --- 4. NADIE escribe el tamaño del panel flotante en estilo inline ----------
// El inline gana a cualquier regla CSS, así que un width en estilo inline deja el
// panel clavado en ese tamaño para siempre. Pasó aquí: el arrastrar escribía
// width y height en inline y no los quitaba nunca, así que después de arrastrar un
// panel una vez, maximizar la ventana ya no lo crecía. Es el bug que Marque el
// encargo, y lo encontró esta prueba al final.
{
  const arrastrar = renderer.slice(renderer.indexOf("head.addEventListener('pointerdown'"));
  const finArrastrar = arrastrar.indexOf("window.addEventListener('pointerup', stop");
  const cuerpo = arrastrar.slice(0, finArrastrar);
  assert.equal(/style\.width\s*=/.test(cuerpo), false,
    'El arrastrar sigue escribiendo width en estilo inline: el panel se quedaría clavado en ese tamaño.');
  assert.equal(/style\.height\s*=/.test(cuerpo), false,
    'El arrastrar sigue escribiendo height en estilo inline.');
  assert.ok(/setProperty\('--float-w'/.test(cuerpo),
    'El arrastrar tiene que fijar el tamaño con --float-w, para que el CSS siga mandando.');
  assert.ok(/setProperty\('--float-h'/.test(cuerpo), 'Igual con --float-h.');
}

// Y en ningún otro sitio de renderer.js tampoco.
const estilosFloat = [...renderer.matchAll(/floatPanel\.style\.width\s*=|floatPanel\.style\.height\s*=|Object\.assign\(floatPanel\.style/g)];
assert.equal(estilosFloat.length, 0,
  `Hay ${estilosFloat.length} sitio(s) más que escriben el tamaño del panel en inline. Cada uno deja el panel clavado.`);

// --- 5. Los tres tamaños por defecto del CSS son coherentes con los suelos ----
// Si el valor por defecto de --float-w fuera menor que el suelo, el panel
// empezaría más pequeño de lo que el mínimo permite.
const { resolverSuelo, SUELOS } = require('../src/float-geometry');
const PADRE = { width: 620, height: 520 };
for (const kind of ['capture', 'hunt']) {
  const suelo = resolverSuelo(kind, PADRE);
  assert.ok(suelo.width <= PADRE.width - 14 && suelo.height <= PADRE.height - 56,
    `El suelo de ${kind} tiene que caber en una cuenta normal.`);
}
assert.equal(SUELOS.capture.width, 300);
assert.equal(SUELOS.hunt.width, 280);

// Y el CSS declara un suelo igual o menor, para que el JS y el CSS no discrepen.
for (const [selector, sueloJs] of [
  ['.capture-float-panel', SUELOS.capture.width],
  ['.hunt-float-panel', SUELOS.hunt.width]
]) {
  const i = styles.indexOf(`${selector} {`);
  const bloque = styles.slice(i, styles.indexOf('}', i));
  const declarado = bloque.match(/min-width:\s*min\((\d+)px/);
  assert.ok(declarado, `${selector} tiene que declarar min-width: min(Npx, ...).`);
  assert.ok(Number(declarado[1]) <= sueloJs,
    `${selector} declara un suelo de ${declarado[1]}px y el módulo usa ${sueloJs}px. Si el del CSS es mayor, manda el CSS y el módulo no está arreglando nada.`);
}

// --- 6. Ninguno de los tres paneles declara una familia de fuente rota -------
assert.equal(/Arial Narrow|Roboto Condensed|Bahnschrift Condensed/.test(styles), false,
  'Ha vuelto alguna de las fuentes condensadas que no existen en Windows 11.');

console.log('Three panels integration smoke passed: material, template, orden de scripts, suelos coherentes y tipografía.');