const assert = require('node:assert/strict');
const {
  CAPTURAS_LIMITE,
  esCapturaDeShop,
  planCapturas
} = require('../src/script-shop-screenshots');

const RAIZ = 'https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop';
const buena = (nombre) => `${RAIZ}/main/screenshots/${nombre}`;
const id = 'market-helper';

// --- Qué se acepta -------------------------------------------------------------------
assert.equal(esCapturaDeShop(buena('market-helper-1.png'), id), true, 'Una captura normal se acepta.');
assert.equal(esCapturaDeShop(buena('market-helper-2.jpg'), id), true, 'Los jpg también.');
assert.equal(esCapturaDeShop(buena('market-helper-3.JPEG'), id), true, 'La extensión no distingue mayúsculas.');
assert.equal(esCapturaDeShop(buena('market-helper-4.webp'), id), true, 'Los webp también.');
assert.equal(esCapturaDeShop(buena('market-helper-5.gif'), id), true, 'Los gif también.');
assert.equal(esCapturaDeShop(`${RAIZ}/${'a'.repeat(40)}/screenshots/market-helper-1.png`, id), true,
  'Un commit de 40 hexadecimales vale igual que main: es lo que hace assertScriptShopDownloadUrl.');
assert.equal(esCapturaDeShop(buena('market-helper-1.png')), true,
  'Sin id se acepta si el nombre encaja; quien exige el prefijo es quien llama con id.');

// --- Qué se rechaza, y por qué --------------------------------------------------------
// Cada motivo es una razon distinta, y por eso hay una linea por motivo y no una sola.
const rechazos = [
  ['otra rama corta', `${RAIZ}/dev/screenshots/market-helper-1.png`, 'Una rama suelta no vale.'],
  ['sha de 39 hexadecimales', `${RAIZ}/${'a'.repeat(39)}/screenshots/market-helper-1.png`, 'Un sha de 39 no vale.'],
  ['otro repositorio', 'https://raw.githubusercontent.com/Otro/Repo/main/screenshots/market-helper-1.png', 'Solo el repositorio oficial.'],
  ['otra carpeta', `${RAIZ}/main/otra/market-helper-1.png`, 'Solo dentro de screenshots/.'],
  ['http', 'http://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png', 'Nada de http.'],
  ['con query', `${buena('market-helper-1.png')}?v=1`, 'Con query no vale.'],
  ['con fragmento', `${buena('market-helper-1.png')}#x`, 'Con fragmento no vale.'],
  ['con credenciales', `https://user:pass@raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/market-helper-1.png`, 'Con credenciales no vale.'],
  ['otra extension', buena('market-helper-1.exe'), 'Solo imagenes.'],
  ['sin extension', buena('market-helper-1'), 'Sin extension no se sabe que es.'],
  ['id equivocado', buena('otro-script-1.png'), 'No puede usar las capturas de otro script.']
];
for (const [nombre, url, motivo] of rechazos) {
  assert.equal(esCapturaDeShop(url, id), false, `${nombre}: ${motivo} (${url})`);
}

// Textos raros que tienen que salir sin reventar.
for (const raro of [null, undefined, '', 'no-es-una-url', 42, {}]) {
  assert.equal(esCapturaDeShop(raro, id), false, `Con ${JSON.stringify(raro) ?? 'undefined'} se rechaza sin reventar.`);
}

// --- El plan -------------------------------------------------------------------------
const sinCapturas = planCapturas({ id: 'x', screenshots: [] });
assert.deepEqual(sinCapturas, { tiene: false, total: 0, urls: [] }, 'Sin capturas no hay galería.');

const ausentes = planCapturas({ id: 'x' });
assert.deepEqual(ausentes, { tiene: false, total: 0, urls: [] }, 'El campo puede no existir.');

const conTres = planCapturas({ id: 'x', screenshots: [buena('x-1.png'), buena('x-2.png'), buena('x-3.png')] });
assert.equal(conTres.tiene, true, 'Con capturas hay galería.');
assert.equal(conTres.total, 3, 'Y se cuentan.');
assert.equal(conTres.urls.length, 3, 'Y se devuelven.');

// Más de 6: se recortan, no se rompe nada.
const muchas = Array.from({ length: 12 }, (_, i) => buena(`x-${i + 1}.png`));
const recortado = planCapturas({ id: 'x', screenshots: muchas });
assert.equal(CAPTURAS_LIMITE, 6, `El tope son 6 capturas, no ${CAPTURAS_LIMITE}.`);
assert.equal(recortado.total, 6, 'Con 12 capturas se muestran 6.');
assert.deepEqual(recortado.urls, muchas.slice(0, 6), 'Y son las 6 primeras, en orden.');

// El orden es el del catálogo: es el orden en que se enseñan.
assert.deepEqual(recortado.urls[0], muchas[0], 'La primera del catálogo es la primera que se ve.');

// No muta lo que recibe.
const entrada = { id: 'x', screenshots: muchas.slice() };
const antes = entrada.screenshots.slice();
planCapturas(entrada);
assert.deepEqual(entrada.screenshots, antes, 'No se puede recortar el array del catálogo en sitio.');

// --- Lo que el cargador va a necesitar ------------------------------------------------
// La comprobación que se hace dentro, repetida por fuera con una cadena, es la que usa el
// proceso principal. Si divergieran, el cargador aceptaría algo que el catálogo ya
// descartó, o al revés.
assert.equal(esCapturaDeShop(buena('market-helper-1.png'), id), esCapturaDeShop(new URL(buena('market-helper-1.png')), id),
  'La comprobación tiene que dar lo mismo con cadena y con URL.');

console.log('Script shop screenshots smoke passed: aceptadas, rechazadas por motivo, plan y recorte a 6.');
