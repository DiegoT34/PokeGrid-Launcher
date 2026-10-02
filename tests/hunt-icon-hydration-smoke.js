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

// Tres caminos más la definición de la función: cuatro apariciones en total. Si se
// cuenta a pelo son cuatro, y por eso hay que excluir la definición o la prueba
// pasa con dos caminos y dos llamadas.
const llamadas = renderer.split('\n').filter((una) =>
  una.includes('hidratarIconosHunt(panel') && !una.includes('function hidratarIconosHunt')).length;
assert.equal(llamadas, 3,
  `hidratarIconosHunt tiene que llamarse en los tres caminos (renderer.js:4651, 7714 y 10035) y se ha encontrado en ${llamadas}.`);
assert.equal((renderer.match(/hydrateHuntDropIcons/g) || []).length, 0,
  'Queda alguna aparición de hydrateHuntDropIcons, que es el nombre viejo.');
assert.equal((renderer.match(/await\s+withTimeout\(\s*hidratarIconosHunt/g) || []).length, 0,
  'Queda un await con withTimeout sobre la hidratación: eso es lo que bloqueaba el sondeo 4 segundos.');

// --- Cada camino dibuja UNA vez, y el legacy con su guarda --------------------
// El legacy protege el dibujo con `if (panel.huntOpen)`, porque antes se añadió
// una segunda llamada sin guarda y el panel se dibujaba con el cerrado. Es el
// fallo que más fácilmente se cuela al reordenar líneas.
//
// Se ancla al `if (panel.huntOpen)` y NO a `huntFresh = true`, porque esa línea
// sale dos veces: en la ruta de caché, que no dibuja, y en la de lectura, que sí.
// Anclar a la primera comprobaba el bloque equivocado sin decir nada.
// Se busca el `if (panel.huntOpen)` que CONTIENE el render, no el primero:
// renderer.js tiene varios con ese mismo texto, y el primero está en
// setHuntAnalyzerOpen, que no dibuja nada. Anclar al primero comprobaba el
// bloque equivocado sin decir nada.
{
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
  assert.equal(conRender.length, 1,
    `Se esperaba un solo bloque protegido que dibuje, y hay ${conRender.length} de ${anclas.length} posibles.`);
  const bloque = renderer.slice(conRender[0], conRender[0] + 300);
  assert.equal((bloque.match(/renderHuntAnalyzer\(panel/g) || []).length, 1,
    'El camino legacy tiene que dibujar exactamente una vez dentro de la guarda.');
  assert.ok(/if \(panel\.huntOpen\)\s*\{[\s\S]{0,200}?renderHuntAnalyzer\(panel, snapshot\);[\s\S]{0,120}?hidratarIconosHunt\(panel, snapshot\);/.test(bloque),
    'El legacy tiene que dibujar e hidratar dentro de `if (panel.huntOpen)`: si dibuja con el panel cerrado, aparece un panel que el usuario cerró.');
}

console.log('Hunt icon hydration smoke passed: dibuja antes, no espera a los iconos, no rechaza, y los tres caminos.');