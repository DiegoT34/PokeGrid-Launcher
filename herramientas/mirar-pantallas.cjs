// Capturas de las pantallas del launcher, para mirar lo que hay que mirar.
//
// POR QUE EXISTE. Varias veces se ha cambiado algo «que se veía raro» sin poder verlo, y el resultado
// ha sido arreglar una cosa y estropear otra. Con una captura delante, el problema se ve; sin ella hay
// que adivinar, y adivinar sale caro.
//
// QUE HACE. Levanta el launcher de verdad, abre lo que se le pide —el menu, el panel de
// notificaciones, el gestor de perfiles, las pestanas— y guarda un PNG de cada uno. No toca nada del
// proyecto: las capturas van a una carpeta aparte y el resto se deja como estaba.
//
// USO
//   node tests\lanzar.cjs herramientas\mirar-pantallas.cjs
//   node tests\lanzar.cjs herramientas\mirar-pantallas.cjs <carpeta-de-salida>
//
// Lo normal es lanzarlo con `tests\lanzar.cjs` porque el ejecutable de Electron es de subsistema
// grafico y no escribe en la consola de quien lo llama.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const salida = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'pantallas-launcher'));
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-pantallas-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require(path.join(raiz, 'src', 'main.js'));
const { app, BrowserWindow } = electronApi;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarArranque(ventana, hasta = 25_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < hasta) {
    const listo = await ventana.webContents.executeJavaScript('window.__arranqueVista === "ok"').catch(() => false);
    if (listo) return true;
    await dormir(250);
  }
  return false;
}

async function capturar(ventana, nombre, guion) {
  if (guion) await ventana.webContents.executeJavaScript(guion).catch(() => {});
  await dormir(700);
  const imagen = await ventana.webContents.capturePage();
  const destino = path.join(salida, `${nombre}.png`);
  fs.writeFileSync(destino, imagen.toPNG());
  return destino;
}

app.whenReady().then(async () => {
  fs.mkdirSync(salida, { recursive: true });
  let ventana = null;
  const t0 = Date.now();
  while (!ventana && Date.now() - t0 < 25_000) {
    ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
    await dormir(150);
  }
  if (!ventana) {
    console.error('  No aparecio ninguna ventana.');
    app.exit(1);
    return;
  }
  try {
    await esperarArranque(ventana);
    console.log('  Capturas en: ' + salida);

    // El aviso de cuentas aparece la primera vez y TAPA TODO. Si no se quita antes de capturar, las
    // seis capturas salen de la misma pantalla y no se ve nada de lo que se quiere mirar.
    await ventana.webContents.executeJavaScript(`(() => {
      for (const id of ['#accountsBackdrop', '#closeAccountsButton', '#accountsSkipButton']) {
        document.querySelector(id)?.click();
      }
      for (const capa of document.querySelectorAll('.modal-backdrop')) capa.hidden = true;
      return true;
    })()`).catch(() => {});
    await dormir(500);

    const tomas = [
      ['menu', `applySidebarState(true, { persist: false }); true`],
      ['menu-perfiles', `document.querySelector('#perfilesButton')?.click(); true`],
      ['notificaciones', `(document.querySelector('#closePerfilesButton')?.click(),
        openNotificationPanel?.(), true)`],
      ['pestanas', `(closeNotificationPanel?.(), applySidebarState(false, { persist: false }), true)`],
      ['crear-instancia', `openBrowserInstanceModal(); true`],
      ['gestor-perfiles', `(document.querySelector('#cancelBrowserInstanceButton')?.click(),
        abrirGestorDePerfiles(), true)`]
    ];
    for (const [nombre, guion] of tomas) {
      const destino = await capturar(ventana, nombre, guion);
      console.log('    ' + path.basename(destino));
    }

    // MEDIDAS DE LOS ICONOS DE LA BARRA. Una captura enseña que un icono se ve mas grande que
    // otros, pero no CUAL ni por cuanto. Aqui sale el numero de cada uno, y se comparan de un
    // vistazo. Asi se diagnostico «el icono de notificaciones es mas grande que los demas»: no era
    // una sensacion, era un numero concreto contra otro, y ahora esta a derechas.
    const medidas = await ventana.webContents.executeJavaScript(`(() => {
      const salida = [];
      for (const boton of document.querySelectorAll('#globalActions button')) {
        const caja = boton.querySelector('.top-action-icon');
        if (!caja) continue;
        const glifo = caja.querySelector('svg, .launcher-ui-icon') || caja;
        const c = caja.getBoundingClientRect();
        const g = glifo.getBoundingClientRect();
        salida.push({
          boton: boton.id || boton.className.split(' ')[0],
          hijo: glifo.tagName.toLowerCase() + (glifo.className.baseVal ? '.' + glifo.className.baseVal : ''),
          caja: Math.round(c.width) + 'x' + Math.round(c.height),
          glifo: Math.round(g.width) + 'x' + Math.round(g.height),
          color: getComputedStyle(caja).color
        });
      }
      return salida;
    })()`);
    console.log('  Iconos de la barra:');
    for (const m of medidas) {
      console.log('    ' + m.boton.padEnd(22) + m.hijo.padEnd(22) + m.glifo.padEnd(10) + m.caja.padEnd(10) + m.color);
    }
  } catch (error) {
    console.error('  ERROR: ' + (error && error.message ? error.message : error));
  }
  app.exit(0);
});
