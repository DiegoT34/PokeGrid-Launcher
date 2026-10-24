// El control por Telegram guarda su configuracion en el almacen compartido del launcher, no en el
// localStorage de una pagina. Esa cadena tiene cuatro eslabones —panel, runtime del userscript,
// puente del guest-preload y proceso principal— y un fallo en cualquiera deja el panel diciendo que
// guardo cuando no guardo nada. Esta prueba la recorre entera con el launcher de verdad: perfil
// temporal, una cuenta, una pagina falsa servida en el origen del juego y una recarga al final.
//
// No usa la red: el origen del juego lo sirve un protocol handler y Telegram se manda a localhost.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const raiz = path.join(__dirname, '..');
// Perfil fijo y limpio al empezar: si fuera mkdtemp, cada vuelta dejaria un perfil de Chromium
// entero en TEMP. El anterior ya no esta en uso porque la puerta mata Electron entre pruebas.
const userDataDir = path.join(os.tmpdir(), 'opencode', 'pokegrid-telegram-persistencia');
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.mkdirSync(userDataDir, { recursive: true });
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

const electronApi = require('electron');
electronApi.app.commandLine.appendSwitch('host-resolver-rules', 'MAP api.telegram.org 127.0.0.1');
require('../src/main.js');
const { app, BrowserWindow, safeStorage, session, webContents } = electronApi;

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const GAME_ORIGIN = 'https://poke.idleworld.online';
const SCRIPT_ID = 'control-persistencia-prueba';
const TOKEN = '123456:ABCDEFGHIJKLMNOPQRSTUVWX';

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'mapa-falso.html'), 'utf8');
const codigo = fs.readFileSync(path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

async function esperar(condicion, ms = 20_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < ms) {
    try {
      if (await condicion()) return true;
    } catch { /* la pagina puede estar navegando */ }
    await dormir(150);
  }
  return false;
}

async function esperarVentana() {
  let ventana = null;
  await esperar(async () => {
    ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()
      && w.webContents.getURL().endsWith('/index.html')) || null;
    return Boolean(ventana);
  });
  return ventana;
}

app.whenReady().then(async () => {
  let ventana = null;
  try {
    // 1. El perfil temporal arranca sin cuentas. Se le escribe una y el script del control, ya
    //    habilitado para esa cuenta, y se recarga la ventana para que el renderer los lea.
    ventana = await esperarVentana();
    comprobar(Boolean(ventana), 'El launcher abre su ventana');
    if (!ventana) throw new Error('Sin ventana no hay nada que probar.');

    fs.writeFileSync(
      path.join(userDataDir, 'accounts.enc'),
      safeStorage.encryptString(JSON.stringify([{ id: 1, label: 'PRUEBA', username: '', password: '' }]))
    );
    fs.writeFileSync(path.join(userDataDir, 'userscripts.json'), JSON.stringify([{
      id: SCRIPT_ID,
      code: codigo,
      enabled: true,
      accounts: [true],
      sourceUrl: pathToFileURL(path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js')).href
    }]));

    // 2. La pagina del juego se sirve desde el propio origen, sin salir a internet.
    const juego = session.fromPartition('persist:pokegrid-1');
    juego.protocol.handle('https', (peticion) => {
      const url = new URL(peticion.url);
      if (url.hostname !== 'poke.idleworld.online') {
        return new Response(JSON.stringify({ ok: true, result: [] }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(fixture, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    });

    const recargada = new Promise((resolve) => ventana.webContents.once('did-finish-load', resolve));
    ventana.webContents.reload();
    await recargada;

    // 3. Espera a la webview del juego y a que el script monte su panel.
    const encontrarJuego = () => webContents.getAllWebContents().find((wc) => {
      if (wc.isDestroyed()) return false;
      try { return wc.getURL().startsWith(GAME_ORIGIN); } catch { return false; }
    }) || null;
    const hayJuego = await esperar(() => Boolean(encontrarJuego()), 20_000);
    comprobar(hayJuego, 'La cuenta abre su webview en el origen del juego');
    if (!hayJuego) throw new Error('La webview del juego no llego a abrirse.');

    const juegoWc = encontrarJuego();
    const hayPanel = await esperar(() => juegoWc.executeJavaScript(
      "Boolean(document.querySelector('.pgc-boton') && document.querySelector('.pgc-panel'))"));
    comprobar(hayPanel, 'El script del control monta su panel dentro del juego');
    if (!hayPanel) throw new Error('El panel no aparecio.');

    // 4. Guarda desde el panel, como el usuario.
    const guardado = await juegoWc.executeJavaScript(`(async () => {
      const panel = document.querySelector('.pgc-panel');
      panel.querySelector('[data-campo="token"]').value = ${JSON.stringify(TOKEN)};
      panel.querySelector('[data-campo="autorizados"]').value = '111, 222';
      panel.querySelector('[data-campo="orre"]').checked = true;
      panel.querySelector('[data-accion="guardar"]').click();
      await new Promise((r) => setTimeout(r, 1200));
      return {
        aviso: panel.querySelector('.pgc-estado').textContent,
        token: panel.querySelector('[data-campo="token"]').value,
        ids: panel.querySelector('[data-campo="autorizados"]').value
      };
    })()`);

    const almacen = path.join(userDataDir, 'userscripts-shared.enc');
    const hayAlmacen = await esperar(() => fs.existsSync(almacen), 5000);
    comprobar(hayAlmacen, 'Guardar escribe el almacen compartido en disco', guardado.aviso);
    if (!hayAlmacen) throw new Error('No se creo el almacen compartido.');

    const contenido = JSON.parse(safeStorage.decryptString(fs.readFileSync(almacen)));
    const config = contenido?.[SCRIPT_ID]?.['pgc:config'];
    comprobar(Boolean(config), 'El almacen guarda la configuracion bajo el id del script');
    comprobar(config?.token === TOKEN, 'El token llega intacto al disco');
    comprobar(JSON.stringify(config?.autorizados) === JSON.stringify(['111', '222']), 'Los ids llegan al disco');
    comprobar(config?.orre === true, 'El permiso de Orre llega al disco');

    // 5. Recarga la pagina del juego: el panel tiene que rellenar los campos desde el almacen.
    const recargaJuego = new Promise((resolve) => juegoWc.once('did-finish-load', resolve));
    juegoWc.reload();
    await recargaJuego;

    const relleno = await esperar(() => juegoWc.executeJavaScript(`(() => {
      const panel = document.querySelector('.pgc-panel');
      return Boolean(panel) && panel.querySelector('[data-campo="token"]').value === ${JSON.stringify(TOKEN)};
    })()`), 15_000);
    comprobar(relleno, 'Tras recargar, el panel recupera el token del almacen compartido');

    if (relleno) {
      const campos = await juegoWc.executeJavaScript(`(() => {
        const panel = document.querySelector('.pgc-panel');
        return {
          token: panel.querySelector('[data-campo="token"]').value,
          ids: panel.querySelector('[data-campo="autorizados"]').value,
          orre: panel.querySelector('[data-campo="orre"]').checked
        };
      })()`);
      comprobar(campos.ids === '111, 222', 'Y tambien los ids', campos.ids);
      comprobar(campos.orre === true, 'Y el permiso de Orre');
    }
  } catch (error) {
    comprobar(false, 'La prueba termino sin reventar', String(error && error.message || error));
  } finally {
    if (fallos.length) {
      console.error(`Control Telegram (persistencia) FALLA: ${fallos.join(' | ')}`);
      app.exit(1);
      return;
    }
    console.log('Control Telegram (persistencia) OK: panel, puente, disco y recarga.');
    app.exit(0);
  }
});
