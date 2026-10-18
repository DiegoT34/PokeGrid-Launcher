// La instancia como navegador.
//
// POR QUÉ EXISTE
//
// Una instancia, hasta ahora, es «una copia del mismo juego con cookies propias»: la URL se fija al
// crearla y no hay forma de ir a otro sitio sin borrar la instancia y empezar otra. Y cuando una
// página pide una pestaña nueva, el enlace se sale del launcher.
//
// Aquí se prueba el modelo —buscador de partida, modo de apertura— y después la barra y el reparto.
// Cada comprobación es de algo que se ve desde fuera: lo que se guarda, lo que se pinta y lo que
// ocurre cuando una página de verdad pide una pestaña.
//
// La página de prueba es un fichero local porque las instancias solo admiten HTTPS y esta prueba no
// necesita Internet. El enlace que pide pestaña es un `<a target="_blank">` de verdad, no una llamada
// a la función del launcher.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-navegador-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

// El launcher de verdad: el reparto de aperturas pasa por el proceso principal y por la pregunta que
// le hace al renderer, así que probar con una ventana montada a mano no tocaría el código que importa.
require('../src/main.js');
const { app, BrowserWindow, webContents } = electronApi;

const paginaNavegador = pathToFileURL(
  path.join(__dirname, 'fixtures', 'navegador-prueba.html')
).href;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// Los paneles se crean con un retardo a proposito, para que no arranquen todos a la vez. Antes de
// poder hablar con uno hay que esperar a que este listo: `getWebContentsId()` vale a partir del
// `dom-ready`, y llamar antes a un webview sin preparar lanza.
//
// La ventana se recibe como parametro y no se coge de fuera: esta funcion vive fuera del bloque donde
// se declara la ventana, y leerla de ahi era un ReferenceError.
const esperarPanelListo = async (ventana, instanceId, indice = 0) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 30_000) {
    const listo = await ventana.webContents.executeJavaScript(
      `(() => { try {
        const panel = browserInstanceViews.get(${JSON.stringify(instanceId)}).panels[${indice}];
        return Boolean(panel && panel.webview.getWebContentsId() > 0);
      } catch { return false; } })()`
    ).catch(() => false);
    if (!listo) { await dormir(250); continue; }
    // Montado no es lo mismo que cargado: el `dom-ready` salta también cuando la carga ha fallado,
    // y preguntar a una página que no está ahí lanza un error que no dice de dónde viene. Se comprueba
    // que la página de verdad esté puesta, buscando algo que tiene.
    const cargada = await ventana.webContents.executeJavaScript(
      `browserInstanceViews.get(${JSON.stringify(instanceId)}).panels[${indice}].webview`
      + '.executeJavaScript("Boolean(document.querySelector(\'#pestana\'))")'
    ).catch(() => false);
    if (cargada === true) return true;
    await dormir(250);
  }
  return false;
};

