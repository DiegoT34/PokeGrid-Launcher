const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { updaterPowerShell } = require('../src/updater');

if (process.platform !== 'win32') {
  console.log('Launcher updater integration skipped: Windows is required.');
  process.exit(0);
}

const systemRoot = process.env.SystemRoot || 'C:\\Windows';
const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const compilerCandidates = [
  path.join(systemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
  path.join(systemRoot, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
];
const compiler = compilerCandidates.find((candidate) => fs.existsSync(candidate));
assert.ok(compiler, 'No se encontró el compilador de prueba de .NET Framework.');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-updater-integration-'));
const installDir = path.join(root, 'IDLE POKE LAUNCHER');
const targetDir = path.join(root, 'IDLE-POKE-LAUNCHER-99.0.0-portatil');
const updateRoot = path.join(root, 'updates', 'v99.0.0');
const packageDir = path.join(root, 'new-package');
const executableName = 'IDLE POKE LAUNCHER.exe';
const archivePath = path.join(updateRoot, 'update.zip');
const statusPath = path.join(root, 'update-status.json');
let launchedPid = 0;
let oldPid = 0;

try {
  fs.mkdirSync(installDir, { recursive: true });
  fs.mkdirSync(path.join(packageDir, 'resources'), { recursive: true });
  fs.mkdirSync(updateRoot, { recursive: true });
  fs.writeFileSync(path.join(installDir, 'old-version.txt'), 'old');
  fs.writeFileSync(path.join(installDir, 'old-folder-must-be-removed.txt'), 'old');
  fs.writeFileSync(path.join(packageDir, 'new-version.txt'), 'new');
  fs.writeFileSync(path.join(packageDir, 'resources', 'app.asar'), 'smoke');
  fs.writeFileSync(statusPath, JSON.stringify({ state: 'installer-starting', message: 'estado anterior' }), 'utf8');

  const sourcePath = path.join(root, 'UpdaterSmoke.cs');
  fs.writeFileSync(sourcePath, [
    'using System;',
    'using System.Diagnostics;',
    'using System.IO;',
    'using System.Threading;',
    'public static class Program {',
    '  [STAThread] public static void Main() {',
    '    File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launched.ok"), Process.GetCurrentProcess().Id.ToString());',
    '    Thread.Sleep(30000);',
    '  }',
    '}'
  ].join('\r\n'));
  const compile = spawnSync(compiler, ['/nologo', '/target:winexe', `/out:${path.join(packageDir, executableName)}`, sourcePath], { encoding: 'utf8' });
  assert.equal(compile.status, 0, compile.stdout || compile.stderr);

  const oldSourcePath = path.join(root, 'UpdaterOldSmoke.cs');
  fs.writeFileSync(oldSourcePath, [
    'using System;',
    'using System.IO;',
    'using System.Threading;',
    'public static class Program {',
    '  [STAThread] public static void Main() {',
    '    File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "old-running.ok"), "ready");',
    '    Thread.Sleep(30000);',
    '  }',
    '}'
  ].join('\r\n'));
  const compileOld = spawnSync(compiler, ['/nologo', '/target:winexe', `/out:${path.join(installDir, executableName)}`, oldSourcePath], { encoding: 'utf8' });
  assert.equal(compileOld.status, 0, compileOld.stdout || compileOld.stderr);
  const oldProcess = spawn(path.join(installDir, executableName), [], { cwd: installDir, windowsHide: true, stdio: 'ignore' });
  oldPid = oldProcess.pid;
  oldProcess.unref();
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  assert.equal(fs.existsSync(path.join(installDir, 'old-running.ok')), true);

  const archive = spawnSync('tar.exe', ['-a', '-c', '-f', archivePath, '-C', packageDir, '.'], { encoding: 'utf8' });
  assert.equal(archive.status, 0, archive.stdout || archive.stderr);
  const installerPath = path.join(updateRoot, 'install-update.ps1');
  fs.writeFileSync(installerPath, updaterPowerShell(), 'utf8');

  const run = spawnSync(powershell, [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', installerPath,
    '-LauncherPid', String(oldPid),
    '-ArchivePath', archivePath,
    '-InstallDir', installDir,
    '-TargetDir', targetDir,
    '-ExecutableName', executableName,
    '-UpdateRoot', updateRoot,
    '-StatusPath', statusPath,
    '-HealthCheckSeconds', '1',
    '-GracefulWaitSeconds', '1'
  ], { cwd: path.dirname(updateRoot), encoding: 'utf8', timeout: 30000 });
  assert.equal(run.status, 0, run.stdout || run.stderr);
  assert.equal(fs.existsSync(installDir), false);
  assert.equal(fs.existsSync(path.join(targetDir, 'new-version.txt')), true);
  assert.equal(fs.existsSync(path.join(targetDir, 'launched.ok')), true);
  assert.equal(fs.readdirSync(root).some((name) => name.includes('.pokegrid-old-')), false);
  assert.equal(fs.readdirSync(root).some((name) => name.includes('.pokegrid-previous-')), false);
  assert.equal(fs.existsSync(updateRoot), false);

  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8').replace(/^\uFEFF/, ''));
  assert.equal(status.state, 'installed');
  assert.equal(fs.realpathSync.native(status.targetDir), fs.realpathSync.native(targetDir));
  assert.equal(fs.realpathSync.native(status.executablePath), fs.realpathSync.native(path.join(targetDir, executableName)));
  launchedPid = Number(status.newProcessId) || 0;
  assert.ok(launchedPid > 0);
  console.log('Launcher updater integration passed: download staging, extraction, replacement and relaunch work.');
} finally {
  if (oldPid > 0) {
    spawnSync('taskkill.exe', ['/PID', String(oldPid), '/T', '/F'], { windowsHide: true });
  }
  if (launchedPid > 0) {
    spawnSync('taskkill.exe', ['/PID', String(launchedPid), '/T', '/F'], { windowsHide: true });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch {}
}
