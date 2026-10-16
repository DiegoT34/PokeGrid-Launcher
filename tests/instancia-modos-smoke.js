// Los dos modos de instancia.
//
// POR QUÉ EXISTE
//
// Hasta la 0.28.0 una instancia se llamaba «de navegador» si traía un booleano, y ese booleano
// decidía dos cosas a la vez: si llevaba barra y por dónde arrancaba. Eso no es un modo, es un
// campo con dos significados: el de juego —una URL, todas sus pantallas igual, sin barra— y el
// de navegación —barra en cada pantalla y arranque en el buscador— no tienen nada en común.
//
// Aquí se prueban las dos mitades del modo: que el registro lo guarde y que lo traduzca solo
// cuando viene de una versión vieja, y que el modal de creación se comporte como tiene que
// comportarse. Nada de este fichero toca el proceso principal.
//
// Lo que se guarda se prueba con la función que guarda, no con el modal: el modal exige una URL
// https de verdad y aquí lo que importa es el modelo.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-modos-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

// El launcher de verdad: el modal y el modelo viven en el renderer de la ventana principal, y
// probarlos contra una ventana montada a mano no tocaría el código que importa.
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
        'Boolean(document.querySelector("#browserInstanceMode") && window.__arranqueVista === "ok")'
      ).catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    console.log('--- el modelo de los dos modos ---');
    const modelo = await ventana.webContents.executeJavaScript(`(() => {
      const salida = {};
      salida.navegador = normalizeBrowserInstance({
        id: 'm-navegador', name: 'N', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'navegador', buscador: 'google', apertura: 'panel'
      });
      salida.instancia = normalizeBrowserInstance({
        id: 'm-instancia', name: 'I', url: 'https://ejemplo.invalid/juego', count: 1,
        modo: 'instancia'
      });
      // Un registro de antes de esto: traia el booleano navegador a true y ningun modo.
      // OJO: los acentos graves CIERRAN la plantilla de arriba. Este comentario va dentro del
      // codigo que se inyecta, no fuera, asi que no puede llevar ni uno.
      salida.veloDeLaMismaForma = normalizeBrowserInstance({
        id: 'm-viejo', name: 'V', url: 'https://ejemplo.invalid/', count: 2, navegador: true
      });
      // Y otro aún más viejo, que no tenía ni el booleano.
      salida.veloDeLaMismaFormaTambien = normalizeBrowserInstance({
        id: 'm-mas-viejo', name: 'W', url: 'https://ejemplo.invalid/', count: 1
      });
      // Un modo que no existe no puede romper nada.
      salida.modoRaro = normalizeBrowserInstance({
        id: 'm-raro', name: 'X', url: 'https://ejemplo.invalid/', count: 1, modo: 'inventado'
      });
      salida.esNavegador = [
        esModoNavegador(salida.navegador),
        esModoNavegador(salida.instancia)
      ];
      salida.modos = [
        salida.veloDeLaMismaForma?.modo,
        salida.veloDeLaMismaFormaTambien?.modo,
        salida.modoRaro?.modo
      ];
      salida.inicios = [
        inicioDeInstancia(salida.navegador),
        inicioDeInstancia(salida.instancia)
      ];
      // Y una instancia de navegador sin enlace, que es lo que hace el modo buscador del modal.
      salida.sinEnlace = normalizeBrowserInstance({
        id: 'm-sin-enlace', name: 'SE', url: '', count: 1, modo: 'navegador', buscador: 'bing'
      });
      salida.normalSinEnlace = normalizeBrowserInstance({
        id: 'm-normal-sin-enlace', name: 'NS', url: '', count: 1, modo: 'instancia'
      });
      return salida;
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al leer el modelo');
      return null;
    });

    if (modelo) {
      comprobar(modelo.modos.join(',') === 'navegador,instancia,instancia',
        'una instancia guardada antes de esto se traduce sola y no se rompe',
        modelo.modos.join(','));
      comprobar(modelo.esNavegador.join(',') === 'true,false',
        'el modo se lee con una sola pregunta, no comparando el campo viejo',
        modelo.esNavegador.join(','));
      comprobar(modelo.inicios[0] === 'https://www.google.com/search?q=',
        'el modo navegador arranca en el buscador elegido', modelo.inicios[0]);
      comprobar(modelo.inicios[1] === 'https://ejemplo.invalid/juego',
        'y el modo instancia arranca en su URL', modelo.inicios[1]);
      comprobar(Boolean(modelo.sinEnlace) && modelo.sinEnlace.url === 'https://www.bing.com/search?q=',
        'una instancia de navegador puede no tener enlace, que es lo que hace el modo buscador',
        modelo.sinEnlace ? modelo.sinEnlace.url : 'no se pudo crear');
      comprobar(modelo.normalSinEnlace === null,
        'pero una instancia normal sigue sin poder crearse sin enlace',
        String(modelo.normalSinEnlace));
    }

    console.log('\\n--- el modal de creación ---');
    const modal = await ventana.webContents.executeJavaScript(`(() => {
      openBrowserInstanceModal();
      const leer = () => ({
        enlaceOculto: browserInstanceUrlField.hidden,
        enlaceObligatorio: browserInstanceUrl.required,
        nombreOculto: browserInstanceNameField.hidden,
        hayCampoDeBuscador: Boolean(document.querySelector('#browserInstanceBuscador')),
        hayCampoDeReparto: Boolean(document.querySelector('#browserInstanceApertura'))
      });
      browserInstanceMode.value = 'navegador';
      browserInstanceMode.dispatchEvent(new Event('change'));
      const enNavegador = leer();
      browserInstanceMode.value = 'instancia';
      browserInstanceMode.dispatchEvent(new Event('change'));
      const enInstancia = leer();
      closeBrowserInstanceModal();
      return { enNavegador, enInstancia };
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al manejar el modal');
      return null;
    });

    if (modal) {
      comprobar(modal.enNavegador.enlaceOculto === false
        && modal.enNavegador.enlaceObligatorio === false,
        'en modo navegador el enlace se ve pero deja de ser obligatorio: si lo escribes, arranca ahí',
        JSON.stringify(modal.enNavegador));
      comprobar(modal.enNavegador.nombreOculto === true,
        'y el nombre no se pregunta, porque lo pone la página', JSON.stringify(modal.enNavegador));
      comprobar(modal.enInstancia.enlaceOculto === false && modal.enInstancia.enlaceObligatorio === true
        && modal.enInstancia.nombreOculto === false,
        'y en modo instancia se piden los dos', JSON.stringify(modal.enInstancia));
      comprobar(!modal.enNavegador.hayCampoDeBuscador && !modal.enInstancia.hayCampoDeBuscador,
        'el motor de búsqueda ya no está en el modal de creación', JSON.stringify(modal));
      comprobar(!modal.enNavegador.hayCampoDeReparto && !modal.enInstancia.hayCampoDeReparto,
        'ni el reparto de enlaces: los dos van a los ajustes', JSON.stringify(modal));
    }

    // Las ventanas emergentes no son una opcion del usuario: estan siempre activas porque los inicios
    // de sesion y las pasarelas las necesitan. Que haya una casilla para apagarlas solo rompia cosas.
    console.log('\\n--- no queda casilla de ventanas emergentes ---');
    const sinCasilla = await ventana.webContents.executeJavaScript(`(() => ({
      casilla: Boolean(document.querySelector('#browserInstancePopups')),
      bloque: Boolean(document.querySelector('.browser-instance-popups')),
      interruptorEnElPuente: typeof window.pokeGrid.setPopupsEnabled === 'function'
    }))()`).catch(() => null);
    if (sinCasilla) {
      comprobar(!sinCasilla.casilla && !sinCasilla.bloque,
        'la casilla y su bloque de explicación ya no están en el modal', JSON.stringify(sinCasilla));
      comprobar(sinCasilla.interruptorEnElPuente === false,
        'y el puente ya no tiene con qué encenderlas ni apagarlas', JSON.stringify(sinCasilla));
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
    ? 'Los dos modos de instancia.'
    : `${fallos.length} comprobaciones fallan:\\n  - ${fallos.join('\\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});