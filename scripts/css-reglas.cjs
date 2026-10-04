// Lector de reglas de CSS, para comprobar cosas que una expresión no distingue.
//
// El motivo es concreto. Al volcar la maqueta al launcher se coló esta regla:
//
//     .farm-picker-layer { position: static; padding: 0; background: none; … }
//
// y dejó el selector de Pokémon debajo de la pantalla. Para que no vuelva a colarse
// hacen falta dos cosas que buscar con una expresión no da:
//
//   · distinguir una regla de UNA línea de otra de varias. Un patrón que pide la llave de
//     cierre en la misma línea encuentra la primera y se pasa la segunda por alto —que es
//     justo el caso que no encontrabamos.
//
//   · no leer los COMENTARIOS como si fueran reglas. La explicación de por qué se quita la
//     franja del tipo menciona `inset 4px 0 0`, y con una expresión eso contaba como si la
//     franja siguiera puesta.
//
// Aquí no hay expresiones: se recorre el texto. Los comentarios se borran, y cada par de
// llaves da una regla con su selector y su cuerpo. Las reglas de dentro de un `@media`
// salen también, con su selector, porque van por libre y compiten por la cascada igual que
// las de fuera.
'use strict';

// Los comentarios desaparecen, pero se dejan los saltos de línea: si no, al borrar un
// comentario de tres líneas se juntan las reglas de al lado y el selector de una se pega al
// cuerpo de la anterior.
function sinComentarios(css) {
  return String(css).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Cada par de llaves da una regla. El selector es lo que hay entre el final de lo anterior
// —una llave, otra llave o un punto y coma— y su llave de apertura.
function reglas(css) {
  const limpio = sinComentarios(css);
  const pila = [];
  const salida = [];
  let corte = 0;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (c === '{') {
      pila.push({ selector: limpio.slice(corte, i).trim(), desde: i + 1 });
      corte = i + 1;
    } else if (c === '}') {
      const abierta = pila.pop();
      if (!abierta) continue;
      salida.push({ selector: abierta.selector, cuerpo: limpio.slice(abierta.desde, i) });
      corte = i + 1;
    } else if (c === ';') {
      // Una declaración suelta dentro de un `@media`, o el final de un `at-rule`.
      corte = i + 1;
    }
  }
  return salida;
}

// Un selector son una o más partes separadas por comas, y cada parte decide por su cuenta.
// Sin esto, una regla agrupada —`.is-recommended,\n.is-dangerous { … }`— no se reconoce
// cuando se busca solo una de las dos.
function partes(selector) {
  return String(selector)
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
}

// La posición declarada en el cuerpo, o `null` si la regla no dice cuál. Que no diga nada no
// es un fallo: no está compiten do con nada.
function posicion(cuerpo) {
  const m = String(cuerpo).match(/(^|;|\s)position\s*:\s*([a-z-]+)/i);
  return m ? m[2].toLowerCase() : null;
}

// La ÚLTIMA regla que gana para una parte de selector. Es lo que decide de verdad: la base
// pinta la franja del tipo y el bloque de la maqueta la quita después, así que la que
// manda es la última, no la primera. Comprobar que «ninguna regla lleva la franja» daría
// falso positivo siempre, porque la base sí la lleva y está bien que la siga teniendo.
function ultimaRegla(css, parte) {
  let encontrada = null;
  for (const r of reglas(css)) {
    if (partes(r.selector).some((p) => p === parte)) encontrada = r;
  }
  return encontrada;
}

module.exports = { sinComentarios, reglas, partes, posicion, ultimaRegla };