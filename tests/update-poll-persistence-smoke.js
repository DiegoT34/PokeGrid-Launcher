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

    // Los dos canales del botón tienen que ser sustituibles. Si no lo fueran, el
    // intento siguiente daría "Cannot set properties of undefined" y la causa real,
    // que es que no existe la costura, quedaría enterrada.
    const hayCostura = await ventana.webContents.executeJavaScript(
      "typeof window.pokeGridUpdateChannels === 'object' && window.pokeGridUpdateChannels !== null"
    );
    assert.equal(hayCostura, true,
      'El botón de actualizar necesita un objeto de canales sustituible: contextBridge congela window.pokeGrid y sin esta costura no se puede probar que pregunte antes de instalar.');

    // Pulsar «Descargar» con versión nueva tiene que PREGUNTAR. Y tiene que ser un boton aparte: en la
    // 0.39.0 «Buscar» y «Descargar» se separaron, y esto es lo que comprueba la razon de separarlos.
    // Con un solo boton no habria forma de saber si hay algo sin pulsar, y pulsar era descargar.
    const cancelar = await ventana.webContents.executeJavaScript(`(async () => {
      window.__preguntas = [];
      window.__confirmOriginal = window.confirm;
      window.confirm = (texto) => { window.__preguntas.push(String(texto)); return false; };
      window.__llamadoInstall = 0;
      window.__llamadoPeek = 0;
      window.pokeGridUpdateChannels.peek = async () => {
        window.__llamadoPeek += 1;
        return { ok: true, hayActualizacion: true, actual: '0.23.5', masReciente: '0.23.9' };
      };
      window.pokeGridUpdateChannels.instalar = async () => {
        window.__llamadoInstall += 1;
        return { ok: true, status: 'installing', currentVersion: '0.23.5', latestVersion: '0.23.9' };
      };
      // Primero «Buscar». Solo mira: no pregunta nada y no descarga.
      document.querySelector('#checkUpdatesButton').click();
      await new Promise((r) => setTimeout(r, 600));
      const trasBuscar = {
        peek: window.__llamadoPeek,
        install: window.__llamadoInstall,
        preguntas: window.__preguntas.length,
        texto: document.querySelector('#updateStatusText').textContent,
        descargaHabilitada: !document.querySelector('#downloadUpdateButton').disabled,
        pendiente: window.pokeGridNotifications.get('updater').count
      };
      // Y ahora «Descargar», que si pregunta.
      document.querySelector('#downloadUpdateButton').click();
      await new Promise((r) => setTimeout(r, 600));
      const salida = {
        confirmPisable: window.__confirmOriginal !== window.confirm,
        trasBuscar,
        preguntas: window.__preguntas,
        llamadoInstall: window.__llamadoInstall,
        pendiente: window.pokeGridNotifications.get('updater').count
      };
      window.confirm = window.__confirmOriginal;
      return salida;
    })()`);
    assert.equal(cancelar.confirmPisable, true,
      'La prueba tiene que poder sustituir window.confirm. Si no se puede, no puede comprobar que el launcher pregunte.');
    assert.equal(cancelar.trasBuscar.peek, 1, '«Buscar» mira una vez.');
    assert.equal(cancelar.trasBuscar.install, 0, '«Buscar» NO puede instalar: mirar y descargar son cosas distintas.');
    assert.equal(cancelar.trasBuscar.preguntas, 0, '«Buscar» no pregunta por instalar: todavia no se ha pedido instalar.');
    assert.ok(/0\.23\.9/.test(cancelar.trasBuscar.texto),
      `«Buscar» tiene que decir que version hay, no "${cancelar.trasBuscar.texto}".`);
    assert.equal(cancelar.trasBuscar.descargaHabilitada, true,
      'Sabiendo que hay version nueva, el boton de descargar tiene que quedar pulsable.');
    assert.equal(cancelar.trasBuscar.pendiente, 1,
      'Ver la version nueva ya enciende el aviso, sin esperar a que se acepte descargarla.');
    assert.equal(cancelar.preguntas.length, 1, `Instalar tiene que pedir confirmación una vez. Preguntas: ${JSON.stringify(cancelar.preguntas)}`);
    assert.ok(/0\.23\.9/.test(cancelar.preguntas[0]), `La pregunta dice qué versión hay, no "${cancelar.preguntas[0]}".`);
    assert.ok(/0\.23\.5/.test(cancelar.preguntas[0]), `La pregunta dice cuál tienes, no "${cancelar.preguntas[0]}".`);
    assert.equal(cancelar.llamadoInstall, 0, 'Si se cancela, no puede haberse llamado al canal que instala.');
    assert.equal(cancelar.pendiente, 1, 'Cancelar la instalación NO puede apagar el aviso: sigue pendiente.');

    // Aceptando, sí se llama al canal que instala y se apaga la bolita.
    await waitFor(ventana, "!document.querySelector('#downloadUpdateButton').disabled");
    const aceptando = await ventana.webContents.executeJavaScript(`(async () => {
      window.confirm = () => true;
      window.__llamadoInstall = 0;
      document.querySelector('#downloadUpdateButton').click();
      await new Promise((r) => setTimeout(r, 600));
      const salida = { llamadoInstall: window.__llamadoInstall, pendiente: window.pokeGridNotifications.get('updater').count };
      window.confirm = window.__confirmOriginal;
      return salida;
    })()`);
    assert.equal(aceptando.llamadoInstall, 1, `Aceptando se instala una vez, no ${aceptando.llamadoInstall}.`);
    assert.equal(aceptando.pendiente, 0, 'Solo al instalar se apaga la bolita del actualizador.');

    console.log(JSON.stringify({ ok: true, conRed, sinRed, alDia, alArrancar, yaEsta, cancelar, aceptando }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});