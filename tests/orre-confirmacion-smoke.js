// La confirmación automática del aviso de viaje a Orre.
//
// POR QUÉ EXISTE
//
// El permiso «Permitir viaje a Orre con o sin MT» sí llegaba al guion de farmeo (`allowOrreTravel`),
// pero la búsqueda del aviso estaba atada a las cuatro frases EN INGLÉS del juego:
//
//     hunt properly | needs both the aoe | elemental tms | still want to enter
//
// El juego del usuario va en español, así que el patrón no casaba nunca: la espera se agotaba, se
// seguía de largo y el diálogo se quedaba abierto esperando un clic. El botón del launcher no era
// que no hiciera nada —el permiso llegaba bien—: lo que no se reconocía era el aviso.
//
// Lo que se comprueba aquí es que la detección ya NO depende de las palabras. Se busca por
// estructura: un diálogo con un botón «Sí» y otro «No». Da igual el idioma y el texto exacto, que es
// justo lo que se rompió. La búsqueda por texto se queda como segundo recurso, con el español
// añadido al inglés que ya había.
//
// Monta el diálogo tal como sale en la captura del usuario —texto español y los dos botones— y
// comprueba que se pulsa «Sí» y no «No».
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function loadRendererFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`No se pudo extraer ${name}.`);
  return Function(`${source.slice(start, end)}; return ${name};`)();
}

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

// El diálogo tal cual sale en el juego: el texto de la captura del usuario y los dos botones.
const AVISO_ES = 'Para cazar correctamente en el área adecuada, tu Pokémon necesita tener los TMs de AoE y de elemento activos. Aun así, ¿deseas entrar?';
const AVISO_EN = 'To hunt properly in the right area, your Pokémon needs both the AOE and elemental TMs active. Do you still want to enter?';

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false, width: 900, height: 700,
    webPreferences: { contextIsolation: false, sandbox: false }
  });
  try {
    await ventana.loadURL('data:text/html;charset=utf-8,<body></body>');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const construir = loadRendererFunction(renderer, 'buildOrreTravelConfirmationScript', 'buildFarmAutomationScript');
    // El constructor devuelve el código de una IIFE, no la ejecuta: es el guion de farmeo quien la
    // inyecta dentro de su propio texto. Aquí se llama igual para comprobar lo mismo.
    const detector = construir();

    // Monta un diálogo y registra qué botones se pulsan de verdad, con un listener: por si acaso.
    const montarAviso = (texto, botones) => ventana.webContents.executeJavaScript(`(() => {
      document.body.innerHTML = '';
      window.__pulsados = [];
      const caja = document.createElement('div');
      caja.className = 'game-dialog';
      caja.innerHTML = '<p>' + ${JSON.stringify(texto)} + '</p>' + ${JSON.stringify(botones)}
        .map((t, i) => '<button class="dlg-btn" data-i="' + i + '">' + t + '</button>').join('');
      document.body.appendChild(caja);
      for (const boton of caja.querySelectorAll('button')) {
        boton.addEventListener('click', () => window.__pulsados.push(boton.textContent.trim()));
      }
      return true;
    })()`);

    // El error se recoge dentro de la página: si la IIFE revienta, executeJavaScript solo devuelve
    // un mensaje genérico que no dice nada.
    const detectar = () => ventana.webContents.executeJavaScript(`(() => {
      try {
        return (${detector})();
      } catch (error) {
        return { confirmado: false, como: null, error: String(error && error.message || error) };
      }
    })()`);
    const pulsados = () => ventana.webContents.executeJavaScript('window.__pulsados || []');

    // --- 1. El aviso en español: el caso que fallaba ---------------------------
    console.log('--- el aviso tal como sale en tu juego ---');
    await montarAviso(AVISO_ES, ['Sí', 'No']);
    const resultado = await detectar();
    console.log(`  (detalle) ${JSON.stringify(resultado)}`);
    comprobar(!resultado.error, 'la detección se ejecuta sin reventar', resultado.error || '');
    comprobar(resultado.confirmado === true, 'confirma el aviso en español', JSON.stringify(resultado));
    comprobar(Array.isArray(await pulsados()) && (await pulsados())[0] === 'Sí',
      'y pulsa «Sí» de verdad', JSON.stringify(await pulsados()));

    // --- 2. Y no pulsa «No» ----------------------------------------------------
    await montarAviso(AVISO_ES, ['No', 'Sí']);
    const invertido = await detectar();
    comprobar(invertido.confirmado === true, 'también con los botones en el otro orden', JSON.stringify(invertido));
    comprobar((await pulsados())[0] === 'Sí', 'y sigue pulsando «Sí», no el primero que encuentra',
      JSON.stringify(await pulsados()));

    // --- 3. Sin el aviso, no toca nada ----------------------------------------
    await ventana.webContents.executeJavaScript("document.body.innerHTML = ''; window.__pulsados = [];");
    const ninguno = await detectar();
    comprobar(ninguno.confirmado === false, 'sin aviso no confirma nada', JSON.stringify(ninguno));

    // --- 4. El inglés de antes sigue valiendo (no se pierde lo que funcionaba) --
    await montarAviso(AVISO_EN, ['Yes', 'No']);
    const ingles = await detectar();
    comprobar(ingles.confirmado === true, 'el aviso en inglés también se confirma', JSON.stringify(ingles));
    comprobar((await pulsados())[0] === 'Yes', 'pulsando «Yes»', JSON.stringify(await pulsados()));

    // --- 5. Un «Sí» suelto no se toca: sin aviso que lo acompaña, no se contesta -
    await montarAviso('¿Quieres continuar con la partida?', ['Sí']);
    const suelto = await detectar();
    comprobar(suelto.confirmado === false, 'un botón «Sí» suelto, sin aviso que lo acompañe, no se pulsa',
      JSON.stringify(suelto));
    comprobar((await pulsados()).length === 0, 'y no se pulsa nada', JSON.stringify(await pulsados()));

    // --- 6. El permiso sigue mandando sobre la llamada -------------------------
    // Lo que decide si se llama a esto es el guion de farmeo, y solo con el permiso activo y en un
    // destino de Orre. Aquí se comprueba sobre el propio código, que es donde está la decisión.
    const enElGuion = renderer.slice(
      renderer.indexOf('function buildFarmAutomationScript('),
      renderer.indexOf('function cleanFarmError(')
    );
    comprobar(/isOrreTarget && allowOrreTravel/.test(enElGuion),
      'el guion solo confirma con el permiso activo y en un destino de Orre');
    comprobar(/allowOrreTravel = \$\{JSON\.stringify\(allowOrreTravel\)\}/.test(enElGuion),
      'y el permiso se le pasa al guion tal cual');
  } catch (e) {
    console.log(`\nFALLO: ${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e}`);
    fallos.push('excepción');
  } finally {
    if (!ventana.isDestroyed()) ventana.destroy();
  }

  console.log('');
  console.log(fallos.length === 0
    ? 'Aviso de Orre: se reconoce por estructura, así que da igual el idioma ni las palabras exactas.'
    : `${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});