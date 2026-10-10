// Comprueba las expresiones nuevas del verificador contra el árbol, y contra el árbol
// saboteado. No se puede usar el verificador entero porque necesita un ZIP al día, y el que
// hay es de antes de estos arreglos.
//
// Los sabotajes se hacen sobre el texto normalizado a `\n` y con una comprobación de que el
// ancla casa. Un ancla escrita con `\n` sobre un fichero CRLF no sustituye nada, y entonces el
// caso sale VERDE sin haber comprobado nada: eso ya ha pasado tres veces en este trabajo.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const lf = (t) => t.split('\r\n').join('\n');

// Un sabotaje que no cambia el texto es un sabotaje que no ha probado nada.
function sustituir(texto, ancla, valor) {
  if (!texto.includes(ancla)) throw new Error(`El ancla no casa:\n${JSON.stringify(ancla.slice(0, 140))}`);
  const salida = texto.replace(ancla, valor);
  if (salida === texto) throw new Error(`El sabotaje no cambió nada:\n${JSON.stringify(ancla.slice(0, 140))}`);
  return salida;
}

// El cuerpo de una función, por conteo de llaves. Las expresiones no sirven aquí: hay que
// quedarse dentro de la función y no mirar el resto del fichero, que sí puede tener un
// formateador parecido y no tendría nada que ver.
function cuerpoDe(texto, encabezado) {
  const desde = texto.indexOf(encabezado);
  if (desde < 0) throw new Error(`No encuentro ${encabezado}`);
  const abre = texto.indexOf('{', desde);
  let nivel = 0;
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') nivel++;
    else if (texto[i] === '}') {
      nivel--;
      if (nivel === 0) return texto.slice(abre, i + 1);
    }
  }
  throw new Error(`La función ${encabezado} no cierra`);
}

function medir({ credenciales, renderer }) {
  const cuerpoReloj = cuerpoDe(lf(renderer), 'function updatePanelLiveClocks()');
  return {
    sinFicheroCeroCuentas: /accounts: \[\],\s*\n\s*source: 'none'/.test(lf(credenciales)),
    sinDefaults: !/\bdefaults\b/.test(credenciales),
    filasEnBlanco: /if \(!accounts\.length\) \{\s*\n\s*for \(let index = 0; index < DEFAULT_ACCOUNT_COUNT/.test(lf(renderer)),
    abreModal: /\} else if \(!accounts\.length\) \{/.test(renderer),
    unaDefinicionDeDentroDelJuego: (renderer.match(/function panelDentroDelJuego\(/g) || []).length === 1,
    capturasUsaLaRegla: /if \(!panelDentroDelJuego\(panel\)\) return;/.test(renderer),
    farmeoUsaLaRegla: /if \(!panelDentroDelJuego\(panel\)\) \{/.test(renderer),
    sinClicOpcionalConEspera: !/(trigger|logButton)\?\.click\(\);/.test(renderer),
    // El reloj de un segundo no puede fabricar un formateador por vuelta. Se mide y da
    // 0,55 ms cada vez: a una por segundo son 2 s de CPU por hora. Poco, pero es trabajo
    // que no sirve para nada y se paga en cada arranque de cada usuario.
    relojSinFormateadorNuevo: !/new Intl\.DateTimeFormat/.test(cuerpoReloj)
  };
}

const credencialesSanos = leer('src/credentials.js');
const rendererSano = leer('src/renderer.js');
const sano = { credenciales: credencialesSanos, renderer: rendererSano };

const casos = [
  ['el árbol de ahora, sano', sano, { todos: true }],
  ['vuelven las cuatro cuentas por defecto',
    {
      credenciales: sustituir(lf(credencialesSanos),
        "      accounts: [],\n      source: 'none',",
        "      accounts: normalize(Array.from({ length: 4 }, (_, index) => ({ id: index + 1 }))),\n      source: 'defaults',"),
      renderer: rendererSano
    },
    { sinFicheroCeroCuentas: false, sinDefaults: false }],
  ['se quita el relleno de filas de la ventana de cuentas',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), '  if (!accounts.length) {', '  if (false) {')
    },
    { filasEnBlanco: false }],
  ['el sondeo de capturas vuelve a mirar solo el origen',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), 'if (!panelDentroDelJuego(panel)) return;',
        'if (!panel.webview.getURL().startsWith(GAME_ORIGIN)) return;')
    },
    { capturasUsaLaRegla: false }],
  ['el sondeo del farmeo deja de usar la regla compartida',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), 'if (!panelDentroDelJuego(panel)) {',
        "if (!panel.webview.getURL().startsWith(GAME_ORIGIN) || new URL(panel.webview.getURL()).pathname === '/login') {")
    },
    { farmeoUsaLaRegla: false }],
  ['se duplica la regla, que es como se separan',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), 'if (!panelDentroDelJuego(panel)) return;',
        'if (!panelDentroDelJuego(panel)) return;\nfunction panelDentroDelJuego(p) { return true; }')
    },
    { unaDefinicionDeDentroDelJuego: false }],
  ['vuelve el clic opcional con espera incondicional',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), '        if (trigger) {\n          trigger.click();',
        '        if (true) {\n          trigger?.click();')
    },
    { sinClicOpcionalConEspera: false }],
  ['el reloj de un segundo vuelve a fabricar un formateador por vuelta',
    {
      credenciales: credencialesSanos,
      renderer: sustituir(lf(rendererSano), 'function updatePanelLiveClocks() {\n  const now = Date.now();',
        "function updatePanelLiveClocks() {\n  const now = Date.now();\n  const porVuelta = new Intl.DateTimeFormat('es', { hour: '2-digit' });")
    },
    { relojSinFormateadorNuevo: false }]
];

const CLAVES = ['sinFicheroCeroCuentas', 'sinDefaults', 'filasEnBlanco', 'abreModal', 'unaDefinicionDeDentroDelJuego', 'capturasUsaLaRegla', 'farmeoUsaLaRegla', 'sinClicOpcionalConEspera', 'relojSinFormateadorNuevo'];
const SABOTAJES = casos.length - 1;
console.log(`${CLAVES.length} invariantes y ${SABOTAJES} sabotajes: cuentas por defecto, filas de la ventana, regla compartida, clic opcional y el reloj de un segundo\n`);
let mal = 0;
for (const [que, fuentes, espera] of casos) {
  const m = medir(fuentes);
  const problemas = [];
  if (espera.todos) {
    for (const k of CLAVES) if (!m[k]) problemas.push(`${k} debería ser verdadero y sale ${m[k]}`);
  } else {
    for (const [k, v] of Object.entries(espera)) if (m[k] !== v) problemas.push(`${k}: ${m[k]}, se esperaba ${v}`);
  }
  if (problemas.length) mal++;
  console.log(`  ${problemas.length ? 'FALTA' : 'ok  '} ${que}`);
  for (const p of problemas) console.log(`     ↳ ${p}`);
}
console.log(mal === 0
  ? `\nlas ${CLAVES.length} expresiones dicen lo que tienen que decir, y muerden en los ${SABOTAJES} sabotajes`
  : `\n${mal} casos con problemas`);
process.exit(mal === 0 ? 0 : 1);
