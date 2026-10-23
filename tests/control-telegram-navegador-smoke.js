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

    // El helper repite el patron de arriba: la excepcion se captura DENTRO y se devuelve como texto.
    const ejecutar = async (cuerpo) => ventana.webContents.executeJavaScript(`(async () => {
      try { return { ok: true, valor: await (${cuerpo}) }; }
      catch (error) { return { ok: false, error: String(error && error.message ? error.message : error) }; }
    })()`);

    // --- Viaje
    const viaje = await ejecutar(
      `__pgControl.viajarA({ slug: 'blastoise', nombre: 'Blastoise', mapa: 'kanto' }, { orre: false })`);
    assert.equal(viaje.ok, true, `viajarA revento: ${viaje.error}`);
    assert.equal(viaje.valor.ok, true, `El viaje tiene que funcionar: ${viaje.valor.mensaje}`);
    const despues = await ventana.webContents.executeJavaScript(`(() => ({
      mapaAbierto: !document.querySelector('.map-window').hidden,
      ubicacion: document.querySelector('.phud-tloc').textContent.trim(),
      viajePulsado: document.querySelector('.map-travel').dataset.pulsado === 'true'
    }))()`);
    assert.equal(despues.mapaAbierto, true, 'El viaje abre el mapa si estaba cerrado.');
    assert.equal(despues.viajePulsado, true, 'Y pulsa viajar.');

    // --- Un destino que no esta en el mapa hasta que se busca
    const porBuscador = await ejecutar(
      `__pgControl.viajarA({ slug: 'onix', nombre: 'Onix' }, { orre: false })`);
    assert.equal(porBuscador.ok, true, `viajarA revento con onix: ${porBuscador.error}`);
    assert.equal(porBuscador.valor.ok, true,
      `El viaje tiene que funcionar tambien buscando: ${porBuscador.valor.mensaje}`);

    // --- Un destino que no existe
    const fallo = await ejecutar(
      `__pgControl.viajarA({ slug: 'no-existe', nombre: 'NoExiste' }, { orre: false })`);
    assert.equal(fallo.ok, true, `viajarA revento con un destino inexistente: ${fallo.error}`);
    assert.equal(fallo.valor.ok, false, 'Un destino que no esta en el mapa tiene que fallar.');
    assert.ok(/no encontr/i.test(fallo.valor.mensaje),
      `El error dice que no lo encontro: ${fallo.valor.mensaje}`);

    // --- Panel de configuracion
    const panel = await ejecutar(`(() => {
      const abrir = document.querySelector('.pgc-boton');
      const caja = document.querySelector('.pgc-panel');
      return { hayBoton: Boolean(abrir), hayPanel: Boolean(caja), ocultoAlEmpezar: caja ? caja.hidden : null };
    })()`);
    assert.equal(panel.ok, true, `El panel revento: ${panel.error}`);
    assert.equal(panel.valor.hayBoton, true, 'Tiene que haber un boton para abrir el panel.');
    assert.equal(panel.valor.hayPanel, true, 'Y el panel.');
    assert.equal(panel.valor.ocultoAlEmpezar, true, 'El panel empieza cerrado, que si no estorba.');

    // Un token con mala forma no se guarda y se avisa.
    const malo = await ejecutar(`(async () => {
      const panel = document.querySelector('.pgc-panel');
      panel.querySelector('[data-campo="token"]').value = 'no-es-un-token';
      panel.querySelector('[data-accion="guardar"]').click();
      await new Promise((r) => setTimeout(r, 50));
      return { guardado: __almacen['pgc:config'] || null, aviso: panel.querySelector('.pgc-estado').textContent };
    })()`);
    assert.equal(malo.ok, true, `Guardar con token malo revento: ${malo.error}`);
    assert.equal(malo.valor.guardado, null, 'Un token con mala forma no puede guardarse.');
    assert.ok(/formato/i.test(malo.valor.aviso), `Tiene que avisar del formato: ${malo.valor.aviso}`);

    // Uno bueno si, y queda guardado con sus ids.
    const bueno = await ejecutar(`(async () => {
      const panel = document.querySelector('.pgc-panel');
      panel.querySelector('[data-campo="token"]').value = '123456:ABCDEFGHIJKLMNOPQRSTUVWX';
      panel.querySelector('[data-campo="autorizados"]').value = '111, 222';
      panel.querySelector('[data-campo="orre"]').checked = true;
      panel.querySelector('[data-accion="guardar"]').click();
      await new Promise((r) => setTimeout(r, 100));
      return __almacen['pgc:config'] || null;
    })()`);
    assert.equal(bueno.ok, true, `Guardar revento: ${bueno.error}`);
    assert.equal(bueno.valor.token, '123456:ABCDEFGHIJKLMNOPQRSTUVWX');
    assert.deepEqual(Array.from(bueno.valor.autorizados), ['111', '222']);
    assert.equal(bueno.valor.orre, true);

    console.log('Control Telegram (navegador) OK: lector, viaje (marcador y buscador) y panel de configuracion.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  ventana.destroy();
  servidor.close();
  app.exit(process.exitCode || 0);
});
