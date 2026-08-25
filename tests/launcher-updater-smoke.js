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
assert.match(installer, /La nueva versión debe instalarse directamente en la carpeta de Descargas/);
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
assert.match(html, /id="updateLauncherButton"/);
assert.match(html, /class="update-launcher-version"/);
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

console.log('Launcher updater smoke passed: version comparison, SHA-protected release flow and rollback installer are present.');
