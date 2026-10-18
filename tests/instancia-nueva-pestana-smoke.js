// El diálogo de nueva pestaña y el botón de motor de búsqueda.
//
// TRES COSAS QUE SE PIDIERON
//
// 1. En modo navegador no se pregunta el nombre: lo pone la página. Eso trae algo nuevo â€”el nombre
//    tiene que seguir al título según navegasâ€” y se prueba aqui.
// 2. El diálogo pasa a llamarse «Nueva pestaña», con el modo primero y solo los campos que aplican.
// 3. Un botón con la marca del motor en la barra de cada pantalla, que cambia el motor y persiste.
//
// LO QUE NO SE COMPRUEBA
//
// La descarga de la marca del motor: van dentro del launcher, asi que no hay nada que descargar. Lo
// que si se comprueba es que el botón enseña la marca del motor que toca, que ofrece los tres, y
// que elegir uno se guarda en la instancia.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-nueva-'));
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
      const listo = await ventana.webContents.executeJavaScript(
        'window.__arranqueVista === "ok"'
      ).catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    // =================================================================================
    console.log('--- 1. el diálogo: modo primero y sin nombre en navegador ---');
    const dialogo = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        openBrowserInstanceModal();
        salida.titulo = document.querySelector('#browserInstanceTitle').textContent.trim();
        salida.eyebrow = document.querySelector('.browser-instance-modal .eyebrow').textContent.trim();

        // Los dos botones de modo, para elegir de un vistazo.
        const instancia = document.querySelector('#browserInstanceModeInstancia');
        const navegador = document.querySelector('#browserInstanceModeNavegador');
        salida.hayDosBotonesDeModo = Boolean(instancia && navegador);
        salida.modoPorDefecto = browserInstanceMode.value;

        const leer = () => ({
          nombreOculto: document.querySelector('.browser-instance-name-field').hidden,
          nombreObligatorio: browserInstanceName.required,
          enlaceOculto: browserInstanceUrlField.hidden,
          enlaceObligatorio: browserInstanceUrl.required
        });

        navegador.click();
        salida.enNavegador = leer();
        instancia.click();
        salida.enInstancia = leer();
        salida.modoTrasInstancia = browserInstanceMode.value;

        // Y el boton que se pulsa queda marcado, para saber cual esta elegido.
        navegador.click();
        salida.marcadoNavegador = navegador.classList.contains('is-elegido');
        salida.marcadoInstancia = instancia.classList.contains('is-elegido');
        closeBrowserInstanceModal();
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al abrir el diálogo');
      return null;
    });

    if (dialogo && dialogo.error) {
      console.log(`\\nFALLO dentro de la pagina: ${dialogo.error}`);
      fallos.push('el diálogo revienta: ' + dialogo.error);
    }
    if (dialogo && !dialogo.error) {
      comprobar(dialogo.titulo === 'Nueva pestaña',
        'el diálogo se llama Nueva pestaña', JSON.stringify(dialogo.titulo));
      comprobar(dialogo.hayDosBotonesDeModo,
        'y el modo se elige con dos botones, no con un desplegable',
        JSON.stringify(dialogo.hayDosBotonesDeModo));
      comprobar(dialogo.enNavegador.nombreOculto && dialogo.enNavegador.nombreObligatorio === false,
        'en modo navegador no se pregunta el nombre: lo pone la página',
        JSON.stringify(dialogo.enNavegador));
      // En modo navegador se esconde el enlace TAMBIEN, no solo el nombre. Lo que pide esta prueba
      // —que el enlace se vea y no sea obligatorio— era como estaba antes de que se escondiera; se
      // esconde porque en ese modo no hay nada que escribir: se arranca en el buscador. Y el nombre
      // NO lleva `required` en ningun modo, a proposito: antes se escribia «Ej. Poke Idle World» de
      // ejemplo y todas las pestañas acababan con un nombre de ejemplo.
      comprobar(dialogo.enNavegador.enlaceOculto && dialogo.enNavegador.enlaceObligatorio === false,
        'y el enlace tampoco: en ese modo se arranca en el buscador', JSON.stringify(dialogo.enNavegador));
      comprobar(!dialogo.enInstancia.nombreOculto && dialogo.enInstancia.nombreObligatorio === false
        && !dialogo.enInstancia.enlaceOculto && dialogo.enInstancia.enlaceObligatorio === true,
        'y en modo instancia solo el enlace es obligatorio: el nombre se pone a mano o lo pone la página',
        JSON.stringify(dialogo.enInstancia));
      comprobar(dialogo.marcadoNavegador && !dialogo.marcadoInstancia,
        'el botón elegido queda marcado', JSON.stringify(dialogo));
    }

    // =================================================================================
    console.log('\\n--- 2. el nombre sigue a la página ---');
    const titulo = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        browserInstances.length = 0;
        const nav = {
          id: 'titulo-nav', name: 'Sin nombre', url: 'https://ejemplo.invalid/',
          count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: ''
        };
        const fijo = {
          id: 'titulo-fijo', name: 'Nombre puesto a mano', url: 'https://ejemplo.invalid/',
          count: 1, modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
        };
        browserInstances.push(nav, fijo);
        renderBrowserInstanceTabs();

        const panelNav = createBrowserInstanceWorkspace(nav, 0).panels[0];
        const panelFijo = createBrowserInstanceWorkspace(fijo, 1).panels[0];
        const nombreDeLaPestana = (id) =>
          document.querySelector('[data-instance-id="' + id + '"] .instance-tab b')?.textContent || '';

        salida.antes = nombreDeLaPestana('titulo-nav');
        tituloDePagina(panelNav, 'Poke Idle World â€” Inicio');
        salida.despues = nombreDeLaPestana('titulo-nav');
        salida.enLaLista = browserInstances.find((f) => f.id === 'titulo-nav').name;

        // Y en modo instancia NO se toca: ahi el nombre lo pone quien la crea.
        tituloDePagina(panelFijo, 'Otro titulo cualquiera');
        salida.elFijo = nombreDeLaPestana('titulo-fijo');

        // Un titulo vacio no borra el que hay.
        tituloDePagina(panelNav, '   ');
        salida.conTituloVacio = nombreDeLaPestana('titulo-nav');
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al renombrar');
      return null;
    });

    if (titulo && titulo.error) {
      console.log(`\\nFALLO dentro de la pagina: ${titulo.error}`);
      fallos.push('el renombrado revienta: ' + titulo.error);
    }
    if (titulo && !titulo.error) {
      comprobar(titulo.despues === 'Poke Idle World â€” Inicio',
        'en modo navegador la pestaña se llama como la página',
        JSON.stringify(titulo.despues));
      comprobar(titulo.enLaLista === 'Poke Idle World â€” Inicio',
        'y el nombre nuevo queda en la lista que se guarda', JSON.stringify(titulo.enLaLista));
      comprobar(titulo.elFijo === 'Nombre puesto a mano',
        'y en modo instancia no se le cambia el nombre a nadie',
        JSON.stringify(titulo.elFijo));
      comprobar(titulo.conTituloVacio === 'Poke Idle World â€” Inicio',
        'un título vacío no deja la pestaña sin nombre',
        JSON.stringify(titulo.conTituloVacio));
    }

    // =================================================================================
    console.log('\\n--- 3. el botón del motor de búsqueda ---');
    const motor = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      try {
        browserInstances.length = 0;
        const nav = {
          id: 'motor-nav', name: 'Motor', url: 'https://ejemplo.invalid/',
          count: 2, modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: ''
        };
        const fijo = {
          id: 'motor-fijo', name: 'Fijo', url: 'https://ejemplo.invalid/',
          count: 1, modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
        };
        browserInstances.push(nav, fijo);
        renderBrowserInstanceTabs();
        const view = createBrowserInstanceWorkspace(nav, 0);
        const viewFijo = createBrowserInstanceWorkspace(fijo, 1);

        const boton = view.panels[0].botonMotor;
        salida.hayBoton = Boolean(boton);
        salida.marcaInicial = boton?.dataset.motor || '';
        salida.dibujo = Boolean(boton?.querySelector('svg, .motor-marca'));
        // En modo instancia no hay barra, asi que tampoco boton de motor.
        salida.enModoInstancia = Boolean(viewFijo.panels[0].botonMotor);

        // Los tres, y elegir uno.
        boton.click();
        salida.opciones = [...document.querySelectorAll('.navegacion-motor-menu [data-motor]')]
          .map((n) => n.dataset.motor);
        document.querySelector('.navegacion-motor-menu [data-motor="bing"]').click();

        salida.marcaTrasElegir = boton.dataset.motor;
        salida.enLaLista = browserInstances.find((f) => f.id === 'motor-nav').buscador;
        salida.enDisco = (JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]')
          .find((f) => f.id === 'motor-nav') || {}).buscador || '';
        salida.menuCerrado = document.querySelector('.navegacion-motor-menu')?.hidden !== false;
        salida.otraPantalla = view.panels[1].botonMotor?.dataset.motor || '';
      } catch (e) {
        salida.error = String(e && e.stack ? e.stack.split('\\n').slice(0, 3).join(' ') : e);
      }
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al cambiar el motor');
      return null;
    });

    if (motor && motor.error) {
      console.log(`\\nFALLO dentro de la pagina: ${motor.error}`);
      fallos.push('el motor revienta: ' + motor.error);
    }
    if (motor && !motor.error) {
      comprobar(motor.hayBoton && motor.dibujo && motor.marcaInicial === 'ddg',
        'cada pantalla en modo navegador lleva el botón con la marca del motor que usa',
        JSON.stringify({ hay: motor.hayBoton, marca: motor.marcaInicial, dibujo: motor.dibujo }));
      comprobar(!motor.enModoInstancia,
        'y en modo instancia no hay botón, porque no hay barra', JSON.stringify(motor.enModoInstancia));
      comprobar(JSON.stringify(motor.opciones) === JSON.stringify(['ddg', 'google', 'bing']),
        'al pulsarlo se ofrecen los tres motores', JSON.stringify(motor.opciones));
      comprobar(motor.marcaTrasElegir === 'bing',
        'elegir uno cambia la marca del botón', JSON.stringify(motor.marcaTrasElegir));
      comprobar(motor.enLaLista === 'bing' && motor.enDisco === 'bing',
        'y queda guardado en la instancia, así que persiste',
        `${motor.enLaLista} / ${motor.enDisco}`);
      comprobar(motor.menuCerrado,
        'el menú se cierra al elegir', JSON.stringify(motor.menuCerrado));
      comprobar(motor.otraPantalla === 'bing',
        'y la otra pantalla de la misma instancia queda con el mismo motor: es de la instancia, no de la pantalla',
        JSON.stringify(motor.otraPantalla));
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
    ? 'El diálogo de nueva pestaña y el motor de búsqueda.'
    : `${fallos.length} comprobaciones fallan:\\n  - ${fallos.join('\\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
