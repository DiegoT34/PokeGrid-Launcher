// LAS CAPTURAS DEL README.
//
// POR QUE EXISTE. Las del repositorio se hicieron a mano en agosto de la 0.22 y en cuatro meses el
// launcher ha cambiado de cara: el menú tiene el perfil en la cabecera, ya no está el botón de
// actualizar, la rejilla de avatares enseña fotos y hay una sección de actualizaciones en
// Configuraciones. Una captura vieja no es «un poco antigua»: es una descripción de un programa que
// ya no existe, y encima es lo primero que ve quien llega.
//
// QUE HACE. Dos modos, porque hay dos maneras de abrir el launcher y ninguna sirve para todo.
//
//   app     — el launcher de verdad, con el proceso principal de verdad. Es lo único que sirve para lo
//             nuevo: los avatares son sprites de verdad descargados de PokeAPI, y las capturas del
//             menú o de Configuraciones tienen que salir de la aplicación que se entrega.
//   preview — un preload de pruebas que inventa cuatro cuentas. Sin el, no hay rejilla con cuatro
//             cuentas ni paneles con contenido, porque eso solo existe cuando hay una sesión iniciada
//             en el juego. Se usa para la imagen principal y para los paneles.
//
//   node tests\lanzar.cjs herramientas\capturas-readme.cjs <app|preview>
//
// Lo normal es lanzarlo con `tests\lanzar.cjs`, porque el ejecutable de Electron es de subsistema
// grafico y no escribe en la consola de quien lo llama.
//
// NO TOCA NADA DEL PROYECTO. Las capturas van a `docs/assets/` y el resto se queda como estaba.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const modo = String(process.argv[2] || 'app').trim().toLowerCase();
const salida = path.join(raiz, 'docs', 'assets');
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// La medida de las capturas anteriores del repositorio. Mantenerla es lo que hace que las imagenes
// nuevas encajen con las viejo en la pagina en vez de dar un salto al pasar una.
const ANCHO = 1440;
const ALTO = 940;

// La ventana se ajusta al area util de la pantalla, y el tamaño se pide por CONTENIDO. Pedirlo por
// ventana hace que el marco se coma parte de la altura y la captura sale mas baja de lo pedido; y
// pedir mas alto que la pantalla hace que el sistema la recorte en silencio, que es lo que pasaba:
// se pedian 940 px y salian 700.
//
// `getAllDisplays` vive en `screen`, NO en `BrowserWindow`. Y el `catch` no es decorativo: cuando esto
// falla la promesa se rechaza, la ventana no llega a crearse y el proceso de Electron se queda vivo
// sin nada que lo cierre —que es como una ejecucion entera parece colgada en vez de fallar.
function tamanoDeLaVentana() {
  const area = electronApi.screen.getAllDisplays()[0].workAreaSize;
  return {
    width: Math.min(ANCHO, area.width - 40),
    height: Math.min(ALTO, area.height - 60)
  };
}

// Una captura con su nombre. `guion` se ejecuta ANTES de esperar: es lo que abre la pantalla que se
// quiere retratar. Sin ese paso las imagenes salen todas de lo mismo, que es como se mezcla una foto
// de una pantalla con el nombre de otra sin darse cuenta.
async function capturar(ventana, nombre, guion, espera = 900) {
  if (guion) {
    // El guion va ENVUELTO en su propio try/catch, y el motivo vuelve como cadena.
    //
    // Esto no es defensive coding, es la unica forma de ver un fallo. `executeJavaScript` convierte
    // CUALQUIER excepcion en «Script failed to execute» y no dice cual fue: por eso el try/catch va
    // DENTRO del codigo inyectado y no fuera. Con el fuera —que es lo natural— el error real se
    // pierde y lo unico que se ve es que «algo» fallo.
    const envuelto = `(async () => {
      try {
        ${guion}
      } catch (error) {
        return '__ERROR__' + (error && error.message ? error.message : String(error));
      }
    })()`;
    const resultado = await ventana.webContents.executeJavaScript(envuelto).catch((error) => {
      return '__ERROR__' + (error && error.message ? error.message : String(error));
    });
    if (typeof resultado === 'string' && resultado.startsWith('__ERROR__')) {
      console.error(`  ERROR en el guion de ${nombre}: ${resultado.slice(9)}`);
    }
  }
  await dormir(espera);
  const imagen = await ventana.webContents.capturePage();
  fs.mkdirSync(salida, { recursive: true });
  const destino = path.join(salida, `${nombre}.png`);
  fs.writeFileSync(destino, imagen.toPNG());
  console.log(`  ${nombre}.png`);
  return destino;
}

