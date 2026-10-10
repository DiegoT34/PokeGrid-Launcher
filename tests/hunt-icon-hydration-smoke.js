const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// --- El fallo real: la hidratación se ESPERA, y eso atasca el sondeo ----------
// refreshPanelHuntAnalyzer hace `await withTimeout(hydrateHuntDropIcons(...),
// 4000, ...)`. Si un icono no resuelve, esa línea tarda 4 segundos. Y
// pollHuntAnalyzers no suelta huntPollBusy hasta que acaban TODOS los paneles,
// así que un solo icono lento retrasa la actualización de Hunt Analyzer de todas
// las cuentas 4 segundos. Ese es el defecto, y no es que el panel se quede en
// error: el .catch(() => snapshot) impide eso, y esa parte ya estaba bien.
const refresco = renderer.slice(renderer.indexOf('async function refreshPanelHuntAnalyzer('));
const fin = refresco.indexOf('\nfunction ');
const cuerpo = refresco.slice(0, fin < 0 ? refresco.length : fin);

assert.ok(!/await\s+\w*withTimeout\(\s*hidratarIconosHunt/.test(cuerpo),
  'La hidratación no puede ir con await dentro de un withTimeout: si un icono no resuelve, el refresco tarda 4 s y bloquea huntPollBusy para todas las cuentas.');
assert.ok(!/await\s+hidratarIconosHunt/.test(cuerpo),
  'La hidratación no puede esperarse: es una mejora cosmetic y no puede retener el sondeo.');
assert.ok(!/await\s+\w*withTimeout\(\s*hydrateHuntDropIcons/.test(cuerpo),
  'Queda la hidratación vieja con await.');

// --- El dibujo va antes que la hidratación ----------------------------------
const lineas = cuerpo.split('\n');
const lineaRender = lineas.findIndex((una) => una.includes('renderHuntAnalyzer'));
const lineaHidrata = lineas.findIndex((una) => una.includes('hidratarIconosHunt'));
assert.ok(lineaRender >= 0 && lineaHidrata >= 0,
  'El refresco tiene que dibujar y tiene que hidratar.');
assert.ok(lineaRender < lineaHidrata,
  'El panel tiene que dibujarse antes de lanzar la hidratación.');

// --- La hidratación no puede rechazar -----------------------------------------
const hidrata = renderer.slice(renderer.indexOf('async function hidratarIconosHunt'));
const finHidrata = hidrata.indexOf('\nfunction ');
const cuerpoHidrata = hidrata.slice(0, finHidrata < 0 ? hidrata.length : finHidrata);
const interior = cuerpoHidrata.slice(cuerpoHidrata.indexOf('{'));
assert.equal(/throw /.test(cuerpoHidrata), false,
  'La hidratación no puede lanzar: si lanza, vuelve al catch del refresco y pinta el panel en error.');
assert.ok(/catch/.test(cuerpoHidrata),
  'La hidratación tiene que capturar su propio error.');
assert.equal(/\bawait\b/.test(interior), false,
  'La hidratación no debe tener await dentro: cada icono va por su cuenta y se devuelve enseguida.');

// --- Y parchea la celda cuando el icono llega --------------------------------
// Sin esto, un icono que tarda cuatro segundos no se ve hasta el siguiente
// sondeo, y si nunca llega no se ve nunca sin dejar el resto colgado.
assert.ok(/data-drop-index/.test(renderer),
  'Las celdas de icono necesitan data-drop-index, o la hidratación no sabe a cuál parchea.');
assert.ok(/celda\.src\s*=/.test(cuerpoHidrata),
  'Cuando el icono llega tiene que parchearse en su celda, no solo en el snapshot.');

// --- Y los tres caminos, no uno -----------------------------------------------
// Solo cuentan los render de datos. El render de ERROR va legítimamente después
// de la hidratación, porque está en el catch: si algo falla, se pinta el error.
// La expresión anterior saltaba del try al catch y lo contaba comohydration
// antes que dibujo, que es un falso positivo.
function hidrataDespuesDeDibujar() {
  // Se recorre línea a línea en vez de con una regex: un literal multilínea aquí
  // se_parseaba raro, y además el recorrido lineal dice EN QUÉ LÍNEA está el
  // problema, que es lo que hace falta para arreglarlo.
  const lineas = renderer.split('\n');
  const efectos = [];
  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].includes('hidratarIconosHunt(')) continue;
    // El render de ERROR va legítimamente después: está en el catch, y si algo
    // falla se pinta el error. Solo cuentan los renders de datos.
    for (let k = i + 1; k < lineas.length && k <= i + 8; k++) {
      if (lineas[k].includes('renderHuntAnalyzer(panel, snapshot')
        || lineas[k].includes('renderHuntAnalyzer(panel, previewSnapshot')) {
        efectos.push(i + 1);
        break;
      }
      if (lineas[k].includes('} catch')) break;
    }
  }
  return efectos;
}
const hidratosDespues = hidrataDespuesDeDibujar();
assert.equal(hidratosDespues.length, 0,
  `Hidratan y dibujan después en las líneas ${hidratosDespues.join(", ")}. Los tres caminos tienen que dibujar primero.`);

