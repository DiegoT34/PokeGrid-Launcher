const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-dynamic-accounts-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const http = require('node:http');

const { app, BrowserWindow, session } = require('electron');

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

    // Contador de setProxy. fromPartition devuelve siempre la misma instancia por
    // partición, así que parchear esa instancia cuenta las llamadas que hace el
    // launcher sin tocar src/main.js. Se instala con 4 cuentas ya arrancadas, para
    // que el contador mida solo lo que se haga desde aquí en adelante.
    const setProxyCalls = [];
    for (let id = 1; id <= 8; id += 1) {
      const sesion = session.fromPartition(`persist:pokegrid-${id}`);
      const original = sesion.setProxy;
      sesion.setProxy = function contandoSetProxy(config) {
        setProxyCalls.push({ id, rules: String(config?.proxyRules || '') });
        return original.call(this, config);
      };
    }

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
        message: document.querySelector('#modalMessage').textContent,
        orders: [...document.querySelectorAll('#grid .panel')].map((panel) => panel.style.order),
        viewMenuEntries: document.querySelectorAll('#viewModeAccounts label').length,
        hiddenPanels: document.querySelectorAll('#grid .panel.is-grid-hidden').length
      };
    })()`);

    assert.equal(state.panels, 6, `Se esperaban 6 paneles: ${JSON.stringify(state)}`);
    assert.equal(state.gridColumns, 3, 'El grid de 6 cuentas debe usar 3 columnas');

    // Los 6 paneles necesitan un order propio: los que se quedan sin él computan a
    // 0 y se renderizan antes que los ordenados.
    assert.equal(state.orders.length, 6, `Se esperaban 6 paneles con order: ${JSON.stringify(state.orders)}`);
    assert.equal(state.orders.filter((order) => order === '').length, 0, `Ningún panel puede quedarse sin order: ${JSON.stringify(state.orders)}`);
    assert.equal(new Set(state.orders).size, 6, `Los 6 paneles deben tener order distinto: ${JSON.stringify(state.orders)}`);
    assert.equal(state.viewMenuEntries, 6, `"Modo vista" debe listar las 6 cuentas: ${state.viewMenuEntries}`);
    assert.equal(state.hiddenPanels, 0, 'Las 6 cuentas nuevas deben quedar visibles');

    // Sin proxy propio no debe tocarse la sesión: forzar direct:// sacaba al juego
    // del proxy del sistema. Solo la cuenta con proxy genera una llamada.
    const callsAfterSave = setProxyCalls.slice();
    assert.equal(callsAfterSave.length, 1, `Solo la cuenta con proxy debe recibir setProxy: ${JSON.stringify(callsAfterSave)}`);
    assert.equal(callsAfterSave[0].id, 6, `El setProxy debe ser el de la cuenta 6: ${JSON.stringify(callsAfterSave)}`);
    assert.ok(!/^direct:\/\//.test(callsAfterSave[0].rules), `Ninguna cuenta debe forzarse a conexión directa: ${JSON.stringify(callsAfterSave)}`);

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

    // Arranque en frío con un orden guardado de 4 índices y 6 cuentas: el guardado
    // del usuario debe completarse, no descartarse. Se comprueba en el siguiente
    // arranque, que es donde se leía el guardado antes de conocer las cuentas.
    const storedOrder = [3, 1, 0, 2];
    async function reloadWithGridState(visible) {
      await mainWindow.webContents.executeJavaScript(`(() => {
        localStorage.setItem('idle-poke:grid-order:v1', ${JSON.stringify(JSON.stringify(storedOrder))});
        localStorage.setItem('idle-poke:grid-visible:v1', ${JSON.stringify(JSON.stringify(visible))});
        localStorage.setItem('idle-poke:grid-accounts:v1', '4');
      })()`);
      mainWindow.webContents.reload();
      await waitFor(mainWindow, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 6`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      return mainWindow.webContents.executeJavaScript(`(() => {
        const panels = [...document.querySelectorAll('#grid .panel')];
        return {
          orders: panels.map((panel) => panel.style.order),
          viewMenuEntries: document.querySelectorAll('#viewModeAccounts label').length,
          hiddenPanels: document.querySelectorAll('#grid .panel.is-grid-hidden').length
        };
      })()`);
    }

    const restored = await reloadWithGridState([0, 1, 2, 3]);

    // orders viene en orden de panel, y lo que importa es qué panel ocupa cada
    // posición: se invierte para comparar contra el orden guardado.
    const actualOrder = [];
    restored.orders.forEach((order, panelIndex) => { actualOrder[Number(order)] = panelIndex; });
    const expectedOrder = [...storedOrder, 4, 5];
    assert.deepEqual(actualOrder, expectedOrder, `El orden guardado debe conservarse y completarse: ${JSON.stringify({ orders: restored.orders, actualOrder })}`);
    assert.equal(new Set(restored.orders).size, 6, `Los 6 paneles deben tener order distinto tras recargar: ${JSON.stringify(restored.orders)}`);
    assert.equal(restored.viewMenuEntries, 6, `"Modo vista" debe listar las 6 cuentas tras recargar: ${restored.viewMenuEntries}`);
    assert.equal(restored.hiddenPanels, 0, 'Las cuentas que no estaban en el guardado deben quedar visibles');

    // Con 4 cuentas, una cuenta oculta a propósito tiene que seguir oculta. Solo se
    // dan por visibles las que no existían cuando se guardó.
    const keptHidden = await reloadWithGridState([0, 2]);
    assert.equal(keptHidden.hiddenPanels, 2, `Las cuentas ocultadas a propósito deben seguir ocultas: ${JSON.stringify(keptHidden)}`);
    assert.equal(keptHidden.viewMenuEntries, 6, `"Modo vista" debe listar las 6 cuentas: ${keptHidden.viewMenuEntries}`);

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

    // El importador y el sincronizador cambian el número de cuentas sin pasar por
    // el formulario, así que tienen su propio camino. Se baja a 4 cuentas para
    // importar después una plantilla de 6 sobre el estado documentado.
    const toFour = await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      const rows = [...document.querySelectorAll('.account-row')];
      if (rows.length !== 5) throw new Error('Se esperaban 5 filas al reabrir el modal');
      rows[rows.length - 1].querySelector('.account-row-remove').click();
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 900));
      return { panels: document.querySelectorAll('#grid .panel').length };
    })()`);
    assert.equal(toFour.panels, 4, `Dejar 4 cuentas debe dejar 4 paneles: ${JSON.stringify(toFour)}`);

    // El importador real abre un diálogo nativo: se sustituye por la ruta de una
    // plantilla escrita aquí. El IPC, preserveAccountIds, parseAccountsTemplate y
    // writeAccounts son los de producción.
    const dialog = require('electron').dialog;
    const originalShowOpenDialog = dialog.showOpenDialog;
    function plantilla(cuentas, sufijo) {
      const lines = ['# plantilla de prueba'];
      for (let index = 0; index < cuentas; index += 1) {
        lines.push(`[CUENTA ${index + 1}]`, `nombre_panel=Importada${index + 1}${sufijo}`, `usuario=import${index + 1}`, `contrasena=clave${index + 1}`, '');
      }
      return `\uFEFF${lines.join('\r\n')}`;
    }
    const templateSix = path.join(userDataDir, 'plantilla-6.txt');
    const templateSixAgain = path.join(userDataDir, 'plantilla-6-otra.txt');
    fs.writeFileSync(templateSix, plantilla(6, ''), 'utf8');
    fs.writeFileSync(templateSixAgain, plantilla(6, 'B'), 'utf8');

    let imported = null;
    let reimported = null;
    let beforeCount = 0;
    try {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [templateSix] });
      imported = await mainWindow.webContents.executeJavaScript(`(async () => {
        document.querySelector('#importAccountsButton').click();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return {
          ok: document.querySelector('#modalMessage').classList.contains('is-ok'),
          panels: document.querySelectorAll('#grid .panel').length,
          viewMenuEntries: document.querySelectorAll('#viewModeAccounts label').length,
          names: [...document.querySelectorAll('#grid .panel')].map((panel) => panel.querySelector('.panel-name').textContent)
        };
      })()`);

      // Importar de nuevo 6 cuentas no cambia el número: los paneles no se tocan.
      // Se comparan los nodos DOM, no su texto: otros nodos con el mismo texto
      // significaría que se reconstruyeron y se perdieron las sesiones.
      const beforeNodes = await mainWindow.webContents.executeJavaScript(`(() => {
        window.__panelNodesBefore = [...document.querySelectorAll('#grid .panel')];
        return window.__panelNodesBefore.length;
      })()`);
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [templateSixAgain] });
      reimported = await mainWindow.webContents.executeJavaScript(`(async () => {
        document.querySelector('#importAccountsButton').click();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const nodes = [...document.querySelectorAll('#grid .panel')];
        return {
          ok: document.querySelector('#modalMessage').classList.contains('is-ok'),
          panels: nodes.length,
          sameNodes: nodes.length === window.__panelNodesBefore.length
            && nodes.every((node, index) => node === window.__panelNodesBefore[index]),
          names: nodes.map((node) => node.querySelector('.panel-name').textContent)
        };
      })()`);
      beforeCount = beforeNodes;
    } finally {
      dialog.showOpenDialog = originalShowOpenDialog;
    }

    assert.ok(imported.ok, `La importación debe salir con éxito: ${JSON.stringify(imported)}`);
    assert.equal(imported.panels, 6, `Importar una plantilla de 6 debe dejar 6 paneles: ${JSON.stringify(imported)}`);
    assert.equal(imported.viewMenuEntries, 6, `"Modo vista" debe listar las 6 cuentas importadas: ${imported.viewMenuEntries}`);
    assert.equal(beforeCount, 6, `La primera importación debe dejar 6 paneles: ${beforeCount}`);

    assert.ok(reimported.ok, `La segunda importación debe salir con éxito: ${JSON.stringify(reimported)}`);
    assert.equal(reimported.panels, 6, `Reimportar 6 cuentas debe dejar 6 paneles: ${JSON.stringify(reimported)}`);
    assert.ok(reimported.sameNodes, `Un import que no cambia el número no debe reconstruir los paneles: ${JSON.stringify(reimported)}`);
    assert.deepEqual(reimported.names, imported.names.map((name) => `${name}B`), `Los nombres deben refrescarse sin reconstruir: ${JSON.stringify(reimported.names)}`);

    console.log(JSON.stringify({ ok: true, state, callsAfterSave, restored: { ...restored, actualOrder }, keptHidden, removed, toFour, imported, reimported }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
