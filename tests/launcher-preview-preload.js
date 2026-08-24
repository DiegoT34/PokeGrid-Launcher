const { contextBridge } = require('electron');
const vm = require('node:vm');

let userScripts = [];
const previewImageCache = new Map();
const previewSpeciesCache = new Map();

async function previewImageDataUrl(rawUrl) {
  const url = new URL(String(rawUrl || ''));
  const match = url.pathname.match(/^\/PokeAPI\/sprites\/master\/sprites\/pokemon\/(?:other\/official-artwork\/)?([1-9]\d{0,3})\.png$/);
  if (url.hostname !== 'raw.githubusercontent.com' || !match) {
    throw new Error('Sprite externo no permitido en preview.');
  }
  if (!previewImageCache.has(url.href)) {
    const speciesId = match[1];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="42" fill="#123b4a"/><path d="M8 48h80" stroke="#d8f8ee" stroke-width="7"/><circle cx="48" cy="48" r="15" fill="#d8f8ee" stroke="#123b4a" stroke-width="6"/><text x="48" y="88" fill="#59dbac" font-family="sans-serif" font-size="13" font-weight="700" text-anchor="middle">#${speciesId}</text></svg>`;
    previewImageCache.set(url.href, Promise.resolve(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`));
  }
  return previewImageCache.get(url.href);
}

async function previewPokemonSpecies(rawSlug) {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) throw new Error('Especie inválida.');
  if (!previewSpeciesCache.has(slug)) {
    const ids = {
      blastoise: 9, clefable: 36, noctowl: 164, crobat: 169, pidgeot: 18,
      scyther: 123, skarmory: 227, wigglytuff: 40, jynx: 124
    };
    previewSpeciesCache.set(slug, Promise.resolve({ id: ids[slug] || 0, name: slug }));
  }
  return previewSpeciesCache.get(slug);
}

function normalizePreviewScript(value) {
  const metadata = {};
  const block = String(value.code || '').match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/i)?.[1] || '';
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*\/\/\s*@([\w:-]+)\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    (metadata[key] ||= []).push(match[2]);
  }
  const existing = userScripts.find((script) => script.id === value.id);
  return {
    id: existing?.id || value.id || `preview-${Date.now()}`,
    name: metadata.name?.[0] || 'Script sin nombre',
    namespace: metadata.namespace?.[0] || 'pokegrid.local',
    version: metadata.version?.[0] || '1.0.0',
    description: metadata.description?.[0] || '',
    author: metadata.author?.[0] || '',
    sourceUrl: value.sourceUrl || existing?.sourceUrl || '',
    code: value.code,
    enabled: value.enabled !== false,
    accounts: Array.from({ length: 4 }, (_, index) => value.accounts?.[index] !== false),
    matches: [...(metadata.match || []), ...(metadata.include || [])],
    excludes: metadata.exclude || [],
    grants: metadata.grant || [],
    connects: metadata.connect || [],
    runAt: metadata['run-at']?.[0] || 'document-end',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

contextBridge.exposeInMainWorld('pokeGrid', {
  previewMode: true,
  loadAccounts: async () => ({
    ok: true,
    accounts: Array.from({ length: 4 }, (_, index) => ({
      label: ['SHOCKVOR', 'SHOCKOR', 'DIEGO20', 'SHOCKVINY'][index],
      username: '',
      password: ''
    }))
  }),
  saveAccounts: async () => ({ ok: true }),
  syncAccountsSource: async () => ({ ok: true, changed: false, accounts: [], sourcePath: '' }),
  downloadAccountsTemplate: async () => ({ ok: false, canceled: true }),
  importAccountsFile: async () => ({
    ok: true,
    file: 'cuentas-prueba.txt',
    sourcePath: 'C:\\Datos\\PokeGrid\\cuentas-prueba.txt',
    accounts: Array.from({ length: 4 }, (_, index) => ({
      label: `IMPORTADA ${index + 1}`,
      username: `usuario${index + 1}`,
      password: `clave=${index + 1}`
    }))
  }),
  cleanupMemory: async () => ({ ok: true, cachedEntries: 3, collectedProcesses: 5, skippedProcesses: 0, beforeMb: 300, afterMb: 275, releasedMb: 25 }),
  getAppVersion: async () => '0.22.7',
  checkForUpdates: async () => ({ ok: true, status: 'current', currentVersion: '0.21.0', latestVersion: '0.21.0' }),
  onUpdateProgress: () => () => {},
  openPokepedia: async () => ({ ok: true }),
  loadImageDataUrl: previewImageDataUrl,
  resolvePokemonSpecies: previewPokemonSpecies,
  loadUserScripts: async () => ({ ok: true, scripts: userScripts }),
  validateUserScriptSyntax: async (code) => {
    try {
      const source = String(code || '');
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
  },
  saveUserScript: async (value) => {
    const script = normalizePreviewScript(value);
    userScripts = [script, ...userScripts.filter((candidate) => candidate.id !== script.id)];
    return { ok: true, script, scripts: userScripts };
  },
  deleteUserScript: async (id) => {
    userScripts = userScripts.filter((script) => script.id !== id);
    return { ok: true, scripts: userScripts };
  },
  importUserScriptFile: async () => ({ ok: false, canceled: true }),
  exportUserScriptFile: async () => ({ ok: true, file: 'Smoke-Script.user.js' }),
  loadBundledTelegramAlerts: async () => ({
    ok: true,
    code: `// ==UserScript==
// @name PokeGrid Telegram Alerts
// @namespace pokegrid.telegram-alerts
// @version 1.0.0
// @match https://poke.idleworld.online/*
// @grant PokeGrid_sharedStorage
// ==/UserScript==
window.__telegramPreview = true;`,
    sourceUrl: 'pokegrid-bundled://PokeGrid-Telegram-Alerts.user.js'
  }),
  fetchUserScriptUrl: async () => ({ ok: false, error: 'No disponible en preview.' }),
  loadScriptShop: async () => ({
    ok: true,
    launcherVersion: '0.22.0',
    scripts: userScripts,
    catalog: { schemaVersion: 1, updatedAt: '2026-08-24', scripts: [{
      id: 'market-helper', name: 'Market Helper', namespace: 'pokegrid.shop.market-helper', version: '1.2.0',
      author: 'DiegoT34', summary: 'Herramientas visuales y datos útiles para el mercado.',
      description: 'Añade utilidades de consulta sin modificar operaciones del mercado.', category: 'Market',
      tags: ['market', 'interfaz'], permissions: ['Lee tarjetas visibles del mercado'], minLauncherVersion: '0.22.0',
      downloadUrl: 'https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/scripts/market-helper.user.js',
      sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', homepage: '',
      changelog: 'Nueva tarjeta informativa.', icon: '🛒', featured: true, publishedAt: '2026-08-24T00:00:00Z'
    }] }
  }),
  installScriptShopItem: async () => ({ ok: false, error: 'No disponible en preview.' }),
  uninstallScriptShopItem: async () => ({ ok: false, error: 'No disponible en preview.' }),
  getGuestPreloadUrl: async () => '',
  pickUnpackedExtension: async () => ({ ok: false, canceled: true }),
  getUnpackedExtensionStatus: async () => ({
    ok: true,
    config: { path: '', accounts: [false, false, false, false] },
    results: []
  }),
  applyUnpackedExtension: async (config) => ({
    ok: true,
    config,
    manifest: null,
    results: config.accounts.map((loaded, account) => ({ account, loaded, name: loaded ? 'Preview Extension' : '' }))
  })
});
