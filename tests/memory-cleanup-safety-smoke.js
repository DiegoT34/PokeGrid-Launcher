const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const mainPath = path.join(__dirname, '..', 'src', 'main.js');
const rendererPath = path.join(__dirname, '..', 'src', 'renderer.js');
const main = fs.readFileSync(mainPath, 'utf8');
const renderer = fs.readFileSync(rendererPath, 'utf8');

new vm.Script(main, { filename:mainPath });
new vm.Script(renderer, { filename:rendererPath });

const handlerStart = main.indexOf("ipcMain.handle('app:cleanup-memory'");
const handlerEnd = main.indexOf("ipcMain.handle('assets:pokemon-species'", handlerStart);
assert.ok(handlerStart > 0 && handlerEnd > handlerStart, 'The memory cleanup handler was not found.');
const handler = main.slice(handlerStart, handlerEnd);

assert.doesNotMatch(handler, /\.debugger\.(?:attach|sendCommand|detach)/);
assert.doesNotMatch(handler, /Memory\.forciblyPurgeJavaScriptMemory|HeapProfiler\.collectGarbage/);
assert.match(handler, /strategy:\s*'safe-cache-only'/);
assert.match(handler, /preservedProcesses:\s*targets\.length/);
assert.match(renderer, /Limpieza segura: no se adjuntó el depurador ni se forzó el GC de las sesiones/);

console.log('Safe RAM cleanup smoke test passed: no debugger/forced GC can blank the launcher or its webviews.');
