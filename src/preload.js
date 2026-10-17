const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeGrid', {
  previewMode: false,
  diagnosticDisabledScriptPattern: String(process.env.POKEGRID_DIAGNOSTIC_DISABLE_SCRIPT_PATTERN || ''),
  loadAccounts: () => ipcRenderer.invoke('accounts:load'),
  syncAccountsSource: () => ipcRenderer.invoke('accounts:sync-source'),
  saveAccounts: (accounts) => ipcRenderer.invoke('accounts:save', accounts),
  downloadAccountsTemplate: () => ipcRenderer.invoke('accounts:download-template'),
  importAccountsFile: () => ipcRenderer.invoke('accounts:import-file'),
  unlinkAccountsSource: () => ipcRenderer.invoke('accounts:unlink-source'),
  restoreAccountsBackup: () => ipcRenderer.invoke('accounts:restore-backup'),
  setInstanceShortcut: (atajo) => ipcRenderer.invoke('instancia:atajo', atajo),
  setInstanceZoom: (id, factor) => ipcRenderer.invoke('instancia:zoom', Number(id), Number(factor)),
  setWindowFullScreen: (activa) => ipcRenderer.invoke('instancia:pantalla-completa', Boolean(activa)),
  setInstanceApertura: (particion, modo) => ipcRenderer.invoke('instancia:apertura', { particion, modo }),
  descargarIcono: (url) => ipcRenderer.invoke('instancia:icono', String(url || '')),
  // Decirle a una pantalla que se duerma o que corra. `duerme = true` la duerme. OJO al nombre: en
  // Electron `setBackgroundThrottling(true)` significa DORMIR, no despertar. La primera version de
  // esto se lo tomaba al reves y dormia justo la pantalla que estabas mirando.
  // El renderer no tiene `electron`, así que el id de webContents viaja hasta el proceso principal,
  // que es el único que puede tocar al invitado.
  duermirPanel: (id, duerme) => ipcRenderer.invoke('instancia:atenuar', Number(id), Boolean(duerme)),
  borrarParticionDeInstancia: (particion) => ipcRenderer.invoke('instancia:borrar-particion', String(particion || '')),
  borrarParticionesPendientes: () => ipcRenderer.invoke('instancia:borrar-particiones-pendientes'),
  onDescansoCambiado: (listener) => {
    const wrapped = (_event, datos) => listener(datos || {});
    ipcRenderer.on('instancia:descanso-cambiado', wrapped);
    return () => ipcRenderer.removeListener('instancia:descanso-cambiado', wrapped);
  },
  onPeticionPestana: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:peticion-pestana', handler);
    return () => ipcRenderer.removeListener('instancia:peticion-pestana', handler);
  },
  cleanupMemory: () => ipcRenderer.invoke('app:cleanup-memory'),
  loadProxyResults: () => ipcRenderer.invoke('app:proxy-results'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-update'),
  peekForUpdates: () => ipcRenderer.invoke('app:peek-update'),
  onUpdateProgress: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('app:update-progress', handler);
    return () => ipcRenderer.removeListener('app:update-progress', handler);
  },
  onInstanceShortcutPressed: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:alternar-pantalla-completa', handler);
    return () => ipcRenderer.removeListener('instancia:alternar-pantalla-completa', handler);
  },
  onInstanceEscapePressed: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:salir-pantalla-completa', handler);
    return () => ipcRenderer.removeListener('instancia:salir-pantalla-completa', handler);
  },
  onInstanceZoomApplied: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:zoom-aplicado', handler);
    return () => ipcRenderer.removeListener('instancia:zoom-aplicado', handler);
  },
  onWindowFullScreenChange: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:pantalla-completa-cambio', handler);
    return () => ipcRenderer.removeListener('instancia:pantalla-completa-cambio', handler);
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
