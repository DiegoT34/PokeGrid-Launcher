const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pokeGridUserScripts', Object.freeze({
  request: (scriptId, details) => ipcRenderer.invoke('userscripts:request', scriptId, details),
  getSharedValue: (scriptId, key) => ipcRenderer.invoke('userscripts:shared-get', scriptId, key),
  setSharedValue: (scriptId, key, value) => ipcRenderer.invoke('userscripts:shared-set', scriptId, key, value),
  deleteSharedValue: (scriptId, key) => ipcRenderer.invoke('userscripts:shared-delete', scriptId, key)
}));
