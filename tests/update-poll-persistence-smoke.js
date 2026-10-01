const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-sondeo-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

const LLAVE = 'pokegrid:launcher-update-pending:v1';

// El sondeo no se puede esperar en la prueba: son 6 horas. Lo que se prueba es la
// parte que decide, que es la persistencia y la regla de "sin red no se apaga".
//
// La red se falsea desde la prueba. No se toca el preload de previsualización, que es
// compartido y está vedado (R-03); se sustituye el sondeadero del sondeo, que es el
// punto de entrada. Intentar sustituir window.pokeGrid no funciona y no por poco:
// contextBridge lo define como no escribible, así que el fallo sería silencioso y la
// prueba pasaría de mentira sin comprobar nada.
const RED = 'sin red';
const CON = 'con red';
const AL_DIA = 'al dia';

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
    await waitFor(ventana, 'window.pokeGridNotifications && window.pokeGridUpdatePoll');

    const ponerRed = (escenario) => ventana.webContents.executeJavaScript(`(() => {
      const respuestas = {
        '${CON}': { ok: true, hayActualizacion: true, actual: '0.23.5', masReciente: '0.23.9' },
        '${RED}': { ok: false, hayActualizacion: false, actual: '0.23.5', masReciente: '0.23.5', error: 'GitHub no respondió correctamente (HTTP 503).' },
        '${AL_DIA}': { ok: true, hayActualizacion: false, actual: '0.23.5', masReciente: '0.23.5' }
      };
      window.pokeGridUpdatePoll.peeker = async () => respuestas['${escenario}'];
      return 'listo';
    })()`);

    const leer = () => ventana.webContents.executeJavaScript(`(() => ({
      guardada: localStorage.getItem(${JSON.stringify(LLAVE)}),
      pendiente: window.pokeGridNotifications.get('updater').count
    }))()`);

    // Un sondeo con red trae la versión pendiente y la guarda.
    await ponerRed(CON);
    await ventana.webContents.executeJavaScript(`window.pokeGridUpdatePoll.run({ forzar: true })`);
    const conRed = await leer();
    assert.equal(conRed.guardada, '0.23.9', 'La versión pendiente se guarda para sobrevivir a un arranque sin red.');
    assert.equal(conRed.pendiente, 1, 'Con versión nueva hay una pendiente.');

    // Un sondeo SIN red no puede borrar lo que ya se sabía.
    await ponerRed(RED);
    await ventana.webContents.executeJavaScript(`(() => { window.pokeGridNotifications.limpiar('updater'); return true; })()`);
    await ventana.webContents.executeJavaScript(`window.pokeGridUpdatePoll.run({ forzar: true })`);
    const sinRed = await leer();
    assert.equal(sinRed.guardada, '0.23.9', 'Un fallo de red no puede borrar la versión pendiente que ya se sabía.');
    assert.equal(sinRed.pendiente, 1, 'Sin red se conserva el aviso, no se apaga.');

    // Un sondeo con red que dice que no hay nada nuevo sí limpia de verdad.
    await ponerRed(AL_DIA);
    await ventana.webContents.executeJavaScript(`window.pokeGridUpdatePoll.run({ forzar: true })`);
    const alDia = await leer();
    assert.equal(alDia.guardada, null, 'Cuando estás al día se olvida la versión pendiente.');
    assert.equal(alDia.pendiente, 0, 'Cuando estás al día no queda bolita.');

    // Al arrancar sin comprobar nada, se repinta lo que había guardado.
    const alArrancar = await ventana.webContents.executeJavaScript(`(() => {
      localStorage.setItem(${JSON.stringify(LLAVE)}, '0.23.9');
      window.__pokeGridCurrentVersion = '0.23.5';
      window.pokeGridUpdatePoll.restaurar();
      return window.pokeGridNotifications.get('updater').count;
    })()`);
    assert.equal(alArrancar, 1, 'Al arrancar, sin red, se repinta lo que se sabía.');

    // Y si la versión guardada es la que ya tienes, no hay nada pendiente.
    const yaEsta = await ventana.webContents.executeJavaScript(`(() => {
      localStorage.setItem(${JSON.stringify(LLAVE)}, '0.23.5');
      window.pokeGridUpdatePoll.restaurar();
      return window.pokeGridNotifications.get('updater').count;
    })()`);
    assert.equal(yaEsta, 0, 'Si la versión guardada es la que ya tienes, no hay bolita.');

    console.log(JSON.stringify({ ok: true, conRed, sinRed, alDia, alArrancar, yaEsta }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});