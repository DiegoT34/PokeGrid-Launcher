const { app, BrowserWindow, dialog, ipcMain, net, safeStorage, screen, session, shell, webContents } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { userScriptResponseTarget } = require('./userscript-network');
const { accountTemplateText, parseAccountsTemplate } = require('./account-transfer');
const { prepareUpdate, launchPreparedUpdate } = require('./updater');

const GAME_ORIGIN = 'https://poke.idleworld.online';
const POKEPEDIA_URL = `${GAME_ORIGIN}/pokepedia`;
const ACCOUNT_COUNT = 4;
const USER_SCRIPT_LIMIT = 100;
const USER_SCRIPT_CODE_LIMIT = 1_000_000;
const USER_SCRIPT_RESPONSE_LIMIT = 2_000_000;
const USER_SCRIPT_SHARED_VALUE_LIMIT = 256_000;
const USER_SCRIPT_SHARED_STORE_LIMIT = 1_000_000;
const SCRIPT_SHOP_CATALOG_URL = 'https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/catalog.json';
const SCRIPT_SHOP_CATALOG_LIMIT = 512_000;
const SCRIPT_SHOP_CACHE_MS = 5 * 60 * 1000;
const POKEAPI_SPECIES_LIMIT = 2_000;
const REMOTE_IMAGE_CACHE_LIMIT = 48;
const SPECIES_CACHE_LIMIT = 256;
const GAME_SESSION_CACHE_BUDGET = 96 * 1024 * 1024;
const GAME_SESSION_CACHE_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000;

// Las sesiones permanecen activas al cambiar de pestaña o minimizar el launcher.
// Esto evita que Chromium suspenda conexiones y temporizadores de juegos en segundo plano.
app.commandLine.appendSwitch('disable-renderer-backgrounding');

let mainWindow = null;
let pokepediaWindow = null;
const remoteImageCache = new Map();
const pokeApiSpeciesCache = new Map();
const loadedUnpackedExtensions = Array.from({ length: ACCOUNT_COUNT }, () => null);
const browserInstanceSessions = new WeakSet();
let scriptShopCache = null;

