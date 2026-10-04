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

const hijo = spawn(electron, [guion], { stdio: 'inherit', cwd: RAIZ });
hijo.on('close', (codigo) => process.exit(codigo === null ? 1 : codigo));
