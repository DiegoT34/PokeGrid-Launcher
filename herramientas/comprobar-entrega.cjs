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
// cosa. Este fichero comprueba LAS DOS, y por eso es el que se mira antes de decir que ya esta.
//
// LO QUE ESTE FICHERO NO COMPRUEBA, y antes este mismo comentario decia que si
//
// Decia «y ademas que no haya NINGUN otro artefacto con la version de hoy que se quede atras». No lo
// hacia: no hay ninguna lista de ficheros en `dist`. Un comentario que promete una red que no existe
// es peor que no tenerla, porque el que lo lee se cree protegido y no lo esta. Se corrige aqui en
// lugar de anadir la comprobacion porque hoy no haria falta: cada entrega cambia el numero de
// version, y los artefactos de la anterior se conservan a proposito. Si alguna vez se compila dos
// veces la misma version, esto hay que mirarlo otra vez.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
const ZIP = path.join(RAIZ, 'dist', `IDLE-POKE-LAUNCHER-${VERSION}-portatil.zip`);
const CARPETA = path.join(RAIZ, 'dist', `IDLE-POKE-LAUNCHER-${VERSION}-portatil`);

// Un cambio de hoy por cada cosa que se hizo. Si alguno falta en un artefacto, ese artefacto es
// viejo por muy reciente que sea su fecha.
const DE_HOY = [
  // 0.32.0 — anadir y quitar pantallas, y Google por defecto
  ['el boton de anadir pantalla', 'instance-mas-pantalla'],
  ['el boton de quitar pantalla', 'instance-menos-pantalla'],
  ['la accion de anadir', 'function anadirPantallaAInstancia'],
  ['la accion de quitar', 'function cerrarPantallaDeInstancia'],
  ['el que pone los botones al dia', 'function refrescarBotonesDePantallas'],
  ['el boton de agrandar, que ahora se puede esconder', 'instance-expand'],
  ['que con una sola pantalla no se vea el de agrandar', 'expandButton.hidden = total < 2'],
  ['que no se pueda quedar una instancia sin pantallas', 'menosPantallaButton.disabled = total <= 1'],
  ['los indices guardados, para no renumerar al cerrar', 'function indicesDePantallas'],
  ['Google como motor de fabrica', "BUSCADOR_POR_DEFECTO = 'google'"],

  // 0.31.0 — dormir lo que no se mira
  ['la regla de duermete, escrita en el renderer', 'aplicarDescanso'],
  ['que una pantalla duerme si no es la pestaña abierta', 'panelEstaEnPantalla'],
  ['el cierre que de verdad destruye el proceso', 'destruirPanelDeVerdad'],
  ['la llamada a destroy que no existia', 'webview.destroy()'],
  ['borrar la particion de una instancia quitada', 'instancia:borrar-particion'],
  ['que al minimizar se duerma todo', 'dormirTodosLosInvitados'],
  ['los sondeos solo con la pantalla a la vista', 'panel.captureLogOpen && panelEstaEnPantalla'],
  ['el analizador tambien', 'panel.huntOpen && panelEstaEnPantalla'],
  // El sondeo no debe leer cuentas que no se estan mirando. Desde la 0.36.0 solo se salta esa lectura
  // cuando el farmeo esta EN USO, que es cuando hace falta leer todas; la forma nueva lo dice.
  ['y el sondeo de farmeo tambien', 'accountIndex === null && !leerTodas && !panelEstaEnPantalla'],
  ['el archivo de capturas ya no se copia entero cada tic', 'indiceEstable'],
  ['el relleno del acceso tiene hora de expiration', '__pokeGridSubmitWatcherVence'],
  ['el tope del archivo de iconos', 'ICONOS_EN_CACHE'],

  // 0.30.0 — barra, diálogo y motor
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
  // 0.31.0 — lo que se ha quitado para poder dormir lo que no se mira.
  //
  // Estas formas son DELIBERADAMENTE del codigo y no el texto suelto. `backgroundThrottling=no`
  // aparece en un comentario de renderer.js que explica por que se quito —y buscarlo a pelo
  // daria un fallo falso—, pero la forma de codigo que lo quita no aparece en ningun comentario.
  // Una invariante que se cumple a si misma por su propio texto no vigila nada.
  ['el interruptor global que hacia correr TODO', "appendSwitch('disable-renderer-backgrounding')"],
  ['la preferencia que prohibia atenuar', 'backgroundThrottling: false'],
  ['la preferencia en las webviews de instancia', "setAttribute('webpreferences', 'backgroundThrottling=no"],
  ['el nombre de la API nueva, que se llamaba al reves', 'setPanelThrottling'],

  // 0.30.0
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
// El ZIP ya no se entrega en cada compilacion: `npm run dist` construye solo la carpeta con el .exe,
// que es lo que se abre de un doble clic, y el ZIP sale con `npm run dist:zip` cuando se pide. Asi que
// aqui el ZIP ya no es un fallo: su ausencia es lo normal y hay que decirselo sin drama.
if (!fs.existsSync(ZIP)) {
  console.log('  no hay ZIP de esta version (normal: sale con `npm run dist:zip`)');
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
  ? (fs.existsSync(ZIP)
    ? 'lo que se entrega lleva todo: el ZIP y lo que se puede ejecutar'
    : 'lo que se entrega lleva todo: la carpeta que se abre de un doble clic (el ZIP sale con npm run dist:zip)')
  : mal + ' problemas en lo que se entrega');
process.exit(mal === 0 ? 0 : 1);
