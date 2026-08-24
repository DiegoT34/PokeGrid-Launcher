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
  [Parameter(Mandatory=$true)][int]$LauncherPid,
  [Parameter(Mandatory=$true)][string]$ArchivePath,
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$ExecutableName,
  [Parameter(Mandatory=$true)][string]$UpdateRoot,
  [Parameter(Mandatory=$true)][string]$StatusPath,
  [int]$HealthCheckSeconds = 8
)
$ErrorActionPreference = 'Stop'
$InstallDir = [IO.Path]::GetFullPath($InstallDir)
$UpdateRoot = [IO.Path]::GetFullPath($UpdateRoot)
$ArchivePath = [IO.Path]::GetFullPath($ArchivePath)
$StatusPath = [IO.Path]::GetFullPath($StatusPath)
if ([IO.Path]::GetPathRoot($InstallDir) -eq $InstallDir) { throw 'Ruta de instalación demasiado amplia.' }
if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'No se encontró el paquete descargado.' }
$oldExe = Join-Path $InstallDir $ExecutableName
if (-not (Test-Path -LiteralPath $oldExe -PathType Leaf)) { throw 'No se encontró el ejecutable instalado.' }

function Write-UpdateStatus([string]$State, [string]$Message = '', [hashtable]$Extra = @{}) {
  $payload = [ordered]@{
    state = $State
    message = $Message
    archivePath = $ArchivePath
    installDir = $InstallDir
    updatedAt = [DateTime]::UtcNow.ToString('o')
  }
  foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
  $statusDirectory = Split-Path -Parent $StatusPath
  New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
  $temporaryStatus = "$StatusPath.$PID.tmp"
  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $temporaryStatus -Encoding UTF8
  Move-Item -LiteralPath $temporaryStatus -Destination $StatusPath -Force
}

$stageDir = Join-Path $UpdateRoot 'extracted'
$backupDir = Join-Path $InstallDir ".pokegrid-update-backup-$PID"
$installedNames = [Collections.Generic.List[string]]::new()
$newProcess = $null
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
  $deadline = [DateTime]::UtcNow.AddSeconds(60)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (-not (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 250
  }
  if (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue) { throw 'El launcher anterior no se cerró a tiempo.' }

  Write-UpdateStatus 'installing' 'Reemplazando la versión anterior.'
  New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
  $packageEntries = @(Get-ChildItem -LiteralPath $packageDir -Force)
  if (-not $packageEntries.Count) { throw 'El paquete extraído está vacío.' }
  foreach ($entry in $packageEntries) {
    $target = Join-Path $InstallDir $entry.Name
    if (Test-Path -LiteralPath $target) {
      $moveDeadline = [DateTime]::UtcNow.AddSeconds(45)
      while ($true) {
        try {
          Move-Item -LiteralPath $target -Destination $backupDir -ErrorAction Stop
          break
        } catch {
          if ([DateTime]::UtcNow -ge $moveDeadline) { throw }
          Start-Sleep -Milliseconds 500
        }
      }
    }
    Move-Item -LiteralPath $entry.FullName -Destination $InstallDir -ErrorAction Stop
    $installedNames.Add($entry.Name)
  }
  $newExe = Join-Path $InstallDir $ExecutableName
  Write-UpdateStatus 'launching' 'Abriendo la nueva versión.'
  $newProcess = Start-Process -FilePath $newExe -WorkingDirectory $InstallDir -PassThru
  Start-Sleep -Seconds ([Math]::Max(1, $HealthCheckSeconds))
  if ($newProcess.HasExited) { throw 'La nueva versión no pudo mantenerse abierta.' }
  Write-UpdateStatus 'installed' 'La actualización se instaló y abrió correctamente.' @{ newProcessId = $newProcess.Id }
  Remove-Item -LiteralPath $backupDir -Recurse -Force
  Start-Sleep -Seconds 1
  if (Test-Path -LiteralPath $UpdateRoot) { Remove-Item -LiteralPath $UpdateRoot -Recurse -Force }
} catch {
  $failure = $_.Exception.Message
  try {
    if ($newProcess -and -not $newProcess.HasExited) {
      Stop-Process -Id $newProcess.Id -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 500
    }
    if (Test-Path -LiteralPath $backupDir) {
      foreach ($name in $installedNames) {
        $installedTarget = Join-Path $InstallDir $name
        if (Test-Path -LiteralPath $installedTarget) { Remove-Item -LiteralPath $installedTarget -Recurse -Force }
      }
      foreach ($entry in @(Get-ChildItem -LiteralPath $backupDir -Force)) {
        Move-Item -LiteralPath $entry.FullName -Destination $InstallDir -Force
      }
      Remove-Item -LiteralPath $backupDir -Recurse -Force
      $rollbackExe = Join-Path $InstallDir $ExecutableName
      if (Test-Path -LiteralPath $rollbackExe -PathType Leaf) {
        Start-Process -FilePath $rollbackExe -WorkingDirectory $InstallDir
      }
    } elseif (Test-Path -LiteralPath $oldExe -PathType Leaf) {
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

async function launchPreparedUpdate({ app, prepared }) {
  if (!app.isPackaged) throw new Error('El reemplazo automático solo se ejecuta desde la versión portátil empaquetada.');
  const installDir = path.dirname(process.execPath);
  const executableName = path.basename(process.execPath);
  const scriptPath = path.join(prepared.updateRoot, 'install-update.ps1');
  fs.writeFileSync(scriptPath, updaterPowerShell(), 'utf8');
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  if (!fs.existsSync(powershell)) throw new Error('No se encontró Windows PowerShell para instalar la actualización.');
  writeUpdateStatus(prepared.statusPath, {
    state: 'installer-starting',
    currentVersion: app.getVersion(),
    latestVersion: prepared.latestVersion,
    archivePath: prepared.archivePath,
    installDir
  });
  const child = spawn(powershell, [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-LauncherPid', String(process.pid),
    '-ArchivePath', prepared.archivePath,
    '-InstallDir', installDir,
    '-ExecutableName', executableName,
    '-UpdateRoot', prepared.updateRoot,
    '-StatusPath', prepared.statusPath
  ], { cwd: path.dirname(prepared.updateRoot), detached: true, stdio: 'ignore', windowsHide: true });
  await new Promise((resolve, reject) => {
    let settled = false;
    child.once('error', (error) => {
      if (!settled) { settled = true; reject(error); }
    });
    child.once('spawn', () => setTimeout(() => {
      if (settled) return;
      settled = true;
      if (child.exitCode !== null) reject(new Error('El instalador de la actualización se cerró antes de iniciar.'));
      else resolve();
    }, 500));
  });
  child.unref();
  return { ok: true, version: prepared.latestVersion, archivePath: prepared.archivePath };
}

module.exports = {
  UPDATE_REPOSITORY,
  compareVersions,
  normalizeVersion,
  prepareUpdate,
  launchPreparedUpdate,
  updaterPowerShell,
  writeUpdateStatus
};