app.whenReady().then(async () => {
  let ventana = null;
  try {
    const t0 = Date.now();
    while (!ventana && Date.now() - t0 < 25_000) {
      ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
      await dormir(150);
    }
    const t1 = Date.now();
    while (Date.now() - t1 < 25_000) {
      const listo = await ventana.webContents.executeJavaScript(
        'Boolean(document.querySelector("#browserInstanceUrl") && window.__arranqueVista === "ok")');
      if (listo) break;
      await dormir(200);
    }

    // --- 1. El modelo ---------------------------------------------------------------
    console.log('--- el modelo de la instancia ---');
    const modelo = await ventana.webContents.executeJavaScript(`(() => {
      const conBuscador = normalizeBrowserInstance({
        id: 'prueba-a', name: 'A', url: 'https://ejemplo.invalid/', count: 2,
        navegador: true, buscador: 'google', apertura: 'panel'
      });
      const conUrl = normalizeBrowserInstance({
        id: 'prueba-b', name: 'B', url: 'https://ejemplo.invalid/juego', count: 1
      });
      const conVentana = normalizeBrowserInstance({
        id: 'prueba-c', name: 'C', url: 'https://ejemplo.invalid/', count: 1, apertura: 'ventana'
      });
      const buscadorInexistente = normalizeBrowserInstance({
        id: 'prueba-d', name: 'D', url: 'https://ejemplo.invalid/', count: 1,
        navegador: true, buscador: 'yahoo'
      });
      return {
        buscador: conBuscador.buscador,
        apertura: conBuscador.apertura,
        inicioVacio: conBuscador.inicio === '',
        sinCambios: [conUrl.modo, conUrl.buscador, conUrl.apertura],
        ventana: conVentana.apertura,
        inicioDeBuscador: inicioDeInstancia(conBuscador),
        inicioDeUrl: inicioDeInstancia(conUrl),
        buscadorInexistente: buscadorInexistente.buscador,
        motores: Object.keys(BUSCADORES)
      };
    })()`);
    comprobar(modelo.buscador === 'google' && modelo.apertura === 'panel',
      'una instancia de navegador guarda su buscador y su modo de apertura', JSON.stringify(modelo));
    comprobar(modelo.inicioVacio === true,
      'y arranca en el buscador, así que no necesita dirección de inicio', String(modelo.inicioVacio));
    // `ddg` en las dos siguientes era el motor de fábrica cuando era DuckDuckGo. Ahora es Google, que es
    // lo que se pidio, asi que una instancia recien creada nace en Google y no en DuckDuckGo.
    comprobar(modelo.sinCambios.join(',') === 'instancia,google,auto',
      'una instancia normal no cambia de comportamiento', modelo.sinCambios.join(','));
    comprobar(modelo.ventana === 'ventana', 'y se puede fijar en «siempre ventana aparte»', modelo.ventana);
    comprobar(modelo.inicioDeBuscador === 'https://www.google.com/search?q=',
      'el buscador elegido es la página de partida de una instancia de navegador', modelo.inicioDeBuscador);
    comprobar(modelo.inicioDeUrl === 'https://ejemplo.invalid/juego',
      'y en una normal es su URL', modelo.inicioDeUrl);
    comprobar(modelo.buscadorInexistente === 'google',
      'un buscador que no existe cae al de fábrica, no se rompe', modelo.buscadorInexistente);
    comprobar(modelo.motores.join(',') === 'ddg,google,bing', 'hay tres motores', modelo.motores.join(','));
// --- 2. La barra de direcciones ------------------------------------------------
    console.log('\n--- la barra de direcciones ---');
    // Se llama a la creación de la instancia en vez de pasar por el modal porque el modal solo
    // admite HTTPS y aquí hace falta una página local que exista.
    //
    // `inst-nav` lleva la página local como inicio guardado. Una instancia de navegador arranca en el
    // buscador —eso se comprueba aparte, en `inst-buscador`—, y de esta prueba necesita una página de
    // verdad a la que poder pedirle que abra enlaces. Las dos cosas a la vez.
    // OJO: estas instancias se montan con objetos CRUDOS, no con `normalizeBrowserInstance`, que es lo que
// hace la app de verdad al leerlas de `localStorage`. Por eso van con `modo` y no con el booleano
// `navegador` que tenían antes: el campo viejo solo lo traduce `normalizarOpcionesDeInstancia`, y aquí
// no pasa por ahi. La traducción de lo viejo se prueba en `instancia-modos-smoke.js`.
    const montado = await ventana.webContents.executeJavaScript(`(() => {
      try {
        createBrowserInstanceWorkspace({
          id: 'inst-nav', name: 'Navegador', url: ${JSON.stringify(paginaNavegador)},
          count: 1, modo: 'navegador', buscador: 'ddg',
          inicio: ${JSON.stringify(paginaNavegador)}, apertura: 'auto'
        }, 0);
        createBrowserInstanceWorkspace({
          id: 'inst-buscador', name: 'Buscador', url: ${JSON.stringify(paginaNavegador)},
          count: 1, modo: 'navegador', buscador: 'google', inicio: '', apertura: 'auto'
        }, 2);
        createBrowserInstanceWorkspace({
          id: 'inst-juego', name: 'Juego', url: ${JSON.stringify(paginaNavegador)},
          count: 1, modo: 'instancia', buscador: 'ddg', inicio: '', apertura: 'auto'
        }, 1);
        return { ok: true, error: '' };
      } catch (error) {
        return { ok: false, error: String(error && error.stack || error) };
      }
    })()`);
    comprobar(montado.ok, 'las dos instancias de prueba se montan', montado.error || '');

    const destinos = await ventana.webContents.executeJavaScript(`({
      web: resolverDestino('https://ejemplo.invalid/x', BUSCADORES.ddg),
      sinProtocolo: resolverDestino('poke.co', BUSCADORES.ddg),
      conDominio: resolverDestino('hola.com.mx', BUSCADORES.ddg),
      texto: resolverDestino('pokemon moves', BUSCADORES.ddg),
      vacio: resolverDestino('   ', BUSCADORES.ddg),
      conEspacios: resolverDestino('poke survivor game', BUSCADORES.ddg),
      conPuerto: resolverDestino('localhost:3000', BUSCADORES.ddg)
    })`);
    comprobar(destinos.web === 'https://ejemplo.invalid/x',
      'una dirección se respeta tal cual', destinos.web);
    comprobar(destinos.sinProtocolo === 'https://poke.co',
      'un dominio sin protocolo va con https delante', destinos.sinProtocolo);
    comprobar(destinos.conDominio === 'https://hola.com.mx',
      'y con dominio completo también', destinos.conDominio);
    comprobar(destinos.texto === 'https://duckduckgo.com/?q=pokemon+moves',
      'un texto se busca en el buscador, con el signo de más y no el %20', destinos.texto);
    comprobar(destinos.vacio === '', 'nada escrito no lleva a ninguna parte', JSON.stringify(destinos.vacio));
    comprobar(/q=/.test(destinos.conEspacios) && !/poke%20survivor/.test(destinos.conEspacios),
      'varias palabras son una búsqueda, no una dirección', destinos.conEspacios);
    comprobar(/q=/.test(destinos.conPuerto),
      'algo con dos puntos y sin espacios es una búsqueda, no una dirección', destinos.conPuerto);

    const barras = await ventana.webContents.executeJavaScript(`(() => {
      const delNavegador = browserInstanceViews.get('inst-nav').panels[0];
      const delJuego = browserInstanceViews.get('inst-juego').panels[0];
      return {
        barraEnNavegador: Boolean(delNavegador.barra),
        barraEnJuego: Boolean(delJuego.barra),
        hayAtras: Boolean(delNavegador.botonAtras),
        hayAdelante: Boolean(delNavegador.botonAdelante),
        hayRecargar: Boolean(delNavegador.barra.querySelector('.navegacion-recargar')),
        hayCampo: Boolean(delNavegador.campoDireccion),
        atrasGris: delNavegador.botonAtras.disabled,
        adelanteGris: delNavegador.botonAdelante.disabled,
        laBarraEstaEnLaFranja: delNavegador.barra.parentElement.classList.contains('browser-instance-panelbar')
      };
    })()`);
    comprobar(barras.barraEnNavegador && barras.hayAtras && barras.hayAdelante && barras.hayRecargar && barras.hayCampo,
      'la instancia de navegador tiene la barra completa', JSON.stringify(barras));
    comprobar(barras.barraEnJuego === false,
      'la de juego NO tiene barra: los juegos siguen con su nombre y su estado', JSON.stringify(barras));
    comprobar(barras.laBarraEstaEnLaFranja,
      'y la barra va en la franja del panel, donde se ha pedido', String(barras.laBarraEstaEnLaFranja));
    comprobar(barras.atrasGris && barras.adelanteGris,
      'atrás y adelante están grises sin historial', JSON.stringify(barras));

    // Lo que escribes se queda apuntado, aunque la página no cargue: si no, habría que escribirlo
    // otra vez para corregirlo, que es justo lo que hace un navegador.
    const trasFallo = await ventana.webContents.executeJavaScript(`(() => {
      const panel = browserInstanceViews.get('inst-nav').panels[0];
      panel.campoDireccion.value = 'https://ejemplo.invalid/no-existe';
      panel.campoDireccion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return panel.destinoActual;
    })()`);
    comprobar(trasFallo === 'https://ejemplo.invalid/no-existe',
      'lo que escribes es lo que queda apuntado, aunque la página no cargue', trasFallo);

    // Y se guarda como el inicio de la instancia. Se prueba con una instancia de verdad, en la lista
    // de verdad: una que solo existe en el mapa de vistas no se guarda, y no debe.
    const guardado = await ventana.webContents.executeJavaScript(`(() => {
      const fila = {
        id: 'inst-guardada', name: 'Guardada', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'navegador', buscador: 'ddg', inicio: '', apertura: 'auto'
      };
      browserInstances.push(fila);
      saveBrowserInstances();
      guardarInicioDeInstancia('inst-guardada', 'https://ejemplo.invalid/nueva');
      return JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]')
        .find((row) => row.id === 'inst-guardada')?.inicio || 'no-guardada';
    })()`);
    comprobar(guardado === 'https://ejemplo.invalid/nueva',
      'y se guarda como el inicio de la instancia', String(guardado));

// --- 3. Los enlaces -----------------------------------------------------------------
    console.log('\n--- los enlaces ---');
    // La página de prueba pide las tres cosas que se pueden pedir: una pestaña nueva, una ventana
    // con medidas propias —inicio de sesión— y un destino que no es web. Las tres tienen que seguir
    // distinto: la primera abre un panel en la instancia, la segunda una ventana aparte, la tercera
    // el sistema. Antes de esto las tres acababan en el mismo sitio, que es justo lo que cambia.
    const idPanel = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels[0].webview.getWebContentsId()'
    );
    comprobar(await esperarPanelListo(ventana, 'inst-nav'),
      'el panel de la instancia de navegador está listo para hablar con él');
    comprobar(await esperarPanelListo(ventana, 'inst-juego'),
      'y el de la de juego también');

    await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels[0].webview.executeJavaScript("document.querySelector(\'#pestana\').click(); true")'
    );
    await dormir(1800);

    const reparto = await ventana.webContents.executeJavaScript(`(() => {
      const view = browserInstanceViews.get('inst-nav');
      return { paneles: view.panels.length, origenes: view.panels.map((p) => p.origen || 'sin-origen') };
    })()`);
    comprobar(reparto.paneles === 2, 'un enlace a pestaña nueva abre un panel en la instancia',
      `paneles: ${reparto.paneles}`);
    comprobar(reparto.origenes.includes('enlace'),
      'y ese panel es de enlace, no original', reparto.origenes.join(','));

    // Lo que de verdad importa: el panel nuevo hereda la sesion del panel del que salio el enlace. Sin
// eso, abrirlo aqui no serviria de nada —habria que volver a iniciar sesion en cada pagina—.
const idsDePaneles = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels.map((p) => p.webview.getWebContentsId())'
    );
    const sesiones = idsDePaneles.map((id) => webContents.fromId(id)).filter(Boolean);
    const mismaSesion = sesiones.length === 2 && sesiones.every((c) => c.session === sesiones[0].session);
    comprobar(mismaSesion, 'y hereda la sesión del panel del que salió el enlace, que es lo que lo hace útil',
      `${sesiones.length} paneles, misma sesión: ${mismaSesion}`);

    // El panel de enlace carga la URL del enlace, no la de la instancia: si cargara las dos, la
    // primera se quedaría parpadeando delante de la segunda.
    const destinoDelEnlace = await ventana.webContents.executeJavaScript(`(() => {
      const panel = browserInstanceViews.get('inst-nav').panels.find((p) => p.origen === 'enlace');
      return panel ? panel.startUrl : 'no-hay-panel';
    })()`);
    comprobar(destinoDelEnlace === 'https://ejemplo.invalid/pestana',
      'y carga la dirección del enlace, no la de la instancia', destinoDelEnlace);

    // La barra es solo del modo navegador, pero el REPARTO no: un enlace de una instancia de juego
    // también abre un panel, porque el reparto no depende de la barra.
    const desdeJuego = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-juego").panels.length'
    );
    await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-juego").panels[0].webview.executeJavaScript("document.querySelector(\'#pestana\').click(); true")'
    );
    await dormir(1800);
    const despuesJuego = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-juego").panels.length'
    );
    comprobar(despuesJuego === desdeJuego + 1,
      'un enlace desde una instancia de juego también abre un panel allí',
      `antes: ${desdeJuego}, despues: ${despuesJuego}`);

    // Un destino que no es web no puede abrirlo una webview: eso va al sistema, como hasta ahora.
    const conCorreo = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels.length'
    );
    await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels[0].webview.executeJavaScript("document.querySelector(\'#correo\').click(); true")'
    );
    await dormir(1800);
    const despuesCorreo = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels.length'
    );
    comprobar(despuesCorreo === conCorreo,
      'un destino que no es web no abre panel: se va al sistema',
      `antes: ${conCorreo}, despues: ${despuesCorreo}`);

    // Y lo que el usuario corrigió: una ventana de inicio de sesión NO debe abrir un panel, tiene que
