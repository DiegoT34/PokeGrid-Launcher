'use strict';

// Ejecuta las suites smoke del repositorio. Sin dependencias externas.
//
//   node scripts/run-tests.cjs            # node + electron
//   node scripts/run-tests.cjs node       # solo Node (rápido, sin ventana)
//   node scripts/run-tests.cjs electron   # solo Electron
//
// Código de salida 0 = todas pasan, 1 = alguna falla.

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const electronBinary = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const SUITE_TIMEOUT_MS = 180_000;
const MODES = ['node', 'electron', 'all'];

// Suites excluidas, con el motivo. Cada exclusión debe ser deliberada:
// o el fichero está en .gitignore (tests de scripts personales del autor),
// o requiere red y credenciales, o está roto por el entorno.
const EXCLUDED = new Map([
  ['better-market-hunt-sale-smoke.js', 'script personal del autor; pinea una versión obsoleta'],
  ['better-market-iv-calculator-smoke.js', 'script personal del autor; está en .gitignore'],
  ['better-market-no-alerts-smoke.js', 'script personal del autor; está en .gitignore'],
  ['better-market-redesign-visual-smoke.js', 'script personal del autor; está en .gitignore'],
  ['better-market-window-scales-smoke.js', 'script personal del autor; está en .gitignore'],
  ['breeding-second-parent-smoke.js', 'script personal del autor; está en .gitignore'],
  ['chat-translator-smoke.js', 'script personal del autor; está en .gitignore'],
  ['custom-card-event-bars-smoke.js', 'script personal del autor; está en .gitignore'],
  ['custom-card-responsive-settings-smoke.js', 'script personal del autor; está en .gitignore'],
  ['capture-api-history-diagnostic.js', 'diagnóstico contra el juego real, no es una prueba'],
  ['capture-live-diagnostic.js', 'diagnóstico contra el juego real, no es una prueba'],
  ['farm-live-diagnostic.js', 'diagnóstico contra el juego real, no es una prueba'],

  // Criterio: la suite necesita una dependencia que este proyecto no tiene.
  ['portable-depot.smoke.cjs', 'requiere playwright, que no es dependencia de este proyecto'],

  ['launcher-updater-integration.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['launcher-updater-detached-integration.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['script-shop-live-smoke.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['memory-cleanup-safety-smoke.js', 'se reescribe en el Plan 2; se excluye hasta entonces'],
  ['userscript-network-smoke.js', 'se reescribe en el Plan 2; se excluye hasta entonces']
]);

function classify(source) {
  if (/^\s*\/\/ ==UserScript==/m.test(source) || /require\(['"]electron['"]\)/.test(source)) {
    return 'electron';
  }
  return 'node';
}

function discover() {
  const dir = path.join(root, 'tests');
  const rows = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('-smoke.js') && !name.endsWith('.smoke.cjs')) continue;
    if (EXCLUDED.has(name)) continue;
    const file = path.join(dir, name);
    const source = fs.readFileSync(file, 'utf8');
    rows.push({ name, file, kind: classify(source) });
  }
  return rows;
}

// taskkill /T solo alcanza a los hijos si el padre sigue vivo, así que el
// timeout se gestiona aquí y no con la opción timeout de spawnSync: esta
// mataría antes al hijo directo y dejaría el árbol huérfano.
function killProcessTree(pid) {
  const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  // Sin esto, un taskkill que no arranca se reportaría como "no se llegó al
  // árbol", culpando al árbol del fallo real: no se pudo lanzar la herramienta.
  if (result.error) {
    console.error(`taskkill no se pudo ejecutar: ${result.error.message}`);
    return false;
  }
  return result.status === 0;
}

function run({ name, file, kind }) {
  return new Promise((resolve) => {
    const command = kind === 'electron' ? electronBinary : process.execPath;
    const args = [file];
    const child = spawn(command, args, { stdio: 'inherit', cwd: root });
    let settled = false;

    const timer = setTimeout(() => {
      settled = true;
      console.error(`[${name}] se pasó de ${SUITE_TIMEOUT_MS / 1000} s.`);
      const killed = killProcessTree(child.pid);
      if (killed) {
        console.error(`[${name}] árbol de procesos terminado: taskkill /PID ${child.pid} /T /F`);
      } else {
        // El process.exit(1) de la rama de fallo ya tapaba el cuelgue, sin ser para esto:
        // un cuelgue en CI es peor que un test rojo.
        try { child.kill(); } catch {}
        child.unref();
        console.error(`[${name}] no se pudo terminar el árbol; se intentó matar solo el proceso hijo ${child.pid}`);
      }
      resolve(false);
    }, SUITE_TIMEOUT_MS);

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error(`[${name}] no se pudo ejecutar ${command}: ${error.message}`);
      resolve(false);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}

async function main() {
  const mode = String(process.argv[2] || 'all').toLowerCase();
  if (!MODES.includes(mode)) {
    console.error(`Modo "${mode}" no válido. Los modos válidos son: ${MODES.join(', ')}.`);
    process.exit(1);
  }

  const wanted = mode === 'all' ? ['node', 'electron'] : [mode];

  // Sin binario no hay suites ejecutables: se dice por qué, en vez de dejar que
  // las 18 de Electron fallen sin diagnóstico.
  if (wanted.includes('electron') && !fs.existsSync(electronBinary)) {
    console.error(`No se encontró el binario de Electron: ${electronBinary}`);
    console.error('Instala las dependencias del proyecto y vuelve a intentarlo: npm install');
    process.exit(1);
  }

  const suites = discover().filter((suite) => wanted.includes(suite.kind));

  if (!suites.length) {
    console.error('No se encontró ninguna suite. Revisa tests/ y la lista EXCLUDED.');
    process.exit(1);
  }

  const failures = [];
  for (const suite of suites) {
    console.log(`\n=== ${suite.name} (${suite.kind}) ===`);
    if (!(await run(suite))) failures.push(suite.name);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${suites.length - failures.length}/${suites.length} suites verdes.`);
  if (failures.length) {
    console.error(`FALLAN: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('Todo verde.');
}

// Sin esto, una excepción pendiente sería una unhandled rejection: Node la
// imprime, pero el mensaje y el código de salida los pone el runner, no Node.
main().catch((error) => {
  console.error(`El runner falló con un error inesperado: ${error && error.message ? error.message : error}`);
  process.exit(1);
});
