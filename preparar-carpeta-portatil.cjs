// Deja la carpeta suelta al dia, copiada del `win-unpacked` que acaba de construir electron-builder.
//
// POR QUE HACE FALTA ESTO
//
// `npm run dist` produce dos cosas: el ZIP y la carpeta `win-unpacked`. La carpeta
// `IDLE-POKE-LAUNCHER-<version>-portatil` —la que tiene un .exe dentro que se abre de un doble
// clic— era una copia que se hizo UNA vez y se quedo ahi. En la siguiente compilacion el ZIP se
// rehizo y ella no, asi que durante toda una entrega hubo un .exe con el MISMO numero de version
// que el ZIP y con codigo de diez horas antes. Un .exe se abre de un doble clic; un ZIP hay que
// descomprimirlo. Lo natural es abrir el .exe, y ese .exe era viejo sin ninguna señal.
//
// Eso no es un fallo de nadie en concreto: es que habia dos artefactos con el mismo nombre y solo
// uno se refrescaba. Ahora se refrescan los dos, en la misma compilacion, y
// `comprobar-entrega.cjs` mira los dos.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = __dirname;
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
const ORIGEN = path.join(RAIZ, 'dist', 'win-unpacked');
const DESTINO = path.join(RAIZ, 'dist', `IDLE-POKE-LAUNCHER-${VERSION}-portatil`);

if (!fs.existsSync(ORIGEN)) {
  console.error('No esta ' + ORIGEN + ': hay que construir antes.');
  process.exit(1);
}

// Si la carpeta esta abierta —alguien ejecutando el launcher— la copia falla a medias y deja una
// mezcla de ficheros viejos y nuevos, que es peor que no copiar. Mejor parar y decirlo.
if (fs.existsSync(DESTINO)) {
  try {
    fs.rmSync(path.join(DESTINO, '.prueba-escritura'), { force: true });
    fs.writeFileSync(path.join(DESTINO, '.prueba-escritura'), 'x');
    fs.rmSync(path.join(DESTINO, '.prueba-escritura'), { force: true });
  } catch {
    console.error('No se puede escribir en ' + DESTINO + '. ¿Esta el launcher abierto? Cierralo y vuelve a compilar.');
    process.exit(1);
  }
}

// robocopy devuelve 0-7 cuando va bien y 8 o mas cuando falla; con `execFileSync` eso es una
// excepcion, asi que se captura y se mira el codigo.
let codigo = 0;
try {
  execFileSync('robocopy', [ORIGEN, DESTINO, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP'],
    { stdio: 'pipe' });
} catch (error) {
  codigo = error.status ?? 16;
}
if (codigo >= 8) {
  console.error('La copia a ' + DESTINO + ' fallo (robocopy ' + codigo + ').');
  process.exit(1);
}

const asar = path.join(DESTINO, 'resources', 'app.asar');
if (!fs.existsSync(asar)) {
  console.error('La carpeta quedo sin asar: ' + asar);
  process.exit(1);
}
console.log('carpeta portatil al dia: ' + path.relative(RAIZ, DESTINO)
  + '  (' + (fs.statSync(asar).size / 1048576).toFixed(1) + ' MB de asar)');
