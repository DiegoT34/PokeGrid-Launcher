// Arranca el renderer como lo hacen las pruebas y vuelca lo que dice la consola,
// lo que encuentra en la página y —lo que más interesa— qué elementos siguen
// mostrando un glifo suelto en vez de un icono.
//
// Existe por esto: cuando algo se rompe en el arranque, la pantalla se queda en
// blanco y las pruebas solo dicen «se agotó el tiempo esperando». La consola del
// renderer tenía el motivo y nadie la leía. Y los emojis se cuelan en el texto
// copiado del juego sin que ningún aviso los delate.
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();

// Rango de símbolos decorativos: pictogramas, dingbats y flechas. Es lo que se
// busca dentro de los nodos de texto para ver qué se ha quedado sin icono.
// Va como cadena y no como literal: hay que poder meterlo dentro del código que se
// ejecuta en la página, y una barra doble dentro de un literal rompe el rango.
const PATRON_DECORATIVOS = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{FE0F}\\u{2190}-\\u{21FF}\\u{2300}-\\u{23FF}\\u{2B50}]';
const DECORATIVOS = new RegExp(PATRON_DECORATIVOS, 'u');
void DECORATIVOS;

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(__dirname, '..', 'src', 'preload.js'), contextIsolation: true }
  });

  const errores = [];
  ventana.webContents.on('console-message', (evento) => {
    const params = evento && evento.message !== undefined ? evento : null;
    const nivel = params ? params.level : 3;
    const mensaje = params ? params.message : String(evento);
    if (nivel >= 2) errores.push(mensaje);
    if (/before initialization|is not a function|Cannot access/.test(mensaje)) console.log(`[nivel ${nivel}] ${mensaje}`);
  });
  ventana.webContents.on('render-process-gone', (e, d) => errores.push(`render process gone: ${JSON.stringify(d)}`));

  await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  await new Promise((r) => setTimeout(r, 3500));

  const estado = await ventana.webContents.executeJavaScript(`(() => {
    const DECORATIVOS = new RegExp(${JSON.stringify(PATRON_DECORATIVOS)}, 'u');
    const salida = [];
    const recorrer = (raiz) => {
      for (const nodo of raiz.childNodes) {
        if (nodo.nodeType === Node.TEXT_NODE) {
          const texto = nodo.textContent.trim();
          if (texto && DECORATIVOS.test(texto)) {
            const el = nodo.parentElement;
            const donde = el ? (el.id ? '#' + el.id : el.className || el.tagName) : '?';
            salida.push({ donde: String(donde).slice(0, 46), texto: texto.slice(0, 24), visible: Boolean(el && el.offsetParent !== null) });
          }
        } else if (nodo.nodeType === Node.ELEMENT_NODE) {
          if (nodo.tagName === 'SCRIPT' || nodo.tagName === 'STYLE') continue;
          recorrer(nodo);
        }
      }
    };
    recorrer(document.body);
    const iconos = [...document.querySelectorAll('.global-actions .top-action-icon')];
    return {
      pokeGrid: typeof window.pokeGrid,
      iconosEnMenu: iconos.length,
      svgEnMenu: iconos.filter((c) => c.querySelector('svg')).length,
      glifosEnMenu: iconos.filter((c) => !c.querySelector('svg') && c.textContent.trim()).length,
      glifos: salida,
      erroresArranque: []
    };
  })()`);

  estado.erroresArranque = errores.filter((m) => !/No handler registered/.test(m));
  console.log('--- estado ---');
  console.log(JSON.stringify(estado, null, 2));

  const visibles = (estado.glifos || []).filter((g) => g.visible);
  console.log(`\nglifos visibles: ${visibles.length}`);
  for (const g of visibles) console.log(`  ${g.donde}  "${g.texto}"`);

  app.quit();
});
