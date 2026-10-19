// Añadir y quitar pantallas de una instancia, y el botón de agrandar.
//
// LO QUE SE PIDIO
//
// 1. Botones para añadir y quitar una pantalla sin tener que borrar la instancia y crearla otra vez.
//    El menos cierra LA PANTALLA DE ESA BARRA, no la última: con cuatro, el menos de la tercera
//    cierra la tercera. El mínimo es una pantalla.
// 2. El botón de agrandar no aparece cuando la instancia tiene una sola pantalla.
// 3. Google por defecto en vez de DuckDuckGo.
//
// POR QUE ESTA PRUEBA MIRA EL DOM Y NO UNA VARIABLE
//
// Que `instance.count` valga 2 no dice que se hayan creado dos pantallas, ni que se puedan cerrar, ni
// que la instancia vuelva a abrir con dos. Eso solo se ve en el DOM y en lo que se guarda. La
// comprobacion que importa aqui es la ultima: cerrar una pantalla y reiniciar es el caso que falla
// cuando el numero se guarda a medias.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-pantallas-'));
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
    console.log('\n--- 1. una instancia con una sola pantalla ---');
    const inicial = await ventana.webContents.executeJavaScript(`(() => {
      window.confirm = () => true;
      browserInstances.length = 0;
      const inst = { id: 'pant-una', name: 'Con una', url: 'about:blank', inicio: 'about:blank',
        count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto' };
      browserInstances.push(inst);
      renderBrowserInstanceTabs();
      createBrowserInstanceWorkspace(inst, 0);
      activateBrowserInstance('pant-una', { persist: false });

      const view = browserInstanceViews.get('pant-una');
      const panel = view.panels[0];
      const barra = panel.element.querySelector('.browser-instance-panelbar');
      const menos = barra.querySelector('.instance-menos-pantalla');
      const mas = barra.querySelector('.instance-mas-pantalla');
      const agrandar = barra.querySelector('.instance-expand');
      return {
        error: '',
        hayMas: Boolean(mas),
        hayMenos: Boolean(menos),
        menosApagado: menos ? menos.disabled === true : null,
        // Visible de verdad: esta en el DOM y no esta escondido. Con un nombre de propiedad mal
        // escrito en la lectura, esto comparaba undefined contra true —siempre verde— y la
        // comprobacion no miraba nada. Por eso se lee el boton y se dice si se ve.
        agrandarVisible: Boolean(agrandar) && !agrandar.hidden,
        cuentaGuardada: inst.count,
        textos: { mas: mas?.title || '', menos: menos?.title || '' }
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!inicial.error, 'la instancia con una pantalla se crea sin reventar', inicial.error);
    comprobar(inicial.hayMas, 'el boton de AÑADIR pantalla esta en la barra', JSON.stringify(inicial.textos));
    comprobar(inicial.hayMenos, 'el boton de QUITAR pantalla esta en la barra');
    comprobar(inicial.menosApagado === true, 'con una sola pantalla, el menos esta apagado: no se puede quedar sin ninguna');
    comprobar(inicial.agrandarVisible === false, 'y el de agrandar NO se ve con una sola pantalla', `visible: ${inicial.agrandarVisible}`);
    comprobar(String(inicial.textos.mas).length > 0 && String(inicial.textos.menos).length > 0,
      'los dos botones dicen que hacen, no son solo un icono sin nombre', JSON.stringify(inicial.textos));

    // =================================================================================
    console.log('\n--- 2. añadir una pantalla con el botón ---');
    const trasAnadir = await ventana.webContents.executeJavaScript(`(async () => {
      const view = browserInstanceViews.get('pant-una');
      view.panels[0].element.querySelector('.instance-mas-pantalla').click();
      await new Promise((r) => setTimeout(r, 700));
      const inst = browserInstances.find((row) => row.id === 'pant-una');
      const v = browserInstanceViews.get('pant-una');
      const barras = [...v.workspace.querySelectorAll('.browser-instance-panelbar')];
      return {
        error: '',
        pantallas: v.panels.length,
        cuentaGuardada: inst.count,
        mosaico: v.workspace.dataset.viewCount,
        barras: barras.length,
        minusApagado: barras.map((b) => b.querySelector('.instance-menos-pantalla')?.disabled),
        agrandarEnCadaBarra: barras.map((b) => {
          const a = b.querySelector('.instance-expand');
          return a ? !a.hidden : null;
        }),
        origenes: v.panels.map((p) => p.origen || 'inicial')
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!trasAnadir.error, 'el botón de añadir no revienta', trasAnadir.error);
    comprobar(trasAnadir.pantallas === 2, 'ahora hay dos pantallas de verdad en la instancia', JSON.stringify(trasAnadir));
    comprobar(trasAnadir.barras === 2, 'y dos barras, una por pantalla', `${trasAnadir.barras}`);
    comprobar(trasAnadir.cuentaGuardada === 2, 'el numero guardado pasa a 2', `${trasAnadir.cuentaGuardada}`);
    comprobar(trasAnadir.mosaico === '2', 'y el mosaico se entera', `${trasAnadir.mosaico}`);
    comprobar(trasAnadir.minusApagado.every((v) => v === false),
      'con dos pantallas, el menos de las dos se enciende', JSON.stringify(trasAnadir.minusApagado));
    comprobar(trasAnadir.agrandarEnCadaBarra.every((v) => v === true),
      'y el botón de agrandar aparece en las dos barras', JSON.stringify(trasAnadir.agrandarEnCadaBarra));

    // =================================================================================
    console.log('\n--- 3. quitar LA PANTALLA DE ESA BARRA, no la última ---');
    const trasQuitar = await ventana.webContents.executeJavaScript(`(async () => {
      const view = browserInstanceViews.get('pant-una');
      const victima = view.panels[1];
      const supervivientes = view.panels[0];
      const particionVictima = victima.webview.getAttribute('partition');
      const particionSobreviviente = supervivientes.webview.getAttribute('partition');
      victima.element.querySelector('.instance-menos-pantalla').click();
      await new Promise((r) => setTimeout(r, 700));
      const inst = browserInstances.find((row) => row.id === 'pant-una');
      const v = browserInstanceViews.get('pant-una');
      return {
        error: '',
        pantallas: v.panels.length,
        cuentaGuardada: inst.count,
        mosaico: v.workspace.dataset.viewCount,
        // La que se cerraba no puede seguir en el DOM, y la otra tiene que seguir intacta.
        laVictimaSigueEnElDom: v.workspace.contains(victima.element),
        laOtraSigue: v.panels.includes(supervivientes),
        particionesDistintas: particionVictima !== particionSobreviviente,
        menosApagado: v.panels.every((p) => p.element.querySelector('.instance-menos-pantalla')?.disabled === true)
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));

    comprobar(!trasQuitar.error, 'el botón de quitar no revienta', trasQuitar.error);
    comprobar(trasQuitar.pantallas === 1, 'vuelve a quedar una pantalla', JSON.stringify(trasQuitar));
    comprobar(trasQuitar.laVictimaSigueEnElDom === false, 'la pantalla cerrada desaparece de verdad');
    comprobar(trasQuitar.laOtraSigue === true, 'la otra pantalla NO se ha visto afectada');
    comprobar(trasQuitar.cuentaGuardada === 1, 'el numero guardado vuelve a 1', `${trasQuitar.cuentaGuardada}`);
    comprobar(trasQuitar.mosaico === '1', 'y el mosaico tambien');
    comprobar(trasQuitar.menosApagado === true, 'y el menos se apaga otra vez al quedar una');

    // =================================================================================
    console.log('\n--- 4. se quedan paginas distintas para pantallas distintas ---');
    // El fallo que haria esto: renumerar al cerrar. Si la tercera pasa a ser la segunda, las dos
    // pantallas que quedan comparten particion y una pierde su sesion.
    await ventana.webContents.executeJavaScript(`(() => {
      const view = browserInstanceViews.get('pant-una');
      view.panels[0].element.querySelector('.instance-mas-pantalla').click();
      view.panels[0].element.querySelector('.instance-mas-pantalla').click();
      return true;
    })()`);
    await dormir(500);
    const trasDos = await ventana.webContents.executeJavaScript(`(() => {
      const view = browserInstanceViews.get('pant-una');
      const v = browserInstanceViews.get('pant-una');
      return {
        indices: v.panels.map((p) => p.instanceIndex),
        particiones: v.panels.map((p) => p.webview.getAttribute('partition'))
      };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));
    comprobar(new Set(trasDos.indices || []).size === (trasDos.indices || []).length,
      'tres pantallas, tres indices distintos', JSON.stringify(trasDos.indices));
    // Las tres pantallas de una ventana COMPARTEN la particion de su perfil. Antes cada pantalla tenia
    // la suya —`persist:pokegrid-instance-<id>-<n>`— y por eso se podian tener cuentas distintas de la
    // misma web en dos pantallas de la misma ventana. Desde la 0.37.0 eso se decide con el PERFIL de la
    // ventana: quien quiere dos cuentas distintas pone una pantalla en un perfil y la otra en otro.
    // Compartir aqui es lo correcto, y es justo lo que hace que entrar una vez sirva para todas.
    comprobar(new Set(trasDos.particiones || []).size === 1
      && String((trasDos.particiones || [])[0] || '').startsWith('persist:pokegrid-perfil-'),
      'las tres pantallas comparten la sesion del perfil de la ventana',
      JSON.stringify(trasDos.particiones));
    comprobar((trasDos.particiones || []).every((p) => !String(p).startsWith('persist:pokegrid-instance-')),
      'y ninguna usa ya una particion propia, que es lo que se borraria al cerrar',
      JSON.stringify(trasDos.particiones));

    // Y al cerrar la del medio, las que quedan conservan las suyas.
    const trasCerrarMedio = await ventana.webContents.executeJavaScript(`(async () => {
      const v = browserInstanceViews.get('pant-una');
      const antes = v.panels.map((p) => p.instanceIndex);
      const medio = v.panels[1];
      medio.element.querySelector('.instance-menos-pantalla').click();
      await new Promise((r) => setTimeout(r, 700));
      const w = browserInstanceViews.get('pant-una');
      return { error: '', antes, despues: w.panels.map((p) => p.instanceIndex) };
    })()`).catch((e) => ({ error: String(e && e.message ? e.message : e) }));
    comprobar(!trasCerrarMedio.error, 'cerrar la del medio no revienta', trasCerrarMedio.error);
    comprobar(trasCerrarMedio.despues && trasCerrarMedio.despues.length === 2
      && trasCerrarMedio.despues.every((indice) => trasCerrarMedio.antes.includes(indice)),
      'las que quedan conservan su indice: no se renumeran', JSON.stringify(trasCerrarMedio));

    // =================================================================================
    console.log('\n--- 5. el motor por defecto ahora es Google ---');
    const motor = await ventana.webContents.executeJavaScript(`(() => {
      return {
        porDefecto: BUSCADOR_POR_DEFECTO,
        hayGoogle: BUSCADORES.google || '',
        motorDelBoton: document.querySelector('.navegacion-motor')?.dataset.motor || ''
      };
    })()`);
    comprobar(motor.porDefecto === 'google', 'el buscador por defecto es Google', `vale "${motor.porDefecto}"`);
    comprobar(/google\.com/.test(motor.hayGoogle), 'y la direccion de Google esta en la lista', motor.hayGoogle);

    // =================================================================================
    console.log('\n--- 6. lo guardado sobrevive: el numero de pantallas se guarda de verdad ---');
    // Si `count` se guarda pero la lista de instancias no, al reabrir sale una instancia con el
    // numero viejo. Se lee lo que hay en localStorage, que es lo que se usa al arrancar.
    const guardado = await ventana.webContents.executeJavaScript(`(() => {
      const crudo = localStorage.getItem(BROWSER_INSTANCES_KEY);
      const lista = JSON.parse(crudo || '[]');
      const fila = lista.find((row) => row.id === 'pant-una');
      return { error: '', guardado: fila ? fila.count : null };
    })()`);
    comprobar(!guardado.error, 'la lista de instancias se puede leer', guardado.error);
    comprobar(guardado.guardado === 2, 'y la instancia guardada tiene 2 pantallas, no 1 ni el numero inicial', `guardado: ${guardado.guardado}`);
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