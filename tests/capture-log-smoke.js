// El registro de capturas: modo de guardado, sprites de PokeAPI y lectura del IV.
//
// POR QUÉ EXISTE
//
// El launcher lee el Capture Log del juego y además lo archiva en IndexedDB. Medido en el juego
// real del usuario: él tenía 48 capturas y el launcher 119, porque archiva todo lo que ha visto
// nunca. El modo «solo lo que muestra el juego» deja de archivar sin borrar nada.
//
// Aquí se monta el registro del juego tal como es de verdad —comprobado con el depurador—: cada
// fila con su icono, el nombre, la etiqueta `.clog-lvl` con la calidad y el IV dentro
// («Incomum ×1.19 IV 92/192»), `.clog-meta` VACÍO, la ball y la fecha. Ese `.clog-meta` vacío es
// justo lo que hacía que el IV no se leyera.
//
// Lo que se comprueba es lo que cambia entre los modos, que no se ve por ningún lado más: si se
// archiva o no. Un panel con tres capturas se ve igual archivándolas que no.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-capture-log-'));
app.setPath('userData', userDataDir);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// Una fila del registro del juego, con la forma real. El número del sprite del juego no importa
// para el launcher —ahora usa los de PokeAPI— pero se pone igual.
function filaDelJuego(nombre, iv, pelota, cuando, numero) {
  return `<div class="clog-row"><span class="clog-ico"><img alt="" width="30" height="30" src="/assets/pokeitems/gen2/${numero}.png" style="width:30px;height:30px;object-fit:contain;image-rendering:pixelated"></span><span class="clog-name">${nombre}</span><span class="clog-lvl script-quality-badge" title="Calidad">Incomum ×1.19 IV ${iv}/192</span><span class="clog-meta"></span><span class="clog-ball">${pelota}</span><span class="clog-when">${cuando}</span></div>`;
}

