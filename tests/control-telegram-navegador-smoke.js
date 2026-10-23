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

    // El helper captura la excepcion DENTRO del codigo inyectado: Electron convierte cualquier
    // excepcion en «Script failed to execute» y fuera se pierde el motivo real.
    const ejecutar = async (cuerpo) => ventana.webContents.executeJavaScript(`(async () => {
      try { return { ok: true, valor: await (${cuerpo}) }; }
      catch (error) { return { ok: false, error: String(error && error.message ? error.message : error) }; }
    })()`);
    const leerDom = async (cuerpo) => ventana.webContents.executeJavaScript(`(() => {
      try { return { ok: true, valor: (${cuerpo}) }; }
      catch (error) { return { ok: false, error: String(error && error.message ? error.message : error) }; }
    })()`);

    // --- Lector del estado
    const leido = await ejecutar('__pgControl.leerEstadoPagina()');
    assert.equal(leido.ok, true, `El lector fallo: ${leido.error}`);
    const estado = leido.valor;
    assert.equal(estado.ready, true, 'La pagina esta dentro del juego.');
    assert.equal(estado.trainerName, 'SHOCKVOR');
    assert.equal(estado.location, 'Kanto · Ruta 12');
    assert.equal(estado.leader.nombre, 'Blastoise');
    assert.equal(estado.leader.nivel, 85);
    assert.equal(estado.leader.hp, 120);
    assert.equal(estado.leader.maxHp, 180);

    // --- Viaje a Kanto pulsando el marcador
    const viaje = await ejecutar(
      `__pgControl.viajarA({ slug: 'blastoise', nombre: 'Blastoise', mapa: 'kanto' }, { orre: false })`);
    assert.equal(viaje.ok, true, `viajarA revento: ${viaje.error}`);
    assert.equal(viaje.valor.ok, true, `El viaje tiene que funcionar: ${viaje.valor.mensaje}`);
    const trasViaje = await leerDom(`({
      mapaAbierto: !document.querySelector('.map-window').hidden,
      ubicacion: document.querySelector('.phud-tloc').textContent.trim()
    })`);
    assert.equal(trasViaje.valor.mapaAbierto, false, 'El viaje cierra el mapa al llegar.');
    assert.match(trasViaje.valor.ubicacion, /Blastoise/, 'La ubicacion cambia de verdad.');

    // --- Ya estabas en esa hunt: no es un error
    const repetido = await ejecutar(
      `__pgControl.viajarA({ slug: 'blastoise', nombre: 'Blastoise', mapa: 'kanto' }, { orre: false })`);
    assert.equal(repetido.valor.ok, true, `Estar ya alli no es un fallo: ${repetido.valor.mensaje}`);
    assert.match(repetido.valor.mensaje, /ya estabas/i);

    // --- Hunt bloqueada: se dice, no se pulsa
    const bloqueado = await ejecutar(
      `__pgControl.viajarA({ slug: 'mewtwo', nombre: 'Mewtwo', mapa: 'kanto' }, { orre: false })`);
    assert.equal(bloqueado.valor.ok, false, 'Una hunt bloqueada no puede viajar.');
    assert.match(bloqueado.valor.mensaje, /bloquead/i, `El error lo dice: ${bloqueado.valor.mensaje}`);

    // --- Orre con el permiso apagado: se rechaza ANTES de tocar el juego
    const orreApagado = await ejecutar(
      `__pgControl.viajarA({ slug: 'blastoise-orre', nombre: 'Blastoise', mapa: 'orre' }, { orre: false })`);
    assert.equal(orreApagado.valor.ok, false, 'Orre sin permiso no puede viajar.');
    assert.match(orreApagado.valor.mensaje, /orre|permiso/i,
      `El error dice por que: ${orreApagado.valor.mensaje}`);
    const trasRechazo = await leerDom(`({
      ubicacion: document.querySelector('.phud-tloc').textContent.trim(),
      avisoVisible: !document.querySelector('.map-dialog').hidden
    })`);
    assert.match(trasRechazo.valor.ubicacion, /Blastoise/,
      'La cuenta no se movio: el rechazo es antes de pulsar.');
    assert.equal(trasRechazo.valor.avisoVisible, false,
      'Ni siquiera se abre el aviso de Orre si el permiso esta apagado.');

    // --- Orre con permiso: sale el aviso y se acepta
    const orreEncendido = await ejecutar(
      `__pgControl.viajarA({ slug: 'blastoise-orre', nombre: 'Blastoise', mapa: 'orre' }, { orre: true })`);
    assert.equal(orreEncendido.valor.ok, true,
      `Con permiso tiene que viajar: ${orreEncendido.valor.mensaje}`);
    const trasOrre = await leerDom(`({
      ubicacion: document.querySelector('.phud-tloc').textContent.trim(),
      avisoVisible: !document.querySelector('.map-dialog').hidden
    })`);
    assert.match(trasOrre.valor.ubicacion, /Orre/i, 'La cuenta esta en Orre.');
    assert.equal(trasOrre.valor.avisoVisible, false, 'El aviso se cierra al aceptar.');

    // --- Un destino que no esta en el mapa hasta que se busca
    const porBuscador = await ejecutar(
      `__pgControl.viajarA({ slug: 'onix', nombre: 'Onix', mapa: 'kanto' }, { orre: false })`);
    assert.equal(porBuscador.ok, true, `viajarA revento con onix: ${porBuscador.error}`);
    assert.equal(porBuscador.valor.ok, true,
      `Tiene que viajar tambien buscando: ${porBuscador.valor.mensaje}`);
    const trasOnix = await leerDom(`document.querySelector('.phud-tloc').textContent.trim()`);
    assert.match(trasOnix.valor, /Onix/, 'Y llega a Onix.');

    // --- Un destino que no existe
    const fallo = await ejecutar(
      `__pgControl.viajarA({ slug: 'no-existe', nombre: 'NoExiste', mapa: 'kanto' }, { orre: false })`);
    assert.equal(fallo.ok, true, `viajarA revento con un destino inexistente: ${fallo.error}`);
    assert.equal(fallo.valor.ok, false, 'Un destino que no esta en el mapa tiene que fallar.');
    assert.match(fallo.valor.mensaje, /no encontr/i,
      `El error dice que no lo encontro: ${fallo.valor.mensaje}`);

    // --- Panel de configuracion
    const panel = await leerDom(`(() => {
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
    assert.match(malo.valor.aviso, /formato/i, `Tiene que avisar del formato: ${malo.valor.aviso}`);

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

    // --- El registro se refresca (si no, `/estado` mentiria para siempre)
    const refresco = await ejecutar(`(async () => {
      document.querySelector('.phud-tloc').textContent = 'Kanto · Charizard';
      const primera = await __pgControl.registrarSiToca(10000);
      const segunda = await __pgControl.registrarSiToca(12000);
      const tercera = await __pgControl.registrarSiToca(400000);
      document.querySelector('.phud-tloc').textContent = 'Kanto · Onix';
      const cuarta = await __pgControl.registrarSiToca(410000);
      return {
        primera, segunda, tercera, cuarta,
        fila: __almacen['pgc:registro:' + __pgControl.PAGE_ID] || null
      };
    })()`);
    assert.equal(refresco.ok, true, `Refrescar el registro revento: ${refresco.error}`);
    assert.equal(refresco.valor.primera, true, 'Un cambio de ubicacion se escribe.');
    assert.equal(refresco.valor.segunda, false,
      'Sin cambios y sin pasar el latido no se escribe: es lo que evita el chorro de escrituras.');
    assert.equal(refresco.valor.tercera, true,
      'Pasado el latido se reescribe, para que la edad de /estado distinga una cuenta viva.');
    assert.equal(refresco.valor.cuarta, true, 'Y un cambio nuevo se escribe sin esperar al latido.');
    assert.equal(refresco.valor.fila.location, 'Kanto · Onix',
      'El registro tiene que recoger la ubicacion nueva, no la del arranque.');

    console.log('Control Telegram (navegador) OK: lector, viaje (marcador, buscador, ya alli, bloqueada, Orre), panel y refresco del registro.');
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
  ventana.destroy();
  servidor.close();
  app.exit(process.exitCode || 0);
});
