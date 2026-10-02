const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- La pila condensada desaparece de todo el CSS -----------------------------
// De las cuatro fuentes que pedían los paneles, dos no existen en Windows 11:
// «Roboto Condensed» no viene con el sistema y «Arial Narrow» tampoco está. Lo que
// se ve casi siempre es Segoe UI metida en una pila que la espera condensada, y por
// eso el texto se veía estrecho.
for (const fuente of ['Arial Narrow', 'Bahnschrift Condensed', 'Roboto Condensed']) {
  assert.equal(styles.includes(`"${fuente}"`), false,
    `"${fuente}" sigue en el CSS. No existe en Windows 11 y hace que el texto se vea estrecho.`);
}

// --- Las dos familias nuevas están declaradas ---------------------------------
assert.ok(/--tipo-display:\s*"/.test(styles), 'Falta --tipo-display en :root.');
assert.ok(/--tipo-texto:\s*"/.test(styles), 'Falta --tipo-texto en :root.');

// --- Ningún @font-face: cero ficheros nuevos en el paquete ---------------------
assert.equal(styles.includes('@font-face'), false,
  'Ha aparecido un @font-face, y este proyecto no añade ficheros de fuente.');

// --- Ninguno de los tres paneles declara una pila propia ----------------------
// Los tres heredan `font-family` de `:root`, que ya es `var(--tipo-texto)`. Lo que
// no puede pasar es que uno se salga con su propia pila, que es como empezó todo.
for (const selector of ['.hunt-float-panel', '.capture-float-panel', '.account-info-card']) {
  const i = styles.indexOf(`${selector} {`);
  const bloque = styles.slice(i, styles.indexOf('}', i));
  const propia = bloque.match(/font-family:[^;]+/);
  if (propia) {
    assert.ok(/var\(--tipo-(?:display|texto)\)/.test(propia[0]),
      `${selector} declara su propia familia (${propia[0]}). Tiene que usar var(--tipo-...), no una pila con fuentes que no existen.`);
  }
}

// Y :root sí tiene que proporcionar el texto a los tres.
const raiz = styles.slice(styles.indexOf(':root {'), styles.indexOf('}', styles.indexOf(':root {')));
assert.ok(/font-family:\s*var\(--tipo-texto\)/.test(raiz),
  ':root tiene que declarar font-family: var(--tipo-texto), que es de donde heredan los tres paneles.');

// --- Las cifras grandes usan la familia de display ----------------------------
// Es donde se nota: los números de Hunt Analyzer y las wallets. Los selectores
// reales llevan `hunt-flat-`, no `hunt-float-`: la tarjeta de métrica es
// `.hunt-flat-metric`, el nombre no se parece al del panel por nada.
const cifras = [
  /\.hunt-flat-metric-copy\s*>\s*b\s*\{[^}]*font-family:\s*var\(--tipo-display\)/,
  /\.hunt-flat-balance\s*>\s*b\s*\{[^}]*font-family:\s*var\(--tipo-display\)/,
  /\.capture-float-count\s*\{[^}]*font-family:\s*var\(--tipo-display\)/,
  /\.account-info-metric\s+b\s*\{[^}]*font-family:\s*var\(--tipo-display\)/,
  /\.account-info-membership\s+b\s*\{[^}]*font-family:\s*var\(--tipo-display\)/
];
const encontradas = cifras.filter((re) => re.test(styles)).length;
assert.ok(encontradas >= 4,
  `Las cifras grandes tienen que usar --tipo-display, que es donde se gana la presencia. Solo ${encontradas} de ${cifras.length} lo hacen.`);
assert.ok(/font-family:\s*var\(--tipo-display\)/.test(styles),
  'No hay ninguna regla con var(--tipo-display): la familia de cifras no se está usando.');

// --- Ninguna de las dos familias apunta a una fuente que no exista -----------
// Es el mismo error que se está arreglando, en la otra dirección: una familia
// que nombra algo que Windows no trae cae y el resultado depende de la máquina.
for (const familia of ['--tipo-display', '--tipo-texto']) {
  const re = new RegExp(`${familia}:\\s*([^;]+);`);
  const linea = styles.match(re);
  assert.ok(linea, `Falta ${familia}.`);
  const valores = linea[1];
  for (const mala of ['Arial Narrow', 'Roboto Condensed', 'Bahnschrift Condensed']) {
    assert.equal(valores.includes(mala), false,
      `${familia} nombra "${mala}", que no existe en Windows 11.`);
  }
  assert.ok(valores.includes('Segoe UI'), `${familia} tiene que acabar en Segoe UI, que sí está en Windows.`);
}

console.log('Panel typography smoke passed: sin pila condensada, dos familias, tres paneles, sin ficheros.');