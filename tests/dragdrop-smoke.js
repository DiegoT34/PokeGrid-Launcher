// Arrastrar y soltar un userscript sobre la zona de soltado: que se instale, y que soltar
// encima de uno que ya está lo actualice en vez de duplicarlo.
//
// Antes esto vivía dentro de `statistics-and-dragdrop-smoke.js`, una suite con dos pruebas
// pegadas: esta y la del panel de estadísticas. El panel se ha quitado entero de la aplicación,
// así que la suite se queda con lo que sigue existiendo. Se comprueban las dos cosas que hacen
// falta para que soltar un archivo sirva de algo: que aparezca, y que una segunda versión del
// mismo script lo actualice —no que cree un segundo igual— y lo diga.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

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
    const dropState = await window.webContents.executeJavaScript(`(async () => {
      window.pokeGridUserScriptManager.open(-1);
      const drop = async (version) => {
        const code = '// ==UserScript==\\n// @name Drag Smoke\\n// @namespace pokegrid.drag-smoke\\n// @version ' + version + '\\n// @match https://poke.idleworld.online/*\\n// ==/UserScript==\\nwindow.__dragSmoke = ' + JSON.stringify(version) + ';';
        const transfer = new DataTransfer();
        transfer.items.add(new File([code], 'Drag-Smoke.user.js', { type: 'text/javascript' }));
        document.querySelector('#scriptDropZone').dispatchEvent(new DragEvent('drop', {
          bubbles: true, cancelable: true, dataTransfer: transfer
        }));
        const started = Date.now();
        while (Date.now() - started < 3000) {
          const item = document.querySelector('.script-list-item');
          if (item && item.textContent.includes('v' + version)) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error('La versión arrastrada no apareció: ' + version);
      };
      await drop('1.0.0');
      await drop('2.0.0');
      return {
        count: document.querySelector('#scriptCount').textContent,
        title: document.querySelector('#scriptEditorName').textContent,
        version: document.querySelector('#scriptEditorMeta').textContent,
        accounts: document.querySelectorAll('#scriptAccountToggles input:checked').length,
        message: document.querySelector('#scriptsMessage').textContent,
        dropZone: Boolean(document.querySelector('#scriptDropZone'))
      };
    })()`);

    const fallos = [];
    const comprobar = (ok, que, detalle) => {
      if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
      console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
    };
    console.log('--- arrastrar y soltar un userscript ---');
    comprobar(dropState.dropZone, 'la zona de soltado existe en el DOM');
    comprobar(dropState.count === '1', 'soltar dos versiones deja UN script, no dos', `contador: ${dropState.count}`);
    comprobar(dropState.title === 'Drag Smoke', 'y es el que se soltó', `título: ${dropState.title}`);
    comprobar(String(dropState.version).includes('v2.0.0'), 'con la última versión', `versión: ${dropState.version}`);
    comprobar(dropState.accounts === 4, 'marcado para las cuatro cuentas', `${dropState.accounts} marcadas`);
    comprobar(String(dropState.message).includes('actualizado'), 'y avisa de que se actualizó', `mensaje: ${dropState.message}`);

    console.log('');
    console.log(fallos.length === 0
      ? 'Arrastrar y soltar: instala, y una segunda versión actualiza en vez de duplicar.'
      : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
    window.destroy();
    app.exit(fallos.length === 0 ? 0 : 1);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
