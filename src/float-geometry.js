'use strict';

// La geometría de los paneles flotantes, en un módulo puro.
//
// Vive fuera de renderer.js por un motivo concreto: toda la aritmética es
// calculable con dos números, y si vive aquí se puede probar con `node` sin
// lanzar Electron ni abrir una ventana. renderer.js hacía esta misma cuenta
// contra getBoundingClientRect() y localStorage, y por eso no había forma de
// comprobar nada sin el juego delante.

// Los suelos de los paneles. Lo que necesita cada panel para que su cabecera y
// sus herramientas quepan.
const SUELOS = {
  capture: { width: 300, height: 250 },
  hunt: { width: 280, height: 230 }
};

// Cuánto puede crecer un panel al maximizar la ventana, como múltiplo de lo que
// el usuario ajustó a mano. Pasado este tope se queda quieto: un panel que se
// come la pantalla no ayuda a nadie.
const TOPE_CRECIMIENTO = 1.5;

// Margen contra el borde del padre. El horizontal es el que ya usaba el CSS;
// el vertical deja sitio a la cabecera del panel de la cuenta, que ocupa los
// primeros píxeles de la columna.
const MARGEN_X = 14;
const MARGEN_Y = 56;

// Separación mínima contra el borde del padre al colocar el panel. El mínimo
// vertical es 49 porque por encima de la barra de la cuenta no se puede.
const BORDE_X = 7;
const BORDE_Y = 7;
const BORDE_MIN_Y = 49;

// El suelo de un panel nunca puede superar lo que cabe en el padre. Este es el
// arreglo del bug: renderer.js calculaba Math.max(300, parentRect.width - 14),
// y ese 300 se pasaba de grande cuando la cuenta era más estrecha, así que el
// panel se salía y .panel, que tiene overflow: hidden, lo recortaba.
function resolverSuelo(kind, parentRect) {
  const suelo = SUELOS[kind] || SUELOS.capture;
  return {
    width: Math.max(0, Math.min(suelo.width, (parentRect.width || 0) - MARGEN_X)),
    height: Math.max(0, Math.min(suelo.height, (parentRect.height || 0) - MARGEN_Y))
  };
}

function calcularFloatGeometry(geometry, parentRect, kind) {
  const parentWidth = parentRect.width || 0;
  const parentHeight = parentRect.height || 0;
  const suelo = resolverSuelo(kind, parentRect);
  const anchoMax = Math.max(0, parentWidth - MARGEN_X);
  const altoMax = Math.max(0, parentHeight - MARGEN_Y);

  // Lo que el panel medía cuando el usuario lo ajustó a mano, y el padre que
  // había en ese momento. Sin estas referencias no hay con qué escalar, así que
  // un panel guardado por una versión anterior se escala 1:1, que es lo
  // correcto: el usuario aún no lo ha tocado.
  const baseWidth = Number(geometry.baseWidth) || Number(geometry.width) || suelo.width;
  const baseHeight = Number(geometry.baseHeight) || Number(geometry.height) || suelo.height;
  const parentBase = geometry.baseParent || null;

  // Un panel fijado con el botón de fijar no se escala: se queda donde lo puso
  // el usuario y con el tamaño que le dio. Aun así se recorta al padre, porque
  // si la cuenta se estrecha, un panel fijado que se sale queda recortado igual
  // que uno suelto, y eso no lo arregla el candado.
  const fijado = geometry.locked === true;
  const razonX = fijado ? 1 : (parentBase && parentBase.width > 0 ? parentWidth / parentBase.width : 1);
  const razonY = fijado ? 1 : (parentBase && parentBase.height > 0 ? parentHeight / parentBase.height : 1);

  // Tres techos, en este orden: el suelo, para que no se corte; el tope de
  // crecimiento, para que no se coma la pantalla; y lo que cabe, que es el único
  // que puede bajar el panel por debajo del suelo.
  const width = Math.min(
    Math.max(suelo.width, baseWidth * razonX),
    baseWidth * TOPE_CRECIMIENTO,
    anchoMax
  );
  const height = Math.min(
    Math.max(suelo.height, baseHeight * razonY),
    baseHeight * TOPE_CRECIMIENTO,
    altoMax
  );

  // La posición se escala con la misma razón que el tamaño, para que un panel no
  // se vaya de su esquina al cambiar la proporción de la ventana, y después se
  // recorta contra el padre.
  const left = Math.min(
    Math.max(BORDE_X, (Number(geometry.left) || BORDE_X) * razonX),
    Math.max(BORDE_X, parentWidth - width - BORDE_X)
  );
  const top = Math.min(
    Math.max(BORDE_MIN_Y, (Number(geometry.top) || BORDE_MIN_Y) * razonY),
    Math.max(BORDE_MIN_Y, parentHeight - height - BORDE_Y)
  );

  return { width, height, left, top };
}

// Lo que hay que guardar en localStorage para poder escalar la próxima vez: la
// geometría de siempre más las dos referencias. La primera vez, si no hay
// referencias, se toman de lo que ya había: el usuario aún no ha ajustado ese
// panel a mano, así que su tamaño actual es su tamaño de referencia.
function referenciaDeGuardado(geometry, parentRect, kind) {
  const suelo = resolverSuelo(kind, parentRect);
  return {
    baseWidth: Number(geometry.baseWidth) || Number(geometry.width) || suelo.width,
    baseHeight: Number(geometry.baseHeight) || Number(geometry.height) || suelo.height,
    baseParent: {
      width: Math.max(1, Number(parentRect.width) || 1),
      height: Math.max(1, Number(parentRect.height) || 1)
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUELOS, TOPE_CRECIMIENTO, MARGEN_X, MARGEN_Y,
    resolverSuelo, calcularFloatGeometry, referenciaDeGuardado
  };
}
if (typeof window !== 'undefined') {
  window.pokeGridFloatGeometry = {
    SUELOS, TOPE_CRECIMIENTO, MARGEN_X, MARGEN_Y,
    resolverSuelo, calcularFloatGeometry, referenciaDeGuardado
  };
}