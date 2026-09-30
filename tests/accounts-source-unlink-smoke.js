const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario. main.js lo lee de
// POKEGRID_DIAGNOSTIC_USER_DATA y lo pone como userData, así que accounts-source.json
// vive aquí y se puede mirar desde este proceso sin pasar por el renderer.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-unlink-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

// Launcher real. El handler accounts:unlink-source, el preload y el renderer son los
// de producción: esta prueba no puede quedarse en el arnés de previsualización
// porque ese preload (tests/launcher-preview-preload.js, compartido por 22 suites) no
// expone unlinkAccountsSource, y lo que hay que comprobar —que el archivo con las
// contraseñas en claro desaparece del disco— solo se ve en el proceso principal.
require('../src/main.js');

const { app, BrowserWindow, dialog } = require('electron');

const accountsSourceFile = path.join(userDataDir, 'accounts-source.json');

async function waitFor(window, expression, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

// Los textos que dependen del número de cuentas y el estado de la fila del archivo
// vinculado. accountCount() nunca devuelve 0, así que "1 cuenta" solo aparece de
// verdad cuando queda una fila.
async function leerEstado(mainWindow) {
  return mainWindow.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('#unlinkAccountsButton');
    return {
      marca: document.querySelector('#brandSessionCount')?.textContent || '',
      estadisticas: document.querySelector('#statisticsAccountCount')?.textContent || '',
      notificaciones: document.querySelector('#notificationAccountCount')?.textContent || '',
      cuentas: document.querySelectorAll('#grid .panel').length,
      filas: document.querySelectorAll('.account-row').length,
      botonExiste: Boolean(boton),
      botonVisible: boton ? boton.hidden === false : null,
      ruta: document.querySelector('#accountsSourcePath')?.textContent || '',
      mensaje: document.querySelector('#modalMessage')?.textContent || '',
      avisos: (window.__unlink?.avisos || []).slice()
    };
  })()`);
}

async function abrirModal(mainWindow) {
  await mainWindow.webContents.executeJavaScript(`(() => {
    document.querySelector('#accountsButton').click();
    return true;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function plantilla(cuentas, sufijo) {
  const lines = ['# plantilla de prueba con contraseñas en texto plano'];
  for (let index = 0; index < cuentas; index += 1) {
    lines.push(
      `[CUENTA ${index + 1}]`,
      `nombre_panel=Vinculada${index + 1}${sufijo}`,
      `usuario=vinculada${index + 1}`,
      `contrasena=clave-en-claro-${index + 1}`,
      ''
    );
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

app.whenReady().then(async () => {
  try {
    let mainWindow = null;
    const started = Date.now();
    while (!mainWindow && Date.now() - started < 20_000) {
      mainWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) || null;
      if (mainWindow) break;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    assert.ok(mainWindow, 'La ventana principal no se creó');
    await waitFor(mainWindow, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 4`);

    // window.confirm es un diálogo nativo bloqueante: sin stub la prueba se cuelga
    // esperando a un botón que nadie va a pulsar. El stub registra el texto y obedece
    // a la bandera `aceptar`, para recorrer tanto "acepto" como "cancelo".
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__unlink = { avisos: [], aceptar: true };
      window.confirm = (message) => { window.__unlink.avisos.push(String(message)); return window.__unlink.aceptar; };
      return true;
    })()`);

    // --- Arnés: los textos dinámicos arrancan correctos con 4 cuentas ---
    await abrirModal(mainWindow);
    const arranque = await leerEstado(mainWindow);
    assert.equal(arranque.marca, '4 cuentas · 1 juego', `El texto de la marca debe derivarse del número real: ${JSON.stringify(arranque)}`);
    assert.equal(arranque.estadisticas, '4 cuentas', `Estadísticas: ${JSON.stringify(arranque)}`);
    assert.equal(arranque.notificaciones, '4 cuentas', `Notificaciones: ${JSON.stringify(arranque)}`);

    // --- 1. Sin archivo vinculado el botón no puede verse ---
    assert.ok(!fs.existsSync(accountsSourceFile), 'No debería haber archivo vinculado al arrancar');
    assert.ok(arranque.botonExiste, 'No existe el botón de desvincular el archivo .txt, que contiene contraseñas en texto plano.');
    assert.equal(arranque.botonVisible, false, `El botón no debe aparecer sin archivo vinculado: ${JSON.stringify(arranque)}`);
    assert.match(arranque.ruta, /Ningún archivo vinculado/, `La ruta sin archivo: ${JSON.stringify(arranque)}`);

    // --- Importar una plantilla de verdad: el IPC, el parseo y el borrado de
    // accounts-source.json son los de producción; solo el diálogo nativo se sustituye.
    const template = path.join(userDataDir, 'cuentas-vinculadas.txt');
    fs.writeFileSync(template, plantilla(3, ''), 'utf8');
    const originalShowOpenDialog = dialog.showOpenDialog;
    try {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [template] });
      await mainWindow.webContents.executeJavaScript(`(async () => {
        document.querySelector('#importAccountsButton').click();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        return true;
      })()`);
    } finally {
      dialog.showOpenDialog = originalShowOpenDialog;
    }
    assert.ok(fs.existsSync(accountsSourceFile), `Importar debe dejar accounts-source.json en userData: ${accountsSourceFile}`);
    const vinculado = fs.readFileSync(accountsSourceFile, 'utf8');
    assert.ok(JSON.parse(vinculado).sourcePath === template, `El archivo debe apuntar a la plantilla: ${vinculado}`);

    // --- 1 (cont.). Con archivo vinculado el botón se ve y la ruta lo nombra ---
    await abrirModal(mainWindow);
    const conArchivo = await leerEstado(mainWindow);
    assert.equal(conArchivo.botonVisible, true, `Con archivo vinculado el botón debe verse: ${JSON.stringify(conArchivo)}`);
    assert.ok(conArchivo.ruta.includes(template), `La ruta debe nombrar el archivo vinculado: ${JSON.stringify(conArchivo)}`);
    assert.equal(conArchivo.marca, '3 cuentas · 1 juego', `Importar debe reescribir la marca: ${JSON.stringify(conArchivo)}`);
    assert.equal(conArchivo.estadisticas, '3 cuentas', `Importar debe reescribir el texto de estadísticas: ${JSON.stringify(conArchivo)}`);
    assert.equal(conArchivo.notificaciones, '3 cuentas', `Importar debe reescribir el texto de notificaciones: ${JSON.stringify(conArchivo)}`);

    // --- El poller corre cada 15 s desde el arranque, así que antes de desvincular
    // hay que dejarlo leer el archivo una vez. Esto no es decorativo: es lo que
    // calienta cualquier caché que alguien pudiera añadir en main.js. Si la ruta
    // se guardara en memoria, este leer la llenaría y el desvinculado —que solo
    // borra el archivo— no bastaría para parar el sincronizador.
    await mainWindow.webContents.executeJavaScript(`(async () => {
      await syncLinkedAccounts();
      return true;
    })()`);
    const enlazado = await mainWindow.webContents.executeJavaScript(`(async () => {
      const resultado = await window.pokeGrid.syncAccountsSource();
      return { linked: resultado.linked, changed: resultado.changed, cuentas: (resultado.accounts || []).length };
    })()`);
    assert.equal(enlazado.linked, true, `Con accounts-source.json el sincronizador tiene que seguir vinculado: ${JSON.stringify(enlazado)}`);
    assert.equal(enlazado.cuentas, 3, `El sincronizador debe devolver las cuentas importadas: ${JSON.stringify(enlazado)}`);

    // --- 2. Al pulsarlo pide confirmación, y el aviso explica qué se corta ---
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__unlink.avisos.length = 0;
      window.__unlink.aceptar = false;
      document.querySelector('#unlinkAccountsButton').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const cancelando = await leerEstado(mainWindow);

    assert.equal(cancelando.avisos.length, 1, `Desvincular debe pedir confirmación: ${JSON.stringify(cancelando)}`);
    assert.ok(cancelando.avisos[0].includes(template), `El aviso debe nombrar el archivo que se deja de leer: ${JSON.stringify(cancelando.avisos[0])}`);
    assert.ok(/dejará de releerlo/i.test(cancelando.avisos[0]), `El aviso debe decir que el launcher deja de releer el archivo: ${JSON.stringify(cancelando.avisos[0])}`);
    assert.ok(/cifrad/i.test(cancelando.avisos[0]), `El aviso debe decir que las cuentas importadas se conservan: ${JSON.stringify(cancelando.avisos[0])}`);

    // --- 3. Cancelar no desvincula nada: ni en pantalla ni en el disco ---
    assert.ok(cancelando.ruta.includes(template), `Cancelar debe dejar la ruta puesta: ${JSON.stringify(cancelando)}`);
    assert.equal(cancelando.botonVisible, true, `Cancelar debe dejar el botón a la vista: ${JSON.stringify(cancelando)}`);
    assert.ok(!/desvinculado/i.test(cancelando.mensaje), `Cancelar no puede anunciarse como un desvinculado: ${JSON.stringify(cancelando)}`);
    assert.ok(fs.existsSync(accountsSourceFile), 'Cancelar no puede borrar accounts-source.json');

    // --- 4. Aceptar sí desvincula: el mensaje lo dice, la ruta desaparece, el botón
    // se oculta y el archivo con las contraseñas sale del disco ---
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__unlink.avisos.length = 0;
      window.__unlink.aceptar = true;
      document.querySelector('#unlinkAccountsButton').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const desvinculando = await leerEstado(mainWindow);
    assert.equal(desvinculando.avisos.length, 1, `Aceptar debe volver a pedir confirmación: ${JSON.stringify(desvinculando.avisos)}`);
    assert.match(desvinculando.mensaje, /desvinculado/i, `El mensaje tiene que decir que se desvinculó: ${JSON.stringify(desvinculando)}`);
    assert.ok(desvinculando.mensaje.includes('ya no lo relee'), `El mensaje tiene que decir que deja de releerlo: ${JSON.stringify(desvinculando)}`);
    assert.ok(!desvinculando.ruta.includes(template), `La ruta vinculada no puede seguir a la vista: ${JSON.stringify(desvinculando)}`);
    assert.match(desvinculando.ruta, /Ningún archivo vinculado/, `Sin archivo, la ruta vuelve al texto por defecto: ${JSON.stringify(desvinculando)}`);
    assert.equal(desvinculando.botonVisible, false, `Aceptar debe volver a esconder el botón: ${JSON.stringify(desvinculando)}`);
    assert.equal(fs.existsSync(accountsSourceFile), false, 'Aceptar tiene que borrar accounts-source.json, que es lo único que hace que el launcher siga leyendo el .txt');

    // --- La pregunta que decide si el botón sirve de algo: ¿el proceso principal
    // cachea la ruta? Si la cacheara, borrar el archivo no bastaría y el poller de
    // 15 s seguiría leyendo el .txt. Se responde mirando el comportamiento: se
    // cambia el archivo a 9 cuentas y se pide al sincronizador real que lo lea.
    // Si estuviera cacheado, devolvería linked:true y changed:true con 9 cuentas.
    fs.writeFileSync(template, plantilla(9, 'C'), 'utf8');
    const despuesDeUnlink = await mainWindow.webContents.executeJavaScript(`(async () => {
      const resultado = await window.pokeGrid.syncAccountsSource();
      return { linked: resultado.linked, changed: resultado.changed, cuentas: (resultado.accounts || []).length };
    })()`);
    assert.equal(despuesDeUnlink.linked, false, `Sin accounts-source.json el sincronizador no puede seguir vinculado: ${JSON.stringify(despuesDeUnlink)}`);
    assert.equal(despuesDeUnlink.changed, false, `El archivo cambiado no puede volver a aplicarse: ${JSON.stringify(despuesDeUnlink)}`);
    assert.equal(despuesDeUnlink.cuentas, 3, `Las cuentas deben seguir siendo las 3 importadas, no las 9 del archivo: ${JSON.stringify(despuesDeUnlink)}`);

    // Y por el camino del renderer, que es el que dispara el poller cada 15 s.
    const trasElPoller = await mainWindow.webContents.executeJavaScript(`(async () => {
      await syncLinkedAccounts();
      return { paneles: document.querySelectorAll('#grid .panel').length };
    })()`);
    assert.equal(trasElPoller.paneles, 3, `El poller no puede volver a aplicar el archivo desvinculado: ${JSON.stringify(trasElPoller)}`);

    // --- Los textos dinámicos, en singular y en plural, bajando por el formulario ---
    await abrirModal(mainWindow);
    for (const esperado of [{ cuentas: 2, marca: '2 cuentas · 1 juego' }, { cuentas: 1, marca: '1 cuenta · 1 juego' }]) {
      await mainWindow.webContents.executeJavaScript(`(() => {
        document.querySelector('.account-row-remove').click();
        document.querySelector('#accountsForm').requestSubmit();
        return true;
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await abrirModal(mainWindow);
      const estado = await leerEstado(mainWindow);
      assert.equal(estado.cuentas, esperado.cuentas, `Quedan ${esperado.cuentas} paneles: ${JSON.stringify(estado)}`);
      assert.equal(estado.marca, esperado.marca, `La marca debe derivarse del número real: ${JSON.stringify(estado)}`);
      assert.equal(estado.estadisticas, esperado.cuentas === 1 ? '1 cuenta' : `${esperado.cuentas} cuentas`, `Estadísticas: ${JSON.stringify(estado)}`);
      assert.equal(estado.notificaciones, estado.estadisticas, `Notificaciones debe concordar con estadísticas: ${JSON.stringify(estado)}`);
    }

    console.log(JSON.stringify({ ok: true, arranque, conArchivo, cancelando, desvinculando, despuesDeUnlink, trasElPoller }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});