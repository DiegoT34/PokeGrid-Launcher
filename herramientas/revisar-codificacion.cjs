// Quita el BOM de un fichero de texto y comprueba que no quedan caracteres rotos.
//
// POR QUE EXISTE. Editar un fichero con `Set-Content -Encoding utf8` desde PowerShell 5.1 le mete un
// BOM, y ademas puede doble-codificar los acentos. Ya ha pasado tres veces en este proyecto (el
// package.json, el README y este plan) y las tres se vio despues, en un diff raro. Con esto se
// comprueba en el acto.
//
// USO: node herramientas\revisar-codificacion.cjs <fichero> [<fichero> ...]
const fs = require('node:fs');

const ficheros = process.argv.slice(2);
if (!ficheros.length) {
  console.error('  Uso: node herramientas\\revisar-codificacion.cjs <fichero> [...]');
  process.exit(2);
}

let problemas = 0;
for (const fichero of ficheros) {
  const original = fs.readFileSync(fichero, 'utf8');
  const teniaBom = original.charCodeAt(0) === 0xfeff;
  if (teniaBom) {
    fs.writeFileSync(fichero, original.slice(1), 'utf8');
  }
  const texto = fs.readFileSync(fichero, 'utf8');
  const rotos = (texto.match(/\uFFFD/g) || []).length;
  // La doble codificacion se delata por la secuencia tipica de UTF-8 leido como Latin-1.
  const doble = (texto.match(/\u00c3[\u0080-\u00bf]/g) || []).length;
  const estado = [];
  if (teniaBom) estado.push('BOM quitado');
  if (rotos) { estado.push(`${rotos} caracteres rotos`); problemas += 1; }
  if (doble) { estado.push(`${doble} secuencias doblemente codificadas`); problemas += 1; }
  console.log(`  ${fichero}: ${estado.length ? estado.join(', ') : 'bien'}`);
}
process.exitCode = problemas ? 1 : 0;
