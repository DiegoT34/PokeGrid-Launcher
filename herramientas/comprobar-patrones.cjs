// Comprueba los patrones nuevos de verificar-paquete.cjs contra el codigo de AHORA, sin esperar al
// paquete. Es lo mismo que hace el verificador, pero contra el arbol en vez de contra el asar: si un
// patron no casa aqui, no casara alli, y se descubre antes de compilar en vez de despues.
//
// Se hace en node y no en PowerShell porque ahi los argumentos de -match se pueden invertir y el
// fallo sale como un error de regex en vez de como un fallo de comprobacion.
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(raiz, 'src', 'renderer.js'), 'utf8');
const mainProceso = fs.readFileSync(path.join(raiz, 'src', 'main.js'), 'utf8');
const preload = fs.readFileSync(path.join(raiz, 'src', 'preload.js'), 'utf8');
// El almacen de perfiles se lee aqui tambien: desde la 0.38.0 guarda el avatar y el color, y las
// invariantes de abajo miran las dos cosas.
const perfiles = fs.readFileSync(path.join(raiz, 'src', 'perfiles-sesion.js'), 'utf8');
  const usuarios = fs.readFileSync(path.join(raiz, 'src', 'userscripts.js'), 'utf8');
  const html = fs.readFileSync(path.join(raiz, 'src', 'index.html'), 'utf8');

const styles = fs.readFileSync(path.join(raiz, 'src', 'styles.css'), 'utf8');

// El bloque de barras de desplazamiento se comproba contra el CSS SIN el rediseño de la 0.34.0.
// Those reglas se anadieron a proposito, asi que buscarlas en el fichero entero las encontraria
// siempre y la comprobacion no diria nada. Recortando el bloque, la comprobacion solo mira el CSS que
// existia antes, que es donde no deberia haber ninguna barra pintada a mano.
const estilosSinRediseño = styles.split('REDISENO DEL CENTRO')[0] || styles;

