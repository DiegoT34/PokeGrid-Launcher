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

// --- Turno ---------------------------------------------------------------
function almacenFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    datos,
    leer: async (k, d) => (k in datos ? datos[k] : d),
    escribir: async (k, v) => { datos[k] = v; },
    borrar: async (k) => { delete datos[k]; }
  };
}

(async () => {
  const primero = almacenFalso();
  assert.equal(await api.intentarTurno(primero, 'pagina-a', 1000), true,
    'Sin turno, la primera pagina lo coge.');
  assert.equal(await api.intentarTurno(almacenFalso(primero.datos), 'pagina-b', 1000), false,
    'Con el turno vivo, la segunda no lo coge.');

  const caducado = almacenFalso({ [api.CLAVES.turno]: { pageId: 'pagina-a', hasta: 500 } });
  assert.equal(await api.intentarTurno(caducado, 'pagina-b', 1000), true,
    'Un turno caducado lo puede coger otra pagina.');

  const propio = almacenFalso({ [api.CLAVES.turno]: { pageId: 'pagina-a', hasta: 5000 } });
  assert.equal(await api.intentarTurno(propio, 'pagina-a', 1000), true,
    'La que ya lo tiene puede renovarlo aunque no haya caducado.');

  // --- Idempotencia
  assert.equal(api.debeEjecutar('', { id: 'x1' }), true, 'Un comando nuevo se ejecuta.');
  assert.equal(api.debeEjecutar('x1', { id: 'x1' }), false, 'El mismo comando no se repite.');
  assert.equal(api.debeEjecutar('x1', { id: 'x2' }), true, 'Uno distinto si.');
  assert.equal(api.debeEjecutar('x1', null), false, 'Sin comando no hay nada que ejecutar.');

  // --- Formato del estado --------------------------------------------------
const estadoTexto = api.formatearEstado([
  { accountIndex: 0, trainerName: 'SHOCKVOR', location: 'Kanto · Ruta 12',
    leader: { nombre: 'Blastoise', nivel: 85 }, at: 1000 },
  { accountIndex: 1, trainerName: 'SHOCKOR', location: '', leader: null, at: 1000 }
], 1000);
assert.ok(estadoTexto.includes('SHOCKVOR'), 'Sale el entrenador.');
assert.ok(estadoTexto.includes('Kanto · Ruta 12'), 'Sale el sitio.');
assert.ok(estadoTexto.includes('Blastoise'), 'Sale el lider.');
assert.ok(estadoTexto.includes('sin leer'), 'Una cuenta sin sitio se marca, no se omite.');
const viejo = api.formatearEstado([
  { accountIndex: 0, trainerName: 'SHOCKVOR', location: 'Kanto', leader: null, at: 0 }
], 120_000);
assert.ok(/2 min|hace/.test(viejo), `Un dato viejo se marca con su edad: ${viejo}`);
assert.equal(api.formatearEstado([], 1000), 'No hay ninguna cuenta registrada todavía.',
  'Sin cuentas se dice, no se devuelve una cadena vacia.');

console.log('Control Telegram (puro) OK: turno e idempotencia.');
})().catch((error) => { console.error(error); process.exit(1); });
