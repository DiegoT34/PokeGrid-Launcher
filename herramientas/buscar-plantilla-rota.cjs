// Cuenta los acentos graves por linea y marca los que quedan DENTRO de una plantilla.
//
// POR QUE VUELVE A EXISTIR ESTO
//
// Lo borre hace dos entregas porque daba falsos positivos contando acentos graves en comentarios
// que no estaban dentro de ninguna plantilla. Pero eso era el guion mal hecho, no la idea: el error
// real —un acento grave en un comentario de dentro de una plantilla, que la cierra— ha pasado SIETE
// veces ya, y siempre cuesta una vuelta entera de comprobar y lanzar.
//
// Lo que hace bien esta version: se apoya en `node --check` para saber si el fichero esta roto, y
// solo entonces busca. Si `node --check` pasa, no dice nada. Asi no hay falsos positivos: solo
// habla cuando hay un fallo de verdad, y entonces señala las lineas sospechosas.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const objetivo = process.argv[2] || 'tests/instancia-cabecera-smoke.js';
const ruta = path.join(__dirname, '..', objetivo);

try {
  execFileSync(process.execPath, ['--check', ruta], { stdio: 'pipe' });
  console.log('  ok   ' + objetivo + ' pasa node --check: no hay plantilla sin cerrar');
  process.exit(0);
} catch (e) {
  const salida = String(e.stderr || e.message);
  const linea = (salida.match(/:(\d+)\n/) || [])[1] || '?';
  console.log('  ROTO ' + objetivo + ', y node señala la linea ' + linea + ' (que NO es donde esta el fallo)');
  console.log('       Esa linea es donde EMPIEZA la plantilla que se cerro antes de tiempo.');
  console.log('');
}

// Se cuentan los acentos graves de cada linea. Un numero impar en una linea de comentario es el
// sospechoso: abre o cierra una plantilla sin pareja.
const lineas = fs.readFileSync(ruta, 'utf8').split(/\r?\n/);
let dentro = false;
let sospechosos = 0;
for (const [i, linea] of lineas.entries()) {
  const graves = (linea.match(/`/g) || []).length;
  const esComentario = linea.trim().startsWith('//');
  if (dentro && esComentario && graves > 0) {
    sospechosos++;
    console.log('  linea ' + (i + 1) + ': acento grave en un comentario DENTRO de una plantilla');
    console.log('     ' + linea.trim().slice(0, 96));
  }
  if (graves % 2 === 1) dentro = !dentro;
}
console.log('');
console.log(sospechosos === 0
  ? 'no se ha encontrado el sospechoso mirando comentarios: puede ser codigo'
  : sospechosos + ' sospechoso(s)');
process.exit(1);
