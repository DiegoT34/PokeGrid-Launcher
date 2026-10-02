const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// --- El popover ya no se posiciona a mano -------------------------------------
// Antes se medían rectángulos y se decidía si iba debajo o arriba. Con el detalle
// como hermano de su fila, el CSS lo coloca y no hay nada que medir.
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
assert.ok(/\.after\(/.test(cuerpo),
  'El detalle tiene que insertarse como hermano de su fila, con row.after().');

// --- Las estadísticas solo se pintan si hay valor -----------------------------
assert.ok(/hayEstad/.test(cuerpo),
  'Falta la decisión de si se pintan las estadísticas o no.');
const condicional = cuerpo.slice(cuerpo.indexOf('if (hayEstad'));
assert.ok(condicional.includes('tooltip.append'),
  'El append de las estadísticas tiene que estar dentro del if.');

// --- El detalle se reabre tras reconstruir la lista ---------------------------
// renderer.js destruye la lista entera cuando llega una captura nueva, y antes
// cerraba el detalle con ella. Lo que estabas leyendo se cerraba solo.
assert.ok(/function reabrirCaptureDetail\(/.test(renderer),
  'Falta reabrirCaptureDetail.');
const render = renderer.slice(renderer.indexOf('function renderCaptureLog('));
const finRender = render.indexOf('\nfunction ');
const cuerpoRender = render.slice(0, finRender < 0 ? render.length : finRender);
assert.ok(/detalleAbierto|captureDetailKey/.test(cuerpoRender),
  'renderCaptureLog tiene que acordarse del detalle abierto antes de tirar la lista.');
assert.ok(/reabrirCaptureDetail\(/.test(cuerpoRender),
  'renderCaptureLog tiene que reabrir el detalle tras reconstruir.');

// --- Y las filas llevan data-capture-key, o reabrir no encuentra nada --------
// Esto es un fallo silencioso: la función se llama, no encuentra la fila y no
// pasa nada. La prueba lo vigila porque es exactamente el tipo de fallo que no
// se ve.
const fila = renderer.slice(renderer.indexOf("row.className = `capture-flat-row"));
assert.ok(/dataset\.captureKey\s*=|setAttribute\('data-capture-key'/.test(fila),
  'La fila tiene que llevar data-capture-key, o reabrirCaptureDetail no la encuentra y el detalle no vuelve.');

// --- Sin emoji de Fuerza -------------------------------------------------------
assert.equal(renderer.includes('💪'), false, 'El emoji de Fuerza sigue ahí.');
assert.ok(/launcherUiIcon\('trend'\)/.test(renderer), 'Fuerza tiene que llevar un icono SVG.');

console.log('Capture detail expand smoke passed: sin posicionamiento manual, hermano de su fila, estadísticas condicionales y reapertura.');