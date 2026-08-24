const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
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
    width: 1440,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');
    const state = await window.webContents.executeJavaScript(`(async () => {
      window.pokeGridUserScriptManager.open(1);
      const code = document.querySelector('#scriptCodeInput');
      code.value = code.value.replace('Mi script de PokeGrid', 'Smoke Script');
      code.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelectorAll('#scriptAccountToggles input').forEach((input, index) => { input.checked = index === 1; });
      document.querySelector('#scriptEditorForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const item = document.querySelector('.script-list-item');
      if (!item) throw new Error('No se guardó el script de prueba: ' + document.querySelector('#scriptSyntaxStatus').textContent + ' · ' + document.querySelector('#scriptsMessage').textContent);
      const baseState = {
        open: !document.querySelector('#scriptsBackdrop').hidden,
        title: document.querySelector('#scriptEditorName').textContent,
        count: document.querySelector('#scriptCount').textContent,
        enabledAccounts: [...item.querySelectorAll('.script-list-accounts i.is-on')].map((entry) => entry.textContent),
        hasWarning: document.querySelector('.scripts-security-note').textContent.includes('controlar por completo'),
        importButtons: document.querySelectorAll('#importScriptButton').length,
        mainScriptsButton: document.querySelectorAll('#scriptsButton').length,
        perPanelButtons: document.querySelectorAll('.scripts-toggle').length,
        backdropDisplay: getComputedStyle(document.querySelector('#scriptsBackdrop')).display,
        backdropZ: getComputedStyle(document.querySelector('#scriptsBackdrop')).zIndex,
        modalDisplay: getComputedStyle(document.querySelector('.scripts-modal')).display,
        modalVisibility: getComputedStyle(document.querySelector('.scripts-modal')).visibility,
        modalRect: document.querySelector('.scripts-modal').getBoundingClientRect().toJSON(),
        centerStack: document.elementsFromPoint(500, 300).slice(0, 6).map((element) => element.id || element.className || element.tagName)
      };
      document.querySelector('#installTelegramAlertsButton').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const telegramDraft = {
        title: document.querySelector('#scriptEditorName').textContent,
        accountCount: [...document.querySelectorAll('#scriptAccountToggles input')].filter((input) => input.checked).length,
        hasSharedGrant: document.querySelector('#scriptPermissionSummary').textContent.includes('PokeGrid_sharedStorage')
      };
      document.querySelector('#scriptEditorForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 250));
      document.querySelector('#exportScriptButton').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const validSyntax = document.querySelector('#scriptSyntaxStatus').classList.contains('is-ok');
      const linesBefore = document.querySelector('#scriptLineNumbers').textContent.split('\\n').length;
      const editor = document.querySelector('#scriptCodeInput');
      const savedCode = editor.value;
      editor.value = 'function broken( {';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#validateScriptButton').click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const detectsSyntaxError = document.querySelector('#scriptSyntaxStatus').classList.contains('is-error');
      document.querySelector('#scriptEditorForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 80));
      const saveBlockedBySyntax = document.querySelector('#scriptCount').textContent === '2';
      editor.value = savedCode;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#validateScriptButton').click();
      editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
      return {
        ...baseState,
        telegramDraft,
        finalCount: document.querySelector('#scriptCount').textContent,
        exportButtons: document.querySelectorAll('#exportScriptButton').length,
        exportMessage: document.querySelector('#scriptsMessage').textContent,
        validSyntax,
        detectsSyntaxError,
        saveBlockedBySyntax,
        linesBefore,
        lineNumberCount: document.querySelector('#scriptLineNumbers').textContent.split('\\n').length,
        hasFindBar: !document.querySelector('#scriptFindBar').hidden,
        toolbarButtons: document.querySelectorAll('.script-editor-tools button').length,
        listOverflow: getComputedStyle(document.querySelector('#scriptsList')).overflowY
      };
    })()`);
    if (!state.open || state.title !== 'Smoke Script' || state.count !== '1' ||
      state.enabledAccounts.join(',') !== '2' || !state.hasWarning || state.importButtons !== 1 || state.mainScriptsButton !== 1 ||
      state.perPanelButtons !== 0 ||
      state.telegramDraft?.title !== 'PokeGrid Telegram Alerts' ||
      state.telegramDraft?.accountCount !== 4 || !state.telegramDraft?.hasSharedGrant ||
      state.finalCount !== '2' || state.exportButtons !== 1 ||
      !state.validSyntax || !state.detectsSyntaxError || !state.saveBlockedBySyntax ||
      state.linesBefore < 5 || state.lineNumberCount < 5 || !state.hasFindBar || state.toolbarButtons < 6 ||
      !['auto', 'scroll'].includes(state.listOverflow) || state.modalRect.width > 1100 || state.modalRect.height > 800) {
      throw new Error(`Userscript center failed: ${JSON.stringify(state)}`);
    }
    await window.webContents.executeJavaScript(`document.querySelectorAll('webview').forEach((element) => element.remove())`);
    window.show();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const image = await window.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'userscripts-center.png'), image.toPNG());
    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
