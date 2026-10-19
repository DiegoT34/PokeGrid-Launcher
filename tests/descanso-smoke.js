// DORMIR LO QUE NO SE MIRA — areas A (descanso), B (cerrar de verdad) y D (mapas y escuchas).
//
// Por que esta prueba existe y no es unLuckypas: el launcher se comia 3.012 MB de los 8.070 MB de
// RAM y quemaba 341 % de CPU porque NADA de lo que hay en el programa decia «duermete». Medido en el
// equipo del usuario, con 22 procesos abiertos. These pruebas comprueban que ahora SI se dice, y que
// decirlo surte efecto de verdad: se mira el estado real del webContents, no una variable.
//
// LO QUE NO SE COMPRUEBA, y por que
//
// - Que el juego siga acumulando mientras duerme. Eso no se puede comprobar sin jugar, y es
//   justo lo que el usuario tiene que mirar. Aqui solo se comprueba que se duerme, que es lo que
//   se puede comprobar.
// - El tamano real del archivo de iconos: vive dentro de un `Map` local de main.js y no hay puerta
//   para mirar dentro. Se comprueba el tope por codigo y se dice que es una comprobacion de
//   codigo, no de comportamiento. Falsa seguridad es peor que no comprobar.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-descanso-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;
// El mismo nombre que usa src/main.js. Si uno cambia y el otro no, la prueba mira un fichero que no
// es el que se escribe y da verde sin comprobar nada.
const RUTA_PENDIENTES = 'particiones-pendientes.json';

