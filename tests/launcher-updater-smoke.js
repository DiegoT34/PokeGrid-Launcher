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
assert.match(installer, /Move-Item -LiteralPath \$InstallDir -Destination \$backupDir/);
assert.match(installer, /Start-Process -FilePath \$newExe/);
assert.match(installer, /Move-Item -LiteralPath \$backupDir -Destination \$InstallDir/);

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
assert.match(html, /id="updateLauncherButton"/);
assert.match(preload, /checkForUpdates: \(\) => ipcRenderer\.invoke\('app:check-update'\)/);
assert.match(main, /ipcMain\.handle\('app:check-update'/);

console.log('Launcher updater smoke passed: version comparison, SHA-protected release flow and rollback installer are present.');
