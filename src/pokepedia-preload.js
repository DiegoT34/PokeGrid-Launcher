const { ipcRenderer } = require('electron');

function connectPokepediaWindowControls() {
  document.querySelector('#pokepediaMinimizeButton')?.addEventListener('click', () => {
    ipcRenderer.send('pokepedia:minimize');
  });
  document.querySelector('#pokepediaCloseButton')?.addEventListener('click', () => {
    ipcRenderer.send('pokepedia:close');
  });
  const webview = document.querySelector('#pokepediaWebview');
  webview?.addEventListener('dom-ready', () => {
    document.body.dataset.pokepediaReady = 'true';
    try {
      document.body.dataset.pokepediaUrl = webview.getURL();
    } catch {
      document.body.dataset.pokepediaUrl = webview.getAttribute('src') || '';
    }
  });
  webview?.addEventListener('did-fail-load', (event) => {
    if (!event.isMainFrame) return;
    document.body.dataset.pokepediaError = `${event.errorCode}: ${event.errorDescription}`;
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', connectPokepediaWindowControls, { once: true });
} else {
  connectPokepediaWindowControls();
}
