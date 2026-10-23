// Arregla un fichero de texto que ha pasado por `Set-Content -Encoding utf8` de PowerShell 5.1.
//
// QUE PASA. PowerShell lee el UTF-8 como la pagina de codigos del sistema (1252 en espanol), se queda
// con un caracter por byte, y al escribirlo como UTF-8 lo codifica otra vez. El resultado es texto
// doblemente codificado: cada tilde pasa a ocupar dos caracteres en vez de uno.
//
// COMO SE DESHACE. Se lee el fichero como UTF-8 (queda la cadena con los caracteres de 1252), se
// vuelve a bytes con la tabla de 1252 —no con latin1, que difiere en el rango 0x80-0x9F, y ahi estan
// las comillas y las rayas— y esos bytes se leen como UTF-8, que es lo que eran.
//
// USO: node herramientas\deshacer-doble-codificacion.cjs <fichero> [--escribir]
const fs = require('node:fs');

// Los 27 huecos que 1252 no comparte con latin1. Sin esto, las rayas y las comillas salen cambiadas
// y el texto queda peor que antes de arreglarlo.
const CP1252 = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f]
]);

function aBytes(texto) {
  const bytes = [];
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0);
    if (codigo <= 0xff) { bytes.push(codigo); continue; }
    const especial = CP1252.get(codigo);
    if (especial === undefined) return null;
    bytes.push(especial);
  }
  return Buffer.from(bytes);
}

const fichero = process.argv[2];
const escribir = process.argv.includes('--escribir');
if (!fichero) {
  console.error('  Uso: node herramientas\\deshacer-doble-codificacion.cjs <fichero> [--escribir]');
  process.exit(2);
}

const original = fs.readFileSync(fichero, 'utf8');
const bytes = aBytes(original);
if (!bytes) {
  console.error('  Hay caracteres que no vienen de 1252: este fichero no esta doblemente codificado.');
  process.exit(1);
}
const arreglado = bytes.toString('utf8');
if (arreglado.includes('\uFFFD')) {
  console.error('  Al releer como UTF-8 salen caracteres rotos: no era doble codificacion de 1252.');
  process.exit(1);
}

const antes = (original.match(/\u00c3[\u0080-\u00bf]/g) || []).length;
const despues = (arreglado.match(/\u00c3[\u0080-\u00bf]/g) || []).length;
console.log(`  secuencias dobles antes: ${antes} · despues: ${despues}`);
console.log(`  muestra: ${JSON.stringify(arreglado.slice(0, 80))}`);
if (escribir) {
  fs.writeFileSync(fichero, arreglado, 'utf8');
  console.log('  escrito.');
} else {
  console.log('  (sin --escribir no se toca el fichero)');
}
