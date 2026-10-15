// La vista de las instancias: pantalla completa, zoom y el panel de ajustes.
//
// POR QUÉ EXISTE
//
// Las instancias son webviews dentro de la ventana del launcher, no ventanas aparte. Añadir
// pantalla completa, zoom y un atajo configurable toca las cuatro capas: el proceso principal (que es
// el único que ve las teclas cuando el juego tiene el foco y el dueño del nivel de zoom), el preload,
// el renderer y la maqueta.
//
// Lo que se comprueba es lo que no se ve leyendo el código:
//
//   · Que el atajo se guarda, se pinta y se le pasa al proceso principal —que es quien lo compara con
//     las teclas de verdad— y que Esc cancela la captura sin comerse el atajo.
//   · Que la pantalla completa pone y quita la clase del body, y que sale sola si el usuario cambia de
//     pestaña: si no, se quedaría una instancia a pantalla completa escondida detrás de otra.
//   · Que el zoom se acota, se guarda por instancia —que cada juego recuerda el suyo— y que el
//     porcentaje de la barra va detrás de lo que dice el proceso principal, que es el dueño.
//   · Que la principal de Poke Idle World no entra en nada de esto.
//
// Y una comprobación sobre el propio código: que los identificadores que oculta la pantalla completa
// EXISTAN. Se inventaron dos al principio (#topbar y #sidebar) y no selector nada, así que la
// pantalla completa parecía funcionar a medias sin decir por qué.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-vista-instancia-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

