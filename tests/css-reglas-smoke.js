// Prueba del lector de reglas de CSS y de las comprobaciones del verificador del paquete.
//
// Estas comprobaciones nacieron de un fallo que se coló sin que nadie lo viera: una regla de
// maqueta, `.farm-picker-layer { position: static; … }`, dejó el selector de Pokémon debajo
// de la pantalla. Para que no vuelva a colarse hacen falta dos cosas que una expresión no
// distingue —una regla de una línea de otra de varias, y un comentario de una regla— y esa
// comprobación vive en `verificar-paquete.cjs`, que necesita un ZIP de 350 MB para
// ejecutarse. Sin esta prueba, esa comprobación puede estar rota y no enterarse nadie hasta
// que se compile.
//
// Y hay una trampa que ya ha mordido dos veces en este trabajo: si un sabotaje se hace con
// `replace` y el ancla no casa —porque el fichero es CRLF y el ancla se escribió con `\n`—,
// el `replace` no hace nada y el caso sale VERDE sin haber comprobado nada. Por eso cada
// sabotaje declara que tiene que haber cambiado algo, y aquí se avisa si no.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const css = require(path.join(RAIZ, 'scripts', 'css-reglas.cjs'));

const sano = fs.readFileSync(path.join(RAIZ, 'src', 'styles.css'), 'utf8');
const CRLF = sano.includes('\r\n');
const EOL = CRLF ? '\r\n' : '\n';

