const { app, BrowserWindow } = require('electron');
const path = require('node:path');

async function waitFor(window, expression, timeout = 15_000) {
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
    width: 1180,
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
    await waitFor(window, 'window.pokeGridUserScriptManager');
    await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#scriptsButton').click();
      document.querySelector('#scriptShopTab').click();
    })()`);
    await waitFor(window, 'document.querySelectorAll(".script-shop-card").length === 1');
    const desktop = await window.webContents.executeJavaScript(`(() => {
      const modal = document.querySelector('.scripts-modal').getBoundingClientRect();
      const card = document.querySelector('.script-shop-card').getBoundingClientRect();
      return {
        shopVisible: !document.querySelector('#scriptShopView').hidden,
        installedHidden: document.querySelector('#installedScriptsView').hidden,
        title: document.querySelector('.script-shop-card h3').textContent,
        actions: document.querySelectorAll('.script-shop-card-actions button').length,
        details: Boolean(document.querySelector('.script-shop-card details')),
        inside: card.left >= modal.left && card.right <= modal.right && card.top >= modal.top && card.bottom <= modal.bottom,
        columns: getComputedStyle(document.querySelector('#scriptShopGrid')).gridTemplateColumns
      };
    })()`);
    if (!desktop.shopVisible || !desktop.installedHidden || desktop.title !== 'Market Helper' || desktop.actions !== 1 ||
        !desktop.details || !desktop.inside) throw new Error(`Desktop Shop layout failed: ${JSON.stringify(desktop)}`);

    window.showInactive();
    await new Promise((resolve) => setTimeout(resolve, 350));
    await window.capturePage().then((image) => image.toPNG()).then((buffer) => require('node:fs').writeFileSync(path.join(__dirname, 'script-shop.png'), buffer));
    window.setSize(430, 760);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const mobile = await window.webContents.executeJavaScript(`(() => {
      const viewport = { width: innerWidth, height: innerHeight };
      const modal = document.querySelector('.scripts-modal').getBoundingClientRect();
      const card = document.querySelector('.script-shop-card').getBoundingClientRect();
      const toolbar = document.querySelector('.script-shop-toolbar').getBoundingClientRect();
      return {
        viewport,
        modal: { left: modal.left, right: modal.right, top: modal.top, bottom: modal.bottom },
        card: { left: card.left, right: card.right, width: card.width },
        toolbarWidth: toolbar.width,
        columns: getComputedStyle(document.querySelector('#scriptShopGrid')).gridTemplateColumns,
        overflowX: document.documentElement.scrollWidth > innerWidth
      };
    })()`);
    if (mobile.overflowX || mobile.modal.left < 0 || mobile.modal.right > mobile.viewport.width ||
        mobile.card.left < mobile.modal.left || mobile.card.right > mobile.modal.right || mobile.card.width < 300) {
      throw new Error(`Mobile Shop layout failed: ${JSON.stringify(mobile)}`);
    }
    await window.webContents.executeJavaScript(`document.querySelector('.script-shop-card [data-action="install"]').click()`);
    await waitFor(window, 'document.querySelectorAll(".script-shop-card").length === 0');
    const retired = await window.webContents.executeJavaScript(`({
      cards: document.querySelectorAll('.script-shop-card').length,
      message: document.querySelector('#scriptShopMessage').textContent
    })`);
    if (retired.cards !== 0 || !retired.message.includes('retirado de la Shop')) {
      throw new Error(`Retired Shop item was not removed locally: ${JSON.stringify(retired)}`);
    }
    console.log(JSON.stringify({ desktop, mobile, retired }));
  } catch (error) {
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    window.destroy();
    app.quit();
  }
});
