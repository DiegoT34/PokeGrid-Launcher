const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');

const UPDATE_REPOSITORY = 'DiegoT34/PokeGrid-Launcher';
const UPDATE_API_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
const UPDATE_MAX_BYTES = 1024 * 1024 * 1024;
const UPDATE_STATUS_FILE = 'update-status.json';

function updateStatusPath(app) {
  return path.join(app.getPath('userData'), UPDATE_STATUS_FILE);
}

function writeUpdateStatus(file, value) {
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify({ ...value, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function normalizeVersion(value) {
  const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i);
  if (!match) return null;
  return match.slice(1).map(Number);
}

function compareVersions(left, right) {
  const a = normalizeVersion(left);
  const b = normalizeVersion(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function safeAssetName(version) {
  if (!normalizeVersion(version)) throw new Error('La versión publicada no tiene un formato válido.');
  return `IDLE-POKE-LAUNCHER-${String(version).replace(/^v/i, '')}-portatil.zip`;
}

function safePortableDirectoryName(version) {
  if (!normalizeVersion(version)) throw new Error('La versión publicada no tiene un formato válido.');
  return `IDLE-POKE-LAUNCHER-${String(version).replace(/^v/i, '')}-portatil`;
}

function assertGitHubDownloadUrl(rawUrl) {
  const url = new URL(String(rawUrl || ''));
  if (url.protocol !== 'https:' || url.username || url.password || url.hostname !== 'github.com') {
    throw new Error('GitHub devolvió una dirección de descarga no permitida.');
  }
  return url.href;
}

async function fetchChecked(net, url, options = {}) {
  const response = await net.fetch(url, {
    redirect: 'follow',
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'PokeGrid-Launcher-Updater',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`GitHub no respondió correctamente (HTTP ${response.status}).`);
  return response;
}

async function readLatestRelease(net, currentVersion) {
  const response = await fetchChecked(net, UPDATE_API_URL, { cache: 'no-store' });
  const release = await response.json();
  const latestVersion = String(release?.tag_name || '').replace(/^v/i, '');
  const comparison = compareVersions(latestVersion, currentVersion);
  if (comparison === null) throw new Error('La versión publicada en GitHub no es válida.');
  if (release?.draft || release?.prerelease) throw new Error('La última publicación estable no está disponible.');
  if (comparison <= 0) {
    return { status: 'current', currentVersion, latestVersion, releaseUrl: release?.html_url || '' };
  }

  const archiveName = safeAssetName(latestVersion);
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const archive = assets.find((asset) => asset?.name === archiveName);
  const checksum = assets.find((asset) => asset?.name === `${archiveName}.sha256`);
  if (!archive || !checksum) throw new Error('La Release no contiene el ZIP portátil y su firma SHA-256.');
  if (Number(archive.size) <= 0 || Number(archive.size) > UPDATE_MAX_BYTES) {
    throw new Error('El tamaño del paquete de actualización no es válido.');
  }
  return {
    status: 'available', currentVersion, latestVersion,
    releaseUrl: release?.html_url || '',
    archive: { name: archive.name, size: Number(archive.size), url: assertGitHubDownloadUrl(archive.browser_download_url) },
    checksum: { name: checksum.name, url: assertGitHubDownloadUrl(checksum.browser_download_url) }
  };
}

async function downloadFile(net, url, destination, expectedBytes, onProgress) {
  const response = await fetchChecked(net, url, { headers: { Accept: 'application/octet-stream' } });
  const advertisedBytes = Number(response.headers.get('content-length')) || expectedBytes || 0;
  if (advertisedBytes > UPDATE_MAX_BYTES) throw new Error('La descarga supera el límite de seguridad.');
  let receivedBytes = 0;
  const meter = new TransformStream({
    transform(chunk, controller) {
      receivedBytes += chunk.byteLength;
      if (receivedBytes > UPDATE_MAX_BYTES) throw new Error('La descarga supera el límite de seguridad.');
      onProgress?.({ receivedBytes, totalBytes: advertisedBytes || expectedBytes || 0 });
      controller.enqueue(chunk);
    }
  });
  await pipeline(Readable.fromWeb(response.body.pipeThrough(meter)), fs.createWriteStream(destination, { flags: 'wx' }));
  if (expectedBytes && receivedBytes !== expectedBytes) throw new Error('La descarga quedó incompleta.');
  return receivedBytes;
}

async function sha256File(file) {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

async function prepareUpdate({ app, net, currentVersion, onProgress }) {
  if (process.platform !== 'win32') throw new Error('La actualización automática está disponible para Windows.');
  const release = await readLatestRelease(net, currentVersion);
  if (release.status !== 'available') return release;

  const updatesDirectory = path.join(app.getPath('userData'), 'updates');
  const updateRoot = path.join(updatesDirectory, `v${release.latestVersion}-${Date.now()}`);
  fs.mkdirSync(updateRoot, { recursive: true });
  const archivePath = path.join(updateRoot, release.archive.name);
  const checksumPath = `${archivePath}.sha256`;
  const statusPath = updateStatusPath(app);
  try {
    writeUpdateStatus(statusPath, {
      state: 'downloading',
      currentVersion,
      latestVersion: release.latestVersion,
      archivePath
    });
    onProgress?.({ phase: 'download', percent: 0, version: release.latestVersion });
    await downloadFile(net, release.archive.url, archivePath, release.archive.size, ({ receivedBytes, totalBytes }) => {
      const percent = totalBytes ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 0;
      onProgress?.({ phase: 'download', percent, receivedBytes, totalBytes, version: release.latestVersion });
    });
    await downloadFile(net, release.checksum.url, checksumPath, 0);
    const checksumText = fs.readFileSync(checksumPath, 'utf8');
    const expectedHash = checksumText.match(/\b[a-f0-9]{64}\b/i)?.[0]?.toLowerCase();
    if (!expectedHash) throw new Error('La firma SHA-256 publicada no es válida.');
    onProgress?.({ phase: 'verify', percent: 100, version: release.latestVersion });
    const actualHash = await sha256File(archivePath);
    if (actualHash !== expectedHash) throw new Error('La firma SHA-256 no coincide; la actualización fue descartada.');
    writeUpdateStatus(statusPath, {
      state: 'ready',
      currentVersion,
      latestVersion: release.latestVersion,
      archivePath,
      sha256: actualHash
    });
    return { ...release, status: 'ready', archivePath, updateRoot, statusPath, sha256: actualHash };
  } catch (error) {
    writeUpdateStatus(statusPath, {
      state: 'download-failed',
      currentVersion,
      latestVersion: release.latestVersion,
      archivePath,
      error: error.message || String(error)
    });
    throw error;
  }
}

function updaterPowerShell() {
  return String.raw`param(
  [string]$ConfigPath = '',
  [int]$LauncherPid = 0,
  [string]$ArchivePath = '',
  [string]$InstallDir = '',
  [string]$TargetDir = '',
  [string]$ExecutableName = '',
  [string]$UpdateRoot = '',
  [string]$StatusPath = '',
  [int]$HealthCheckSeconds = 8,
  [int]$GracefulWaitSeconds = 8
)
$ErrorActionPreference = 'Stop'
if ($ConfigPath) {
  $configuration = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $LauncherPid = [int]$configuration.LauncherPid
  $ArchivePath = [string]$configuration.ArchivePath
  $InstallDir = [string]$configuration.InstallDir
  $TargetDir = [string]$configuration.TargetDir
  $ExecutableName = [string]$configuration.ExecutableName
  $UpdateRoot = [string]$configuration.UpdateRoot
  $StatusPath = [string]$configuration.StatusPath
  $HealthCheckSeconds = [int]$configuration.HealthCheckSeconds
  $GracefulWaitSeconds = [int]$configuration.GracefulWaitSeconds
}
if ($LauncherPid -le 0 -or -not $ArchivePath -or -not $InstallDir -or -not $TargetDir -or -not $ExecutableName -or -not $UpdateRoot -or -not $StatusPath) {
  throw 'La configuración del instalador está incompleta.'
}
$InstallDir = [IO.Path]::GetFullPath($InstallDir)
$TargetDir = [IO.Path]::GetFullPath($TargetDir)
$UpdateRoot = [IO.Path]::GetFullPath($UpdateRoot)
$ArchivePath = [IO.Path]::GetFullPath($ArchivePath)
$StatusPath = [IO.Path]::GetFullPath($StatusPath)
if ([IO.Path]::GetPathRoot($InstallDir) -eq $InstallDir) { throw 'Ruta de instalación demasiado amplia.' }
if ([IO.Path]::GetPathRoot($TargetDir) -eq $TargetDir) { throw 'Ruta de destino demasiado amplia.' }
if ((Split-Path -Parent $InstallDir) -ine (Split-Path -Parent $TargetDir)) { throw 'La nueva versión debe instalarse junto a la anterior.' }
if ($InstallDir -ieq $TargetDir) { throw 'La carpeta nueva coincide con la versión anterior.' }
if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'No se encontró el paquete descargado.' }
$oldExe = Join-Path $InstallDir $ExecutableName
if (-not (Test-Path -LiteralPath $oldExe -PathType Leaf)) { throw 'No se encontró el ejecutable instalado.' }

function Write-UpdateStatus([string]$State, [string]$Message = '', [hashtable]$Extra = @{}) {
  $payload = [ordered]@{
    state = $State
    message = $Message
    archivePath = $ArchivePath
    installDir = $InstallDir
    targetDir = $TargetDir
    updatedAt = [DateTime]::UtcNow.ToString('o')
  }
  foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
  $statusDirectory = Split-Path -Parent $StatusPath
  New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
  $temporaryStatus = "$StatusPath.$PID.tmp"
  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $temporaryStatus -Encoding UTF8
  if (Test-Path -LiteralPath $StatusPath -PathType Leaf) {
    try {
      [IO.File]::Replace($temporaryStatus, $StatusPath, $null)
    } catch {
      Remove-Item -LiteralPath $StatusPath -Force -ErrorAction SilentlyContinue
      Move-Item -LiteralPath $temporaryStatus -Destination $StatusPath -Force
    }
  } else {
    Move-Item -LiteralPath $temporaryStatus -Destination $StatusPath
  }
}

$stageDir = Join-Path $UpdateRoot 'extracted'
$oldBackupDir = "$InstallDir.pokegrid-old-$PID"
$targetBackupDir = "$TargetDir.pokegrid-previous-$PID"
$newProcess = $null
$oldWasMoved = $false
$targetWasMoved = $false

function Get-OldLauncherProcesses {
  $escapedName = $ExecutableName.Replace("'", "''")
  return @(Get-CimInstance Win32_Process -Filter "Name='$escapedName'" -ErrorAction SilentlyContinue | Where-Object {
    if (-not $_.ExecutablePath) { return $false }
    try { return ([IO.Path]::GetFullPath($_.ExecutablePath) -ieq $oldExe) } catch { return $false }
  })
}

function Remove-DirectoryWithRetry([string]$Directory, [int]$Seconds = 60) {
  $deadline = [DateTime]::UtcNow.AddSeconds([Math]::Max(1, $Seconds))
  while (Test-Path -LiteralPath $Directory) {
    try { Remove-Item -LiteralPath $Directory -Recurse -Force -ErrorAction Stop } catch {
      if ([DateTime]::UtcNow -ge $deadline) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
}
try {
  Write-UpdateStatus 'extracting' 'Descomprimiendo la nueva versión.'
  if (Test-Path -LiteralPath $stageDir) { Remove-Item -LiteralPath $stageDir -Recurse -Force }
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $stageDir -Force
  $packageDir = $stageDir
  $stagedExe = Join-Path $packageDir $ExecutableName
  if (-not (Test-Path -LiteralPath $stagedExe -PathType Leaf)) {
    $candidate = Get-ChildItem -LiteralPath $stageDir -Filter $ExecutableName -File -Recurse | Select-Object -First 1
    if ($candidate) {
      $packageDir = $candidate.Directory.FullName
      $stagedExe = $candidate.FullName
    }
  }
  if (-not (Test-Path -LiteralPath $stagedExe -PathType Leaf)) { throw 'El ZIP no contiene el ejecutable esperado.' }
  if (-not (Test-Path -LiteralPath (Join-Path $packageDir 'resources\app.asar') -PathType Leaf)) {
    throw 'El paquete extraído no contiene los recursos del launcher.'
  }

  Write-UpdateStatus 'waiting' 'Esperando que la versión anterior se cierre.'
  $deadline = [DateTime]::UtcNow.AddSeconds([Math]::Max(1, $GracefulWaitSeconds))
  while ([DateTime]::UtcNow -lt $deadline) {
    if (-not (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 250
  }
  if (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue) {
    Write-UpdateStatus 'closing' 'Cerrando los procesos de la versión anterior.'
    foreach ($process in @(Get-OldLauncherProcesses)) {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }
  $closeDeadline = [DateTime]::UtcNow.AddSeconds(20)
  while ([DateTime]::UtcNow -lt $closeDeadline -and @(Get-OldLauncherProcesses).Count) {
    Start-Sleep -Milliseconds 250
  }
  if (@(Get-OldLauncherProcesses).Count) { throw 'No fue posible cerrar por completo la versión anterior.' }

  Write-UpdateStatus 'installing' 'Instalando la nueva versión en una carpeta independiente.'
  if (Test-Path -LiteralPath $targetBackupDir) { Remove-DirectoryWithRetry $targetBackupDir 20 }
  if (Test-Path -LiteralPath $targetDir) {
    Move-Item -LiteralPath $targetDir -Destination $targetBackupDir -ErrorAction Stop
    $targetWasMoved = $true
  }
  New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
  $packageEntries = @(Get-ChildItem -LiteralPath $packageDir -Force)
  if (-not $packageEntries.Count) { throw 'El paquete extraído está vacío.' }
  foreach ($entry in $packageEntries) {
    Move-Item -LiteralPath $entry.FullName -Destination $targetDir -ErrorAction Stop
  }
  $newExe = Join-Path $TargetDir $ExecutableName
  Write-UpdateStatus 'launching' 'Abriendo la nueva versión.'
  $newProcess = Start-Process -FilePath $newExe -WorkingDirectory $TargetDir -PassThru
  Start-Sleep -Seconds ([Math]::Max(1, $HealthCheckSeconds))
  if ($newProcess.HasExited) { throw 'La nueva versión no pudo mantenerse abierta.' }

  Write-UpdateStatus 'cleanup' 'Eliminando la carpeta de la versión anterior.' @{ newProcessId = $newProcess.Id }
  if (Test-Path -LiteralPath $oldBackupDir) { Remove-DirectoryWithRetry $oldBackupDir 20 }
  Move-Item -LiteralPath $InstallDir -Destination $oldBackupDir -ErrorAction Stop
  $oldWasMoved = $true
  Remove-DirectoryWithRetry $oldBackupDir 60
  $oldWasMoved = $false
  if ($targetWasMoved -and (Test-Path -LiteralPath $targetBackupDir)) {
    Remove-DirectoryWithRetry $targetBackupDir 30
    $targetWasMoved = $false
  }
  Write-UpdateStatus 'installed' 'La actualización se instaló, abrió y eliminó la versión anterior.' @{ newProcessId = $newProcess.Id; executablePath = $newExe }
  Start-Sleep -Seconds 1
  if (Test-Path -LiteralPath $UpdateRoot) { Remove-Item -LiteralPath $UpdateRoot -Recurse -Force }
} catch {
  $failure = $_.Exception.Message
  try {
    if ($newProcess -and -not $newProcess.HasExited) {
      Stop-Process -Id $newProcess.Id -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
    if (Test-Path -LiteralPath $TargetDir) { Remove-DirectoryWithRetry $TargetDir 30 }
    if ($targetWasMoved -and (Test-Path -LiteralPath $targetBackupDir)) {
      Move-Item -LiteralPath $targetBackupDir -Destination $TargetDir -Force
    }
    if ($oldWasMoved -and (Test-Path -LiteralPath $oldBackupDir) -and -not (Test-Path -LiteralPath $InstallDir)) {
      Move-Item -LiteralPath $oldBackupDir -Destination $InstallDir -Force
    }
    if (Test-Path -LiteralPath $oldExe -PathType Leaf) {
      $rollbackDeadline = [DateTime]::UtcNow.AddSeconds(15)
      while ([DateTime]::UtcNow -lt $rollbackDeadline -and (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue)) {
        Start-Sleep -Milliseconds 250
      }
      if (-not (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue)) {
        Start-Process -FilePath $oldExe -WorkingDirectory $InstallDir
      }
    }
  } catch {
    $failure = "$failure Reversión: $($_.Exception.Message)"
  }
  Write-UpdateStatus 'failed' $failure
  exit 1
}`;
}

function powerShellLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function launchPreparedUpdate({ app, prepared, runtime = {} }) {
  if (!app.isPackaged) throw new Error('El reemplazo automático solo se ejecuta desde la versión portátil empaquetada.');
  const installDir = path.resolve(runtime.installDir || path.dirname(process.execPath));
  const targetDir = path.join(path.dirname(installDir), safePortableDirectoryName(prepared.latestVersion));
  const executableName = runtime.executableName || path.basename(process.execPath);
  const scriptPath = path.join(prepared.updateRoot, 'install-update.ps1');
  const bootstrapPath = path.join(prepared.updateRoot, 'start-update.ps1');
  const configPath = path.join(prepared.updateRoot, 'install-update.json');
  const logPath = path.join(prepared.updateRoot, 'start-update.log');
  const installerOutputPath = path.join(prepared.updateRoot, 'install-update.out.log');
  const installerErrorPath = path.join(prepared.updateRoot, 'install-update.error.log');
  fs.writeFileSync(scriptPath, updaterPowerShell(), 'utf8');
  const powershell = runtime.powershell || path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  if (!fs.existsSync(powershell)) throw new Error('No se encontró Windows PowerShell para instalar la actualización.');
  fs.writeFileSync(configPath, JSON.stringify({
    LauncherPid: runtime.launcherPid || process.pid,
    ArchivePath: prepared.archivePath,
    InstallDir: installDir,
    TargetDir: targetDir,
    ExecutableName: executableName,
    UpdateRoot: prepared.updateRoot,
    StatusPath: prepared.statusPath,
    HealthCheckSeconds: runtime.healthCheckSeconds || 8,
    GracefulWaitSeconds: runtime.gracefulWaitSeconds || 8
  }, null, 2), 'utf8');
  const installerArgumentLine = [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', `"${scriptPath}"`, '-ConfigPath', `"${configPath}"`
  ].join(' ');
  fs.writeFileSync(bootstrapPath, String.raw`$ErrorActionPreference = 'Stop'
$installer = Start-Process -FilePath ${powerShellLiteral(powershell)} -ArgumentList ${powerShellLiteral(installerArgumentLine)} -WindowStyle Hidden -RedirectStandardOutput ${powerShellLiteral(installerOutputPath)} -RedirectStandardError ${powerShellLiteral(installerErrorPath)} -PassThru
[IO.File]::WriteAllText(${powerShellLiteral(path.join(prepared.updateRoot, 'installer.pid'))}, [string]$installer.Id)
`, 'utf8');
  writeUpdateStatus(prepared.statusPath, {
    state: 'installer-starting',
    currentVersion: app.getVersion(),
    latestVersion: prepared.latestVersion,
    archivePath: prepared.archivePath,
    installDir,
    targetDir,
    logPath,
    installerOutputPath,
    installerErrorPath
  });
  const logHandle = fs.openSync(logPath, 'a');
  const child = spawn(powershell, [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', bootstrapPath
  ], { cwd: path.dirname(prepared.updateRoot), stdio: ['ignore', logHandle, logHandle], windowsHide: true });
  fs.closeSync(logHandle);
  await new Promise((resolve, reject) => {
    let settled = false;
    const startedAt = Date.now();
    const readFailure = () => {
      let installerMessage = '';
      try {
        const status = JSON.parse(fs.readFileSync(prepared.statusPath, 'utf8').replace(/^\uFEFF/, ''));
        installerMessage = String(status?.message || status?.error || '').trim();
      } catch {}
      if (!installerMessage) {
        for (const candidate of [installerErrorPath, installerOutputPath, logPath]) {
          try {
            installerMessage = fs.readFileSync(candidate, 'utf8').trim().slice(-2000);
            if (installerMessage) break;
          } catch {}
        }
      }
      return installerMessage;
    };
    child.once('error', (error) => {
      if (!settled) { settled = true; reject(error); }
    });
    child.once('spawn', () => {
      const timer = setInterval(() => {
        if (settled) { clearInterval(timer); return; }
        let state = '';
        try { state = JSON.parse(fs.readFileSync(prepared.statusPath, 'utf8').replace(/^\uFEFF/, '')).state || ''; } catch {}
        if (['extracting', 'waiting', 'closing', 'installing', 'launching', 'cleanup', 'installed'].includes(state)) {
          settled = true;
          clearInterval(timer);
          resolve();
          return;
        }
        if (state === 'failed' || (child.exitCode !== null && child.exitCode !== 0) || Date.now() - startedAt > 15_000) {
          settled = true;
          clearInterval(timer);
          const reason = child.exitCode !== null && child.exitCode !== 0
            ? `PowerShell terminó con código ${child.exitCode}.`
            : Date.now() - startedAt > 15_000
              ? 'PowerShell no confirmó el inicio en 15 segundos.'
              : '';
          reject(new Error(readFailure() || reason || 'El instalador de la actualización no pudo iniciar.'));
        }
      }, 200);
    });
  });
  child.unref();
  return { ok: true, version: prepared.latestVersion, archivePath: prepared.archivePath, targetDir, logPath, installerOutputPath, installerErrorPath };
}

module.exports = {
  UPDATE_REPOSITORY,
  compareVersions,
  normalizeVersion,
  safePortableDirectoryName,
  prepareUpdate,
  launchPreparedUpdate,
  updaterPowerShell,
  writeUpdateStatus
};
