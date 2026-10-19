const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {
  UPDATE_REPOSITORY,
  compareVersions,
  normalizeVersion,
  safePortableDirectoryName,
  persistVerifiedRelease,
  carpetaDeDescargaDeActualizaciones,
  updaterPowerShell
} = require('../src/updater');

assert.equal(UPDATE_REPOSITORY, 'DiegoT34/PokeGrid-Launcher');
assert.deepEqual(normalizeVersion('v0.21.0'), [0, 21, 0]);
assert.equal(compareVersions('0.21.0', '0.20.7'), 1);
assert.equal(compareVersions('0.21.0', '0.21.0'), 0);
assert.equal(compareVersions('0.20.7', '0.21.0'), -1);
assert.equal(compareVersions('invalid', '0.21.0'), null);
assert.equal(safePortableDirectoryName('v0.22.7'), 'IDLE-POKE-LAUNCHER-0.22.7-portatil');

const installer = updaterPowerShell();
assert.match(installer, /Expand-Archive -LiteralPath \$ArchivePath/);
assert.match(installer, /\.pokegrid-old-\$PID/);
assert.match(installer, /Get-OldLauncherProcesses/);
assert.match(installer, /Stop-Process -Id \$process\.ProcessId -Force/);
assert.match(installer, /Start-Process -FilePath \$newExe/);
assert.match(installer, /pokegrid-update-handshake/);
assert.match(installer, /for \(\$attempt = 1; \$attempt -le 3/);
assert.match(installer, /La nueva versión debe desplegarse en la carpeta de destino/);
assert.match(installer, /Move-Item -LiteralPath \$entry\.FullName -Destination \$targetDir/);
assert.match(installer, /Move-Item -LiteralPath \$InstallDir -Destination \$oldBackupDir/);
assert.match(installer, /Write-UpdateStatus 'installed'/);
assert.match(installer, /\[IO\.File\]::Replace\(\$temporaryStatus, \$StatusPath, \$null\)/);
assert.match(installer, /resources\\app\.asar/);
assert.match(installer, /Remove-DirectoryWithRetry \$oldBackupDir/);

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const updater = fs.readFileSync(path.join(root, 'src', 'updater.js'), 'utf8');
// El boton de actualizar salio del menu en la 0.39.0. Comprueba que NO esta —que si vuelve a salir
// sin querer, esta prueba se lo dice— y que en Configuraciones estan los dos que lo sustituyen:
// uno para mirar y otro para descargar, que es la separacion que se pedia.
assert.doesNotMatch(html, /id="updateLauncherButton"/,
  'el boton de actualizar no debe volver al menu');
assert.doesNotMatch(html, /class="update-launcher-version"/);
assert.match(html, /id="checkUpdatesButton"/);
assert.match(html, /id="downloadUpdateButton"/);
assert.match(html, /id="updateStatusText"/);
assert.match(html, /id="downloadUpdateButton"[^>]*disabled/);
assert.match(preload, /getAppVersion: \(\) => ipcRenderer\.invoke\('app:version'\)/);
assert.match(preload, /checkForUpdates: \(\) => ipcRenderer\.invoke\('app:check-update'\)/);
assert.match(main, /ipcMain\.handle\('app:version'/);
assert.match(main, /ipcMain\.handle\('app:check-update'/);
assert.match(main, /await launchPreparedUpdate/);
assert.match(main, /app\.exit\(0\)/);
assert.match(updater, /cwd: path\.dirname\(prepared\.updateRoot\)/);
assert.match(updater, /path\.join\(app\.getPath\('userData'\), 'updates'\)/);
assert.match(updater, /app\.getPath\('downloads'\)/);
assert.match(updater, /savedArchivePath/);
assert.match(updater, /start-update\.ps1/);
assert.match(updater, /install-update\.error\.log/);
assert.match(updater, /Start-Process -FilePath/);

const persistenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-updater-downloads-'));
try {
  const stage = path.join(persistenceRoot, 'stage');
  const downloads = path.join(persistenceRoot, 'Downloads');
  fs.mkdirSync(stage, { recursive: true });
  const archivePath = path.join(stage, 'update.zip');
  const checksumPath = `${archivePath}.sha256`;
  fs.writeFileSync(archivePath, 'verified archive');
  fs.writeFileSync(checksumPath, `${'a'.repeat(64)}  update.zip`);
  const persisted = persistVerifiedRelease({
    app: { getPath: (name) => name === 'downloads' ? downloads : persistenceRoot },
    archivePath,
    checksumPath,
    archiveName: 'IDLE-POKE-LAUNCHER-99.0.0-portatil.zip'
  });
  assert.equal(path.dirname(persisted.savedArchivePath), downloads);
  assert.equal(fs.readFileSync(persisted.savedArchivePath, 'utf8'), 'verified archive');
  assert.equal(fs.existsSync(persisted.savedChecksumPath), true);
} finally {
  fs.rmSync(persistenceRoot, { recursive: true, force: true });
}

// DONDE CAE LA ACTUALIZACION.
//
// Lo pedido: una carpeta mas FUERA de la del launcher, no la de Descargas de Windows. Con el launcher
// en `D:\Juegos\PokeGrid-Launcher\`, la actualizacion tiene que aparecer en `D:\Juegos\`.
//
// Y los tres casos en los que NO se cumple, que son los que hacen que esto no sea un cambio de una
// linea sino un sitio donde pensar:
//   - sin empaquetar (desarrollo), el ejecutable esta dentro de `node_modules` y ahi no se deja un ZIP;
//   - la carpeta de al lado no existe;
//   - la carpeta de al lado no se puede escribir.
// En los tres se cae en Descargas, que es lo de antes. Un fallo al elegir carpeta tiene que acabar
// descargando, no rompiendo el launcher.
{
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-actualizacion-destino-'));
  try {
    const carpetaDelLauncher = path.join(raiz, 'Juegos', 'PokeGrid-Launcher');
    fs.mkdirSync(carpetaDelLauncher, { recursive: true });
    const ejecutable = path.join(carpetaDelLauncher, 'Poke Idle World.exe');
    fs.writeFileSync(ejecutable, '');
    const descargas = path.join(raiz, 'Descargas');
    fs.mkdirSync(descargas, { recursive: true });
    const appDe = (exe, empaquetado) => ({
      isPackaged: empaquetado,
      getPath: (name) => (name === 'exe' ? exe : name === 'downloads' ? descargas : raiz)
    });

    const fueraDeAqui = carpetaDeDescargaDeActualizaciones(appDe(ejecutable, true));
    assert.equal(fueraDeAqui, path.join(raiz, 'Juegos'),
      `la actualizacion debe ir una carpeta mas fuera: ${fueraDeAqui}`);

    assert.equal(carpetaDeDescargaDeActualizaciones(appDe(ejecutable, false)), descargas,
      'sin empaquetar se sigue usando Descargas, no el interior de node_modules');

    const sinCarpeta = path.join(raiz, 'NoExiste', 'PokeGrid-Launcher', 'ejecutable.exe');
    assert.equal(carpetaDeDescargaDeActualizaciones(appDe(sinCarpeta, true)), descargas,
      'si la carpeta de al lado no existe se cae en Descargas');

    // Y el ZIP acaba de verdad en esa carpeta, no solo se devuelve el nombre.
    const stage = path.join(raiz, 'stage');
    fs.mkdirSync(stage, { recursive: true });
    const archivePath = path.join(stage, 'update.zip');
    const checksumPath = `${archivePath}.sha256`;
    fs.writeFileSync(archivePath, 'zip fuera de descargas');
    fs.writeFileSync(checksumPath, `${'b'.repeat(64)}  update.zip`);
    const guardado = persistVerifiedRelease({
      app: appDe(ejecutable, true),
      archivePath,
      checksumPath,
      archiveName: 'IDLE-POKE-LAUNCHER-99.0.0-portatil.zip'
    });
    assert.equal(path.dirname(guardado.savedArchivePath), path.join(raiz, 'Juegos'));
    assert.equal(fs.existsSync(path.join(raiz, 'Descargas', 'IDLE-POKE-LAUNCHER-99.0.0-portatil.zip')), false,
      'y en Descargas no debe quedar nada');
  } finally {
    fs.rmSync(raiz, { recursive: true, force: true });
  }
}

console.log('Launcher updater smoke passed: version comparison, SHA-protected release flow and rollback installer are present.');