// El modal de cuentas aparece la primera vez y TAPA TODO. Si no se quita antes de capturar, todas las
// imagenes salen de la misma pantalla y no se ve nada de lo que se quiere retratar.
async function quitarElAvisoDeCuentas(ventana) {
  await ventana.webContents.executeJavaScript(`(() => {
    for (const id of ['#accountsBackdrop', '#closeAccountsButton', '#accountsSkipButton']) {
      document.querySelector(id)?.click();
    }
    for (const capa of document.querySelectorAll('.modal-backdrop')) capa.hidden = true;
    return true;
  })()`).catch(() => {});
  await dormir(400);
}

async function esperarListo(ventana, hasta = 30_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < hasta) {
    const listo = await ventana.webContents.executeJavaScript(
      'window.__arranqueVista === "ok" || document.querySelector("#topbarToggle") !== null'
    ).catch(() => false);
    if (listo) return true;
    await dormir(250);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// MODO APP: el launcher de verdad.
// ---------------------------------------------------------------------------------------------
async function modoApp() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-capturas-'));
  process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userData;
  require(path.join(raiz, 'src', 'main.js'));
  const { app, BrowserWindow } = electronApi;

  await app.whenReady();
  let ventana = null;
  const t0 = Date.now();
  while (!ventana && Date.now() - t0 < 30_000) {
    ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
    await dormir(150);
  }
  if (!ventana) {
    console.error('  No aparecio ninguna ventana.');
    app.exit(1);
    return;
  }
  // Los guiones de este modo usan SOLO botones del DOM, no funciones sueltas como `applySidebarState`.
// Dos motivos: esas funciones viven dentro del cierre del renderer y no todas son globales —llamarlas
// desde aqui falla con «no esta definida» y nada mas—, y ademas pulsar el boton es lo mismo que hace
// una persona, asi que la captura sale de verdad y no de un estado montado a mano.
try {
    await esperarListo(ventana);
    console.log(`  Capturas en: ${salida}`);

    // EL MENU, con el perfil en la cabecera. Es la imagen que resume el launcher de un vistazo.
    await quitarElAvisoDeCuentas(ventana);
    await capturar(ventana, 'menu', 'document.querySelector("#topbarToggle")?.click(); true');

    // LOS PERFILES, con la rejilla de avatares abierta. Es la captura que demuestra que las fotos se
    // ven: la rejilla tarda en llenarse porque baja los sprites de PokéAPI, y por eso espera bastante.
    // EL MODAL DE CUENTAS SE ABRE TARDE —primero contesta el proceso principal— y tapa todo. Por eso
    // se limpia antes de CADA captura y no una vez al principio: limpio al principio salia
    // igualmente encima de las cinco imagenes, y ninguna de ellas era la que se queria.
    await quitarElAvisoDeCuentas(ventana);
    await capturar(ventana, 'perfiles', `(() => {
      document.querySelector('#topbarToggle')?.click();
      document.querySelector('#perfilesButton')?.click();
      const primero = document.querySelector('#perfilesList .perfil-circulo:not(.es-nuevo)');
      if (primero) primero.click();
      document.querySelector('#perfilEditorAvatar')?.click();
      // El dialogo es mas alto que la pantalla y se corta por abajo. Se sube la rejilla hasta arriba
      // para que las fotos se vean enteras, que es justo lo que la captura tiene que demostrar.
      document.querySelector('#perfilAvatarGrid')?.scrollIntoView({ block: 'start' });
      return true;
    })()`, 14_000);

    // LAS NOTIFICACIONES, que son el panel de actividad multicuenta.
    await quitarElAvisoDeCuentas(ventana);
    await capturar(ventana, 'notificaciones', `(() => {
      document.querySelector('[data-close-perfiles]')?.click();
      document.querySelector('#notificationButton')?.click();
      return true;
    })()`);

    // CONFIGURACIONES, con la fila de actualizaciones. Es donde vive el actualizador desde la 0.39.0.
    await quitarElAvisoDeCuentas(ventana);
    await capturar(ventana, 'configuraciones', `(() => {
      document.querySelector('#notificationButton')?.click();
      document.querySelector('#instanceSettingsButton')?.click();
      // Con 'center' la fila de actualizaciones queda centrada y el titulo del dialogo se va por
      // arriba: una captura que empieza a mitad de una cabecera parece una ventana rota. Con 'end'
      // la fila entra entera y el dialogo se ve cerrado.
      document.querySelector('#instanceSettingsUpdatesField')?.scrollIntoView({ block: 'end' });
      return true;
    })()`);

    // EL MODAL DE CREAR INSTANCIA, con el selector de perfil y su circulo.
    await quitarElAvisoDeCuentas(ventana);
    await capturar(ventana, 'crear-instancia', `(() => {
      document.querySelector('#closeInstanceSettingsButton')?.click();
      document.querySelector('#topbarToggle')?.click();
      document.querySelector('#addBrowserInstanceButton')?.click();
      return true;
    })()`);
  } catch (error) {
    console.error(`  ERROR: ${error && error.message ? error.message : error}`);
  }
  app.exit(0);
}