// seguir saliendo aparte. Aquí se comprueba la DECISIÓN, no la ventana: Chromium bloquea las
// ventanas emergentes desde una página `file://`, que es la que usa esta prueba, así que la ventana
// no llega a crearse aunque el manejador la autorice. Que la ventana se abra de verdad lo comprueba
// `ventanas-emergentes-smoke.js`, con direcciones https de verdad.
const antesDeLogin = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels.length'
    );
    for (let vuelta = 0; vuelta < 3; vuelta += 1) {
      await ventana.webContents.executeJavaScript(
        'browserInstanceViews.get("inst-nav").panels[0].webview.executeJavaScript("document.querySelector(\'#login\').click(); true")'
      );
      await dormir(700);
    }
    const despuesDeLogin = await ventana.webContents.executeJavaScript(
      'browserInstanceViews.get("inst-nav").panels.length'
    );
    comprobar(despuesDeLogin === antesDeLogin,
      'una ventana con medidas propias NO abre panel: sale aparte, como hasta ahora',
      `antes: ${antesDeLogin}, despues: ${despuesDeLogin}`);

// --- 4. El tope de paneles --------------------------------------------------------
    console.log('\n--- el tope de doce paneles ---');
    // Se llena UNA instancia hasta el tope y se pasa de ahí. Con dos se abrirían veinticuatro
    // webviews de golpe y la prueba se comeria la memoria del equipo sin ganar nada: lo que importa
    // es la cuenta y el reciclado, no tener muchas pantallas.
    const reciclado = await ventana.webContents.executeJavaScript(`(() => {
      const view = browserInstanceViews.get('inst-nav');
      const url = 'https://ejemplo.invalid/repetida';
      const origen = view.panels[0];
      // Se llena de paneles de enlace hasta el tope.
      while (view.panels.length < TOPE_PANELES_INSTANCIA) {
        crearPanelDeEnlace(view.instance, url, view.panels[0]);
      }
      const lleno = view.panels.length;
      const primerEnlace = view.panels.find((panel) => panel.origen === 'enlace');
      // Y se pasa: tienen que reciclarse, no crecer.
      crearPanelDeEnlace(view.instance, url, view.panels[0]);
      crearPanelDeEnlace(view.instance, url, view.panels[0]);
      return {
        tope: TOPE_PANELES_INSTANCIA,
        lleno,
        despues: view.panels.length,
        originales: view.panels.filter((panel) => panel.origen !== 'enlace').length,
        elOriginalSigue: view.panels.includes(origen),
        elViejoSeRecicla: view.panels.includes(primerEnlace) && primerEnlace.lastUrl === url,
        viewCount: view.workspace.dataset.viewCount
      };
    })()`);
    comprobar(reciclado.tope === 12,
      'y el tope son doce', String(reciclado.tope));
    comprobar(reciclado.lleno === reciclado.tope,
      'la instancia llega al tope', String(reciclado.lleno));
    comprobar(reciclado.despues === reciclado.tope,
      'y al pasarse NO crece: se queda ahí', String(reciclado.despues));
    comprobar(reciclado.originales === 1 && reciclado.elOriginalSigue === true,
      'y el panel original nunca se recicla: es una cuenta del usuario',
      `originales: ${reciclado.originales}, sigue en la lista: ${reciclado.elOriginalSigue}`);
    comprobar(reciclado.elViejoSeRecicla,
      'al reciclar, el panel de enlace más viejo se reutiliza y va a la dirección nueva, en vez de duplicarlo',
      `sigue en la lista y apunta a: ${reciclado.viewCount}`);
    comprobar(reciclado.viewCount === String(reciclado.tope),
      'y el mosaico se redimensiona con la cuenta', reciclado.viewCount);

    // El borde del borde: los doce son originales y no hay nada que reciclar. No debe abrir, no debe
    // romper nada y debe decir por qué.
    const sinReciclable = await ventana.webContents.executeJavaScript(`(() => {
      const view = browserInstanceViews.get('inst-nav');
      const origenes = view.panels.map((panel) => panel.origen);
      view.panels.forEach((panel) => { panel.origen = 'inicial'; });
      window.__avisoInstancia = '';
      const url = 'https://ejemplo.invalid/una-mas';
      const resultado = crearPanelDeEnlace(view.instance, url, view.panels[0]);
      const salida = {
        paneles: view.panels.length,
        creo: Boolean(resultado),
        aviso: window.__avisoInstancia || ''
      };
      view.panels.forEach((panel, indice) => { panel.origen = origenes[indice]; });
      return salida;
    })()`);
    comprobar(sinReciclable.creo === false && sinReciclable.paneles === reciclado.tope,
      'si los doce son originales, no abre ni rompe nada',
      `paneles: ${sinReciclable.paneles}, creo: ${sinReciclable.creo}`);
    comprobar(Boolean(sinReciclable.aviso),
      'y avisa de por qué, que si no parece que el enlace se haya perdido', sinReciclable.aviso);

