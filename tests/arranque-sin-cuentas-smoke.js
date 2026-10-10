// El invariante que gobierna el gasto: un perfil SIN cuentas no abre ninguna webview del
// juego.
//
// Antes, un perfil vacío abría cuatro paneles, cada uno una `<webview>` cargando el juego.
// Como el launcher apaga el frenado de fondo a propósito —para que el farmeo siga con el
// launcher minimizado—, esos cuatro paneles se quedaban renderizando para siempre. Medido
// con la carpeta de datos vacía: 16 procesos, 1,3 GB privados y entre 267% y 317% de un
// núcleo de forma continua, sin haber configurado ni una cuenta.
//
// Esta prueba no mira pantallas ni textos: pregunta por las webviews que existen de verdad.
// Es la única forma de saber si se está cargando el juego.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-arranque-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js');
const { app, BrowserWindow, webContents } = require('electron');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const GAME_ORIGIN = 'https://poke.idleworld.online';

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

    // Se le da tiempo de sobra a que la ventana se monte y, si fuera a crear paneles, los
    // creara: el fallo era que aparecían solos al arrancar.
    await dormir(9000);

    const estado = await ventana.webContents.executeJavaScript(`(() => ({
      paneles: document.querySelectorAll('#grid .panel').length,
      webviews: document.querySelectorAll('#grid webview').length,
      filasDeCuentas: document.querySelectorAll('#accountRows .account-row').length,
      modalAbierto: !document.getElementById('modalBackdrop').hidden
    }))()`);

    const vivos = webContents.getAllWebContents().filter((wc) => !wc.isDestroyed());
    const delJuego = vivos.filter((wc) => {
      try { return wc.getURL().startsWith(GAME_ORIGIN); } catch { return false; }
    });

    console.log('--- un perfil sin cuentas ---');
    console.log(`  ${estado.paneles} paneles, ${estado.webviews} webviews en la rejilla, ${vivos.length} webviews en total`);
    console.log(`  webviews cargando el juego: ${delJuego.length}${delJuego.length ? ` → ${delJuego.map((wc) => wc.getURL().slice(0, 60)).join(', ')}` : ''}`);

    comprobar(estado.paneles === 0, 'sin cuentas no se crea ningún panel', `${estado.paneles} paneles`);
    comprobar(estado.webviews === 0, 'y ninguna webview en la rejilla', `${estado.webviews} webviews`);
    comprobar(delJuego.length === 0, 'así que no se carga el juego ni una vez', `${delJuego.length} webviews del juego`);

    // Y el usuario sigue teniendo por dónde empezar: la ventana de cuentas con sus filas.
    comprobar(estado.modalAbierto, 'se abre la ventana de cuentas para poder empezar', estado.modalAbierto ? '' : 'estaba cerrada');
    comprobar(estado.filasDeCuentas >= 1, 'con filas en blanco para rellenar', `${estado.filasDeCuentas} filas`);

    // Y nada de lo que el launcher necesita para funcionar se ha roto por el camino.
    const sigueEnPie = await ventana.webContents.executeJavaScript(`(() => ({
      rejilla: Boolean(document.getElementById('grid')),
      botonCuentas: Boolean(document.getElementById('accountsButton')),
      botonIniciar: Boolean(document.getElementById('loginAllButton')),
      sondeos: typeof window.__pokeGridPreviewFarmRecommendations === 'function' || true
    }))()`);
    console.log('');
    comprobar(sigueEnPie.rejilla && sigueEnPie.botonCuentas && sigueEnPie.botonIniciar,
      'y el launcher sigue entero: rejilla, botón de cuentas y botón de iniciar',
      JSON.stringify(sigueEnPie));
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
    ? 'Arranque sin cuentas: ningún panel, ninguna webview del juego, y la ventana de cuentas para empezar.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
