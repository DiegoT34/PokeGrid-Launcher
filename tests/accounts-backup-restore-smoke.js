// Que el botón "Restaurar copia anterior" sea alcanzable de verdad.
//
// El fallo que cubre esta prueba: un botón con hidden en el HTML que nada vuelve a
// mostrar. El código del handler, del preload y del módulo existirían y la feature
// seguiría sin existir. Aquí se pulsa el botón de verdad, con el launcher real, el
// preload real y el renderer real, y se comprueba que después de pulsarlo las cuentas
// del disco son las anteriores.
//
// El harness es el de accounts-source-unlink-smoke: require('../src/main.js') y, solo
// para importar, se sustituye dialog.showOpenDialog. No se toca
// tests/launcher-preview-preload.js porque su API no incluye ni restoreAccountsBackup
// ni los canales nuevos, y tocarlo afecta a 22 suites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-backup-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');

const { app, BrowserWindow, dialog, safeStorage } = require('electron');

const credentialFile = path.join(userDataDir, 'accounts.enc');
const backupFile = `${credentialFile}.bak`;

async function waitFor(window, expression, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

async function abrirModal(mainWindow) {
  await mainWindow.webContents.executeJavaScript(`(() => {
    document.querySelector('#accountsButton').click();
    return true;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function leerEstado(mainWindow) {
  return mainWindow.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('#restoreAccountsButton');
    return {
      existe: Boolean(boton),
      visible: boton ? boton.hidden === false : null,
      texto: boton ? boton.textContent : '',
      desvincularVisible: document.querySelector('#unlinkAccountsButton')?.hidden === false,
      ruta: document.querySelector('#accountsSourcePath')?.textContent || '',
      mensaje: document.querySelector('#modalMessage')?.textContent || '',
      avisos: (window.__backup?.avisos || []).slice(),
      filas: [...document.querySelectorAll('.account-row')].map((fila) => ({
        nombre: fila.querySelector('[data-field="label"]')?.value || '',
        usuario: fila.querySelector('[data-field="username"]')?.value || ''
      })),
      paneles: document.querySelectorAll('#grid .panel').length
    };
  })()`);
}

function plantilla(nombre, usuarios) {
  const lines = ['# plantilla de prueba'];
  usuarios.forEach((usuario, index) => {
    lines.push(`[CUENTA ${index + 1}]`, `nombre_panel=${nombre}${index + 1}`, `usuario=${usuario}`, `contrasena=clave-${usuario}`, '');
  });
  return `\uFEFF${lines.join('\r\n')}`;
}

async function importar(mainWindow, templatePath) {
  const original = dialog.showOpenDialog;
  try {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [templatePath] });
    await mainWindow.webContents.executeJavaScript(`(async () => {
      document.querySelector('#importAccountsButton').click();
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return true;
    })()`);
  } finally {
    dialog.showOpenDialog = original;
  }
}

