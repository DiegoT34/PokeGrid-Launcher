// Cambia la version del package.json sin reescribir el resto del fichero.
//
// POR QUE EXISTE. Se ha hecho con PowerShell dos veces y las dos han roto algo: `Get-Content -Raw` lee
// un UTF-8 con la pagina de codigos del sistema y `Set-Content -Encoding utf8` devuelve un BOM, con lo
// que el campo `description` —que lleva el nombre del juego con simbolos— salia doblemente codificado y
// el JSON dejaba de validar. Aqui se lee y se escribe con Node, que no pasa por la codificacion del
// sistema, y se cambia una sola cadena: todo lo demas se queda byte a byte como estaba.
//
// USO.  node herramientas\subir-version.cjs 0.39.0
const fs = require('node:fs');
const path = require('node:path');

const destino = path.join(__dirname, '..', 'package.json');
const pedida = String(process.argv[2] || '').trim();
if (!/^\d+\.\d+\.\d+$/.test(pedida)) {
  console.error('  Falta la version, y tiene que ser tres numeros: 0.39.0');
  process.exit(1);
}

const antes = fs.readFileSync(destino, 'utf8');
const actual = String(JSON.parse(antes).version || '');
if (actual === pedida) {
  console.log(`  La version ya es ${pedida}. No se toca nada.`);
  process.exit(0);
}
const patron = /("version"\s*:\s*")[^"]*(")/;
if (!patron.test(antes)) {
  console.error('  No se encontro el campo "version" en el package.json.');
  process.exit(1);
}

const despues = antes.replace(patron, `$1${pedida}$2`);
fs.writeFileSync(destino, despues, 'utf8');

const leido = JSON.parse(fs.readFileSync(destino, 'utf8'));
if (leido.version !== pedida) {
  console.error(`  Se escribio pero no se lee bien: ${leido.version}`);
  process.exit(1);
}
console.log(`  version: ${actual} -> ${leido.version}`);
console.log(`  descripcion intacta: ${leido.description.slice(0, 28)}... (${Buffer.byteLength(leido.description, 'utf8')} bytes)`);