// DOS caminos más la definición de la función, y por eso hay que excluir la definición: si se
// cuenta a pelo, la prueba pasaría con un camino y una llamada.
//
// Eran tres. El tercero era el de estadísticas —`readPanelStatistics` hidrataba los iconos
// cuando el panel de esa cuenta estaba abierto—, y esa rama se quitó entera. Si algún día
// vuelven a ser tres, es que el de estadísticas ha vuelto por la puerta de atrás.
const llamadas = renderer.split('\n').filter((una) =>
  una.includes('hidratarIconosHunt(panel') && !una.includes('function hidratarIconosHunt')).length;
assert.equal(llamadas, 2,
  `hidratarIconosHunt tiene que llamarse en los DOS caminos que quedan —la lectura del panel y el gancho de vista previa— y se ha encontrado en ${llamadas}.`);
assert.equal((renderer.match(/hydrateHuntDropIcons/g) || []).length, 0,
  'Queda alguna aparición de hydrateHuntDropIcons, que es el nombre viejo.');
assert.equal((renderer.match(/await\s+withTimeout\(\s*hidratarIconosHunt/g) || []).length, 0,
  'Queda un await con withTimeout sobre la hidratación: eso es lo que bloqueaba el sondeo 4 segundos.');

// --- El bloque protegido que dibujaba era el de estadísticas, y ya no está ------
//
// Había UN bloque `if (panel.huntOpen) { … renderHuntAnalyzer(panel, snapshot) … }`: el de
// `readPanelStatistics`, que dibujaba el panel solo si estaba abierto. Esa rama se quitó
// entera. La lectura de verdad del panel NO usa ese patrón: `refreshPanelHuntAnalyzer` sale
// temprano si el panel está cerrado, que es lo que impide que dibuje de más. El invariante
// bueno es doble: no puede quedar ningún bloque con esa guarda —si lo hay, ha vuelto el de
// estadísticas— y la lectura tiene que seguir guardándose con la salida temprana.
const anclas = [];
let desde = 0;
for (;;) {
  const at = renderer.indexOf('if (panel.huntOpen) {', desde);
  if (at < 0) break;
  anclas.push(at);
  desde = at + 1;
}
const conRender = anclas.filter((at) =>
  renderer.slice(at, at + 300).includes('renderHuntAnalyzer(panel, snapshot)'));
assert.equal(conRender.length, 0,
  `El bloque protegido que dibujaba era el de estadísticas y ya no existe; hay ${conRender.length} de ${anclas.length} posibles.`);
assert.ok(/if \(!panel\?\.huntOpen \|\| panel\.huntPreview\) return;/.test(renderer),
  'La lectura del panel tiene que salir temprano cuando el panel está cerrado: es lo que impide que dibuje de más.');

console.log('Hunt icon hydration smoke passed: dibuja antes, no espera a los iconos, no rechaza, y los tres caminos.');