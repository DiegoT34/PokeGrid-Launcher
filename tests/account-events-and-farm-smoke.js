const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function loadRendererFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`Could not extract ${name}.`);
  return Function(`${source.slice(start, end)}; return ${name};`)();
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 900,
    height: 700,
    webPreferences: { contextIsolation: false, sandbox: false }
  });

  try {
    await window.loadURL('data:text/html;charset=utf-8,<main class="game-root"></main>');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const monitorScript = loadRendererFunction(renderer, 'captureMonitorInstallScript', 'clearNativeCaptureLogScript');
    const farmScript = loadRendererFunction(renderer, 'farmEnhancedContextScript', 'farmEnhancedCatalogScript');
    const farmCatalogScript = loadRendererFunction(renderer, 'farmEnhancedCatalogScript', 'captureReferenceCatalogScript');
    const farmAutomationScript = loadRendererFunction(renderer, 'buildFarmAutomationScript', 'cleanFarmError');

    await window.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('.game-root');
      const socketContext = {
        send() {},
        requestPokes() {},
        subscribe(event, callback) {
          if (event === 'field-kill') window.__fieldKillCallback = callback;
          if (event === 'pokes') window.__pokesCallback = callback;
          return () => {};
        }
      };
      root.__reactProps$test = { socketContext };
    })()`);
    await window.webContents.executeJavaScript(monitorScript());
    const subscribed = await window.webContents.executeJavaScript("typeof window.__fieldKillCallback === 'function'");
    if (!subscribed) throw new Error('The per-account field-kill subscription was not installed.');

    await window.webContents.executeJavaScript(`(() => {
      const overlay = document.createElement('section');
      overlay.className = 'sa-overlay';
      overlay.innerHTML = '<div class="sn-card" role="alert"><div class="sn-title">Shiny</div><div class="sn-text">Shiny Grimer foi derrotado!</div></div>';
      document.body.appendChild(overlay);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const globalCount = await window.webContents.executeJavaScript('window.__pokeGridDefeatQueue.length');
    if (globalCount !== 0) throw new Error(`A global shiny overlay generated ${globalCount} per-account events.`);

    await window.webContents.executeJavaScript(`window.__fieldKillCallback({
      id: 'kill-1',
      speciesId: 81,
      speciesName: 'Magnemite',
      level: 10,
      looktype: 217,
      type1: 'ELECTRIC',
      type2: 'STEEL',
      xpGained: 248,
      shiny: true
    })`);
    const directEvent = await window.webContents.executeJavaScript('window.__pokeGridDefeatQueue.shift()');
    if (directEvent?.name !== 'Magnemite' || directEvent?.source !== 'field-kill' ||
      directEvent?.level !== 10 || directEvent?.xp !== 248 || directEvent?.isShiny !== true) {
      throw new Error(`Invalid direct shiny event: ${JSON.stringify(directEvent)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      const card = document.createElement('div');
      card.className = 'sn-card';
      card.setAttribute('role', 'alert');
      card.innerHTML = '<div class="sn-title">Shiny</div><div class="sn-text">Shiny Charizard foi derrotado!</div>';
      document.body.appendChild(card);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const fallbackEvent = await window.webContents.executeJavaScript('window.__pokeGridDefeatQueue.shift()');
    if (fallbackEvent?.name !== 'Charizard' || fallbackEvent?.source !== 'local-notice') {
      throw new Error(`Invalid local shiny fallback: ${JSON.stringify(fallbackEvent)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      const card = document.createElement('div');
      card.className = 'sn-card';
      card.setAttribute('role', 'alert');
      card.innerHTML = '<div class="sn-title">Shiny defeated</div><div class="sn-text">You defeated a shiny Parasect!</div>';
      document.body.appendChild(card);
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const englishFallback = await window.webContents.executeJavaScript(`({
      event: window.__pokeGridDefeatQueue.shift(),
      remaining: window.__pokeGridDefeatQueue.length
    })`);
    if (englishFallback.event?.name !== 'Parasect' || englishFallback.event?.source !== 'local-notice' ||
      englishFallback.remaining !== 0) {
      throw new Error(`English shiny notice generated a false event: ${JSON.stringify(englishFallback)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = [
        '<main class="game-root">',
        '<div class="phud-tloc">Nivel 271 · Skarmory</div>',
        '<div class="dock-poke-wrap"><span>Nivel 266</span><span>Fuerza 6353</span>',
        '<div class="sbar-hp"><span class="sbar-txt">5333/5688</span></div></div>',
        '<div class="pokemon-card-tooltip"><h3>Skarmory</h3><span class="pokemon-type">STEEL</span><span class="pokemon-type">FLYING</span>',
        '<span>Lv 266</span><span>Quality Lendária ×1.80</span><span>IV 130/192</span>',
        '<span>HP 1200</span><span>Atk 1132</span><span>Def 1115</span><span>SpA 957</span><span>SpD 1240</span><span>Spd 1163</span><b>Power 12.253</b></div>',
        '</main>'
      ].join('');
      const root = document.querySelector('.game-root');
      const leader = {
        id: 'leader-1',
        speciesId: 227,
        name: 'Skarmory',
        level: 266,
        team: false,
        leader: false,
        equipped: true,
        slot: 0,
        hp: 5300,
        maxHp: 5688,
        power: 6353,
        looktype: 398,
        type1: 'STEEL',
        type2: 'FLYING',
        ivs: { hp: 31, atk: 30, def: 31, spAtk: 20, spDef: 29, speed: 31 },
        qualityValue: 1.5,
        moves: [{ name: 'Steel Wing', type: 'STEEL', power: 140, cooldownMs: 8000, tm: true }],
        heldItems: [{ id: 59216, name: 'Steel-Type TM Disk', category: 'tm' }],
        stats: { hp: 65, atk: 80, def: 140, spAtk: 40, spDef: 70, speed: 70 }
      };
      root.__reactFiber$test = {
        memoizedState: { memoizedState: [leader, { trainerName: 'SHOCKVINY' }], next: null },
        memoizedProps: null,
        return: null
      };
    })()`);
    const farm = await window.webContents.executeJavaScript(farmScript());
    const actualFarm = {
      name: farm.leader?.name,
      level: farm.leader?.level,
      strength: farm.leader?.strength,
      hp: farm.leader?.hp,
      maxHp: farm.leader?.maxHp,
      speciesId: farm.leader?.speciesId,
      looktype: farm.leader?.looktype,
      types: farm.leader?.types?.join(','),
      trainerName: farm.trainerName,
      id: farm.leader?.id,
      ivTotal: farm.leader?.ivTotal,
      move: farm.leader?.moves?.[0]?.name,
      item: farm.leader?.items?.[0]?.name,
      defense: farm.leader?.stats?.defense,
      qualityValue: farm.leader?.qualityValue
    };
    const expectedFarm = {
      name: 'Skarmory',
      level: 266,
      strength: 12253,
      hp: 5333,
      maxHp: 5688,
      speciesId: 227,
      looktype: 398,
      types: 'steel,flying',
      trainerName: 'SHOCKVINY',
      id: 'leader-1',
      ivTotal: 130,
      move: 'Steel Wing',
      item: 'Steel-Type TM Disk',
      defense: 1115,
      qualityValue: 1.8
    };
    for (const [key, value] of Object.entries(expectedFarm)) {
      if (actualFarm[key] !== value) throw new Error(`${key}: expected ${value}, received ${actualFarm[key]}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = '<main><div class="phud-tloc">Nivel 200 · Test</div><div class="dock-poke-wrap"><span>Nivel 150</span><div class="sbar-hp"><span class="sbar-txt">400/600</span></div></div></main>';
      const root = document.querySelector('main');
      root.__reactFiber$optional = { memoizedState: { memoizedState: [{
        id: 'optional-1', speciesId: 25, name: 'Pikachu', level: 150, equipped: true, slot: 0,
        hp: 400, maxHp: 600, type1: 'ELECTRIC',
        stats: { hp: 60, attack: 70, defense: 80, specialAttack: 90, specialDefense: 100, speed: 110 }
      }], next: null }, memoizedProps: null, return: null };
    })()`);
    const optionalFarm = await window.webContents.executeJavaScript(farmScript());
    if (optionalFarm.leader?.name !== 'Pikachu' || optionalFarm.leader?.strength !== 510 || optionalFarm.leader?.ivTotal !== 0) {
      throw new Error(`IV/Quality are still required: ${JSON.stringify(optionalFarm)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      delete window.__pokeGridFarmSocketContext;
      delete window.__pokeGridFarmPokesSnapshot;
      delete window.__pokeGridFarmPokesUnsubscribe;
      delete window.__pokeGridFarmPokesSubscribed;
      document.body.innerHTML = '<main class="game-root"><div class="phud-tloc">Nivel 365 · CapeGames</div></main>';
      const payload = { type: 'pokes', list: [{
        id: 'cmsf6qfjy59dr13165zgedykn', speciesId: 103, name: 'Exeggutor', level: 410,
        leader: true, team: true, slot: 0, shiny: false, finalStage: true,
        hp: 6148, maxhp: 14556, power: 12144, quality: 2.002, barLooktype: 46,
        type1: 'GRASS', type2: 'PSYCHIC', xp: 1135713675,
        stats: { hp: 1213, atk: 964, def: 979, spAtk: 1207, spDef: 950, speed: 753 }
      }] };
      const socketContext = {
        subscribe(event, callback) { if (event === 'pokes') window.__freshPokesCallback = callback; return () => {}; },
        requestPokes() { setTimeout(() => window.__freshPokesCallback?.(payload), 10); }
      };
      document.querySelector('.game-root').__reactProps$socket = { socketContext };
    })()`);
    const websocketFarm = await window.webContents.executeJavaScript(farmScript(true));
    if (websocketFarm.leader?.id !== 'cmsf6qfjy59dr13165zgedykn' || websocketFarm.leader?.name !== 'Exeggutor' ||
      websocketFarm.leader?.strength !== 12144 || websocketFarm.leader?.maxHp !== 14556 ||
      websocketFarm.leader?.stats?.specialAttack !== 1207 || websocketFarm.leader?.types?.join(',') !== 'grass,psychic' ||
      websocketFarm.leader?.dataSource !== 'WebSocket pokes') {
      throw new Error(`WebSocket pokes leader was not read exactly: ${JSON.stringify(websocketFarm)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      window.__farmOriginalFetch = window.fetch;
      window.fetch = async (url) => {
        const path = String(url);
        const payload = path.includes('/api/game/map-markers') ? {
          worlds: [{
            slug: 'johto', name: 'Johto', maps: [{
              slug: 'johto-west', name: 'Johto Oeste', regions: [{
                slug: 'ilex-forest', name: 'Bosque Ilex', markers: [{
                  pokemonName: 'Hoothoot', fieldTeleportSlug: 'hoothoot-field', requiredLevel: 'Nv. 42'
                }]
              }]
            }]
          }]
        } : [];
        return { ok: true, json: async () => payload };
      };
    })()`);
    const nestedCatalog = await window.webContents.executeJavaScript(farmCatalogScript());
    await window.webContents.executeJavaScript('window.fetch = window.__farmOriginalFetch; delete window.__farmOriginalFetch');
    const nestedHunt = nestedCatalog?.hunts?.[0];
    if (nestedCatalog?.hunts?.length !== 1 || nestedHunt?.name !== 'Hoothoot' ||
      nestedHunt?.slug !== 'hoothoot-field' || nestedHunt?.map !== 'johto-west' ||
      nestedHunt?.area !== 'ilex-forest' || nestedHunt?.level !== 42) {
      throw new Error(`Nested map catalog was not flattened correctly: ${JSON.stringify(nestedCatalog)}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = [
        '<div class="phud-tloc">Johto · Old Hunt</div>',
        '<section data-map-window style="position:fixed;inset:10px;width:700px;height:500px">',
        '<button role="tab" data-map-slug="johto-west">Johto Oeste</button>',
        '<button role="tab" data-region="ilex-forest">Bosque Ilex</button>',
        '<input class="map-filter-q" type="search">',
        '<button data-field-teleport-slug="hoothoot-field" aria-label="Viajar a Hoothoot">Hoothoot</button>',
        '</section>',
        '<section data-pg-hunt-dialog="true" style="position:fixed;left:720px;top:10px;width:200px;height:300px"></section>',
        '<section class="clog-window" style="position:fixed;left:10px;top:520px;width:400px;height:160px"></section>'
      ].join('');
      const map = document.querySelector('[data-map-slug]');
      const area = document.querySelector('[data-region]');
      map.addEventListener('click', () => { map.setAttribute('aria-selected', 'true'); window.__newMapSelected = true; });
      area.addEventListener('click', () => { area.dataset.selected = 'true'; window.__newAreaSelected = true; });
      document.querySelector('[data-field-teleport-slug]').addEventListener('click', () => {
        document.querySelector('.phud-tloc').textContent = 'Johto Oeste · Hoothoot';
        document.querySelector('[data-map-window]')?.remove();
      });
    })()`);
    const nestedAutomationSource = farmAutomationScript({
      target: {
        slug: 'hoothoot-field', name: 'Hoothoot', map: 'johto-west', mapName: 'Johto Oeste',
        area: 'ilex-forest', areaName: 'Bosque Ilex', level: 42
      }
    });
    const nestedAutomation = await window.webContents.executeJavaScript(`(async () => {
      try { return { result: await ${nestedAutomationSource} }; }
      catch (error) { return { error: String(error?.message || error), stack: String(error?.stack || '') }; }
    })()`);
    const nestedNavigation = await window.webContents.executeJavaScript(`({
      map: window.__newMapSelected === true,
      area: window.__newAreaSelected === true
    })`);
    if (!nestedAutomation.result?.ok || !nestedNavigation.map || !nestedNavigation.area) {
      throw new Error(`New map navigation failed: ${JSON.stringify({ nestedAutomation, nestedNavigation })}`);
    }

    await window.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = [
        '<div class="phud-tloc">CapeGames · Orre Gate</div>',
        '<section class="map-window" style="position:fixed;inset:10px;width:700px;height:500px">',
        '<button class="map-area on">Orre</button>',
        '<button class="hunt-marker" data-guide="hunt-glalie">Glalie</button>',
        '</section>',
        '<section data-pg-hunt-dialog="true" style="position:fixed;left:720px;top:10px;width:200px;height:300px"></section>',
        '<section class="clog-window" style="position:fixed;left:10px;top:520px;width:400px;height:160px"></section>'
      ].join('');
      document.querySelector('.hunt-marker').addEventListener('click', () => {
        const warning = document.createElement('div');
        warning.className = 'warning-shell';
        warning.style.cssText = 'position:fixed;left:200px;top:150px;width:360px;height:190px;z-index:30';
        warning.innerHTML = '<p>To hunt properly in this area, your Pokémon needs both the AoE and elemental TMs active. Do you still want to enter?</p><button>Yes</button><button>No</button>';
        warning.querySelector('button').addEventListener('click', () => {
          window.__orreAutoConfirmed = true;
          document.querySelector('.phud-tloc').textContent = 'CapeGames · Glalie';
          document.querySelector('.map-window')?.remove();
          warning.remove();
        });
        document.body.appendChild(warning);
      });
    })()`);
    const orreAutomationSource = farmAutomationScript({
      target: { slug: 'glalie', name: 'Glalie', area: 'orre', level: 580 }
    }, { allowOrreTravel: true });
    const orreExecution = await window.webContents.executeJavaScript(`(async () => {
      try { return { result: await ${orreAutomationSource} }; }
      catch (error) { return { error: String(error?.message || error), stack: String(error?.stack || '') }; }
    })()`);
    const orreAutomation = orreExecution.result;
    const orreAutoConfirmed = await window.webContents.executeJavaScript('window.__orreAutoConfirmed === true');
    if (!orreAutoConfirmed) {
      throw new Error(`Orre confirmation was not automated: ${JSON.stringify({ orreExecution, orreAutoConfirmed })}`);
    }

    if (!renderer.includes('farmShinyFilter') || !renderer.includes('async function startFarmAccount(index)') ||
      !renderer.includes('function validateOrreTarget(') || !renderer.includes('async function disableFarmMode()') ||
      !renderer.includes("document.querySelector('main') || document.body") ||
      !renderer.includes("'La lectura del equipo tardó demasiado.'") ||
      renderer.indexOf('loadFarmCatalogFromGame()', renderer.indexOf('async function refreshFarmData()')) >
        renderer.indexOf('refreshFarmContexts({ render: false })', renderer.indexOf('async function refreshFarmData()'))) {
      throw new Error('Farm compatibility fallback, catalog priority, timeout, per-account action, or Orre pre-check is missing.');
    }
    const matchDropGoalStart = renderer.indexOf('function matchDropGoal(');
    const addDropStart = renderer.indexOf('function addDropNotification(', matchDropGoalStart);
    const matchDropGoal = Function(`const normalizeSearchText = (value) => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim(); ${renderer.slice(matchDropGoalStart, addDropStart)}; return matchDropGoal;`)();
    const dropGoal = { kind: 'drop', account: -1, pokemon: 'Shiny Aerodactyl Card', minQuantity: 2 };
    if (!matchDropGoal({ name: '  Shiny Aerodactyl Card × 2 ', quantity: 2 }, 0, dropGoal) ||
      matchDropGoal({ name: 'Shiny Paras Card', quantity: 2 }, 0, dropGoal)) {
      throw new Error('Normalized drop goal matching failed.');
    }

    const addCaptureStart = renderer.indexOf('function addCaptureNotification(');
    const addDefeatStart = renderer.indexOf('function addDefeatNotification(', addCaptureStart);
    const captureSource = renderer.slice(addCaptureStart, addDefeatStart);
    if (!captureSource.includes('const isLegendaryQuality') ||
      !captureSource.includes("capture.qualityValue >= 1.7 && capture.qualityValue <= 1.99")) {
      throw new Error('Legendary-quality captures are not included in notifications.');
    }
    if (captureSource.includes("types.push('shiny')")) {
      throw new Error('Shiny captures are still being treated as shiny defeat notifications.');
    }

    console.log(JSON.stringify({
      directEvent: { name: directEvent.name, source: directEvent.source, xp: directEvent.xp },
      fallbackEvent: { name: fallbackEvent.name, source: fallbackEvent.source },
      englishFallback: { name: englishFallback.event.name, falseEvents: englishFallback.remaining },
      farm: actualFarm,
      optionalFarm: { name: optionalFarm.leader.name, strength: optionalFarm.leader.strength, ivTotal: optionalFarm.leader.ivTotal },
      websocketFarm: { name: websocketFarm.leader.name, strength: websocketFarm.leader.strength, source: websocketFarm.leader.dataSource },
      nestedCatalog: { name: nestedHunt.name, map: nestedHunt.map, area: nestedHunt.area, slug: nestedHunt.slug },
      nestedNavigation,
      orreAutoConfirmed,
      globalOverlayIgnored: globalCount === 0
    }));
    window.close();
    app.exit(0);
  } catch (error) {
    console.error(error?.stack || error?.message || String(error));
    window.close();
    app.exit(1);
  }
});
