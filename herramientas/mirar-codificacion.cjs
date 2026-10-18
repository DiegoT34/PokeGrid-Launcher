// Mira la codificacion de un fichero de prueba.
//
// POR QUE
//
// En la salida de la ultima prueba los nombres de las comprobaciones salian como «el diÃ¡logo se
// llama Nueva pestaÃ±a» mientras los valores leidos de la pagina salian bien. Eso apunta a que el
// fichero de prueba no esta en UTF-8: los literales con acentos estan mal, y una comprobacion que
// compara contra un literal mal escrito falla aunque el codigo este bien. Justo lo que ha pasado.
const fs = require('node:fs');
const path = require('node:path');

const ruta = path.join(__dirname, '..', process.argv[2] || 'tests/instancia-nueva-pestana-smoke.js');
const bytes = fs.readFileSync(ruta);

console.log('  fichero: ' + process.argv[2]);
console.log('  BOM: ' + (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 'si' : 'no'));

// Se busca el trozo «Nueva pesta» y se miran los bytes que vienen detras.
const marca = Buffer.from('Nueva pesta', 'utf8');
const i = bytes.indexOf(marca);
if (i < 0) {
  console.log('  no encuentro «Nueva pesta» en el fichero');
} else {
  const cola = [...bytes.slice(i + marca.length, i + marca.length + 3)];
  console.log('  bytes tras «Nueva pesta»: ' + cola.map((x) => x.toString(16).padStart(2, '0')).join(' '));
  console.log('  esperado para UTF-8 (ñ = c3 b1): c3 b1' + (cola[0] === 0xc3 && cola[1] === 0xb1 ? '  -> CORRECTO' : '  -> MAL'));
  if (cola[0] === 0xc3 && cola[1] === 0x83) console.log('  parece doble codificado (c3 83 c2 b1)');
}

// Y un recuento: cuantos caracteres no ASCII hay y si el texto decodifica limpio.
const texto = bytes.toString('utf8');
const raros = (texto.match(/\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]/g) || []).length;
console.log('  secuencias con pinta de doble codificado: ' + raros);
