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

// El módulo tiene que cargarse en el navegador y antes de quien lo usa. Un módulo
// puro que nadie carga es un módulo que no existe, y el fallo es un TypeError al
// pintar la primera tarjeta, lejos de la causa.
{
  const orden = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const pos = orden.indexOf('script-shop-screenshots.js');
  assert.ok(pos > -1, 'script-shop-screenshots.js tiene que cargarse en index.html.');
  assert.ok(pos < orden.indexOf('userscripts.js'),
    `Y antes de userscripts.js, que es quien lo usa. Orden actual: ${orden.join(', ')}`);
}

// El limite del catalogo. Medido: con 200 scripts y 6 capturas con URL completa se
// llegaba al 96,7% de 512 KB, y al pasarse loadScriptShopCatalog lanza y deja la Shop
// entera en blanco para todos. Con 1 MB queda en el 48%.
assert.match(main, /const SCRIPT_SHOP_CATALOG_LIMIT = 1_000_000;/,
  'El limite del catalogo tiene que ser 1 MB. A 512 KB, 200 scripts con capturas no caben.');

// Las capturas viajan en el catalogo, y una captura mala NO tumba el catalogo.
// Es la excepcion deliberada a la regla de downloadUrl, y sin prueba se convierte en
// norma por accidente.
assert.match(main, /screenshots:/, 'El catalogo normalizado tiene que llevar screenshots.');
assert.match(main, /esCapturaDeShop\(/, 'La validacion de capturas tiene que pasar por el modulo.');

// La segunda cache. La de sprites aguanta 48 porque un sprite pesa 20 KB; una captura no,
// y en base64 crece un 33%: 48 capturas de 2 MB serian 128 MB.
assert.match(main, /const CAPTURAS_CACHE_LIMIT = 24;/,
  'Las capturas necesitan su propia cache y su propio tope.');
assert.match(main, /const shopScreenshotCache = new Map\(\);/, 'Y su propio almacen.');
assert.match(main, /isShopScreenshot \? shopScreenshotCache : remoteImageCache/,
  'Una captura va a su cache y un sprite a la suya.');

{
  const cuerpo = main.slice(main.indexOf('async function loadAllowedImageDataUrl'), main.indexOf('async function resolvePokeApiSpecies'));
  assert.match(cuerpo, /!isShopScreenshot/, 'El cargador tiene que aceptar capturas: sin esto, una captura pasa la lista y el cargador la rechaza.');
  assert.match(cuerpo, /isShopScreenshot \? shopScreenshotCache : remoteImageCache/, 'Y cada clase de imagen va a su cache.');
}

// La limpieza de memoria tiene que liberar también la caché de capturas. Contarla sin
// limpiarla haría que cachedEntries y releasedMb dijeran una cosa y la memoria otra.
{
  const cuerpo = main.slice(main.indexOf("ipcMain.handle('app:cleanup-memory'"), main.indexOf("ipcMain.handle('app:proxy-results'"));
  assert.match(cuerpo, /remoteImageCache\.clear\(\)/, 'La limpieza libera la caché de sprites.');
  assert.match(cuerpo, /pokeApiSpeciesCache\.clear\(\)/, 'La limpieza libera la caché de especies.');
  assert.match(cuerpo, /shopScreenshotCache\.clear\(\)/, 'La limpieza tiene que liberar también la caché de capturas.');
}

// El mensaje del límite del catálogo tiene que decir 1 MB, que es el límite real. Un
// mensaje que miente es peor que uno feo: quien lea «supera 512 KB» busca un error que
// no existe.
assert.match(main, /El catálogo está vacío o supera 1 MB\./,
  'El mensaje del límite tiene que decir 1 MB, no 512 KB.');
assert.doesNotMatch(main, /supera 512 KB/,
  'El mensaje del límite ya no puede decir 512 KB.');

// La descarga es perezosa y esto es lo que lo protege. Con 200 scripts y 6 capturas son
// 1200 imagenes posibles; descargarlas al pintar dispararia 1200 peticiones al abrir la
// Shop. El harness tiene un script sin capturas, asi que aqui no se observa ninguna
// peticion: se comprueba que la llamada NO esta en el render.
//
// El recorte va de "function renderScriptShop(" hasta "function renderScriptShopCategories("
// y las funciones nuevas van DESPUES de esa segunda. Si el ayudante se metiera entre las
// dos, la asercion leeria su propio codigo como si fuera el del render y pasaria sin
// comprobar nada, que es el peor fallo posible de una comprobacion de este tipo.
//
// OJO: en ESTE fichero el buffer de src/userscripts.js se llama `renderer` (linea 8), no
// `manager`. En el otro fichero de pruebas, si. Usar el nombre equivocado aqui revienta
// con ReferenceError antes de comprobar nada, y un ReferenceError en una prueba nueva se
// lee como un fallo de la prueba, no como un fallo del codigo.
{
  const desde = renderer.indexOf('function renderScriptShop(');
  const hasta = renderer.indexOf('function renderScriptShopCategories(');
  const cuerpo = renderer.slice(desde, hasta);
  assert.ok(desde > -1 && hasta > desde, 'No se ha encontrado el cuerpo de renderScriptShop.');
  assert.doesNotMatch(cuerpo, /loadImageDataUrl/,
    'renderScriptShop no puede descargar imagenes: se descarga al abrir los detalles.');
  assert.match(renderer, /addEventListener\('toggle'/, 'La descarga tiene que ir en el toggle de los detalles.');
  assert.match(renderer, /planCapturas\(item\)/, 'La galeria se decide con el modulo puro.');
  // Y que el ayudante este despues de donde acaba el recorte, no dentro.
  assert.ok(renderer.indexOf('function cargarCapturasDeShop') > hasta,
    'cargarCapturasDeShop va despues de renderScriptShopCategories, o la comprobacion de arriba leeria su codigo.');
  // El hueco de una captura que falla: una captura que responde 404, o no es imagen, o
  // pesa mas de 2 MB. El comportamiento no se puede observar con el harness, asi que al
  // menos se fija que el camino de error existe y pinta el hueco.
  //
  // Y con el nombre de la clase, no con una subcadena: src/userscripts.js ya usa
  // `is-error` para el estado de los scripts (lineas 417, 1598...) con className, no con
  // classList.add. Buscar `is-error` a secas encontraria esos y pasaria aunque el camino
  // de error de la captura no existiera.
  assert.match(renderer, /classList\.add\('is-error'\)/, 'Una captura que no se puede cargar tiene que pintar un hueco.');
  // Abrir y cerrar los detalles cinco veces no puede ser cinco descargas. Sin esta guarda
  // el catalogo se veria igual de bien, asi que es la unica asercion que la caze: es un
  // problema de trafico, no de resultado.
  assert.match(renderer, /dataset\.cargado === '1'/, 'No se puede volver a descargar lo ya descargado.');
  // Y el otro lado de la tarea: que la miniatura abra el visor. Las tres comprobaciones
  // de arriba protegen el TRAFICO, que es invisible si falla; esto protege el resultado,
  // que es justo lo que se nota a ojo. Borrar el visor entero —sus dos funciones, el
  // click de la miniatura y la rama de Escape— dejaba todas las pruebas en verde.
  assert.match(renderer, /=> abrirVisorDeCaptura\(dataUrl, nombre\)/,
    'Pulsar una miniatura tiene que abrir el visor con esa captura.');
  assert.match(renderer, /removeAttribute\('src'\)/,
    'Al cerrar el visor hay que soltar el data: URL: seis capturas abiertas son varios MB de base64 en un atributo que ya no se mira.');
  // Escape cierra el VISOR primero, porque el visor esta encima del modal. El orden se
  // comprueba por posicion, no por un match: el mismo if aparece en las dos ramas.
  const ramaVisor = renderer.indexOf('cerrarVisorDeCaptura(); return;');
  const ramaModal = renderer.indexOf("!backdrop.hidden");
  assert.ok(ramaVisor > -1 && ramaModal > ramaVisor,
    'Escape tiene que cerrar el visor antes que el Centro de scripts, que estan los dos abiertos.');
  // Y la galeria va AL PRINCIPIO de los detalles: quien los abre quiere ver la captura,
  // no leer texto antes de verla. Un appendChild lapondria al final y pasaria igual.
  assert.match(renderer, /detalles\.prepend\(galeria\)/,
    'La galeria va al principio de los detalles, no al final.');
}

console.log('Script Shop smoke passed: online catalog, signed installs, updates, removal, tabs and mobile layout are present.');
