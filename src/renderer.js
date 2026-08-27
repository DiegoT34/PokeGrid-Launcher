const LOGIN_URL = 'https://poke.idleworld.online/login';
const ACCOUNT_COUNT = 4;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FARM_CONFIG_KEY = 'pokegrid:farm-config:v1';
const FARM_ORRE_PERMISSION_KEY = 'pokegrid:farm-orre-permission:v1';
const NOTIFICATION_KEY = 'pokegrid:notifications:v1';
const CAPTURE_GOAL_KEY = 'pokegrid:capture-goals:v1';
const GRID_VIEW_KEY = 'pokegrid:grid-view:v1';
const GRID_VISIBLE_KEY = 'idle-poke:grid-visible:v1';
const GRID_ORDER_KEY = 'idle-poke:grid-order:v1';
const BROWSER_INSTANCES_KEY = 'pokegrid:browser-instances:v1';
const ACTIVE_BROWSER_INSTANCE_KEY = 'pokegrid:active-browser-instance:v1';
const PRIMARY_BROWSER_INSTANCE_ID = 'poke-idle-world';
const NOTIFICATION_COUNTER_KEY = 'pokegrid:notification-counters:v1';
const PANEL_READ_TIMEOUT_MS = 9000;
const CAPTURE_ARCHIVE_DB = 'pokegrid-capture-archive-v1';
const GAME_ORIGIN = 'https://poke.idleworld.online';
const WEBVIEW_STALL_TIMEOUT_MS = 120_000;
const WEBVIEW_RECOVERY_BASE_MS = 2_000;
const WEBVIEW_RECOVERY_MAX_MS = 30_000;
const POKEMON_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];
const LEGENDARY_POKEMON = new Set([
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  'raikou', 'entei', 'suicune', 'lugia', 'ho oh', 'celebi',
  'regirock', 'regice', 'registeel', 'latias', 'latios', 'kyogre', 'groudon', 'rayquaza', 'jirachi', 'deoxys',
  'uxie', 'mesprit', 'azelf', 'dialga', 'palkia', 'heatran', 'regigigas', 'giratina', 'cresselia', 'phione', 'manaphy', 'darkrai', 'shaymin', 'arceus',
  'cobalion', 'terrakion', 'virizion', 'tornadus', 'thundurus', 'reshiram', 'zekrom', 'landorus', 'kyurem', 'keldeo', 'meloetta', 'genesect',
  'xerneas', 'yveltal', 'zygarde', 'diancie', 'hoopa', 'volcanion',
  'type null', 'silvally', 'tapu koko', 'tapu lele', 'tapu bulu', 'tapu fini', 'cosmog', 'cosmoem', 'solgaleo', 'lunala', 'necrozma', 'magearna', 'marshadow', 'zeraora', 'meltan', 'melmetal',
  'zacian', 'zamazenta', 'eternatus', 'kubfu', 'urshifu', 'zarude', 'regieleki', 'regidrago', 'glastrier', 'spectrier', 'calyrex',
  'wo chien', 'chien pao', 'ting lu', 'chi yu', 'koraidon', 'miraidon', 'okidogi', 'munkidori', 'fezandipiti', 'ogerpon', 'terapagos', 'pecharunt'
]);

const grid = document.querySelector('#grid');
const instanceTabs = document.querySelector('#instanceTabs');
const addBrowserInstanceButton = document.querySelector('#addBrowserInstanceButton');
const topbarCollapseButton = document.querySelector('#topbarCollapseButton');
const browserInstanceBackdrop = document.querySelector('#browserInstanceBackdrop');
const browserInstanceForm = document.querySelector('#browserInstanceForm');
const browserInstanceName = document.querySelector('#browserInstanceName');
const browserInstanceUrl = document.querySelector('#browserInstanceUrl');
const browserInstanceCount = document.querySelector('#browserInstanceCount');
const browserInstanceMessage = document.querySelector('#browserInstanceMessage');
const closeBrowserInstanceButton = document.querySelector('#closeBrowserInstanceButton');
const cancelBrowserInstanceButton = document.querySelector('#cancelBrowserInstanceButton');
const viewModeButton = document.querySelector('#viewModeButton');
const viewModeMenu = document.querySelector('#viewModeMenu');
const viewModeAccounts = document.querySelector('#viewModeAccounts');
const viewModeAllButton = document.querySelector('#viewModeAllButton');
const panelTemplate = document.querySelector('#panelTemplate');
const modalBackdrop = document.querySelector('#modalBackdrop');
const accountRows = document.querySelector('#accountRows');
const modalMessage = document.querySelector('#modalMessage');
const accountsForm = document.querySelector('#accountsForm');
const downloadAccountsTemplateButton = document.querySelector('#downloadAccountsTemplateButton');
const importAccountsButton = document.querySelector('#importAccountsButton');
const appbar = document.querySelector('#appbar');
const topbarToggle = document.querySelector('#topbarToggle');
const globalActions = document.querySelector('#globalActions');
const sidebarScrim = document.querySelector('#sidebarScrim');
const farmButton = document.querySelector('#farmButton');
const farmBackdrop = document.querySelector('#farmBackdrop');
const farmAccountGrid = document.querySelector('#farmAccountGrid');
const farmGlobalState = document.querySelector('#farmGlobalState');
const farmMessage = document.querySelector('#farmMessage');
const refreshFarmButton = document.querySelector('#refreshFarmButton');
const rereadFarmLeadersButton = document.querySelector('#rereadFarmLeadersButton');
const farmAllowOrreTravelInput = document.querySelector('#farmAllowOrreTravel');
const startFarmButton = document.querySelector('#startFarmButton');
const stopFarmButton = document.querySelector('#stopFarmButton');
const farmPickerLayer = document.querySelector('#farmPickerLayer');
const farmPickerAccount = document.querySelector('#farmPickerAccount');
const farmSearchInput = document.querySelector('#farmSearchInput');
const farmAreaFilters = document.querySelector('#farmAreaFilters');
const farmTypeFilter = document.querySelector('#farmTypeFilter');
const farmLevelFilter = document.querySelector('#farmLevelFilter');
const farmMatchupFilter = document.querySelector('#farmMatchupFilter');
const farmSortSelect = document.querySelector('#farmSortSelect');
const farmShinyFilter = document.querySelector('#farmShinyFilter');
const resetFarmFiltersButton = document.querySelector('#resetFarmFiltersButton');
const farmRecommendedRoute = document.querySelector('#farmRecommendedRoute');
const farmPokemonGrid = document.querySelector('#farmPokemonGrid');
const farmPickerEmpty = document.querySelector('#farmPickerEmpty');
const notificationButton = document.querySelector('#notificationButton');
const notificationBadge = document.querySelector('#notificationBadge');
const notificationPanel = document.querySelector('#notificationPanel');
const notificationList = document.querySelector('#notificationList');
const notificationPokemonFilter = document.querySelector('#notificationPokemonFilter');
const notificationTypeFilter = document.querySelector('#notificationTypeFilter');
const notificationDateFromFilter = document.querySelector('#notificationDateFromFilter');
const notificationDateToFilter = document.querySelector('#notificationDateToFilter');
const notificationIvFilter = document.querySelector('#notificationIvFilter');
const notificationTierFilter = document.querySelector('#notificationTierFilter');
const resetNotificationFiltersButton = document.querySelector('#resetNotificationFiltersButton');
const goalBuilderBackdrop = document.querySelector('#goalBuilderBackdrop');
const openGoalBuilderButton = document.querySelector('#openGoalBuilderButton');
const closeGoalBuilderButton = document.querySelector('#closeGoalBuilderButton');
const captureGoalForm = document.querySelector('#captureGoalForm');
const captureGoalList = document.querySelector('#captureGoalList');
const goalKindSelect = document.querySelector('#goalKindSelect');
const goalTargetLabel = document.querySelector('#goalTargetLabel');
const goalPokemonInput = document.querySelector('#goalPokemonInput');
const goalCatalogSearch = document.querySelector('#goalCatalogSearch');
const goalCatalogList = document.querySelector('#goalCatalogList');
const goalCatalogHelp = document.querySelector('#goalCatalogHelp');
const goalSelectShinyCardsButton = document.querySelector('#goalSelectShinyCardsButton');
const goalAccountSelect = document.querySelector('#goalAccountSelect');
const goalIvInput = document.querySelector('#goalIvInput');
const goalTierSelect = document.querySelector('#goalTierSelect');
const goalTierButtons = document.querySelector('#goalTierButtons');
const goalFormStatus = document.querySelector('#goalFormStatus');
const goalIvField = document.querySelector('#goalIvField');
const goalTierField = document.querySelector('#goalTierField');
const goalQuantityField = document.querySelector('#goalQuantityField');
const goalQuantityInput = document.querySelector('#goalQuantityInput');
const captureGoalCount = document.querySelector('#captureGoalCount');
const notificationHistoryCount = document.querySelector('#notificationHistoryCount');
const goalNotificationCount = document.querySelector('#goalNotificationCount');
const shinyNotificationCount = document.querySelector('#shinyNotificationCount');
const legendaryNotificationCount = document.querySelector('#legendaryNotificationCount');
const cleanupMemoryButton = document.querySelector('#cleanupMemoryButton');
const updateLauncherButton = document.querySelector('#updateLauncherButton');
let currentLauncherVersion = '';
let updateLauncherState = { icon: '⇩', label: 'Actualizar', spinning: false };

function renderUpdateLauncherButton() {
  const icon = document.createElement('span');
  icon.className = updateLauncherState.spinning ? 'memory-spinner' : 'top-action-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = updateLauncherState.icon;

  const copy = document.createElement('span');
  copy.className = 'update-launcher-copy';
  const label = document.createElement('span');
  label.textContent = updateLauncherState.label;
  const version = document.createElement('small');
  version.className = 'update-launcher-version';
  version.setAttribute('aria-label', 'Versión actual');
  version.textContent = currentLauncherVersion ? `v${currentLauncherVersion}` : 'Cargando versión…';
  copy.append(label, version);
  updateLauncherButton.replaceChildren(icon, copy);
}

function setUpdateLauncherState(icon, label, spinning = false) {
  updateLauncherState = { icon, label, spinning };
  renderUpdateLauncherButton();
}

Promise.resolve(window.pokeGrid.getAppVersion?.())
  .then((version) => {
    currentLauncherVersion = String(version || '').trim();
    renderUpdateLauncherButton();
    if (currentLauncherVersion) updateLauncherButton.title = `Buscar actualizaciones · Versión actual ${currentLauncherVersion}`;
  })
  .catch(() => renderUpdateLauncherButton());
const statisticsButton = document.querySelector('#statisticsButton');
const statisticsBackdrop = document.querySelector('#statisticsBackdrop');
const statisticsTotals = document.querySelector('#statisticsTotals');
const statisticsAccounts = document.querySelector('#statisticsAccounts');
const statisticsStatus = document.querySelector('#statisticsStatus');
const statisticsSummaryView = document.querySelector('#statisticsSummaryView');
const statisticsComparisonView = document.querySelector('#statisticsComparisonView');
const statisticsComparisonHighlights = document.querySelector('#statisticsComparisonHighlights');
const statisticsComparisonTable = document.querySelector('#statisticsComparisonTable');
const statisticsViewTabs = [...document.querySelectorAll('.statistics-view-tab')];
const refreshStatisticsButton = document.querySelector('#refreshStatisticsButton');
const closeStatisticsButton = document.querySelector('#closeStatisticsButton');
const accountsSourcePath = document.querySelector('#accountsSourcePath');
const openGoalManagerButton = document.querySelector('#openGoalManagerButton');
const goalManagerBackdrop = document.querySelector('#goalManagerBackdrop');
const closeGoalManagerButton = document.querySelector('#closeGoalManagerButton');
const goalManagerSearch = document.querySelector('#goalManagerSearch');
const goalManagerKindFilter = document.querySelector('#goalManagerKindFilter');
const goalManagerCreateButton = document.querySelector('#goalManagerCreateButton');
const goalManagerList = document.querySelector('#goalManagerList');
const notificationToastLayer = document.querySelector('#notificationToastLayer');

let accounts = [];
let linkedAccountsSource = '';
let accountSourceSyncBusy = false;
let accountProfilePollBusy = false;
const panels = [];
const browserInstanceViews = new Map();
let browserInstances = [];
let activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
let expandedPanel = null;
let visibleAccountIndexes = loadVisibleAccountIndexes();
let panelOrder = loadPanelOrder();
let draggedPanelIndex = null;
let farmCatalog = [];
let pokemonReferenceIndex = new Map();
let captureReferencePromise = null;
let farmContexts = Array.from({ length: ACCOUNT_COUNT }, () => ({ level: null, location: '', ready: false, leader: null }));
let farmConfigs = loadFarmConfigs();
let farmPickerIndex = -1;
let farmPickerArea = 'all';
let farmPickerType = 'all';
let farmPickerLevel = 'all';
let farmPickerMatchup = 'all';
let farmPickerSort = 'recommended';
let farmPickerShinyOnly = false;
let farmBusy = false;
let farmRunning = false;
let farmContextPollBusy = false;
let farmContextTimer = null;
let farmAllowOrreTravel = localStorage.getItem(FARM_ORRE_PERMISSION_KEY) === '1';
let launcherNotifications = loadLauncherNotifications();
let captureGoals = loadCaptureGoals();
let notificationCounters = loadNotificationCounters();
let notificationSourceKeys = new Set(launcherNotifications
  .filter((notification) => notification.capture.sourceKey)
  .map((notification) => `${notification.accountIndex}:${notification.eventKind}:${notification.capture.sourceKey}`));
const recentNotificationSignatures = new Map();
let goalSelectedTargets = new Set();
let goalSelectedTiers = new Set();
let editingGoalId = null;
let goalDropCatalog = [];
let goalDropCatalogPromise = null;
let capturePollBusy = false;
let huntPollBusy = false;
let captureLogPollBusy = false;
let statisticsBusy = false;
let statisticsTimer = 0;
let statisticsRows = [];
let statisticsView = 'summary';
const STATISTICS_REFRESH_INTERVAL_MS = 5_000;
const STATISTICS_CONTEXT_INTERVAL_MS = 15_000;
const STATISTICS_PROFILE_INTERVAL_MS = 30_000;
const STATISTICS_ACCOUNT_COLORS = ['#49c8e8', '#ff806b', '#a889ff', '#e1b74e'];
const statisticsAccountViews = new Map();
const huntDropIconCache = new Map();
const pokeApiSpeciesCache = new Map();
const pokeApiSpriteCache = new Map();

function rememberLauncherCache(cache, key, value, limit) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

function applySidebarState(open, { persist = true } = {}) {
  const expanded = Boolean(open);
  appbar.classList.toggle('is-sidebar-open', expanded);
  document.body.classList.toggle('sidebar-open', expanded);
  topbarToggle.setAttribute('aria-expanded', String(expanded));
  topbarToggle.setAttribute('aria-label', expanded ? 'Cerrar menú del launcher' : 'Abrir menú del launcher');
  topbarToggle.title = expanded ? 'Cerrar menú del launcher' : 'Abrir menú del launcher';
  globalActions.setAttribute('aria-hidden', String(!expanded));
  sidebarScrim.hidden = !expanded;
  if (!expanded && !viewModeMenu.hidden) {
    viewModeMenu.hidden = true;
    viewModeButton.setAttribute('aria-expanded', 'false');
  }
  if (persist) localStorage.setItem('launcherSidebarOpen', expanded ? '1' : '0');
}

function applyTopbarCollapsedState(collapsed, { persist = true } = {}) {
  const isCollapsed = Boolean(collapsed);
  appbar.classList.toggle('is-topbar-collapsed', isCollapsed);
  document.body.classList.toggle('is-topbar-collapsed', isCollapsed);
  topbarCollapseButton.textContent = isCollapsed ? '⌄' : '⌃';
  topbarCollapseButton.setAttribute('aria-expanded', String(!isCollapsed));
  topbarCollapseButton.setAttribute('aria-label', isCollapsed ? 'Mostrar barra superior' : 'Ocultar barra superior');
  topbarCollapseButton.title = isCollapsed ? 'Mostrar barra superior' : 'Ocultar barra superior';
  if (isCollapsed && appbar.classList.contains('is-sidebar-open')) applySidebarState(false);
  if (!viewModeMenu.hidden) requestAnimationFrame(positionViewModeMenu);
  if (persist) localStorage.setItem('launcherTopbarCollapsed', isCollapsed ? '1' : '0');
}

function defaultAccount(index) {
  return { label: `Cuenta ${index + 1}`, username: '', password: '' };
}

function normalizeAccounts(value) {
  const rows = Array.isArray(value) ? value : [];
  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
    ...defaultAccount(index),
    ...rows[index]
  }));
}

function defaultFarmConfig() {
  return { enabled: true, target: null };
}

function normalizePokemonType(value) {
  const type = normalizeSearchText(typeof value === 'object' ? value?.name || value?.type || value?.slug : value)
    .replace(/[^a-z]/g, '');
  const aliases = { fogo: 'fire', agua: 'water', electrico: 'electric', eletrico: 'electric', planta: 'grass', hielo: 'ice', gelo: 'ice', lucha: 'fighting', lutador: 'fighting', veneno: 'poison', tierra: 'ground', terra: 'ground', volador: 'flying', voador: 'flying', psiquico: 'psychic', inseto: 'bug', roca: 'rock', pedra: 'rock', fantasma: 'ghost', dragao: 'dragon', siniestro: 'dark', sombrio: 'dark', acero: 'steel', aco: 'steel', hada: 'fairy', fada: 'fairy' };
  const normalized = aliases[type] || type;
  return POKEMON_TYPES.includes(normalized) ? normalized : '';
}

function normalizePokemonTypes(value) {
  const rows = Array.isArray(value) ? value : [value];
  return [...new Set(rows.flatMap((entry) => {
    if (entry && typeof entry === 'object' && Array.isArray(entry.types)) return entry.types;
    return [entry];
  }).map(normalizePokemonType).filter(Boolean))].slice(0, 2);
}

function normalizeFarmStats(value) {
  const source = value && typeof value === 'object' ? value : {};
  const read = (...keys) => {
    const number = keys.map((key) => Number(source[key])).find((candidate) => Number.isFinite(candidate) && candidate > 0);
    return number || null;
  };
  return {
    hp: read('hp', 'maxHp', 'health'), attack: read('attack', 'atk'), defense: read('defense', 'def'),
    specialAttack: read('specialAttack', 'spAttack', 'spAtk'), specialDefense: read('specialDefense', 'spDefense', 'spDef'),
    speed: read('speed')
  };
}

function farmCollectionRows(value) {
  if (value == null || value === false) return [];
  if (Array.isArray(value)) return value.flatMap(farmCollectionRows);
  if (typeof value !== 'object') return [value];
  if (value.name || value.itemName || value.moveName || value.skillName || value.label || value.item || value.move) return [value];
  return Object.entries(value).flatMap(([key, entry]) => {
    if (entry == null || entry === false) return [];
    if (entry === true) return [{ name: key, _sourceKey: key, active: true }];
    if (typeof entry === 'object') return [{ ...entry, _sourceKey: key }];
    return [{ name: String(entry), _sourceKey: key }];
  });
}

function farmTypeFromLabel(value) {
  return String(value || '').split(/[^\p{L}]+/u).map(normalizePokemonType).find(Boolean) || '';
}

function normalizeFarmMoves(value) {
  const rows = farmCollectionRows(value);
  return rows.map((move) => {
    if (!move) return null;
    if (typeof move === 'string') return { name: move.slice(0, 60), type: '', power: 0, cooldownMs: 0, category: '', isTm: false };
    const name = String(move.name || move.moveName || move.skillName || move.move?.name || '').trim();
    if (!name) return null;
    const tmText = `${name} ${move.category || ''} ${move.source || ''} ${move._sourceKey || ''}`;
    const isTm = Boolean(move.tm || move.isTm || move.fromTm || move.source === 'tm' || /(?:^|\W)(?:tm|mt)(?:\W|$)/i.test(tmText));
    const isAoe = Boolean(move.aoe || move.isAoe || move.area || move.areaOfEffect || /(?:^|\W)(?:aoe|area\s+of\s+effect)(?:\W|$)/i.test(tmText));
    const type = normalizePokemonType(move.type || move.moveType || move.move?.type) || farmTypeFromLabel(name);
    return {
      name: name.slice(0, 60),
      type,
      power: Math.max(0, Number(move.power || move.damage || move.basePower || move.move?.power) || 0),
      cooldownMs: Math.max(0, Number(move.cooldownMs || move.cooldown || move.cd || move.move?.cooldownMs) || 0),
      category: String(move.category || move.damageClass || '').slice(0, 20),
      isTm,
      isAoe: isTm && isAoe,
      isTypeTm: isTm && !isAoe && Boolean(type),
      equipped: move.equipped !== false && move.active !== false && move.enabled !== false
    };
  }).filter(Boolean).slice(0, 12);
}

function normalizeFarmItems(value) {
  const rows = farmCollectionRows(value);
  return rows.map((item) => {
    if (!item) return null;
    const source = typeof item === 'object' ? item : { name: item };
    const sourceKey = String(source._sourceKey || '');
    const name = String(source.name || source.itemName || source.label || source.item?.name || sourceKey || '').trim();
    if (!name) return null;
    const tmText = `${name} ${source.category || ''} ${source.kind || ''} ${sourceKey}`;
    const type = normalizePokemonType(source.type || source.element) || farmTypeFromLabel(name);
    const isTm = Boolean(source.tm || source.isTm || /(?:^|\W)(?:tm|mt)(?:\W|$)/i.test(tmText) ||
      /type\s+(?:tm|mt)\s+disk/i.test(tmText) || /^(?:aoe|elemental|type|aoe(?:tm|mt)|elemental(?:tm|mt)|type(?:tm|mt))$/i.test(sourceKey));
    const isAoe = Boolean(source.aoe || source.isAoe || source.area || source.areaOfEffect || /(?:^|\W)(?:aoe|area\s+of\s+effect)(?:\W|$)/i.test(tmText));
    return {
      id: String(source.id || source.itemId || source.item?.id || '').slice(0, 80),
      name: name.slice(0, 80),
      category: String(source.category || source.kind || source.item?.category || '').toLowerCase().slice(0, 30),
      type,
      isTm,
      isAoe: isTm && isAoe,
      isTypeTm: isTm && !isAoe && Boolean(type),
      equipped: source.equipped !== false && source.active !== false && source.enabled !== false
    };
  }).filter(Boolean).slice(0, 12);
}

function farmLeaderTmSummary(leader) {
  if (!leader) return { all: [], aoe: [], type: [] };
  const candidates = [
    ...(leader.items || []).filter((item) => item.isTm && item.equipped !== false),
    ...(leader.moves || []).filter((move) => move.isTm && move.equipped !== false)
  ];
  const unique = new Map();
  for (const entry of candidates) {
    const kind = entry.isAoe ? 'aoe' : entry.isTypeTm || entry.type ? 'type' : 'tm';
    const key = `${kind}|${entry.type || ''}|${normalizeSearchText(entry.name)}`;
    if (!unique.has(key)) unique.set(key, { name: entry.name || (kind === 'aoe' ? 'MT AoE' : 'MT'), type: entry.type || '', kind });
  }
  const all = [...unique.values()];
  return { all, aoe: all.filter((entry) => entry.kind === 'aoe'), type: all.filter((entry) => entry.kind === 'type') };
}

function farmTierMultiplier(value, label = '') {
  const numeric = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const tier = normalizeSearchText(label);
  if (/divin/.test(tier)) return 4;
  if (/ancient|ancestral|antigu/.test(tier)) return 3;
  if (/mythic|mitic/.test(tier)) return 2;
  if (/legend/.test(tier)) return 1.8;
  if (/epic/.test(tier)) return 1.6;
  if (/rare|rara|raro/.test(tier)) return 1.4;
  if (/uncommon|incomun/.test(tier)) return 1.2;
  return 1;
}

function normalizeFarmTarget(value) {
  if (!value || typeof value !== 'object') return null;
  const nestedPokemon = value.pokemon && typeof value.pokemon === 'object' ? value.pokemon : {};
  const nestedCreature = value.creature && typeof value.creature === 'object' ? value.creature : {};
  const nestedTeleport = value.teleport && typeof value.teleport === 'object' ? value.teleport : {};
  const name = String(
    value.pokemonName || value.pokemon_name || value.huntName || value.hunt_name ||
    value.creatureName || value.creature_name || value.speciesName || value.species_name ||
    nestedPokemon.name || nestedCreature.name || value.name || value.label || value.title || ''
  ).trim();
  const rawSlug = String(
    value.teleportSlug || value.teleport_slug || value.fieldTeleportSlug || value.field_teleport_slug ||
    value.huntSlug || value.hunt_slug || value.targetSlug || value.target_slug ||
    value.destinationSlug || value.destination_slug || nestedTeleport.slug || nestedTeleport.targetSlug || value.slug || ''
  ).trim();
  const slug = rawSlug || normalizeSearchText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug || !name) return null;
  const numberFrom = (...values) => {
    for (const candidate of values) {
      const match = String(candidate ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
      const number = Number(match?.[0]);
      if (Number.isFinite(number)) return number;
    }
    return 0;
  };
  const positiveStat = (...values) => {
    const number = values.map(Number).find((candidate) => Number.isFinite(candidate) && candidate > 0);
    return number || null;
  };
  const sourceStats = value.baseStats || value.stats || {};
  const nestedMap = value.map && typeof value.map === 'object' ? value.map : {};
  const nestedWorld = value.world && typeof value.world === 'object' ? value.world : {};
  const nestedArea = value.area && typeof value.area === 'object' ? value.area : {};
  const nestedRegion = value.region && typeof value.region === 'object' ? value.region : {};
  const explicitMap = String(
    value.mapSlug || value.map_slug || nestedMap.slug || nestedMap.id || value.mapName || nestedMap.name ||
    value.worldSlug || value.world_slug || nestedWorld.slug || value.worldName || nestedWorld.name ||
    (typeof value.map === 'string' ? value.map : '') || (typeof value.world === 'string' ? value.world : '') ||
    value.continentSlug || value.continent || value._map || ''
  ).trim().toLowerCase();
  const explicitArea = String(
    value.areaSlug || value.area_slug || nestedArea.slug || nestedArea.id || value.areaName || nestedArea.name ||
    value.regionSlug || value.region_slug || nestedRegion.slug || value.regionName || nestedRegion.name ||
    (typeof value.area === 'string' ? value.area : '') || (typeof value.region === 'string' ? value.region : '') ||
    value.zoneSlug || value.zoneName || value.zone || value._area || explicitMap || 'kanto'
  ).trim().toLowerCase();
  const gameMapKeys = new Set(['kanto', 'outland', 'orre', 'johto', 'nightmare']);
  const map = explicitMap || (gameMapKeys.has(explicitArea) ? explicitArea : '');
  const area = explicitArea || map || 'kanto';
  return {
    slug: slug.slice(0, 80),
    name: name.slice(0, 80),
    area: area.slice(0, 80),
    map: map.slice(0, 80),
    mapName: String(value.mapName || nestedMap.name || value.worldName || nestedWorld.name || value.continent || value._mapName || map).trim().slice(0, 80),
    areaName: String(value.areaName || nestedArea.name || value.regionName || nestedRegion.name || value.zoneName || value._areaName || area).trim().slice(0, 80),
    level: Math.max(0, numberFrom(value.huntLevel, value.hunt_level, value.requiredLevel, value.required_level, value.minLevel, value.min_level, value.level)),
    looktype: Math.max(0, Number(value.looktype) || 0),
    speciesId: Math.max(0, Number(value.speciesId || value.pokeId || value.dexId) || 0),
    spriteSpeciesId: Math.max(0, Number(value.spriteSpeciesId || value.baseSpeciesId || value.speciesId || value.pokeId || value.dexId) || 0),
    sprite: String(value.sprite || value.image || value.imageUrl || '').slice(0, 500),
    types: normalizePokemonTypes(value.types || [value.type1, value.type2, value.primaryType, value.secondaryType]),
    tier: String(value.tier || '').slice(0, 20),
    rarity: String(value.rarity || value.quality || '').slice(0, 24),
    isShiny: value.isShiny === true || value.shiny === true || value.variant?.shiny === true ||
      /(?:^|[\s_-])shiny(?:$|[\s_-])/i.test(`${value.variant || ''} ${value.form || ''} ${name} ${slug}`),
    hasShinyForm: value.hasShinyForm === true || value.shinyAvailable === true || value.hasShiny === true ||
      value.isShiny === true || value.shiny === true || value.variant?.shiny === true,
    basePower: Math.max(0, Number(value.basePower || value.power || value.strength) || 0),
    moves: normalizeFarmMoves(value.moves || value.attacks || value.skills),
    baseStats: {
      hp: positiveStat(sourceStats.hp, value.baseHp),
      attack: positiveStat(sourceStats.attack, sourceStats.atk, value.baseAtk, value.baseAttack),
      defense: positiveStat(sourceStats.defense, sourceStats.def, value.baseDef, value.baseDefense),
      specialAttack: positiveStat(sourceStats.specialAttack, sourceStats.spAttack, sourceStats.spAtk, value.baseSpAtk),
      specialDefense: positiveStat(sourceStats.specialDefense, sourceStats.spDefense, sourceStats.spDef, value.baseSpDef),
      speed: positiveStat(sourceStats.speed, value.baseSpeed)
    }
  };
}

function normalizeFarmLeader(value) {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim().slice(0, 80);
  if (!name) return null;
  const level = Math.max(0, Number(value.level) || 0);
  const maxHp = Math.max(0, Number(value.maxHp) || 0);
  const stats = normalizeFarmStats(value.stats);
  const quality = String(value.quality || value.qualityName || value.rarity || value.tier || '').slice(0, 30);
  const qualityValue = farmTierMultiplier(value.qualityValue || value.qualityMultiplier, quality);
  const computedStrength = Object.values(stats).every((stat) => Number(stat) > 0)
    ? Math.round(Object.values(stats).reduce((sum, stat) => sum + (Number(stat) || 0), 0) * qualityValue)
    : 0;
  const directStrength = Math.max(0, Number(value.strength) || computedStrength || 0);
  return {
    name,
    level,
    strength: directStrength,
    strengthSource: String(value.strengthSource || (computedStrength && directStrength === computedStrength ? 'Calculado' : directStrength ? 'Servidor' : '')).slice(0, 24),
    hp: Math.min(maxHp || Number.MAX_SAFE_INTEGER, Math.max(0, Number(value.hp) || 0)),
    maxHp,
    types: normalizePokemonTypes(value.types),
    sprite: String(value.sprite || '').slice(0, 1_500_000),
    looktype: Math.max(0, Number(value.looktype) || 0),
    speciesId: Math.max(0, Number(value.speciesId) || 0),
    id: String(value.id || value.pokemonId || '').slice(0, 100),
    stats,
    moves: normalizeFarmMoves([value.moves, value.attacks, value.skills, value.equippedMoves, value.activeMoves]),
    items: normalizeFarmItems([
      value.heldItems, value.equippedItems, value.equipment, value.activeItems,
      value.activeTms, value.activeTMs, value.equippedTms, value.equippedTMs,
      value.tms, value.tmSlots,
      value.aoeTm != null ? (typeof value.aoeTm === 'object' ? { ...value.aoeTm, _sourceKey: 'aoeTm', aoe: true } : { name: value.aoeTm === true ? 'AoE TM' : String(value.aoeTm), _sourceKey: 'aoeTm', aoe: true }) : null,
      value.aoeTM != null ? (typeof value.aoeTM === 'object' ? { ...value.aoeTM, _sourceKey: 'aoeTM', aoe: true } : { name: value.aoeTM === true ? 'AoE TM' : String(value.aoeTM), _sourceKey: 'aoeTM', aoe: true }) : null,
      value.elementalTm != null ? (typeof value.elementalTm === 'object' ? { ...value.elementalTm, _sourceKey: 'elementalTm' } : { name: String(value.elementalTm), _sourceKey: 'elementalTm' }) : null,
      value.typeTm != null ? (typeof value.typeTm === 'object' ? { ...value.typeTm, _sourceKey: 'typeTm' } : { name: String(value.typeTm), _sourceKey: 'typeTm' }) : null,
      value.aoeTmActive === true ? { name: 'AoE TM', category: 'tm', aoe: true } : null,
      value.items
    ]),
    ivTotal: Math.max(0, Number(value.ivTotal || value.totalIv || value.iv) || 0),
    ivMax: Math.max(1, Number(value.ivMax) || 192),
    quality,
    qualityValue,
    isShiny: value.isShiny === true || value.shiny === true,
    slot: Math.max(0, Number(value.slot) || 0),
    team: value.team === true,
    finalStage: value.finalStage === true,
    xp: Math.max(0, Number(value.xp) || 0),
    maxXp: Math.max(0, Number(value.maxXp) || 0),
    dataSource: String(value.dataSource || '').slice(0, 40),
    updatedAt: Math.max(0, Number(value.updatedAt) || 0)
  };
}

const TYPE_EFFECTIVENESS = {
  normal: { rock: .5, ghost: 0, steel: .5 },
  fire: { fire: .5, water: .5, grass: 2, ice: 2, bug: 2, rock: .5, dragon: .5, steel: 2 },
  water: { fire: 2, water: .5, grass: .5, ground: 2, rock: 2, dragon: .5 },
  electric: { water: 2, electric: .5, grass: .5, ground: 0, flying: 2, dragon: .5 },
  grass: { fire: .5, water: 2, grass: .5, poison: .5, ground: 2, flying: .5, bug: .5, rock: 2, dragon: .5, steel: .5 },
  ice: { fire: .5, water: .5, grass: 2, ice: .5, ground: 2, flying: 2, dragon: 2, steel: .5 },
  fighting: { normal: 2, ice: 2, poison: .5, flying: .5, psychic: .5, bug: .5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: .5 },
  poison: { grass: 2, poison: .5, ground: .5, rock: .5, ghost: .5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: .5, poison: 2, flying: 0, bug: .5, rock: 2, steel: 2 },
  flying: { electric: .5, grass: 2, fighting: 2, bug: 2, rock: .5, steel: .5 },
  psychic: { fighting: 2, poison: 2, psychic: .5, dark: 0, steel: .5 },
  bug: { fire: .5, grass: 2, fighting: .5, poison: .5, flying: .5, psychic: 2, ghost: .5, dark: 2, steel: .5, fairy: .5 },
  rock: { fire: 2, ice: 2, fighting: .5, ground: .5, flying: 2, bug: 2, steel: .5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: .5 },
  dragon: { dragon: 2, steel: .5, fairy: 0 },
  dark: { fighting: .5, psychic: 2, ghost: 2, dark: .5, fairy: .5 },
  steel: { fire: .5, water: .5, electric: .5, ice: 2, rock: 2, steel: .5, fairy: 2 },
  fairy: { fire: .5, fighting: 2, poison: .5, dragon: 2, dark: 2, steel: .5 }
};

function pokemonTypeLabel(type) {
  return {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta', ice: 'Hielo',
    fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
    rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero', fairy: 'Hada'
  }[type] || String(type || 'Desconocido');
}

function typeMultiplier(attackingType, defendingTypes) {
  return normalizePokemonTypes(defendingTypes).reduce((multiplier, defendingType) =>
    multiplier * (TYPE_EFFECTIVENESS[attackingType]?.[defendingType] ?? 1), 1);
}

function formatMultiplier(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function evaluateFarmTarget(target, context) {
  const leader = context?.leader;
  const trainerAccessible = !context?.ready || context.level === null || target.level <= context.level;
  const leaderTypes = normalizePokemonTypes(leader?.types);
  const targetTypes = normalizePokemonTypes(target.types);
  const usableMoves = (leader?.moves || []).filter((move) => move.type && move.power > 0);
  const attackOptions = usableMoves.length
    ? usableMoves.map((move) => ({
      type: move.type,
      multiplier: typeMultiplier(move.type, targetTypes),
      potential: move.power * typeMultiplier(move.type, targetTypes) * (leaderTypes.includes(move.type) ? 1.2 : 1) *
        (move.cooldownMs ? Math.min(2, 15_000 / move.cooldownMs) : 1),
      name: move.name
    }))
    : leaderTypes.map((type) => ({ type, multiplier: typeMultiplier(type, targetTypes), potential: typeMultiplier(type, targetTypes) * 100, name: '' }));
  const bestAttack = attackOptions.sort((left, right) => right.potential - left.potential)[0] ||
    { type: '', multiplier: 1, potential: 100, name: '' };
  const offensive = bestAttack.multiplier;
  const offensiveType = bestAttack.type;
  const targetMoves = (target.moves || []).filter((move) => move.type && move.power > 0);
  const incomingOptions = targetMoves.length
    ? targetMoves.map((move) => ({ type: move.type, multiplier: typeMultiplier(move.type, leaderTypes),
      potential: move.power * typeMultiplier(move.type, leaderTypes) * (targetTypes.includes(move.type) ? 1.2 : 1) *
        (move.cooldownMs ? Math.min(2, 15_000 / move.cooldownMs) : 1) }))
    : targetTypes.map((type) => ({ type, multiplier: typeMultiplier(type, leaderTypes), potential: typeMultiplier(type, leaderTypes) * 100 }));
  const bestIncoming = incomingOptions.sort((left, right) => right.potential - left.potential)[0] || { type: '', multiplier: 1 };
  const incoming = bestIncoming.multiplier;
  const incomingType = bestIncoming.type;

  const leaderLevel = Number(leader?.level) || Number(context?.level) || 0;
  const levelDifference = leaderLevel ? leaderLevel - target.level : 0;
  const leaderStatTotal = Object.values(leader?.stats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const targetStatTotal = Object.values(target.baseStats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const qualityMultiplier = farmTierMultiplier(leader?.qualityValue, leader?.quality);
  const effectiveLeaderPower = Number(leader?.strength) || (leaderStatTotal ? leaderStatTotal * qualityMultiplier : Math.max(1, leaderLevel) * 6);
  const effectiveTargetPower = (Number(target.basePower) || targetStatTotal || 600) * Math.max(1, Number(target.level) / 100);
  const powerRatio = effectiveLeaderPower / Math.max(1, effectiveTargetPower);
  const levelComponent = leaderLevel ? Math.max(0, Math.min(100, 55 + (levelDifference / Math.max(1, leaderLevel)) * 100)) : 50;
  const typeComponent = Math.max(0, Math.min(100, 50 + Math.log2(Math.max(.25, offensive)) * 22 - Math.log2(Math.max(.25, incoming)) * 18));
  const powerComponent = Math.max(0, Math.min(100, 50 + Math.log2(Math.max(.125, powerRatio)) * 28));
  const moveComponent = usableMoves.length
    ? Math.max(0, Math.min(100, 35 + Math.log2(Math.max(.25, bestAttack.potential / 100)) * 22 + usableMoves.length * 3))
    : 42;
  let score = levelComponent * .28 + typeComponent * .34 + powerComponent * .25 + moveComponent * .13;
  if (!trainerAccessible) score -= 70;
  const orreCheck = validateOrreTarget(target, context, { offensive, incoming, score });
  if (!orreCheck.ok) score -= orreCheck.penalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const reasons = [];
  if (leaderTypes.length && targetTypes.length) {
    if (offensive > 1) reasons.push(`${bestAttack.name || pokemonTypeLabel(offensiveType)} golpea ×${formatMultiplier(offensive)}`);
    else if (offensive < 1) reasons.push(`${pokemonTypeLabel(offensiveType)} tiene poca eficacia`);
    if (incoming <= .5) reasons.push(`${leader.name} resiste ${pokemonTypeLabel(incomingType)}`);
    else if (incoming >= 2) reasons.push(`${pokemonTypeLabel(incomingType)} amenaza a ${leader.name}`);
  }
  if (leaderLevel) {
    if (levelDifference >= 0) reasons.push(`${Math.abs(levelDifference)} niveles de margen`);
    else reasons.push(`supera a tu líder por ${Math.abs(levelDifference)} niveles`);
  }
  if (!targetTypes.length) reasons.push('compatibilidad de tipo no disponible');
  if (!trainerAccessible) reasons.unshift(`requiere nivel de entrenador ${target.level}`);
  if (isOrreFarmTarget(target) && !orreCheck.ok) reasons.unshift(orreCheck.message);

  let label = 'Combate exigente';
  if (!trainerAccessible) label = 'Bloqueado';
  else if (score >= 75) label = 'Muy recomendado';
  else if (score >= 58) label = 'Buen combate';
  else if (score >= 40) label = 'Combate posible';
  return {
    score,
    label,
    reasons: reasons.slice(0, 3),
    offensive,
    incoming,
    accessible: trainerAccessible,
    recommended: trainerAccessible && score >= 58,
    safe: trainerAccessible && orreCheck.ok && incoming < 2 && (!leaderLevel || levelDifference >= 0),
    hasAdvantage: offensive > 1 && incoming < 2
    , components: { level: Math.round(levelComponent), type: Math.round(typeComponent), power: Math.round(powerComponent), moves: Math.round(moveComponent) }
    , orreCheck
  };
}

function isOrreFarmTarget(target) {
  return normalizeSearchText([target?.map, target?.mapName, target?.area, target?.areaName].filter(Boolean).join(' '))
    .split(/[^a-z0-9]+/)
    .includes('orre');
}

function validateOrreTarget(target, context, seed = {}) {
  if (!isOrreFarmTarget(target)) return { ok: true, required: 0, equipped: 0, penalty: 0, message: '' };
  const leader = context?.leader;
  if (!leader) return { ok: false, required: 1, equipped: 0, penalty: 35, message: 'Orre: no se detectó el Pokémon equipado' };
  const targetTypes = normalizePokemonTypes(target.types);
  const tmItems = (leader.items || []).filter((item) => item.isTm);
  const tmMoves = (leader.moves || []).filter((move) => move.isTm);
  const effectiveTms = [
    ...tmItems.map((item) => ({ name: item.name, type: item.type })),
    ...tmMoves.map((move) => ({ name: move.name, type: move.type }))
  ].filter((entry) => !entry.type || typeMultiplier(entry.type, targetTypes) > 1);
  const leaderTypes = normalizePokemonTypes(leader.types);
  const incoming = Number(seed.incoming) || Math.max(1, ...targetTypes.map((type) => typeMultiplier(type, leaderTypes)));
  const attackTypes = (leader.moves || []).map((move) => move.type).filter(Boolean);
  const offensive = Number(seed.offensive) || Math.max(1, ...(attackTypes.length ? attackTypes : leaderTypes)
    .map((type) => typeMultiplier(type, targetTypes)));
  const underLevel = (Number(leader.level) || 0) < Number(target.level || 0);
  const targetStatTotal = Object.values(target.baseStats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const targetPower = (Number(target.basePower) || targetStatTotal || 600) * Math.max(1, Number(target.level) / 100);
  const leaderPower = Number(leader.strength) || Object.values(leader.stats || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const underPowered = leaderPower > 0 && leaderPower < targetPower;
  const required = incoming >= 2 || offensive <= 1 || underLevel || underPowered || (Number(seed.score) > 0 && Number(seed.score) < 55) ? 2 : 1;
  const equipped = effectiveTms.length;
  if (equipped >= required) {
    return { ok: true, required, equipped, penalty: 0, message: `Orre listo: ${equipped} MT efectiva${equipped === 1 ? '' : 's'}` };
  }
  const missing = required - equipped;
  return {
    ok: false, required, equipped, penalty: missing === 2 ? 32 : 18,
    message: `Orre requiere ${required} MT efectiva${required === 1 ? '' : 's'} (${equipped} detectada${equipped === 1 ? '' : 's'})`
  };
}

function normalizeFarmConfigs(value) {
  const rows = Array.isArray(value) ? value : [];
  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => ({
    ...defaultFarmConfig(),
    enabled: rows[index]?.enabled !== false,
    target: normalizeFarmTarget(rows[index]?.target)
  }));
}

function loadFarmConfigs() {
  try {
    return normalizeFarmConfigs(JSON.parse(localStorage.getItem(FARM_CONFIG_KEY) || 'null'));
  } catch {
    return normalizeFarmConfigs([]);
  }
}

function saveFarmConfigs() {
  localStorage.setItem(FARM_CONFIG_KEY, JSON.stringify(farmConfigs));
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizePokemonName(value) {
  return normalizeSearchText(value)
    .replace(/^(?:brave|furious|ancient|taekwondo)\s+/, '')
    .replace(/\b(?:shiny|first|primeira|primera)\b.*$/i, '')
    .replace(/\s*[♀♂]\s*/g, ' ')
    .replace(/\s+\d+\s*(?:ª|º|st|nd|rd|th).*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isInvalidNotificationPokemonName(value) {
  return new Set([
    'you', 'your', 'voce', 'tu', 'usted', 'ustedes', 'player', 'jogador', 'jugador',
    'pokemon', 'shiny', 'it', 'he', 'she', 'ele', 'ela'
  ]).has(normalizePokemonName(value));
}

function createLocalId(prefix) {
  try { return `${prefix}-${crypto.randomUUID()}`; } catch {}
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeCaptureGoal(value) {
  if (!value || typeof value !== 'object') return null;
  const kind = value.kind === 'drop' ? 'drop' : 'capture';
  const pokemon = String(value.pokemon || value.drop || '').trim().slice(0, 80);
  if (!pokemon) return null;
  const tier = ['any', 'weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine'].includes(value.tier) ? value.tier : 'any';
  const tiers = Array.isArray(value.tiers)
    ? [...new Set(value.tiers.filter((candidate) => ['weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine'].includes(candidate)))]
    : [];
  const account = Number.isInteger(Number(value.account)) ? Math.max(-1, Math.min(ACCOUNT_COUNT - 1, Number(value.account))) : -1;
  return {
    id: String(value.id || createLocalId('goal')).slice(0, 90),
    kind,
    pokemon,
    account,
    minIv: Math.max(0, Math.min(192, Number(value.minIv) || 0)),
    minLevel: 1,
    tier,
    tiers,
    minQuantity: Math.max(1, Math.min(999999, Number(value.minQuantity) || 1))
  };
}

function loadCaptureGoals() {
  try {
    const rows = JSON.parse(localStorage.getItem(CAPTURE_GOAL_KEY) || '[]');
    return Array.isArray(rows) ? rows.map(normalizeCaptureGoal).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveCaptureGoals() {
  localStorage.setItem(CAPTURE_GOAL_KEY, JSON.stringify(captureGoals));
}

function loadNotificationCounters() {
  const historyCounts = {
    goal: launcherNotifications.filter((notification) => notification.types.includes('goal')).length,
    shiny: launcherNotifications.filter((notification) => notification.types.includes('shiny')).length,
    legendary: launcherNotifications.filter((notification) => notification.types.includes('legendary')).length
  };
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIFICATION_COUNTER_KEY) || '{}');
    return {
      goal: Math.max(historyCounts.goal, Number(stored.goal) || 0),
      shiny: Math.max(historyCounts.shiny, Number(stored.shiny) || 0),
      legendary: Math.max(historyCounts.legendary, Number(stored.legendary) || 0)
    };
  } catch {
    return historyCounts;
  }
}

function saveNotificationCounters() {
  try { localStorage.setItem(NOTIFICATION_COUNTER_KEY, JSON.stringify(notificationCounters)); } catch {}
}

function countNotification(notification) {
  ['goal', 'shiny', 'legendary'].forEach((type) => {
    if (notification.types.includes(type)) notificationCounters[type] += 1;
  });
  saveNotificationCounters();
}

function normalizeLauncherNotification(value) {
  if (!value || typeof value !== 'object') return null;
  const capture = value.capture && typeof value.capture === 'object' ? value.capture : {};
  const name = String(capture.name || '').trim().slice(0, 80);
  if (!name) return null;
  let types = Array.isArray(value.types)
    ? value.types.filter((type) => ['goal', 'shiny', 'legendary', 'drop'].includes(type)).slice(0, 4)
    : [];
  const hasExplicitEventKind = ['capture', 'defeat', 'drop'].includes(value.eventKind) ||
    ['capture', 'defeat', 'drop'].includes(capture.eventKind);
  const eventKind = value.eventKind === 'drop' || capture.eventKind === 'drop'
    ? 'drop' : value.eventKind === 'defeat' || capture.eventKind === 'defeat' ? 'defeat' : 'capture';
  if (eventKind === 'defeat' && isInvalidNotificationPokemonName(name)) return null;
  const isLegendarySpecies = capture.isLegendarySpecies === true || isLegendaryPokemonName(name);
  const qualityValue = captureQualityNumber(capture);
  const normalizedCaptureTier = captureTierFromQuality(qualityValue) || captureTier(capture.tier);
  const isLegendaryQuality = qualityValue !== null
    ? qualityValue >= 1.7 && qualityValue <= 1.99
    : normalizedCaptureTier === 'legendary';
  if (eventKind === 'capture') {
    types = types.filter((type) => type !== 'shiny');
    if (hasExplicitEventKind && isLegendaryQuality && !types.includes('legendary')) {
      types.push('legendary');
    }
    if (types.includes('legendary') && (
      (!hasExplicitEventKind && !isLegendarySpecies) ||
      (hasExplicitEventKind && !isLegendaryQuality)
    )) {
      types = types.filter((type) => type !== 'legendary');
    }
  }
  if (!types.length) return null;
  return {
    id: String(value.id || createLocalId('notification')).slice(0, 100),
    createdAt: Number(value.createdAt) || Date.now(),
    read: value.read === true,
    accountIndex: Math.max(0, Math.min(ACCOUNT_COUNT - 1, Number(value.accountIndex) || 0)),
    eventKind,
    types,
    goalNames: Array.isArray(value.goalNames) ? value.goalNames.map((nameValue) => String(nameValue).slice(0, 80)).slice(0, 6) : [],
    capture: {
      name,
      level: String(capture.level || '').slice(0, 30),
      tier: String(capture.tier || '').slice(0, 30),
      qualityValue,
      qualityMultiplier: String(capture.qualityMultiplier || '').slice(0, 20),
      iv: capture.iv !== null && capture.iv !== '' && Number.isFinite(Number(capture.iv)) ? Number(capture.iv) : null,
      ivMax: capture.ivMax !== null && capture.ivMax !== '' && Number.isFinite(Number(capture.ivMax)) ? Number(capture.ivMax) : null,
      ball: String(capture.ball || '').slice(0, 60),
      when: String(capture.when || '').slice(0, 60),
      sprite: String(capture.sprite || '').slice(0, 500),
      speciesId: Math.max(0, Number(capture.speciesId) || 0),
      spriteSpeciesId: Math.max(0, Number(capture.spriteSpeciesId || (Number(capture.speciesId) < 10_000 ? capture.speciesId : 0)) || 0),
      looktype: Math.max(0, Number(capture.looktype) || 0),
      types: normalizePokemonTypes(capture.types),
      xp: Math.max(0, Number(capture.xp) || 0),
      quantity: Math.max(0, Number(capture.quantity) || 0),
      sourceKey: String(capture.sourceKey || value.sourceKey || '').slice(0, 180),
      isShiny: capture.isShiny === true,
      isLegendarySpecies,
      isLegendaryQuality,
      eventKind
    }
  };
}

function loadLauncherNotifications() {
  try {
    const rows = JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]');
    return Array.isArray(rows) ? rows.map(normalizeLauncherNotification).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveLauncherNotifications() {
  try {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(launcherNotifications.slice(0, 500)));
  } catch (error) {
    console.warn('El historial visual de notificaciones superó el espacio local; los contadores y monitores continúan activos.', error);
  }
}

function captureTier(value) {
  const text = normalizeSearchText(value);
  if (/divine|divin/.test(text)) return 'divine';
  if (/ancient|ancestral|antigu/.test(text)) return 'ancient';
  if (/mythic|mitic|m[ií]tico/.test(text)) return 'mythic';
  if (/legend|lendario|lendário/.test(text)) return 'legendary';
  if (/epic|epic|[eé]pico/.test(text)) return 'epic';
  if (/uncommon|incomum|incomun|incom[uú]n/.test(text)) return 'uncommon';
  if (/rare|rara|raro/.test(text)) return 'rare';
  if (/common|comum|comun|com[uú]n/.test(text)) return 'common';
  if (/weak|debil|d[eé]bil|fraco/.test(text)) return 'weak';
  return '';
}

function captureTierFromQuality(value) {
  const quality = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(quality) || quality <= 0) return '';
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

function tierRank(tier) {
  return { any: 0, weak: 1, common: 2, uncommon: 3, rare: 4, epic: 5, legendary: 6, mythic: 7, ancient: 8, divine: 9 }[tier] || 0;
}

function tierLabel(tier) {
  return {
    any: 'Cualquier tier',
    weak: 'Débil',
    common: 'Común',
    uncommon: 'Incomún',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Legendario',
    mythic: 'Mítico',
    ancient: 'Ancestral',
    divine: 'Divino'
  }[tier] || 'Sin tier';
}

function pokemonReferenceKeys(name) {
  const exact = normalizeSearchText(name).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const base = exact.replace(
    /^(?:shiny|brave|furious|ancient|taekwondo|tribal|war|enigmatic|charged|magnetic|evil|freezing|psy|heavy|milch|roll|hard|brute|enraged|dark|trickmaster|banshee)\s+/,
    ''
  );
  return [...new Set([exact, base].filter(Boolean))];
}

function pokemonReferenceForName(name) {
  for (const key of pokemonReferenceKeys(name)) {
    const record = pokemonReferenceIndex.get(key);
    if (record) return record;
  }
  return null;
}

function isLegendaryPokemonName(name) {
  const normalizedName = normalizePokemonName(name);
  return LEGENDARY_POKEMON.has(normalizedName) || [...LEGENDARY_POKEMON].some((legendaryName) =>
    normalizedName.startsWith(`${legendaryName} `) || normalizedName.endsWith(` ${legendaryName}`)
  );
}

function notificationLevel(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) && number > 0 ? `Lv.${Math.floor(number)}` : text.slice(0, 30);
}

function refreshNotificationAccountOptions() {
  const selected = goalAccountSelect.value || '-1';
  goalAccountSelect.replaceChildren();
  const anyOption = document.createElement('option');
  anyOption.value = '-1';
  anyOption.textContent = 'Cualquier cuenta';
  goalAccountSelect.appendChild(anyOption);
  accounts.forEach((account, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = account.label || `Cuenta ${index + 1}`;
    goalAccountSelect.appendChild(option);
  });
  goalAccountSelect.value = [...goalAccountSelect.options].some((option) => option.value === selected) ? selected : '-1';
}

function refreshGoalPokemonSuggestions() {
  renderGoalCatalog();
}

async function loadGoalDropCatalog() {
  if (goalDropCatalog.length) return goalDropCatalog;
  if (goalDropCatalogPromise) return goalDropCatalogPromise;
  goalDropCatalogPromise = (async () => {
    const panel = panels.find((candidate) => candidate.webview.getURL().startsWith(GAME_ORIGIN));
    if (!panel) return [];
    const rows = await withTimeout(panel.webview.executeJavaScript(`fetch('/game/items.json', { cache: 'force-cache' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('items')))
      .then((payload) => Array.isArray(payload) ? payload : (payload.items || []))`), PANEL_READ_TIMEOUT_MS, 'El catálogo de drops no respondió.');
    goalDropCatalog = rows.map((item) => ({
      id: Number(item.id ?? item.itemId) || 0,
      name: String(item.name || '').trim(),
      icon: String(item.iconUrl || item.icon || item.image || '').trim()
    })).filter((item) => item.name).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return goalDropCatalog;
  })().catch(() => []).finally(() => { goalDropCatalogPromise = null; });
  return goalDropCatalogPromise;
}

function renderGoalCatalog() {
  const isDrop = goalKindSelect.value === 'drop';
  const search = normalizeSearchText(goalCatalogSearch.value);
  const records = isDrop
    ? goalDropCatalog
    : [...new Map([...pokemonReferenceIndex.values(), ...farmCatalog]
      .filter((pokemon) => pokemon.name).map((pokemon) => [pokemon.name, pokemon])).values()]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const visible = records.filter((record) => !search || normalizeSearchText(record.name).includes(search)).slice(0, 500);
  goalCatalogList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'goal-catalog-empty';
    empty.textContent = isDrop && !goalDropCatalog.length ? 'Abre una cuenta del juego para cargar los drops.' : 'No hay coincidencias en el catálogo.';
    goalCatalogList.appendChild(empty);
    return;
  }
  visible.forEach((record) => {
    const label = document.createElement('label');
    label.className = 'goal-catalog-row';
    label.classList.toggle('is-selected', goalSelectedTargets.has(record.name));
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = goalSelectedTargets.has(record.name);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) goalSelectedTargets.add(record.name);
      else goalSelectedTargets.delete(record.name);
      goalPokemonInput.value = [...goalSelectedTargets].join(', ');
      label.classList.toggle('is-selected', checkbox.checked);
      goalCatalogHelp.textContent = `${goalSelectedTargets.size} seleccionado${goalSelectedTargets.size === 1 ? '' : 's'}`;
    });
    if (isDrop && record.icon) {
      const image = document.createElement('img');
      try { image.src = new URL(record.icon, GAME_ORIGIN).href; } catch { image.src = record.icon; }
      image.alt = '';
      label.append(checkbox, image, document.createTextNode(record.name));
    } else {
      label.append(checkbox, document.createTextNode(record.name));
    }
    goalCatalogList.appendChild(label);
  });
}

function initializeGoalTierButtons() {
  const tiers = ['weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine'];
  tiers.forEach((tier) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'goal-tier-button';
    button.dataset.tier = tier;
    button.textContent = tierLabel(tier);
    button.addEventListener('click', () => {
      if (goalSelectedTiers.has(tier)) goalSelectedTiers.delete(tier);
      else goalSelectedTiers.add(tier);
      button.classList.toggle('is-active', goalSelectedTiers.has(tier));
      goalTierSelect.value = goalSelectedTiers.size ? [...goalSelectedTiers].join(',') : 'any';
    });
    goalTierButtons.appendChild(button);
  });
}

function renderCaptureGoals() {
  captureGoalList.replaceChildren();
  captureGoalCount.textContent = String(captureGoals.length);
  if (!captureGoals.length) {
    const empty = document.createElement('p');
    empty.className = 'capture-goal-empty';
    empty.textContent = 'Todavía no configuraste metas de capturas o drops.';
    captureGoalList.appendChild(empty);
    return;
  }
  captureGoals.forEach((goal) => {
    const chip = document.createElement('div');
    chip.className = 'capture-goal-chip';
    const accountLabel = goal.account < 0 ? 'Todas' : (accounts[goal.account]?.label || `Cuenta ${goal.account + 1}`);
    const conditions = [accountLabel];
    if (goal.kind === 'drop') conditions.push(`Drop × ${goal.minQuantity}`);
    if (goal.kind !== 'drop' && goal.minIv > 0) conditions.push(`IV ≥ ${goal.minIv}`);
    if (goal.kind !== 'drop' && goal.minLevel > 0) conditions.push(`Nv. ≥ ${goal.minLevel}`);
    if (goal.kind !== 'drop' && goal.tiers.length) conditions.push(goal.tiers.map(tierLabel).join('/'));
    else if (goal.kind !== 'drop' && goal.tier !== 'any') conditions.push(`${tierLabel(goal.tier)}+`);
    const copy = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = goal.pokemon;
    copy.append(name, document.createTextNode(` · ${conditions.join(' · ')}`));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'capture-goal-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Eliminar meta de ${goal.pokemon}`);
    remove.addEventListener('click', () => {
      captureGoals = captureGoals.filter((candidate) => candidate.id !== goal.id);
      saveCaptureGoals();
      renderCaptureGoals();
    });
    chip.append(copy, remove);
    captureGoalList.appendChild(chip);
  });
}

function renderGoalManager() {
  const query = normalizeSearchText(goalManagerSearch.value);
  const kind = goalManagerKindFilter.value;
  const rows = captureGoals.filter((goal) => (kind === 'all' || goal.kind === kind) &&
    (!query || normalizeSearchText(`${goal.pokemon} ${accounts[goal.account]?.label || ''}`).includes(query)));
  goalManagerList.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'goal-manager-empty';
    empty.textContent = captureGoals.length ? 'No hay metas que coincidan.' : 'Todavía no hay metas creadas.';
    goalManagerList.appendChild(empty);
    return;
  }
  rows.forEach((goal) => {
    const row = document.createElement('article');
    row.className = `goal-manager-row is-${goal.kind}`;
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = goal.pokemon;
    const meta = document.createElement('small');
    const conditions = [goal.account < 0 ? 'Todas las cuentas' : accounts[goal.account]?.label || `Cuenta ${goal.account + 1}`];
    if (goal.kind === 'drop') conditions.push(`Cantidad ≥ ${goal.minQuantity}`);
    else {
      conditions.push(`IV ≥ ${goal.minIv}`);
      if (goal.tiers.length) conditions.push(goal.tiers.map(tierLabel).join(', '));
    }
    meta.textContent = `${goal.kind === 'drop' ? 'Drop' : 'Pokémon'} · ${conditions.join(' · ')}`;
    copy.append(title, meta);
    const actions = document.createElement('div');
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = 'Editar';
    edit.addEventListener('click', () => openGoalBuilder(goal));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'is-danger'; remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      if (!window.confirm(`¿Eliminar la meta de ${goal.pokemon}?`)) return;
      captureGoals = captureGoals.filter((candidate) => candidate.id !== goal.id);
      saveCaptureGoals(); renderCaptureGoals(); renderGoalManager();
    });
    actions.append(edit, remove);
    row.append(copy, actions);
    goalManagerList.appendChild(row);
  });
}

function openGoalManager() {
  closeNotificationPanel();
  goalManagerBackdrop.hidden = false;
  renderGoalManager();
  requestAnimationFrame(() => goalManagerSearch.focus());
}

function closeGoalManager() {
  goalManagerBackdrop.hidden = true;
}

function notificationTitle(notification) {
  if (notification.eventKind === 'drop') {
    return `📦 Meta de drop: ${notification.capture.name} × ${notification.capture.quantity}`;
  }
  if (notification.eventKind === 'defeat') {
    return `✨ Shiny derrotado: ${notification.capture.name}`;
  }
  const labels = [];
  if (notification.types.includes('legendary')) {
    labels.push(notification.capture.isLegendarySpecies ? 'Legendario capturado' : 'Captura legendaria');
  }
  if (notification.types.includes('goal')) labels.push('Meta cumplida');
  return `${notification.types.includes('legendary') ? '🏆' : '🎯'} ${labels.join(' + ')}: ${notification.capture.name}`;
}

function showLauncherEventAlert(notification) {
  if (!notificationToastLayer || !notification) return;
  const alertType = notification.eventKind === 'drop' ? 'drop' : notification.eventKind === 'defeat'
    ? 'shiny' : notification.types.includes('legendary') ? 'legendary' : 'goal';
  const toast = document.createElement('article');
  toast.className = `notification-toast is-${alertType}`;
  const icon = document.createElement('span');
  icon.textContent = { drop: '📦', shiny: '✨', legendary: '🏆', goal: '🎯' }[alertType];
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = notificationTitle(notification);
  const detail = document.createElement('small');
  detail.textContent = accounts[notification.accountIndex]?.label || `Cuenta ${notification.accountIndex + 1}`;
  copy.append(title, detail);
  toast.append(icon, copy);
  notificationToastLayer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 250);
  }, 5200);
  try {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextType();
    const patterns = {
      goal: [[523, .09], [659, .12]], drop: [[440, .07], [660, .07], [880, .12]],
      shiny: [[880, .08], [1175, .08], [1568, .16]], legendary: [[392, .12], [523, .12], [784, .22]]
    };
    let cursor = context.currentTime;
    patterns[alertType].forEach(([frequency, duration]) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = alertType === 'legendary' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.0001, cursor);
      gain.gain.exponentialRampToValueAtTime(.08, cursor + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, cursor + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(cursor); oscillator.stop(cursor + duration);
      cursor += duration + .035;
    });
    window.setTimeout(() => context.close().catch(() => {}), 1200);
  } catch {}
}

function renderNotifications() {
  const unread = launcherNotifications.filter((notification) => !notification.read).length;
  notificationBadge.textContent = unread > 99 ? '99+' : String(unread);
  notificationBadge.hidden = unread === 0;
  notificationButton.classList.toggle('has-unread', unread > 0);
  const query = normalizeSearchText(notificationPokemonFilter.value);
  const typeFilter = notificationTypeFilter.value;
  const ivMinimum = Number(notificationIvFilter.value) || 0;
  const tierFilter = notificationTierFilter.value;
  const fromTime = notificationDateFromFilter.value ? new Date(`${notificationDateFromFilter.value}T00:00:00`).getTime() : 0;
  const toTime = notificationDateToFilter.value ? new Date(`${notificationDateToFilter.value}T23:59:59.999`).getTime() : Number.MAX_SAFE_INTEGER;
  const filteredNotifications = launcherNotifications.filter((notification) => {
    if (query && !normalizeSearchText(`${notification.capture.name} ${notification.goalNames.join(' ')}`).includes(query)) return false;
    if (typeFilter === 'goal' && !(notification.types.includes('goal') && notification.eventKind === 'capture')) return false;
    if (typeFilter === 'drop' && notification.eventKind !== 'drop') return false;
    if (typeFilter === 'shiny' && !notification.types.includes('shiny')) return false;
    if (typeFilter === 'legendary' && !notification.types.includes('legendary')) return false;
    if (ivMinimum > 0 && (notification.capture.iv === null || notification.capture.iv < ivMinimum)) return false;
    const notificationTier = captureTierFromQuality(notification.capture.qualityValue) || captureTier(notification.capture.tier);
    if (tierFilter !== 'all' && notificationTier !== tierFilter) return false;
    return notification.createdAt >= fromTime && notification.createdAt <= toTime;
  });
  notificationHistoryCount.textContent = filteredNotifications.length === launcherNotifications.length
    ? String(launcherNotifications.length) : `${filteredNotifications.length}/${launcherNotifications.length}`;
  goalNotificationCount.textContent = String(notificationCounters.goal);
  shinyNotificationCount.textContent = String(notificationCounters.shiny);
  legendaryNotificationCount.textContent = String(notificationCounters.legendary);
  notificationList.replaceChildren();
  if (!filteredNotifications.length) {
    const empty = document.createElement('p');
    empty.className = 'notification-empty';
    empty.textContent = launcherNotifications.length ? 'Ninguna notificación coincide con los filtros.' : 'Aquí aparecerán los shiny derrotados, las capturas legendarias y las metas de capturas o drops.';
    notificationList.appendChild(empty);
    return;
  }
  filteredNotifications.slice(0, 500).forEach((notification) => {
    const item = document.createElement('article');
    item.className = 'notification-item';
    item.classList.toggle('is-unread', !notification.read);
    notification.types.forEach((type) => item.classList.add(`is-${type}`));

    const sprite = document.createElement('div');
    sprite.className = 'notification-item-sprite';
    if (/^https:\/\/poke\.idleworld\.online\//i.test(notification.capture.sprite)) {
      const image = document.createElement('img');
      image.src = notification.capture.sprite;
      image.alt = notification.capture.name;
      sprite.appendChild(image);
    } else {
      const reference = pokemonReferenceForName(notification.capture.name);
      const pokemonSprite = createFarmSprite({
        name: notification.capture.name,
        looktype: notification.capture.looktype || reference?.looktype || 0,
        spriteSpeciesId: notification.capture.spriteSpeciesId || reference?.spriteSpeciesId || reference?.speciesId || 0
      }, 34);
      if (!pokemonSprite.classList.contains('is-empty')) {
        pokemonSprite.classList.add('notification-pokemon-sprite');
        sprite.appendChild(pokemonSprite);
      } else {
        sprite.textContent = notification.eventKind === 'drop' ? '📦' : notification.types.includes('shiny') ? '✨' : notification.types.includes('legendary') ? '◆' : '🎯';
      }
    }

    const body = document.createElement('div');
    body.className = 'notification-item-body';
    const heading = document.createElement('div');
    heading.className = 'notification-item-title';
    const title = document.createElement('b');
    title.textContent = notificationTitle(notification);
    const time = document.createElement('time');
    time.dateTime = new Date(notification.createdAt).toISOString();
    time.textContent = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(notification.createdAt);
    heading.append(title, time);

    const details = document.createElement('div');
    details.className = 'notification-item-meta';
    const account = document.createElement('span');
    account.className = 'notification-item-account';
    account.textContent = accounts[notification.accountIndex]?.label || `Cuenta ${notification.accountIndex + 1}`;
    const data = [];
    if (notification.eventKind === 'defeat') data.push('Derrotado');
    if (notification.eventKind === 'drop') data.push(`Obtenido × ${notification.capture.quantity}`);
    if (notification.capture.level) data.push(notification.capture.level);
    const pokemonTypes = notification.capture.types.length
      ? notification.capture.types
      : pokemonReferenceForName(notification.capture.name)?.types || [];
    if (pokemonTypes.length) data.push(pokemonTypes.map(pokemonTypeLabel).join('/'));
    if (notification.capture.tier) data.push(tierLabel(notification.capture.tier));
    if (notification.capture.iv !== null) data.push(`IV ${notification.capture.iv}${notification.capture.ivMax ? `/${notification.capture.ivMax}` : ''}`);
    if (notification.capture.ball) data.push(notification.capture.ball);
    if (notification.capture.xp) data.push(`+${notification.capture.xp.toLocaleString('es')} XP`);
    details.append(account, document.createTextNode(data.length ? ` · ${data.join(' · ')}` : ''));

    const tags = document.createElement('div');
    tags.className = 'notification-tags';
    notification.types.forEach((type) => {
      const tag = document.createElement('span');
      tag.className = `notification-tag is-${type}`;
      tag.textContent = type === 'legendary'
        ? notification.capture.isLegendarySpecies ? 'Legendario capturado' : 'Captura legendaria'
        : { goal: 'Meta', shiny: 'Shiny derrotado', drop: 'Drop obtenido' }[type];
      tags.appendChild(tag);
    });
    body.append(heading, details, tags);
    item.append(sprite, body);
    notificationList.appendChild(item);
  });
}

function openNotificationPanel() {
  notificationPanel.hidden = false;
  notificationButton.setAttribute('aria-expanded', 'true');
  if (!farmCatalog.length) {
    loadFarmCatalogFromGame().then(() => {
      refreshGoalPokemonSuggestions();
      renderNotifications();
    }).catch(() => {});
  }
  loadGoalDropCatalog().then(() => {
    if (goalKindSelect.value === 'drop') renderGoalCatalog();
  }).catch(() => {});
  renderGoalCatalog();
  if (launcherNotifications.some((notification) => !notification.read)) {
    launcherNotifications.forEach((notification) => { notification.read = true; });
    saveLauncherNotifications();
  }
  renderNotifications();
}

function closeNotificationPanel() {
  notificationPanel.hidden = true;
  notificationButton.setAttribute('aria-expanded', 'false');
}

function matchCaptureGoal(capture, accountIndex, goal) {
  if (goal.kind !== 'capture') return false;
  if (goal.account >= 0 && goal.account !== accountIndex) return false;
  if (normalizePokemonName(goal.pokemon) !== normalizePokemonName(capture.name)) return false;
  if (goal.minIv > 0 && (!Number.isFinite(capture.iv) || capture.iv < goal.minIv)) return false;
  const levelMatch = String(capture.level || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  const level = levelMatch ? Number(levelMatch[0]) : NaN;
  if (goal.minLevel > 0 && (!Number.isFinite(level) || level < goal.minLevel)) return false;
  if (goal.tiers.length && !goal.tiers.includes(capture.tier)) return false;
  if (!goal.tiers.length && tierRank(capture.tier) < tierRank(goal.tier)) return false;
  return true;
}

function isDuplicateNotificationEvent(eventKind, accountIndex, capture, types = []) {
  const now = Date.now();
  if (capture.sourceKey) {
    const sourceKey = `${accountIndex}:${eventKind}:${capture.sourceKey}`;
    if (notificationSourceKeys.has(sourceKey)) return true;
    notificationSourceKeys.add(sourceKey);
    return false;
  }
  for (const [key, timestamp] of recentNotificationSignatures) {
    if (now - timestamp > 120_000) recentNotificationSignatures.delete(key);
  }
  const signature = [accountIndex, eventKind, normalizeSearchText(capture.name), capture.iv ?? '', capture.quantity ?? '', ...types.slice().sort()].join('|');
  const previous = recentNotificationSignatures.get(signature) || 0;
  recentNotificationSignatures.set(signature, now);
  return now - previous < 60_000;
}

function addCaptureNotification(captureValue, accountIndex) {
  const captureNumber = Number(String(captureValue.captureNumber || '').replace(/\D/g, '')) || 0;
  const capture = {
    name: String(captureValue.name || '').trim().slice(0, 80),
    level: notificationLevel(captureValue.level),
    tier: captureTierFromQuality(captureQualityNumber(captureValue)) || captureTier(captureValue.meta || captureValue.tier || captureValue.quality),
    qualityValue: captureQualityNumber(captureValue),
    qualityMultiplier: String(captureValue.qualityMultiplier || '').slice(0, 20),
    iv: captureValue.iv !== null && captureValue.iv !== '' && Number.isFinite(Number(captureValue.iv)) ? Number(captureValue.iv) : null,
    ivMax: captureValue.ivMax !== null && captureValue.ivMax !== '' && Number.isFinite(Number(captureValue.ivMax)) ? Number(captureValue.ivMax) : null,
    ball: String(captureValue.ball || '').trim().slice(0, 60),
    when: String(captureValue.when || '').trim().slice(0, 60),
    sprite: String(captureValue.sprite || '').trim().slice(0, 500),
    speciesId: Math.max(0, Number(captureValue.speciesId) || 0),
    spriteSpeciesId: Math.max(0, Number(captureValue.spriteSpeciesId ||
      (Number(captureValue.speciesId) < 10_000 ? captureValue.speciesId : 0)) || 0),
    looktype: Math.max(0, Number(captureValue.looktype) || 0),
    types: normalizePokemonTypes(captureValue.types),
    isShiny: captureValue.isShiny === true,
    captureNumber,
    sourceKey: String(captureValue.id || (captureNumber ? `capture-${captureNumber}-${captureValue.when || ''}` : '') || captureValue.key || '').trim().slice(0, 180),
    eventKind: 'capture'
  };
  if (!capture.name) return;
  const normalizedName = normalizePokemonName(capture.name);
  const isLegendarySpecies = captureValue.isLegendarySpecies === true || isLegendaryPokemonName(capture.name);
  const isLegendaryQuality = capture.qualityValue !== null
    ? capture.qualityValue >= 1.7 && capture.qualityValue <= 1.99
    : capture.tier === 'legendary';
  capture.isLegendarySpecies = isLegendarySpecies;
  capture.isLegendaryQuality = isLegendaryQuality;
  const matchingGoals = captureGoals.filter((goal) => matchCaptureGoal(capture, accountIndex, goal));
  const types = [];
  if (matchingGoals.length) types.push('goal');
  if (isLegendaryQuality) types.push('legendary');
  if (!types.length) return;
  const duplicate = isDuplicateNotificationEvent('capture', accountIndex, capture, types);
  if (duplicate) return;

  const notification = normalizeLauncherNotification({
    id: createLocalId('notification'),
    createdAt: Date.now(),
    read: false,
    accountIndex,
    eventKind: 'capture',
    types,
    goalNames: matchingGoals.map((goal) => goal.pokemon),
    capture
  });
  if (!notification) return;
  launcherNotifications.unshift(notification);
  countNotification(notification);
  persistLauncherNotifications([notification]).catch(() => {});
  saveLauncherNotifications();
  renderNotifications();
  showLauncherEventAlert(notification);
  const accountLabel = accounts[notification.accountIndex]?.label || `Cuenta ${notification.accountIndex + 1}`;
  try {
    if (typeof Notification === 'function' && Notification.permission !== 'denied') {
      const desktopNotification = new Notification(notificationTitle(notification), {
        body: `${accountLabel}${capture.level ? ` · ${capture.level}` : ''}${capture.iv !== null ? ` · IV ${capture.iv}${capture.ivMax ? `/${capture.ivMax}` : ''}` : ''}`,
        icon: /^https:\/\/poke\.idleworld\.online\//i.test(capture.sprite) ? capture.sprite : undefined,
        silent: false
      });
      desktopNotification.onclick = () => {
        window.focus();
        openNotificationPanel();
      };
    }
  } catch {}
}

function addDefeatNotification(defeatValue, accountIndex) {
  if (defeatValue?.isShiny !== true && defeatValue?.shiny !== true) return;
  if (isInvalidNotificationPokemonName(defeatValue?.name)) return;
  const reference = pokemonReferenceForName(defeatValue.name);
  const capture = {
    name: String(defeatValue.name || '').trim().slice(0, 80),
    level: notificationLevel(defeatValue.level || reference?.level),
    tier: captureTier(defeatValue.tier || reference?.rarity || reference?.tier),
    iv: null,
    ivMax: null,
    ball: '',
    when: String(defeatValue.when || '').trim().slice(0, 60),
    sprite: String(defeatValue.sprite || '').trim().slice(0, 500),
    speciesId: Math.max(0, Number(defeatValue.speciesId || reference?.speciesId) || 0),
    spriteSpeciesId: Math.max(0, Number(defeatValue.spriteSpeciesId ||
      (Number(defeatValue.speciesId) < 10_000 ? defeatValue.speciesId : 0) ||
      reference?.spriteSpeciesId || reference?.speciesId) || 0),
    looktype: Math.max(0, Number(defeatValue.looktype || reference?.looktype) || 0),
    types: normalizePokemonTypes(defeatValue.types?.length ? defeatValue.types : reference?.types),
    xp: Math.max(0, Number(defeatValue.xp || defeatValue.xpGained) || 0),
    isShiny: true,
    sourceKey: String(defeatValue.key || defeatValue.killId || defeatValue.id || '').trim().slice(0, 180),
    eventKind: 'defeat'
  };
  if (!capture.name) return;
  const normalizedName = normalizePokemonName(capture.name);
  const duplicate = isDuplicateNotificationEvent('defeat', accountIndex, capture, ['shiny']);
  if (duplicate) return;
  const notification = normalizeLauncherNotification({
    id: createLocalId('notification'),
    createdAt: Date.now(),
    read: false,
    accountIndex,
    eventKind: 'defeat',
    types: ['shiny'],
    capture
  });
  if (!notification) return;
  launcherNotifications.unshift(notification);
  countNotification(notification);
  persistLauncherNotifications([notification]).catch(() => {});
  saveLauncherNotifications();
  renderNotifications();
  showLauncherEventAlert(notification);
  const accountLabel = accounts[notification.accountIndex]?.label || `Cuenta ${notification.accountIndex + 1}`;
  try {
    if (typeof Notification === 'function' && Notification.permission !== 'denied') {
      const desktopNotification = new Notification(notificationTitle(notification), {
        body: `${accountLabel}${capture.level ? ` · ${capture.level}` : ''}${capture.xp ? ` · +${capture.xp.toLocaleString('es')} XP` : ''}`,
        silent: false
      });
      desktopNotification.onclick = () => {
        window.focus();
        openNotificationPanel();
      };
    }
  } catch {}
}

function matchDropGoal(drop, accountIndex, goal) {
  if (goal.kind !== 'drop') return false;
  if (goal.account >= 0 && goal.account !== accountIndex) return false;
  const normalizeDropName = (value) => normalizeSearchText(value)
    .replace(/\b(?:x|qty|quantity|cantidad|quantidade)\s*\d+\b/g, ' ')
    .replace(/[×x]\s*\d+\s*$/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const goalName = normalizeDropName(goal.pokemon);
  const dropName = normalizeDropName(drop.name);
  if (!goalName || !dropName || goalName !== dropName) return false;
  return Number(drop.quantity) >= goal.minQuantity;
}

function addDropNotification(dropValue, accountIndex) {
  const quantityText = String(dropValue?.quantity ?? dropValue?.qty ?? dropValue?.amount ?? dropValue?.count ?? '').replace(',', '.');
  const drop = {
    name: String(dropValue?.name || dropValue?.itemName || dropValue?.item?.name || '').replace(/\s*[×x]\s*\d+\s*$/i, '').trim().slice(0, 80),
    quantity: Math.max(0, Number(quantityText.match(/\d+(?:\.\d+)?/)?.[0]) || 0),
    sourceKey: String(dropValue?.key || `${dropValue?.killId || ''}:${dropValue?.itemId || dropValue?.item?.id || dropValue?.name || ''}`).trim().slice(0, 180)
  };
  if (!drop.name || !drop.quantity) return;
  const matchingGoals = captureGoals.filter((goal) => matchDropGoal(drop, accountIndex, goal));
  if (!matchingGoals.length) return;
  const normalizedName = normalizeSearchText(drop.name);
  const duplicate = isDuplicateNotificationEvent('drop', accountIndex, drop, ['goal', 'drop']);
  if (duplicate) return;
  const notification = normalizeLauncherNotification({
    id: createLocalId('notification'),
    createdAt: Date.now(),
    read: false,
    accountIndex,
    eventKind: 'drop',
    types: ['goal', 'drop'],
    goalNames: matchingGoals.map((goal) => goal.pokemon),
    capture: {
      name: drop.name,
      quantity: drop.quantity,
      sourceKey: drop.sourceKey,
      eventKind: 'drop'
    }
  });
  if (!notification) return;
  launcherNotifications.unshift(notification);
  countNotification(notification);
  persistLauncherNotifications([notification]).catch(() => {});
  saveLauncherNotifications();
  renderNotifications();
  showLauncherEventAlert(notification);
  const accountLabel = accounts[notification.accountIndex]?.label || `Cuenta ${notification.accountIndex + 1}`;
  try {
    if (typeof Notification === 'function' && Notification.permission !== 'denied') {
      const desktopNotification = new Notification(notificationTitle(notification), {
        body: `${accountLabel} · ${drop.name} × ${drop.quantity}`,
        silent: true
      });
      desktopNotification.onclick = () => { window.focus(); openNotificationPanel(); };
    }
  } catch {}
}

function captureSnapshotScript() {
  return `(async () => {
    const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const normalized = (value) => clean(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    const waitFor = async (getter, timeout = 3500) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const value = getter();
        if (value) return value;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return null;
    };
    const hideMonitorSource = (element, source) => {
      if (!element) return;
      element.dataset.pgLauncherMonitorSource = source;
      element.style.setProperty('position', 'fixed', 'important');
      element.style.setProperty('left', '-12000px', 'important');
      element.style.setProperty('top', '0px', 'important');
      element.style.setProperty('opacity', '0', 'important');
      element.style.setProperty('visibility', 'hidden', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
    };
    let captureLog = document.querySelector('.clog-window');
    if (!captureLog) {
      const descriptor = (button) => normalized([
        button.dataset?.pgLabel, button.getAttribute('aria-label'), button.getAttribute('title'),
        button.textContent, button.querySelector('img')?.alt, button.querySelector('img')?.src
      ].filter(Boolean).join(' '));
      let analyzer = document.querySelector('[data-pg-hunt-dialog="true"], .ha-window, [data-pg-launcher-hunt-source="true"], [data-pg-launcher-monitor-source="hunt"]');
      if (!analyzer) {
        const trigger = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button, button, [role="button"]')]
          .find((button) => /hunt analyzer|hunt_analyzer|analisador de hunt/.test(descriptor(button)));
        trigger?.click();
        analyzer = await waitFor(() => document.querySelector('[data-pg-hunt-dialog="true"], .ha-window'));
      }
      if (analyzer) {
        hideMonitorSource(analyzer, 'hunt');
        const logButton = analyzer.querySelector('.ha-clog-btn, .pg-hunt-log-button') ||
          [...analyzer.querySelectorAll('button, a, [role="button"]')].find((button) =>
            /capture log|log de capturas|historial de capturas/i.test(normalized(button.textContent))
          );
        logButton?.click();
        captureLog = await waitFor(() => document.querySelector('.clog-window'));
        if (captureLog) hideMonitorSource(captureLog, 'capture');
      }
    } else if (captureLog.dataset.pgLauncherMonitorSource) {
      hideMonitorSource(captureLog, 'capture');
    }
    const cleanName = (value) => clean(value)
      .replace(/\\b(?:shiny|first|primeira|primera)\\b.*$/i, '')
      .replace(/\\s*[♀♂]\\s*/g, ' ')
      .replace(/\\s+\\d+\\s*(?:ª|º|st|nd|rd|th).*$/i, '')
      .trim();
    const totalText = clean(captureLog?.querySelector('.clog-totals')?.textContent);
    const parsedTotal = Number(totalText.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, ''));
    const total = Number.isFinite(parsedTotal) && parsedTotal > 0
      ? parsedTotal
      : document.querySelectorAll('.clog-row').length;
    const reactRowId = (row) => {
      const fiberKey = Object.keys(row).find((key) => key.startsWith('__reactFiber$'));
      let fiber = fiberKey ? row[fiberKey] : null;
      for (let depth = 0; fiber && depth < 20; depth += 1, fiber = fiber.return) {
        const key = clean(fiber.key);
        if (key) return key.replace(/^p-/, '');
      }
      return '';
    };
    const parseRow = (row, index) => {
      const rawName = row.querySelector('.clog-name')?.childNodes?.[0]?.textContent ||
        row.querySelector('.clog-name')?.textContent || row.querySelector('.clog-ico img')?.alt;
      const name = cleanName(rawName);
      const level = clean(row.querySelector('.clog-lvl')?.textContent);
      const meta = clean(row.querySelector('.clog-meta')?.textContent);
      const ball = clean(row.querySelector('.clog-ball')?.textContent);
      const when = clean(row.querySelector('.clog-when')?.textContent);
      const ivMatch = meta.match(/iv\\s*(\\d+)(?:\\s*\\/\\s*(\\d+))?/i);
      const text = clean(row.textContent);
      const ordinalText = clean(row.querySelector('.clog-num, [class*="ordinal"], [class*="capture-number"]')?.textContent);
      const ordinal = Number(ordinalText.match(/\d+/)?.[0]) || null;
      const rowId = clean(row.dataset.captureId || row.dataset.id || reactRowId(row));
      return {
        key: clean(rowId || [name, level, meta, ball, when].join('|')),
        id: rowId,
        name,
        level,
        meta,
        ball,
        when,
        captureNumber: ordinal ? String(ordinal) : '',
        captureNumberTrusted: Boolean(ordinal),
        iv: ivMatch ? Number(ivMatch[1]) : null,
        ivMax: ivMatch?.[2] ? Number(ivMatch[2]) : null,
        isShiny: row.classList.contains('shiny') || /(^|\\s)shiny(\\s|$)/i.test(text),
        sprite: row.querySelector('.clog-ico img')?.currentSrc || row.querySelector('.clog-ico img')?.src || ''
      };
    };
    const allDomRowElements = [...document.querySelectorAll('.clog-row')];
    const monitoredElements = allDomRowElements.length <= 400
      ? allDomRowElements
      : [...allDomRowElements.slice(0, 200), ...allDomRowElements.slice(-200)];
    const domRows = monitoredElements.map((row) => parseRow(row, allDomRowElements.indexOf(row)))
      .filter((capture) => capture.name && capture.key);
    const queuedRows = Array.isArray(window.__pokeGridCaptureQueue) ? window.__pokeGridCaptureQueue.splice(0, 150) : [];
    const defeatedRows = Array.isArray(window.__pokeGridDefeatQueue) ? window.__pokeGridDefeatQueue.splice(0, 100) : [];
    const dropRows = Array.isArray(window.__pokeGridDropQueue) ? window.__pokeGridDropQueue.splice(0, 150) : [];
    return {
      paused: false,
      total,
      rows: domRows,
      queuedRows,
      defeatedRows,
      dropRows
    };
  })()`;
}

function captureLogPanelSnapshotScript() {
  const readCaptureLogPanel = async () => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const normalized = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const waitFor = async (getter, timeout = 4000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const value = getter();
        if (value) return value;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return null;
    };
    const hideSource = (element, source) => {
      if (!element) return;
      element.dataset.pgLauncherMonitorSource = source;
      element.style.setProperty('position', 'fixed', 'important');
      element.style.setProperty('left', '-12000px', 'important');
      element.style.setProperty('top', '0px', 'important');
      element.style.setProperty('opacity', '0', 'important');
      element.style.setProperty('visibility', 'hidden', 'important');
      element.style.setProperty('pointer-events', 'none', 'important');
    };
    const describeControl = (button) => normalized([
      button?.dataset?.pgLabel,
      button?.getAttribute?.('aria-label'),
      button?.getAttribute?.('title'),
      button?.textContent,
      button?.querySelector?.('img')?.alt,
      button?.querySelector?.('img')?.src
    ].filter(Boolean).join(' '));
    const readTokens = () => {
      for (const storage of [sessionStorage, localStorage]) {
        try {
          const tokens = JSON.parse(storage.getItem('pokeweb:tokens') || 'null');
          if (tokens?.accessToken || tokens?.refreshToken) return tokens;
        } catch {}
      }
      return null;
    };
    const refreshAccess = async () => {
      const tokens = readTokens();
      if (!tokens?.refreshToken) return '';
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        });
        const refreshed = await response.json().catch(() => null);
        if (!response.ok || !refreshed?.accessToken) return '';
        try { sessionStorage.setItem('pokeweb:tokens', JSON.stringify(refreshed)); } catch {}
        try { localStorage.removeItem('pokeweb:tokens'); } catch {}
        return refreshed.accessToken;
      } catch { return ''; }
    };
    let captureLog = document.querySelector('.clog-window');
    if (!captureLog) {
      let analyzer = document.querySelector('.ha-window, [data-pg-hunt-dialog="true"], [data-pg-launcher-hunt-source="true"], [data-pg-launcher-monitor-source="hunt"]');
      if (!analyzer) {
        const trigger = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button, button, [role="button"]')]
          .find((button) => /hunt analyzer|hunt_analyzer|analisador de hunt/.test(describeControl(button)));
        trigger?.click();
        analyzer = await waitFor(() => document.querySelector('.ha-window, [data-pg-hunt-dialog="true"]'));
      }
      if (analyzer) {
        hideSource(analyzer, 'hunt');
        const logButton = analyzer.querySelector('.ha-clog-btn, .pg-hunt-log-button') ||
          [...analyzer.querySelectorAll('button, a, [role="button"]')].find((button) =>
            /capture log|log de capturas|historial de capturas/i.test(normalized(button.textContent))
          );
        logButton?.click();
        captureLog = await waitFor(() => document.querySelector('.clog-window'));
      }
    }
    if (!captureLog) return { ok: false, error: 'Capture Log todavía no está disponible en esta sesión.' };
    hideSource(captureLog, 'capture');

    let apiPayload = window.__pokeGridCaptureLogPayload;
    if (!apiPayload || Date.now() - Number(window.__pokeGridCaptureLogPayloadAt || 0) > 2500) {
      try {
        const request = (accessToken) => fetch('/api/game/capture-log?filter=all&limit=10000&offset=0', {
          credentials: 'include', cache: 'no-store',
          headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : {}
        });
        let response = await request(readTokens()?.accessToken);
        if (response.status === 401) {
          const refreshed = await refreshAccess();
          if (refreshed) response = await request(refreshed);
        }
        if (response.ok) {
          apiPayload = await response.json();
          window.__pokeGridCaptureLogPayload = apiPayload;
          window.__pokeGridCaptureLogPayloadAt = Date.now();
        }
      } catch {}
    }
    const validTypes = new Set([
      'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
      'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ]);
    const normalizeKey = (value) => normalized(value).replace(/[^a-z0-9]/g, '');
    const findCaptureRecords = (payload) => {
      const candidates = [];
      const seen = new WeakSet();
      const scoreRecord = (record) => {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return 0;
        const keys = new Set(Object.keys(record).map(normalizeKey));
        let score = 0;
        if ([...keys].some((key) => /^(pokemonname|pokename|speciesname|displayname|name)$/.test(key))) score += 5;
        if ([...keys].some((key) => /^(level|pokemonlevel|lvl)$/.test(key))) score += 2;
        if ([...keys].some((key) => /^(iv|ivs|ivtotal|totaliv|rarity|tier|quality)$/.test(key))) score += 3;
        if ([...keys].some((key) => /^(ball|ballname|pokeball|capturedat|createdat)$/.test(key))) score += 2;
        return score;
      };
      const visit = (value, depth = 0) => {
        if (!value || typeof value !== 'object' || depth > 7 || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
          const records = value.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));
          if (records.length) {
            const score = records.slice(0, 10).reduce((sum, record) => sum + scoreRecord(record), 0);
            if (score) candidates.push({ records, score: score / Math.min(records.length, 10) });
          }
          value.slice(0, 250).forEach((entry) => visit(entry, depth + 1));
          return;
        }
        Object.values(value).slice(0, 100).forEach((child) => visit(child, depth + 1));
      };
      visit(payload);
      return candidates.sort((left, right) => right.score - left.score || right.records.length - left.records.length)[0]?.records || [];
    };
    const reactStateValues = (element) => {
      if (!element) return [];
      const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber$'));
      let fiber = fiberKey ? element[fiberKey] : null;
      const values = [];
      const seenHooks = new WeakSet();
      for (let depth = 0; fiber && depth < 60; depth += 1, fiber = fiber.return) {
        let hook = fiber.memoizedState;
        for (let hookIndex = 0; hook && typeof hook === 'object' && hookIndex < 100 && !seenHooks.has(hook); hookIndex += 1) {
          seenHooks.add(hook);
          if (hook.memoizedState && typeof hook.memoizedState === 'object') values.push(hook.memoizedState);
          hook = hook.next;
        }
      }
      return values;
    };
    // Only the capture-log endpoint may supply rows that are not currently in the DOM.
    // Generic React hooks also contain the player's inventory and must never be treated as capture history.
    const apiRecords = findCaptureRecords(apiPayload);
    const numeric = (value) => {
      const normalizedNumber = String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, '');
      if (!normalizedNumber || normalizedNumber === '-' || normalizedNumber === '.') return null;
      const parsed = Number(normalizedNumber);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const statsFromObject = (value) => {
      const stats = value?.stats || value?.computedStats || value?.finalStats;
      if (!stats || typeof stats !== 'object') return null;
      const result = {
        hp: numeric(stats.hp ?? stats.health ?? stats.maxHp),
        attack: numeric(stats.attack ?? stats.atk),
        defense: numeric(stats.defense ?? stats.def),
        specialAttack: numeric(stats.specialAttack ?? stats.spAttack ?? stats.spAtk),
        specialDefense: numeric(stats.specialDefense ?? stats.spDefense ?? stats.spDef),
        speed: numeric(stats.speed)
      };
      return Object.values(result).every((statValue) => Number.isFinite(statValue) && statValue > 0) ? result : null;
    };
    const growthFromObject = (value) => {
      const growth = value?.growth || value?.ivs || value?.individualValues || value?.individualStats;
      if (!growth || typeof growth !== 'object') return null;
      const result = {
        hp: numeric(growth.hp ?? growth.health),
        attack: numeric(growth.attack ?? growth.atk),
        defense: numeric(growth.defense ?? growth.def),
        specialAttack: numeric(growth.specialAttack ?? growth.spAttack ?? growth.spAtk),
        specialDefense: numeric(growth.specialDefense ?? growth.spDefense ?? growth.spDef),
        speed: numeric(growth.speed)
      };
      return Object.values(result).every((statValue) => Number.isFinite(statValue) && statValue > 0) ? result : null;
    };
    const readLivePokemon = (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const stats = statsFromObject(value);
      const level = numeric(value.level ?? value.lvl);
      const qualityValue = numeric(value.quality ?? value.qualityMultiplier);
      const ivTotal = numeric(value.ivTotal ?? value.totalIv ?? value.iv);
      const id = clean(value.id ?? value.pokemonId ?? value.pokeId);
      const speciesId = numeric(value.speciesId ?? value.dex ?? value.pokedexId);
      const name = clean(value.name ?? value.pokemonName ?? value.speciesName ?? value.species?.name);
      if (!stats || !id || !name || !level || !qualityValue || !ivTotal) return null;
      const rawTypes = value.types || value.species?.types || [value.type1, value.type2];
      return {
        recordId: id,
        speciesId,
        recordName: name,
        level,
        ivTotal,
        qualityValue,
        quality: clean(value.qualityName ?? value.rarity ?? value.tier),
        qualityMultiplier: `x${qualityValue.toFixed(2)}`,
        types: (Array.isArray(rawTypes) ? rawTypes : [rawTypes])
          .map((type) => clean(type?.name ?? type))
          .filter(Boolean)
          .slice(0, 2),
        power: clean(value.power ?? value.strength ?? value.combatPower),
        sprite: clean(value.sprite ?? value.spriteUrl ?? value.image ?? value.imageUrl),
        looktype: numeric(value.looktype ?? value.lookType ?? value.outfitId),
        gender: clean(value.gender ?? value.sex),
        nature: clean(value.nature?.name ?? value.nature),
        growth: growthFromObject(value),
        stats,
        statsSource: 'server'
      };
    };
    const findServerPokemonRecords = () => {
      const fibers = new Set();
      const serverPokemonRoot = document.querySelector('.game-root');
      const priorityElements = serverPokemonRoot
        ? [serverPokemonRoot, ...serverPokemonRoot.querySelectorAll('*')]
        : [];
      [...priorityElements, ...document.querySelectorAll('*')].slice(0, 9000).forEach((element) => {
        const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber$') || key.startsWith('__reactContainer$'));
        let fiber = fiberKey ? element[fiberKey] : null;
        if (fiber?.current) fiber = fiber.current;
        for (let depth = 0; fiber && depth < 80; depth += 1, fiber = fiber.return) fibers.add(fiber);
      });
      const records = new Map();
      const seen = new WeakSet();
      let inspected = 0;
      const scan = (value, depth = 0) => {
        if (!value || typeof value !== 'object' || value instanceof Node || depth > 9 || seen.has(value) || inspected > 100000) return;
        seen.add(value);
        inspected += 1;
        const pokemon = readLivePokemon(value);
        if (pokemon) records.set(pokemon.recordId, pokemon);
        if (Array.isArray(value)) {
          value.slice(0, 1500).forEach((child) => scan(child, depth + 1));
          return;
        }
        Object.entries(value).slice(0, 80).forEach(([key, child]) => {
          if (/^(return|child|sibling|stateNode|alternate|_owner|queue|nextEffect)$/i.test(key)) return;
          scan(child, depth + 1);
        });
      };
      reactStateValues(serverPokemonRoot).forEach((value) => scan(value, 0));
      fibers.forEach((fiber) => {
        scan(fiber.memoizedState, 0);
        scan(fiber.memoizedProps, 0);
      });
      return [...records.values()];
    };
    const serverPokemonRecords = findServerPokemonRecords();
    if (serverPokemonRecords.length) {
      window.__pokeGridServerPokemonCache = serverPokemonRecords;
      window.__pokeGridServerPokemonCacheAt = Date.now();
    }
    const serverPokemonDetails = serverPokemonRecords.length
      ? serverPokemonRecords
      : (Array.isArray(window.__pokeGridServerPokemonCache) ? window.__pokeGridServerPokemonCache : []);
    const readApiDetail = (record) => {
      if (!record || typeof record !== 'object') return null;
      const entries = [];
      const arrays = [];
      const seen = new WeakSet();
      const scan = (value, path = '', depth = 0) => {
        if (value === null || value === undefined || depth > 8) return;
        if (['string', 'number', 'boolean'].includes(typeof value)) {
          entries.push({ path: normalized(path), key: normalizeKey(path.split('.').at(-1)), value });
          return;
        }
        if (typeof value !== 'object' || value instanceof Node || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
          const primitives = value.filter((item) => ['string', 'number'].includes(typeof item));
          if (primitives.length === value.length) arrays.push({ path: normalized(path), key: normalizeKey(path.split('.').at(-1)), value: primitives });
          value.slice(0, 40).forEach((item, index) => scan(item, `${path}.${index}`, depth + 1));
          return;
        }
        Object.entries(value).slice(0, 120).forEach(([key, child]) => scan(child, `${path}.${key}`, depth + 1));
      };
      scan(record, 'record');
      const pick = (aliases, predicate = null, prefer = null) => {
        const keys = new Set(aliases.map(normalizeKey));
        const matches = entries.filter((entry) => keys.has(entry.key) && (!predicate || predicate(entry.value, entry)));
        return (prefer ? matches.find((entry) => prefer.test(entry.path)) : null)?.value ?? matches[0]?.value ?? '';
      };
      const positiveNumber = (aliases, prefer = null) => {
        const raw = pick(aliases, (value) => Number(value) > 0, prefer);
        const value = Number(String(raw).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(value) && value > 0 ? value : null;
      };
      const growthStat = (aliases) => {
        const keys = new Set(aliases.map(normalizeKey));
        const match = entries.find((entry) =>
          keys.has(entry.key) && /(?:growth|ivs?|individual)/.test(entry.path) && Number(entry.value) > 0
        );
        return match ? numeric(match.value) : null;
      };
      const typeArrays = arrays
        .filter((entry) => /types?$/.test(entry.key))
        .flatMap((entry) => entry.value)
        .map((value) => normalizeKey(value))
        .filter((value) => validTypes.has(value));
      const typeEntries = entries
        .filter((entry) => /^(type|type1|type2|primarytype|secondarytype)$/.test(entry.key))
        .map((entry) => normalizeKey(entry.value))
        .filter((value) => validTypes.has(value));
      const types = [...new Set([...typeArrays, ...typeEntries])].slice(0, 2);
      const stat = (aliases) => positiveNumber(aliases, /computed|final|current|battle/);
      const sprite = clean(pick(
        ['sprite', 'spriteUrl', 'image', 'imageUrl', 'icon', 'iconUrl', 'portrait'],
        (value) => typeof value === 'string' && /^(?:https?:|data:|blob:|\/)/i.test(value)
      ));
      const qualityValue = numeric(pick(
        ['qualityMultiplier', 'qualityMult', 'rarityMultiplier'],
        (value) => Number(numeric(value)) > 0
      )) ||
        numeric(pick(['quality']));
      return {
        recordId: clean(pick(['captureId', 'pokemonId', 'pokeId', 'id'])),
        speciesId: positiveNumber(['speciesId', 'dex', 'pokedexId']),
        recordName: clean(pick(['pokemonName', 'pokeName', 'speciesName', 'displayName', 'name'])),
        level: positiveNumber(['level', 'pokemonLevel', 'lvl']),
        ivTotal: positiveNumber(['ivTotal', 'totalIv', 'iv']),
        quality: clean(pick(['quality', 'qualityName', 'rarity', 'rarityName'])),
        qualityMultiplier: clean(pick(['qualityMultiplier', 'qualityMult', 'rarityMultiplier'])),
        qualityValue,
        types,
        power: clean(pick(['power', 'strength', 'combatPower'], (value) => Number(String(value).replace(/[^0-9.-]/g, '')) > 0)),
        sprite,
        looktype: positiveNumber(['looktype', 'lookType', 'outfitId', 'spriteId']),
        gender: clean(pick(['gender', 'sex'])),
        nature: clean(pick(['nature', 'natureName'])),
        ball: clean(pick(['ballName', 'pokeballName', 'ball', 'pokeball'])),
        when: clean(pick(['capturedAt', 'createdAt', 'caughtAt', 'timestamp', 'date', 'at'])),
        captureNumber: positiveNumber(['captureNumber', 'captureNo', 'captureIndex', 'sequence', 'number', 'ordinal']),
        isShiny: Boolean(pick(['isShiny', 'shiny'], (value) => value === true || value === 1 || value === 'true')),
        growth: {
          hp: growthStat(['hp', 'health']),
          attack: growthStat(['attack', 'atk']),
          defense: growthStat(['defense', 'def']),
          specialAttack: growthStat(['specialAttack', 'spAttack', 'spAtk']),
          specialDefense: growthStat(['specialDefense', 'spDefense', 'spDef']),
          speed: growthStat(['speed'])
        },
        stats: {
          hp: stat(['hp', 'health', 'maxHp']),
          attack: stat(['attack', 'atk']),
          defense: stat(['defense', 'def']),
          specialAttack: stat(['specialAttack', 'spAttack', 'spAtk']),
          specialDefense: stat(['specialDefense', 'spDefense', 'spDef']),
          speed: stat(['speed'])
        }
      };
    };

    const tierFrom = (value) => {
      const text = normalized(value);
      const qualityText = clean(value).replace(',', '.');
      const quality = /^(?:x\s*)?\d+(?:\.\d+)?$/i.test(qualityText)
        ? Number(qualityText.replace(/^x\s*/i, ''))
        : null;
      if (quality >= 4) return 'divine';
      if (quality >= 3) return 'ancient';
      if (quality >= 2) return 'mythic';
      if (quality >= 1.7) return 'legendary';
      if (quality >= 1.5) return 'epic';
      if (quality >= 1.3) return 'rare';
      if (quality >= 1.1) return 'uncommon';
      if (quality >= 1) return 'common';
      if (quality > 0) return 'weak';
      if (/divine|divin/.test(text)) return 'divine';
      if (/ancient|ancestral|antigu/.test(text)) return 'ancient';
      if (/mythic|mitic/.test(text)) return 'mythic';
      if (/legend/.test(text)) return 'legendary';
      if (/epic/.test(text)) return 'epic';
      if (/rare|rara|raro/.test(text)) return 'rare';
      if (/uncommon|incomun/.test(text)) return 'uncommon';
      if (/common|comun/.test(text)) return 'common';
      return '';
    };
    const reactRowId = (row) => {
      const fiberKey = Object.keys(row).find((key) => key.startsWith('__reactFiber$'));
      let fiber = fiberKey ? row[fiberKey] : null;
      for (let depth = 0; fiber && depth < 20; depth += 1, fiber = fiber.return) {
        const key = clean(fiber.key);
        if (key) return key.replace(/^p-/, '');
      }
      return '';
    };
    const cleanName = (value) => clean(value)
      .replace(/\b(?:shiny|first|primeira|primera)\b.*$/i, '')
      .replace(/\s*[♀♂]\s*/g, ' ')
      .replace(/\s+\d+\s*(?:ª|º|st|nd|rd|th).*$/i, '')
      .trim();
    const extractReactDetail = (row) => {
      const entries = [];
      const arrays = [];
      const seen = new WeakSet();
      const scan = (value, path = '', depth = 0) => {
        if (value === null || value === undefined || depth > 7) return;
        if (['string', 'number', 'boolean'].includes(typeof value)) {
          entries.push({ path: normalized(path).replace(/[^a-z0-9.]/g, ''), value });
          return;
        }
        if (typeof value !== 'object' || value instanceof Node || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
          const primitives = value.filter((item) => ['string', 'number'].includes(typeof item));
          if (primitives.length === value.length) arrays.push({ path: normalized(path), value: primitives });
          value.slice(0, 20).forEach((item, index) => scan(item, `${path}.${index}`, depth + 1));
          return;
        }
        Object.entries(value).slice(0, 80).forEach(([key, child]) => scan(child, `${path}.${key}`, depth + 1));
      };
      [row, ...row.querySelectorAll('*')].slice(0, 30).forEach((element) => {
        const propsKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'));
        if (propsKey) scan(element[propsKey], 'props');
      });
      const pick = (aliases, prefer = null) => {
        const keys = new Set(aliases.map((key) => normalized(key).replace(/[^a-z0-9]/g, '')));
        const matches = entries.filter((entry) => keys.has(entry.path.split('.').at(-1)));
        return (prefer ? matches.find((entry) => prefer.test(entry.path)) : null)?.value ?? matches[0]?.value ?? '';
      };
      const typeArray = arrays.find((entry) => /(?:^|\.)types?$/.test(entry.path) && entry.value.every((item) => typeof item === 'string'));
      const individualTypes = entries
        .filter((entry) =>
          typeof entry.value === 'string' && (
            /(?:^|\.)(?:type|type1|type2|primarytype|secondarytype)$/.test(entry.path) ||
            /(?:^|\.)types?\.\d+\.name$/.test(entry.path) ||
            /(?:^|\.)(?:type1|type2|primarytype|secondarytype)\.name$/.test(entry.path)
          )
        )
        .map((entry) => clean(entry.value));
      const types = [...new Set([...(typeArray?.value || []), ...individualTypes].map(clean).filter(Boolean))].slice(0, 2);
      const stat = (aliases) => {
        const normalizedAliases = aliases.map((alias) => normalized(alias).replace(/[^a-z0-9]/g, ''));
        const nested = entries.find((entry) => {
          const segments = entry.path.split('.');
          return normalizedAliases.some((alias) => segments.includes(alias)) &&
            /(?:value|total|final|current)$/.test(entry.path) &&
            !/(?:basestat|statsbase)/.test(entry.path);
        });
        const raw = pick(aliases, /computedstat|finalstat|currentstat/) || nested?.value;
        const value = Number(String(raw).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(value) ? value : null;
      };
      return {
        quality: clean(pick(['quality', 'qualityName', 'rarity', 'tier'])),
        qualityMultiplier: clean(pick(['qualityMultiplier', 'qualityMult']) || pick(['multiplier'], /quality/)),
        types,
        power: clean(pick(['power', 'strength', 'combatPower'])),
        sprite: clean(pick(['sprite', 'spriteUrl', 'image', 'imageUrl', 'iconUrl'])),
        gender: clean(pick(['gender', 'sex'])),
        nature: clean(pick(['nature'])),
        stats: {
          hp: stat(['hp', 'health', 'maxHp']),
          attack: stat(['attack', 'atk']),
          defense: stat(['defense', 'def']),
          specialAttack: stat(['specialAttack', 'spAttack', 'spAtk']),
          specialDefense: stat(['specialDefense', 'spDefense', 'spDef']),
          speed: stat(['speed', 'spd'])
        }
      };
    };
    const extractDomDetail = (row) => {
      const tooltip = row.querySelector('[role="tooltip"], [class*="tooltip" i], [class*="popover" i], [class*="pokemon-card" i]');
      if (!tooltip) return null;
      const text = clean(tooltip.textContent);
      const readNumber = (pattern) => {
        const value = Number(text.match(pattern)?.[1]);
        return Number.isFinite(value) ? value : null;
      };
      const types = [...tooltip.querySelectorAll('[class*="type" i]')]
        .filter((element) => element.children.length === 0)
        .map((element) => clean(element.textContent))
        .filter((value) => value && value.length <= 16)
        .slice(0, 2);
      return {
        quality: clean(text.match(/quality\s+([^\s|·]+)/i)?.[1]),
        qualityMultiplier: clean(text.match(/quality[^x]*?(x\s*[\d.,]+)/i)?.[1]),
        types: [...new Set(types)],
        power: clean(text.match(/(?:power|for[cç]a|fuerza)\s*([\d.,]+)/i)?.[1]),
        sprite: tooltip.querySelector('img')?.currentSrc || tooltip.querySelector('img')?.src || '',
        stats: {
          hp: readNumber(/\bhp\s*(\d+)/i),
          attack: readNumber(/\b(?:atk|attack|ataque)\s*(\d+)/i),
          defense: readNumber(/\b(?:def|defense|defensa)\s*(\d+)/i),
          specialAttack: readNumber(/\b(?:SpA|SPA|Sp\.?\s*Atk)\s*(\d+)/),
          specialDefense: readNumber(/\b(?:SpD|SPD|Sp\.?\s*Def)\s*(\d+)/),
          speed: readNumber(/\b(?:Spd|Speed|SPEED|Vel(?:ocidad)?|VEL)\s*(\d+)/)
        }
      };
    };
    const allRowElements = [...captureLog.querySelectorAll('.clog-row')];
    const rowElements = allRowElements.length <= 1000
      ? allRowElements
      : [...allRowElements.slice(0, 500), ...allRowElements.slice(-500)];
    const apiDetails = apiRecords.map(readApiDetail);
    const totalText = clean(captureLog.querySelector('.clog-totals')?.textContent);
    const parsedTotal = Number(totalText.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, ''));
    const total = Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : rowElements.length;
    const apiTimes = apiDetails.map((detail) => Date.parse(detail?.when || '')).filter(Number.isFinite);
    const apiNewestFirst = apiTimes.length < 2 || apiTimes[0] >= apiTimes[apiTimes.length - 1];
    const inferredCaptureNumber = (index, explicit) => {
      if (Number(explicit) > 0) return Number(explicit);
      if (!(total > 0) || index < 0 || index >= apiDetails.length) return null;
      return apiNewestFirst
        ? Math.max(1, total - index)
        : Math.max(1, total - apiDetails.length + index + 1);
    };
    const rows = rowElements.map((row, index) => {
      const rawName = row.querySelector('.clog-name')?.childNodes?.[0]?.textContent ||
        row.querySelector('.clog-name')?.textContent || row.querySelector('.clog-ico img')?.alt;
      const name = cleanName(rawName);
      const levelText = clean(row.querySelector('.clog-lvl')?.textContent);
      const meta = clean(row.querySelector('.clog-meta')?.textContent);
      const ivMatch = meta.match(/iv\s*(\d+)(?:\s*\/\s*(\d+))?/i);
      const rowLevel = Number(levelText.match(/\d+/)?.[0]) || null;
      const rowIv = ivMatch ? Number(ivMatch[1]) : null;
      const rowId = clean(row.dataset.captureId || row.dataset.id || reactRowId(row));
      const reactDetail = extractReactDetail(row);
      const domDetail = extractDomDetail(row);
      const indexedApiDetail = apiDetails[index];
      const apiDetail = (rowId && apiDetails.find((candidate) => clean(candidate?.recordId) === rowId)) ||
        (normalized(indexedApiDetail?.recordName) === normalized(name)
        ? indexedApiDetail
        : apiDetails.find((candidate) =>
          normalized(candidate?.recordName) === normalized(name) &&
          (!rowLevel || !candidate.level || Number(candidate.level) === rowLevel) &&
          (!rowIv || !candidate.ivTotal || Number(candidate.ivTotal) === rowIv)
        ) || indexedApiDetail);
      const serverDetail = (rowId && serverPokemonDetails.find((candidate) => candidate.recordId === rowId)) ||
        serverPokemonDetails.find((candidate) =>
          (
            (apiDetail?.speciesId && Number(candidate.speciesId) === Number(apiDetail.speciesId)) ||
            normalized(candidate.recordName) === normalized(name)
          ) &&
          (!rowLevel || Number(candidate.level) === rowLevel) &&
          (!rowIv || Number(candidate.ivTotal) === rowIv) &&
          (!apiDetail?.qualityValue || Math.abs(Number(candidate.qualityValue) - Number(apiDetail.qualityValue)) < .0005)
        );
      const detailSources = [serverDetail, apiDetail, domDetail, reactDetail].filter(Boolean);
      const validDetailTypes = detailSources
        .flatMap((source) => source.types || [])
        .map((type) => normalizeKey(type))
        .filter((type) => validTypes.has(type));
      const pickDetailText = (key) => clean(detailSources.map((source) => source[key]).find((value) => clean(value)));
      const pickDetailNumber = (key) => {
        const value = detailSources.map((source) => numeric(source[key])).find((candidate) => Number.isFinite(candidate) && candidate > 0);
        return value ?? null;
      };
      const positiveStat = (key) => {
        const value = detailSources.map((source) => Number(source.stats?.[key])).find((candidate) => Number.isFinite(candidate) && candidate > 0);
        return value || null;
      };
      const detail = {
        quality: pickDetailText('quality'),
        qualityMultiplier: pickDetailText('qualityMultiplier'),
        qualityValue: pickDetailNumber('qualityValue'),
        captureNumber: pickDetailNumber('captureNumber'),
        speciesId: pickDetailNumber('speciesId'),
        types: [...new Set(validDetailTypes)].slice(0, 2),
        power: pickDetailText('power'),
        sprite: pickDetailText('sprite'),
        looktype: Number(detailSources.map((source) => source.looktype).find((value) => Number(value) > 0)) || null,
        gender: pickDetailText('gender'),
        nature: pickDetailText('nature'),
        growth: detailSources.map((source) => source.growth).find((growth) =>
          growth && Object.values(growth).every((value) => Number(value) > 0)
        ) || null,
        statsSource: serverDetail?.stats ? 'server' : (apiDetail?.stats && Object.values(apiDetail.stats).every((value) => Number(value) > 0) ? 'api' : ''),
        stats: {
          hp: positiveStat('hp'),
          attack: positiveStat('attack'),
          defense: positiveStat('defense'),
          specialAttack: positiveStat('specialAttack'),
          specialDefense: positiveStat('specialDefense'),
          speed: positiveStat('speed')
        }
      };
      const exactWhen = pickDetailText('when');
      const exactTimestamp = Date.parse(exactWhen);
      const apiIndex = apiDetail ? apiDetails.indexOf(apiDetail) : -1;
      const explicitOrdinal = Number(clean(row.querySelector('.clog-num, [class*="ordinal"], [class*="capture-number"]')?.textContent).match(/\d+/)?.[0]) || null;
      const captureNumber = inferredCaptureNumber(apiIndex, detail.captureNumber || explicitOrdinal);
      const text = clean(row.textContent);
      return {
        ...detail,
        key: clean(rowId || [name, levelText, meta, row.querySelector('.clog-ball')?.textContent, row.querySelector('.clog-when')?.textContent].join('|')),
        id: rowId,
        name,
        level: rowLevel,
        levelText,
        meta,
        tier: tierFrom(detail.qualityValue) || tierFrom(meta) || tierFrom(detail.quality),
        iv: rowIv,
        ivMax: ivMatch?.[2] ? Number(ivMatch[2]) : null,
        ball: clean(row.querySelector('.clog-ball')?.textContent),
        when: clean(row.querySelector('.clog-when')?.textContent) || exactWhen,
        capturedAt: Number.isFinite(exactTimestamp) ? exactTimestamp : null,
        captureNumber: captureNumber ? String(captureNumber) : '',
        captureNumberTrusted: Boolean(captureNumber),
        sprite: row.querySelector('.clog-ico img')?.currentSrc || row.querySelector('.clog-ico img')?.src || detail.sprite || '',
        isShiny: row.classList.contains('shiny') || /(^|\s)shiny(\s|$)/i.test(text)
      };
    }).filter((capture) => capture.name && capture.key);
    const apiOnlyRows = apiDetails.slice(rowElements.length).map((detail, apiIndex) => {
      const index = rowElements.length + apiIndex;
      const name = cleanName(detail.recordName);
      const captureNumber = inferredCaptureNumber(index, detail.captureNumber);
      const exactTimestamp = Date.parse(detail.when || '');
      return {
        ...detail,
        key: clean(detail.recordId || [name, detail.level, detail.ivTotal, detail.ball, detail.when, captureNumber].join('|')),
        id: clean(detail.recordId),
        name,
        level: detail.level,
        levelText: detail.level ? `Lv.${detail.level}` : '',
        meta: [detail.quality, detail.ivTotal ? `IV ${detail.ivTotal}/192` : ''].filter(Boolean).join(' · '),
        tier: tierFrom(detail.qualityValue) || tierFrom(detail.quality),
        iv: detail.ivTotal,
        ivMax: detail.ivTotal ? 192 : null,
        ball: detail.ball,
        when: detail.when,
        capturedAt: Number.isFinite(exactTimestamp) ? exactTimestamp : null,
        captureNumber: captureNumber ? String(captureNumber) : '',
        captureNumberTrusted: Boolean(captureNumber),
        isShiny: detail.isShiny
      };
    }).filter((capture) => capture.name && capture.key);
    rows.push(...apiOnlyRows);
    return {
      ok: true,
      rows,
      total,
      updatedAt: Date.now(),
      serverPokemonCount: serverPokemonDetails.length,
      serverCacheAt: Number(window.__pokeGridServerPokemonCacheAt || 0)
    };
  };
  return `(${readCaptureLogPanel.toString()})()`;
}

function captureMonitorInstallScript() {
  const installCaptureMonitor = () => {
    if (window.__pokeGridCaptureMonitorInstalled) {
      window.__pokeGridCaptureMonitorHealth?.();
      return true;
    }
    window.__pokeGridCaptureMonitorInstalled = true;
    window.__pokeGridCaptureQueue = window.__pokeGridCaptureQueue || [];
    window.__pokeGridDefeatQueue = window.__pokeGridDefeatQueue || [];
    window.__pokeGridDropQueue = window.__pokeGridDropQueue || [];
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const numberFrom = (value, keys) => {
      for (const key of keys) {
        const raw = key.split('.').reduce((current, part) => current?.[part], value);
        const match = String(raw ?? '').replace(',', '.').match(/-?[0-9]+(?:[.][0-9]+)?/);
        const parsed = match ? Number(match[0]) : NaN;
        if (Number.isFinite(parsed)) return parsed;
      }
      return null;
    };
    const qualityFrom = (value) => numberFrom(value, [
      'qualityValue', 'qualityMultiplier', 'qualityMult', 'rarityMultiplier', 'multiplier', 'quality',
      'quality_value', 'quality_multiplier', 'rarity_multiplier', 'quality.value', 'quality.multiplier',
      'pokemon.qualityValue', 'pokemon.qualityMultiplier', 'pokemon.qualityMult',
      'pokemon.rarityMultiplier', 'pokemon.multiplier', 'pokemon.quality',
      'pokemon.quality_value', 'pokemon.quality_multiplier', 'pokemon.quality.value', 'pokemon.quality.multiplier',
      'capturedPokemon.qualityValue', 'capturedPokemon.qualityMultiplier', 'capturedPokemon.quality',
      'result.qualityValue', 'result.qualityMultiplier', 'result.quality'
    ]);
    const qualityLabelFrom = (value) => clean(
      value?.qualityName || value?.rarityName || value?.tier || value?.rarity ||
      value?.pokemon?.qualityName || value?.pokemon?.rarityName || value?.pokemon?.tier || value?.pokemon?.rarity ||
      value?.capturedPokemon?.qualityName || value?.capturedPokemon?.rarityName || value?.capturedPokemon?.tier
    );
    const nameFrom = (value) => clean(
      value?.pokemonName || value?.pokeName || value?.speciesName || value?.displayName ||
      value?.pokemon?.name || value?.species?.name || value?.poke?.name ||
      (typeof value?.pokemon === 'string' ? value.pokemon : '') || value?.name
    );
    const normalized = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const invalidPokemonNames = new Set([
      'you', 'your', 'voce', 'tu', 'usted', 'ustedes', 'player', 'jogador', 'jugador',
      'pokemon', 'shiny', 'it', 'he', 'she', 'ele', 'ela'
    ]);
    const validPokemonName = (value) => {
      const name = normalized(value).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      return name.length >= 2 && !invalidPokemonNames.has(name);
    };
    const recentDefeats = new Map();
    const enqueue = (capture) => {
      if (!capture?.name) return;
      const now = Date.now();
      const key = clean(capture.id || capture.captureId || [
        capture.name, capture.level, capture.meta, capture.ball, capture.iv, capture.ivMax,
        capture.isShiny ? 'shiny' : 'normal', now
      ].join('|'));
      window.__pokeGridCaptureQueue.push({ ...capture, key, source: capture.source || 'capture-network', detectedAt: now });
      if (window.__pokeGridCaptureQueue.length > 200) window.__pokeGridCaptureQueue.splice(0, window.__pokeGridCaptureQueue.length - 200);
    };
    const enqueueDefeat = (payload, source = 'field-kill') => {
      if (!payload || (payload.shiny !== true && payload.isShiny !== true)) return;
      const name = nameFrom(payload);
      if (!name || !validPokemonName(name)) return;
      const now = Date.now();
      const defeatSignature = normalized(`${name}|${payload.speciesId || payload.pokemon?.speciesId || ''}`);
      if (now - Number(recentDefeats.get(defeatSignature) || 0) < 60_000) return;
      recentDefeats.set(defeatSignature, now);
      const row = {
        key: clean(payload.killId || payload.id || [
          name, payload.speciesId, payload.level, payload.xpGained, Math.floor(now / 3000)
        ].join('|')),
        name,
        level: numberFrom(payload, ['level', 'speciesLevel', 'pokemon.level']),
        speciesId: numberFrom(payload, ['speciesId', 'pokemon.speciesId', 'pokeId']),
        looktype: numberFrom(payload, ['looktype', 'lookType', 'pokemon.looktype']),
        types: [
          payload.type1, payload.type2, ...(Array.isArray(payload.types) ? payload.types : [])
        ].filter(Boolean),
        tier: qualityLabelFrom(payload),
        quality: qualityLabelFrom(payload),
        qualityValue: qualityFrom(payload),
        qualityMultiplier: qualityFrom(payload) ? `x${qualityFrom(payload)}` : '',
        xp: numberFrom(payload, ['xpGained', 'xp', 'totalXp']),
        sprite: clean(payload.sprite || payload.image || payload.imageUrl),
        isShiny: true,
        source,
        detectedAt: now
      };
      const duplicate = window.__pokeGridDefeatQueue.some((candidate) =>
        clean(candidate.name).toLowerCase() === name.toLowerCase() &&
        now - Number(candidate.detectedAt || 0) < 10_000
      );
      if (duplicate) return;
      window.__pokeGridDefeatQueue.push(row);
      if (window.__pokeGridDefeatQueue.length > 100) {
        window.__pokeGridDefeatQueue.splice(0, window.__pokeGridDefeatQueue.length - 100);
      }
    };
    const extractDrops = (payload) => {
      const results = new Map();
      const seen = new WeakSet();
      const add = (name, quantity) => {
        const cleanName = clean(name);
        const count = Number(String(quantity ?? 1).replace(/[^0-9.-]/g, '')) || 1;
        if (!cleanName || count <= 0) return;
        const key = normalized(cleanName);
        const previous = results.get(key);
        results.set(key, { name: previous?.name || cleanName, quantity: (previous?.quantity || 0) + count });
      };
      const visit = (value, path = '', depth = 0) => {
        if (value == null || depth > 8) return;
        const relevant = /drop|loot|item|reward|premio|objeto/i.test(path);
        if (Array.isArray(value)) {
          value.slice(0, 100).forEach((entry, index) => visit(entry, `${path}.${index}`, depth + 1));
          return;
        }
        if (typeof value !== 'object' || seen.has(value)) return;
        seen.add(value);
        const item = value.item && typeof value.item === 'object' ? value.item : {};
        const name = clean(value.itemName || value.dropName || value.lootName || item.name ||
          (relevant ? value.name || value.label || value.title : ''));
        const quantity = value.quantity ?? value.amount ?? value.count ?? value.qty ?? item.quantity ?? 1;
        const added = relevant && name && !/pokemon|pokémon|experience|gold|money|xp/i.test(name);
        if (added) add(name, quantity);
        Object.entries(value).slice(0, 100).forEach(([key, child]) => {
          if (added && key === 'item') return;
          if (['pokemon', 'species'].includes(key) && !/drop|loot/i.test(path)) return;
          visit(child, path ? `${path}.${key}` : key, depth + 1);
        });
      };
      visit(payload);
      return [...results.values()];
    };
    const enqueueDrops = (payload) => {
      const killId = clean(payload?.killId || payload?.id || '');
      extractDrops(payload).forEach((drop) => {
        const key = clean(`${killId || Math.floor(Date.now() / 5000)}:${normalized(drop.name)}:${drop.quantity}`);
        window.__pokeGridDropQueue.push({ ...drop, key, killId, detectedAt: Date.now() });
      });
      if (window.__pokeGridDropQueue.length > 150) {
        window.__pokeGridDropQueue.splice(0, window.__pokeGridDropQueue.length - 150);
      }
    };
    const subscribeToFieldKills = (force = false) => {
      if (!force && typeof window.__pokeGridFieldKillUnsubscribe === 'function') return true;
      const root = document.querySelector('.game-root') || document.querySelector('#root');
      if (!root) return false;
      let socketContext = null;
      const seenValues = new WeakSet();
      let inspected = 0;
      const inspect = (value, depth = 0) => {
        if (socketContext || !value || typeof value !== 'object' || value instanceof Node ||
          seenValues.has(value) || depth > 7 || inspected > 40_000) return;
        seenValues.add(value);
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
          enqueueDefeat(payload, 'field-kill');
          enqueueDrops(payload);
        });
        if (typeof unsubscribe !== 'function') return false;
        const previousUnsubscribe = window.__pokeGridFieldKillUnsubscribe;
        window.__pokeGridFieldKillUnsubscribe = unsubscribe;
        window.__pokeGridFieldKillSubscribedAt = Date.now();
        if (typeof previousUnsubscribe === 'function' && previousUnsubscribe !== unsubscribe) {
          try { previousUnsubscribe(); } catch {}
        }
        return true;
      } catch {
        return false;
      }
    };
    if (!subscribeToFieldKills()) {
      const retry = window.setInterval(() => {
        if (subscribeToFieldKills()) window.clearInterval(retry);
      }, 2000);
      window.setTimeout(() => window.clearInterval(retry), 120_000);
      window.__pokeGridFieldKillRetry = retry;
    }
    window.__pokeGridCaptureMonitorHealth = () => {
      const stale = Date.now() - Number(window.__pokeGridFieldKillSubscribedAt || 0) > 60_000;
      return subscribeToFieldKills(stale);
    };
    window.__pokeGridCaptureMonitorHealthTimer = window.setInterval(window.__pokeGridCaptureMonitorHealth, 30_000);
    const inspectPayload = (payload, source = '', depth = 0, seen = new WeakSet()) => {
      if (!payload || typeof payload !== 'object' || depth > 8 || seen.has(payload)) return;
      seen.add(payload);
      if (Array.isArray(payload)) {
        payload.forEach((entry) => inspectPayload(entry, source, depth + 1, seen));
        return;
      }
      const sourceLooksRelevant = /captur|catch|caught|throw|pokeball|battle/i.test(source);
      const capturedFlag = payload.captured ?? payload.caught ?? payload.isCaptured ?? payload.success;
      const evidence = Boolean(
        payload.captureId || payload.ball || payload.ballName || payload.pokeball ||
        payload.iv || payload.ivs || payload.totalIv || payload.ivTotal ||
        payload.rarity || payload.tier || payload.quality || payload.qualityValue || payload.qualityMultiplier ||
        payload.isShiny || payload.shiny
      );
      const name = nameFrom(payload);
      if (name && capturedFlag !== false && (capturedFlag === true || (sourceLooksRelevant && evidence))) {
        const iv = numberFrom(payload, ['ivTotal', 'totalIv', 'iv', 'stats.ivTotal', 'pokemon.ivTotal']);
        const ivs = payload.ivs || payload.pokemon?.ivs;
        const computedIv = iv ?? (ivs && typeof ivs === 'object'
          ? Object.values(ivs).reduce((sum, stat) => sum + (Number(stat) || 0), 0)
          : null);
        const qualityValue = qualityFrom(payload);
        const tier = qualityLabelFrom(payload);
        enqueue({
          id: payload.captureId || payload.id,
          name,
          level: numberFrom(payload, ['level', 'pokemon.level', 'species.level']),
          meta: [tier, computedIv !== null ? `IV ${computedIv}/192` : ''].filter(Boolean).join(' · '),
          tier,
          quality: tier,
          qualityValue,
          qualityMultiplier: qualityValue ? `x${qualityValue}` : '',
          iv: computedIv,
          ivMax: computedIv !== null ? 192 : null,
          ball: clean(payload.ballName || payload.ball?.name || payload.pokeball?.name || payload.ball),
          when: new Date().toISOString(),
          sprite: clean(payload.sprite || payload.image || payload.imageUrl || payload.pokemon?.sprite),
          looktype: numberFrom(payload, ['looktype', 'lookType', 'pokemon.looktype', 'pokemon.lookType', 'species.looktype']),
          speciesId: numberFrom(payload, ['speciesId', 'pokemon.speciesId', 'pokeId', 'pokemon.pokeId']),
          isShiny: payload.isShiny === true || payload.shiny === true || payload.pokemon?.isShiny === true
        });
      }
      Object.entries(payload).forEach(([key, child]) => {
        if (child && typeof child === 'object') inspectPayload(child, `${source}.${key}`, depth + 1, seen);
      });
    };
    const originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
      window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        const url = String(args[0]?.url || args[0] || response.url || '');
        if (/captur|catch|throw|pokeball|battle/i.test(url)) {
          response.clone().json().then((payload) => {
            if (/\/api\/game\/capture-log/i.test(url)) {
              window.__pokeGridCaptureLogPayload = payload;
              window.__pokeGridCaptureLogPayloadAt = Date.now();
              return;
            }
            inspectPayload(payload, url);
          }).catch(() => {});
        }
        return response;
      };
    }
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__pokeGridRequestUrl = String(url || '');
      return originalXhrOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function (...args) {
      if (/captur|catch|throw|pokeball|battle/i.test(this.__pokeGridRequestUrl || '') &&
        !/\/api\/game\/capture-log/i.test(this.__pokeGridRequestUrl || '')) {
        this.addEventListener('load', () => {
          try {
            const payload = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
            inspectPayload(payload, this.__pokeGridRequestUrl);
          } catch {}
        }, { once: true });
      }
      return originalXhrSend.apply(this, args);
    };
    const observer = new MutationObserver((records) => {
      records.flatMap((record) => [...record.addedNodes]).forEach((node) => {
        if (!(node instanceof Element)) return;
        const candidates = [
          ...(node.matches?.('.sn-card') ? [node] : []),
          ...node.querySelectorAll('.sn-card')
        ];
        candidates.forEach((element) => {
          if (element.dataset.pgDefeatObserved || element.closest('.sa-overlay')) return;
          const title = clean(element.querySelector('.sn-title')?.textContent);
          const text = clean(element.querySelector('.sn-text')?.textContent || element.textContent);
          const descriptor = `${title} ${text}`;
          if (!/\bshiny\b/i.test(descriptor) || !/(?:defeated|derrotad[oa]|abatid[oa]|vencid[oa])/i.test(text)) return;
          const match = text.match(
            /(?:defeated|derrotad[oa]|abatid[oa]|vencid[oa])\s*:?\s*(?:(?:a|an|the|um|uma|el|la|o)\s+)?(?:shiny\s+)?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ.' -]{1,50}?)(?=\s*[!·]|$)/i
          ) || text.match(
            /(?:shiny\s+)?([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÿ.' -]{1,50}?)\s+(?:foi|was|ha sido)?\s*(?:defeated|derrotad[oa]|abatid[oa]|vencid[oa])(?=\s*[!·]|$)/i
          );
          if (!match) return;
          const pokemonName = clean(match[1]).replace(/^(?:um|uma|a|an|o|the|el|la)\s+/i, '');
          if (!validPokemonName(pokemonName)) return;
          element.dataset.pgDefeatObserved = 'true';
          enqueueDefeat({
            name: pokemonName,
            shiny: true,
            sprite: element.querySelector('img')?.currentSrc || element.querySelector('img')?.src || ''
          }, 'local-notice');
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.__pokeGridCaptureObserver = observer;
    return true;
  };
  return `(${installCaptureMonitor.toString()})()`;
}

function clearNativeCaptureLogScript() {
  const clearCaptureLog = async () => {
    const captureLog = document.querySelector('.clog-window');
    if (!captureLog) return { ok: false, error: 'El registro nativo de capturas no está disponible.' };
    let button = captureLog.querySelector('.clog-clear');
    if (!button) return { ok: false, error: 'El juego no expone el control para eliminar las capturas.' };
    if (!button.classList.contains('arm')) {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      button = captureLog.querySelector('.clog-clear');
    }
    if (!button?.classList.contains('arm')) {
      return { ok: false, error: 'El juego no permitió confirmar la eliminación.' };
    }
    button.click();
    let confirmedEmpty = false;
    for (let attempt = 0; attempt < 70; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const rows = captureLog.querySelectorAll('.clog-row').length;
      const totals = String(captureLog.querySelector('.clog-totals')?.textContent || '');
      const reportedTotal = Number(totals.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, '') || 0);
      if (rows === 0 && reportedTotal === 0) {
        confirmedEmpty = true;
        break;
      }
    }
    if (!confirmedEmpty) {
      return { ok: false, error: 'El servidor no confirmo que el historial quedara vacio.' };
    }
    window.__pokeGridCaptureLogPayload = null;
    window.__pokeGridCaptureLogPayloadAt = 0;
    return { ok: true, rows: 0, total: 0 };
  };
  return `(${clearCaptureLog.toString()})()`;
}

function captureKeyCounts(rows) {
  const counts = new Map();
  rows.forEach((row) => counts.set(row.key, (counts.get(row.key) || 0) + 1));
  return counts;
}

async function executePanelCaptureRead(panel, script, errorMessage, { skipIfBusy = false } = {}) {
  while (panel.captureDataReadPromise) {
    if (skipIfBusy) return null;
    await panel.captureDataReadPromise.catch(() => {});
  }
  const readPromise = withTimeout(
    panel.webview.executeJavaScript(script),
    PANEL_READ_TIMEOUT_MS,
    errorMessage
  );
  panel.captureDataReadPromise = readPromise;
  try {
    return await readPromise;
  } finally {
    if (panel.captureDataReadPromise === readPromise) panel.captureDataReadPromise = null;
  }
}

function telegramCaptureNumber(value) {
  const match = String(value ?? '').replace(',', '.').match(/-?[0-9]+(?:[.][0-9]+)?/);
  const number = match ? Number(match[0]) : NaN;
  return Number.isFinite(number) ? number : null;
}

function telegramCaptureName(value) {
  return normalizeSearchText(value)
    .replace(/[♀♂]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/^(?:shiny|brave|furious|ancient|taekwondo|tribal|war|enigmatic|charged|magnetic|evil|freezing|psy|heavy|milch|roll|hard|brute|enraged|dark|trickmaster|banshee)\s+/, '')
    .replace(/\s+\d+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function enrichTelegramCapture(panel, capture) {
  const hasTier = Boolean(captureTier(`${capture.tier || ''} ${capture.meta || ''} ${capture.quality || ''}`) ||
    captureTierFromQuality(capture.qualityValue ?? capture.qualityMultiplier));
  const hasIv = telegramCaptureNumber(capture.iv) !== null;
  const hasLevel = telegramCaptureNumber(capture.level) !== null;
  const ballText = String(capture.ballName || capture.pokeballName || capture.ball || '').trim();
  const hasSpecificBall = Boolean(ballText && !/^(?:ball|pokeball|poke ball)$/i.test(ballText));
  const hasCaptureNumber = telegramCaptureNumber(capture.captureNumber ?? capture.captureNo ?? capture.ordinal) !== null;
  if (hasTier && hasIv && hasLevel && hasSpecificBall && hasCaptureNumber) return capture;
  await new Promise((resolve) => setTimeout(resolve, 450));
  try {
    const snapshot = await executePanelCaptureRead(
      panel,
      captureLogPanelSnapshotScript(),
      'Capture Log no respondio durante la hidratacion.'
    );
    const targetName = telegramCaptureName(capture.name);
    const targetIv = telegramCaptureNumber(capture.iv ?? capture.meta);
    const targetLevel = telegramCaptureNumber(capture.level);
    const ranked = (snapshot?.rows || []).map((row, index) => {
      const rowName = telegramCaptureName(row.name);
      let score = Math.max(0, 100 - index);
      if (targetName && rowName === targetName) score += 500;
      else if (targetName && rowName && (rowName.includes(targetName) || targetName.includes(rowName))) score += 300;
      const rowIv = telegramCaptureNumber(row.iv);
      const rowLevel = telegramCaptureNumber(row.level);
      if (targetIv !== null && rowIv !== null) score += targetIv === rowIv ? 250 : -500;
      if (targetLevel !== null && rowLevel !== null) score += targetLevel === rowLevel ? 120 : -240;
      return { row, score };
    }).sort((left, right) => right.score - left.score);
    const detail = ranked[0]?.score > 300 ? ranked[0].row : null;
    if (detail) {
      return {
        ...capture,
        ...detail,
        key: detail.key || capture.key,
        id: detail.id || capture.id,
        when: capture.when || detail.when,
        detectedAt: Number(capture.detectedAt) || Date.now()
      };
    }
  } catch {}
  return capture;
}

function bridgeCaptureToTelegram(panel, capture, source) {
  enrichTelegramCapture(panel, capture).then((enriched) => {
    const row = {
      ...enriched,
      source: capture.source || source,
      detectedAt: Number(capture.detectedAt) || Date.now()
    };
    const serialized = JSON.stringify(row).replaceAll('<', '\\u003c');
    return panel.webview.executeJavaScript(`(() => {
      const queue = window.__pokeGridTelegramCaptureBridgeQueue ||= [];
      queue.push(${serialized});
      if (queue.length > 200) queue.splice(0, queue.length - 200);
    })()`);
  }).catch(() => {});
}

async function processCapturedEvent(panel, capture, source) {
  const enriched = await enrichTelegramCapture(panel, capture).catch(() => capture);
  addCaptureNotification(enriched, panel.index);
  bridgeCaptureToTelegram(panel, enriched, source);
}

async function pollCaptureNotifications() {
  if (capturePollBusy) return;
  capturePollBusy = true;
  try {
    await Promise.allSettled(panels.map(async (panel) => {
      try {
        if (!panel.webview.getURL().startsWith(GAME_ORIGIN)) return;
        if (Date.now() - Number(panel.captureMonitorHealthAt || 0) > 30_000) {
          panel.captureMonitorHealthAt = Date.now();
          await withTimeout(panel.webview.executeJavaScript(captureMonitorInstallScript()), PANEL_READ_TIMEOUT_MS, 'El monitor de eventos no respondió.').catch(() => {});
        }
        await ensureCaptureArchive(panel);
        const snapshot = await executePanelCaptureRead(
          panel,
          captureSnapshotScript(),
          'Monitor de capturas sin respuesta.',
          { skipIfBusy: true }
        );
        if (!snapshot || snapshot.paused) return;
        archiveCaptureRows(panel, snapshot.rows || []);
      (snapshot.defeatedRows || []).forEach((defeat) => addDefeatNotification(defeat, panel.index));
      (snapshot.dropRows || []).forEach((drop) => addDropNotification(drop, panel.index));
      for (const capture of snapshot.queuedRows || []) {
        await processCapturedEvent(panel, capture, 'capture-network');
      }
      if (!snapshot.rows?.length) return;
      const nextCounts = captureKeyCounts(snapshot.rows);
      if (!panel.captureMonitorReady) {
        panel.captureMonitorReady = true;
        panel.captureSignatureCounts = nextCounts;
        return;
      }
      const additions = new Map();
      nextCounts.forEach((count, key) => {
        const added = count - (panel.captureSignatureCounts.get(key) || 0);
        if (added > 0) additions.set(key, added);
      });
      for (const capture of snapshot.rows) {
        const remaining = additions.get(capture.key) || 0;
        if (remaining <= 0) continue;
        additions.set(capture.key, remaining - 1);
        await processCapturedEvent(panel, capture, 'capture-log-fallback');
      }
      panel.captureSignatureCounts = nextCounts;
      } catch {}
    }));
  } finally {
    capturePollBusy = false;
  }
}

function computeCapturedPokemonStats(baseStats, growth, levelValue, qualityValue) {
  const level = Number(levelValue);
  const quality = Number(qualityValue);
  const keys = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  if (!Number.isFinite(level) || level <= 0 || !Number.isFinite(quality) || quality <= 0) return null;
  if (!keys.every((key) => Number(baseStats?.[key]) > 0 && Number(growth?.[key]) > 0)) return null;
  const exponent = { hp: .95, attack: .8, defense: .8, specialAttack: .8, specialDefense: .8, speed: .95 };
  return Object.fromEntries(keys.map((key) => [
    key,
    Math.round((level / 100) * (Number(baseStats[key]) + (2 * Number(growth[key]))) * Math.pow(quality, exponent[key]))
  ]));
}

function captureQualityNumber(capture) {
  for (const value of [capture?.qualityValue, capture?.qualityMultiplier, capture?.quality]) {
    const parsed = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function enrichCaptureLogEntry(capture) {
  const referenceKey = normalizeSearchText(capture.name).replace(/^(brave|furious|ancient|taekwondo)\s+/, '');
  const reference = pokemonReferenceIndex.get(referenceKey) || farmCatalog.find((pokemon) =>
    normalizeSearchText(pokemon.name) === normalizeSearchText(capture.name)
  );
  const statKeys = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  const hasCaptureStats = statKeys.every((key) => Number(capture.stats?.[key]) > 0);
  const qualityValue = captureQualityNumber(capture);
  const tier = captureTierFromQuality(qualityValue) || capture.tier || captureTier(capture.quality) || captureTier(reference?.rarity);
  const strengthMultiplier = qualityValue || farmTierMultiplier(null, tier || capture.quality || reference?.rarity);
  const computedStats = !hasCaptureStats
    ? computeCapturedPokemonStats(reference?.baseStats, capture.growth, capture.level, qualityValue)
    : null;
  const stats = hasCaptureStats ? capture.stats : (computedStats || {});
  const hasExactStats = statKeys.every((key) => Number(stats[key]) > 0);
  const computedStrength = hasExactStats
    ? Math.round(statKeys.reduce((sum, key) => sum + Number(stats[key]), 0) * strengthMultiplier)
    : null;
  const rawQuality = String(capture.quality || '').trim();
  const qualityIsNumeric = rawQuality && Number.isFinite(Number(rawQuality.replace(',', '.')));
  const captureTypes = normalizePokemonTypes(capture.types || []);
  return {
    ...capture,
    tier,
    qualityValue,
    quality: qualityIsNumeric || !rawQuality ? (tier ? tierLabel(tier) : rawQuality) : rawQuality,
    qualityMultiplier: capture.qualityMultiplier || (qualityValue ? `x${qualityValue.toFixed(2)}` : ''),
    types: captureTypes.length ? captureTypes : (reference?.types || []),
    strength: computedStrength || captureStrengthNumber(capture) || null,
    strengthMultiplier,
    power: computedStrength || capture.power || '',
    powerSource: computedStrength ? 'calculated-strength' : (capture.power ? 'capture' : ''),
    looktype: Number(capture.looktype || reference?.looktype) || null,
    stats,
    statsSource: capture.statsSource || (hasCaptureStats ? 'capture' : (computedStats ? 'calculated' : 'unavailable'))
  };
}

function createCaptureLogSprite(capture, size, detail = false) {
  if (capture.sprite) {
    const image = document.createElement('img');
    image.className = detail ? 'capture-detail-sprite' : 'capture-flat-sprite';
    image.src = capture.sprite;
    image.alt = capture.name;
    return image;
  }
  if (capture.looktype) {
    const atlasSprite = createFarmSprite({ looktype: capture.looktype, name: capture.name }, size);
    atlasSprite.classList.add(detail ? 'capture-detail-sprite' : 'capture-flat-sprite', 'capture-atlas-sprite');
    atlasSprite.setAttribute('role', 'img');
    atlasSprite.setAttribute('aria-label', capture.name);
    return atlasSprite;
  }
  const fallback = document.createElement('span');
  fallback.className = `${detail ? 'capture-detail-sprite' : 'capture-flat-sprite'} capture-flat-sprite-fallback`;
  fallback.textContent = '◉';
  return fallback;
}

function sortedCaptureLogRows(rows, sort) {
  const tierValue = (capture) => tierRank(capture.tier);
  const numberValue = (capture, key) => Number(capture[key]) || 0;
  const sorted = rows.map(enrichCaptureLogEntry);
  if (sort === 'level-desc') return sorted.sort((a, b) => numberValue(b, 'level') - numberValue(a, 'level'));
  if (sort === 'level-asc') return sorted.sort((a, b) => numberValue(a, 'level') - numberValue(b, 'level'));
  if (sort === 'iv-desc') return sorted.sort((a, b) => numberValue(b, 'iv') - numberValue(a, 'iv'));
  if (sort === 'iv-asc') return sorted.sort((a, b) => numberValue(a, 'iv') - numberValue(b, 'iv'));
  if (sort === 'tier-desc') return sorted.sort((a, b) => tierValue(b) - tierValue(a));
  if (sort === 'tier-asc') return sorted.sort((a, b) => tierValue(a) - tierValue(b));
  if (sort === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if (sort === 'capture') return sorted.sort((a, b) =>
    Number(String(b.captureNumber).replace(/\D/g, '')) - Number(String(a.captureNumber).replace(/\D/g, ''))
  );
  return sorted.sort((a, b) => {
    const timeDifference = (captureTimestamp(b) || 0) - (captureTimestamp(a) || 0);
    if (timeDifference) return timeDifference;
    const captureDifference = Number(String(b.captureNumber || '').replace(/\D/g, '')) - Number(String(a.captureNumber || '').replace(/\D/g, ''));
    if (captureDifference) return captureDifference;
    return (Number(b.archivedAt) || 0) - (Number(a.archivedAt) || 0);
  });
}

function captureLogFilterDefaults() {
  return { days: '', number: '', names: [], ivMin: '', ivMax: '', powerMin: '', powerMax: '', ball: '', shiny: '' };
}

let captureArchiveDbPromise = null;

function openCaptureArchiveDb() {
  if (captureArchiveDbPromise) return captureArchiveDbPromise;
  captureArchiveDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CAPTURE_ARCHIVE_DB, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('captures')) {
        const store = request.result.createObjectStore('captures', { keyPath: 'archiveKey' });
        store.createIndex('accountIndex', 'accountIndex', { unique: false });
      }
      if (!request.result.objectStoreNames.contains('notifications')) {
        request.result.createObjectStore('notifications', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir el archivo de capturas.'));
  });
  return captureArchiveDbPromise;
}

async function persistLauncherNotifications(rows) {
  if (!rows.length) return;
  const db = await openCaptureArchiveDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('notifications', 'readwrite');
    const store = transaction.objectStore('notifications');
    rows.forEach((row) => store.put(row));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function hydrateNotificationArchive() {
  try {
    const db = await openCaptureArchiveDb();
    const rows = await new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readonly');
      const request = transaction.objectStore('notifications').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    const merged = new Map(launcherNotifications.map((notification) => [notification.id, notification]));
    rows.map(normalizeLauncherNotification).filter(Boolean).forEach((notification) => merged.set(notification.id, notification));
    launcherNotifications = [...merged.values()].sort((a, b) => b.createdAt - a.createdAt);
    await persistLauncherNotifications(launcherNotifications);
    notificationCounters = loadNotificationCounters();
    notificationSourceKeys = new Set(launcherNotifications
      .filter((notification) => notification.capture.sourceKey)
      .map((notification) => `${notification.accountIndex}:${notification.eventKind}:${notification.capture.sourceKey}`));
  } catch (error) {
    console.warn('No se pudo hidratar el historial permanente de notificaciones.', error);
  }
}

async function clearNotificationArchive() {
  try {
    const db = await openCaptureArchiveDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction('notifications', 'readwrite');
      transaction.objectStore('notifications').clear();
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {}
}

function captureArchiveIdentity(accountIndex, capture) {
  const captureNumber = Number(String(capture?.captureNumber || '').replace(/\D/g, ''));
  if (capture?.captureNumberTrusted !== false && Number.isFinite(captureNumber) && captureNumber > 0) return `${accountIndex}:number:${captureNumber}`;
  const id = String(capture?.id || capture?.recordId || capture?.key || '').trim();
  if (id) return `${accountIndex}:id:${id}`;
  return `${accountIndex}:fallback:${normalizeSearchText(capture?.name)}:${capture?.when || capture?.detectedAt || Date.now()}`;
}

function captureRowCompleteness(capture) {
  let score = 0;
  if (String(capture?.id || capture?.recordId || '').trim()) score += 12;
  if (String(capture?.name || '').trim()) score += 4;
  if (Number(capture?.level) > 0) score += 4;
  if (Number.isFinite(Number(capture?.iv))) score += 5;
  if (captureQualityNumber(capture)) score += 5;
  if (String(capture?.ball || '').trim()) score += 3;
  if (captureTimestamp(capture)) score += 5;
  if (capture?.captureNumberTrusted && Number(capture?.captureNumber) > 0) score += 4;
  if (String(capture?.sprite || '').trim() || Number(capture?.looktype) > 0) score += 2;
  if (Array.isArray(capture?.types) && capture.types.length) score += 2;
  score += ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed']
    .filter((key) => Number(capture?.stats?.[key]) > 0).length * 2;
  return score;
}

function durableCaptureRow(panel, capture) {
  const row = { ...capture };
  if (/^data:/i.test(row.sprite || '') && String(row.sprite).length > 100_000) row.sprite = '';
  row.accountIndex = panel.index;
  row.archiveKey = captureArchiveIdentity(panel.index, row);
  row.archivedAt = Number(row.archivedAt) || Date.now();
  row.dataCompleteness = captureRowCompleteness(row);
  return row;
}

function mergeCaptureArchiveRow(previous, incoming) {
  if (!previous) return incoming;
  const empty = (value) => value === '' || value === null || value === undefined ||
    (Array.isArray(value) && value.length === 0);
  const merged = { ...previous };
  const previousCompleteness = Number(previous.dataCompleteness) || captureRowCompleteness(previous);
  const incomingCompleteness = Number(incoming.dataCompleteness) || captureRowCompleteness(incoming);
  const incomingIsUpgrade = incomingCompleteness > previousCompleteness;
  const upgradeable = new Set([
    'level', 'iv', 'ivMax', 'quality', 'qualityValue', 'qualityMultiplier', 'tier', 'ball', 'when',
    'capturedAt', 'captureNumber', 'captureNumberTrusted', 'power', 'strength', 'sprite', 'looktype',
    'speciesId', 'gender', 'nature', 'statsSource', 'powerSource', 'strengthMultiplier'
  ]);
  Object.entries(incoming).forEach(([key, value]) => {
    if (key === 'archivedAt' || key === 'stats' || key === 'growth' || key === 'types') return;
    if (empty(merged[key]) && !empty(value)) merged[key] = value;
    else if (incomingIsUpgrade && upgradeable.has(key) && !empty(value)) merged[key] = value;
    else if (key === 'isShiny' && value === true) merged[key] = true;
  });
  for (const objectKey of ['stats', 'growth']) {
    const values = { ...(previous[objectKey] || {}) };
    Object.entries(incoming[objectKey] || {}).forEach(([key, value]) => {
      if (!(Number(values[key]) > 0) && Number(value) > 0) values[key] = Number(value);
    });
    if (Object.keys(values).length) merged[objectKey] = values;
  }
  if ((!Array.isArray(previous.types) || !previous.types.length) && Array.isArray(incoming.types) && incoming.types.length) {
    merged.types = incoming.types;
  } else if (incomingIsUpgrade && Array.isArray(incoming.types) && incoming.types.length) {
    merged.types = incoming.types;
  }
  const previousStatsComplete = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed']
    .every((key) => Number(previous.stats?.[key]) > 0);
  const incomingStatsComplete = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed']
    .every((key) => Number(incoming.stats?.[key]) > 0);
  if (!previousStatsComplete && incomingStatsComplete) {
    merged.stats = { ...incoming.stats };
    if (incoming.statsSource) merged.statsSource = incoming.statsSource;
    if (incoming.power) merged.power = incoming.power;
    if (incoming.strength) merged.strength = incoming.strength;
  }
  merged.archivedAt = previous.archivedAt;
  merged.dataCompleteness = Math.max(previousCompleteness, incomingCompleteness, captureRowCompleteness(merged));
  return merged;
}

async function ensureCaptureArchive(panel) {
  if (panel.captureArchiveLoaded) return panel.captureArchive;
  if (panel.captureArchivePromise) return panel.captureArchivePromise;
  panel.captureArchivePromise = (async () => {
    const db = await openCaptureArchiveDb();
    const rows = await new Promise((resolve, reject) => {
      const transaction = db.transaction('captures', 'readonly');
      const request = transaction.objectStore('captures').index('accountIndex').getAll(panel.index);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    rows.forEach((row) => panel.captureArchive.set(row.archiveKey, row));
    panel.captureArchiveLoaded = true;
    return panel.captureArchive;
  })().catch((error) => {
    console.warn('No se pudo cargar el archivo permanente de capturas.', error);
    panel.captureArchiveLoaded = true;
    return panel.captureArchive;
  });
  return panel.captureArchivePromise;
}

function archiveCaptureRows(panel, captures) {
  if (!panel || panel.captureLogPreview || panel.captureLogActionBusy || panel.captureArchiveResetPending ||
      !Array.isArray(captures) || !captures.length) return;
  const changed = [];
  const existingById = new Map([...panel.captureArchive.values()].map((entry) => [
    String(entry.id || entry.recordId || '').trim(), entry
  ]).filter(([id]) => id));
  captures.forEach((capture) => {
    if (!capture?.name) return;
    const row = durableCaptureRow(panel, capture);
    let previous = panel.captureArchive.get(row.archiveKey);
    if (!previous) {
      const stableId = String(row.id || row.recordId || '').trim();
      if (stableId) {
        previous = existingById.get(stableId);
        if (previous?.archiveKey) row.archiveKey = previous.archiveKey;
      }
    }
    const merged = mergeCaptureArchiveRow(previous, row);
    const signature = JSON.stringify(merged);
    if (signature === panel.captureArchiveSignatures.get(row.archiveKey)) return;
    panel.captureArchive.set(row.archiveKey, merged);
    const stableId = String(merged.id || merged.recordId || '').trim();
    if (stableId) existingById.set(stableId, merged);
    panel.captureArchiveSignatures.set(row.archiveKey, signature);
    changed.push(merged);
  });
  if (!changed.length) return;
  openCaptureArchiveDb().then((db) => {
    const transaction = db.transaction('captures', 'readwrite');
    const store = transaction.objectStore('captures');
    changed.forEach((row) => store.put(row));
  }).catch((error) => console.warn('No se pudo guardar el archivo de capturas.', error));
}

async function clearCaptureArchive(panel) {
  panel.captureArchive.clear();
  panel.captureArchiveSignatures.clear();
  const db = await openCaptureArchiveDb();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction('captures', 'readwrite');
    const index = transaction.objectStore('captures').index('accountIndex');
    const request = index.openKeyCursor(IDBKeyRange.only(panel.index));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      transaction.objectStore('captures').delete(cursor.primaryKey);
      cursor.continue();
    };
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function loadCaptureLogFilters(index) {
  try {
    const value = JSON.parse(localStorage.getItem(`captureLogFilters:${index}`) || 'null');
    return { ...captureLogFilterDefaults(), ...(value && typeof value === 'object' ? value : {}), names: Array.isArray(value?.names) ? value.names : [] };
  } catch {
    return captureLogFilterDefaults();
  }
}

function capturePowerNumber(value) {
  const text = String(value ?? '').trim().replace(/\s/g, '');
  if (!text) return null;
  const normalized = /^\d{1,3}(?:\.\d{3})+$/.test(text)
    ? text.replaceAll('.', '')
    : text.replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function captureStrengthNumber(capture) {
  const directStrength = capturePowerNumber(capture?.strength);
  if (directStrength !== null) return directStrength;
  const statKeys = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  if (statKeys.every((key) => Number(capture?.stats?.[key]) > 0)) {
    const tier = capture?.tier || captureTier(capture?.quality);
    const multiplier = captureQualityNumber(capture) || farmTierMultiplier(null, tier || capture?.quality);
    return Math.round(statKeys.reduce((sum, key) => sum + Number(capture.stats[key]), 0) * multiplier);
  }
  return capturePowerNumber(capture?.power);
}

function captureTimestamp(capture, now = Date.now()) {
  const exact = Number(capture?.capturedAt || capture?.detectedAt);
  if (Number.isFinite(exact) && exact > 0) return exact < 10_000_000_000 ? exact * 1000 : exact;
  const text = String(capture?.when || '').trim();
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(text)) {
    const isoTimestamp = Date.parse(text);
    if (Number.isFinite(isoTimestamp)) return isoTimestamp;
  }
  const dated = text.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dated) {
    const current = new Date(now);
    let year = dated[3] ? Number(dated[3]) : current.getFullYear();
    if (year < 100) year += 2000;
    let result = new Date(year, Number(dated[2]) - 1, Number(dated[1]), Number(dated[4] || 0), Number(dated[5] || 0), Number(dated[6] || 0)).getTime();
    if (!dated[3] && result > now + 86_400_000) result = new Date(year - 1, Number(dated[2]) - 1, Number(dated[1]), Number(dated[4] || 0), Number(dated[5] || 0), Number(dated[6] || 0)).getTime();
    return result;
  }
  const timed = text.match(/(?:^|\D)(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\D|$)/);
  if (timed) {
    const date = new Date(now);
    date.setHours(Number(timed[1]), Number(timed[2]), Number(timed[3] || 0), 0);
    if (date.getTime() > now + 60_000) date.setDate(date.getDate() - 1);
    return date.getTime();
  }
  return null;
}

function filteredCaptureLogRows(rows, filters, now = Date.now()) {
  const chosenNames = new Set((filters.names || []).map(normalizeSearchText));
  const days = Number(filters.days);
  const number = Number(filters.number);
  const ivMin = filters.ivMin === '' ? null : Number(filters.ivMin);
  const ivMax = filters.ivMax === '' ? null : Number(filters.ivMax);
  const powerMin = filters.powerMin === '' ? null : Number(filters.powerMin);
  const powerMax = filters.powerMax === '' ? null : Number(filters.powerMax);
  return rows.filter((capture) => {
    if (days > 0) {
      const timestamp = captureTimestamp(capture, now);
      if (!timestamp || now - timestamp > days * 86_400_000 || timestamp > now + 60_000) return false;
    }
    if (number > 0 && Number(String(capture.captureNumber || '').replace(/\D/g, '')) !== number) return false;
    if (chosenNames.size && !chosenNames.has(normalizeSearchText(capture.name))) return false;
    const iv = Number(capture.iv);
    if (Number.isFinite(ivMin) && (!Number.isFinite(iv) || iv < ivMin)) return false;
    if (Number.isFinite(ivMax) && (!Number.isFinite(iv) || iv > ivMax)) return false;
    const strength = captureStrengthNumber(capture);
    if (Number.isFinite(powerMin) && (strength === null || strength < powerMin)) return false;
    if (Number.isFinite(powerMax) && (strength === null || strength > powerMax)) return false;
    if (filters.ball && normalizeSearchText(capture.ball) !== normalizeSearchText(filters.ball)) return false;
    if (filters.shiny === 'shiny' && capture.isShiny !== true) return false;
    if (filters.shiny === 'normal' && capture.isShiny === true) return false;
    return true;
  });
}

function captureFiltersActive(filters) {
  return Object.entries(filters).some(([key, value]) => key === 'names' ? value.length > 0 : String(value) !== '');
}

function syncCaptureFilterOptions(panel, rows) {
  const nameValues = [...new Set(rows.map((row) => String(row.name || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const selectedNames = new Set(panel.captureFilters.names || []);
  selectedNames.forEach((name) => { if (!nameValues.includes(name)) nameValues.push(name); });
  const signature = nameValues.join('|');
  if (panel.captureNameOptionsSignature !== signature) {
    panel.captureNameOptionsSignature = signature;
    panel.captureFilterNames.replaceChildren(...nameValues.map((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.selected = selectedNames.has(name);
      return option;
    }));
  }
  const balls = [...new Set(rows.map((row) => String(row.ball || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  if (panel.captureFilters.ball && !balls.includes(panel.captureFilters.ball)) balls.push(panel.captureFilters.ball);
  const ballSignature = balls.join('|');
  if (panel.captureBallOptionsSignature !== ballSignature) {
    panel.captureBallOptionsSignature = ballSignature;
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'Todas';
    panel.captureFilterBall.replaceChildren(all, ...balls.map((ball) => {
      const option = document.createElement('option');
      option.value = ball;
      option.textContent = ball;
      return option;
    }));
    panel.captureFilterBall.value = panel.captureFilters.ball;
  }
}

function hideCaptureDetail(panel) {
  if (panel.captureDetailRow) {
    panel.captureDetailRow.classList.remove('is-detail-open');
    panel.captureDetailRow.setAttribute('aria-expanded', 'false');
  }
  panel.captureDetailKey = '';
  panel.captureDetailRow = null;
  panel.captureLogTooltip.hidden = true;
  delete panel.captureLogTooltip.dataset.tier;
  panel.captureLogTooltip.replaceChildren();
}

function showCaptureDetail(panel, capture, row) {
  if (panel.captureDetailRow && panel.captureDetailRow !== row) {
    panel.captureDetailRow.classList.remove('is-detail-open');
    panel.captureDetailRow.setAttribute('aria-expanded', 'false');
  }
  panel.captureDetailKey = String(capture.key || capture.id || capture.captureNumber || '');
  panel.captureDetailRow = row;
  row.classList.add('is-detail-open');
  row.setAttribute('aria-expanded', 'true');
  const tooltip = panel.captureLogTooltip;
  tooltip.dataset.tier = capture.tier || 'unknown';
  tooltip.replaceChildren();
  const head = document.createElement('div');
  head.className = 'capture-detail-head';
  const sprite = createCaptureLogSprite(capture, 58, true);
  const identity = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'capture-detail-name';
  name.textContent = `${capture.isShiny ? '✨ ' : ''}${capture.name}`;
  const types = document.createElement('div');
  types.className = 'capture-detail-types';
  (capture.types || []).forEach((type) => {
    const badge = document.createElement('span');
    badge.className = 'capture-detail-type';
    badge.textContent = type;
    types.appendChild(badge);
  });
  if (!types.childElementCount) {
    const badge = document.createElement('span');
    badge.className = 'capture-detail-type';
    badge.textContent = 'Tipo no disponible';
    types.appendChild(badge);
  }
  identity.append(name, types);
  head.append(sprite, identity);

  const summary = document.createElement('div');
  summary.className = 'capture-detail-summary';
  const quality = capture.quality || (capture.tier ? tierLabel(capture.tier) : 'Sin quality');
  const summaryItems = [
    ['Nivel', capture.level || capture.levelText || '—', 'is-level'],
    ['Quality', `${quality}${capture.qualityMultiplier ? ` ${capture.qualityMultiplier}` : ''}`, 'is-quality'],
    ['IV', capture.iv !== null && capture.iv !== undefined ? `${capture.iv}/${capture.ivMax || 192}` : '—', 'is-iv'],
    ['Ball', capture.ball || '—', 'is-ball'],
    ['Captura', `#${capture.captureNumber || '—'}`, 'is-number'],
    ['Hora', capture.when || '—', 'is-time']
  ];
  if (capture.gender) summaryItems.push(['Sexo', capture.gender, 'is-gender']);
  if (capture.nature) summaryItems.push(['Naturaleza', capture.nature, 'is-nature']);
  summaryItems.forEach(([label, value, className]) => {
    const item = document.createElement('span');
    item.className = className;
    const strong = document.createElement('b');
    strong.textContent = value;
    item.append(`${label} `, strong);
    summary.appendChild(item);
  });

  const stats = document.createElement('div');
  stats.className = 'capture-detail-stats';
  const statsTitle = document.createElement('div');
  statsTitle.className = 'capture-detail-stats-title';
  statsTitle.textContent = capture.statsSource === 'unavailable'
    ? 'Estadísticas exactas no disponibles'
    : 'Estadísticas del Pokémon';
  const statDefinitions = [
    ['HP', capture.stats?.hp, 'is-hp'],
    ['ATK', capture.stats?.attack, 'is-atk'],
    ['DEF', capture.stats?.defense, 'is-def'],
    ['SP. ATK', capture.stats?.specialAttack, 'is-spa'],
    ['SP. DEF', capture.stats?.specialDefense, 'is-spd'],
    ['VEL', capture.stats?.speed, 'is-speed']
  ];
  statDefinitions.forEach(([label, value, className]) => {
    const stat = document.createElement('span');
    stat.className = `capture-detail-stat ${className}`;
    const number = document.createElement('b');
    number.textContent = value ?? '—';
    stat.append(label, number);
    stats.appendChild(stat);
  });
  tooltip.append(head, summary, statsTitle, stats);
  if (capture.power) {
    const power = document.createElement('div');
    power.className = 'capture-detail-power';
    power.textContent = `💪 Fuerza ${capture.power}`;
    tooltip.appendChild(power);
  }
  tooltip.hidden = false;
  const panelRect = panel.captureLogPanel.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const preferredTop = rowRect.bottom - panelRect.top + 4;
  const top = preferredTop + tooltipRect.height <= panelRect.height - 8
    ? preferredTop
    : Math.max(8, rowRect.top - panelRect.top - tooltipRect.height - 4);
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.left = '9px';
}

function renderCaptureLog(panel, snapshot) {
  panel.captureLogSnapshot = snapshot?.ok ? snapshot : null;
  panel.captureLogState.classList.toggle('is-live', Boolean(snapshot?.ok));
  panel.captureLogState.classList.toggle('is-error', !snapshot?.ok);
  if (!snapshot?.ok) {
    panel.captureLogState.textContent = snapshot?.error || 'No fue posible leer Capture Log.';
    panel.captureLogList.replaceChildren();
    panel.captureLogCount.textContent = '0 capturas';
    hideCaptureDetail(panel);
    return;
  }
  panel.captureLogState.textContent = `En vivo · ${new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(snapshot.updatedAt)}`;
  panel.captureLogLastUpdate = Number(snapshot.updatedAt) || Date.now();
  const incomingRows = (snapshot.rows || []).map(enrichCaptureLogEntry);
  archiveCaptureRows(panel, incomingRows);
  const allRows = panel.captureLogPreview
    ? incomingRows
    : [...panel.captureArchive.values()].map(enrichCaptureLogEntry);
  syncCaptureFilterOptions(panel, allRows);
  panel.captureFilterBadge.hidden = !captureFiltersActive(panel.captureFilters);
  const filteredRows = filteredCaptureLogRows(allRows, panel.captureFilters);
  const reportedTotal = Math.max(Number(snapshot.total) || 0, allRows.length);
  const archiveLabel = `${allRows.length} guardada${allRows.length === 1 ? '' : 's'}`;
  panel.captureLogCount.textContent = captureFiltersActive(panel.captureFilters)
    ? `${filteredRows.length} de ${archiveLabel}${reportedTotal > allRows.length ? ` · ${reportedTotal} totales` : ''}`
    : reportedTotal > allRows.length
      ? `${archiveLabel} · ${reportedTotal} totales`
      : `${allRows.length} captura${allRows.length === 1 ? '' : 's'}`;
  const rows = sortedCaptureLogRows(filteredRows, panel.captureLogSort.value);
  const visibleRows = rows.slice(0, 500);
  const signature = `${panel.captureLogSort.value}|${JSON.stringify(panel.captureFilters)}|${rows.map((capture) => [
    capture.key, capture.level, capture.iv, capture.tier, capture.when, capture.power,
    Object.values(capture.stats || {}).join(',')
  ].join(':')).join('|')}`;
  if (signature === panel.captureLogSignature) return;
  panel.captureLogSignature = signature;
  hideCaptureDetail(panel);
  panel.captureLogList.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'capture-flat-empty';
    empty.textContent = captureFiltersActive(panel.captureFilters)
      ? 'No hay capturas que coincidan con los filtros seleccionados.'
      : 'Todavía no hay Pokémon capturados en esta sesión.';
    panel.captureLogList.appendChild(empty);
    return;
  }
  visibleRows.forEach((capture) => {
    const row = document.createElement('article');
    row.className = `capture-flat-row${capture.isShiny ? ' is-shiny' : ''}`;
    row.dataset.tier = capture.tier || 'unknown';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    row.setAttribute('aria-label', `Ver información de ${capture.name}`);
    const sprite = createCaptureLogSprite(capture, 40);
    const main = document.createElement('div');
    main.className = 'capture-flat-main';
    const name = document.createElement('strong');
    name.className = 'capture-flat-name';
    name.textContent = `${capture.isShiny ? '✨ ' : ''}${capture.name}`;
    const tags = document.createElement('div');
    tags.className = 'capture-flat-tags';
    [
      ['is-tier', capture.tier ? tierLabel(capture.tier) : (capture.quality || 'Sin tier')],
      ['is-iv', capture.iv !== null && capture.iv !== undefined ? `IV ${capture.iv}/${capture.ivMax || 192}` : 'IV —'],
      ['is-level', capture.level ? `Lv.${capture.level}` : (capture.levelText || 'Lv.—')]
    ].forEach(([className, text]) => {
      const tag = document.createElement('span');
      tag.className = `capture-flat-tag ${className}`;
      if (className === 'is-tier') tag.dataset.tier = capture.tier || 'unknown';
      tag.textContent = text;
      tags.appendChild(tag);
    });
    main.append(name, tags);
    const meta = document.createElement('div');
    meta.className = 'capture-flat-meta';
    const ball = document.createElement('strong');
    ball.className = 'capture-flat-ball';
    ball.textContent = capture.ball || 'Ball no disponible';
    const captureNumber = document.createElement('span');
    captureNumber.className = 'capture-flat-number';
    captureNumber.textContent = `N.º ${capture.captureNumber || '—'}`;
    meta.append(ball, captureNumber);
    const time = document.createElement('div');
    time.className = 'capture-flat-time';
    const timeLabel = document.createElement('strong');
    timeLabel.textContent = 'Capturada';
    const timeValue = document.createElement('span');
    timeValue.textContent = capture.when || '—';
    time.append(timeLabel, timeValue);
    row.append(sprite, main, meta, time);
    const toggleDetail = () => {
      const key = String(capture.key || capture.id || capture.captureNumber || '');
      if (!panel.captureLogTooltip.hidden && panel.captureDetailKey === key && panel.captureDetailRow === row) hideCaptureDetail(panel);
      else showCaptureDetail(panel, capture, row);
    };
    row.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleDetail();
    });
    row.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      toggleDetail();
    });
    panel.captureLogList.appendChild(row);
  });
  if (rows.length > visibleRows.length) {
    const note = document.createElement('p');
    note.className = 'capture-flat-empty';
    note.textContent = `Mostrando 500 de ${rows.length} capturas guardadas. Usa los filtros para localizar las demás.`;
    panel.captureLogList.appendChild(note);
  }
}

async function refreshPanelCaptureLogLegacy(panel) {
  if (!panel?.captureLogOpen || panel.captureLogPreview) return;
  try {
    await ensureCaptureArchive(panel);
    if (!pokemonReferenceIndex.size) {
      captureReferencePromise ||= loadCaptureReferenceCatalog(panel).catch(() => {}).finally(() => {
        captureReferencePromise = null;
      });
      await withTimeout(captureReferencePromise, PANEL_READ_TIMEOUT_MS, 'El catálogo de capturas no respondió a tiempo.');
    }
    const snapshot = await withTimeout(panel.webview.executeJavaScript(captureLogPanelSnapshotScript()), PANEL_READ_TIMEOUT_MS, 'Capture Log no respondió a tiempo.');
    renderCaptureLog(panel, snapshot);
  } catch (error) {
    renderCaptureLog(panel, { ok: false, error: cleanFarmError(error) });
  }
}

async function refreshPanelCaptureLog(panel, { force = false } = {}) {
  if (!panel?.captureLogOpen || panel.captureLogPreview || (panel.captureLogActionBusy && !force)) return;
  if (panel.captureLogReadPromise) {
    if (!force) return panel.captureLogReadPromise;
    await panel.captureLogReadPromise.catch(() => {});
  }
  const generation = Number(panel.captureLogReadGeneration) || 0;
  const readPromise = (async () => {
    try {
      await ensureCaptureArchive(panel);
      if (!pokemonReferenceIndex.size) {
        captureReferencePromise ||= loadCaptureReferenceCatalog(panel).catch(() => {}).finally(() => {
          captureReferencePromise = null;
        });
        await withTimeout(captureReferencePromise, PANEL_READ_TIMEOUT_MS, 'El catalogo de capturas no respondio a tiempo.');
      }
      const snapshot = await executePanelCaptureRead(
        panel,
        captureLogPanelSnapshotScript(),
        'Capture Log no respondio a tiempo.'
      );
      if (generation !== panel.captureLogReadGeneration || !panel.captureLogOpen) return;
      renderCaptureLog(panel, snapshot);
    } catch (error) {
      if (generation === panel.captureLogReadGeneration && panel.captureLogOpen) {
        renderCaptureLog(panel, { ok: false, error: cleanFarmError(error) });
      }
    }
  })();
  panel.captureLogReadPromise = readPromise;
  try {
    await readPromise;
  } finally {
    if (panel.captureLogReadPromise === readPromise) panel.captureLogReadPromise = null;
  }
}

async function pollCaptureLogs() {
  if (captureLogPollBusy) return;
  const activePanels = panels.filter((panel) => panel.captureLogOpen);
  if (!activePanels.length) return;
  captureLogPollBusy = true;
  try {
    await Promise.allSettled(activePanels.map(refreshPanelCaptureLog));
  } finally {
    captureLogPollBusy = false;
  }
}

async function deletePanelCaptureLog(panel) {
  if (!panel || panel.captureLogActionBusy) return;
  const accountName = accounts[panel.index]?.label || `Cuenta ${panel.index + 1}`;
  if (!window.confirm(`¿Eliminar todo el registro de capturas de ${accountName}? Esta acción no se puede deshacer.`)) return;
  panel.captureLogActionBusy = true;
  panel.captureLogReadGeneration += 1;
  panel.captureArchiveResetPending = true;
  panel.captureLogDeleteButton.disabled = true;
  panel.captureLogState.textContent = 'Eliminando el registro de capturas…';
  panel.captureLogState.classList.remove('is-live', 'is-error');
  hideCaptureDetail(panel);
  try {
    const result = await panel.webview.executeJavaScript(clearNativeCaptureLogScript());
    if (!result?.ok) throw new Error(result?.error || 'El juego no confirmó la eliminación.');
    await clearCaptureArchive(panel);
    panel.captureMonitorReady = true;
    panel.captureSignatureCounts.clear();
    panel.captureLogSignature = '';
    panel.captureLogSnapshot = null;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await refreshPanelCaptureLog(panel, { force: true });
  } catch (error) {
    renderCaptureLog(panel, { ok: false, error: cleanFarmError(error) });
  } finally {
    panel.captureArchiveResetPending = false;
    panel.captureLogActionBusy = false;
    panel.captureLogDeleteButton.disabled = false;
  }
}

function setCaptureLogOpen(panel, open) {
  panel.captureLogOpen = Boolean(open);
  panel.captureLogReadGeneration += 1;
  if (!panel.captureLogOpen) panel.captureLogPreview = false;
  panel.captureLogPanel.hidden = !panel.captureLogOpen;
  panel.captureLogButton.classList.toggle('is-active', panel.captureLogOpen);
  panel.captureLogButton.setAttribute('aria-expanded', String(panel.captureLogOpen));
  panel.captureLogButton.title = panel.captureLogOpen ? 'Cerrar Capture Log' : 'Abrir Capture Log';
  if (panel.captureLogOpen) {
    requestAnimationFrame(() => applyFloatGeometry(panel, 'capture'));
    if (panel.huntOpen) setHuntAnalyzerOpen(panel, false);
    panel.captureLogState.textContent = 'Conectando con Capture Log…';
    panel.captureLogState.classList.remove('is-live', 'is-error');
    if (!panel.captureLogPreview) refreshPanelCaptureLog(panel);
  } else {
    hideCaptureDetail(panel);
    panel.captureLogList.replaceChildren();
    panel.captureLogSignature = '';
  }
}

/*
 * Código histórico de preferencias de batalla retirado de la aplicación.
 * Se conserva temporalmente dentro de este comentario para migrar instalaciones
 * anteriores sin volver a exponer ni ejecutar esa funcionalidad.
function updateGamePreferenceButtons() {
  battleAlertsButton.classList.toggle('is-on', gamePreferences.battleNotifications);
  battleAlertsButton.setAttribute('aria-pressed', String(gamePreferences.battleNotifications));
  battleAlertsButton.querySelector('.toolbar-state-value').textContent = gamePreferences.battleNotifications ? 'ON' : 'OFF';
  battleAlertsButton.title = gamePreferences.battleNotifications ? 'Notificaciones de batalla activadas' : 'Notificaciones de batalla desactivadas';
  const cards = gamePreferences.battleView === 'cards';
  battleViewButton.classList.toggle('is-cards', cards);
  battleViewButton.setAttribute('aria-pressed', String(cards));
  battleViewButton.querySelector('.toolbar-state-value').textContent = cards ? 'Cards' : '3D';
  battleViewButton.title = cards ? 'Vista Cards activa; pulsar para usar 3D' : 'Vista 3D activa; pulsar para usar Cards';
}

function buildGamePreferencesScript(preferences, interactive = false) {
  const battleNotifications = preferences.battleNotifications !== false;
  const battleView = preferences.battleView === '3d' ? '3d' : 'cards';
  return `(async () => {
    const battleNotifications = ${JSON.stringify(battleNotifications)};
    const battleView = ${JSON.stringify(battleView)};
    const interactive = ${JSON.stringify(Boolean(interactive))};
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/\\s+/g, ' ')
      .toLowerCase()
      .trim();
    const visible = (element) => {
      if (!element || element.hidden) return false;
      if (element.dataset?.pgLauncherHuntSource || element.dataset?.pgLauncherMonitorSource) return true;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const waitFor = async (getter, timeout = 4500) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const value = getter();
        if (value) return value;
        await delay(100);
      }
      return null;
    };
    const descriptor = (button) => normalize([
      button.dataset?.pgLabel,
      button.getAttribute('aria-label'),
      button.getAttribute('title'),
      button.textContent,
      button.querySelector('img')?.alt,
      button.querySelector('img')?.src
    ].filter(Boolean).join(' '));

    localStorage.setItem('ui:battleView', battleView);
    document.documentElement.dataset.pgBattleNotifications = battleNotifications ? 'on' : 'off';
    let notificationStyle = document.querySelector('#pg-launcher-battle-notifications');
    if (!notificationStyle) {
      notificationStyle = document.createElement('style');
      notificationStyle.id = 'pg-launcher-battle-notifications';
      document.head.appendChild(notificationStyle);
    }
    notificationStyle.textContent = battleNotifications ? '' : [
      '.battle-notification', '.battle-toast', '.combat-toast', '.battle-message',
      '.battle-float', '.floating-damage', '.damage-popup', '[data-battle-notification="true"]'
    ].join(',') + '{display:none!important;visibility:hidden!important;}';

    if (!interactive) return { ok: true, battleNotifications, battleView, settingsApplied: false };
    let settings = document.querySelector('.cfg-window');
    if (!visible(settings)) {
      const settingsButton = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button')]
        .find((button) => /settings|configuracao|configuracoes|configuracion|icon_config/.test(descriptor(button)));
      settingsButton?.click();
      settings = await waitFor(() => {
        const element = document.querySelector('.cfg-window');
        return visible(element) ? element : null;
      });
    }
    if (!settings) return { ok: true, battleNotifications, battleView, settingsApplied: false };

    const rows = [...settings.querySelectorAll('.cfg-row')];
    const battleRow = rows.find((row) => /battle mode|modo de batalha|modo batalla/.test(normalize(row.textContent)));
    const desiredView = [...(battleRow?.querySelectorAll('button') || [])].find((button) => {
      const label = normalize(button.textContent);
      return battleView === '3d' ? /(^| )3d($| )/.test(label) : /cards|cartas/.test(label);
    });
    if (desiredView && !desiredView.classList.contains('on') && desiredView.getAttribute('aria-pressed') !== 'true') desiredView.click();

    const notificationRow = rows.find((row) => {
      const text = normalize(row.textContent);
      return /battle.*notif|notif.*battle|avisos.*batalla|notificaciones.*batalla|notificacoes.*batalha/.test(text);
    });
    let notificationSettingApplied = false;
    if (notificationRow) {
      const checkbox = notificationRow.querySelector('input[type="checkbox"]');
      const switchButton = notificationRow.querySelector('[role="switch"]');
      if (checkbox) {
        if (checkbox.checked !== battleNotifications) checkbox.click();
        notificationSettingApplied = true;
      } else if (switchButton) {
        const checked = switchButton.getAttribute('aria-checked') === 'true';
        if (checked !== battleNotifications) switchButton.click();
        notificationSettingApplied = true;
      } else {
        const desiredState = [...notificationRow.querySelectorAll('button')].find((button) => {
          const label = normalize(button.textContent);
          return battleNotifications
            ? /(^| )(on|ativado|activado|enabled|si|sim)($| )/.test(label)
            : /(^| )(off|desativado|desactivado|disabled|no)($| )/.test(label);
        });
        if (desiredState) {
          if (!desiredState.classList.contains('on') && desiredState.getAttribute('aria-pressed') !== 'true') desiredState.click();
          notificationSettingApplied = true;
        }
      }
    }
    settings.querySelector('.cfg-x')?.click();
    await delay(150);
    return { ok: true, battleNotifications, battleView, settingsApplied: true, notificationSettingApplied };
  })()`;
}

async function applyStoredGamePreferences(panel) {
  try {
    await panel.webview.executeJavaScript(buildGamePreferencesScript(gamePreferences, false));
  } catch {}
}

async function applyGlobalGamePreferences(changedButton) {
  saveGamePreferences();
  updateGamePreferenceButtons();
  changedButton.classList.add('is-busy');
  const results = await Promise.all(panels.map(async (panel) => {
    try {
      if (!panel.webview.getURL().startsWith(GAME_ORIGIN)) return false;
      const result = await panel.webview.executeJavaScript(buildGamePreferencesScript(gamePreferences, true));
      return Boolean(result?.ok);
    } catch {
      return false;
    }
  }));
  const applied = results.filter(Boolean).length;
  changedButton.classList.remove('is-busy');
  changedButton.title += ` · Aplicado en ${applied}/${ACCOUNT_COUNT} cuentas disponibles`;
}
*/

function farmAreaLabel(area) {
  const labels = {
    kanto: 'Kanto',
    outland: 'Outland',
    johto: 'Johto',
    orre: 'Orre',
    nightmare: 'Nightmare'
  };
  return labels[area] || String(area || 'Mapa')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function farmTargetLocationLabel(target) {
  const map = String(target?.mapName || target?.map || '').trim();
  const area = String(target?.areaName || target?.area || '').trim();
  if (map && area && normalizeSearchText(map) !== normalizeSearchText(area)) {
    return `${farmAreaLabel(map)} · ${farmAreaLabel(area)}`;
  }
  return farmAreaLabel(area || map);
}

function setFarmGlobalState(text, state = '') {
  farmGlobalState.textContent = text;
  farmGlobalState.classList.toggle('is-ready', state === 'ready');
  farmGlobalState.classList.toggle('is-busy', state === 'busy');
}

function setFarmMessage(text, kind = '') {
  farmMessage.textContent = text;
  farmMessage.classList.toggle('is-ok', kind === 'ok');
}

function pokeApiSpeciesSlug(target) {
  const rawName = String(target?.name || target?.slug || '').trim();
  if (!rawName) return '';
  const preparedName = rawName.replace(/♀/g, ' female ').replace(/♂/g, ' male ');
  const keys = pokemonReferenceKeys(preparedName);
  const baseName = keys[keys.length - 1] || keys[0] || '';
  const normalized = normalizeSearchText(baseName)
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const aliases = {
    'nidoran-female': 'nidoran-f',
    'nidoran-male': 'nidoran-m',
    'farfetch-d': 'farfetchd',
    'sirfetch-d': 'sirfetchd'
  };
  return aliases[normalized] || normalized;
}

async function resolvePokeApiSpeciesId(target) {
  const directId = Math.max(0, Number(target?.spriteSpeciesId || target?.speciesId) || 0);
  const slug = pokeApiSpeciesSlug(target);
  const referenceKeys = pokemonReferenceKeys(target?.name || target?.slug);
  const isGameVariant = referenceKeys.length > 1;
  if (!isGameVariant && Number.isInteger(directId) && directId > 0 && directId <= 2_000) return directId;
  if (slug && typeof window.pokeGrid?.resolvePokemonSpecies === 'function') {
    if (!pokeApiSpeciesCache.has(slug)) {
      const request = window.pokeGrid.resolvePokemonSpecies(slug)
        .then((result) => Math.max(0, Number(result?.id) || 0))
        .catch(() => 0);
      rememberLauncherCache(pokeApiSpeciesCache, slug, request, 256);
    }
    const resolvedId = await pokeApiSpeciesCache.get(slug);
    if (resolvedId) return resolvedId;
  }
  return Number.isInteger(directId) && directId > 0 && directId <= 2_000 ? directId : 0;
}

async function loadPokeApiSpriteData(speciesId) {
  const id = Math.max(0, Number(speciesId) || 0);
  if (!id || typeof window.pokeGrid?.loadImageDataUrl !== 'function') return '';
  if (!pokeApiSpriteCache.has(id)) {
    const paths = [
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
    ];
    const request = (async () => {
      for (const url of paths) {
        try {
          const dataUrl = await window.pokeGrid.loadImageDataUrl(url);
          if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) return dataUrl;
        } catch {}
      }
      return '';
    })();
    rememberLauncherCache(pokeApiSpriteCache, id, request, 64);
  }
  return pokeApiSpriteCache.get(id);
}

function createFarmSprite(target, size = 48) {
  const sprite = document.createElement('span');
  sprite.className = 'farm-sprite is-pokeapi is-loading';
  sprite.style.width = `${size}px`;
  sprite.style.height = `${size}px`;
  sprite.setAttribute('role', 'img');
  sprite.setAttribute('aria-label', target?.name ? `Sprite de ${target.name}` : 'Sprite de Pokémon');
  if (!target) {
    sprite.classList.remove('is-loading', 'is-pokeapi');
    sprite.classList.add('is-empty');
    sprite.textContent = '?';
    return sprite;
  }
  const image = document.createElement('img');
  image.className = 'farm-sprite-image';
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  sprite.appendChild(image);
  (async () => {
    const speciesId = await resolvePokeApiSpeciesId(target);
    const dataUrl = await loadPokeApiSpriteData(speciesId);
    sprite.classList.remove('is-loading');
    if (!dataUrl) {
      image.remove();
      sprite.classList.remove('is-pokeapi');
      sprite.classList.add('is-empty');
      sprite.textContent = '◌';
      return;
    }
    image.src = dataUrl;
    image.dataset.loaded = 'true';
    sprite.dataset.speciesId = String(speciesId);
  })();
  return sprite;
}

function huntAnalyzerSnapshotScript() {
  const readHuntAnalyzer = async () => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const normalized = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const ownText = (element) => clean([...element?.childNodes || []]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' '));
    const waitFor = async (getter, timeout = 5000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const result = getter();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return null;
    };
    const findDialog = () => {
      const themed = document.querySelector('[data-pg-launcher-hunt-source="true"], .ha-window, [data-pg-launcher-monitor-source="hunt"], [data-pg-hunt-dialog="true"]');
      if (themed) return themed;
      return [...document.querySelectorAll('[role="dialog"], [aria-modal="true"], body > div, body > section')]
        .filter((element) => {
          const text = normalized(element.textContent);
          return /hunt analyzer/.test(text) && /defeated|derrotad|abatid/.test(text) &&
            /time in hunt|tempo na hunt|tiempo en hunt/.test(text) &&
            /captured|capturad/.test(text);
        })
        .sort((left, right) => left.querySelectorAll('*').length - right.querySelectorAll('*').length)[0] || null;
    };
    let dialog = findDialog();
    if (!dialog) {
      const descriptor = (button) => normalized([
        button.dataset?.pgLabel, button.getAttribute('aria-label'), button.getAttribute('title'),
        button.textContent, button.querySelector('img')?.alt, button.querySelector('img')?.src
      ].filter(Boolean).join(' '));
      const trigger = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button, button, [role="button"]')]
        .find((button) => /hunt analyzer|hunt_analyzer|analisador de hunt/.test(descriptor(button)));
      trigger?.click();
      dialog = await waitFor(findDialog);
    }
    if (!dialog) return { ok: false, error: 'Hunt Analyzer todavía no está disponible en esta sesión.' };

    dialog.dataset.pgLauncherHuntSource = 'true';
    dialog.style.setProperty('position', 'fixed', 'important');
    dialog.style.setProperty('left', '-10000px', 'important');
    dialog.style.setProperty('top', '0px', 'important');
    dialog.style.setProperty('opacity', '0', 'important');
    dialog.style.setProperty('visibility', 'hidden', 'important');
    dialog.style.setProperty('pointer-events', 'none', 'important');
    document.documentElement.classList.remove('pg-hunt-analyzer-open');

    const all = [...dialog.querySelectorAll('*')];
    const findLabel = (pattern) => all.find((element) => pattern.test(normalized(ownText(element)))) || null;
    const metricCard = (label) => {
      if (!label) return null;
      const themedCard = label.closest('.pg-hunt-card, .pg-hunt-balance');
      if (themedCard) return themedCard;
      let current = label.parentElement;
      for (let depth = 0; current && current !== dialog && depth < 5; depth += 1) {
        if (current.querySelector('strong, b, output, [class*="value"], [class*="amount"]')) return current;
        current = current.parentElement;
      }
      return label.parentElement;
    };
    const readCardValue = (card, labelElement = null) => {
      if (!card) return '—';
      const explicit = card.querySelector(':scope > strong, :scope > b, :scope > output, :scope > [class*="value"], :scope > [class*="amount"], strong, b, output, [class*="value"], [class*="amount"]');
      if (clean(explicit?.textContent)) return clean(explicit.textContent);
      const candidates = [...card.querySelectorAll('*')]
        .filter((element) => element !== labelElement && element.children.length === 0)
        .map((element) => clean(element.textContent))
        .filter((text) => text && /(?:\d|—)/.test(text) && !/^(defeated|time|xp gained|captured|loot|supply|balance)/i.test(text));
      const candidate = candidates.sort((left, right) => left.length - right.length)[0];
      if (candidate) return candidate;
      const fullText = clean(card.textContent);
      const labelText = clean(labelElement?.textContent);
      const remainder = clean(labelText ? fullText.replace(labelText, '') : fullText);
      return remainder && /(?:\d|—)/.test(remainder) ? remainder : '—';
    };
    const readDetail = (card, labelElement, labelText = '') => {
      const parenthetical = clean(labelText).match(/\(([^)]+)\)/)?.[1] || '';
      const small = [...card?.querySelectorAll('small') || []]
        .filter((element) => element !== labelElement)
        .map((element) => clean(element.textContent))
        .filter((text) => text && normalized(text) !== normalized(labelText));
      return [parenthetical, ...small].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' · ');
    };
    const readMetric = (key, label, pattern, kind, nativeSelector = '') => {
      const nativeCard = nativeSelector ? dialog.querySelector(nativeSelector) : null;
      const labelElement = nativeCard
        ? [...nativeCard.querySelectorAll('*')].find((element) => pattern.test(normalized(ownText(element)))) || null
        : findLabel(pattern);
      const card = nativeCard || metricCard(labelElement);
      if (!card) return { key, label, value: '—', detail: '', kind };
      return {
        key,
        label,
        value: readCardValue(card, labelElement),
        detail: readDetail(card, labelElement, ownText(labelElement)),
        kind
      };
    };
    const baseMetrics = [
      readMetric('defeated', 'Derrotados', /^(defeated|derrotados?|abatidos?)\b/, 'default', '.ha-grid > .ha-card:not(.ha-xp):not(.ha-catch):nth-child(1)'),
      readMetric('time', 'Tiempo de caza', /^(time in hunt|tempo na hunt|tiempo en hunt)\b/, 'time', '.ha-grid > .ha-card:not(.ha-xp):not(.ha-catch):nth-child(2)'),
      readMetric('xp', 'XP obtenida', /^xp (gained|ganha|ganada)\b/, 'xp', '.ha-card.ha-xp'),
      readMetric('captured', 'Capturados', /^(captured|capturados?)\b/, 'capture', '.ha-card.ha-catch'),
      readMetric('loot', 'Botín', /^(loot|botin)\b/, 'loot', '.ha-card.ha-loot'),
      readMetric('supply', 'Suministros', /^(supply|suministros?|suprimentos?)\b/, 'supply', '.ha-card.ha-supply')
    ];
    const nativeRates = [...dialog.querySelectorAll('.ha-rates > .ha-rate')];
    const rateDefinitions = [
      ['lootRate', 'Botín por hora', /^(loot|botin).*(per hour|por hora)|^(loot|botin)\/h/, 0],
      ['xpRate', 'XP por hora', /^xp.*(per hour|por hora)|^xp\/h/, 1],
      ['killRate', 'Derrotados por hora', /^(kills|defeated|derrotados?|abatidos?).*(per hour|por hora)/, 2]
    ];
    const rateMetrics = rateDefinitions.map(([key, label, pattern, index]) => {
      const nativeRate = nativeRates[index];
      if (!nativeRate) return readMetric(key, label, pattern, 'rate');
      return { key, label, value: readCardValue(nativeRate), detail: '', kind: 'rate' };
    });
    const metrics = [...baseMetrics, ...rateMetrics];
    const balanceLabel = findLabel(/^(balance|saldo)(\s|$)/);
    const balanceCard = dialog.querySelector('.ha-balance') || metricCard(balanceLabel);
    const balance = readCardValue(balanceCard, balanceLabel);
    const marketControl = dialog.querySelector('.ha-market-toggle');
    const marketLabel = marketControl || findLabel(/market prices|preco.*mercado|precio.*mercado/);
    const market = marketLabel ? {
      label: clean((marketControl || marketLabel.closest('label') || marketLabel.parentElement)?.textContent || marketLabel.textContent),
      enabled: Boolean((marketControl || marketLabel.closest('label'))?.querySelector('input')?.checked)
    } : null;
    const dropsScope = dialog.querySelector('.ha-drops, .pg-hunt-drops') || (() => {
      const title = findLabel(/session drops|drops da sessao|drops de la sesion/);
      let scope = title?.parentElement || null;
      for (let depth = 0; scope && scope !== dialog && depth < 6; depth += 1) {
        if (scope.querySelector('tbody tr, .ha-drop')) return scope;
        scope = scope.parentElement;
      }
      return title?.closest('section, article') || null;
    })();
    const itemCatalog = await (window.__pokeGridHuntItemCatalogPromise ||= fetch('/game/items.json')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('items')))
      .then((payload) => {
        const rows = Array.isArray(payload) ? payload : (payload.items || []);
        const byId = {};
        const byName = {};
        rows.forEach((item) => {
          const icon = clean(item.iconUrl || item.icon || item.image);
          if (!icon) return;
          const absoluteIcon = new URL(icon, location.origin).href;
          const id = Number(item.id ?? item.itemId);
          if (Number.isFinite(id)) byId[String(id)] = absoluteIcon;
          if (item.name) byName[normalized(item.name)] = absoluteIcon;
        });
        return { byId, byName };
      })
      .catch(() => ({ byId: {}, byName: {} })));
    const reactRowKey = (row) => {
      const fiberKey = Object.keys(row).find((key) => key.startsWith('__reactFiber$'));
      let fiber = fiberKey ? row[fiberKey] : null;
      for (let depth = 0; fiber && depth < 12; depth += 1, fiber = fiber.return) {
        const key = clean(fiber.key);
        if (key && /^\d+$/.test(key)) return Number(key);
      }
      return null;
    };
    const nativeDrops = [...dropsScope?.querySelectorAll('.ha-drop') || []].map((row) => ({
      itemId: reactRowKey(row),
      name: clean(row.querySelector('.ha-drop-name')?.textContent),
      quantity: clean(row.querySelector('.ha-drop-qty')?.textContent),
      price: clean(row.querySelector('.ha-drop-price')?.textContent),
      total: clean(row.querySelector('.ha-drop-gold')?.textContent),
      icon: row.querySelector('.ha-drop-ico img')?.src || row.querySelector('img')?.src || ''
    })).filter((drop) => drop.name);
    const tableDrops = [...dropsScope?.querySelectorAll('tbody tr') || []].map((row) => {
      const cells = [...row.querySelectorAll('td')].map((cell) => clean(cell.textContent));
      return {
        itemId: reactRowKey(row),
        name: cells[0] || '',
        quantity: cells[1] || '',
        price: cells[2] || '',
        total: cells[3] || cells[2] || ''
      };
    }).filter((drop) => drop.name);
    const drops = (nativeDrops.length ? nativeDrops : tableDrops).map((drop) => ({
      ...drop,
      icon: drop.icon ||
        (drop.itemId ? itemCatalog.byId[String(drop.itemId)] : '') ||
        itemCatalog.byName[normalized(drop.name)] ||
        ''
    }));
    const noteElement = findLabel(/values at npc|valores.*preco.*npc|valores.*precio.*npc|counters reset|contadores/);
    return {
      ok: true,
      metrics,
      balance,
      market,
      drops,
      note: clean(noteElement?.textContent),
      updatedAt: Date.now()
    };
  };
  return `(${readHuntAnalyzer.toString()})()`;
}

function clearNativeHuntAnalyzerScript() {
  const clearHuntAnalyzer = () => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const dialog = document.querySelector('[data-pg-launcher-hunt-source="true"], .ha-window, [data-pg-hunt-dialog="true"]');
    if (!dialog) return { ok: false, error: 'No se encontró la sesión activa.' };
    const button = dialog.querySelector('.ha-clear') || [...dialog.querySelectorAll('button')]
      .find((candidate) => /clear|reset|limpiar|reiniciar|excluir|apagar/.test(clean([
        candidate.title,
        candidate.getAttribute('aria-label'),
        candidate.textContent
      ].filter(Boolean).join(' '))));
    if (!button) return { ok: false, error: 'El juego no expone el control para eliminar esta sesión.' };
    button.click();
    return { ok: true };
  };
  return `(${clearHuntAnalyzer.toString()})()`;
}

async function hydrateHuntDropIcons(snapshot) {
  if (!snapshot?.drops?.length || typeof window.pokeGrid?.loadImageDataUrl !== 'function') return snapshot;
  await Promise.all(snapshot.drops.map(async (drop) => {
    if (!/^https:\/\//i.test(drop.icon || '')) return;
    let request = huntDropIconCache.get(drop.icon);
    if (!request) {
      request = window.pokeGrid.loadImageDataUrl(drop.icon).catch(() => '');
      rememberLauncherCache(huntDropIconCache, drop.icon, request, 48);
    }
    const dataUrl = await request;
    if (dataUrl) drop.icon = dataUrl;
  }));
  return snapshot;
}

function parseHuntDuration(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === '—') return null;
  const clock = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1] || 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const hours = Number(text.match(/(\d+)\s*h/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+)\s*m/)?.[1] || 0);
  const seconds = Number(text.match(/(\d+)\s*s/)?.[1] || 0);
  return hours || minutes || seconds || /0\s*s/.test(text) ? hours * 3600 + minutes * 60 + seconds : null;
}

function formatHuntDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${remainder}s`;
}

function updatePanelLiveClocks() {
  const now = Date.now();
  const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  panels.forEach((panel) => {
    if (panel.captureLogOpen && panel.captureLogState.classList.contains('is-live') && panel.captureLogLastUpdate) {
      const age = Math.max(0, Math.floor((now - panel.captureLogLastUpdate) / 1000));
      panel.captureLogState.textContent = `En vivo · ${timeFormat.format(panel.captureLogLastUpdate)} · hace ${age}s`;
    }
    if (panel.huntOpen && panel.huntState.classList.contains('is-live') && panel.huntLastUpdate) {
      const age = Math.max(0, Math.floor((now - panel.huntLastUpdate) / 1000));
      panel.huntState.textContent = `En vivo · ${timeFormat.format(panel.huntLastUpdate)} · hace ${age}s`;
      const timer = panel.huntContent.querySelector('[data-metric-key="time"]');
      if (timer && Number.isFinite(panel.huntElapsedBase) && panel.huntElapsedAt) {
        timer.textContent = formatHuntDuration(panel.huntElapsedBase + ((now - panel.huntElapsedAt) / 1000));
      }
    }
  });
  if (!statisticsBackdrop.hidden && statisticsRows.length) {
    statisticsRows.forEach((row) => {
      const baseSeconds = parseHuntDuration(statisticMetric(row.hunt, 'time'));
      const updatedAt = Number(row.hunt?.updatedAt);
      if (baseSeconds === null || !updatedAt) return;
      const liveValue = formatHuntDuration(baseSeconds + Math.max(0, (now - updatedAt) / 1000));
      const cardValue = statisticsAccounts.querySelector(`.statistics-account-card[data-account-index="${row.index}"] [data-statistic-kind="time"] b`);
      if (cardValue) {
        cardValue.textContent = liveValue;
        cardValue.title = liveValue;
      }
      const comparisonValue = statisticsComparisonTable.querySelector(`[data-comparison-account="${row.index}"][data-comparison-key="time"]`);
      if (comparisonValue) {
        comparisonValue.textContent = liveValue;
        comparisonValue.title = liveValue;
      }
    });
  }
}

function renderHuntAnalyzer(panel, snapshot) {
  if (snapshot?.ok) panel.huntSnapshot = snapshot;
  panel.huntContent.replaceChildren();
  panel.huntState.classList.toggle('is-live', Boolean(snapshot?.ok));
  panel.huntState.classList.toggle('is-error', !snapshot?.ok);
  if (!snapshot?.ok) {
    panel.huntState.textContent = snapshot?.error || 'No fue posible leer Hunt Analyzer.';
    return;
  }
  panel.huntLastUpdate = Number(snapshot.updatedAt) || Date.now();
  const nativeTime = snapshot.metrics.find((metric) => metric.key === 'time');
  const nativeSeconds = parseHuntDuration(nativeTime?.value);
  if (nativeSeconds !== null && nativeSeconds !== panel.huntNativeSeconds) {
    panel.huntNativeSeconds = nativeSeconds;
    panel.huntElapsedBase = nativeSeconds;
    panel.huntElapsedAt = panel.huntLastUpdate;
  }
  panel.huntState.textContent = `En vivo · ${new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(snapshot.updatedAt)}`;
  const metricGrid = document.createElement('div');
  metricGrid.className = 'hunt-flat-metrics';
  const metricIcons = {
    defeated: 'skull', time: 'clock', xp: 'star', captured: 'pokeball', loot: 'moneybag',
    supply: 'trend', lootRate: 'chart', xpRate: 'sparkle', killRate: 'swords'
  };
  snapshot.metrics.forEach((metric) => {
    const card = document.createElement('article');
    card.className = `hunt-flat-metric is-${metric.kind}`;
    card.dataset.metricCard = metric.key;
    if (/^-/.test(metric.value)) card.classList.add('is-negative');
    if (/^\+/.test(metric.value)) card.classList.add('is-positive');
    const icon = document.createElement('span');
    icon.className = `hunt-flat-metric-icon is-${metric.key}`;
    icon.innerHTML = launcherUiIcon(metricIcons[metric.key] || 'star');
    const copy = document.createElement('div');
    copy.className = 'hunt-flat-metric-copy';
    const label = document.createElement('span');
    label.textContent = metric.label;
    const value = document.createElement('b');
    value.textContent = metric.value;
    value.dataset.metricKey = metric.key;
    copy.append(label, value);
    if (metric.detail) {
      const detail = document.createElement('small');
      detail.textContent = metric.detail;
      copy.appendChild(detail);
    }
    card.append(icon, copy);
    metricGrid.appendChild(card);
  });
  const balance = document.createElement('div');
  balance.className = 'hunt-flat-balance';
  balance.classList.toggle('is-negative', /^-/.test(snapshot.balance));
  const balanceIcon = document.createElement('span');
  balanceIcon.className = 'hunt-flat-balance-icon';
  balanceIcon.innerHTML = launcherUiIcon('wallet');
  const balanceLabel = document.createElement('span');
  balanceLabel.textContent = 'Balance';
  const balanceValue = document.createElement('b');
  balanceValue.textContent = snapshot.balance;
  balance.append(balanceIcon, balanceLabel, balanceValue);
  panel.huntContent.append(metricGrid, balance);
  if (snapshot.market) {
    const market = document.createElement('p');
    market.className = 'hunt-flat-market';
    market.textContent = `${snapshot.market.enabled ? '☑' : '☐'} ${snapshot.market.label}`;
    panel.huntContent.appendChild(market);
  }
  const drops = document.createElement('section');
  drops.className = 'hunt-flat-drops';
  const dropsTitle = document.createElement('h3');
  dropsTitle.className = 'hunt-flat-section-title';
  dropsTitle.innerHTML = `${launcherUiIcon('gift')}<span>Drops de la sesión · ${snapshot.drops.length}</span>`;
  drops.appendChild(dropsTitle);
  if (!snapshot.drops.length) {
    const empty = document.createElement('p');
    empty.className = 'hunt-flat-note';
    empty.textContent = 'Todavía no hay drops registrados en esta caza.';
    drops.appendChild(empty);
  } else {
    snapshot.drops.forEach((drop) => {
      const row = document.createElement('div');
      row.className = 'hunt-flat-drop';
      if (drop.icon) {
        const icon = document.createElement('img');
        icon.className = 'hunt-flat-drop-icon';
        icon.src = drop.icon;
        icon.alt = '';
        row.appendChild(icon);
      } else {
        row.classList.add('has-no-icon');
      }
      const name = document.createElement('span');
      name.className = 'hunt-flat-drop-name';
      name.textContent = drop.name;
      name.title = drop.price ? `Precio unitario: ${drop.price}` : drop.name;
      const quantity = document.createElement('span');
      quantity.className = 'hunt-flat-drop-quantity';
      quantity.textContent = drop.quantity;
      const total = document.createElement('strong');
      total.className = 'hunt-flat-drop-total';
      total.textContent = drop.total;
      row.append(name, quantity, total);
      drops.appendChild(row);
    });
  }
  panel.huntContent.appendChild(drops);
  if (snapshot.note) {
    const note = document.createElement('p');
    note.className = 'hunt-flat-note';
    note.textContent = snapshot.note;
    panel.huntContent.appendChild(note);
  }
}

async function refreshPanelHuntAnalyzer(panel) {
  if (!panel?.huntOpen || panel.huntPreview) return;
  try {
    const snapshot = await withTimeout(panel.webview.executeJavaScript(huntAnalyzerSnapshotScript()), PANEL_READ_TIMEOUT_MS, 'Hunt Analyzer no respondió a tiempo.');
    await withTimeout(hydrateHuntDropIcons(snapshot), 4000, 'Los iconos de Hunt Analyzer tardaron demasiado.').catch(() => snapshot);
    renderHuntAnalyzer(panel, snapshot);
  } catch (error) {
    renderHuntAnalyzer(panel, { ok: false, error: cleanFarmError(error) });
  }
}

async function resetPanelHuntAnalyzer(panel) {
  if (!panel || panel.huntActionBusy) return;
  panel.huntActionBusy = true;
  panel.huntResetButton.disabled = true;
  panel.huntState.textContent = 'Reiniciando la lectura en vivo…';
  panel.huntState.classList.remove('is-live', 'is-error');
  panel.huntContent.replaceChildren();
  try {
    await refreshPanelHuntAnalyzer(panel);
  } finally {
    panel.huntActionBusy = false;
    panel.huntResetButton.disabled = false;
  }
}

async function deletePanelHuntSession(panel) {
  if (!panel || panel.huntActionBusy) return;
  const accountName = accounts[panel.index]?.label || `Cuenta ${panel.index + 1}`;
  if (!window.confirm(`¿Eliminar los contadores de la sesión Hunt Analyzer de ${accountName}?`)) return;
  panel.huntActionBusy = true;
  panel.huntDeleteButton.disabled = true;
  panel.huntState.textContent = 'Eliminando la sesión actual…';
  panel.huntState.classList.remove('is-live', 'is-error');
  try {
    const result = await panel.webview.executeJavaScript(clearNativeHuntAnalyzerScript());
    if (!result?.ok) throw new Error(result?.error || 'El juego no confirmó la eliminación.');
    await new Promise((resolve) => setTimeout(resolve, 250));
    await refreshPanelHuntAnalyzer(panel);
  } catch (error) {
    renderHuntAnalyzer(panel, { ok: false, error: cleanFarmError(error) });
  } finally {
    panel.huntActionBusy = false;
    panel.huntDeleteButton.disabled = false;
  }
}

async function pollHuntAnalyzers() {
  if (huntPollBusy) return;
  const activePanels = panels.filter((panel) => panel.huntOpen);
  if (!activePanels.length) return;
  huntPollBusy = true;
  try {
    await Promise.allSettled(activePanels.map(refreshPanelHuntAnalyzer));
  } finally {
    huntPollBusy = false;
  }
}

function setHuntAnalyzerOpen(panel, open) {
  panel.huntOpen = Boolean(open);
  if (!panel.huntOpen) panel.huntPreview = false;
  panel.huntPanel.hidden = !panel.huntOpen;
  panel.huntButton.classList.toggle('is-active', panel.huntOpen);
  panel.huntButton.setAttribute('aria-expanded', String(panel.huntOpen));
  panel.huntButton.title = panel.huntOpen ? 'Cerrar Hunt Analyzer' : 'Abrir Hunt Analyzer';
  if (panel.huntOpen) {
    requestAnimationFrame(() => applyFloatGeometry(panel, 'hunt'));
    if (panel.captureLogOpen) setCaptureLogOpen(panel, false);
    panel.huntState.textContent = 'Conectando con la sesión…';
    panel.huntState.classList.remove('is-live', 'is-error');
    if (!panel.huntPreview) refreshPanelHuntAnalyzer(panel);
  } else {
    panel.huntContent.replaceChildren();
  }
}

function setPanelState(panel, status, text) {
  panel.element.classList.toggle('is-online', status === 'online');
  panel.element.classList.toggle('is-error', status === 'error');
  panel.status.textContent = text;
}

function getStoredZoom(index) {
  const value = Number(localStorage.getItem(`panelZoom:${index}`));
  return Number.isFinite(value) && value >= MIN_ZOOM && value <= MAX_ZOOM ? value : 1;
}

function updateZoom(panel, nextZoom) {
  panel.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(nextZoom * 10) / 10));
  panel.zoomLabel.textContent = `${Math.round(panel.zoom * 100)}%`;
  localStorage.setItem(`panelZoom:${panel.index}`, String(panel.zoom));
  try {
    panel.webview.setZoomFactor(panel.zoom);
  } catch {}
}

async function applyGameTheme(panel) {
  try {
    await panel.webview.executeJavaScript(window.pokeGridTheme.buildInstallScript());
  } catch {}
}

function toggleExpanded(panel) {
  const willExpand = expandedPanel !== panel;
  panels.forEach((item) => item.element.classList.remove('is-expanded'));
  expandedPanel = willExpand ? panel : null;
  if (expandedPanel) expandedPanel.element.classList.add('is-expanded');
  grid.classList.toggle('has-expanded', Boolean(expandedPanel));
  panels.forEach((item) => {
    item.expandButton.textContent = item === expandedPanel ? '↙' : '⛶';
    item.expandButton.title = item === expandedPanel ? 'Volver al grid' : 'Agrandar panel';
  });
}

function restoreGrid() {
  if (expandedPanel) toggleExpanded(expandedPanel);
}

function loadVisibleAccountIndexes() {
  try {
    const stored = JSON.parse(localStorage.getItem(GRID_VISIBLE_KEY) || '[]');
    const valid = [...new Set(stored.map(Number).filter((index) => index >= 0 && index < ACCOUNT_COUNT))];
    if (valid.length) return new Set(valid);
  } catch {}
  const legacyCount = Math.max(1, Math.min(ACCOUNT_COUNT, Number(localStorage.getItem(GRID_VIEW_KEY)) || ACCOUNT_COUNT));
  return new Set(Array.from({ length: legacyCount }, (_, index) => index));
}

function loadPanelOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(GRID_ORDER_KEY) || '[]').map(Number);
    if (stored.length === ACCOUNT_COUNT && new Set(stored).size === ACCOUNT_COUNT && stored.every((index) => index >= 0 && index < ACCOUNT_COUNT)) return stored;
  } catch {}
  return Array.from({ length: ACCOUNT_COUNT }, (_, index) => index);
}

function renderViewModeMenu() {
  viewModeAccounts.replaceChildren();
  panelOrder.forEach((index) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = visibleAccountIndexes.has(index);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) visibleAccountIndexes.add(index);
      else if (visibleAccountIndexes.size > 1) visibleAccountIndexes.delete(index);
      else checkbox.checked = true;
      applyGridView();
    });
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const name = document.createElement('b');
    name.textContent = accounts[index]?.label || `Cuenta ${index + 1}`;
    label.append(checkbox, number, name);
    viewModeAccounts.appendChild(label);
  });
}

function positionViewModeMenu() {
  if (viewModeMenu.hidden) return;
  const viewportPadding = 8;
  const gap = 10;
  const availableWidth = Math.max(220, window.innerWidth - (viewportPadding * 2));
  const menuWidth = Math.min(260, availableWidth);
  viewModeMenu.style.width = `${menuWidth}px`;
  viewModeMenu.style.maxHeight = `${Math.max(180, window.innerHeight - (viewportPadding * 2))}px`;

  const anchor = viewModeButton.getBoundingClientRect();
  const sidebarEdge = globalActions.getBoundingClientRect().right;
  const menuHeight = Math.min(viewModeMenu.scrollHeight, window.innerHeight - (viewportPadding * 2));
  let left = Math.max(anchor.right + gap, sidebarEdge + gap);
  if (left + menuWidth > window.innerWidth - viewportPadding) left = anchor.left - menuWidth - gap;
  if (left < viewportPadding) left = Math.max(viewportPadding, (window.innerWidth - menuWidth) / 2);
  const top = Math.max(viewportPadding, Math.min(anchor.bottom - menuHeight, window.innerHeight - menuHeight - viewportPadding));

  viewModeMenu.style.left = `${Math.round(left)}px`;
  viewModeMenu.style.top = `${Math.round(top)}px`;
}

function applyGridView(_value = null, { persist = true } = {}) {
  if (expandedPanel) toggleExpanded(expandedPanel);
  grid.dataset.viewCount = String(visibleAccountIndexes.size);
  panelOrder.forEach((index, order) => {
    const panel = panels[index];
    if (panel) panel.element.style.order = String(order);
  });
  panels.forEach((panel) => {
    const hidden = !visibleAccountIndexes.has(panel.index);
    panel.element.classList.toggle('is-grid-hidden', hidden);
    panel.element.setAttribute('aria-hidden', String(hidden));
  });
  if (persist) {
    localStorage.setItem(GRID_VISIBLE_KEY, JSON.stringify([...visibleAccountIndexes]));
    localStorage.setItem(GRID_ORDER_KEY, JSON.stringify(panelOrder));
  }
  renderViewModeMenu();
  positionViewModeMenu();
}

function reorderPanels(draggedIndex, targetIndex) {
  if (draggedIndex === targetIndex) return;
  const from = panelOrder.indexOf(draggedIndex);
  const to = panelOrder.indexOf(targetIndex);
  if (from < 0 || to < 0) return;
  panelOrder.splice(to, 0, panelOrder.splice(from, 1)[0]);
  applyGridView();
  renderFarmAccounts();
}

function farmContextScript() {
  return `(() => {
    const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
    const selectors = [
      '.phud-tloc',
      '.pg-player-meta',
      '[class*="trainer-meta"]',
      '[class*="trainerMeta"]'
    ];
    const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const texts = [...new Set(candidates.map((element) => normalize(element.textContent)).filter(Boolean))];
    let level = null;
    let currentPlace = '';
    for (const text of texts) {
      const match = text.match(/(?:level|nivel|n[ií]vel|lv|nv)\\.?\\s*(\\d+)/i);
      if (match && level === null) level = Number(match[1]);
      const pieces = text.split(/[·•|-]/).map((part) => part.trim()).filter(Boolean);
      const place = pieces.find((part) => !/(?:level|nivel|n[ií]vel|lv|nv)\\.?\\s*\\d+/i.test(part));
      if (place && !currentPlace) currentPlace = place;
    }
    return {
      ready: location.pathname !== '/login' && Boolean(document.body),
      level,
      location: currentPlace,
      pathname: location.pathname
    };
  })()`;
}

function farmEnhancedContextScriptLegacy() {
  const readContext = async () => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const normalizeKey = (value) => normalize(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '')
      .toLowerCase();
    const knownTypes = new Set(['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);
    const aliases = { fogo:'fire', agua:'water', eletrico:'electric', electrico:'electric', planta:'grass', gelo:'ice', hielo:'ice', lutador:'fighting', lucha:'fighting', veneno:'poison', terra:'ground', tierra:'ground', voador:'flying', volador:'flying', psiquico:'psychic', inseto:'bug', bicho:'bug', pedra:'rock', roca:'rock', fantasma:'ghost', dragao:'dragon', sombrio:'dark', siniestro:'dark', aco:'steel', acero:'steel', fada:'fairy', hada:'fairy' };
    const normalizeType = (value) => {
      const type = normalizeKey(typeof value === 'object' ? value?.name || value?.type || value?.slug : value);
      const resolved = aliases[type] || type;
      return knownTypes.has(resolved) ? resolved : '';
    };
    const uniqueTypes = (values) => [...new Set((Array.isArray(values) ? values : [values]).map(normalizeType).filter(Boolean))].slice(0, 2);
    const selectors = ['.phud-tloc', '.pg-player-meta', '[class*="trainer-meta"]', '[class*="trainerMeta"]'];
    const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const texts = [...new Set(candidates.map((element) => normalize(element.textContent)).filter(Boolean))];
    let level = null;
    let currentPlace = '';
    for (const text of texts) {
      const match = text.match(/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*(\d+)/i);
      if (match && level === null) level = Number(match[1]);
      const pieces = text.split(/[·•|-]/).map((part) => part.trim()).filter(Boolean);
      const place = pieces.find((part) => !/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*\d+/i.test(part));
      if (place && !currentPlace) currentPlace = place;
    }

    const activeSlot = document.querySelector(
      '[data-pg-team-selected="true"], .phud-mon.active, .phud-mon.selected, .phud-mon.on, ' +
      '.pg-team-slot.active, .pg-team-slot.selected, .pg-team-slot.on, .phud-mon, .pg-team-slot'
    );
    const activeText = normalize(activeSlot?.textContent);
    const domLevelMatch = activeText.match(/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*(\d+)/i);
    const hpMatch = activeText.match(/(\d[\d.,]*)\s*\/\s*(\d[\d.,]*)/);
    const domName = normalize(
      activeSlot?.querySelector('.phud-name, [class*="name" i], strong, b')?.textContent ||
      activeText.split(/(?:lv[.]?|level|nivel|n[ií]vel|hp|exp)/i)[0]
    ).replace(/[·|:-]+$/g, '').trim();
    const typeMedia = [...activeSlot?.querySelectorAll('img[src*="/types/"], .pk-ts-type, [class*="type" i]') || []];
    const domTypes = uniqueTypes(typeMedia.flatMap((element) => {
      const descriptor = [element.currentSrc, element.src, element.alt, element.title, element.className, element.textContent].filter(Boolean).join(' ');
      const pathMatch = descriptor.match(/\/types\/([^/.?]+)/i);
      return [pathMatch?.[1], ...descriptor.split(/[^a-z]+/i)];
    }));
    const spriteMedia = [...activeSlot?.querySelectorAll('.phud-ico canvas, .phud-ico img, canvas, img, picture img') || []]
      .find((element) => !/\/types\//i.test(element.currentSrc || element.src || '') &&
        !/type|element|gender|status|ball/i.test([element.className, element.alt, element.title].join(' ')));
    let domSpriteUrl = '';
    if (spriteMedia?.tagName === 'CANVAS') {
      try { domSpriteUrl = spriteMedia.toDataURL('image/png'); } catch {}
    } else if (spriteMedia) {
      domSpriteUrl = spriteMedia.currentSrc || spriteMedia.src || '';
    }
    const domLooktype = Number(
      activeSlot?.dataset?.looktype || activeSlot?.dataset?.lookType ||
      activeSlot?.dataset?.pokemonId || activeSlot?.dataset?.pokeId
    ) || 0;
    const attackMatch = activeText.match(/(?:attack|ataque|atk|forca|força|power|poder)\s*[:.]?\s*(\d[\d.,]*)/i);
    const domStrength = Number(String(attackMatch?.[1] || '').replace(/[.,]/g, '')) || 0;
    let reactLeader = null;
    const reactSeen = new WeakSet();
    const inspectReactState = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 7 || reactSeen.has(value)) return;
      reactSeen.add(value);
      const candidateName = normalize(
        value.pokemonName || value.pokeName || value.speciesName ||
        value.pokemon?.name || value.species?.name || value.name
      );
      const candidateLooktype = Number(
        value.looktype || value.lookType || value.pokemon?.looktype ||
        value.pokemon?.lookType || value.species?.looktype
      ) || 0;
      if (!reactLeader && candidateLooktype && (!domName || normalizeKey(candidateName) === normalizeKey(domName))) {
        reactLeader = value;
      }
      Object.values(value).forEach((child) => {
        if (!reactLeader && child && typeof child === 'object') inspectReactState(child, depth + 1);
      });
    };
    if (activeSlot) {
      Object.keys(activeSlot)
        .filter((key) => /^__react(?:Props|Fiber|Container)/.test(key))
        .forEach((key) => inspectReactState(activeSlot[key]));
    }

    const apiRoots = [];
    for (const endpoint of ['/api/characters/me', '/api/game/profile']) {
      try {
        const response = await fetch(endpoint, { cache: 'no-cache' });
        if (response.ok) apiRoots.push(await response.json());
      } catch {}
    }
    const apiCandidates = [];
    const seen = new WeakSet();
    const collect = (value, path = '', depth = 0) => {
      if (!value || typeof value !== 'object' || depth > 7 || seen.has(value)) return;
      seen.add(value);
      if (!Array.isArray(value)) apiCandidates.push({ value, path });
      Object.entries(value).forEach(([key, child]) => {
        if (child && typeof child === 'object') collect(child, path + '.' + key, depth + 1);
      });
    };
    apiRoots.forEach((rootValue) => collect(rootValue));
    const objectName = (value) => normalize(
      value.pokemonName || value.pokeName || value.speciesName || value.displayName ||
      value.pokemon?.name || value.species?.name || value.poke?.name || value.name
    );
    const numberFrom = (value, keys) => {
      for (const key of keys) {
        const raw = key.split('.').reduce((current, part) => current?.[part], value);
        const parsed = Number(String(raw ?? '').replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
      return 0;
    };
    const rankedCandidates = apiCandidates.map((candidate) => {
      const value = candidate.value;
      const candidateName = objectName(value);
      let score = 0;
      if (domName && normalizeKey(candidateName) === normalizeKey(domName)) score += 400;
      if (/team|party|pokemon|poke|monster|creature/i.test(candidate.path)) score += 70;
      if (value.isLeader || value.leader || value.active || value.isActive || value.equipped || value.position === 0 || value.slot === 0) score += 150;
      if (value.looktype || value.pokemonId || value.pokeId || value.speciesId || value.dexId) score += 45;
      if (numberFrom(value, ['level', 'lvl', 'pokemon.level', 'stats.level'])) score += 30;
      if (!candidateName || (/character|trainer|player|account/i.test(candidate.path) && !/pokemon|team|party|poke/i.test(candidate.path))) score -= 80;
      return { ...candidate, candidateName, score };
    }).sort((left, right) => right.score - left.score);
    const apiLeader = rankedCandidates.find((candidate) => candidate.score >= 90)?.value || null;
    const apiName = objectName(apiLeader || {});
    const reactName = objectName(reactLeader || {});
    const leaderLevel = numberFrom(apiLeader || {}, ['level', 'lvl', 'pokemon.level', 'stats.level']) ||
      numberFrom(reactLeader || {}, ['level', 'lvl', 'pokemon.level', 'stats.level']) || Number(domLevelMatch?.[1]) || 0;
    let strength = numberFrom(apiLeader || {}, ['power', 'strength', 'force', 'combatPower', 'combat_power', 'cp', 'stats.power', 'stats.strength']) ||
      numberFrom(reactLeader || {}, ['power', 'strength', 'force', 'combatPower', 'combat_power', 'cp', 'stats.power', 'stats.strength']) || domStrength;
    let strengthSource = strength ? (domStrength && strength === domStrength ? 'Ataque' : 'Poder') : '';
    if (!strength) {
      strength = numberFrom(apiLeader || {}, ['attack', 'atk', 'stats.attack', 'stats.atk', 'currentStats.attack', 'currentStats.atk']);
      if (strength) strengthSource = 'Ataque';
    }
    const apiMaxHp = numberFrom(apiLeader || {}, ['maxHp', 'max_hp', 'hpMax', 'stats.hp', 'currentStats.maxHp']);
    const apiHp = numberFrom(apiLeader || {}, ['currentHp', 'current_hp', 'hp', 'health']);
    const maxHp = apiMaxHp || Number(String(hpMatch?.[2] || '').replace(/[.,]/g, '')) || 0;
    const currentHp = apiHp || Number(String(hpMatch?.[1] || '').replace(/[.,]/g, '')) || 0;
    if (!strength && (maxHp || leaderLevel)) {
      strength = Math.round(maxHp + (leaderLevel * 2.5));
      strengthSource = 'Estimado';
    }
    const apiTypes = uniqueTypes([
      ...(Array.isArray(apiLeader?.types) ? apiLeader.types : []),
      apiLeader?.type, apiLeader?.type1, apiLeader?.type2,
      apiLeader?.primaryType, apiLeader?.secondaryType,
      ...(Array.isArray(apiLeader?.pokemon?.types) ? apiLeader.pokemon.types : []),
      ...(Array.isArray(apiLeader?.species?.types) ? apiLeader.species.types : []),
      ...(Array.isArray(reactLeader?.types) ? reactLeader.types : []),
      reactLeader?.type, reactLeader?.type1, reactLeader?.type2,
      ...(Array.isArray(reactLeader?.pokemon?.types) ? reactLeader.pokemon.types : [])
    ].filter(Boolean));
    const apiSprite = normalize(
      apiLeader?.sprite || apiLeader?.image || apiLeader?.imageUrl || apiLeader?.icon || apiLeader?.pokemon?.sprite ||
      reactLeader?.sprite || reactLeader?.image || reactLeader?.imageUrl || reactLeader?.pokemon?.sprite
    );
    const apiLooktype = numberFrom(apiLeader || {}, ['looktype', 'lookType', 'pokemon.looktype', 'pokemon.lookType', 'species.looktype']) ||
      Number(reactLeader?.looktype || reactLeader?.lookType || reactLeader?.pokemon?.looktype || reactLeader?.pokemon?.lookType) || domLooktype;
    const leaderName = domName || apiName || reactName;
    return {
      ready: location.pathname !== '/login' && Boolean(document.body),
      level,
      location: currentPlace,
      pathname: location.pathname,
      leader: leaderName ? {
        name: leaderName,
        level: leaderLevel,
        strength,
        strengthSource,
        hp: currentHp,
        maxHp,
        types: apiTypes.length ? apiTypes : domTypes,
        sprite: domSpriteUrl || apiSprite,
        looktype: apiLooktype
      } : null
    };
  };
  return '(' + readContext.toString() + ')()';
}

function farmEnhancedContextScript(forcePokes = false) {
  const readServerContext = async (forcePokes = false) => {
    const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
    const positiveNumber = (value) => {
      if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
      if (typeof value !== 'string') return 0;
      const text = value.trim().replace(',', '.');
      if (!/^\d+(?:\.\d+)?$/.test(text)) return 0;
      const parsed = Number(text);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    };
    const nonNegativeNumber = (value) => {
      if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
      if (typeof value !== 'string') return null;
      const text = value.trim().replace(',', '.');
      if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
      const parsed = Number(text);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const gameInteger = (value) => {
      const digits = clean(value).replace(/[^0-9]/g, '');
      const parsed = Number(digits);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const hpPair = (value) => {
      const match = clean(value).match(/(?:^|\s)(\d+)\s*\/\s*(\d+)(?:\s|$)/);
      if (!match) return null;
      const hp = Number(match[1]);
      const maxHp = Number(match[2]);
      return Number.isFinite(hp) && Number.isFinite(maxHp) && maxHp > 0 && hp >= 0 && hp <= maxHp
        ? { hp, maxHp }
        : null;
    };
    const validTypes = new Set([
      'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison',
      'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ]);
    const typeName = (value) => {
      const raw = clean(typeof value === 'object' ? value?.name || value?.type : value).toLowerCase();
      const aliases = { fogo:'fire', agua:'water', eletrico:'electric', electrico:'electric', planta:'grass', gelo:'ice', hielo:'ice', lutador:'fighting', lucha:'fighting', veneno:'poison', terra:'ground', tierra:'ground', voador:'flying', volador:'flying', psiquico:'psychic', inseto:'bug', bicho:'bug', pedra:'rock', roca:'rock', fantasma:'ghost', dragao:'dragon', sombrio:'dark', siniestro:'dark', aco:'steel', acero:'steel', fada:'fairy', hada:'fairy' };
      const type = aliases[raw] || raw;
      return validTypes.has(type) ? type : '';
    };
    const collectionRows = (value) => {
      if (value == null || value === false) return [];
      if (Array.isArray(value)) return value.flatMap(collectionRows);
      if (typeof value !== 'object') return [value];
      if (value.name || value.itemName || value.moveName || value.skillName || value.label || value.item || value.move) return [value];
      return Object.entries(value).flatMap(([key, entry]) => {
        if (entry == null || entry === false) return [];
        if (entry === true) return [{ name: key, _sourceKey: key, active: true }];
        if (typeof entry === 'object') return [{ ...entry, _sourceKey: key }];
        return [{ name: String(entry), _sourceKey: key }];
      });
    };
    const root = document.querySelector('.game-root, #root, [data-guide="game-root"]') || document.querySelector('main') || document.body;
    const records = new Map();
    const trainerNames = [];
    const seenValues = new WeakSet();
    let socketContext = window.__pokeGridFarmSocketContext || null;
    let inspected = 0;
    const readPokemon = (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      const id = clean(value.id ?? value.pokemonId ?? value.pokeId ?? value.pokemon?.id);
      const name = clean(value.name ?? value.pokemonName ?? value.pokeName ?? value.speciesName ?? value.pokemon?.name ?? value.species?.name);
      const level = positiveNumber(value.level ?? value.lvl ?? value.pokemon?.level ?? value.stats?.level);
      const stats = [value.currentStats, value.computedStats, value.finalStats, value.stats].find((row) => row && typeof row === 'object') || {};
      const belongsToTeam = value.team === true || value.inTeam === true || value.isInTeam === true || value.party === true ||
        value.equipped === true || value.isEquipped === true || value.active === true || value.selected === true || value.leader === true || value.isLeader === true;
      const speciesId = positiveNumber(value.speciesId ?? value.pokeId ?? value.dex ?? value.dexId ?? value.pokedexId ?? value.pokemon?.speciesId ?? value.species?.id);
      const looktype = positiveNumber(value.barLooktype ?? value.looktype ?? value.lookType ?? value.outfitId);
      const pokemonEvidence = speciesId || looktype || value.pokemonId || value.pokeId || value.pokemon || value.species ||
        value.ivs || value.growth || value.stats || value.currentStats || value.computedStats || value.finalStats || value.attacks || value.moves;
      if (!name || !level || !pokemonEvidence || /^(?:cuenta|account|pokemon|pokémon)$/i.test(name)) return null;
      const entries = [];
      const entrySeen = new WeakSet();
      const flatten = (entry, path = '', depth = 0) => {
        if (entry == null || depth > 5 || entries.length > 1200) return;
        if (['string', 'number', 'boolean'].includes(typeof entry)) {
          const pieces = path.split('.');
          entries.push({ path: path.toLowerCase(), key: pieces.at(-1)?.replace(/[^a-z0-9]/gi, '').toLowerCase(), value: entry });
          return;
        }
        if (typeof entry !== 'object' || entry instanceof Node || entrySeen.has(entry)) return;
        entrySeen.add(entry);
        if (Array.isArray(entry)) return entry.slice(0, 30).forEach((child, index) => flatten(child, `${path}.${index}`, depth + 1));
        Object.entries(entry).slice(0, 100).forEach(([key, child]) => {
          if (!/^(moves?|attacks?|skills?|items?|equipment|loot)$/i.test(key)) flatten(child, path ? `${path}.${key}` : key, depth + 1);
        });
      };
      flatten(value);
      const numericEntry = (aliases, { prefer = null, reject = null, decimal = false } = {}) => {
        const keys = new Set(aliases.map((alias) => alias.replace(/[^a-z0-9]/gi, '').toLowerCase()));
        const candidates = entries.filter((entry) => keys.has(entry.key) && (!reject || !reject.test(entry.path)));
        const ordered = prefer ? [...candidates.filter((entry) => prefer.test(entry.path)), ...candidates.filter((entry) => !prefer.test(entry.path))] : candidates;
        for (const entry of ordered) {
          const text = clean(entry.value);
          const number = typeof entry.value === 'number' ? entry.value : decimal
            ? Number(text.replace(',', '.').replace(/[^0-9.-]/g, ''))
            : gameInteger(text);
          if (Number.isFinite(number) && number > 0) return number;
        }
        return 0;
      };
      const textEntry = (aliases) => {
        const keys = new Set(aliases.map((alias) => alias.replace(/[^a-z0-9]/gi, '').toLowerCase()));
        return clean(entries.find((entry) => keys.has(entry.key) && typeof entry.value === 'string')?.value);
      };
      const types = [...new Set([
        ...(Array.isArray(value.types) ? value.types : []),
        value.type1, value.type2, value.primaryType, value.secondaryType
      ].map(typeName).filter(Boolean))].slice(0, 2);
      const moveRows = collectionRows([value.moves, value.attacks, value.skills, value.equippedMoves, value.activeMoves]);
      const moves = moveRows.map((move) => {
        if (!move) return null;
        if (typeof move === 'string') return { name: clean(move), type: '', power: 0, cooldownMs: 0, isTm: false };
        const moveName = clean(move.name ?? move.moveName ?? move.skillName ?? move.move?.name);
        const moveType = typeName(move.type ?? move.moveType ?? move.move?.type) || clean(moveName).split(/[^a-z]+/i).map(typeName).find(Boolean) || '';
        const tmText = `${moveName} ${clean(move.category)} ${clean(move.source)} ${clean(move._sourceKey)}`;
        const isTm = Boolean(move.tm || move.isTm || move.fromTm || move.source === 'tm' || /(?:^|\W)(?:tm|mt)(?:\W|$)/i.test(tmText));
        const isAoe = Boolean(move.aoe || move.isAoe || move.area || move.areaOfEffect || /(?:^|\W)(?:aoe|area\s+of\s+effect)(?:\W|$)/i.test(tmText));
        return moveName ? { name: moveName, type: moveType,
          power: positiveNumber(move.power ?? move.damage ?? move.basePower ?? move.move?.power),
          cooldownMs: positiveNumber(move.cooldownMs ?? move.cooldown ?? move.cd ?? move.move?.cooldownMs),
          category: clean(move.category ?? move.damageClass), isTm, isAoe: isTm && isAoe,
          isTypeTm: isTm && !isAoe && Boolean(moveType), equipped: move.equipped !== false && move.active !== false && move.enabled !== false } : null;
      }).filter(Boolean).slice(0, 12);
      const itemRows = collectionRows([
        value.heldItems, value.equippedItems, value.equipment, value.activeItems,
        value.activeTms, value.activeTMs, value.equippedTms, value.equippedTMs,
        value.tms, value.tmSlots,
        value.aoeTm != null ? (typeof value.aoeTm === 'object' ? { ...value.aoeTm, _sourceKey: 'aoeTm', aoe: true } : { name: value.aoeTm === true ? 'AoE TM' : String(value.aoeTm), _sourceKey: 'aoeTm', aoe: true }) : null,
        value.aoeTM != null ? (typeof value.aoeTM === 'object' ? { ...value.aoeTM, _sourceKey: 'aoeTM', aoe: true } : { name: value.aoeTM === true ? 'AoE TM' : String(value.aoeTM), _sourceKey: 'aoeTM', aoe: true }) : null,
        value.elementalTm != null ? (typeof value.elementalTm === 'object' ? { ...value.elementalTm, _sourceKey: 'elementalTm' } : { name: String(value.elementalTm), _sourceKey: 'elementalTm' }) : null,
        value.typeTm != null ? (typeof value.typeTm === 'object' ? { ...value.typeTm, _sourceKey: 'typeTm' } : { name: String(value.typeTm), _sourceKey: 'typeTm' }) : null,
        value.aoeTmActive === true ? { name: 'AoE TM', category: 'tm', aoe: true } : null,
        value.hasAoeTm === true ? { name: 'AoE TM', category: 'tm', aoe: true } : null,
        value.items
      ]);
      const readTmItem = (item) => {
        if (!item) return null;
        const source = typeof item === 'object' ? item : { name: item };
        const sourceKey = clean(source._sourceKey);
        const itemName = clean(source.name ?? source.itemName ?? source.label ?? source.item?.name ?? sourceKey);
        const itemType = typeName(source.type ?? source.element) || itemName.split(/[^a-z]+/i).map(typeName).find(Boolean) || '';
        const tmText = `${itemName} ${clean(source.category)} ${clean(source.kind)} ${sourceKey}`;
        const isTm = Boolean(source.tm || source.isTm || /(?:^|\W)(?:tm|mt)(?:\W|$)/i.test(tmText) ||
          /type\s+(?:tm|mt)\s+disk/i.test(tmText) || /^(?:aoe|elemental|type|aoe(?:tm|mt)|elemental(?:tm|mt)|type(?:tm|mt))$/i.test(sourceKey));
        const isAoe = Boolean(source.aoe || source.isAoe || source.area || source.areaOfEffect || /(?:^|\W)(?:aoe|area\s+of\s+effect)(?:\W|$)/i.test(tmText));
        return itemName ? { id: clean(source.id ?? source.itemId ?? source.item?.id), name: itemName,
          category: clean(source.category ?? source.kind ?? source.item?.category).toLowerCase(),
          type: itemType, isTm, isAoe: isTm && isAoe, isTypeTm: isTm && !isAoe && Boolean(itemType),
          equipped: source.equipped !== false && source.active !== false && source.enabled !== false } : null;
      };
      const items = itemRows.map(readTmItem).filter(Boolean).slice(0, 12);
      const statValue = (aliases) => {
        const direct = aliases.map((key) => positiveNumber(stats[key])).find(Boolean);
        return direct || numericEntry(aliases, {
          prefer: /(?:computed|final|battle|current)?stats?\./,
          reject: /(?:base|growth|ivs?|individual|species|creature)/
        });
      };
      const resolvedStats = {
        hp: statValue(['hp', 'health', 'maxHp']), attack: statValue(['attack', 'atk']), defense: statValue(['defense', 'def']),
        specialAttack: statValue(['specialAttack', 'spAttack', 'spAtk', 'spa']),
        specialDefense: statValue(['specialDefense', 'spDefense', 'spDef']), speed: statValue(['speed'])
      };
      const ivs = value.ivs || value.growth || value.individualValues || {};
      const ivTotal = positiveNumber(value.ivTotal ?? value.totalIv ?? value.iv) || numericEntry(['ivTotal', 'totalIv', 'iv']) ||
        (ivs && typeof ivs === 'object' ? Object.values(ivs).reduce((sum, stat) => sum + (Number(stat) || 0), 0) : 0);
      const quality = clean(value.qualityName ?? value.rarity ?? value.tier) || textEntry(['qualityName', 'rarityName', 'rarity', 'tier', 'quality']);
      const tierMultiplier = (() => {
        const text = quality.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        if (/divin/.test(text)) return 4;
        if (/ancient|ancestral|antigu/.test(text)) return 3;
        if (/mythic|mitic/.test(text)) return 2;
        if (/legend/.test(text)) return 1.8;
        if (/epic/.test(text)) return 1.6;
        if (/rare|rara|raro/.test(text)) return 1.4;
        if (/uncommon|incomun/.test(text)) return 1.2;
        return 1;
      })();
      const qualityValue = positiveNumber(value.qualityValue ?? value.qualityMultiplier ?? value.rarityMultiplier) ||
        numericEntry(['qualityValue', 'qualityMultiplier', 'qualityMult', 'rarityMultiplier', 'multiplier'], { prefer: /quality|rarity/, decimal: true }) ||
        tierMultiplier;
      const statTotal = Object.values(resolvedStats).reduce((sum, stat) => sum + (Number(stat) || 0), 0);
      const directPower = gameInteger(value.power ?? value.strength ?? value.combatPower ?? value.cp) ||
        numericEntry(['power', 'strength', 'combatPower', 'cp']);
      const calculatedPower = Object.values(resolvedStats).every((stat) => stat > 0) ? Math.round(statTotal * qualityValue) : 0;
      return {
        id: id || `${speciesId || looktype}:${name}:${level}`,
        name,
        level,
        team: value.team === true,
        leader: value.leader === true || value.isLeader === true || value.equipped === true || value.isEquipped === true || value.active === true || value.selected === true,
        belongsToTeam,
        roleScore: (value.leader === true || value.isLeader === true ? 100 : 0) + (value.equipped === true || value.isEquipped === true || value.active === true || value.selected === true ? 80 : 0) + (belongsToTeam ? 30 : 0) + (nonNegativeNumber(value.slot) === 0 ? 25 : 0),
        dataScore: Object.values(resolvedStats).filter((stat) => stat > 0).length * 20 + (directPower || calculatedPower ? 35 : 0) +
          (ivTotal ? 10 : 0) + (qualityValue > 1 ? 10 : 0),
        slot: nonNegativeNumber(value.slot ?? value.teamSlot ?? value.partySlot) ?? 99,
        hp: nonNegativeNumber(value.hp ?? value.currentHp),
        maxHp: positiveNumber(value.maxHp ?? value.maxhp ?? value.hpMax),
        power: directPower || calculatedPower,
        powerSource: directPower ? 'Servidor' : calculatedPower ? 'Calculado' : '',
        looktype, speciesId, types, moves, items, ivTotal,
        quality,
        qualityValue,
        finalStage: value.finalStage === true,
        xp: nonNegativeNumber(value.xp ?? value.experience) || 0,
        maxXp: positiveNumber(value.maxXp ?? value.maxxp ?? value.nextLevelXp),
        isShiny: value.isShiny === true || value.shiny === true,
        stats: resolvedStats
      };
    };
    const scan = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || value instanceof Node || depth > 9 ||
        seenValues.has(value) || inspected > 35_000) return;
      seenValues.add(value);
      inspected += 1;
      if (!socketContext && typeof value.subscribe === 'function' &&
        (typeof value.requestPokes === 'function' || typeof value.send === 'function')) socketContext = value;
      const trainerName = clean(value.trainerName ?? value.playerName ?? value.username ?? value.characterName ?? value.profile?.name ?? value.player?.name);
      if (trainerName && !/^(?:cuenta|account|player|trainer|entrenador|usuario|user)$/i.test(trainerName) && trainerName.length <= 50) trainerNames.push(trainerName);
      const pokemon = readPokemon(value);
      if (pokemon) {
        const current = records.get(pokemon.id);
        if (!current || pokemon.roleScore + pokemon.dataScore > current.roleScore + current.dataScore) records.set(pokemon.id, pokemon);
      }
      if (Array.isArray(value)) {
        value.slice(0, 1500).forEach((child) => scan(child, depth + 1));
        return;
      }
      Object.entries(value).slice(0, 90).forEach(([key, child]) => {
        if (/^(return|child|sibling|stateNode|alternate|_owner|queue|nextEffect)$/i.test(key)) return;
        scan(child, depth + 1);
      });
    };
    if (root) {
      const reactElements = [];
      const addReactElement = (element) => {
        if (element instanceof Element && !reactElements.includes(element)) reactElements.push(element);
      };
      addReactElement(root);
      addReactElement(document.body);
      addReactElement(document.documentElement);
      [...root.querySelectorAll(
        '[data-pg-team-selected], [data-pg-team-panel], .dock-poke-wrap, .phud-mon, .pg-team-slot, ' +
        '[class*="team" i], [class*="party" i], [class*="poke" i]'
      )].slice(0, 600).forEach((element) => {
        addReactElement(element);
        let parent = element.parentElement;
        for (let depth = 0; parent && depth < 5; depth += 1, parent = parent.parentElement) addReactElement(parent);
      });
      [...root.querySelectorAll('*')].slice(0, 240).forEach(addReactElement);
      reactElements.slice(0, 900).forEach((element) => {
        Object.keys(element).filter((key) => /^__react(?:Fiber|Container|Props)/.test(key)).forEach((key) => {
          if (key.startsWith('__reactProps')) scan(element[key], 0);
          let fiber = element[key];
          if (fiber?.current) fiber = fiber.current;
          for (let depth = 0; fiber && depth < 55; depth += 1, fiber = fiber.return) {
            scan(fiber.memoizedState, 0);
            scan(fiber.memoizedProps, 0);
            scan(fiber.dependencies?.firstContext?.context?._currentValue, 0);
            scan(fiber.dependencies?.firstContext?.context?._currentValue2, 0);
          }
        });
      });
    }
    const cachePokesPayload = (payload) => {
      const list = Array.isArray(payload) ? payload : payload?.list || payload?.pokes || payload?.data?.list || payload?.data?.pokes;
      if (Array.isArray(list)) window.__pokeGridFarmPokesSnapshot = { list, updatedAt: Date.now() };
    };
    if (socketContext) {
      window.__pokeGridFarmSocketContext = socketContext;
      if (!window.__pokeGridFarmPokesSubscribed) {
        try {
          const unsubscribe = socketContext.subscribe('pokes', cachePokesPayload);
          window.__pokeGridFarmPokesSubscribed = true;
          if (typeof unsubscribe === 'function') window.__pokeGridFarmPokesUnsubscribe = unsubscribe;
        } catch {}
      }
      const snapshotAge = Date.now() - Number(window.__pokeGridFarmPokesSnapshot?.updatedAt || 0);
      if (forcePokes || !window.__pokeGridFarmPokesSnapshot || snapshotAge > 30000) {
        const requestedAt = Date.now();
        try {
          if (typeof socketContext.requestPokes === 'function') socketContext.requestPokes();
          else socketContext.send?.({ type: 'pokes' });
        } catch {}
        if (forcePokes || !window.__pokeGridFarmPokesSnapshot) {
          const waitUntil = Date.now() + 1800;
          while (Date.now() < waitUntil && Number(window.__pokeGridFarmPokesSnapshot?.updatedAt || 0) < requestedAt) {
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        }
      }
    }
    const socketSnapshot = window.__pokeGridFarmPokesSnapshot;
    const socketRows = (Array.isArray(socketSnapshot?.list) ? socketSnapshot.list : []).map(readPokemon).filter(Boolean);
    socketRows.forEach((pokemon) => {
      pokemon.dataSource = 'WebSocket pokes';
      pokemon.updatedAt = Number(socketSnapshot.updatedAt) || Date.now();
      const current = records.get(pokemon.id);
      if (!current || pokemon.roleScore + pokemon.dataScore >= current.roleScore + current.dataScore) records.set(pokemon.id, pokemon);
    });
    const serverRows = [...records.values()];
    const activeSlot = document.querySelector(
      '[data-pg-team-selected="true"], .phud-mon.active, .phud-mon.selected, .phud-mon.on, ' +
      '.pg-team-slot.active, .pg-team-slot.selected, .pg-team-slot.on, .dock-poke-wrap, .phud-mon, .pg-team-slot'
    );
    if (activeSlot) {
      ['pointerover', 'mouseover', 'mouseenter'].forEach((type) => activeSlot.dispatchEvent(new MouseEvent(type, {
        bubbles: type !== 'mouseenter', cancelable: true, view: window
      })));
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    const tooltip = [...document.querySelectorAll('[role="tooltip"], [class*="tooltip" i], [class*="popover" i], [class*="pokemon-card" i]')]
      .find((element) => /IV\s*\d+\s*\/\s*\d+/i.test(clean(element.textContent)) && /Power\s*[\d.,]+/i.test(clean(element.textContent))) || null;
    const tooltipText = clean(tooltip?.textContent);
    const activeText = clean(activeSlot?.textContent);
    const normalizeName = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '').toLowerCase();
    const explicitDomName = clean(
      tooltip?.querySelector('[class*="name" i], h1, h2, h3, strong, b')?.textContent ||
      activeSlot?.querySelector('.phud-name, [class*="name" i], strong, b')?.textContent ||
      activeSlot?.getAttribute('aria-label')?.match(/(?:select|active|pokemon)\s+(.+)/i)?.[1]
    ).replace(/\s*\((?:active|activo)\)\s*$/i, '');
    const domLevel = Number((tooltipText || activeText).match(/(?:\bLv|level|nivel|nível)\.?\s*(\d+)/i)?.[1]) || 0;
    let leader = socketRows.filter((pokemon) => pokemon.leader)
      .sort((left, right) => right.roleScore - left.roleScore || left.slot - right.slot)[0] ||
      socketRows.filter((pokemon) => pokemon.team && pokemon.slot === 0)[0] ||
      serverRows.filter((pokemon) => explicitDomName && normalizeName(pokemon.name) === normalizeName(explicitDomName))
      .sort((left, right) => right.roleScore - left.roleScore || right.dataScore - left.dataScore || left.slot - right.slot)[0] ||
      serverRows.filter((pokemon) => pokemon.belongsToTeam || pokemon.leader)
      .sort((left, right) => right.roleScore - left.roleScore || right.dataScore - left.dataScore || left.slot - right.slot)[0] ||
      serverRows.sort((left, right) => right.roleScore - left.roleScore || right.dataScore - left.dataScore || left.slot - right.slot)[0] ||
      null;
    const tooltipIv = tooltipText.match(/IV\s*(\d+)\s*\/\s*(\d+)/i);
    const tooltipPower = gameInteger(tooltipText.match(/Power\s*([\d.,]+)/i)?.[1]);
    const tooltipQualityValue = Number(tooltipText.match(/(?:Quality|Qualidade|Calidad)[^x×]*[x×]\s*([\d.,]+)/i)?.[1]?.replace(',', '.')) || 0;
    const tooltipQuality = clean(tooltipText.match(/(?:Quality|Qualidade|Calidad)\s*([^x×|]+?)(?=\s*[x×]\s*[\d.,]+)/i)?.[1]);
    const tooltipStat = (label) => gameInteger(tooltipText.match(new RegExp(label + '\\s*([\\d.,]+)', 'i'))?.[1]);
    const tooltipStats = {
      hp: tooltipStat('HP'), attack: tooltipStat('Atk'), defense: tooltipStat('Def'),
      specialAttack: tooltipStat('SpA'), specialDefense: tooltipStat('SpD'), speed: tooltipStat('Spd')
    };
    const tooltipTypes = [...new Set([...tooltip?.querySelectorAll('[class*="type" i]') || []]
      .flatMap((element) => clean(element.textContent).split(/\s+/)).map(typeName).filter(Boolean))].slice(0, 2);
    const visibleTmLabels = new Set();
    const collectTmLabels = (text) => {
      const value = clean(text);
      if (!value) return;
      const patterns = [
        /(?:normal|fire|water|grass|electric|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|dark|steel|fairy)[- ]type\s+(?:tm|mt)(?:\s+disk)?/gi,
        /(?:aoe|area\s+of\s+effect)\s+(?:tm|mt)(?:\s+disk)?/gi,
        /(?:tm|mt)\s+(?:aoe|area\s+of\s+effect)/gi
      ];
      patterns.forEach((pattern) => (value.match(pattern) || []).forEach((label) => visibleTmLabels.add(clean(label))));
    };
    [activeSlot, tooltip].filter(Boolean).forEach((container) => {
      collectTmLabels(container.textContent);
      [container, ...container.querySelectorAll('[title], [aria-label], [data-item-name], [data-name], img[alt]')].slice(0, 120).forEach((element) => {
        collectTmLabels(element.getAttribute?.('title'));
        collectTmLabels(element.getAttribute?.('aria-label'));
        collectTmLabels(element.getAttribute?.('alt'));
        collectTmLabels(element.dataset?.itemName);
        collectTmLabels(element.dataset?.name);
      });
    });
    const visibleTmItems = [...visibleTmLabels].map((name) => {
      const type = name.split(/[^a-z]+/i).map(typeName).find(Boolean) || '';
      const isAoe = /(?:^|\W)(?:aoe|area\s+of\s+effect)(?:\W|$)/i.test(name);
      return { name, category: 'tm', type, isTm: true, isAoe, isTypeTm: !isAoe && Boolean(type), equipped: true };
    });
    if (activeSlot) {
      ['pointerout', 'mouseout', 'mouseleave'].forEach((type) => activeSlot.dispatchEvent(new MouseEvent(type, {
        bubbles: type !== 'mouseleave', cancelable: true, view: window
      })));
    }
    if (!leader && explicitDomName) {
      leader = { id: clean(activeSlot?.dataset?.pokemonId || activeSlot?.dataset?.pokeId), name: explicitDomName, level: domLevel,
        roleScore: 200, slot: 0, belongsToTeam: true, leader: true, hp: null, maxHp: 0, power: 0,
        looktype: positiveNumber(activeSlot?.dataset?.looktype || activeSlot?.dataset?.lookType), speciesId: 0,
        types: tooltipTypes, moves: [], items: [], ivTotal: 0, quality: '', qualityValue: 0, stats: {} };
    }
    if (leader) {
      leader = {
        ...leader,
        name: explicitDomName || leader.name,
        level: domLevel || leader.level,
        power: tooltipPower || leader.power,
        types: tooltipTypes.length ? tooltipTypes : leader.types,
        ivTotal: Number(tooltipIv?.[1]) || leader.ivTotal,
        ivMax: Number(tooltipIv?.[2]) || 192,
        quality: tooltipQuality || leader.quality,
        qualityValue: tooltipQualityValue || leader.qualityValue,
        stats: Object.values(tooltipStats).some(Boolean) ? tooltipStats : leader.stats,
        items: [...(leader.items || []), ...visibleTmItems]
      };
    }

    const hpSelectors = [
      '.dock-poke-wrap .sbar-hp .sbar-txt',
      '.phud-mon.active .sbar-hp .sbar-txt',
      '.phud-mon.selected .sbar-hp .sbar-txt',
      '[data-pg-team-selected="true"] .sbar-hp .sbar-txt'
    ];
    const liveHp = hpSelectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .map((element) => hpPair(element.textContent))
      .find(Boolean) || null;
    let hp = leader?.hp ?? null;
    let maxHp = leader?.maxHp || 0;
    if (liveHp && (!maxHp || liveHp.maxHp === maxHp)) {
      hp = liveHp.hp;
      maxHp = liveHp.maxHp;
    }
    if (maxHp && (hp === null || hp > maxHp)) hp = maxHp;

    const profileTexts = [
      ...document.querySelectorAll('.phud-tloc, .pg-player-meta, [class*="trainer-meta"], [class*="trainerMeta"], [data-player-name], [data-trainer-name]')
    ].map((element) => clean(element.textContent)).filter(Boolean);
    let playerLevel = null;
    let locationName = '';
    const profileElements = [...document.querySelectorAll('[data-player-name], [data-trainer-name], [class*="player-name" i], [class*="trainer-name" i]')];
    const domTrainerName = profileElements.map((element) => clean(element.dataset.playerName || element.dataset.trainerName || element.textContent))
      .find((name) => name && !/^(?:cuenta|account|player|trainer|entrenador|usuario|user)$/i.test(name));
    let trainerName = trainerNames.find(Boolean) || domTrainerName || '';
    for (const text of profileTexts) {
      const levelMatch = text.match(/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*(\d+)/i);
      if (levelMatch && playerLevel === null) playerLevel = Number(levelMatch[1]);
      const pieces = text.split(/[·•|-]/).map((part) => part.trim()).filter(Boolean);
      const place = pieces.find((part) => !/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*\d+/i.test(part));
      if (place && !locationName) locationName = place;
      const explicitName = text.match(/(?:trainer|entrenador|player|jugador|usuario)\s*:?\s*([\p{L}\d_.-]{2,32})/iu)?.[1];
      const candidateName = clean(explicitName || '');
      if (!trainerName && candidateName && !/^(?:cuenta|account|player|trainer|entrenador|usuario|user)$/i.test(candidateName)) trainerName = candidateName;
    }
    return {
      ready: location.pathname.startsWith('/play') && Boolean(document.body),
      level: playerLevel,
      location: locationName,
      trainerName,
      pathname: location.pathname,
      serverPokemonCount: serverRows.length,
      leader: leader ? {
        name: leader.name,
        level: leader.level,
        strength: leader.power,
        strengthSource: tooltipPower ? 'Juego' : leader.powerSource || (leader.power ? 'Servidor' : ''),
        hp: hp ?? 0,
        maxHp,
        types: leader.types,
        sprite: '',
        looktype: leader.looktype,
        speciesId: leader.speciesId,
        id: leader.id,
        stats: leader.stats,
        moves: leader.moves,
        items: leader.items,
        ivTotal: leader.ivTotal,
        ivMax: leader.ivMax || 192,
        quality: leader.quality,
        qualityValue: leader.qualityValue,
        isShiny: leader.isShiny,
        slot: leader.slot,
        team: leader.team,
        finalStage: leader.finalStage,
        xp: leader.xp,
        maxXp: leader.maxXp,
        dataSource: leader.dataSource || (tooltipPower ? 'Interfaz del juego' : 'Estado del juego'),
        updatedAt: leader.updatedAt || Date.now()
      } : null
    };
  };
  return `(${readServerContext.toString()})(${JSON.stringify(Boolean(forcePokes))})`;
}

function farmEnhancedCatalogScript() {
  const readCatalog = async () => {
    const requestJson = async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      }
    };
    const [markers, pokedex, allPokes, creatures] = await Promise.all([
      requestJson('/api/game/map-markers'),
      requestJson('/api/game/pokedex'),
      requestJson('/api/game/all-pokes'),
      requestJson('/game/creatures.json')
    ]);
    if (!markers) throw new Error('No se pudo leer el catálogo de mapas.');
    const clean = (value) => value === null || value === undefined || typeof value === 'object'
      ? ''
      : String(value).trim();
    const first = (...values) => values.map(clean).find(Boolean) || '';
    const numberFrom = (...values) => {
      for (const value of values) {
        const match = clean(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
        const number = Number(match?.[0]);
        if (Number.isFinite(number)) return number;
      }
      return 0;
    };
    const hunts = [];
    const seenObjects = new WeakSet();
    const gameMapKeys = new Set(['kanto', 'outland', 'orre', 'johto', 'nightmare']);
    const collectionRole = (key) => {
      if (/^(maps?|worlds?|continents?)$/i.test(key)) return 'map';
      if (/^(areas?|regions?|zones?|islands?|tabs?|groups?)$/i.test(key)) return 'area';
      return '';
    };
    const visit = (entry, context = {}, relation = '', depth = 0) => {
      if (!entry || typeof entry !== 'object' || depth > 12 || seenObjects.has(entry)) return;
      seenObjects.add(entry);
      if (Array.isArray(entry)) {
        entry.forEach((child) => visit(child, context, relation, depth + 1));
        return;
      }
      const pokemon = entry.pokemon && typeof entry.pokemon === 'object' ? entry.pokemon : {};
      const creature = entry.creature && typeof entry.creature === 'object' ? entry.creature : {};
      const teleport = entry.teleport && typeof entry.teleport === 'object' ? entry.teleport : {};
      const ownName = first(entry.name, entry.label, entry.title);
      const ownSlug = first(entry.slug, entry.id, entry.key);
      const nextContext = { ...context };
      if (relation === 'map') {
        nextContext.map = ownSlug || ownName || context.map || '';
        nextContext.mapName = ownName || ownSlug || context.mapName || '';
      } else if (relation === 'area') {
        nextContext.area = ownSlug || ownName || context.area || '';
        nextContext.areaName = ownName || ownSlug || context.areaName || '';
      }
      nextContext.map = first(
        entry.mapSlug, entry.map_slug, entry.map?.slug, entry.map?.id,
        entry.worldSlug, entry.world_slug, entry.world?.slug,
        entry.continentSlug, entry.continent?.slug, entry.map, entry.world, entry.continent, nextContext.map
      );
      nextContext.mapName = first(entry.mapName, entry.map?.name, entry.worldName, entry.world?.name, entry.continentName, entry.continent?.name, nextContext.mapName, nextContext.map);
      nextContext.area = first(
        entry.areaSlug, entry.area_slug, entry.area?.slug, entry.area?.id,
        entry.regionSlug, entry.region_slug, entry.region?.slug,
        entry.zoneSlug, entry.zone?.slug, entry.area, entry.region, entry.zone, nextContext.area
      );
      nextContext.areaName = first(entry.areaName, entry.area?.name, entry.regionName, entry.region?.name, entry.zoneName, entry.zone?.name, nextContext.areaName, nextContext.area);

      const level = numberFrom(entry.huntLevel, entry.hunt_level, entry.requiredLevel, entry.required_level, entry.minLevel, entry.min_level, entry.level);
      const name = first(
        entry.pokemonName, entry.pokemon_name, entry.huntName, entry.hunt_name,
        entry.creatureName, entry.creature_name, entry.speciesName, entry.species_name,
        pokemon.name, creature.name,
        entry.hunt === true || entry.markerType === 'hunt' || entry.type === 'hunt' || (level > 0 && ownSlug) ? ownName : ''
      );
      const slug = first(
        entry.teleportSlug, entry.teleport_slug, entry.fieldTeleportSlug, entry.field_teleport_slug,
        entry.huntSlug, entry.hunt_slug, entry.targetSlug, entry.target_slug, entry.destinationSlug, entry.destination_slug,
        teleport.slug, teleport.targetSlug, teleport.target_slug,
        entry.hunt === true || entry.markerType === 'hunt' || entry.type === 'hunt' ? ownSlug : '',
        numberFrom(entry.huntLevel, entry.requiredLevel, entry.minLevel, entry.level) > 0 && name ? ownSlug : ''
      );
      const guide = first(entry.guide, entry.dataGuide, entry.markerId);
      const huntSignal = Boolean(
        name && (slug || /^hunt[-_:]/i.test(guide)) &&
        (level > 0 || entry.hunt === true || entry.markerType === 'hunt' || entry.type === 'hunt' ||
          entry.teleportSlug || entry.teleport_slug || entry.fieldTeleportSlug || entry.field_teleport_slug ||
          entry.huntSlug || entry.hunt_slug || entry.targetSlug || entry.target_slug)
      );
      if (huntSignal) {
        const huntArea = first(entry.areaSlug, entry.area_slug, entry.area?.slug, entry.regionSlug, entry.region_slug, entry.region?.slug, entry.zoneSlug, nextContext.area, nextContext.map);
        const huntMap = first(
          entry.mapSlug, entry.map_slug, entry.map?.slug, entry.worldSlug, entry.world_slug,
          entry.world?.slug, entry.continentSlug, nextContext.map,
          gameMapKeys.has(huntArea.toLowerCase()) ? huntArea : ''
        );
        hunts.push({
          ...entry,
          name,
          slug: slug || guide.replace(/^hunt[-_:]/i, ''),
          level,
          map: huntMap,
          mapName: first(entry.mapName, entry.map?.name, entry.worldName, entry.world?.name, entry.continentName, nextContext.mapName),
          area: huntArea || huntMap,
          areaName: first(entry.areaName, entry.area?.name, entry.regionName, entry.region?.name, entry.zoneName, nextContext.areaName, nextContext.mapName),
          guide
        });
      }
      Object.entries(entry).forEach(([key, child]) => {
        if (!child || typeof child !== 'object' || child === pokemon || child === creature || child === teleport) return;
        visit(child, nextContext, collectionRole(key), depth + 1);
      });
    };
    visit(markers);
    const unique = new Map();
    hunts.forEach((hunt) => {
      const key = [hunt.map, hunt.area, hunt.slug, hunt.name].map((value) => clean(value).toLowerCase()).join('|');
      if (!unique.has(key)) unique.set(key, hunt);
    });
    return { hunts: [...unique.values()], pokedex, allPokes, creatures };
  };
  return '(' + readCatalog.toString() + ')()';
}

function captureReferenceCatalogScript() {
  const readReferences = async () => {
    const requestJson = async (url) => {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        return response.ok ? await response.json() : null;
      } catch {
        return null;
      }
    };
    const creatures = await requestJson('/game/creatures.json');
    return { creatures };
  };
  return `(${readReferences.toString()})()`;
}

async function loadCaptureReferenceCatalog(panel) {
  if (!panel?.webview) return;
  const result = await panel.webview.executeJavaScript(captureReferenceCatalogScript());
  const records = farmReferenceRecords(result?.creatures);
  if (records.length) {
    const nextIndex = new Map(pokemonReferenceIndex);
    records.forEach((record) => {
      const key = pokemonReferenceKeys(record.name)[0];
      const current = nextIndex.get(key);
      const currentHasStats = Object.values(current?.baseStats || {}).some((value) => Number(value) > 0);
      nextIndex.set(key, {
        ...(current || {}),
        ...record,
        types: current?.types?.length ? current.types : record.types,
        rarity: current?.rarity || record.rarity,
        looktype: current?.looktype || record.looktype,
        speciesId: current?.speciesId || record.speciesId,
        level: current?.level || record.level,
        basePower: current?.basePower || record.basePower,
        baseStats: currentHasStats ? current.baseStats : record.baseStats
      });
    });
    const baseSpeciesByLooktype = new Map();
    nextIndex.forEach((record) => {
      if (record.looktype && record.speciesId > 0 && record.speciesId < 10_000 && !baseSpeciesByLooktype.has(record.looktype)) {
        baseSpeciesByLooktype.set(record.looktype, record.speciesId);
      }
    });
    nextIndex.forEach((record, key) => {
      nextIndex.set(key, {
        ...record,
        spriteSpeciesId: baseSpeciesByLooktype.get(record.looktype) || (record.speciesId < 10_000 ? record.speciesId : 0)
      });
    });
    pokemonReferenceIndex = nextIndex;
  }
}

function farmReferenceRecords(value) {
  const records = [];
  const seen = new WeakSet();
  const visit = (entry, depth = 0) => {
    if (!entry || typeof entry !== 'object' || depth > 7 || seen.has(entry)) return;
    seen.add(entry);
    if (!Array.isArray(entry)) {
      const name = String(
        entry.pokemonName || entry.pokeName || entry.speciesName ||
        entry.pokemon?.name || entry.species?.name || entry.name || ''
      ).trim();
      const types = normalizePokemonTypes([
        ...(Array.isArray(entry.types) ? entry.types : []),
        entry.type, entry.type1, entry.type2, entry.primaryType, entry.secondaryType,
        ...(Array.isArray(entry.pokemon?.types) ? entry.pokemon.types : []),
        ...(Array.isArray(entry.species?.types) ? entry.species.types : [])
      ].filter(Boolean));
      const tier = String(entry.tier || entry.rarity || entry.rank || '').trim();
      const rarity = String(entry.rarity || entry.quality || '').trim();
      const looktype = Number(entry.looktype || entry.lookType || entry.outfitId || 0) || 0;
      const speciesId = Number(entry.speciesId || entry.pokeId || entry.dexId || entry.pokedexId || 0) || 0;
      const level = Number(entry.huntLevel || entry.level || 0) || 0;
      const stats = entry.stats && typeof entry.stats === 'object' ? entry.stats : {};
      const baseStats = {
        hp: Number(stats.hp || entry.baseHp || 0) || null,
        attack: Number(stats.attack || stats.atk || entry.baseAtk || entry.baseAttack || 0) || null,
        defense: Number(stats.defense || stats.def || entry.baseDef || entry.baseDefense || 0) || null,
        specialAttack: Number(stats.specialAttack || stats.spAttack || stats.spAtk || entry.baseSpAtk || 0) || null,
        specialDefense: Number(stats.specialDefense || stats.spDefense || stats.spDef || entry.baseSpDef || 0) || null,
        speed: Number(stats.speed || entry.baseSpeed || 0) || null
      };
      const basePower = Number(
        entry.basePower || entry.power || entry.strength || entry.baseStatTotal ||
        stats.total || stats.power ||
        Object.values(baseStats).reduce((sum, value) => sum + (Number(value) || 0), 0)
      ) || 0;
      const moves = normalizeFarmMoves(entry.moves || entry.attacks || entry.skills || entry.pokemon?.attacks);
      const isShiny = entry.isShiny === true || entry.shiny === true || entry.variant?.shiny === true ||
        /(?:^|[\s_-])shiny(?:$|[\s_-])/i.test(`${entry.variant || ''} ${entry.form || ''} ${name}`);
      if (name && (types.length || tier || basePower || looktype)) {
        records.push({ name, types, tier, rarity, looktype, speciesId, level, basePower, baseStats, moves, isShiny });
      }
    }
    Object.values(entry).forEach((child) => {
      if (child && typeof child === 'object') visit(child, depth + 1);
    });
  };
  visit(value);
  return records;
}

async function loadFarmCatalogFromGame() {
  const gamePanels = panels.filter((panel) => {
    try { return panel.webview.getURL().startsWith(GAME_ORIGIN); } catch { return false; }
  });
  const sourcePanel = gamePanels.find((panel) => {
    try { return new URL(panel.webview.getURL()).pathname.startsWith('/play'); } catch { return false; }
  }) || gamePanels[0];
  if (!sourcePanel) throw new Error('Las sesiones del juego todavía no están listas.');
  const result = await sourcePanel.webview.executeJavaScript(farmEnhancedCatalogScript());
  const allPokeRecords = farmReferenceRecords(result?.allPokes);
  const shinyFormKeys = new Set(allPokeRecords.flatMap((record) => pokemonReferenceKeys(record.name)));
  const references = [
    ...farmReferenceRecords(result?.pokedex),
    ...allPokeRecords,
    ...farmReferenceRecords(result?.creatures)
  ];
  const referenceIndex = new Map();
  references.forEach((record) => {
    const key = pokemonReferenceKeys(record.name)[0];
    const current = referenceIndex.get(key) || {
      name: record.name, types: [], tier: '', rarity: '', looktype: 0, speciesId: 0, level: 0, basePower: 0, baseStats: {}
    };
    const hasBaseStats = Object.values(current.baseStats || {}).some((value) => Number(value) > 0);
    referenceIndex.set(key, {
      name: current.name || record.name,
      types: current.types.length ? current.types : record.types,
      tier: current.tier || record.tier,
      rarity: current.rarity || record.rarity,
      looktype: current.looktype || record.looktype,
      speciesId: current.speciesId || record.speciesId,
      level: current.level || record.level,
      basePower: current.basePower || record.basePower,
      baseStats: hasBaseStats ? current.baseStats : record.baseStats,
      moves: current.moves?.length ? current.moves : record.moves,
      isShiny: current.isShiny || record.isShiny
    });
  });
  const baseSpeciesByLooktype = new Map();
  referenceIndex.forEach((record) => {
    if (record.looktype && record.speciesId > 0 && record.speciesId < 10_000 && !baseSpeciesByLooktype.has(record.looktype)) {
      baseSpeciesByLooktype.set(record.looktype, record.speciesId);
    }
  });
  referenceIndex.forEach((record, key) => {
    referenceIndex.set(key, {
      ...record,
      spriteSpeciesId: baseSpeciesByLooktype.get(record.looktype) || (record.speciesId < 10_000 ? record.speciesId : 0)
    });
  });
  pokemonReferenceIndex = referenceIndex;
  const unique = new Map();
  (Array.isArray(result?.hunts) ? result.hunts : []).forEach((hunt) => {
    const [exactKey, baseKey] = pokemonReferenceKeys(hunt.name || hunt.slug);
    const exactReference = referenceIndex.get(exactKey) || null;
    const baseReference = baseKey && baseKey !== exactKey ? referenceIndex.get(baseKey) || null : null;
    const target = normalizeFarmTarget({
      ...(baseReference || {}),
      ...(exactReference || {}),
      ...hunt,
      hasShinyForm: Boolean(
        hunt.hasShinyForm || hunt.shinyAvailable || hunt.hasShiny || hunt.isShiny || hunt.shiny ||
        shinyFormKeys.has(exactKey) || (baseKey && shinyFormKeys.has(baseKey))
      ),
      spriteSpeciesId: exactReference?.spriteSpeciesId || baseReference?.spriteSpeciesId ||
        baseSpeciesByLooktype.get(Number(hunt.looktype) || 0) || 0
    });
    if (!target || target.level <= 0) return;
    const targetKey = [target.map, target.area, target.slug].map((value) => normalizeSearchText(value)).join('|');
    if (!unique.has(targetKey)) unique.set(targetKey, target);
  });
  const areaOrder = new Map(['kanto', 'outland', 'johto', 'orre', 'nightmare'].map((area, index) => [area, index]));
  farmCatalog = [...unique.values()].sort((left, right) =>
    (areaOrder.get(left.map || left.area) ?? 99) - (areaOrder.get(right.map || right.area) ?? 99) ||
    String(left.map || '').localeCompare(String(right.map || '')) ||
    String(left.area || '').localeCompare(String(right.area || '')) ||
    left.level - right.level ||
    left.name.localeCompare(right.name)
  );
}

async function refreshFarmData() {
  if (farmBusy) return;
  refreshFarmButton.disabled = true;
  setFarmGlobalState('Leyendo mapas y niveles', 'busy');
  setFarmMessage('');
  try {
    await withTimeout(loadFarmCatalogFromGame(), 7000, 'El catálogo de mapas tardó demasiado en responder.');
    refreshGoalPokemonSuggestions();
    setFarmGlobalState(`${farmCatalog.length} zonas disponibles`, 'ready');
    renderFarmAccounts();
    if (!farmPickerLayer.hidden) renderFarmPicker();
  } catch (error) {
    setFarmGlobalState('Catálogo no disponible');
    setFarmMessage(error.message || 'No fue posible leer los mapas del juego.');
  }
  await refreshFarmContexts({ render: false }).catch(() => {});
  refreshFarmButton.disabled = false;
  renderFarmAccounts();
  if (!farmPickerLayer.hidden) renderFarmPicker();
}

async function refreshFarmContexts({ render = true, forcePokes = false, accountIndex = null } = {}) {
  if (farmContextPollBusy) return farmContexts;
  farmContextPollBusy = true;
  try {
    const contexts = await Promise.all(panels.map(async (panel, index) => {
      if (accountIndex !== null && index !== accountIndex) return farmContexts[index];
      try {
        const url = panel.webview.getURL();
        if (!url.startsWith(GAME_ORIGIN) || new URL(url).pathname === '/login') {
          return { level: null, location: '', ready: false, leader: null };
        }
        return await withTimeout(
          panel.webview.executeJavaScript(farmEnhancedContextScript(forcePokes)),
          forcePokes ? 6500 : 4500,
          'La lectura del equipo tardó demasiado.'
        );
      } catch {
        return { level: null, location: '', ready: false, leader: null };
      }
    }));
    farmContexts = contexts.map((context) => ({
      level: Number.isFinite(Number(context?.level)) ? Number(context.level) : null,
      location: String(context?.location || ''),
      trainerName: String(context?.trainerName || '').trim(),
      ready: Boolean(context?.ready),
      leader: normalizeFarmLeader(context?.leader)
    }));
    if (render && !farmBackdrop.hidden) {
      renderFarmAccounts();
      if (!farmPickerLayer.hidden) renderFarmPicker();
    }
    return farmContexts;
  } finally {
    farmContextPollBusy = false;
  }
}

async function rereadFarmLeaders(accountIndex = null) {
  if (farmContextPollBusy) return;
  if (accountIndex === null) rereadFarmLeadersButton.disabled = true;
  if (accountIndex !== null && panels[accountIndex]) panels[accountIndex].farmLeaderRefreshBusy = true;
  setFarmMessage(accountIndex === null ? 'Solicitando el equipo actualizado de todas las cuentas…' : 'Releyendo el Pokémon líder…');
  renderFarmAccounts();
  await refreshFarmContexts({ forcePokes: true, accountIndex });
  if (accountIndex === null) rereadFarmLeadersButton.disabled = false;
  if (accountIndex !== null && panels[accountIndex]) panels[accountIndex].farmLeaderRefreshBusy = false;
  const detected = farmContexts.filter((context, index) => accountIndex === null || index === accountIndex)
    .filter((context) => context.leader).length;
  setFarmMessage(detected ? 'Pokémon principal actualizado desde el juego.' : 'No se recibió el equipo. Entra al juego y vuelve a pulsar releer.', detected ? 'ok' : '');
  renderFarmAccounts();
  if (!farmPickerLayer.hidden) renderFarmPicker();
}

function setPanelFarmChip(panel, config, visible) {
  if (!panel?.farmChip) return;
  panel.farmChip.hidden = !visible;
  panel.farmChip.textContent = visible && config?.target
    ? `🎯 ${config.target.name}`
    : '';
}

function renderFarmAccounts() {
  farmAccountGrid.replaceChildren();
  panelOrder.forEach((index) => {
    const config = farmConfigs[index];
    const panel = panels[index];
    const context = farmContexts[index] || { level: null, location: '', ready: false };
    const account = document.createElement('article');
    account.className = 'farm-account';
    account.dataset.accountIndex = String(index);
    account.classList.toggle('is-disabled', !config.enabled);
    account.classList.toggle('is-running', panel?.farmRunState === 'ok');
    account.classList.toggle('is-error', panel?.farmRunState === 'error');

    const head = document.createElement('div');
    head.className = 'farm-account-head';
    const identity = document.createElement('div');
    identity.className = 'farm-account-name';
    const accountIndex = document.createElement('span');
    accountIndex.className = 'farm-account-index';
    accountIndex.textContent = String(index + 1).padStart(2, '0');
    const identityCopy = document.createElement('div');
    const accountName = document.createElement('strong');
    const panelLabel = accounts[index]?.label || `Cuenta ${index + 1}`;
    const realPlayerName = context.trainerName || String(accounts[index]?.username || '').trim();
    accountName.textContent = realPlayerName || 'Jugador no detectado';
    const accountMeta = document.createElement('span');
    accountMeta.className = 'farm-account-meta';
    accountMeta.textContent = context.ready
      ? `${panelLabel} · Nivel ${context.level ?? '?'}${context.location ? ` · ${context.location}` : ''}`
      : 'Esperando que la sesión entre al juego';
    identityCopy.append(accountName, accountMeta);
    identity.append(accountIndex, identityCopy);

    const enableLabel = document.createElement('label');
    enableLabel.className = 'farm-enable';
    enableLabel.title = config.enabled ? 'Incluir esta cuenta' : 'Cuenta excluida';
    const enableInput = document.createElement('input');
    enableInput.type = 'checkbox';
    enableInput.checked = config.enabled;
    const enableVisual = document.createElement('span');
    enableVisual.setAttribute('aria-hidden', 'true');
    enableInput.addEventListener('change', () => {
      config.enabled = enableInput.checked;
      saveFarmConfigs();
      renderFarmAccounts();
    });
    enableLabel.append(enableInput, enableVisual);
    const headActions = document.createElement('div');
    headActions.className = 'farm-account-head-actions';
    const rereadButton = document.createElement('button');
    rereadButton.type = 'button';
    rereadButton.className = 'farm-leader-refresh';
    rereadButton.textContent = '↻';
    rereadButton.title = 'Releer Pokémon principal de esta cuenta';
    rereadButton.setAttribute('aria-label', rereadButton.title);
    rereadButton.disabled = Boolean(panel?.farmLeaderRefreshBusy);
    rereadButton.addEventListener('click', () => rereadFarmLeaders(index));
    headActions.append(rereadButton, enableLabel);
    head.append(identity, headActions);

    const leaderCard = document.createElement('section');
    leaderCard.className = 'farm-leader-card';
    const leader = context.leader;
    leaderCard.classList.toggle('is-missing', !leader);
    const leaderVisual = document.createElement('span');
    leaderVisual.className = 'farm-leader-visual';
    if (leader?.name) {
      leaderVisual.appendChild(createFarmSprite(leader, 38));
    } else {
      leaderVisual.textContent = '?';
    }
    const leaderCopy = document.createElement('div');
    leaderCopy.className = 'farm-leader-copy';
    const leaderEyebrow = document.createElement('span');
    leaderEyebrow.className = 'farm-leader-eyebrow';
    leaderEyebrow.textContent = leader ? `POKÉMON LÍDER EQUIPADO${leader.id ? ` · ID ${leader.id}` : ''}` : 'LÍDER NO DETECTADO';
    const leaderName = document.createElement('strong');
    leaderName.textContent = leader?.name || 'Entra al juego para leer el equipo';
    const leaderTypes = document.createElement('div');
    leaderTypes.className = 'farm-leader-types';
    (leader?.types || []).forEach((type) => {
      const badge = document.createElement('span');
      badge.dataset.type = type;
      badge.textContent = pokemonTypeLabel(type);
      leaderTypes.appendChild(badge);
    });
    leaderCopy.append(leaderEyebrow, leaderName, leaderTypes);
    const leaderStats = document.createElement('div');
    leaderStats.className = 'farm-leader-stats';
    const statRows = leader ? [
      ['NIVEL', leader.level || '?'],
      [`FUERZA${leader.strengthSource === 'Ataque' ? ' (ATQ)' : leader.strengthSource === 'Estimado' ? ' EST.' : ''}`, leader.strength || '?'],
      ['VIDA', leader.maxHp ? `${leader.hp || 0}/${leader.maxHp}` : '?']
    ] : [['ESTADO', 'Sin datos']];
    statRows.forEach(([label, value]) => {
      const stat = document.createElement('span');
      const statLabel = document.createElement('small');
      statLabel.textContent = label;
      const statValue = document.createElement('b');
      statValue.textContent = String(value);
      stat.append(statLabel, statValue);
      leaderStats.appendChild(stat);
    });
    leaderCard.append(leaderVisual, leaderCopy, leaderStats);
    if (leader) {
      const details = document.createElement('div');
      details.className = 'farm-leader-detail-stats';
      [
        ['HP', leader.stats.hp], ['ATK', leader.stats.attack], ['DEF', leader.stats.defense],
        ['SPA', leader.stats.specialAttack], ['SPD', leader.stats.specialDefense], ['VEL', leader.stats.speed]
      ].forEach(([label, value]) => {
        const stat = document.createElement('span');
        const statLabel = document.createElement('small');
        statLabel.textContent = label;
        const statValue = document.createElement('b');
        statValue.textContent = String(value || '?');
        stat.append(statLabel, statValue);
        details.appendChild(stat);
      });
      leaderCard.appendChild(details);
      const tmSummary = farmLeaderTmSummary(leader);
      const tmPanel = document.createElement('div');
      tmPanel.className = `farm-leader-tms${tmSummary.all.length ? '' : ' is-empty'}`;
      const tmLabel = document.createElement('small');
      tmLabel.textContent = 'MT EQUIPADAS';
      tmPanel.appendChild(tmLabel);
      if (!tmSummary.all.length) {
        const emptyTm = document.createElement('span');
        emptyTm.className = 'farm-leader-tm-empty';
        emptyTm.textContent = 'AoE o de tipo no detectadas';
        tmPanel.appendChild(emptyTm);
      } else {
        tmSummary.all.forEach((tm) => {
          const badge = document.createElement('span');
          badge.className = `farm-leader-tm is-${tm.kind}`;
          if (tm.type) badge.dataset.type = tm.type;
          badge.title = tm.name;
          badge.textContent = `${tm.kind === 'aoe' ? '◎ AoE' : tm.type ? pokemonTypeLabel(tm.type) : 'MT'} · ${tm.name}`;
          tmPanel.appendChild(badge);
        });
      }
      leaderCard.appendChild(tmPanel);
    }

    const body = document.createElement('div');
    body.className = 'farm-account-body';
    const targetButton = document.createElement('button');
    targetButton.type = 'button';
    targetButton.className = 'farm-target-button';
    targetButton.disabled = false;
    targetButton.appendChild(createFarmSprite(config.target));
    const targetCopy = document.createElement('span');
    targetCopy.className = 'farm-target-copy';
    const targetName = document.createElement('strong');
    targetName.textContent = config.target?.name || 'Seleccionar Pokémon';
    const targetMeta = document.createElement('small');
    const selectedMatchup = config.target ? evaluateFarmTarget(config.target, context) : null;
    targetMeta.textContent = config.target
      ? `${farmTargetLocationLabel(config.target)} · Nivel ${config.target.level}${selectedMatchup ? ` · ${selectedMatchup.label} ${selectedMatchup.score}%` : ''}`
      : farmCatalog.length ? `${farmCatalog.length} zonas de caza disponibles` : 'Actualiza el catálogo del juego';
    targetCopy.append(targetName, targetMeta);
    const targetArrow = document.createElement('span');
    targetArrow.className = 'farm-target-arrow';
    targetArrow.textContent = '›';
    targetButton.append(targetCopy, targetArrow);
    targetButton.addEventListener('click', () => openFarmPicker(index));

    const accountAction = document.createElement('button');
    accountAction.type = 'button';
    accountAction.className = 'button button-farm farm-account-action';
    accountAction.setAttribute('aria-label', panel?.farmRunState === 'busy' ? 'Iniciando farmeo' : 'Viajar e iniciar farmeo en esta cuenta');
    accountAction.title = panel?.farmRunState === 'busy' ? 'Iniciando…' : 'Viajar / Iniciar farmeo';
    const playIcon = document.createElement('span');
    playIcon.className = 'play-icon';
    playIcon.setAttribute('aria-hidden', 'true');
    accountAction.appendChild(playIcon);
    accountAction.disabled = panel?.farmRunState === 'busy' || !config.target || !context.ready;
    accountAction.addEventListener('click', () => startFarmAccount(index));
    body.append(targetButton, accountAction);

    const status = document.createElement('div');
    status.className = 'farm-account-status';
    status.classList.toggle('is-ok', panel?.farmRunState === 'ok');
    status.classList.toggle('is-error', panel?.farmRunState === 'error');
    const orreCheck = config.target ? validateOrreTarget(config.target, context) : null;
    status.classList.toggle('is-warning', Boolean(orreCheck && !orreCheck.ok));
    const orreMessage = orreCheck && !orreCheck.ok && farmAllowOrreTravel
      ? `${orreCheck.message} · viaje autorizado por el usuario`
      : orreCheck?.message;
    status.textContent = panel?.farmRunMessage || (orreCheck && !orreCheck.ok ? orreMessage :
      config.enabled ? 'Lista para configurar' : 'Excluida del inicio global · acción individual disponible');
    account.append(head, leaderCard, body, status);
    farmAccountGrid.appendChild(account);
  });
}

async function openFarmPicker(index) {
  farmPickerIndex = index;
  farmPickerArea = 'all';
  farmPickerType = 'all';
  farmPickerLevel = 'all';
  farmPickerMatchup = 'all';
  farmPickerSort = 'recommended';
  farmPickerShinyOnly = false;
  farmSearchInput.value = '';
  farmTypeFilter.value = 'all';
  farmLevelFilter.value = 'all';
  farmMatchupFilter.value = 'all';
  farmSortSelect.value = 'recommended';
  farmShinyFilter.checked = false;
  farmPickerLayer.hidden = false;
  renderFarmPicker();
  farmSearchInput.focus();
  if (!farmCatalog.length) await refreshFarmData();
}

function closeFarmPicker() {
  farmPickerLayer.hidden = true;
  farmPickerIndex = -1;
}

function farmLevelFilterMatches(target, context) {
  if (farmPickerLevel === 'all') return true;
  if (farmPickerLevel === 'accessible') return !context.ready || context.level === null || target.level <= context.level;
  if (farmPickerLevel === '201+') return target.level >= 201;
  const [minimum, maximum] = farmPickerLevel.split('-').map(Number);
  return Number.isFinite(minimum) && Number.isFinite(maximum) ? target.level >= minimum && target.level <= maximum : true;
}

function createFarmTypeBadge(type) {
  const badge = document.createElement('span');
  badge.className = 'farm-type-badge';
  badge.dataset.type = type;
  badge.textContent = pokemonTypeLabel(type);
  return badge;
}

function renderFarmRoute(scoredTargets, context) {
  farmRecommendedRoute.replaceChildren();
  const leader = context.leader;
  const heading = document.createElement('div');
  heading.className = 'farm-route-heading';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = leader ? `Ruta optimizada para ${leader.name}` : 'Ruta optimizada';
  const subtitle = document.createElement('span');
  subtitle.textContent = leader
    ? `Pondera tipos, nivel, poder real, movimientos y requisitos de Orre.`
    : 'Equipa un Pokémon líder para calcular compatibilidad de tipos.';
  copy.append(title, subtitle);
  const leaderScore = document.createElement('span');
  leaderScore.className = 'farm-route-leader';
  leaderScore.textContent = leader ? `Nv.${leader.level || '?'} · Fuerza ${leader.strength || '?'}${leader.strengthSource === 'Estimado' ? ' est.' : ''}` : 'Sin líder';
  heading.append(copy, leaderScore);
  farmRecommendedRoute.appendChild(heading);

  const routeList = document.createElement('div');
  routeList.className = 'farm-route-list';
  const route = scoredTargets.filter(({ matchup }) => matchup.accessible).slice(0, 5);
  if (!route.length) {
    const empty = document.createElement('p');
    empty.className = 'farm-route-empty';
    empty.textContent = 'No hay combates accesibles con los filtros actuales.';
    routeList.appendChild(empty);
  } else {
    route.forEach(({ target, matchup }, index) => {
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'farm-route-step';
      const position = document.createElement('span');
      position.className = 'farm-route-position';
      position.textContent = String(index + 1);
      const stepCopy = document.createElement('span');
      const stepName = document.createElement('b');
      stepName.textContent = target.name;
      const stepReason = document.createElement('small');
      stepReason.textContent = matchup.reasons[0] || `${matchup.label} · Nivel ${target.level}`;
      stepCopy.append(stepName, stepReason);
      const score = document.createElement('strong');
      score.textContent = `${matchup.score}%`;
      step.append(position, stepCopy, score);
      step.title = matchup.reasons.join(' · ');
      step.addEventListener('click', () => {
        farmSearchInput.value = target.name;
        renderFarmPicker();
      });
      routeList.appendChild(step);
    });
  }
  farmRecommendedRoute.appendChild(routeList);
}

function renderFarmPickerLegacy() {
  if (farmPickerIndex < 0) return;
  const context = farmContexts[farmPickerIndex] || { level: null };
  const config = farmConfigs[farmPickerIndex];
  const accountName = accounts[farmPickerIndex]?.label || `Cuenta ${farmPickerIndex + 1}`;
  farmPickerAccount.textContent = context.ready
    ? `${accountName} · Nivel ${context.level ?? '?'} · Elige una zona accesible`
    : `${accountName} · Sesión aún no detectada · Puedes preparar la selección`;

  const areas = ['all', ...new Set(farmCatalog.map((target) => target.area))];
  farmAreaFilters.replaceChildren();
  areas.forEach((area) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'farm-area-button';
    button.classList.toggle('is-active', farmPickerArea === area);
    button.textContent = area === 'all' ? 'Todos' : farmAreaLabel(area);
    button.addEventListener('click', () => {
      farmPickerArea = area;
      renderFarmPicker();
    });
    farmAreaFilters.appendChild(button);
  });

  const search = normalizeSearchText(farmSearchInput.value);
  const filtered = farmCatalog.filter((target) => {
    if (farmPickerArea !== 'all' && target.area !== farmPickerArea) return false;
    if (!search) return true;
    return normalizeSearchText(`${target.name} ${target.slug} ${farmTargetLocationLabel(target)} nivel ${target.level}`).includes(search);
  });
  farmPokemonGrid.replaceChildren();
  filtered.forEach((target) => {
    const locked = context.ready && context.level !== null && target.level > context.level;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'farm-pokemon-option';
    button.classList.toggle('is-selected', config.target?.slug === target.slug);
    button.disabled = locked;
    button.appendChild(createFarmSprite(target));
    const copy = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = target.name;
    const meta = document.createElement('small');
    meta.textContent = `${farmTargetLocationLabel(target)} · Nivel ${target.level}`;
    copy.append(name, meta);
    if (locked) {
      const lock = document.createElement('small');
      lock.className = 'farm-lock';
      lock.textContent = `🔒 Requiere nivel ${target.level}`;
      copy.appendChild(lock);
    }
    button.appendChild(copy);
    button.addEventListener('click', () => {
      config.target = { ...target };
      saveFarmConfigs();
      closeFarmPicker();
      renderFarmAccounts();
    });
    farmPokemonGrid.appendChild(button);
  });
  farmPickerEmpty.hidden = filtered.length > 0;
}

function renderFarmPicker() {
  if (farmPickerIndex < 0) return;
  const context = farmContexts[farmPickerIndex] || { level: null, leader: null };
  const config = farmConfigs[farmPickerIndex];
  const accountName = accounts[farmPickerIndex]?.label || `Cuenta ${farmPickerIndex + 1}`;
  farmPickerAccount.textContent = context.ready
    ? context.leader
      ? `${accountName} · ${context.leader.name} Nv.${context.leader.level || '?'} · Fuerza ${context.leader.strength || '?'}${context.leader.strengthSource === 'Estimado' ? ' estimada' : ''}`
      : `${accountName} · Nivel ${context.level ?? '?'} · Líder no detectado`
    : `${accountName} · Sesión aún no detectada · Puedes preparar la selección`;

  const areas = ['all', ...new Set(farmCatalog.map((target) => target.area))];
  farmAreaFilters.replaceChildren();
  areas.forEach((area) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'farm-area-button';
    button.classList.toggle('is-active', farmPickerArea === area);
    button.textContent = area === 'all' ? 'Todos' : farmAreaLabel(area);
    button.addEventListener('click', () => {
      farmPickerArea = area;
      renderFarmPicker();
    });
    farmAreaFilters.appendChild(button);
  });

  const availableTypes = [...new Set(farmCatalog.flatMap((target) => target.types || []))].sort((left, right) =>
    pokemonTypeLabel(left).localeCompare(pokemonTypeLabel(right))
  );
  farmTypeFilter.replaceChildren();
  const allTypesOption = document.createElement('option');
  allTypesOption.value = 'all';
  allTypesOption.textContent = 'Todos los tipos';
  farmTypeFilter.appendChild(allTypesOption);
  availableTypes.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = pokemonTypeLabel(type);
    farmTypeFilter.appendChild(option);
  });
  farmTypeFilter.value = availableTypes.includes(farmPickerType) ? farmPickerType : 'all';
  farmPickerType = farmTypeFilter.value;
  farmLevelFilter.value = farmPickerLevel;
  farmMatchupFilter.value = farmPickerMatchup;
  farmSortSelect.value = farmPickerSort;

  const search = normalizeSearchText(farmSearchInput.value);
  const evaluated = farmCatalog.map((target) => ({ target, matchup: evaluateFarmTarget(target, context) }));
  const matchesStructuredFilters = ({ target, matchup }) => {
    if (farmPickerArea !== 'all' && target.area !== farmPickerArea) return false;
    if (farmPickerType !== 'all' && !target.types.includes(farmPickerType)) return false;
    if (farmPickerShinyOnly && !target.hasShinyForm && !target.isShiny) return false;
    if (!farmLevelFilterMatches(target, context)) return false;
    if (farmPickerMatchup === 'recommended' && !matchup.recommended) return false;
    if (farmPickerMatchup === 'advantage' && !matchup.hasAdvantage) return false;
    if (farmPickerMatchup === 'safe' && !matchup.safe) return false;
    return true;
  };
  const matchesSearch = ({ target }) => {
    if (!search) return true;
    const referenceKeys = pokemonReferenceKeys(target.name || target.slug);
    const baseName = referenceKeys[referenceKeys.length - 1] || '';
    const searchable = [
      target.name,
      baseName,
      target.slug,
      farmTargetLocationLabel(target),
      target.area,
      `nivel ${target.level}`,
      target.tier,
      target.rarity,
      target.hasShinyForm ? 'shiny variocolor vario color' : '',
      ...(target.types || []),
      ...(target.types || []).map(pokemonTypeLabel)
    ].join(' ');
    return normalizeSearchText(searchable).includes(search);
  };
  const compareRecommended = (left, right) =>
    Number(right.matchup.accessible) - Number(left.matchup.accessible) ||
    right.matchup.score - left.matchup.score ||
    left.target.level - right.target.level ||
    left.target.name.localeCompare(right.target.name);
  const routeTargets = evaluated.filter(matchesStructuredFilters).filter(matchesSearch).sort(compareRecommended);
  renderFarmRoute(routeTargets, context);

  const filtered = [...routeTargets];
  if (farmPickerSort === 'level-asc') filtered.sort((left, right) => left.target.level - right.target.level || right.matchup.score - left.matchup.score);
  else if (farmPickerSort === 'level-desc') filtered.sort((left, right) => right.target.level - left.target.level || right.matchup.score - left.matchup.score);
  else if (farmPickerSort === 'name') filtered.sort((left, right) => left.target.name.localeCompare(right.target.name));
  else filtered.sort(compareRecommended);

  farmPokemonGrid.replaceChildren();
  filtered.forEach(({ target, matchup }, index) => {
    const locked = context.ready && context.level !== null && target.level > context.level;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'farm-pokemon-option farm-pokemon-smart-option';
    button.classList.toggle('is-selected', config.target?.slug === target.slug);
    button.classList.toggle('is-recommended', matchup.recommended && !locked);
    button.classList.toggle('is-dangerous', !locked && matchup.score < 40);
    button.dataset.primaryType = target.types?.[0] || 'unknown';
    button.dataset.matchup = locked ? 'locked' : matchup.score >= 75 ? 'excellent' : matchup.score >= 58 ? 'good' : matchup.score >= 40 ? 'possible' : 'dangerous';
    button.disabled = locked;
    button.appendChild(createFarmSprite(target));

    const copy = document.createElement('span');
    copy.className = 'farm-smart-copy';
    const nameRow = document.createElement('span');
    nameRow.className = 'farm-smart-name-row';
    const name = document.createElement('strong');
    name.textContent = `${target.isShiny ? '✨ ' : ''}${target.name}`;
    const rank = document.createElement('span');
    rank.className = 'farm-smart-rank';
    rank.textContent = `#${index + 1}`;
    nameRow.append(name, rank);
    const typeRow = document.createElement('span');
    typeRow.className = 'farm-smart-types';
    (target.types || []).forEach((type) => typeRow.appendChild(createFarmTypeBadge(type)));
    if (!target.types?.length) {
      const unknown = document.createElement('span');
      unknown.className = 'farm-type-unknown';
      unknown.textContent = 'Tipo no disponible';
      typeRow.appendChild(unknown);
    }
    const meta = document.createElement('small');
    meta.textContent = `${farmTargetLocationLabel(target)} · Nivel ${target.level}${target.tier ? ` · Tier ${target.tier}` : ''}`;
    const reason = document.createElement('small');
    reason.className = 'farm-smart-reason';
    reason.textContent = matchup.reasons.join(' · ') || 'Comparación basada en nivel disponible';
    copy.append(nameRow, typeRow, meta, reason);

    const verdict = document.createElement('span');
    verdict.className = 'farm-matchup-verdict';
    const verdictScore = document.createElement('b');
    verdictScore.textContent = locked ? '🔒' : `${matchup.score}%`;
    const verdictLabel = document.createElement('small');
    verdictLabel.textContent = locked ? `Nv.${target.level}` : matchup.label;
    verdict.append(verdictScore, verdictLabel);
    button.append(copy, verdict);
    button.title = `${matchup.label}: ${matchup.reasons.join(' · ')}`;
    button.addEventListener('click', () => {
      config.target = { ...target };
      saveFarmConfigs();
      closeFarmPicker();
      renderFarmAccounts();
    });
    farmPokemonGrid.appendChild(button);
  });
  farmPickerEmpty.hidden = filtered.length > 0;
}

async function openFarmModal() {
  farmBackdrop.hidden = false;
  setFarmMessage('');
  renderFarmAccounts();
  await refreshFarmData();
  window.clearInterval(farmContextTimer);
  farmContextTimer = window.setInterval(() => refreshFarmContexts(), 5000);
}

function closeFarmModal() {
  if (farmBusy) return;
  closeFarmPicker();
  farmBackdrop.hidden = true;
  window.clearInterval(farmContextTimer);
  farmContextTimer = null;
}

function buildFarmAutomationScript(config, options = {}) {
  const target = JSON.stringify(config.target);
  const allowOrreTravel = Boolean(options.allowOrreTravel);
  return `(async () => {
    const target = ${target};
    const allowOrreTravel = ${JSON.stringify(allowOrreTravel)};
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const visible = (element) => {
      if (!element || element.hidden) return false;
      if (element.dataset?.pgLauncherHuntSource || element.dataset?.pgLauncherMonitorSource) return true;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const waitFor = async (getter, timeout = 10000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const value = getter();
        if (value) return value;
        await delay(100);
      }
      return null;
    };
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/\\s+/g, ' ')
      .toLowerCase()
      .trim();
    const buttonDescriptor = (button) => normalize([
      button.dataset?.pgLabel,
      button.dataset?.guide,
      button.dataset?.slug,
      button.dataset?.huntSlug,
      button.dataset?.teleportSlug,
      button.dataset?.fieldTeleportSlug,
      button.dataset?.map,
      button.dataset?.mapSlug,
      button.dataset?.world,
      button.dataset?.region,
      button.dataset?.area,
      button.getAttribute('data-target'),
      button.getAttribute('data-marker-id'),
      button.getAttribute('aria-label'),
      button.getAttribute('title'),
      button.textContent,
      button.querySelector('img')?.getAttribute('alt'),
      button.querySelector('img')?.getAttribute('src')
    ].filter(Boolean).join(' '));
    const actionRules = {
      map: [/(^| )map($| )|mapa/, /icon_map|\\/map/],
      analyzer: [/hunt analyzer|analisador de hunt|analisador/, /hunt_analyzer|analyzer/]
    };
    const clickDockAction = (action) => {
      const rules = actionRules[action] || [];
      const buttons = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button')];
      const button = buttons.find((candidate) => rules.some((rule) => rule.test(buttonDescriptor(candidate))));
      if (!button) return false;
      button.click();
      return true;
    };

    const findMapWindow = () => {
      const direct = [
        '.map-window', '[data-map-window]', '[data-guide="map-window"]',
        '.map-overlay', '.map-modal', '[class*="map-window"]'
      ].flatMap((selector) => [...document.querySelectorAll(selector)])
        .find((element) => visible(element));
      if (direct) return direct;
      const mapControl = document.querySelector('.map-viewport, .map-inner, .hunt-marker, [data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug]');
      let parent = mapControl?.parentElement || null;
      for (let depth = 0; parent && depth < 8; depth += 1, parent = parent.parentElement) {
        if (visible(parent) && parent.querySelector('button, [role="button"], .hunt-marker')) return parent;
      }
      return null;
    };
    if (!findMapWindow()) {
      if (!clickDockAction('map')) throw new Error('No se encontró el botón Map de esta cuenta.');
    }
    const mapWindow = await waitFor(() => {
      const element = findMapWindow();
      return visible(element) ? element : null;
    }, 8500);
    if (!mapWindow) throw new Error('El mapa del juego no abrió a tiempo.');

    const isSelected = (element) => Boolean(
      element?.classList?.contains('on') || element?.classList?.contains('active') ||
      element?.classList?.contains('selected') || element?.getAttribute('aria-selected') === 'true' ||
      element?.getAttribute('aria-pressed') === 'true' || element?.dataset?.active === 'true' ||
      element?.dataset?.selected === 'true'
    );
    const clickControl = (element) => {
      element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      element?.click?.();
    };
    const navigationCandidates = () => [...new Set([
      ...document.querySelectorAll('.map-area, .map-plate, .map-tab, .map-region'),
      ...document.querySelectorAll('[data-map], [data-map-slug], [data-world], [data-region], [data-area]'),
      ...document.querySelectorAll('[role="tab"]')
    ])].filter((element) => !element.matches('.hunt-marker, [data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug]'));
    const selectNavigation = async (value, kind) => {
      const wanted = normalize(value);
      if (!wanted) return false;
      const exactAttributes = kind === 'map'
        ? ['data-map-slug', 'data-map', 'data-world']
        : ['data-area', 'data-region', 'data-zone'];
      const matchesControl = (element) => exactAttributes.some((attribute) => normalize(element.getAttribute(attribute)) === wanted) ||
        buttonDescriptor(element) === wanted || buttonDescriptor(element).includes(wanted);
      const control = navigationCandidates().find(matchesControl);
      if (!control) return false;
      if (!isSelected(control)) {
        clickControl(control);
        await delay(350);
        const activated = await waitFor(() => navigationCandidates().find((element) => matchesControl(element) && isSelected(element)) || null, 3000);
        if (!activated) return false;
      }
      return true;
    };

    const targetMap = normalize(target.map || target.mapName);
    const targetMapName = normalize(target.mapName);
    const targetArea = normalize(target.area);
    const targetAreaName = normalize(target.areaName);
    let mapSelected = await selectNavigation(targetMap, 'map');
    if (!mapSelected && targetMapName !== targetMap) mapSelected = await selectNavigation(targetMapName, 'map');
    if (targetMap && !mapSelected) {
      throw new Error('No se pudo activar el mapa ' + (target.mapName || target.map) + ' antes de buscar ' + target.name + '.');
    }
    if (targetArea && targetArea !== targetMap) {
      const areaSelected = await selectNavigation(targetArea, 'area');
      if (!areaSelected && targetAreaName !== targetArea) await selectNavigation(targetAreaName, 'area');
    }

    const markerGuide = 'hunt-' + target.slug;
    const targetSlug = normalize(target.slug);
    const targetName = normalize(target.name);
    const markerCandidates = () => [...new Set([
      ...document.querySelectorAll('.hunt-marker'),
      ...document.querySelectorAll('[data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug], [data-guide^="hunt-"]'),
      ...document.querySelectorAll('[data-marker-type="hunt"], [data-type="hunt"]')
    ])];
    const markerSlugValues = (candidate) => [
      candidate.dataset?.huntSlug,
      candidate.dataset?.teleportSlug,
      candidate.dataset?.fieldTeleportSlug,
      candidate.dataset?.slug,
      candidate.dataset?.guide?.replace(/^hunt[-_:]/i, ''),
      candidate.getAttribute('data-target')
    ].map(normalize).filter(Boolean);
    const findMarker = () => {
      const candidates = markerCandidates();
      return candidates.find((candidate) => markerSlugValues(candidate).includes(targetSlug)) ||
        candidates.find((candidate) => normalize(candidate.dataset?.guide) === normalize(markerGuide)) ||
        candidates.find((candidate) => buttonDescriptor(candidate).includes(targetName)) || null;
    };
    let marker = await waitFor(findMarker, 4500);
    if (!marker) {
      const searchInput = [
        ...document.querySelectorAll('.map-filter-q, input[type="search"], input[data-map-search]')
      ].find((input) => visible(input));
      if (searchInput) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (setter) setter.call(searchInput, target.name);
        else searchInput.value = target.name;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        marker = await waitFor(findMarker, 7000);
      }
    }
    if (!marker) {
      const location = [target.mapName || target.map, target.areaName || target.area].filter(Boolean).join(' / ');
      throw new Error('No se encontró la zona de ' + target.name + (location ? ' en ' + location : '') + '.');
    }
    if (marker.classList.contains('no') || marker.disabled) {
      throw new Error(target.name + ' todavía está bloqueado para esta cuenta.');
    }
    const locationMatchesTarget = () => {
      const meta = document.querySelector('.phud-tloc, .pg-player-meta, [data-current-hunt], [data-current-location]');
      const descriptor = meta ? buttonDescriptor(meta) : '';
      return Boolean(descriptor && (descriptor.includes(targetName) || descriptor.includes(targetSlug)));
    };
    const alreadyAtTarget = marker.classList.contains('here') || locationMatchesTarget();
    if (alreadyAtTarget) {
      const closeMapButton = findMapWindow()?.querySelector('.cfg-x, [data-action="close"], [aria-label*="cerrar" i], [aria-label*="close" i]');
      closeMapButton?.click();
      const mapClosed = await waitFor(() => !findMapWindow(), 3000);
      if (!mapClosed) throw new Error('La cuenta ya está en ' + target.name + ', pero no se pudo cerrar el mapa.');
    } else {
      clickControl(marker);
      const targetRegion = normalize([target.map, target.mapName, target.area, target.areaName].filter(Boolean).join(' '));
      const isOrreTarget = targetRegion.split(/[^a-z0-9]+/).includes('orre');
      if (isOrreTarget && allowOrreTravel) {
        const confirmation = await waitFor(() => {
          const promptPattern = /hunt properly|needs both the aoe|elemental tms|still want to enter/;
          const yesPattern = /^(yes|si|confirm|aceptar|entrar)$/;
          const candidates = [...document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')]
            .filter((button) => visible(button) && yesPattern.test(normalize(buttonDescriptor(button) || button.value)));
          const matches = candidates.map((button) => {
            let container = button.parentElement;
            for (let depth = 0; container && depth < 10; depth += 1, container = container.parentElement) {
              if (promptPattern.test(normalize(container.textContent))) {
                const hasNoButton = [...container.querySelectorAll('button, [role="button"]')]
                  .some((candidate) => /^(no|cancel|cancelar)$/.test(normalize(buttonDescriptor(candidate))));
                return { button, depth, hasNoButton };
              }
            }
            return null;
          }).filter(Boolean).sort((left, right) => Number(right.hasNoButton) - Number(left.hasNoButton) || left.depth - right.depth);
          if (matches[0]) return { yesButton: matches[0].button };
          return !findMapWindow() || locationMatchesTarget() ? { skipped: true } : null;
        }, 6500);
        if (confirmation?.yesButton) {
          confirmation.yesButton.scrollIntoView?.({ block: 'center', inline: 'center' });
          ['pointerdown', 'mousedown', 'pointerup', 'mouseup'].forEach((type) => {
            const EventType = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
            confirmation.yesButton.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
          });
          confirmation.yesButton.click();
          await delay(300);
        }
      }
      const travelStarted = await waitFor(() => locationMatchesTarget() || !findMapWindow(), 9000);
      if (!travelStarted) throw new Error('El viaje no se inició. Revisa el nivel y que el Pokémon líder tenga vida.');
    }
    const travelConfirmed = await waitFor(() => {
      return locationMatchesTarget();
    }, 15000);
    if (!travelConfirmed) throw new Error('El juego no confirmó la llegada a ' + target.name + '.');
    await delay(350);

    let hunt = document.querySelector('[data-pg-hunt-dialog="true"], [data-pg-launcher-hunt-source="true"], [data-pg-launcher-monitor-source="hunt"]');
    if (!visible(hunt)) {
      if (!clickDockAction('analyzer')) throw new Error('No se encontró el botón Hunt Analyzer.');
      hunt = await waitFor(() => {
        const element = document.querySelector('[data-pg-hunt-dialog="true"]');
        return visible(element) ? element : null;
      }, 8000);
    }
    if (!hunt) throw new Error('Hunt Analyzer no abrió a tiempo.');

    let capture = document.querySelector('.clog-window');
    if (!visible(capture)) {
      const logButton = hunt.querySelector('.pg-hunt-log-button') ||
        [...hunt.querySelectorAll('button, [role="button"]')].find((button) =>
          /view capture log|ver log de capturas|ver historial de capturas|log de capturas/i.test(normalize(button.textContent))
        );
      if (!logButton) throw new Error('Hunt Analyzer no mostró el acceso a Capture Log.');
      logButton.click();
      capture = await waitFor(() => {
        const element = document.querySelector('.clog-window');
        return visible(element) ? element : null;
      }, 8000);
    }
    if (!capture) throw new Error('Capture Log no abrió a tiempo.');

    const setRect = (element, geometry, role) => {
      element.dataset.pgFarmMonitor = role;
      element.dataset.pgFloating = 'true';
      element.style.setProperty('position', 'fixed', 'important');
      element.style.setProperty('right', 'auto', 'important');
      element.style.setProperty('bottom', 'auto', 'important');
      element.style.setProperty('min-width', '0px', 'important');
      element.style.setProperty('min-height', '0px', 'important');
      element.style.setProperty('left', Math.round(geometry.left) + 'px', 'important');
      element.style.setProperty('top', Math.round(geometry.top) + 'px', 'important');
      element.style.setProperty('width', Math.round(geometry.width) + 'px', 'important');
      element.style.setProperty('height', Math.round(geometry.height) + 'px', 'important');
      element.style.setProperty('transform', 'none', 'important');
    };
    const arrangeMonitors = () => {
      const currentCapture = document.querySelector('.clog-window');
      const currentHunt = document.querySelector('[data-pg-hunt-dialog="true"]');
      if (!visible(currentCapture) || !visible(currentHunt)) return;
      const gap = 6;
      const viewportWidth = Math.max(1, innerWidth);
      const viewportHeight = Math.max(1, innerHeight);
      if (viewportWidth >= 560 || viewportHeight < 380) {
        const availableWidth = Math.max(2, viewportWidth - (gap * 3));
        const captureWidth = Math.round(availableWidth * .57);
        const huntWidth = availableWidth - captureWidth;
        const height = Math.max(120, viewportHeight - (gap * 2));
        setRect(currentCapture, { left: gap, top: gap, width: captureWidth, height }, 'capture');
        setRect(currentHunt, { left: gap * 2 + captureWidth, top: gap, width: huntWidth, height }, 'hunt');
      } else {
        const availableHeight = Math.max(2, viewportHeight - (gap * 3));
        const captureHeight = Math.round(availableHeight * .53);
        const huntHeight = availableHeight - captureHeight;
        const width = Math.max(220, viewportWidth - (gap * 2));
        setRect(currentCapture, { left: gap, top: gap, width, height: captureHeight }, 'capture');
        setRect(currentHunt, { left: gap, top: gap * 2 + captureHeight, width, height: huntHeight }, 'hunt');
      }
      const captureRect = currentCapture.getBoundingClientRect();
      const huntRect = currentHunt.getBoundingClientRect();
      try {
        localStorage.setItem('pokegrid:capture-log-geometry:v2', JSON.stringify({
          left: captureRect.left, top: captureRect.top, width: captureRect.width, height: captureRect.height
        }));
        localStorage.setItem('pokegrid:hunt-analyzer-geometry:v3', JSON.stringify({
          left: huntRect.left, top: huntRect.top, width: huntRect.width, height: huntRect.height
        }));
      } catch {}
    };
    window.__pgFarmArrangeMonitors = arrangeMonitors;
    if (!window.__pgFarmResizeBound) {
      window.__pgFarmResizeBound = true;
      window.addEventListener('resize', () => window.__pgFarmArrangeMonitors?.(), { passive: true });
    }
    arrangeMonitors();
    window.__pokeGridFarmTarget = { ...target, startedAt: Date.now() };

    const trainerMeta = document.querySelector('.phud-tloc, .pg-player-meta')?.textContent?.replace(/\\s+/g, ' ').trim() || '';
    return {
      ok: true,
      target: target.name,
      captureLog: visible(capture),
      huntAnalyzer: visible(hunt),
      trainerMeta
    };
  })()`;
}

function cleanFarmError(error) {
  return String(error?.message || error || 'No se pudo iniciar esta cuenta')
    .replace(/^Error invoking remote method ['"]GUEST_VIEW_MANAGER_CALL['"]:\s*Error:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim();
}

function setFarmButtonRunning(running) {
  farmRunning = running;
  farmButton.classList.toggle('is-running', running);
  farmButton.innerHTML = running
    ? '<span class="top-action-icon" aria-hidden="true">●</span><span>Farmeando</span>'
    : '<span class="top-action-icon" aria-hidden="true">🎯</span><span>Modo farmeo</span>';
}

async function disableFarmMode() {
  if (farmBusy) return;
  const activePanels = panels.filter((panel) => panel.farmRunState === 'ok' || panel.farmRunState === 'busy');
  stopFarmButton.disabled = true;
  await Promise.all(panels.map(async (panel) => {
    const wasActive = panel.farmRunState === 'ok' || panel.farmRunState === 'busy';
    try {
      await panel.webview.executeJavaScript(`(() => {
        delete window.__pokeGridFarmTarget;
        document.querySelectorAll('[data-pg-farm-monitor]').forEach((element) => {
          delete element.dataset.pgFarmMonitor;
          delete element.dataset.pgFloating;
        });
        return true;
      })()`);
    } catch {}
    panel.farmRunState = '';
    panel.farmRunMessage = '';
    setPanelFarmChip(panel, null, false);
    if (wasActive) setPanelState(panel, 'online', 'Sesión disponible');
  }));
  setFarmButtonRunning(false);
  setFarmGlobalState(farmCatalog.length ? `${farmCatalog.length} zonas disponibles` : 'Modo farmeo desactivado', farmCatalog.length ? 'ready' : '');
  setFarmMessage(activePanels.length
    ? `Modo farmeo desactivado en ${activePanels.length} cuenta${activePanels.length === 1 ? '' : 's'}. Las selecciones quedaron guardadas.`
    : 'El Modo Farmeo ya estaba desactivado.', 'ok');
  stopFarmButton.disabled = false;
  renderFarmAccounts();
}

async function startFarmAccount(index) {
  const config = farmConfigs[index];
  const context = farmContexts[index];
  const panel = panels[index];
  const accountName = context?.trainerName || accounts[index]?.username || accounts[index]?.label || `Cuenta ${index + 1}`;
  if (!config?.target) return setFarmMessage(`Selecciona un Pokémon para ${accountName}.`);
  if (!context?.ready) return setFarmMessage(`${accountName} todavía no ha entrado al juego.`);
  if (context.level !== null && config.target.level > context.level) {
    return setFarmMessage(`${config.target.name} requiere nivel ${config.target.level} en ${accountName}.`);
  }
  const orreCheck = validateOrreTarget(config.target, context);
  if (!orreCheck.ok && !farmAllowOrreTravel) return setFarmMessage(`${accountName}: ${orreCheck.message}. Equipa las MT o activa el permiso de viaje a Orre.`);
  if (panel.farmRunState === 'busy') return;

  panel.farmRunState = 'busy';
  panel.farmRunMessage = 'Abriendo mapa y viajando…';
  setPanelState(panel, 'loading', 'Preparando farmeo…');
  setFarmMessage(`Iniciando únicamente ${accountName}…`);
  renderFarmAccounts();
  try {
    const result = await panel.webview.executeJavaScript(buildFarmAutomationScript(config, { allowOrreTravel: farmAllowOrreTravel }));
    if (!result?.ok) throw new Error('El juego no confirmó el inicio del farmeo.');
    panel.farmRunState = 'ok';
    panel.farmRunMessage = `${config.target.name} activo`;
    setPanelState(panel, 'online', `Farmeando ${config.target.name}`);
    setPanelFarmChip(panel, config, true);
    setFarmButtonRunning(true);
    const activeCount = panels.filter((item) => item.farmRunState === 'ok').length;
    setFarmGlobalState(`${activeCount} cuenta${activeCount === 1 ? '' : 's'} farmeando`, 'ready');
    setFarmMessage(`${accountName} inició el farmeo sin modificar las demás cuentas.`, 'ok');
    saveFarmConfigs();
  } catch (error) {
    panel.farmRunState = 'error';
    panel.farmRunMessage = cleanFarmError(error);
    setPanelState(panel, 'error', 'Error al iniciar farmeo');
    setPanelFarmChip(panel, config, false);
    setFarmMessage(`${accountName}: ${panel.farmRunMessage}`);
  } finally {
    renderFarmAccounts();
  }
}

async function startFarmMode() {
  if (farmBusy) return;
  const selected = farmConfigs
    .map((config, index) => ({ config, index }))
    .filter(({ config }) => config.enabled);
  if (!selected.length) {
    setFarmMessage('Activa al menos una cuenta para iniciar el farmeo.');
    return;
  }
  const missing = selected.filter(({ config }) => !config.target);
  if (missing.length) {
    setFarmMessage(`Selecciona un Pokémon para ${missing.map(({ index }) => accounts[index]?.label || `Cuenta ${index + 1}`).join(', ')}.`);
    return;
  }
  const notReady = selected.filter(({ index }) => !farmContexts[index]?.ready);
  if (notReady.length) {
    setFarmMessage(`Estas sesiones todavía no han entrado al juego: ${notReady.map(({ index }) => accounts[index]?.label || `Cuenta ${index + 1}`).join(', ')}.`);
    return;
  }
  const locked = selected.filter(({ config, index }) =>
    farmContexts[index]?.ready && farmContexts[index]?.level !== null && config.target.level > farmContexts[index].level
  );
  if (locked.length) {
    setFarmMessage(`${locked.map(({ config, index }) => `${accounts[index]?.label || `Cuenta ${index + 1}`}: ${config.target.name} requiere nivel ${config.target.level}`).join(' · ')}`);
    return;
  }
  const invalidOrre = selected.map(({ config, index }) => ({ index, check: validateOrreTarget(config.target, farmContexts[index]) }))
    .filter(({ check }) => !check.ok);
  if (invalidOrre.length && !farmAllowOrreTravel) {
    setFarmMessage(invalidOrre.map(({ index, check }) => `${farmContexts[index]?.trainerName || accounts[index]?.label || `Cuenta ${index + 1}`}: ${check.message}`).join(' · '));
    return;
  }

  farmBusy = true;
  startFarmButton.disabled = true;
  refreshFarmButton.disabled = true;
  setFarmGlobalState('Iniciando las sesiones', 'busy');
  setFarmMessage('Viajando a las zonas y preparando el seguimiento en tiempo real…');
  selected.forEach(({ index }) => {
    const panel = panels[index];
    panel.farmRunState = 'busy';
    panel.farmRunMessage = 'Abriendo mapa y viajando…';
    setPanelState(panel, 'loading', 'Preparando farmeo…');
  });
  renderFarmAccounts();

  const results = await Promise.all(selected.map(async ({ config, index }) => {
    const panel = panels[index];
    try {
      const result = await panel.webview.executeJavaScript(buildFarmAutomationScript(config, { allowOrreTravel: farmAllowOrreTravel }));
      panel.farmRunState = 'ok';
      panel.farmRunMessage = `${config.target.name} activo`;
      setPanelState(panel, 'online', `Farmeando ${config.target.name}`);
      setPanelFarmChip(panel, config, true);
      return { ok: Boolean(result?.ok), index, result };
    } catch (error) {
      panel.farmRunState = 'error';
      panel.farmRunMessage = cleanFarmError(error);
      setPanelState(panel, 'error', 'Error al iniciar farmeo');
      setPanelFarmChip(panel, config, false);
      return { ok: false, index, error: panel.farmRunMessage };
    }
  }));

  const successes = results.filter((result) => result.ok);
  const failures = results.filter((result) => !result.ok);
  farmBusy = false;
  startFarmButton.disabled = false;
  refreshFarmButton.disabled = false;
  renderFarmAccounts();
  if (successes.length) {
    setFarmButtonRunning(true);
    setFarmGlobalState(`${successes.length}/${selected.length} cuentas farmeando`, 'ready');
    saveFarmConfigs();
    restoreGrid();
  }
  if (failures.length) {
    setFarmMessage(failures.map(({ index, error }) => `${accounts[index]?.label || `Cuenta ${index + 1}`}: ${error}`).join(' · '));
  } else {
    setFarmMessage('Farmeo iniciado. El seguimiento de capturas y Hunt Analyzer está activo por cuenta.', 'ok');
    window.setTimeout(() => {
      if (!farmBusy) {
        farmBackdrop.hidden = true;
        window.clearInterval(farmContextTimer);
        farmContextTimer = null;
      }
    }, 650);
  }
}

function loginScript(credentials) {
  return `(async () => {
    const username = ${JSON.stringify(credentials.username)};
    const password = ${JSON.stringify(credentials.password)};
    const setNativeValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const findSubmit = () => {
      const form = document.querySelector('form');
      if (!form) return null;
      return form.querySelector('button[type="submit"]') ||
        [...form.querySelectorAll('button')].find((button) => /log in|login|entrar|iniciar/i.test(button.getAttribute('aria-label') || button.textContent || '')) ||
        [...form.querySelectorAll('button')].find((button) => button.type !== 'button');
    };

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const userInput = document.querySelector('input[autocomplete="username"]');
      const passwordInput = document.querySelector('input[autocomplete="current-password"], input[type="password"]');
      if (userInput && passwordInput) {
        setNativeValue(userInput, username);
        setNativeValue(passwordInput, password);
        if (!window.__pokeGridSubmitWatcher) {
          window.__pokeGridSubmitWatcher = window.setInterval(() => {
            const submit = findSubmit();
            const captcha = document.querySelector('input[name="cf-turnstile-response"]');
            const captchaReady = !captcha || Boolean(captcha.value);
            if (submit && !submit.disabled && captchaReady) {
              clearInterval(window.__pokeGridSubmitWatcher);
              window.__pokeGridSubmitWatcher = null;
              submit.click();
            }
          }, 500);
        }
        return 'filled';
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return 'form-not-found';
  })()`;
}

async function attemptLogin(panel, force = false) {
  const credentials = accounts[panel.index];
  if (!credentials?.username || !credentials?.password) return;
  if (!panel.webview.getURL().startsWith(LOGIN_URL)) return;
  if (!force && Date.now() - panel.lastLoginAttempt < 15_000) return;

  panel.lastLoginAttempt = Date.now();
  setPanelState(panel, 'loading', 'Completando acceso…');
  try {
    const result = await panel.webview.executeJavaScript(loginScript(credentials));
    if (result === 'filled') setPanelState(panel, 'online', 'Datos listos para iniciar');
  } catch {
    setPanelState(panel, 'error', 'No se pudo completar el acceso');
  }
}

function withTimeout(promise, timeoutMs, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error(message)), timeoutMs); })
  ]).finally(() => window.clearTimeout(timer));
}

function floatGeometryKey(panel, kind) {
  const version = kind === 'hunt' ? 'v2' : 'v1';
  return `pokegrid:${kind}-float-geometry:${version}:${panel.index}`;
}

function readFloatGeometry(panel, kind) {
  try {
    const geometry = JSON.parse(localStorage.getItem(floatGeometryKey(panel, kind)) || 'null');
    return geometry && typeof geometry === 'object' ? geometry : null;
  } catch {
    return null;
  }
}

function applyFloatGeometry(panel, kind, geometry = readFloatGeometry(panel, kind)) {
  const floatPanel = kind === 'hunt' ? panel.huntPanel : panel.captureLogPanel;
  const pinButton = floatPanel.querySelector(`.${kind}-float-pin`);
  const locked = geometry?.locked === true;
  floatPanel.classList.toggle('is-geometry-locked', locked);
  pinButton.classList.toggle('is-active', locked);
  pinButton.setAttribute('aria-pressed', String(locked));
  pinButton.title = locked ? 'Desbloquear tamaño y posición' : 'Fijar tamaño y posición';
  if (!geometry || !Number.isFinite(Number(geometry.left))) return;
  const parentRect = panel.element.getBoundingClientRect();
  const minWidth = kind === 'hunt' ? 280 : 300;
  const minHeight = kind === 'hunt' ? 230 : 250;
  const width = Math.min(Math.max(minWidth, Number(geometry.width) || minWidth), Math.max(minWidth, parentRect.width - 14));
  const height = Math.min(Math.max(minHeight, Number(geometry.height) || minHeight), Math.max(minHeight, parentRect.height - 56));
  const left = Math.min(Math.max(7, Number(geometry.left) || 7), Math.max(7, parentRect.width - width - 7));
  const top = Math.min(Math.max(49, Number(geometry.top) || 49), Math.max(49, parentRect.height - height - 7));
  Object.assign(floatPanel.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto', width: `${width}px`, height: `${height}px` });
}

function saveFloatGeometry(panel, kind) {
  const floatPanel = kind === 'hunt' ? panel.huntPanel : panel.captureLogPanel;
  if (floatPanel.hidden) return;
  const panelRect = panel.element.getBoundingClientRect();
  const rect = floatPanel.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;
  const geometry = {
    left: Math.round(rect.left - panelRect.left),
    top: Math.round(rect.top - panelRect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    locked: floatPanel.classList.contains('is-geometry-locked')
  };
  localStorage.setItem(floatGeometryKey(panel, kind), JSON.stringify(geometry));
}

function setupFloatGeometry(panel, kind) {
  const floatPanel = kind === 'hunt' ? panel.huntPanel : panel.captureLogPanel;
  const head = floatPanel.querySelector(`.${kind}-float-head`);
  const pinButton = floatPanel.querySelector(`.${kind}-float-pin`);
  const resetButton = floatPanel.querySelector(`.${kind}-float-position-reset`);
  applyFloatGeometry(panel, kind);
  pinButton.addEventListener('click', () => {
    const locked = !floatPanel.classList.contains('is-geometry-locked');
    floatPanel.classList.toggle('is-geometry-locked', locked);
    saveFloatGeometry(panel, kind);
    applyFloatGeometry(panel, kind);
  });
  resetButton.addEventListener('click', () => {
    localStorage.removeItem(floatGeometryKey(panel, kind));
    floatPanel.classList.remove('is-geometry-locked');
    floatPanel.removeAttribute('style');
    applyFloatGeometry(panel, kind, null);
  });
  head.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button') || floatPanel.classList.contains('is-geometry-locked')) return;
    const panelRect = panel.element.getBoundingClientRect();
    const startRect = floatPanel.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    Object.assign(floatPanel.style, { left: `${startRect.left - panelRect.left}px`, top: `${startRect.top - panelRect.top}px`, right: 'auto', bottom: 'auto', width: `${startRect.width}px`, height: `${startRect.height}px` });
    const move = (moveEvent) => {
      const width = floatPanel.offsetWidth;
      const height = floatPanel.offsetHeight;
      const left = Math.min(Math.max(7, startRect.left - panelRect.left + moveEvent.clientX - startX), Math.max(7, panelRect.width - width - 7));
      const top = Math.min(Math.max(49, startRect.top - panelRect.top + moveEvent.clientY - startY), Math.max(49, panelRect.height - height - 7));
      floatPanel.style.left = `${Math.round(left)}px`;
      floatPanel.style.top = `${Math.round(top)}px`;
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      saveFloatGeometry(panel, kind);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    event.preventDefault();
  });
  const observer = new ResizeObserver(() => {
    if (!floatPanel.hidden && !floatPanel.classList.contains('is-geometry-locked')) saveFloatGeometry(panel, kind);
  });
  observer.observe(floatPanel);
  window.addEventListener('resize', () => requestAnimationFrame(() => applyFloatGeometry(panel, kind)));
}

function accountProfileSnapshotScriptLegacy() {
  return `(async () => {
    const clean = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const number = (value) => {
      const text = clean(value);
      if (!text) return null;
      const parsed = Number(text.replace(/[^0-9-]/g, ''));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const result = { ok: location.pathname !== '/login', name: '', level: null, rank: '', pokedollars: null, diamonds: null, vip: null, sprite: '', updatedAt: Date.now() };
    const profileRoot = () => {
      const themedProfile = document.querySelector('[data-pg-profile-dialog="true"]');
      if (themedProfile) return themedProfile;
      const candidates = [...document.querySelectorAll('[role="dialog"], [class*="modal" i], [class*="profile" i], section, article')];
      return candidates.filter((element) => {
        const text = clean(element.innerText || element.textContent);
        return /(?:GENERAL INFORMATION|INFORMA(?:Ç|C)[AÃ]O GERAL|INFORMACI[ÓO]N GENERAL)/i.test(text) &&
          /(?:Gold|Ouro|Pok[eé]dolares?)/i.test(text) && /Diamonds?|Diamantes?/i.test(text);
      }).sort((left, right) => {
        const priority = (element) => (element.getAttribute('role') === 'dialog' ? 100 : /modal|profile/i.test(clean(element.className)) ? 50 : 0);
        return priority(right) - priority(left) || clean(left.innerText).length - clean(right.innerText).length;
      })[0] || null;
    };
    const rowValue = (root, labelExpression) => {
      const labels = [...root.querySelectorAll('*')].filter((element) => {
        const ownText = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => clean(node.textContent)).join(' ');
        return labelExpression.test(ownText || clean(element.textContent)) && element.children.length <= 2;
      });
      for (const label of labels) {
        for (let row = label.parentElement, depth = 0; row && row !== root && depth < 4; row = row.parentElement, depth += 1) {
          const text = clean(row.innerText || row.textContent);
          const labelMatch = text.match(labelExpression);
          if (!labelMatch) continue;
          const value = clean(text.slice((labelMatch.index || 0) + labelMatch[0].length)).replace(/^\\s*[:：·|-]\\s*/, '');
          if (value && value.length <= 90) return value;
        }
      }
      return '';
    };
    const readProfileDom = (root) => {
      if (!root) return false;
      const levelText = rowValue(root, /^(?:Level|Nivel|Nível)/i);
      const goldText = rowValue(root, /^(?:Gold|Ouro|Pok[eé]dolares?)/i);
      const diamondsText = rowValue(root, /^(?:Diamonds?|Diamantes?)/i);
      const vipText = rowValue(root, /^VIP/i);
      const clanText = rowValue(root, /^(?:Clan|Clã)/i);
      const explicitRankText = rowValue(root, /^(?:Rank|Rango)/i);
      const nameElement = root.querySelector('[data-player-name], [data-trainer-name], [class*="profile-name" i], [class*="player-name" i], [class*="trainer-name" i]');
      const candidateName = clean(nameElement?.dataset?.playerName || nameElement?.dataset?.trainerName || nameElement?.textContent);
      if (candidateName && !/^(?:profile|perfil|cuenta|account)$/i.test(candidateName)) result.name = candidateName;
      const level = number(levelText);
      const gold = number(goldText);
      const diamonds = number(diamondsText);
      if (level !== null) result.level = level;
      if (gold !== null) result.pokedollars = gold;
      if (diamonds !== null) result.diamonds = diamonds;
      const rankNumber = clean(clanText + ' ' + explicitRankText).match(/\\bRank\\s*[:#-]?\\s*(\\d+)/i)?.[1];
      if (rankNumber) result.rank = 'Rank ' + rankNumber;
      if (vipText) result.vip = !/^(?:no\\s*vip|not\\s*vip|sin\\s*vip|0|none|inactive|inactivo|expired|expirado)$/i.test(vipText);
      const canvases = [...root.querySelectorAll('canvas')].sort((left, right) => right.width * right.height - left.width * left.height);
      if (canvases[0]) { try { result.sprite = canvases[0].toDataURL('image/png'); } catch {} }
      if (!result.sprite) {
        const images = [...root.querySelectorAll('img')].filter((image) => image.naturalWidth >= 40 && image.naturalHeight >= 40)
          .sort((left, right) => right.naturalWidth * right.naturalHeight - left.naturalWidth * left.naturalHeight);
        if (images[0]?.src) result.sprite = images[0].src;
      }
      return true;
    };
    const aliases = {
      name: ['trainername','playername','charactername','username'],
      level: ['trainerlevel','playerlevel','characterlevel','level'],
      rank: ['rank','playerrank','trainerrank'],
      pokedollars: ['pokedollars','pokecoins','coins','money','balance','cash','gold'],
      diamonds: ['diamonds','diamond','gems','gem'],
      vip: ['isvip','vip','vipactive','hasvip','premium']
    };
    let best = null;
    const seen = new WeakSet();
    let inspected = 0;
    const readObject = (value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const entries = Object.entries(value).slice(0, 100);
      const normalized = new Map(entries.map(([key, item]) => [key.replace(/[^a-z0-9]/gi, '').toLowerCase(), item]));
      const pick = (keys) => keys.map((key) => normalized.get(key)).find((item) => item !== undefined);
      const candidate = {
        name: clean(pick(aliases.name)), level: number(pick(aliases.level)), rank: clean(pick(aliases.rank)),
        pokedollars: number(pick(aliases.pokedollars)), diamonds: number(pick(aliases.diamonds)),
        vip: typeof pick(aliases.vip) === 'boolean' ? pick(aliases.vip) :
          /^(?:1|true|active|activo|yes|si|sí)$/i.test(clean(pick(aliases.vip))) ? true :
          /^(?:0|false|inactive|inactivo|no)$/i.test(clean(pick(aliases.vip))) ? false : null,
        sprite: clean(value.sprite ?? value.avatar ?? value.characterSprite ?? value.outfit?.sprite ?? value.profile?.sprite)
      };
      const score = (candidate.name ? 25 : 0) + (candidate.level !== null ? 15 : 0) + (candidate.rank ? 10 : 0) +
        (candidate.pokedollars !== null ? 25 : 0) + (candidate.diamonds !== null ? 25 : 0) + (candidate.vip !== null ? 10 : 0);
      if (score >= 25 && (!best || score > best.score)) best = { ...candidate, score };
    };
    const scan = (value, depth = 0) => {
      if (!value || typeof value !== 'object' || value instanceof Node || seen.has(value) || depth > 8 || inspected > 70000) return;
      seen.add(value); inspected += 1; readObject(value);
      if (Array.isArray(value)) return value.slice(0, 500).forEach((child) => scan(child, depth + 1));
      Object.entries(value).slice(0, 80).forEach(([key, child]) => {
        if (!/^(return|child|sibling|stateNode|alternate|_owner|queue)$/i.test(key)) scan(child, depth + 1);
      });
    };
    for (const endpoint of ['/api/characters/me', '/api/game/profile']) {
      try {
        const response = await fetch(endpoint, { cache: 'no-cache', credentials: 'same-origin' });
        if (response.ok) scan(await response.json());
      } catch {}
    }
    [...document.querySelectorAll('*')].slice(0, 5000).forEach((element) => {
      const key = Object.keys(element).find((item) => item.startsWith('__reactFiber$') || item.startsWith('__reactContainer$'));
      let fiber = key ? element[key] : null;
      if (fiber?.current) fiber = fiber.current;
      for (let depth = 0; fiber && depth < 50; depth += 1, fiber = fiber.return) { scan(fiber.memoizedProps); scan(fiber.memoizedState); }
    });
    Object.assign(result, best || {});
    const cachedProfile = window.__pokeGridAccountProfileCache;
    const cacheFresh = cachedProfile && Date.now() - Number(cachedProfile.updatedAt || 0) < 15_000;
    if (cacheFresh) Object.assign(result, cachedProfile);
    let activeProfile = profileRoot();
    let openedProfile = false;
    if (!activeProfile && !cacheFresh) {
      const themedSource = window.__pgTeamPlayerSource?.isConnected ? window.__pgTeamPlayerSource : null;
      const clickable = themedSource || [...document.querySelectorAll('button, a, [role="button"], [aria-label], [title], [class*="profile" i], .pg-player-panel, .pg-team-profile-summary')]
        .filter((element) => element.getClientRects().length && !element.closest('[role="dialog"], [class*="modal" i]'))
        .map((element) => {
          const label = clean(element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent);
          const className = clean(element.className);
          const score = (/^(?:profile|perfil)$/i.test(label) ? 100 : /(?:open|abrir|view|ver)?\\s*(?:profile|perfil)/i.test(label) ? 70 : 0) +
            (/(?:profile|player).*(?:button|card|hud)|(?:button|card|hud).*(?:profile|player)/i.test(className) ? 45 : 0);
          return { element, score };
        }).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score)[0]?.element;
      if (clickable) {
        clickable.click();
        openedProfile = true;
        for (let attempt = 0; attempt < 12 && !activeProfile; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          activeProfile = profileRoot();
        }
      }
    }
    readProfileDom(activeProfile);
    const bodyText = clean(document.body?.innerText);
    const matchValue = (expression) => bodyText.match(expression)?.[1] || '';
    if (result.pokedollars === null) result.pokedollars = number(matchValue(/(?:pok[eé]dollars?|saldo|balance|money)\\s*[:：]?\\s*[$₽]?\\s*([\\d.,]+)/i));
    if (result.diamonds === null) result.diamonds = number(matchValue(/(?:diamantes?|diamonds?|gems?)\\s*[:：]?\\s*([\\d.,]+)/i));
    if (!result.rank) {
      const rankNumber = matchValue(/(?:clan|clã)[^\\n]{0,80}\\brank\\s*[:#-]?\\s*(\\d+)/i) || matchValue(/\\brank\\s*[:#-]?\\s*(\\d+)\\b/i);
      if (rankNumber) result.rank = 'Rank ' + rankNumber;
    }
    if (result.level === null) result.level = number(matchValue(/(?:trainer|entrenador|player|jugador)[^\\n]{0,30}(?:level|nivel|lv)\\.?\\s*(\\d+)/i));
    if (result.vip === null && /(?:no vip|sin vip|not vip)/i.test(bodyText)) result.vip = false;
    else if (result.vip === null && /(?:vip activo|vip active|membres[ií]a vip)/i.test(bodyText)) result.vip = true;
    const profile = document.querySelector('[data-player-name], [data-trainer-name], [class*="player-name" i], [class*="trainer-name" i]');
    if (!result.name && profile) result.name = clean(profile.dataset.playerName || profile.dataset.trainerName || profile.textContent);
    if (!result.name) result.name = clean(document.querySelector('.pg-team-profile-summary strong')?.textContent);
    const avatar = document.querySelector('[class*="profile" i] img, [class*="trainer" i] img, [class*="avatar" i] img, [class*="character" i] img');
    if (!result.sprite && avatar?.src) result.sprite = avatar.src;
    if (!result.sprite) {
      const spriteElement = [...document.querySelectorAll('[class*="profile" i], [class*="trainer" i], [class*="avatar" i], [class*="character" i]')]
        .find((element) => /url\\(["']?(.+?)["']?\\)/.test(getComputedStyle(element).backgroundImage));
      const source = spriteElement && getComputedStyle(spriteElement).backgroundImage.match(/url\\(["']?(.+?)["']?\\)/)?.[1];
      if (source) { try { result.sprite = new URL(source, location.href).href; } catch {} }
    }
    if (openedProfile && activeProfile) {
      const closeButton = activeProfile.querySelector('button[aria-label*="close" i], button[aria-label*="cerrar" i], .pg-profile-close, [class*="close" i]');
      if (closeButton) closeButton.click();
    }
    delete result.score;
    result.updatedAt = Date.now();
    window.__pokeGridAccountProfileCache = { ...result };
    return result;
  })()`;
}

function accountProfileSnapshotScript() {
  return `(async () => {
    const clean = (value) => String(value ?? '').replace(/\\s+/g, ' ').trim();
    const number = (value) => {
      const text = clean(value);
      if (!text) return null;
      const parsed = Number(text.replace(/[^0-9-]/g, ''));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };
    const result = { ok: location.pathname !== '/login', name: '', level: null, rank: '', pokedollars: null, diamonds: null, vip: null, sprite: '', verified: [], updatedAt: Date.now() };
    const verify = (field, value) => {
      result[field] = value;
      if (!result.verified.includes(field)) result.verified.push(field);
    };
    const readTokens = () => {
      for (const storage of [sessionStorage, localStorage]) {
        try {
          const raw = storage.getItem('pokeweb:tokens');
          if (raw) return JSON.parse(raw);
        } catch {}
      }
      return null;
    };
    const saveTokens = (tokens) => {
      try { sessionStorage.setItem('pokeweb:tokens', JSON.stringify(tokens)); } catch {}
      try { localStorage.removeItem('pokeweb:tokens'); } catch {}
    };
    const refreshAccess = async () => {
      const tokens = readTokens();
      if (!tokens?.refreshToken) return '';
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken })
        });
        const refreshed = await response.json().catch(() => null);
        if (!response.ok || !refreshed?.accessToken) return '';
        saveTokens(refreshed);
        return refreshed.accessToken;
      } catch { return ''; }
    };
    const authGet = async (endpoint) => {
      const request = (accessToken) => fetch(endpoint, {
        cache: 'no-store',
        headers: accessToken ? { Authorization: 'Bearer ' + accessToken } : {}
      });
      let response = await request(readTokens()?.accessToken);
      if (response.status === 401) {
        const refreshed = await refreshAccess();
        if (refreshed) response = await request(refreshed);
      }
      if (!response.ok) return null;
      return response.json().catch(() => null);
    };
    const profileRoot = () => {
      const direct = document.querySelector('[data-pg-profile-dialog="true"], .pf-window');
      if (direct) return direct;
      return [...document.querySelectorAll('[role="dialog"], [class*="modal" i], [class*="profile" i], section, article')]
        .filter((element) => {
          const text = clean(element.innerText || element.textContent);
          return /(?:GENERAL INFORMATION|INFORMA(?:C|Ç)[AÃ]O GERAL|INFORMACI[ÓO]N GENERAL)/i.test(text) &&
            /(?:Gold|Ouro|Pok[eé]dolares?)/i.test(text) && /Diamonds?|Diamantes?/i.test(text);
        })
        .sort((left, right) => clean(left.innerText).length - clean(right.innerText).length)[0] || null;
    };
    const rowValue = (root, labelExpression) => {
      const labels = [...root.querySelectorAll('*')].filter((element) => {
        const ownText = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => clean(node.textContent)).join(' ');
        return labelExpression.test(ownText || clean(element.textContent)) && element.children.length <= 2;
      });
      for (const label of labels) {
        for (let row = label.parentElement, depth = 0; row && row !== root && depth < 4; row = row.parentElement, depth += 1) {
          const text = clean(row.innerText || row.textContent);
          const match = text.match(labelExpression);
          if (!match) continue;
          const value = clean(text.slice((match.index || 0) + match[0].length)).replace(/^\\s*[:：·|-]\\s*/, '');
          if (value && value.length <= 100) return value;
        }
      }
      return '';
    };
    const readProfileDom = (root) => {
      if (!root) return;
      const level = number(rowValue(root, /^(?:Level|Nivel|Nível)/i));
      const gold = number(rowValue(root, /^(?:Gold|Ouro|Pok[eé]dolares?)/i));
      const diamonds = number(rowValue(root, /^(?:Diamonds?|Diamantes?)/i));
      const vipText = rowValue(root, /^VIP/i);
      const trainerRank = rowValue(root, /^(?:Rank\\s*\\([^)]*\\)|Rank|Rango)/i);
      const clanText = rowValue(root, /^(?:Clan|Clã)/i);
      const nameElement = root.querySelector('.pf-name, [data-player-name], [data-trainer-name], [class*="profile-name" i], [class*="player-name" i], [class*="trainer-name" i]');
      const name = clean(nameElement?.dataset?.playerName || nameElement?.dataset?.trainerName || nameElement?.textContent).replace(/^[^A-Z0-9]+/i, '');
      if (name && !/^(?:profile|perfil|cuenta|account)$/i.test(name)) verify('name', name);
      if (level !== null) verify('level', level);
      if (gold !== null) verify('pokedollars', gold);
      if (diamonds !== null) verify('diamonds', diamonds);
      if (trainerRank) verify('rank', trainerRank);
      else {
        const clanRank = clean(clanText).match(/\\bRank\\s*[:#-]?\\s*(\\d+)/i)?.[1];
        if (clanRank) verify('rank', 'Rank ' + clanRank);
      }
      if (vipText) verify('vip', !/^(?:no(?:\\s*vip)?|not\\s*vip|sin\\s*vip|0|none|inactive|inactivo|expired|expirado)$/i.test(vipText));
      const canvas = [...root.querySelectorAll('.pf-avatar canvas, .pg-profile-avatar canvas, canvas')]
        .filter((item) => item.width >= 24 && item.height >= 24)
        .sort((left, right) => right.width * right.height - left.width * left.height)[0];
      if (canvas) { try { verify('sprite', canvas.toDataURL('image/png')); } catch {} }
      if (!result.sprite) {
        const image = [...root.querySelectorAll('.pf-avatar img, .pg-profile-avatar img, img')]
          .filter((item) => item.naturalWidth >= 40 && item.naturalHeight >= 40 && !/logo|pokeball|brand|icon/i.test(item.currentSrc || item.src || item.className))
          .sort((left, right) => right.naturalWidth * right.naturalHeight - left.naturalWidth * left.naturalHeight)[0];
        if (image?.src) verify('sprite', image.src);
      }
    };
    const apiProfile = await authGet('/api/game/profile').catch(() => null);
    if (apiProfile && typeof apiProfile === 'object') {
      const name = clean(apiProfile.name);
      const level = number(apiProfile.level);
      const gold = number(apiProfile.gold);
      const diamonds = number(apiProfile.diamonds);
      const rank = number(apiProfile.rank);
      const totalPlayers = number(apiProfile.totalPlayers);
      if (name && !/^(?:profile|perfil|cuenta|account)$/i.test(name)) verify('name', name);
      if (level !== null) verify('level', level);
      if (gold !== null) verify('pokedollars', gold);
      if (diamonds !== null) verify('diamonds', diamonds);
      if (rank !== null) verify('rank', '#' + rank.toLocaleString('es-ES') + (totalPlayers !== null ? ' / ' + totalPlayers.toLocaleString('es-ES') : ''));
      if (typeof apiProfile.vip === 'boolean') verify('vip', apiProfile.vip || Number(apiProfile.vipUntil || 0) > Date.now());
      else if (apiProfile.vipUntil !== undefined) verify('vip', Number(apiProfile.vipUntil || 0) > Date.now());
    }
    readProfileDom(profileRoot());
    const avatarRoot = document.querySelector('.pf-avatar');
    const avatarCanvas = avatarRoot?.querySelector('canvas');
    if (avatarCanvas?.width >= 16 && avatarCanvas?.height >= 16) {
      try { verify('sprite', avatarCanvas.toDataURL('image/png')); } catch {}
    } else {
      const avatarImage = avatarRoot?.querySelector('img');
      if (avatarImage?.src) verify('sprite', avatarImage.src);
    }
    if (!result.name) {
      const summaryName = clean(document.querySelector('.pg-team-profile-summary strong, [data-player-name], [data-trainer-name]')?.textContent);
      if (summaryName && !/^(?:profile|perfil|cuenta|account)$/i.test(summaryName)) verify('name', summaryName);
    }
    if (!result.sprite) {
      const canvas = window.__pgTeamPlayerSource?.querySelector?.('canvas') || document.querySelector('.pg-team-profile-summary canvas');
      if (canvas?.width >= 24 && canvas?.height >= 24) { try { verify('sprite', canvas.toDataURL('image/png')); } catch {} }
    }
    if (!result.sprite) {
      const avatar = document.querySelector('.pg-team-profile-avatar');
      const background = avatar ? getComputedStyle(avatar).getPropertyValue('--pg-team-profile-image') || getComputedStyle(avatar).backgroundImage : '';
      const source = clean(background).match(/url\\(["']?(.+?)["']?\\)/)?.[1] || '';
      if (source && !/logo|brand|pokeball|icon/i.test(source)) verify('sprite', source);
    }
    const cached = window.__pokeGridAccountProfileCache;
    if (cached?.ok) {
      for (const field of ['name', 'level', 'rank', 'pokedollars', 'diamonds', 'vip', 'sprite']) {
        if (!result.verified.includes(field) && cached.verified?.includes(field)) verify(field, cached[field]);
      }
    }
    result.updatedAt = Date.now();
    window.__pokeGridAccountProfileCache = { ...result };
    return result;
  })()`;
}

function formatAccountAmount(value) {
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)).toLocaleString('es-ES') : '—';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

const LAUNCHER_ICON_PATHS = Object.freeze({
  refresh: '<path d="M20 11a8 8 0 1 1-2.34-5.66L20 7.68M20 3v4.68h-4.68"/>',
  pin: '<path d="m14 4 6 6-3 1-4 4-1 5-2-2-2-2 5-1 4-4 1-3-6-6Z"/><path d="m8 16-4 4"/>',
  reset: '<path d="M4 4v6h6M20 20v-6h-6"/><path d="M5.1 15a8 8 0 0 0 13.2 2M18.9 9A8 8 0 0 0 5.7 7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  skull: '<path d="M5 10a7 7 0 1 1 14 0v4l-2 2v4H7v-4l-2-2v-4Z"/><path d="m8 9 2 2m0-2-2 2m6-2 2 2m0-2-2 2M10 16v2m4-2v2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6h5"/>',
  star: '<path d="m12 2 3 6 7 .9-5 4.8 1.4 7-6.4-3.4-6.4 3.4 1.4-7-5-4.8L9 8Z"/>',
  pokeball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h6m6 0h6"/><circle cx="12" cy="12" r="3"/>',
  moneybag: '<path d="M9 3h6l-1 4c4 2 6 5 6 9 0 4-3 6-8 6s-8-2-8-6c0-4 2-7 6-9L9 3Z"/><path d="M9 7h6M12 10v8m-2-6h3a2 2 0 0 1 0 4h-3"/>',
  trend: '<path d="M3 19h18M5 16l5-5 3 3 6-7M15 7h4v4"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-7m-13 3 6-6 4 3 7-8"/>',
  sparkle: '<path d="m12 2 2.2 6.2L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.8L12 2Z"/><path d="m19 17 .8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"/>',
  swords: '<path d="m4 4 16 16M20 4 4 20M7 17l-3 3m13-3 3 3M5 3l5 2-3 3-2-5Zm14 0-5 2 3 3 2-5Z"/>',
  wallet: '<path d="M3 6h16v14H3V6Zm2-3h12v3H5V3Z"/><path d="M14 11h7v5h-7a2 2 0 0 1 0-5Z"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12m3-9c0-2-6-2-6 0s6 2 6 4-6 2-6 0"/>',
  diamond: '<path d="M3 8 7 3h10l4 5-9 13L3 8Z"/><path d="m7 3 5 18 5-18M3 8h18"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="m9 14-2 8 5-3 5 3-2-8"/>',
  benefit: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  gift: '<path d="M3 9h18v12H3V9Zm-1-4h20v4H2V5Zm10 0v16M12 5H8.5A2.5 2.5 0 1 1 11 2.5L12 5Zm0 0h3.5A2.5 2.5 0 1 0 13 2.5L12 5Z"/>'
});

function launcherUiIcon(name, className = '') {
  const paths = LAUNCHER_ICON_PATHS[name] || LAUNCHER_ICON_PATHS.star;
  return `<svg class="launcher-ui-icon ${escapeHtml(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderAccountProfile(panel, profile) {
  const previous = panel.accountProfileLastGood || null;
  if (!profile?.ok && !previous) {
    panel.accountInfoState.hidden = false;
    panel.accountInfoState.textContent = 'Entra al juego para leer los datos del jugador.';
    panel.accountInfoContent.replaceChildren();
    return;
  }
  const verified = new Set(Array.isArray(profile?.verified) ? profile.verified : Object.keys(profile || {}).filter((field) => (
    ['name', 'level', 'rank', 'pokedollars', 'diamonds', 'vip', 'sprite'].includes(field) && profile[field] !== null && profile[field] !== ''
  )));
  const merged = { ...(previous || {}), ok: true, updatedAt: Number(profile?.updatedAt) || previous?.updatedAt || Date.now() };
  for (const field of ['name', 'level', 'rank', 'pokedollars', 'diamonds', 'vip', 'sprite']) {
    if (verified.has(field)) merged[field] = profile[field];
  }
  panel.accountProfileLastGood = merged;
  const sprite = merged.sprite && /^(?:data:|https:\/\/poke\.idleworld\.online\/)/i.test(merged.sprite) && !/logo|pokeball|brand|icon/i.test(merged.sprite)
    ? `<img src="${String(merged.sprite).replace(/["<>]/g, '')}" alt="Sprite del entrenador">` : '<span aria-hidden="true">👤</span>';
  const vipClass = merged.vip === true ? 'is-vip' : 'is-basic';
  const vipText = merged.vip === true ? '◆ VIP' : merged.vip === false ? '◇ No VIP' : '◇ Sin datos';
  panel.accountInfoContent.innerHTML = `<div class="account-info-avatar">${sprite}</div><div class="account-info-player">
    <strong>${escapeHtml(merged.name || accounts[panel.index]?.label || `Cuenta ${panel.index + 1}`)}</strong>
    <div class="account-info-wallets">
      <div class="account-info-metric is-money"><span class="account-info-icon">${launcherUiIcon('coin')}</span><div><span>Pokédolares</span><b>${formatAccountAmount(merged.pokedollars)}</b></div></div>
      <div class="account-info-metric is-diamonds"><span class="account-info-icon">${launcherUiIcon('diamond')}</span><div><span>Diamantes</span><b>${formatAccountAmount(merged.diamonds)}</b></div></div>
    </div>
    <div class="account-info-progress">
      <div><span class="account-info-icon">${launcherUiIcon('chart')}</span><div><span>Progreso del entrenador</span><b>Nivel ${formatAccountAmount(merged.level)}</b></div></div>
      <div><span class="account-info-icon">${launcherUiIcon('medal')}</span><div><span>Rango</span><b>${escapeHtml(merged.rank || '—')}</b></div></div>
    </div>
    <div class="account-info-membership account-info-vip ${vipClass}"><span class="account-info-icon">${launcherUiIcon('diamond')}</span><div><span>Membresía</span><b>${vipText}</b></div><small><span class="account-info-benefit-icon">${launcherUiIcon('benefit')}</span>${merged.vip === true ? 'Beneficios activos' : 'Cuenta estándar'}</small></div>
  </div>`;
  panel.accountInfoState.textContent = `${profile?.ok ? 'Actualizado' : 'Último dato válido'} ${new Date(merged.updatedAt).toLocaleTimeString('es-ES')}`;
  panel.accountInfoState.hidden = false;
}

function setAccountInfoOpen(panel, open) {
  panel.accountInfoOpen = Boolean(open);
  panel.accountInfoPanel.hidden = !panel.accountInfoOpen;
  panel.accountInfoButton.classList.toggle('is-active', panel.accountInfoOpen);
  panel.accountInfoButton.setAttribute('aria-expanded', String(panel.accountInfoOpen));
  if (panel.accountInfoOpen) pollAccountProfiles();
  else panel.accountInfoContent.replaceChildren();
}

async function pollAccountProfiles() {
  if (accountProfilePollBusy) return;
  const active = panels.filter((panel) => panel.accountInfoOpen && panel.webview?.isConnected);
  if (!active.length) return;
  accountProfilePollBusy = true;
  try {
    await Promise.all(active.map(async (panel) => {
      try {
        const profile = await withTimeout(panel.webview.executeJavaScript(accountProfileSnapshotScript()), 5000, 'Tiempo de lectura agotado.');
        renderAccountProfile(panel, profile);
      } catch {
        renderAccountProfile(panel, { ok: false });
      }
    }));
  } finally {
    accountProfilePollBusy = false;
  }
}

function statisticNumber(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text || text === '—') return null;
  const suffix = text.match(/([kmb])\s*$/i)?.[1]?.toLowerCase() || '';
  const multiplier = suffix === 'k' ? 1_000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1;
  let raw = text.replace(/[^0-9,.-]/g, '');
  const negative = raw.startsWith('-');
  raw = raw.replace(/-/g, '');
  if (!raw) return null;
  const separators = [...raw.matchAll(/[.,]/g)].map((match) => match.index);
  if (suffix && separators.length) {
    const decimalAt = separators.at(-1);
    raw = `${raw.slice(0, decimalAt).replace(/[.,]/g, '')}.${raw.slice(decimalAt + 1).replace(/[.,]/g, '')}`;
  } else {
    raw = raw.replace(/[.,]/g, '');
  }
  const number = Number(raw);
  return Number.isFinite(number) ? (negative ? -number : number) * multiplier : null;
}

function statisticMetric(snapshot, key) {
  return snapshot?.metrics?.find((metric) => metric.key === key)?.value || '—';
}

function statisticMetricNumber(snapshot, key) {
  return statisticNumber(statisticMetric(snapshot, key));
}

function formatStatisticNumber(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString('es-ES') : '—';
}

function mergeStatisticsProfile(panel, profile) {
  const previous = panel.accountProfileLastGood || null;
  if (!profile?.ok) return previous;
  const verified = new Set(Array.isArray(profile.verified) ? profile.verified : []);
  const merged = { ...(previous || {}), ok: true, updatedAt: Number(profile.updatedAt) || Date.now() };
  for (const field of ['name', 'level', 'rank', 'pokedollars', 'diamonds', 'vip', 'sprite']) {
    if (verified.has(field) || (!profile.verified && profile[field] !== null && profile[field] !== '')) merged[field] = profile[field];
  }
  panel.accountProfileLastGood = merged;
  return merged;
}

function statisticsHuntContextScript() {
  const readContext = () => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) !== 0;
    };
    const locationSelectors = ['.phud-tloc', '.pg-player-meta', '[class*="trainer-meta"]', '[class*="trainerMeta"]'];
    const locationText = locationSelectors.flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter(visible).map((element) => clean(element.textContent)).find(Boolean) || '';
    const locationParts = locationText.split(/[·•|]/).map(clean).filter(Boolean);
    const zone = locationParts.find((part) => !/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*\d+/i.test(part)) || locationText;
    const targetSelectors = [
      '[data-guide="capture-bar"] [data-pokemon-name]',
      '[data-guide="capture-bar"] .cap-name',
      '[data-guide="capture-bar"] [class*="wild" i] [class*="name" i]',
      '.wild-pokemon [class*="name" i]',
      '.battle-window [class*="enemy" i] [class*="name" i]',
      '[data-wild-pokemon] [class*="name" i]'
    ];
    const target = targetSelectors.flatMap((selector) => [...document.querySelectorAll(selector)])
      .filter(visible)
      .map((element) => clean(element.dataset?.pokemonName || element.getAttribute('data-pokemon-name') || element.textContent))
      .map((value) => value.replace(/(?:lv|level|nivel|n[ií]vel)\.?\s*\d+.*/i, '').replace(/[·|:-]+$/g, '').trim())
      .find((value) => value && value.length <= 80 && !/^(?:capture|captura|hunt|caza|pokemon|pokémon|no wild)/i.test(value)) || '';
    return { ok: location.pathname !== '/login', zone, pokemon: target, updatedAt: Date.now() };
  };
  return `(${readContext.toString()})()`;
}

async function readPanelStatistics(panel) {
  await ensureCaptureArchive(panel);
  const now = Date.now();
  let online = false;
  try { online = panel.webview.getURL().startsWith(GAME_ORIGIN); } catch {}
  let hunt = panel.huntSnapshot || null;
  let huntFresh = false;
  let profile = panel.accountProfileLastGood || null;
  let context = panel.statisticsContext || null;
  if (online) {
    const cachedHuntIsLive = panel.huntOpen && hunt?.ok && now - Number(hunt.updatedAt || 0) < STATISTICS_REFRESH_INTERVAL_MS;
    if (cachedHuntIsLive) {
      huntFresh = true;
    } else {
      try {
        const snapshot = await withTimeout(
          panel.webview.executeJavaScript(huntAnalyzerSnapshotScript()),
          PANEL_READ_TIMEOUT_MS,
          'Hunt Analyzer no respondió a tiempo.'
        );
        if (snapshot?.ok) {
          await withTimeout(hydrateHuntDropIcons(snapshot), 3000, 'Los iconos de drops tardaron demasiado.').catch(() => snapshot);
          hunt = snapshot;
          panel.huntSnapshot = snapshot;
          huntFresh = true;
          if (panel.huntOpen) renderHuntAnalyzer(panel, snapshot);
        }
      } catch {}
    }
    if (!profile || now - Number(panel.statisticsProfileReadAt || 0) >= STATISTICS_PROFILE_INTERVAL_MS) {
      try {
        const nextProfile = await withTimeout(
          panel.webview.executeJavaScript(accountProfileSnapshotScript()),
          5000,
          'El perfil no respondió a tiempo.'
        );
        profile = mergeStatisticsProfile(panel, nextProfile);
        panel.statisticsProfileReadAt = now;
        if (panel.accountInfoOpen && nextProfile) renderAccountProfile(panel, nextProfile);
      } catch {}
    }
    if (!context || now - Number(context.updatedAt || 0) >= STATISTICS_CONTEXT_INTERVAL_MS) {
      try {
        const nextContext = await withTimeout(
          panel.webview.executeJavaScript(statisticsHuntContextScript()),
          3000,
          'La ubicación no respondió a tiempo.'
        );
        if (nextContext?.ok) {
          context = nextContext;
          panel.statisticsContext = nextContext;
        }
      } catch {}
    }
  }
  const captures = [...panel.captureArchive.values()].map(enrichCaptureLogEntry);
  const shinyCaptures = captures.filter((capture) => capture.isShiny === true).length;
  const legendaryCaptures = captures.filter((capture) =>
    capture.isLegendarySpecies === true || capture.tier === 'legendary' || isLegendaryPokemonName(capture.name)
  ).length;
  const ivRows = captures.map((capture) => Number(capture.iv)).filter(Number.isFinite);
  const averageIv = ivRows.length ? ivRows.reduce((sum, value) => sum + value, 0) / ivRows.length : null;
  const drops = new Map();
  for (const drop of hunt?.drops || []) {
    const name = String(drop.name || '').trim();
    if (!name) continue;
    const key = normalizeSearchText(name);
    const previous = drops.get(key) || { name, quantity: 0, icon: '', price: '', total: '' };
    previous.quantity += statisticNumber(drop.quantity) || 0;
    previous.icon ||= String(drop.icon || '');
    previous.price ||= String(drop.price || '');
    previous.total ||= String(drop.total || '');
    drops.set(key, previous);
  }
  const cachedFarmContext = farmContexts[panel.index] || {};
  const configuredTarget = panel.farmRunState === 'ok' ? String(farmConfigs[panel.index]?.target?.name || '') : '';
  return {
    index: panel.index,
    online,
    hunt,
    huntFresh,
    profile,
    captures: captures.length,
    shinyCaptures,
    legendaryCaptures,
    averageIv,
    context: {
      zone: String(context?.zone || cachedFarmContext.location || ''),
      pokemon: String(context?.pokemon || configuredTarget || ''),
      leader: String(cachedFarmContext.leader?.name || '')
    },
    drops: [...drops.values()].sort((left, right) => right.quantity - left.quantity)
  };
}

function statisticsMetricMarkup(label, value, kind = 'default') {
  return `<div class="statistics-account-metric is-${escapeHtml(kind)}" data-statistic-kind="${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><b title="${escapeHtml(value)}">${escapeHtml(value)}</b></div>`;
}

function statisticsDropRows(row) {
  return (Array.isArray(row?.drops) ? row.drops : []).map((drop) => {
    if (Array.isArray(drop)) return { name: String(drop[0] || ''), quantity: Number(drop[1]) || 0, icon: '', price: '', total: '' };
    return {
      name: String(drop?.name || ''),
      quantity: Number(drop?.quantity) || 0,
      icon: String(drop?.icon || ''),
      price: String(drop?.price || ''),
      total: String(drop?.total || '')
    };
  }).filter((drop) => drop.name);
}

function statisticsDropMarkup(drop) {
  const icon = drop.icon
    ? `<img class="statistics-drop-sprite" src="${escapeHtml(drop.icon)}" alt="" loading="lazy">`
    : '<span class="statistics-drop-sprite is-empty" aria-hidden="true">◇</span>';
  const detail = [drop.price ? `Unidad ${drop.price}` : '', drop.total ? `Valor ${drop.total}` : ''].filter(Boolean).join(' · ');
  return `<article class="statistics-drop-item">${icon}<div><strong>${escapeHtml(drop.name)}</strong><small>${escapeHtml(detail || 'Drop detectado por Hunt Analyzer')}</small></div><b>×${escapeHtml(formatStatisticNumber(drop.quantity))}</b></article>`;
}

function statisticComparisonValue(row, key) {
  if (key === 'balance') return statisticNumber(row.hunt?.balance);
  if (key === 'drops') return statisticsDropRows(row).reduce((sum, drop) => sum + drop.quantity, 0);
  if (key === 'time') return parseHuntDuration(statisticMetric(row.hunt, 'time'));
  return statisticMetricNumber(row.hunt, key);
}

function rankStatisticsComparisonRows(rows) {
  const scores = new Map(rows.map((row) => [row, 0]));
  const weightedMetrics = [
    ['balance', 2], ['xpRate', 1.5], ['lootRate', 1.5], ['killRate', 1.2],
    ['captured', 1], ['defeated', .7], ['drops', .5]
  ];
  weightedMetrics.forEach(([key, weight]) => {
    const values = rows.map((row) => Math.max(0, Number(statisticComparisonValue(row, key)) || 0));
    const maximum = Math.max(0, ...values);
    const minimum = Math.min(...values);
    if (maximum <= 0) return;
    rows.forEach((row, index) => {
      const normalized = maximum === minimum ? 1 : (values[index] - minimum) / (maximum - minimum);
      scores.set(row, scores.get(row) + normalized * weight);
    });
  });
  return [...rows].sort((left, right) => {
    if (left.online !== right.online) return Number(right.online) - Number(left.online);
    const scoreDifference = scores.get(right) - scores.get(left);
    if (Math.abs(scoreDifference) > .0001) return scoreDifference;
    const balanceDifference = (statisticComparisonValue(right, 'balance') || 0) - (statisticComparisonValue(left, 'balance') || 0);
    return balanceDifference || left.index - right.index;
  }).map((row, index) => ({ row, rank: index + 1, score: scores.get(row) }));
}

function renderStatisticsComparison(rows) {
  const highlightDefinitions = [
    ['balance', 'Mejor balance', (row) => row.hunt?.balance || '—'],
    ['xpRate', 'Mayor XP/h', (row) => statisticMetric(row.hunt, 'xpRate')],
    ['lootRate', 'Mayor botín/h', (row) => statisticMetric(row.hunt, 'lootRate')],
    ['captured', 'Más capturas', (row) => statisticMetric(row.hunt, 'captured')]
  ];
  statisticsComparisonHighlights.innerHTML = highlightDefinitions.map(([key, label, formatter]) => {
    const available = rows.filter((row) => Number.isFinite(statisticComparisonValue(row, key)));
    const winner = available.sort((left, right) => statisticComparisonValue(right, key) - statisticComparisonValue(left, key))[0];
    if (!winner) return `<article class="statistics-comparison-highlight is-empty"><span>${escapeHtml(label)}</span><b>—</b><small>Sin datos todavía</small></article>`;
    return `<article class="statistics-comparison-highlight" data-comparison-account-index="${winner.index}"><span>${escapeHtml(label)}</span><b>${escapeHtml(formatter(winner))}</b><small>${escapeHtml(winner.profile?.name || accounts[winner.index]?.label || `Cuenta ${winner.index + 1}`)}</small></article>`;
  }).join('');
  statisticsComparisonHighlights.querySelectorAll('[data-comparison-account-index]').forEach((card) => {
    const index = Number(card.dataset.comparisonAccountIndex) || 0;
    card.style.setProperty('--account-color', STATISTICS_ACCOUNT_COLORS[index % STATISTICS_ACCOUNT_COLORS.length]);
  });

  const columns = [
    ['defeated', 'Derrotados'], ['captured', 'Capturados'], ['xp', 'XP'], ['balance', 'Balance'],
    ['time', 'Tiempo'], ['xpRate', 'XP/h'], ['lootRate', 'Botín/h'], ['killRate', 'Kills/h'], ['drops', 'Drops']
  ];
  const bestValues = new Map(columns.map(([key]) => {
    const values = rows.map((row) => statisticComparisonValue(row, key)).filter(Number.isFinite);
    return [key, values.length ? Math.max(...values) : null];
  }));
  const rankedRows = rankStatisticsComparisonRows(rows);
  const header = `<div class="statistics-comparison-row is-header"><span>Top / Cuenta / Hunt</span>${columns.map(([, label]) => `<span>${escapeHtml(label)}</span>`).join('')}</div>`;
  const body = rankedRows.map(({ row, rank, score }) => {
    const zone = row.context?.zone || 'Zona no detectada';
    const target = row.context?.pokemon || '';
    const cells = columns.map(([key]) => {
      const numeric = statisticComparisonValue(row, key);
      const raw = key === 'balance' ? row.hunt?.balance || '—'
        : key === 'drops' ? formatStatisticNumber(numeric)
          : statisticMetric(row.hunt, key);
      const best = Number.isFinite(numeric) && bestValues.get(key) !== null && numeric === bestValues.get(key);
      return `<span class="statistics-comparison-cell${best ? ' is-best' : ''}" data-comparison-account="${row.index}" data-comparison-key="${escapeHtml(key)}" title="${escapeHtml(raw)}">${escapeHtml(raw)}</span>`;
    }).join('');
    return `<article class="statistics-comparison-row${row.online ? '' : ' is-unavailable'}" data-comparison-account-index="${row.index}" data-comparison-rank="${rank}" data-comparison-score="${score.toFixed(3)}"><div class="statistics-comparison-account"><span class="statistics-comparison-rank">TOP ${rank}</span><i aria-hidden="true"></i><div><strong>${escapeHtml(row.profile?.name || accounts[row.index]?.label || `Cuenta ${row.index + 1}`)}</strong><small>${escapeHtml(zone)}${target ? ` · ${escapeHtml(target)}` : ''}</small></div></div>${cells}</article>`;
  }).join('');
  statisticsComparisonTable.innerHTML = `${header}${body}`;
  statisticsComparisonTable.querySelectorAll('[data-comparison-account-index]').forEach((row) => {
    const index = Number(row.dataset.comparisonAccountIndex) || 0;
    row.style.setProperty('--account-color', STATISTICS_ACCOUNT_COLORS[index % STATISTICS_ACCOUNT_COLORS.length]);
  });
}

function renderStatistics(rows) {
  statisticsRows = rows;
  const total = (getter) => rows.reduce((sum, row) => sum + (Number(getter(row)) || 0), 0);
  const totalHuntSeconds = total((row) => parseHuntDuration(statisticMetric(row.hunt, 'time')));
  const totals = [
    ['Cuentas en línea', `${rows.filter((row) => row.online).length}/${ACCOUNT_COUNT}`, 'is-accent'],
    ['Derrotados', formatStatisticNumber(total((row) => statisticMetricNumber(row.hunt, 'defeated'))), ''],
    ['Capturados (Hunt)', formatStatisticNumber(total((row) => statisticMetricNumber(row.hunt, 'captured'))), ''],
    ['Capturas guardadas', formatStatisticNumber(total((row) => row.captures)), 'is-accent'],
    ['Shinies capturados', formatStatisticNumber(total((row) => row.shinyCaptures)), 'is-shiny'],
    ['Legendarias', formatStatisticNumber(total((row) => row.legendaryCaptures)), 'is-gold'],
    ['XP de Hunt', formatStatisticNumber(total((row) => statisticMetricNumber(row.hunt, 'xp'))), ''],
    ['Tiempo acumulado', formatHuntDuration(totalHuntSeconds), ''],
    ['Pokédolares', formatStatisticNumber(total((row) => row.profile?.pokedollars)), 'is-gold'],
    ['Diamantes', formatStatisticNumber(total((row) => row.profile?.diamonds)), 'is-shiny']
  ];
  statisticsTotals.innerHTML = totals.map(([label, value, className]) =>
    `<article class="statistics-total-card ${className}"><span>${escapeHtml(label)}</span><b title="${escapeHtml(value)}">${escapeHtml(value)}</b></article>`
  ).join('');
  statisticsAccounts.replaceChildren();
  rows.forEach((row) => {
    const card = document.createElement('article');
    card.className = `statistics-account-card${row.online ? '' : ' is-unavailable'}`;
    card.dataset.accountIndex = String(row.index);
    card.style.setProperty('--account-color', STATISTICS_ACCOUNT_COLORS[row.index % STATISTICS_ACCOUNT_COLORS.length]);
    const huntAvailable = Boolean(row.hunt?.ok);
    const drops = statisticsDropRows(row);
    const accountView = statisticsAccountViews.get(row.index) === 'drops' ? 'drops' : 'summary';
    const metrics = [
      ['Derrotados', statisticMetric(row.hunt, 'defeated'), 'defeated'],
      ['Capturados Hunt', statisticMetric(row.hunt, 'captured'), 'captured'],
      ['XP Hunt', statisticMetric(row.hunt, 'xp'), 'xp'],
      ['Balance Hunt', row.hunt?.balance || '—', 'balance'],
      ['Tiempo Hunt', statisticMetric(row.hunt, 'time'), 'time'],
      ['Capturas', formatStatisticNumber(row.captures), 'captures'],
      ['Shinies', formatStatisticNumber(row.shinyCaptures), 'shiny'],
      ['Legendarias', formatStatisticNumber(row.legendaryCaptures), 'legendary'],
      ['IV promedio', row.averageIv === null ? '—' : row.averageIv.toLocaleString('es-ES', { maximumFractionDigits: 1 }), 'iv'],
      ['Pokédolares', formatStatisticNumber(row.profile?.pokedollars), 'money']
    ];
    const zone = row.context?.zone || 'Zona no detectada';
    const target = row.context?.pokemon || '';
    const leader = row.context?.leader || '';
    const dropsMarkup = drops.length
      ? drops.map(statisticsDropMarkup).join('')
      : '<p class="statistics-drops-empty">Sin drops detectados en la sesión actual.</p>';
    card.innerHTML = `<header class="statistics-account-head"><div class="statistics-account-identity"><i aria-hidden="true"></i><div><strong>${escapeHtml(row.profile?.name || accounts[row.index]?.label || `Cuenta ${row.index + 1}`)}</strong><small>${escapeHtml(accounts[row.index]?.label || `Cuenta ${row.index + 1}`)} · Nivel ${escapeHtml(formatAccountAmount(row.profile?.level))} · ${escapeHtml(row.profile?.rank || 'rango no disponible')}</small></div></div><span class="statistics-account-state">${row.online ? (huntAvailable ? 'EN VIVO' : 'CONECTADA') : 'SIN CONEXIÓN'}</span></header><div class="statistics-hunt-context"><span>⌖ ${escapeHtml(zone)}</span>${target ? `<span>⚔ ${escapeHtml(target)}</span>` : ''}${leader ? `<span>◆ Líder: ${escapeHtml(leader)}</span>` : ''}</div><nav class="statistics-account-tabs" aria-label="Datos de ${escapeHtml(row.profile?.name || accounts[row.index]?.label || `Cuenta ${row.index + 1}`)}"><button type="button" data-account-view="summary" class="${accountView === 'summary' ? 'is-active' : ''}">Resumen</button><button type="button" data-account-view="drops" class="${accountView === 'drops' ? 'is-active' : ''}">Drops <b>${drops.length}</b></button></nav><section class="statistics-account-pane" data-account-pane="summary"${accountView === 'summary' ? '' : ' hidden'}><div class="statistics-account-grid">${metrics.map(([label, value, kind]) => statisticsMetricMarkup(label, value, kind)).join('')}</div></section><section class="statistics-account-pane statistics-drops-pane" data-account-pane="drops"${accountView === 'drops' ? '' : ' hidden'}><div class="statistics-drops-list">${dropsMarkup}</div></section>`;
    statisticsAccounts.appendChild(card);
  });
  renderStatisticsComparison(rows);
}

async function refreshStatistics() {
  if (statisticsBusy || statisticsBackdrop.hidden) return;
  statisticsBusy = true;
  refreshStatisticsButton.disabled = true;
  statisticsStatus.className = 'statistics-status is-loading';
  statisticsStatus.textContent = 'Leyendo Hunt Analyzer, perfiles y capturas de las cuatro cuentas…';
  try {
    const results = await Promise.allSettled(panels.map(readPanelStatistics));
    const rows = results.map((result, index) => result.status === 'fulfilled' ? result.value : {
      index, online: false, hunt: panels[index]?.huntSnapshot || null, profile: panels[index]?.accountProfileLastGood || null,
      captures: panels[index]?.captureArchive?.size || 0, shinyCaptures: 0, legendaryCaptures: 0, averageIv: null,
      context: panels[index]?.statisticsContext || { zone:'', pokemon:'', leader:'' }, drops: []
    });
    renderStatistics(rows);
    const stale = rows.filter((row) => row.online && !row.huntFresh).length;
    statisticsStatus.className = 'statistics-status';
    statisticsStatus.textContent = `En vivo · ${new Date().toLocaleTimeString('es-ES')}${stale ? ` · ${stale} cuenta${stale === 1 ? '' : 's'} conserva${stale === 1 ? '' : 'n'} el último Hunt válido` : ' · Hunt cada 5s, ubicación cada 15s y perfil cada 30s'}`;
  } catch (error) {
    statisticsStatus.className = 'statistics-status is-error';
    statisticsStatus.textContent = error.message || 'No fue posible actualizar las estadísticas.';
  } finally {
    statisticsBusy = false;
    refreshStatisticsButton.disabled = false;
    window.clearTimeout(statisticsTimer);
    statisticsTimer = statisticsBackdrop.hidden ? 0 : window.setTimeout(refreshStatistics, STATISTICS_REFRESH_INTERVAL_MS);
  }
}

function setStatisticsView(nextView) {
  statisticsView = nextView === 'comparison' ? 'comparison' : 'summary';
  statisticsViewTabs.forEach((tab) => {
    const active = tab.dataset.statisticsView === statisticsView;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  statisticsSummaryView.hidden = statisticsView !== 'summary';
  statisticsSummaryView.classList.toggle('is-active', statisticsView === 'summary');
  statisticsComparisonView.hidden = statisticsView !== 'comparison';
  statisticsComparisonView.classList.toggle('is-active', statisticsView === 'comparison');
}

function openStatistics() {
  closeNotificationPanel();
  statisticsBackdrop.hidden = false;
  statisticsButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('has-statistics-modal');
  setStatisticsView(statisticsView);
  window.clearTimeout(statisticsTimer);
  refreshStatistics();
}

function closeStatistics() {
  statisticsBackdrop.hidden = true;
  statisticsButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('has-statistics-modal');
  window.clearTimeout(statisticsTimer);
  statisticsTimer = 0;
  statisticsRows = [];
  statisticsTotals.replaceChildren();
  statisticsAccounts.replaceChildren();
  statisticsComparisonHighlights.replaceChildren();
  statisticsComparisonTable.replaceChildren();
  statisticsStatus.className = 'statistics-status';
  statisticsStatus.textContent = 'Preparando datos actuales…';
}

function normalizeBrowserInstanceUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error('Escribe un enlace HTTPS válido.');
  }
  if (target.protocol !== 'https:' || target.username || target.password) {
    throw new Error('Por seguridad, las instancias solo admiten enlaces HTTPS sin credenciales incrustadas.');
  }
  return target.href;
}

function makeBrowserInstanceId() {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `browser-${token.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80)}`;
}

function normalizeBrowserInstance(value, fallbackId = '') {
  try {
    const id = String(value?.id || fallbackId || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
    if (!id || id === PRIMARY_BROWSER_INSTANCE_ID) return null;
    const name = String(value?.name || 'Otro juego').trim().slice(0, 48) || 'Otro juego';
    const url = normalizeBrowserInstanceUrl(value?.url);
    const count = Math.max(1, Math.min(6, Math.round(Number(value?.count) || 1)));
    return { id, name, url, count };
  } catch {
    return null;
  }
}

function loadBrowserInstances() {
  try {
    const rows = JSON.parse(localStorage.getItem(BROWSER_INSTANCES_KEY) || '[]');
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).map((row) => normalizeBrowserInstance(row)).filter((row) => {
      if (!row || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    }).slice(0, 12);
  } catch {
    return [];
  }
}

function saveBrowserInstances() {
  localStorage.setItem(BROWSER_INSTANCES_KEY, JSON.stringify(browserInstances));
}

function browserInstancePartition(instanceId, index) {
  const safeId = String(instanceId).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
  return `persist:pokegrid-instance-${safeId}-${index + 1}`;
}

function setConnectionVisual(panel, state, text) {
  if (Number.isInteger(panel.index)) {
    setPanelState(panel, state, text);
    return;
  }
  panel.element.classList.toggle('is-online', state === 'online');
  panel.element.classList.toggle('is-error', state === 'error');
  panel.status.textContent = text;
}

function clearConnectionTimers(panel) {
  window.clearTimeout(panel.recoveryTimer);
  window.clearTimeout(panel.stallTimer);
  panel.recoveryTimer = 0;
  panel.stallTimer = 0;
}

function webviewCurrentUrl(panel) {
  try {
    const current = panel.webview.getURL();
    if (current && current !== 'about:blank') return current;
  } catch {}
  return panel.lastUrl || panel.startUrl;
}

function recoveryDelay(attempt) {
  const exponential = Math.min(WEBVIEW_RECOVERY_MAX_MS, WEBVIEW_RECOVERY_BASE_MS * (2 ** Math.min(4, Math.max(0, attempt - 1))));
  return Math.round(exponential + Math.random() * Math.min(1000, exponential * 0.2));
}

async function loadConnectionPanel(panel, rawUrl = '', { reason = 'Carga' } = {}) {
  if (!panel || panel.destroyed || window.pokeGrid.previewMode) return false;
  if (!navigator.onLine) {
    setConnectionVisual(panel, 'error', 'Sin conexión · esperando red');
    return false;
  }
  const target = rawUrl || webviewCurrentUrl(panel) || panel.startUrl;
  if (!target || target === 'about:blank') return false;
  panel.lastUrl = target;
  setConnectionVisual(panel, 'loading', `${reason}…`);
  try {
    await panel.webview.loadURL(target);
    return true;
  } catch (error) {
    schedulePanelRecovery(panel, error?.message || reason);
    return false;
  }
}

function schedulePanelRecovery(panel, reason = 'Conexión interrumpida', { immediate = false } = {}) {
  if (!panel || panel.destroyed || panel.recoveryTimer) return;
  if (!navigator.onLine) {
    setConnectionVisual(panel, 'error', 'Sin conexión · reconexión automática');
    return;
  }
  panel.connectionFailures = Math.min(20, (panel.connectionFailures || 0) + 1);
  const delay = immediate ? 350 : recoveryDelay(panel.connectionFailures);
  const seconds = Math.max(1, Math.ceil(delay / 1000));
  panel.lastFailure = { at: Date.now(), reason: String(reason || '').slice(0, 180) };
  setConnectionVisual(panel, 'error', `Reconectando en ${seconds}s…`);
  panel.recoveryTimer = window.setTimeout(() => {
    panel.recoveryTimer = 0;
    loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Reconectando' });
  }, delay);
}

function startConnectionStallWatch(panel) {
  window.clearTimeout(panel.stallTimer);
  panel.stallTimer = window.setTimeout(async () => {
    panel.stallTimer = 0;
    if (!panel.isLoading || panel.destroyed) return;
    // Poke Idle World mantiene solicitudes abiertas mientras sincroniza el mundo.
    // Detener el webview por tiempo cortaba /play a mitad de la carga y lo dejaba
    // atrapado permanentemente en "Loading world…". Solo recuperamos cuando ni
    // siquiera el documento responde; una página viva puede terminar sin interrupción.
    try {
      const state = await panel.webview.executeJavaScript(`({
        readyState: document.readyState,
        hasBody: Boolean(document.body),
        url: location.href
      })`);
      if (state?.hasBody && /^https:\/\//i.test(state.url || '')) {
        panel.isLoading = false;
        panel.lastReadyAt = panel.lastReadyAt || Date.now();
        setConnectionVisual(panel, 'online', 'El juego continúa sincronizando…');
        return;
      }
    } catch {}
    schedulePanelRecovery(panel, 'El documento no respondió durante dos minutos', { immediate: true });
  }, WEBVIEW_STALL_TIMEOUT_MS);
}

function markConnectionReady(panel) {
  window.clearTimeout(panel.recoveryTimer);
  window.clearTimeout(panel.stallTimer);
  panel.recoveryTimer = 0;
  panel.stallTimer = 0;
  panel.isLoading = false;
  panel.connectionFailures = 0;
  panel.lastReadyAt = Date.now();
  setConnectionVisual(panel, 'online', 'Sesión disponible');
}

function attachResilientWebview(panel, callbacks = {}) {
  const { webview } = panel;
  panel.consoleDiagnostics ||= [];
  webview.addEventListener('console-message', (event) => {
    if (!event || Number(event.level) < 2) return;
    panel.consoleDiagnostics.push({
      at: Date.now(),
      level: Number(event.level) || 0,
      message: String(event.message || '').slice(0, 500),
      source: String(event.sourceId || '').slice(0, 240),
      line: Number(event.line) || 0
    });
    if (panel.consoleDiagnostics.length > 24) panel.consoleDiagnostics.splice(0, panel.consoleDiagnostics.length - 24);
  });
  webview.addEventListener('did-start-loading', () => {
    panel.isLoading = true;
    panel.loadingStartedAt = Date.now();
    setConnectionVisual(panel, 'loading', 'Cargando…');
    startConnectionStallWatch(panel);
    callbacks.onStart?.();
  });
  webview.addEventListener('did-stop-loading', () => {
    panel.isLoading = false;
    window.clearTimeout(panel.stallTimer);
    panel.stallTimer = 0;
    if (webviewCurrentUrl(panel) !== 'about:blank') setConnectionVisual(panel, 'online', 'Sesión disponible');
    callbacks.onStop?.();
  });
  webview.addEventListener('did-fail-load', (event) => {
    if (event.errorCode === -3 || event.isMainFrame === false) return;
    panel.isLoading = false;
    window.clearTimeout(panel.stallTimer);
    panel.stallTimer = 0;
    schedulePanelRecovery(panel, event.errorDescription || `Error de red ${event.errorCode || ''}`);
    panel.consoleDiagnostics.push({
      at: Date.now(),
      level: 3,
      message: `did-fail-load ${event.errorCode || ''}: ${String(event.errorDescription || '').slice(0, 350)}`,
      source: String(event.validatedURL || '').slice(0, 240),
      line: 0
    });
    callbacks.onFail?.(event);
  });
  webview.addEventListener('dom-ready', async () => {
    markConnectionReady(panel);
    try { await callbacks.onReady?.(); } catch {}
  });
  const navigationHandler = async (event) => {
    if (event?.url && event.url !== 'about:blank') panel.lastUrl = event.url;
    try { await callbacks.onNavigate?.(event); } catch {}
  };
  webview.addEventListener('did-navigate', navigationHandler);
  webview.addEventListener('did-navigate-in-page', navigationHandler);
  const recoverRenderer = (event) => {
    const reason = event?.reason || event?.details?.reason || 'Proceso del navegador interrumpido';
    schedulePanelRecovery(panel, reason, { immediate: true });
  };
  webview.addEventListener('render-process-gone', recoverRenderer);
  webview.addEventListener('crashed', recoverRenderer);
  webview.addEventListener('unresponsive', recoverRenderer);
}

function allConnectionPanels() {
  return [
    ...panels,
    ...browserInstances.flatMap((instance) => browserInstanceViews.get(instance.id)?.panels || [])
  ];
}

function syncUserScriptPanels() {
  window.pokeGridUserScriptManager?.setPanels(allConnectionPanels());
}

function renderBrowserInstanceTabs() {
  instanceTabs.replaceChildren();
  const rows = [
    { id: PRIMARY_BROWSER_INSTANCE_ID, name: 'Poke Idle World', count: ACCOUNT_COUNT, primary: true },
    ...browserInstances
  ];
  rows.forEach((instance) => {
    const shell = document.createElement('div');
    shell.className = 'instance-tab-shell';
    shell.dataset.instanceId = instance.id;
    const button = document.createElement('button');
    button.className = 'instance-tab';
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.dataset.instanceId = instance.id;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = instance.primary ? '◉' : '◎';
    const label = document.createElement('b');
    label.textContent = instance.name;
    const count = document.createElement('small');
    count.textContent = `${instance.count}×`;
    button.append(icon, label, count);
    button.addEventListener('click', () => activateBrowserInstance(instance.id));
    shell.appendChild(button);
    if (!instance.primary) {
      const close = document.createElement('button');
      close.className = 'instance-tab-close';
      close.type = 'button';
      close.textContent = '×';
      close.title = `Cerrar ${instance.name}`;
      close.setAttribute('aria-label', `Cerrar instancia ${instance.name}`);
      close.addEventListener('click', () => removeBrowserInstance(instance.id));
      shell.appendChild(close);
    }
    instanceTabs.appendChild(shell);
  });
  const brandSummary = document.querySelector('.brand small');
  if (brandSummary) brandSummary.textContent = `${ACCOUNT_COUNT} cuentas · ${rows.length} ${rows.length === 1 ? 'juego' : 'juegos'}`;
  updateBrowserInstanceSelection();
}

function updateBrowserInstanceSelection() {
  document.querySelectorAll('.instance-workspace').forEach((workspace) => {
    const active = workspace.dataset.instanceId === activeBrowserInstanceId;
    workspace.classList.toggle('is-active', active);
    workspace.setAttribute('aria-hidden', String(!active));
  });
  instanceTabs.querySelectorAll('.instance-tab-shell').forEach((shell) => {
    const active = shell.dataset.instanceId === activeBrowserInstanceId;
    shell.classList.toggle('is-active', active);
    shell.querySelector('.instance-tab')?.setAttribute('aria-selected', String(active));
  });
}

function refreshBrowserInstanceLayout(instanceId) {
  const view = browserInstanceViews.get(instanceId);
  if (!view || instanceId === PRIMARY_BROWSER_INSTANCE_ID) return;
  requestAnimationFrame(() => {
    view.panels.forEach((panel) => {
      const host = panel.element.querySelector('.browser-instance-webview-host');
      const rect = host?.getBoundingClientRect();
      if (!rect || rect.width < 1 || rect.height < 1) return;
      // Obliga a Electron a abandonar el tamaño nativo 300×150 cuando el webview
      // terminó de cargar mientras su pestaña estaba oculta.
      panel.webview.style.width = `${Math.round(rect.width)}px`;
      panel.webview.style.height = `${Math.round(rect.height)}px`;
      requestAnimationFrame(() => {
        panel.webview.style.width = '100%';
        panel.webview.style.height = '100%';
        panel.webview.executeJavaScript('window.dispatchEvent(new Event("resize"))').catch(() => {});
      });
    });
  });
}

function activateBrowserInstance(instanceId, { persist = true } = {}) {
  const exists = instanceId === PRIMARY_BROWSER_INSTANCE_ID || browserInstances.some((row) => row.id === instanceId);
  activeBrowserInstanceId = exists ? instanceId : PRIMARY_BROWSER_INSTANCE_ID;
  updateBrowserInstanceSelection();
  refreshBrowserInstanceLayout(activeBrowserInstanceId);
  applySidebarState(false);
  if (persist) localStorage.setItem(ACTIVE_BROWSER_INSTANCE_KEY, activeBrowserInstanceId);
}

function createBrowserInstancePanel(instance, workspace, index, launchDelay) {
  const element = document.createElement('article');
  element.className = 'browser-instance-panel';
  const panelbar = document.createElement('header');
  panelbar.className = 'browser-instance-panelbar';
  const identity = document.createElement('div');
  identity.className = 'browser-instance-identity';
  identity.innerHTML = '<i class="status-dot" aria-hidden="true"></i>';
  const name = document.createElement('strong');
  name.textContent = `${instance.name} · ${index + 1}`;
  const status = document.createElement('small');
  status.textContent = 'Preparando sesión…';
  identity.append(name, status);
  const actions = document.createElement('div');
  actions.className = 'browser-instance-actions';
  const homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.textContent = '⌂';
  homeButton.title = 'Abrir página inicial';
  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.textContent = '↻';
  reloadButton.title = 'Recargar esta pantalla';
  const expandButton = document.createElement('button');
  expandButton.type = 'button';
  expandButton.textContent = '⛶';
  expandButton.title = 'Agrandar panel';
  actions.append(homeButton, reloadButton, expandButton);
  panelbar.append(identity, actions);
  const host = document.createElement('div');
  host.className = 'browser-instance-webview-host';
  const webview = document.createElement('webview');
  const guestPreloadUrl = window.pokeGridUserScriptManager?.getGuestPreloadUrl();
  if (guestPreloadUrl) webview.setAttribute('preload', guestPreloadUrl);
  webview.setAttribute('partition', browserInstancePartition(instance.id, index));
  webview.setAttribute('src', 'about:blank');
  webview.setAttribute('allowpopups', 'false');
  webview.setAttribute('webpreferences', 'backgroundThrottling=no, contextIsolation=yes, nodeIntegration=no');
  host.appendChild(webview);
  element.append(panelbar, host);
  workspace.appendChild(element);
  const panel = {
    instanceId: instance.id,
    instanceName: instance.name,
    instanceIndex: index,
    element,
    status,
    webview,
    startUrl: instance.url,
    lastUrl: instance.url,
    connectionFailures: 0,
    recoveryTimer: 0,
    stallTimer: 0,
    isLoading: false,
    destroyed: false
  };
  attachResilientWebview(panel, {
    onReady: async () => {
      await window.pokeGridUserScriptManager?.installIntoPanel(panel);
    },
    onNavigate: async (event) => {
      if (event?.type === 'did-navigate-in-page') await window.pokeGridUserScriptManager?.installIntoPanel(panel);
    }
  });
  homeButton.addEventListener('click', () => {
    panel.connectionFailures = 0;
    loadConnectionPanel(panel, instance.url, { reason: 'Abriendo inicio' });
  });
  reloadButton.addEventListener('click', () => {
    panel.connectionFailures = 0;
    loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Recargando' });
  });
  expandButton.addEventListener('click', () => {
    const expand = !element.classList.contains('is-expanded');
    workspace.querySelectorAll('.browser-instance-panel').forEach((candidate) => candidate.classList.remove('is-expanded'));
    workspace.classList.toggle('has-expanded', expand);
    element.classList.toggle('is-expanded', expand);
    expandButton.textContent = expand ? '↙' : '⛶';
    expandButton.title = expand ? 'Volver al mosaico' : 'Agrandar panel';
  });
  if (!window.pokeGrid.previewMode) {
    window.setTimeout(() => loadConnectionPanel(panel, instance.url, { reason: 'Inicio automático' }), launchDelay);
  }
  return panel;
}

function createBrowserInstanceWorkspace(instance, ordinal = 0) {
  if (browserInstanceViews.has(instance.id)) return browserInstanceViews.get(instance.id);
  const workspace = document.createElement('section');
  workspace.className = 'browser-instance-workspace instance-workspace';
  workspace.dataset.instanceId = instance.id;
  workspace.dataset.viewCount = String(instance.count);
  workspace.setAttribute('role', 'tabpanel');
  workspace.setAttribute('aria-label', `${instance.name}: ${instance.count} pantallas`);
  browserInstanceBackdrop.parentNode.insertBefore(workspace, browserInstanceBackdrop);
  const panelsForInstance = Array.from({ length: instance.count }, (_, index) =>
    createBrowserInstancePanel(instance, workspace, index, 5_000 + ordinal * 4_500 + index * 850));
  const view = { instance, workspace, panels: panelsForInstance };
  browserInstanceViews.set(instance.id, view);
  syncUserScriptPanels();
  return view;
}

function removeBrowserInstance(instanceId) {
  const instance = browserInstances.find((row) => row.id === instanceId);
  if (!instance || !window.confirm(`¿Cerrar y quitar la instancia "${instance.name}" del launcher?`)) return;
  const view = browserInstanceViews.get(instanceId);
  (view?.panels || []).forEach((panel) => {
    panel.destroyed = true;
    clearConnectionTimers(panel);
    try { panel.webview.stop(); } catch {}
  });
  view?.workspace.remove();
  browserInstanceViews.delete(instanceId);
  browserInstances = browserInstances.filter((row) => row.id !== instanceId);
  saveBrowserInstances();
  syncUserScriptPanels();
  if (activeBrowserInstanceId === instanceId) activateBrowserInstance(PRIMARY_BROWSER_INSTANCE_ID);
  renderBrowserInstanceTabs();
}

function openBrowserInstanceModal() {
  browserInstanceMessage.textContent = '';
  browserInstanceName.value = '';
  browserInstanceUrl.value = '';
  browserInstanceCount.value = '4';
  browserInstanceBackdrop.hidden = false;
  browserInstanceName.focus();
}

function closeBrowserInstanceModal() {
  browserInstanceBackdrop.hidden = true;
  browserInstanceMessage.textContent = '';
}

function initializeBrowserInstances() {
  browserInstances = loadBrowserInstances();
  browserInstanceViews.set(PRIMARY_BROWSER_INSTANCE_ID, { workspace: grid, panels });
  browserInstances.forEach((instance, ordinal) => createBrowserInstanceWorkspace(instance, ordinal));
  syncUserScriptPanels();
  renderBrowserInstanceTabs();
  const savedActive = localStorage.getItem(ACTIVE_BROWSER_INSTANCE_KEY) || PRIMARY_BROWSER_INSTANCE_ID;
  activateBrowserInstance(savedActive, { persist: false });
}

function createPanel(index) {
  const fragment = panelTemplate.content.cloneNode(true);
  const element = fragment.querySelector('.panel');
  const name = fragment.querySelector('.panel-name');
  const status = fragment.querySelector('.panel-status');
  const panelbar = fragment.querySelector('.panelbar');
  const farmChip = fragment.querySelector('.farm-chip');
  const zoomLabel = fragment.querySelector('.zoom-label');
  const expandButton = fragment.querySelector('.expand');
  const captureLogButton = fragment.querySelector('.capture-log-toggle');
  const captureLogPanel = fragment.querySelector('.capture-float-panel');
  const captureLogState = fragment.querySelector('.capture-float-state');
  const captureLogList = fragment.querySelector('.capture-float-list');
  const captureLogCount = fragment.querySelector('.capture-float-count');
  const captureLogSort = fragment.querySelector('.capture-float-sort');
  const captureLogTooltip = fragment.querySelector('.capture-detail-popover');
  const captureLogDeleteButton = fragment.querySelector('.capture-float-delete');
  const captureFilterBadge = fragment.querySelector('.capture-filter-badge');
  const captureFilterDays = fragment.querySelector('.capture-filter-days');
  const captureFilterNumber = fragment.querySelector('.capture-filter-number');
  const captureFilterNames = fragment.querySelector('.capture-filter-names');
  const captureFilterIvMin = fragment.querySelector('.capture-filter-iv-min');
  const captureFilterIvMax = fragment.querySelector('.capture-filter-iv-max');
  const captureFilterPowerMin = fragment.querySelector('.capture-filter-power-min');
  const captureFilterPowerMax = fragment.querySelector('.capture-filter-power-max');
  const captureFilterBall = fragment.querySelector('.capture-filter-ball');
  const captureFilterShiny = fragment.querySelector('.capture-filter-shiny');
  const captureFilterReset = fragment.querySelector('.capture-filter-reset');
  const huntButton = fragment.querySelector('.hunt-toggle');
  const huntPanel = fragment.querySelector('.hunt-float-panel');
  const huntState = fragment.querySelector('.hunt-float-state');
  const huntContent = fragment.querySelector('.hunt-float-content');
  const huntResetButton = fragment.querySelector('.hunt-float-reset');
  const huntDeleteButton = fragment.querySelector('.hunt-float-delete');
  const accountInfoButton = fragment.querySelector('.account-info-toggle');
  const accountInfoPanel = fragment.querySelector('.account-info-card');
  const accountInfoState = fragment.querySelector('.account-info-state');
  const accountInfoContent = fragment.querySelector('.account-info-content');
  const webviewHost = fragment.querySelector('.webview-host');
  const webview = document.createElement('webview');

  huntPanel.querySelector('.hunt-float-position-reset').innerHTML = launcherUiIcon('refresh');
  huntPanel.querySelector('.hunt-float-pin').innerHTML = launcherUiIcon('pin');
  huntResetButton.innerHTML = `${launcherUiIcon('reset')}<span>Reset</span>`;
  huntDeleteButton.innerHTML = `${launcherUiIcon('trash')}<span>Eliminar</span>`;
  huntPanel.querySelector('.hunt-float-close').innerHTML = launcherUiIcon('close');
  accountInfoPanel.querySelector('.account-info-close').innerHTML = launcherUiIcon('close');

  const guestPreloadUrl = window.pokeGridUserScriptManager?.getGuestPreloadUrl();
  if (guestPreloadUrl) webview.setAttribute('preload', guestPreloadUrl);
  webview.setAttribute('partition', `persist:pokegrid-${index + 1}`);
  webview.setAttribute('src', 'about:blank');
  webview.setAttribute('allowpopups', 'false');
  webview.setAttribute('webpreferences', 'backgroundThrottling=no, contextIsolation=yes, nodeIntegration=no');
  webviewHost.appendChild(webview);
  grid.appendChild(fragment);

  const panel = {
    instanceId: PRIMARY_BROWSER_INSTANCE_ID,
    instanceName: 'Poke Idle World',
    index,
    element,
    name,
    status,
    farmChip,
    zoomLabel,
    expandButton,
    captureLogButton,
    captureLogPanel,
    captureLogState,
    captureLogList,
    captureLogCount,
    captureLogSort,
    captureLogTooltip,
    captureLogDeleteButton,
    captureFilterBadge,
    captureFilterDays,
    captureFilterNumber,
    captureFilterNames,
    captureFilterIvMin,
    captureFilterIvMax,
    captureFilterPowerMin,
    captureFilterPowerMax,
    captureFilterBall,
    captureFilterShiny,
    captureFilters: loadCaptureLogFilters(index),
    captureLogOpen: false,
    captureLogSignature: '',
    captureLogActionBusy: false,
    captureDetailKey: '',
    captureDetailRow: null,
    captureLogReadPromise: null,
    captureLogReadGeneration: 0,
    captureDataReadPromise: null,
    captureArchive: new Map(),
    captureArchiveSignatures: new Map(),
    captureArchiveLoaded: false,
    captureArchivePromise: null,
    captureArchiveResetPending: false,
    huntButton,
    huntPanel,
    huntState,
    huntContent,
    huntResetButton,
    huntDeleteButton,
    huntOpen: false,
    huntActionBusy: false,
    accountInfoButton,
    accountInfoPanel,
    accountInfoState,
    accountInfoContent,
    accountInfoOpen: false,
    webview,
    startUrl: LOGIN_URL,
    lastUrl: LOGIN_URL,
    connectionFailures: 0,
    recoveryTimer: 0,
    stallTimer: 0,
    isLoading: false,
    destroyed: false,
    zoom: getStoredZoom(index),
    lastLoginAttempt: 0,
    captureMonitorReady: false,
    captureMonitorHealthAt: 0,
    captureSignatureCounts: new Map()
  };
  panels.push(panel);
  element.dataset.accountIndex = String(index);
  panelbar.draggable = true;
  panelbar.addEventListener('dragstart', (event) => {
    if (event.target.closest('button, input, select, output')) { event.preventDefault(); return; }
    draggedPanelIndex = index;
    element.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  });
  panelbar.addEventListener('dragend', () => {
    draggedPanelIndex = null;
    panels.forEach((candidate) => candidate.element.classList.remove('is-dragging', 'is-drop-target'));
  });
  element.addEventListener('dragover', (event) => {
    if (draggedPanelIndex === null || draggedPanelIndex === index) return;
    event.preventDefault();
    element.classList.add('is-drop-target');
  });
  element.addEventListener('dragleave', () => element.classList.remove('is-drop-target'));
  element.addEventListener('drop', (event) => {
    event.preventDefault();
    element.classList.remove('is-drop-target');
    const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isInteger(sourceIndex)) reorderPanels(sourceIndex, index);
  });

  name.textContent = accounts[index].label || `Cuenta ${index + 1}`;
  const storedCaptureSort = localStorage.getItem(`captureLogSort:${index}`);
  if ([...captureLogSort.options].some((option) => option.value === storedCaptureSort)) {
    captureLogSort.value = storedCaptureSort;
  }
  captureFilterDays.value = panel.captureFilters.days;
  captureFilterNumber.value = panel.captureFilters.number;
  captureFilterIvMin.value = panel.captureFilters.ivMin;
  captureFilterIvMax.value = panel.captureFilters.ivMax;
  captureFilterPowerMin.value = panel.captureFilters.powerMin;
  captureFilterPowerMax.value = panel.captureFilters.powerMax;
  captureFilterShiny.value = panel.captureFilters.shiny;
  updateZoom(panel, panel.zoom);
  setupFloatGeometry(panel, 'capture');
  setupFloatGeometry(panel, 'hunt');

  element.querySelector('.zoom-out').addEventListener('click', () => updateZoom(panel, panel.zoom - ZOOM_STEP));
  element.querySelector('.zoom-in').addEventListener('click', () => updateZoom(panel, panel.zoom + ZOOM_STEP));
  element.querySelector('.reload').addEventListener('click', () => {
    clearConnectionTimers(panel);
    panel.connectionFailures = 0;
    loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Recargando' });
  });
  expandButton.addEventListener('click', () => toggleExpanded(panel));
  captureLogButton.addEventListener('click', () => setCaptureLogOpen(panel, !panel.captureLogOpen));
  captureLogDeleteButton.addEventListener('click', () => deletePanelCaptureLog(panel));
  captureLogPanel.querySelector('.capture-float-close').addEventListener('click', () => setCaptureLogOpen(panel, false));
  captureLogPanel.addEventListener('click', (event) => {
    if (!event.target.closest('.capture-flat-row')) hideCaptureDetail(panel);
  });
  captureLogSort.addEventListener('change', () => {
    localStorage.setItem(`captureLogSort:${panel.index}`, captureLogSort.value);
    panel.captureLogSignature = '';
    if (panel.captureLogSnapshot) renderCaptureLog(panel, panel.captureLogSnapshot);
    else refreshPanelCaptureLog(panel);
  });
  const applyCaptureFilters = () => {
    panel.captureFilters = {
      days: captureFilterDays.value,
      number: captureFilterNumber.value,
      names: [...captureFilterNames.selectedOptions].map((option) => option.value),
      ivMin: captureFilterIvMin.value,
      ivMax: captureFilterIvMax.value,
      powerMin: captureFilterPowerMin.value,
      powerMax: captureFilterPowerMax.value,
      ball: captureFilterBall.value,
      shiny: captureFilterShiny.value
    };
    localStorage.setItem(`captureLogFilters:${panel.index}`, JSON.stringify(panel.captureFilters));
    panel.captureLogSignature = '';
    if (panel.captureLogSnapshot) renderCaptureLog(panel, panel.captureLogSnapshot);
  };
  [captureFilterDays, captureFilterNumber, captureFilterNames, captureFilterIvMin, captureFilterIvMax, captureFilterPowerMin, captureFilterPowerMax, captureFilterBall, captureFilterShiny]
    .forEach((control) => control.addEventListener('change', applyCaptureFilters));
  captureFilterNames.addEventListener('mousedown', (event) => {
    const option = event.target.closest('option');
    if (!option) return;
    event.preventDefault();
    option.selected = !option.selected;
    captureFilterNames.dispatchEvent(new Event('change', { bubbles: true }));
    captureFilterNames.focus();
  });
  captureFilterReset.addEventListener('click', () => {
    panel.captureFilters = captureLogFilterDefaults();
    captureFilterDays.value = '';
    captureFilterNumber.value = '';
    [...captureFilterNames.options].forEach((option) => { option.selected = false; });
    captureFilterIvMin.value = '';
    captureFilterIvMax.value = '';
    captureFilterPowerMin.value = '';
    captureFilterPowerMax.value = '';
    captureFilterBall.value = '';
    captureFilterShiny.value = '';
    localStorage.removeItem(`captureLogFilters:${panel.index}`);
    panel.captureLogSignature = '';
    if (panel.captureLogSnapshot) renderCaptureLog(panel, panel.captureLogSnapshot);
  });
  huntButton.addEventListener('click', () => setHuntAnalyzerOpen(panel, !panel.huntOpen));
  huntResetButton.addEventListener('click', () => resetPanelHuntAnalyzer(panel));
  huntDeleteButton.addEventListener('click', () => deletePanelHuntSession(panel));
  huntPanel.querySelector('.hunt-float-close').addEventListener('click', () => setHuntAnalyzerOpen(panel, false));
  accountInfoButton.addEventListener('click', () => setAccountInfoOpen(panel, !panel.accountInfoOpen));
  accountInfoPanel.querySelector('.account-info-close').addEventListener('click', () => setAccountInfoOpen(panel, false));

  attachResilientWebview(panel, {
    onStart: () => {
      panel.captureMonitorReady = false;
      panel.captureSignatureCounts = new Map();
      panel.captureLogSignature = '';
      if (panel.accountInfoOpen) {
        panel.accountInfoState.hidden = false;
        panel.accountInfoState.textContent = 'Reconectando con el perfil del jugador…';
        panel.accountInfoContent.replaceChildren();
      }
      if (panel.captureLogOpen && !panel.captureLogPreview) {
        panel.captureLogState.textContent = 'Reconectando con Capture Log…';
        panel.captureLogState.classList.remove('is-live', 'is-error');
        panel.captureLogList.replaceChildren();
      }
      if (panel.huntOpen && !panel.huntPreview) {
        panel.huntState.textContent = 'Reconectando con la sesión…';
        panel.huntState.classList.remove('is-live', 'is-error');
        panel.huntContent.replaceChildren();
      }
    },
    onReady: async () => {
      updateZoom(panel, panel.zoom);
      try { await webview.executeJavaScript(captureMonitorInstallScript()); } catch {}
      await applyGameTheme(panel);
      await window.pokeGridUserScriptManager?.installIntoPanel(panel);
      attemptLogin(panel);
    },
    onNavigate: async (event) => {
      attemptLogin(panel);
      if (event?.type === 'did-navigate-in-page') await window.pokeGridUserScriptManager?.installIntoPanel(panel);
    }
  });
  if (!window.pokeGrid.previewMode) {
    window.setTimeout(() => loadConnectionPanel(panel, LOGIN_URL, { reason: 'Inicio escalonado' }), 450 + index * 900);
  }
}

function refreshPanelNames() {
  panels.forEach((panel) => {
    panel.name.textContent = accounts[panel.index].label || `Cuenta ${panel.index + 1}`;
  });
  refreshNotificationAccountOptions();
  renderCaptureGoals();
  renderNotifications();
  window.pokeGridUserScriptManager?.setAccounts(accounts);
}

function openAccountsModal() {
  accountRows.replaceChildren();
  modalMessage.textContent = '';
  modalMessage.classList.remove('is-ok');

  accounts.forEach((account, index) => {
    const row = document.createElement('div');
    row.className = 'account-row';
    row.innerHTML = `
      <label class="field">
        <span>NOMBRE DEL PANEL</span>
        <input data-index="${index}" data-field="label" maxlength="40" placeholder="Cuenta ${index + 1}">
      </label>
      <label class="field">
        <span>USUARIO O EMAIL</span>
        <input data-index="${index}" data-field="username" maxlength="180" autocomplete="off" placeholder="Usuario">
      </label>
      <label class="field">
        <span>CONTRASEÑA</span>
        <input data-index="${index}" data-field="password" maxlength="300" type="password" autocomplete="new-password" placeholder="Contraseña">
      </label>`;
    row.querySelector('[data-field="label"]').value = account.label || '';
    row.querySelector('[data-field="username"]').value = account.username || '';
    row.querySelector('[data-field="password"]').value = account.password || '';
    accountRows.appendChild(row);
  });

  modalBackdrop.hidden = false;
  accountsSourcePath.textContent = linkedAccountsSource
    ? `Archivo vinculado: ${linkedAccountsSource}`
    : 'Ningún archivo vinculado. Al importar un .txt, el launcher recordará su ruta absoluta y sincronizará futuros cambios.';
  accountRows.querySelector('input')?.focus();
}

function closeAccountsModal() {
  modalBackdrop.hidden = true;
}

function fillAccountForm(rows) {
  normalizeAccounts(rows).forEach((account, index) => {
    for (const field of ['label', 'username', 'password']) {
      const input = accountRows.querySelector(`input[data-index="${index}"][data-field="${field}"]`);
      if (input) input.value = account[field] || '';
    }
  });
}

downloadAccountsTemplateButton.addEventListener('click', async () => {
  downloadAccountsTemplateButton.disabled = true;
  modalMessage.textContent = 'Preparando la plantilla…';
  modalMessage.classList.remove('is-ok');
  try {
    const result = await window.pokeGrid.downloadAccountsTemplate();
    if (result.canceled) {
      modalMessage.textContent = '';
      return;
    }
    if (!result.ok) throw new Error(result.error || 'No se pudo guardar la plantilla.');
    modalMessage.textContent = `Plantilla guardada: ${result.file}`;
    modalMessage.classList.add('is-ok');
  } catch (error) {
    modalMessage.textContent = error.message || 'No se pudo guardar la plantilla.';
  } finally {
    downloadAccountsTemplateButton.disabled = false;
  }
});

importAccountsButton.addEventListener('click', async () => {
  importAccountsButton.disabled = true;
  modalMessage.textContent = 'Leyendo y validando las cuatro cuentas…';
  modalMessage.classList.remove('is-ok');
  try {
    const result = await window.pokeGrid.importAccountsFile();
    if (result.canceled) {
      modalMessage.textContent = '';
      return;
    }
    if (!result.ok) throw new Error(result.error || 'No se pudo importar el archivo.');
    fillAccountForm(result.accounts);
    accounts = normalizeAccounts(result.accounts);
    linkedAccountsSource = result.sourcePath || linkedAccountsSource;
    accountsSourcePath.textContent = `Archivo vinculado: ${linkedAccountsSource}`;
    refreshPanelNames();
    modalMessage.textContent = `${result.file}: cuatro cuentas importadas y vinculadas. Los cambios futuros se sincronizarán automáticamente.`;
    modalMessage.classList.add('is-ok');
  } catch (error) {
    modalMessage.textContent = error.message || 'El archivo no contiene una plantilla válida.';
  } finally {
    importAccountsButton.disabled = false;
  }
});

async function syncLinkedAccounts() {
  if (accountSourceSyncBusy || !window.pokeGrid.syncAccountsSource) return;
  accountSourceSyncBusy = true;
  try {
    const result = await window.pokeGrid.syncAccountsSource();
    linkedAccountsSource = result.sourcePath || linkedAccountsSource;
    if (result.ok && result.changed) {
      accounts = normalizeAccounts(result.accounts);
      refreshPanelNames();
      if (!modalBackdrop.hidden) {
        fillAccountForm(accounts);
        modalMessage.textContent = 'Cambios del archivo vinculado aplicados automáticamente.';
        modalMessage.classList.add('is-ok');
      }
    }
    if (!modalBackdrop.hidden && linkedAccountsSource) accountsSourcePath.textContent = `Archivo vinculado: ${linkedAccountsSource}`;
  } finally {
    accountSourceSyncBusy = false;
  }
}

accountsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nextAccounts = normalizeAccounts(accounts);
  accountRows.querySelectorAll('input').forEach((input) => {
    nextAccounts[Number(input.dataset.index)][input.dataset.field] = input.value.trim();
  });

  const result = await window.pokeGrid.saveAccounts(nextAccounts);
  if (!result.ok) {
    modalMessage.textContent = result.error || 'No fue posible guardar las cuentas.';
    return;
  }

  accounts = nextAccounts;
  refreshPanelNames();
  modalMessage.textContent = 'Cuentas guardadas de forma segura.';
  modalMessage.classList.add('is-ok');
  window.setTimeout(closeAccountsModal, 500);
});

document.querySelector('#accountsButton').addEventListener('click', openAccountsModal);
document.querySelector('#pokepediaButton').addEventListener('click', async () => {
  const button = document.querySelector('#pokepediaButton');
  if (button.disabled) return;
  button.disabled = true;
  try {
    await window.pokeGrid.openPokepedia();
  } finally {
    button.disabled = false;
  }
});
farmButton.addEventListener('click', openFarmModal);
statisticsButton.addEventListener('click', openStatistics);
refreshStatisticsButton.addEventListener('click', refreshStatistics);
closeStatisticsButton.addEventListener('click', closeStatistics);
statisticsViewTabs.forEach((tab) => tab.addEventListener('click', () => setStatisticsView(tab.dataset.statisticsView)));
statisticsAccounts.addEventListener('click', (event) => {
  const button = event.target.closest('[data-account-view]');
  const card = button?.closest('.statistics-account-card');
  if (!button || !card) return;
  const accountIndex = Number(card.dataset.accountIndex);
  const view = button.dataset.accountView === 'drops' ? 'drops' : 'summary';
  statisticsAccountViews.set(accountIndex, view);
  card.querySelectorAll('[data-account-view]').forEach((candidate) => candidate.classList.toggle('is-active', candidate === button));
  card.querySelectorAll('[data-account-pane]').forEach((pane) => { pane.hidden = pane.dataset.accountPane !== view; });
});
statisticsBackdrop.addEventListener('click', (event) => {
  if (event.target === statisticsBackdrop) closeStatistics();
});
notificationButton.addEventListener('click', () => {
  if (notificationPanel.hidden) openNotificationPanel();
  else closeNotificationPanel();
});
document.querySelector('#closeNotificationButton').addEventListener('click', closeNotificationPanel);
document.querySelector('#markNotificationsButton').addEventListener('click', () => {
  launcherNotifications.forEach((notification) => { notification.read = true; });
  persistLauncherNotifications(launcherNotifications).catch(() => {});
  saveLauncherNotifications();
  renderNotifications();
});
document.querySelector('#clearNotificationsButton').addEventListener('click', () => {
  if (launcherNotifications.length && !window.confirm('¿Borrar todo el historial de notificaciones?')) return;
  launcherNotifications = [];
  notificationCounters = { goal: 0, shiny: 0, legendary: 0 };
  notificationSourceKeys = new Set();
  recentNotificationSignatures.clear();
  clearNotificationArchive().catch(() => {});
  saveNotificationCounters();
  saveLauncherNotifications();
  renderNotifications();
});
['input', 'change'].forEach((eventName) => {
  [notificationPokemonFilter, notificationTypeFilter, notificationDateFromFilter, notificationDateToFilter,
    notificationIvFilter, notificationTierFilter].forEach((control) => control.addEventListener(eventName, renderNotifications));
});
['weak', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'ancient', 'divine'].forEach((tier) => {
  const option = document.createElement('option');
  option.value = tier; option.textContent = tierLabel(tier);
  notificationTierFilter.appendChild(option);
});
resetNotificationFiltersButton.addEventListener('click', () => {
  notificationPokemonFilter.value = '';
  notificationTypeFilter.value = 'all';
  notificationDateFromFilter.value = '';
  notificationDateToFilter.value = '';
  notificationIvFilter.value = '';
  notificationTierFilter.value = 'all';
  renderNotifications();
});
function updateGoalFormKind() {
  const isDrop = goalKindSelect.value === 'drop';
  goalTargetLabel.textContent = isDrop ? 'DROPS / OBJETOS PERMITIDOS (CATÁLOGO)' : 'POKÉMON PERMITIDOS (CATÁLOGO)';
  goalCatalogSearch.placeholder = isDrop ? 'Buscar drop…' : 'Buscar Pokémon…';
  goalIvField.hidden = isDrop;
  goalTierField.hidden = isDrop;
  goalQuantityField.hidden = !isDrop;
  goalSelectShinyCardsButton.hidden = !isDrop;
  goalSelectedTargets.clear();
  goalPokemonInput.value = '';
  goalCatalogSearch.value = '';
  goalCatalogHelp.textContent = isDrop
    ? 'Selecciona uno o varios drops del catálogo del juego.'
    : 'Selecciona uno o varios Pokémon para crear sus metas.';
  goalFormStatus.textContent = '';
  renderGoalCatalog();
  if (isDrop) loadGoalDropCatalog().then(renderGoalCatalog).catch(() => {});
}
function openGoalBuilder(goal = null) {
  closeNotificationPanel();
  editingGoalId = goal?.id || null;
  document.querySelector('#goalBuilderTitle').textContent = goal ? 'Editar meta' : 'Crear meta';
  captureGoalForm.querySelector('.capture-goal-submit').textContent = goal ? 'Guardar cambios' : 'Guardar meta';
  if (goal) {
    goalKindSelect.value = goal.kind;
    updateGoalFormKind();
    goalSelectedTargets = new Set([goal.pokemon]);
    goalPokemonInput.value = goal.pokemon;
    goalAccountSelect.value = String(goal.account);
    goalIvInput.value = String(goal.minIv);
    goalQuantityInput.value = String(goal.minQuantity);
    goalSelectedTiers = new Set(goal.tiers);
    [...goalTierButtons.children].forEach((button) => button.classList.toggle('is-active', goalSelectedTiers.has(button.dataset.tier)));
  } else {
    editingGoalId = null;
  }
  goalBuilderBackdrop.hidden = false;
  goalFormStatus.textContent = '';
  renderGoalCatalog();
  if (goalKindSelect.value === 'drop') loadGoalDropCatalog().then(renderGoalCatalog).catch(() => {});
  requestAnimationFrame(() => goalCatalogSearch.focus());
}

function closeGoalBuilder() {
  goalBuilderBackdrop.hidden = true;
  editingGoalId = null;
}

openGoalBuilderButton.addEventListener('click', () => openGoalBuilder());
openGoalManagerButton.addEventListener('click', openGoalManager);
closeGoalManagerButton.addEventListener('click', closeGoalManager);
goalManagerBackdrop.addEventListener('click', (event) => { if (event.target === goalManagerBackdrop) closeGoalManager(); });
goalManagerSearch.addEventListener('input', renderGoalManager);
goalManagerKindFilter.addEventListener('change', renderGoalManager);
goalManagerCreateButton.addEventListener('click', () => { closeGoalManager(); openGoalBuilder(); });
closeGoalBuilderButton.addEventListener('click', closeGoalBuilder);
goalBuilderBackdrop.addEventListener('click', (event) => {
  if (event.target === goalBuilderBackdrop) closeGoalBuilder();
});
goalKindSelect.addEventListener('change', updateGoalFormKind);
goalCatalogSearch.addEventListener('input', renderGoalCatalog);
goalSelectShinyCardsButton.addEventListener('click', async () => {
  await loadGoalDropCatalog();
  const shinyCards = goalDropCatalog.filter((item) => {
    const name = normalizeSearchText(item.name);
    return name.includes('shiny') && name.includes('card');
  });
  shinyCards.forEach((item) => goalSelectedTargets.add(item.name));
  goalPokemonInput.value = [...goalSelectedTargets].join(', ');
  goalCatalogHelp.textContent = shinyCards.length
    ? `${shinyCards.length} Shiny Card seleccionadas · ${goalSelectedTargets.size} objetivos en total`
    : 'El catálogo no contiene objetos Shiny Card.';
  renderGoalCatalog();
});
initializeGoalTierButtons();
updateGoalFormKind();
captureGoalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  goalFormStatus.classList.remove('is-error', 'is-ok');
  const targets = [...goalSelectedTargets];
  if (!targets.length) {
    goalFormStatus.textContent = `Selecciona al menos un ${goalKindSelect.value === 'drop' ? 'drop' : 'Pokémon'} del catálogo.`;
    goalFormStatus.classList.add('is-error');
    return;
  }
  let added = 0;
  targets.forEach((target) => {
    const goal = normalizeCaptureGoal({
      id: createLocalId('goal'),
      kind: goalKindSelect.value,
      pokemon: target,
      account: Number(goalAccountSelect.value),
      minIv: Number(goalIvInput.value),
      minLevel: 1,
      tier: 'any',
      tiers: goalKindSelect.value === 'drop' ? [] : [...goalSelectedTiers],
      minQuantity: Number(goalQuantityInput.value)
    });
    if (!goal) return;
    const tierSignature = goal.tiers.slice().sort().join(',');
    const duplicate = captureGoals.some((candidate) => candidate.id !== editingGoalId &&
      normalizeSearchText(candidate.pokemon) === normalizeSearchText(goal.pokemon) &&
      candidate.kind === goal.kind && candidate.account === goal.account && candidate.minIv === goal.minIv &&
      candidate.minLevel === goal.minLevel && candidate.tiers.slice().sort().join(',') === tierSignature &&
      candidate.minQuantity === goal.minQuantity
    );
    if (!duplicate) {
      if (editingGoalId) captureGoals = captureGoals.map((candidate) => candidate.id === editingGoalId ? { ...goal, id: editingGoalId } : candidate);
      else captureGoals.unshift(goal);
      added += 1;
    }
  });
  if (added) {
    saveCaptureGoals();
    renderCaptureGoals();
  }
  goalFormStatus.textContent = added ? `${added} meta${added === 1 ? '' : 's'} guardada${added === 1 ? '' : 's'}.` : 'Las metas seleccionadas ya existían.';
  goalFormStatus.classList.add('is-ok');
  goalSelectedTargets.clear();
  goalPokemonInput.value = '';
  goalIvInput.value = '0';
  goalTierSelect.value = 'any';
  goalQuantityInput.value = '1';
  renderGoalCatalog();
  if (editingGoalId && added) {
    editingGoalId = null;
    closeGoalBuilder();
    openGoalManager();
    return;
  }
  goalCatalogSearch.focus();
});
document.querySelector('#closeFarmButton').addEventListener('click', closeFarmModal);
document.querySelector('#cancelFarmButton').addEventListener('click', closeFarmModal);
document.querySelector('#closeFarmPickerButton').addEventListener('click', closeFarmPicker);
refreshFarmButton.addEventListener('click', refreshFarmData);
rereadFarmLeadersButton.addEventListener('click', () => rereadFarmLeaders());
farmAllowOrreTravelInput.checked = farmAllowOrreTravel;
farmAllowOrreTravelInput.addEventListener('change', () => {
  farmAllowOrreTravel = farmAllowOrreTravelInput.checked;
  localStorage.setItem(FARM_ORRE_PERMISSION_KEY, farmAllowOrreTravel ? '1' : '0');
  renderFarmAccounts();
  setFarmMessage(farmAllowOrreTravel
    ? 'Viaje a Orre autorizado: el launcher confirmará automáticamente la advertencia del juego.'
    : 'Confirmación automática de Orre desactivada.', 'ok');
});
startFarmButton.addEventListener('click', startFarmMode);
stopFarmButton.addEventListener('click', disableFarmMode);
farmSearchInput.addEventListener('input', renderFarmPicker);
farmTypeFilter.addEventListener('change', () => {
  farmPickerType = farmTypeFilter.value;
  renderFarmPicker();
});
farmLevelFilter.addEventListener('change', () => {
  farmPickerLevel = farmLevelFilter.value;
  renderFarmPicker();
});
farmMatchupFilter.addEventListener('change', () => {
  farmPickerMatchup = farmMatchupFilter.value;
  renderFarmPicker();
});
farmSortSelect.addEventListener('change', () => {
  farmPickerSort = farmSortSelect.value;
  renderFarmPicker();
});
farmShinyFilter.addEventListener('change', () => {
  farmPickerShinyOnly = farmShinyFilter.checked;
  renderFarmPicker();
});
resetFarmFiltersButton.addEventListener('click', () => {
  farmSearchInput.value = '';
  farmPickerArea = 'all';
  farmPickerType = 'all';
  farmPickerLevel = 'all';
  farmPickerMatchup = 'all';
  farmPickerSort = 'recommended';
  farmPickerShinyOnly = false;
  farmShinyFilter.checked = false;
  renderFarmPicker();
});
topbarToggle.addEventListener('click', () => applySidebarState(!appbar.classList.contains('is-sidebar-open')));
topbarCollapseButton.addEventListener('click', () => applyTopbarCollapsedState(!appbar.classList.contains('is-topbar-collapsed')));
sidebarScrim.addEventListener('click', () => applySidebarState(false));
globalActions.addEventListener('click', (event) => {
  const action = event.target.closest('button');
  if (!action || action === viewModeButton || action.closest('#viewModeMenu')) return;
  applySidebarState(false);
});
document.querySelector('#closeModalButton').addEventListener('click', closeAccountsModal);
document.querySelector('#cancelButton').addEventListener('click', closeAccountsModal);
addBrowserInstanceButton.addEventListener('click', openBrowserInstanceModal);
closeBrowserInstanceButton.addEventListener('click', closeBrowserInstanceModal);
cancelBrowserInstanceButton.addEventListener('click', closeBrowserInstanceModal);
browserInstanceForm.addEventListener('submit', (event) => {
  event.preventDefault();
  browserInstanceMessage.classList.remove('is-ok');
  try {
    if (browserInstances.length >= 12) throw new Error('El launcher admite hasta 12 instancias adicionales guardadas.');
    const instance = normalizeBrowserInstance({
      id: makeBrowserInstanceId(),
      name: browserInstanceName.value,
      url: browserInstanceUrl.value,
      count: browserInstanceCount.value
    });
    if (!instance) throw new Error('No se pudo crear la instancia con esos datos.');
    browserInstances.push(instance);
    saveBrowserInstances();
    createBrowserInstanceWorkspace(instance, browserInstances.length - 1);
    renderBrowserInstanceTabs();
    closeBrowserInstanceModal();
    activateBrowserInstance(instance.id);
  } catch (error) {
    browserInstanceMessage.textContent = error.message || 'No se pudo crear la instancia.';
  }
});
viewModeButton.addEventListener('click', () => {
  viewModeMenu.hidden = !viewModeMenu.hidden;
  viewModeButton.setAttribute('aria-expanded', String(!viewModeMenu.hidden));
  if (!viewModeMenu.hidden) {
    renderViewModeMenu();
    positionViewModeMenu();
    requestAnimationFrame(positionViewModeMenu);
  }
});
viewModeAllButton.addEventListener('click', () => {
  visibleAccountIndexes = new Set(Array.from({ length: ACCOUNT_COUNT }, (_, index) => index));
  applyGridView();
});
document.addEventListener('pointerdown', (event) => {
  if (!viewModeMenu.hidden && !event.target.closest('.view-mode-control, #viewModeMenu')) {
    viewModeMenu.hidden = true;
    viewModeButton.setAttribute('aria-expanded', 'false');
  }
});
window.addEventListener('resize', () => {
  positionViewModeMenu();
  refreshBrowserInstanceLayout(activeBrowserInstanceId);
}, { passive: true });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && appbar.classList.contains('is-sidebar-open')) {
    applySidebarState(false);
    topbarToggle.focus();
  }
  if (event.key === 'Escape' && !statisticsBackdrop.hidden) {
    closeStatistics();
    statisticsButton.focus();
  }
  if (event.key === 'Escape' && !viewModeMenu.hidden) {
    viewModeMenu.hidden = true;
    viewModeButton.setAttribute('aria-expanded', 'false');
    viewModeButton.focus();
  }
  if (event.key === 'Escape' && !browserInstanceBackdrop.hidden) {
    closeBrowserInstanceModal();
    addBrowserInstanceButton.focus();
  }
  if (event.key === 'Escape') panels.forEach((panel) => {
    if (!panel.captureLogTooltip.hidden) hideCaptureDetail(panel);
  });
});
document.querySelector('#reloadAllButton').addEventListener('click', () => {
  const activePanels = activeBrowserInstanceId === PRIMARY_BROWSER_INSTANCE_ID
    ? panels
    : browserInstanceViews.get(activeBrowserInstanceId)?.panels || [];
  activePanels.forEach((panel, index) => {
    window.setTimeout(() => {
      clearConnectionTimers(panel);
      panel.connectionFailures = 0;
      loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Recarga escalonada' });
    }, index * 700);
  });
});
function releaseLauncherMemoryCaches() {
  let cachedEntries = huntDropIconCache.size + pokeApiSpeciesCache.size + pokeApiSpriteCache.size;
  huntDropIconCache.clear();
  pokeApiSpeciesCache.clear();
  pokeApiSpriteCache.clear();
  panels.forEach((panel) => {
    if (!panel.captureLogOpen) {
      cachedEntries += panel.captureLogList.childElementCount;
      panel.captureLogList.replaceChildren();
      panel.captureLogSignature = '';
      hideCaptureDetail(panel);
    }
    if (!panel.huntOpen) {
      cachedEntries += panel.huntContent.childElementCount;
      panel.huntContent.replaceChildren();
      panel.huntSnapshot = null;
    }
    if (!panel.accountInfoOpen) {
      cachedEntries += panel.accountInfoContent.childElementCount;
      panel.accountInfoContent.replaceChildren();
    }
  });
  const cutoff = Date.now() - 120_000;
  for (const [key, timestamp] of recentNotificationSignatures) {
    if (Number(timestamp) < cutoff) recentNotificationSignatures.delete(key);
  }
  return cachedEntries;
}

cleanupMemoryButton.addEventListener('click', async () => {
  cleanupMemoryButton.disabled = true;
  cleanupMemoryButton.classList.add('is-cleaning');
  cleanupMemoryButton.setAttribute('aria-busy', 'true');
  const original = cleanupMemoryButton.innerHTML;
  cleanupMemoryButton.innerHTML = '<span class="memory-spinner" aria-hidden="true">◌</span><span>Optimizando</span>';
  try {
    const rendererCachedEntries = releaseLauncherMemoryCaches();
    const result = await window.pokeGrid.cleanupMemory();
    if (!result.ok) throw new Error(result.error || 'No se pudo liberar la memoria temporal.');
    const released = Number(result.releasedMb) || 0;
    cleanupMemoryButton.innerHTML = `<span aria-hidden="true">✓</span><span>${released ? `−${released} MB` : 'RAM lista'}</span>`;
    cleanupMemoryButton.title = [
      `${Number(result.preservedProcesses) || 0} procesos gráficos preservados`,
      `${Number(result.cachedEntries || 0) + rendererCachedEntries} cachés visuales liberadas`,
      released ? `${released} MB devueltos al sistema` : 'La memoria disponible quedó optimizada',
      'No se recargaron sesiones ni se alteraron datos, conexiones o temporizadores',
      'Limpieza segura: no se adjuntó el depurador ni se forzó el GC de las sesiones'
    ].join(' · ');
  } catch (error) {
    cleanupMemoryButton.innerHTML = '<span aria-hidden="true">!</span><span>Error RAM</span>';
    cleanupMemoryButton.title = error.message;
  } finally {
    window.setTimeout(() => {
      cleanupMemoryButton.innerHTML = original;
      cleanupMemoryButton.disabled = false;
      cleanupMemoryButton.classList.remove('is-cleaning');
      cleanupMemoryButton.removeAttribute('aria-busy');
    }, 2200);
  }
});
if (window.pokeGrid.onUpdateProgress) {
  window.pokeGrid.onUpdateProgress((progress = {}) => {
    if (!updateLauncherButton.disabled) updateLauncherButton.disabled = true;
    if (progress.phase === 'download') {
      setUpdateLauncherState('⇩', `Descargando ${Number(progress.percent) || 0}%`);
    } else if (progress.phase === 'verify') {
      setUpdateLauncherState('✓', 'Verificando');
    }
  });
}
updateLauncherButton.addEventListener('click', async () => {
  updateLauncherButton.disabled = true;
  updateLauncherButton.setAttribute('aria-busy', 'true');
  setUpdateLauncherState('◌', 'Buscando', true);
  try {
    const result = await window.pokeGrid.checkForUpdates();
    if (!result.ok) throw new Error(result.error || 'No se pudo buscar la actualización.');
    currentLauncherVersion = String(result.currentVersion || currentLauncherVersion || '').trim();
    if (result.status === 'current') {
      setUpdateLauncherState('✓', 'Está actualizado');
      updateLauncherButton.title = `Versión actual ${result.currentVersion}`;
    } else if (result.status === 'development') {
      setUpdateLauncherState('⌘', 'Modo desarrollo');
      updateLauncherButton.title = 'La instalación automática se comprueba desde el paquete portátil.';
    } else if (result.status === 'installing') {
      setUpdateLauncherState('◌', 'Reiniciando', true);
      updateLauncherButton.title = `Instalando ${result.latestVersion}`;
      return;
    }
  } catch (error) {
    setUpdateLauncherState('!', 'Error de actualización');
    updateLauncherButton.title = error.message;
  } finally {
    if (!updateLauncherButton.textContent.includes('Reiniciando')) {
      window.setTimeout(() => {
        updateLauncherButton.disabled = false;
        updateLauncherButton.removeAttribute('aria-busy');
      }, 2200);
    }
  }
});
document.querySelector('#loginAllButton').addEventListener('click', () => {
  panels.forEach((panel, index) => {
    window.setTimeout(() => {
      clearConnectionTimers(panel);
      panel.connectionFailures = 0;
      panel.lastLoginAttempt = 0;
      if (webviewCurrentUrl(panel).startsWith(LOGIN_URL)) attemptLogin(panel, true);
      else loadConnectionPanel(panel, LOGIN_URL, { reason: 'Abriendo acceso' });
    }, index * 700);
  });
});

modalBackdrop.addEventListener('click', (event) => {
  if (event.target === modalBackdrop) closeAccountsModal();
});

browserInstanceBackdrop.addEventListener('click', (event) => {
  if (event.target === browserInstanceBackdrop) closeBrowserInstanceModal();
});

window.addEventListener('offline', () => {
  allConnectionPanels().forEach((panel) => {
    window.clearTimeout(panel.recoveryTimer);
    panel.recoveryTimer = 0;
    setConnectionVisual(panel, 'error', 'Sin conexión · reconexión automática');
  });
});

window.addEventListener('online', () => {
  allConnectionPanels().forEach((panel, index) => {
    window.setTimeout(() => schedulePanelRecovery(panel, 'La red volvió a estar disponible', { immediate: true }), index * 350);
  });
});

farmBackdrop.addEventListener('click', (event) => {
  if (event.target === farmBackdrop) closeFarmModal();
});

farmPickerLayer.addEventListener('click', (event) => {
  if (event.target === farmPickerLayer) closeFarmPicker();
});

document.addEventListener('pointerdown', (event) => {
  if (!notificationPanel.hidden && !notificationPanel.contains(event.target) && !notificationButton.contains(event.target)) {
    closeNotificationPanel();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const openHuntPanel = panels.find((panel) => panel.huntOpen);
    if (!goalBuilderBackdrop.hidden) closeGoalBuilder();
    else if (openHuntPanel) setHuntAnalyzerOpen(openHuntPanel, false);
    else if (!notificationPanel.hidden) closeNotificationPanel();
    else if (!farmPickerLayer.hidden) closeFarmPicker();
    else if (!farmBackdrop.hidden) closeFarmModal();
    else if (!modalBackdrop.hidden) closeAccountsModal();
    else restoreGrid();
  }
  if (event.ctrlKey && ['1', '2', '3', '4'].includes(event.key)) {
    event.preventDefault();
    toggleExpanded(panels[Number(event.key) - 1]);
  }
});

window.__pokeGridOpenFarm = openFarmModal;
window.__pokeGridPreviewFarmRecommendations = () => {
  farmContexts[0] = {
    ready: true,
    level: 100,
    location: 'Cerulean',
    leader: normalizeFarmLeader({ name: 'Blastoise', level: 85, strength: 236, strengthSource: 'Ataque', hp: 240, maxHp: 240, types: ['water'] })
  };
  farmCatalog = [
    normalizeFarmTarget({ slug: 'brave-clefable', name: 'Brave Clefable', area: 'outland', level: 150, speciesId: 36, spriteSpeciesId: 36, types: ['fairy'], tier: 'COMMON', hasShinyForm: true }),
    normalizeFarmTarget({ slug: 'brave-noctowl', name: 'Brave Noctowl', area: 'outland', level: 150, speciesId: 164, spriteSpeciesId: 164, types: ['normal', 'flying'], tier: 'UNCOMMON' }),
    normalizeFarmTarget({ slug: 'dark-crobat', name: 'Dark Crobat', area: 'outland', level: 150, speciesId: 169, spriteSpeciesId: 169, types: ['poison', 'flying'], tier: 'RARE' }),
    normalizeFarmTarget({ slug: 'furious-pidgeot', name: 'Furious Pidgeot', area: 'outland', level: 150, speciesId: 18, spriteSpeciesId: 18, types: ['normal', 'flying'], tier: 'COMMON' }),
    normalizeFarmTarget({ slug: 'furious-scyther', name: 'Furious Scyther', area: 'outland', level: 150, speciesId: 123, spriteSpeciesId: 123, types: ['bug', 'flying'], tier: 'COMMON' }),
    normalizeFarmTarget({ slug: 'furious-skarmory', name: 'Furious Skarmory', area: 'outland', level: 150, speciesId: 227, spriteSpeciesId: 227, types: ['steel', 'flying'], tier: 'RARE' }),
    normalizeFarmTarget({ slug: 'furious-wigglytuff', name: 'Furious Wigglytuff', area: 'outland', level: 150, speciesId: 40, spriteSpeciesId: 40, types: ['normal', 'fairy'], tier: 'UNCOMMON' }),
    normalizeFarmTarget({ slug: 'psy-jynx', name: 'Psy Jynx', area: 'outland', level: 150, speciesId: 124, spriteSpeciesId: 124, types: ['ice', 'psychic'], tier: 'COMMON' }),
    normalizeFarmTarget({ slug: 'gyarados', name: 'Gyarados', area: 'kanto', level: 100, speciesId: 130, spriteSpeciesId: 130, types: ['water', 'flying'], tier: 'A', hasShinyForm: true })
  ];
  farmBackdrop.hidden = false;
  renderFarmAccounts();
  openFarmPicker(0);
  return farmCatalog
    .map((target) => ({ name: target.name, ...evaluateFarmTarget(target, farmContexts[0]) }))
    .sort((left, right) => right.score - left.score)
    .map(({ name, score, label }) => ({ name, score, label }));
};
window.__pokeGridOpenNotifications = openNotificationPanel;
window.__pokeGridOpenGoalBuilder = openGoalBuilder;
window.__pokeGridPreviewAccountInfo = () => {
  const panel = panels[0];
  if (!panel) return false;
  setAccountInfoOpen(panel, true);
  renderAccountProfile(panel, { ok: true, name: 'SHOCKVOR', level: 559, rank: 'Maestro III', pokedollars: 1284500, diamonds: 735, vip: true, sprite: '', updatedAt: Date.now() });
  return true;
};
window.__pokeGridPreviewCaptureLog = async (expanded = false) => {
  const panel = panels[0];
  if (!panel) return false;
  if (expanded && expandedPanel !== panel) toggleExpanded(panel);
  panel.captureLogPreview = true;
  setCaptureLogOpen(panel, true);
  await loadCaptureReferenceCatalog(panel).catch(() => {});
  renderCaptureLog(panel, {
    ok: true,
    updatedAt: Date.now(),
    total: 37,
    rows: [
      {
        key: 'pinsir-38', name: 'Ancient Pinsir', level: 1, levelText: 'Lv.1',
        tier: 'rare', quality: 'Rara', qualityMultiplier: 'x1.37', qualityValue: 1.373,
        iv: 110, ivMax: 192, ball: 'Ultra Ball', when: '28/07, 19:27', captureNumber: '1555',
        sprite: '', types: ['Bug'], power: '12', statsSource: 'capture',
        stats: { hp: 1, attack: 2, defense: 2, specialAttack: 1, specialDefense: 1, speed: 2 }
      },
      {
        key: 'magnemite-37', name: 'Magnemite', level: 10, levelText: 'Lv.10',
        tier: 'epic', quality: 'Épica', qualityMultiplier: 'x1.60', qualityValue: 1.6,
        iv: 150, ivMax: 192, ball: 'Ultra Ball', when: '28/07, 02:14', captureNumber: '7806',
        sprite: '', types: ['Electric', 'Steel'], power: '109', statsSource: 'live',
        stats: { hp: 12, attack: 8, defense: 15, specialAttack: 14, specialDefense: 10, speed: 9 }
      },
      {
        key: 'magneton-37', name: 'Magneton', level: 265, levelText: 'Lv.265',
        tier: 'legendary', quality: 'Legendaria', qualityMultiplier: 'x1.80',
        iv: 148, ivMax: 192, ball: 'Ultra Ball', when: '02:31:18', captureNumber: '37',
        sprite: '', types: ['Electric', 'Steel'], power: '5.971',
        stats: { hp: 472, attack: 458, defense: 598, specialAttack: 783, specialDefense: 583, speed: 433 }
      },
      {
        key: 'gengar-36', name: 'Gengar', level: 100, levelText: 'Lv.100',
        tier: 'epic', quality: 'Épica', qualityMultiplier: 'x1.40',
        iv: 181, ivMax: 192, ball: 'Ultra Ball', when: '02:28:04', captureNumber: '36',
        sprite: '', types: ['Ghost', 'Poison'], power: '4.632', isShiny: true,
        stats: { hp: 322, attack: 245, defense: 280, specialAttack: 610, specialDefense: 402, speed: 515 }
      },
      {
        key: 'pikachu-35', name: 'Pikachu', level: 84, levelText: 'Lv.84',
        tier: 'rare', quality: 'Rara', qualityMultiplier: 'x1.25',
        iv: 164, ivMax: 192, ball: 'Great Ball', when: '02:24:52', captureNumber: '35',
        sprite: '', types: ['Electric'], power: '2.418',
        stats: { hp: 238, attack: 292, defense: 205, specialAttack: 318, specialDefense: 244, speed: 386 }
      },
      {
        key: 'bulbasaur-34', name: 'Bulbasaur', level: 61, levelText: 'Lv.61',
        tier: 'uncommon', quality: 'Incomún', qualityMultiplier: 'x1.10',
        iv: 127, ivMax: 192, ball: 'Poké Ball', when: '02:19:33', captureNumber: '34',
        sprite: '', types: ['Grass', 'Poison'], power: '1.806',
        stats: { hp: 231, attack: 206, defense: 218, specialAttack: 265, specialDefense: 271, speed: 192 }
      },
      {
        key: 'bellsprout-33', name: 'Bellsprout', level: 1, levelText: 'Lv.1',
        tier: '', quality: '', qualityMultiplier: '',
        iv: 112, ivMax: 192, ball: 'Ultra Ball', when: '28/07, 02:30', captureNumber: '3231',
        sprite: '', types: ['SPAIN', 'B'], power: '',
        stats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
      }
    ]
  });
  return true;
};
window.__pokeGridPreviewHuntAnalyzer = async (expanded = false) => {
  const panel = panels[0];
  if (!panel) return false;
  if (expanded && expandedPanel !== panel) toggleExpanded(panel);
  panel.huntPreview = true;
  setHuntAnalyzerOpen(panel, true);
  const previewSnapshot = {
    ok: true,
    updatedAt: Date.now(),
    balance: '-$1.457',
    market: { enabled: true, label: 'Usar precios de mercado para los objetos' },
    note: 'Los valores usan precio NPC. Los contadores se reinician al cambiar de caza.',
    metrics: [
      { key: 'defeated', label: 'Derrotados', value: '35', detail: '', kind: 'default' },
      { key: 'time', label: 'Tiempo de caza', value: '3m 37s', detail: '', kind: 'time' },
      { key: 'xp', label: 'XP obtenida', value: '420', detail: '', kind: 'xp' },
      { key: 'captured', label: 'Capturados', value: '35', detail: '+$2.800', kind: 'capture' },
      { key: 'loot', label: 'Botín', value: '$293', detail: '77 objetos', kind: 'loot' },
      { key: 'supply', label: 'Suministros', value: '-$4.550', detail: '35 balls · 0 pociones', kind: 'supply' },
      { key: 'lootRate', label: 'Botín por hora', value: '-$24.171/h', detail: '', kind: 'rate' },
      { key: 'xpRate', label: 'XP por hora', value: '6.968 XP/h', detail: '', kind: 'rate' },
      { key: 'killRate', label: 'Derrotados por hora', value: '581/h', detail: '', kind: 'rate' }
    ],
    drops: [
      { name: 'Leaves', quantity: 'x27', price: '$9', total: '$243', icon: 'https://pokexguides.com/images/items/drops/Leaves.png' },
      { name: 'Seed', quantity: 'x26', price: '$1', total: '$26', icon: 'https://pokexguides.com/images/items/drops/Seed.png' },
      { name: 'Bottles of Poison', quantity: 'x24', price: '$1', total: '$24', icon: 'https://pokexguides.com/images/items/drops/Bottles_of_Poison.png' }
    ]
  };
  await hydrateHuntDropIcons(previewSnapshot);
  renderHuntAnalyzer(panel, previewSnapshot);
  return true;
};
window.__pokeGridPreviewNotifications = () => {
  if (!captureGoals.some((goal) => normalizeSearchText(goal.pokemon) === 'jigglypuff')) {
    captureGoals.unshift(normalizeCaptureGoal({ pokemon: 'Jigglypuff', account: -1, minIv: 150, tier: 'rare' }));
    captureGoals = captureGoals.filter(Boolean);
    saveCaptureGoals();
    renderCaptureGoals();
  }
  addCaptureNotification({ name: 'Jigglypuff', level: 'Lv.40', meta: 'Raro · IV 168/192', iv: 168, ivMax: 192, ball: 'Ultra Ball', isShiny: false }, 0);
  addDefeatNotification({ name: 'Charizard', level: 68, speciesId: 6, looktype: 67, types: ['fire', 'flying'], xpGained: 3848, isShiny: true }, 1);
  addCaptureNotification({ name: 'Ancient Mewtwo ♂ 1ª', level: 'Lv.100', meta: 'Legendario · IV 190/192', iv: 190, ivMax: 192, ball: 'Master Ball', isShiny: false }, 2);
  addCaptureNotification({ name: 'Magnemite', level: 'Lv.10', meta: 'Legendario · IV 183/192', iv: 183, ivMax: 192, ball: 'Ultra Ball', speciesId: 81, looktype: 217, types: ['electric', 'steel'] }, 3);
  openNotificationPanel();
};
window.__pokeGridConnectivitySnapshot = () => allConnectionPanels().map((panel) => ({
  instanceId: panel.instanceId || PRIMARY_BROWSER_INSTANCE_ID,
  index: Number.isInteger(panel.index) ? panel.index : panel.instanceIndex,
  partition: panel.webview.getAttribute('partition'),
  url: webviewCurrentUrl(panel),
  state: panel.element.classList.contains('is-online') ? 'online' : panel.element.classList.contains('is-error') ? 'error' : 'loading',
  failures: panel.connectionFailures || 0,
  isLoading: Boolean(panel.isLoading),
  recoveryScheduled: Boolean(panel.recoveryTimer),
  lastReadyAt: panel.lastReadyAt || 0,
  lastFailure: panel.lastFailure || null
}));
window.__pokeGridCollectGameDiagnostics = async () => Promise.all(panels.map(async (panel) => {
  let guest = null;
  let error = '';
  try {
    guest = await panel.webview.executeJavaScript(`(() => {
      const normalizedText = String(document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
      const resources = performance.getEntriesByType('resource').slice(-80).map((entry) => ({
        name: String(entry.name || '').slice(0, 260),
        kind: String(entry.initiatorType || ''),
        duration: Math.round(Number(entry.duration) || 0),
        transferred: Number(entry.transferSize) || 0
      })).filter((entry) => /(?:api|socket|world|chat|game|map|chunk|_next)/i.test(entry.name)).slice(-30);
      const canvases = [...document.querySelectorAll('canvas')].map((canvas) => ({
        width: canvas.width, height: canvas.height,
        clientWidth: Math.round(canvas.getBoundingClientRect().width),
        clientHeight: Math.round(canvas.getBoundingClientRect().height)
      }));
      return {
        url: location.href,
        readyState: document.readyState,
        title: document.title,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        body: document.body ? { width: document.body.scrollWidth, height: document.body.scrollHeight } : null,
        loadingWorld: /loading world|cargando mundo|carregando mundo/i.test(normalizedText),
        connectingChat: /connecting to chat|conectando (?:con el|al) chat|conectando ao chat/i.test(normalizedText),
        textSample: normalizedText.slice(0, 500),
        canvases,
        resources
      };
    })()`);
  } catch (guestError) {
    error = guestError?.message || String(guestError);
  }
  const rect = panel.webview.getBoundingClientRect();
  return {
    index: panel.index,
    account: accounts[panel.index]?.label || `Cuenta ${panel.index + 1}`,
    launcherState: panel.status.textContent,
    viewRect: { width: Math.round(rect.width), height: Math.round(rect.height) },
    connectionFailures: panel.connectionFailures || 0,
    lastReadyAt: panel.lastReadyAt || 0,
    lastFailure: panel.lastFailure || null,
    console: (panel.consoleDiagnostics || []).slice(-16),
    guest,
    error
  };
}));
window.__pokeGridScheduleRecoveryPreview = (index = 0) => {
  const panel = allConnectionPanels()[Number(index) || 0];
  if (!panel) return false;
  schedulePanelRecovery(panel, 'Prueba controlada de reconexión');
  return Boolean(panel.recoveryTimer) || window.pokeGrid.previewMode;
};

(async function initialize() {
  applySidebarState(localStorage.getItem('launcherSidebarOpen') === '1', { persist: false });
  applyTopbarCollapsedState(localStorage.getItem('launcherTopbarCollapsed') === '1', { persist: false });
  await hydrateNotificationArchive();
  saveLauncherNotifications();
  renderCaptureGoals();
  renderNotifications();
  const result = await window.pokeGrid.loadAccounts();
  accounts = normalizeAccounts(result.accounts);
  linkedAccountsSource = result.sourcePath || '';
  window.pokeGridUserScriptManager?.setAccounts(accounts);
  await window.pokeGridUserScriptManager?.initialize();
  refreshNotificationAccountOptions();
  for (let index = 0; index < ACCOUNT_COUNT; index += 1) createPanel(index);
  initializeBrowserInstances();
  applyGridView(null, { persist: false });
  syncUserScriptPanels();
  window.setInterval(pollCaptureNotifications, 3500);
  window.setInterval(pollCaptureLogs, 4000);
  window.setInterval(pollHuntAnalyzers, 1500);
  window.setInterval(updatePanelLiveClocks, 1000);
  window.setInterval(pollAccountProfiles, 4000);
  window.setInterval(syncLinkedAccounts, 15000);
  if (!result.ok) {
    openAccountsModal();
    modalMessage.textContent = result.error || 'No se pudieron leer las cuentas guardadas.';
  }
})();