const QUE_SI = [
  // 0.32.0 — anadir y quitar pantallas, y Google por defecto
  ['el boton de anadir pantalla', /className = 'instance-mas-pantalla'/, renderer],
  ['el boton de quitar pantalla', /className = 'instance-menos-pantalla'/, renderer],
  ['anadir una pantalla es una accion con nombre', /function anadirPantallaAInstancia\(instanceId\)/, renderer],
  ['y quitarla tambien', /function cerrarPantallaDeInstancia\(instanceId, panel\)/, renderer],
  ['los tres botones se mandan desde el mismo sitio', /function refrescarBotonesDePantallas\(instanceId\)/, renderer],
  ['con una sola pantalla el de agrandar no se ve', /expandButton\.hidden = total < 2/, renderer],
  ['y el menos se apaga para no quedarse sin ninguna', /menosPantallaButton\.disabled = total <= 1/, renderer],
  ['al cerrar NO se renumeran las que quedan', /function indicesDePantallas\(instance\)/, renderer],
  ['y el numero de pantallas se guarda', /instance\.count = view\.panels\.length/, renderer],
  ['el motor de fabrica es Google', /const BUSCADOR_POR_DEFECTO = 'google';/, renderer],
  ['y DuckDuckGo no se ha quitado de la lista', /ddg: 'https:\/\/duckduckgo\.com/, renderer],
  ['los botones apagados se ven apagados', /\.instance-menos-pantalla:disabled\s*\{/, styles],

  ['la regla de duermete', /function aplicarDescanso\(\)/, renderer],
  ['que una pantalla duerme si no es la pestaña abierta', /function panelEstaEnPantalla\(panel\)/, renderer],
  ['el cierre que destruye el proceso de verdad', /panel\.webview\.destroy\(\)/, renderer],
  ['borrar la particion de una instancia quitada', /ipcMain\.handle\('instancia:borrar-particion'/, mainProceso],
  ['la cola de particiones para el siguiente arranque', /function vaciarPendientesDeParticiones\(\)/, mainProceso],
  ['que al minimizar se duerma todo', /mainWindow\.on\('minimize', dormirTodo\)/, mainProceso],
  ['el sondeo de capturas solo con la pantalla a la vista', /if \(!panelEstaEnPantalla\(panel\)\) return;/, renderer],
  ['el registro de capturas tambien', /panel\.captureLogOpen && panelEstaEnPantalla\(panel\)/, renderer],
  ['el analizador tambien', /panel\.huntOpen && panelEstaEnPantalla\(panel\)/, renderer],
  // Esta invariante es de la 0.31.0 y sigue siendo importante: el sondeo no debe leer cuentas que no se
    // estan mirando. Lo que cambio en la 0.36.0 es que se salta SOLO cuando el farmeo esta en uso, que es
    // cuando de verdad hace falta leer todas. Se comprueba la forma nueva, que es la que hay, y el
    // significado que se pierde al hacerlo —el camino barato— se comprueba aparte.
    ['el sondeo de farmeo tampoco', /accountIndex === null && !leerTodas && !panelEstaEnPantalla\(panel\)/, renderer],
    ['y el camino barato se decide antes del bucle', /if \(accountIndex === null && !leerTodas/, renderer],
  ['el archivo de capturas ya no se copia entero cada tic', /const indiceEstable = \(\) => \{/, renderer],
  ['el relleno del acceso tiene expiration', /__pokeGridSubmitWatcherVence/, renderer],
  ['el tope del archivo de iconos', /const ICONOS_EN_CACHE = \d+;/, mainProceso],
  ['el puente para dormir una pantalla', /duermirPanel:/, preload],

  // ---- 0.34.0: pestanas de cuenta, sin brillos y sin el boton de Telegram
    // 0.34.0 — pestanas de cuenta: se mueven y el orden se guarda
    ['el reordenado acepta las pestanas de cuenta', /esPestanaDeCuenta\(instanciaId\) && esPestanaDeCuenta\(destinoId\)/, renderer],
    ['y las mueve por su propia lista', /function moverCuenta\(instanciaId, destinoId\)/, renderer],
    ['el orden se guarda', /function guardarOrdenDeCuentas\(orden\)/, renderer],
    ['y se vuelve a leer al pintar', /function ordenDeCuentas\(\)/, renderer],
    ['el icono se pinta tambien en las de cuenta', /esPestanaDeCuenta\(instanceId\)/, renderer],
    ['el boton de agrandar se esconde en modo pestanas', /function refrescarBotonDeAgrandarDeCuentas\(\)/, renderer],
    ['y agrandar no hace nada ahi', /if \(vistaDeCuentasEsPestanas\(\)\) return;/, renderer],
    ['el logo se decide antes que el mapa de iconos', /PRIMARY_BROWSER_INSTANCE_ID \|\| esPestanaDeCuenta\(instanceId\)/, renderer],
    ['la marca de la pestaña activa sigue', /\.instance-tab-shell\.is-active \{[^}]*box-shadow/, styles],
    ['la franja del color del tipo sigue', /box-shadow: inset 4px 0 0 var\(--farm-type-color\)/, styles],

    // ---- 0.35.0: modal de nueva pestaña, arrastres, cuentas y barra
    ['en modo navegador se esconden los dos campos', /browserInstanceUrlField\.hidden = !conUrl/, renderer],
    ['y el nombre tambien se esconde', /browserInstanceNameField\.hidden = !conUrl/, renderer],
    ['el nombre vacio sale del dominio de la url', /const delDominio = \(\(\) => \{/, renderer],
    ['la marca de destino se pone al arrastrar', /shell\.classList\.add\('is-destino'\)/, renderer],
    ['y se quita al salir', /shell\.classList\.remove\('is-destino'\)/, renderer],
    ['los mas y menos van detras de los botones', /panelbar\.append\(identity, actions, masPantallaButton, menosPantallaButton\)/, renderer],
    ['el numero de la cuenta se escribe por posicion', /row\.dataset\.accountIndex = String\(index \+ 1\)/, renderer],

    // ---- 0.36.0: sesiones compartidas, farmeo en pestañas y los botones agrupados
    // ---- 0.37.0: perfiles de sesion. Sustituyen a las siete invariantes de la 0.36.0 que pedian el
    // interruptor de sesion: esas ya no se pueden cumplir, porque lo que hay ahora son perfiles.
    ['el perfil por defecto es el Principal', /const PERFIL_POR_DEFECTO = 'principal'/, renderer],
    ['la particion de un perfil', /function perfilParticion\(perfilId\)/, renderer],
    ['y lleva el prefijo que NO se borra al cerrar una ventana', /persist:pokegrid-perfil-\$\{id \|\| PERFIL_POR_DEFECTO\}/, renderer],
    ['y el borrado sigue filtrando solo por el prefijo de instancia', /\.filter\(\(particion\) => particion\.startsWith\('persist:pokegrid-instance-'\)\)/, renderer],
    ['la particion sale del perfil y no del id de la ventana', /function browserInstancePartition\(instanceId, index, opciones = \{\}\) \{\s*return perfilParticion\(opciones && opciones\.perfilId\);/, renderer],
    ['y se pasa al crear la pantalla', /browserInstancePartition\(instance\.id, index, instance\)/, renderer],
    ['el perfil se rellena al leer la ventana, por el almacen', /window\.pokeGridPerfiles\?\.resolver\(opciones\.perfilId\)/, renderer],
    ['el almacen de perfiles es un fichero propio', /<script src="perfiles-sesion\.js"><\/script>/, html],
    ['y va antes que el renderer, que lo usa al arrancar', /<script src="perfiles-sesion\.js"><\/script>\s*<script src="renderer\.js">/, html],
    ['cuantas ventanas usa un perfil se responde desde el renderer', /window\.pokeGridPerfiles\.conCuantasVentanas = /, renderer],
    ['el selector de perfil esta en el modal', /id="browserInstancePerfil"/, html],
    ['y su valor se guarda al crear la ventana', /perfilId: browserInstancePerfil\?\.value \|\| PERFIL_POR_DEFECTO/, renderer],
    ['los perfiles se pintan al abrir el modal', /pintarSelectorDePerfiles\(\);/, renderer],
    ['crear un perfil se hace con un campo en la pantalla, no con un prompt',
      /function crearPerfilDesdeElSelector\(\)/, renderer],

    // ---- el gestor de perfiles
    ['el gestor de perfiles tiene su modal', /id="perfilesBackdrop"/, html],
    ['el boton de abrir esta en la barra', /id="perfilesButton"/, html],
    ['y se pinta con las ventanas de cada perfil', /conCuantasVentanas\?\.\(perfil\.id\)/, renderer],
    ['un perfil con ventanas avisa antes de dejarte eliminarlo', /ese perfil tiene ventanas/i, renderer],
    ['el Principal sale con sus acciones apagadas', /nombre\.disabled = esPrincipal/, renderer],

    // ---- las particiones de perfil tienen que SER de ventana para el proceso principal
    //
    // Esto no es una comprobacion de estilo: sin esto, cambiar el nombre de la particion deja TODAS las
    // ventanas del navegador sin registrar en el proceso principal. No peta: sencillamente dejan de
    // tener permisos, sus enlaces se abren aparte y la rueda no hace zoom. Solo se nota al usarlo.
    // Las dos formas de particion se reconocen JUNTAS en todo lo que hace falta...
    ['el proceso principal distingue la particion de una ventana', /function esParticionDeVentana\(particion\)/, mainProceso],
    ['y acepta las dos formas, la vieja y la del perfil',
      /PREFIJO_PARTICION_VENTANA = 'persist:pokegrid-instance-';\s*\nconst PREFIJO_PARTICION_PERFIL = 'persist:pokegrid-perfil-';/, mainProceso],
    ['al enganchar la webview se usa la de ventana', /if \(!esParticionDeVentana\(partition\)\) return;/, mainProceso],
    ['y tambien al guardar el modo de apertura', /instancia:apertura-pantalla/, mainProceso],
    // ...pero al BORRAR solo vale la vieja: la de un perfil la comparten otras ventanas.
    ['y al borrar solo se admite la particion propia', /function esParticionPropiaDeVentana\(particion\)/, mainProceso],
    ['que es solo la forma antigua',
      /function esParticionPropiaDeVentana\(particion\) \{\s*\n\s*return String\(particion \|\| ''\)\.startsWith\(PREFIJO_PARTICION_VENTANA\);/, mainProceso],
    ['el borrado al cerrar usa la que es propia',
      /if \(!esParticionPropiaDeVentana\(limpia\)\)/, mainProceso],
    ['el modo de apertura se guarda por pantalla y no por sesion',
      /function modoDeAperturaDeParticion\(contents\) \{\s*\n\s*\/\/ Lo de la pantalla manda/, mainProceso],
    ['y el renderer lo manda cuando la pantalla ya tiene id',
      /setInstanceAperturaDePantalla\?\.\(id, instancia\.apertura/, renderer],
    ['con su puente', /setInstanceAperturaDePantalla: \(webContentsId, modo\)/, preload],
    ['el farmeo decide una vez por pasada si lee todas', /const leerTodas = farmeoEstaEnUso\(\);/, renderer],
    ['y se averigua por el selector o por una cuenta farmeando', /panel\.farmRunState === 'ok' \|\| panel\.farmRunState === 'busy'/, renderer],
    ['la guarda respeta ese decision', /!leerTodas && !panelEstaEnPantalla\(panel\)/, renderer],
    ['los botones van detras de la barra y el nombre toma el hueco', /identity\.style\.flex = '1 1 auto';[\s\S]{0,90}panelbar\.append\(identity, actions, masPantallaButton, menosPantallaButton\)/, renderer],
    ['y la barra ya no reparte el hueco entre todos', /\.browser-instance-panelbar \{[^}]*justify-content: flex-start/, styles],
    ['el icono de la lupa esta en la tabla', /search: '<circle cx="11"/, renderer],
    ['y se expone para el centro de scripts', /window\.launcherUiIcon = launcherUiIcon;/, renderer],

    // ---- 0.38.0: perfiles con avatar de Pokemon y color de fondo
    ['el perfil guarda avatar y color', /avatar: ''/, perfiles],
    ['la lista de Pokemon para avatares esta en el almacen de perfiles',
      /ESPECIES_DE_AVATAR = Object\.freeze\(\[/, perfiles],
    ['y se expone para el gestor', /especiesDeAvatar = \(\) => ESPECIES_DE_AVATAR\.slice\(\)/, perfiles],
    ['el boton de crear perfil se pinta siempre, al final', /function circuloDeCrear\(\)/, renderer],
    ['sin avatar se ensena la inicial, no un hueco', /es-inicial/, renderer],
    ['el color se guarda con el almacen, no pintando el DOM a mano',
      /pokeGridPerfiles\?\.ponerAvatar\(perfil\.id, perfil\.avatar, color\)/, renderer],
    ['y hay una opcion de SIN color, no solo colores',
      /const COLORES_DE_PERFIL = \[\s*''/, renderer],
    ['el sprite pasa por la funcion que ya valida el origen', /spriteDeEspecie\(especie\)/, renderer]
];

const QUE_NO = [
  ['el interruptor global que hacia correr TODO', /appendSwitch\('disable-renderer-backgrounding'\)/, mainProceso + renderer],
  ['la preferencia que prohibia atenuar', /backgroundThrottling: false/, mainProceso],
  ['la preferencia en las webviews', /setAttribute\('webpreferences', 'backgroundThrottling=no/, renderer],
  ['el nombre de la API que se llamaba al reves', /setPanelThrottling/, preload + renderer],

    // ---- 0.36.0: lo que tiene que haber desaparecido
    ['la particion compartida con el prefijo que se borra', /PARTICION_COMPARTIDA = 'persist:pokegrid-instance-compartida'/, renderer],
    ['el reparto del hueco entre los cuatro hijos de la barra', /justify-content: space-between;\s*gap: 8px;\s*border-bottom: 1px solid #2a3035/, styles],

    // ---- 0.35.0: lo que tiene que haber desaparecido
    ['el nombre obligatorio del modal', /browserInstanceName\.required/, usuarios + renderer],
    ['el nombre por defecto «Otro juego»', /'Otro juego'/, renderer],
    ['el desplegable de VPN / IP por cuenta', /<summary>VPN \/ IP distinta<\/summary>/, renderer],
    ['sus campos de proxy', /data-field="proxy\.protocol"/, renderer],
    ['el boton de la marca de destino en el codigo viejo', /panelbar\.append\(identity, masPantallaButton, menosPantallaButton, actions\)/, renderer],
    ['el logo de la esquina en el HTML', /<span class="brand-mark"/, html],

    // ---- 0.34.0: lo que tiene que haber desaparecido
    // Se busca la ETIQUETA del boton, no su id: el id sigue escrito en el comentario que explica que se
    // quito, y buscarlo por ahi daria un falso «sigue presente» para siempre. Lo que no puede seguir
    // es el `id=` pegado al boton, que es lo que lo hacia existir.
    ['el boton de instalar alertas de Telegram', /id="installTelegramAlertsButton"/, usuarios + html],
    ['la funcion que solo ese boton llamaba', /async function importBundledTelegramAlerts\(\)/, usuarios],
    ['su CSS', /\.button-telegram-install/, estilosSinRediseño],
    ['el simbolo de papel por defecto del catalogo', /icon \|\| '\u{1F4DC}'/, usuarios],
    ['el globo de texto de la pestaña', /globo\.textContent = '/, renderer],
    ['la lupa como texto en el HTML', /<span aria-hidden="true">&larr;\u2315<\/span>/, html]
];

let problemas = 0;

// LAS AUSENCIAS QUE NO ENTRAN EN `QUE_NO`.
//
// Van fuera a proposito. `QUE_NO` se recorre igual que `QUE_SI` —[texto, expresion regular, donde se
// busca]— y anadir una entrada de dos posiciones ahi revienta el bucle entero con
// «re.test is not a function», que no dice que entrada es. Pasa dos veces en este fichero. Con un
// bloque propio cada ausencia lleva su propio texto y no se puede confundir con las de las listas.
//
// Las dos que hay aqui son de la 0.38.0 y son LAS MAS IMPORTANTES DE LAS DOS: los sprites de Pokemon
// SIEMPRE por el proceso principal. La CSP del launcher no incluye `raw.githubusercontent.com`, que es
// de donde los sirve PokeAPI, asi que un `fetch` desde el renderer devolveria un sprite que no se
// pinta nunca. Y lo peor no es que falle: es que NO falla, porque una imagen que no carga no da ningun
// error. El perfil se quedaria con la inicial y no se sabria por que.
console.log('\nAusencias que tienen que estar:');
for (const [que, re, texto] of [
  ['ningun sprite de Pokemon se pide con fetch desde el renderer',
    /fetch\(\s*`?https:\/\/raw\.githubusercontent\.com\/PokeAPI/, renderer],
  ['ni se pone como src en el HTML, que es el mismo problema',
    /src="https:\/\/raw\.githubusercontent\.com\/PokeAPI/, html]
]) {
  const presente = re.test(texto);
  if (presente) problemas++;
  console.log(`  ${presente ? 'NO  ' : 'ok  ' } ${que}${presente ? '  — sigue presente' : ''}`);
}
console.log('Invariantes que tienen que estar:');
for (const [que, re, texto] of QUE_SI) {
  const ok = re.test(texto);
  if (!ok) problemas++;
  console.log(`  ${ok ? 'ok  ' : 'NO  '} ${que}`);
}
console.log('\nInvariantes que tienen que haber desaparecido:');
for (const [que, re, texto] of QUE_NO) {
  const presente = re.test(texto);
  if (presente) problemas++;
  console.log(`  ${presente ? 'NO  ' : 'ok  ' } ${que}${presente ? '  — sigue presente' : ''}`);
}

console.log(`\nproblemas: ${problemas}`);
process.exitCode = problemas ? 1 : 0;