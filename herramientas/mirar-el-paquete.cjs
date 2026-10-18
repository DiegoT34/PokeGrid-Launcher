// Mira lo que hay DENTRO del asar del paquete recien compilado.
//
// POR QUE HACE FALTA
//
// `verificar-paquete.cjs` falla con «la pestaña principal lleva el logo del juego…», y ese regex
// funciona contra `src/styles.css`. O sea: o el paquete lleva un CSS distinto del arbol, o el
// verificador esta mirando otra cosa.
//
// Esto lo mira en el asar de verdad, que es lo que se entrega. Si aqui la regla aparece y el
// verificador dice que no, el fallo es del verificador. Si no aparece, el fallo es del empaquetado,
// que es muy distinto: significaria que se esta entregando el CSS de una entrega anterior.
//
// En PowerShell las barras invertidas rompen el `node -e`, asi que esto va en su propio fichero. No
// es que el codigo sea dificil: es que la consola no admite el lenguaje que se quiere usar.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');
const ASAR = path.join(RAIZ, 'dist', 'win-unpacked', 'resources', 'app.asar');
const SALIDA = path.join(RAIZ, '.superpowers', 'asar-comprobado');

if (!fs.existsSync(ASAR)) {
  console.log('no hay asar en ' + ASAR + '. Hay que compilar antes de mirar dentro.');
  process.exit(1);
}

const marca = fs.statSync(ASAR).mtime;
console.log('asar: ' + path.relative(RAIZ, ASAR));
console.log('  ' + Math.round(fs.statSync(ASAR).size / 1024) + ' KB, modificado ' + marca.toISOString());

fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(SALIDA, { recursive: true });

// El modulo `asar` no esta en `node_modules/` de forma directa: este proyecto usa pnpm, que deja
// los paquetes dentro de `node_modules/.pnpm/` y los enlaza. Buscarlo en `node_modules/asar` da
// «no existe» aunque el paquete este instalado, que es lo que pasaba en el primer intento.
const posibles = [
  path.join(RAIZ, 'node_modules', 'asar', 'bin', 'asar.js'),
  path.join(RAIZ, 'node_modules', '@electron', 'asar', 'bin', 'asar.js')
];
const carpetaPnpm = path.join(RAIZ, 'node_modules', '.pnpm');
if (fs.existsSync(carpetaPnpm)) {
  for (const carpeta of fs.readdirSync(carpetaPnpm)) {
    if (!carpeta.includes('asar')) continue;
    posibles.push(path.join(carpetaPnpm, carpeta, 'node_modules', '@electron', 'asar', 'bin', 'asar.js'));
    posibles.push(path.join(carpetaPnpm, carpeta, 'node_modules', 'asar', 'bin', 'asar.js'));
  }
}
const binario = posibles.find((ruta) => fs.existsSync(ruta));

if (!binario) {
  console.log('no se encuentra el modulo asar en ninguna de las rutas probadas.');
  process.exit(1);
}
console.log('  usando: ' + path.relative(RAIZ, binario));

execFileSync(process.execPath, [binario, 'extract', ASAR, SALIDA], { stdio: 'pipe' });

const css = fs.readFileSync(path.join(SALIDA, 'src', 'styles.css'), 'utf8');

const REGLAS = [
  ['la regla del logo del juego', /\.instance-tab-icon-logo \{[^}]*idle-poke-logo-512\.png/, css],
  ['la marca de la pestaña activa', /\.instance-tab-shell\.is-active \{[^}]*box-shadow/, css],
  ['la franja del color del tipo', /box-shadow: inset 4px 0 0 var\(--farm-type-color\)/, css],
  ['el bloque del rediseño', /REDISENO DEL CENTRO/, css],
  ['las barras pintadas a mano', /::-webkit-scrollbar-thumb/, css],
  ['sin el botón de Telegram', !/button-telegram-install/.test(css), css],
  ['el icono de la lupa en el renderer', /search: '<circle cx="11"/, fs.readFileSync(path.join(SALIDA, 'src', 'renderer.js'), 'utf8')],
  ['el helper expuesto', /window\.launcherUiIcon = launcherUiIcon;/, fs.readFileSync(path.join(SALIDA, 'src', 'renderer.js'), 'utf8')],
  // OJO con la negacion: `!/algo/` en JavaScript NO es «no casa», es el valor booleano `false`, porque
  // una expresion regular siempre es verdadera. Hay que negar el RESULTADO: `!/algo/.test(texto)`.
  // Escrito de la otra forma, esta comprobacion da «falta» SIEMPRE, y parece un fallo del paquete
  // cuando lo que falla es el guion que mira.
  ['el botón de Telegram fuera del HTML', !/id="installTelegramAlertsButton"/.test(fs.readFileSync(path.join(SALIDA, 'src', 'index.html'), 'utf8'))],
  ['y fuera del gestor', !/id="installTelegramAlertsButton"/.test(fs.readFileSync(path.join(SALIDA, 'src', 'userscripts.js'), 'utf8'))
    || /se quito en la 0\.34\.0/.test(fs.readFileSync(path.join(SALIDA, 'src', 'userscripts.js'), 'utf8'))]
];

console.log('\nlo que hay DENTRO del paquete:');
let fallos = 0;
for (const [que, re, texto] of REGLAS) {
  const ok = typeof re === 'boolean' ? re : re.test(texto);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALTA'} ${que}`);
}

fs.rmSync(SALIDA, { recursive: true, force: true });
console.log(`\nfaltan: ${fallos}`);
console.log('Si aqui todo esta y el verificador dice que no, el fallo es del verificador, no del paquete.');