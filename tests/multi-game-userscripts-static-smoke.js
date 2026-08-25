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

console.log('Multi-game userscript static smoke passed: scope, preload, injection, refresh and game labels are wired.');
