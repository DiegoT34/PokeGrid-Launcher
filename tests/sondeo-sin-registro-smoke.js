// El sondeo de capturas no puede quedarse girando cuando no hay nada que leer.
//
// Se midió el gasto: el script esperaba 3500 ms en bucles de 100 ms aunque no hubiera nada que
// pulsar, y como el sondeo va cada 3500 ms, el panel se pasaba todo el rato dentro del bucle.
// Con cuatro paneles abiertos por defecto, eso solo ya sostenía los ~3 núcleos medidos con el
// perfil vacío.
//
// Aquí se cronometra el script de verdad, el de `src/renderer.js`, sobre una página que no
// tiene ni el registro de capturas ni el muelle de botones del juego. Antes tardaba los 3500 ms
// de la espera; ahora tiene que volver enseguida.
//
// Y se comprueba la regla que decide si un panel se sondea: el origen del juego, pero no su
// página de acceso. La regla vive una sola vez y la usan los dos sondeos.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-sondeo-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');
const { app, BrowserWindow } = require('electron');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Una página sin nada del juego: ni `.clog-window`, ni `.clog-row`, ni `.game-dock`.
const PAGINA_VACIA = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>sin juego</title></head><body><h1>Nada</h1></body></html>`;

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

app.whenReady().then(async () => {
  try {
    let ventana = null;
    const t0 = Date.now();
    while (!ventana && Date.now() - t0 < 20_000) {
      ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
      await dormir(150);
    }
    while (!ventana) await dormir(150);

    const t1 = Date.now();
    while (Date.now() - t1 < 25_000) {
      if (await ventana.webContents.executeJavaScript('typeof window.captureSnapshotScript === "function"')) break;
      await dormir(200);
    }

    const archivo = path.join(userDataDir, 'sin-juego.html');
    fs.writeFileSync(archivo, PAGINA_VACIA, 'utf8');
    await ventana.webContents.executeJavaScript(`(() => {
      const vieja = document.getElementById('__sinjuego');
      if (vieja) vieja.remove();
      const w = document.createElement('webview');
      w.id = '__sinjuego';
      w.setAttribute('src', 'file:///${archivo.replace(/\\/g, '/')}');
      w.style.cssText = 'position:fixed;left:-20000px;top:0;width:900px;height:600px';
      document.body.appendChild(w);
      window.__sinJuegoListo = new Promise((resolve) => {
        w.addEventListener('did-finish-load', () => resolve(true), { once: true });
        w.addEventListener('did-fail-load', () => resolve(false), { once: true });
      });
    })()`);
    await ventana.webContents.executeJavaScript('window.__sinJuegoListo');
    await dormir(500);

    // --- 1. Cuánto tarda el script cuando no hay nada que leer -------------------
    const vueltas = [];
    for (let i = 0; i < 4; i++) {
      const ms = await ventana.webContents.executeJavaScript(`(async () => {
        const w = document.getElementById('__sinjuego');
        const guion = window.captureSnapshotScript();
        const t0 = performance.now();
        const datos = await w.executeJavaScript(guion);
        return { ms: performance.now() - t0, filas: (datos.rows || []).length };
      })()`);
      vueltas.push(ms);
    }
    const tiempos = vueltas.map((v) => v.ms);
    const peor = Math.max(...tiempos);
    console.log('--- el sondeo sobre una página sin registro de capturas ---');
    console.log(`  tardó: ${tiempos.map((t) => t.toFixed(0)).join(', ')} ms   el peor ${peor.toFixed(0)} ms`);
    comprobar(peor < 700, 'vuelve enseguida en vez de esperar 3500 ms', `el peor ${peor.toFixed(0)} ms`);
    comprobar(vueltas.every((v) => v.filas === 0), 'y no inventa filas que no hay', JSON.stringify(vueltas.map((v) => v.filas)));

    // --- 2. La regla de «este panel está dentro del juego» -----------------------
    const reglas = await ventana.webContents.executeJavaScript(`(() => {
      const conUrl = (url) => ({ webview: { getURL: () => url } });
      const queSeRompe = { webview: { getURL: () => { throw new Error('roto'); } } };
      return {
        acceso: window.panelDentroDelJuego(conUrl('https://poke.idleworld.online/login')),
        juego: window.panelDentroDelJuego(conUrl('https://poke.idleworld.online/play')),
        juegoConRuta: window.panelDentroDelJuego(conUrl('https://poke.idleworld.online/play/team')),
        otroSitio: window.panelDentroDelJuego(conUrl('https://example.com/')),
        enBlanco: window.panelDentroDelJuego(conUrl('about:blank')),
        vacia: window.panelDentroDelJuego(conUrl('')),
        rota: window.panelDentroDelJuego(queSeRompe),
        existe: typeof window.panelDentroDelJuego === 'function'
      };
    })()`);
    console.log('\n--- la regla que decide si se sondea un panel ---');
    comprobar(reglas.existe, 'existe y está en el ámbito de la ventana');
    comprobar(reglas.acceso === false, 'la página de acceso NO se sondea', `login → ${reglas.acceso}`);
    comprobar(reglas.juego === true && reglas.juegoConRuta === true, 'una página del juego sí', `/play → ${reglas.juego}, /play/team → ${reglas.juegoConRuta}`);
    comprobar(reglas.otroSitio === false, 'otro sitio no', `example.com → ${reglas.otroSitio}`);
    comprobar(reglas.enBlanco === false && reglas.vacia === false, 'una webview sin cargar tampoco', `about:blank → ${reglas.enBlanco}, vacía → ${reglas.vacia}`);
    comprobar(reglas.rota === false, 'y si leer la URL revienta, no se sondea en vez de propagar el error', `→ ${reglas.rota}`);

    await ventana.webContents.executeJavaScript('document.getElementById("__sinjuego")?.remove()');
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
    ? 'Sondeo de capturas: no gira sin nada que leer, y solo sondea los paneles que están dentro del juego.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