function paginaDelJuego(filas) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>juego</title></head><body>
    <div class="clog-window">
      <div class="clog-head"><span class="clog-totals">Total: ${filas.length}</span></div>
      <div class="clog-list">${filas.map((f) => filaDelJuego(...f)).join('')}</div>
    </div>
    <script>
      // Para poder cambiar el registro desde la prueba: añadir y quitar filas como haría el juego.
      window.__cambiarRegistro = (filas) => {
        document.querySelector('.clog-list').innerHTML = filas.map((f) =>
          '<div class="clog-row"><span class="clog-ico"><img alt="" width="30" height="30" src="/assets/pokeitems/gen2/' + f[4] + '.png" style="image-rendering:pixelated"></span><span class="clog-name">' + f[0] + '</span><span class="clog-lvl script-quality-badge">Incomum ×1.19 IV ' + f[1] + '/192</span><span class="clog-meta"></span><span class="clog-ball">' + f[2] + '</span><span class="clog-when">' + f[3] + '</span></div>'
        ).join('');
        document.querySelector('.clog-totals').textContent = 'Total: ' + filas.length;
        return filas.length;
      };
    <\/script>
  </body></html>`;
}

const TRES = [
  ['Furious Skarmory', 92, 'Ultra Ball', '11/10, 02:15', 227],
  ['Brave Clefable', 119, 'Great Ball', '11/10, 02:12', 36],
  ['Psy Jynx', 61, 'Ultra Ball', '11/10, 02:08', 124]
];

app.whenReady().then(async () => {
  let ventana = null;
  try {
    ventana = new BrowserWindow({
      show: false,
      width: 1440,
      height: 940,
      webPreferences: {
        preload: path.join(__dirname, 'launcher-preview-preload.js'),
        contextIsolation: true,
        sandbox: false,
        webviewTag: true
      }
    });
    await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    const empezado = Date.now();
    while (Date.now() - empezado < 25_000) {
      const listo = await ventana.webContents.executeJavaScript(
        'Boolean(window.__pokeGridCaptureModo && document.querySelectorAll(".panel").length === 4 && document.querySelector("#grid webview"))'
      );
      if (listo) break;
      await dormir(150);
    }

    const archivo = path.join(userDataDir, 'juego.html');
    fs.writeFileSync(archivo, paginaDelJuego(TRES), 'utf8');
    await ventana.webContents.executeJavaScript(`(() => {
      const wv = document.querySelector('#grid webview');
      window.__cargado = new Promise((resolve) => {
        wv.addEventListener('did-finish-load', () => resolve(true), { once: true });
        wv.addEventListener('did-fail-load', () => resolve(false), { once: true });
      });
      wv.src = 'file:///${archivo.replace(/\\/g, '/')}';
      return true;
    })()`);
    comprobar((await ventana.webContents.executeJavaScript('window.__cargado')) === true, 'la página del juego (copia) carga en la webview');

    const leerPanel = () => ventana.webContents.executeJavaScript(`(() => {
      const panel = document.querySelector('.capture-float-panel');
      const filas = [...panel.querySelectorAll('.capture-flat-row')];
      const sprites = [...panel.querySelectorAll('.capture-flat-sprite')].map((s) => ({
        etiqueta: s.tagName.toLowerCase(),
        fuente: s.dataset?.spriteSource || (s.classList.contains('capture-pokeapi-sprite') ? 'pokeapi-pendiente' : ''),
        especie: s.dataset?.speciesId || null,
        esDato: String(s.src || '').startsWith('data:image/')
      }));
      return {
        contador: panel.querySelector('.capture-float-count').textContent.trim(),
        estado: panel.querySelector('.capture-float-state').textContent.trim(),
        filas: filas.length,
        nombres: filas.map((f) => (f.querySelector('.capture-flat-name')?.textContent || '').trim()),
        ivs: filas.map((f) => (f.textContent.match(/IV\\s*(\\d+)\\/192/) || [])[1] || ''),
        sprites,
        archivadas: window.__pokeGridCaptureModo.archivadas(0)
      };
    })()`);

    // --- 1. De fábrica: guardar completo ------------------------------------------
    console.log('--- de fábrica (guardar completo) ---');
    comprobar((await ventana.webContents.executeJavaScript('window.__pokeGridCaptureModo.config().modo')) === 'completo',
      'de fábrica se guarda completo');

    await ventana.webContents.executeJavaScript("document.querySelector('.capture-log-toggle').click()");
    await dormir(2500);
    const primera = await leerPanel();
    console.log(`  contador: ${primera.contador}`);
    console.log(`  estado: ${primera.estado}`);
    console.log(`  nombres: ${primera.nombres.join(' · ')}`);
    console.log(`  IVs: ${primera.ivs.join(' · ')}`);
    console.log(`  sprites: ${JSON.stringify(primera.sprites)}`);

    comprobar(/^En vivo/.test(primera.estado), 'al abrir el panel se lee', primera.estado);
    comprobar(primera.filas === 3, 'están las tres capturas del juego', `${primera.filas}`);
    comprobar(primera.nombres.some((n) => n.includes('Skarmory')), 'y con su nombre', primera.nombres[0] || '');
    // El fallo de precisión: el IV vive en `.clog-lvl`, no en `.clog-meta`.
    comprobar(primera.ivs.includes('92') && primera.ivs.includes('119') && primera.ivs.includes('61'),
      'el IV se lee aunque `.clog-meta` esté vacío', primera.ivs.join(', '));
    // Y el sprite ya no es el del juego.
    comprobar(primera.sprites.some((s) => s.fuente === 'pokeapi'), 'el sprite sale de PokeAPI', JSON.stringify(primera.sprites[0]));
    comprobar(primera.sprites.some((s) => s.especie === '227'), 'con el id de la especie resuelto por el nombre', JSON.stringify(primera.sprites.map((s) => s.especie)));
    comprobar(primera.sprites.every((s) => s.esDato || s.fuente === 'pokeapi'), 'y la imagen llega como dato, no como enlace externo');

    // --- 2. El archivo crece, y el juego deja de tener esa captura -----------------
    await ventana.webContents.executeJavaScript("document.querySelector('#grid webview').executeJavaScript('window.__cambiarRegistro([[\"Furious Skarmory\",92,\"Ultra Ball\",\"11/10, 02:15\",227],[\"Brave Clefable\",119,\"Great Ball\",\"11/10, 02:12\",36]])').catch(() => {})");
    await dormir(5200);
    const trasBorrarlaDelJuego = await leerPanel();
    console.log(`\n--- el juego ya solo tiene 2, en guardar completo ---\n  contador: ${trasBorrarlaDelJuego.contador}\n  filas: ${trasBorrarlaDelJuego.filas}`);
    comprobar(trasBorrarlaDelJuego.filas === 3, 'en «guardar completo» el launcher conserva la que el juego ya no tiene', `${trasBorrarlaDelJuego.filas}`);
    comprobar(/guardada/.test(trasBorrarlaDelJuego.contador), 'y el contador habla de guardadas', trasBorrarlaDelJuego.contador);
    comprobar(trasBorrarlaDelJuego.archivadas === 3, 'las tres están archivadas', `${trasBorrarlaDelJuego.archivadas}`);

    // --- 3. Solo lo que muestra el juego -------------------------------------------
    await ventana.webContents.executeJavaScript("window.__pokeGridCaptureModo.fijar('visible')");
    await dormir(400);
    const enVisible = await leerPanel();
    console.log(`\n--- solo lo que muestra el juego ---\n  contador: ${enVisible.contador}\n  filas: ${enVisible.filas}`);
    comprobar(enVisible.filas === 2, 'la lista pasa a ser la del juego', `${enVisible.filas}`);
    comprobar(/en el registro del juego/.test(enVisible.contador), 'y el contador lo dice', enVisible.contador);
    comprobar(enVisible.archivadas === 3, 'lo ya guardado NO se borra: sigue en el archivo', `${enVisible.archivadas}`);

    // Y deja de crecer: si el juego muestra una nueva, no se archiva.
    await ventana.webContents.executeJavaScript("document.querySelector('#grid webview').executeJavaScript('window.__cambiarRegistro([[\"Furious Skarmory\",92,\"Ultra Ball\",\"11/10, 02:15\",227],[\"Brave Clefable\",119,\"Great Ball\",\"11/10, 02:12\",36],[\"Furious Wigglytuff\",140,\"Ultra Ball\",\"11/10, 02:20\",40]])').catch(() => {})");
    await dormir(5200);
    const conNueva = await leerPanel();
    console.log(`\n--- el juego muestra una nueva, sin guardar ---\n  contador: ${conNueva.contador}\n  filas: ${conNueva.filas}\n  archivadas: ${conNueva.archivadas}`);
    comprobar(conNueva.filas === 3, 'la nueva sale en la lista', `${conNueva.filas}`);
    comprobar(conNueva.archivadas === 3, 'pero NO se archiva: el archivo no crece', `${conNueva.archivadas}`);

    // --- 4. Volver a guardar completo ----------------------------------------------
    await ventana.webContents.executeJavaScript("window.__pokeGridCaptureModo.fijar('completo')");
    await dormir(400);
    const vuelta = await leerPanel();
    console.log(`\n--- y de vuelta a guardar completo ---\n  contador: ${vuelta.contador}\n  filas: ${vuelta.filas}`);
    comprobar(/guardada/.test(vuelta.contador), 'el contador vuelve a hablar de guardadas', vuelta.contador);
    comprobar(vuelta.archivadas >= 4, 'y lo que se vio sin guardar entra ahora', `${vuelta.archivadas}`);

    // --- 5. Los ajustes, en el panel ------------------------------------------------
    const ajustes = await ventana.webContents.executeJavaScript(`(() => {
      const boton = document.querySelector('.capture-float-settings-toggle');
      boton.click();
      const bloque = document.querySelector('.capture-float-settings');
      const select = document.querySelector('.capture-float-settings-modo');
      return {
        abierto: !bloque.hidden,
        expandido: boton.getAttribute('aria-expanded'),
        valor: select.value,
        opciones: [...select.options].map((o) => o.value),
        nota: document.querySelector('.capture-float-settings-note').textContent.trim().slice(0, 60),
        sigueElBoton: Boolean(document.querySelector('.capture-float-settings-toggle')),
        icono: Boolean(boton.querySelector('svg'))
      };
    })()`);
    console.log(`\n--- los ajustes ---\n  ${JSON.stringify(ajustes)}`);
    comprobar(ajustes.abierto && ajustes.expandido === 'true', 'el engranaje abre el bloque de ajustes');
    comprobar(JSON.stringify(ajustes.opciones) === '["completo","visible"]', 'con los dos modos', ajustes.opciones.join(', '));
    comprobar(ajustes.valor === 'completo', 'y puesto donde dice el ajuste guardado', ajustes.valor);
    comprobar(ajustes.sigueElBoton, 'el botón sigue ahí después de pulsarlo');
    comprobar(ajustes.icono, 'con su engranaje dibujado');
    comprobar(ajustes.nota.length > 20, 'y una nota que explica qué hace el modo', ajustes.nota);
  } catch (error) {
    console.log(`\nFALLO: ${error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n') : error}`);
    fallos.push('excepción');
  } finally {
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    for (let i = 0; i < 3; i++) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 }); break; } catch { /* Electron lo tiene abierto */ }
    }
  }

  console.log('');
  console.log(fallos.length === 0
    ? 'Capture Log: se elige qué se guarda sin perder nada, los sprites son de PokeAPI y el IV se lee.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
