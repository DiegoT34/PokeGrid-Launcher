// Arranca el renderer como lo hacen las pruebas y vuelca lo que dice la consola y
// lo que acaba finding en la página.
//
// Existe por esto: cuando algo se rompe en el arranque, la pantalla se queda en
// blanco y las pruebas solo dicen «se agotó el tiempo esperando». La consola del
// renderer tenía el motivo y nadie la leía. Esta vez localizó el fallo en un minuto.
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(__dirname, '..', 'src', 'preload.js'), contextIsolation: true }
  });

  const errores = [];
  ventana.webContents.on('console-message', (evento) => {
    // En Electron reciente esto es un objeto, no los argumentos sueltos.
    const params = evento && evento.message !== undefined ? evento : null;
    const nivel = params ? params.level : 3;
    const mensaje = params ? params.message : String(evento);
    if (nivel >= 2) errores.push(mensaje);
    if (/before initialization|is not a function|Cannot access/.test(mensaje)) {
      console.log(`[nivel ${nivel}] ${mensaje}`);
    }
  });
  ventana.webContents.on('render-process-gone', (e, d) => errores.push(`render process gone: ${JSON.stringify(d)}`));

  await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await new Promise((r) => setTimeout(r, 3500));

  const estado = await ventana.webContents.executeJavaScript(`(() => {
    const iconos = [...document.querySelectorAll('.global-actions .top-action-icon')];
    return {
      pokeGrid: typeof window.pokeGrid,
      iconosEnMenu: iconos.length,
      svgEnMenu: iconos.filter((c) => c.querySelector('svg')).length,
      glifosEnMenu: iconos.filter((c) => !c.querySelector('svg') && c.textContent.trim()).length,
      erroresArranque: []
    };
  })()`);
  estado.erroresArranque = errores.filter((m) => !/No handler registered/.test(m));
  console.log('--- estado ---');
  console.log(JSON.stringify(estado, null, 2));

  app.quit();
});
