// Ventanas emergentes en las instancias de navegador.
//
// POR QUÉ EXISTE
//
// El manejador de aperturas de src/main.js deniega TODO `window.open` de cualquier webview, porque
// en el juego una emergente casi siempre es un anuncio. En las instancias de navegador eso no vale:
// ahí el usuario navega, y hay páginas que no se pueden usar sin ventana propia —un juego de
// navegador, el inicio de sesión con Google—, y antes se mandaban al navegador del sistema, que
// además obliga a iniciar sesión otra vez y deja el flujo a medias.
//
// Lo que se comprueba es lo que de verdad importa y no se ve mirando la pantalla:
//
//   · La ventana que sale comparte la SESIÓN, no solo se abre. Se siembra una cookie en la partición
//     de la instancia y se busca en la ventana nueva. Si comparten sesión, aparece; si abrieran con
//     una partición propia, no. Es la prueba de que el inicio de sesión con Google sirve de algo.
//   · El interruptor de verdad corta la apertura —no es decorativo— y volver a marcarlo la deja
//     pasar.
//   · Las webviews del juego siguen sin abrir ventanas.
//   · El tope de 6 se respeta, y lo que no cabe se abre fuera en vez de perderse.
//
// Se usa el launcher de verdad (`require('../src/main.js')`) porque el manejador vive en el proceso
// principal: los smokes que cargan solo `src/index.html` con un preload de prueba ni lo tocan.
//
// Y se sustituye `shell.openExternal` ANTES de cargar main.js: si no, la prueba le abriría el
// navegador del escritorio al usuario, y de paso así se puede contar cuántas veces se habría
// abierto algo fuera.
//
// NINGUNA VENTANA SE DESTRUYE DURANTE LA PRUEBA
//
// Se计数 por identificadores en vez de destruyendo lo que sobra, porque cerrar una ventana emergente
// por la vía rápida dejaba bloqueado el proceso principal: se quedaba atascado y hasta
// `BrowserWindow.getAllWindows()` dejaba de responder, así que la prueba se colgaba sin poder
// imprimir el resumen. Nada se cierra hasta el `app.exit()` del final, que lo baja todo de golpe.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-emergentes-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

const electron = require('electron');
const abiertasFuera = [];
electron.shell.openExternal = (url) => {
  abiertasFuera.push(String(url));
  return Promise.resolve();
};

require('../src/main.js');
const { app, BrowserWindow, session } = electron;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const PARTICION = 'persist:pokegrid-instance-prueba';
const PARTICION_JUEGO = 'persist:pokegrid-0';
// 127.0.0.1:1 no escucha nada, así que la carga falla al instante en vez de esperar al DNS. La URL
// sirve solo para que el manejador tenga algo que mirar: lo que se comprueba es la ventana, no la
// página que carga.
const DESTINO = 'https://127.0.0.1:1/';

const PAGINA_INSTANCIA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>instancia</title></head><body>
  <input id="destino" value="${DESTINO}">
  <button id="abrir" type="button" onclick="window.__abrir()">Abrir</button>
  <script>
    window.__abrir = () => { window.open(document.getElementById('destino').value, '_blank'); };
  <\/script>
