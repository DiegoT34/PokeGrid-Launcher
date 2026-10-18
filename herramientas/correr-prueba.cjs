// Corre una prueba de Electron y guarda su salida en un fichero, sin depender de la consola.
//
// POR QUE NO VALE `node tests\lanzar.cjs <prueba>` EN UNA CONSOLA DE SEGUNDO PLANO
//
// Electron es un ejecutable de subsistema grafico: no escribe en la consola de quien lo lanza, y con la
// salida en segundo plano se perdia entera. Una prueba que reventaba salia como «no ha escrito nada»,
// que es indistinguible de una prueba que no ha llegado a empezar.asi que se perdio una hora de trabajo
// persiguiendo un fallo que no se podia ver.
//
// La solucion es la misma que usa `area-entera.ps1`: un job de PowerShell que escribe a un fichero.
// Aqui lo que hace el Electron es volcar el estado a un JSON desde dentro del propio proceso, que si
// escribe. Asi el resultado llega siempre, salga bien o mal.
//
// USO
//
//   node correr-prueba.cjs <guion-de-prueba>
//
// Ejemplo: node correr-prueba.cjs userscripts-manager-smoke.js
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const ELECTRON = path.join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');
const SALIDA = path.join(RAIZ, '.superpowers', 'salida-prueba.txt');

const guion = process.argv[2];
if (!guion) {
  console.error('uso: node correr-prueba.cjs <guion-de-prueba>');
  process.exit(2);
}

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
if (fs.existsSync(SALIDA)) fs.unlinkSync(SALIDA);

// `stdio: 'ignore'` NO vale: Electron escribe el error por `console.error`, y al ignorarlo se pierde
// justo lo que hay que ver. Con `pipe` se recoge y se guarda en el fichero, y si la prueba tambien
// escribe, se leen las dos.
//
// La primera version de este guion usaba `ignore` y daba «vacia: la prueba no escribio nada» con la
// prueba reventando de verdad. Un corredor de pruebas que no enseña el fallo no sirve de nada.
const hijo = spawn(ELECTRON, [guion], { cwd: RAIZ, stdio: 'pipe' });

let capturado = '';
hijo.stdout.on('data', (trozo) => { capturado += trozo.toString(); });
hijo.stderr.on('data', (trozo) => { capturado += trozo.toString(); });

hijo.on('close', (codigo) => {
  const deLaPrueba = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, capturado + (deLaPrueba ? '\n--- de la prueba ---\n' + deLaPrueba : ''), 'utf8');

  console.log(`codigo de salida: ${codigo}`);
  console.log('--- salida ---');
  console.log(capturado.trim() || '(vacia)');
  if (deLaPrueba) {
    console.log('--- de la prueba ---');
    console.log(deLaPrueba.trim());
  }
  console.log('--- fin ---');
  process.exit(codigo === null ? 1 : codigo);
});