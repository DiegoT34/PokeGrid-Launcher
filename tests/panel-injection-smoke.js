const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    webPreferences: { contextIsolation: false, sandbox: false }
  });
  window.webContents.on('console-message', (event) => {
    console.error(`[fixture:${event.level}] ${event.message}`);
  });

  try {
    await window.loadFile(path.join(__dirname, 'panel-injection-fixture.html'));
    const themeSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'game-theme.js'), 'utf8');
    await window.webContents.executeJavaScript(themeSource);
    const installResult = await window.webContents.executeJavaScript('window.pokeGridTheme.buildInstallScript()')
      .then((script) => window.webContents.executeJavaScript(`(() => {
        try { return (0, eval)(${JSON.stringify(script)}); }
        catch (error) { return { error: error.message, stack: error.stack }; }
      })()`));
    if (installResult?.error) throw new Error(`Theme install failed: ${installResult.stack || installResult.error}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await window.webContents.executeJavaScript(`(() => {
      const slot = document.createElement('div');
      slot.className = 'team-slot';
      slot.innerHTML = '<img alt="Bulbasaur"><strong>Bulbasaur</strong><span>HP</span><progress value="70" max="100"></progress>';
      document.querySelector('.team-panel').appendChild(slot);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = await window.webContents.executeJavaScript(`({
      installResult: ${JSON.stringify(installResult)},
      hasStyle: Boolean(document.querySelector('#pg-dock-theme-style')),
      dockNative: document.querySelector('.game-dock')?.dataset.pgThemed !== 'true' &&
        !document.querySelector('.game-dock .pg-dock-label, .game-dock .pg-dock-close, .pg-dock-burger, .pg-dock-top-toggle, .pg-dock-backdrop'),
      teamUntouched: !document.querySelector('.team-panel[data-pg-team-panel="true"], .team-panel .pg-team-slot, .pg-team-side-toggle'),
      profileUntouched: !document.querySelector('.profile-dialog[data-pg-profile-dialog="true"], .profile-dialog[data-pg-surface="true"]'),
      captureManagementUntouched: !document.querySelector('.capture-dialog[data-pg-capture-management="true"], .capture-dialog[data-pg-surface="true"], .capture-dialog .pg-cm-view-switch'),
      autoHelperUntouched: !document.querySelector('[data-pg-auto-dialog="true"], .auto-helper-dialog[data-pg-surface="true"]'),
      nativeTeamSlots: document.querySelectorAll('.team-panel > .team-slot').length === 3,
      appendedSlotClass: document.querySelector('.team-panel > .team-slot:last-child')?.className,
      playerHudPreserved: getComputedStyle(document.querySelector('.player-hud')).display !== 'none',
      noGeneratedPanelElements: !document.querySelector('.pg-team-generated, .pg-cm-content, .pg-cm-view-switch, .pg-auto-synthetic-header'),
      dockCssRemoved: !document.querySelector('#pg-dock-theme-style').textContent.includes('.game-dock'),
      observerActive: Boolean(window.__pgDockThemeObserver),
      teamObserverInactive: !window.__pgTeamPanelObserver,
      floatingActive: document.documentElement.classList.contains('pg-floating-active'),
      nativeCssRemoved: !/(?:\\.clog-|\\[data-pg-clog|\\.pg-hunt-|\\[data-pg-hunt-dialog|\\.pg-profile-|\\[data-pg-profile-dialog|\\.pg-auto-|\\[data-pg-auto|\\.pg-team-|\\[data-pg-team|\\.pg-cm-|\\[data-pg-capture-management)/i.test(document.querySelector('#pg-dock-theme-style').textContent)
    })`);
    const failed = Object.entries(result).filter(([key, value]) =>
      !['installResult', 'appendedSlotClass', 'floatingActive'].includes(key) && !value);
    if (installResult !== 'installed' || failed.length) {
      throw new Error(`Panel injection failed: ${JSON.stringify(result)}`);
    }
    if (process.env.PG_INJECTION_SCREENSHOT) {
      const image = await window.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, 'team-panel-preview.png'), image.toPNG());
    }
    console.log(JSON.stringify(result));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
