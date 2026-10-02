// Fija las cosas que se rompen solas cuando se toca el CSS de los paneles.
//
// No comprueba que se vea bonito: comprueba las cuatro cosas que hicieron que se
// viera mal, y que pueden volver a pasar sin que nadie se dé cuenta:
//
//   1. Los filtros eran una tarjeta con su propio fondo y su propio desenfoque
//      encima del cristal, y por eso parecían otra pantalla pegada dentro.
//   2. Los campos eran tan altos que el bloque no cabía y empujaba el resto hacia
//      abajo sin barra de scroll.
//   3. El SVG de los recuadros de Hunt no tenía tamaño: tomaba el `1em` del
//      general y no cabía centrado en su caja.
//   4. Los botones con etiqueta de Hunt tenían ancho fijo, así que la palabra se
//      estremaba dentro de un cuadrado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');

// Un bloque concreto: desde su selector hasta su llave de cierre.
//
// Se devuelve la ÚLTIMA coincidencia, no la primera. En CSS manda la que está más
// abajo cuando tienen la misma especificidad, así que la que hay que mirar es la
// última: las reglas viejas de arriba siguen en el fichero y ahí es donde se
// colaron los fondos planos.
function bloque(selector) {
  const L = styles.split(/\r?\n/);
  let encontrado = null;
  for (let k = 0; k < L.length; k++) {
    if (L[k].trim() !== `${selector} {`) continue;
    let f = k;
    while (f < L.length && !L[f].includes('}')) f++;
    encontrado = { linea: k + 1, cuerpo: L.slice(k, f + 1).join('\n') };
  }
  if (!encontrado) throw new Error(`No encuentro ${selector}.`);
  return encontrado;
}

// --- 1. Los filtros no pueden ser una tarjeta aparte -------------------------
const filtros = bloque('.capture-advanced-filters');
assert.match(filtros.cuerpo, /background:\s*none/, 'El desplegable de filtros tiene que dejar ver el panel, no taparlo con su propio fondo.');
assert.match(filtros.cuerpo, /backdrop-filter:\s*none/, 'Los filtros no llevan desenfoque propio: el cristal es el del panel.');
assert.match(filtros.cuerpo, /border:\s*0/, 'Los filtros no llevan borde propio: es una zona del panel, no una tarjeta.');
console.log(`ok  los filtros son parte del panel (L${filtros.linea})`);

// --- 2. Los filtros tienen que caber ------------------------------------------
const rejilla = bloque('.capture-filter-grid');
const columnas = Number((rejilla.cuerpo.match(/repeat\((\d+)/) || [])[1] || 0);
assert.ok(columnas >= 4, `Los filtros van en ${columnas} columnas; con menos, el bloque ocupa tres filas y empuja el panel.`);
console.log(`ok  los filtros van en ${columnas} columnas`);

const nombres = bloque('.capture-filter-names');
// Sin el ancla, `height:` también casa con `min-height:` y la comprobación daba
// verde con un desplegable de 104 px, que es justo lo que había antes.
assert.match(nombres.cuerpo, /(^|[^-])height:\s*\d+px/, 'El selector de Pokémon necesita altura fija: si la toma del contenido, el bloque crece sin límite.');
assert.match(nombres.cuerpo, /overflow-y:\s*auto/, 'El selector de Pokémon necesita su propio scroll.');
console.log(`ok  el selector de Pokémon tiene alto fijo y scroll (L${nombres.linea})`);

// El orden: los selectores juntos, los números después, el de Pokémon al final.
// Solo se miran las líneas con un control dentro; la insignia y la rejilla también
// llevan `capture-filter-` en su clase y no son campos.
const orden = html.split(/\r?\n/)
  .filter((u) => /<(select|input|button)\b/.test(u) && /class="capture-filter-[a-z-]+"/.test(u))
  .map((u) => (u.includes('capture-filter-names-label')
    ? 'names'
    : (u.match(/capture-filter-([a-z-]+)"/) || [])[1]))
  .filter(Boolean);
assert.deepEqual(
  orden,
  ['days', 'ball', 'shiny', 'number', 'iv-min', 'iv-max', 'power-min', 'power-max', 'names', 'reset'],
  `El orden de los filtros es ${orden.join(' → ')}. Se quiere: los tres selectores, los cuatro números, Pokémon y restablecer.`
);
console.log(`ok  el orden de los filtros: ${orden.join(' → ')}`);

// --- 3. Los iconos de los recuadros de Hunt, centrados y del tamaño correcto --
const iconoMetrica = bloque('.hunt-flat-metric-icon');
assert.match(iconoMetrica.cuerpo, /font-size:\s*\d+px/,
  'El recuadro de los iconos de Hunt necesita font-size: el SVG mide 1em y sin eso hereda el tamaño de letra de la tarjeta y no cabe centrado.');
console.log(`ok  los iconos de Hunt tienen tamaño propio (L${iconoMetrica.linea})`);

// --- 4. Los botones con etiqueta de Hunt --------------------------------------
const accion = styles.slice(styles.lastIndexOf('.hunt-float-action {'));
assert.match(accion.slice(0, accion.indexOf('}')), /width:\s*auto/,
  'Los botones «Reset» y «Eliminar» llevan su palabra: con ancho fijo la palabra se estremaba.');
console.log('ok  los botones con etiqueta de Hunt se dimensionan por su texto');

// --- La barra de arriba no puede llevar su fondo plano ------------------------
// Los fondos viejos (#0a201f, #091a20, #222528) siguen en reglas anteriores, y
// eso está bien: lo que no puede pasar es que ganen. Para eso hace falta una regla
// posterior que los quite.
const cabeza = styles.slice(styles.lastIndexOf('.capture-float-head,'));
const hastaEquipo = cabeza.indexOf('}');
assert.match(cabeza.slice(0, hastaEquipo), /background:\s*none/,
  'La cabecera de los paneles tiene que dejar ver el cristal: con su fondo plano era la mitad vieja del rediseño.');
console.log('ok  la cabecera de los paneles es cristal, no una franja de color');

// --- El botón del mercado, sin el marco que se le había puesto ----------------
const mercado = bloque('.hunt-flat-market');
assert.doesNotMatch(mercado.cuerpo, /255,\s*200,\s*90/,
  'El botón del mercado es una fila de opciones más del panel, no un marco de color propio.');
console.log(`ok  el botón del mercado es una fila más (L${mercado.linea})`);

// --- Y sigue siendo un botón de verdad ---------------------------------------
assert.ok(/const market = document\.createElement\('button'\)/.test(renderer),
  'Lo de los precios del Mercado tiene que ser un <button>, no un <p> con un carácter pegado.');
console.log('ok  lo de los precios del Mercado es un botón');

console.log('\nPaneles compactos smoke passed: filtros sin tarjeta y en cuatro columnas, selector de Pokémon con alto fijo y en su sitio, iconos de Hunt con tamaño y centrados, botones de Hunt por su texto, cabecera de cristal y botón del mercado como fila más.');
