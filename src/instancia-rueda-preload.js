// La rueda con Ctrl de una instancia.
//
// POR QUÉ UN PRELOAD Y NO EL PROCESO PRINCIPAL
//
// Estaba con `input-event` del webContents, y se ha medido qué llega por ahí: el evento trae `type`,
// `modifiers` y `_modifiers`. Nada más. No viene el desplazamiento, así que no dice si hay que
// acercar o alejar: el paso salía cero y la función se iba siempre sin hacer nada. Ese camino no
// podía funcionar, por bien escrito que estuviera.
//
// Aquí dentro de la página sí se sabe: el evento `wheel` del DOM lleva `deltaY` con su signo. Se
// manda ese signo —traducido a pasos de zoom— y se impide el comportamiento de por defecto, que es
// que la rueda desplazase la página mientras se hace el zoom.
//
// DÓNDE SE PONE
//
// Solo en los webviews de INSTANCIA, y eso lo decide `will-attach-webview` en el proceso principal.
// Ni el launcher ni los webviews del juego de Poke Idle World llevan este preload.
//
// Con `contextIsolation` la página no ve este código ni lo que hace: vive en otro mundo y no
// toca el DOM. Lo único que provoca es una rueda con Ctrl, que solo cambia el zoom que el usuario
// pidió.
const { ipcRenderer } = require('electron');

window.addEventListener('wheel', (evento) => {
  // Sin Ctrl la rueda es de la página, como siempre. Este preload solo se ocupa de la combinación.
  if (!evento.ctrlKey) return;

  // En el DOM, `deltaY` negativo es rueda hacia arriba, que es ACERCAR. De ahí el signo negativo:
  // lo que se manda son pasos de zoom hacia dentro, no desplazamientos.
  const pasos = -Math.sign(Number(evento.deltaY) || 0);
  if (!pasos) return;

  // Sin esto, la página se desplazaría a la vez que se hace el zoom. Solo cuando el evento es
  // cancelable: si no lo es, llamar a preventDefault no hace nada y solo genera ruido.
  if (evento.cancelable) evento.preventDefault();

  ipcRenderer.send('instancia:rueda', { pasos });
}, { capture: true, passive: false });

// El icono de la pagina, que se avisa al renderer con `sendToHost` y no por un canal de electron.
// La razon es que el que pinta es el renderer, que es quien tiene la barra de pestanas: un
// `ipcRenderer.send` iria al proceso principal y tendria que volver a salir hacia el renderer.
//
// Se manda el que dice el <link>, NO el del dominio: casi todas las webs apuntan su icono a un
// CDN distinto —Discord lo sirve desde cdn.discordapp.com—, y descargar el del dominio en su
// lugar es el fallo clasico.
function avisarDelIcono() {
  const declarado = document.querySelector('link[rel~="icon"]')
    || document.querySelector('link[rel="shortcut icon"]')
    || document.querySelector('link[rel="apple-touch-icon"]');
  const url = declarado?.getAttribute('href') || '';
  if (!url) return;
  let absoluta = url;
  try {
    absoluta = new URL(url, document.baseURI).href;
  } catch {
    return;
  }
  ipcRenderer.sendToHost('instancia:favicon', { url: absoluta });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', avisarDelIcono, { once: true });
} else {
  avisarDelIcono();
}