// El launcher de verdad, porque el atajo se compara en el proceso principal y el zoom lo aplica él:
// con una ventana montada a mano no se tocaría el código que importa.
require('../src/main.js');
const { app, BrowserWindow } = electronApi;

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
    while (!ventana) await dormir(150);
    // Se espera a la MARCA de arranque, no solo a que el botón exista. El botón está en el documento
    // desde que se parsea el HTML, y el bloque que le pone el icono y la escucha va después:
    // esperar solo al botón hacía que la prueba corriera por delante y todo pareciera roto —botón
    // vacío, sin icono, sin abrir— cuando lo único que pasaba es que todavía no le había tocado.
    const t1 = Date.now();
    while (Date.now() - t1 < 25_000) {
      const listo = await ventana.webContents.executeJavaScript(
        'Boolean(document.querySelector("#instanceSettingsButton") && typeof window.alternarPantallaCompleta === "function" && window.__arranqueVista === "ok")');
      if (listo) break;
      await dormir(200);
    }
    const arranque = await ventana.webContents.executeJavaScript(
      '({ marca: window.__arranqueVista || "no llego", error: window.__arranqueError || "" })');
    comprobar(arranque.marca === 'ok', 'el arranque del launcher monta la vista de las instancias',
      arranque.error || arranque.marca);

    // --- 1. El panel de ajustes y su atajo ---------------------------------------
    console.log('--- el panel de ajustes ---');
    const panel = await ventana.webContents.executeJavaScript(`(() => {
      const boton = document.querySelector('#instanceSettingsButton');
      const fondo = document.querySelector('#instanceSettingsBackdrop');
      const campo = document.querySelector('#instanceSettingsShortcutField');
      const texto = document.querySelector('#instanceSettingsShortcut');
      boton.click();
      return {
        abierto: !fondo.hidden,
        atajoInicial: texto.textContent.trim(),
        atajoGuardado: localStorage.getItem('pokegrid:instance-shortcut:v1'),
        espera: campo.classList.contains('is-esperando'),
        explicaQueNoTocaLaPrincipal: /Poke Idle World/.test(document.querySelector('.instance-settings-modal .modal-copy').textContent),
        hayIcono: Boolean(boton.querySelector('svg'))
      };
    })()`);
    comprobar(panel.abierto, 'el botón de la barra abre el panel de ajustes');
    comprobar(panel.atajoInicial === 'F11', 'y viene con F11, como se pidió', panel.atajoInicial);
    comprobar(panel.explicaQueNoTocaLaPrincipal, 'el panel deja claro que la principal no se toca');
    comprobar(panel.hayIcono, 'el botón tiene icono');

    // El atajo se captura: pulsar el campo y luego una combinación.
    const capturado = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        const campo = document.querySelector('#instanceSettingsShortcutField');
        salida.hayCampo = Boolean(campo);
        salida.campoEsLaRefDelRenderer = campo === instanceSettingsShortcutField;
        salida.hayMensajeEnElDom = Boolean(document.querySelector('#instanceSettingsMessage'));
        salida.refMensajeEnElRenderer = typeof instanceSettingsMessage !== 'undefined' && Boolean(instanceSettingsMessage);
        if (campo) {
          campo.click();
          salida.esperaTrasElClic = campo.classList.contains('is-esperando');
          salida.textoTrasElClic = (document.querySelector('#instanceSettingsShortcut')?.textContent || '').trim();
          campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', ctrlKey: true, bubbles: true }));
          salida.sigueEsperando = campo.classList.contains('is-esperando');
          salida.guardado = JSON.parse(localStorage.getItem('pokegrid:instance-shortcut:v1') || 'null');
          salida.pintado = document.querySelector('#instanceSettingsShortcut')?.textContent.trim() || '';
          salida.aviso = document.querySelector('#instanceSettingsMessage')?.textContent.trim() || '';
        }
      } catch (error) {
        salida.error = String(error && error.message || error);
      }
      return salida;
    })()`);
    console.log('  (captura) ' + JSON.stringify(capturado));
    comprobar(!capturado.error, 'la captura del atajo no reventó', capturado.error || '');
    comprobar(capturado.hayCampo === true && capturado.campoEsLaRefDelRenderer === true,
      'el campo de captura es el nodo que el renderer tiene',
      'campo: ' + capturado.hayCampo + ', misma referencia: ' + capturado.campoEsLaRefDelRenderer);
    comprobar(capturado.hayMensajeEnElDom === true && capturado.refMensajeEnElRenderer === true,
      'el hueco del aviso está en el DOM y en el renderer',
      'dom: ' + capturado.hayMensajeEnElDom + ', renderer: ' + capturado.refMensajeEnElRenderer);
    comprobar(capturado.esperaTrasElClic === true, 'al pulsar el campo se queda esperando una tecla',
      'tras el clic esperaba: ' + capturado.esperaTrasElClic + ' · texto: ' + capturado.textoTrasElClic);
    comprobar(capturado.guardado?.key === 'F9' && capturado.guardado?.ctrl === true,
      'la combinación queda guardada', JSON.stringify(capturado.guardado));
    comprobar(capturado.pintado === 'Ctrl + F9', 'y se pinta con nombre de tecla, no el código',
      capturado.pintado);
    comprobar(/Atajo guardado/.test(capturado.aviso || ''), 'con un aviso que lo dice', capturado.aviso);

    // Escape cancela, y NO guarda una tecla inventada.
    const cancelado = await ventana.webContents.executeJavaScript(`(() => {
      const campo = document.querySelector('#instanceSettingsShortcutField');
      campo.click();
      campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return {
        esperando: campo.classList.contains('is-esperando'),
        guardado: JSON.parse(localStorage.getItem('pokegrid:instance-shortcut:v1') || 'null'),
        pintado: document.querySelector('#instanceSettingsShortcut').textContent.trim()
      };
    })()`);
    comprobar(cancelado.esperando === false, 'Escape cancela la captura');
    comprobar(cancelado.guardado?.key === 'F9', 'y no se guarda Escape como atajo',
      JSON.stringify(cancelado.guardado));
    comprobar(cancelado.pintado === 'Ctrl + F9', 'vuelve a pintar el atajo que había', cancelado.pintado);

    // --- 2. La pantalla completa --------------------------------------------------
    console.log('\n--- la pantalla completa ---');
    const pantalla = await ventana.webContents.executeJavaScript(`(() => {
      const cuerpo = document.body;
      // No hay instancias abiertas en la prueba, así que se comprueba la clase del cuerpo: es lo que
      // decide que la ventana entera se dedicate a una instancia.
      cuerpo.classList.add('instancia-pantalla-completa');
      const puesta = getComputedStyle(document.querySelector('#appbar')).display;
      const lateral = getComputedStyle(document.querySelector('#globalActions')).display;
      cuerpo.classList.remove('instancia-pantalla-completa');
      const normal = getComputedStyle(document.querySelector('#appbar')).display;
      return {
        ocultaBarra: puesta === 'none',
        ocultaLateral: lateral === 'none',
        alSalirVuelve: normal !== 'none'
      };
    })()`);
    comprobar(pantalla.ocultaBarra, 'con la clase puesta, la barra de arriba desaparece');
    comprobar(pantalla.ocultaLateral, 'y el lateral también');
    comprobar(pantalla.alSalirVuelve, 'y al quitarla, todo vuelve');

    // El panel de ajustes se cierra con Escape desde el cuerpo.
    const cierre = await ventana.webContents.executeJavaScript(`(() => {
      const fondo = document.querySelector('#instanceSettingsBackdrop');
      fondo.hidden = false;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const cerrado = fondo.hidden;
      fondo.hidden = true;
      return cerrado;
    })()`);
    comprobar(cierre, 'Escape cierra el panel de ajustes');

    // --- 3. El zoom ---------------------------------------------------------------
    console.log('\n--- el zoom ---');
    const zoom = await ventana.webContents.executeJavaScript(`(() => ({
      acotado: [acotarZoom(0.01), acotarZoom(9), acotarZoom(1.5), acotarZoom('hola'), acotarZoom(-3)],
      describe: [describirZoom(1), describirZoom(1.25), describirZoom(2)],
      guardaPorInstancia: (() => {
        zoomInstancias = { uno: 1.4, otro: 0.8 };
        const a = zoomDeInstancia('uno');
        const b = zoomDeInstancia('otro');
        const c = zoomDeInstancia('no-existe');
        return { a, b, c };
      })()
    }))()`);
    comprobar(zoom.acotado[0] === 0.25 && zoom.acotado[1] === 3, 'el zoom se acota entre 25 % y 300 %',
      JSON.stringify(zoom.acotado));
    comprobar(zoom.acotado[2] === 1.5 && zoom.acotado[3] === 1, 'y lo raro vuelve al 100 %',
      JSON.stringify(zoom.acotado.slice(2)));
    comprobar(zoom.describe.join(' · ') === '100 % · 125 % · 200 %', 'el porcentaje se escribe bien',
      zoom.describe.join(' · '));
    comprobar(zoom.guardaPorInstancia.a === 1.4 && zoom.guardaPorInstancia.b === 0.8,
      'cada instancia recuerda el suyo', JSON.stringify(zoom.guardaPorInstancia));
    comprobar(zoom.guardaPorInstancia.c === 1, 'y una instancia nueva empieza al 100 %');

    // --- 4. Lo que el código tiene que cumplir ------------------------------------
    console.log('\n--- el código, para lo que no se puede pulsar desde fuera ---');
    // El renderer no expone su propio texto, así que se lee del fichero: es lo mismo que se envía.
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
    const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
    const estilos = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

    comprobar(/id="appbar"/.test(html) && /id="globalActions"/.test(html),
      'los identificadores que oculta la pantalla completa existen de verdad');
    comprobar(!/#topbar/.test(estilos) && !/#sidebar/.test(estilos),
      'y no se ha quedado ninguno inventado por el camino');
    comprobar(/contents\.on\('before-input-event'/.test(main),
      'las teclas se capturan en el webview, que es el único que las ve con el juego enfocado');
    comprobar(/contents\.on\('input-event'/.test(main) && /mouseWheel/.test(main),
      'y la rueda también');
    comprobar(/if \(particionInstancia\) vigilarVistaDeInstancia/.test(main),
      'solo en los webviews de instancia: la principal no se toca');
    comprobar(/ipcMain\.handle\('instancia:atajo', \(event, valor\) => \{\r?\n\s*assertMainWindowSender\(event\);/.test(main),
      'el canal del atajo comprueba quién lo llama');
    comprobar(/ipcMain\.handle\('instancia:zoom', \(event, id, factor\) => \{\r?\n\s*assertMainWindowSender\(event\);/.test(main),
      'el del zoom también');
    const guards = fs.readFileSync(path.join(__dirname, 'ipc-sender-guard-smoke.js'), 'utf8');
    comprobar(/'instancia:atajo'/.test(guards) && /'instancia:zoom'/.test(guards),
      'los dos canales están clasificados en la prueba de guards');
// --- 5. La pantalla completa DE VERDAD -----------------------------------------
    console.log('\n--- la pantalla completa de verdad: sin barra de Windows ni marco ---');
    // Lo que había era solo CSS: la instancia ocupaba la ventana del launcher, pero la barra de
    // tareas de Windows y el marco seguían delante, que es exactamente lo que hace que eso no sea
    // pantalla completa. Ahora la ventana del launcher va a pantalla completa DEL SISTEMA.
    //
    // La comprobación de que el sistema lo permite se hace primero y por separado: si el sistema
    // no lo permite, todo lo demás fallaría por otra razón y no sabríamos cuál es cuál.

    const sistema = await new Promise((resolve) => {
      ventana.setFullScreen(true);
      dormir(800);
      const dentro = ventana.isFullScreen();
      ventana.setFullScreen(false);
      dormir(600);
      resolve({ dentro, fuera: !ventana.isFullScreen() });
    });
    comprobar(sistema.dentro && sistema.fuera,
      'el proceso principal puede poner y quitar la pantalla completa del sistema',
      `entro: ${sistema.dentro}, salio: ${sistema.fuera}`);

    // Un escuchador propio de la prueba: quien mira es el aviso que llega del proceso principal al
    // renderer. Se guarda en una variable de la pagina para poder leerla desde aqui.
    await ventana.webContents.executeJavaScript(`
      window.__vistoFullScreenVentana = 'sin avisos';
      window.pokeGrid.onWindowFullScreenChange((valor) => { window.__vistoFullScreenVentana = valor; });
      true;
    `);

    // Una instancia de mentira: la de verdad necesita un juego cargado y tarda minutos. Con una
    // vista falsa en el mapa se ejercita el mismo camino —la clase del cuerpo, el aviso a la
    // ventana del sistema y la vuelta— sin arrancar nada.
    const entrar = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        const workspace = document.createElement('div');
        workspace.className = 'browser-instance-workspace';
        workspace.dataset.instanceId = 'instancia-de-prueba';
        document.querySelector('#globalActions')?.parentNode?.appendChild(workspace);
        browserInstanceViews.set('instancia-de-prueba', { workspace, panels: [] });
        activeBrowserInstanceId = 'instancia-de-prueba';
        salida.entra = alternarPantallaCompleta('instancia-de-prueba');
        salida.clase = document.body.classList.contains('instancia-pantalla-completa');
        salida.marca = workspace.dataset.pantallaCompleta || '';
        salida.estado = instanciaEnPantallaCompleta;
        salida.aviso = window.__vistoFullScreenVentana;
      } catch (error) {
        salida.error = String(error && error.message || error);
      }
      return salida;
    })()`);
    comprobar(!entrar.error, 'entrar en pantalla completa no revienta', entrar.error || '');
    comprobar(entrar.entra === true && entrar.estado === 'instancia-de-prueba',
      'la instancia queda marcada como la que está a pantalla completa', JSON.stringify(entrar));
    comprobar(entrar.clase === true && entrar.marca === '1',
      'y ocupa la ventana entera (la clase del cuerpo y la del mosaico)', JSON.stringify(entrar));
    await dormir(900);
    comprobar(ventana.isFullScreen() === true,
      'y ADEMÁS la ventana del launcher va a pantalla completa del sistema, sin barra ni marco',
      `isFullScreen: ${ventana.isFullScreen()}`);

    // Escape con el foco en la ventana principal, que es cuando el juego no la tiene: antes solo
    // se salía con la tecla capturada en el webview.
    const conEscape = await ventana.webContents.executeJavaScript(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return {
        clase: document.body.classList.contains('instancia-pantalla-completa'),
        estado: instanciaEnPantallaCompleta
      };
    })()`);
    await dormir(900);
    comprobar(conEscape.clase === false && conEscape.estado === '',
      'Escape también sale cuando el foco está en el launcher', JSON.stringify(conEscape));
    comprobar(ventana.isFullScreen() === false,
      'y la ventana del sistema vuelve con ella', `isFullScreen: ${ventana.isFullScreen()}`);

    // Y al revés: si la ventana sale por su cuenta —el usuario pulsa F11, o hace clic en el
    // escritorio—, el renderer tiene que enterarse. Si no, se quedaría con la clase puesta y sin
    // barra de herramientas, sin forma de volver.
    const sincronizada = await (async () => {
      await ventana.webContents.executeJavaScript(`(() => {
        const workspace = browserInstanceViews.get('instancia-de-prueba')?.workspace;
        alternarPantallaCompleta('instancia-de-prueba');
        window.__vistoFullScreenVentana = 'sin avisos';
        return Boolean(workspace);
      })()`);
      await dormir(900);
      const dentro = ventana.isFullScreen();
      ventana.setFullScreen(false);
      await dormir(1200);
      const avisos = await ventana.webContents.executeJavaScript(`(() => ({
        aviso: window.__vistoFullScreenVentana,
        clase: document.body.classList.contains('instancia-pantalla-completa'),
        estado: instanciaEnPantallaCompleta
      }))()`);
      return { dentro, avisos };
    })();
    comprobar(sincronizada.dentro === true, 'se puede volver a entrar a pantalla completa',
      `isFullScreen: ${sincronizada.dentro}`);
    comprobar(sincronizada.avisos.aviso === false,
      'el proceso principal avisa de que la ventana ha salido', JSON.stringify(sincronizada.avisos));
    comprobar(sincronizada.avisos.clase === false && sincronizada.avisos.estado === '',
      'y el renderer se queda sin la clase, con barra y todo a su sitio',
      JSON.stringify(sincronizada.avisos));

    // Limpieza: la instancia de mentira fuera y la pestaña activa donde estaba.
    await ventana.webContents.executeJavaScript(`(() => {
      const workspace = browserInstanceViews.get('instancia-de-prueba')?.workspace;
      browserInstanceViews.delete('instancia-de-prueba');
      workspace?.remove();
      document.body.classList.remove('instancia-pantalla-completa');
      activateBrowserInstance(PRIMARY_BROWSER_INSTANCE_ID);
      return true;
    })()`);
    await dormir(400);

    // Y el papel de cada pieza, que es lo que no se ve desde fuera.
    const codigoPantallaCompleta = [
      ['el canal para pedirla lleva el guard de la ventana principal',
        /ipcMain\.handle\('instancia:pantalla-completa', \(event, activa\) => \{\r?\n\s*assertMainWindowSender\(event\);/.test(main)],
      ['el proceso principal pone la ventana del sistema, no solo el CSS',
        /mainWindow\.setFullScreen\(Boolean\(activa\)\)/.test(main)],
      ['y avisa de los dos sentidos en los que puede salir por su cuenta',
        /on\('enter-full-screen'/.test(main) && /on\('leave-full-screen'/.test(main)],
      ['el preload expone el canal y el escuchador',
        /setWindowFullScreen: \(activa\) => ipcRenderer\.invoke\('instancia:pantalla-completa'/.test(
          fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8'))
        && /onWindowFullScreenChange/.test(
          fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8'))],
      ['el renderer se sincroniza con lo que dice la ventana',
        /function sincronizarPantallaCompletaDeLaVentana/.test(renderer)
        && /onWindowFullScreenChange\?\./.test(renderer)],
      ['y Escape sale también con el foco en el launcher',
        /event\.key !== 'Escape'[\s\S]{0,400}salirDePantallaCompleta\(\)/.test(renderer)],
      ['el canal está clasificado en la prueba de guards',
        /'instancia:pantalla-completa'/.test(guards)]
    ];
    console.log('');
    for (const [que, ok] of codigoPantallaCompleta) {
      comprobar(ok, que);
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
    ? 'Vista de las instancias: pantalla completa con atajo configurable y zoom por instancia, solo en las instancias.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});