const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');

const UPDATE_REPOSITORY = 'DiegoT34/PokeGrid-Launcher';
const UPDATE_API_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
const UPDATE_MAX_BYTES = 1024 * 1024 * 1024;

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

  const updateRoot = fs.mkdtempSync(path.join(app.getPath('temp'), 'pokegrid-update-'));
  const archivePath = path.join(updateRoot, release.archive.name);
  const checksumPath = `${archivePath}.sha256`;
  try {
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
    return { ...release, status: 'ready', archivePath, updateRoot, sha256: actualHash };
  } catch (error) {
    fs.rmSync(updateRoot, { recursive: true, force: true });
    throw error;
  }
}

function updaterPowerShell() {
  return String.raw`param(
  [Parameter(Mandatory=$true)][int]$LauncherPid,
  [Parameter(Mandatory=$true)][string]$ArchivePath,
  [Parameter(Mandatory=$true)][string]$InstallDir,
  [Parameter(Mandatory=$true)][string]$ExecutableName,
  [Parameter(Mandatory=$true)][string]$UpdateRoot
)
$ErrorActionPreference = 'Stop'
$InstallDir = [IO.Path]::GetFullPath($InstallDir)
$UpdateRoot = [IO.Path]::GetFullPath($UpdateRoot)
$ArchivePath = [IO.Path]::GetFullPath($ArchivePath)
if ([IO.Path]::GetPathRoot($InstallDir) -eq $InstallDir) { throw 'Ruta de instalación demasiado amplia.' }
if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'No se encontró el paquete descargado.' }
$oldExe = Join-Path $InstallDir $ExecutableName
if (-not (Test-Path -LiteralPath $oldExe -PathType Leaf)) { throw 'No se encontró el ejecutable instalado.' }

$deadline = [DateTime]::UtcNow.AddSeconds(45)
while ([DateTime]::UtcNow -lt $deadline) {
  $running = Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue
  if (-not $running) { break }
  Start-Sleep -Milliseconds 250
}
if (Get-Process -Id $LauncherPid -ErrorAction SilentlyContinue) { throw 'El launcher anterior no se cerró a tiempo.' }

$stageDir = Join-Path $UpdateRoot 'extracted'
$backupDir = "$InstallDir.pokegrid-old"
if (Test-Path -LiteralPath $stageDir) { Remove-Item -LiteralPath $stageDir -Recurse -Force }
if (Test-Path -LiteralPath $backupDir) { Remove-Item -LiteralPath $backupDir -Recurse -Force }
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $stageDir -Force
$stagedExe = Join-Path $stageDir $ExecutableName
if (-not (Test-Path -LiteralPath $stagedExe -PathType Leaf)) { throw 'El ZIP no contiene el ejecutable esperado.' }

Move-Item -LiteralPath $InstallDir -Destination $backupDir
try {
  Move-Item -LiteralPath $stageDir -Destination $InstallDir
  $newExe = Join-Path $InstallDir $ExecutableName
  $newProcess = Start-Process -FilePath $newExe -WorkingDirectory $InstallDir -PassThru
  Start-Sleep -Seconds 5
  if ($newProcess.HasExited) { throw 'La nueva versión no pudo mantenerse abierta.' }
  Remove-Item -LiteralPath $backupDir -Recurse -Force
} catch {
  if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
  if (Test-Path -LiteralPath $backupDir) {
    Move-Item -LiteralPath $backupDir -Destination $InstallDir
    Start-Process -FilePath (Join-Path $InstallDir $ExecutableName) -WorkingDirectory $InstallDir
  }
  throw
} finally {
  Start-Sleep -Seconds 1
  if (Test-Path -LiteralPath $UpdateRoot) { Remove-Item -LiteralPath $UpdateRoot -Recurse -Force }
}`;
}

function launchPreparedUpdate({ app, prepared }) {
  if (!app.isPackaged) throw new Error('El reemplazo automático solo se ejecuta desde la versión portátil empaquetada.');
  const installDir = path.dirname(process.execPath);
  const executableName = path.basename(process.execPath);
  const scriptPath = path.join(prepared.updateRoot, 'install-update.ps1');
  fs.writeFileSync(scriptPath, updaterPowerShell(), 'utf8');
  const child = spawn('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-LauncherPid', String(process.pid),
    '-ArchivePath', prepared.archivePath,
    '-InstallDir', installDir,
    '-ExecutableName', executableName,
    '-UpdateRoot', prepared.updateRoot
  ], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  return { ok: true, version: prepared.latestVersion };
}

module.exports = {
  UPDATE_REPOSITORY,
  compareVersions,
  normalizeVersion,
  prepareUpdate,
  launchPreparedUpdate,
  updaterPowerShell
};