require('../src/main.js');
const { app, BrowserWindow, webContents } = electronApi;

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
    console.log('\n--- 1. dos instancias de verdad, con sus webviews vivas ---');
    const ids = await ventana.webContents.executeJavaScript(`(async () => {
      const salida = { error: '' };
      try {
        window.confirm = () => true;
        browserInstances.length = 0;
        // La direccion va en 'inicio', no en 'url': en modo navegador lo que se carga es
        // instance.inicio, y si se deja vacio sale el buscador. Un dominio inventado no resuelve,
        // su carga falla con un error de DNS y la webview nunca llega a 'dom-ready' — o sea que
        // nunca tiene id y no hay nada que comprobar. Para esto hace falta una webview REALMENTE viva.
        const una = { id: 'descanso-una', name: 'Una', url: 'about:blank', inicio: 'about:blank',
          count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto' };
        const otra = { id: 'descanso-otra', name: 'Otra', url: 'about:blank', inicio: 'about:blank',
          count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto' };
        browserInstances.push(una, otra);
        renderBrowserInstanceTabs();
        createBrowserInstanceWorkspace(una, 0);
        createBrowserInstanceWorkspace(otra, 1);
        salida.vistas = Array.from(browserInstanceViews.keys());

        const esperarId = (panel) => new Promise((resolve) => {
          const t = Date.now();
          const cada = () => {
            let id = 0;
            try { id = Number(panel.webview?.getWebContentsId?.() || 0); } catch { id = 0; }
            if (id) return resolve(id);
            if (Date.now() - t > 25000) return resolve(0);
            setTimeout(cada, 200);
          };
          cada();
        });

        salida.ids = [
          await esperarId(browserInstanceViews.get('descanso-una').panels[0]),
          await esperarId(browserInstanceViews.get('descanso-otra').panels[0])
        ];
        salida.tieneLosDos = salida.ids.every(Boolean);
        activateBrowserInstance('descanso-una', { persist: false });
        salida.instanciaActiva = activeBrowserInstanceId;
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`);

    comprobar(!ids.error, 'las dos instancias se crean sin reventar', ids.error);
    comprobar(ids.tieneLosDos, 'las dos pantallas tienen webContents (llegan a dom-ready)', JSON.stringify(ids.ids));
    if (!ids.tieneLosDos || ids.error) {
      throw new Error('sin webviews no se puede comprobar nada de lo que viene');
    }

    // =================================================================================
    console.log('\n--- 2. la pantalla activa corre, la otra duerme ---');
    // true = NO atenuada = despierta. Se lee del webContents de verdad, no de una variable del
    // renderer: un `aplicarDescanso` que se ejecutara pero no llegara al proceso no se veria aqui.
    const leer = () => ids.ids.map((id) => {
      const contents = webContents.fromId(id);
      return contents && !contents.isDestroyed() ? contents.getBackgroundThrottling() : 'muerto';
    });

    // El estado de la atenuacion converge: el renderer decide, y la peticion va por IPC al proceso
    // principal, y de ahi al webContents. Un espera fija de 500 ms es una suposicion sobre cuanto
    // tarda, y por eso la comprobacion salia verde unas veces y fallaba otras — la segunda vez que
    // se corrio fallo la del medio con las dos pantallas despiertas. Se espera a que LLEGUE, con un
    // limite, y si no llega se dice que no llego. Un espera fija que a veces basta no es una
    // comprobacion: es una loteria.
    const esperarEstado = async (indice, valor, ms = 6000) => {
      const t0 = Date.now();
      let visto = null;
      while (Date.now() - t0 < ms) {
        visto = leer()[indice];
        if (visto === valor) return visto;
        await dormir(120);
      }
      return visto;
    };

    // OJO: executeJavaScript devuelve una promesa. Sin await se comparaba una promesa con un texto
    // y salía «[object Promise]»: un fallo de la prueba, no del launcher.
    const activa = await ventana.webContents.executeJavaScript('activeBrowserInstanceId');
    comprobar(activa === 'descanso-una', 'la instancia activa es la que se ha elegido', activa);
    await dormir(300);
    comprobar(leer()[0] === false, 'la pantalla de la instancia ACTIVA no esta atenuada', `getBackgroundThrottling()=${leer()[0]}`);
    comprobar(await esperarEstado(1, true) === true, 'la pantalla de la instancia QUE NO se mira si esta atenuada', `getBackgroundThrottling()=${leer()[1]}`);

    // Al cambiar de pestaña, el sueño cambia de sitio.
    await ventana.webContents.executeJavaScript(`activateBrowserInstance('descanso-otra', { persist: false })`);
    comprobar(await esperarEstado(0, true) === true, 'al cambiar de pestana, la anterior se duerme', `getBackgroundThrottling()=${leer()[0]}`);
    comprobar(await esperarEstado(1, false) === false, 'y la nueva se despierta', `getBackgroundThrottling()=${leer()[1]}`);

    // =================================================================================
    console.log('\n--- 3. la instancia principal duerme las pantallas del juego ---');
    // Las cuentas del juego son la instancia primaria. Mirando otra pestana, TIENEN que dormir: es
    // justo lo que se pidio, que los guiones solo lean y envien con su pantalla a la vista.
    await ventana.webContents.executeJavaScript(`activateBrowserInstance(PRIMARY_BROWSER_INSTANCE_ID, { persist: false })`);
    await dormir(400);
    await esperarEstado(0, true);
    await esperarEstado(1, true);
    const estado = leer();
    comprobar(estado.every((v) => v === true), 'mirando otra pestana, las dos pantallas duermen', JSON.stringify(estado));

    // =================================================================================
    console.log('\n--- 4. minimizar duerme todo ---');
    ventana.minimize();
    await dormir(900);
    const invitation = webContents.getAllWebContents().filter((c) => c !== ventana.webContents && !c.isDestroyed());
    const todosDormidos = invitation.length > 0 && invitation.every((c) => c.getBackgroundThrottling());
    comprobar(invitation.length > 0, 'hay invitados a los que mirar', `${invitation.length}`);
    comprobar(todosDormidos, 'con la ventana minimizada, TODOS duermen', `${invitation.filter((c) => c.getBackgroundThrottling()).length}/${invitation.length}`);
    ventana.restore();
    ventana.show();
    await dormir(900);

    // =================================================================================
    console.log('\n--- 5. cerrar una instancia DESTRUYE el proceso, no solo la quita del DOM ---');
    // Este es el fallo caro: quitar el elemento del DOM sin `destroy()` deja el proceso de Chromium
    // vivo. Se mide mirando si el webContents sigue existiendo despues de cerrar.
    await ventana.webContents.executeJavaScript(`activateBrowserInstance('descanso-una', { persist: false })`);
    await dormir(300);
    const cerrados = await ventana.webContents.executeJavaScript(`(() => {
      window.confirm = () => true;
      const id = 'descanso-una';
      const paneles = browserInstanceViews.get(id)?.panels || [];
      const antes = paneles.length;
      removeBrowserInstance(id);
      return { antes, quedan: browserInstanceViews.has(id), enLaLista: browserInstances.some((r) => r.id === id) };
    })()`);
    await dormir(900);
    comprobar(cerrados.antes === 1, 'habia una pantalla que cerrar', `antes=${cerrados.antes}`);
    comprobar(!cerrados.quedan && !cerrados.enLaLista, 'la instancia desaparece de verdad', JSON.stringify(cerrados));
    const contenidoDeLaCerrada = webContents.fromId(ids.ids[0]);
    comprobar(!contenidoDeLaCerrada || contenidoDeLaCerrada.isDestroyed(),
      'el webContents de la pantalla cerrada esta DESTRUIDO, no suelto en el DOM',
      contenidoDeLaCerrada ? `sigue vivo` : 'ya no existe');

    // El mapa de webContents no puede quedarse con un puntero a algo que ya no esta.
    const enElMapa = await ventana.webContents.executeJavaScript(
      `Array.from(panelesPorWebContentsId.keys()).includes(${ids.ids[0]})`
    );
    comprobar(enElMapa === false, 'y su entrada se ha quitado del mapa de webContents', `sigue dentro: ${enElMapa}`);

    // =================================================================================
    console.log('\n--- 6. cerrar una instancia ya NO borra su particion, y por que ---');
    // La particion se lee ANTES de cerrar, porque despues de `destroy()` el webview ya no contesta.
    const particiones = await ventana.webContents.executeJavaScript(`(() => {
      const paneles = browserInstanceViews.get('descanso-otra')?.panels || [];
      return paneles.map((p) => { try { return p.webview.getAttribute('partition') || ''; } catch { return ''; } });
    })()`);
    const particion = (particiones[0] || '').replace('persist:', '');
    // Desde la 0.37.0 la particion de una ventana es la de su PERFIL, y no se parece en nada a una
    // particion propia. Esta comprobacion pedia el nombre antiguo; el nombre nuevo es el correcto, y es
    // justamente lo que hace que cerrar una ventana no vacie la sesion de las demas del perfil.
    comprobar(particion.startsWith('pokegrid-perfil-'), 'la particion de la instancia es la de su perfil', particion);

    // Y se cierra la instancia. Con la pantalla viva, Windows tiene el `CdmStorage.db` abierto y el
    // borrado falla con EBUSY — que es exactamente lo que paso la
    // primera vez, y por lo que el proceso principal ahora reintenta unas veces.
    await ventana.webContents.executeJavaScript(`(() => { window.confirm = () => true; removeBrowserInstance('descanso-otra'); })()`);
    await dormir(900);

    // Lo que se pide ahora es lo CONTRARIO de antes: que al cerrar NO se haya borrado nada. La carpeta
    // se crea a proposito, antes de cerrar, para poder comprobar que sigue ahí.
    const destino = path.join(userDataDir, 'Partitions', particion);
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, 'relleno.txt'), 'x'.repeat(4096), 'utf8');
    comprobar(fs.existsSync(destino), 'la particion existe en disco');

    // Y que el proceso principal se niegue a borrarla si se le pide: es la proteccion que evita que
    // cerrar una ventana deje sin cookies a las demas que comparten perfil.
    const borrada = await ventana.webContents.executeJavaScript(
      `window.pokeGrid.borrarParticionDeInstancia('persist:${particion}')`
    );
    comprobar(borrada && borrada.ok === false
      && String(borrada.error || '').includes('no es de una instancia'),
    'el proceso principal se niega a borrar una particion de perfil', JSON.stringify(borrada));
    comprobar(fs.existsSync(destino), 'y la particion sigue intacta en disco');

    // Ahora, lo que de verdad importa: que la cola se vacie. Y aqui hay que ser honesto con lo que se
    // puede comprobar: dentro de ESTE proceso la particion sigue abierta por Chromium, y mientras
    // lo siga estando no hay forma de borrarla. Por eso la comprobacion no finge soltarla —la primera
    // version de esta prueba decia "simulo que ya no la tiene" sin soltarla, y fallaba— sino que
    // comprueba el mecanismo por el otro lado: una particion anotada y que nadie tiene abierta, que
    // es exactamente el caso del arranque siguiente.
    const sueltaCola = path.join(userDataDir, 'Partitions', 'pokegrid-instance-anotada-y-libre');
    fs.mkdirSync(sueltaCola, { recursive: true });
    fs.writeFileSync(path.join(sueltaCola, 'x.txt'), 'x', 'utf8');
    // La cola se monta AQUI, y no se espera que otro paso la haya dejado. Antes se dependia de que la
    // particion de la ventana quedara pillada y se anotara sola al intentar borrarla; desde la 0.37.0
    // esa particion es de perfil y el proceso principal se niega a borrarla —con razon, la comparten
    // otras ventanas—, asi que la cola ya no nace de ahi. La dejan las versiones anteriores, que si
    // dejaban particiones propias. Montarla aqui es lo que hace falta para poder comprobar el barrido,
    // que es lo unico que este bloque vigila.
    const colaActual = fs.existsSync(path.join(userDataDir, RUTA_PENDIENTES))
      ? JSON.parse(fs.readFileSync(path.join(userDataDir, RUTA_PENDIENTES), 'utf8')) : [];
    fs.writeFileSync(path.join(userDataDir, RUTA_PENDIENTES),
      JSON.stringify([...colaActual, 'pokegrid-instance-anotada-y-libre']), 'utf8');

    const barrido = await ventana.webContents.executeJavaScript('window.pokeGrid.borrarParticionesPendientes()');
    comprobar(Array.isArray(barrido.borradas) && barrido.borradas.includes('pokegrid-instance-anotada-y-libre'),
      'el barrido borra de verdad las particiones anotadas que ya no tiene nadie abiertas', JSON.stringify(barrido));
    comprobar(!fs.existsSync(sueltaCola), 'y el directorio ha desaparecido del disco');
    comprobar(!fs.existsSync(particion) || barrido.quedaron.includes(particion),
      'y la que sigue pillada se queda anotada, sin desaparecer en silencio',
      `quedaron: ${JSON.stringify(barrido.quedaron)}`);
    const colaFinal = JSON.parse(fs.readFileSync(path.join(userDataDir, RUTA_PENDIENTES), 'utf8'));
    comprobar(!colaFinal.includes('pokegrid-instance-anotada-y-libre'),
      'la lista se queda solo con lo que falta', JSON.stringify(colaFinal));

    // Y una particion que no la tiene nadie: esa se borra en el acto, sin esperar al arranque.
    const suelta = path.join(userDataDir, 'Partitions', 'pokegrid-instance-nadie-la-cierra');
    fs.mkdirSync(suelta, { recursive: true });
    fs.writeFileSync(path.join(suelta, 'x.txt'), 'x', 'utf8');
    const inmediata = await ventana.webContents.executeJavaScript(
      `window.pokeGrid.borrarParticionDeInstancia('persist:pokegrid-instance-nadie-la-cierra')`
    );
    comprobar(inmediata && inmediata.borrado === true, 'una particion que nadie tiene abierta se borra en el acto', JSON.stringify(inmediata));
    comprobar(!fs.existsSync(suelta), 'y no queda rastro');

    // Y que no se pueda usar para borrar cualquier cosa.
    const negada = await ventana.webContents.executeJavaScript(
      `window.pokeGrid.borrarParticionDeInstancia('persist:../')`
    );
    comprobar(negada && negada.ok === false, 'un nombre de particion invalido se rechaza', JSON.stringify(negada));

    // =================================================================================
    console.log('\n--- 7. el tope del archivo de iconos (comprobacion de codigo, no de comportamiento) ---');
    const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
    const tope = /const ICONOS_EN_CACHE = (\d+)/.exec(mainSource);
    comprobar(Boolean(tope), 'el tope del archivo de iconos esta declarado', tope ? tope[0] : 'no esta');
    comprobar(tope && Number(tope[1]) > 0 && Number(tope[1]) <= 500, 'y es un numero con sentido', tope ? tope[1] : '');
    comprobar(/while \(cacheDeIconos\.size > ICONOS_EN_CACHE\)/.test(mainSource), 'y hay algo que borra cuando se pasa');
    console.log('  AVISO  esto mira el CODIGO, no el comportamiento: el Map es local de main.js y no hay');
    console.log('         puerta para mirar dentro. Si el bucle no funciona, esta comprobacion sigue en verde.');
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