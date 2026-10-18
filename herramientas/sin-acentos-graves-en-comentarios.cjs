// Quita los acentos graves de los COMENTARIOS que viven dentro de plantillas.
//
// POR QUE ESTE GUION EXISTE
//
// Esta es la tercera vez en el proyecto que un acento grave en un comentario rompe el fichero, y las
// tres ha sido aqui, en `tests/userscripts-manager-smoke.js`, que mete casi todo su codigo dentro de una
// plantilla `executeJavaScript(\`...\`)`. Ahi dentro, un acento grave cierra la plantilla antes de tiempo
// y el error que sale apunta a la linea donde empieza la plantilla, no a la del comentario. Se pierde
// media hora mirando el sitio equivocado.
//
// La solucion no es tener cuidado: es que no haya acentos graves que都有可能. En un comentario no
// aportan nada —se lee igual con comillas simples— y aqui son un peligro, asi que se cambian por
// comillas simples. Los acentos graves de CODIGO se dejan: ahi si significan algo.
//
// Solo toca lineas que son comentarios. Una linea de codigo con acento grave se considera intentional
// y se avisa, pero no se toca: tocarla a ciegas seria justo el fallo que este guion evita.
const fs = require('node:fs');
const path = require('node:path');

const FICHERO = path.join(__dirname, '..', 'tests', 'userscripts-manager-smoke.js');
const original = fs.readFileSync(FICHERO, 'utf8');
const lineas = original.split('\n');

const COMENTARIO = /^\s*\/\//;
const ACENTO_GRAVE = /\u0060/;

let corregidas = 0;
const enCodigo = [];

const salida = lineas.map((linea, indice) => {
  if (!ACENTO_GRAVE.test(linea)) return linea;
  if (COMENTARIO.test(linea)) {
    corregidas++;
    return linea.replace(/\u0060/g, "'").replace(/[\u2014\u2013]/g, '-');
  }
  // Fuera de un comentario el acento grave hace falta (plantillas y cadenas), asi que se avisa pero no
  // se toca. Esta linea no se puede cambiar sin mirar lo que hace.
  enCodigo.push(`${indice + 1}: ${linea.trim().slice(0, 78)}`);
  return linea;
});

const texto = salida.join('\n');

// Un acento grave en CODIGO es legitimo: son las plantillas y las cadenas que las usan. Este guion no
// las toca y no sale con error por ellas: solo avisaria si alguien metiera uno donde no toca. Como no
// hay forma de distinguir ahi sin entender cada linea, y ese juicio es de la persona, no se falla.
console.log(`comentarios corregidos: ${corregidas}`);
console.log(`acentos graves en codigo (correctos, se dejan): ${enCodigo.length}`);

// La comprobacion va sobre un TEMPORAL, no sobre el fichero: `node --check` lee del disco, y si se
// comprueba antes de escribir lo que se mira es la version vieja. Asi que este guion seConvencio de
// comprobar lo que todavia no esta escrito, que es justo donde esta el fallo que se quiere ver.
const { execFileSync } = require('node:child_process');
const temporal = path.join(__dirname, '..', '.superpowers', 'comentarios-comprobado.tmp.js');
fs.mkdirSync(path.dirname(temporal), { recursive: true });
fs.writeFileSync(temporal, texto, 'utf8');

let sintaxis;
try {
  execFileSync(process.execPath, ['--check', temporal], { stdio: 'pipe' });
  sintaxis = true;
} catch (error) {
  sintaxis = false;
  console.log('\nNO SE ESCRIBE: el resultado no tiene sintaxis valida.');
  console.log(String(error.stderr || error.message).split('\n').slice(0, 4).join('\n'));
}
fs.unlinkSync(temporal);

if (!sintaxis) process.exit(1);

if (corregidas) fs.writeFileSync(FICHERO, texto, 'utf8');
console.log(`\nescrito. sintaxis correcta.`);