const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-multigame-userscripts-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

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
    await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#addBrowserInstanceButton').click();
      document.querySelector('#browserInstanceName').value = 'Juego externo';
      document.querySelector('#browserInstanceUrl').value = 'https://example.test/game';
      document.querySelector('#browserInstanceCount').value = '2';
      document.querySelector('#browserInstanceForm').requestSubmit();
    })()`);
    await waitFor(window, 'document.querySelectorAll(".browser-instance-workspace webview").length === 2');

    const externalScript = `// ==UserScript==
// @name External Game Helper
// @namespace pokegrid.test.external
// @version 1.0.0
// @match https://example.test/*
// @grant none
// ==/UserScript==
window.__externalGameHelper = true;`;
    const state = await window.webContents.executeJavaScript(`(async () => {
      window.pokeGridUserScriptManager.open();
      document.querySelector('#newScriptButton').click();
      const editor = document.querySelector('#scriptCodeInput');
      editor.value = ${JSON.stringify(externalScript)};
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 520));
      const targetState = {
        legend: document.querySelector('#scriptAccountToggles').closest('fieldset').querySelector('legend').textContent,
        primaryInputs: document.querySelectorAll('#scriptAccountToggles input').length,
        automaticTargets: document.querySelector('#scriptAccountToggles').textContent
      };
      document.querySelector('#scriptEditorForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 450));
      const item = document.querySelector('.script-list-item');
      const injected = [];
      await window.pokeGridUserScriptManager.installIntoPanel({
        instanceId: 'browser-test', instanceName: 'Juego externo', instanceIndex: 0,
        startUrl: 'https://example.test/game', lastUrl: 'https://example.test/game',
        webview: { getURL: () => 'https://example.test/game', executeJavaScript: async (source) => { injected.push(source); return 'installed'; } }
      });
      const primaryInjected = [];
      await window.pokeGridUserScriptManager.installIntoPanel({
        instanceId: 'poke-idle-world', instanceName: 'Poke Idle World', index: 0,
        startUrl: 'https://poke.idleworld.online/', lastUrl: 'https://poke.idleworld.online/',
        webview: { getURL: () => 'https://poke.idleworld.online/', executeJavaScript: async (source) => { primaryInjected.push(source); return 'installed'; } }
      });
      return {
        targetState,
        count: document.querySelector('#scriptCount').textContent,
        gameTags: item?.querySelector('.script-list-games')?.textContent || '',
        message: document.querySelector('#scriptsMessage').textContent,
        externalInjectionCount: injected.length,
        primaryInjectionCount: primaryInjected.length,
        hasInstanceMetadata: injected[0]?.includes('Juego externo') && injected[0]?.includes('browser-test'),
        sourceIncluded: injected[0]?.includes('window.__externalGameHelper = true')
      };
    })()`);

    if (!state.targetState.legend.includes('JUEGOS E INSTANCIAS') || state.targetState.primaryInputs !== 0 ||
      !state.targetState.automaticTargets.includes('Juego externo') || state.count !== '1' ||
      !state.gameTags.includes('Juego externo') || !state.message.includes('2 pantallas compatibles') ||
      state.externalInjectionCount !== 1 || state.primaryInjectionCount !== 0 ||
      !state.hasInstanceMetadata || !state.sourceIncluded) {
      throw new Error(`Multi-game userscript behavior failed: ${JSON.stringify(state)}`);
    }

    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
