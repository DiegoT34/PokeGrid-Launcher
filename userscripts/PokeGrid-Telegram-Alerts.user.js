// ==UserScript==
// @name         PokeGrid Telegram Alerts
// @namespace    pokegrid.telegram-alerts
// @version      1.2.5
// @description  Alertas visuales y configurables de las cuatro cuentas de PokeGrid.
// @author       PokeGrid
// @match        https://poke.idleworld.online/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        PokeGrid_sharedStorage
// @connect      api.telegram.org
// @connect      poke.idleworld.online
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG_KEY = 'telegramConfigV1';
  const CONFIG_REFRESH_MS = 10_000;
  const DROP_SCAN_MS = 2_000;
  const SEEN_STORAGE_KEY = 'pokegrid:telegram-alerts:seen:v1';
  const SEEN_MAX_AGE = 24 * 60 * 60_000;
  const GAME_ORIGIN = 'https://poke.idleworld.online';
  const GAME_ASSET_ROOT = `${GAME_ORIGIN}/game/asset-packs`;
  const account = GM.info?.script?.account || { index: -1, label: 'Cuenta' };
  const accountLabel = String(account.label || `Cuenta ${Number(account.index) + 1}`);
  const imageCache = new Map();
  const looktypeCache = new Map();
  let creatureCatalogPromise = null;
  let itemCatalogPromise = null;
  let outfitIndexPromise = null;
  const seenEvents = loadSeenEvents();
  const huntDropTotals = new Map();
  const recentCaptureRoutes = new Map();
  const pendingCaptureAlerts = new Map();
  const recentDropRoutes = new Map();
  let config = defaults();
  let panel = null;
  let statusElement = null;
  let deliveryQueue = Promise.resolve();

  function defaults() {
    return {
      token: '',
      recipientsText: '',
      alerts: {
        filteredCaptures: false,
        legendaryCaptures: true,
        shinyCaptures: true,
        shinyDefeats: true,
        drops: false
      },
      capture: {
        minIv: 0,
        minLevel: 0,
        tiers: '',
        pokemon: ''
      },
      drops: {
        names: '',
        minQuantity: 1
      }
    };
  }

  function normalizeConfig(value) {
    const base = defaults();
    const source = value && typeof value === 'object' ? value : {};
    return {
      token: String(source.token || '').trim(),
      recipientsText: String(source.recipientsText || ''),
      alerts: {
        filteredCaptures: source.alerts?.filteredCaptures === true,
        legendaryCaptures: source.alerts?.legendaryCaptures !== false,
        shinyCaptures: source.alerts?.shinyCaptures !== false,
        shinyDefeats: source.alerts?.shinyDefeats !== false,
        drops: source.alerts?.drops === true
      },
      capture: {
        minIv: clampNumber(source.capture?.minIv, 0, 192, base.capture.minIv),
        minLevel: clampNumber(source.capture?.minLevel, 0, 9999, base.capture.minLevel),
        tiers: String(source.capture?.tiers || ''),
        pokemon: String(source.capture?.pokemon || '')
      },
      drops: {
        names: String(source.drops?.names || ''),
        minQuantity: clampNumber(source.drops?.minQuantity, 1, 999999, base.drops.minQuantity)
      }
    };
  }

  function clampNumber(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normalized(value) {
    return clean(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function invalidPokemonName(value) {
    const name = normalized(value).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    return new Set([
      'you', 'your', 'voce', 'tu', 'usted', 'ustedes', 'player', 'jogador', 'jugador',
      'pokemon', 'shiny', 'it', 'he', 'she', 'ele', 'ela'
    ]).has(name);
  }

  function loadSeenEvents() {
    try {
      const rows = JSON.parse(localStorage.getItem(SEEN_STORAGE_KEY) || '[]');
      const cutoff = Date.now() - SEEN_MAX_AGE;
      return new Map((Array.isArray(rows) ? rows : [])
        .filter((row) => Array.isArray(row) && typeof row[0] === 'string' && Number(row[1]) >= cutoff)
        .slice(-500));
    } catch {
      return new Map();
    }
  }

  function saveSeenEvents() {
    try {
      const cutoff = Date.now() - SEEN_MAX_AGE;
      const rows = [...seenEvents].filter(([, timestamp]) => timestamp >= cutoff).slice(-500);
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(rows));
    } catch {}
  }

  function listFrom(value) {
    return String(value || '')
      .split(/[\n,;]+/)
      .map(normalized)
      .filter(Boolean);
  }

  function firstNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const match = clean(value).replace(',', '.').match(/-?[0-9]+(?:[.][0-9]+)?/);
    const parsed = match ? Number(match[0]) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }

  function canonicalTier(value) {
    const source = normalized(value).replace(/[^a-z0-9 ]/g, ' ');
    const aliases = [
      ['divine', ['divine', 'divino', 'divina']],
      ['ancient', ['ancient', 'ancestral', 'antiguo', 'antigua']],
      ['mythic', ['mythic', 'mitico', 'mitica']],
      ['legendary', ['legendary', 'legendario', 'legendaria']],
      ['epic', ['epic', 'epico', 'epica']],
      ['rare', ['rare', 'raro', 'rara']],
      ['uncommon', ['uncommon', 'poco comun']],
      ['common', ['common', 'comun']],
      ['weak', ['weak', 'debil']]
    ];
    return aliases.find(([, values]) => values.some((alias) =>
      (` ${source} `).includes(` ${alias} `)))?.[0] || source.trim();
  }

  const KNOWN_TIERS = new Set(['weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine']);

  function knownTier(value) {
    const tier = canonicalTier(value);
    return KNOWN_TIERS.has(tier) ? tier : '';
  }

  function tierFromQuality(value) {
    const quality = firstNumber(value);
    if (quality === null || quality <= 0) return '';
    if (quality >= 4) return 'divine';
    if (quality >= 3) return 'ancient';
    if (quality >= 2) return 'mythic';
    if (quality >= 1.7) return 'legendary';
    if (quality >= 1.5) return 'epic';
    if (quality >= 1.3) return 'rare';
    if (quality >= 1.1) return 'uncommon';
    if (quality >= 1) return 'common';
    return 'weak';
  }

  function displayTier(tier) {
    return {
      weak: 'DÉBIL', common: 'COMÚN', uncommon: 'INCOMÚN', rare: 'RARO', epic: 'ÉPICO',
      legendary: 'LEGENDARIO', mythic: 'MÍTICO', ancient: 'ANCESTRAL', divine: 'DIVINO'
    }[tier] || '';
  }

  function captureRowTier(capture) {
    const targetName = canonicalPokemonName(capture.name);
    const targetIv = firstNumber(capture.iv ?? capture.meta);
    const targetLevel = firstNumber(capture.level);
    const rows = [...document.querySelectorAll('.clog-row')];
    for (const row of rows) {
      const rowName = canonicalPokemonName(row.querySelector('.clog-name')?.textContent || row.textContent);
      const sameName = ` ${rowName} `.includes(` ${targetName} `) ||
        ` ${targetName} `.includes(` ${rowName} `);
      if (targetName && rowName && !sameName) continue;
      const meta = clean(row.querySelector('.clog-meta')?.textContent || row.textContent);
      const rowIv = firstNumber(meta.match(/iv[^0-9]*([0-9]+)/i)?.[1]);
      const rowLevel = firstNumber(row.querySelector('.clog-lvl')?.textContent);
      if (targetIv !== null && rowIv !== null && targetIv !== rowIv) continue;
      if (targetLevel !== null && rowLevel !== null && targetLevel !== rowLevel) continue;
      const tier = knownTier(meta);
      if (tier) return tier;
      const qualityTier = tierFromQuality(meta.match(/x\s*([0-9]+(?:[.,][0-9]+)?)/i)?.[1]);
      if (qualityTier) return qualityTier;
    }
    return '';
  }

  function captureRecords(payload) {
    const records = [];
    const seen = new WeakSet();
    const visit = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 7 || seen.has(value)) return;
      seen.add(value);
      if (!Array.isArray(value)) {
        const name = clean(value.pokemonName || value.pokeName || value.speciesName || value.displayName ||
          value.pokemon?.name || value.species?.name || value.name);
        if (name && (value.iv != null || value.ivs != null || value.ivTotal != null || value.totalIv != null ||
          value.quality != null || value.qualityValue != null || value.qualityMultiplier != null ||
          value.qualityMult != null || value.rarityMultiplier != null || value.multiplier != null ||
          value.tier || value.rarity)) records.push(value);
      }
      Object.values(value).slice(0, 150).forEach((child) => visit(child, depth + 1));
    };
    visit(payload);
    return records;
  }

  function captureRecordTier(capture, payload) {
    const targetName = canonicalPokemonName(capture.name);
    const targetIv = firstNumber(capture.iv ?? capture.meta);
    const targetLevel = firstNumber(capture.level);
    const candidates = captureRecords(payload).filter((record) => {
      const name = canonicalPokemonName(record.pokemonName || record.pokeName || record.speciesName ||
        record.displayName || record.pokemon?.name || record.species?.name || record.name);
      const sameName = ` ${name} `.includes(` ${targetName} `) ||
        ` ${targetName} `.includes(` ${name} `);
      if (targetName && name && !sameName) return false;
      const iv = firstNumber(record.ivTotal ?? record.totalIv ?? record.iv);
      const level = firstNumber(record.level ?? record.pokemon?.level);
      if (targetIv !== null && iv !== null && targetIv !== iv) return false;
      if (targetLevel !== null && level !== null && targetLevel !== level) return false;
      return true;
    });
    for (const record of candidates) {
      const explicit = knownTier(`${record.qualityName || ''} ${record.rarity || ''} ${record.tier || ''}`);
      if (explicit) return explicit;
      const qualityTier = tierFromQuality(record.qualityValue ?? record.qualityMultiplier ?? record.qualityMult ??
        record.rarityMultiplier ?? record.multiplier ?? record.quality);
      if (qualityTier) return qualityTier;
    }
    return '';
  }

  async function resolveCaptureTier(capture) {
    const explicit = knownTier(`${capture.tier || ''} ${capture.quality || ''} ${capture.meta || ''}`);
    if (explicit) return explicit;
    const qualityTier = tierFromQuality(capture.qualityValue ?? capture.qualityMultiplier ?? capture.qualityMult ??
      capture.rarityMultiplier ?? capture.quality);
    if (qualityTier) return qualityTier;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const rowTier = captureRowTier(capture);
      if (rowTier) return rowTier;
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 180));
    }
    let payload = window.__pokeGridCaptureLogPayload;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const cachedTier = captureRecordTier(capture, payload);
      if (cachedTier) return cachedTier;
      try {
        const response = await fetch('/api/game/capture-log?filter=all', { credentials: 'include', cache: 'no-store' });
        if (response.ok) {
          payload = await response.json();
          window.__pokeGridCaptureLogPayload = payload;
          window.__pokeGridCaptureLogPayloadAt = Date.now();
          const apiTier = captureRecordTier(capture, payload);
          if (apiTier) return apiTier;
        }
      } catch {}
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 350));
    }
    return '';
  }

  function canonicalPokemonName(value) {
    return normalized(value)
      .replace(/[♀♂]/g, ' ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseRecipients(value = config.recipientsText) {
    const rows = [];
    for (const line of String(value || '').split(/\r?\n/)) {
      const text = line.trim();
      if (!text || text.startsWith('#')) continue;
      const parts = text.split('|').map((part) => part.trim());
      const chatId = String(parts.length > 1 ? parts.at(-1) : parts[0]).trim();
      const label = parts.length > 1 ? parts.slice(0, -1).join(' | ') : `Chat ${rows.length + 1}`;
      if (/^-?\d{4,25}$/.test(chatId)) rows.push({ label: label || chatId, chatId });
    }
    return rows;
  }

  function hasCredentials() {
    return /^\d+:[A-Za-z0-9_-]{20,}$/.test(config.token) && parseRecipients().length > 0;
  }

  function setStatus(text, kind = '') {
    if (!statusElement) return;
    statusElement.textContent = text;
    statusElement.dataset.kind = kind;
  }

  async function loadConfig(updateForm = false) {
    try {
      config = normalizeConfig(await GM.getSharedValue(CONFIG_KEY, defaults()));
      if (updateForm && panel) writeConfigToForm();
      updateButtonState();
    } catch (error) {
      setStatus(`No se pudo leer la configuración cifrada: ${error.message}`, 'error');
    }
  }

  async function saveConfigFromForm() {
    const next = normalizeConfig({
      token: field('token').value,
      recipientsText: field('recipients').value,
      alerts: {
        filteredCaptures: field('filteredCaptures').checked,
        legendaryCaptures: field('legendaryCaptures').checked,
        shinyCaptures: field('shinyCaptures').checked,
        shinyDefeats: field('shinyDefeats').checked,
        drops: field('drops').checked
      },
      capture: {
        minIv: field('minIv').value,
        minLevel: field('minLevel').value,
        tiers: field('tiers').value,
        pokemon: field('pokemon').value
      },
      drops: {
        names: field('dropNames').value,
        minQuantity: field('dropMinQuantity').value
      }
    });
    if (next.token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(next.token)) {
      setStatus('El token no tiene el formato entregado por BotFather.', 'error');
      return false;
    }
    if (next.recipientsText.trim() && !parseRecipients(next.recipientsText).length) {
      setStatus('Añade al menos un chat_id válido. Ejemplo: Personal | 123456789', 'error');
      return false;
    }
    try {
      await GM.setSharedValue(CONFIG_KEY, next);
      config = next;
      updateButtonState();
      setStatus('Configuración cifrada y compartida con las cuatro cuentas.', 'ok');
      return true;
    } catch (error) {
      setStatus(`No se pudo guardar: ${error.message}`, 'error');
      return false;
    }
  }

  function field(name) {
    return panel.querySelector(`[data-tg-field="${name}"]`);
  }

  function writeConfigToForm() {
    field('token').value = config.token;
    field('recipients').value = config.recipientsText;
    field('filteredCaptures').checked = config.alerts.filteredCaptures;
    field('legendaryCaptures').checked = config.alerts.legendaryCaptures;
    field('shinyCaptures').checked = config.alerts.shinyCaptures;
    field('shinyDefeats').checked = config.alerts.shinyDefeats;
    field('drops').checked = config.alerts.drops;
    field('minIv').value = String(config.capture.minIv);
    field('minLevel').value = String(config.capture.minLevel);
    field('tiers').value = config.capture.tiers;
    field('pokemon').value = config.capture.pokemon;
    field('dropNames').value = config.drops.names;
    field('dropMinQuantity').value = String(config.drops.minQuantity);
    panel.querySelector('.pgtg-filter-card')?.classList.toggle('is-enabled', config.alerts.filteredCaptures);
  }

  function updateButtonState() {
    const button = document.querySelector('#pokegrid-telegram-button');
    if (!button) return;
    button.classList.toggle('is-ready', hasCredentials());
    button.title = hasCredentials()
      ? `Telegram conectado · ${accountLabel}`
      : 'Configurar alertas Telegram';
  }

  function createInterface() {
    if (document.querySelector('#pokegrid-telegram-button')) return;
    GM.addStyle(`
      #pokegrid-telegram-button {
        position: fixed; right: 58px; bottom: 12px; z-index: 2147483638;
        width: 38px; height: 34px; border: 1px solid #377d9e; border-radius: 9px;
        background: #102e3d; color: #91dfff; font: 800 11px/1 system-ui;
        box-shadow: 0 5px 18px #0009; cursor: pointer; transition: .16s ease;
      }
      #pokegrid-telegram-button:hover { background: #176084; transform: translateY(-1px); }
      #pokegrid-telegram-button:active { transform: translateY(1px) scale(.97); }
      #pokegrid-telegram-button.is-ready { border-color: #35d99a; color: #5cf0b5; }
      #pokegrid-telegram-panel {
        position: fixed; right: 10px; top: 10px; z-index: 2147483640;
        width: min(390px, calc(100vw - 20px)); max-height: calc(100vh - 20px);
        overflow: auto; box-sizing: border-box; padding: 12px; border: 1px solid #2d7191;
        border-radius: 11px; background: #071722f7; color: #d9edf6;
        box-shadow: 0 18px 55px #000c; font: 11px/1.35 system-ui, sans-serif;
      }
      #pokegrid-telegram-panel[hidden] { display: none !important; }
      #pokegrid-telegram-panel * { box-sizing: border-box; }
      .pgtg-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
      .pgtg-head b { display: block; color: #7cddff; font-size: 14px; letter-spacing: .04em; }
      .pgtg-head small { color: #6d9cac; }
      .pgtg-close { width: 28px; height: 26px; border: 1px solid #315466; border-radius: 7px;
        background: #102735; color: #b8d2dc; cursor: pointer; }
      .pgtg-section { margin-top: 10px; padding-top: 9px; border-top: 1px solid #153d4e; }
      .pgtg-section > strong { display: block; margin-bottom: 6px; color: #55d9ac;
        font-size: 9px; letter-spacing: .11em; text-transform: uppercase; }
      .pgtg-label { display: block; margin: 6px 0 3px; color: #8fb7c5; font-size: 9px; font-weight: 700; }
      .pgtg-input, .pgtg-textarea {
        width: 100%; border: 1px solid #254b5e; border-radius: 7px; outline: none;
        background: #091e2a; color: #eefaff; padding: 7px 8px; font: 11px system-ui;
      }
      .pgtg-input:focus, .pgtg-textarea:focus { border-color: #42b9e7; }
      .pgtg-textarea { min-height: 48px; resize: vertical; }
      .pgtg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
      .pgtg-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 8px; }
      .pgtg-check { display: flex; align-items: center; gap: 5px; min-height: 23px; color: #c5dce5; }
      .pgtg-check input { accent-color: #2fcf9a; }
      .pgtg-help { margin: 5px 0 0; color: #668b99; font-size: 9px; }
      .pgtg-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin-top: 11px; }
      .pgtg-action { border: 1px solid #2b6e8d; border-radius: 8px; padding: 8px;
        background: #113b50; color: #dff7ff; font: 800 10px system-ui; cursor: pointer; }
      .pgtg-action:hover { background: #185b79; }
      .pgtg-action.is-primary { border-color: #239c73; background: #126247; color: #dffff3; }
      .pgtg-action:disabled { opacity: .5; cursor: wait; }
      .pgtg-inline-action { width: 100%; min-height: 30px; margin-top: 6px; border: 1px solid #9a761d;
        border-radius: 7px; background: #3b3012; color: #ffe083; font: 800 9px system-ui; cursor: pointer; }
      .pgtg-inline-action:hover { border-color: #e4ad1f; background: #514016; }
      .pgtg-status { min-height: 16px; margin: 8px 0 0; color: #86adbb; font-size: 9px; }
      .pgtg-status[data-kind="ok"] { color: #57e9ae; }
      .pgtg-status[data-kind="error"] { color: #ff8a9d; }
      #pokegrid-telegram-button { display: grid; place-items: center; border-radius: 50%; background: #168dcc; }
      #pokegrid-telegram-button svg { width: 21px; height: 21px; display: block; fill: #fff; }
      #pokegrid-telegram-button.is-ready { border-color: #66e3bc; background: #168dcc; box-shadow: 0 0 0 3px #35d99a24, 0 6px 20px #0009; }
      #pokegrid-telegram-panel {
        width: min(560px, calc(100vw - 20px)); padding: 0; overflow: hidden;
        border-color: #266581; border-radius: 14px; background: #06141e;
        font-size: 12px;
      }
      .pgtg-scroll { max-height: calc(100vh - 126px); padding: 12px 14px 4px; overflow: auto; scrollbar-width: thin; scrollbar-color: #2588b2 #071925; }
      .pgtg-head { position: sticky; top: 0; z-index: 2; padding: 13px 14px; align-items: center; border-bottom: 1px solid #184158; background: #081d2a; }
      .pgtg-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .pgtg-brand-icon { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 50%; background: #168dcc; }
      .pgtg-brand-icon svg { width: 20px; height: 20px; fill: #fff; }
      .pgtg-head b { color: #eef9fd; font-size: 15px; }
      .pgtg-head small { display: block; margin-top: 2px; color: #7195a7; }
      .pgtg-close { flex: 0 0 auto; width: 31px; height: 31px; font-size: 18px; }
      .pgtg-section { margin: 0 0 10px; padding: 11px; border: 1px solid #17384a; border-radius: 10px; background: #081b27; }
      .pgtg-section > strong { margin: 0 0 2px; color: #65cfee; font-size: 10px; }
      .pgtg-section-intro { margin: 0 0 9px; color: #668797; font-size: 9px; }
      .pgtg-step { display: inline-grid; width: 18px; height: 18px; margin-right: 6px; place-items: center; border: 1px solid #2a789a; border-radius: 50%; color: #7edcff; font-size: 8px; }
      .pgtg-input, .pgtg-textarea { min-height: 36px; border-color: #245068; background: #061722; }
      .pgtg-textarea { min-height: 62px; }
      .pgtg-checks { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
      .pgtg-check { position: relative; min-height: 49px; padding: 8px 9px; align-items: flex-start; border: 1px solid #1b4053; border-radius: 8px; background: #071722; cursor: pointer; }
      .pgtg-check:hover { border-color: #2d7593; background: #09202e; }
      .pgtg-check input { margin-top: 2px; flex: 0 0 auto; }
      .pgtg-check-copy { min-width: 0; display: block; }
      .pgtg-check-copy b { display: block; color: #d8eaf1; font-size: 10px; }
      .pgtg-check-copy small { display: block; margin-top: 2px; color: #5f8190; font-size: 8px; line-height: 1.3; }
      .pgtg-filter-card { border-color: #1e5368; }
      .pgtg-filter-card.is-enabled { border-color: #278c78; box-shadow: inset 3px 0 0 #35c99a; }
      .pgtg-filter-note { margin: 8px 0 0; padding: 7px 8px; border-radius: 6px; background: #0b2634; color: #79a3b4; font-size: 8px; }
      .pgtg-actions { position: sticky; bottom: 0; z-index: 2; margin: 0; padding: 10px 14px; border-top: 1px solid #184158; background: #081d2af5; }
      .pgtg-action { min-height: 37px; }
      .pgtg-status { margin: 0; padding: 8px 14px 10px; background: #081d2a; }
      .pgtg-token-wrap { position: relative; }
      .pgtg-token-wrap .pgtg-input { padding-right: 68px; }
      .pgtg-reveal { position: absolute; top: 4px; right: 4px; height: 28px; padding: 0 9px; border: 0; border-radius: 5px; background: #12364a; color: #8cc9df; font: 800 8px system-ui; cursor: pointer; }
      @media (max-width: 540px) {
        .pgtg-grid, .pgtg-checks { grid-template-columns: 1fr; }
        .pgtg-actions { grid-template-columns: 1fr; }
        .pgtg-scroll { max-height: calc(100vh - 202px); }
      }
    `);

    const button = document.createElement('button');
    button.id = 'pokegrid-telegram-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Configurar alertas de Telegram');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 2.4 2.9 9.6c-1.28.51-1.27 1.23-.23 1.55l4.8 1.5 1.84 5.75c.23.64.12.9.78.9.51 0 .74-.23 1.02-.5l2.31-2.25 4.8 3.55c.88.49 1.52.24 1.74-.82L23.1 4.45c.32-1.3-.5-1.89-1.5-2.05ZM9.16 12.3l9.38-5.92c.47-.29.9-.14.55.17l-7.74 6.98-.3 3.16-1.89-4.39Z"/></svg>';
    document.documentElement.appendChild(button);

    panel = document.createElement('section');
    panel.id = 'pokegrid-telegram-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="pgtg-head">
        <div class="pgtg-brand"><span class="pgtg-brand-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21.6 2.4 2.9 9.6c-1.28.51-1.27 1.23-.23 1.55l4.8 1.5 1.84 5.75c.23.64.12.9.78.9.51 0 .74-.23 1.02-.5l2.31-2.25 4.8 3.55c.88.49 1.52.24 1.74-.82L23.1 4.45c.32-1.3-.5-1.89-1.5-2.05ZM9.16 12.3l9.38-5.92c.47-.29.9-.14.55.17l-7.74 6.98-.3 3.16-1.89-4.39Z"/></svg></span><div><b>Telegram Alerts</b><small>${escapeHtml(accountLabel)} · configuración compartida y cifrada</small></div></div>
        <button class="pgtg-close" type="button" aria-label="Cerrar">&times;</button>
      </div>
      <div class="pgtg-scroll">
      <div class="pgtg-section">
        <strong><span class="pgtg-step">1</span>Conexión del bot</strong>
        <p class="pgtg-section-intro">Conecta el bot creado en BotFather y elige dónde recibirás las alertas.</p>
        <label class="pgtg-label">TOKEN DE BOTFATHER</label>
        <div class="pgtg-token-wrap"><input class="pgtg-input" data-tg-field="token" type="password" autocomplete="off" placeholder="123456789:AA..."><button class="pgtg-reveal" data-tg-action="reveal" type="button">MOSTRAR</button></div>
        <label class="pgtg-label">DESTINATARIOS · UNO POR LÍNEA</label>
        <textarea class="pgtg-textarea" data-tg-field="recipients" placeholder="Mi Telegram | 123456789&#10;Grupo | -1001234567890"></textarea>
        <p class="pgtg-help">Puedes usar “Detectar chats” después de escribirle al bot para completar esta lista automáticamente.</p>
      </div>
      <div class="pgtg-section">
        <strong><span class="pgtg-step">2</span>Alertas que deseas recibir</strong>
        <p class="pgtg-section-intro">Activa solo los eventos importantes para evitar mensajes innecesarios.</p>
        <div class="pgtg-checks">
          <label class="pgtg-check"><input data-tg-field="filteredCaptures" type="checkbox"><span class="pgtg-check-copy"><b>Capturas con filtro</b><small>Solo Pokémon que cumplan todos los valores del paso 3.</small></span></label>
          <label class="pgtg-check"><input data-tg-field="legendaryCaptures" type="checkbox"><span class="pgtg-check-copy"><b>Legendarios</b><small>Capturas de tier legendario o mítico.</small></span></label>
          <label class="pgtg-check"><input data-tg-field="shinyCaptures" type="checkbox"><span class="pgtg-check-copy"><b>Shiny capturados</b><small>Cuando una captura shiny tiene éxito.</small></span></label>
          <label class="pgtg-check"><input data-tg-field="shinyDefeats" type="checkbox"><span class="pgtg-check-copy"><b>Shiny derrotados</b><small>Cuando un shiny es derrotado sin capturarlo.</small></span></label>
          <label class="pgtg-check"><input data-tg-field="drops" type="checkbox"><span class="pgtg-check-copy"><b>Drops obtenidos</b><small>Objetos que cumplan el filtro de drops.</small></span></label>
        </div>
      </div>
      <div class="pgtg-section pgtg-filter-card">
        <strong><span class="pgtg-step">3</span>Filtros de captura</strong>
        <p class="pgtg-section-intro">Los límites son inclusivos: IV 150 también acepta una captura con IV exactamente 150.</p>
        <div class="pgtg-grid">
          <div><label class="pgtg-label">IV TOTAL MÍNIMO</label><input class="pgtg-input" data-tg-field="minIv" type="number" min="0" max="192"></div>
          <div><label class="pgtg-label">NIVEL MÍNIMO</label><input class="pgtg-input" data-tg-field="minLevel" type="number" min="0" max="9999"></div>
        </div>
        <label class="pgtg-label">TIERS PERMITIDOS</label>
        <input class="pgtg-input" data-tg-field="tiers" placeholder="rare, epic, legendary">
        <label class="pgtg-label">POKÉMON PERMITIDOS</label>
        <input class="pgtg-input" data-tg-field="pokemon" placeholder="Magnemite, Pikachu">
        <p class="pgtg-filter-note">Se deben cumplir todos los campos configurados. Deja un campo vacío o en 0 para no limitarlo.</p>
      </div>
      <div class="pgtg-section">
        <strong><span class="pgtg-step">4</span>Filtros de drops</strong>
        <p class="pgtg-section-intro">Limita los objetos por nombre y cantidad obtenida en un mismo evento.</p>
        <div class="pgtg-grid">
          <div style="grid-column:span 1"><label class="pgtg-label">OBJETOS</label><input class="pgtg-input" data-tg-field="dropNames" placeholder="Leaves, Seed"><button class="pgtg-inline-action" data-tg-action="shiny-cards" type="button">✦ SELECCIONAR TODAS LAS SHINY CARDS</button></div>
          <div><label class="pgtg-label">CANTIDAD MÍNIMA</label><input class="pgtg-input" data-tg-field="dropMinQuantity" type="number" min="1"></div>
        </div>
      </div>
      </div>
      <div class="pgtg-actions">
        <button class="pgtg-action is-primary" data-tg-action="save" type="button">✓ GUARDAR</button>
        <button class="pgtg-action" data-tg-action="chats" type="button">⌕ DETECTAR CHATS</button>
        <button class="pgtg-action" data-tg-action="test" type="button">▷ PROBAR BOT</button>
      </div>
      <p class="pgtg-status" role="status"></p>
    `;
    document.documentElement.appendChild(panel);
    statusElement = panel.querySelector('.pgtg-status');
    writeConfigToForm();
    updateButtonState();

    button.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        loadConfig(true);
        setStatus(hasCredentials() ? 'Listo para enviar alertas.' : 'Configura el bot y un chat_id.');
      }
    });
    panel.querySelector('.pgtg-close').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('[data-tg-action="save"]').addEventListener('click', saveConfigFromForm);
    panel.querySelector('[data-tg-action="chats"]').addEventListener('click', discoverChatsFromPanel);
    panel.querySelector('[data-tg-action="test"]').addEventListener('click', testBotFromPanel);
    panel.querySelector('[data-tg-action="shiny-cards"]').addEventListener('click', selectAllShinyCards);
    panel.querySelector('[data-tg-action="reveal"]').addEventListener('click', (event) => {
      const token = field('token');
      const visible = token.type === 'text';
      token.type = visible ? 'password' : 'text';
      event.currentTarget.textContent = visible ? 'MOSTRAR' : 'OCULTAR';
    });
    const syncFilterCard = () => {
      panel.querySelector('.pgtg-filter-card').classList.toggle('is-enabled', field('filteredCaptures').checked);
    };
    field('filteredCaptures').addEventListener('change', syncFilterCard);
    ['minIv', 'minLevel', 'tiers', 'pokemon'].forEach((name) => {
      field(name).addEventListener('input', () => {
        const configured = Number(field('minIv').value) > 0 || Number(field('minLevel').value) > 0 ||
          field('tiers').value.trim() || field('pokemon').value.trim();
        if (configured) field('filteredCaptures').checked = true;
        syncFilterCard();
      });
    });
    syncFilterCard();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  async function requestJson(url, payload = null) {
    const response = await GM.xmlHttpRequest({
      method: payload === null ? 'GET' : 'POST',
      url,
      headers: payload === null ? {} : { 'content-type': 'application/json' },
      data: payload === null ? undefined : JSON.stringify(payload)
    });
    let body = null;
    try { body = JSON.parse(response.responseText || '{}'); } catch {}
    if (response.status < 200 || response.status >= 300 || body?.ok === false) {
      throw new Error(body?.description || `HTTP ${response.status}`);
    }
    return body;
  }

  async function requestMultipart(url, fields) {
    const response = await GM.xmlHttpRequest({ method: 'POST', url, multipart: fields });
    let body = null;
    try { body = JSON.parse(response.responseText || '{}'); } catch {}
    if (response.status < 200 || response.status >= 300 || body?.ok === false) {
      throw new Error(body?.description || `HTTP ${response.status}`);
    }
    return body;
  }

  async function testBotFromPanel() {
    const testButton = panel.querySelector('[data-tg-action="test"]');
    testButton.disabled = true;
    try {
      if (!(await saveConfigFromForm()) || !hasCredentials()) {
        if (!hasCredentials()) setStatus('Guarda un token y un chat_id antes de probar.', 'error');
        return;
      }
      setStatus('Verificando bot y enviando prueba…');
      const identity = await requestJson(`https://api.telegram.org/bot${config.token}/getMe`);
      const image = await resolvePokemonImage('Pikachu', false, 25);
      await deliver({
        photo: image,
        caption: [
          '✅ <b>PokeGrid conectado</b>',
          `🤖 Bot: <b>${escapeHtml(identity?.result?.username || identity?.result?.first_name || 'Telegram')}</b>`,
          `👤 Cuenta de prueba: <b>${escapeHtml(accountLabel)}</b>`,
          'Las alertas visuales están listas.'
        ].join('\n')
      });
      setStatus('Prueba enviada correctamente a todos los destinatarios.', 'ok');
    } catch (error) {
      setStatus(`Telegram rechazó la prueba: ${error.message}`, 'error');
    } finally {
      testButton.disabled = false;
    }
  }

  async function discoverChatsFromPanel() {
    const button = panel.querySelector('[data-tg-action="chats"]');
    const token = field('token').value.trim();
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
      setStatus('Pega primero el token entregado por BotFather.', 'error');
      return;
    }
    button.disabled = true;
    try {
      setStatus('Buscando conversaciones recientes del bot…');
      const updates = await requestJson(`https://api.telegram.org/bot${token}/getUpdates`);
      const chats = new Map();
      for (const update of updates?.result || []) {
        const candidates = [
          update.message?.chat,
          update.edited_message?.chat,
          update.channel_post?.chat,
          update.edited_channel_post?.chat,
          update.my_chat_member?.chat,
          update.chat_member?.chat
        ].filter(Boolean);
        for (const chat of candidates) {
          const id = String(chat.id ?? '');
          if (!/^-?\d{4,25}$/.test(id)) continue;
          const label = clean(
            chat.title || chat.username && `@${chat.username}` ||
            [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
            `${chat.type || 'Chat'} ${id}`
          );
          chats.set(id, `${label || id} | ${id}`);
        }
      }
      if (!chats.size) {
        setStatus('No hay chats recientes. Envía /start al bot y vuelve a detectar.', 'error');
        return;
      }
      field('recipients').value = [...chats.values()].join('\n');
      setStatus(`${chats.size} chat(s) detectado(s). Guarda para compartirlos con las cuatro cuentas.`, 'ok');
    } catch (error) {
      setStatus(`No se pudieron detectar chats: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  function basePokemonName(name) {
    let value = normalized(name)
      .replace(/['’.:]/g, '')
      .replace(/[♀♂]/g, ' ')
      .replace(/[^a-z0-9 -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const prefixes = [
      'shiny', 'brave', 'furious', 'ancient', 'taekwondo', 'tribal', 'war',
      'enigmatic', 'charged', 'magnetic', 'evil', 'freezing', 'psy', 'heavy',
      'milch', 'roll', 'hard', 'brute', 'enraged', 'dark', 'trickmaster', 'banshee'
    ];
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of prefixes) {
        if (value.startsWith(`${prefix} `)) {
          value = value.slice(prefix.length + 1).trim();
          changed = true;
        }
      }
    }
    return value.replace(/\s+\d+(?:\s*(?:a|o|st|nd|rd|th))?.*$/i, '').trim();
  }

  async function creatureCatalog() {
    if (!creatureCatalogPromise) {
      creatureCatalogPromise = requestJson(`${GAME_ORIGIN}/game/creatures.json`)
        .then((body) => Array.isArray(body?.creatures) ? body.creatures : [])
        .catch(() => []);
    }
    return creatureCatalogPromise;
  }

  async function resolveLooktype(name, speciesId = null, explicitLooktype = null) {
    const direct = Number(explicitLooktype);
    if (Number.isInteger(direct) && direct > 0) return direct;
    const id = Number(speciesId);
    const exactName = normalized(name);
    const baseName = basePokemonName(name);
    const cacheKey = `${Number.isFinite(id) ? id : ''}:${exactName}`;
    if (looktypeCache.has(cacheKey)) return looktypeCache.get(cacheKey);
    const rows = await creatureCatalog();
    const match = rows.find((row) => normalized(row.name) === exactName) ||
      (Number.isFinite(id) && id > 0 ? rows.find((row) => Number(row.pokeId) === id) : null) ||
      rows.find((row) => normalized(row.name) === baseName);
    const looktype = Math.max(0, Number(match?.looktype) || 0);
    looktypeCache.set(cacheKey, looktype);
    return looktype;
  }

  async function outfitIndex() {
    if (!outfitIndexPromise) {
      outfitIndexPromise = requestJson(`${GAME_ASSET_ROOT}/outfits-index.json?v=2`)
        .then((body) => body?.outfits || {})
        .catch(() => ({}));
    }
    return outfitIndexPromise;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar el atlas del juego.'));
      image.src = url;
    });
  }

  async function renderGamePokemonSprite(looktype) {
    if (typeof window.__pokeGridTelegramRenderPokemonSprite === 'function') {
      return window.__pokeGridTelegramRenderPokemonSprite(looktype);
    }
    const index = await outfitIndex();
    const outfit = index[String(looktype)];
    if (!outfit?.manifest) return '';
    const manifestUrl = new URL(String(outfit.manifest).replace(/^\/assets-packs/, '/game/asset-packs'), GAME_ORIGIN).href;
    const manifest = await requestJson(manifestUrl);
    const category = manifest?.categories?.[outfit.category] || Object.values(manifest?.categories || {})[0];
    const assetEntries = Object.entries(manifest?.assets || {});
    const selected = assetEntries.find(([path]) => /\/1_1_1_3\.png$/i.test(path)) || assetEntries[0];
    const frame = selected?.[1]?.frames?.[0];
    const page = category?.pages?.find((candidate) => Number(candidate.index) === Number(frame?.page)) || category?.pages?.[0];
    if (!frame || !page?.image) return '';
    const atlasUrl = new URL(String(page.image).replace(/^\/assets-packs/, '/game/asset-packs'), GAME_ORIGIN).href;
    const atlas = await loadImage(atlasUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    const scale = Math.min(224 / frame.w, 224 / frame.h);
    const width = Math.max(1, Math.round(frame.w * scale));
    const height = Math.max(1, Math.round(frame.h * scale));
    context.drawImage(
      atlas, frame.x, frame.y, frame.w, frame.h,
      Math.round((256 - width) / 2), Math.round((256 - height) / 2), width, height
    );
    const dataUrl = canvas.toDataURL('image/png');
    return {
      base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
      mimeType: 'image/png',
      filename: `pokegrid-${looktype}.png`
    };
  }

  async function resolvePokemonImage(name, _shiny = false, speciesId = null, explicitLooktype = null) {
    const looktype = await resolveLooktype(name, speciesId, explicitLooktype);
    if (!looktype) return '';
    const cacheKey = `game:${looktype}`;
    if (!imageCache.has(cacheKey)) {
      imageCache.set(cacheKey, renderGamePokemonSprite(looktype).catch(() => ''));
    }
    return imageCache.get(cacheKey);
  }

  async function itemCatalog() {
    if (!itemCatalogPromise) {
      itemCatalogPromise = requestJson(`${GAME_ORIGIN}/game/items.json`)
        .then((body) => Array.isArray(body?.items) ? body.items : [])
        .catch(() => []);
    }
    return itemCatalogPromise;
  }

  async function selectAllShinyCards(event) {
    const button = event?.currentTarget;
    if (button) button.disabled = true;
    try {
      const rows = await itemCatalog();
      const names = [...new Set(rows
        .map((row) => clean(row?.name || row?.label || row?.title))
        .filter((name) => {
          const value = normalized(name);
          return /\bcard\b/.test(value) && /\b(?:shiny|variocolor)\b/.test(value);
        }))].sort((left, right) => left.localeCompare(right, 'es'));
      if (!names.length) throw new Error('El catálogo no contiene Shiny Cards.');
      field('dropNames').value = names.join(', ');
      field('drops').checked = true;
      setStatus(`${names.length} Shiny Cards seleccionadas. Pulsa GUARDAR para aplicar el filtro.`, 'ok');
    } catch (error) {
      setStatus(`No se pudieron cargar las Shiny Cards: ${error.message}`, 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function resolveDropImage(drop) {
    const direct = clean(drop?.icon);
    if (/^https:\/\//i.test(direct)) return direct;
    const rows = await itemCatalog();
    const id = Number(drop?.itemId);
    const name = normalized(drop?.name);
    const item = (Number.isFinite(id) && id > 0 ? rows.find((row) => Number(row.id ?? row.itemId) === id) : null) ||
      rows.find((row) => normalized(row.name) === name);
    const icon = clean(item?.iconUrl || item?.icon || item?.image);
    if (!icon) return '';
    try { return new URL(icon, GAME_ORIGIN).href; } catch { return ''; }
  }

  function eventIsFresh(key, ttl = 60_000) {
    const now = Date.now();
    for (const [oldKey, timestamp] of seenEvents) {
      if (now - timestamp > SEEN_MAX_AGE) seenEvents.delete(oldKey);
    }
    if (seenEvents.has(key) && now - seenEvents.get(key) < ttl) return false;
    seenEvents.set(key, now);
    saveSeenEvents();
    return true;
  }

  function captureNumberFrom(capture) {
    const value = firstNumber(capture?.captureNumber ?? capture?.captureNo ?? capture?.captureIndex ??
      capture?.sequence ?? capture?.ordinal);
    return value !== null && value > 0 ? Math.trunc(value) : null;
  }

  function captureCorrelationKey(capture) {
    const captureNumber = captureNumberFrom(capture);
    if (captureNumber) return `number:${captureNumber}`;
    const stableId = clean(capture?.id || capture?.captureId || capture?.sourceKey);
    if (stableId && !/\d{10,}/.test(stableId)) return `id:${stableId}`;
    return `data:${[
      canonicalPokemonName(capture?.name),
      firstNumber(capture?.iv ?? capture?.meta) ?? '',
      firstNumber(capture?.level) ?? ''
    ].join('|')}`;
  }

  function mergeCaptureData(current, incoming) {
    const merged = { ...(current || {}) };
    for (const [key, value] of Object.entries(incoming || {})) {
      const empty = value === '' || value === null || value === undefined;
      if (!empty && (merged[key] === '' || merged[key] === null || merged[key] === undefined)) merged[key] = value;
      if (!empty && ['ball', 'ballName', 'pokeballName', 'captureNumber', 'captureNo', 'captureIndex',
        'sequence', 'ordinal', 'tier', 'quality', 'qualityValue', 'qualityMultiplier', 'meta', 'sprite',
        'speciesId', 'looktype', 'lookType'].includes(key)) merged[key] = value;
      if (key === 'isShiny' && value === true) merged[key] = true;
    }
    return merged;
  }

  function capturesDescribeSameEvent(left, right) {
    if (canonicalPokemonName(left?.name) !== canonicalPokemonName(right?.name)) return false;
    const leftIv = firstNumber(left?.iv ?? left?.meta);
    const rightIv = firstNumber(right?.iv ?? right?.meta);
    if (leftIv !== null && rightIv !== null && leftIv !== rightIv) return false;
    const leftLevel = firstNumber(left?.level);
    const rightLevel = firstNumber(right?.level);
    return leftLevel === null || rightLevel === null || leftLevel === rightLevel;
  }

  function isGenericBall(value) {
    const raw = clean(value);
    if (!raw) return true;
    return /^(?:ball|pokeball|poke ball)$/i.test(raw);
  }

  function captureBallCandidate(capture) {
    const trusted = [capture?.ballName, capture?.pokeballName, capture?.pokeBallName,
      capture?.ball?.name, capture?.pokeball?.name].map(clean).find(Boolean);
    if (trusted && !isGenericBall(trusted)) return trusted;
    const fallback = clean(capture?.ball);
    return isGenericBall(fallback) ? '' : fallback;
  }

  function matchingCaptureRow(capture) {
    const targetName = canonicalPokemonName(capture?.name);
    const targetIv = firstNumber(capture?.iv ?? capture?.meta);
    const targetLevel = firstNumber(capture?.level);
    const targetNumber = captureNumberFrom(capture);
    return [...document.querySelectorAll('.clog-row')].map((row, index) => {
      const rowName = canonicalPokemonName(row.querySelector('.clog-name')?.textContent || row.textContent);
      const meta = clean(row.querySelector('.clog-meta')?.textContent || row.textContent);
      const rowIv = firstNumber(meta.match(/iv[^0-9]*([0-9]+)/i)?.[1]);
      const rowLevel = firstNumber(row.querySelector('.clog-lvl')?.textContent);
      const rowNumber = firstNumber(row.dataset.captureNumber || row.dataset.ordinal ||
        row.querySelector('.clog-num, [class*="capture-number"], [class*="ordinal"]')?.textContent);
      let score = Math.max(0, 100 - index);
      if (targetName && rowName === targetName) score += 500;
      else if (targetName && rowName && (rowName.includes(targetName) || targetName.includes(rowName))) score += 250;
      if (targetIv !== null && rowIv !== null) score += targetIv === rowIv ? 260 : -600;
      if (targetLevel !== null && rowLevel !== null) score += targetLevel === rowLevel ? 140 : -300;
      if (targetNumber && rowNumber) score += targetNumber === rowNumber ? 800 : -1000;
      return { row, rowNumber, score };
    }).sort((left, right) => right.score - left.score)[0];
  }

  async function enrichCaptureDeliveryData(capture) {
    let ball = captureBallCandidate(capture);
    let captureNumber = captureNumberFrom(capture);
    for (let attempt = 0; attempt < 7 && (!ball || !captureNumber); attempt += 1) {
      const match = matchingCaptureRow(capture);
      if (match?.score > 300) {
        ball ||= clean(match.row.querySelector('.clog-ball')?.textContent);
        captureNumber ||= match.rowNumber || null;
      }
      if ((!ball || !captureNumber) && attempt < 6) await new Promise((resolve) => setTimeout(resolve, 180));
    }
    return {
      ...capture,
      ball: ball || clean(capture.ball),
      captureNumber: captureNumber || capture.captureNumber || ''
    };
  }

  function isCrossRouteCaptureDuplicate(capture) {
    const source = clean(capture.source || 'unknown');
    const signature = [
      canonicalPokemonName(capture.name),
      firstNumber(capture.iv ?? capture.meta) ?? '',
      firstNumber(capture.level) ?? ''
    ].join('|');
    const now = Date.now();
    for (const [key, value] of recentCaptureRoutes) {
      if (now - value.at > 30_000) recentCaptureRoutes.delete(key);
    }
    const previous = recentCaptureRoutes.get(signature);
    recentCaptureRoutes.set(signature, { source, at: now });
    return Boolean(previous && previous.source !== source && now - previous.at < 15_000);
  }

  function captureMatchesFilters(capture) {
    const iv = firstNumber(capture.iv ?? capture.meta);
    const level = firstNumber(capture.level);
    const tiers = listFrom(config.capture.tiers).map(canonicalTier);
    const pokemon = listFrom(config.capture.pokemon).map(canonicalPokemonName);
    const tier = canonicalTier(`${capture.tier || ''} ${capture.meta || ''} ${capture.quality || ''}`);
    const name = canonicalPokemonName(capture.name);
    if (iv !== null && iv < config.capture.minIv) return false;
    if (iv === null && config.capture.minIv > 0) return false;
    if (level !== null && level < config.capture.minLevel) return false;
    if (level === null && config.capture.minLevel > 0) return false;
    if (tiers.length && !tiers.includes(tier)) return false;
    if (pokemon.length && !pokemon.some((value) => (` ${name} `).includes(` ${value} `))) return false;
    return true;
  }

  function isLegendaryCapture(capture) {
    return /legend|lend[aá]ri|mythic|m[ií]tic/i.test(
      `${capture.tier || ''} ${capture.meta || ''} ${capture.quality || ''}`
    );
  }

  function queueAlert(alert) {
    deliveryQueue = deliveryQueue
      .then(() => deliver(alert))
      .catch((error) => {
        setStatus(`No se pudo enviar una alerta: ${error.message}`, 'error');
        console.warn('[PokeGrid Telegram]', error);
      });
    return deliveryQueue;
  }

  async function deliver({ photo = '', caption }) {
    if (!hasCredentials()) return false;
    const recipients = parseRecipients();
    const safeCaption = String(caption || '').slice(0, 1000);
    for (const recipient of recipients) {
      const base = `https://api.telegram.org/bot${config.token}`;
      if (photo) {
        try {
          if (photo && typeof photo === 'object' && photo.base64) {
            await requestMultipart(`${base}/sendPhoto`, [
              { name: 'chat_id', value: recipient.chatId },
              { name: 'caption', value: safeCaption },
              { name: 'parse_mode', value: 'HTML' },
              {
                name: 'photo', base64: photo.base64, mimeType: photo.mimeType || 'image/png',
                filename: photo.filename || 'pokegrid.png'
              }
            ]);
          } else {
            await requestJson(`${base}/sendPhoto`, {
              chat_id: recipient.chatId,
              photo,
              caption: safeCaption,
              parse_mode: 'HTML'
            });
          }
          continue;
        } catch (error) {
          console.warn(`[PokeGrid Telegram] sendPhoto falló para ${recipient.label}; usando texto.`, error);
        }
      }
      await requestJson(`${base}/sendMessage`, {
        chat_id: recipient.chatId,
        text: safeCaption,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
    }
    return true;
  }

  function handleCapture(capture) {
    if (!capture?.name) return Promise.resolve();
    const correlationKey = captureCorrelationKey(capture);
    const relatedEntry = [...pendingCaptureAlerts.entries()].find(([, job]) =>
      capturesDescribeSameEvent(job.capture, capture));
    const pendingKey = pendingCaptureAlerts.has(correlationKey) ? correlationKey : relatedEntry?.[0];
    const pending = pendingKey ? pendingCaptureAlerts.get(pendingKey) : null;
    if (pending) {
      pending.capture = mergeCaptureData(pending.capture, capture);
      return pending.promise;
    }
    const job = { capture: { ...capture }, promise: null };
    job.promise = new Promise((resolve) => window.setTimeout(resolve, 850))
      .then(() => processCapture(job.capture))
      .finally(() => pendingCaptureAlerts.delete(correlationKey));
    pendingCaptureAlerts.set(correlationKey, job);
    return job.promise;
  }

  async function processCapture(capture) {
    if (!capture?.name) return;
    await loadConfig(false);
    if (!hasCredentials()) return;
    if (Number(capture.detectedAt) && Date.now() - Number(capture.detectedAt) > 30_000) return;
    const resolvedTier = await resolveCaptureTier(capture);
    if (!resolvedTier && Number(capture.tierResolveAttempt || 0) < 3) {
      window.setTimeout(() => handleCapture({
        ...capture,
        tierResolveAttempt: Number(capture.tierResolveAttempt || 0) + 1
      }).catch((error) => console.warn('[PokeGrid Telegram] tier retry', error)), 900);
      return;
    }
    if (resolvedTier && !knownTier(capture.tier)) {
      capture = { ...capture, tier: displayTier(resolvedTier), resolvedTier };
    }
    capture = await enrichCaptureDeliveryData(capture);
    const shiny = capture.isShiny === true || /\bshiny\b/i.test(`${capture.name} ${capture.meta || ''}`);
    const legendary = isLegendaryCapture(capture);
    const filtered = config.alerts.filteredCaptures && captureMatchesFilters(capture);
    if (!((shiny && config.alerts.shinyCaptures) ||
      (legendary && config.alerts.legendaryCaptures) || filtered)) return;
    if (isCrossRouteCaptureDuplicate(capture)) return;
    const captureNumber = captureNumberFrom(capture);
    const semanticKey = `capture:${accountLabel}:${captureNumber ? `number:${captureNumber}` : [
      canonicalPokemonName(capture.name), firstNumber(capture.level) ?? '',
      firstNumber(capture.iv ?? capture.meta) ?? '', clean(capture.when)
    ].join('|')}`;
    if (!eventIsFresh(semanticKey, captureNumber || capture.when ? SEEN_MAX_AGE : 60_000)) return;
    const captureIv = firstNumber(capture.iv ?? capture.meta);
    const iv = captureIv !== null
      ? `${captureIv}/${firstNumber(capture.ivMax) || 192}`
      : 'No disponible';
    const title = shiny && legendary
      ? '✨🏆 SHINY LEGENDARIO CAPTURADO'
      : shiny ? '✨ SHINY CAPTURADO'
        : legendary ? '🏆 LEGENDARIO CAPTURADO' : '🎯 CAPTURA OBJETIVO';
    const photo = await resolvePokemonImage(
      capture.name, shiny, capture.speciesId || capture.pokemonId, capture.looktype || capture.lookType
    );
    queueAlert({
      photo: photo || clean(capture.sprite),
      caption: [
        `<b>${title}</b>`,
        `👤 Cuenta: <b>${escapeHtml(accountLabel)}</b>`,
        `🐾 Pokémon: <b>${escapeHtml(capture.name)}</b>`,
        `🏷 Tier: <b>${escapeHtml(capture.tier || capture.quality || 'Sin tier')}</b>`,
        `🧬 IV: <b>${escapeHtml(iv)}</b>`,
        `📈 Nivel: <b>${escapeHtml(capture.level ?? 'No disponible')}</b>`,
        `⚪ Poké Ball: <b>${escapeHtml(capture.ball || 'No disponible')}</b>`,
        captureNumber ? `🔢 Captura: <b>#${escapeHtml(captureNumber)}</b>` : '🔢 Captura: <b># no disponible</b>',
        `🕒 ${escapeHtml(capture.when || new Date().toLocaleString())}`
      ].join('\n')
    });
  }

  async function handleDefeat(defeat) {
    if (!config.alerts.shinyDefeats || !defeat?.name || !hasCredentials()) return;
    if (invalidPokemonName(defeat.name)) return;
    if (Number(defeat.detectedAt) && Date.now() - Number(defeat.detectedAt) > 30_000) return;
    if (!(defeat.isShiny === true || /\bshiny\b/i.test(`${defeat.name} ${defeat.tier || ''}`))) return;
    const key = `defeat:${accountLabel}:${defeat.key || [
      defeat.name, defeat.level, Math.floor(Number(defeat.detectedAt || Date.now()) / 3000)
    ].join('|')}`;
    const semanticKey = `defeat-semantic:${accountLabel}:${normalized(defeat.name)}:${defeat.level || ''}`;
    if (!eventIsFresh(semanticKey, 60_000)) return;
    if (!eventIsFresh(key, SEEN_MAX_AGE)) return;
    const defeatTierKey = knownTier(`${defeat.tier || ''} ${defeat.quality || ''}`) ||
      tierFromQuality(defeat.qualityValue ?? defeat.qualityMultiplier ?? defeat.qualityMult ??
        defeat.rarityMultiplier ?? defeat.multiplier);
    const defeatTier = defeatTierKey ? displayTier(defeatTierKey) : '';
    const photo = await resolvePokemonImage(defeat.name, true, defeat.speciesId, defeat.looktype || defeat.lookType);
    queueAlert({
      photo: photo || clean(defeat.sprite),
      caption: [
        '<b>⚔️✨ SHINY DERROTADO</b>',
        `👤 Cuenta: <b>${escapeHtml(accountLabel)}</b>`,
        `🐾 Pokémon: <b>${escapeHtml(defeat.name)}</b>`,
        `🏷 Tier: <b>${escapeHtml(defeatTier || defeat.tier || defeat.quality || 'Sin tier')}</b>`,
        `📈 Nivel: <b>${escapeHtml(defeat.level ?? 'No disponible')}</b>`,
        `⭐ XP: <b>${escapeHtml(defeat.xp ?? 'No disponible')}</b>`,
        `🕒 ${escapeHtml(new Date(defeat.detectedAt || Date.now()).toLocaleString())}`
      ].join('\n')
    });
  }

  function attachQueue(name, handler) {
    const queue = window[name];
    if (!Array.isArray(queue)) return false;
    const marker = `__pokeGridTelegram_${name}`;
    if (queue[marker]) return true;
    const originalPush = queue.push;
    Object.defineProperty(queue, marker, { value: true, configurable: false });
    queue.push = function (...rows) {
      const result = originalPush.apply(this, rows);
      rows.forEach((row) => Promise.resolve().then(() => handler(row)).catch((error) => {
        console.warn(`[PokeGrid Telegram] ${name}`, error);
      }));
      return result;
    };
    queue.slice().forEach((row) => Promise.resolve().then(() => handler(row)).catch((error) => {
      console.warn(`[PokeGrid Telegram] ${name}`, error);
    }));
    return true;
  }

  function extractPokemonName(payload) {
    return clean(
      payload?.pokemonName || payload?.pokeName || payload?.speciesName ||
      payload?.pokemon?.name || payload?.species?.name ||
      (typeof payload?.pokemon === 'string' ? payload.pokemon : '') ||
      payload?.displayName || payload?.name
    );
  }

  function extractDrops(payload) {
    const results = new Map();
    const seen = new WeakSet();
    const add = (name, quantity, icon = '', itemId = null) => {
      const cleanName = clean(name);
      const count = Number(String(quantity ?? 1).replace(/[^0-9.-]/g, '')) || 1;
      if (!cleanName || count <= 0) return;
      const key = normalized(cleanName);
      const previous = results.get(key);
      results.set(key, {
        name: previous?.name || cleanName,
        quantity: (previous?.quantity || 0) + count,
        icon: previous?.icon || clean(icon),
        itemId: previous?.itemId || Number(itemId) || null
      });
    };
    const visit = (value, path = '', depth = 0) => {
      if (value == null || depth > 8) return;
      const relevant = /drop|loot|item|reward|premio|objeto/i.test(path);
      if (Array.isArray(value)) {
        value.slice(0, 100).forEach((entry, index) => visit(entry, `${path}.${index}`, depth + 1));
        return;
      }
      if (typeof value !== 'object') {
        if (relevant && typeof value === 'number') {
          const name = path.split('.').at(-1);
          if (name && !/id|quantity|amount|count|qty|price|value|gold|money|xp|experience|chance/i.test(name)) {
            add(name, value);
          }
        }
        return;
      }
      if (seen.has(value)) return;
      seen.add(value);
      const item = value.item && typeof value.item === 'object' ? value.item : {};
      const name = clean(
        value.itemName || value.dropName || value.lootName || item.name ||
        (relevant ? value.name || value.label || value.title : '')
      );
      const quantity = value.quantity ?? value.amount ?? value.count ?? value.qty ??
        value.total ?? item.quantity ?? 1;
      const addedCurrent = relevant && name && !/pokemon|pokémon|experience|gold|money|xp/i.test(name);
      if (addedCurrent) {
        add(
          name, quantity, value.icon || value.image || value.sprite || item.icon || item.image,
          value.itemId || value.id || item.id || item.itemId
        );
      }
      Object.entries(value).slice(0, 100).forEach(([key, child]) => {
        if (addedCurrent && key === 'item') return;
        if (['pokemon', 'species'].includes(key) && !/drop|loot/i.test(path)) return;
        visit(child, path ? `${path}.${key}` : key, depth + 1);
      });
    };
    visit(payload);
    return [...results.values()];
  }

  function dropMatches(drop) {
    const names = listFrom(config.drops.names);
    if (Number(drop.quantity || 0) < config.drops.minQuantity) return false;
    if (!names.length) return true;
    const name = normalized(drop.name);
    return names.some((allowed) => name === allowed || name.includes(allowed));
  }

  async function handleDrops(drops, context = {}) {
    if (!config.alerts.drops || !hasCredentials()) return;
    const filtered = drops.filter(dropMatches);
    if (!filtered.length) return;
    const pokemonName = clean(context.pokemonName || currentOpponentName());
    const signature = filtered.map((drop) => `${normalized(drop.name)}:${drop.quantity}`).sort().join(',');
    const source = clean(context.source || (String(context.killId || '').startsWith('hunt:') ? 'hunt-analyzer' :
      (context.killId ? 'field-kill' : 'unknown')));
    const now = Date.now();
    for (const [oldKey, value] of recentDropRoutes) {
      if (now - value.at > 30_000) recentDropRoutes.delete(oldKey);
    }
    const routeKey = `${accountLabel}:${signature}`;
    const previousRoute = recentDropRoutes.get(routeKey);
    recentDropRoutes.set(routeKey, { source, at: now, killId: clean(context.killId) });
    if (previousRoute && now - previousRoute.at < 15_000 &&
      (previousRoute.source !== source || (previousRoute.killId && previousRoute.killId === clean(context.killId)))) return;
    if (!eventIsFresh(`drop-signature:${accountLabel}:${signature}`, 4000)) return;
    const key = `drops:${accountLabel}:${context.killId || [
      pokemonName, filtered.map((drop) => `${drop.name}:${drop.quantity}`).join(','), Math.floor(Date.now() / 5000)
    ].join('|')}`;
    if (!eventIsFresh(key, SEEN_MAX_AGE)) return;
    for (const drop of filtered) {
      const photo = await resolveDropImage(drop);
      queueAlert({
        photo,
        caption: [
          '<b>🎁 DROP OBTENIDO</b>',
          `👤 Cuenta: <b>${escapeHtml(accountLabel)}</b>`,
          pokemonName ? `🐾 Derrotado: <b>${escapeHtml(pokemonName)}</b>` : '',
          `📦 <b>${escapeHtml(drop.name)}</b> × ${escapeHtml(drop.quantity)}`,
          `🕒 ${escapeHtml(new Date().toLocaleString())}`
        ].filter(Boolean).join('\n')
      });
    }
  }

  function currentOpponentName() {
    const selectors = [
      '.battle-enemy-name', '.battle-opponent-name', '.field-pokemon-name',
      '.pokemon-enemy .name', '[data-pokemon-name]'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const value = clean(element?.dataset?.pokemonName || element?.textContent);
      if (value) return value;
    }
    return '';
  }

  function subscribeToFieldKills() {
    const root = document.querySelector('.game-root') || document.querySelector('#root');
    if (!root) return false;
    let socketContext = null;
    const seen = new WeakSet();
    let inspected = 0;
    const inspect = (value, depth = 0) => {
      if (socketContext || !value || typeof value !== 'object' || value instanceof Node ||
        seen.has(value) || depth > 7 || inspected > 40_000) return;
      seen.add(value);
      inspected += 1;
      if (typeof value.subscribe === 'function' &&
        (typeof value.requestPokes === 'function' || typeof value.send === 'function')) {
        socketContext = value;
        return;
      }
      if (Array.isArray(value)) {
        value.slice(0, 120).forEach((child) => inspect(child, depth + 1));
        return;
      }
      Object.entries(value).slice(0, 70).forEach(([key, child]) => {
        if (/^(return|child|sibling|stateNode|alternate|_owner|queue|nextEffect)$/i.test(key)) return;
        inspect(child, depth + 1);
      });
    };
    [root, ...root.querySelectorAll('*')].slice(0, 5000).forEach((element) => {
      if (socketContext) return;
      Object.keys(element).filter((key) => /^__react(?:Fiber|Container|Props)/.test(key)).forEach((key) => {
        if (key.startsWith('__reactProps')) inspect(element[key], 0);
        let fiber = element[key];
        if (fiber?.current) fiber = fiber.current;
        for (let depth = 0; fiber && depth < 45 && !socketContext; depth += 1, fiber = fiber.return) {
          inspect(fiber.memoizedProps, 0);
          inspect(fiber.memoizedState, 0);
          inspect(fiber.dependencies?.firstContext?.context?._currentValue, 0);
          inspect(fiber.dependencies?.firstContext?.context?._currentValue2, 0);
        }
      });
    });
    if (!socketContext) return false;
    try {
      const unsubscribe = socketContext.subscribe('field-kill', (payload) => {
        const drops = extractDrops(payload);
        if (drops.length) {
          handleDrops(drops, {
            killId: clean(payload?.killId || payload?.id),
            pokemonName: extractPokemonName(payload),
            speciesId: Number(payload?.speciesId || payload?.pokemon?.speciesId) || null,
            isShiny: payload?.shiny === true || payload?.isShiny === true
          });
        }
      });
      if (typeof unsubscribe !== 'function') return false;
      window.__pokeGridTelegramFieldKillUnsubscribe = unsubscribe;
      return true;
    } catch {
      return false;
    }
  }

  function scanHuntDrops() {
    const rows = [...document.querySelectorAll('.ha-drop')];
    for (const row of rows) {
      const name = clean(row.querySelector('.ha-drop-name')?.textContent);
      const quantityText = clean(row.querySelector('.ha-drop-qty')?.textContent);
      const quantity = Number(quantityText.replace(/[^0-9.-]/g, ''));
      if (!name || !Number.isFinite(quantity)) continue;
      const key = normalized(name);
      if (!huntDropTotals.has(key)) {
        huntDropTotals.set(key, quantity);
        continue;
      }
      const previous = huntDropTotals.get(key);
      huntDropTotals.set(key, quantity);
      if (quantity > previous) {
        handleDrops([{ name, quantity: quantity - previous }], {
          pokemonName: currentOpponentName(),
          killId: `hunt:${key}:${quantity}`
        });
      }
    }
  }

  async function initialize() {
    await loadConfig();
    createInterface();
    window.__pokeGridTelegramCaptureBridgeQueue ||= [];
    const queueRetry = window.setInterval(() => {
      const capturesReady = attachQueue('__pokeGridCaptureQueue', handleCapture);
      const defeatsReady = attachQueue('__pokeGridDefeatQueue', handleDefeat);
      const bridgeReady = attachQueue('__pokeGridTelegramCaptureBridgeQueue', handleCapture);
      if (capturesReady && defeatsReady && bridgeReady) window.clearInterval(queueRetry);
    }, 500);
    window.setTimeout(() => window.clearInterval(queueRetry), 120_000);

    if (!subscribeToFieldKills()) {
      const socketRetry = window.setInterval(() => {
        if (subscribeToFieldKills()) window.clearInterval(socketRetry);
      }, 2500);
      window.setTimeout(() => window.clearInterval(socketRetry), 120_000);
    }
    window.setInterval(scanHuntDrops, DROP_SCAN_MS);
    window.setInterval(() => loadConfig(false), CONFIG_REFRESH_MS);

    window.__pokeGridTelegramAlerts = Object.freeze({
      account: { ...account, label: accountLabel },
      reload: () => loadConfig(true),
      test: () => testBotFromPanel(),
      previewPokemonImage: (name, speciesId, looktype) => resolvePokemonImage(name, false, speciesId, looktype),
      previewDropImage: (value) => resolveDropImage(value),
      matchesCaptureFilter: (value) => captureMatchesFilters(value),
      tierForQuality: (value) => tierFromQuality(value),
      simulateCapture: (value) => handleCapture(value),
      simulateDefeat: (value) => handleDefeat(value),
      simulateDrops: (value, context) => handleDrops(value, context)
    });
  }

  initialize().catch((error) => console.error('[PokeGrid Telegram] No se pudo iniciar.', error));
})();
