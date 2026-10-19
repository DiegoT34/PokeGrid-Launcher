// Lanza un script de Electron y deja que su salida llegue a esta consola.
//
// `spawnSync` no sirve: el ejecutable de Electron es de subsistema gráfico y no escribe
// en la consola de quien lo lanza. `stdio: 'inherit'` sí, que es lo que hace el corredor
// de pruebas del proyecto.
const { spawn } = require('node:child_process');
const path = require('node:path');

// La raíz es un nivel arriba: este guion vive en `tests/`, y con `__dirname` buscaba el
// ejecutable de Electron en `tests/node_modules/…` y no lo encontraba.
const RAIZ = path.join(__dirname, '..');
const electron = path.join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');
const guion = process.argv[2];

if (!guion) {
  console.error('uso: node lanzar.cjs <guion>');
  process.exit(2);
}

// Los argumentos que van DETRAS del guion se le pasan al guion.
//
// Sin esto, `node tests\lanzar.cjs herramientas\algo.cjs preview` ejecutaba el guion SIN `preview` y
// caia en el modo por defecto. No daba ningun error: el guion se ejecutaba, escribia su salida, y el
// resultado era el otro. Paso dos veces —una con una carpeta de salida que se ignoraba en silencio y
// otra con el modo equivocado— y las dos veces no se caia en cuenta hasta mirar el fichero equivocado.
const argumentos = process.argv.slice(3);

const hijo = spawn(electron, [guion, ...argumentos], { stdio: 'inherit', cwd: RAIZ });
hijo.on('close', (codigo) => process.exit(codigo === null ? 1 : codigo));
