// Quita los acentos graves de los comentarios que viven DENTRO de la plantilla `THEME_CSS`.
//
// LA CUARTA VEZ QUE PASA ESTO, Y POR QUE ESTA VEZ HACE FALTA UNA HERRAMIENTA
//
// Un acento grave dentro de una plantilla la cierra antes de tiempo, y el error que sale de Node
// apunta a la linea donde empieza la plantilla, no a la del comentario. En un fichero de 5.000 lineas
// eso es buscar a ciegas.
//
// Este guion existe porque los acentos graves SI hacen falta en codigo —son las plantillas y las
// cadenas que las usan— y en comentario no aportan nada. En comentario se cambian por comillas
// simples: se lee igual y deja de ser un peligro.
//
// La diferencia con `sin-acentos-graves-en-comentarios.cjs` es que este solo mira dentro de la
// plantilla del tema, y que ademas AVISA si al final el fichero no tiene sintaxis, en vez de
// escribirlo a medias.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const FICHERO = path.join(__dirname, '..', 'src', 'game-theme.js');
const original = fs.readFileSync(FICHERO, 'utf8');
const GRAVE = String.fromCharCode(96);

const lineas = original.split('\n');
const salida = [];
let corregidas = 0;

// Hay dos formas de comentario: el de una linea (`//`) y el de bloque (`/* ... */`). El segundo no se
// puede detectar linea a linea: se abre en una linea y se cierra tres despues, y las de en medio son
// texto normal que parece codigo. Por eso se lleva la cuenta de si estamos dentro de uno. La linea que
// abre el bloque no suele llevar acentos graves, pero la de en medio si, y es justo la que rompe.
let dentroDeBloque = false;

for (const linea of lineas) {
  const abre = linea.includes('/*');
  const cierra = linea.includes('*/');
  const esComentarioDeLinea = /^\s*\/\//.test(linea);
  const esComentarioDeBloque = dentroDeBloque || abre;

  if ((esComentarioDeLinea || esComentarioDeBloque) && linea.includes(GRAVE)) {
    corregidas++;
    salida.push(linea.replace(new RegExp(GRAVE, 'g'), "'").replace(/[\u2014\u2013]/g, '-'));
  } else {
    salida.push(linea);
  }

  if (abre && !cierra) dentroDeBloque = true;
  if (cierra) dentroDeBloque = false;
}

const texto = salida.join('\n');

console.log(`comentarios corregidos: ${corregidas}`);

// La comprobacion de sintaxis TIENE QUE HACERSE sobre un temporal, no sobre el fichero.
// `node --check` lee el fichero del disco, y si se comprueba antes de escribir, lo que se esta
// comprobando es la version VIEJA: da el error de siempre, el guion dice que no escribe, y los acentos
// graves se quedan puestos. Por eso este guion no ha corregido nada en tres intentos seguidos.
//
// El temporal va en la carpeta de trabajo de este proyecto, que es la unica de la que se tiene
// certeza de que existe y donde se puede escribir.
const temporal = path.join(__dirname, '..', '.superpowers', 'tema-comprobado.tmp.js');
fs.mkdirSync(path.dirname(temporal), { recursive: true });
fs.writeFileSync(temporal, texto, 'utf8');

let sintaxis;
try {
  execFileSync(process.execPath, ['--check', temporal], { stdio: 'pipe' });
  sintaxis = true;
} catch (error) {
  sintaxis = false;
  console.log('\nNO SE ESCRIBE: el resultado no tiene sintaxis valida.');
  console.log(String(error.stderr || error.message).split('\n').slice(0, 5).join('\n'));
}
fs.unlinkSync(temporal);

if (!sintaxis) process.exit(1);

if (corregidas) fs.writeFileSync(FICHERO, texto, 'utf8');
console.log('escrito. sintaxis correcta.');