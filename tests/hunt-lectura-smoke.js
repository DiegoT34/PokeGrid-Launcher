// El Hunt Analyzer leyendo de verdad, contra una copia fiel del panel del juego.
//
// POR QUÉ EXISTE ESTA PRUEBA
//
// La prueba de los modos miraba los ajustes y el temporizador, pero nunca ABRÍA un panel ni dejaba
// el juego con el panel cerrado. Y eso es justo lo que hace el juego de verdad: el Hunt Analyzer
// NO está en el DOM mientras está cerrado —se comprobó con el depurador sobre el juego abierto—,
// se crea al pulsar su botón del muelle, y eso tarda un momento. Aquí se monta ese mismo camino:
// la copia empieza SIN panel, con su botón, y el panel aparece 1,2 segundos después de pulsarlo.
//
// También se copiaron del juego real los nombres de clase y los textos, que es donde aparecieron
// los fallos: la etiqueta del tiempo dice «Tiempo en la caza» (no «tiempo en hunt»), y el precio de
// cada drop vive en `.ha-drop-gold`.
//
// Y se comprueban los tres modos por lo que el usuario puede ver: la antigüedad de la lectura. En
// «cada cierto tiempo» y en «tiempo real» esa antigüedad no sube de un par de segundos porque se
// vuelve a leer; en «solo al abrir» sube, porque no se lee más.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-hunt-lectura-'));
app.setPath('userData', userDataDir);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// El DOM del juego: el muelle con su botón, y el panel que NO existe hasta que se pulsa. Mismos
// nombres de clase, mismos textos en español y la misma forma —valor en <b>, etiqueta en <small>.
function paginaDelJuego() {
  const tarjeta = (clase, icono, valor, etiqueta) =>
    `<div class="ha-card ${clase}"><span class="ha-card-ico">${icono}</span><b>${valor}</b><small>${etiqueta}</small></div>`;
  const panel = `
    <div class="ha-window">
      <div class="ha-head"><span>Hunt Analyzer</span><button class="ha-x" aria-label="Cerrar">×</button></div>
      <div class="ha-grid">
        ${tarjeta('', '⚔️', '38', 'Derrotados')}
        ${tarjeta('', '⏱️', '6m 49s', 'Tiempo en la caza')}
        ${tarjeta('ha-xp', '✨', '306.956', 'XP ganada')}
        ${tarjeta('ha-catch', '🔴', '7', 'Capturados')}
        ${tarjeta('ha-loot', '💰', '$ 5.312', 'Loot (105 objetos)')}
        ${tarjeta('ha-supply', '🛒', '-$ 0', 'Supply (0 balls · 0 potions)')}
      </div>
      <div class="ha-rates">
        <span class="ha-rate pos">📈 +$46.749/h</span>
        <span class="ha-rate xp">✨ 2.864.096 XP/h</span>
        <span class="ha-rate">⚔️ 343/h</span>
        <span class="ha-rate ha-catch-stats">🔴 Nenhum catch nesta hunt</span>
      </div>
      <div class="ha-balance">Saldo (Loot + Capturas − Supply) <b>+$ 5.312</b></div>
      <label class="ha-market-toggle"><input type="checkbox" checked><span>Considerar el precio de los objetos en el Mercado</span></label>
      <div class="ha-drops show-drops">
        <div class="ha-drop"><span class="ha-drop-ico"><img alt="" src="pinsir_horn.png"></span><span class="ha-drop-name">Pinsir Horn</span><span class="ha-drop-qty">×4</span><span class="ha-drop-gold">$ 2.000</span></div>
        <div class="ha-drop"><span class="ha-drop-ico"><img alt="" src="pot_of_moss_bug.png"></span><span class="ha-drop-name">Pot of Moss Bug</span><span class="ha-drop-qty">×12</span><span class="ha-drop-gold">$ 96</span></div>
        <div class="ha-drop"><span class="ha-drop-ico"><img alt="" src="moss.png"></span><span class="ha-drop-name">Moss</span><span class="ha-drop-qty">×12</span><span class="ha-drop-gold">$ 12</span></div>
      </div>
    </div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>juego</title></head><body>
    <div class="game-dock">
      <button class="dock-btn" title="Pokémon"></button>
      <button class="dock-btn" title="Mapa"></button>
      <button class="dock-btn" id="botonHunt" title="Hunt Analyzer"></button>
    </div>
    <div id="dondeVaElPanel"></div>
    <script>
      // El panel se crea al pulsar, como en el juego, y tarda un momento: más que el real (246 ms
      // medidos) para que la prueba exija de verdad que se espere.
      document.getElementById('botonHunt').addEventListener('click', () => {
        if (document.querySelector('.ha-window')) return;
        setTimeout(() => {
          if (document.querySelector('.ha-window')) return;
          document.getElementById('dondeVaElPanel').innerHTML = ${JSON.stringify(panel)};
        }, 1200);
      });
    <\/script>
  </body></html>`;
}

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
        'Boolean(window.__pokeGridHuntLectura && document.querySelectorAll(".panel").length === 4 && document.querySelector("#grid webview"))'
      );
      if (listo) break;
      await dormir(150);
    }

    const archivo = path.join(userDataDir, 'juego.html');
    fs.writeFileSync(archivo, paginaDelJuego(), 'utf8');
    await ventana.webContents.executeJavaScript(`(() => {
      const wv = document.querySelector('#grid webview');
      window.__cargado = new Promise((resolve) => {
        wv.addEventListener('did-finish-load', () => resolve(true), { once: true });
        wv.addEventListener('did-fail-load', () => resolve(false), { once: true });
      });
      wv.src = 'file:///${archivo.replace(/\\/g, '/')}';
      return true;
    })()`);
    const cargado = await ventana.webContents.executeJavaScript('window.__cargado');
    comprobar(cargado === true, 'la página del juego (copia) carga en la webview de la cuenta');
    await dormir(400);

    // Y de entrada NO hay panel: como en el juego.
    const antesDeAbrir = await ventana.webContents.executeJavaScript("Boolean(document.querySelector('#grid webview') && document.querySelector('#grid webview').getURL())");
    comprobar(antesDeAbrir === true, 'la copia está cargada en la webview de la cuenta');

    // --- 1. Abrir el panel lee, aunque el panel del juego no exista todavía ---------
    await ventana.webContents.executeJavaScript("window.__pokeGridHuntLectura.fijar({ modo: 'tiempo-real' })");
    await ventana.webContents.executeJavaScript("document.querySelector('.hunt-toggle').click()");
    await dormir(2600);

    const trasAbrir = await ventana.webContents.executeJavaScript(`(() => {
      const panel = document.querySelector('.hunt-float-panel');
      const tarjeta = (clave) => panel.querySelector('[data-metric-key="' + clave + '"]')?.textContent.replace(/\\s+/g, ' ').trim() || '';
      return {
        estado: panel.querySelector('.hunt-float-state').textContent.trim(),
        texto: panel.textContent.replace(/\\s+/g, ' ').trim(),
        tarjetas: [...panel.querySelectorAll('.hunt-flat-metric')].length,
        tiempo: tarjeta('time'),
        derrotados: tarjeta('defeated'),
        drops: [...panel.querySelectorAll('.hunt-flat-drop')].map((d) => d.textContent.replace(/\\s+/g, ' ').trim()),
        balance: panel.querySelector('.hunt-flat-balance')?.textContent.replace(/\\s+/g, ' ').trim() || ''
      };
    })()`);

    console.log('--- al abrir el panel, con el panel del juego creado al pulsar ---');
    console.log(`  estado: ${trasAbrir.estado}`);
    console.log(`  tarjetas: ${trasAbrir.tarjetas}`);
    console.log(`  tiempo: ${trasAbrir.tiempo}`);
    console.log(`  derrotados: ${trasAbrir.derrotados}`);
    for (const d of trasAbrir.drops) console.log(`  drop: ${d}`);
    console.log(`  saldo: ${trasAbrir.balance}`);

    comprobar(/^En vivo/.test(trasAbrir.estado), 'se espera a que el panel del juego aparezca y se lee', trasAbrir.estado);
    comprobar(!/todavía no está disponible/.test(trasAbrir.estado), 'sin dar error por no encontrarlo', trasAbrir.estado);
    comprobar(trasAbrir.tarjetas === 9, 'salen las nueve tarjetas (seis datos y tres ritmos)', `${trasAbrir.tarjetas}`);
    comprobar(/6m 4\ds/.test(trasAbrir.tiempo), 'el tiempo de caza llega, y avanza solo', trasAbrir.tiempo);
    // El fallo del idioma: la etiqueta del juego se colaba dentro de la tarjeta.
    comprobar(!/Tiempo en la caza/.test(trasAbrir.tiempo), 'y no se cuela la etiqueta del juego dentro de la tarjeta', trasAbrir.tiempo);
    comprobar(/38/.test(trasAbrir.derrotados), 'el derrotado llega', trasAbrir.derrotados);
    comprobar(/306\.956/.test(trasAbrir.texto), 'la XP llega');
    comprobar(/5\.312/.test(trasAbrir.balance), 'el saldo llega', trasAbrir.balance);
    comprobar(trasAbrir.drops.some((d) => /2\.000/.test(d)), 'el PRECIO de cada drop llega', trasAbrir.drops[0] || '(sin drops)');
    comprobar(trasAbrir.drops.some((d) => /Pinsir Horn/.test(d)), 'y su nombre', trasAbrir.drops[0] || '(sin drops)');

    // --- 2. Los tres modos, por la antigüedad de la lectura -------------------------
    const edadDe = (texto) => {
      const m = String(texto).match(/hace (\d+)s/);
      return m ? Number(m[1]) : null;
    };
    const estado = () => ventana.webContents.executeJavaScript("document.querySelector('.hunt-float-state').textContent.trim()");

    await dormir(4200);
    const enVivo = await estado();
    console.log(`\n--- tiempo real, tras 4,2 s ---\n  ${enVivo}`);
    comprobar(edadDe(enVivo) !== null && edadDe(enVivo) <= 2,
      'en tiempo real se vuelve a leer solo: la lectura no envejece',
      `antigüedad ${edadDe(enVivo)}s`);

    await ventana.webContents.executeJavaScript("window.__pokeGridHuntLectura.fijar({ modo: 'abrir' })");
    await dormir(1000);
    const antesAbrir = await estado();
    await dormir(4200);
    const despuesAbrir = await estado();
    console.log(`\n--- solo al abrir ---\n  antes:   ${antesAbrir}\n  después: ${despuesAbrir}`);
    comprobar(/^Al abrir/.test(despuesAbrir), 'el estado cambia de modo', despuesAbrir);
    comprobar(edadDe(despuesAbrir) > edadDe(antesAbrir) + 2,
      'y en «solo al abrir» la lectura envejece: no se vuelve a leer',
      `${edadDe(antesAbrir)}s → ${edadDe(despuesAbrir)}s`);

    await ventana.webContents.executeJavaScript("window.__pokeGridHuntLectura.fijar({ modo: 'intervalo', segundos: 5 })");
    await dormir(1000);
    await dormir(6000);
    const enIntervalo = await estado();
    console.log(`\n--- cada 5 s ---\n  ${enIntervalo}`);
    comprobar(/^Cada 5 s/.test(enIntervalo), 'el estado nombra el intervalo', enIntervalo);
    comprobar(edadDe(enIntervalo) <= 2, 'y se vuelve a leer cada cinco segundos', `antigüedad ${edadDe(enIntervalo)}s`);
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
    ? 'Hunt Analyzer: espera a que el panel del juego aparezca, lee todos los datos y relee según el modo.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
