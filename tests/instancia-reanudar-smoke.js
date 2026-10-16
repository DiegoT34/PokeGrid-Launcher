// Reanudar donde se quedó cada pantalla.
//
// POR QUÉ EXISTE
//
// Cookies, sesión y caché ya se guardan solas: cada pantalla tiene su partición persistente y por
// eso cada cuenta conserva su login. Esto es otra cosa, y no tiene nada que ver: es «en qué página
// se quedó». Al reabrir el launcher, cada pantalla volvía a la URL con la que se creó la
// instancia, y había que volver a buscar lo mismo a mano en cada una.
//
// LO QUE NO GUARDA
//
// Solo las pantallas originales. Una pantalla que se abrió por enlace se recicla —se reutiliza para
// otro enlace— y si guardara su dirección, la original perdería la suya al reiniciar. Eso lo
// comprueban dos cosas aquí: que una pantalla de enlace existe, y que la dirección de la original
// sigue intacta después de abrirla.
//
// LA DIRECCIÓN CADUCADA
//
// Si la página guardada ya no carga, la pantalla cae a la de su instancia y la dirección mala se
// olvida, para que no lo intente otra vez en cada arranque. Perder una pantalla por una dirección
// vieja sería peor que empezar de nuevo.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-reanudar-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');
const { app, BrowserWindow } = electronApi;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// Una URL que es válida pero que no va a cargar. Valida como dirección, así que SE GUARDA, y luego
// falla al cargar. Una cadena sin punto ni esquema no vale para esto: recordarUltimaPagina la
// rechaza con pareceDireccion y nunca llega a guardarse, así que probaría el rechazo y no la caída.
const URL_MUERTA = 'https://no-existe.example/pagina';

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
      // Solo se espera al arranque, no a las funciones: esas existen cuando el arranque ha
      // terminado, y esperarlas aparte son 25 segundos de espera para un fallo que ya se va a ver.
      const listo = await ventana.webContents.executeJavaScript(
        'window.__arranqueVista === "ok"'
      ).catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    console.log('--- cada pantalla vuelve a la suya ---');
    const reanudar = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      const una = {
        id: 're-una', name: 'Una', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
      };
      const dos = { ...una, id: 're-dos', name: 'Dos', count: 2 };
      createBrowserInstanceWorkspace(una, 0);
      createBrowserInstanceWorkspace(dos, 1);
      recordarUltimaPagina(una.id, 0, 'https://ejemplo.invalid/donde-estaba');
      recordarUltimaPagina(dos.id, 0, 'https://ejemplo.invalid/pantalla-cero');
      recordarUltimaPagina(dos.id, 1, 'https://ejemplo.invalid/pantalla-uno');

      // Y ahora se vuelve a crear desde cero, que es lo que pasa al reabrir el launcher. CON EL MISMO
      // id: la memoria es por id de instancia, y una instancia nueva con otro id es otra instancia y
      // no tiene nada que recordar.
      //
      // Derribar a mano y no con removeBrowserInstance, que aqui no sirve: pide window.confirm y sale
      // temprano si la instancia no esta en browserInstances. Un launcher recién abierto es
      // exactamente esto: el mapa de vistas vacio y sin mosaicos en el DOM.
      for (const id of ['re-una', 're-dos']) {
        browserInstanceViews.get(id)?.workspace.remove();
        browserInstanceViews.delete(id);
      }
      const deNuevo = createBrowserInstanceWorkspace({ ...una }, 2);
      const deNuevoDos = createBrowserInstanceWorkspace({ ...dos }, 3);
      salida.vuelve = deNuevo.panels[0].startUrl;
      salida.otraCero = deNuevoDos.panels[0].startUrl;
      salida.otraUno = deNuevoDos.panels[1].startUrl;

      // Una pantalla de enlace NO guarda su pagina: si lo hiciera, la original perderia la suya.
      const enlace = crearPanelDeEnlace(deNuevo.instance, 'https://ejemplo.invalid/enlace', deNuevo.panels[0]);
      salida.enlaceEsEnlace = enlace?.origen === 'enlace';
      salida.enlaceNoPisa = ultimaPaginaDe(una.id, 0);

      // Y una que no es una direccion no se guarda: se rechaza al guardar, que es el sitio correcto.
      recordarUltimaPagina(una.id, 0, 'no-es-una-direccion');
      salida.rechazaLoQueNoEsDireccion = ultimaPaginaDe(una.id, 0);

      // Una pagina guardada que no carga: se guarda igual, y la caida se decide al cargar.
      recordarUltimaPagina(una.id, 0, ${JSON.stringify(URL_MUERTA)});
      salida.guardaLaMuerta = ultimaPaginaDe(una.id, 0);
      olvidarUltimaPagina(una.id, 0);
      salida.olvidaLaMuerta = ultimaPaginaDe(una.id, 0);
      return salida;
    })()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al reanudar');
      return null;
    });

    if (reanudar) {
      comprobar(reanudar.vuelve === 'https://ejemplo.invalid/donde-estaba',
        'al reabrir, la pantalla vuelve a la página en la que se quedó', reanudar.vuelve);
      comprobar(reanudar.otraCero === 'https://ejemplo.invalid/pantalla-cero'
        && reanudar.otraUno === 'https://ejemplo.invalid/pantalla-uno',
        'y cada pantalla tiene la suya, sin pisarse entre sí',
        `${reanudar.otraCero} / ${reanudar.otraUno}`);
      comprobar(reanudar.enlaceEsEnlace && reanudar.enlaceNoPisa === 'https://ejemplo.invalid/donde-estaba',
        'una pantalla abierta por enlace no guarda su página, que si no la original pierde la suya',
        `${reanudar.enlaceEsEnlace} / ${reanudar.enlaceNoPisa}`);
      comprobar(reanudar.rechazaLoQueNoEsDireccion === 'https://ejemplo.invalid/donde-estaba',
        'y lo que no es una dirección ni se guarda ni pisa la que había',
        reanudar.rechazaLoQueNoEsDireccion);
      comprobar(reanudar.guardaLaMuerta === 'https://no-existe.example/pagina',
        'una página que no carga sí se guarda: la caída se decide al cargar, no al arrancar',
        reanudar.guardaLaMuerta);
      comprobar(reanudar.olvidaLaMuerta === '',
        'y se puede olvidar, para que no lo intente en cada arranque', JSON.stringify(reanudar.olvidaLaMuerta));
    }

    console.log('\\n--- y si no carga, cae a la de la instancia ---');
    const conCaida = await ventana.webContents.executeJavaScript(`(async () => {
      // Se guarda ANTES de crear la instancia, que es como pasa en la vida: la memoria se escribe
      // navegando, y la instancia que arranca con ella ya existe en el siguiente arranque.
      recordarUltimaPagina('re-caida', 0, ${JSON.stringify(URL_MUERTA)});
      const instancia = {
        id: 're-caida', name: 'Caida', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
      };
      createBrowserInstanceWorkspace(instancia, 5);
      const panel = browserInstanceViews.get('re-caida').panels[0];
      // Sin red, loadConnectionPanel sale ANTES de cargar, con «Sin conexión», y no se ve a donde
      // iba a ir. Se levanta ese tapón —no es lo que se prueba— para poder observar la decisión del
      // manejador: la carga seguirá fallando, que es lo que importa, pero la URL de destino ya
      // estará puesta.
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
      panel.webview.dispatchEvent(new Event('did-fail-load'));
      await new Promise((r) => setTimeout(r, 600));
      return {
        atributo: panel.webview.getAttribute('src'),
        propiedad: String(panel.webview.src || ''),
        ultimo: String(panel.lastUrl || ''),
        caidaUnaSolaVez: panel.caidaPorPaginaMuerta === true,
        olvidada: ultimaPaginaDe('re-caida', 0)
      };
    })()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al comprobar la caída');
      return null;
    });

    if (conCaida) {
      comprobar(/^https:\/\/ejemplo\.invalid\/?$/.test(conCaida.ultimo)
        || /^https:\/\/ejemplo\.invalid\/?$/.test(conCaida.atributo)
        || /^https:\/\/ejemplo\.invalid\/?$/.test(conCaida.propiedad),
      'si la página guardada no carga, la pantalla cae a la URL de la instancia',
      `${conCaida.ultimo} / ${conCaida.atributo} / ${conCaida.propiedad}`);
      comprobar(conCaida.olvidada === '',
        'y la dirección mala se olvida, para no reintentarlo en el siguiente arranque',
        JSON.stringify(conCaida.olvidada));
      comprobar(conCaida.caidaUnaSolaVez,
        'y la caída pasa una sola vez: si la URL de la instancia tampoco carga, no se rebota');
    }
// --- Lo que encontró la revisión de rama ------------------------------------------
    console.log('\n--- lo que encontró la revisión de rama ---');
    // La revisión encontró que la memoria se guardaba DENTRO de pintarBarraDeNavegacion, que
    // sale enseguida si el panel no tiene campo de dirección. Y el campo de dirección solo existe
    // en modo navegador. O sea: en modo instancia —que es el de fábrica y el de cuatro cuentas del
    // mismo juego— no se guardaba NADA. La función titular no funcione en el modo por defecto.
    //
    // Y el recorte por página caducada escuchaba cualquier fallo de carga, incluidos los de los
    // iframes: un anuncio que no carga habría tirado la pantalla entera de vuelta al inicio.
    const encontrado = await ventana.webContents.executeJavaScript(`(async () => {
      const salida = {};

      // 1. En modo instancia, que es el de fábrica.
      const panel = browserInstanceViews.get('re-una').panels[0];
      panel.lastUrl = 'https://ejemplo.invalid/juego-profundo';
      olvidarUltimaPagina('re-una', 0);
      recordarPaginaDelPanel(panel);
      salida.modInstancia = ultimaPaginaDe('re-una', 0);

      // Y lo mismo en modo navegador, para que los dos sirvan igual.
      const conBarra = createBrowserInstanceWorkspace({
        id: 're-navegador', name: 'Nav', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'navegador', buscador: 'ddg', inicio: '', apertura: 'auto'
      }, 7);
      const panelBarra = conBarra.panels[0];
      panelBarra.lastUrl = 'https://ejemplo.invalid/en-modo-navegador';
      olvidarUltimaPagina('re-navegador', 0);
      recordarPaginaDelPanel(panelBarra);
      salida.modNavegador = ultimaPaginaDe('re-navegador', 0);

      // 2. Un iframe que falla NO es la pantalla entera fallando.
      const muerta = 'https://no-existe.example/anuncio';
      recordarUltimaPagina('re-sub', 0, muerta);
      const delSub = createBrowserInstanceWorkspace({
        id: 're-sub', name: 'Sub', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'instancia', buscador: 'ddg', inicio: '', apertura: 'auto'
      }, 8);
      const panelSub = delSub.panels[0];
      const deSub = new Event('did-fail-load');
      deSub.isMainFrame = false;
      panelSub.webview.dispatchEvent(deSub);
      await new Promise((r) => setTimeout(r, 200));
      salida.trasSubFrame = ultimaPaginaDe('re-sub', 0);
      salida.caidaTrasSubFrame = panelSub.caidaPorPaginaMuerta === true;

      // 3. Pero la pantalla principal sí.
      const dePrincipal = new Event('did-fail-load');
      dePrincipal.isMainFrame = true;
      panelSub.webview.dispatchEvent(dePrincipal);
      await new Promise((r) => setTimeout(r, 300));
      salida.trasPrincipal = ultimaPaginaDe('re-sub', 0);
      salida.caidaTrasPrincipal = panelSub.caidaPorPaginaMuerta === true;
      return salida;
    })()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al comprobar lo de la revisión');
      return null;
    });

    if (encontrado) {
      comprobar(encontrado.modInstancia === 'https://ejemplo.invalid/juego-profundo',
        'en modo instancia también se recuerda la página, que es el modo de fábrica',
        encontrado.modInstancia);
      comprobar(encontrado.modNavegador === 'https://ejemplo.invalid/en-modo-navegador',
        'y en modo navegador igual: los dos modos se guardan por el mismo sitio',
        encontrado.modNavegador);
      comprobar(encontrado.trasSubFrame === 'https://no-existe.example/anuncio'
        && encontrado.caidaTrasSubFrame === false,
        'un iframe que falla no echa la pantalla: un anuncio que no carga no puede tirar la página',
        JSON.stringify({ queda: encontrado.trasSubFrame, cayo: encontrado.caidaTrasSubFrame }));
      comprobar(encontrado.trasPrincipal === '' && encontrado.caidaTrasPrincipal === true,
        'pero si falla la pantalla principal, sí cae a la de su instancia',
        JSON.stringify({ queda: encontrado.trasPrincipal, cayo: encontrado.caidaTrasPrincipal }));
    }

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
    ? 'Cada pantalla vuelve a donde se quedó.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});