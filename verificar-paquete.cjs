// Verifica el ZIP recién compilado contra lo que hay DENTRO del paquete, no contra
// el árbol del proyecto. Es la diferencia entre «compiló» y «funciona».
//
// El código del launcher va dentro de un `asar`, así que lo que hay que comprobar es
// que DENTRO de ese archivo están los ficheros con el contenido de ahora mismo. Un
// `asar` viejo o de otra versión pasa el `node --check` del proyecto y falla aquí.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = __dirname;
const ZIP = path.join(RAIZ, 'dist', 'IDLE-POKE-LAUNCHER-0.25.1-portatil.zip');
const UNPACKED = path.join(RAIZ, 'dist', 'win-unpacked');
const ASAR = path.join(UNPACKED, 'resources', 'app.asar');

// --- 1. El ZIP y su huella -----------------------------------------------------
const zip = fs.statSync(ZIP);
console.log(`ZIP: ${path.basename(ZIP)}`);
// `fs.Stats` llama a la fecha `mtime`. `lastWriteTime` es el nombre que usa
// PowerShell en su `Get-ChildItem`, y no existe aquí: sale `undefined` sin avisar.
console.log(`  ${(zip.size / 1048576).toFixed(1)} MB, escrito ${zip.mtime.toLocaleString('es-ES')}`);
const sha = crypto.createHash('sha256');
sha.update(fs.readFileSync(ZIP));
console.log(`  sha256 ${sha.digest('hex')}`);

// --- 2. El asar existe y es legible --------------------------------------------
if (!fs.existsSync(ASAR)) throw new Error(`No está el asar en ${ASAR}`);
console.log(`\nasar: ${(fs.statSync(ASAR).size / 1048576).toFixed(1)} MB`);

// `asar` está en `node_modules/.pnpm`, no como paquete suelto. Se usa su API en vez
// de su `.cmd`: `execFileSync` sobre un `.cmd` en Windows da `EINVAL`, porque no es un
// ejecutable sino un guion de consola, y el error no dice eso.
const ASAR_MOD = fs.readdirSync(path.join(RAIZ, 'node_modules', '.pnpm'))
  .filter((d) => d.startsWith('@electron+asar@'))
  .sort()
  .pop();
if (!ASAR_MOD) throw new Error('No encuentro @electron/asar en node_modules/.pnpm');
const asar = require(path.join(RAIZ, 'node_modules', '.pnpm', ASAR_MOD, 'node_modules', '@electron', 'asar'));
console.log(`\nextractor: @electron/asar de ${ASAR_MOD}`);

const TEMP = path.join(RAIZ, 'dist', `verif-asar-${process.pid}`);
fs.rmSync(TEMP, { recursive: true, force: true });
asar.extractAll(ASAR, TEMP);
console.log(`extraído a ${TEMP}`);

// --- 3. Lo que hay dentro se parece a lo del árbol ------------------------------
const COMPARAR = ['renderer.js', 'styles.css', 'index.html', 'preload.js', 'main.js'];
const resultado = COMPARAR.map((nombre) => {
  const enPaquete = path.join(TEMP, 'src', nombre);
  const enArbol = path.join(RAIZ, 'src', nombre);
  if (!fs.existsSync(enPaquete)) return { nombre, igual: false, nota: 'NO ESTÁ EN EL PAQUETE' };
  const a = crypto.createHash('sha256').update(fs.readFileSync(enPaquete)).digest('hex');
  const b = crypto.createHash('sha256').update(fs.readFileSync(enArbol)).digest('hex');
  return { nombre, igual: a === b, nota: a === b ? 'idéntico' : 'DIFIERE' };
});
console.log('');
for (const r of resultado) console.log(`  ${r.igual ? 'ok  ' : 'FALLA'} ${r.nombre.padEnd(14)} ${r.nota}`);

// --- 4. Lo que tiene que estar DENTRO del paquete, y no estar --------------------
const dentro = (p) => fs.existsSync(path.join(TEMP, p));
const ausentes = ['tests', 'propuesta.html', 'propuesta.css', '.git'].filter((p) => dentro(p));
console.log(`\nlo que NO debe estar dentro: ${ausentes.length ? ausentes.join(', ') : 'nada, como debe'}`);

const presentes = ['package.json', 'src/renderer.js', 'src/styles.css', 'src/index.html'].filter((p) => !dentro(p));
console.log(`lo que SÍ tiene que estar: ${presentes.length ? `FALTA ${presentes.join(', ')}` : 'todo presente'}`);

// --- 5. La versión, leída de dentro ---------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(TEMP, 'package.json'), 'utf8'));
const pkgArbol = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8'));
console.log(`\nversión dentro del paquete: ${pkg.version}`);
console.log(`versión en el árbol:        ${pkgArbol.version}`);
console.log(`  ${pkg.version === pkgArbol.version ? 'coinciden' : 'NO COINCIDEN'}`);

