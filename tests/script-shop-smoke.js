const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'userscripts.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');

assert.match(main, /PokeGrid-Script-Shop\/main\/catalog\.json/);
assert.match(main, /redirect: 'error'/);
assert.match(main, /const requestUrl = refresh \? `\$\{SCRIPT_SHOP_CATALOG_URL\}\?v=\$\{now\}`/);
assert.match(main, /response\.url !== requestUrl/);
assert.match(main, /no-cache, no-store, must-revalidate/);
assert.match(main, /userscripts:shop-catalog/);
assert.match(main, /userscripts:shop-install/);
assert.match(main, /userscripts:shop-uninstall/);
assert.match(main, /createHash\('sha256'\)/);
assert.match(main, /actualHash !== item\.sha256/);
assert.match(main, /assertScriptShopDownloadUrl\(response\.url \|\| target\)/);
assert.match(main, /La descarga no pertenece al repositorio oficial de la Shop/);
assert.match(main, /SCRIPT_SHOP_CATALOG_LIMIT = 512_000/);
assert.match(main, /replace\(\/\^\\uFEFF\//);
assert.match(main, /USER_SCRIPT_CODE_LIMIT/);
assert.match(main, /USER_SCRIPT_CODE_LIMIT = 10 \* 1024 \* 1024/);
assert.match(main, /USER_SCRIPT_REQUEST_BODY_LIMIT = 1_000_000/);
assert.match(renderer, /file\.size\) > 10 \* 1024 \* 1024/);
assert.doesNotMatch(main, /límite de 1 MB/);
assert.match(main, /existing\?\.accounts/);
assert.match(main, /existing\?\.enabled !== false/);
assert.match(main, /script\.namespace === item\.namespace && script\.name === publishedName/);
assert.match(main, /const declaredGames = cleanMetadataList/);
assert.match(main, /games,/);

assert.match(preload, /loadScriptShop/);
assert.match(preload, /installScriptShopItem/);
assert.match(preload, /uninstallScriptShopItem/);

assert.match(html, /id="installedScriptsTab"/);
assert.match(html, /id="scriptShopTab"/);
assert.match(html, /id="scriptShopGrid"/);
assert.match(renderer, /function renderScriptShop/);
assert.match(renderer, /function installFromScriptShop/);
assert.match(renderer, /function uninstallFromScriptShop/);
assert.match(renderer, /function switchScriptsView/);
assert.match(renderer, /item\.games/);
assert.match(renderer, /<span class="is-game">/);
assert.match(renderer, /fue retirado de la Shop/);
assert.match(renderer, /candidate\.id !== item\.id/);
assert.match(css, /\.script-shop-grid/);
assert.match(css, /@media \(max-width: 620px\)/);

console.log('Script Shop smoke passed: online catalog, signed installs, updates, removal, tabs and mobile layout are present.');
