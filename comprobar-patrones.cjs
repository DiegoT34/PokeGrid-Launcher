// Comprueba los patrones nuevos de verificar-paquete.cjs contra el codigo de AHORA, sin esperar al
// paquete. Es lo mismo que hace el verificador, pero contra el arbol en vez de contra el asar: si un
// patron no casa aqui, no casara alli, y se descubre antes de compilar en vez de despues.
//
// Se hace en node y no en PowerShell porque ahi los argumentos de -match se pueden invertir y el
// fallo sale como un error de regex en vez de como un fallo de comprobacion.
const fs = require('node:fs');
const path = require('node:path');

const raiz = __dirname;
const renderer = fs.readFileSync(path.join(raiz, 'src', 'renderer.js'), 'utf8');
const mainProceso = fs.readFileSync(path.join(raiz, 'src', 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(raiz, 'src', 'preload.js'), 'utf8');

const QUE_SI = [
  ['la regla de duermete', /function aplicarDescanso\(\)/, renderer],
  ['que una pantalla duerme si no es la pestaña abierta', /function panelEstaEnPantalla\(panel\)/, renderer],
  ['el cierre que destruye el proceso de verdad', /panel\.webview\.destroy\(\)/, renderer],
  ['borrar la particion de una instancia quitada', /ipcMain\.handle\('instancia:borrar-particion'/, mainProceso],
  ['la cola de particiones para el siguiente arranque', /function vaciarPendientesDeParticiones\(\)/, mainProceso],
  ['que al minimizar se duerma todo', /mainWindow\.on\('minimize', dormirTodo\)/, mainProceso],
  ['el sondeo de capturas solo con la pantalla a la vista', /if \(!panelEstaEnPantalla\(panel\)\) return;/, renderer],
  ['el registro de capturas tambien', /panel\.captureLogOpen && panelEstaEnPantalla\(panel\)/, renderer],
  ['el analizador tambien', /panel\.huntOpen && panelEstaEnPantalla\(panel\)/, renderer],
  ['el sondeo de farmeo tambien', /accountIndex === null && !panelEstaEnPantalla\(panel\)/, renderer],
  ['el archivo de capturas ya no se copia entero cada tic', /const indiceEstable = \(\) => \{/, renderer],
  ['el relleno del acceso tiene expiration', /__pokeGridSubmitWatcherVence/, renderer],
  ['el tope del archivo de iconos', /const ICONOS_EN_CACHE = \d+;/, mainProceso],
  ['el puente para dormir una pantalla', /duermirPanel:/, preload]
];

const QUE_NO = [
  ['el interruptor global que hacia correr TODO', /appendSwitch\('disable-renderer-backgrounding'\)/, mainProceso + renderer],
  ['la preferencia que prohibia atenuar', /backgroundThrottling: false/, mainProceso],
  ['la preferencia en las webviews', /setAttribute\('webpreferences', 'backgroundThrottling=no/, renderer],
  ['el nombre de la API que se llamaba al reves', /setPanelThrottling/, preload + renderer]
];

let problemas = 0;
console.log('0.31.0 — tiene que estar:');
for (const [que, re, texto] of QUE_SI) {
  const ok = re.test(texto);
  if (!ok) problemas++;
  console.log(`  ${ok ? 'ok  ' : 'NO  '} ${que}`);
}
console.log('\n0.31.0 — tiene que haber desaparecido:');
for (const [que, re, texto] of QUE_NO) {
  const presente = re.test(texto);
  if (presente) problemas++;
  console.log(`  ${presente ? 'NO  ' : 'ok  ' } ${que}${presente ? '  — sigue presente' : ''}`);
}

console.log(`\nproblemas: ${problemas}`);
process.exitCode = problemas ? 1 : 0;