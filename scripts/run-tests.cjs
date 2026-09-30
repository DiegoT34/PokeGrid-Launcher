'use strict';

// Ejecuta las suites smoke del repositorio. Sin dependencias externas.
//
//   node scripts/run-tests.cjs            # node + electron
//   node scripts/run-tests.cjs node       # solo Node (rapido, sin ventana)
//   node scripts/run-tests.cjs electron   # solo Electron
//
// Exit code 0 = todas pasan, 1 = alguna falla.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const electronBinary = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');

// Suites excluidas, con el motivo. Cada exclusion debe ser deliberada:
// o el fichero esta en .gitignore (tests de scripts personales del autor),
// o requiere red y credenciales, o esta roto por el entorno.
const EXCLUDED = new Map([
  ['better-market-hunt-sale-smoke.js', 'script personal del autor; pinea una version obsoleta'],
  ['better-market-iv-calculator-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-no-alerts-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-redesign-visual-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-window-scales-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['breeding-second-parent-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['chat-translator-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['custom-card-event-bars-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['custom-card-responsive-settings-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['capture-api-history-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],
  ['capture-live-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],
  ['farm-live-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],

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
    if (/^\s*fixture/m.test(name)) continue;
    rows.push({ name, file, kind: classify(source) });
  }
  return rows;
}

function run({ file, kind }) {
  const command = kind === 'electron' ? electronBinary : process.execPath;
  const args = kind === 'electron' ? [file] : [file];
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: root, timeout: 180_000 });
  return result.status === 0;
}

const mode = String(process.argv[2] || 'all').toLowerCase();
const wanted = mode === 'node' ? ['node'] : mode === 'electron' ? ['electron'] : ['node', 'electron'];
const suites = discover().filter((suite) => wanted.includes(suite.kind));

if (!suites.length) {
  console.error('No se encontró ninguna suite. Revisa tests/ y la lista EXCLUDED.');
  process.exit(1);
}

const failures = [];
for (const suite of suites) {
  console.log(`\n=== ${suite.name} (${suite.kind}) ===`);
  if (!run(suite)) failures.push(suite.name);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${suites.length - failures.length}/${suites.length} suites verdes.`);
if (failures.length) {
  console.error(`FALLAN: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Todo verde.');
