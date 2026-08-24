const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1000,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });
  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    const started = Date.now();
    while (Date.now() - started < 15_000) {
      if (await window.webContents.executeJavaScript(`document.querySelectorAll('.panel').length === 4`)) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const state = await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      document.querySelector('#importAccountsButton').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        modalOpen: !document.querySelector('#modalBackdrop').hidden,
        mainScriptButtons: document.querySelectorAll('#scriptsButton').length,
        panelScriptButtons: document.querySelectorAll('.scripts-toggle').length,
        labels: [...document.querySelectorAll('[data-field="label"]')].map((input) => input.value),
        usernames: [...document.querySelectorAll('[data-field="username"]')].map((input) => input.value),
        passwords: [...document.querySelectorAll('[data-field="password"]')].map((input) => input.value),
        message: document.querySelector('#modalMessage').textContent,
        sourcePath: document.querySelector('#accountsSourcePath').textContent,
        transferButtons: document.querySelectorAll('.accounts-transfer-actions button').length
      };
    })()`);
    if (!state.modalOpen || state.mainScriptButtons !== 1 || state.panelScriptButtons !== 0 ||
      state.transferButtons !== 2 || state.labels.join(',') !== 'IMPORTADA 1,IMPORTADA 2,IMPORTADA 3,IMPORTADA 4' ||
      state.usernames.join(',') !== 'usuario1,usuario2,usuario3,usuario4' ||
      state.passwords.join(',') !== 'clave=1,clave=2,clave=3,clave=4' ||
      !state.sourcePath.includes('C:\\Datos\\PokeGrid\\cuentas-prueba.txt') ||
      !state.message.includes('cuatro cuentas importadas')) {
      throw new Error(`Accounts modal failed: ${JSON.stringify(state)}`);
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
