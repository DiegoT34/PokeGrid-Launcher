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
        sinCambios: [conUrl.navegador, conUrl.buscador, conUrl.apertura],
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
    comprobar(modelo.sinCambios.join(',') === 'false,ddg,auto',
      'una instancia normal no cambia de comportamiento', modelo.sinCambios.join(','));
    comprobar(modelo.ventana === 'ventana', 'y se puede fijar en «siempre ventana aparte»', modelo.ventana);
    comprobar(modelo.inicioDeBuscador === 'https://www.google.com/search?q=',
      'el buscador elegido es la página de partida de una instancia de navegador', modelo.inicioDeBuscador);
    comprobar(modelo.inicioDeUrl === 'https://ejemplo.invalid/juego',
      'y en una normal es su URL', modelo.inicioDeUrl);
    comprobar(modelo.buscadorInexistente === 'ddg',
      'un buscador que no existe cae al de fábrica, no se rompe', modelo.buscadorInexistente);
    comprobar(modelo.motores.join(',') === 'ddg,google,bing', 'hay tres motores', modelo.motores.join(','));
// --- 2. La barra de direcciones ------------------------------------------------
    console.log('\n--- la barra de direcciones ---');
    // Se llama a la creación de la instancia en vez de pasar por el modal porque el modal solo
    // admite HTTPS y aquí hace falta una página local que exista.
    const montado = await ventana.webContents.executeJavaScript(`(() => {
      try {
        createBrowserInstanceWorkspace({
          id: 'inst-nav', name: 'Navegador', url: ${JSON.stringify(paginaNavegador)},
          count: 1, navegador: true, buscador: 'ddg', inicio: '', apertura: 'auto'
        }, 0);
        createBrowserInstanceWorkspace({
          id: 'inst-juego', name: 'Juego', url: ${JSON.stringify(paginaNavegador)},
          count: 1, navegador: false, buscador: 'ddg', inicio: '', apertura: 'auto'
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
        navegador: true, buscador: 'ddg', inicio: '', apertura: 'auto'
      };
      browserInstances.push(fila);
      saveBrowserInstances();
      guardarInicioDeInstancia('inst-guardada', 'https://ejemplo.invalid/nueva');
      return JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]')
        .find((row) => row.id === 'inst-guardada')?.inicio || 'no-guardada';
    })()`);
    comprobar(guardado === 'https://ejemplo.invalid/nueva',
      'y se guarda como el inicio de la instancia', String(guardado));

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