// Lo mismo que hace el verificador, con la misma lógica. Si esto y el verificador se separan,
// uno de los dos va a mentir.
function comprobar(estilos) {
  const capaFuera = css.reglas(estilos)
    .filter((r) => css.partes(r.selector).some((p) => /\.farm-picker-layer(\[|:|\s|$|\.)/.test(p)))
    .filter((r) => { const q = css.posicion(r.cuerpo); return q && q !== 'fixed'; });
  const prefijo = css.reglas(estilos)
    .filter((r) => css.partes(r.selector).some((p) => /\.propuesta\b/.test(p)));
  const franja = [];
  for (const parte of ['.farm-pokemon-smart-option.is-recommended', '.farm-pokemon-smart-option.is-dangerous', '.farm-pokemon-smart-option:hover']) {
    const r = css.ultimaRegla(estilos, parte);
    if (!r || /inset\s+4px\s+0\s+0/.test(r.cuerpo)) franja.push(parte);
  }
  return { capaFuera: capaFuera.length, prefijo: prefijo.length, franja: franja.length };
}

// Un sabotaje hecho con `replace` tiene que DECIR que se ha aplicado.
function sustituir(texto, ancla, valor) {
  if (!texto.includes(ancla)) throw new Error(`El ancla no casa y el sabotaje no se aplicaría:\n${JSON.stringify(ancla.slice(0, 120))}`);
  const salida = texto.replace(ancla, valor);
  if (salida === texto) throw new Error(`El sabotaje no ha cambiado nada:\n${JSON.stringify(ancla.slice(0, 120))}`);
  return salida;
}

const TARJETA = [
  '.farm-pokemon-smart-option.is-recommended,',
  '.farm-pokemon-smart-option.is-dangerous {',
  '  box-shadow: var(--pf-sobresaliente);',
  '}'
].join(EOL);
const RATON = [
  '  background: var(--pf-vidrio-alto);',
  '  border-color: rgba(255, 255, 255, .16);',
  '  box-shadow: var(--pf-sobresaliente-alto);',
  '}'
].join(EOL);

const CASOS = [
  ['el CSS de ahora, sano', sano, { capaFuera: 0, prefijo: 0, franja: 0 }],
  ['vuelve la regla de maqueta, de UNA línea', `${sano}${EOL}.farm-picker-layer { position: static; padding: 0; }${EOL}`, { capaFuera: 1 }],
  ['vuelve con varias líneas —esto no lo veía la versión con expresiones—', `${sano}${EOL}.farm-picker-layer {${EOL}  position: relative;${EOL}  inset: auto;${EOL}}${EOL}`, { capaFuera: 1 }],
  ['vuelve el prefijo de la maqueta en un selector', `${sano}${EOL}.propuesta .farm-picker { color: red; }${EOL}`, { prefijo: 1 }],
  ['vuelve el fondo de la maqueta, con «body.» delante', `${sano}${EOL}body.propuesta { background: #111; }${EOL}`, { prefijo: 1 }],
  ['se lleva la regla que quita la franja de la recomendada y la peligrosa',
    sustituir(sano, TARJETA, TARJETA.replace('var(--pf-sobresaliente)', 'inset 4px 0 0 var(--farm-type-color)')),
    { franja: 2 }],
  ['se lleva la del ratón por encima',
    sustituir(sano, RATON, RATON.replace('var(--pf-sobresaliente-alto)', 'inset 4px 0 0 var(--farm-type-color), var(--pf-sobresaliente-alto)')),
    { franja: 1 }]
];

console.log(`fichero en ${CRLF ? 'CRLF' : 'LF'}`);
console.log('se busca: capa fuera de «fixed», prefijo «.propuesta», franja «inset 4px 0 0» en la última regla que gana\n');

const fallos = [];
for (const [que, texto, espera] of CASOS) {
  const m = comprobar(texto);
  const linea = [];
  for (const clave of ['capaFuera', 'prefijo', 'franja']) {
    if (espera[clave] === undefined) continue;
    const ok = m[clave] === espera[clave];
    if (!ok) fallos.push(`${que}: ${clave} ${m[clave]}, se esperaba ${espera[clave]}`);
    linea.push(`${ok ? 'ok  ' : 'FALTA'} ${clave} ${m[clave]}/${espera[clave]}`);
  }
  console.log(`  ${que}`);
  console.log(`     ${linea.join('   ')}`);
}

// Y una comprobación propia del lector, que es la que hace possible todo lo demás: que una
// regla de una línea y otra de varias selean las dos, y que un comentario no cuente.
const linea_ = css.reglas('.a { color: red; }');
const varias = css.reglas('.b {\n  color: red;\n}');
const conComentario = css.reglas('/* .c { position: static; } */\n.d { position: fixed; }');
console.log('\n--- el lector, en crudo ---');
const conSaltos = '/* comentario\nde dos líneas */\n.d { position: fixed; }';
const crudo = [
  ['una regla de una línea', linea_.length === 1 && linea_[0].selector === '.a'],
  ['una de varias, también', varias.length === 1 && varias[0].selector === '.b' && /color:\s*red/.test(varias[0].cuerpo)],
  ['un comentario no es una regla', conComentario.length === 1 && conComentario[0].selector === '.d'],
  // La propiedad que importa: al borrar el comentario, el número de líneas no cambia. Si el
  // borrado se comiera los saltos, el selector de una regla se pegaría al cuerpo de la de al
  // lado y las reglas saldrían mezcladas sin que se viera.
  ['borrar un comentario no junta líneas', css.sinComentarios(conSaltos).split('\n').length === conSaltos.split('\n').length],
  // Aquí no hay que poner la llave: `reglas()` ya la quita. Se pasa el selector solo.
  ['una regla agrupada se parte en sus selectores', JSON.stringify(css.partes('.x,\n.y')) === '[".x",".y"]'],
  ['«position» se lee aunque no esté al principio del cuerpo', css.posicion('  inset: 0;\n  position: relative;') === 'relative'],
  ['y da «null» cuando la regla no dice nada', css.posicion('display: none;') === null]
];
for (const [que, ok] of crudo) {
  if (!ok) fallos.push(`lector: ${que}`);
  console.log(`  ${ok ? 'ok  ' : 'FALTA'} ${que}`);
}

console.log('');
if (fallos.length === 0) {
  console.log('Lector de reglas: encuentra una regla de una línea y otra de varias, no lee comentarios, y las tres comprobaciones del verificador muerden.');
} else {
  console.log(`${fallos.length} comprobaciones fallan:`);
  for (const f of fallos) console.log(`  - ${f}`);
}
process.exit(fallos.length === 0 ? 0 : 1);