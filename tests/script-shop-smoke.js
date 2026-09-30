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

// Aviso antes de sobrescribir un script editado localmente. El aviso va antes de
// marcar scriptShopBusyId, y cancelar devuelve sin llegar a installScriptShopItem,
// así que cancelar no toca lo guardado.
//
// Estas aserciones fijan el AVISO (que existe y dice la verdad), no la condición que
// lo dispara. La condición es una comparación de sha sobre el script instalado, y no
// se comprueba aquí a propósito: no es algo que este fichero pueda evaluar, y atarla
// al texto convertiría una línea muerta en contrato de test —el siguiente que
// intente limpiarla rompería una suite verde y concluiría que era necesaria. La
// comprobación de que el aviso NO aparece cuando el sha coincide es lo que le falta,
// y está diferida con su motivo en task-5-report.md.
assert.match(renderer, /Has editado «\$\{previous\.name\}» de la Shop/);
assert.match(renderer, /Actualizar a \$\{item\.version\} descarta tus cambios y no se puede deshacer/);
assert.match(renderer, /if \(!accepted\) return;/);
assert.ok(
  renderer.indexOf('if (!accepted) return;') < renderer.indexOf('window.pokeGrid.installScriptShopItem'),
  'Cancelar el aviso de sobrescritura debe abandonar antes de instalar.'
);
assert.match(css, /\.script-shop-grid/);
assert.match(css, /@media \(max-width: 620px\)/);

console.log('Script Shop smoke passed: online catalog, signed installs, updates, removal, tabs and mobile layout are present.');
