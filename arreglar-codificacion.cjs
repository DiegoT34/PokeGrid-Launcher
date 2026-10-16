// Deshace la doble codificacion, secuencia a secuencia.
//
// El fichero es MIXTO: unas partes quedaron bien y otras doblemente codificadas. Un viaje completo
// —leer todo como latin-1 y volver— rompe seis caracteres que estaban bien. Hay que ir a buscar las
// secuencias concretas que estan mal y dejar el resto quieta.
//
// COMO SE DISTINGUE UNA DE OTRA
//
// Una «ñ» bien codificada es UN caracter, U+00F1. Una doble son DOS: U+00C3 y U+00B1 —los bytes
// `c3 b1` leidos como latin-1—. La segunda empieza por un caracter de U+00C2 a U+00F4 y le siguen
// uno o mas de U+0080 a U+00BF, que es un rango que en texto normal no aparece. Asi que el patron
// solo caza las rotas, y no toca una «a» acentuada suelta.
const fs = require('node:fs');
const path = require('node:path');

const ruta = path.join(__dirname, process.argv[2] || 'tests/instancia-nueva-pestana-smoke.js');
const bytes = fs.readFileSync(ruta);

let cuerpo = bytes;
if (cuerpo[0] === 0xef && cuerpo[1] === 0xbb && cuerpo[2] === 0xbf) cuerpo = cuerpo.slice(3);

const PATRON = /[\u00c2-\u00f4][\u0080-\u00bf]+/g;
let arregladas = 0;
let dudosas = 0;

const arreglado = cuerpo.toString('utf8').replace(PATRON, (trozo) => {
  const vuelto = Buffer.from(trozo, 'latin1').toString('utf8');
  if (vuelto.includes('\ufffd')) {
    dudosas++;
    return trozo;
  }
  arregladas++;
  return vuelto;
});

if (dudosas > 0) {
  console.log('  ' + dudosas + ' secuencias no se han podido arreglar: se dejan como estaban');
}
fs.writeFileSync(ruta, arreglado, 'utf8');
console.log('  ' + arregladas + ' secuencias arregladas en ' + process.argv[2]);
