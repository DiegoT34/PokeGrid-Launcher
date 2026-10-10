// Los modos de lectura del Hunt Analyzer.
//
// Lo que hay que poder comprobar no es «el panel se ve bien»: es si el temporizador está
// programado o no, porque eso es lo único que cambia de verdad entre los modos y es lo que se
// paga en CPU. Un panel que lee cada 3 segundos y uno que lee al abrirse se ven igual en
// pantalla; lo que los distingue es que uno tiene un `setInterval` y el otro no.
//
// Por eso se mira el gancho `__pokeGridHuntLectura` —que dice el ajuste, los milisegundos y si
// hay temporizador— y no el dibujo. Y se comprueba también el texto de estado, porque un modo
// que no lo dice es un modo que el usuario no puede entender: no es lo mismo «en vivo» que «lo
// último que se leyó fue a las 17:21».
//
// El ajuste es UNO para todas las cuentas, así que se comprueba que cambiarlo en un panel lo
// cambia en todos.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil limpio: el ajuste vive en localStorage, y sin esto se arrastraría el de otra ejecución.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-hunt-modos-'));
app.setPath('userData', userDataDir);

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

async function abrirVentana() {
  const ventana = new BrowserWindow({
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
  while (Date.now() - empezado < 20_000) {
    const listo = await ventana.webContents.executeJavaScript(
      'Boolean(window.__pokeGridHuntLectura && document.querySelectorAll(".panel").length === 4)'
    );
    if (listo) return ventana;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('La ventana no quedó lista: ni el gancho ni los cuatro paneles aparecieron.');
}

const leer = (ventana) => ventana.webContents.executeJavaScript(`(() => ({
  config: window.__pokeGridHuntLectura.config(),
  ms: window.__pokeGridHuntLectura.ms(),
  programado: window.__pokeGridHuntLectura.programado(),
  textoAbierto: window.__pokeGridHuntLectura.texto({ huntLastUpdate: Date.now() }),
  textoNuncaLeido: window.__pokeGridHuntLectura.texto({}),
  guardado: localStorage.getItem('idle-poke:hunt-read:v1'),
  botones: document.querySelectorAll('.hunt-float-settings-toggle').length,
  bloques: document.querySelectorAll('.hunt-float-settings[hidden]').length,
  selects: [...document.querySelectorAll('.hunt-float-settings-modo')].map((s) => s.value),
  segundosVisibles: [...document.querySelectorAll('.hunt-float-settings-segundos')].filter((l) => !l.hidden).length
}))()`);

const cambiarModo = (ventana, modo) => ventana.webContents.executeJavaScript(`(() => {
  const select = document.querySelector('.hunt-float-settings-modo');
  select.value = ${JSON.stringify(modo)};
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return select.value;
})()`);

app.whenReady().then(async () => {
  let ventana = null;
  try {
    ventana = await abrirVentana();

    // --- 1. Lo que viene de fábrica -------------------------------------------------
    const arranque = await leer(ventana);
    console.log('--- de fábrica ---');
    console.log(`  modo ${arranque.config.modo}, ${arranque.ms} ms, temporizador ${arranque.programado ? 'programado' : 'apagado'}`);
    comprobar(arranque.config.modo === 'abrir', 'de fábrica lee solo al abrir', `modo: ${arranque.config.modo}`);
    comprobar(arranque.ms === 0, 'y por eso no hay intervalo ninguno', `${arranque.ms} ms`);
    comprobar(arranque.programado === false, 'ni temporizador programado: no se despierta para nada', String(arranque.programado));
    comprobar(arranque.textoAbierto.startsWith('Al abrir'), 'y el estado lo dice, que si no el usuario no entiende qué pasa', arranque.textoAbierto);
    comprobar(arranque.textoNuncaLeido.startsWith('Sin leer todavía'), 'sin haber leído nunca lo dice en vez de inventarse una hora', arranque.textoNuncaLeido);

    // --- 2. El botón y el bloque ----------------------------------------------------
    console.log('\n--- el botón de ajustes ---');
    comprobar(arranque.botones === 4, 'cada panel tiene su botón de ajustes', `${arranque.botones} botones`);
    comprobar(arranque.bloques === 4, 'y el bloque empieza cerrado en todos', `${arranque.bloques} cerrados`);
    comprobar(arranque.selects.every((v) => v === 'abrir'), 'los desplegables dicen el modo guardado', JSON.stringify(arranque.selects));
    comprobar(arranque.segundosVisibles === 0, 'y el de segundos está escondido hasta que haga falta', `${arranque.segundosVisibles} visibles`);

    const abierto = await ventana.webContents.executeJavaScript(`(() => {
      const boton = document.querySelector('.hunt-float-settings-toggle');
      boton.click();
      return {
        expandido: boton.getAttribute('aria-expanded'),
        bloquesVisibles: [...document.querySelectorAll('div.hunt-float-settings')].filter((n) => !n.hidden).length,
        botones: document.querySelectorAll('.hunt-float-settings-toggle').length
      };
    })()`);
    comprobar(abierto.bloquesVisibles === 1, 'al pulsar el engranaje se despliega el bloque de ese panel, y solo el suyo', `${abierto.bloquesVisibles} abiertos`);
    comprobar(abierto.expandido === 'true', 'y el botón lo anuncia para quien lo lea con lector de pantalla', `aria-expanded: ${abierto.expandido}`);
    comprobar(abierto.botones === 4, 'el engranaje sigue ahí después de pulsarlo: el bloque no se lo come', `${abierto.botones} botones`);

    // --- 3. Tiempo real -------------------------------------------------------------
    await cambiarModo(ventana, 'tiempo-real');
    const tiempoReal = await leer(ventana);
    console.log('\n--- tiempo real ---');
    console.log(`  modo ${tiempoReal.config.modo}, ${tiempoReal.ms} ms, temporizador ${tiempoReal.programado ? 'programado' : 'apagado'}`);
    comprobar(tiempoReal.config.modo === 'tiempo-real', 'el modo cambia', tiempoReal.config.modo);
    comprobar(tiempoReal.ms === 3000, 'y lee cada 3 segundos, como antes', `${tiempoReal.ms} ms`);
    comprobar(tiempoReal.programado === true, 'con el temporizador programado de verdad', String(tiempoReal.programado));
    comprobar(tiempoReal.textoAbierto.startsWith('En vivo'), 'y el estado vuelve a decir «en vivo»', tiempoReal.textoAbierto);
    comprobar(tiempoReal.selects.every((v) => v === 'tiempo-real'), 'el cambio vale para todos los paneles, no solo para uno', JSON.stringify(tiempoReal.selects));

    // --- 4. Cada cierto tiempo ------------------------------------------------------
    await cambiarModo(ventana, 'intervalo');
    const conIntervalo = await leer(ventana);
    console.log('\n--- cada cierto tiempo ---');
    console.log(`  modo ${conIntervalo.config.modo}, ${conIntervalo.ms} ms, temporizador ${conIntervalo.programado ? 'programado' : 'apagado'}`);
    comprobar(conIntervalo.config.modo === 'intervalo', 'el modo cambia', conIntervalo.config.modo);
    comprobar(conIntervalo.segundosVisibles === 4, 'y aparece el desplegable de segundos en todos', `${conIntervalo.segundosVisibles} visibles`);
    comprobar(conIntervalo.ms === 30_000, 'de fábrica cada 30 segundos', `${conIntervalo.ms} ms`);

    const diez = await ventana.webContents.executeJavaScript(`(() => {
      const select = document.querySelector('.hunt-float-settings-segundos-select');
      select.value = '10';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { ms: window.__pokeGridHuntLectura.ms(), config: window.__pokeGridHuntLectura.config() };
    })()`);
    comprobar(diez.ms === 10_000 && diez.config.segundos === 10, 'al elegir 10 segundos se lee cada 10', JSON.stringify(diez.config));
    comprobar((await leer(ventana)).textoAbierto.includes('Cada 10 s'), 'y el estado lo dice con el número', (await leer(ventana)).textoAbierto);

    // --- 5. El ajuste se guarda de verdad -------------------------------------------
    const guardado = (await leer(ventana)).guardado;
    comprobar(Boolean(guardado) && JSON.parse(guardado).modo === 'intervalo' && JSON.parse(guardado).segundos === 10,
      'el ajuste queda guardado', String(guardado));

    ventana.webContents.reload();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const empezado = Date.now();
    while (Date.now() - empezado < 20_000) {
      const listo = await ventana.webContents.executeJavaScript(
        'Boolean(window.__pokeGridHuntLectura && document.querySelectorAll(".panel").length === 4)'
      );
      if (listo) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const trasRecargar = await leer(ventana);
    console.log('\n--- tras recargar ---');
    comprobar(trasRecargar.config.modo === 'intervalo' && trasRecargar.config.segundos === 10,
      'el ajuste sobrevive a recargar la ventana', JSON.stringify(trasRecargar.config));
    comprobar(trasRecargar.ms === 10_000 && trasRecargar.programado === true, 'y el temporizador arranca con él', `${trasRecargar.ms} ms`);
    comprobar(trasRecargar.segundosVisibles === 4, 'el desplegable de segundos no vuelve escondido', `${trasRecargar.segundosVisibles}`);
    comprobar(trasRecargar.selects.every((v) => v === 'intervalo'),
      'y los controles dicen lo que de verdad está pasando, no el valor de fábrica', JSON.stringify(trasRecargar.selects));

    // --- 6. Volver a solo al abrir apaga el temporizador ----------------------------
    await cambiarModo(ventana, 'abrir');
    const vuelta = await leer(ventana);
    console.log('\n--- y de vuelta a solo al abrir ---');
    comprobar(vuelta.programado === false && vuelta.ms === 0, 'volver a «solo al abrir» apaga el temporizador', `${vuelta.ms} ms, programado ${vuelta.programado}`);

    // --- 7. Un valor raro guardado a mano no puede romperlo -------------------------
    await ventana.webContents.executeJavaScript(`localStorage.setItem('idle-poke:hunt-read:v1', '{"modo":"lo-que-sea","segundos":0}')`);
    ventana.webContents.reload();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const empezado2 = Date.now();
    while (Date.now() - empezado2 < 20_000) {
      const listo = await ventana.webContents.executeJavaScript(
        'Boolean(window.__pokeGridHuntLectura && document.querySelectorAll(".panel").length === 4)'
      );
      if (listo) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const basura = await leer(ventana);
    console.log('\n--- con un ajuste imposible guardado a mano ---');
    comprobar(basura.config.modo === 'abrir' && basura.config.segundos === 30,
      'un modo que no existe y 0 segundos caen en los valores por defecto, no en leer todo el rato', JSON.stringify(basura.config));
    comprobar(basura.ms === 0, 'y no se programa ningún temporizador absurdo', `${basura.ms} ms`);
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
    ? 'Hunt Analyzer: tres modos de lectura, uno para todas las cuentas, con «solo al abrir» de fábrica y sin ningún temporizador en ese modo.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
