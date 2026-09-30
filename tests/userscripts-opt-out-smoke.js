// Semántica opt-out de cuentas por userscript.
//
// El renderer exigía accounts[i] === true (opt-in) mientras que main.js bloquea
// solo cuando el valor es exactamente false (opt-out) y la documentación
// describe opt-out. Este smoke fija el comportamiento correcto: un script
// guardado con menos cuentas que las que hay ahora debe seguir inyectándose en
// las cuentas nuevas, porque la ausencia de entrada significa "habilitado".
//
// Índices comprobados: 0 y 3 (los que el script tiene marcados) y 4, 11 y 31
// (sin entrada en el array, que antes no recibían nada). Al final se desmarca la
// cuenta 0 para comprobar que un false explícito sí sigue bloqueando.

const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-optout-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const SCRIPT = `// ==UserScript==
// @name Opt Out Probe
// @namespace pokegrid.test.optout
// @version 1.0.0
// @match https://poke.idleworld.online/*
// @grant none
// ==/UserScript==
window.__optOutProbe = true;`;

// Índices que deben recibir la inyección: los dos primeros estaban marcados en el
// script guardado y los tres últimos no tenían entrada en el array.
const CHECKED_INDEXES = [0, 3, 4, 11, 31];

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');

    // El script se guarda con 4 cuentas marcadas y luego se comprueba con 32
    // cuentas: las cuentas 5..32 no tienen entrada en accounts y, con opt-out,
    // tienen que recibir la inyección igualmente.
    const harness = await window.webContents.executeJavaScript(`(async () => {
      const set = await window.pokeGrid.setPreviewAccountCount(32);
      const accounts = await window.pokeGrid.loadAccounts();
      window.pokeGridUserScriptManager.open();
      document.querySelector('#newScriptButton').click();
      const editor = document.querySelector('#scriptCodeInput');
      editor.value = ${JSON.stringify(SCRIPT)};
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      return { requested: set.count, loaded: accounts.accounts.length };
    })()`);
    if (harness.loaded !== 32) {
      throw new Error(`El preload no aplicó las 32 cuentas: devolvió ${harness.loaded} (pedidas ${harness.requested}).`);
    }

    await new Promise((resolve) => setTimeout(resolve, 520));
    await window.webContents.executeJavaScript('document.querySelector("#scriptEditorForm").requestSubmit()');
    await new Promise((resolve) => setTimeout(resolve, 450));

    const state = await window.webContents.executeJavaScript(`(async () => {
      const manager = window.pokeGridUserScriptManager;
      const results = {};
      for (const index of ${JSON.stringify(CHECKED_INDEXES)}) {
        const injected = [];
        await manager.installIntoPanel({
          instanceId: 'poke-idle-world', instanceName: 'Poke Idle World', index,
          startUrl: 'https://poke.idleworld.online/', lastUrl: 'https://poke.idleworld.online/',
          webview: { getURL: () => 'https://poke.idleworld.online/', executeJavaScript: async (s) => { injected.push(s); return 'installed'; } }
        });
        results[index] = injected.length;
      }
      const saved = await window.pokeGrid.loadUserScripts();
      return {
        probes: results,
        savedAccounts: saved.scripts[0] ? saved.scripts[0].accounts : null,
        installedCount: document.querySelector('#scriptCount').textContent,
        message: document.querySelector('#scriptsMessage').textContent
      };
    })()`);

    for (const index of CHECKED_INDEXES) {
      if (state.probes[index] !== 1) {
        throw new Error(`Opt-out falló: la cuenta ${index} recibió ${state.probes[index]} inyecciones, se esperaba 1.`);
      }
    }
    if (state.installedCount !== '1') {
      throw new Error(`Se esperaba 1 script instalado, hay ${state.installedCount}.`);
    }
    if (!Array.isArray(state.savedAccounts) || state.savedAccounts.length !== 4) {
      throw new Error(`El script debía guardarse con 4 marcas, se guardó con ${JSON.stringify(state.savedAccounts)}.`);
    }

    // La otra mitad del opt-out: un false explícito sigue bloqueando. Sin esta
    // comprobación la prueba pasaría también con un return true incondicional.
    const blocked = await window.webContents.executeJavaScript(`(async () => {
      const manager = window.pokeGridUserScriptManager;
      document.querySelector('#scriptAccountToggles input[data-account="0"]').checked = false;
      document.querySelector('#scriptEditorForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 450));
      const probes = {};
      for (const index of [0, 3, 4]) {
        const injected = [];
        await manager.installIntoPanel({
          instanceId: 'poke-idle-world', instanceName: 'Poke Idle World', index,
          startUrl: 'https://poke.idleworld.online/', lastUrl: 'https://poke.idleworld.online/',
          webview: { getURL: () => 'https://poke.idleworld.online/', executeJavaScript: async (s) => { injected.push(s); return 'installed'; } }
        });
        probes[index] = injected.length;
      }
      const saved = await window.pokeGrid.loadUserScripts();
      return {
        probes,
        savedAccounts: saved.scripts[0] ? saved.scripts[0].accounts : null,
        installedCount: document.querySelector('#scriptCount').textContent
      };
    })()`);

    if (blocked.probes[0] !== 0) {
      throw new Error(`Opt-out ignoró un false explícito: la cuenta 0 recibió ${blocked.probes[0]} inyecciones, se esperaba 0.`);
    }
    for (const index of [3, 4]) {
      if (blocked.probes[index] !== 1) {
        throw new Error(`Opt-out falló tras desmarcar la 0: la cuenta ${index} recibió ${blocked.probes[index]} inyecciones, se esperaba 1.`);
      }
    }
    if (blocked.installedCount !== '1') {
      throw new Error(`El segundo guardado debía seguir dejando 1 script, hay ${blocked.installedCount}.`);
    }

    console.log(JSON.stringify({ ...state, bloqueado: blocked }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
