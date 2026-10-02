const assert = require('node:assert/strict');
const { calcularFloatGeometry, resolverSuelo } = require('../src/float-geometry');

// Padre de una cuenta corriente en la rejilla.
const ANCHO = 620;
const ALTO = 520;
const padre = (width = ANCHO, height = ALTO) => ({ width, height });

// --- El suelo nunca supera al padre --------------------------------------------
// Este es el bug. Con minWidth = 300 y un padre de 280, el panel mide 300 y
// .panel tiene overflow: hidden, o sea que se recorta y no se ve entero.
const estrecho = padre(280, 400);
for (const kind of ['capture', 'hunt']) {
  const suelo = resolverSuelo(kind, estrecho);
  assert.ok(suelo.width <= estrecho.width - 14,
    `El suelo de ${kind} (${suelo.width}) no puede superar al padre menos el margen (${estrecho.width - 14}).`);
  assert.ok(suelo.height <= estrecho.height - 56,
    `El alto del suelo de ${kind} (${suelo.height}) no puede superar al padre menos el margen.`);
}

const guardadoEstrecho = { left: 7, top: 49, width: 300, height: 250, locked: false };
const enEstrecho = calcularFloatGeometry(guardadoEstrecho, estrecho, 'capture');
assert.ok(enEstrecho.left + enEstrecho.width <= estrecho.width,
  `El panel se sale por la derecha: ${enEstrecho.left} + ${enEstrecho.width} > ${estrecho.width}.`);
assert.ok(enEstrecho.top + enEstrecho.height <= estrecho.height,
  `El panel se sale por abajo: ${enEstrecho.top} + ${enEstrecho.height} > ${estrecho.height}.`);

// --- Al maximizar crece, y se detiene en el tope --------------------------------
// Hoy no crece nada: el min() exterior con el valor guardado manda.
const guardado = {
  left: 20, top: 60, width: 300, height: 250, locked: false,
  baseWidth: 300, baseHeight: 250,
  baseParent: { width: ANCHO, height: ALTO }
};
const grande = padre(1400, 1100);
const alMaximizar = calcularFloatGeometry(guardado, grande, 'capture');
assert.ok(alMaximizar.width > guardado.width,
  `Al maximizar el ancho tiene que crecer: se queda en ${alMaximizar.width}, igual que antes.`);
assert.ok(alMaximizar.height > guardado.height,
  `Al maximizar el alto tiene que crecer: se queda en ${alMaximizar.height}.`);
assert.ok(alMaximizar.width <= 300 * 1.5 + 0.001,
  `El crecimiento se pasa del tope del 1,5x: ${alMaximizar.width} > 450.`);
assert.ok(alMaximizar.height <= 250 * 1.5 + 0.001,
  `El crecimiento en alto se pasa del tope: ${alMaximizar.height} > 375.`);
assert.ok(alMaximizar.left + alMaximizar.width <= grande.width, 'Al maximizar se sale por la derecha.');
assert.ok(alMaximizar.top + alMaximizar.height <= grande.height, 'Al maximizar se sale por abajo.');

// --- X e Y se escalan por separado ----------------------------------------------
// El padre crece solo en horizontal: el ancho crece y el alto se queda igual.
// Si la fórmula mezclara razonX y razonY, el alto se movería y esto falla.
const enHorizontal = calcularFloatGeometry(guardado, padre(1400, ALTO), 'capture');
assert.ok(enHorizontal.width > guardado.width, 'Con el padre más ancho, el panel tiene que crecer en ancho.');
assert.equal(enHorizontal.height, guardado.height,
  'Con la misma altura de padre, el alto no puede cambiar. Si cambia, razonX y razonY están mezcladas.');

// Y al revés.
const enVertical = calcularFloatGeometry(guardado, padre(ANCHO, 1100), 'capture');
assert.equal(enVertical.width, guardado.width,
  'Con el mismo ancho de padre, el ancho no puede cambiar.');
assert.ok(enVertical.height > guardado.height, 'Con el padre más alto, el panel tiene que crecer en alto.');

// --- Un panel fijado no se mueve, pero tampoco se recorta ----------------------
const fijado = { ...guardado, locked: true };
const fijadoGrande = calcularFloatGeometry(fijado, grande, 'capture');
assert.equal(fijadoGrande.width, guardado.width, 'Un panel fijado no cambia de ancho al maximizar.');
assert.equal(fijadoGrande.left, guardado.left, 'Un panel fijado no cambia de posición al maximizar.');
assert.ok(fijadoGrande.left + fijadoGrande.width <= grande.width,
  'Un panel fijado tampoco puede salirse del padre.');

// Un panel fijado en una cuenta que se ha estrechado: entero, más pequeño.
const fijadoEstrecho = calcularFloatGeometry({ ...guardadoEstrecho, locked: true }, estrecho, 'capture');
assert.ok(fijadoEstrecho.left + fijadoEstrecho.width <= estrecho.width,
  'Un panel fijado en una cuenta estrecha se recorta. No debería.');

// --- Una geometría guardada por una versión anterior sigue valiendo ------------
// Esta aserción TIENE QUE PASAR ANTES del arreglo. Si falla ahora, el arreglo
// va a romperle el panel a quien ya tiene el launcher instalado.
const viejo = { left: 37, top: 52, width: 300, height: 250, locked: false };
const conPadreIgual = calcularFloatGeometry(viejo, padre(), 'capture');
assert.equal(conPadreIgual.width, viejo.width, 'Sin referencias, el ancho tiene que ser el guardado.');
assert.equal(conPadreIgual.height, viejo.height, 'Sin referencias, el alto tiene que ser el guardado.');
assert.equal(conPadreIgual.left, viejo.left, 'Sin referencias, la posición tiene que ser la guardada.');
assert.equal(conPadreIgual.top, viejo.top, 'Sin referencias, la posición tiene que ser la guardada.');

// Y con el padre más grande tampoco se mueve, porque no hay con qué escalar.
const viejoGrande = calcularFloatGeometry(viejo, grande, 'capture');
assert.equal(viejoGrande.width, viejo.width,
  'Sin referencias no hay escala, así que maximizar tampoco debe mover el panel.');

console.log('Float geometry smoke passed: suelo, crecimiento con tope, ejes separados, fijado y cuenta estrecha.');