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
// La lista de campos por la que se busca ya no está en userscripts.js: vive en el módulo
// puro, que es donde se puede probar de verdad. Comprobarlo aquí apuntaba al código
// viejo y falló el día que la búsqueda se movió, que no es el día que se rompió nada.
const shopView = fs.readFileSync(path.join(root, 'src', 'script-shop-view.js'), 'utf8');
for (const campo of ['name', 'summary', 'description', 'category', 'author', 'tags', 'games']) {
  assert.match(shopView, new RegExp(`item && item\\.${campo}`) , `La búsqueda tiene que mirar item.${campo}.`);
}
assert.match(shopView, /coincideBusqueda/, 'La búsqueda tiene que estar en el módulo de la vista, no en línea.');
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

// El debounce de la búsqueda. Se comprueba estáticamente porque con el catálogo del
// harness, de un script, no hay forma de medir un retardo real: la sensación no se
// prueba. Lo que sí se prueba es que el input pase por el debounce, y si alguien
// revierte esto a una llamada directa, la puerta falla.
assert.match(renderer, /pokeGridShopView\.debounce\(renderScriptShop,\s*SCRIPT_SHOP_DEBOUNCE_MS\)/,
  'El render de la Shop tiene que ir envuelto en debounce.');
assert.match(renderer, /const SCRIPT_SHOP_DEBOUNCE_MS = 250;/,
  'El plazo del debounce son 250 ms: por debajo se nota el tirón al teclear y por encima la lista tarda en responder.');
assert.doesNotMatch(renderer, /scriptShopSearch\.addEventListener\('input',\s*renderScriptShop\s*\)/,
  'El input de la búsqueda no puede llamar al render directamente: eso es justo lo que rehace las tarjetas en cada tecla.');
assert.match(renderer, /renderScriptShopDebounced\.ahora\(\)/,
  'La tecla Enter tiene que saltarse la espera: quien pulsa Enter espera ya.');
assert.match(renderer, /renderScriptShopDebounced\.cancelar\(\)/,
  'Al cambiar de pestaña hay que cancelar la espera, o el render salta dentro de un panel ya oculto.');
assert.match(renderer, /buildShopView\(\{/,
  'La vista tiene que construirse con buildShopView, no a mano.');
assert.match(renderer, /buildShopView\(\{[^}]*view:\s*activeScriptsView/,
  'buildShopView tiene que recibir la vista activa.');
// Ver lo nuevo se marca al abrir Shop, y solo al abrir Shop. Si se marcara al abrir
// cualquier pestaña, el contador de Shop se vaciaría sin que el usuario hubiera pasado
// por Shop nunca. Es un `if` de una línea y se pierde en cualquier refactor.
assert.match(renderer, /if \(enShop\) markScriptShopCatalogSeen\(\);/,
  'Marcar lo visto tiene que estar condicionado a abrir Shop, no a abrir cualquier pestaña.');
// El desglose al registro: sin esto, la pestaña de Actualizaciones pinta el total.
assert.match(renderer, /set\('scripts',\s*counts\.total,\s*\{[^}]*newScripts[^}]*updates[^}]*\}\)/,
  'La fuente scripts se publica con el desglose: la pestaña Shop lleva los nuevos y la de Actualizaciones las actualizaciones.');

// El modulo tiene que cargarse en el navegador y antes de quien lo usa. Un modulo
// puro que nadie carga es un modulo que no existe, y el fallo es un TypeError al
// pintar la primera tarjeta, lejos de la causa.
{
  const orden = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const pos = orden.indexOf('script-shop-screenshots.js');
  assert.ok(pos > -1, 'script-shop-screenshots.js tiene que cargarse en index.html.');
  assert.ok(pos < orden.indexOf('userscripts.js'),
    `Y antes de userscripts.js, que es quien lo usa. Orden actual: ${orden.join(', ')}`);
}

console.log('Script Shop smoke passed: online catalog, signed installs, updates, removal, tabs and mobile layout are present.');