function readLruCache(cache, key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function writeLruCache(cache, key, value, limit) {
  cache.set(key, value);
  while (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

const diagnosticUserData = String(process.env.POKEGRID_DIAGNOSTIC_USER_DATA || '').trim();
if (diagnosticUserData && path.isAbsolute(diagnosticUserData) && fs.existsSync(diagnosticUserData)) {
  app.setPath('userData', diagnosticUserData);
} else if (process.env.POKEGRID_SMOKE_SCREENSHOT) {
  app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-launcher-smoke-${process.pid}`));
}

function isGameUrl(rawUrl) {
  if (rawUrl === 'about:blank') return true;
  try {
    return new URL(rawUrl).origin === GAME_ORIGIN;
  } catch {
    return false;
  }
}

function openExternal(rawUrl) {
  if (/^https?:\/\//i.test(rawUrl)) shell.openExternal(rawUrl);
}

async function loadAllowedImageDataUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || ''));
  } catch {
    throw new Error('URL de sprite inválida.');
  }
  const isGameAsset = ['poke.idleworld.online', 'pokexguides.com'].includes(url.hostname);
  const isPokeApiSprite = url.hostname === 'raw.githubusercontent.com' &&
    /^\/PokeAPI\/sprites\/master\/sprites\/pokemon\/(?:other\/official-artwork\/)?[1-9]\d{0,3}\.png$/.test(url.pathname);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (!isGameAsset && !isPokeApiSprite)) {
    throw new Error('Origen de sprite no permitido.');
  }
  if (remoteImageCache.has(url.href)) return readLruCache(remoteImageCache, url.href);
  const request = net.fetch(url.href, { cache: 'force-cache' }).then(async (response) => {
    if (!response.ok) throw new Error(`No se pudo cargar el sprite (${response.status}).`);
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/')) throw new Error('El recurso no es una imagen.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 2_000_000) throw new Error('El sprite supera el tamaño permitido.');
    return `data:${contentType};base64,${bytes.toString('base64')}`;
  }).catch((error) => {
    remoteImageCache.delete(url.href);
    throw error;
  });
  return writeLruCache(remoteImageCache, url.href, request, REMOTE_IMAGE_CACHE_LIMIT);
}

async function resolvePokeApiSpecies(rawSlug) {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error('Nombre de especie inválido.');
  if (pokeApiSpeciesCache.has(slug)) return readLruCache(pokeApiSpeciesCache, slug);
  const request = net.fetch(`https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(slug)}/`, {
    cache: 'force-cache'
  }).then(async (response) => {
    if (!response.ok) throw new Error(`PokéAPI no encontró la especie (${response.status}).`);
    const text = await response.text();
    if (!text || text.length > 300_000) throw new Error('La respuesta de PokéAPI no es válida.');
    const value = JSON.parse(text);
    const id = Number(value?.id);
    if (!Number.isInteger(id) || id < 1 || id > POKEAPI_SPECIES_LIMIT) {
      throw new Error('PokéAPI devolvió un ID de especie inválido.');
    }
    return { id, name: String(value?.name || slug).slice(0, 80) };
  }).catch((error) => {
    pokeApiSpeciesCache.delete(slug);
    throw error;
  });
  return writeLruCache(pokeApiSpeciesCache, slug, request, SPECIES_CACHE_LIMIT);
}

function credentialPath() {
  return path.join(app.getPath('userData'), 'accounts.enc');
}

function accountSourcePath() {
  return path.join(app.getPath('userData'), 'accounts-source.json');
}

function normalizeAccounts(value) {
  const rows = Array.isArray(value) ? value : [];
  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
    label: String(rows[index]?.label || `Cuenta ${index + 1}`).slice(0, 40),
    username: String(rows[index]?.username || '').slice(0, 180),
    password: String(rows[index]?.password || '').slice(0, 300)
  }));
}

function readAccounts() {
  const file = credentialPath();
  if (!fs.existsSync(file)) return normalizeAccounts([]);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro del sistema no está disponible.');
  }
  const decrypted = safeStorage.decryptString(fs.readFileSync(file));
  return normalizeAccounts(JSON.parse(decrypted));
}

function writeAccounts(accounts) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro del sistema no está disponible. No se guardó ninguna contraseña.');
  }

  const file = credentialPath();
  const temporary = `${file}.tmp`;
  const encrypted = safeStorage.encryptString(JSON.stringify(normalizeAccounts(accounts)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, encrypted);
  fs.renameSync(temporary, file);
  return true;
}

function readAccountSourceConfig() {
  try {
    const value = JSON.parse(fs.readFileSync(accountSourcePath(), 'utf8'));
    const sourcePath = path.resolve(String(value?.sourcePath || ''));
    if (!path.isAbsolute(sourcePath) || path.extname(sourcePath).toLowerCase() !== '.txt') return null;
    return { sourcePath, modifiedAt: Number(value?.modifiedAt) || 0 };
  } catch {
    return null;
  }
}

function writeAccountSourceConfig(sourcePath, modifiedAt = 0) {
  const file = accountSourcePath();
  const temporary = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify({ sourcePath: path.resolve(sourcePath), modifiedAt }, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function syncAccountsFromSource({ force = false } = {}) {
  const config = readAccountSourceConfig();
  if (!config) return { linked: false, changed: false, accounts: readAccounts(), sourcePath: '' };
  if (!fs.existsSync(config.sourcePath)) {
    return { linked: true, changed: false, accounts: readAccounts(), sourcePath: config.sourcePath, error: 'El archivo vinculado no existe o fue movido.' };
  }
  const stats = fs.statSync(config.sourcePath);
  if (!stats.isFile() || stats.size > 64 * 1024) throw new Error('El archivo de cuentas vinculado no es válido o supera 64 KB.');
  if (!force && stats.mtimeMs <= config.modifiedAt) {
    return { linked: true, changed: false, accounts: readAccounts(), sourcePath: config.sourcePath };
  }
  const accounts = parseAccountsTemplate(fs.readFileSync(config.sourcePath, 'utf8'));
  writeAccounts(accounts);
  writeAccountSourceConfig(config.sourcePath, stats.mtimeMs);
  return { linked: true, changed: true, accounts, sourcePath: config.sourcePath };
}

function userScriptsPath() {
  return path.join(app.getPath('userData'), 'userscripts.json');
}

function userScriptSharedStoragePath() {
  return path.join(app.getPath('userData'), 'userscripts-shared.enc');
}

function bundledUserScriptsPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'userscripts')
    : path.join(__dirname, '..', 'userscripts');
}

function extensionConfigPath() {
  return path.join(app.getPath('userData'), 'unpacked-extension.json');
}

function atomicWriteJson(file, value) {
  const temporary = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temporary, file);
}

function metadataFromUserScript(code) {
  const block = String(code || '').match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/i)?.[1] || '';
  const metadata = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*\/\/\s*@([\w:-]+)\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    if (!metadata[key]) metadata[key] = [];
    metadata[key].push(match[2]);
  }
  return metadata;
}

function cleanMetadataList(value, limit = 50) {
  return [...new Set((Array.isArray(value) ? value : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean))]
    .slice(0, limit);
}

function normalizeUserScript(value, existing = null) {
  const code = String(value?.code || '');
  if (!code.trim()) throw new Error('El script no puede estar vacío.');
  if (Buffer.byteLength(code, 'utf8') > USER_SCRIPT_CODE_LIMIT) {
    throw new Error('El script supera el límite de 1 MB.');
  }
  try {
    new Function(`return async function () {\n${code}\n};`);
  } catch (error) {
    throw new Error(`El código contiene un error de sintaxis: ${error.message}`);
  }

  const metadata = metadataFromUserScript(code);
  const matches = cleanMetadataList([...(metadata.match || []), ...(metadata.include || [])]);
  const now = new Date().toISOString();
  const runAtValue = String(metadata['run-at']?.[0] || 'document-end').toLowerCase();
  const runAt = ['document-start', 'document-end', 'document-idle'].includes(runAtValue)
    ? runAtValue
    : 'document-end';
  const sourceUrl = String(value?.sourceUrl || existing?.sourceUrl || '').slice(0, 2_000);
  const codeUnchanged = Boolean(existing && existing.code === code);
  const shopId = String(value?.shopId || existing?.shopId || '').trim().slice(0, 100);
  const requestedShopSha256 = String(value?.shopSha256 || '').trim().toLowerCase();
  const shopSha256 = /^[a-f0-9]{64}$/.test(requestedShopSha256)
    ? requestedShopSha256
    : (codeUnchanged && /^[a-f0-9]{64}$/.test(String(existing?.shopSha256 || '')) ? existing.shopSha256 : '');

  return {
    id: String(existing?.id || value?.id || crypto.randomUUID()).slice(0, 100),
    name: String(metadata.name?.[0] || value?.name || existing?.name || 'Script sin nombre').slice(0, 120),
    namespace: String(metadata.namespace?.[0] || value?.namespace || existing?.namespace || 'pokegrid.local').slice(0, 240),
    version: String(metadata.version?.[0] || value?.version || existing?.version || '1.0.0').slice(0, 40),
    description: String(metadata.description?.[0] || value?.description || existing?.description || '').slice(0, 500),
    author: String(metadata.author?.[0] || value?.author || existing?.author || '').slice(0, 120),
    sourceUrl,
    shopId,
    shopVersion: String(value?.shopVersion || existing?.shopVersion || '').slice(0, 40),
    shopSha256,
    shopCatalogUrl: shopId ? SCRIPT_SHOP_CATALOG_URL : '',
    code,
    enabled: value?.enabled !== false,
    accounts: Array.from({ length: ACCOUNT_COUNT }, (_, index) => value?.accounts?.[index] !== false),
    matches: matches.length ? matches : [`${GAME_ORIGIN}/*`],
    excludes: cleanMetadataList(metadata.exclude),
    grants: cleanMetadataList(metadata.grant),
    connects: cleanMetadataList(metadata.connect),
    runAt,
    createdAt: existing?.createdAt || now,
    updatedAt: value === existing ? existing?.updatedAt || now : now
  };
}

function readUserScripts() {
  const file = userScriptsPath();
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(rows)) return [];
  const scripts = [];
  for (const row of rows.slice(0, USER_SCRIPT_LIMIT)) {
    try {
      scripts.push(normalizeUserScript(row, row));
    } catch {}
  }
  return scripts;
}

function writeUserScripts(scripts) {
  atomicWriteJson(userScriptsPath(), scripts.slice(0, USER_SCRIPT_LIMIT));
}

function readUserScriptSharedStore() {
  const file = userScriptSharedStoragePath();
  if (!fs.existsSync(file)) return {};
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro de Windows no está disponible.');
  }
  const parsed = JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function writeUserScriptSharedStore(store) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro de Windows no está disponible.');
  }
  const serialized = JSON.stringify(store);
  if (Buffer.byteLength(serialized, 'utf8') > USER_SCRIPT_SHARED_STORE_LIMIT) {
    throw new Error('El almacenamiento compartido de scripts superó 1 MB.');
  }
  const file = userScriptSharedStoragePath();
  const temporary = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, safeStorage.encryptString(serialized));
  fs.renameSync(temporary, file);
}

function removeUserScriptSharedStore(scriptId) {
  const file = userScriptSharedStoragePath();
  if (!fs.existsSync(file)) return;
  const store = readUserScriptSharedStore();
  if (!Object.prototype.hasOwnProperty.call(store, scriptId)) return;
  delete store[scriptId];
  writeUserScriptSharedStore(store);
}

function saveUserScript(value) {
  const scripts = readUserScripts();
  const requestedId = String(value?.id || '');
  const index = requestedId ? scripts.findIndex((script) => script.id === requestedId) : -1;
  const existing = index >= 0 ? scripts[index] : null;
  const script = normalizeUserScript(value, existing);
  if (index >= 0) scripts[index] = script;
  else {
    if (scripts.length >= USER_SCRIPT_LIMIT) throw new Error(`Solo se permiten ${USER_SCRIPT_LIMIT} scripts.`);
    scripts.unshift(script);
  }
  writeUserScripts(scripts);
  return script;
}

function removeUserScript(id) {
  const scripts = readUserScripts();
  const requestedId = String(id || '');
  const filtered = scripts.filter((script) => script.id !== requestedId);
  if (filtered.length === scripts.length) throw new Error('El script ya no existe.');
  writeUserScripts(filtered);
  removeUserScriptSharedStore(requestedId);
  return true;
}

function readExtensionConfig() {
  const file = extensionConfigPath();
  if (!fs.existsSync(file)) return { path: '', accounts: Array(ACCOUNT_COUNT).fill(false) };
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      path: String(value?.path || ''),
      accounts: Array.from({ length: ACCOUNT_COUNT }, (_, index) => value?.accounts?.[index] === true)
    };
  } catch {
    return { path: '', accounts: Array(ACCOUNT_COUNT).fill(false) };
  }
}

function validateUnpackedExtensionPath(rawPath) {
  const extensionPath = path.resolve(String(rawPath || ''));
  const manifestPath = path.join(extensionPath, 'manifest.json');
  if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
    throw new Error('La carpeta no contiene un manifest.json válido.');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest?.name || !manifest?.version || ![2, 3].includes(Number(manifest?.manifest_version))) {
    throw new Error('El manifiesto de la extensión no es compatible.');
  }
  return { extensionPath, manifest };
}

async function applyUnpackedExtensionConfig(value, persist = true) {
  const config = {
    path: String(value?.path || ''),
    accounts: Array.from({ length: ACCOUNT_COUNT }, (_, index) => value?.accounts?.[index] === true)
  };
  let manifest = null;
  if (config.accounts.some(Boolean)) {
    const validation = validateUnpackedExtensionPath(config.path);
    config.path = validation.extensionPath;
    manifest = validation.manifest;
  }

  const results = [];
  for (let index = 0; index < ACCOUNT_COUNT; index += 1) {
    const gameSession = session.fromPartition(`persist:pokegrid-${index + 1}`);
    const previous = loadedUnpackedExtensions[index];
    if (previous) {
      try { await gameSession.extensions.removeExtension(previous.id); } catch {}
      loadedUnpackedExtensions[index] = null;
    }
    if (!config.accounts[index]) {
      results.push({ account: index, loaded: false, name: '' });
      continue;
    }
    try {
      const extension = await gameSession.extensions.loadExtension(config.path, { allowFileAccess: false });
      loadedUnpackedExtensions[index] = { id: extension.id, name: extension.name, path: config.path };
      results.push({ account: index, loaded: true, name: extension.name, id: extension.id });
    } catch (error) {
      results.push({ account: index, loaded: false, error: error.message });
    }
  }
  if (persist) atomicWriteJson(extensionConfigPath(), config);
  return { config, manifest: manifest ? { name: manifest.name, version: manifest.version } : null, results };
}

function getGameAccountIndex(webContents) {
  for (let index = 0; index < ACCOUNT_COUNT; index += 1) {
    if (webContents.session === session.fromPartition(`persist:pokegrid-${index + 1}`)) return index;
  }
  return -1;
}

function authorizeUserScriptRuntime(event, scriptId, requiredGrant = '') {
  const accountIndex = getGameAccountIndex(event.sender);
  if (accountIndex < 0 || !isGameUrl(event.sender.getURL())) {
    throw new Error('Origen de solicitud no permitido.');
  }
  const script = readUserScripts().find((candidate) => candidate.id === String(scriptId || ''));
  if (!script?.enabled || !script.accounts[accountIndex]) {
    throw new Error('El script no está habilitado en esta cuenta.');
  }
  if (requiredGrant && !script.grants.includes(requiredGrant)) {
    throw new Error(`El script debe declarar @grant ${requiredGrant}.`);
  }
  return { accountIndex, script };
}

function normalizeUserScriptSharedKey(rawKey) {
  const key = String(rawKey || '').trim();
  if (!/^[a-zA-Z0-9_.:-]{1,100}$/.test(key)) {
    throw new Error('Clave de almacenamiento compartido no válida.');
  }
  return key;
}

function getUserScriptSharedValue(event, scriptId, rawKey) {
  const { script } = authorizeUserScriptRuntime(event, scriptId, 'PokeGrid_sharedStorage');
  const key = normalizeUserScriptSharedKey(rawKey);
  const scriptStore = readUserScriptSharedStore()[script.id];
  if (!scriptStore || !Object.prototype.hasOwnProperty.call(scriptStore, key)) {
    return { found: false };
  }
  return { found: true, value: scriptStore[key] };
}

function setUserScriptSharedValue(event, scriptId, rawKey, value) {
  const { script } = authorizeUserScriptRuntime(event, scriptId, 'PokeGrid_sharedStorage');
  const key = normalizeUserScriptSharedKey(rawKey);
  let serialized;
  try { serialized = JSON.stringify(value); } catch {
    throw new Error('El valor compartido no se puede serializar.');
  }
  if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > USER_SCRIPT_SHARED_VALUE_LIMIT) {
    throw new Error('El valor compartido supera 256 KB.');
  }
  const safeValue = JSON.parse(serialized);
  const store = readUserScriptSharedStore();
  const scriptStore = store[script.id] && typeof store[script.id] === 'object'
    ? store[script.id]
    : {};
  scriptStore[key] = safeValue;
  store[script.id] = scriptStore;
  writeUserScriptSharedStore(store);
  return { ok: true };
}

function deleteUserScriptSharedValue(event, scriptId, rawKey) {
  const { script } = authorizeUserScriptRuntime(event, scriptId, 'PokeGrid_sharedStorage');
  const key = normalizeUserScriptSharedKey(rawKey);
  const store = readUserScriptSharedStore();
  const scriptStore = store[script.id];
  if (!scriptStore || !Object.prototype.hasOwnProperty.call(scriptStore, key)) return { ok: true };
  delete scriptStore[key];
  if (Object.keys(scriptStore).length) store[script.id] = scriptStore;
  else delete store[script.id];
  writeUserScriptSharedStore(store);
  return { ok: true };
}

function connectRuleAllows(rule, target, gameOrigin) {
  const normalized = String(rule || '').trim().toLowerCase();
  if (normalized === '*') return true;
  if (normalized === 'self') return target.origin === gameOrigin;
  const hostname = target.hostname.toLowerCase();
  if (normalized.startsWith('*.')) {
    const suffix = normalized.slice(2);
    return hostname === suffix || hostname.endsWith(`.${suffix}`);
  }
  try {
    if (/^https?:\/\//.test(normalized)) return new URL(normalized).hostname.toLowerCase() === hostname;
  } catch {}
  return hostname === normalized;
}

async function performUserScriptRequest(event, scriptId, details) {
  const { script } = authorizeUserScriptRuntime(event, scriptId);

  let target;
  try { target = new URL(String(details?.url || ''), event.sender.getURL()); } catch {
    throw new Error('URL de solicitud inválida.');
  }
  if (target.protocol !== 'https:') throw new Error('GM_xmlhttpRequest solo permite HTTPS.');
  const gameOrigin = new URL(event.sender.getURL()).origin;
  const allowed = target.origin === gameOrigin ||
    script.connects.some((rule) => connectRuleAllows(rule, target, gameOrigin));
  if (!allowed) throw new Error(`Añade @connect ${target.hostname} para permitir esta solicitud.`);

  const method = String(details?.method || 'GET').toUpperCase();
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(method)) throw new Error('Método HTTP no permitido.');
  const multipart = Array.isArray(details?.multipart) ? details.multipart.slice(0, 40) : null;
  const bodyText = details?.data == null ? undefined : String(details.data);
  if (multipart && bodyText !== undefined) throw new Error('La solicitud no puede mezclar data y multipart.');
  if (bodyText && Buffer.byteLength(bodyText, 'utf8') > USER_SCRIPT_CODE_LIMIT) throw new Error('El cuerpo supera 1 MB.');
  const headers = {};
  const forbiddenHeaders = new Set(['cookie', 'host', 'origin', 'referer', 'content-length']);
  for (const [key, rawValue] of Object.entries(details?.headers || {}).slice(0, 60)) {
    const name = String(key).toLowerCase();
    if (!forbiddenHeaders.has(name)) headers[name] = String(rawValue).slice(0, 8_000);
  }

  let requestBody = bodyText;
  if (multipart) {
    const form = new FormData();
    let binaryBytes = 0;
    for (const part of multipart) {
      const name = String(part?.name || '').trim().slice(0, 120);
      if (!name) throw new Error('Campo multipart inválido.');
      if (part?.base64 != null) {
        const mimeType = String(part.mimeType || 'application/octet-stream').slice(0, 120);
        if (!/^(?:image\/(?:png|webp|gif|jpeg)|application\/octet-stream)$/i.test(mimeType)) {
          throw new Error('Tipo de archivo multipart no permitido.');
        }
        const bytes = Buffer.from(String(part.base64), 'base64');
        binaryBytes += bytes.length;
        if (!bytes.length || binaryBytes > USER_SCRIPT_CODE_LIMIT) throw new Error('El archivo multipart supera 1 MB.');
        const filename = String(part.filename || 'upload.bin').replace(/[^a-z0-9_.-]/gi, '_').slice(0, 120);
        form.append(name, new Blob([bytes], { type: mimeType }), filename);
      } else {
        form.append(name, String(part?.value ?? '').slice(0, 20_000));
      }
    }
    requestBody = form;
    delete headers['content-type'];
  }

  const response = await event.sender.session.fetch(target.href, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : requestBody,
    redirect: 'follow'
  });
  const finalTarget = userScriptResponseTarget(response, target);
  if (finalTarget.protocol !== 'https:') throw new Error('La redirección salió de HTTPS.');
  const finalAllowed = finalTarget.origin === gameOrigin ||
    script.connects.some((rule) => connectRuleAllows(rule, finalTarget, gameOrigin));
  if (!finalAllowed) throw new Error('La redirección salió de los dominios permitidos por @connect.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > USER_SCRIPT_RESPONSE_LIMIT) throw new Error('La respuesta supera 2 MB.');
  return {
    status: response.status,
    statusText: response.statusText,
    finalUrl: finalTarget.href,
    headers: Object.fromEntries(response.headers.entries()),
    responseText: bytes.toString('utf8')
  };
}

async function readUserScriptFromUrl(rawUrl) {
  let target;
  try { target = new URL(String(rawUrl || '')); } catch {
    throw new Error('La URL no es válida.');
  }
  if (target.protocol !== 'https:') throw new Error('La instalación remota solo permite HTTPS.');
  const response = await net.fetch(target.href, { redirect: 'follow' });
  if (!response.ok) throw new Error(`No se pudo descargar el script (${response.status}).`);
  if (new URL(response.url).protocol !== 'https:') throw new Error('La descarga fue redirigida fuera de HTTPS.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > USER_SCRIPT_CODE_LIMIT) throw new Error('El archivo está vacío o supera 1 MB.');
  const code = bytes.toString('utf8');
  if (!/==UserScript==/i.test(code)) throw new Error('El archivo no contiene un bloque ==UserScript==.');
  return { code, sourceUrl: response.url || target.href };
}

function compareScriptShopVersions(left, right) {
  const parse = (value) => {
    const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i);
    return match ? match.slice(1).map(Number) : null;
  };
  const a = parse(left);
  const b = parse(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function assertScriptShopDownloadUrl(rawUrl) {
  let target;
  try { target = new URL(String(rawUrl || '')); } catch {
    throw new Error('El catálogo contiene una URL de descarga inválida.');
  }
  const rawFile = target.hostname === 'raw.githubusercontent.com' &&
    /^\/DiegoT34\/PokeGrid-Script-Shop\/(?:main|[a-f0-9]{40})\/scripts\/[a-z0-9][a-z0-9._-]{0,99}\.user\.js$/i.test(target.pathname);
  const releaseFile = target.hostname === 'github.com' &&
    /^\/DiegoT34\/PokeGrid-Script-Shop\/releases\/download\/[^/]+\/[a-z0-9][a-z0-9._-]{0,99}\.user\.js$/i.test(target.pathname);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || (!rawFile && !releaseFile)) {
    throw new Error('La descarga no pertenece al repositorio oficial de la Shop.');
  }
  return target.href;
}

function normalizeScriptShopCatalog(value) {
  if (Number(value?.schemaVersion) !== 1 || !Array.isArray(value?.scripts)) {
    throw new Error('El catálogo de la Shop usa un formato no compatible.');
  }
  const ids = new Set();
  const scripts = value.scripts.slice(0, 200).map((row) => {
    const id = String(row?.id || '').trim().toLowerCase();
    const version = String(row?.version || '').trim().replace(/^v/i, '');
    const sha256 = String(row?.sha256 || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(id) || ids.has(id)) throw new Error('El catálogo contiene un ID de script inválido o duplicado.');
    if (compareScriptShopVersions(version, version) !== 0) throw new Error(`La versión publicada para ${id} no es válida.`);
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error(`La firma SHA-256 de ${id} no es válida.`);
    ids.add(id);
    return {
      id,
      name: String(row?.name || id).trim().slice(0, 120),
      namespace: String(row?.namespace || '').trim().slice(0, 240),
      version,
      author: String(row?.author || 'DiegoT34').trim().slice(0, 120),
      summary: String(row?.summary || '').trim().slice(0, 240),
      description: String(row?.description || row?.summary || '').trim().slice(0, 2_000),
      category: String(row?.category || 'Utilidades').trim().slice(0, 60),
      tags: cleanMetadataList(row?.tags, 12).map((tag) => tag.slice(0, 40)),
      permissions: cleanMetadataList(row?.permissions, 30).map((entry) => entry.slice(0, 160)),
      minLauncherVersion: String(row?.minLauncherVersion || '0.22.0').trim().replace(/^v/i, '').slice(0, 40),
      downloadUrl: assertScriptShopDownloadUrl(row?.downloadUrl),
      sha256,
      homepage: String(row?.homepage || '').trim().slice(0, 2_000),
      changelog: String(row?.changelog || '').trim().slice(0, 1_000),
      icon: String(row?.icon || '📜').trim().slice(0, 8) || '📜',
      featured: row?.featured === true,
      publishedAt: String(row?.publishedAt || '').trim().slice(0, 40)
    };
  });
  return {
    schemaVersion: 1,
    updatedAt: String(value?.updatedAt || '').slice(0, 40),
    scripts: scripts.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'es'))
  };
}

async function loadScriptShopCatalog(refresh = false) {
  const now = Date.now();
  if (!refresh && scriptShopCache && now - scriptShopCache.fetchedAt < SCRIPT_SHOP_CACHE_MS) return scriptShopCache.catalog;
  try {
    const response = await net.fetch(SCRIPT_SHOP_CATALOG_URL, {
      redirect: 'follow', cache: refresh ? 'no-store' : 'default',
      headers: { Accept: 'application/json', 'User-Agent': `PokeGrid-Launcher/${app.getVersion()}` }
    });
    if (!response.ok) throw new Error(`GitHub no respondió correctamente (HTTP ${response.status}).`);
    if (response.url !== SCRIPT_SHOP_CATALOG_URL) throw new Error('El catálogo fue redirigido a un origen no permitido.');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > SCRIPT_SHOP_CATALOG_LIMIT) throw new Error('El catálogo está vacío o supera 512 KB.');
    const catalog = normalizeScriptShopCatalog(JSON.parse(bytes.toString('utf8')));
    scriptShopCache = { fetchedAt: now, catalog };
    return catalog;
  } catch (error) {
    if (scriptShopCache?.catalog) return { ...scriptShopCache.catalog, stale: true, warning: error.message };
    throw error;
  }
}

async function downloadScriptShopCode(item) {
  const target = assertScriptShopDownloadUrl(item.downloadUrl);
  const response = await net.fetch(target, {
    redirect: 'follow', cache: 'no-store',
    headers: { Accept: 'text/javascript, text/plain;q=0.9', 'User-Agent': `PokeGrid-Launcher/${app.getVersion()}` }
  });
  if (!response.ok) throw new Error(`No se pudo descargar el script (HTTP ${response.status}).`);
  const finalUrl = assertScriptShopDownloadUrl(response.url || target);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > USER_SCRIPT_CODE_LIMIT) throw new Error('El script está vacío o supera 1 MB.');
  const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== item.sha256) throw new Error('La firma SHA-256 no coincide. La instalación fue cancelada por seguridad.');
  const code = bytes.toString('utf8');
  if (!/==UserScript==/i.test(code)) throw new Error('El archivo publicado no contiene un bloque ==UserScript==.');
  return { code, sourceUrl: finalUrl, sha256: actualHash };
}

async function installScriptShopItem(value) {
  const shopId = String(value?.shopId || '').trim().toLowerCase();
  const catalog = await loadScriptShopCatalog(true);
  const item = catalog.scripts.find((candidate) => candidate.id === shopId);
  if (!item) throw new Error('El script ya no está disponible en el catálogo oficial.');
  const launcherCompatibility = compareScriptShopVersions(app.getVersion(), item.minLauncherVersion);
  if (launcherCompatibility === null || launcherCompatibility < 0) {
    throw new Error(`Este script requiere PokeGrid Launcher ${item.minLauncherVersion} o posterior.`);
  }
  const downloaded = await downloadScriptShopCode(item);
  const metadata = metadataFromUserScript(downloaded.code);
  const publishedVersion = String(metadata.version?.[0] || '').trim().replace(/^v/i, '');
  const publishedNamespace = String(metadata.namespace?.[0] || '').trim();
  const publishedName = String(metadata.name?.[0] || '').trim();
  if (publishedVersion !== item.version) throw new Error('La versión del archivo no coincide con el catálogo.');
  if (item.namespace && publishedNamespace !== item.namespace) throw new Error('El namespace del archivo no coincide con el catálogo.');

  const scripts = readUserScripts();
  const existing = scripts.find((script) => script.shopId === item.id) ||
    scripts.find((script) => item.namespace && publishedName && script.namespace === item.namespace && script.name === publishedName);
  const accounts = existing?.accounts || Array.from({ length: ACCOUNT_COUNT }, (_, index) => value?.accounts?.[index] !== false);
  const script = saveUserScript({
    id: existing?.id,
    code: downloaded.code,
    enabled: existing?.enabled !== false,
    accounts,
    sourceUrl: downloaded.sourceUrl,
    shopId: item.id,
    shopVersion: item.version,
    shopSha256: downloaded.sha256
  });
  return { script, scripts: readUserScripts(), item };
}

function uninstallScriptShopItem(rawShopId) {
  const shopId = String(rawShopId || '').trim().toLowerCase();
  const script = readUserScripts().find((candidate) => candidate.shopId === shopId);
  if (!script) throw new Error('El script de la Shop ya no está instalado.');
  removeUserScript(script.id);
  return { script, scripts: readUserScripts() };
}

async function maintainGameSessionCaches(gameSessions) {
  const markerPath = path.join(app.getPath('userData'), 'game-cache-maintenance.json');
  let previous = null;
  try { previous = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch {}
  const now = Date.now();
  if (now - Number(previous?.checkedAt || 0) < GAME_SESSION_CACHE_CHECK_INTERVAL) return previous;
  const results = [];
  for (let index = 0; index < gameSessions.length; index += 1) {
    const gameSession = gameSessions[index];
    try {
      const beforeBytes = await gameSession.getCacheSize();
      const repaired = beforeBytes > GAME_SESSION_CACHE_BUDGET;
      if (repaired) {
        // Solo se eliminan cachés regenerables. Cookies, localStorage, IndexedDB,
        // credenciales y sesiones de las cuentas se conservan intactas.
        await gameSession.clearCache();
        await gameSession.clearCodeCaches({});
      }
      results.push({ account: index + 1, beforeBytes, repaired });
    } catch (error) {
      results.push({ account: index + 1, beforeBytes: 0, repaired: false, error: error.message });
    }
  }
  const state = { checkedAt: now, budgetBytes: GAME_SESSION_CACHE_BUDGET, results };
  try { atomicWriteJson(markerPath, state); } catch {}
  return state;
}

async function configureGameSessions() {
  const gameSessions = [];
  for (let index = 1; index <= ACCOUNT_COUNT; index += 1) {
    const gameSession = session.fromPartition(`persist:pokegrid-${index}`);
    gameSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    gameSessions.push(gameSession);
  }
  await maintainGameSessionCaches(gameSessions);
  const pokepediaSession = session.fromPartition('persist:pokegrid-pokepedia');
  pokepediaSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const savedExtension = readExtensionConfig();
  if (savedExtension.accounts.some(Boolean)) {
    try { await applyUnpackedExtensionConfig(savedExtension, false); } catch (error) {
      console.warn(`No se pudo restaurar la extensión desempaquetada: ${error.message}`);
    }
  }
}

function createPokepediaWindow() {
  if (pokepediaWindow && !pokepediaWindow.isDestroyed()) {
    if (pokepediaWindow.isMinimized()) pokepediaWindow.restore();
    if (!pokepediaWindow.isFullScreen()) pokepediaWindow.setFullScreen(true);
    pokepediaWindow.show();
    pokepediaWindow.focus();
    return pokepediaWindow;
  }

  pokepediaWindow = new BrowserWindow({
    show: false,
    frame: false,
    fullscreen: true,
    fullscreenable: true,
    minimizable: true,
    closable: true,
    autoHideMenuBar: true,
    backgroundColor: '#17191b',
    title: 'Pokepedia · IDLE POKE LAUNCHER',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'pokepedia-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  pokepediaWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  pokepediaWindow.on('page-title-updated', (event) => event.preventDefault());
  pokepediaWindow.once('ready-to-show', () => {
    if (!pokepediaWindow || pokepediaWindow.isDestroyed()) return;
    pokepediaWindow.setFullScreen(true);
    pokepediaWindow.show();
    pokepediaWindow.focus();
  });
  pokepediaWindow.on('closed', () => {
    pokepediaWindow = null;
  });
  pokepediaWindow.loadFile(path.join(__dirname, 'pokepedia-shell.html'));
  return pokepediaWindow;
}

function createWindow() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: 920,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111315',
    title: 'IDLE POKE LAUNCHER',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  mainWindow.webContents.on('will-attach-webview', (_event, webPreferences, params) => {
    const partition = String(params.partition || webPreferences.partition || '');
    if (!partition.startsWith('persist:pokegrid-instance-')) return;
    const browserSession = session.fromPartition(partition);
    browserInstanceSessions.add(browserSession);
    browserSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    webPreferences.backgroundThrottling = false;
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();

    if (process.env.POKEGRID_SMOKE_SCREENSHOT) {
      setTimeout(async () => {
        const smokeWidth = Number(process.env.POKEGRID_SMOKE_WIDTH);
        const smokeHeight = Number(process.env.POKEGRID_SMOKE_HEIGHT);
        if (Number.isFinite(smokeWidth) && Number.isFinite(smokeHeight)) {
          mainWindow.unmaximize();
          mainWindow.setMinimumSize(320, 320);
          mainWindow.setSize(Math.max(320, smokeWidth), Math.max(320, smokeHeight));
          mainWindow.center();
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (process.env.POKEGRID_SMOKE_COLLAPSED === '0' || process.env.POKEGRID_SMOKE_COLLAPSED === '1') {
          await mainWindow.webContents.executeJavaScript(`applySidebarState(${process.env.POKEGRID_SMOKE_COLLAPSED !== '1'})`);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        if (process.env.POKEGRID_SMOKE_FARM === '1') {
          await mainWindow.webContents.executeJavaScript('window.__pokeGridOpenFarm?.()');
          await new Promise((resolve) => setTimeout(resolve, 1_500));
          if (process.env.POKEGRID_SMOKE_FARM_PICKER === '1') {
            await mainWindow.webContents.executeJavaScript("document.querySelector('.farm-target-button')?.click()");
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (process.env.POKEGRID_SMOKE_FARM_SELECT === '1') {
              await mainWindow.webContents.executeJavaScript("document.querySelector('.farm-pokemon-option:not(:disabled)')?.click()");
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }
        if (process.env.POKEGRID_SMOKE_NOTIFICATIONS === '1') {
          await mainWindow.webContents.executeJavaScript('window.__pokeGridPreviewNotifications?.()');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (process.env.POKEGRID_SMOKE_HUNT === '1') {
          await mainWindow.webContents.executeJavaScript('window.__pokeGridPreviewHuntAnalyzer?.(true)');
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (process.env.POKEGRID_SMOKE_CAPTURE_LOG === '1') {
          await mainWindow.webContents.executeJavaScript('window.__pokeGridPreviewCaptureLog?.(true)');
          await new Promise((resolve) => setTimeout(resolve, 500));
          const captureSortResult = await mainWindow.webContents.executeJavaScript(`(() => {
            const select = document.querySelector('.capture-float-sort');
            select.value = 'iv-desc';
            select.dispatchEvent(new Event('change', { bubbles: true }));
            [...document.querySelectorAll('.capture-flat-row')].find((row) =>
              row.querySelector('.capture-flat-name')?.textContent.includes('Magnemite')
            )?.dispatchEvent(new MouseEvent('mouseenter'));
            return {
              names: [...document.querySelectorAll('.capture-flat-name')].map((element) => element.textContent),
              tooltip: document.querySelector('.capture-detail-popover')?.textContent.replace(/\\s+/g, ' ').trim(),
              atlasSprites: document.querySelectorAll('.capture-atlas-sprite').length
            };
          })()`);
          console.log(JSON.stringify({ captureSort: captureSortResult }));
        }
        if (process.env.POKEGRID_SMOKE_FARM_RECOMMENDATIONS === '1') {
          const recommendationResult = await mainWindow.webContents.executeJavaScript('window.__pokeGridPreviewFarmRecommendations?.()');
          const filterResult = await mainWindow.webContents.executeJavaScript(`(() => {
            farmTypeFilter.value = 'fire';
            farmTypeFilter.dispatchEvent(new Event('change', { bubbles: true }));
            const fireNames = [...document.querySelectorAll('.farm-smart-name-row strong')].map((element) => element.textContent);
            resetFarmFiltersButton.click();
            const resetCount = document.querySelectorAll('.farm-pokemon-smart-option').length;
            return { fireNames, resetCount };
          })()`);
          console.log(JSON.stringify({ farmRecommendations: recommendationResult, farmFilters: filterResult }));
          await new Promise((resolve) => setTimeout(resolve, 2_500));
        }
        if (process.env.POKEGRID_SMOKE_FARM_RECOMMENDATIONS === 'accounts') {
          const recommendationResult = await mainWindow.webContents.executeJavaScript('window.__pokeGridPreviewFarmRecommendations?.()');
          await mainWindow.webContents.executeJavaScript('closeFarmPicker()');
          console.log(JSON.stringify({ farmRecommendations: recommendationResult, view: 'accounts' }));
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (process.env.POKEGRID_SMOKE_USERSCRIPTS === '1' || process.env.POKEGRID_SMOKE_USERSCRIPTS === 'save') {
          await mainWindow.webContents.executeJavaScript('window.pokeGridUserScriptManager?.open(-1)');
          await new Promise((resolve) => setTimeout(resolve, 500));
          if (process.env.POKEGRID_SMOKE_USERSCRIPTS === 'save') {
            const saveResult = await mainWindow.webContents.executeJavaScript(`(async () => {
              const code = document.querySelector('#scriptCodeInput');
              code.value = code.value
                .replace('Mi script de PokeGrid', 'IPC Runtime Smoke')
                .replace("console.log('[PokeGrid] Mi script está activo');", "window.__pokeGridUserscriptSmoke = typeof window.pokeGridUserScripts?.request === 'function';");
              document.querySelector('#scriptEditorForm').requestSubmit();
              await new Promise((resolve) => setTimeout(resolve, 1800));
              const webview = document.querySelector('webview');
              const injected = await webview.executeJavaScript('Boolean(window.__pokeGridUserscriptSmoke)');
              return {
                count: document.querySelector('#scriptCount').textContent,
                title: document.querySelector('#scriptEditorName').textContent,
                injected
              };
            })()`);
            console.log(JSON.stringify({ userscriptRuntime: saveResult }));
            if (saveResult.count !== '1' || saveResult.title !== 'IPC Runtime Smoke' || !saveResult.injected) {
              throw new Error(`Userscript runtime smoke failed: ${JSON.stringify(saveResult)}`);
            }
          }
        }
        if (process.env.POKEGRID_SMOKE_EXTENSION_PATH) {
          const extensionResult = await mainWindow.webContents.executeJavaScript(
            `window.pokeGrid.applyUnpackedExtension(${JSON.stringify({
              path: process.env.POKEGRID_SMOKE_EXTENSION_PATH,
              accounts: [true, false, false, false]
            })})`
          );
          console.log(JSON.stringify({ unpackedExtension: extensionResult }));
          if (!extensionResult.ok || extensionResult.results?.[0]?.loaded !== true) {
            throw new Error(`Unpacked extension smoke failed: ${JSON.stringify(extensionResult)}`);
          }
        }
        if (process.env.POKEGRID_SMOKE_MEMORY_CLEANUP === '1') {
          const memoryResult = await mainWindow.webContents.executeJavaScript('window.pokeGrid.cleanupMemory()');
          await new Promise((resolve) => setTimeout(resolve, 250));
          const rendererState = await mainWindow.webContents.executeJavaScript(`({
            panels:document.querySelectorAll('.panel').length,
            webviews:document.querySelectorAll('webview').length,
            bodyVisible:getComputedStyle(document.body).display !== 'none' && document.body.getBoundingClientRect().width > 0,
            title:document.querySelector('.brand h1')?.textContent || document.title
          })`);
          const memoryImage = await mainWindow.capturePage();
          const bitmap = memoryImage.toBitmap();
          const size = memoryImage.getSize();
          const colors = new Set();
          const stepX = Math.max(1, Math.floor(size.width / 30));
          const stepY = Math.max(1, Math.floor(size.height / 20));
          for (let y = 0; y < size.height; y += stepY) {
            for (let x = 0; x < size.width; x += stepX) {
              const offset = (y * size.width + x) * 4;
              colors.add(`${bitmap[offset]}:${bitmap[offset + 1]}:${bitmap[offset + 2]}`);
            }
          }
          const memorySmoke = { result:memoryResult, rendererState, sampledColors:colors.size, imageEmpty:memoryImage.isEmpty() };
          console.log(JSON.stringify({ memoryCleanup:memorySmoke }));
          if (!memoryResult?.ok || memoryResult.strategy !== 'safe-cache-only' || memoryImage.isEmpty() || colors.size < 8 ||
              rendererState.panels !== 4 || rendererState.webviews !== 4 || !rendererState.bodyVisible) {
            throw new Error(`Safe memory cleanup smoke failed: ${JSON.stringify(memorySmoke)}`);
          }
        }
        if (process.env.POKEGRID_SMOKE_POKEPEDIA === '1') {
          const smokePokepediaWindow = createPokepediaWindow();
          let pokepediaState = null;
          let pokepediaLastState = null;
          let pokepediaSmokeError = '';
          const started = Date.now();
          while (!pokepediaState && Date.now() - started < 20_000) {
            try {
              pokepediaState = await smokePokepediaWindow.webContents.executeJavaScript(`(() => {
                const webview = document.querySelector('#pokepediaWebview');
                const declaredUrl = webview?.getAttribute('src') || '';
                return {
                  url: document.body.dataset.pokepediaUrl || declaredUrl,
                  ready: document.body.dataset.pokepediaReady === 'true',
                  error: document.body.dataset.pokepediaError || '',
                  controls: document.querySelectorAll('.pokepedia-window-actions').length,
                  minimizeButtons: document.querySelectorAll('#pokepediaMinimizeButton').length,
                  closeButtons: document.querySelectorAll('#pokepediaCloseButton').length
                };
              })()`);
              pokepediaLastState = pokepediaState;
              if (pokepediaState.controls !== 1 || !pokepediaState.ready ||
                  !pokepediaState.url.startsWith(POKEPEDIA_URL)) pokepediaState = null;
            } catch (error) {
              pokepediaSmokeError = error.message;
            }
            if (!pokepediaState) await new Promise((resolve) => setTimeout(resolve, 200));
          }
          if (!pokepediaState || !pokepediaState.url.startsWith(POKEPEDIA_URL) ||
              pokepediaState.minimizeButtons !== 1 || pokepediaState.closeButtons !== 1 ||
              !smokePokepediaWindow.isFullScreen()) {
            console.error(`Pokepedia smoke failed: ${JSON.stringify({ pokepediaState, pokepediaLastState, pokepediaSmokeError })}`);
            app.exit(1);
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (process.env.POKEGRID_SMOKE_POKEPEDIA_SCREENSHOT) {
            const pokepediaImage = await smokePokepediaWindow.capturePage();
            fs.writeFileSync(process.env.POKEGRID_SMOKE_POKEPEDIA_SCREENSHOT, pokepediaImage.toPNG());
          }
          await smokePokepediaWindow.webContents.executeJavaScript(
            "document.querySelector('#pokepediaMinimizeButton').click()"
          );
          await new Promise((resolve) => setTimeout(resolve, 350));
          if (!smokePokepediaWindow.isMinimized()) throw new Error('El control de minimizar Pokepedia no respondió.');
          smokePokepediaWindow.restore();
          smokePokepediaWindow.setFullScreen(true);
          smokePokepediaWindow.show();
          await new Promise((resolve) => setTimeout(resolve, 250));
          await smokePokepediaWindow.webContents.executeJavaScript(
            "document.querySelector('#pokepediaCloseButton').click()"
          ).catch(() => {});
          await new Promise((resolve) => setTimeout(resolve, 350));
          if (!smokePokepediaWindow.isDestroyed()) throw new Error('El control de cerrar Pokepedia no respondió.');
          console.log(JSON.stringify({ pokepedia: pokepediaState, minimized: true, closed: true }));
        }
        if (process.env.POKEGRID_SMOKE_BROWSER_INSTANCE === '1') {
          await mainWindow.webContents.executeJavaScript(`(() => {
            document.querySelector('#addBrowserInstanceButton').click();
            document.querySelector('#browserInstanceName').value = 'Navegador smoke';
            document.querySelector('#browserInstanceUrl').value = 'https://example.com/';
            document.querySelector('#browserInstanceCount').value = '2';
            document.querySelector('#browserInstanceForm').requestSubmit();
          })()`);
          let browserInstanceState = null;
          const browserStarted = Date.now();
          while (Date.now() - browserStarted < 18_000) {
            browserInstanceState = await mainWindow.webContents.executeJavaScript(`(() => {
              const workspace = document.querySelector('.browser-instance-workspace');
              const views = [...(workspace?.querySelectorAll('webview') || [])];
              return {
                active: Boolean(workspace?.classList.contains('is-active')),
                customViews: views.length,
                primaryViews: document.querySelectorAll('#grid webview').length,
                urls: views.map((view) => view.getURL()),
                partitions: views.map((view) => view.getAttribute('partition')),
                viewHeights: views.map((view) => Math.round(view.getBoundingClientRect().height)),
                hostHeights: [...(workspace?.querySelectorAll('.browser-instance-webview-host') || [])]
                  .map((host) => Math.round(host.getBoundingClientRect().height)),
                tabs: document.querySelectorAll('.instance-tab').length
              };
            })()`);
            if (browserInstanceState.customViews === 2 && browserInstanceState.urls.every((url) => url.startsWith('https://example.com'))) break;
            await new Promise((resolve) => setTimeout(resolve, 350));
          }
          console.log(JSON.stringify({ browserInstance: browserInstanceState }));
          if (!browserInstanceState?.active || browserInstanceState.customViews !== 2 ||
              browserInstanceState.primaryViews !== 4 || browserInstanceState.tabs !== 2 ||
              !browserInstanceState.urls.every((url) => url.startsWith('https://example.com')) ||
              browserInstanceState.viewHeights.some((height, index) => height < 240 || Math.abs(height - browserInstanceState.hostHeights[index]) > 2) ||
              new Set(browserInstanceState.partitions).size !== 2) {
            throw new Error(`Browser instance smoke failed: ${JSON.stringify(browserInstanceState)}`);
          }
        }
        const image = await mainWindow.capturePage();
        fs.writeFileSync(process.env.POKEGRID_SMOKE_SCREENSHOT, image.toPNG());
        app.quit();
      }, 8_000);
    }
    if (process.env.POKEGRID_DIAGNOSTIC_GAME === '1') {
      const diagnosticDelay = Math.max(15_000, Math.min(120_000, Number(process.env.POKEGRID_DIAGNOSTIC_DELAY_MS) || 45_000));
      setTimeout(async () => {
        try {
          let diagnostics = await mainWindow.webContents.executeJavaScript('window.__pokeGridCollectGameDiagnostics?.()');
          if (process.env.POKEGRID_DIAGNOSTIC_COMPACT === '1' && Array.isArray(diagnostics)) {
            diagnostics = diagnostics.map((entry) => ({
              index: entry.index,
              account: entry.account,
              launcherState: entry.launcherState,
              connectionFailures: entry.connectionFailures,
              lastFailure: entry.lastFailure,
              url: entry.guest?.url || '',
              readyState: entry.guest?.readyState || '',
              loadingWorld: Boolean(entry.guest?.loadingWorld),
              connectingChat: Boolean(entry.guest?.connectingChat),
              canvases: entry.guest?.canvases || [],
              textSample: entry.guest?.textSample || '',
              errors: (entry.console || []).filter((message) => Number(message.level) >= 3).slice(-8),
              diagnosticError: entry.error || ''
            }));
          }
          console.log(JSON.stringify({ gameDiagnostics: diagnostics }));
        } catch (error) {
          console.error(`Game diagnostics failed: ${error.stack || error.message}`);
          app.exitCode = 1;
        } finally {
          app.quit();
        }
      }, diagnosticDelay);
    }
  });
  mainWindow.on('closed', () => {
    if (pokepediaWindow && !pokepediaWindow.isDestroyed()) pokepediaWindow.close();
    mainWindow = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;

  const isBrowserInstance = browserInstanceSessions.has(contents.session);

  contents.setWindowOpenHandler(({ url }) => {
    if (isBrowserInstance || !isGameUrl(url)) openExternal(url);
    return { action: 'deny' };
  });

  const guardNavigation = (event, url) => {
    if (isBrowserInstance) {
      try {
        const target = new URL(url);
        if (target.protocol === 'https:' && !target.username && !target.password) return;
      } catch {}
    } else if (isGameUrl(url)) return;
    event.preventDefault();
    openExternal(url);
  };

  contents.on('will-navigate', guardNavigation);
  contents.on('will-redirect', guardNavigation);
});

ipcMain.handle('pokepedia:open', (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return { ok: false, error: 'Solicitud de Pokepedia no autorizada.' };
  }
  createPokepediaWindow();
  return { ok: true };
});

ipcMain.on('pokepedia:minimize', (event) => {
  if (!pokepediaWindow || pokepediaWindow.isDestroyed() || event.sender !== pokepediaWindow.webContents) return;
  pokepediaWindow.minimize();
});

ipcMain.on('pokepedia:close', (event) => {
  if (!pokepediaWindow || pokepediaWindow.isDestroyed() || event.sender !== pokepediaWindow.webContents) return;
  pokepediaWindow.close();
});

ipcMain.handle('accounts:load', () => {
  try {
    return { ok: true, ...syncAccountsFromSource() };
  } catch (error) {
    return { ok: false, accounts: normalizeAccounts([]), error: error.message };
  }
});

ipcMain.handle('accounts:sync-source', () => {
  try {
    return { ok: true, ...syncAccountsFromSource() };
  } catch (error) {
    const config = readAccountSourceConfig();
    return { ok: false, changed: false, accounts: readAccounts(), sourcePath: config?.sourcePath || '', error: error.message };
  }
});

ipcMain.handle('accounts:save', (_event, accounts) => {
  try {
    writeAccounts(accounts);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('accounts:download-template', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar plantilla de cuentas',
    defaultPath: 'PokeGrid-cuentas-plantilla.txt',
    filters: [{ name: 'Archivo de texto', extensions: ['txt'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  try {
    fs.writeFileSync(result.filePath, accountTemplateText(), 'utf8');
    return { ok: true, file: path.basename(result.filePath) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('accounts:import-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar las cuatro cuentas',
    properties: ['openFile'],
    filters: [{ name: 'Plantilla de cuentas', extensions: ['txt'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  try {
    const file = path.resolve(result.filePaths[0]);
    if (fs.statSync(file).size > 64 * 1024) throw new Error('El archivo supera el límite de 64 KB.');
    const accounts = parseAccountsTemplate(fs.readFileSync(file, 'utf8'));
    writeAccounts(accounts);
    writeAccountSourceConfig(file, fs.statSync(file).mtimeMs);
    return { ok: true, accounts, file: path.basename(file), sourcePath: file, linked: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('assets:image-data-url', (_event, url) => loadAllowedImageDataUrl(url));
ipcMain.handle('app:check-update', async (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return { ok: false, error: 'Solicitud de actualización no autorizada.' };
  }
  if (!app.isPackaged && !process.env.POKEGRID_ALLOW_DEV_UPDATE_CHECK) {
    return { ok: true, status: 'development', currentVersion: app.getVersion() };
  }
  try {
    const prepared = await prepareUpdate({
      app,
      net,
      currentVersion: app.getVersion(),
      onProgress: (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('app:update-progress', progress);
      }
    });
    if (prepared.status !== 'ready') return { ok: true, ...prepared };
    const launched = launchPreparedUpdate({ app, prepared });
    setTimeout(() => app.quit(), 350);
    return { ok: true, status: 'installing', currentVersion: app.getVersion(), latestVersion: prepared.latestVersion, ...launched };
  } catch (error) {
    return { ok: false, error: error.message || 'No se pudo completar la actualización.' };
  }
});
ipcMain.handle('app:cleanup-memory', async () => {
  try {
    const before = app.getAppMetrics().reduce((total, metric) => total + Number(metric.memory?.workingSetSize || 0), 0);
    const cachedEntries = remoteImageCache.size + pokeApiSpeciesCache.size;
    remoteImageCache.clear();
    pokeApiSpeciesCache.clear();
    const targets = webContents.getAllWebContents().filter((contents) =>
      !contents.isDestroyed() && ['window', 'webview'].includes(contents.getType()));
    // No se adjunta el depurador ni se fuerza el GC de Chromium: ambas operaciones pueden
    // invalidar la superficie gráfica de webviews activas y dejar la ventana completamente negra.
    // Las cachés que controla PokeGrid se limpian arriba; los procesos de juego permanecen intactos.
    await new Promise((resolve) => setTimeout(resolve, 40));
    const after = app.getAppMetrics().reduce((total, metric) => total + Number(metric.memory?.workingSetSize || 0), 0);
    return {
      ok: true,
      strategy: 'safe-cache-only',
      cachedEntries,
      collectedProcesses: 0,
      preservedProcesses: targets.length,
      skippedProcesses: targets.length,
      beforeMb: Math.round(before / 1024),
      afterMb: Math.round(after / 1024),
      releasedMb: Math.max(0, Math.round((before - after) / 1024))
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('assets:pokemon-species', (_event, slug) => resolvePokeApiSpecies(slug));
ipcMain.handle('userscripts:list', () => {
  try { return { ok: true, scripts: readUserScripts() }; } catch (error) {
    return { ok: false, scripts: [], error: error.message };
  }
});
ipcMain.handle('userscripts:validate-syntax', (_event, code) => {
  try {
    const source = String(code || '').slice(0, USER_SCRIPT_CODE_LIMIT);
    new vm.Script(`async function __pokeGridValidateUserscript__() {\n${source}\n}`, {
      filename: 'pokegrid-editor-validation.js', displayErrors: true
    });
    return { ok: true, lines: source.split('\n').length };
  } catch (error) {
    const line = Number(String(error.stack || '').match(/pokegrid-editor-validation\.js:(\d+)/)?.[1]) || null;
    const message = String(error.message || 'Sintaxis JavaScript no válida.')
      .replace(/^Failed to construct ['"]ContextifyScript['"]:\s*/i, '');
    return { ok: false, error: message, line: line ? Math.max(1, line - 1) : null };
  }
});
ipcMain.handle('userscripts:save', (_event, value) => {
  try { return { ok: true, script: saveUserScript(value), scripts: readUserScripts() }; } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:delete', (_event, id) => {
  try { removeUserScript(id); return { ok: true, scripts: readUserScripts() }; } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:import-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importar userscript',
    properties: ['openFile'],
    filters: [
      { name: 'Userscripts', extensions: ['js'] },
      { name: 'JavaScript', extensions: ['js'] }
    ]
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  try {
    const file = result.filePaths[0];
    if (fs.statSync(file).size > USER_SCRIPT_CODE_LIMIT) throw new Error('El archivo supera 1 MB.');
    return { ok: true, code: fs.readFileSync(file, 'utf8'), sourceUrl: pathToFileURL(file).href };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:export-file', async (_event, value) => {
  try {
    const code = String(value?.code || '');
    if (!code.trim()) throw new Error('El script está vacío.');
    if (Buffer.byteLength(code, 'utf8') > USER_SCRIPT_CODE_LIMIT) throw new Error('El archivo supera 1 MB.');
    const baseName = String(value?.suggestedName || 'PokeGrid-userscript')
      .replace(/(?:\.user)?\.js$/i, '')
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
      .replace(/[. ]+$/g, '')
      .trim()
      .slice(0, 100) || 'PokeGrid-userscript';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar userscript',
      defaultPath: `${baseName}.user.js`,
      filters: [
        { name: 'Userscript JavaScript', extensions: ['js'] }
      ]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    const filePath = /\.js$/i.test(result.filePath) ? result.filePath : `${result.filePath}.user.js`;
    fs.writeFileSync(filePath, code, 'utf8');
    return { ok: true, file: path.basename(filePath) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:bundled-telegram', () => {
  try {
    const filename = 'PokeGrid-Telegram-Alerts.user.js';
    const file = path.join(bundledUserScriptsPath(), filename);
    if (!fs.existsSync(file)) throw new Error('No se encontró el módulo de alertas Telegram.');
    if (fs.statSync(file).size > USER_SCRIPT_CODE_LIMIT) throw new Error('El módulo supera 1 MB.');
    return {
      ok: true,
      code: fs.readFileSync(file, 'utf8'),
      sourceUrl: `pokegrid-bundled://${filename}`
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:fetch-url', async (_event, url) => {
  try { return { ok: true, ...(await readUserScriptFromUrl(url)) }; } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:shop-catalog', async (_event, refresh) => {
  try {
    const catalog = await loadScriptShopCatalog(Boolean(refresh));
    return { ok: true, catalog, scripts: readUserScripts(), launcherVersion: app.getVersion() };
  } catch (error) {
    return { ok: false, catalog: null, scripts: readUserScripts(), error: error.message };
  }
});
ipcMain.handle('userscripts:shop-install', async (_event, value) => {
  try { return { ok: true, ...(await installScriptShopItem(value)) }; } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:shop-uninstall', (_event, shopId) => {
  try { return { ok: true, ...uninstallScriptShopItem(shopId) }; } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('userscripts:guest-preload', () => pathToFileURL(path.join(__dirname, 'guest-preload.js')).href);
ipcMain.handle('userscripts:request', performUserScriptRequest);
ipcMain.handle('userscripts:shared-get', getUserScriptSharedValue);
ipcMain.handle('userscripts:shared-set', setUserScriptSharedValue);
ipcMain.handle('userscripts:shared-delete', deleteUserScriptSharedValue);
ipcMain.handle('extensions:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar extensión desempaquetada',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  try {
    const validation = validateUnpackedExtensionPath(result.filePaths[0]);
    return {
      ok: true,
      path: validation.extensionPath,
      manifest: { name: validation.manifest.name, version: validation.manifest.version }
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('extensions:status', () => ({
  ok: true,
  config: readExtensionConfig(),
  results: loadedUnpackedExtensions.map((entry, account) => ({
    account,
    loaded: Boolean(entry),
    name: entry?.name || '',
    id: entry?.id || ''
  }))
}));
ipcMain.handle('extensions:apply', async (_event, value) => {
  try { return { ok: true, ...(await applyUnpackedExtensionConfig(value, true)) }; } catch (error) {
    return { ok: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  app.userAgentFallback = app.userAgentFallback
    .replace(/ Electron\/[\d.]+/, '')
    .replace(/(Chrome\/\d+)[\d.]+/, '$1.0.0.0');
  await configureGameSessions();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
