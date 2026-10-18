// Inventario de simbolos y emoji en el frontend, para el rediseño del centro de scripts y el
// centro de notificaciones.
//
// PowerShell no acepta `\u{}` en sus expresiones regulares, asi que buscar emoji ahi da un error de
// «digitos hexadecimales insuficientes» en vez de un resultado. Node si, y ademas puede decir EN QUE
// linea esta cada uno, que es lo que hace falta para sustituirlos.
//
// Solo mira `src`: en los tests y los guiones de medida los simbolos son texto de comparacion, no
// interfaz, y cambiarlos ahi seria cambiar la prueba, no el launcher.
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');
// Los rangos de lo que se ve en pantalla como emoji o simbolo: flechas, simbolos, punctuacion
// matematicа, bloques, dingbats, flechas grandes, y los emoji supplementarios.
const RANGOS = [
  [0x2190, 0x21ff], // flechas
  [0x2300, 0x23ff], // tecnicos
  [0x2460, 0x24ff], // circulos con numero, parentesis
  [0x2500, 0x257f], // cajas
  [0x25a0, 0x25ff], // formas geometricas
  [0x2600, 0x26ff], // dingbats
  [0x2700, 0x27bf], // dingbats optativos
  [0x2b00, 0x2bff], // flechas y formas grandes
  [0x1f300, 0x1faff], // emoji supplementarios
  [0xfe0f, 0xfe0f], // selector de variacion
  [0x20bb, 0x20bf], // moneda
];

const enRango = (codigo) => RANGOS.some(([a, b]) => codigo >= a && codigo <= b);
// Lo que NO es emoji y hay que dejar tranquilo: acentos y enye, que el launcher esta en espanol y
// quitarlos seria un倒退. Tambien los signos de puntuacion y las flechas ASCII de codigo.
const PERMITIDOS = new Set('áéíóúüñÁÉÍÓÚÜÑ¿¡ºª…—–·×÷±°«»‘’“”€$%');

const ficheros = fs.readdirSync(SRC).filter((n) => /\.(js|html|css)$/.test(n));
const totales = new Map();

for (const nombre of ficheros) {
  const texto = fs.readFileSync(path.join(SRC, nombre), 'utf8');
  const lineas = texto.split(/\r?\n/);
  const delFichero = new Map();
  lineas.forEach((linea, indice) => {
    for (const caracter of linea) {
      const codigo = caracter.codePointAt(0);
      if (codigo < 0x2000) continue;
      if (PERMITIDOS.has(caracter)) continue;
      if (!enRango(codigo)) continue;
      const previo = delFichero.get(caracter) || { veces: 0, lineas: [] };
      previo.veces += 1;
      if (previo.lineas.length < 6) previo.lineas.push(indice + 1);
      delFichero.set(caracter, previo);
    }
  });
  if (delFichero.size) {
    console.log(`\n=== ${nombre} ===`);
    for (const [caracter, info] of [...delFichero].sort((a, b) => b[1].veces - a[1].veces)) {
      const cp = 'U+' + caracter.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      console.log(`  ${caracter}  ${cp.padEnd(7)} ${String(info.veces).padStart(4)} veces  L${info.lineas.join(', L')}`);
      totales.set(caracter, (totales.get(caracter) || 0) + info.veces);
    }
  }
}

console.log('\n=== total, por simbolo ===');
const ordenados = [...totales].sort((a, b) => b[1] - a[1]);
console.log(`  simbolos distintos: ${ordenados.length}`);
console.log(`  apariciones: ${ordenados.reduce((s, [, n]) => s + n, 0)}`);
console.log(`  los diez mas usados: ${ordenados.slice(0, 10).map(([c, n]) => `${c}(${n})`).join(' ')}`);