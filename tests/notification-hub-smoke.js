const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-avises-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

const estadoDe = (window) => window.webContents.executeJavaScript(`(() => {
  const leer = (id) => {
    const nodo = document.getElementById(id);
    return { oculto: nodo.hidden, color: nodo.style.background, titulo: nodo.title };
  };
  return {
    shop: leer('hamburgerAvisoDotShop'),
    notas: leer('hamburgerAvisoDotNotas'),
    actualizador: leer('hamburgerAvisoDotActualizador'),
    hayHub: typeof window.pokeGridNotifications === 'object'
  };
})()`);

// Poner un recuento y leer el estado tiene que ser un solo viaje al renderer. Con dos
// viajes, la aplicación se cuela en medio: al conectar la Shop real, su render publica
// el recuento del catálogo de previsualización y pisa el que puso la prueba, y el fallo
// aparece como si el hub estuviera mal.
const ponerYLeer = (window, scripts, notifications) => window.webContents.executeJavaScript(`(() => {
  ${Number.isFinite(scripts) ? `window.pokeGridNotifications.set('scripts', ${Number(scripts)});` : ''}
  ${Number.isFinite(notifications) ? `window.pokeGridNotifications.set('notifications', ${Number(notifications)});` : ''}
  const leer = (id) => {
    const nodo = document.getElementById(id);
    return { oculto: nodo.hidden, color: nodo.style.background, titulo: nodo.title };
  };
  return {
    shop: leer('hamburgerAvisoDotShop'),
    notas: leer('hamburgerAvisoDotNotas'),
    actualizador: leer('hamburgerAvisoDotActualizador')
  };
})()`);

app.whenReady().then(async () => {
  let ventana = null;
  try {
    ventana = new BrowserWindow({
      show: false, width: 1360, height: 840,
      webPreferences: {
        preload: path.join(__dirname, 'launcher-preview-preload.js'),
        contextIsolation: true, sandbox: false,
        backgroundThrottling: false, webviewTag: true
      }
    });
    await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(ventana, 'window.pokeGridNotifications');

    const inicial = await estadoDe(ventana);
    assert.equal(inicial.hayHub, true, 'El registro tiene que estar expuesto.');
    assert.equal(inicial.shop.oculto, true, 'Sin recuentos ninguna bolita se ve.');
    assert.equal(inicial.notas.oculto, true, 'Sin recuentos ninguna bolita se ve.');
    assert.equal(inicial.actualizador.oculto, true, 'Sin recuentos ninguna bolita se ve.');

    // Cada fuente pinta con su color, y solo se ve si tiene algo pendiente.
    const dos = await ponerYLeer(ventana, 3, 1);
    assert.equal(dos.shop.oculto, false, 'Con 3 scripts pendientes la bolita se ve.');
    assert.equal(dos.shop.color, 'var(--warning)', `La bolita de la Shop usa su color, no ${dos.shop.color}.`);
    assert.ok(/3 pendientes/.test(dos.shop.titulo), `El título dice cuántos, no "${dos.shop.titulo}".`);
    assert.equal(dos.notas.oculto, false, 'Con 1 notificación pendiente la bolita se ve.');
    assert.equal(dos.notas.color, 'var(--danger)', `La bolita de notificaciones usa su color, no ${dos.notas.color}.`);
    assert.equal(dos.actualizador.oculto, true, 'La bolita del actualizador sigue oculta.');

    // Verla apaga la de contenido.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.seen('scripts'); return true; })()`);
    await wait(150);
    const trasVer = await estadoDe(ventana);
    assert.equal(trasVer.shop.oculto, true, 'Ver las pendientes apaga la bolita de contenido.');

    // Y si después llega contenido nuevo, tiene que volver a avisar. Con un
    // "visto" booleano esto no pasaba: marcar como visto fijaba la fuente para
    // siempre y lo nuevo ya no se veía. Es lo que pasó al conectar la Shop real.
    // Con 4 y no con 3 a propósito: los mismos tres que ya viste no deben volver a
    // avisar, solo los que llegan por encima.
    const trasNuevo = await ponerYLeer(ventana, 4);
    assert.equal(trasNuevo.shop.oculto, false, 'Contenido nuevo después de verlo todo tiene que volver a avisar.');

    // Y con el mismo número que ya se había visto, no vuelve a avisar.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.seen('scripts'); return true; })()`);
    await wait(150);
    const sinNuevos = await ponerYLeer(ventana, 4);
    assert.equal(sinNuevos.shop.oculto, true, 'Los mismos pendientes ya vistos no tienen que volver a avisar.');

    // Volver a verlo la apaga otra vez.
    await ventana.webContents.executeJavaScript(`(() => {
      window.pokeGridNotifications.set('scripts', 5);
      return true;
    })()`);
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.seen('scripts'); return true; })()`);
    await wait(150);
    assert.equal((await estadoDe(ventana)).shop.oculto, true, 'Verlo otra vez la apaga otra vez.');

    // ...pero la del actualizador no se apaga nunca al mirar.
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.set('updater', 1); return true; })()`);
    await wait(150);
    const conActualizador = await estadoDe(ventana);
    assert.equal(conActualizador.actualizador.oculto, false, 'Con versión nueva la bolita se ve.');
    assert.equal(conActualizador.actualizador.color, 'var(--success)', `La del actualizador usa su color, no ${conActualizador.actualizador.color}.`);

    const visto = await ventana.webContents.executeJavaScript(`(() => window.pokeGridNotifications.seen('updater'))()`);
    assert.equal(visto, false, 'seen() sobre el actualizador tiene que ser un no-op.');
    await wait(150);
    const trasMirar = await estadoDe(ventana);
    assert.equal(trasMirar.actualizador.oculto, false, 'Mirar la versión nueva NO puede apagar su bolita.');

    // Limpiar sí la apaga: esa es la vía que usa la instalación terminada.
    // Se comprueba que el método exista ANTES de llamarlo. Un TypeError dentro de
    // executeJavaScript sale como "Script failed to execute", sin decir qué pasó,
    // que es la peor forma de fallo posible: no puedes diagnosticar nada.
    const hayLimpiar = await ventana.webContents.executeJavaScript(
      "typeof window.pokeGridNotifications.limpiar === 'function'"
    );
    assert.equal(hayLimpiar, true, 'El registro tiene que exponer limpiar(): es por donde se apaga la del actualizador.');
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.limpiar('updater'); return true; })()`);
    await wait(150);
    const trasInstalar = await estadoDe(ventana);
    assert.equal(trasInstalar.actualizador.oculto, true, 'Solo al instalar se apaga la del actualizador.');

    // Más de 99: el badge dice 99+, no el número entero.
    const muchos = await ventana.webContents.executeJavaScript(`(() => {
      window.pokeGridNotifications.set('scripts', 150);
      return document.getElementById('scriptsMenuBadge').textContent;
    })()`);
    assert.equal(muchos, '99+', `Con 150 pendientes el badge debe decir 99+, dice "${muchos}".`);

    // Una fuente que no existe avisa en vez de romper.
    const error = await ventana.webContents.executeJavaScript(`(() => {
      const avisos = [];
      const original = console.error;
      console.error = (mensaje) => { avisos.push(String(mensaje)); };
      window.pokeGridNotifications.set('no-existe', 2);
      console.error = original;
      return avisos.join(' ');
    })()`);
    assert.ok(/Fuente de aviso desconocida/.test(error),
      `Una fuente desconocida tiene que avisar, no romperse. Mensaje: "${error}"`);

    console.log(JSON.stringify({ ok: true, inicial, dos, trasVer, trasInstalar, muchos }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});