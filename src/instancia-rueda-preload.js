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