</body></html>`;

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

let ventanaPrincipal = null;
// Las ventanas ya vistas. Lo nuevo de cada paso es lo que no está en este conjunto.
const ventanasVistas = new Set();

async function registrarLoQueHay() {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) ventanasVistas.add(w.id);
  }
}

function ventanasNuevas() {
  const nuevas = [];
  for (const w of BrowserWindow.getAllWindows()) {
    if (w.isDestroyed() || ventanasVistas.has(w.id)) continue;
    ventanasVistas.add(w.id);
    nuevas.push(w);
  }
  return nuevas;
}

async function esperarNuevasVentanas(cuantas, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const nuevas = ventanasNuevas();
    if (nuevas.length >= cuantas) return nuevas;
    await dormir(120);
  }
  return ventanasNuevas();
}

// El interruptor viaja por IPC, así que hay que darle un momento antes de pedir una ventana: si se
// pide antes de que llegue, se abre con el valor viejo y la comprobación miente.
const dejarAplicadoElInterruptor = () => dormir(400);

const marcarInterruptor = (marcado) => ventanaPrincipal.webContents.executeJavaScript(`(() => {
  const c = document.querySelector('#browserInstancePopups');
  c.checked = ${marcado ? 'true' : 'false'};
  c.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`);

const pedirDesde = (id) => ventanaPrincipal.webContents.executeJavaScript(
  `document.getElementById('${id}').executeJavaScript("document.getElementById('abrir').click()")`);

app.whenReady().then(async () => {
  // Por qué se cierra: este guion arranca el launcher entero, y si algo lo cierra a mitad se acaba
  // sin imprimir el resumen y parece un fallo de la prueba cuando no lo es.
  app.on('before-quit', () => console.log('  (diagnóstico) before-quit'));
  app.on('window-all-closed', () => console.log('  (diagnóstico) window-all-closed'));
  try {
    const t0 = Date.now();
    while (!ventanaPrincipal && Date.now() - t0 < 20_000) {
      ventanaPrincipal = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
      await dormir(150);
    }
    while (!ventanaPrincipal) await dormir(150);
    await registrarLoQueHay();

    const t1 = Date.now();
    while (Date.now() - t1 < 25_000) {
      const listo = await ventanaPrincipal.webContents.executeJavaScript(
        'Boolean(document.querySelector("#browserInstancePopups") && typeof window.pokeGrid === "object")');
      if (listo) break;
      await dormir(200);
    }

    // --- 1. El interruptor --------------------------------------------------------
    console.log('--- el interruptor del modal de instancias ---');
    const casilla = await ventanaPrincipal.webContents.executeJavaScript(`(() => {
      const c = document.querySelector('#browserInstancePopups');
      const bloque = c ? c.closest('.browser-instance-popups') : null;
      return {
        existe: Boolean(c),
        marcada: c ? c.checked : null,
        texto: bloque ? bloque.textContent.replace(/\\s+/g, ' ').trim().slice(0, 150) : ''
      };
    })()`);
    comprobar(casilla.existe, 'el modal de instancias tiene su interruptor');
    comprobar(casilla.marcada === true, 'y viene marcado: las páginas que necesitan ventana funcionan sin tocar nada');
    comprobar(/emergente/i.test(casilla.texto), 'con una explicación de qué hace', casilla.texto.slice(0, 80));

    // --- 2. Montar la instancia ----------------------------------------------------
    const archivo = path.join(userDataDir, 'instancia.html');
    fs.writeFileSync(archivo, PAGINA_INSTANCIA, 'utf8');
    // Cookie sembrada a propósito: si la ventana nueva comparte sesión, la ve; si abre con una
    // partición propia, no la ve y la prueba falla. Es la prueba de que el inicio de sesión se
    // comparte y no solo de que se abre algo.
    await session.fromPartition(PARTICION).cookies.set({
      url: 'https://ejemplo.test/', name: 'sesion', value: 'siesta'
    });

    await ventanaPrincipal.webContents.executeJavaScript(`(() => {
      const vieja = document.getElementById('__instancia');
      if (vieja) vieja.remove();
      const w = document.createElement('webview');
      w.id = '__instancia';
      w.setAttribute('partition', '${PARTICION}');
      // Como las de verdad: sin allowpopups, Chromium para la petición antes de preguntar al
      // manejador y la ventana no sale. Es justo lo que hacía el launcher.
      w.setAttribute('allowpopups', 'true');
      w.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, nativeWindowOpen=yes');
      w.setAttribute('src', 'file:///${archivo.replace(/\\/g, '/')}');
      w.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;height:600px';
      document.body.appendChild(w);
      window.__instanciaLista = new Promise((resolve) => {
        w.addEventListener('did-finish-load', () => resolve(true), { once: true });
        w.addEventListener('did-fail-load', () => resolve(false), { once: true });
      });
    })()`);
    comprobar((await ventanaPrincipal.webContents.executeJavaScript('window.__instanciaLista')) === true,
      'la página de la instancia carga en su webview');

    const sesionInstancia = session.fromPartition(PARTICION);

    // --- 3. Con el interruptor marcado --------------------------------------------
    console.log('\n--- con el interruptor marcado ---');
    await pedirDesde('__instancia');
    const [emergente] = await esperarNuevasVentanas(1);
    comprobar(Boolean(emergente), 'la instancia abre la ventana emergente');
    if (emergente) {
      // OJO: `webContents.session.partition` NO existe —no es API pública— y devuelve `undefined`.
      // Por eso la comparación buena es la de la sesión entera: si son el MISMO objeto comparten
      // cookies, y es lo que hace que el inicio de sesión con Google sirva.
      comprobar(emergente.webContents.session === sesionInstancia, 'es la MISMA sesión de la instancia, no una copia');
      const cookies = await emergente.webContents.session.cookies.get({ url: 'https://ejemplo.test/' });
      comprobar(cookies.some((c) => c.name === 'sesion' && c.value === 'siesta'),
        'la cookie de la instancia está en la ventana: por eso sirve el inicio de sesión con Google',
        `${cookies.length} cookie(s)`);
      const prefs = emergente.webContents.getLastWebPreferences() || {};
      comprobar(!prefs.preload, 'sin preload', String(prefs.preload));
      comprobar(prefs.nodeIntegration !== true && prefs.contextIsolation === true && prefs.sandbox === true,
        'con las mismas garantías que la instancia', JSON.stringify({
          node: prefs.nodeIntegration, contexto: prefs.contextIsolation, sandbox: prefs.sandbox
        }));
    }

    // --- 4. Desmarcado: no abre nada ----------------------------------------------
    console.log('\n--- desmarcando el interruptor ---');
    await marcarInterruptor(false);
    await dejarAplicadoElInterruptor();
    const externasAntes = abiertasFuera.length;
    await pedirDesde('__instancia');
    await dormir(1200);
    const ninguna = ventanasNuevas();
    comprobar(ninguna.length === 0, 'no sale ninguna ventana', `${ninguna.length}`);
    comprobar(abiertasFuera.length > externasAntes,
      'y la página sigue funcionando: se abre en el navegador del sistema, como antes',
      `${abiertasFuera.length - externasAntes} apertura(s) fuera`);

    // --- 5. Volviendo a marcarlo, vuelve a abrirse -------------------------------
    console.log('\n--- marcando otra vez ---');
    await marcarInterruptor(true);
    await dejarAplicadoElInterruptor();
    await pedirDesde('__instancia');
    const [vuelve] = await esperarNuevasVentanas(1);
    comprobar(Boolean(vuelve), 'vuelve a abrirse dentro del launcher');
    if (vuelve) {
      comprobar(vuelve.webContents.session === sesionInstancia, 'y con la misma sesión de la instancia');
    }

    // --- 6. Las webviews del juego no cambian -------------------------------------
    console.log('\n--- una webview del juego ---');
    await ventanaPrincipal.webContents.executeJavaScript(`(() => {
      const vieja = document.getElementById('__juego');
      if (vieja) vieja.remove();
      const w = document.createElement('webview');
      w.id = '__juego';
      w.setAttribute('partition', '${PARTICION_JUEGO}');
      w.setAttribute('src', 'file:///${archivo.replace(/\\/g, '/')}');
      w.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;height:600px';
      document.body.appendChild(w);
      window.__juegoListo = new Promise((resolve) => {
        w.addEventListener('did-finish-load', () => resolve(true), { once: true });
        w.addEventListener('did-fail-load', () => resolve(false), { once: true });
      });
    })()`);
    await ventanaPrincipal.webContents.executeJavaScript('window.__juegoListo');
    await registrarLoQueHay();
    const externasJuego = abiertasFuera.length;
    await pedirDesde('__juego');
    await dormir(1200);
    const ningunaDelJuego = ventanasNuevas();
    comprobar(ningunaDelJuego.length === 0, 'no abre ninguna ventana dentro del launcher', `${ningunaDelJuego.length}`);
    comprobar(abiertasFuera.length === externasJuego, 'ni en el navegador del sistema tampoco',
      `${abiertasFuera.length - externasJuego}`);
    await ventanaPrincipal.webContents.executeJavaScript('document.getElementById("__juego")?.remove()');

    // --- 7. El tope: 6 a la vez ----------------------------------------------------
    console.log('\n--- una página que abre sin parar ---');
    const externasTope = abiertasFuera.length;
    const PIDE = 7;
    for (let i = 0; i < PIDE; i++) await pedirDesde('__instancia');
    await dormir(2500);
    ventanasNuevas();
    // Se cuentan TODAS las ventanas abiertas, no solo las nuevas de este paso: el tope es de
    // ventanas vivas a la vez, y a este punto ya había algunas de los pasos anteriores. Contar solo
    // las nuevas daría menos de seis y parecería que el tope no funciona.
    const vivas = BrowserWindow.getAllWindows()
      .filter((w) => !w.isDestroyed() && w.id !== ventanaPrincipal.id);
    comprobar(vivas.length === 6, 'se quedan en seis abiertas como mucho, ni una más',
      `${vivas.length} ventanas con ${PIDE} peticiones más`);
    comprobar(abiertasFuera.length > externasTope, 'y lo que no cabe no se pierde: sale en el navegador del sistema',
      `${abiertasFuera.length - externasTope} fuera`);
    console.log(`  (detalle) ${PIDE} peticiones de golpe, ${vivas.length} ventanas vivas en total, ${abiertasFuera.length - externasTope} fuera`);
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
    ? 'Ventanas emergentes: las instancias de navegador abren sus ventanas con la misma sesión, el interruptor manda y el juego sigue sin abrirlas.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});