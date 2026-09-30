const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-guest-cleanup-${process.pid}`));

// La página del launcher declara `script-src 'self'` en su CSP, así que el eval
// autorizado por R-08 no puede correr dentro de ella: Chromium lo corta con un
// EvalError y executeJavaScript solo devuelve "Script failed to execute", que no
// dice nada del código evaluado. Por eso la limpieza se ejecuta en una ventana
// auxiliar sin CSP, generada aquí mismo y borrada al terminar. Es el mismo
// contexto que un guest de <webview>: documento real y localStorage real, y el
// código que se evalúa es exactamente el que devuelve buildGuestCleanupSource.
const harnessDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-guest-cleanup-'));
const harnessFile = path.join(harnessDir, 'harness.html');
fs.writeFileSync(
  harnessFile,
  '<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><title>Arenero de limpieza</title></head>\n<body></body>\n</html>\n',
  'utf8'
);

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

function userscriptSource(version) {
  return [
    '// ==UserScript==',
    '// @name Sonda de arrastre',
    '// @namespace pokegrid.drop-probe',
    ...(version ? [`// @version ${version}`] : ['// @description Sin @version']),
    '// @match https://poke.idleworld.online/*',
    '// ==/UserScript==',
    `window.__dropProbe = ${JSON.stringify(version || 'sin-version')};`,
    ''
  ].join('\n');
}

const dropProbeFile = (window, version) => window.webContents.executeJavaScript(`(() => {
  const transfer = new DataTransfer();
  transfer.items.add(new File([${JSON.stringify(userscriptSource(version))}], 'sonda.user.js', { type: 'text/javascript' }));
  document.querySelector('#scriptDropZone').dispatchEvent(
    new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true })
  );
  return true;
})()`);

const readStoredProbe = (window) => window.webContents.executeJavaScript(`(async () => {
  const stored = await window.pokeGrid.loadUserScripts();
  const row = (stored.scripts || []).find((script) => script.id === 'probe-drop') || null;
  return {
    version: row?.version ?? null,
    enabled: row?.enabled ?? null,
    accounts: row?.accounts ?? null,
    probe: row?.code?.includes('window.__dropProbe') ? (row.code.match(/window\.__dropProbe = "([^"]*)"/) || [])[1] : null
  };
})()`);

const seedInstalledProbe = (window) => window.webContents.executeJavaScript(`(async () => {
  const payload = {
    id: 'probe-drop',
    code: ${JSON.stringify(userscriptSource('2.0.0'))},
    enabled: true,
    accounts: [true, false, false, false],
    sourceUrl: 'pokegrid-drop://sonda.user.js'
  };
  await window.pokeGrid.saveUserScript(payload);
  await window.pokeGridUserScriptManager.refresh();
  return true;
})()`);

// Deja el borrador con el interruptor y las cuentas en el estado pedido y lo
// guarda. Devuelve cuántas cuentas tenía el formulario, que el recorrido usa
// como prueba de que encontró los controles de verdad.
const submitEditorWith = (window, { enabled, accounts }) => window.webContents.executeJavaScript(`(() => {
  const enabledInput = document.querySelector('#scriptEnabledInput');
  const toggles = [...document.querySelectorAll('#scriptAccountToggles input')];
  enabledInput.checked = ${JSON.stringify(Boolean(enabled))};
  toggles.forEach((input, index) => { input.checked = ${JSON.stringify(Boolean(accounts))}; });
  document.querySelector('#scriptEditorForm').requestSubmit();
  return toggles.length;
})()`);

