const { app, BrowserWindow } = require('electron');
const path = require('node:path');

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 940,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    window.loadFile(path.join(__dirname, '..', 'src', 'index.html')).catch((error) => {
      console.error(`[visual] loadFile: ${error.message}`);
    });
    await waitFor(window, 'window.__pokeGridPreviewNotifications && window.__pokeGridPreviewFarmRecommendations');
    await waitFor(window, 'document.querySelectorAll(".panel").length === 4');
    await window.webContents.executeJavaScript(`(async () => { await clearNotificationArchive(); localStorage.removeItem('pokegrid:notification-counters:v1'); localStorage.setItem('pokegrid:notifications:v1', JSON.stringify([{
      id: 'existing-legendary-quality',
      createdAt: Date.now(),
      read: true,
      accountIndex: 0,
      eventKind: 'capture',
      types: ['goal'],
      capture: {
        name: 'Magnemite',
        level: 'Lv.10',
        tier: 'legendary',
        iv: 183,
        ivMax: 192,
        ball: 'Ultra Ball',
        eventKind: 'capture'
      }
    }, {
      id: 'false-you-defeat',
      createdAt: Date.now(),
      read: false,
      accountIndex: 0,
      eventKind: 'defeat',
      types: ['shiny'],
      capture: { name: 'You', isShiny: true, eventKind: 'defeat' }
    }])); })()`);
    window.webContents.reload();
    await waitFor(window, 'window.__pokeGridPreviewNotifications && document.querySelectorAll(".panel").length === 4');
    await waitFor(window, 'document.querySelector("#updateLauncherButton .update-launcher-version")?.textContent === "v0.22.5"');
    const migratedNotification = await window.webContents.executeJavaScript(`({
      legendaryCount: document.querySelector('#legendaryNotificationCount').textContent,
      types: JSON.parse(localStorage.getItem('pokegrid:notifications:v1'))[0].types,
      falseDefeats: [...document.querySelectorAll('.notification-item-title b')]
        .filter((element) => element.textContent.includes('You')).length
    })`);
    if (migratedNotification.legendaryCount !== '1' || !migratedNotification.types.includes('legendary') ||
      migratedNotification.falseDefeats !== 0) {
      throw new Error(`Existing 0.14.2 legendary-quality notification was not migrated: ${JSON.stringify(migratedNotification)}`);
    }
    const toolbarState = await window.webContents.executeJavaScript(`({
      pokepediaText: document.querySelector('#pokepediaButton')?.textContent.replace(/\\s+/g, ' ').trim(),
      pokepediaClass: document.querySelector('#pokepediaButton')?.className,
      launchText: document.querySelector('#loginAllButton')?.textContent.trim(),
      launchLabel: document.querySelector('#loginAllButton')?.getAttribute('aria-label'),
      playIcons: document.querySelectorAll('#loginAllButton .play-icon').length,
      hamburgerLines: document.querySelectorAll('#topbarToggle .hamburger-icon i').length,
      sidebarExpanded: document.querySelector('#topbarToggle')?.getAttribute('aria-expanded'),
      sidebarHidden: document.querySelector('#globalActions')?.getAttribute('aria-hidden'),
      updateButton: Boolean(document.querySelector('#updateLauncherButton')),
      updateText: document.querySelector('#updateLauncherButton')?.textContent.replace(/\s+/g, ' ').trim(),
      updateVersion: document.querySelector('#updateLauncherButton .update-launcher-version')?.textContent
    })`);
    if (!toolbarState.pokepediaText.endsWith('Pokepedia') ||
        !toolbarState.pokepediaClass.includes('button-pokepedia') ||
        toolbarState.launchText !== 'Iniciar todas' ||
        toolbarState.launchLabel !== 'Iniciar las cuatro cuentas' ||
        toolbarState.playIcons !== 1 || toolbarState.hamburgerLines !== 3 ||
        toolbarState.sidebarExpanded !== 'false' || toolbarState.sidebarHidden !== 'true' || !toolbarState.updateButton ||
        !toolbarState.updateText.includes('Actualizar') || !toolbarState.updateText.includes('v0.22.5') ||
        toolbarState.updateVersion !== 'v0.22.5') {
      throw new Error(`Launcher toolbar controls failed: ${JSON.stringify(toolbarState)}`);
    }

    const sidebarState = await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('#globalActions').style.transition = 'none';
      document.querySelector('#grid').style.transition = 'none';
      document.querySelector('#topbarToggle').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const sidebar = document.querySelector('#globalActions');
      const sidebarRect = sidebar.getBoundingClientRect();
      const gridRect = document.querySelector('#grid').getBoundingClientRect();
      document.querySelector('#viewModeButton').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const viewMenu = document.querySelector('#viewModeMenu');
      const viewMenuRect = viewMenu.getBoundingClientRect();
      const open = {
        expanded: document.querySelector('#topbarToggle').getAttribute('aria-expanded'),
        visible: getComputedStyle(sidebar).visibility,
        direction: getComputedStyle(sidebar).flexDirection,
        width: Math.round(sidebarRect.width),
        left: Math.round(sidebarRect.left),
        gridLeft: Math.round(gridRect.left),
        actionCount: sidebar.querySelectorAll(':scope > button, :scope > .view-mode-control').length,
        persisted: localStorage.getItem('launcherSidebarOpen'),
        viewMenu: {
          parent: viewMenu.parentElement.tagName,
          position: getComputedStyle(viewMenu).position,
          visible: !viewMenu.hidden && getComputedStyle(viewMenu).visibility === 'visible',
          left: Math.round(viewMenuRect.left),
          right: Math.round(viewMenuRect.right),
          sidebarRight: Math.round(sidebarRect.right),
          insideViewport: viewMenuRect.left >= 0 && viewMenuRect.right <= innerWidth && viewMenuRect.top >= 0 && viewMenuRect.bottom <= innerHeight
        }
      };
      document.querySelector('#topbarToggle').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { open, closed: {
        expanded: document.querySelector('#topbarToggle').getAttribute('aria-expanded'),
        visibility: getComputedStyle(sidebar).visibility,
        persisted: localStorage.getItem('launcherSidebarOpen')
      }};
    })()`);
    if (sidebarState.open.expanded !== 'true' || sidebarState.open.visible !== 'visible' ||
        sidebarState.open.direction !== 'column' || sidebarState.open.width < 220 || sidebarState.open.left !== 0 ||
        sidebarState.open.gridLeft < 230 || sidebarState.open.actionCount !== 11 || sidebarState.open.persisted !== '1' ||
        sidebarState.open.viewMenu.parent !== 'BODY' || sidebarState.open.viewMenu.position !== 'fixed' ||
        !sidebarState.open.viewMenu.visible || sidebarState.open.viewMenu.left <= sidebarState.open.viewMenu.sidebarRight ||
        !sidebarState.open.viewMenu.insideViewport ||
        sidebarState.closed.expanded !== 'false' || sidebarState.closed.visibility !== 'hidden' || sidebarState.closed.persisted !== '0') {
      throw new Error(`Launcher sidebar failed: ${JSON.stringify(sidebarState)}`);
    }

    const accountInfoState = await window.webContents.executeJavaScript(`(() => {
      window.__pokeGridPreviewAccountInfo();
      renderAccountProfile(panels[0], {
        ok: true, name: 'SHOCKVOR', level: 559, rank: 'Maestro III', pokedollars: 1284500, diamonds: 735,
        vip: true, sprite: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', updatedAt: Date.now()
      });
      const card = document.querySelector('.account-info-card');
      return {
        visible: !card.hidden,
        metrics: card.querySelectorAll('.account-info-metric').length,
        iconCount: card.querySelectorAll('.launcher-ui-icon').length,
        trainerSprite: card.querySelector('.account-info-avatar img')?.src || '',
        hasTrainerProgress: Boolean(card.querySelector('.account-info-progress')),
        hasMembership: Boolean(card.querySelector('.account-info-membership')),
        text: card.textContent.replace(/\\s+/g, ' ').trim(),
        memoryButton: Boolean(document.querySelector('#cleanupMemoryButton'))
      };
    })()`);
    if (!accountInfoState.visible || accountInfoState.metrics !== 2 || !accountInfoState.text.includes('SHOCKVOR') ||
        !accountInfoState.text.includes('VIP') || accountInfoState.iconCount < 7 ||
        !accountInfoState.trainerSprite.startsWith('data:image/gif') || !accountInfoState.hasTrainerProgress ||
        !accountInfoState.hasMembership || !accountInfoState.memoryButton) {
      throw new Error(`Account profile or safe memory control failed: ${JSON.stringify(accountInfoState)}`);
    }
    const memoryCleanupState = await window.webContents.executeJavaScript(`(async () => {
      const button = document.querySelector('#cleanupMemoryButton');
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      return {
        text: button.textContent.replace(/\s+/g, ' ').trim(),
        title: button.title,
        busy: button.getAttribute('aria-busy'),
        cleaning: button.classList.contains('is-cleaning')
      };
    })()`);
    if (!memoryCleanupState.text.includes('25 MB') || !memoryCleanupState.title.includes('No se recargaron sesiones') ||
        memoryCleanupState.busy !== 'true' || !memoryCleanupState.cleaning) {
      throw new Error(`Safe RAM cleanup failed: ${JSON.stringify(memoryCleanupState)}`);
    }

    const gridViewState = await window.webContents.executeJavaScript(`(() => {
      const result = {};
      for (const count of [3, 2, 1, 4]) {
        visibleAccountIndexes = new Set(Array.from({ length: count }, (_, index) => index));
        applyGridView();
        result[count] = {
          dataCount: document.querySelector('#grid').dataset.viewCount,
          visible: [...document.querySelectorAll('.panel')].filter((panel) => !panel.classList.contains('is-grid-hidden')).length,
          hidden: document.querySelectorAll('.panel.is-grid-hidden').length
        };
      }
      reorderPanels(0, 2);
      result.saved = JSON.parse(localStorage.getItem('idle-poke:grid-visible:v1'));
      result.panelOrder = [...document.querySelectorAll('.panel')].sort((a, b) => Number(a.style.order) - Number(b.style.order)).map((panel) => Number(panel.dataset.accountIndex));
      result.farmOrder = [...document.querySelectorAll('.farm-account')].map((account) => Number(account.dataset.accountIndex));
      return result;
    })()`);
    for (const count of [1, 2, 3, 4]) {
      if (gridViewState[count].dataCount !== String(count) || gridViewState[count].visible !== count ||
          gridViewState[count].hidden !== 4 - count) {
        throw new Error(`Grid view ${count} failed: ${JSON.stringify(gridViewState)}`);
      }
    }
    if (gridViewState.saved.length !== 4 || new Set(gridViewState.panelOrder).size !== 4 || gridViewState.panelOrder.join(',') !== gridViewState.farmOrder.join(',')) {
      throw new Error(`Grid view preference or persistent order failed: ${JSON.stringify(gridViewState)}`);
    }

    const captureArchiveState = await window.webContents.executeJavaScript(`(async () => {
      const panel = panels[1];
      await ensureCaptureArchive(panel);
      await clearCaptureArchive(panel);
      archiveCaptureRows(panel, [{ key: 'historic-1000', id: 'historic-1000', name: 'Pikachu', level: 80, iv: 150,
        ball: 'Ultra Ball', when: '01/01/2026, 10:00', captureNumber: '1000', isShiny: false }]);
      archiveCaptureRows(panel, [{ key: 'current-4391', id: 'current-4391', name: 'Gengar', level: 100, iv: 180,
        ball: 'Great Ball', when: '09/08/2026, 02:00', captureNumber: '4391', isShiny: true,
        stats: { hp: 472, attack: 458, defense: 598, specialAttack: 783, specialDefense: 583, speed: 433 } }]);
      archiveCaptureRows(panel, [{ key: 'current-4391', id: 'current-4391', name: 'Gengar', level: 100, iv: null,
        ball: '', when: '09/08/2026, 02:00', captureNumber: '4391', isShiny: true,
        stats: { hp: null, attack: null, defense: null, specialAttack: null, specialDefense: null, speed: null } }]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      panel.captureArchive.clear();
      panel.captureArchiveSignatures.clear();
      panel.captureArchiveLoaded = false;
      panel.captureArchivePromise = null;
      await ensureCaptureArchive(panel);
      panel.captureFilters = { ...captureLogFilterDefaults(), number: '1000' };
      renderCaptureLog(panel, { ok: true, updatedAt: Date.now(), total: 4391, rows: [{ key: 'current-4391', id: 'current-4391',
        name: 'Gengar', level: 100, iv: 180, ball: 'Great Ball', when: '09/08/2026, 02:00', captureNumber: '4391', isShiny: true }] });
      const result = {
        persisted: panel.captureArchive.size,
        preservedIv: panel.captureArchive.get('1:number:4391')?.iv,
        preservedHp: panel.captureArchive.get('1:number:4391')?.stats?.hp,
        names: [...panel.captureLogList.querySelectorAll('.capture-flat-name')].map((element) => element.textContent),
        count: panel.captureLogCount.textContent
      };
      await clearCaptureArchive(panel);
      return result;
    })()`);
    if (captureArchiveState.persisted !== 2 || captureArchiveState.preservedIv !== 180 || captureArchiveState.preservedHp !== 472 || captureArchiveState.names.length !== 1 ||
        !captureArchiveState.names[0].includes('Pikachu') || !/1 de 2 guardadas.*4391 totales/.test(captureArchiveState.count)) {
      throw new Error(`Persistent capture archive failed: ${JSON.stringify(captureArchiveState)}`);
    }

    await window.webContents.executeJavaScript(`window.__pokeGridPreviewCaptureLog(true)`);
    const captureFilterState = await window.webContents.executeJavaScript(`(() => {
      const capturePanel = panels[0].captureLogPanel;
      const shiny = capturePanel.querySelector('.capture-filter-shiny');
      shiny.value = 'shiny';
      shiny.dispatchEvent(new Event('change', { bubbles: true }));
      const shinyNames = [...capturePanel.querySelectorAll('.capture-flat-name')].map((element) => element.textContent);
      const powerFiltered = filteredCaptureLogRows(panels[0].captureLogSnapshot.rows, { ...captureLogFilterDefaults(), powerMin: '4000' });
      const ivFiltered = filteredCaptureLogRows(panels[0].captureLogSnapshot.rows, { ...captureLogFilterDefaults(), ivMin: '180' });
      const calculatedStrength = Object.fromEntries(panels[0].captureLogSnapshot.rows.map((row) => {
        const capture = enrichCaptureLogEntry(row);
        return [capture.name, capture.strength];
      }));
      const reset = capturePanel.querySelector('.capture-filter-reset');
      reset.click();
      const detailRow = capturePanel.querySelector('.capture-flat-row');
      detailRow.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
      const hiddenAfterHover = capturePanel.querySelector('.capture-detail-popover').hidden;
      detailRow.click();
      const visibleAfterClick = !capturePanel.querySelector('.capture-detail-popover').hidden;
      const expandedAfterClick = detailRow.getAttribute('aria-expanded');
      detailRow.click();
      const hiddenAfterSecondClick = capturePanel.querySelector('.capture-detail-popover').hidden;
      detailRow.click();
      capturePanel.querySelector('.capture-float-head').click();
      const hiddenAfterOutsideClick = capturePanel.querySelector('.capture-detail-popover').hidden;
      return {
        filterControls: capturePanel.querySelectorAll('.capture-filter-grid input, .capture-filter-grid select').length,
        nameOptions: capturePanel.querySelectorAll('.capture-filter-names option').length,
        shinyNames,
        powerNames: powerFiltered.map((row) => row.name),
        calculatedStrength,
        ivNames: ivFiltered.map((row) => row.name),
        resetRows: capturePanel.querySelectorAll('.capture-flat-row').length,
        resizable: getComputedStyle(capturePanel).resize,
        geometryButtons: capturePanel.querySelectorAll('.capture-float-pin, .capture-float-position-reset').length,
        clickOnlyDetail: hiddenAfterHover && visibleAfterClick && expandedAfterClick === 'true' && hiddenAfterSecondClick && hiddenAfterOutsideClick
      };
    })()`);
    if (captureFilterState.filterControls !== 9 || captureFilterState.nameOptions < 6 ||
        captureFilterState.shinyNames.length !== 1 || !captureFilterState.shinyNames[0].includes('Gengar') ||
        !captureFilterState.powerNames.includes('Magneton') || captureFilterState.powerNames.includes('Gengar') ||
        captureFilterState.calculatedStrength.Magneton !== 5989 || captureFilterState.calculatedStrength.Gengar !== 3324 ||
        !captureFilterState.ivNames.includes('Gengar') ||
        captureFilterState.resetRows < 6 || captureFilterState.resizable !== 'both' || captureFilterState.geometryButtons !== 2 || !captureFilterState.clickOnlyDetail) {
      throw new Error(`Capture filters or responsive geometry failed: ${JSON.stringify(captureFilterState)}`);
    }

    await window.webContents.executeJavaScript(`window.__pokeGridPreviewHuntAnalyzer(true)`);
    const huntTimerBefore = await window.webContents.executeJavaScript(`parseHuntDuration(panels[0].huntPanel.querySelector('[data-metric-key="time"]')?.textContent)`);
    await new Promise((resolve) => setTimeout(resolve, 1400));
    await window.webContents.executeJavaScript(`updatePanelLiveClocks()`);
    const huntWindowState = await window.webContents.executeJavaScript(`({
      timer: parseHuntDuration(panels[0].huntPanel.querySelector('[data-metric-key="time"]')?.textContent),
      resizable: getComputedStyle(panels[0].huntPanel).resize,
      geometryButtons: panels[0].huntPanel.querySelectorAll('.hunt-float-pin, .hunt-float-position-reset').length,
      metricCards: panels[0].huntPanel.querySelectorAll('.hunt-flat-metric[data-metric-card]').length,
      metricIcons: panels[0].huntPanel.querySelectorAll('.hunt-flat-metric-icon .launcher-ui-icon').length,
      actionIcons: panels[0].huntPanel.querySelectorAll('.hunt-float-head .launcher-ui-icon').length,
      dropsTitleIcon: Boolean(panels[0].huntPanel.querySelector('.hunt-flat-section-title .launcher-ui-icon')),
      balanceIcon: Boolean(panels[0].huntPanel.querySelector('.hunt-flat-balance-icon .launcher-ui-icon'))
    })`);
    if (!(huntWindowState.timer > huntTimerBefore) || huntWindowState.resizable !== 'both' || huntWindowState.geometryButtons !== 2 ||
        huntWindowState.metricCards !== 9 || huntWindowState.metricIcons !== 9 || huntWindowState.actionIcons < 5 ||
        !huntWindowState.dropsTitleIcon || !huntWindowState.balanceIcon) {
      throw new Error(`Hunt live timer or responsive geometry failed: ${JSON.stringify({ huntTimerBefore, huntWindowState })}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      launcherNotifications = [];
      saveLauncherNotifications();
      renderNotifications();
      window.__pokeGridPreviewNotifications();
      captureGoals.unshift(normalizeCaptureGoal({
        kind: 'drop', pokemon: 'Leaves', account: -1, minQuantity: 3
      }));
      addDropNotification({ name: 'Leaves', quantity: 3, key: 'drop-goal-1' }, 0);
      addDropNotification({ name: 'Leaves', quantity: 3, key: 'drop-goal-1' }, 0);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const notificationState = await window.webContents.executeJavaScript(`({
      titles: [...document.querySelectorAll('.notification-item-title b')].map((element) => element.textContent),
      accounts: [...document.querySelectorAll('.notification-item-account')].map((element) => element.textContent),
      shinyDefeats: document.querySelectorAll('.notification-item.is-shiny').length,
      legendaryCaptures: document.querySelectorAll('.notification-item.is-legendary').length,
      dropGoals: document.querySelectorAll('.notification-item.is-drop').length,
      outfitSprites: document.querySelectorAll('.notification-item .farm-sprite.is-outfit').length
    })`);
    if (!notificationState.titles.some((title) => title.endsWith('Shiny derrotado: Charizard'))) {
      throw new Error(`Missing shiny defeat title: ${JSON.stringify(notificationState)}`);
    }
    if (!notificationState.titles.some((title) => /Legendario capturado: Ancient Mewtwo/.test(title))) {
      throw new Error(`Missing legendary capture title: ${JSON.stringify(notificationState)}`);
    }
    if (!notificationState.titles.some((title) => title.endsWith('Captura legendaria: Magnemite'))) {
      throw new Error(`Missing legendary-quality capture title: ${JSON.stringify(notificationState)}`);
    }
    if (notificationState.legendaryCaptures !== 2) {
      throw new Error(`Expected two legendary notifications: ${JSON.stringify(notificationState)}`);
    }
    if (notificationState.dropGoals !== 1 ||
      !notificationState.titles.some((title) => title.endsWith('Meta de drop: Leaves × 3'))) {
      throw new Error(`Drop goal or its deduplication failed: ${JSON.stringify(notificationState)}`);
    }
    if (!notificationState.accounts.includes('SHOCKOR') || !notificationState.accounts.includes('DIEGO20') ||
      !notificationState.accounts.includes('SHOCKVINY')) {
      throw new Error(`Missing account attribution: ${JSON.stringify(notificationState)}`);
    }
    const goalBuilderState = await window.webContents.executeJavaScript(`(async () => {
      captureGoals = [];
      farmCatalog = [
        normalizeFarmTarget({ slug: 'pikachu', name: 'Pikachu', level: 50, speciesId: 25 }),
        normalizeFarmTarget({ slug: 'gengar', name: 'Gengar', level: 100, speciesId: 94 })
      ];
      goalDropCatalog = [
        { id: 1, name: 'Leaves', icon: '/items/leaves.png' },
        { id: 2, name: 'Seed', icon: '/items/seed.png' },
        { id: 3, name: 'Shiny Aerodactyl Card', icon: '/items/shiny-aero.png' },
        { id: 4, name: 'Shiny Paras Card', icon: '/items/shiny-paras.png' }
      ];
      openGoalBuilder();
      goalCatalogSearch.value = 'Pika';
      goalCatalogSearch.dispatchEvent(new Event('input', { bubbles: true }));
      const goalModalVisible = !goalBuilderBackdrop.hidden;
      const goalInputWritable = goalCatalogSearch.value === 'Pika' && !goalCatalogSearch.disabled;
      goalCatalogSearch.value = '';
      goalKindSelect.value = 'capture';
      updateGoalFormKind();
      const legendary = [...goalTierButtons.querySelectorAll('button')].find((button) => button.dataset.tier === 'legendary');
      legendary.click();
      const pikachu = [...goalCatalogList.querySelectorAll('.goal-catalog-row')].find((row) => row.textContent.includes('Pikachu'));
      pikachu.querySelector('input').click();
      goalIvInput.value = '130';
      captureGoalForm.requestSubmit();
      addCaptureNotification({ id: 'goal-legendary-smoke', name: 'Pikachu', level: 50, iv: 130, ivMax: 192, qualityValue: 1.8, qualityMultiplier: 'x1.80', captureNumber: 999 }, 0);
      const fulfilled = launcherNotifications.find((notification) => notification.capture.sourceKey === 'goal-legendary-smoke');
      goalKindSelect.value = 'drop';
      updateGoalFormKind();
      goalSelectShinyCardsButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const shinyCardSelection = [...goalSelectedTargets].filter((name) => /shiny.*card/i.test(name)).length;
      const leaves = [...goalCatalogList.querySelectorAll('.goal-catalog-row')].find((row) => row.textContent.includes('Leaves'));
      leaves.querySelector('input').click();
      goalQuantityInput.value = '3';
      captureGoalForm.requestSubmit();
      const captureGoal = captureGoals.find((goal) => goal.kind === 'capture');
      const dropGoal = captureGoals.find((goal) => goal.kind === 'drop');
      notificationCounters = { goal: 10000, shiny: 20000, legendary: 30000 };
      renderNotifications();
      const legendary18 = normalizeLauncherNotification({ eventKind: 'capture', types: ['legendary'], capture: { name: 'Gengar', tier: 'legendary', qualityValue: 1.8 } });
      const legendary199 = normalizeLauncherNotification({ eventKind: 'capture', types: ['legendary'], capture: { name: 'Gengar', tier: 'legendary', qualityValue: 1.99 } });
      const legendary2 = normalizeLauncherNotification({ eventKind: 'capture', types: ['legendary'], capture: { name: 'Gengar', tier: 'legendary', qualityValue: 2 } });
      const recentOrder = sortedCaptureLogRows([
        { name: 'Old', captureNumber: '1', when: '09/08/2026, 03:00', archivedAt: 1 },
        { name: 'Newest', captureNumber: '49', when: '09/08/2026, 03:49', archivedAt: 49 },
        { name: 'Middle', captureNumber: '10', when: '09/08/2026, 03:10', archivedAt: 10 }
      ], 'recent').map((row) => row.captureNumber);
      const result = {
        catalogRows: goalCatalogList.querySelectorAll('.goal-catalog-row').length,
        tierButtons: goalTierButtons.querySelectorAll('.goal-tier-button').length,
        capture: captureGoal && { pokemon: captureGoal.pokemon, minIv: captureGoal.minIv, minLevel: captureGoal.minLevel, tiers: captureGoal.tiers },
        drop: dropGoal && { name: dropGoal.pokemon, quantity: dropGoal.minQuantity, tier: dropGoal.tier, tiers: dropGoal.tiers },
        dropTierHidden: goalTierField.hidden,
        goalModalVisible,
        goalInputWritable,
        shinyCardSelection,
        fulfilledTypes: fulfilled?.types || [],
        counters: [goalNotificationCount.textContent, shinyNotificationCount.textContent, legendaryNotificationCount.textContent],
        legendaryQualityRange: [Boolean(legendary18), Boolean(legendary199), Boolean(legendary2)],
        recentOrder
      };
      closeGoalBuilder();
      notificationPanel.hidden = false;
      openGoalBuilder();
      result.notificationClosedOnCreate = notificationPanel.hidden;
      closeGoalBuilder();
      openGoalManager();
      result.goalManagerVisible = !goalManagerBackdrop.hidden;
      result.notificationFilters = document.querySelectorAll('.notification-filter-grid input, .notification-filter-grid select').length;
      result.levelFieldRemoved = !document.querySelector('#goalLevelField');
      closeGoalManager();
      captureGoals = [];
      saveCaptureGoals();
      notificationCounters = loadNotificationCounters();
      renderNotifications();
      return result;
    })()`);
    if (goalBuilderState.catalogRows !== 4 || goalBuilderState.tierButtons !== 9 ||
        goalBuilderState.capture?.pokemon !== 'Pikachu' || goalBuilderState.capture.minIv !== 130 ||
        goalBuilderState.capture.minLevel !== 1 || !goalBuilderState.capture.tiers.includes('legendary') ||
        goalBuilderState.drop?.name !== 'Leaves' || goalBuilderState.drop.quantity !== 3 ||
        goalBuilderState.drop.tier !== 'any' || goalBuilderState.drop.tiers.length !== 0 || !goalBuilderState.dropTierHidden ||
        !goalBuilderState.goalModalVisible || !goalBuilderState.goalInputWritable || goalBuilderState.shinyCardSelection !== 2 ||
        !goalBuilderState.fulfilledTypes.includes('goal') || !goalBuilderState.fulfilledTypes.includes('legendary') ||
        goalBuilderState.counters.join(',') !== '10000,20000,30000' || goalBuilderState.legendaryQualityRange.join(',') !== 'true,true,false' ||
        goalBuilderState.recentOrder.join(',') !== '49,10,1' || !goalBuilderState.notificationClosedOnCreate ||
        !goalBuilderState.goalManagerVisible || goalBuilderState.notificationFilters !== 6 || !goalBuilderState.levelFieldRemoved) {
      throw new Error(`Goal builder catalog or unlimited counters failed: ${JSON.stringify(goalBuilderState)}`);
    }
    await window.webContents.executeJavaScript(`(() => {
      const result = window.__pokeGridPreviewFarmRecommendations();
      document.querySelector('#notificationPanel').hidden = true;
      document.querySelector('#farmBackdrop').hidden = false;
      document.querySelector('#farmBackdrop').style.zIndex = '10000';
      document.querySelector('#farmPickerLayer').hidden = false;
      document.querySelectorAll('webview').forEach((element) => element.style.visibility = 'hidden');
      return result;
    })()`);
    try {
      await waitFor(window,
        'document.querySelectorAll(".farm-pokemon-option").length > 0 && document.querySelectorAll(".farm-pokemon-option .farm-sprite-image[data-loaded=true]").length === document.querySelectorAll(".farm-pokemon-option").length',
        30_000);
    } catch (error) {
      const spriteDiagnostics = await window.webContents.executeJavaScript(`[...document.querySelectorAll('.farm-pokemon-option')].map((card) => ({
        name: card.querySelector('.farm-smart-name-row strong')?.textContent,
        classes: card.querySelector('.farm-sprite')?.className,
        speciesId: card.querySelector('.farm-sprite')?.dataset.speciesId || '',
        loaded: card.querySelector('.farm-sprite-image')?.dataset.loaded || ''
      }))`);
      throw new Error(`${error.message}: ${JSON.stringify(spriteDiagnostics)}`);
    }
    const farmState = await window.webContents.executeJavaScript(`({
      cards: document.querySelectorAll('.farm-pokemon-option').length,
      apiSprites: document.querySelectorAll('.farm-pokemon-option .farm-sprite.is-pokeapi').length,
      loadedSprites: document.querySelectorAll('.farm-pokemon-option .farm-sprite-image[data-loaded=true]').length,
      emptySprites: document.querySelectorAll('.farm-pokemon-option .farm-sprite.is-empty').length,
      speciesIds: [...document.querySelectorAll('.farm-pokemon-option .farm-sprite.is-pokeapi')].map((element) => element.dataset.speciesId),
      dataSources: [...document.querySelectorAll('.farm-pokemon-option .farm-sprite-image')].map((element) => element.src.slice(0, 11)),
      hp: [...document.querySelectorAll('.farm-leader-stats b')].map((element) => element.textContent)
    })`);
    if (farmState.cards < 6 || farmState.apiSprites !== farmState.cards ||
        farmState.loadedSprites !== farmState.cards || farmState.emptySprites !== 0) {
      throw new Error(`Farm sprite coverage failed: ${JSON.stringify(farmState)}`);
    }
    if (farmState.speciesIds.some((id) => !Number(id)) || farmState.dataSources.some((source) => source !== 'data:image/')) {
      throw new Error(`PokéAPI sprite source failed: ${JSON.stringify(farmState)}`);
    }

    const farmUpgradeState = await window.webContents.executeJavaScript(`(() => {
      const shiny = normalizeFarmTarget({ slug: 'shiny-pikachu', name: 'Pikachu', level: 40, area: 'kanto', shiny: true });
      const target = normalizeFarmTarget({ slug: 'glalie', name: 'Glalie', level: 580, area: 'orre', types: ['ice'],
        attacks: [{ name: 'Blizzard', type: 'ice', power: 180, cooldownMs: 12000 }] });
      const weakLeader = normalizeFarmLeader({ id: 'orre-1', name: 'Charizard', level: 500, strength: 3000, types: ['fire', 'flying'],
        moves: [{ name: 'Flamethrower', type: 'fire', power: 180, cooldownMs: 8000, tm: true }], items: [] });
      const readyLeader = normalizeFarmLeader({ ...weakLeader,
        items: [{ name: 'Fire-Type TM Disk', category: 'tm' }, { name: 'Steel-Type TM Disk', category: 'tm' }] });
      const matchup = evaluateFarmTarget(target, { ready: true, level: 600, leader: readyLeader });
      const dualTypeMatchup = evaluateFarmTarget(
        normalizeFarmTarget({ slug: 'gyarados', name: 'Gyarados', level: 80, area: 'kanto', types: ['water', 'flying'], basePower: 540 }),
        { ready: true, level: 100, leader: normalizeFarmLeader({ name: 'Raichu', level: 100, strength: 5000,
          types: ['electric'], moves: [{ name: 'Thunderbolt', type: 'electric', power: 90 }] }) }
      );
      farmShinyFilter.checked = true;
      farmShinyFilter.dispatchEvent(new Event('change', { bubbles: true }));
      const shinyFormCards = document.querySelectorAll('.farm-pokemon-option').length;
      farmShinyFilter.checked = false;
      farmShinyFilter.dispatchEvent(new Event('change', { bubbles: true }));
      const farmModalRect = document.querySelector('.farm-modal').getBoundingClientRect();
      const farmFooterRect = document.querySelector('.farm-actions').getBoundingClientRect();
      const farmGridRect = document.querySelector('.farm-account-grid').getBoundingClientRect();
      return {
        shiny: shiny.isShiny,
        blockedOrre: validateOrreTarget(target, { leader: weakLeader }).ok,
        readyOrre: validateOrreTarget(target, { leader: readyLeader }).ok,
        componentKeys: Object.keys(matchup.components).sort(),
        dualTypeOffensive: dualTypeMatchup.offensive,
        accountActions: document.querySelectorAll('.farm-account-action').length,
        accountPlayIcons: document.querySelectorAll('.farm-account-action .play-icon').length,
        leaderRefreshButtons: document.querySelectorAll('.farm-leader-refresh').length,
        rereadAllButton: Boolean(document.querySelector('#rereadFarmLeadersButton')),
        orrePermission: Boolean(document.querySelector('#farmAllowOrreTravel')),
        stopButton: Boolean(document.querySelector('#stopFarmButton')),
        typedCards: document.querySelectorAll('.farm-pokemon-smart-option[data-primary-type]').length,
        clippedCards: [...document.querySelectorAll('.farm-pokemon-smart-option')]
          .filter((element) => getComputedStyle(element).overflow === 'hidden').length,
        footerVisible: farmFooterRect.height > 0 && farmFooterRect.top >= farmModalRect.top && farmFooterRect.bottom <= farmModalRect.bottom + 1,
        unusedVerticalSpace: Math.round(farmFooterRect.top - farmGridRect.bottom),
        compactTitle: document.querySelector('#farmTitle')?.textContent,
        oldHeadingCopy: document.querySelectorAll('.farm-heading .eyebrow, .farm-heading-copy p').length,
        shinyFormCards,
        shinyFilter: Boolean(document.querySelector('#farmShinyFilter'))
      };
    })()`);
    if (!farmUpgradeState.shiny || farmUpgradeState.blockedOrre || !farmUpgradeState.readyOrre ||
        farmUpgradeState.accountActions !== 4 || farmUpgradeState.accountPlayIcons !== 4 || farmUpgradeState.shinyFormCards !== 2 ||
        !farmUpgradeState.shinyFilter || farmUpgradeState.componentKeys.length !== 4 || farmUpgradeState.dualTypeOffensive !== 4 ||
        farmUpgradeState.leaderRefreshButtons !== 4 || !farmUpgradeState.rereadAllButton || !farmUpgradeState.orrePermission ||
        !farmUpgradeState.stopButton || farmUpgradeState.typedCards === 0 || farmUpgradeState.clippedCards !== farmUpgradeState.typedCards ||
        !farmUpgradeState.footerVisible || farmUpgradeState.unusedVerticalSpace > 45 ||
        farmUpgradeState.compactTitle !== 'Modo farmeo' || farmUpgradeState.oldHeadingCopy !== 0) {
      throw new Error(`Farm upgrades failed: ${JSON.stringify(farmUpgradeState)}`);
    }

    const searchState = await window.webContents.executeJavaScript(`(() => {
      const input = document.querySelector('#farmSearchInput');
      input.value = 'wiggly';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const wigglyNames = [...document.querySelectorAll('.farm-pokemon-option .farm-smart-name-row strong')].map((element) => element.textContent);
      input.value = 'gyara';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const gyaradosNames = [...document.querySelectorAll('.farm-pokemon-option .farm-smart-name-row strong')].map((element) => element.textContent);
      const gyaradosRoute = [...document.querySelectorAll('.farm-route-step b')].map((element) => element.textContent);
      input.value = 'mag';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        wigglyNames,
        gyaradosNames,
        gyaradosRoute,
        magCards: document.querySelectorAll('.farm-pokemon-option').length,
        magRouteSteps: document.querySelectorAll('.farm-route-step').length,
        emptyVisible: !document.querySelector('#farmPickerEmpty').hidden
      };
    })()`);
    if (searchState.wigglyNames.length !== 1 || searchState.wigglyNames[0] !== 'Furious Wigglytuff' ||
        searchState.gyaradosNames.length !== 1 || searchState.gyaradosNames[0] !== 'Gyarados' ||
        searchState.gyaradosRoute.length !== 1 || searchState.gyaradosRoute[0] !== 'Gyarados') {
      throw new Error(`Farm name search failed: ${JSON.stringify(searchState)}`);
    }
    if (searchState.magCards !== 0 || searchState.magRouteSteps !== 0 || !searchState.emptyVisible) {
      throw new Error(`Farm search leaked leader matchup text: ${JSON.stringify(searchState)}`);
    }
    console.log(JSON.stringify({ toolbarState, sidebarState, memoryCleanupState, gridViewState, captureArchiveState, captureFilterState, huntWindowState, notificationState, goalBuilderState, farmState, farmUpgradeState, searchState }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
