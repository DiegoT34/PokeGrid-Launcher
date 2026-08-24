const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

async function waitFor(window, expression, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true }
  });
  try {
    await window.loadURL('https://poke.idleworld.online/');
    await window.webContents.executeJavaScript(`(() => {
      window.__pokeGridCaptureQueue = [];
      window.__pokeGridDefeatQueue = [];
      window.GM = {
        info: { script: { account: { index: 0, label: 'ASSET TEST' } } },
        addStyle() {},
        async getSharedValue(_key, fallback) { return fallback; },
        async setSharedValue() {},
        async xmlHttpRequest(details) {
          const response = await fetch(details.url, {
            method: details.method || 'GET',
            headers: details.headers,
            body: details.data
          });
          return {
            status: response.status,
            statusText: response.statusText,
            responseText: await response.text()
          };
        }
      };
    })()`);
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'userscripts', 'PokeGrid-Telegram-Alerts.user.js'),
      'utf8'
    );
    await window.webContents.executeJavaScript(source);
    await waitFor(window, 'window.__pokeGridTelegramAlerts');
    const state = await window.webContents.executeJavaScript(`(async () => {
      const pokemon = await window.__pokeGridTelegramAlerts.previewPokemonImage('Charizard', 6, 67);
      const drop = await window.__pokeGridTelegramAlerts.previewDropImage({ name: 'Leaves' });
      return {
        pokemonFilename: pokemon?.filename || '',
        pokemonMimeType: pokemon?.mimeType || '',
        pokemonBytes: pokemon?.base64 ? atob(pokemon.base64).length : 0,
        drop
      };
    })()`);
    if (state.pokemonFilename !== 'pokegrid-67.png' || state.pokemonMimeType !== 'image/png' ||
      state.pokemonBytes < 500 || !/^https:\/\//.test(state.drop) || !/Leaves/i.test(state.drop)) {
      throw new Error(`Game asset resolution failed: ${JSON.stringify(state)}`);
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
