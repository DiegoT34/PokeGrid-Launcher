// Revisa la codificacion de ficheros de texto: BOM y doble codificacion.
//
// POR QUE EXISTE. Editar un fichero con PowerShell 5.1 lo estropea de dos maneras: `Set-Content
// -Encoding utf8` le mete un BOM, y `Get-Content -Raw` + escritura puede doble-codificar los acentos.
// Las dos han pasado en este proyecto mas veces de las que me gustaria.
//
// NO ESCRIBE NADA. Es un revisor. La primera version quitaba el BOM ella sola y le quite el BOM a un
// `.ps1`: PowerShell 5.1 lee los `.ps1` SIN BOM como ANSI, asi que "arreglar" un script de PowerShell
// es exactamente lo contrario de arreglarlo. Un revisor que modifica lo que revisa es una trampa.
//
// USO: node herramientas\revisar-codificacion.cjs <fichero> [<fichero> ...]
const fs = require('node:fs');

// Los `.ps1` de este proyecto llevan BOM a proposito y tienen que llevarlo: sin el, PowerShell 5.1 los
// lee como ANSI y los acentos de los mensajes salen rotos.
const NECESITAN_BOM = /\.ps1$/i;

const ficheros = process.argv.slice(2);
if (!ficheros.length) {
  console.error('  Uso: node herramientas\\revisar-codificacion.cjs <fichero> [...]');
  process.exit(2);
}

let problemas = 0;
for (const fichero of ficheros) {
  const bytes = fs.readFileSync(fichero);
  const tieneBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const texto = bytes.toString('utf8').replace(/^\uFEFF/, '');
  const rotos = (texto.match(/\uFFFD/g) || []).length;
  // La doble codificacion se delata por la secuencia tipica de UTF-8 leido como 1252.
  const doble = (texto.match(/\u00c3[\u0080-\u00bf]/g) || []).length;

  const avisos = [];
  if (NECESITAN_BOM.test(fichero) && !tieneBom) {
    avisos.push('le falta el BOM y PowerShell 5.1 lo necesita');
    problemas += 1;
  }
  if (!NECESITAN_BOM.test(fichero) && tieneBom) {
    avisos.push('tiene BOM y no lo necesita');
    problemas += 1;
  }
  if (rotos) { avisos.push(`${rotos} caracteres rotos`); problemas += 1; }
  if (doble) { avisos.push(`${doble} secuencias doblemente codificadas`); problemas += 1; }

  console.log(`  ${fichero}: ${avisos.length ? avisos.join(', ') : 'bien'}`);
}
process.exitCode = problemas ? 1 : 0;
