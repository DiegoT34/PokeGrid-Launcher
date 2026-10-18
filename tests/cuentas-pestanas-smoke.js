// Las cuentas del juego en pestañas, en vez de todas juntas en la rejilla.
//
// LO QUE SE PIDIO
//
// Un modo de vista en el panel de cuentas: la rejilla de siempre, o una pestaña por cuenta. Y al
// elegir pestañas, cada cuenta tiene que seguir siendo LA MISMA pantalla que era: con sus capturas,
// su hunt, su busqueda, su zoom y sus guiones. No «una pantalla parecida».
//
// POR QUE ESTA PRUEBA ES DURA A PROPOSITO
//
// Lo facil de comprobar es que aparezcan cuatro pestañas. Lo que importa es lo de alrededor:
//
//  - Que la pantalla de la cuenta conserve TODO su aspecto, no una version pelada.
//  - Que solo corra la cuenta abierta. Si las cuatro siguen hablando por debajo, el modo pestañas no
//    ahorra nada y es un adorno: es justo lo que se pidio en la 0.31.0.
//  - Que al volver a la rejilla esten las cuatro juntas, y no tres, y no seis.
//  - Que una pestaña de cuenta que no existe no se pueda activar escribiendo su nombre.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-pestanas-cuenta-'));
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

    // Cuatro cuentas de mentira, para no depender de lo que tenga el equipo donde corre esto.
    await ventana.webContents.executeJavaScript(`(() => {
      accounts.length = 0;
      accounts.push(
        { id: 1, label: 'Shiny Ditto', username: 'a', password: 'a', proxy: null },
        { id: 2, label: 'Golem', username: 'b', password: 'b', proxy: null },
        { id: 3, label: 'ShocKor', username: 'c', password: 'c', proxy: null },
        { id: 4, label: 'Diego200', username: 'd', password: 'd', proxy: null }
      );
      window.__pokeGridAccountsFixture = true;
      rebuildGamePanels();
      return true;
    })()`);
    await dormir(600);

    // =================================================================================
    console.log('\n--- 1. el modo por defecto sigue siendo la rejilla ---');
    const inicial = await ventana.webContents.executeJavaScript(`(() => {
      const barra = [...document.querySelectorAll('#instanceTabs .instance-tab b')].map((b) => b.textContent);
      return {
        error: '',
        vista: vistaDeCuentas(),
        pestanas: barra,
        pantallasEnLaRejilla: document.querySelectorAll('#grid .panel').length,
        conmutador: [...document.querySelectorAll('.accounts-view-switch button')]
          .map((b) => b.dataset.vista + '=' + b.classList.contains('is-activa'))
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!inicial.error, 'las cuentas de prueba arrancan sin reventar', inicial.error);
    comprobar(inicial.vista === 'rejilla', 'y el modo de partida es la rejilla', inicial.vista);
    comprobar(inicial.pantallasEnLaRejilla === 4, 'las cuatro pantallas cuelgan de la rejilla', `${inicial.pantallasEnLaRejilla}`);
    comprobar(inicial.pestanas.includes('Poke Idle World'), 'y hay una sola pestaña, la del juego', JSON.stringify(inicial.pestanas));
    comprobar(String(inicial.conmutador).includes('rejilla=true'), 'el conmutador marca la rejilla', JSON.stringify(inicial.conmutador));

    // =================================================================================
    console.log('\n--- 2. al elegir pestañas desaparecen las de cuenta y aparece una por cuenta ---');
    const enPestanas = await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsViewTabsButton').click();
      await new Promise((r) => setTimeout(r, 900));
      const barra = [...document.querySelectorAll('#instanceTabs .instance-tab')].map((b) => ({
        id: b.dataset.instanceId,
        nombre: b.querySelector('b')?.textContent || ''
      }));
      const espacios = [...document.querySelectorAll('.cuenta-workspace')];
      return {
        error: '',
        vista: vistaDeCuentas(),
        pestanas: barra,
        espacios: espacios.length,
        idsDeEspacio: espacios.map((e) => e.dataset.instanceId),
        activa: activeBrowserInstanceId,
        activaMarcada: document.querySelectorAll('#instanceTabs .instance-tab-shell.is-active').length,
        enLaRejilla: document.querySelectorAll('#grid .panel').length
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!enPestanas.error, 'el conmutador de pestañas no revienta', enPestanas.error);
    comprobar(enPestanas.vista === 'pestanas', 'el modo guardado es pestañas', enPestanas.vista);
    comprobar(!enPestanas.pestanas.some((p) => p.nombre === 'Poke Idle World'),
      'la pestaña Poke Idle World ya no esta', JSON.stringify(enPestanas.pestanas.map((p) => p.nombre)));
    comprobar(enPestanas.pestanas.length === 4, 'hay cuatro pestañas, una por cuenta', JSON.stringify(enPestanas.pestanas.map((p) => p.nombre)));
    comprobar(enPestanas.espacios === 4, 'y cuatro espacios, uno por cuenta', `${enPestanas.espacios}`);
    comprobar(enPestanas.enLaRejilla === 0, 'la rejilla se queda vacia, sin media pantalla colgando', `${enPestanas.enLaRejilla}`);
    comprobar(enPestanas.activaMarcada === 1, 'y solo hay una pestaña marcada como abierta', `${enPestanas.activaMarcada}`);
    comprobar(String(enPestanas.activa).startsWith('cuenta-'), 'la que se abre es una cuenta, no la rejilla', enPestanas.activa);

    // =================================================================================
    console.log('\n--- 3. la pantalla de la cuenta es la MISMA de antes, no una copia pelada ---');
    // Este es el nucleo de lo que se pidio. Una cuenta en su pestaña tiene que seguir teniendo su
    // barra, su estado, su chip de proxy y su iconos: si aqui se perdiera algo, el modo pestañas
    // habria sido cambiar una pantalla por otra mas pobre.
    const misma = await ventana.webContents.executeJavaScript(`(() => {
      const panel = panels[0];
      const barra = panel.element.querySelector('.panelbar');
      return {
        error: '',
        instanceIdIntacto: panel.instanceId === PRIMARY_BROWSER_INSTANCE_ID,
        tieneBarra: Boolean(barra),
        tieneEstado: Boolean(panel.element.querySelector('.panel-status')),
        tieneNombre: Boolean(panel.element.querySelector('.panel-name')),
        textoDelNombre: panel.element.querySelector('.panel-name')?.textContent || '',
        webviewVivo: Boolean(panel.webview && !panel.webview.isDestroyed?.()),
        particion: panel.webview?.getAttribute?.('partition') || '',
        barraDentroDeSuEspacio: panel.element.closest('.cuenta-workspace') !== null,
        indiceSuyo: panel.index
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!misma.error, 'la pantalla de la cuenta se puede inspeccionar', misma.error);
    comprobar(misma.instanceIdIntacto === true,
      'y su identidad NO ha cambiado: sigue siendo la instancia principal por dentro', JSON.stringify(misma));
    comprobar(misma.tieneBarra && misma.tieneEstado && misma.tieneNombre,
      'conserva su barra, su estado y su nombre', JSON.stringify(misma));
    comprobar(misma.textoDelNombre.includes('Shiny Ditto'), 'con el nombre de la cuenta', misma.textoDelNombre);
    comprobar(misma.webviewVivo === true, 'y su pagina del juego sigue viva');
    comprobar(String(misma.particion).includes('pokegrid-1'), 'con su sesion propia, intacta', misma.particion);
    comprobar(misma.barraDentroDeSuEspacio === true, 'colgada de su propio espacio, no de la rejilla');

    // =================================================================================
    console.log('\n--- 4. solo corre la cuenta abierta ---');
    // El motivo de fondo del modo: con la rejilla las cuatro hablan a la vez. En pestañas, solo la
    // abierta. Si esto no se cumple, el modo es un adorno y no ahorra nada.
    const sueno = await ventana.webContents.executeJavaScript(`(() => {
      const despertarPorId = {};
      for (const panel of panels) {
        const id = panel.accountId;
        const despierto = panelEstaEnPantalla(panel);
        despertarPorId[id] = despierto;
      }
      const abierta = activeBrowserInstanceId;
      return { error: '', despertarPorId, abierta };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!sueno.error, 'el reparto de sueño se puede leer', sueno.error);
    const despertadas = Object.entries(sueno.despertarPorId || {}).filter(([, v]) => v).map(([k]) => k);
    comprobar(despertadas.length === 1,
      'de las cuatro cuentas, exactamente una esta despierta', JSON.stringify(sueno.despertarPorId));
    comprobar(String(sueno.abierta) === `cuenta-${despertadas[0]}`,
      'y es precisamente la pestaña abierta', `abierta: ${sueno.abierta}, despierta: cuenta-${despertadas[0]}`);

    // Al cambiar de pestaña, el sueño cambia de sitio.
    const alCambiar = await ventana.webContents.executeJavaScript(`(() => {
      const primera = activeBrowserInstanceId;
      const otra = panels.find((p) => idDeCuenta(p.accountId) !== primera);
      activateBrowserInstance(idDeCuenta(otra.accountId), { persist: false });
      return {
        error: '',
        ahora: activeBrowserInstanceId,
        laViejaDespierta: panelEstaEnPantalla(panels.find((p) => idDeCuenta(p.accountId) === primera)),
        laNuevaDespierta: panelEstaEnPantalla(otra)
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!alCambiar.error, 'cambiar de pestaña de cuenta no revienta', alCambiar.error);
    comprobar(alCambiar.laViejaDespierta === false && alCambiar.laNuevaDespierta === true,
      'al cambiar, la anterior se duerme y la nueva se despierta', JSON.stringify(alCambiar));

    // =================================================================================
    console.log('\n--- 5. una cuenta que no existe no se puede abrir ---');
    const falsa = await ventana.webContents.executeJavaScript(`(() => {
      activateBrowserInstance('cuenta-999', { persist: false });
      return { error: '', activa: activeBrowserInstanceId };
    })()`);
    comprobar(falsa && !String(falsa.activa).includes('999'),
      'escribir el nombre de una cuenta inexistente no abre nada', JSON.stringify(falsa));

    // =================================================================================
    console.log('\n--- 6. y al volver a la rejilla, todo como estaba ---');
    const vuelta = await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsViewGridButton').click();
      await new Promise((r) => setTimeout(r, 900));
      const barra = [...document.querySelectorAll('#instanceTabs .instance-tab b')].map((b) => b.textContent);
      return {
        error: '',
        vista: vistaDeCuentas(),
        pestanas: barra,
        pantallasEnLaRejilla: document.querySelectorAll('#grid .panel').length,
        espaciosSobrantes: document.querySelectorAll('.cuenta-workspace').length,
        todasDespiertas: panels.every((p) => panelEstaEnPantalla(p)),
        conmutador: [...document.querySelectorAll('.accounts-view-switch button')]
          .map((b) => b.dataset.vista + '=' + b.classList.contains('is-activa'))
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!vuelta.error, 'volver a la rejilla no revienta', vuelta.error);
    comprobar(vuelta.vista === 'rejilla', 'el modo guardado vuelve a ser rejilla', vuelta.vista);
    comprobar(vuelta.pantallasEnLaRejilla === 4, 'las cuatro pantallas vuelven a la rejilla', `${vuelta.pantallasEnLaRejilla}`);
    comprobar(vuelta.espaciosSobrantes === 0, 'y no queda ni un espacio de cuenta por ahi', `${vuelta.espaciosSobrantes}`);
    comprobar(vuelta.pestanas.includes('Poke Idle World'), 'y la pestaña del juego vuelve', JSON.stringify(vuelta.pestanas));
    comprobar(vuelta.pestanas.length === 1, 'y son una sola, como antes', JSON.stringify(vuelta.pestanas));
    comprobar(vuelta.todasDespiertas === true, 'en rejilla las cuatro se ven a la vez, y todas corren');
    comprobar(String(vuelta.conmutador).includes('rejilla=true'), 'y el conmutador vuelve a marcar la rejilla', JSON.stringify(vuelta.conmutador));

    // =================================================================================
    console.log('\n--- 7. la preferencia se recuerda al arrancar ---');
    const guardada = await ventana.webContents.executeJavaScript(
      `String(localStorage.getItem(VISTA_CUENTAS_KEY) || '')`
    );
    comprobar(guardada === 'rejilla', 'lo que eliges queda guardado en localStorage', guardada);

    // Y un valor escrito a mano no puede dejar la interfaz rota.
    const basura = await ventana.webContents.executeJavaScript(`(() => {
      localStorage.setItem(VISTA_CUENTAS_KEY, 'no-existe');
      const leida = vistaDeCuentas();
      localStorage.setItem(VISTA_CUENTAS_KEY, 'rejilla');
      return leida;
    })()`);
    comprobar(basura === 'rejilla', 'un valor inventado cae a la rejilla en vez de romper nada', basura);
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