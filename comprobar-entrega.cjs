// Comprueba LO QUE SE ENTREGA, que no es el ZIP: es lo que la persona abre.
//
// POR QUE EXISTE ESTE FICHERO, CONTADO SIN ADORNOS
//
// El verificador del paquete abre el asar de `dist\win-unpacked`, y el ZIP es otra cosa que se
// empaqueta aparte. Con eso ya habia un hueco: si el ZIP se quedaba atras, el verificador pasaba
// igual. Pero habia un hueco PEOR, y lo pago el usuario: en `dist` habia una carpeta
// `IDLE-POKE-LAUNCHER-0.29.0-portatil` con su .exe dentro, de diez horas antes, y con EL MISMO
// numero de version en el nombre que el ZIP nuevo. Un .exe se puede abrir de un doble clic; un ZIP
// hay que descomprimirlo. Lo natural es abrir el .exe, y ese .exe era viejo sin ninguna señal.
//
// Se entrego un ZIP correcto y se dijo «ya esta», y no estaba: lo que se podia ejecutar era otra
// cosa. Este fichero comprueba las dos, y ademas que no haya NINGUN otro artefacto con la version
// de hoy que se quede atras.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RAIZ = __dirname;
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
const ZIP = path.join(RAIZ, 'dist', `IDLE-POKE-LAUNCHER-${VERSION}-portatil.zip`);
const CARPETA = path.join(RAIZ, 'dist', `IDLE-POKE-LAUNCHER-${VERSION}-portatil`);

// Un cambio de hoy por cada cosa que se hizo. Si alguno falta en un artefacto, ese artefacto es
// viejo por muy reciente que sea su fecha.
const DE_HOY = [
  ['las pestañas se dimensionan a su nombre, no reparten', 'flex: 0 1 auto'],
  ['el minimo por pestaña', 'min-width: 132px'],
  ['y el maximo por pestaña', 'max-width: 240px'],
  ['la X es un boton, no una columna', 'border-radius: 5px'],
  ['el engranaje esta en la lista de iconos del menu', "instanceSettingsButton': 'settings'"],
  ['se pueden arrastrar y reordenar', 'moverInstancia'],
  ['el dialogo se llama Nueva pestaña', 'Nueva pesta'],
  ['el modo se elige con dos botones', 'browserInstanceModeNavegador'],
  ['en modo navegador no se pide el nombre', 'browserInstanceNameField'],
  ['el nombre sigue al titulo de la pagina', 'tituloDePagina'],
  ['el boton del motor en la barra', 'navegacion-motor'],
  ['con la marca de cada motor', 'marcaDeMotor'],
  ['el logo del juego en la pestaña principal', 'instance-tab-icon-logo'],
  ['la costura del aviso de icono', 'avisoDeIcono'],
  ['de que pagina salio el icono', 'origenesDeIcono'],
  ['la costura para pedir la imagen', 'pedirIconoAlProceso'],
  ['el fichero del logo del juego', 'idle-poke-logo-512.png'],
  ['el tope de tamaño del icono', 'esTamanoAdmisible'],
  ['y el oyente del icono al crear la pantalla', 'oyEscuchaElIcono']
];

// Lo que se QUITO y no puede seguir apareciendo. Se busca texto que NO se nombre en ningun
// comentario: si un comentario explica lo que se quito, el texto aparece igual y la comprobacion
// daria un fallo falso — que es tan malo como no comprobar.
const PROHIBIDOS = [
  ['la linea que vaciaba el boton de ajustes', "instanceSettingsButton.innerHTML = launcherUiIcon('settings')"],
  ['el icono clavado en el primer sitio', 'if (iconosDeInstancia.has(instanceId)) return;'],
  ['el interruptor de ventanas emergentes', 'browserInstancePopups']
];

let mal = 0;

const revisar = (nombre, asar, cuando) => {
  console.log('');
  console.log('--- ' + nombre + ' ---');
  console.log('  ' + (asar.length / 1048576).toFixed(1) + ' MB, ' + cuando.toLocaleString('es-ES'));
  let fallos = 0;
  for (const [que, texto] of DE_HOY) {
    const esta = asar.indexOf(Buffer.from(texto, 'utf8')) >= 0;
    if (!esta) {
      fallos++;
      console.log('  FALTA  ' + que + '  («' + texto.slice(0, 40) + '»)');
    }
  }
  for (const [que, texto] of PROHIBIDOS) {
    if (asar.indexOf(Buffer.from(texto, 'utf8')) >= 0) {
      fallos++;
      console.log('  SIGUE  ' + que);
    }
  }
  if (fallos === 0) console.log('  ok     lleva los ' + DE_HOY.length + ' cambios y nada de lo quitado');
  mal += fallos;
};

// --- 1. El ZIP, y se saca SOLO el asar, no los 349 MB ---
if (!fs.existsSync(ZIP)) {
  console.log('  no esta el ZIP ' + path.basename(ZIP));
  mal++;
} else {
  const temporal = path.join(RAIZ, 'dist', 'mirar-zip');
  fs.rmSync(temporal, { recursive: true, force: true });
  fs.mkdirSync(temporal, { recursive: true });
  const ps = [
    'Add-Type -AssemblyName System.IO.Compression.FileSystem;',
    `$z = [System.IO.Compression.ZipFile]::OpenRead('${ZIP.replace(/'/g, "''")}');`,
    "$e = $z.Entries | Where-Object { $_.FullName -like '*app.asar' } | Select-Object -First 1;",
    "if (-not $e) { Write-Output 'SIN-ASAR'; exit 1 }",
    `[System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, '${path.join(temporal, 'app.asar').replace(/'/g, "''")}', $true);`,
    '$z.Dispose(); Write-Output "OK"'
  ].join(' ');
  const marca = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
  if (marca !== 'OK') {
    console.log('  no se pudo sacar el asar del ZIP: ' + marca);
    mal++;
  } else {
    revisar('el ZIP', fs.readFileSync(path.join(temporal, 'app.asar')), fs.statSync(ZIP).mtime);
  }
  fs.rmSync(temporal, { recursive: true, force: true });
}

// --- 2. La CARPETA suelta, que es lo que se abre de un doble clic ---
if (!fs.existsSync(CARPETA)) {
  console.log('');
  console.log('--- la carpeta suelta ---');
  console.log('  no esta; no hay ningun .exe suelto con el que confundirse');
} else {
  const asarCarpeta = path.join(CARPETA, 'resources', 'app.asar');
  if (!fs.existsSync(asarCarpeta)) {
    console.log('');
    console.log('--- la carpeta suelta ---');
    console.log('  hay carpeta pero sin asar: ' + CARPETA);
    mal++;
  } else {
    revisar('la carpeta suelta (lo que se abre de un doble clic)', fs.readFileSync(asarCarpeta),
      fs.statSync(asarCarpeta).mtime);
  }
}

console.log('');
console.log(mal === 0
  ? 'lo que se entrega lleva todo: el ZIP y lo que se puede ejecutar'
  : mal + ' problemas en lo que se entrega');
process.exit(mal === 0 ? 0 : 1);
