const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-dynamic-accounts-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const http = require('node:http');

const { app, BrowserWindow } = require('electron');

async function waitFor(window, expression, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
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

    // Servidor de sonda local: solo recibe tráfico si la sesión enruta por el proxy.
    const probeHits = [];
    const probeServer = http.createServer((request, response) => {
      probeHits.push(request.headers.host || '');
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('OK-via-proxy');
    });
    await new Promise((resolve) => probeServer.listen(0, '127.0.0.1', resolve));
    const probePort = probeServer.address().port;

    // Añadir dos cuentas desde el modal y configurar un proxy HTTP local en la última.
    const state = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      const addButton = document.querySelector('#accountRowActions button');
      if (!addButton) throw new Error('Falta el botón de añadir cuenta.');
      addButton.click();
      addButton.click();
      const rows = [...document.querySelectorAll('.account-row')];
      if (rows.length !== 6) throw new Error('Se esperaban 6 filas en el modal');
      const last = rows[rows.length - 1];
      last.querySelector('[data-field="proxy.protocol"]').value = 'http';
      last.querySelector('[data-field="proxy.host"]').value = '127.0.0.1';
      last.querySelector('[data-field="proxy.port"]').value = '${probePort}';
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 900));
      return {
        panels: document.querySelectorAll('#grid .panel').length,
        gridColumns: getComputedStyle(document.querySelector('#grid')).gridTemplateColumns.split(' ').filter(Boolean).length,
        message: document.querySelector('#modalMessage').textContent
      };
    })()`);

    assert.equal(state.panels, 6, `Se esperaban 6 paneles: ${JSON.stringify(state)}`);
    assert.equal(state.gridColumns, 3, 'El grid de 6 cuentas debe usar 3 columnas');

    // Prueba conductual: un dominio inresoluble solo carga si la sesión pasa por el proxy.
    const probeUrl = 'http://pokegrid-proxy-probe.invalid/probe';
    async function loadInPartition(partition, url) {
      const window = new BrowserWindow({ show: false, webPreferences: { partition } });
      try {
        await window.loadURL(url);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: String(error.message || error).slice(0, 160) };
      } finally {
        if (!window.isDestroyed()) window.destroy();
      }
    }

    const proxiedLoad = await loadInPartition('persist:pokegrid-6', probeUrl);
    assert.ok(proxiedLoad.ok, `La cuenta con proxy no enrutó la sonda: ${JSON.stringify(proxiedLoad)}`);
    assert.equal(probeHits.length, 1, 'El servidor de sonda debe recibir exactamente una petición');

    const directLoad = await loadInPartition('persist:pokegrid-3', probeUrl);
    assert.ok(!directLoad.ok, `La cuenta sin proxy no debería resolver el dominio: ${JSON.stringify(directLoad)}`);
    assert.equal(probeHits.length, 1, 'El proxy de una cuenta no debe filtrar a las demás');

    probeServer.close();

    // Eliminar la última cuenta deja 5 paneles y conserva las sesiones anteriores.
    const removed = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      const rows = [...document.querySelectorAll('.account-row')];
      if (rows.length !== 6) throw new Error('Se esperaban 6 filas al reabrir el modal');
      rows[rows.length - 1].querySelector('.account-row-remove').click();
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 900));
      return { panels: document.querySelectorAll('#grid .panel').length };
    })()`);
    assert.equal(removed.panels, 5, `Eliminar una cuenta debe dejar 5 paneles: ${JSON.stringify(removed)}`);

    console.log(JSON.stringify({ ok: true, state, removed }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
