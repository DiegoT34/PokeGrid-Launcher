(function createPokeGridUserScriptManager() {
  const GAME_ORIGIN = 'https://poke.idleworld.online';
  const PRIMARY_INSTANCE_ID = 'poke-idle-world';
  const ACCOUNT_COUNT = 4;
  const UNSUPPORTED_DIRECTIVES = ['require', 'resource', 'antifeature', 'downloadurl', 'updateurl'];
  const DEFAULT_SOURCE = `// ==UserScript==
// @name         Mi script de PokeGrid
// @namespace    pokegrid.local
// @version      1.0.0
// @description  Describe aquí lo que hace el script
// @game         Poke Idle World
// @match        https://poke.idleworld.online/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('[PokeGrid] Mi script está activo');
})();
`;

  const scriptsButton = document.querySelector('#scriptsButton');
  const backdrop = document.querySelector('#scriptsBackdrop');
  const closeButton = document.querySelector('#closeScriptsButton');
  const newButton = document.querySelector('#newScriptButton');
  const importButton = document.querySelector('#importScriptButton');
  const installTelegramButton = document.querySelector('#installTelegramAlertsButton');
  const urlForm = document.querySelector('#scriptUrlForm');
  const urlInput = document.querySelector('#scriptUrlInput');
  const dropZone = document.querySelector('#scriptDropZone');
  const list = document.querySelector('#scriptsList');
  const count = document.querySelector('#scriptCount');
  const editorForm = document.querySelector('#scriptEditorForm');
  const editorKicker = document.querySelector('#scriptEditorKicker');
  const editorName = document.querySelector('#scriptEditorName');
  const editorMeta = document.querySelector('#scriptEditorMeta');
  const enabledInput = document.querySelector('#scriptEnabledInput');
  const accountToggles = document.querySelector('#scriptAccountToggles');
  const accountTargetsLegend = accountToggles?.closest('fieldset')?.querySelector('legend');
  const codeInput = document.querySelector('#scriptCodeInput');
  const codeEditor = document.querySelector('#scriptCodeEditor');
  const lineNumbers = document.querySelector('#scriptLineNumbers');
  const syntaxStatus = document.querySelector('#scriptSyntaxStatus');
  const cursorStatus = document.querySelector('#scriptCursorStatus');
  const validateButton = document.querySelector('#validateScriptButton');
  const undoButton = document.querySelector('#undoScriptButton');
  const redoButton = document.querySelector('#redoScriptButton');
  const commentButton = document.querySelector('#commentScriptButton');
  const duplicateLineButton = document.querySelector('#duplicateScriptLineButton');
  const findButton = document.querySelector('#findScriptButton');
  const findBar = document.querySelector('#scriptFindBar');
  const findInput = document.querySelector('#scriptFindInput');
  const findCount = document.querySelector('#scriptFindCount');
  const findPreviousButton = document.querySelector('#scriptFindPreviousButton');
  const findNextButton = document.querySelector('#scriptFindNextButton');
  const closeFindButton = document.querySelector('#closeScriptFindButton');
  const permissionSummary = document.querySelector('#scriptPermissionSummary');
  const message = document.querySelector('#scriptsMessage');
  const deleteButton = document.querySelector('#deleteScriptButton');
  const exportButton = document.querySelector('#exportScriptButton');
  const cancelChangesButton = document.querySelector('#cancelScriptChangesButton');
  const pickExtensionButton = document.querySelector('#pickExtensionButton');
  const extensionPathOutput = document.querySelector('#extensionPathOutput');
  const extensionAccountToggles = document.querySelector('#extensionAccountToggles');
  const extensionStatus = document.querySelector('#extensionStatus');
  const applyExtensionButton = document.querySelector('#applyExtensionButton');
  const installedScriptsTab = document.querySelector('#installedScriptsTab');
  const scriptShopTab = document.querySelector('#scriptShopTab');
  const installedScriptsView = document.querySelector('#installedScriptsView');
  const scriptShopView = document.querySelector('#scriptShopView');
  const scriptShopUpdateBadge = document.querySelector('#scriptShopUpdateBadge');
  const scriptShopSearch = document.querySelector('#scriptShopSearch');
  const refreshScriptShopButton = document.querySelector('#refreshScriptShopButton');
  const scriptShopSummary = document.querySelector('#scriptShopSummary');
  const scriptShopGrid = document.querySelector('#scriptShopGrid');
  const scriptShopMessage = document.querySelector('#scriptShopMessage');

  let scripts = [];
  let selectedId = null;
  let selectedSnapshot = null;
  let accountRows = Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({ label: `Cuenta ${index + 1}` }));
  let panelRows = [];
  let focusAccount = -1;
  let guestPreloadUrl = '';
  let extensionConfig = { path: '', accounts: Array(ACCOUNT_COUNT).fill(false) };
  let editorTimer = 0;
  let syntaxTimer = 0;
  let findMatches = [];
  let findMatchIndex = -1;
  let dropDepth = 0;
  let scriptShopCatalog = null;
  let scriptShopLoading = false;
  let scriptShopBusyId = '';
  let scriptShopLauncherVersion = '0.0.0';
  let activeScriptsView = 'installed';

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function parseMetadata(code) {
    const block = String(code || '').match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/i)?.[1] || '';
    const metadata = {};
    for (const line of block.split(/\r?\n/)) {
      const match = line.match(/^\s*\/\/\s*@([\w:-]+)\s*(.*?)\s*$/);
      if (!match) continue;
      const key = match[1].toLowerCase();
      if (!metadata[key]) metadata[key] = [];
      metadata[key].push(match[2]);
    }
    return metadata;
  }

  function unique(values) {
    return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))];
  }

  function compareVersions(left, right) {
    const a = String(left || '').split('.').map((value) => Number(value) || 0);
    const b = String(right || '').split('.').map((value) => Number(value) || 0);
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
      if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
    }
    return 0;
  }

  function panelInstanceId(panel) {
    return String(panel?.instanceId || PRIMARY_INSTANCE_ID);
  }

  function currentPanelUrl(panel) {
    try {
      const current = panel?.webview?.getURL?.();
      if (current && current !== 'about:blank') return current;
    } catch {}
    return String(panel?.lastUrl || panel?.startUrl || '');
  }

  function customGameDescriptors() {
    const games = new Map();
    for (const panel of panelRows) {
      const id = panelInstanceId(panel);
      if (id === PRIMARY_INSTANCE_ID || games.has(id)) continue;
      games.set(id, {
        id,
        name: String(panel.instanceName || id),
        url: String(panel.startUrl || currentPanelUrl(panel)),
        count: panelRows.filter((candidate) => panelInstanceId(candidate) === id).length
      });
    }
    return [...games.values()];
  }

  function gameLabelFromMatch(pattern) {
    const source = String(pattern || '').trim();
    if (source === '<all_urls>') return 'Todos los juegos';
    const rawHost = source.match(/^(?:\*|https?):\/\/([^/]+)/i)?.[1]?.toLowerCase();
    if (!rawHost || rawHost === '*') return '';
    const host = rawHost.replace(/^\*\./, '').replace(/^www\./, '');
    if (host === 'poke.idleworld.online') return 'Poke Idle World';
    return host;
  }

  function scriptGameLabels(script) {
    const labels = [];
    const add = (value) => {
      const label = String(value || '').trim();
      if (label && !labels.some((row) => row.toLowerCase() === label.toLowerCase())) labels.push(label);
    };
    const matches = script?.matches?.length ? script.matches : (script?.games?.length ? [] : [`${GAME_ORIGIN}/*`]);
    if (matches.some((pattern) => urlMatchesPattern(`${GAME_ORIGIN}/`, pattern))) add('Poke Idle World');
    const customGames = customGameDescriptors();
    for (const game of customGames) {
      if (matches.some((pattern) => urlMatchesPattern(game.url, pattern))) add(game.name);
    }
    (script?.games || []).forEach(add);
    matches.map(gameLabelFromMatch).forEach((label) => {
      const representedByInstance = customGames.some((game) => {
        try { return new URL(game.url).hostname.replace(/^www\./i, '').toLowerCase() === String(label).toLowerCase(); }
        catch { return false; }
      });
      if (!representedByInstance) add(label);
    });
    return labels.length ? labels.slice(0, 8) : ['Juego sin identificar'];
  }

  function scriptScope(code) {
    const metadata = parseMetadata(code);
    const matches = unique([...(metadata.match || []), ...(metadata.include || [])]);
    const normalizedMatches = matches.length ? matches : [`${GAME_ORIGIN}/*`];
    const primary = normalizedMatches.some((pattern) => urlMatchesPattern(`${GAME_ORIGIN}/`, pattern));
    const customGames = customGameDescriptors().filter((game) =>
      normalizedMatches.some((pattern) => urlMatchesPattern(game.url, pattern)));
    const external = normalizedMatches.some((pattern) => {
      if (pattern === '<all_urls>') return true;
      const label = gameLabelFromMatch(pattern);
      return label && label !== 'Poke Idle World';
    });
    return { matches: normalizedMatches, primary, customGames, external };
  }

  async function updateBundledTelegramScript(rows) {
    const existing = rows.find((script) => script.namespace === 'pokegrid.telegram-alerts');
    if (!existing) return rows;
    const bundled = await window.pokeGrid.loadBundledTelegramAlerts();
    if (!bundled.ok || !bundled.code) return rows;
    const bundledVersion = parseMetadata(bundled.code).version?.[0] || '0';
    if (compareVersions(bundledVersion, existing.version) <= 0) return rows;
    const result = await window.pokeGrid.saveUserScript({
      id: existing.id,
      code: bundled.code,
      enabled: existing.enabled,
      accounts: existing.accounts,
      sourceUrl: bundled.sourceUrl
    });
    return result.ok ? (result.scripts || rows) : rows;
  }

  function currentAccountSelection(container = accountToggles) {
    return Array.from({ length: ACCOUNT_COUNT }, (_, index) =>
      Boolean(container.querySelector(`input[data-account="${index}"]`)?.checked)
    );
  }

  function createAccountToggles(container, selected) {
    container.replaceChildren();
    accountRows.forEach((account, index) => {
      const label = document.createElement('label');
      label.className = 'script-account-toggle';
      label.innerHTML = `<input type="checkbox" data-account="${index}"><span>${escapeHtml(account.label || `Cuenta ${index + 1}`)}</span>`;
      label.querySelector('input').checked = selected?.[index] === true;
      container.appendChild(label);
    });
  }

  function renderScriptTargetControls(code, selectedAccounts = []) {
    const scope = scriptScope(code);
    accountToggles.replaceChildren();
    if (scope.primary) createAccountToggles(accountToggles, selectedAccounts);
    for (const game of scope.customGames) {
      const target = document.createElement('span');
      target.className = 'script-auto-target';
      target.innerHTML = `<b>${escapeHtml(game.name)}</b><small>${game.count} pantalla${game.count === 1 ? '' : 's'} · automático por @match</small>`;
      accountToggles.appendChild(target);
    }
    if (!scope.primary && !scope.customGames.length) {
      const target = document.createElement('span');
      target.className = 'script-auto-target is-pending';
      const declared = unique(scope.matches.map(gameLabelFromMatch)).filter(Boolean).join(', ');
      target.innerHTML = `<b>${escapeHtml(declared || 'Sin juego compatible')}</b><small>${scope.external ? 'Se activará automáticamente cuando abras una instancia compatible.' : 'Revisa las reglas @match o @include.'}</small>`;
      accountToggles.appendChild(target);
    }
    if (accountTargetsLegend) accountTargetsLegend.textContent = scope.customGames.length || scope.external
      ? 'EJECUTAR EN JUEGOS E INSTANCIAS'
      : 'EJECUTAR EN CUENTAS DE POKE IDLE WORLD';
  }

  function setMessage(text, kind = '') {
    message.textContent = text;
    message.classList.toggle('is-ok', kind === 'ok');
  }

  function displayMetadata(code) {
    const selectedAccounts = currentAccountSelection();
    const metadata = parseMetadata(code);
    const name = metadata.name?.[0]?.trim() || 'Script sin nombre';
    const version = metadata.version?.[0]?.trim() || 'sin versión';
    const namespace = metadata.namespace?.[0]?.trim() || 'sin namespace';
    const matches = unique([...(metadata.match || []), ...(metadata.include || [])]);
    const grants = unique(metadata.grant);
    const connects = unique(metadata.connect);
    const unsupported = UNSUPPORTED_DIRECTIVES.filter((directive) => metadata[directive]?.length);
    const runAt = metadata['run-at']?.[0]?.trim() || 'document-end';
    renderScriptTargetControls(code, selectedAccounts);

    editorName.textContent = name;
    editorMeta.textContent = `${namespace} · v${version} · ${runAt}`;
    permissionSummary.replaceChildren();
    const label = document.createElement('b');
    label.textContent = 'Alcance:';
    permissionSummary.appendChild(label);
    for (const game of scriptGameLabels({ matches, games: unique(metadata.game) })) {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip is-game';
      chip.textContent = `Juego: ${game}`;
      permissionSummary.appendChild(chip);
    }
    for (const value of matches.length ? matches : [`${GAME_ORIGIN}/* (predeterminado)`]) {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip';
      chip.title = value;
      chip.textContent = value;
      permissionSummary.appendChild(chip);
    }
    for (const value of grants.filter((grant) => grant !== 'none')) {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip';
      chip.textContent = value;
      permissionSummary.appendChild(chip);
    }
    for (const value of connects) {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip is-warning';
      chip.textContent = `Red: ${value}`;
      permissionSummary.appendChild(chip);
    }
    if (runAt === 'document-start') {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip is-warning';
      chip.textContent = 'document-start: se ejecuta en el primer DOM disponible';
      permissionSummary.appendChild(chip);
    }
    if (unsupported.length) {
      const chip = document.createElement('span');
      chip.className = 'script-permission-chip is-warning';
      chip.textContent = `Revisar: @${unsupported.join(', @')}`;
      permissionSummary.appendChild(chip);
    }
  }

  function updateLineNumbers() {
    const total = Math.max(1, codeInput.value.split('\n').length);
    lineNumbers.textContent = Array.from({ length: total }, (_, index) => index + 1).join('\n');
    lineNumbers.scrollTop = codeInput.scrollTop;
  }

  function updateCursorStatus() {
    const before = codeInput.value.slice(0, codeInput.selectionStart);
    const lines = before.split('\n');
    cursorStatus.textContent = `Ln ${lines.length}, Col ${lines.at(-1).length + 1}`;
  }

  async function validateSyntax({ announce = false } = {}) {
    const code = codeInput.value;
    try {
      const result = await window.pokeGrid.validateUserScriptSyntax(code);
      if (code !== codeInput.value) return { ok: false, stale: true };
      if (!result?.ok) throw Object.assign(new Error(result?.error || 'Sintaxis JavaScript no válida.'), { line: result?.line });
      syntaxStatus.className = 'is-ok';
      syntaxStatus.textContent = `✓ Sintaxis correcta · ${code.split('\n').length} líneas`;
      syntaxStatus.title = '';
      codeEditor.classList.remove('has-syntax-error');
      if (announce) setMessage('Sintaxis JavaScript correcta. El script está listo para guardarse.', 'ok');
      return { ok: true };
    } catch (error) {
      const line = Number(error?.line) || null;
      const location = line ? `Línea ${line}: ` : '';
      syntaxStatus.className = 'is-error';
      syntaxStatus.textContent = `✕ ${location}${error.message}`;
      syntaxStatus.title = String(error.stack || error.message);
      codeEditor.classList.add('has-syntax-error');
      if (announce) setMessage(`Error de sintaxis. ${location}${error.message}`);
      return { ok: false, error, line };
    }
  }

  function refreshEditor({ validate = false } = {}) {
    updateLineNumbers();
    updateCursorStatus();
    if (validate) validateSyntax();
    if (!findBar.hidden) updateFindMatches();
  }

  function replaceSelection(text, selectionMode = 'end') {
    codeInput.focus();
    codeInput.setRangeText(text, codeInput.selectionStart, codeInput.selectionEnd, selectionMode);
    codeInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function selectedLineRange() {
    const value = codeInput.value;
    const start = value.lastIndexOf('\n', Math.max(0, codeInput.selectionStart - 1)) + 1;
    const nextBreak = value.indexOf('\n', codeInput.selectionEnd);
    return { start, end: nextBreak < 0 ? value.length : nextBreak };
  }

  function toggleSelectedComments() {
    const range = selectedLineRange();
    const source = codeInput.value.slice(range.start, range.end);
    const lines = source.split('\n');
    const uncomment = lines.filter((line) => line.trim()).every((line) => /^\s*\/\//.test(line));
    const result = lines.map((line) => uncomment
      ? line.replace(/^(\s*)\/\/ ?/, '$1')
      : line.trim() ? line.replace(/^(\s*)/, '$1// ') : line).join('\n');
    codeInput.setSelectionRange(range.start, range.end);
    replaceSelection(result, 'select');
  }

  function duplicateSelectedLines() {
    const range = selectedLineRange();
    const source = codeInput.value.slice(range.start, range.end);
    const insertion = `${range.end < codeInput.value.length ? '\n' : '\n'}${source}`;
    codeInput.setSelectionRange(range.end, range.end);
    replaceSelection(insertion, 'end');
  }

  function indentSelection(outdent = false) {
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    if (start === end && !outdent) {
      replaceSelection('  ');
      return;
    }
    const range = selectedLineRange();
    const source = codeInput.value.slice(range.start, range.end);
    const result = source.split('\n').map((line) => outdent ? line.replace(/^(?:  |\t)/, '') : `  ${line}`).join('\n');
    codeInput.setSelectionRange(range.start, range.end);
    replaceSelection(result, 'select');
  }

  function openFind() {
    findBar.hidden = false;
    findInput.focus();
    findInput.select();
    updateFindMatches();
  }

  function closeFind() {
    findBar.hidden = true;
    findMatches = [];
    findMatchIndex = -1;
    codeInput.focus();
  }

  function updateFindMatches() {
    const query = findInput.value;
    findMatches = [];
    if (query) {
      const haystack = codeInput.value.toLocaleLowerCase();
      const needle = query.toLocaleLowerCase();
      for (let index = 0; index <= haystack.length - needle.length;) {
        const found = haystack.indexOf(needle, index);
        if (found < 0) break;
        findMatches.push(found);
        index = found + Math.max(1, needle.length);
      }
    }
    if (!findMatches.length) findMatchIndex = -1;
    else if (findMatchIndex < 0 || findMatchIndex >= findMatches.length) findMatchIndex = 0;
    findCount.textContent = findMatches.length ? `${findMatchIndex + 1}/${findMatches.length}` : '0/0';
  }

  function selectFindMatch(direction = 1) {
    const previousIndex = findMatchIndex;
    updateFindMatches();
    if (!findMatches.length) return;
    findMatchIndex = previousIndex < 0
      ? (direction < 0 ? findMatches.length - 1 : 0)
      : (previousIndex + direction + findMatches.length) % findMatches.length;
    const start = findMatches[findMatchIndex];
    codeInput.focus();
    codeInput.setSelectionRange(start, start + findInput.value.length);
    findCount.textContent = `${findMatchIndex + 1}/${findMatches.length}`;
    updateCursorStatus();
  }

  function renderList() {
    count.textContent = String(scripts.length);
    list.replaceChildren();
    if (!scripts.length) {
      const empty = document.createElement('p');
      empty.className = 'script-list-empty';
      empty.textContent = 'Todavía no hay scripts instalados. Crea uno, importa un archivo .user.js o descarga uno por HTTPS para revisarlo.';
      list.appendChild(empty);
      return;
    }
    for (const script of scripts) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `script-list-item${script.id === selectedId ? ' is-selected' : ''}${script.enabled ? ' is-enabled' : ''}`;
      const accountBadges = script.accounts.map((enabled, index) =>
        `<i class="${enabled ? 'is-on' : ''}" title="${escapeHtml(accountRows[index]?.label || `Cuenta ${index + 1}`)}">${index + 1}</i>`
      ).join('');
      const gameBadges = scriptGameLabels(script).map((game) => `<em>${escapeHtml(game)}</em>`).join('');
      button.innerHTML = `
        <span class="script-list-state" aria-hidden="true"></span>
        <span class="script-list-copy">
          <strong>${escapeHtml(script.name)}</strong>
          <small>v${escapeHtml(script.version)} · ${escapeHtml(script.runAt)} · ${script.matches.length} regla(s)</small>
          <span class="script-list-games">${gameBadges}</span>
        </span>
        <span class="script-list-accounts">${accountBadges}</span>`;
      button.addEventListener('click', () => selectScript(script.id));
      list.appendChild(button);
    }
  }

  function installedShopScript(shopId) {
    return scripts.find((script) => script.shopId === shopId) || null;
  }

  function scriptShopState(item) {
    const installed = installedShopScript(item.id);
    if (!installed) return { key: 'available', label: 'Disponible', installed: null };
    const comparison = compareVersions(item.version, installed.version);
    if (comparison > 0) return { key: 'update', label: `Actualización ${item.version}`, installed };
    if (installed.shopVersion && installed.shopSha256 !== item.sha256) {
      return { key: 'modified', label: 'Modificado localmente', installed };
    }
    return { key: 'installed', label: `Instalado ${installed.version}`, installed };
  }

  function updateScriptShopBadge() {
    const updates = scriptShopCatalog?.scripts?.filter((item) => scriptShopState(item).key === 'update').length || 0;
    scriptShopUpdateBadge.textContent = String(updates);
    scriptShopUpdateBadge.hidden = updates === 0;
  }

  function setScriptShopMessage(text, kind = '') {
    scriptShopMessage.textContent = text;
    scriptShopMessage.classList.toggle('is-ok', kind === 'ok');
  }

  function renderScriptShop() {
    scriptShopGrid.replaceChildren();
    updateScriptShopBadge();
    if (!scriptShopCatalog) {
      const placeholder = document.createElement('div');
      placeholder.className = 'script-shop-empty';
      placeholder.innerHTML = '<span aria-hidden="true">☁</span><strong>Conecta con la Shop para ver el catálogo</strong><small>El catálogo solo se consulta al abrir esta pestaña o pulsar Verificar.</small>';
      scriptShopGrid.appendChild(placeholder);
      scriptShopSummary.textContent = '';
      return;
    }

    const query = String(scriptShopSearch.value || '').trim().toLowerCase();
    const rows = (scriptShopCatalog.scripts || []).filter((item) => !query || [
      item.name, item.summary, item.description, item.category, item.author, ...(item.tags || []), ...(item.games || [])
    ].join(' ').toLowerCase().includes(query));
    const installedCount = scriptShopCatalog.scripts.filter((item) => Boolean(installedShopScript(item.id))).length;
    const updateCount = scriptShopCatalog.scripts.filter((item) => scriptShopState(item).key === 'update').length;
    scriptShopSummary.innerHTML = `
      <span><b>${scriptShopCatalog.scripts.length}</b> publicados</span>
      <span><b>${installedCount}</b> instalados</span>
      <span class="${updateCount ? 'has-updates' : ''}"><b>${updateCount}</b> actualizaciones</span>
      <small>${scriptShopCatalog.stale ? 'Copia guardada · GitHub no respondió' : `Catálogo ${escapeHtml(scriptShopCatalog.updatedAt || 'actual')}`}</small>`;

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'script-shop-empty';
      empty.innerHTML = scriptShopCatalog.scripts.length
        ? '<span aria-hidden="true">⌕</span><strong>No hay resultados</strong><small>Prueba otra palabra o categoría.</small>'
        : '<span aria-hidden="true">📦</span><strong>La Shop está lista</strong><small>Los scripts aparecerán aquí cuando DiegoT34 los publique en el catálogo.</small>';
      scriptShopGrid.appendChild(empty);
      return;
    }

    for (const item of rows) {
      const state = scriptShopState(item);
      const compatible = compareVersions(scriptShopLauncherVersion, item.minLauncherVersion) >= 0;
      const card = document.createElement('article');
      card.className = `script-shop-card is-${state.key}${item.featured ? ' is-featured' : ''}`;
      const tags = (item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
      const gameTags = scriptGameLabels(state.installed || item).map((game) => `<span class="is-game">🎮 ${escapeHtml(game)}</span>`).join('');
      const permissions = (item.permissions || []).map((permission) => `<li>${escapeHtml(permission)}</li>`).join('');
      const actionLabel = state.key === 'update' || state.key === 'modified' ? 'Actualizar' : 'Instalar';
      const busy = scriptShopBusyId === item.id;
      card.innerHTML = `
        <div class="script-shop-card-icon" aria-hidden="true">${escapeHtml(item.icon || '📜')}</div>
        <div class="script-shop-card-copy">
          <div class="script-shop-card-title">
            <div><span>${escapeHtml(item.category)}</span><h3>${escapeHtml(item.name)}</h3></div>
            <strong class="script-shop-status">${escapeHtml(state.label)}</strong>
          </div>
          <p>${escapeHtml(item.summary || item.description || 'Sin descripción.')}</p>
          <div class="script-shop-tags">${gameTags}${tags}</div>
          <dl>
            <div><dt>Versión</dt><dd>${escapeHtml(item.version)}</dd></div>
            <div><dt>Autor</dt><dd>${escapeHtml(item.author)}</dd></div>
            <div><dt>Launcher</dt><dd>≥ ${escapeHtml(item.minLauncherVersion)}${compatible ? '' : ' · incompatible'}</dd></div>
          </dl>
          <details>
            <summary>Información y permisos</summary>
            <p>${escapeHtml(item.description || item.summary || 'Sin información adicional.')}</p>
            ${permissions ? `<h4>Permisos declarados</h4><ul>${permissions}</ul>` : '<p>El catálogo no declara permisos adicionales.</p>'}
            ${item.changelog ? `<h4>Cambios de esta versión</h4><p>${escapeHtml(item.changelog)}</p>` : ''}
            <code title="SHA-256 completo">SHA-256 ${escapeHtml(item.sha256.slice(0, 16))}…</code>
          </details>
        </div>
        <div class="script-shop-card-actions">
          ${state.installed ? `<button class="button script-shop-remove" data-action="remove" type="button" ${busy ? 'disabled' : ''}>Desinstalar</button>` : ''}
          ${state.key !== 'installed' ? `<button class="button button-primary" data-action="install" type="button" ${busy || !compatible ? 'disabled' : ''}>${busy ? 'Procesando…' : actionLabel}</button>` : '<button class="button button-secondary" data-action="open" type="button">Abrir instalado</button>'}
        </div>`;
      card.querySelector('[data-action="install"]')?.addEventListener('click', () => installFromScriptShop(item));
      card.querySelector('[data-action="remove"]')?.addEventListener('click', () => uninstallFromScriptShop(item));
      card.querySelector('[data-action="open"]')?.addEventListener('click', () => {
        switchScriptsView('installed');
        if (state.installed) selectScript(state.installed.id);
      });
      scriptShopGrid.appendChild(card);
    }
  }

  async function loadScriptShop(refresh = false) {
    if (scriptShopLoading) return;
    scriptShopLoading = true;
    refreshScriptShopButton.disabled = true;
    setScriptShopMessage(refresh ? 'Verificando publicaciones y actualizaciones…' : 'Conectando con la Shop…');
    try {
      const result = await window.pokeGrid.loadScriptShop(refresh);
      if (!result?.ok) throw new Error(result?.error || 'No se pudo cargar el catálogo online.');
      scriptShopCatalog = result.catalog;
      scriptShopLauncherVersion = String(result.launcherVersion || scriptShopLauncherVersion);
      if (Array.isArray(result.scripts)) scripts = result.scripts;
      renderList();
      renderScriptShop();
      setScriptShopMessage(result.catalog?.stale
        ? `Se muestra la última copia disponible. ${result.catalog.warning || ''}`
        : 'Catálogo verificado con GitHub.', result.catalog?.stale ? '' : 'ok');
    } catch (error) {
      renderScriptShop();
      setScriptShopMessage(error.message || 'No se pudo abrir la Shop. Comprueba tu conexión.');
    } finally {
      scriptShopLoading = false;
      refreshScriptShopButton.disabled = false;
    }
  }

  async function installFromScriptShop(item) {
    const previous = installedShopScript(item.id);
    scriptShopBusyId = item.id;
    renderScriptShop();
    setScriptShopMessage(`${previous ? 'Actualizando' : 'Descargando'} ${item.name}…`);
    try {
      const result = await window.pokeGrid.installScriptShopItem({ shopId: item.id });
      if (!result?.ok) throw new Error(result?.error || 'No se pudo instalar el script.');
      scripts = result.scripts || scripts;
      const reloaded = reloadScriptPanels(previous, result.script);
      renderList();
      setScriptShopMessage(`${item.name} ${previous ? 'fue actualizado' : 'quedó instalado'} y se aplicó en ${reloaded} pantalla${reloaded === 1 ? '' : 's'} compatible${reloaded === 1 ? '' : 's'}.`, 'ok');
    } catch (error) {
      const failure = error.message || 'No se pudo completar la instalación.';
      if (/HTTP\s+404\b/i.test(failure) && scriptShopCatalog?.scripts) {
        try {
          const refreshed = await window.pokeGrid.loadScriptShop(true);
          if (refreshed?.ok && refreshed.catalog) scriptShopCatalog = refreshed.catalog;
        } catch {}
        scriptShopCatalog.scripts = scriptShopCatalog.scripts.filter((candidate) => candidate.id !== item.id);
        setScriptShopMessage(`${item.name} fue retirado de la Shop y ya no se mostrará en el catálogo.`, 'ok');
      } else {
        setScriptShopMessage(failure);
      }
    } finally {
      scriptShopBusyId = '';
      renderScriptShop();
    }
  }

  async function uninstallFromScriptShop(item) {
    const installed = installedShopScript(item.id);
    if (!installed || !window.confirm(`¿Desinstalar “${item.name}” y borrar sus datos guardados?`)) return;
    scriptShopBusyId = item.id;
    renderScriptShop();
    setScriptShopMessage(`Desinstalando ${item.name}…`);
    try {
      const result = await window.pokeGrid.uninstallScriptShopItem(item.id);
      if (!result?.ok) throw new Error(result?.error || 'No se pudo desinstalar el script.');
      scripts = result.scripts || scripts;
      reloadScriptPanels(installed);
      renderList();
      setScriptShopMessage(`${item.name} fue desinstalado.`, 'ok');
    } catch (error) {
      setScriptShopMessage(error.message || 'No se pudo desinstalar el script.');
    } finally {
      scriptShopBusyId = '';
      renderScriptShop();
    }
  }

  function switchScriptsView(view) {
    activeScriptsView = view === 'shop' ? 'shop' : 'installed';
    const shopActive = activeScriptsView === 'shop';
    installedScriptsView.hidden = shopActive;
    scriptShopView.hidden = !shopActive;
    installedScriptsTab.classList.toggle('is-active', !shopActive);
    scriptShopTab.classList.toggle('is-active', shopActive);
    installedScriptsTab.setAttribute('aria-selected', String(!shopActive));
    scriptShopTab.setAttribute('aria-selected', String(shopActive));
    if (shopActive && !scriptShopCatalog) loadScriptShop(false);
  }

  function draftAccounts() {
    if (focusAccount < 0) return Array(ACCOUNT_COUNT).fill(true);
    return Array.from({ length: ACCOUNT_COUNT }, (_, index) => index === focusAccount);
  }

  function showDraft(value = {}) {
    selectedId = value.id || null;
    selectedSnapshot = value.id ? structuredClone(value) : null;
    editorKicker.textContent = value.id ? 'USERSCRIPT INSTALADO' : 'NUEVO USERSCRIPT';
    enabledInput.checked = value.enabled !== false;
    codeInput.value = value.code || DEFAULT_SOURCE;
    createAccountToggles(accountToggles, value.accounts || draftAccounts());
    deleteButton.hidden = !value.id;
    displayMetadata(codeInput.value);
    refreshEditor({ validate: true });
    renderList();
    setMessage('');
  }

  function selectScript(id) {
    const script = scripts.find((candidate) => candidate.id === id);
    if (script) showDraft(script);
  }

  function reloadAccounts(accountFlags) {
    panelRows.forEach((panel) => {
      if (panelInstanceId(panel) !== PRIMARY_INSTANCE_ID) return;
      if (!accountFlags[panel.index]) return;
      try { panel.webview.reload(); } catch {}
    });
  }

  function scriptAppliesToPanel(script, panel) {
    if (!script?.enabled) return false;
    const url = currentPanelUrl(panel);
    if (!url || !scriptMatchesUrl(script, url)) return false;
    if (panelInstanceId(panel) !== PRIMARY_INSTANCE_ID) return true;
    return script.accounts?.[panel.index] === true;
  }

  function reloadScriptPanels(...changedScripts) {
    const candidates = changedScripts.flat().filter(Boolean);
    if (!candidates.length) return 0;
    let reloaded = 0;
    for (const panel of panelRows) {
      if (!candidates.some((script) => scriptAppliesToPanel(script, panel))) continue;
      try {
        if (currentPanelUrl(panel) && currentPanelUrl(panel) !== 'about:blank') panel.webview.reload();
        reloaded += 1;
      } catch {}
    }
    return reloaded;
  }

  async function loadScripts() {
    const result = await window.pokeGrid.loadUserScripts();
    if (!result.ok) {
      setMessage(result.error || 'No se pudieron leer los scripts.');
      scripts = [];
    } else {
      scripts = await updateBundledTelegramScript(result.scripts || []);
      const diagnosticPattern = String(window.pokeGrid.diagnosticDisabledScriptPattern || '').trim().toLowerCase();
      if (diagnosticPattern) {
        scripts = scripts.map((script) => String(script.name || '').toLowerCase().includes(diagnosticPattern)
          ? { ...script, enabled: false }
          : script);
      }
    }
    if (selectedId && scripts.some((script) => script.id === selectedId)) selectScript(selectedId);
    else if (scripts.length) showDraft(scripts[0]);
    else showDraft();
    renderList();
  }

  async function saveEditor(event) {
    event?.preventDefault();
    const validation = await validateSyntax({ announce: true });
    if (!validation.ok) return;
    const previous = scripts.find((script) => script.id === selectedId);
    const nextAccounts = currentAccountSelection();
    const scope = scriptScope(codeInput.value);
    if (!nextAccounts.some(Boolean) && !scope.external && !scope.customGames.length) {
      setMessage('Selecciona al menos una cuenta o declara un @match compatible con otra instancia.');
      return;
    }
    setMessage('Validando e instalando…');
    const result = await window.pokeGrid.saveUserScript({
      id: selectedId,
      code: codeInput.value,
      enabled: enabledInput.checked,
      accounts: nextAccounts,
      sourceUrl: previous?.sourceUrl || selectedSnapshot?.sourceUrl || ''
    });
    if (!result.ok) {
      setMessage(result.error || 'No se pudo guardar el script.');
      return;
    }
    scripts = result.scripts || [];
    selectedId = result.script.id;
    showDraft(result.script);
    const reloaded = reloadScriptPanels(previous, result.script);
    setMessage(`Script guardado. ${reloaded} pantalla${reloaded === 1 ? '' : 's'} compatible${reloaded === 1 ? '' : 's'} recargada${reloaded === 1 ? '' : 's'} para aplicar los cambios.`, 'ok');
  }

  async function deleteSelected() {
    const script = scripts.find((candidate) => candidate.id === selectedId);
    if (!script) return;
    if (!window.confirm(`¿Eliminar "${script.name}" del centro de scripts?`)) return;
    const result = await window.pokeGrid.deleteUserScript(script.id);
    if (!result.ok) {
      setMessage(result.error || 'No se pudo eliminar el script.');
      return;
    }
    scripts = result.scripts || [];
    reloadScriptPanels(script);
    if (scripts.length) showDraft(scripts[0]);
    else showDraft();
    setMessage('Script eliminado y sesiones afectadas recargadas.', 'ok');
  }

  async function importLocalFile() {
    const result = await window.pokeGrid.importUserScriptFile();
    if (!result.ok) {
      if (!result.canceled) setMessage(result.error || 'No se pudo importar el archivo.');
      return;
    }
    showDraft({ code: result.code, sourceUrl: result.sourceUrl, accounts: draftAccounts(), enabled: true });
    selectedSnapshot = { sourceUrl: result.sourceUrl };
    setMessage('Archivo cargado para revisión. Pulsa “Guardar e instalar” para activarlo.', 'ok');
  }

  function droppedScriptIdentity(code) {
    const metadata = parseMetadata(code);
    return {
      name: metadata.name?.[0]?.trim() || '',
      namespace: metadata.namespace?.[0]?.trim() || 'pokegrid.local'
    };
  }

  async function installDroppedFiles(fileList) {
    const files = [...fileList].filter((file) => /(?:\.user)?\.js$/i.test(file?.name || ''));
    dropZone.classList.remove('is-rejected');
    if (!files.length) {
      dropZone.classList.add('is-rejected');
      setMessage('Arrastra uno o varios archivos .js o .user.js. Las carpetas y otros formatos no son compatibles.');
      window.setTimeout(() => dropZone.classList.remove('is-rejected'), 900);
      return;
    }
    const changedScripts = [];
    const failures = [];
    let installed = 0;
    let updated = 0;
    let lastScript = null;
    setMessage(`Revisando ${files.length} archivo${files.length === 1 ? '' : 's'}…`);
    dropZone.setAttribute('aria-busy', 'true');
    for (const file of files) {
      try {
        if (Number(file.size) > 1_000_000) throw new Error('supera el límite de 1 MB');
        const code = await file.text();
        if (!/==UserScript==/i.test(code)) throw new Error('no contiene el bloque ==UserScript==');
        const validation = await window.pokeGrid.validateUserScriptSyntax(code);
        if (!validation?.ok) throw new Error(validation?.line
          ? `error de sintaxis en la línea ${validation.line}: ${validation.error}`
          : validation?.error || 'sintaxis JavaScript no válida');
        const identity = droppedScriptIdentity(code);
        if (!identity.name) throw new Error('no declara @name');
        const existing = scripts.find((script) =>
          script.namespace === identity.namespace && script.name === identity.name
        );
        const accountFlags = existing?.accounts || draftAccounts();
        const result = await window.pokeGrid.saveUserScript({
          id: existing?.id,
          code,
          enabled: existing?.enabled !== false,
          accounts: accountFlags,
          sourceUrl: existing?.sourceUrl || `pokegrid-drop://${encodeURIComponent(file.name)}`
        });
        if (!result?.ok) throw new Error(result?.error || 'no se pudo guardar');
        scripts = result.scripts || scripts;
        lastScript = result.script;
        changedScripts.push(existing, result.script);
        if (existing) updated += 1;
        else installed += 1;
      } catch (error) {
        failures.push(`${file.name}: ${error.message || 'archivo no válido'}`);
      }
    }
    dropZone.removeAttribute('aria-busy');
    if (lastScript) {
      selectedId = lastScript.id;
      showDraft(lastScript);
      reloadScriptPanels(changedScripts);
    } else {
      renderList();
    }
    const completed = [
      installed ? `${installed} instalado${installed === 1 ? '' : 's'}` : '',
      updated ? `${updated} actualizado${updated === 1 ? '' : 's'}` : ''
    ].filter(Boolean).join(' · ');
    if (failures.length) {
      setMessage(`${completed ? `${completed}. ` : ''}${failures.length} rechazado${failures.length === 1 ? '' : 's'}: ${failures[0]}${failures.length > 1 ? ` (+${failures.length - 1})` : ''}`);
      dropZone.classList.add('is-rejected');
      window.setTimeout(() => dropZone.classList.remove('is-rejected'), 1200);
    } else {
      setMessage(`${completed}. Las sesiones afectadas fueron recargadas para aplicar los cambios.`, 'ok');
    }
  }

  async function exportEditorFile() {
    const code = codeInput.value;
    if (!code.trim()) {
      setMessage('No hay código para exportar.');
      return;
    }
    const metadata = parseMetadata(code);
    const suggestedName = metadata.name?.[0]?.trim() || 'PokeGrid-userscript';
    exportButton.disabled = true;
    setMessage('Preparando el archivo .js…');
    try {
      const result = await window.pokeGrid.exportUserScriptFile({ code, suggestedName });
      if (result.canceled) {
        setMessage('');
        return;
      }
      if (!result.ok) throw new Error(result.error || 'No se pudo exportar el script.');
      setMessage(`Script exportado: ${result.file}`, 'ok');
    } catch (error) {
      setMessage(error.message || 'No se pudo exportar el script.');
    } finally {
      exportButton.disabled = false;
    }
  }

  async function importBundledTelegramAlerts() {
    setMessage('Cargando el módulo oficial de alertas Telegram…');
    const result = await window.pokeGrid.loadBundledTelegramAlerts();
    if (!result.ok) {
      setMessage(result.error || 'No se pudo cargar el módulo de Telegram.');
      return;
    }
    const existing = scripts.find((script) => script.namespace === 'pokegrid.telegram-alerts');
    showDraft({
      ...(existing || {}),
      code: result.code,
      sourceUrl: result.sourceUrl,
      accounts: existing?.accounts || Array(ACCOUNT_COUNT).fill(true),
      enabled: true
    });
    selectedSnapshot = { ...(existing || {}), sourceUrl: result.sourceUrl };
    setMessage(
      existing
        ? 'Actualización cargada. Pulsa “Guardar e instalar” para aplicarla en las cuatro cuentas.'
        : 'Módulo cargado y preseleccionado para las cuatro cuentas. Pulsa “Guardar e instalar”.',
      'ok'
    );
  }

  async function fetchRemoteScript(event) {
    event.preventDefault();
    if (!urlInput.value.trim()) return;
    setMessage('Descargando script por HTTPS…');
    const result = await window.pokeGrid.fetchUserScriptUrl(urlInput.value.trim());
    if (!result.ok) {
      setMessage(result.error || 'No se pudo descargar el script.');
      return;
    }
    showDraft({ code: result.code, sourceUrl: result.sourceUrl, accounts: draftAccounts(), enabled: true });
    selectedSnapshot = { sourceUrl: result.sourceUrl };
    setMessage('Script descargado para revisión. No se ejecutará hasta que lo guardes.', 'ok');
  }

  function open(accountIndex = -1) {
    focusAccount = Number.isInteger(accountIndex) ? accountIndex : -1;
    document.body.classList.add('has-scripts-modal');
    panelRows.forEach((panel) => panel.webview?.style.setProperty('visibility', 'hidden', 'important'));
    backdrop.hidden = false;
    if (!selectedId && !scripts.length) showDraft();
    if (activeScriptsView === 'installed') codeInput.focus();
    if (!scriptShopCatalog && typeof window.pokeGrid.loadScriptShop === 'function') loadScriptShop(false);
  }

  function close() {
    backdrop.hidden = true;
    document.body.classList.remove('has-scripts-modal');
    panelRows.forEach((panel) => panel.webview?.style.removeProperty('visibility'));
  }

  function globRegExp(value) {
    return new RegExp(`^${String(value).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')}$`, 'i');
  }

  function urlMatchesPattern(url, pattern) {
    const source = String(pattern || '').trim();
    if (!source) return false;
    if (source === '<all_urls>') return /^https?:/i.test(url);
    if (!source.includes('://')) {
      try { return globRegExp(source).test(url); } catch { return false; }
    }
    const match = source.match(/^(\*|https?|file|ftp):\/\/([^/]+)(\/.*)$/i);
    if (!match) return false;
    const [, rawScheme, rawHost, rawPath] = match;
    let target;
    try { target = new URL(url); } catch { return false; }
    if (rawScheme === '*' ? !['http:', 'https:'].includes(target.protocol) : `${rawScheme.toLowerCase()}:` !== target.protocol) return false;
    const host = rawHost.toLowerCase();
    const targetHost = target.hostname.toLowerCase();
    if (host !== '*' && !(host.startsWith('*.')
      ? targetHost === host.slice(2) || targetHost.endsWith(`.${host.slice(2)}`)
      : targetHost === host)) return false;
    return globRegExp(rawPath).test(`${target.pathname}${target.search}${target.hash}`);
  }

  function scriptMatchesUrl(script, url) {
    const included = (script.matches || []).some((pattern) => urlMatchesPattern(url, pattern));
    const excluded = (script.excludes || []).some((pattern) => urlMatchesPattern(url, pattern));
    return included && !excluded;
  }

  function buildRuntimeSource(script, runtimeContext = {}) {
    const metadata = JSON.stringify({
      id: script.id,
      name: script.name,
      namespace: script.namespace,
      version: script.version,
      description: script.description,
      author: script.author,
      matches: script.matches,
      excludes: script.excludes,
      grants: script.grants,
      connects: script.connects,
      runAt: script.runAt,
      sourceUrl: script.sourceUrl,
      account: {
        index: Number(runtimeContext.accountIndex ?? -1),
        label: String(runtimeContext.accountLabel || '')
      },
      instance: {
        id: String(runtimeContext.instanceId || PRIMARY_INSTANCE_ID),
        name: String(runtimeContext.instanceName || 'Poke Idle World'),
        index: Number(runtimeContext.instanceIndex ?? runtimeContext.accountIndex ?? -1)
      }
    }).replaceAll('</', '<\\/');
    const safeId = JSON.stringify(script.id);
    return `(() => {
  const __meta = ${metadata};
  const __registry = window.__pokeGridUserScriptsRuntime || (window.__pokeGridUserScriptsRuntime = new Set());
  const __key = ${safeId} + '::' + location.href;
  if (__registry.has(__key)) return 'already-running';
  __registry.add(__key);
  const __execute = async () => {
    const __storageKey = 'pokegrid:userscript:' + __meta.id + ':storage';
    const __readStore = () => {
      try { return JSON.parse(localStorage.getItem(__storageKey) || '{}') || {}; } catch { return {}; }
    };
    const __writeStore = (store) => localStorage.setItem(__storageKey, JSON.stringify(store));
    const GM_info = Object.freeze({
      script: Object.freeze({ ...__meta }),
      scriptMetaStr: '',
      version: 'PokeGrid Native 1.0',
      scriptHandler: 'PokeGrid Userscripts'
    });
    const GM_getValue = (key, fallback) => {
      const store = __readStore();
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : fallback;
    };
    const GM_setValue = (key, value) => { const store = __readStore(); store[key] = value; __writeStore(store); };
    const GM_deleteValue = (key) => { const store = __readStore(); delete store[key]; __writeStore(store); };
    const GM_listValues = () => Object.keys(__readStore());
    const GM_getSharedValue = async (key, fallback) => {
      const result = await window.pokeGridUserScripts?.getSharedValue(__meta.id, String(key));
      return result?.found ? result.value : fallback;
    };
    const GM_setSharedValue = async (key, value) => {
      await window.pokeGridUserScripts?.setSharedValue(__meta.id, String(key), value);
    };
    const GM_deleteSharedValue = async (key) => {
      await window.pokeGridUserScripts?.deleteSharedValue(__meta.id, String(key));
    };
    const GM_addStyle = (css) => {
      const style = document.createElement('style');
      style.dataset.pokegridUserscript = __meta.id;
      style.textContent = String(css || '');
      (document.head || document.documentElement).appendChild(style);
      return style;
    };
    const GM_log = (...args) => console.log('[' + __meta.name + ']', ...args);
    const GM_setClipboard = async (text) => {
      if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(String(text));
      const input = document.createElement('textarea');
      input.value = String(text);
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    };
    const GM_notification = (details, title) => {
      const options = typeof details === 'object' ? details : { text: details, title };
      const toast = document.createElement('div');
      toast.dataset.pokegridUserscriptToast = __meta.id;
      Object.assign(toast.style, {
        position: 'fixed', right: '12px', bottom: '12px', zIndex: '2147483647',
        maxWidth: '320px', padding: '10px 12px', border: '1px solid #6558c8',
        borderRadius: '8px', background: '#101827', color: '#edf2fa',
        boxShadow: '0 12px 35px rgba(0,0,0,.5)', font: '12px/1.4 system-ui'
      });
      toast.innerHTML = '<strong style="display:block;color:#c8bbff"></strong><span></span>';
      toast.querySelector('strong').textContent = options.title || __meta.name;
      toast.querySelector('span').textContent = options.text || '';
      toast.addEventListener('click', () => { options.onclick?.(); toast.remove(); });
      document.documentElement.appendChild(toast);
      setTimeout(() => { toast.remove(); options.ondone?.(); }, Number(options.timeout) || 5000);
    };
    const GM_openInTab = (url) => {
      const opened = window.open(String(url), '_blank', 'noopener,noreferrer');
      return { close: () => opened?.close(), closed: opened?.closed ?? true };
    };
    const GM_download = (details, name) => {
      const options = typeof details === 'object' ? details : { url: details, name };
      const link = document.createElement('a');
      link.href = String(options.url || '');
      link.download = String(options.name || '');
      link.rel = 'noopener';
      link.click();
    };
    const GM_registerMenuCommand = (caption, command) => {
      const commands = window.__pokeGridUserScriptCommands || (window.__pokeGridUserScriptCommands = []);
      const id = __meta.id + ':' + commands.length;
      commands.push({ id, scriptId: __meta.id, caption: String(caption), command });
      return id;
    };
    const GM_unregisterMenuCommand = (id) => {
      const commands = window.__pokeGridUserScriptCommands || [];
      const index = commands.findIndex((entry) => entry.id === id);
      if (index >= 0) commands.splice(index, 1);
    };
    const GM_xmlhttpRequest = (details) => {
      let aborted = false;
      const promise = window.pokeGridUserScripts?.request(__meta.id, {
        method: details.method, url: details.url, headers: details.headers, data: details.data,
        multipart: details.multipart
      }).then((response) => {
        if (aborted) return;
        details.onload?.({ ...response, response: response.responseText, readyState: 4 });
        return response;
      }).catch((error) => {
        if (!aborted) details.onerror?.({ error: error.message, status: 0, readyState: 4 });
        throw error;
      });
      return { abort: () => { aborted = true; }, then: promise.then.bind(promise), catch: promise.catch.bind(promise) };
    };
    const GM = Object.freeze({
      info: GM_info,
      getValue: async (key, fallback) => GM_getValue(key, fallback),
      setValue: async (key, value) => GM_setValue(key, value),
      deleteValue: async (key) => GM_deleteValue(key),
      listValues: async () => GM_listValues(),
      getSharedValue: GM_getSharedValue,
      setSharedValue: GM_setSharedValue,
      deleteSharedValue: GM_deleteSharedValue,
      addStyle: async (css) => GM_addStyle(css),
      setClipboard: GM_setClipboard,
      notification: async (details) => GM_notification(details),
      openInTab: async (url, options) => GM_openInTab(url, options),
      download: async (details) => GM_download(details),
      registerMenuCommand: async (caption, command) => GM_registerMenuCommand(caption, command),
      unregisterMenuCommand: async (id) => GM_unregisterMenuCommand(id),
      xmlHttpRequest: (details) => GM_xmlhttpRequest(details)
    });
    const unsafeWindow = window;
    try {
      await (async function () {
${script.code}
      }).call(window);
      window.dispatchEvent(new CustomEvent('pokegrid:userscript-loaded', { detail: { id: __meta.id, name: __meta.name } }));
    } catch (error) {
      console.error('[PokeGrid Userscripts] Error en ' + __meta.name, error);
      __registry.delete(__key);
    }
  };
  if (__meta.runAt === 'document-idle') {
    if (document.readyState === 'complete') setTimeout(__execute, 250);
    else window.addEventListener('load', () => setTimeout(__execute, 250), { once: true });
  } else {
    __execute();
  }
  return 'installed';
})()
//# sourceURL=pokegrid-userscript-${script.id}.js`;
  }

  async function installIntoPanel(panel) {
    let url = '';
    try { url = panel.webview.getURL(); } catch { return; }
    if (!/^https?:\/\//i.test(url)) return;
    const candidates = scripts.filter((script) => scriptAppliesToPanel(script, panel));
    for (const script of candidates) {
      try {
        const primary = panelInstanceId(panel) === PRIMARY_INSTANCE_ID;
        const slotIndex = primary ? panel.index : panel.instanceIndex;
        await panel.webview.executeJavaScript(buildRuntimeSource(script, {
          accountIndex: slotIndex,
          accountLabel: primary
            ? (accountRows[panel.index]?.label || `Cuenta ${panel.index + 1}`)
            : `${panel.instanceName || 'Juego'} · ${Number(slotIndex) + 1}`,
          instanceId: panelInstanceId(panel),
          instanceName: primary ? 'Poke Idle World' : (panel.instanceName || panelInstanceId(panel)),
          instanceIndex: slotIndex
        }));
      } catch (error) {
        console.error(`[PokeGrid Userscripts] No se pudo inyectar ${script.name}:`, error);
      }
    }
  }

  async function loadExtensionStatus() {
    const result = await window.pokeGrid.getUnpackedExtensionStatus();
    if (!result.ok) return;
    extensionConfig = result.config || extensionConfig;
    extensionPathOutput.value = extensionConfig.path || 'Ninguna carpeta seleccionada';
    extensionPathOutput.title = extensionConfig.path || '';
    createAccountToggles(extensionAccountToggles, extensionConfig.accounts);
    const loaded = (result.results || []).filter((entry) => entry.loaded);
    extensionStatus.textContent = loaded.length
      ? `${loaded[0].name || 'Extensión'} cargada en ${loaded.length} sesión(es).`
      : 'No hay ninguna extensión desempaquetada cargada.';
    extensionStatus.className = loaded.length ? 'is-ok' : '';
  }

  async function pickExtension() {
    const result = await window.pokeGrid.pickUnpackedExtension();
    if (!result.ok) {
      if (!result.canceled) {
        extensionStatus.textContent = result.error || 'Carpeta no válida.';
        extensionStatus.className = 'is-error';
      }
      return;
    }
    extensionConfig.path = result.path;
    extensionPathOutput.value = result.path;
    extensionPathOutput.title = result.path;
    extensionStatus.textContent = `${result.manifest.name} v${result.manifest.version} lista para aplicar.`;
    extensionStatus.className = '';
  }

  async function applyExtension() {
    const accounts = currentAccountSelection(extensionAccountToggles);
    if (accounts.some(Boolean) && !extensionConfig.path) {
      extensionStatus.textContent = 'Elige primero una carpeta de extensión.';
      extensionStatus.className = 'is-error';
      return;
    }
    applyExtensionButton.disabled = true;
    extensionStatus.textContent = 'Cargando extensión en las sesiones seleccionadas…';
    extensionStatus.className = '';
    const result = await window.pokeGrid.applyUnpackedExtension({ path: extensionConfig.path, accounts });
    applyExtensionButton.disabled = false;
    if (!result.ok) {
      extensionStatus.textContent = result.error || 'No se pudo cargar la extensión.';
      extensionStatus.className = 'is-error';
      return;
    }
    extensionConfig = result.config;
    const failures = result.results.filter((entry) => accounts[entry.account] && !entry.loaded);
    const loaded = result.results.filter((entry) => entry.loaded);
    extensionStatus.textContent = failures.length
      ? `Cargada en ${loaded.length} sesión(es); ${failures.length} fallaron: ${failures[0].error || 'API no compatible'}.`
      : accounts.some(Boolean)
        ? `${result.manifest?.name || 'Extensión'} cargada en ${loaded.length} sesión(es).`
        : 'Extensión desactivada en todas las sesiones.';
    extensionStatus.className = failures.length ? 'is-error' : 'is-ok';
    reloadAccounts(Array(ACCOUNT_COUNT).fill(true));
  }

  async function initialize() {
    guestPreloadUrl = await window.pokeGrid.getGuestPreloadUrl();
    await Promise.all([loadScripts(), loadExtensionStatus()]);
    renderScriptShop();
    return guestPreloadUrl;
  }

  scriptsButton.addEventListener('click', () => open(-1));
  installedScriptsTab.addEventListener('click', () => switchScriptsView('installed'));
  scriptShopTab.addEventListener('click', () => switchScriptsView('shop'));
  refreshScriptShopButton.addEventListener('click', () => loadScriptShop(true));
  scriptShopSearch.addEventListener('input', renderScriptShop);
  closeButton.addEventListener('click', close);
  newButton.addEventListener('click', () => showDraft());
  importButton.addEventListener('click', importLocalFile);
  dropZone.addEventListener('click', importLocalFile);
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      importLocalFile();
    }
  });
  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropDepth += 1;
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  });
  dropZone.addEventListener('dragleave', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropDepth = Math.max(0, dropDepth - 1);
    if (!dropDepth) dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropDepth = 0;
    dropZone.classList.remove('is-dragging');
    installDroppedFiles(event.dataTransfer.files);
  });
  installTelegramButton.addEventListener('click', importBundledTelegramAlerts);
  urlForm.addEventListener('submit', fetchRemoteScript);
  editorForm.addEventListener('submit', saveEditor);
  deleteButton.addEventListener('click', deleteSelected);
  exportButton.addEventListener('click', exportEditorFile);
  cancelChangesButton.addEventListener('click', () => {
    const script = scripts.find((candidate) => candidate.id === selectedId);
    showDraft(script || {});
  });
  codeInput.addEventListener('input', () => {
    window.clearTimeout(editorTimer);
    window.clearTimeout(syntaxTimer);
    syntaxStatus.className = 'is-pending';
    syntaxStatus.textContent = 'Validando…';
    refreshEditor();
    editorTimer = window.setTimeout(() => displayMetadata(codeInput.value), 120);
    syntaxTimer = window.setTimeout(() => validateSyntax(), 420);
  });
  codeInput.addEventListener('scroll', () => { lineNumbers.scrollTop = codeInput.scrollTop; });
  ['click', 'keyup', 'select'].forEach((name) => codeInput.addEventListener(name, updateCursorStatus));
  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      indentSelection(event.shiftKey);
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      editorForm.requestSubmit();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      openFind();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === '/') {
      event.preventDefault();
      toggleSelectedComments();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSelectedLines();
    }
    if (event.key === 'F8') {
      event.preventDefault();
      validateSyntax({ announce: true });
    }
  });
  validateButton.addEventListener('click', () => validateSyntax({ announce: true }));
  undoButton.addEventListener('click', () => { codeInput.focus(); document.execCommand('undo'); refreshEditor({ validate: true }); });
  redoButton.addEventListener('click', () => { codeInput.focus(); document.execCommand('redo'); refreshEditor({ validate: true }); });
  commentButton.addEventListener('click', toggleSelectedComments);
  duplicateLineButton.addEventListener('click', duplicateSelectedLines);
  findButton.addEventListener('click', openFind);
  closeFindButton.addEventListener('click', closeFind);
  findInput.addEventListener('input', () => { findMatchIndex = -1; updateFindMatches(); });
  findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); selectFindMatch(event.shiftKey ? -1 : 1); }
    if (event.key === 'Escape') { event.preventDefault(); closeFind(); }
  });
  findPreviousButton.addEventListener('click', () => selectFindMatch(-1));
  findNextButton.addEventListener('click', () => selectFindMatch(1));
  pickExtensionButton.addEventListener('click', pickExtension);
  applyExtensionButton.addEventListener('click', applyExtension);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !backdrop.hidden) close();
  });

  window.pokeGridUserScriptManager = Object.freeze({
    initialize,
    open,
    close,
    installIntoPanel,
    getGuestPreloadUrl: () => guestPreloadUrl,
    setAccounts(value) {
      accountRows = Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
        label: value?.[index]?.label || `Cuenta ${index + 1}`
      }));
      const selected = currentAccountSelection();
      const extensionSelected = currentAccountSelection(extensionAccountToggles);
      renderScriptTargetControls(codeInput.value, selected);
      createAccountToggles(extensionAccountToggles, extensionSelected);
      renderList();
    },
    setPanels(value) {
      panelRows = value || [];
      if (selectedId || codeInput.value) displayMetadata(codeInput.value);
      renderList();
    },
    refresh: loadScripts
  });
})();
