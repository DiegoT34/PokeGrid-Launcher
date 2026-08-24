const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function captureStable(window) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  await window.webContents.capturePage();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return window.webContents.capturePage();
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1366,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'document.querySelectorAll(".panel").length === 4 && window.__pokeGridPreviewAccountInfo');
    const accountState = await window.webContents.executeJavaScript(`(() => {
      toggleExpanded(panels[0]);
      window.__pokeGridPreviewAccountInfo();
      renderAccountProfile(panels[0], {
        ok: true, name: 'SHOCKVINY', level: 673, rank: '#7525 / 213.373', pokedollars: 4524056, diamonds: 12,
        vip: true, sprite: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', updatedAt: Date.now()
      });
      document.querySelectorAll('webview').forEach((element) => { element.style.visibility = 'hidden'; });
      const card = panels[0].accountInfoPanel;
      const rect = card.getBoundingClientRect();
      return {
        rect: rect.toJSON(),
        image: Boolean(card.querySelector('.account-info-avatar img')),
        icons: card.querySelectorAll('.launcher-ui-icon').length,
        text: card.textContent.replace(/\\s+/g, ' ').trim()
      };
    })()`);
    if (!accountState.image || accountState.icons < 7 || !accountState.text.includes('SHOCKVINY') ||
        accountState.rect.right > 1366 || accountState.rect.bottom > 900 ||
        accountState.rect.width < 360 || accountState.rect.width > 390) {
      throw new Error(`Realtime account redesign failed: ${JSON.stringify(accountState)}`);
    }
    window.show();
    fs.writeFileSync(path.join(__dirname, 'account-realtime-redesign.png'), (await captureStable(window)).toPNG());

    await window.webContents.executeJavaScript(`setAccountInfoOpen(panels[0], false); window.__pokeGridPreviewHuntAnalyzer(true)`);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const huntState = await window.webContents.executeJavaScript(`(() => {
      const card = panels[0].huntPanel;
      const rect = card.getBoundingClientRect();
      return {
        rect: rect.toJSON(),
        metrics: card.querySelectorAll('.hunt-flat-metric').length,
        icons: card.querySelectorAll('.launcher-ui-icon').length,
        drops: card.querySelectorAll('.hunt-flat-drop').length,
        text: card.textContent.replace(/\\s+/g, ' ').trim()
      };
    })()`);
    if (huntState.metrics !== 9 || huntState.icons < 16 || huntState.drops !== 3 ||
        !/hunt analyzer/i.test(huntState.text) || huntState.rect.right > 1366 || huntState.rect.bottom > 900 ||
        huntState.rect.width < 415 || huntState.rect.width > 440) {
      throw new Error(`Hunt Analyzer redesign failed: ${JSON.stringify(huntState)}`);
    }
    fs.writeFileSync(path.join(__dirname, 'hunt-analyzer-redesign.png'), (await captureStable(window)).toPNG());
    console.log(JSON.stringify({ accountState, huntState }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
