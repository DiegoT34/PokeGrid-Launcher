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
      // Se lee con textContent y no con innerHTML: desde la 0.34.0 este elemento lleva un SVG por dentro, y
      // leerlo como texto devuelve el marcado entero en vez del mensaje. Sin acentos graves en este
      // comentario: va DENTRO de una plantilla y uno solo la cierra antes de tiempo.
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
      // El boton de instalar alertas Telegram se quito en la 0.34.0: el modulo ya se autoinstala al
      // arrancar, asi que el boton era una segunda puerta a lo mismo. Para no perder la cobertura que
      // ese boton daba -que el modulo oficial se puede cargar en el editor, trae sus permisos y se
      // guarda- la prueba hace a mano lo mismo que hacia el boton: lo pide por el puente
      // loadBundledTelegramAlerts y lo mete en el editor. Sin acentos graves ni comillas angulares:
      // esto va DENTRO de una plantilla y las dos cosas la cierran antes de tiempo.
      const telegramBundle = await window.pokeGrid.loadBundledTelegramAlerts();
      const telegramCode = (telegramBundle && telegramBundle.code) || '';
      const editorForTelegram = document.querySelector('#scriptCodeInput');
      editorForTelegram.value = telegramCode;
      editorForTelegram.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 120));
      // Las cuatro cuentas quedan marcadas, que es lo que hacia el boton cuando abria el editor con
      // el modulo preseleccionado. Sin esta linea el borrador sale con una sola y la comprobacion de
      // abajo falla por el motivo equivocado, que es peor que no comprobar nada.
      document.querySelectorAll('#scriptAccountToggles input').forEach((input) => { input.checked = true; });
      await new Promise((resolve) => setTimeout(resolve, 60));
      const telegramDraft = {
        bundledOk: Boolean(telegramBundle && telegramBundle.ok && telegramCode),
        // Con indexOf y no con una expresion regular. Este codigo viaja DENTRO de una plantilla, y ahi los
      // escapes no sobreviven: un \s se convierte en un espacio de verdad y un \. pierde la barra, que
      // es una expression regular distinta a la que se cree estar escribiendo. El fallo sale como
      // «el modulo no trae el namespace», que parece del codigo y es del escapado.
      bundledNamespace: telegramCode.indexOf('@namespace pokegrid.telegram-alerts') >= 0,
        sharedGrant: document.querySelector('#scriptPermissionSummary').textContent.includes('PokeGrid_sharedStorage'),
        accountCount: [...document.querySelectorAll('#scriptAccountToggles input')].filter((input) => input.checked).length,
        title: document.querySelector('#scriptEditorName').textContent
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
      // Queda 1 script, el de prueba: el modulo de Telegram se carga en el editor pero no se guarda, que es
      // justo lo que hacia el boton -abrir el editor con el modulo listo, sin instalar nada-. El
      // guardado con error de sintaxis NO tiene que crear un segundo, asi que el numero se queda en 1.
      const saveBlockedBySyntax = document.querySelector('#scriptCount').textContent === '1';
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
      !state.telegramDraft?.bundledOk || !state.telegramDraft?.bundledNamespace ||
      !state.telegramDraft?.sharedGrant ||
      state.telegramDraft?.title !== 'PokeGrid Telegram Alerts' || state.telegramDraft?.accountCount !== 4 ||
      state.finalCount !== '1' || state.exportButtons !== 1 ||
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
    // El resultado se escribe en un FICHERO, no solo en la consola. Electron es un ejecutable de
    // subsistema grafico y no escribe en la consola de quien lo lanza: una prueba que reventaba se
    // quedaba sin salida ninguna, y eso es indistinguible de una prueba que no ha llegado a empezar.
    // Con el fichero, el fallo se ve en vez de adivinarlo.
    const resumen = JSON.stringify(state, null, 2);
    fs.mkdirSync(path.join(__dirname, '..', '.superpowers'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '..', '.superpowers', 'salida-prueba.txt'), resumen, 'utf8');
    console.log(resumen);
    window.destroy();
    app.exit(0);
  } catch (error) {
    const motivo = (error && (error.stack || error.message)) || String(error);
    try {
      fs.mkdirSync(path.join(__dirname, '..', '.superpowers'), { recursive: true });
      fs.writeFileSync(path.join(__dirname, '..', '.superpowers', 'salida-prueba.txt'), 'ERROR: ' + motivo, 'utf8');
    } catch {}
    console.error(motivo);
    window.destroy();
    app.exit(1);
  }
});
