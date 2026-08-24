const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
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
const updateRoot = path.join(root, 'updates', 'v99.0.0');
const packageDir = path.join(root, 'new-package');
const executableName = 'IDLE POKE LAUNCHER.exe';
const archivePath = path.join(updateRoot, 'update.zip');
const statusPath = path.join(root, 'update-status.json');
let launchedPid = 0;

try {
  fs.mkdirSync(installDir, { recursive: true });
  fs.mkdirSync(path.join(packageDir, 'resources'), { recursive: true });
  fs.mkdirSync(updateRoot, { recursive: true });
  fs.writeFileSync(path.join(installDir, executableName), 'old executable placeholder');
  fs.writeFileSync(path.join(installDir, 'old-version.txt'), 'old');
  fs.writeFileSync(path.join(installDir, 'user-file-must-survive.txt'), 'preserved');
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

  const archive = spawnSync('tar.exe', ['-a', '-c', '-f', archivePath, '-C', packageDir, '.'], { encoding: 'utf8' });
  assert.equal(archive.status, 0, archive.stdout || archive.stderr);
  const installerPath = path.join(updateRoot, 'install-update.ps1');
  fs.writeFileSync(installerPath, updaterPowerShell(), 'utf8');

  const run = spawnSync(powershell, [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', installerPath,
    '-LauncherPid', '999999',
    '-ArchivePath', archivePath,
    '-InstallDir', installDir,
    '-ExecutableName', executableName,
    '-UpdateRoot', updateRoot,
    '-StatusPath', statusPath,
    '-HealthCheckSeconds', '1'
  ], { cwd: path.dirname(updateRoot), encoding: 'utf8', timeout: 30000 });
  assert.equal(run.status, 0, run.stdout || run.stderr);
  assert.equal(fs.existsSync(path.join(installDir, 'new-version.txt')), true);
  assert.equal(fs.readFileSync(path.join(installDir, 'user-file-must-survive.txt'), 'utf8'), 'preserved');
  assert.equal(fs.existsSync(path.join(installDir, 'launched.ok')), true);
  assert.equal(fs.existsSync(`${installDir}.pokegrid-old`), false);
  assert.equal(fs.readdirSync(installDir).some((name) => name.startsWith('.pokegrid-update-backup-')), false);
  assert.equal(fs.existsSync(updateRoot), false);

  const status = JSON.parse(fs.readFileSync(statusPath, 'utf8').replace(/^\uFEFF/, ''));
  assert.equal(status.state, 'installed');
  launchedPid = Number(status.newProcessId) || 0;
  assert.ok(launchedPid > 0);
  console.log('Launcher updater integration passed: download staging, extraction, replacement and relaunch work.');
} finally {
  if (launchedPid > 0) {
    spawnSync('taskkill.exe', ['/PID', String(launchedPid), '/T', '/F'], { windowsHide: true });
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch {}
}
