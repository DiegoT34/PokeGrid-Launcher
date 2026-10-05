// Captura la maqueta del selector con la misma técnica que la prueba del panel de
// farmeo: Chromium de Electron cargando la página y escribiendo un PNG.
//
// La herramienta del navegador no puede capturar porque su ventana no está visible en
// el escritorio, y una captura de esa ventana saldría a medias. Aquí no hay nada de eso:
// la página se carga entera y se guarda el archivo.
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');
const URL_MAQUETA = process.env.MAQUETA || 'http://127.0.0.1:8731/propuesta-selector.html';
const SALIDA = path.join(RAIZ, 'propuesta-selector.png');
const ALTO = Number(process.env.ALTO || 900);
const ANCHO = Number(process.env.ANCHO || 1260);

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    width: ANCHO,
    height: ALTO,
    webPreferences: { offscreen: false }
  });

  const problemas = [];
  ventana.webContents.on('console-message', (evento) => {
    const p = evento && evento.message !== undefined ? evento : null;
    if (p && p.level >= 2) problemas.push(p.message);
  });

  await ventana.loadURL(URL_MAQUETA);
  // Un par de fotogramas: la rejilla se pinta en el primer `requestAnimationFrame` y
  // el `ResizeObserver` repinta después. Sin esperar, la captura sale con la lista a
  // medio hacer.
  await new Promise((r) => setTimeout(r, 1200));

  const medidas = await ventana.webContents.executeJavaScript(`(() => {
    const rejilla = document.getElementById('rejilla');
    const cs = getComputedStyle(rejilla);
    const paso = parseFloat(cs.getPropertyValue('--tarjeta')) + parseFloat(cs.getPropertyValue('--hueco'));
    const tarjetas = [...rejilla.querySelectorAll('[data-i]')].map((n) => Number(n.dataset.i));
    const alt = t => Math.round(t.getBoundingClientRect().height);
    const primerT = [...rejilla.querySelectorAll('[data-i]')][0];
    return {
      tarjetasEnElDom: tarjetas.length,
      total: 451,
      paso,
      altoTarjeta: primerT ? primerT.getBoundingClientRect().height : null,
      altoRejilla: rejilla.clientHeight,
      altoDesplazable: rejilla.scrollHeight,
      altoEsperado: Math.ceil(451 / 3) * parseFloat(cs.getPropertyValue('--tarjeta')) + (Math.ceil(451/3) - 1) * parseFloat(cs.getPropertyValue('--hueco')) + 22,
      dialogo: alt(document.querySelector('.farm-picker')),
      cabecera: alt(document.querySelector('.farm-picker-head')),
      barra: alt(document.querySelector('.farm-picker-tools')),
      ruta: alt(document.querySelector('.farm-recommended-route')),
      tarjetasCortadas: [...rejilla.querySelectorAll('[data-i]')].filter((n) => {
        const c = n.querySelector('.farm-smart-copy');
        return c && c.scrollHeight > c.clientHeight + 1;
      }).length,
      separadorVertical: getComputedStyle(rejilla.querySelector('[data-i]'), '::after').display
    };
  })()`);

  const fs = require('node:fs');
  fs.writeFileSync(SALIDA, (await ventana.webContents.capturePage()).toPNG());

  console.log('--- medidas de la maqueta ---');
  for (const [que, valor] of Object.entries(medidas)) console.log(`  ${que.padEnd(20)} ${valor}`);
  console.log(`\nproblemas de consola: ${problemas.length}`);
  for (const p of problemas.slice(0, 5)) console.log(`  ${p.slice(0, 110)}`);
  console.log(`\ncaptura: ${SALIDA}`);

  app.quit();
});
