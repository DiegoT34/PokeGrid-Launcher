// Los ajustes por instancia, el engranaje al menu y la cabecera sin texto.
//
// POR QUÉ EXISTE
//
// El motor de busqueda y el reparto de enlaces no son cosas de crear una instancia: son cosas de
// cambiarlas despues. Estaban en el modal de creacion porque alli era donde se escribian las
// opciones nuevas, y se han quedado ahi porque nadie los ha movido.
//
// El problema de fondo es otro: el panel de ajustes es GLOBAL. Guarda el atajo de pantalla completa
// para todas las instancias y no sabe de que instancia se trata. En cuanto hay un ajuste que si es
// por instancia —el motor lo es, porque cada una puede buscar donde quiera—, hace falta un selector.
//
// Lo que se comprueba aqui es que el ajuste acaba en la instancia que estaba seleccionada y SOLO en
// esa. Un selector que guarde sobre la de al lado es peor que no tener selector.
const electronApi = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-ajustes-'));
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
        'Boolean(document.querySelector("#instanceSettingsTarget") && window.__arranqueVista === "ok")'
      ).catch(() => false);
      if (listo) break;
      await dormir(200);
    }

    console.log('--- los ajustes son por instancia ---');
    const ajustes = await ventana.webContents.executeJavaScript(`(() => {
      const navegador = { id: 'aj-navegador', name: 'Navegador', url: 'https://ejemplo.invalid/',
        count: 1, modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: '' };
      const fija = { id: 'aj-instancia', name: 'Instancia', url: 'https://ejemplo.invalid/juego',
        count: 1, modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: '' };
      createBrowserInstanceWorkspace(navegador, 0);
      createBrowserInstanceWorkspace(fija, 1);
      browserInstances.length = 0;
      browserInstances.push(navegador, fija);
      const leer = () => ({
        opciones: instanceSettingsTarget.options.length,
        motorOculto: instanceSettingsSearchField.hidden,
        motor: instanceSettingsSearch.value,
        reparto: instanceSettingsLinks.value,
        conAyuda: (instanceSettingsLinksCopy.textContent || '').length > 20
      });
      abrirAjustesDeInstancia();
      instanceSettingsTarget.value = 'aj-navegador';
      instanceSettingsTarget.dispatchEvent(new Event('change'));
      const enNavegador = leer();
      instanceSettingsSearch.value = 'bing';
      instanceSettingsLinks.value = 'panel';
      instanceSettingsSearch.dispatchEvent(new Event('change'));
      instanceSettingsLinks.dispatchEvent(new Event('change'));
      instanceSettingsTarget.value = 'aj-instancia';
      instanceSettingsTarget.dispatchEvent(new Event('change'));
      const enInstancia = leer();
      instanceSettingsLinks.value = 'ventana';
      instanceSettingsLinks.dispatchEvent(new Event('change'));
      instanceSettingsTarget.value = 'aj-navegador';
      instanceSettingsTarget.dispatchEvent(new Event('change'));
      const trasVolver = leer();
      const enDisco = JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]');
      cerrarAjustesDeInstancia();
      const fila = (id) => enDisco.find((f) => f.id === id) || {};
      return {
        enNavegador, enInstancia, trasVolver,
        motorGuardado: fila('aj-navegador').buscador || '',
        repartoGuardado: fila('aj-navegador').apertura || '',
        motorDeLaFija: fila('aj-instancia').buscador || 'sin-buscador',
        repartoDeLaFija: fila('aj-instancia').apertura || 'sin-apertura'
      };
    })()`).catch((e) => {
      console.log(`\\nFALLO: ${e && e.message ? e.message : e}`);
      fallos.push('excepción al manejar los ajustes');
      return null;
    });

    if (ajustes) {
      comprobar(ajustes.enNavegador.opciones === 2,
        'los ajustes eligen a qué instancia se aplican', String(ajustes.enNavegador.opciones));
      comprobar(ajustes.enNavegador.motorOculto === false,
        'en modo navegador se ve el motor de búsqueda', JSON.stringify(ajustes.enNavegador));
      comprobar(ajustes.enInstancia.motorOculto === true,
        'y en modo instancia se esconde, que ahí no sirve de nada', JSON.stringify(ajustes.enInstancia));
      comprobar(ajustes.enNavegador.conAyuda && ajustes.enInstancia.conAyuda,
        'y los dos modos explican qué pasa con los enlaces', JSON.stringify(ajustes.enInstancia));
      comprobar(ajustes.motorGuardado === 'bing',
        'el motor se guarda en la instancia que estaba seleccionada', ajustes.motorGuardado);
      comprobar(ajustes.repartoGuardado === 'panel',
        'y el reparto de enlaces también, y en esa sola', ajustes.repartoGuardado);
      comprobar(ajustes.motorDeLaFija === 'ddg',
        'la otra instancia no se ha enterado del motor', ajustes.motorDeLaFija);
      comprobar(ajustes.repartoDeLaFija === 'ventana',
        'ni del reparto, que se guardó en la suya', ajustes.repartoDeLaFija);
      comprobar(ajustes.trasVolver.motor === 'bing' && ajustes.trasVolver.reparto === 'panel',
        'al volver a la primera sigue con lo que se le puso', JSON.stringify(ajustes.trasVolver));
    }

    console.log('\\n--- la cabecera y el engranaje ---');
    const cabecera = await ventana.webContents.executeJavaScript(`(() => {
      const marca = document.querySelector('.brand');
      return {
        sinTexto: !marca.querySelector('strong') && !marca.querySelector('small'),
        conNombre: Boolean(marca.getAttribute('aria-label')),
        engranajeEnElMenu: Boolean(document.querySelector('#globalActions #instanceSettingsButton')),
        engranajeEnLaBarra: Boolean(document.querySelector('#instanceTabbar #instanceSettingsButton')),
        sigueHabiendoUno: document.querySelectorAll('#instanceSettingsButton').length
      };
    })()`).catch(() => null);

    if (cabecera) {
      comprobar(cabecera.sinTexto && cabecera.conNombre,
        'de la cabecera solo queda el logo, con nombre para quien lee con lector de pantalla',
        JSON.stringify(cabecera));
      comprobar(cabecera.engranajeEnElMenu && !cabecera.engranajeEnLaBarra
        && cabecera.sigueHabiendoUno === 1,
        'y el engranaje está en el panel de botones, y solo hay uno',
        JSON.stringify(cabecera));
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
    ? 'Los ajustes son por instancia.'
    : `${fallos.length} comprobaciones fallan:\\n  - ${fallos.join('\\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});