const readScriptMessage = (window) => window.webContents.executeJavaScript(
  "document.querySelector('#scriptsMessage').textContent"
);

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
  const harness = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: false }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');

    const apiShape = await window.webContents.executeJavaScript(`(() => {
      const manager = window.pokeGridUserScriptManager;
      return {
        cleanupScriptInPanels: typeof manager.cleanupScriptInPanels,
        buildGuestCleanupSource: typeof manager.buildGuestCleanupSource
      };
    })()`);

    if (apiShape.cleanupScriptInPanels !== 'function' || apiShape.buildGuestCleanupSource !== 'function') {
      throw new Error(`La API de limpieza en el guest no esta expuesta: ${JSON.stringify(apiShape)}`);
    }

    // El generador se pide a la página real del launcher; lo que se evalúa abajo
    // es su salida, sin reescribirla.
    const cleanupSource = await window.webContents.executeJavaScript(
      "window.pokeGridUserScriptManager.buildGuestCleanupSource('probe-1')"
    );
    if (typeof cleanupSource !== 'string' || cleanupSource.length < 50) {
      throw new Error('buildGuestCleanupSource no devolvio una cadena utilizable.');
    }

    // Siembra el estado que dejaría un script inyectado, ejecuta el código de
    // limpieza y comprueba que solo desaparece lo de ese script.
    await harness.loadFile(harnessFile);
    const state = await harness.webContents.executeJavaScript(`(() => {
      const id = 'probe-1';
      const other = 'probe-2';

      localStorage.setItem('pokegrid:userscript:' + id + ':storage', JSON.stringify({ flag: 'on' }));
      localStorage.setItem('pokegrid:userscript:' + other + ':storage', JSON.stringify({ flag: 'on' }));

      const style = document.createElement('style');
      style.dataset.pokegridUserscript = id;
      style.textContent = '.probe { color: red }';
      document.head.appendChild(style);
      const otherStyle = document.createElement('style');
      otherStyle.dataset.pokegridUserscript = other;
      document.head.appendChild(otherStyle);

      const toast = document.createElement('div');
      toast.dataset.pokegridUserscriptToast = id;
      document.documentElement.appendChild(toast);
      const otherToast = document.createElement('div');
      otherToast.dataset.pokegridUserscriptToast = other;
      document.documentElement.appendChild(otherToast);

      const registry = window.__pokeGridUserScriptsRuntime || (window.__pokeGridUserScriptsRuntime = new Set());
      registry.add(id + '::https://poke.idleworld.online/');
      registry.add(other + '::https://poke.idleworld.online/');

      const commands = window.__pokeGridUserScriptCommands || (window.__pokeGridUserScriptCommands = []);
      commands.push({ id: id + ':0', scriptId: id, caption: 'Menu' });
      commands.push({ id: other + ':0', scriptId: other, caption: 'Menu' });

      // R-08: este eval está autorizado. Evalúa la cadena que devuelve
      // buildGuestCleanupSource, que es código generado por el propio producto, y
      // el scriptId va embebido con JSON.stringify para que no se pueda inyectar.
      const removed = eval(${JSON.stringify(cleanupSource)});

      return {
        removed,
        ownStorage: localStorage.getItem('pokegrid:userscript:' + id + ':storage'),
        otherStorage: localStorage.getItem('pokegrid:userscript:' + other + ':storage'),
        ownStyles: document.querySelectorAll('style[data-pokegrid-userscript="' + id + '"]').length,
        otherStyles: document.querySelectorAll('style[data-pokegrid-userscript="' + other + '"]').length,
        ownToasts: document.querySelectorAll('[data-pokegrid-userscript-toast="' + id + '"]').length,
        otherToasts: document.querySelectorAll('[data-pokegrid-userscript-toast="' + other + '"]').length,
        registryHasOwn: [...registry].some((entry) => entry.startsWith(id + '::')),
        registryHasOther: [...registry].some((entry) => entry.startsWith(other + '::')),
        commandsHaveOwn: commands.some((entry) => entry.scriptId === id),
        commandsHaveOther: commands.some((entry) => entry.scriptId === other)
      };
    })()`);

    if (state.ownStorage !== null) throw new Error('La limpieza no borro el almacenamiento del script.');
    if (state.otherStorage === null) throw new Error('La limpieza borro el almacenamiento de OTRO script.');
    if (state.ownStyles !== 0) throw new Error(`Quedaron ${state.ownStyles} <style> del script.`);
    if (state.otherStyles !== 1) throw new Error('La limpieza borro los <style> de otro script.');
    if (state.ownToasts !== 0) throw new Error('Quedaron toasts del script.');
    if (state.otherToasts !== 1) throw new Error('La limpieza borro los toasts de otro script.');
    if (state.registryHasOwn) throw new Error('Quedo la entrada del script en el registro anti-duplicado.');
    if (!state.registryHasOther) throw new Error('La limpieza vacio el registro de otros scripts.');
    if (state.commandsHaveOwn) throw new Error('Quedaron comandos de menu del script.');
    if (!state.commandsHaveOther) throw new Error('La limpio los comandos de menu de otro script.');

    // cleanupScriptInPanels recorre todos los paneles registrados y resuelve sin
    // lanzar aunque un webview no responda: borrar un script no puede quedarse
    // a medias por culpa de una sesión.
    const panelCleanup = await window.webContents.executeJavaScript(
      "window.pokeGridUserScriptManager.cleanupScriptInPanels('probe-1').then((results) => results.length)"
    );
    if (panelCleanup !== 4) {
      throw new Error(`La limpieza en paneles no cubrio los 4 paneles: ${panelCleanup}`);
    }

    // Arrastrar un .user.js mas antiguo no debe pisar la copia instalada: con una
    // copia 2.0.0 en el centro, un 1.0.0 arrastrado y otro sin @version se
    // rechazan, y un 3.0.0 sí actualiza.
    await seedInstalledProbe(window);
    const installedBefore = await readStoredProbe(window);
    if (installedBefore.version !== '2.0.0') {
      throw new Error(`La copia de partida no se sembró bien: ${JSON.stringify(installedBefore)}`);
    }

    await dropProbeFile(window, '1.0.0');
    await waitFor(window, "document.querySelector('#scriptsMessage').textContent.includes('es más antigua')");
    const afterOlder = await readStoredProbe(window);

    await dropProbeFile(window, null);
    await waitFor(window, "document.querySelector('#scriptsMessage').textContent.includes('no declara @version')");
    const afterMissingVersion = await readStoredProbe(window);

    await dropProbeFile(window, '3.0.0');
    await waitFor(window, "document.querySelector('#scriptsMessage').textContent.includes('1 actualizado')");
    const afterNewer = await readStoredProbe(window);

    if (afterOlder.probe !== '2.0.0') {
      throw new Error(`Un archivo mas antiguo pisó la copia instalada: ${JSON.stringify(afterOlder)}`);
    }
    if (afterMissingVersion.probe !== '2.0.0') {
      throw new Error(`Un archivo sin @version pisó la copia instalada: ${JSON.stringify(afterMissingVersion)}`);
    }
    if (afterNewer.probe !== '3.0.0' || afterNewer.version !== '3.0.0') {
      throw new Error(`Un archivo mas nuevo no actualizó la copia instalada: ${JSON.stringify(afterNewer)}`);
    }

    // BUG-08: el guard de saveEditor mira el interruptor de estado antes que las
    // cuentas. Un script encendido sin ninguna cuenta marcada se guarda, que antes
    // era imposible; apagado y sin cuentas sí se rechaza, con el motivo nuevo.
    const togglesFound = await submitEditorWith(window, { enabled: true, accounts: false });
    if (togglesFound !== 4) {
      throw new Error(`El formulario no tenía los 4 controles de cuenta: ${togglesFound}`);
    }
    await waitFor(window, "document.querySelector('#scriptsMessage').textContent.includes('Script guardado')");
    const enabledWithoutAccounts = await readStoredProbe(window);
    if (enabledWithoutAccounts.enabled !== true || (enabledWithoutAccounts.accounts || []).some(Boolean)) {
      throw new Error(`Un script encendido sin cuentas no se guardó: ${JSON.stringify(enabledWithoutAccounts)}`);
    }

    const guardToggles = await submitEditorWith(window, { enabled: false, accounts: false });
    if (guardToggles !== 4) {
      throw new Error(`El formulario no tenía los 4 controles de cuenta: ${guardToggles}`);
    }
    await waitFor(window, "document.querySelector('#scriptsMessage').textContent.includes('Activa el script')");
    const afterGuard = await readStoredProbe(window);
    const blockedMessage = await readScriptMessage(window);
    if (blockedMessage.indexOf('Activa el script o marca al menos una cuenta donde ejecutarlo.') === -1) {
      throw new Error(`El guard no dio el motivo nuevo: ${blockedMessage}`);
    }
    // Lo que se guardó antes sigue intacto: el guard paró la escritura, así que el
    // script sigue encendido. Si el guard desapareciera, el guardado pasaría de
    // largo y aquí se vería apagado.
    if (afterGuard.enabled !== true || (afterGuard.accounts || []).some(Boolean)) {
      throw new Error(`El guard dejó pasar un guardado que no tenía dónde ejecutarse: ${JSON.stringify(afterGuard)}`);
    }

    console.log(JSON.stringify({
      ...state,
      panelCleanup,
      afterOlder,
      afterMissingVersion,
      afterNewer,
      enabledWithoutAccounts,
      afterGuard,
      blockedMessage
    }));
    harness.destroy();
    window.destroy();
    fs.rmSync(harnessDir, { recursive: true, force: true });
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    harness.destroy();
    window.destroy();
    try { fs.rmSync(harnessDir, { recursive: true, force: true }); } catch {}
    app.exit(1);
  }
});
