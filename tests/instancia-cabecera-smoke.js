// La barra superior: pestañas que reparten el ancho, el engranaje con nombre y los iconos que
// siguen al sitio.
//
// POR QUÉ ESTAS CUATRO JUNTAS EN UN FICHERO
//
// Son cuatro correcciones de la misma barra y del mismo ciclo de pintado. Separadas en cuatro
// ficheros se repite cuatro veces el arranque del launcher, que son veinticinco segundos, por cuatro
// cosas que se pueden ver en la misma pantalla. Aqui se comprueban de una vez y, si algo se rompe,
// se sabe en cual de las cuatro.
//
// LO QUE NO SE COMPRUEBA, Y POR QUÉ
//
// La descarga real del icono necesita Internet: eso lo vigila el verificador, no esto. Lo que se
// comprueba es que el aviso llega, que sustituye al icono que hay, y que no repinta cuando es la
// misma página —que es lo que hacia que el icono se quedara clavado en el primer sitio—.
//
// Y el ancho de las pestañas se mide de verdad, con `getBoundingClientRect`, no leyendo el CSS:
// que dos pestañas midan mas que cinco es la unica forma de saber que reparten el espacio y no que
// simplemente no tienen un tope escrito encima.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-cabecera-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');
const { app, BrowserWindow } = electronApi;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// Un icono de mentira. No hace falta que sea una imagen real: lo que se comprueba es que el DOM
// cambia y que el `src` es el `data:` que llega, no que el navegador sepa pintar PNG.
const ICONO_A = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const ICONO_B = 'data:image/png;base64,AAAA';

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
        'window.__arranqueVista === "ok"'
      ).catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    // =================================================================================
    console.log('--- 1. las pestañas reparten el ancho ---');
    const ancho = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      const marca = document.querySelector('.brand');
      const barra = document.querySelector('#instanceTabbar');
      salida.logoMin = getComputedStyle(marca).minWidth;
      salida.logoOcupado = Math.round(marca.getBoundingClientRect().width);
      salida.barraMax = getComputedStyle(barra).maxWidth;

      // Un ancho conocido, para que la medida no dependa de la ventana del agente.
      barra.style.width = '900px';
      barra.style.flex = '0 0 900px';

      const medirCon = (cuantas) => {
        browserInstances.length = 0;
        for (let i = 0; i < cuantas; i += 1) {
          browserInstances.push({
            id: 'ancho-' + i, name: 'P' + i, url: 'https://ejemplo.invalid/',
            count: 1, modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
          });
        }
        renderBrowserInstanceTabs();
        const shells = [...document.querySelectorAll('.instance-tab-shell')];
        // +1 por la pestaña principal, que siempre esta. Se mide el conjunto, que es lo que
        // comparten el ancho.
        return Math.round(shells.reduce((suma, s) => suma + s.getBoundingClientRect().width, 0)
          / Math.max(1, shells.length));
      };

      salida.conDos = medirCon(2);
      salida.conCinco = medirCon(5);
      salida.conVeinte = medirCon(20);
      // Y con veinte, la mas estrecha de todas. Es la medida que distingue «crecen y no se
      // aplastan» de «crecen y se encogen»: si flex-shrink no fuera 0, veinte pestañas se
      // repartirian 900 px y cada una se quedaria en ~43 px, ilegible. La prueba anterior solo
      // comparaba dos contra cinco, y con tan pocas y nombres tan cortos NUNCA se desborda, asi
      // que el encogimiento no llegaba a actuar y los dos valores salian casi iguales: daba verde
      // sin distinguir la regresion que dice vigilar.
      //
      // Y OJO: esto va DENTRO de una plantilla, asi que no puede llevar acentos graves. Ni en el
      // codigo ni en el comentario. Es la sexta vez hoy.
      const shellsVeinte = [...document.querySelectorAll('.instance-tab-shell')];
      salida.masEstrechaConVeinte = Math.round(
        Math.min(...shellsVeinte.map((s) => s.getBoundingClientRect().width))
      );
      salida.desbordaYSeDesplaza = instanceTabs.scrollWidth > instanceTabs.clientWidth;

      // Se deja como estaba, que el resto de la prueba no depende de este medida.
      browserInstances.length = 0;
      barra.style.width = '';
      barra.style.flex = '';
      renderBrowserInstanceTabs();
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al medir las pestañas');
      return null;
    });

    if (ancho) {
      comprobar(ancho.logoMin === '0px' || ancho.logoMin === 'auto',
        'el logo ya no reserva el ancho del texto que se quitó', `min-width: ${ancho.logoMin}`);
      comprobar(ancho.logoOcupado <= 48,
        'y ocupa solo lo que ocupa el logo', `${ancho.logoOcupado} px`);
      comprobar(ancho.barraMax === 'none',
        'la lista de pestañas ya no tiene el tope de 680 px', `max-width: ${ancho.barraMax}`);
      comprobar(ancho.conDos > ancho.conCinco,
        'con pocas pestañas cada una es más ancha: el espacio sobrante se reparte',
        `2 pestañas: ${ancho.conDos} px, 5 pestañas: ${ancho.conCinco} px`);
      comprobar(ancho.masEstrechaConVeinte >= 70,
        'y con veinte no se aplastan: se desplazan, que es lo que las flechas vienen a hacer',
        `la más estrecha con 20: ${ancho.masEstrechaConVeinte} px`);
      comprobar(ancho.desbordaYSeDesplaza,
        'y la lista desborda y se puede desplazar en vez de encogerse',
        `desborda: ${ancho.desbordaYSeDesplaza}`);
    }

    // =================================================================================
    console.log('\\n--- 2. el engranaje tiene nombre ---');
    // Se mide con el menu ABIERTO, que es como lo tiene el usuario delante. Con el menu plegado el
    // panel entero esta en `visibility: hidden` y mediria bien de un texto que no se ve por estar
    // en una caja cerrada: un falso positivo que dejaria pasar justo el fallo que se busca.
    await ventana.webContents.executeJavaScript(`(() => {
      document.querySelector('#topbarToggle').click();
      return true;
    })()`).catch(() => {});
    await dormir(400);
    const engranaje = await ventana.webContents.executeJavaScript(`(() => {
      const boton = document.querySelector('#instanceSettingsButton');
      const piezas = [...boton.children];
      const deTexto = piezas.find((p) => !p.classList.contains('top-action-icon'));
      const estilo = deTexto ? getComputedStyle(deTexto) : null;
      const caja = deTexto ? deTexto.getBoundingClientRect() : { width: 0, height: 0 };
      const visible = Boolean(deTexto) && estilo.display !== 'none'
        && estilo.visibility !== 'hidden' && parseFloat(estilo.opacity || '1') > 0
        && caja.width > 0 && caja.height > 0;
      return {
        // El nombre del boton es el de SU span, no el del boton entero: el engranaje tambien es
        // texto y si no se separa la comparacion no tiene sentido.
        nombre: deTexto ? deTexto.textContent.trim() : '',
        visible,
        ancho: Math.round(caja.width),
        alto: Math.round(caja.height),
        porQue: estilo ? {
          display: estilo.display, visibility: estilo.visibility, opacity: estilo.opacity
        } : null,
        hayIcono: Boolean(boton.querySelector('.top-action-icon')),
        esUnico: document.querySelectorAll('#instanceSettingsButton').length
      };
    })()`).catch(() => null);

    if (engranaje) {
      comprobar(engranaje.nombre === 'Configuraciones',
        'el botón se llama Configuraciones', JSON.stringify(engranaje.nombre));
      comprobar(engranaje.visible && engranaje.ancho > 10,
        'y ese nombre se ve de verdad, no es un texto invisible', JSON.stringify(engranaje));
      comprobar(engranaje.hayIcono && engranaje.esUnico === 1,
        'con su icono al lado y siendo el único', JSON.stringify(engranaje));
    }

    // Y se cierra, que el resto de la prueba necesita la barra como estaba.
    await ventana.webContents.executeJavaScript(`(() => {
      document.querySelector('#topbarToggle').click();
      return true;
    })()`).catch(() => {});
    await dormir(300);

    // =================================================================================
    console.log('\\n--- 3. el icono sigue al sitio ---');
    const icono = await ventana.webContents.executeJavaScript(`(() => {
      const ICONO_A = ${JSON.stringify(ICONO_A)};
      const ICONO_B = ${JSON.stringify(ICONO_B)};
      const salida = {};
      try {
      browserInstances.length = 0;
      browserInstances.push({
        id: 'icono-web', name: 'Web', url: 'https://ejemplo.invalid/',
        count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: ''
      });
      renderBrowserInstanceTabs();
      const hueco = () => document.querySelector('[data-instancia-icono="icono-web"]');
      const src = () => hueco()?.querySelector('img')?.getAttribute('src') || '';

      // El aviso llega con la direccion de la pagina que lo ha declarado. Se llama a la MISMA
      // entrada que el preload deja en el aviso, no a una funcion inventada para la prueba.
      avisoDeIcono({ url: 'https://ejemplo.invalid/favicon.ico' }, ICONO_A, 'icono-web');
      salida.primeraVez = src();

      // El mismo sitio otra vez: no hay nada nuevo que pintar.
      avisoDeIcono({ url: 'https://ejemplo.invalid/favicon.ico' }, ICONO_B, 'icono-web');
      salida.mismoSitio = src();

      // Otro sitio: el icono tiene que cambiar.
      avisoDeIcono({ url: 'https://otro.invalid/favicon.ico' }, ICONO_B, 'icono-web');
      salida.otroSitio = src();

      // Y uno que no se puede descargar deja el que hay, no lo borra.
      avisoDeIcono({ url: 'https://tercero.invalid/favicon.ico' }, '', 'icono-web');
      salida.trasUnoRoto = src();
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al cambiar el icono');
      return null;
    });

    if (icono && icono.error) {
      console.log(`\\nFALLO dentro de la pagina: ${icono.error}`);
      fallos.push('el aviso de icono revienta: ' + icono.error);
    }

    if (icono) {
      comprobar(icono.primeraVez === ICONO_A,
        'el aviso de la página pinta su icono', JSON.stringify(icono.primeraVez));
      comprobar(icono.mismoSitio === ICONO_A,
        'y si el aviso es de la misma página, no lo vuelve a pintar sin motivo',
        JSON.stringify(icono.mismoSitio));
      comprobar(icono.otroSitio === ICONO_B,
        'pero si cambia de sitio, el icono cambia con ella',
        JSON.stringify(icono.otroSitio));
      comprobar(icono.trasUnoRoto === ICONO_B,
        'y un icono que no se descarga deja el anterior puesto, no lo deja en blanco',
        JSON.stringify(icono.trasUnoRoto));
    }

    // =================================================================================
    console.log('\\n--- 4. el logo del juego en la pestaña principal ---');
    // POR QUE ESTO NO VA POR EL AVISO DEL PRELOAD
    //
    // La primera version de esta prueba llamaba a avisoDeIcono() pasandole 'poke-idle-world' a mano
    // y daba verde. Y era un verde falso: el camino real para esa id NO EXISTE. `pedirIconoDeWebview`
    // tiene una sola llamada, dentro de createBrowserInstancePanel, y los paneles del juego los crea
    // createPanel. Y aunque se llamara, `will-attach-webview` sale en main.js si la particion no
    // empieza por `persist:pokegrid-instance-`, asi que los webviews del juego nunca llevan el
    // preload que manda el aviso. El propio comentario de al lado lo dice.
    //
    // O sea: pasarle la id a mano probaba la costura y tapaba el cable cortado. Lo correcto es que
    // la pestaña principal no dependa del aviso: el logo del juego ya viaja dentro del launcher, en
    // assets, y es el mismo que la cabecera enseña al lado. Sin red, sin preload en las sesiones del
    // juego —que es donde peor sienta un cambio— y no puede fallar.
    const principal = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        browserInstances.length = 0;
        renderBrowserInstanceTabs();
        const hueco = () => document.querySelector('[data-instancia-icono="poke-idle-world"]');
        const logo = () => hueco()?.querySelector('.instance-tab-icon-logo');
        salida.hayLogo = Boolean(logo());
        salida.fondo = logo() ? getComputedStyle(logo()).backgroundImage : '';
        salida.hayMarcaDeSiempre = Boolean(hueco()?.querySelector('svg'));

        // Y no depende del aviso: nada de lo que llegue por el mapa de iconos lo cambia.
        iconosDeInstancia.set('poke-idle-world', 'data:image/png;base64,ZZZ');
        pintarIconoDeInstancia('poke-idle-world');
        salida.sigueElLogoConOtroIconoEnElMapa = Boolean(logo());
        salida.noCogeElDelMapa = !hueco()?.querySelector('img');
        iconosDeInstancia.delete('poke-idle-world');
        origenesDeIcono.delete('poke-idle-world');
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al poner el logo del juego');
      return null;
    });

    if (principal && principal.error) {
      console.log(`\\nFALLO dentro de la pagina: ${principal.error}`);
      fallos.push('el logo del juego revienta: ' + principal.error);
    }

    if (principal) {
      comprobar(principal.hayLogo,
        'la pestaña principal enseña el logo del juego, que ya viaja dentro del launcher');
      comprobar(/idle-poke-logo/.test(principal.fondo),
        'y es el logo del juego, no un dibujo de relleno', principal.fondo.slice(0, 120));
      comprobar(!principal.hayMarcaDeSiempre,
        'sin dejar debajo la marca de antes: una cosa o la otra, no las dos');
      comprobar(principal.sigueElLogoConOtroIconoEnElMapa && principal.noCogeElDelMapa,
        'y no depende del aviso de la página: el mapa de iconos no lo pisa',
        JSON.stringify(principal));
    }

    // =================================================================================
    console.log('\\n--- 5. el aviso, por el camino real ---');
    // Las cuatro comprobaciones de arriba llaman a avisoDeIcono() a mano. Eso prueba la costura,
    // pero NO prueba el cable: quien decide que hay que repintar, y con que id, es el oyente que
    // escucha el `ipc-message` del webview. Aqui se lanza ese evento de verdad sobre una pantalla
    // de verdad, con el canal y la forma que usa el preload, y se mira el resultado. Es la
    // comprobacion que habria cazado que el logo del juego nunca llegaba.
    const porElCaminoReal = await ventana.webContents.executeJavaScript(`(async () => {
      const salida = {};
      try {
        browserInstances.length = 0;
        const fila = {
          id: 'cable-web', name: 'Cable', url: 'https://ejemplo.invalid/',
          count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: ''
        };
        browserInstances.push(fila);
        // Hay que MONTAR la instancia, no solo meterla en la lista: el mosaico —y con el, el panel
        // y su webview— lo crea createBrowserInstanceWorkspace. Con solo la pestaña dibujada no hay
        // panel al que lanzarle el evento, y la prueba se cae leyendo los paneles de una vista que
        // no existe. (Sin acentos graves aqui: esto va dentro de una plantilla.)
        browserInstanceViews.get('cable-web')?.workspace.remove();
        createBrowserInstanceWorkspace(fila, 0);
        renderBrowserInstanceTabs();
        const panel = browserInstanceViews.get('cable-web').panels[0];
        salida.escuchaEnganchada = Boolean(panel.oyEscuchaElIcono);

        // Se sustituye la descarga de verdad —necesita red— por una respuesta conocida, para
        // poder mirar el resto del camino sin Internet.
        //
        // Se sustituye pedirIconoAlProceso, que es del renderer, y NO
        // window.pokeGrid.descargarIcono: el puente lo pone contextBridge y llega congelado,
        // asi que asignarle algo no hace nada y falla en silencio. La primera version de esta
        // prueba lo hacia y por eso medía cero: llamaba al de verdad, que sin red no pinta nada.
        const original = pedirIconoAlProceso;
        const pedidas = [];
        pedirIconoAlProceso = (url) => {
          pedidas.push(url);
          return Promise.resolve('data:image/png;base64,CABLE');
        };

        const evento = new Event('ipc-message');
        evento.channel = 'instancia:favicon';
        evento.args = [{ url: 'https://ejemplo.invalid/cable.ico' }];
        panel.webview.dispatchEvent(evento);
        await new Promise((r) => setTimeout(r, 50));

        salida.pedidas = pedidas.slice();
        salida.iconoPintado = document.querySelector('[data-instancia-icono="cable-web"] img')
          ?.getAttribute('src') || '';

        // Y un evento de OTRO canal no puede pintar nada.
        const ajeno = new Event('ipc-message');
        ajeno.channel = 'otro:canal';
        ajeno.args = [{ url: 'https://ejemplo.invalid/ajeno.ico' }];
        panel.webview.dispatchEvent(ajeno);
        await new Promise((r) => setTimeout(r, 50));
        salida.pedidasTrasAjeno = pedidas.length;

        // Y uno por el canal correcto pero sin direccion, tampoco.
        const sinUrl = new Event('ipc-message');
        sinUrl.channel = 'instancia:favicon';
        sinUrl.args = [{}];
        panel.webview.dispatchEvent(sinUrl);
        await new Promise((r) => setTimeout(r, 50));
        salida.pedidasTrasSinUrl = pedidas.length;

        pedirIconoAlProceso = original;
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción por el camino real del aviso');
      return null;
    });

    if (porElCaminoReal && porElCaminoReal.error) {
      console.log(`\\nFALLO dentro de la pagina: ${porElCaminoReal.error}`);
      fallos.push('el camino real revienta: ' + porElCaminoReal.error);
    }

    if (porElCaminoReal) {
      comprobar(porElCaminoReal.escuchaEnganchada,
        'la pantalla tiene enganchada la escucha del icono desde que se crea',
        JSON.stringify(porElCaminoReal.escuchaEnganchada));
      comprobar(porElCaminoReal.iconoPintado === 'data:image/png;base64,CABLE',
        'y el aviso del preload, tal cual llega, acaba en el icono de su pestaña',
        JSON.stringify(porElCaminoReal.iconoPintado));
      comprobar(porElCaminoReal.pedidasTrasAjeno === 1 && porElCaminoReal.pedidasTrasSinUrl === 1,
        'un evento de otro canal no descarga nada, ni uno del canal bueno sin dirección',
        `peticiones: ${JSON.stringify(porElCaminoReal.pedidas)}`);
    }
  } catch (e) {
    console.log(`\\nFALLO: ${e && e.stack ? e.stack.split('\\n').slice(0, 6).join('\\n') : e}`);
    fallos.push('excepción');
  } finally {
    for (let i = 0; i < 3; i++) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); break; } catch { /* Electron lo tiene abierto */ }
    }
  }

  console.log('');
  console.log(fallos.length === 0
    ? 'La barra superior: ancho, nombre e iconos.'
    : `${fallos.length} comprobaciones fallan:\\n  - ${fallos.join('\\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});