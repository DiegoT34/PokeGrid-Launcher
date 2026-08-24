const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

async function waitFor(window, expression, timeout = 12_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await window.webContents.executeJavaScript(`(${expression})`);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 900,
    height: 700,
    webPreferences: {
      contextIsolation: true,
      sandbox: true
    }
  });

  try {
    await window.loadURL('data:text/html;charset=utf-8,<main id="root" class="game-root"></main>');
    await window.webContents.executeJavaScript(`(() => {
      window.__pokeGridCaptureQueue = [];
      window.__pokeGridDefeatQueue = [];
      window.__telegramRequests = [];
      window.__telegramShared = {
        token: '123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_123456789',
        recipientsText: 'Personal | 987654321',
        alerts: {
          filteredCaptures: false,
          legendaryCaptures: true,
          shinyCaptures: true,
          shinyDefeats: true,
          drops: true
        },
        capture: { minIv: 0, minLevel: 0, tiers: '', pokemon: '' },
        drops: { names: '', minQuantity: 1 }
      };
      window.GM = {
        info: { script: { account: { index: 2, label: 'DIEGO20' } } },
        addStyle(css) {
          const style = document.createElement('style');
          style.textContent = css;
          document.head.appendChild(style);
          return style;
        },
        async getSharedValue(_key, fallback) {
          return window.__telegramShared || fallback;
        },
        async setSharedValue(_key, value) {
          window.__telegramShared = value;
        },
        xmlHttpRequest(details) {
          window.__telegramRequests.push({
            method: details.method,
            url: details.url,
            data: details.data || '',
            multipart: details.multipart || null
          });
          const response = details.url.endsWith('/game/creatures.json')
            ? { creatures: [
                { pokeId: 25, name: 'Pikachu', looktype: 59 },
                { pokeId: 81, name: 'Magnemite', looktype: 217 }
              ] }
            : details.url.includes('/game/asset-packs/outfits-index.json')
              ? { outfits: {
                  59: { category: 'outfits/male/59', manifest: '/assets-packs/test/59.json' },
                  217: { category: 'outfits/male/217', manifest: '/assets-packs/test/217.json' }
                } }
            : details.url.includes('/game/asset-packs/test/')
              ? (() => {
                  const looktype = details.url.includes('/59.json') ? 59 : 217;
                  const category = 'outfits/male/' + looktype;
                  return {
                    categories: { [category]: { pages: [{
                      index: 0,
                      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xn7WAAAAAElFTkSuQmCC'
                    }] } },
                    assets: { ['/assets/outfits/male/' + looktype + '/1_1_1_3.png']: {
                      frames: [{ page: 0, x: 0, y: 0, w: 1, h: 1 }]
                    } }
                  };
                })()
            : details.url.endsWith('/game/items.json')
              ? { items: [
                  { id: 101, name: 'Leaves', icon: 'https://game.test/items/leaves.png' },
                  { id: 201, name: 'Shiny Aerodactyl Card', icon: 'https://game.test/items/aerodactyl-card.png' },
                  { id: 202, name: 'Shiny Abra Card', icon: 'https://game.test/items/abra-card.png' },
                  { id: 203, name: 'Regular Card', icon: 'https://game.test/items/regular-card.png' }
                ] }
            : details.url.endsWith('/getMe')
              ? { ok: true, result: { username: 'pokegrid_smoke_bot' } }
              : details.url.endsWith('/getUpdates')
                ? {
                    ok: true,
                    result: [{
                      update_id: 1,
                      message: { chat: { id: 987654321, first_name: 'Personal', type: 'private' } }
                    }]
                  }
              : { ok: true, result: { message_id: window.__telegramRequests.length } };
          return Promise.resolve({
            status: 200,
            statusText: 'OK',
            responseText: JSON.stringify(response)
          });
        }
      };
    })()`);

    const source = fs.readFileSync(
      path.join(__dirname, '..', 'userscripts', 'PokeGrid-Telegram-Alerts.user.js'),
      'utf8'
    );
    await window.webContents.executeJavaScript(source);
    await waitFor(window, `document.querySelector('#pokegrid-telegram-button') &&
      window.__pokeGridTelegramAlerts &&
      window.__pokeGridCaptureQueue.__pokeGridTelegram___pokeGridCaptureQueue`);

    await window.webContents.executeJavaScript(`(() => {
      const captureLog = document.createElement('div');
      captureLog.className = 'clog-window';
      captureLog.innerHTML = '<div class="clog-row" data-capture-number="4321"><span class="clog-name">Ancient Magnemite</span><span class="clog-lvl">Lv. 150</span><span class="clog-meta">Legendaria · IV 181/192</span><span class="clog-ball">Ultra Ball</span></div>';
      document.body.appendChild(captureLog);
      window.__pokeGridCaptureQueue.push({
      key: 'capture-network-' + Date.now(),
      name: 'Ancient Magnemite',
      tier: '',
      qualityValue: 1.8,
      qualityMultiplier: 'x1.8',
      iv: 181,
      ivMax: 192,
      level: 150,
      ball: 'pokeball',
      when: '29/07, 04:30',
      isShiny: false,
      source: 'capture-network'
      });
      setTimeout(() => window.__pokeGridTelegramCaptureBridgeQueue.push({
        key: 'capture-log-4321', name: 'Ancient Magnemite', tier: 'LEGENDARIO',
        qualityValue: 1.8, iv: 181, ivMax: 192, level: 150, ball: 'Ultra Ball',
        captureNumber: 4321, when: '29/07, 04:30', source: 'launcher-capture-log'
      }), 100);
    })()`);
    await waitFor(window, `window.__telegramRequests.filter((entry) => entry.url.endsWith('/sendPhoto')).length >= 1`);

    await window.webContents.executeJavaScript(`window.__pokeGridDefeatQueue.push({
      key: 'defeat-shiny-1',
      name: 'Pikachu',
      tier: '',
      qualityMultiplier: 'x1.37',
      level: 100,
      xp: 420,
      speciesId: 25,
      isShiny: true,
      detectedAt: Date.now()
    })`);
    await waitFor(window, `window.__telegramRequests.filter((entry) => entry.url.endsWith('/sendPhoto')).length >= 2`);

    await window.webContents.executeJavaScript(`window.__pokeGridTelegramAlerts.simulateDrops(
      [{ name: 'Leaves', quantity: 3 }],
      { pokemonName: 'Bulbasaur', speciesId: 1, killId: 'drop-1', source: 'field-kill' }
    )`);
    await waitFor(window, `window.__telegramRequests.filter((entry) => entry.url.endsWith('/sendPhoto')).length >= 3`);
    await window.webContents.executeJavaScript(`window.__pokeGridTelegramAlerts.simulateDrops(
      [{ name: 'Leaves', quantity: 3 }],
      { pokemonName: 'Bulbasaur', speciesId: 1, killId: 'hunt:leaves:3', source: 'hunt-analyzer' }
    )`);
    await new Promise((resolve) => setTimeout(resolve, 250));

    await window.webContents.executeJavaScript(`(async () => {
      window.__telegramShared = {
        ...window.__telegramShared,
        alerts: {
          filteredCaptures: true,
          legendaryCaptures: false,
          shinyCaptures: false,
          shinyDefeats: false,
          drops: false
        },
        capture: { minIv: 150, minLevel: 50, tiers: 'legendary', pokemon: 'Magnemite' }
      };
      await window.__pokeGridTelegramAlerts.reload();
      const filterStamp = String(Date.now());
      const captureLog = document.createElement('div');
      captureLog.className = 'clog-window';
      captureLog.hidden = true;
      captureLog.innerHTML = '<div class="clog-row"><span class="clog-name">Ancient Magnemite ♂ 1ª</span><span class="clog-lvl">Lv. 50</span><span class="clog-meta">Legendaria · IV 150/192</span></div>';
      document.body.appendChild(captureLog);
      window.__pokeGridTelegramCaptureBridgeQueue.push({
        key: 'filtered-exact-minimum-' + filterStamp, name: 'Ancient Magnemite ♂ 1ª',
        tier: '', meta: 'IV 150/192', iv: 'IV 150/192', ivMax: 192, level: 'Lv. 50',
        ball: 'Ultra Ball', when: filterStamp, detectedAt: Date.now()
      });
    })()`);
    const exactMinimumMatches = await window.webContents.executeJavaScript(`window.__pokeGridTelegramAlerts.matchesCaptureFilter({
      name: 'Ancient Magnemite ♂ 1ª', tier: 'LEGENDARIO', iv: 'IV 150/192', level: 'Lv. 50'
    })`);
    if (!exactMinimumMatches) throw new Error('The exact-minimum filtered capture did not match the configured filters.');
    const qualityTiers = await window.webContents.executeJavaScript(`[.99, 1, 1.099, 1.1, 1.3, 1.5, 1.7, 2, 3, 4]
      .map((value) => window.__pokeGridTelegramAlerts.tierForQuality(value))`);
    if (qualityTiers.join(',') !== 'weak,common,common,uncommon,rare,epic,legendary,mythic,ancient,divine') {
      throw new Error(`Quality tier boundaries failed: ${qualityTiers.join(',')}`);
    }
    await waitFor(window, `window.__telegramRequests.filter((entry) => entry.url.endsWith('/sendPhoto')).length >= 4`);
    await window.webContents.executeJavaScript(`window.__pokeGridTelegramCaptureBridgeQueue.push({
      key: 'filtered-below-minimum', name: 'Ancient Magnemite ♂ 1ª',
      tier: 'LEGENDARIO', iv: '149/192', ivMax: 192, level: 'Lv. 50',
      ball: 'Ultra Ball', detectedAt: Date.now()
    })`);
    await new Promise((resolve) => setTimeout(resolve, 250));

    await window.webContents.executeJavaScript(`(() => {
      window.__pokeGridDefeatQueue.push({
        key: 'defeat-shiny-1', name: 'Pikachu', level: 100, speciesId: 25,
        isShiny: true, detectedAt: Date.now()
      });
      window.__pokeGridDefeatQueue.push({
        key: 'false-pronoun', name: 'You', level: 0,
        isShiny: true, detectedAt: Date.now()
      });
      window.__pokeGridCaptureQueue.push({
        key: 'stale-capture', name: 'Ancient Mewtwo', tier: 'LEGENDARIO',
        isShiny: false, detectedAt: Date.now() - 120000
      });
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 350));

    const state = await window.webContents.executeJavaScript(`(() => {
      const photos = window.__telegramRequests
        .filter((entry) => entry.url.endsWith('/sendPhoto'))
        .map((entry) => entry.multipart
          ? Object.fromEntries(entry.multipart.map((part) => [part.name, part.base64 ? part.filename : part.value]))
          : JSON.parse(entry.data));
      return {
        panelButtonIcon: document.querySelectorAll('#pokegrid-telegram-button svg').length,
        panelButtonLabel: document.querySelector('#pokegrid-telegram-button')?.getAttribute('aria-label'),
        ready: document.querySelector('#pokegrid-telegram-button')?.classList.contains('is-ready'),
        photoCount: photos.length,
        captions: photos.map((entry) => entry.caption),
        photos: photos.map((entry) => entry.photo),
        chatIds: photos.map((entry) => entry.chat_id),
        pokeApiCalls: window.__telegramRequests.filter((entry) => entry.url.includes('pokeapi.co')).length,
        creatureCatalogCalls: window.__telegramRequests.filter((entry) => entry.url.endsWith('/game/creatures.json')).length,
        itemCatalogCalls: window.__telegramRequests.filter((entry) => entry.url.endsWith('/game/items.json')).length
      };
    })()`);
    await window.webContents.executeJavaScript(`document.querySelector('#pokegrid-telegram-button').click()`);
    Object.assign(state, await window.webContents.executeJavaScript(`({
      sections: document.querySelectorAll('#pokegrid-telegram-panel .pgtg-section').length,
      hasScrollArea: Boolean(document.querySelector('#pokegrid-telegram-panel .pgtg-scroll')),
      hasTokenReveal: Boolean(document.querySelector('[data-tg-action="reveal"]')),
      filterCardEnabled: document.querySelector('.pgtg-filter-card')?.classList.contains('is-enabled')
    })`));
    await window.webContents.executeJavaScript(`document.querySelector('[data-tg-action="shiny-cards"]').click()`);
    state.shinyCards = await waitFor(window,
      `document.querySelector('[data-tg-field="dropNames"]').value.includes('Shiny Abra Card') &&
        document.querySelector('[data-tg-field="dropNames"]').value`);
    await window.webContents.executeJavaScript(`document.querySelector('[data-tg-action="chats"]').click()`);
    state.discoveredRecipient = await waitFor(
      window,
      `document.querySelector('[data-tg-field="recipients"]').value.includes('Personal | 987654321') &&
        document.querySelector('[data-tg-field="recipients"]').value`
    );
    window.show();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const image = await window.capturePage();
    fs.writeFileSync(path.join(__dirname, 'telegram-alerts-panel.png'), image.toPNG());

    if (state.panelButtonIcon !== 1 || state.panelButtonLabel !== 'Configurar alertas de Telegram' ||
      !state.ready || state.photoCount !== 4 ||
      !state.captions[0].includes('LEGENDARIO CAPTURADO') ||
      !state.captions[0].includes('Cuenta: <b>DIEGO20</b>') ||
      !state.captions[0].includes('181/192') ||
      !state.captions[0].includes('Ultra Ball') ||
      state.captions[0].includes('<b>pokeball</b>') ||
      !state.captions[0].includes('#4321') ||
      !state.captions[1].includes('SHINY DERROTADO') ||
      !state.captions[1].includes('Tier: <b>RARO</b>') ||
      !state.captions[2].includes('Leaves</b> × 3') ||
      !state.captions[3].includes('Ancient Magnemite ♂ 1ª') ||
      !state.captions[3].includes('150/192') ||
      !state.captions[3].includes('Tier: <b>LEGENDARIO</b>') ||
      state.chatIds.some((id) => String(id) !== '987654321') ||
      state.photos[0] !== 'pokegrid-217.png' || state.photos[1] !== 'pokegrid-59.png' ||
      state.photos[2] !== 'https://game.test/items/leaves.png' || state.pokeApiCalls !== 0 ||
      state.creatureCatalogCalls !== 1 || state.itemCatalogCalls !== 1 ||
      state.sections !== 4 || !state.hasScrollArea || !state.hasTokenReveal || !state.filterCardEnabled ||
      !state.shinyCards.includes('Shiny Aerodactyl Card') || state.shinyCards.includes('Regular Card') ||
      state.discoveredRecipient !== 'Personal | 987654321') {
      throw new Error(`Telegram alerts smoke failed: ${JSON.stringify(state)}`);
    }

    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
