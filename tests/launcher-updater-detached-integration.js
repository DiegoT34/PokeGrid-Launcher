const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { launchPreparedUpdate } = require('../src/updater');

if (process.platform !== 'win32') {
  console.log('Launcher detached updater integration skipped: Windows is required.');
  process.exit(0);
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function run() {
  const systemRoot = process.env.SystemRoot || 'C:\\Windows';
  const powershell = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const compiler = [
    path.join(systemRoot, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    path.join(systemRoot, 'Microsoft.NET', 'Framework', 'v4.0.30319', 'csc.exe')
  ].find((candidate) => fs.existsSync(candidate));
  assert.ok(compiler, 'No se encontró el compilador de prueba de .NET Framework.');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-updater-detached-'));
  const installDir = path.join(root, 'IDLE-POKE-LAUNCHER-98.0.0-portatil');
  const downloadsDir = path.join(root, 'Downloads');
  const targetDir = path.join(downloadsDir, 'IDLE-POKE-LAUNCHER-99.0.0-portatil');
  const updateRoot = path.join(root, 'updates', 'v99.0.0');
  const packageDir = path.join(root, 'package');
  const executableName = 'IDLE POKE LAUNCHER.exe';
  const archivePath = path.join(updateRoot, 'update.zip');
  const statusPath = path.join(root, 'update-status.json');
  let oldPid = 0;
  let newPid = 0;

  try {
    fs.mkdirSync(path.join(packageDir, 'resources'), { recursive: true });
    fs.mkdirSync(installDir, { recursive: true });
    fs.mkdirSync(downloadsDir, { recursive: true });
    fs.mkdirSync(updateRoot, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'resources', 'app.asar'), 'new resources');
    fs.writeFileSync(path.join(packageDir, 'new-version.txt'), '99.0.0');
    fs.writeFileSync(path.join(installDir, 'old-version.txt'), '98.0.0');

    const newSource = path.join(root, 'NewLauncher.cs');
    fs.writeFileSync(newSource, [
      'using System;', 'using System.Diagnostics;', 'using System.IO;', 'using System.Threading;',
      'public static class Program {',
      '  [STAThread] public static void Main() {',
      '    string firstAttempt = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "first-launch.failed");',
      '    if (!File.Exists(firstAttempt)) { File.WriteAllText(firstAttempt, "retry required"); return; }',
      '    foreach (string argument in Environment.GetCommandLineArgs()) {',
      '      const string prefix = "--pokegrid-update-handshake=";',
      '      if (!argument.StartsWith(prefix)) continue;',
      '      string handshake = argument.Substring(prefix.Length).Trim(\'"\');',
      '      string executable = Process.GetCurrentProcess().MainModule.FileName.Replace("\\\\", "\\\\\\\\");',
      '      File.WriteAllText(handshake, "{\\"processId\\":" + Process.GetCurrentProcess().Id + ",\\"executablePath\\":\\"" + executable + "\\"}");',
      '    }',
      '    File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launched.ok"), Process.GetCurrentProcess().Id.ToString());',
      '    Thread.Sleep(30000);',
      '  }',
      '}'
    ].join('\r\n'));
    const newCompile = spawnSync(compiler, ['/nologo', '/target:winexe', `/out:${path.join(packageDir, executableName)}`, newSource], { encoding: 'utf8' });
    assert.equal(newCompile.status, 0, newCompile.stdout || newCompile.stderr);

    const oldSource = path.join(root, 'OldLauncher.cs');
    fs.writeFileSync(oldSource, [
      'using System;', 'using System.IO;', 'using System.Threading;',
      'public static class Program {',
      '  [STAThread] public static void Main() {',
      '    File.WriteAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "running.ok"), "ready");',
      '    Thread.Sleep(30000);',
      '  }',
      '}'
    ].join('\r\n'));
    const oldCompile = spawnSync(compiler, ['/nologo', '/target:winexe', `/out:${path.join(installDir, executableName)}`, oldSource], { encoding: 'utf8' });
    assert.equal(oldCompile.status, 0, oldCompile.stdout || oldCompile.stderr);

    const archive = spawnSync('tar.exe', ['-a', '-c', '-f', archivePath, '-C', packageDir, '.'], { encoding: 'utf8' });
    assert.equal(archive.status, 0, archive.stdout || archive.stderr);
    const oldProcess = spawn(path.join(installDir, executableName), [], { cwd: installDir, windowsHide: true, stdio: 'ignore' });
    oldPid = oldProcess.pid;
    oldProcess.unref();
    await wait(500);
    assert.equal(fs.existsSync(path.join(installDir, 'running.ok')), true);

    let result;
    try {
      const driverPath = path.join(root, 'launch-driver.js');
      fs.writeFileSync(driverPath, [
        `const { launchPreparedUpdate } = require(${JSON.stringify(require.resolve('../src/updater'))});`,
        '(async () => {',
        `  const result = await launchPreparedUpdate({`,
        `    app: { isPackaged: true, getVersion: () => '98.0.0' },`,
        `    prepared: ${JSON.stringify({ latestVersion: '99.0.0', archivePath, updateRoot, statusPath })},`,
        `    runtime: ${JSON.stringify({ installDir, downloadsDir, executableName, launcherPid: oldPid, powershell, healthCheckSeconds: 5, gracefulWaitSeconds: 1 })}`,
        '  });',
        '  console.log(JSON.stringify(result));',
        '  process.exit(0);',
        '})().catch((error) => { console.error(error.stack || error); process.exit(1); });'
      ].join('\r\n'));
      const driver = spawnSync(process.execPath, [driverPath], { encoding: 'utf8', timeout: 20_000 });
      assert.equal(driver.status, 0, driver.stderr || driver.stdout);
      result = JSON.parse(driver.stdout.trim().split(/\r?\n/).at(-1));
    } catch (error) {
      let statusText = '';
      let logText = '';
      try { statusText = fs.readFileSync(statusPath, 'utf8'); } catch {}
      try { logText = fs.readFileSync(path.join(updateRoot, 'install-update.log'), 'utf8'); } catch {}
      throw new Error(`${error.message}\nSTATUS: ${statusText}\nLOG: ${logText}`);
    }
    assert.equal(path.resolve(result.targetDir).toLowerCase(), path.resolve(targetDir).toLowerCase());

    const deadline = Date.now() + 30_000;
    let status = null;
    while (Date.now() < deadline) {
      try { status = JSON.parse(fs.readFileSync(statusPath, 'utf8').replace(/^\uFEFF/, '')); } catch {}
      if (status?.state === 'installed' || status?.state === 'failed') break;
      await wait(200);
    }
    if (status?.state === 'failed') {
      let log = '';
      try { log = fs.readFileSync(result.logPath, 'utf8'); } catch {}
      throw new Error(`${status.message || 'Instalación fallida'}\n${log}`);
    }
    assert.equal(status?.state, 'installed');
    assert.equal(fs.existsSync(installDir), false);
    assert.equal(fs.existsSync(path.join(targetDir, 'first-launch.failed')), true);
    assert.equal(fs.existsSync(path.join(targetDir, 'launched.ok')), true);
    assert.equal(fs.readFileSync(path.join(targetDir, 'new-version.txt'), 'utf8'), '99.0.0');
    newPid = Number(status.newProcessId) || 0;
    assert.ok(newPid > 0);
    console.log('Launcher detached updater integration passed: Downloads target, failed-first-launch retry, handshake, cleanup and relaunch work.');
  } finally {
    if (oldPid > 0) spawnSync('taskkill.exe', ['/PID', String(oldPid), '/T', '/F'], { windowsHide: true });
    if (newPid > 0) spawnSync('taskkill.exe', ['/PID', String(newPid), '/T', '/F'], { windowsHide: true });
    await wait(500);
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch {}
  }
}

run().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