function cuentasEnDisco() {
  return JSON.parse(safeStorage.decryptString(fs.readFileSync(credentialFile)));
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

    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__backup = { avisos: [], aceptar: true };
      window.confirm = (message) => { window.__backup.avisos.push(String(message)); return window.__backup.aceptar; };
      return true;
    })()`);

    // --- 1. El botón existe en el DOM y arranca escondido. Un botón que se declara
    // con hidden y nada vuelve a mostrar es una feature inexistente: se comprueba que
    // existe, para que el fallo sea "no se muestra cuando debería" y no "no existe".
    await abrirModal(mainWindow);
    const alPrincipio = await leerEstado(mainWindow);
    assert.ok(alPrincipio.existe, 'No existe el botón de restaurar copia anterior en el modal de cuentas.');
    assert.equal(alPrincipio.visible, false,
      `Sin copia anterior el botón no puede verse: ${JSON.stringify(alPrincipio)}`);
    assert.ok(fs.existsSync(backupFile) === false, `No debería haber copia en un perfil nuevo: ${backupFile}`);

    // --- 2. Un solo guardado no crea copia: la primera generación no tiene anterior.
    const primera = path.join(userDataDir, 'primera.txt');
    fs.writeFileSync(primera, plantilla('PRIMERA', ['primera1', 'primera2']), 'utf8');
    await importar(mainWindow, primera);
    assert.equal(fs.existsSync(backupFile), false, 'El primer guardado no puede crear una copia: no hay nada anterior que copiar.');
    await abrirModal(mainWindow);
    const trasUnaGeneracion = await leerEstado(mainWindow);
    assert.equal(trasUnaGeneracion.visible, false,
      `Con una sola generación el botón debe seguir escondido: ${JSON.stringify(trasUnaGeneracion)}`);

    // --- 3. El segundo guardado sí deja copia, y con ella el botón aparece. Esta es la
    // pregunta que decide si la feature existe: sin esto, todo lo demás es código muerto.
    const segunda = path.join(userDataDir, 'segunda.txt');
    fs.writeFileSync(segunda, plantilla('SEGUNDA', ['segunda1', 'segunda2', 'segunda3']), 'utf8');
    await importar(mainWindow, segunda);
    assert.ok(fs.existsSync(backupFile), `El segundo guardado tiene que dejar copia: ${backupFile}`);
    const copia = cuentasEnDisco();
    await abrirModal(mainWindow);
    const conCopia = await leerEstado(mainWindow);
    assert.equal(conCopia.visible, true,
      `Con una copia anterior distinta el botón debe verse: ${JSON.stringify(conCopia)}`);
    assert.match(conCopia.texto, /Restaurar copia anterior/, 'El botón tiene que decir qué hace.');
    assert.equal(conCopia.desvincularVisible, true, 'Con archivo vinculado los dos botones coexisten.');
    assert.equal(conCopia.filas.length, 3, `Las filas del modal son las de la generación actual: ${JSON.stringify(conCopia.filas)}`);

    // --- 4. Cancelar no toca nada. Restaurar sustituye el estado bueno por el anterior,
    // así que equivocar el clic tiene que ser reversible por no pulsar.
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__backup.avisos.length = 0;
      window.__backup.aceptar = false;
      document.querySelector('#restoreAccountsButton').click();
      return true;
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const cancelando = await leerEstado(mainWindow);
    assert.equal(cancelando.avisos.length, 1, `Pulsar restaurar tiene que pedir confirmación: ${JSON.stringify(cancelando)}`);
    assert.match(cancelando.avisos[0], /Restaurar la copia anterior/, 'El aviso nombra la acción.');
    assert.match(cancelando.avisos[0], /contrase/i, 'El aviso dice lo que se puede perder: las contraseñas guardadas.');
    assert.equal(cancelando.filas.length, 3, 'Cancelar no puede cambiar las cuentas del formulario.');
    assert.equal(JSON.stringify(cuentasEnDisco()), JSON.stringify(copia), 'Cancelar no puede tocar accounts.enc.');

    // --- 5. Aceptar sí restaura, y lo hace de verdad en el disco. Se mira el archivo
    // cifrado, no solo lo que dice el mensaje: un mensaje de éxito sobre un accounts.enc
    // intacto sería la misma feature muerta de otra forma.
    await mainWindow.webContents.executeJavaScript(`(() => {
      window.__backup.avisos.length = 0;
      window.__backup.aceptar = true;
      document.querySelector('#restoreAccountsButton').click();
      return true;
    })()`);
    await waitFor(mainWindow, `document.querySelector('#modalMessage')?.textContent?.includes('Copia anterior restaurada')`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const restaurando = await leerEstado(mainWindow);

    const enDisco = cuentasEnDisco();
    assert.equal(enDisco.length, 2, `En el disco tienen que quedar las 2 cuentas de la generación anterior: ${JSON.stringify(enDisco)}`);
    assert.equal(enDisco[0].username, 'primera1', 'La generación restaurada es la anterior, no la actual.');
    assert.equal(enDisco[0].password, 'clave-primera1', 'La contraseña también vuelve: es justo lo que se quiere recuperar.');
    assert.match(restaurando.mensaje, /Copia anterior restaurada/, `El mensaje tiene que decir que se restauró: ${JSON.stringify(restaurando)}`);
    assert.match(restaurando.mensaje, /2 cuentas/, `El mensaje dice cuántas cuentas quedaron: ${JSON.stringify(restaurando)}`);
    assert.equal(restaurando.filas.length, 2, `El formulario tiene que reflejar lo restaurado: ${JSON.stringify(restaurando.filas)}`);
    assert.equal(restaurando.filas[0].usuario, 'primera1', 'La fila restaurada es la buena.');
    assert.equal(restaurando.paneles, 2, `Los paneles tienen que seguir a las cuentas restauradas: ${JSON.stringify(restaurando.paneles)}`);

    // --- 6. Y el botón se esconde solo. La copia coincide ya con el principal, así que
    // un botón visible que solo diría "no hay nada que restaurar" sería peor que uno
    // escondido. Que se esconda sin que nadie lo toque es la parte que no se puede
    // comprobar en el módulo solo.
    assert.equal(restaurando.visible, false,
      `Restaurado, el botón tiene que esconderse solo: ${JSON.stringify(restaurando)}`);

    // --- 7. La segunda pulsación no puede ser un no-op silencioso. Con el botón escondido
    // es difícil de llegar desde la UI, así que se pregunta directamente al proceso
    // principal: tiene que explicar que no hay nada que restaurar.
    const repetido = await mainWindow.webContents.executeJavaScript(`(async () => {
      return await window.pokeGrid.restoreAccountsBackup();
    })()`);
    assert.equal(repetido.ok, false, 'Restaurar dos veces seguidas no puede responder ok.');
    assert.match(repetido.error, /nada que restaurar/, `La segunda restauración lo dice: ${JSON.stringify(repetido)}`);

    // --- 8. Sin copia, el handler lo dice. Un botón siempre visible con esta respuesta
    // detrás sería la feature muerta que el brief proponía; esta aserción la ata al disco.
    fs.rmSync(backupFile, { force: true });
    const sinCopia = await mainWindow.webContents.executeJavaScript(`(async () => {
      return await window.pokeGrid.restoreAccountsBackup();
    })()`);
    assert.equal(sinCopia.ok, false, 'Sin .bak no hay nada que restaurar.');
    assert.match(sinCopia.error, /No hay copia de seguridad/, `Sin copia, el motivo es explícito: ${JSON.stringify(sinCopia)}`);

    // --- 9. El caso que el brief no contemplated: accounts.enc ilegible. El botón sirve
    // también para esto, y sin él el usuario se queda con un mensaje de error sin salida.
    // Se rompe el archivo a propósito desde fuera, sin pasar por el launcher.
    const buena = cuentasEnDisco();
    fs.writeFileSync(backupFile, safeStorage.encryptString(JSON.stringify(buena)));
    fs.writeFileSync(credentialFile, Buffer.from('esto-no-es-un-bloque-valido'));
    const leida = await mainWindow.webContents.executeJavaScript(`(async () => {
      const resultado = await window.pokeGrid.loadAccounts();
      return { ok: resultado.ok, cuentas: (resultado.accounts || []).length, recuperado: Boolean(resultado.recoveredFromBackup), conCopia: Boolean(resultado.hasBackup) };
    })()`);
    assert.equal(leida.ok, true, 'Un principal ilegible tiene que caer al backup, no romper el arranque.');
    assert.equal(leida.recuperado, true, 'La recuperación tiene que avisar: si no, tapa el problema que acaba de tapar.');
    assert.equal(leida.cuentas, 2, 'Las cuentas recuperadas son las de la copia.');

    const rescate = await mainWindow.webContents.executeJavaScript(`(async () => {
      const resultado = await window.pokeGrid.restoreAccountsBackup();
      return resultado;
    })()`);
    assert.equal(rescate.ok, true, 'Con la copia a mano, restaurar un principal ilegible tiene que funcionar.');
    assert.equal(rescate.preservedCorrupt, true, 'El principal roto se conserva como .corrupt antes de sustituirlo.');
    assert.ok(fs.existsSync(`${credentialFile}.corrupt`), 'El archivo dañado tiene que quedar a mano para un rescate manual.');
    const rescatadas = cuentasEnDisco();
    assert.equal(rescatadas.length, 2, 'Tras el rescate el principal es el bueno.');
    assert.equal(rescatadas[0].password, 'clave-primera1', 'Las contraseñas vuelven a estar donde tienen que estar.');

    console.log(JSON.stringify({
      ok: true,
      alPrincipio: { visible: alPrincipio.visible },
      trasUnaGeneracion: { visible: trasUnaGeneracion.visible },
      conCopia: { visible: conCopia.visible, texto: conCopia.texto },
      cancelando: { avisos: cancelando.avisos.length },
      restaurando: { mensaje: restaurando.mensaje, visible: restaurando.visible, paneles: restaurando.paneles },
      leida,
      rescate: { ok: rescate.ok, preservedCorrupt: rescate.preservedCorrupt }
    }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
