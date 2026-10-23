// Pruebas puras del control por Telegram. Sin DOM y sin Electron: se carga el fuente del script en
// un contexto de `node:vm` con dobles de GM_* y se prueban las funciones que no tocan la pagina.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.join(__dirname, '..');
const codigo = fs.readFileSync(
  path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');

function cargar() {
  const contexto = vm.createContext({
    __PG_CONTROL_TEST__: true,
    console,
    setTimeout,
    clearTimeout,
    crypto: { randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }
  });
  vm.runInContext(codigo, contexto, { filename: 'control-telegram.user.js' });
  return contexto.__pgControl;
}

const api = cargar();
assert.ok(api, 'El script tiene que exponer sus funciones puras cuando se carga para pruebas.');

// Los objetos que devuelve el script nacen en OTRO reino (el contexto de `vm`), asi que su prototipo
// no es el `Object.prototype` de este fichero y `deepStrictEqual` los rechaza aunque se vean iguales.
// Se comparan como JSON, que es lo que de verdad importa aqui.
const plano = (valor) => JSON.parse(JSON.stringify(valor));
const igual = (actual, esperado, mensaje) => assert.deepEqual(plano(actual), plano(esperado), mensaje);

// --- Comandos
igual(api.parsearComando('/ir blastoise'),
  { accion: 'ir', argumento: 'blastoise' });
igual(api.parsearComando('/ir@MiBot Blastoise'),
  { accion: 'ir', argumento: 'Blastoise' },
  'Telegram añade @nombreDelBot cuando el bot está en un grupo.');
igual(api.parsearComando('/estado'),
  { accion: 'estado', argumento: '' });
igual(api.parsearComando('hola'),
  { accion: '', argumento: '' },
  'Un texto suelto sin barra no es un comando.');
igual(api.parsearComando('/ir'),
  { accion: 'ir', argumento: '' });

// --- Busqueda
const catalogo = [
  { slug: 'blastoise', nombre: 'Blastoise', mapa: 'Kanto', zona: 'Ruta 12', nivel: 45 },
  { slug: 'blastoise-orre', nombre: 'Blastoise', mapa: 'Orre', zona: 'Cueva', nivel: 60 },
  { slug: 'charizard', nombre: 'Charizard', mapa: 'Kanto', zona: 'Ruta 3', nivel: 40 },
  // Con tilde a proposito: el catalogo del juego las trae y el usuario escribe sin ellas la mitad de
  // las veces. Sin normalizar los dos lados, «pokemon» no encuentra «Pokémon» nunca.
  { slug: 'pokemon-x', nombre: 'Pokémon X', mapa: 'Kanto', zona: 'Ruta 1', nivel: 10 }
];
assert.equal(api.buscarHunts(catalogo, 'blast').length, 2);
assert.equal(api.buscarHunts(catalogo, 'BLASTOISE').length, 2, 'La busqueda no distingue mayusculas.');
assert.equal(api.buscarHunts(catalogo, 'char').length, 1);
assert.equal(api.buscarHunts(catalogo, 'pokemon').length, 1, 'Buscar sin tilde encuentra lo que la tiene.');
assert.equal(api.buscarHunts(catalogo, 'POKÉMON').length, 1, 'Y buscar con tilde tambien.');
assert.equal(api.buscarHunts(catalogo, 'zzz').length, 0);
assert.equal(api.buscarHunts(catalogo, '').length, 0, 'Sin texto no se devuelve el catalogo entero.');
assert.equal(api.buscarHunts(catalogo, 'blast', 1).length, 1, 'El limite se respeta.');

// --- Normalizacion de configuracion
igual(api.normalizarConfig(null),
  { token: '', autorizados: [], orre: false });
igual(api.normalizarConfig({ token: 'abc', autorizados: ['1', 1, 'x'], orre: true }),
  { token: 'abc', autorizados: ['1', 'x'], orre: true },
  'Los ids se normalizan a texto sin repetir.');
igual(api.normalizarConfig({ token: '  123:AAA  ' }).token, '123:AAA');

// --- Barra de seguridad
assert.equal(api.autorizado({ autorizados: ['111'] }, 111), true, 'El id se compara como texto.');
assert.equal(api.autorizado({ autorizados: ['111'] }, '222'), false, 'Otro id no entra.');
assert.equal(api.autorizado({ autorizados: [] }, 111), false, 'Sin lista, nadie entra.');
assert.equal(api.autorizado({}, 111), false, 'Una configuracion rota no autoriza a nadie.');

// --- Botones
igual(api.parsearCallback('a:estado'), { tipo: 'estado' });
igual(api.parsearCallback('h:abc123:2'),
  { tipo: 'elegirCuenta', corto: 'abc123', indice: 2 });
igual(api.parsearCallback('a:abc123:2:todas'),
  { tipo: 'viajar', corto: 'abc123', indice: 2, destino: 'todas' });
igual(api.parsearCallback('a:abc123:0:pagina-9'),
  { tipo: 'viajar', corto: 'abc123', indice: 0, destino: 'pagina-9' });
igual(api.parsearCallback('basura'), { tipo: '' },
  'Un boton que no se reconoce no puede interpretarse como una orden.');
igual(api.parsearCallback('a:abc123:2:todas'),
  api.parsearCallback('a:abc123:2:todas'),
  'El mismo boton siempre da lo mismo.');

console.log('Control Telegram (puro) OK: comandos, busqueda, configuracion, seguridad y botones.');