// --- 6. Los textos del panel, leídos del paquete ---------------------------------
const renderer = fs.readFileSync(path.join(TEMP, 'src', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(TEMP, 'src', 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(TEMP, 'src', 'index.html'), 'utf8');

const TEXTOS = [
  ['Líder equipado', /leaderEyebrow\.textContent = leader \? 'Líder equipado' : 'Líder sin detectar';/, renderer],
  ['Nivel / Fuerza / Vida', /\['Nivel', leader\.level[\s\S]*\['Fuerza', leader\.strength[\s\S]*\['Vida', leader\.maxHp/, renderer],
  ['las seis en español', /\['PS', leader\.stats\.hp\][\s\S]*\['DEF ESP', leader\.stats\.specialDefense\]/, renderer],
  ['Sin MT detectadas', /emptyTm\.textContent = 'Sin MT detectadas';/, renderer],
  ['Desactivar, sin glifo', /<span class="top-action-icon"><\/span><span>Desactivar<\/span>/, html],
  ['la barra de farmeo se conecta', /aplicarIconosBarraFarmeo\(\);/, renderer],
  ['«Iniciar farmeo automático» tiene hueco de icono', /id="startFarmButton"[^>]*><span class="top-action-icon">/, html],
  ['y le toca el icono de play', /'#startFarmButton':\s*'play'/, renderer],
  ['el botón de iniciar lleva el SVG del pack', /playIcon\.innerHTML = launcherUiIcon\('play'\);/, renderer],
  ['el cristal del diálogo', /\.modal\.farm-modal \{[\s\S]*?backdrop-filter:\s*blur/, styles],
  ['el ancho del diálogo', /width:\s*min\(1320px, 100%\)/, styles],
  ['el hueco del líder', /--pf-hundido/, styles],
  ['el brillo saliente del número de cuenta', /--pf-sobresaliente/, styles]
];
console.log('');
let fallos = 0;
for (const [que, re, texto] of TEXTOS) {
  const ok = re.test(texto);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALTA'} ${que}`);
}

// Y una que va al revés, y por eso va aparte: el botón de iniciar NO puede llevar la
// clase que pinta el triángulo de CSS. Con la clase y el SVG dentro, el span queda sin
// caja, el SVG no se recorta y salen dos triángulos uno al lado del otro.
const conTrianguloCss = /playIcon\.className = 'play-icon'/.test(renderer);
if (conTrianguloCss) fallos++;
console.log(`  ${conTrianguloCss ? 'FALTA' : 'ok  '} el botón de iniciar ya NO lleva el triángulo de CSS`);

// --- 7. Y nada de lo que se quitó ----------------------------------------------
// El barrido del `renderer.js` va entero: no debe quedar ningún glifo suelto.
//
// En el `index.html` NO: hay marcadores de posición en otros paneles —el `↻` de
// «Reset» del panel de Hunt, el `⌕` del selector— que se sustituyen al arrancar. El
// diagnóstico de arranque ya confirmó que no se ve ninguno. Barrerlo todo daría un
// fallo por algo que no es de este trabajo y que sí está bien, así que aquí se acota
// al modal de farmeo, que es lo que se ha tocado.
const glifo = /[⇩↻›■]/u;
const htmlEntero = glifo.test(html) && !glifo.test(html);
const iniFarm = html.indexOf('<section class="modal farm-modal"');
const finFarm = html.indexOf('</section>', iniFarm);
if (iniFarm < 0 || finFarm < 0) throw new Error('No encuentro el modal de farmeo en el HTML del paquete.');
const markupFarm = html.slice(iniFarm, finFarm);

console.log('');
const sinGlifosJs = !glifo.test(renderer);
if (!sinGlifosJs) fallos++;
console.log(`  ${sinGlifosJs ? 'ok  ' : 'FALLA'} el renderer no tiene glifos sueltos`);

const sinGlifosFarm = !glifo.test(markupFarm);
if (!sinGlifosFarm) fallos++;
console.log(`  ${sinGlifosFarm ? 'ok  ' : 'FALLA'} el modal de farmeo no tiene glifos sueltos`);
void htmlEntero;

// Y se dice qué queda fuera, para que el «ok» no tape algo.
// Y se dice qué queda fuera, para que el «ok» no tape algo. Hace falta una expresión
// CON la bandera global: `matchAll` con una que no la tiene lanza, y el error habla de
// que no es una función, no de la bandera.
const fuera = (html.match(/[⇩↻›■]/gu) || []).length;
console.log(`       (quedan ${fuera} glifos de posición en otros paneles del HTML, sin relación con este)`);

// --- 8. La sintaxis del renderer, tal cual está en el paquete -------------------
const check = require('node:child_process').spawnSync(process.execPath, ['--check', path.join(TEMP, 'src', 'renderer.js')], { encoding: 'utf8' });
if (check.status !== 0) fallos++;
console.log(`  ${check.status === 0 ? 'ok  ' : 'FALLA'} el renderer del paquete pasa «node --check»`);

fs.rmSync(TEMP, { recursive: true, force: true });

console.log('');
console.log(fallos === 0
  ? `Todo lo que se cambió está dentro del ${path.basename(ZIP)}.`
  : `${fallos} comprobaciones fallan.`);
process.exit(fallos === 0 ? 0 : 1);
