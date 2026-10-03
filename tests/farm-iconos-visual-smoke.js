const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-farm-iconos-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const { app, BrowserWindow } = require('electron');

// El fallo que se corrigió aquí era VISUAL: el botón de iniciar de cada tarjeta llevaba
// a la vez el triángulo de CSS (`.play-icon`, pintado con `border-left` sobre un
// elemento de cero por cero) y el SVG del pack. Como el span no tenía caja, el SVG no
// se recortaba y los dos triángulos se veían uno al lado del otro.
//
// Leer el código lo detecta, pero no lo demuestra. Esta prueba arranca el launcher de
// verdad, abre el panel con `#farmButton` y MIDE lo que hay dentro de cada botón: no
// copia el markup, lo lee de la pantalla.
//
// Lo segundo que se comprueba aquí es lo contrario: «Iniciar farmeo automático» no
// tenía hueco de icono en el HTML. El CSS del pie ya estaba medido para uno
// (`.farm-actions .button .launcher-ui-icon`, `gap: 6px`, `inline-flex`), así que la
// caja estaba lista y el icono no llegó.

async function waitFor(window, expression, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

app.whenReady().then(async () => {
  let fallos = 0;
  const comprobar = (ok, mensaje, detalle) => {
    if (ok) {
      console.log(`  ok    ${mensaje}`);
    } else {
      fallos++;
      console.log(`  FALLA ${mensaje}\n        ${detalle}`);
    }
  };

  try {
    const started = Date.now();
    let mainWindow = null;
    while (!mainWindow && Date.now() - started < 20_000) {
      mainWindow = BrowserWindow.getAllWindows().find((window) => !window.isDestroyed()) || null;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    assert.ok(mainWindow, 'La ventana principal no se creó');
    await waitFor(mainWindow, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 4`);
    await new Promise((resolve) => setTimeout(resolve, 600));

    await mainWindow.webContents.executeJavaScript(`(() => { document.querySelector('#farmButton').click(); })()`);
    await waitFor(mainWindow, `!document.querySelector('#farmBackdrop').hidden && document.querySelectorAll('#farmAccountGrid .farm-account').length === 4`);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // En el código que se inyecta NO puede haber ni un backtick, ni en un comentario:
    // el literal de plantilla se cierra en el primero que encuentre, y todo lo que
    // viene después se vuelve basura. Por eso las notas largas van aquí fuera.
    //
    // Lo que se mide dentro de cada botón:
    //
    //   · glifos: cuántos se pintan, contando el SVG del pack y el triángulo de CSS.
    //   · desalineado: píxeles de diferencia entre el centro del icono y el del texto.
    //     Es lo único que puede salir mal con un inline-flex: que el icono se quede
    //     arriba o abajo.
    //   · contenidoCentrado: si el conjunto —icono, hueco, texto— está centrado en el
    //     botón. NO se comprueba que el icono esté centrado en el botón: el botón lleva
    //     hueco para el texto, y centrar el icono solo daría un botón descentrado, que
    //     es justo lo contrario de lo bien hecho.
    const medidas = await mainWindow.webContents.executeJavaScript(`(() => {
      const medir = (boton) => {
        const r = boton.getBoundingClientRect();
        const hijos = [...boton.children];
        const glifos = [...boton.querySelectorAll('*')].filter(
          (e) => e.matches('.play-icon') || e.tagName.toLowerCase() === 'svg'
        );
        const hr = hijos.length ? hijos[0].getBoundingClientRect() : null;
        const tr = [...boton.childNodes]
          .filter((n) => n.nodeType === 3 && n.textContent.trim())
          .map((n) => { const x = document.createRange(); x.selectNode(n); return x.getBoundingClientRect(); })[0];
        const desalineado = hr && tr ? Math.abs((hr.top + hr.height / 2) - (tr.top + tr.height / 2)) : 0;
        return {
          hijos: hijos.length,
          svg: boton.querySelectorAll('svg').length,
          cssTriangulos: boton.querySelectorAll('.play-icon').length,
          glifos: glifos.length,
          ancho: Math.round(r.width),
          alto: Math.round(r.height),
          anchoDelHueco: hr ? Math.round(hr.width) : 0,
          altoDelHueco: hr ? Math.round(hr.height) : 0,
          desalineado: Math.round(desalineado),
          contenidoCentrado: hr && tr
            ? Math.abs(((hr.left + tr.right) / 2) - (r.left + r.width / 2))
            : 0,
          texto: boton.textContent.trim()
        };
      };
      return {
        tarjetas: document.querySelectorAll('#farmAccountGrid .farm-account').length,
        iniciar: [...document.querySelectorAll('#farmAccountGrid .farm-account-action')].map(medir),
        pie: ['#stopFarmButton', '#cancelFarmButton', '#startFarmButton'].map((sel) => {
          const b = document.querySelector(sel);
          return b ? { sel, ...medir(b) } : { sel, ausente: true };
        }),
        errores: 0
      };
    })()`);

    console.log(`\ntarjetas en el panel: ${medidas.tarjetas}`);
    assert.ok(medidas.tarjetas === 4, `Se esperaban 4 tarjetas, hay ${medidas.tarjetas}`);

    // --- El botón de iniciar de cada tarjeta ---------------------------------
    console.log('\n--- el botón de iniciar de cada tarjeta ---');
    for (const [i, m] of medidas.iniciar.entries()) {
      console.log(`  tarjeta ${i + 1}: hijos ${m.hijos}, glifos ${m.glifos}, svg ${m.svg}, css ${m.cssTriangulos}, ${m.ancho}×${m.alto} px`);
    }
    for (const [i, m] of medidas.iniciar.entries()) {
      comprobar(m.glifos === 1, `la tarjeta ${i + 1} tiene UN glifo, no dos`, JSON.stringify(m));
      comprobar(m.svg === 1, `la tarjeta ${i + 1} pinta el icono del pack`, JSON.stringify(m));
      comprobar(m.cssTriangulos === 0, `la tarjeta ${i + 1} no lleva el triángulo de CSS`, JSON.stringify(m));
      comprobar(m.anchoDelHueco > 8 && m.anchoDelHueco < 26,
        `el icono de la tarjeta ${i + 1} tiene medida de icono y no de triángulo de CSS`, JSON.stringify(m));
    }

    // --- El pie ---------------------------------------------------------------
    console.log('\n--- el pie ---');
    for (const p of medidas.pie) {
      console.log(`  ${p.sel.padEnd(24)} «${p.texto}» glifos ${p.glifos} svg ${p.svg} hueco ${p.anchoDelHueco}×${p.altoDelHueco} botón ${p.ancho}×${p.alto} desalineado ${p.desalineado}px grupo descentrado ${Math.round(p.contenidoCentrado)}px`);
    }

    const piePor = (sel) => medidas.pie.find((p) => p.sel === sel);
    for (const sel of ['#stopFarmButton', '#startFarmButton']) {
      const p = piePor(sel);
      comprobar(p && p.svg === 1, `${sel} tiene su icono`, JSON.stringify(p));
      comprobar(p && p.anchoDelHueco > 8 && p.anchoDelHueco < 20, `${sel}: el hueco mide lo que un icono`, JSON.stringify(p));
      comprobar(p && p.desalineado <= 2, `${sel}: el icono está a la altura del texto`, JSON.stringify(p));
      comprobar(p && p.contenidoCentrado <= 2, `${sel}: el icono y el texto van centrados juntos en el botón`, JSON.stringify(p));
    }

    const cancelar = piePor('#cancelFarmButton');
    comprobar(cancelar && cancelar.svg === 0, '«Cancelar» se queda sin icono: es el botón de siempre, el que no hace nada de especial', JSON.stringify(cancelar));

    // --- Y una captura, porque el ojo es el último juez -----------------------
    const imagen = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, '..', 'panel-farmeo.png'), imagen.toPNG());
    console.log('\ncaptura: panel-farmeo.png');

    console.log(`\n${fallos === 0 ? 'Los botones llevan un solo icono y el de iniciar farmeo automático lo tiene.' : `${fallos} comprobaciones fallan.`}`);
  } catch (e) {
    console.log(`\nFALLO: ${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e}`);
    fallos++;
  } finally {
    // Borrar el perfil aquí casi nunca funciona: Electron sigue con los archivos
    // abiertos hasta que sale, y sale después de este `finally`. Un `EPERM` aquí es
    // una promesa rechazada sin capturar que ensucia la salida de la prueba y deja la
    // carpeta en el temporal. Se intenta dos veces y, si no, se dice y ya está.
    for (let intento = 0; intento < 3; intento++) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        break;
      } catch (e) {
        if (intento === 2) console.log(`  nota: la carpeta del perfil sigue pillada (${e.code}); se queda en el temporal.`);
      }
    }
  }

  app.exit(fallos === 0 ? 0 : 1);
});
