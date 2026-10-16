// El icono de cada web en su pestaña, y las flechas que desplazan la barra de pestañas.
//
// POR QUÉ EL ICONO NO VA DIRETO A LA PESTAÑA
//
// La página del launcher tiene una CSP con `img-src 'self' data: https://poke.idleworld.online
// https://pokexguides.com`. Un `<img>` con la dirección del icono de otra web queda bloqueado, y no
// es un detalle que se pueda negociar: la cabecera CSP está en el HTML y el navegador la aplica.
// Por eso el icono lo descarga el PROCESO PRINCIPAL y vuelve como `data:`, que sí está permitido.
// No es una decisión de estilo; la CSP obliga.
//
// El camino entero: el preload de la instancia lee `<link rel~="icon">` —que en casi todas las webs
// apunta a un CDN distinto del dominio, y hay que descargar ése, no el del dominio—, se lo dice al
// renderer con `sendToHost`, el renderer pide la imagen al proceso principal y la pinta.
//
// LO QUE NO SE COMPRUEBA, Y POR QUÉ
//
// Que la descarga de verdad funcione necesita Internet y una web de pie, y una prueba que depende de
// eso falla sola el día que esa web se cae. La regla de qué se descarga —tipos y tamaño— se comprueba
// leyendo el código, y se dice aquí que es eso: una comprobación de que la regla existe y dice lo que
// tiene que decir, NO de que el navegador la cumpla. Lo que sí se comprueba de verdad es el canal:
// que rechaza lo que no es https y que devuelve un fallo claro cuando no hay icono.
//
// Y el DOM: que pinta la imagen cuando la hay, y vuelve al globo cuando no, en vez de dejar una caja
// rota ocupando el sitio.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-pestanas-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');
const { app, BrowserWindow } = electronApi;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// La regla de qué se descarga vive en el proceso principal, y `require` no deja alcanzar su interior:
// una función de primer nivel de un módulo no es una global. Por eso su contenido se comprueba
// leyendo el fichero, y lo que se comprueba de verdad —que el canal acepta y rechaza lo que debe— se
// comprueba a traves del puente.

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

    console.log('--- el canal que pide el icono ---');
    const canal = await ventana.webContents.executeJavaScript(`(async () => ({
      sinHttps: await window.pokeGrid.descargarIcono('http://ejemplo.invalid/icono.png'),
      vacio: await window.pokeGrid.descargarIcono(''),
      sinResolver: await window.pokeGrid.descargarIcono('https://no-existe.example/icono.png')
    }))()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al pedir un icono');
      return null;
    });
    if (canal) {
      comprobar(canal.sinHttps?.ok === false && /https/i.test(canal.sinHttps.error || ''),
        'un icono que no es https se rechaza, porque en una página https quedaría bloqueado',
        JSON.stringify(canal.sinHttps));
      comprobar(canal.vacio?.ok === false && canal.sinResolver?.ok === false,
        'y una dirección que no existe devuelve un fallo claro en vez de romperse',
        JSON.stringify({ vacio: canal.vacio, sinResolver: canal.sinResolver }));
    }

    // La regla de qué se descarga, leída del código. Es una comprobación de que la regla EXISTE y
    // dice lo que tiene que decir, no de que el navegador la cumpla: para eso haría falta una
    // página que sirviera cada formato, y eso no se puede montar aquí sin montar un servidor con
    // certificados.
    const fuenteMain = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
    comprobar(/const ICONO_MAXIMO_BYTES = 256 \* 1024/.test(fuenteMain)
      && /'image\/png'/.test(fuenteMain) && /'image\/x-icon'/.test(fuenteMain),
      'la regla de qué se descarga está escrita con los tipos correctos y el tope de 256 KB');
    comprobar(!/image\/svg\+xml/.test(fuenteMain),
      'un SVG no vale: es un documento con scripts, no un icono');

    console.log('\n--- el preload avisa del icono ---');
    const pre = fs.readFileSync(path.join(__dirname, '..', 'src', 'instancia-rueda-preload.js'), 'utf8');
    comprobar(/sendToHost\(\s*'instancia:favicon'/.test(pre),
      'el preload avisa del icono al renderer, que no necesita pasar por el proceso principal');
    comprobar(/link\[rel~="icon"\]/.test(pre) || /link\[rel~='icon'\]/.test(pre),
      'y lee el <link> de la propia página, que es quien lo sabe');

    console.log('\n--- el icono en la pestaña ---');
    const icono = await ventana.webContents.executeJavaScript(`(() => {
      createBrowserInstanceWorkspace({
        id: 'pest-navegador', name: 'Pest', url: 'https://ejemplo.invalid/',
        count: 1, modo: 'navegador', buscador: 'ddg', inicio: '', apertura: 'auto'
      }, 0);
      // La pestaña sale de browserInstances, no del mapa de vistas: crear el mosaico no mete la
      // instancia en la lista, y sin ella no hay pestaña que mirar.
      // OJO: los acentos graves CIERRAN la plantilla de arriba. Este comentario va dentro del codigo
      // que se inyecta, no fuera, asi que no puede llevar ni uno. Pasa tres veces ya.
      browserInstances.push({
        id: 'pest-navegador', name: 'Pest', url: 'https://ejemplo.invalid/',
        count: 1, modo: 'navegador', buscador: 'ddg', inicio: '', apertura: 'auto'
      });
      renderBrowserInstanceTabs();
      const salida = {};
      const hueco = document.querySelector('[data-instance-id="pest-navegador"] .instance-tab-icon');
      salida.hayHueco = Boolean(hueco);
      salida.globoPorDefecto = Boolean(hueco?.querySelector('.instance-tab-icon-globo'));
      iconosDeInstancia.set('pest-navegador', 'data:image/png;base64,iVBORw0KGgo=');
      pintarIconoDeInstancia('pest-navegador');
      const conImagen = document.querySelector('[data-instancia-icono="pest-navegador"]');
      salida.imagenTrasPintar = Boolean(conImagen?.querySelector('img.instance-tab-favicon'));
      salida.srcTrasPintar = conImagen?.querySelector('img')?.getAttribute('src') || '';
      iconosDeInstancia.delete('pest-navegador');
      pintarIconoDeInstancia('pest-navegador');
      const sinIcono = document.querySelector('[data-instancia-icono="pest-navegador"]');
      salida.vuelveAlGlobo = Boolean(sinIcono?.querySelector('.instance-tab-icon-globo'));
      salida.cajaRotaFuera = Boolean(sinIcono?.querySelector('img'));
      salida.primaryIntacto = Boolean(document.querySelector(
        '[data-instance-id="poke-idle-world"] .instance-tab-icon svg'
      ));
      salida.hayCanalEnElPuente = typeof window.pokeGrid.descargarIcono === 'function';
      return salida;
    })()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al pintar el icono');
      return null;
    });

    if (icono) {
      comprobar(icono.hayHueco && icono.globoPorDefecto,
        'cada pestaña tiene su sitio para el icono, y sin icono muestra un globo',
        JSON.stringify(icono));
      comprobar(icono.imagenTrasPintar && icono.srcTrasPintar.startsWith('data:image/'),
        'y con icono muestra la imagen que le llega', JSON.stringify(icono));
      comprobar(icono.vuelveAlGlobo && !icono.cajaRortaFuera,
        'sin icono vuelve al globo, no a una imagen rota que ocupa el sitio y no dice nada',
        JSON.stringify(icono));
      comprobar(icono.primaryIntacto,
        'la pantalla principal de Poke Idle World conserva su icono propio', JSON.stringify(icono));
      comprobar(icono.hayCanalEnElPuente,
        'y hay un canal para pedir la imagen al proceso principal', JSON.stringify(icono));
    }

    console.log('\n--- las flechas de la barra de pestañas ---');
    const flechas = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      // Falsear las TRES propiedades, no solo las dos medidas. Con un elemento vacio, el desplazamiento se
