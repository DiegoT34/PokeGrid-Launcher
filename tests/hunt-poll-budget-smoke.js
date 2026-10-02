const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// --- La frecuencia es una constante con nombre, y es 3.000 --------------------
const lineaSondeo = renderer.split('\n').find((una) => una.includes('setInterval(pollHuntAnalyzers'));
assert.ok(lineaSondeo, 'No encuentro el setInterval de pollHuntAnalyzers.');
assert.ok(lineaSondeo.includes('HUNT_SONDEO_MS'),
  `La frecuencia tiene que ser una constante con nombre, no un número suelto. La línea es: ${lineaSondeo.trim()}`);

const constante = renderer.split('\n').find((una) => /const HUNT_SONDEO_MS\s*=\s*\d+/.test(una));
assert.ok(constante, 'Falta la constante HUNT_SONDEO_MS.');
assert.equal(Number(constante.match(/=\s*(\d+)/)[1]), 3000,
  'La frecuencia tiene que ser 3000 ms. Hoy es 1500 y es el único sondeo por debajo de 3000.');

// --- Ningún sondeo PERMANENTE por debajo de 3.000 ----------------------------
// Se mira el bloque de sondeos del final del fichero, no todo setInterval: hay un
// reintento de 2.000 ms en renderer.js:2841 que se cancela solo en cuanto
// subscribeToFieldKills() tiene éxito, y ese no es un sondeo permanente.
// updatePanelLiveClocks a 1.000 es el único permitido por debajo: solo pone texto
// en el reloj y no lee nada del juego.
const anclaSondeos = renderer.lastIndexOf('window.setInterval(updatePanelLiveClocks');
assert.ok(anclaSondeos > 0, 'No encuentro el bloque de sondeos del final del fichero.');
const bloqueSondeos = renderer.slice(Math.max(0, anclaSondeos - 400));
const sondeos = bloqueSondeos.match(/window\.setInterval\(([\s\S]{0,120}?),\s*(\d+|HUNT_SONDEO_MS)\)/g) || [];
const valores = sondeos.map((una) => una.match(/,\s*(\d+|HUNT_SONDEO_MS)\)$/)[1]);
const rapidos = valores.filter((ms) => ms !== 'HUNT_SONDEO_MS' && Number(ms) < 3000);
assert.deepEqual(rapidos, ['1000'],
  `En el bloque de sondeos solo updatePanelLiveClocks puede estar por debajo de 3000. Valores: ${JSON.stringify(valores)}`);

// Y que el bloque conserva los cinco sondeos que había, para que la comprobación
// no se quede vacía si alguien reorganiza el final del fichero.
assert.ok(valores.length >= 5,
  `El bloque de sondeos tiene ${valores.length} entradas y debería tener al menos 5. Si se reorganizó, esta prueba ya no vigila lo que cree vigilar.`);

// --- El script cachea el diálogo en vez de buscarlo cada vuelta --------------
const script = renderer.slice(renderer.indexOf('function huntAnalyzerSnapshotScript'));
const bloque = script.slice(0, 3000);
assert.ok(bloque.includes('__pokeGridHuntDialogo'),
  'El script tiene que guardar el diálogo encontrado en una variable de la webview y reutilizarlo.');
assert.ok(/if \(dialogo && !dialogo\.isConnected\)/.test(bloque) || /dialogo\.isConnected/.test(bloque),
  'La caché tiene que comprobar que el diálogo sigue en el DOM: si el juego lo reemplaza, hay que buscarlo otra vez. Un elemento desconectado daría datos viejos.');

// Y NO puede buscarlo siempre, que es lo caro.
assert.ok(!/^\s*(?:const|let)\s+dialog\s*=\s*findDialog\(\);/m.test(bloque),
  'El diálogo se sigue buscando sin condición: eso es lo caro, con su querySelectorAll y su sort().');
assert.ok(!/^\s*let\s+dialogo\s*=\s*findDialog\(\);/m.test(bloque),
  'let dialogo = findDialog() busca siempre. Tiene que ser condicional.');

// --- Y el diálogo que se esconde y se lee es el que se guarda ----------------
// Si se guarda uno y se lee otro, la caché no sirve de nada y no se nota.
const guarda = bloque.slice(bloque.indexOf('__pokeGridHuntDialogo'), bloque.indexOf('__pokeGridHuntDialogo') + 300);
assert.ok(/findDialog\(\)/.test(guarda),
  'El diálogo guardado tiene que salir de findDialog(), que es el que sabe cuál es.');
assert.ok(/^\s*(?:const|let)\s+dialog\s*=\s*dialogo\s*;/m.test(bloque),
  'La variable que se usa después tiene que ser la cacheada, no una búsqueda nueva.');

// --- El perfil de coste, con el control al lado ------------------------------
// Sin redondear. Con ocho cuentas, 8000/1500 = 5,33 y 8000/3000 = 2,67: la mitad
// exacta. Redondeando a 5 y 3, el 3×2=6 sale mayor que el 5 y la comparación de "la
// mitad" mide el redondeo, no el cambio. Una prueba que falla por el redondeo
// entrena a ignorar la prueba.
const tasa = (cuentas, intervalo) => (cuentas * 1000) / intervalo;

// El control es lo importante: si el valor viejo cambia sin querer, la comparación
// de "la mitad" no significa nada.
assert.equal(tasa(1, 1500), 2 / 3, 'Control: una cuenta cada 1500 ms son 0,67 llamadas por segundo.');
assert.equal(tasa(8, 1500), 16 / 3, 'Control: ocho cuentas cada 1500 ms son 5,33 por segundo.');
assert.equal(tasa(8, 3000), 8 / 3, 'Ocho cuentas cada 3000 ms son 2,67 por segundo.');

// Y el objetivo, medido: la mitad.
assert.ok(tasa(8, 3000) * 2 <= tasa(8, 1500),
  `Con ocho cuentas la carga tiene que bajar a la mitad o menos: ${tasa(8, 3000)} contra ${tasa(8, 1500)}.`);

// Con el diálogo cacheado, el trabajo por vuelta ya no crece linealmente con el
// número de candidatos: el querySelectorAll y su sort() solo corren la primera vez
// por webview. Este es el otro lado del arreglo y no se puede medir sin el juego,
// así que aquí lo que se comprueba es que la búsqueda es condicional.
assert.ok(!/let\s+dialog\s*=\s*findDialog\(\);/.test(bloque),
  'El diálogo se sigue buscando sin condición, y con ocho cuentas eso son ocho querySelectorAll por vuelta.');

console.log('Hunt poll budget smoke passed: 3000 ms, sin sondeos rápidos nuevos, diálogo cacheado y carga a la mitad.');