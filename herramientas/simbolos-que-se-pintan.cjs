// Dice que simbolos quedan que SE PINTEN de verdad, separando los tres usos distintos.
//
//  1. Un simbolo en un COMENTARIO no se ve. Se queda, porque explica de que va el codigo.
//  2. Un simbolo dentro de una EXPRESION REGULAR o de un filtro no se ve: se usa para RECONOCER
//     emojis que pone el juego en su pagina, y se borran. Si se cambiara por un SVG, el filtro no
//     reconoceria nada y los emojis del juego se colarian en las tarjetas.
//  3. Un simbolo que se PONE en un elemento si se ve, y es lo que hay que cambiar.
//
// Este guion solo mira el tercer caso. Es el que decide si el trabajo esta terminado o no.
//
// POR QUE ESTO ES UN GUION Y NO UN `node -e`
//
// Las barras y los corchetes de las expresiones no sobreviven a la consola de PowerShell. Es la misma
// razon por la que `inventario-simbolos.cjs` esta en su propio fichero.
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');
const SIMBOLO = /[\u2190-\u2BFF\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F]/u;

const ficheros = fs.readdirSync(SRC).filter((n) => /\.(js|html|css)$/.test(n));

// Una linea es de codigo si no empieza por barras de comentario.
const esComentario = (linea) => /^\s*(\/\/|\*|\/\*)/.test(linea);

// Una linea FILTRA si su simbolo esta dentro de una expresion regular o de un Replace: entonces lo
// busca para quitarlo, no lo enseña.
const filtra = (linea) =>
  /\.replace\(|DECORATIVOS|\.test\(|\.match\(|RegExp\(|\^\[|content:\s*""/.test(linea);

console.log('simbolos que se PINTAN (esto es lo que hay que cambiar):');
let pintados = 0;

for (const nombre of ficheros) {
  const lineas = fs.readFileSync(path.join(SRC, nombre), 'utf8').split('\n');
  lineas.forEach((linea, indice) => {
    if (!SIMBOLO.test(linea)) return;
    if (esComentario(linea)) return;
    if (filtra(linea)) return;
    pintados++;
    console.log(`  ${nombre}:L${indice + 1}  ${linea.trim().slice(0, 90)}`);
  });
}

console.log(pintados ? `\n${pintados} por cambiar` : '\nninguno: no queda ningun simbolo que se pinte');

const comentarios = {};
for (const nombre of ficheros) {
  const n = fs.readFileSync(path.join(SRC, nombre), 'utf8').split('\n')
    .filter((l) => SIMBOLO.test(l) && esComentario(l)).length;
  if (n) comentarios[nombre] = n;
}
console.log('\nsimbolos en comentarios (no se ven, se quedan):');
for (const [f, n] of Object.entries(comentarios)) console.log(`  ${f}: ${n}`);