// ---------------------------------------------------------------------------------------------
// MODO PREVIEW: cuatro cuentas de mentira y paneles con contenido.
// ---------------------------------------------------------------------------------------------
// Que existan las cuatro pantallas. Es lo unico que se espera de verdad: sin ellas el preload de
// pruebas no hadevuelto nada y todo lo que se capture sale vacio.
async function esperarPaneles(ventana, cuantos = 4, hasta = 30_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < hasta) {
    const listo = await ventana.webContents.executeJavaScript(
      `document.querySelectorAll('.panel').length === ${cuantos}`
    ).catch(() => false);
    if (listo) return true;
    await dormir(250);
  }
  return false;
}

async function modoPreview() {
  const { app, BrowserWindow } = electronApi;
  await app.whenReady();
  const medida = tamanoDeLaVentana();
  const ventana = new BrowserWindow({
    show: true,
    useContentSize: true,
    width: medida.width,
    height: medida.height,
    webPreferences: {
      preload: path.join(raiz, 'tests', 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    // EL ALMACENAMIENTO SE BORRA ANTES DE ABRIR LA PAGINA.
    //
    // La vista por defecto es la rejilla, asi que con el almacenamiento limpio sale bien. Lo que no
    // vale es confiar en que este limpio: esta ventana comparte sesion con las ejecuciones anteriores,
    // y si alguna dejo la vista en «pestanas» —que ya paso— todas las siguientes salen con una sola
    // pantalla y no dicen por que. La primera version de esto forceaba la vista y recargaba la pagina;
    // recargar aqui cuelga la ejecucion entera, y para lo mismo que hace falta esta linea.
    await app.whenReady();
    const sesion = ventana.webContents.session;
    await sesion.clearStorageData().catch(() => {});
    await sesion.clearCache().catch(() => {});

    await ventana.loadFile(path.join(raiz, 'src', 'index.html'));
    await esperarPaneles(ventana);
    await quitarElAvisoDeCuentas(ventana);
    console.log(`  Capturas en: ${salida}  (${medida.width}x${medida.height})`);

    // LA IMAGEN PRINCIPAL: las cuatro cuentas con el menú abierto, que es lo que resume el launcher.
    await capturar(ventana, 'launcher-grid', 'applySidebarState(true, { persist: false }); true', 1400);

    // Y la misma rejilla sin el menu encima, que es donde se ven los paneles de verdad.
    await capturar(ventana, 'rejilla', 'applySidebarState(false, { persist: false }); true');

    // LOS PANELES. Cada uno se cierra antes de abrir el siguiente: si no, se quedan los cuatro
    // abiertos a la vez y la captura sale con tres cosas encima de una.
    await capturar(ventana, 'hunt-analyzer', `(() => {
      aplicarSidebarState(false, { persist: false });
      return window.__pokeGridPreviewHuntAnalyzer(true);
    })()`, 1500);

    await capturar(ventana, 'capture-log', `(() => {
      window.__pokeGridPreviewHuntAnalyzer(false);
      return window.__pokeGridPreviewCaptureLog(true);
    })()`, 1500);

    await capturar(ventana, 'farm-mode', `(() => {
      window.__pokeGridPreviewCaptureLog(false);
      openFarmModal();
      return true;
    })()`, 1800);
  } catch (error) {
    console.error(`  ERROR: ${error && error.message ? error.message : error}`);
  }
  app.exit(0);
}

// Un fallo aqui NO puede quedarse con Electron vivo. Sin esta guarda, un rechazo en cualquier punto
// deja el proceso encendido sin ventana y sin trabajo: quien lo lanza espera a un timeout de varios
// minutos y no ve el motivo. Se vio dos veces antes de ponerla.
const arranque = modo === 'preview' ? modoPreview() : modoApp();
arranque.catch((error) => {
  console.error(`  ERROR: ${error && error.stack ? error.stack : error}`);
  electronApi.app.exit(1);
});