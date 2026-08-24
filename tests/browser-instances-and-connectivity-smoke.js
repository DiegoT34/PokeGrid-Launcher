const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-browser-instances-smoke-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.__pokeGridConnectivitySnapshot && document.querySelectorAll(".panel").length === 4');

    const topbarState = await window.webContents.executeJavaScript(`(async () => {
      const appbar = document.querySelector('#appbar');
      const grid = document.querySelector('#grid');
      const initialTop = Math.round(grid.getBoundingClientRect().top);
      document.querySelector('#topbarCollapseButton').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const collapsed = {
        className: appbar.classList.contains('is-topbar-collapsed'),
        bodyClass: document.body.classList.contains('is-topbar-collapsed'),
        height: Math.round(appbar.getBoundingClientRect().height),
        gridTop: Math.round(grid.getBoundingClientRect().top),
        brandDisplay: getComputedStyle(document.querySelector('.brand')).display,
        persisted: localStorage.getItem('launcherTopbarCollapsed')
      };
      document.querySelector('#topbarCollapseButton').click();
      document.querySelector('#accountsButton').click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const modalZ = Number(getComputedStyle(document.querySelector('#modalBackdrop')).zIndex);
      const appbarZ = Number(getComputedStyle(appbar).zIndex);
      document.querySelector('#closeModalButton').click();
      return { initialTop, collapsed, modalZ, appbarZ };
    })()`);
    if (!topbarState.collapsed.className || !topbarState.collapsed.bodyClass ||
      topbarState.collapsed.height > 26 || topbarState.collapsed.gridTop >= topbarState.initialTop ||
      topbarState.collapsed.brandDisplay !== 'none' || topbarState.collapsed.persisted !== '1' ||
      topbarState.modalZ <= topbarState.appbarZ) {
      throw new Error(`Topbar collapse or modal layering failed: ${JSON.stringify(topbarState)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      document.querySelector('#addBrowserInstanceButton').click();
      document.querySelector('#browserInstanceName').value = 'Juego de prueba';
      document.querySelector('#browserInstanceUrl').value = 'https://example.test/game';
      document.querySelector('#browserInstanceCount').value = '3';
      document.querySelector('#browserInstanceForm').requestSubmit();
    })()`);
    await waitFor(window, 'document.querySelector(".browser-instance-workspace[data-instance-id]")?.querySelectorAll("webview").length === 3');

    const createdState = await window.webContents.executeJavaScript(`(() => {
      const custom = document.querySelector('.browser-instance-workspace[data-instance-id]');
      const id = custom.dataset.instanceId;
      const primary = document.querySelector('#grid');
      const tabs = [...document.querySelectorAll('.instance-tab')];
      const partitions = [...custom.querySelectorAll('webview')].map((view) => view.getAttribute('partition'));
      const firstHostRect = custom.querySelector('.browser-instance-webview-host').getBoundingClientRect();
      const firstViewRect = custom.querySelector('webview').getBoundingClientRect();
      const snapshot = window.__pokeGridConnectivitySnapshot();
      document.querySelector('.instance-tab[data-instance-id="poke-idle-world"]').click();
      const retainedWhileHidden = custom.querySelectorAll('webview').length;
      document.querySelector('.instance-tab[data-instance-id="' + id + '"]').click();
      return {
        id,
        active: custom.classList.contains('is-active'),
        primaryRetained: primary.querySelectorAll('webview').length,
        retainedWhileHidden,
        tabCount: tabs.length,
        saved: JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]'),
        savedActive: localStorage.getItem('pokegrid:active-browser-instance:v1'),
        partitions,
        snapshotCount: snapshot.length,
        independentPartitions: new Set(partitions).size,
        firstHostHeight: Math.round(firstHostRect.height),
        firstViewHeight: Math.round(firstViewRect.height),
        fillsHost: Math.abs(firstHostRect.height - firstViewRect.height) <= 2
      };
    })()`);
    if (!createdState.active || createdState.primaryRetained !== 4 || createdState.retainedWhileHidden !== 3 ||
      createdState.tabCount !== 2 || createdState.saved.length !== 1 || createdState.saved[0].count !== 3 ||
      createdState.savedActive !== createdState.id || createdState.snapshotCount !== 7 ||
      createdState.independentPartitions !== 3 ||
      !createdState.fillsHost || createdState.firstViewHeight < 300 ||
      !createdState.partitions.every((partition) => partition.startsWith('persist:pokegrid-instance-'))) {
      throw new Error(`Browser instance creation failed: ${JSON.stringify(createdState)}`);
    }

    window.webContents.reload();
    await waitFor(window, 'window.__pokeGridConnectivitySnapshot && document.querySelectorAll(".panel").length === 4 && document.querySelectorAll(".browser-instance-workspace webview").length === 3');
    const restoredState = await window.webContents.executeJavaScript(`(() => {
      const recoveryAccepted = window.__pokeGridScheduleRecoveryPreview(0);
      const recovery = window.__pokeGridConnectivitySnapshot()[0];
      return {
        customWorkspaces: document.querySelectorAll('.browser-instance-workspace').length,
        customViews: document.querySelectorAll('.browser-instance-workspace webview').length,
        activeName: document.querySelector('.instance-workspace.is-active')?.getAttribute('aria-label'),
        tabs: document.querySelectorAll('.instance-tab').length,
        connectivityRows: window.__pokeGridConnectivitySnapshot().length,
        primaryStillMounted: document.querySelectorAll('#grid .panel').length,
        recoveryAccepted,
        recoveryScheduled: recovery.recoveryScheduled,
        recoveryFailures: recovery.failures,
        recoveryReason: recovery.lastFailure?.reason || ''
      };
    })()`);
    if (restoredState.customWorkspaces !== 1 || restoredState.customViews !== 3 ||
      !restoredState.activeName.includes('Juego de prueba') || restoredState.tabs !== 2 ||
      restoredState.connectivityRows !== 7 || restoredState.primaryStillMounted !== 4 ||
      !restoredState.recoveryAccepted || !restoredState.recoveryScheduled ||
      restoredState.recoveryFailures !== 1 || !restoredState.recoveryReason.includes('Prueba controlada')) {
      throw new Error(`Browser instance persistence failed: ${JSON.stringify(restoredState)}`);
    }

    console.log(JSON.stringify({ topbarState, createdState, restoredState }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
