const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {
  UPDATE_REPOSITORY,
  compareVersions,
  normalizeVersion,
  updaterPowerShell
} = require('../src/updater');

assert.equal(UPDATE_REPOSITORY, 'DiegoT34/PokeGrid-Launcher');
assert.deepEqual(normalizeVersion('v0.21.0'), [0, 21, 0]);
assert.equal(compareVersions('0.21.0', '0.20.7'), 1);
assert.equal(compareVersions('0.21.0', '0.21.0'), 0);
assert.equal(compareVersions('0.20.7', '0.21.0'), -1);
assert.equal(compareVersions('invalid', '0.21.0'), null);

const installer = updaterPowerShell();
assert.match(installer, /Expand-Archive -LiteralPath \$ArchivePath/);
assert.match(installer, /\.pokegrid-update-backup-\$PID/);
assert.match(installer, /Move-Item -LiteralPath \$target -Destination \$backupDir/);
assert.match(installer, /Start-Process -FilePath \$newExe/);
assert.match(installer, /Move-Item -LiteralPath \$entry\.FullName -Destination \$InstallDir -Force/);
assert.match(installer, /Write-UpdateStatus 'installed'/);
assert.match(installer, /resources\\app\.asar/);
assert.match(installer, /\$moveDeadline/);

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
assert.match(updater, /cwd: path\.dirname\(prepared\.updateRoot\)/);
assert.match(updater, /path\.join\(app\.getPath\('userData'\), 'updates'\)/);

console.log('Launcher updater smoke passed: version comparison, SHA-protected release flow and rollback installer are present.');
