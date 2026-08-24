const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeGrid', {
  previewMode: false,
  diagnosticDisabledScriptPattern: String(process.env.POKEGRID_DIAGNOSTIC_DISABLE_SCRIPT_PATTERN || ''),
  loadAccounts: () => ipcRenderer.invoke('accounts:load'),
  syncAccountsSource: () => ipcRenderer.invoke('accounts:sync-source'),
  saveAccounts: (accounts) => ipcRenderer.invoke('accounts:save', accounts),
  downloadAccountsTemplate: () => ipcRenderer.invoke('accounts:download-template'),
  importAccountsFile: () => ipcRenderer.invoke('accounts:import-file'),
  cleanupMemory: () => ipcRenderer.invoke('app:cleanup-memory'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-update'),
  onUpdateProgress: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('app:update-progress', handler);
    return () => ipcRenderer.removeListener('app:update-progress', handler);
  },
  openPokepedia: () => ipcRenderer.invoke('pokepedia:open'),
  loadImageDataUrl: (url) => ipcRenderer.invoke('assets:image-data-url', url),
  resolvePokemonSpecies: (slug) => ipcRenderer.invoke('assets:pokemon-species', slug),
  loadUserScripts: () => ipcRenderer.invoke('userscripts:list'),
  validateUserScriptSyntax: (code) => ipcRenderer.invoke('userscripts:validate-syntax', code),
  saveUserScript: (script) => ipcRenderer.invoke('userscripts:save', script),
  deleteUserScript: (id) => ipcRenderer.invoke('userscripts:delete', id),
  importUserScriptFile: () => ipcRenderer.invoke('userscripts:import-file'),
  exportUserScriptFile: (value) => ipcRenderer.invoke('userscripts:export-file', value),
  loadBundledTelegramAlerts: () => ipcRenderer.invoke('userscripts:bundled-telegram'),
  fetchUserScriptUrl: (url) => ipcRenderer.invoke('userscripts:fetch-url', url),
  loadScriptShop: (refresh = false) => ipcRenderer.invoke('userscripts:shop-catalog', Boolean(refresh)),
  installScriptShopItem: (value) => ipcRenderer.invoke('userscripts:shop-install', value),
  uninstallScriptShopItem: (shopId) => ipcRenderer.invoke('userscripts:shop-uninstall', shopId),
  getGuestPreloadUrl: () => ipcRenderer.invoke('userscripts:guest-preload'),
  pickUnpackedExtension: () => ipcRenderer.invoke('extensions:pick-folder'),
  getUnpackedExtensionStatus: () => ipcRenderer.invoke('extensions:status'),
  applyUnpackedExtension: (config) => ipcRenderer.invoke('extensions:apply', config)
});