// --- 5. Lo que encontró la revisión de rama ---------------------------------------
    console.log('\n--- lo que encontró la revisión ---');
    // Estas cuatro comprobaciones no estaban: la revisión encontró que la entrega cumplía en el papel
    // y no en la realidad. Se añaden para que no puedan volver a cumplirse solo en el papel.
    const correcciones = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      // 1. Una instancia de navegador se podía crear... por debajo. Por el modal, no: sin enlace,
      // la validación lo tiraba y el formulario acababa diciendo que no se pudo crear. Y la función
      // titular de esta entrega era justo esa.
      const sinEnlace = normalizeBrowserInstance({
        id: 'sin-enlace', name: 'Sin enlace', url: '', count: 1, navegador: true, buscador: 'google'
      });
      // Y una normal sin enlace sigue sin poder crearse: eso no ha cambiado.
      const normalSinEnlace = normalizeBrowserInstance({
        id: 'normal-sin-enlace', name: 'Normal', url: '', count: 1
      });
      salida.creaSinEnlace = Boolean(sinEnlace);
      salida.urlPuesta = sinEnlace ? sinEnlace.url : '';
      salida.normalSigueSinPoder = normalSinEnlace === null;

      // 2. Una instancia de navegador arrancaba en la URL con la que se creó, no en el buscador.
      salida.arrancaEnElBuscador = browserInstanceViews.get('inst-buscador').panels[0].startUrl;
      // 3. Y la dirección escrita en la barra no se leía al arrancar, que es para lo que se guardaba.
      const conInicio = createBrowserInstanceWorkspace({
        id: 'inst-inicio', name: 'Con inicio', url: 'https://ejemplo.invalid/',
        count: 1, modo: 'navegador', buscador: 'ddg',
        inicio: 'https://ejemplo.invalid/guardado', apertura: 'auto'
      }, 3);
      salida.arrancaEnElInicioGuardado = conInicio.panels[0].startUrl;

      // 4. El aviso de «no caben más pantallas» solo existía en una variable que leía la prueba. Una
      // persona no veía nada, y el enlace se perdía en silencio.
      const panelAviso = browserInstanceViews.get('inst-nav').panels[0];
      avisarEnPanel(panelAviso, 'Aviso de prueba');
      salida.avisoEnElDom = Boolean(panelAviso.botonAviso && !panelAviso.botonAviso.hidden
        && panelAviso.botonAviso.textContent === 'Aviso de prueba');
      quitarAvisoDePanel(panelAviso);
      salida.avisoSeQuita = Boolean(panelAviso.botonAviso && panelAviso.botonAviso.hidden);
      return salida;
    })()`);
    comprobar(correcciones.creaSinEnlace && correcciones.urlPuesta === 'https://www.google.com/search?q=',
      'una instancia de navegador se crea sin enlace, que es lo que hace el modo buscador',
      `url: ${correcciones.urlPuesta}`);
    comprobar(correcciones.normalSigueSinPoder,
      'pero una instancia normal sigue sin poder crearse sin enlace', String(correcciones.normalSigueSinPoder));
    comprobar(correcciones.arrancaEnElBuscador === 'https://www.google.com/search?q=',
      'y arranca en el buscador, no en la URL con la que se creó', correcciones.arrancaEnElBuscador);
    comprobar(correcciones.arrancaEnElInicioGuardado === 'https://ejemplo.invalid/guardado',
      'y una instancia con inicio guardado arranca ahí, que es para lo que se guarda',
      correcciones.arrancaEnElInicioGuardado);
    comprobar(correcciones.avisoEnElDom,
      'el aviso se ve en la franja, no solo en una variable que lee la prueba');
    comprobar(correcciones.avisoSeQuita,
      'y se quita en cuanto el panel vuelve a navegar, para que no se quede pegado');

    // Y que el reparto de aperturas ya no pregunta nada: el manejador tiene que responder en el
    // momento, porque Electron trata una respuesta asíncrona como un `deny` y se quedan muertas
    // todas las ventanas emergentes. El modo se guarda antes, al crear cada pantalla.
    const sinPreguntas = await ventana.webContents.executeJavaScript(`(() => ({
      tienePregunta: typeof preguntarModoDeApertura !== 'undefined',
      mandaElModo: typeof window.pokeGrid.setInstanceApertura === 'function'
    }))()`);
    comprobar(sinPreguntas.tienePregunta === false,
      'el proceso principal ya no pregunta nada al abrir un enlace');
    comprobar(sinPreguntas.mandaElModo === true,
      'porque el modo se le manda al crear cada pantalla');

  } catch (e) {
    console.log(`\nFALLO: ${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e}`);
    fallos.push('excepción');
  } finally {
    for (let i = 0; i < 3; i++) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); break; } catch { /* Electron lo tiene abierto */ }
    }
  }

  console.log('');
  console.log(fallos.length === 0
    ? 'Instancia como navegador.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});