// recorta a 0 aunque se mienta sobre el ancho: el navegador no deja desplazar lo que no tiene nada
// que desplazar. Con solo las medidas mintiendo, el estado «al principio» y el estado «en el medio»
// serian el mismo, y las dos comprobaciones de los extremos no probarian nada.
//
// OJO: los acentos graves CIERRAN la plantilla de abajo. Este comentario va dentro del codigo que se
// inyecta, no fuera, asi que no puede llevar ni uno.
const medir = (ancho) => {
  Object.defineProperty(instanceTabs, 'scrollWidth', { configurable: true, get: () => ancho });
  Object.defineProperty(instanceTabs, 'clientWidth', { configurable: true, get: () => 400 });
  Object.defineProperty(instanceTabs, 'scrollLeft', { configurable: true, writable: true, value: 0 });
};
      const leer = () => ({ izquierda: !instanceTabsBack.hidden, derecha: !instanceTabsForward.hidden });
      medir(400);
      instanceTabs.scrollLeft = 0;
      actualizarFlechasDePestanas();
      salida.caben = leer();
      medir(900);
      instanceTabs.scrollLeft = 200;
      actualizarFlechasDePestanas();
      salida.noCaben = leer();
      instanceTabs.scrollLeft = 0;
      actualizarFlechasDePestanas();
      salida.alPrincipio = leer();
      instanceTabs.scrollLeft = 900;
      actualizarFlechasDePestanas();
      salida.alFinal = leer();
      return salida;
    })()`).catch((e) => {
      console.log(`\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al manejar las flechas');
      return null;
    });

    if (flechas) {
      comprobar(!flechas.caben.izquierda && !flechas.caben.derecha,
        'con todas las pestañas a la vista, las flechas no estorban', JSON.stringify(flechas.caben));
      comprobar(flechas.noCaben.izquierda && flechas.noCaben.derecha,
        'y en cuanto no caben, aparecen las dos', JSON.stringify(flechas.noCaben));
      comprobar(!flechas.alPrincipio.izquierda && flechas.alPrincipio.derecha,
        'al principio solo se puede ir hacia delante', JSON.stringify(flechas.alPrincipio));
      comprobar(flechas.alFinal.izquierda && !flechas.alFinal.derecha,
        'y al final, solo hacia atrás', JSON.stringify(flechas.alFinal));
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
    ? 'El icono en la pestaña y las flechas de la barra.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});