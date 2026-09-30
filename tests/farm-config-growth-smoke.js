const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-farm-config-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const { app, BrowserWindow } = require('electron');

const FARM_CONFIG_KEY = 'pokegrid:farm-config:v1';

async function waitFor(window, expression, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

// Una configuración de farmeo con objetivo, para que la cuenta 1 no sea la
// configuración por defecto y se pueda comprobar que se conserva al crecer.
const TARGET = { name: 'Pikachu', slug: 'pikachu', level: 5, fromLevel: 3, toLevel: 8, area: 'kanto-route-1' };
function configConTarget(enabled = true) {
  return { enabled, target: TARGET };
}

app.whenReady().then(async () => {
  try {
    const started = Date.now();
    let mainWindow = null;
    while (!mainWindow && Date.now() - started < 20_000) {
      mainWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) || null;
      if (mainWindow) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    assert.ok(mainWindow, 'La ventana principal no se creó');
    await waitFor(mainWindow, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 4`);

    // 4 cuentas en el arranque, con una configuración de farmeo guardada que tiene
    // la primera cuenta con objetivo y la segunda desactivada.
    const savedFarmConfig = [configConTarget(true), configConTarget(false), configConTarget(true), configConTarget(true)];
    await mainWindow.webContents.executeJavaScript(`localStorage.setItem(${JSON.stringify(FARM_CONFIG_KEY)}, ${JSON.stringify(JSON.stringify(savedFarmConfig))})`);
    mainWindow.webContents.reload();
    await waitFor(mainWindow, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 4`);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const beforeGrow = await mainWindow.webContents.executeJavaScript(`(() => {
      document.querySelector('#farmButton').click();
      return {
        abierto: !document.querySelector('#farmBackdrop').hidden,
        filas: document.querySelectorAll('#farmAccountGrid .farm-account').length,
        deshabilitadas: document.querySelectorAll('#farmAccountGrid .farm-account.is-disabled').length
      };
    })()`);
    assert.equal(beforeGrow.abierto, true, 'El modal de farmeo debe abrirse con 4 cuentas');
    assert.equal(beforeGrow.filas, 4, `Con 4 cuentas deben dibujarse 4 tarjetas: ${JSON.stringify(beforeGrow)}`);
    assert.equal(beforeGrow.deshabilitadas, 1, `La cuenta 2 estaba desactivada en el guardado: ${JSON.stringify(beforeGrow)}`);

    // Caso de no crecer: con 4 cuentas y 4 en farmConfigs, guardar las mismas
    // cuatro cuentas no debe cambiar nada de la configuración de farmeo.
    const unchanged = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      const rows = [...document.querySelectorAll('.account-row')];
      if (rows.length !== 4) throw new Error('Se esperaban 4 filas en el modal');
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { panels: document.querySelectorAll('#grid .panel').length };
    })()`);
    assert.equal(unchanged.panels, 4, `Guardar las mismas 4 cuentas debe dejar 4 paneles: ${JSON.stringify(unchanged)}`);

    const configsUnchanged = await mainWindow.webContents.executeJavaScript(`(() => ({
      longitud: farmConfigs.length,
      primera: farmConfigs[0]?.target?.name || null,
      segunda: farmConfigs[1]?.enabled
    }))()`);
    assert.deepEqual(configsUnchanged, { longitud: 4, primera: 'Pikachu', segunda: false }, `Sin cambio de cuentas no debe cambiar farmConfigs: ${JSON.stringify(configsUnchanged)}`);

    // Cerrar el modal antes de seguir.
    await mainWindow.webContents.executeJavaScript(`(() => {
      const cerrar = document.querySelector('#farmBackdrop [data-close], #farmBackdrop .modal-close');
      if (cerrar) cerrar.click();
      document.querySelector('#farmBackdrop').hidden = true;
    })()`);

    // Crecer de 4 a 6 por el camino del modal, que es el que llama a
    // rebuildGamePanels. Si el importador dejaste puesto, este bloque se puede
    // cambiar por window.pokeGrid.saveAccounts sin tocar nada más.
    const grown = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      const addButton = document.querySelector('#accountRowActions button');
      if (!addButton) throw new Error('Falta el botón de añadir cuenta.');
      addButton.click();
      addButton.click();
      const rows = [...document.querySelectorAll('.account-row')];
      if (rows.length !== 6) throw new Error('Se esperaban 6 filas en el modal');
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return { panels: document.querySelectorAll('#grid .panel').length };
    })()`);
    assert.equal(grown.panels, 6, `Crecer a 6 debe dejar 6 paneles: ${JSON.stringify(grown)}`);

    // Abrir "Modo farmeo" con 6 cuentas y farmConfigs todavía en 4: aquí es donde
    // renderFarmAccounts hacía config.enabled sobre un undefined. El fallo ocurre
    // dentro de un manejador async, así que sale como promesa rechazada sin
    // capturar: sin esta sonda el TypeError pasaría inadvertido.
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__farmErrors = [];
      window.addEventListener('unhandledrejection', (event) => {
        window.__farmErrors.push(String(event.reason?.message || event.reason).slice(0, 200));
      });
      window.addEventListener('error', (event) => {
        window.__farmErrors.push(String(event.message).slice(0, 200));
      });
    })()`);

    const afterGrow = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#farmButton').click();
      // La promise rechazada se reporta en un turno posterior del event loop: sin
      // esta espera la sonda lee la lista antes de que unhandledrejection corra.
      await new Promise((resolve) => setTimeout(resolve, 400));
      const tarjetas = [...document.querySelectorAll('#farmAccountGrid .farm-account')];
      return {
        abierto: !document.querySelector('#farmBackdrop').hidden,
        filas: tarjetas.length,
        indices: tarjetas.map((tarjeta) => tarjeta.dataset.accountIndex),
        deshabilitadas: tarjetas.filter((tarjeta) => tarjeta.classList.contains('is-disabled')).length,
        errores: window.__farmErrors.slice()
      };
    })()`);

    assert.deepEqual(afterGrow.errores, [], `Abrir "Modo farmeo" con 6 cuentas no debe lanzar: ${JSON.stringify(afterGrow.errores)}`);

    assert.equal(afterGrow.abierto, true, 'El modal de farmeo debe abrirse tras crecer a 6 cuentas');
    assert.equal(afterGrow.filas, 6, `Con 6 cuentas deben dibujarse 6 tarjetas: ${JSON.stringify(afterGrow)}`);
    assert.deepEqual(afterGrow.indices, ['0', '1', '2', '3', '4', '5'], `Las 6 cuentas deben aparecer: ${JSON.stringify(afterGrow)}`);
    assert.equal(afterGrow.deshabilitadas, 1, `Solo la cuenta 2 sigue desactivada: ${JSON.stringify(afterGrow)}`);

    // farmConfigs es un let de ámbito de script, no una propiedad de window, pero
    // comparte el ámbito léxico global: se puede leer por nombre desde la página.
    const configs = await mainWindow.webContents.executeJavaScript(`(() => ({
      longitud: farmConfigs.length,
      undefinedCount: farmConfigs.filter((config) => config === undefined).length,
      cuentasNuevas: farmConfigs.slice(4).map((config) => (config ? { enabled: config.enabled, target: config.target } : null)),
      primera: farmConfigs[0] ? { enabled: farmConfigs[0].enabled, target: farmConfigs[0].target?.name || null } : null,
      segunda: farmConfigs[1] ? { enabled: farmConfigs[1].enabled } : null
    }))()`);

    assert.equal(configs.longitud, 6, `farmConfigs debe medir 6 tras crecer: ${JSON.stringify(configs)}`);
    assert.equal(configs.undefinedCount, 0, `farmConfigs no puede tener huecos: ${JSON.stringify(configs)}`);
    assert.deepEqual(configs.cuentasNuevas, [{ enabled: true, target: null }, { enabled: true, target: null }], `Las cuentas nuevas usan la configuración por defecto: ${JSON.stringify(configs)}`);
    assert.equal(configs.primera.target, 'Pikachu', `La cuenta 1 conserva su objetivo: ${JSON.stringify(configs)}`);
    assert.equal(configs.segunda.enabled, false, `La cuenta 2 sigue desactivada: ${JSON.stringify(configs)}`);

    console.log(JSON.stringify({ ok: true, beforeGrow, grown, afterGrow, configs }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
