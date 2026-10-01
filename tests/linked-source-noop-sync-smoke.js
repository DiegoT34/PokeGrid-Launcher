const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Sincronizar el .txt vinculado cada 15 s no puede reescribir las cuentas cuando
// el archivo no ha cambiado de verdad. Cualquier cosa que toque el archivo sin
// tocar su contenido —una copia de seguridad, OneDrive, el explorador al
// abrirlo— llegaba a reescribir accounts.enc y su copia cada quince segundos.

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-linked-source-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const { app, BrowserWindow } = require('electron');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function plantilla(n, sufijo = '') {
  const lines = ['# plantilla de prueba'];
  for (let index = 0; index < n; index += 1) {
    lines.push(
      `[CUENTA ${index + 1}]`,
      `nombre_panel=Enlazada${index + 1}${sufijo}`,
      `usuario=enlazada${index + 1}`,
      `contrasena=clave${index + 1}${sufijo}`,
      ''
    );
  }
  return '\uFEFF' + lines.join('\r\n');
}

app.whenReady().then(async () => {
  let mainWindow = null;
  try {
    const started = Date.now();
    while (!mainWindow && Date.now() - started < 20_000) {
      mainWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) || null;
      if (mainWindow) break;
      await wait(150);
    }
    assert.ok(mainWindow, 'La ventana principal no se creó');
    while (Date.now() - started < 25_000) {
      const listo = await mainWindow.webContents.executeJavaScript(
        "!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length > 0"
      );
      if (listo) break;
      await wait(150);
    }

    const dialog = require('electron').dialog;
    const originalShowOpenDialog = dialog.showOpenDialog;
    const plantillaPath = path.join(userDataDir, 'plantilla-enlazada.txt');
    fs.writeFileSync(plantillaPath, plantilla(4), 'utf8');

    try {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [plantillaPath] });
      const imported = await mainWindow.webContents.executeJavaScript(`(async () => {
        document.querySelector('#accountsButton').click();
        await new Promise((resolve) => setTimeout(resolve, 200));
        document.querySelector('#importAccountsButton').click();
        await new Promise((resolve) => setTimeout(resolve, 1800));
        return {
          paneles: document.querySelectorAll('#grid .panel').length,
          mensaje: document.querySelector('#modalMessage').textContent
        };
      })()`);
      assert.equal(imported.paneles, 4, `Importar 4 cuentas debe dejar 4 paneles: ${JSON.stringify(imported)}`);
    } finally {
      dialog.showOpenDialog = originalShowOpenDialog;
    }

    const sincronizar = () => mainWindow.webContents.executeJavaScript(
      'window.pokeGrid.syncAccountsSource().then((resultado) => ({ ok: resultado.ok, changed: resultado.changed, cuentas: resultado.accounts.map((cuenta) => cuenta.password) }))'
    );

    // 1. Sin tocar nada, la segunda pasada no cambia nada.
    const inicial = await sincronizar();
    assert.equal(inicial.changed, false, `Sin tocar el archivo no debe cambiar nada: ${JSON.stringify(inicial)}`);

    // 2. El caso del bug: solo cambia la fecha, el contenido es idéntico. Un
    // utimes futuro es lo que hace una copia de seguridad o un sincronizador sin
    // tocar ni un byte del archivo.
    const futuro = new Date(Date.now() + 120_000);
    fs.utimesSync(plantillaPath, futuro, futuro);
    const soloFecha = await sincronizar();
    assert.equal(
      soloFecha.changed, false,
      `Tocar solo la fecha no debe reescribir las cuentas: ${JSON.stringify(soloFecha)}`
    );

    // 3. Y una vez anotada la fecha, seguir tocando tampoco.
    const otroFuturo = new Date(Date.now() + 240_000);
    fs.utimesSync(plantillaPath, otroFuturo, otroFuturo);
    const segundaFecha = await sincronizar();
    assert.equal(segundaFecha.changed, false, `Un segundo toque de fecha tampoco: ${JSON.stringify(segundaFecha)}`);

    // 4. Cambiar el contenido de verdad sí tiene que aplicarse, o el arreglo
    // habria servido para que la sincronización no hiciera nada nunca.
    // Ojo con la fecha: los pasos anteriores la empujaron al futuro. Si la
    // decisión se tomara por fecha, este cambio parecería más viejo que lo
    // guardado y se descartaría en silencio.
    fs.writeFileSync(plantillaPath, plantilla(4, 'NUEVA'), 'utf8');
    const conCambio = await sincronizar();
    assert.equal(conCambio.changed, true, `Cambiar una contraseña debe aplicarse: ${JSON.stringify(conCambio)}`);
    assert.equal(
      conCambio.cuentas[3], 'clave4NUEVA',
      `La contraseña nueva tiene que llegar a las cuentas guardadas: ${JSON.stringify(conCambio.cuentas)}`
    );

    // 5. Y volver a tocar la fecha sin cambiar ya nada deja de reescribir.
    const tercerFuturo = new Date(Date.now() + 360_000);
    fs.utimesSync(plantillaPath, tercerFuturo, tercerFuturo);
    const cierre = await sincronizar();
    assert.equal(cierre.changed, false, `Tras aplicar, tocar la fecha no cambia nada: ${JSON.stringify(cierre)}`);

    console.log(JSON.stringify({ ok: true, inicial, soloFecha, conCambio, cierre }));
    if (!mainWindow.isDestroyed()) mainWindow.destroy();
    app.exit(0);
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.destroy();
    console.error(error.stack || error.message);
    app.exit(1);
  }
});