const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

app.whenReady().then(async () => {
  let minimizeRequested = false;
  let closeRequested = false;
  ipcMain.on('pokepedia:minimize', () => { minimizeRequested = true; });
  ipcMain.on('pokepedia:close', () => { closeRequested = true; });

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'src', 'pokepedia-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'pokepedia-shell.html'));
    const controls = await window.webContents.executeJavaScript(`(() => {
      const group = document.querySelector('.pokepedia-window-actions');
      const buttons = [...group?.querySelectorAll('button') || []];
      buttons.forEach((button) => button.click());
      return {
        groups: document.querySelectorAll('.pokepedia-window-actions').length,
        labels: buttons.map((button) => button.getAttribute('aria-label')),
        symbols: buttons.map((button) => button.textContent)
      };
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (controls.groups !== 1 ||
        !controls.labels.includes('Minimizar Pokepedia') ||
        !controls.labels.includes('Cerrar Pokepedia') ||
        !controls.symbols.includes('−') ||
        !controls.symbols.includes('×') ||
        !minimizeRequested ||
        !closeRequested) {
      throw new Error(`Pokepedia controls failed: ${JSON.stringify({ controls, minimizeRequested, closeRequested })}`);
    }
    console.log(JSON.stringify({ controls, minimizeRequested, closeRequested }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
