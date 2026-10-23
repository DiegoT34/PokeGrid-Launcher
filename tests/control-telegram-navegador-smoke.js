// Pruebas del control por Telegram con una pagina de verdad. El script se inyecta en una ventana de
// Electron con un DOM que imita el del juego, y con dobles de GM_* en el mundo principal.
//
// La pagina se sirve por HTTP local y NO como `file://`. El lector comprueba que esta en `/play` —como
// el juego— y con una ruta de fichero esa comprobacion seria falsa siempre, asi que la prueba del
// lector pasaria por el motivo equivocado.
const assert = require('node:assert/strict');
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const script = fs.readFileSync(
  path.join(raiz, 'userscripts', 'PokeGrid-Telegram-Control.user.js'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'mapa-falso.html'), 'utf8');

// Un servidor de verdad, escuchando solo en localhost y en un puerto libre. Se cierra al terminar.
function servir() {
  const servidor = http.createServer((peticion, respuesta) => {
    if (peticion.url === '/play') {
      respuesta.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      respuesta.end(fixture);
      return;
    }
    respuesta.writeHead(404);
    respuesta.end('');
  });
  return new Promise((resolve) => {
    servidor.listen(0, '127.0.0.1', () => resolve({ servidor, puerto: servidor.address().port }));
  });
}

app.whenReady().then(async () => {
  const { servidor, puerto } = await servir();
  const ventana = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false } });
  try {
    await ventana.loadURL(`http://127.0.0.1:${puerto}/play`);
    await ventana.webContents.executeJavaScript(`(() => {
      globalThis.__almacen = {};
      globalThis.__telegramEnviados = [];
      globalThis.GM_info = { script: { account: { index: 0, label: 'SHOCKVOR' } } };
      globalThis.GM_getSharedValue = async (k, d) => (k in __almacen ? __almacen[k] : d);
      globalThis.GM_setSharedValue = async (k, v) => { __almacen[k] = v; };
      globalThis.GM_deleteSharedValue = async (k) => { delete __almacen[k]; };
      globalThis.GM_getValue = (k, d) => d;
      globalThis.GM_setValue = () => {};
      globalThis.GM_addStyle = () => {};
      globalThis.GM_xmlhttpRequest = () => {};
      return true;
    })()`);
    await ventana.webContents.executeJavaScript(script);

    // El `try/catch` va DENTRO del codigo inyectado. Electron convierte cualquier excepcion en
    // «Script failed to execute» y no dice cual fue: fuera del codigo, el motivo real se pierde y solo
    // se ve que «algo» fallo.
    const leido = await ventana.webContents.executeJavaScript(`(() => {
      try { return { ok: true, valor: __pgControl.leerEstadoPagina() }; }
      catch (error) { return { ok: false, error: String(error && error.message ? error.message : error) }; }
    })()`);
    assert.equal(leido.ok, true, `El lector fallo: ${leido.error}`);
    const estado = leido.valor;
    assert.equal(estado.ready, true, 'La pagina esta dentro del juego.');
    assert.equal(estado.trainerName, 'SHOCKVOR');
    assert.equal(estado.location, 'Kanto · Ruta 12');
    assert.equal(estado.leader.nombre, 'Blastoise');
    assert.equal(estado.leader.nivel, 85);
    assert.equal(estado.leader.hp, 120);
    assert.equal(estado.leader.maxHp, 180);

    console.log('Control Telegram (navegador) OK: lector del estado.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  ventana.destroy();
  servidor.close();
  app.exit(process.exitCode || 0);
});
