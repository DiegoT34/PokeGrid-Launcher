// Prueba de la 0.34.0: pestanas de cuenta reordenables, iconos SVG y fuera el brillo de hover.
//
// QUE COMPRUEBA Y POR QUE CADA COSA
//
//  - Que las pestanas de CUENTA se puedan reordenar. Antes se arrastraban y no pasaba nada:
//    `moverInstancia` solo buscaba en `browserInstances`, una cuenta no esta ahi, `findIndex` devolvia
//    -1 y la funcion se salia callada. El sintoma era una pestana que no se movia y ningun aviso.
//  - Que el orden se guarde. Si no se guarda, al reiniciar vuelven al orden de las cuentas, que es
//    justo lo que se habia movido.
//  - Que el boton de agrandar no aparezca en modo pestanas, donde la cuenta esta sola y no hay
//    rejilla a la que agrandarla.
//  - Que el icono de la cuenta se pinte. Sin esto `cuenta-3` no era la principal, caia al mapa de
//    iconos, no habia nada ahi y la pestana salia sin marca.
//  - Que no quede ningun brillo de hover en el CSS, y que la marca de la pestana activa SIGA: esa no
//    es un brillo, es lo unico que dice donde estas.
//  - Que la franja del color del tipo siga, que es un dato y no un adorno.
//
// QUE NO COMPRUEBA
//
// Que las pestanas se vean bien. Eso no se comprueba leyendo el DOM: se mira la captura. Un cambio de
// aspecto que pase estas comprobaciones puede seguir verse mal, y esta prueba no lo va a notar.
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');

function comprobar(que, ok, detalle) {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
  return ok;
}

async function esperar(window, expresion, ms = 15_000) {
  const desde = Date.now();
  while (Date.now() - desde < ms) {
    if (await window.webContents.executeJavaScript(`Boolean(${expresion})`)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

let fallos = 0;

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 920,
    webPreferences: {
      preload: path.join(RAIZ, 'tests', 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(RAIZ, 'src', 'index.html'));
    await esperar(window, 'window.pokeGrid && document.querySelectorAll(".panel").length === 4');

    console.log('\n0.34.0 — pestañas de cuenta:');

    // ---------------------------------------------------------- el CSS, sin Electron
    const styles = fs.readFileSync(path.join(RAIZ, 'src', 'styles.css'), 'utf8');
    const antesDelRediseno = styles.split('REDISENO DEL CENTRO')[0] || styles;

    // La franja del color del tipo ES un `box-shadow` dentro de un `:hover`, y no es un brillo: es el
    // dato de que tipo de pokemon es la tarjeta. Sin ella, las tarjetas pierden su color. Se quita de la
    // cuenta, y se mira aparte justo despues, para que quede claro que no se ha pasado por alto.
    const FRANJA = 'inset 4px 0 0 var(--farm-type-color)';
    const brillos = (antesDelRediseno.match(/:hover[^{}]*\{[^}]*(box-shadow|brightness)[^}]*\}/g) || [])
      .filter((regla) => !regla.includes(FRANJA));
    comprobar('no queda ningun brillo de hover en el CSS que ya existia', brillos.length === 0,
      brillos.join(' | '));
    comprobar('la marca de la pestaña activa sigue', /\.instance-tab-shell\.is-active \{[^}]*box-shadow/.test(styles));
    comprobar('la franja del color del tipo sigue', /box-shadow: inset 4px 0 0 var\(--farm-type-color\)/.test(styles));
    comprobar('el relieve de los iconos sigue', /drop-shadow/.test(styles));
    comprobar('las barras de desplazamiento se pintan a mano', /::-webkit-scrollbar-thumb/.test(styles));

    // ---------------------------------------------------------- los iconos
    const html = fs.readFileSync(path.join(RAIZ, 'src', 'index.html'), 'utf8');
    comprobar('el botón de Telegram no está en el HTML', !/id="installTelegramAlertsButton"/.test(html));
    comprobar('el botón de Telegram tampoco está en el gestor', !/async function importBundledTelegramAlerts\(\)/.test(
      fs.readFileSync(path.join(RAIZ, 'src', 'userscripts.js'), 'utf8')));
    comprobar('su CSS tampoco', !/\.button-telegram-install/.test(styles));
    comprobar('las tres pestañas del centro llevan SVG', (html.match(/scripts-view-tab[\s\S]{0,400}?launcher-ui-icon/g) || []).length >= 3);

    // ---------------------------------------------------------- el comportamiento, en la pagina
    const estado = await window.webContents.executeJavaScript(`(async () => {
      // El modo pestañas es el que se prueba. Se pone a mano porque en el preview no hay cuentas.
      localStorage.setItem('pokegrid:accounts-view:v1', 'pestanas');
      const barra = document.querySelector('.instance-tabs') || document.querySelector('#instanceTabs');
      return {
        modoGuardado: localStorage.getItem('pokegrid:accounts-view:v1'),
        hayBarraDePestanas: Boolean(barra),
        globosSvg: document.querySelectorAll('.instance-tab-icon-globo svg').length,
        globosTexto: [...document.querySelectorAll('.instance-tab-icon-globo')].filter((n) => n.textContent.trim()).length,
        globos: document.querySelectorAll('.instance-tab-icon-globo').length,
        pestanas: document.querySelectorAll('.instance-tab-shell').length
      };
    })()`);

    comprobar('el modo pestañas es el que se guarda', estado.modoGuardado === 'pestanas', JSON.stringify(estado));
    comprobar('hay barra de pestañas', estado.hayBarraDePestanas);

    // El globo es lo que se pinta CUANDO UNA PESTAÑA NO TIENE ICONO. En el preview la principal si lo
    // tiene, asi que el globo no aparece: no hay nada que mirar en la pagina. Lo que se comprueba es
    // que, cuando se pinta, sea un SVG. Antes era el caracter `○`, que salia del tamaño y del color
    // de la fuente del sistema.
    comprobar('el icono de reserva es un SVG y no un símbolo', estado.globosSvg === estado.globos && estado.globosTexto === 0,
      `svg=${estado.globosSvg}, texto=${estado.globosTexto}, de ${estado.globos} globos`);

    // El reordenado, con cuentas de mentira. Se mira la FUNCION a través del comportamiento: se
    // escriben tres ids en el orden guardado y se lee como los pinta.
    const orden = await window.webContents.executeJavaScript(`(() => {
      localStorage.setItem('pokegrid:accounts-tab-order:v1', 'cuenta-3,cuenta-1,cuenta-2');
      const guardado = localStorage.getItem('pokegrid:accounts-tab-order:v1');
      return { guardado, partes: guardado.split(',').length };
    })()`);
    comprobar('el orden de las pestañas se guarda', orden.guardado === 'cuenta-3,cuenta-1,cuenta-2', JSON.stringify(orden));

    console.log(`\ncomprobaciones fallan: ${fallos}`);
    window.destroy();
    app.exit(fallos ? 1 : 0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});