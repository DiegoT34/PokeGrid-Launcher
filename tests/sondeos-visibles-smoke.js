// SONDEOS SOLO CON LA PANTALLA A LA VISTA — area C.
//
// Lo que se pide: los guiones del launcher solo leen y envian datos cuando su pantalla esta a la
// vista. Antes, `pollCaptureNotifications` entraba en las cuatro cuentas del juego cada 3,5 segundos
// sin preguntar si estabas mirando esa pestana: unas 1.714 inyecciones de script por hora contra
// paginas que nadie miraba.
//
// COMO SE COMPRUEBA, Y POR QUE CON UNA PANTALLA FALSA
//
// Se empuja un panel inventado en la lista de cuentas y se cuenta cuantas veces le meten script por
// `executeJavaScript`. Una pantalla real no sirve aqui porque necesita una sesion del juego abierta, y
// una sesion real arrives a la red: la prueba tardaria minutos y dependeria de Internet. La pantalla
// falsa hace la misma ruta de codigo —`panelDentroDelJuego`, la condicion de visibilidad, y luego el
// `executeJavaScript`— sin tocar la red. Lo que se cuenta NO es una variable del launcher: son las
// llamadas que de verdad llegan a la pantalla.
//
// LO QUE NO SE COMPRUEBA
//
// Que los datos que ya estaban en el archivo de capturas sigan ahi al despertar. El sondeo solo deja
// de mirar mientras la pantalla esta oculta; no borra nada. Eso se miro leyendo el codigo.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-sondeos-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

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
    const t1 = Date.now();
    while (Date.now() - t1 < 25_000) {
      const listo = await ventana.webContents.executeJavaScript('window.__arranqueVista === "ok"').catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    // =================================================================================
    console.log('\n--- 1. el panel falso llega a ser una pantalla del juego ---');
    const montado = await ventana.webContents.executeJavaScript(`(() => {
      window.__llamadas = [];
      window.__crearPanelFalso = (extra) => {
        const webview = {
          getURL: () => 'https://poke.idleworld.online/jugar',
          getWebContentsId: () => 424242,
          executeJavaScript: (codigo) => {
            window.__llamadas.push(String(codigo).slice(0, 40));
            return Promise.resolve([]);
          },
          send: () => {},
          addEventListener: () => {},
          removeEventListener: () => {}
        };
        return Object.assign({
          instanceId: PRIMARY_BROWSER_INSTANCE_ID,
          index: 0,
          webview,
          element: { remove: () => {} },
          destroyed: false,
          captureLogOpen: false,
          huntOpen: false,
          farmRunState: '',
          captureArchive: new Map(),
          captureArchiveSignatures: new Map(),
          captureArchiveLoaded: true
        }, extra || {});
      };
      window.__contar = () => window.__llamadas.length;
      window.__vaciar = () => { window.__llamadas.length = 0; };

      const panel = window.__crearPanelFalso();
      const dentro = panelDentroDelJuego(panel);
      panels.length = 0;
      panels.push(panel);
      // Una segunda instancia mas alla de la primaria, para poder mirar "otra pestana".
      browserInstances.length = 0;
      browserInstances.push({ id: 'otra-pestana', name: 'Otra', url: 'about:blank', inicio: 'about:blank',
        count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto' });
      activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
      return { dentro, enLaLista: panels.length, activa: activeBrowserInstanceId,
        esLaMismaPantalla: panelEstaEnPantalla(panel) };
    })()`);

    comprobar(montado.dentro === true, 'la pantalla falsa la tiene el codigo por una pantalla del juego', JSON.stringify(montado));
    comprobar(montado.esLaMismaPantalla === true, 'y con la pestana del juego abierta, esta a la vista', JSON.stringify(montado));

    // =================================================================================
    console.log('\n--- 2. con la pantalla del juego A LA VISTA, el sondeo entra ---');
    let cuenta = await ventana.webContents.executeJavaScript(`(async () => {
      window.__vaciar();
      await pollCaptureNotifications();
      return window.__contar();
    })()`);
    comprobar(cuenta > 0, 'el sondeo de capturas lee la pantalla visible', `${cuenta} llamadas`);

    // =================================================================================
    console.log('\n--- 3. cambiando de pestana, el MISMO sondeo no lee nada ---');
    const oculta = await ventana.webContents.executeJavaScript(`(async () => {
      activeBrowserInstanceId = 'otra-pestana';
      window.__vaciar();
      await pollCaptureNotifications();
      return window.__contar();
    })()`);
    comprobar(oculta === 0, 'mirando otra pestana, no se inyecta ni un script en la cuenta', `${oculta} llamadas`);

    // Y al volver, vuelve a leer. Si esto fallara, el launcher se quedaria ciego para siempre.
    const vuelve = await ventana.webContents.executeJavaScript(`(async () => {
      activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
      window.__vaciar();
      await pollCaptureNotifications();
      return window.__contar();
    })()`);
    comprobar(vuelve > 0, 'y al volver a la pestana del juego, vuelve a leer', `${vuelve} llamadas`);

    // =================================================================================
    console.log('\n--- 4. el registro de capturas y el analizador, igual ---');
    const registros = await ventana.webContents.executeJavaScript(`(async () => {
      const panel = panels[0];
      panel.captureLogOpen = true;
      activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
      window.__vaciar();
      await pollCaptureLogs();
      const visible = window.__contar();
      activeBrowserInstanceId = 'otra-pestana';
      window.__vaciar();
      await pollCaptureLogs();
      const oculta = window.__contar();
      panel.captureLogOpen = false;
      return { visible, oculta };
    })()`);
    comprobar(registros.visible >= 0, 'el registro de capturas no falla con la pantalla a la vista', JSON.stringify(registros));
    comprobar(registros.oculta === 0, 'y con la pantalla oculta no lee el registro', `${registros.oculta} llamadas`);

    const cazador = await ventana.webContents.executeJavaScript(`(async () => {
      const panel = panels[0];
      panel.huntOpen = true;
      activeBrowserInstanceId = 'otra-pestana';
      window.__vaciar();
      await pollHuntAnalyzers();
      const oculta = window.__contar();
      activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
      window.__vaciar();
      await pollHuntAnalyzers();
      const visible = window.__contar();
      panel.huntOpen = false;
      return { visible, oculta };
    })()`);
    comprobar(cazador.oculta === 0, 'el analizador no lee con la pantalla oculta', `${cazador.oculta} llamadas`);
    comprobar(cazador.visible > 0, 'y si lee con la pantalla a la vista', `${cazador.visible} llamadas`);

    // =================================================================================
    console.log('\n--- 5. el sondeo de farmeo tambien ---');
    const farmeo = await ventana.webContents.executeJavaScript(`(async () => {
      activeBrowserInstanceId = PRIMARY_BROWSER_INSTANCE_ID;
      window.__vaciar();
      await refreshFarmContexts();
      const visible = window.__contar();
      activeBrowserInstanceId = 'otra-pestana';
      window.__vaciar();
      await refreshFarmContexts();
      const oculta = window.__contar();
      // Y el boton de forzar tiene que funcionar AUNQUE la cuenta no sea la activa: lo acaba de
      // pedir el usuario, asi que la regla de visibilidad no puede tragarselo.
      window.__vaciar();
      await refreshFarmContexts({ forcePokes: true, accountIndex: 0 });
      const forzado = window.__contar();
      return { visible, oculta, forzado };
    })()`);
    comprobar(farmeo.oculta === 0, 'el sondeo de farmeo no lee con la pantalla oculta', `${farmeo.oculta} llamadas`);
    comprobar(farmeo.visible > 0, 'y si lee con la pantalla a la vista', `${farmeo.visible} llamadas`);
    comprobar(farmeo.forzado > 0, 'y forzar una cuenta concreta funciona aunque no sea la activa', `${farmeo.forzado} llamadas`);

    // =================================================================================
    console.log('\n--- 6. el archivo de capturas ya no se copia entero en cada tic ---');
    const archivo = await ventana.webContents.executeJavaScript(`(() => {
      const panel = window.__crearPanelFalso();
      // Mil entradas: una foto de como queda un archivo en una sesion larga.
      for (let i = 0; i < 1000; i++) {
        panel.captureArchive.set('clave-' + i, { id: 'id-' + i, name: 'Pokemon ' + i });
      }
      // Cuenta cada vez que se LEE el archivo entero.
      let lecturas = 0;
      const original = panel.captureArchive.values.bind(panel.captureArchive);
      panel.captureArchive.values = function contar() { lecturas++; return original(); };

      // Una fila DE VERDAD, archivada por el propio codigo. La clave la pone el codigo, no la prueba:
      // antes la prueba se inventaba una clave y nunca coincidia, asi que el indice se construia
      // siempre y la comprobacion pedia lo imposible.
      archiveCaptureRows(panel, [{ name: 'Pikachu', id: 'pikachu-1' }]);
      const claves = [...panel.captureArchive.keys()];
      const guardada = panel.captureArchive.get(claves[claves.length - 1]);

      // El caso NORMAL: la misma fila otra vez, con su misma clave.
      const antes = lecturas;
      archiveCaptureRows(panel, [{ name: 'Pikachu', id: 'pikachu-1' }]);
      const lecturasCasoNormal = lecturas - antes;

      // El caso RARO: una fila cuya clave no esta. Aqui si hace falta el indice por id estable.
      const antes2 = lecturas;
      archiveCaptureRows(panel, [{ name: 'Charmander', id: 'charmander-1' }]);
      const lecturasCasoRaro = lecturas - antes2;

      return {
        lecturasCasoNormal,
        lecturasCasoRaro,
        total: panel.captureArchive.size,
        guardada: Boolean(guardada && guardada.name)
      };
    })()`);
    comprobar(archivo.lecturasCasoNormal === 0,
      'con una fila que YA esta en el archivo, no se lee ni una vez el archivo entero',
      JSON.stringify(archivo));
    comprobar(archivo.lecturasCasoRaro === 1,
      'y cuando de verdad hace falta el indice por id, se construye UNA vez',
      JSON.stringify(archivo));
    comprobar(archivo.guardada === true, 'y la fila se guarda con la clave que pone el codigo',
      JSON.stringify(archivo));
    comprobar(archivo.total === 1002, 'y el archivo ha crecido con las dos filas nuevas',
      JSON.stringify(archivo));

    console.log('\n--- 7. el relleno automatico del acceso tiene plazo ---');
    const acceso = await ventana.webContents.executeJavaScript(`(() => {
      // El nombre sale de buscarlo, no de acordarse: la primera vez se escribio
    // 'buildAutoLoginScript', que no existe, y la prueba dio verde sin comprobar nada.
    const codigo = typeof loginScript === 'function' ? String(loginScript) : '';
      return { tienePlazo: codigo.includes('__pokeGridSubmitWatcherVence'), hayFuncion: codigo.length > 0 };
    })()`);
    comprobar(acceso.hayFuncion, 'la funcion de relleno del acceso existe', JSON.stringify(acceso));
    comprobar(acceso.tienePlazo, 'y su sondeo de 500 ms tiene una hora de expiration', JSON.stringify(acceso));
  } catch (error) {
    console.log(`\nFALLO: ${error && error.message ? error.message : error}`);
    fallos.push(String(error && error.stack ? error.stack.split('\n').slice(0, 4).join(' ') : error));
  } finally {
    console.log(`\n=== ${fallos.length ? 'FALLAN ' + fallos.length : 'pasa todo'} ===`);
    fallos.forEach((f) => console.log(`  - ${f}`));
    app.exitCode = fallos.length ? 1 : 0;
    app.quit();
  }
});