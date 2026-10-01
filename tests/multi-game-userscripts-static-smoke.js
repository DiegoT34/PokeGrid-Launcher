const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const manager = fs.readFileSync(path.join(root, 'src', 'userscripts.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

assert.match(main, /function userScriptGameLabels\(patterns\)/);
assert.match(main, /games: cleanMetadataList\(metadata\.game, 8\)\.length/);
assert.match(main, /: userScriptGameLabels\(normalizedMatches\)/);
assert.match(main, /const games = declaredGames\.length/);
assert.match(manager, /function scriptAppliesToPanel\(script, panel\)/);
assert.match(manager, /function reloadScriptPanels\(\.\.\.changedScripts\)/);
assert.match(manager, /panelInstanceId\(panel\) !== PRIMARY_INSTANCE_ID/);
assert.match(manager, /scriptGameLabels\(script\)/);
assert.doesNotMatch(manager, /if \(!url\.startsWith\(GAME_ORIGIN\)\) return/);
assert.match(renderer, /const guestPreloadUrl = window\.pokeGridUserScriptManager\?\.getGuestPreloadUrl\(\)/);
assert.match(renderer, /instanceName: instance\.name/);
assert.match(renderer, /await window\.pokeGridUserScriptManager\?\.installIntoPanel\(panel\)/);
assert.match(renderer, /function syncUserScriptPanels\(\)/);
assert.match(html, /EJECUTAR EN JUEGOS E INSTANCIAS/);
assert.match(css, /\.script-list-games/);
assert.match(css, /\.script-auto-target/);

// La paleta de cuentas no puede tener un tope: con 32 cuentas un array fijo
// de 4 colores hace que dos cuentas compartan color.
assert.doesNotMatch(renderer, /const STATISTICS_ACCOUNT_COLORS = \[/);
assert.match(renderer, /function accountColor\(index\)/);
// El arranque del modulo de scripts debe validar el DOM en vez de abortar.
assert.match(manager, /const missing = REQUIRED_SCRIPT_ELEMENTS\.filter/);

// Un assert sobre el literal no detectaria un rename de id: estos si.
// Cada id que el modulo declara obligatorio tiene que existir en index.html.
const requiredBlock = manager.match(/const REQUIRED_SCRIPT_ELEMENTS = \[([\s\S]*?)\];/);
assert.ok(requiredBlock, 'userscripts.js debe declarar REQUIRED_SCRIPT_ELEMENTS antes de resolver el DOM.');
const requiredSelectors = [...requiredBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.ok(requiredSelectors.length > 0, 'REQUIRED_SCRIPT_ELEMENTS no puede estar vacia.');
const htmlHasId = (selector) => new RegExp(`id\\s*=\\s*["']${selector.slice(1)}["']`).test(html);
const unknownSelectors = requiredSelectors.filter((selector) => !htmlHasId(selector));
assert.deepEqual(unknownSelectors, [], `REQUIRED_SCRIPT_ELEMENTS apunta a ids que no existen en index.html: ${unknownSelectors.join(', ')}`);

// Y al reves: ningun id que el modulo resuelve puede quedarse fuera de la
// lista, que es justo como un id nuevo se escapaba del aviso del modulo.
const queriedIds = [...manager.matchAll(/document\.querySelector\('#([^']+)'\)/g)].map((match) => `#${match[1]}`);
const uncoveredIds = [...new Set(queriedIds)].filter((selector) => !requiredSelectors.includes(selector));
assert.deepEqual(uncoveredIds, [], `ids resueltos por el modulo y ausentes de REQUIRED_SCRIPT_ELEMENTS: ${uncoveredIds.join(', ')}`);

// Los badges los pinta el hub. Estos checks existen para que, si alguien vuelve a
// escribirlos a mano, salte en vez de volver a haber dos fuentes de verdad para el
// mismo numero. Ya paso una vez: el numero de la Shop estaba escrito en tres sitios.
assert.doesNotMatch(manager, /scriptShopUpdateBadge\.textContent\s*=/);
assert.doesNotMatch(manager, /scriptsMenuBadge\.textContent\s*=/);
assert.doesNotMatch(manager, /hamburgerScriptBadge/);

console.log(`Multi-game userscript static smoke passed: scope, preload, injection, refresh, game labels and ${requiredSelectors.length} required script elements are wired.`);
