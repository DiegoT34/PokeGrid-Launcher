const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- applyFloatGeometry NO puede escribir el tamaño en estilo inline ----------
const bloque = renderer.slice(renderer.indexOf('function applyFloatGeometry('));
const fin = bloque.indexOf('\nfunction ');
const cuerpo = bloque.slice(0, fin < 0 ? bloque.length : fin);

assert.equal(/style\.width\s*=/.test(cuerpo), false,
  'applyFloatGeometry sigue escribiendo width en estilo inline, y eso impide que el CSS recorte.');
assert.equal(/style\.height\s*=/.test(cuerpo), false,
  'applyFloatGeometry sigue escribiendo height en estilo inline.');
assert.ok(/--float-w/.test(cuerpo), 'applyFloatGeometry tiene que pasar el ancho en --float-w.');
assert.ok(/--float-h/.test(cuerpo), 'applyFloatGeometry tiene que pasar el alto en --float-h.');
assert.ok(/style\.left\s*=/.test(cuerpo), 'La posición la sigue escribiendo el JS, porque tiene que ser absoluta.');
assert.ok(/style\.top\s*=/.test(cuerpo), 'La posición la sigue escribiendo el JS.');

// --- Usa el módulo puro, no su propia aritmética -------------------------------
assert.ok(/pokeGridFloatGeometry\.calcularFloatGeometry/.test(cuerpo),
  'applyFloatGeometry tiene que delegar en el módulo puro, no repetir la cuenta.');
assert.equal(/Math\.min\(Math\.max\(minWidth/.test(cuerpo), false,
  'La fórmula vieja sigue en renderer.js, que es el bug que se acaba de arreglar en el módulo.');

// --- Los dos paneles leen las propiedades personalizadas -----------------------
// El alto no va dentro de un min() porque su valor por defecto es `auto`, y
// `auto` no es una longitud válida dentro de min(). Lo que recorta el alto son
// min-height y max-height, que ya existían y ahora además llevan el margen.
for (const selector of ['.capture-float-panel', '.hunt-float-panel']) {
  const i = styles.indexOf(`${selector} {`);
  const bloque = styles.slice(i, styles.indexOf('}', i));
  assert.ok(/width:\s*min\(var\(--float-w,/.test(bloque),
    `${selector} tiene que usar min(var(--float-w, ...), calc(100% - 14px)) en su width.`);
  assert.ok(/height:\s*var\(--float-h,\s*auto\)/.test(bloque),
    `${selector} tiene que usar var(--float-h, auto) en su height.`);
  assert.ok(/max-height:\s*calc\(100% - 56px\)/.test(bloque),
    `${selector} necesita su max-height: es lo que recorta si el padre encoge más de lo previsto.`);
  assert.ok(/max-width:\s*calc\(100% - 14px\)/.test(bloque),
    `${selector} necesita su max-width, por lo mismo.`);
}

// --- El CSS sigue teniendo su propio min() de protección ------------------------
// Si el JS deja de recortar, el recorte tiene que hacerlo el CSS. Sin esto, un
// padre que encoge más de lo previsto saca el panel de la pantalla otra vez.
for (const selector of ['.capture-float-panel', '.hunt-float-panel']) {
  const re = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*min-width:\\s*min\\(`);
  assert.ok(re.test(styles),
    `${selector} necesita su propio min-width: min(...), porque es el CSS el que recorta cuando el padre encoge.`);
  const reAlto = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{[^}]*min-height:\\s*min\\(`);
  assert.ok(reAlto.test(styles),
    `${selector} necesita su propio min-height: min(...), por lo mismo.`);
}

// --- El botón de restablecer no borra el style entero -------------------------
const reset = renderer.slice(renderer.indexOf('resetButton.addEventListener'));
const finReset = reset.indexOf('});');
assert.equal(/removeAttribute\('style'\)/.test(reset.slice(0, finReset)), false,
  'El botón de restablecer borra el style entero, y con él las propiedades personalizadas.');

// --- saveFloatGeometry guarda las dos referencias ------------------------------
const guarda = renderer.slice(renderer.indexOf('function saveFloatGeometry'));
const finGuarda = guarda.indexOf('\nfunction ');
const cuerpoGuarda = guarda.slice(0, finGuarda < 0 ? guarda.length : finGuarda);
assert.ok(/baseWidth/.test(cuerpoGuarda), 'saveFloatGeometry tiene que guardar baseWidth.');
assert.ok(/baseHeight/.test(cuerpoGuarda), 'saveFloatGeometry tiene que guardar baseHeight.');
assert.ok(/baseParent/.test(cuerpoGuarda), 'saveFloatGeometry tiene que guardar baseParent.');

console.log('Float geometry wiring smoke passed: sin tamaño en inline, CSS con --float-w y --float-h, reset limpio.');