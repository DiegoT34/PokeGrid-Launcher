// Quita los brillos de hover, y esta vez se ancla en la DECLARACION, no en el selector.
//
// LOS DOS ERRORES QUE ESTA CORRIGE, Y POR QUE NO SE REPITEN
//
// 1. La version anterior reconstruia cada regla como `selector + '{' + cuerpo + '}'`. Con un
//    comentario largo delante, el selector capturado se llevo el comentario por delante, se quedo un
//    `{` suelto y `.button-pokepedia:hover` desaparecio del fichero. Aqui NO se reconstruye nada: se
//    cambia un trozo del CUERPO, entre las llaves que ya existen. Perder un selector es imposible.
//
// 2. La version anterior localizaba la regla por el nombre del selector. Pero hay VARIAS reglas con
//    el mismo selector —`.farm-target-button:hover` aparece mas de una vez, y la primera no tiene
//    brillo— asi que buscaba la primera y no encontraba el resplandor. Aqui se busca el resplandor
//    (`box-shadow` dentro de un `:hover`) y se mira que bloque lo contiene. Un selector repetido da
//    igual: importa la declaracion, no el nombre.
//
// LO QUE NO SE QUITA, Y POR QUE
//
// 1. `.instance-tab-shell.is-active` — su `inset 0 -2px` no es un brillo, es lo unico que dice que
//    pestana estas mirando. No es un `:hover`, asi que ni se le busca, pero se comprueba al final.
// 2. La franja `inset 4px 0 0 var(--farm-type-color)` de `.farm-pokemon-smart-option:hover` — es el
//    color del tipo, y el propio fichero la documenta como deliberada. Su sombra lleva DOS capas: la
//    franja y un resplandor. Se quita la segunda capa y la franja se queda. Borrar las dos habria
//    quitado un dato, que no es lo que se pidio.
// 3. Los `drop-shadow` de los iconos — son relieve sobre el fondo, no resplandor.
//
// COMO SE SABE QUE NO SE HA ROTO NADA
//
// La lista de TODOS los selectores del fichero antes y despues tiene que ser identica, y las llaves
// tienen que cuadrar. Un selector perdido no da error de compilacion: da un boton que ha dejado de
// responder al raton, y eso no se ve hasta que alguien lo echa de menos. Si algo no cuadra, no se
// escribe.
const fs = require('node:fs');
const path = require('node:path');

const FICHERO = path.join(__dirname, '..', 'src', 'styles.css');
const original = fs.readFileSync(FICHERO, 'utf8');

// --------------------------------------------------------------------- chequeos previos

// Se cuenta donde termina cada region de codigo: un resplandor dentro de un comentario no es un
// resplandor, hay que saber donde esta cada uno.
function limitesDeCodigo(texto) {
  const dentro = new Uint8Array(texto.length);
  let i = 0;
  while (i < texto.length) {
    if (texto.startsWith('/*', i)) {
      const fin = texto.indexOf('*/', i + 2);
      i = fin < 0 ? texto.length : fin + 2;
      continue;
    }
    dentro[i] = 1;
    i++;
  }
  return dentro;
}

const esCodigo = limitesDeCodigo(original);

// La lista completa de selectores, comentarios excluidos. Se compara antes y despues: es la prueba
// de que no ha desaparecido ninguna regla.
function selectoresDe(texto) {
  const patron = /([^{}]*)\{([^{}]*)\}/g;
  const lista = [];
  let m;
  while ((m = patron.exec(texto)) !== null) {
    lista.push(m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '));
  }
  return lista;
}

const selectoresAntes = selectoresDe(original);
const llavesAntes = (original.match(/\{/g) || []).length;
const cierresAntes = (original.match(/\}/g) || []).length;

// --------------------------------------------------------------------- el trabajo

// La sombra de la franja del tipo: dos capas, y solo se va la segunda.
//
// OJO CON LA FORMA DE ESTAS DOS CADENAS, que es donde fallo la primera vez. `vieja` es SOLO el valor
// que casaba con el patron, y `nueva` es lo que se escribe en su sitio: una declaracion COMPLETA, con
// su `box-shadow:` delante. La version anterior ponia aqui solo `inset 4px 0 0 ...;`, que para el
// navegador es basura y la descarta entera: la franja desaparecia de la pantalla mientras el guion
// la daba por buena. El patron se lleva el nombre de la propiedad, asi que al reponerla hay que
// volver a ponerlo.
const FRANJA_VIEJA = 'box-shadow: inset 4px 0 0 var(--farm-type-color), 0 5px 14px rgba(0,0,0,.28);';
const FRANJA_NUEVA = 'box-shadow: inset 4px 0 0 var(--farm-type-color);';

const resplandores = [];
const patronBrillo = /(?:box-shadow:[^;]*;|filter:\s*brightness\([^)]*\)\s*;?)/g;
let coincidencia;
while ((coincidencia = patronBrillo.exec(original)) !== null) {
  const inicio = coincidencia.index;
  if (!esCodigo[inicio]) continue; // dentro de un comentario: no cuenta

  // Se sube a la llave que abre este bloque y se baja a la que lo cierra. Son reglas planas, sin
  // anidamiento, asi que la llave mas cercana por encima y por debajo son las suyas.
  const abrir = original.lastIndexOf('{', inicio);
  const cerrar = original.indexOf('}', inicio);
  if (abrir < 0 || cerrar < 0) continue;

  // Y el nombre de la regla es lo que va entre el delimitador anterior y esa llave. Si no lleva
  // `:hover`, este resplandor no es lo que se ha pedido quitar y se deja como estaba.
  const antesDelBloque = Math.max(
    original.lastIndexOf('}', abrir),
    original.lastIndexOf(';', abrir),
    original.lastIndexOf('{', abrir - 1)
  );
  const nombre = original.slice(antesDelBloque + 1, abrir).replace(/\/\*[\s\S]*?\*\//g, '');
  if (!/:hover/.test(nombre)) continue;

  resplandores.push({
    inicio,
    fin: inicio + coincidencia[0].length,
    texto: coincidencia[0],
    esFranja: coincidencia[0].includes(FRANJA_VIEJA),
    donde: nombre.replace(/\s+/g, ' ').trim().slice(0, 70)
  });
}

// De atras hacia delante: asi los indices ya resueltos siguen siendo validos al.apply().
let texto = original;
let quitados = 0;
let franjasRespetadas = 0;
for (const resplandor of [...resplandores].reverse()) {
  const sustituto = resplandor.esFranja ? FRANJA_NUEVA : '';
  if (resplandor.esFranja) franjasRespetadas++;
  texto = texto.slice(0, resplandor.inicio) + sustituto + texto.slice(resplandor.fin);
  quitados++;
}

console.log(`resplandores de hover encontrados: ${resplandores.length}`);
for (const r of resplandores) console.log(`  ${r.donde}`);
console.log(`\nquitados: ${quitados}   de los cuales con franja del tipo conservada: ${franjasRespetadas}`);

// --------------------------------------------------------------------- las comprobaciones

const selectoresDespues = selectoresDe(texto);
const llavesDespues = (texto.match(/\{/g) || []).length;
const cierresDespues = (texto.match(/\}/g) || []).length;

const perdidos = selectoresAntes.filter((s) => !selectoresDespues.includes(s));
const nuevos = selectoresDespues.filter((s) => !selectoresAntes.includes(s));

console.log(`\nselectores: ${selectoresAntes.length} antes, ${selectoresDespues.length} despues`);
console.log(`  perdidos: ${perdidos.length ? perdidos.join(' | ') : 'ninguno'}`);
console.log(`  nuevos:   ${nuevos.length ? nuevos.join(' | ') : 'ninguno'}`);
console.log(`llaves: ${llavesDespues} / ${cierresDespues} ${llavesDespues === llavesAntes && cierresDespues === cierresAntes ? '(cuadran)' : '(NO CUADRAN)'}`);

// Se vuelve a buscar con el mismo metodo, ya sobre el texto nuevo: si sale alguno, se ha quedado uno.
const comprobar = limitesDeCodigo(texto);
let remanentes = 0;
let franjasQueQuedan = 0;
const patron2 = /(?:box-shadow:[^;]*;|filter:\s*brightness\([^)]*\)\s*;?)/g;
let m2;
while ((m2 = patron2.exec(texto)) !== null) {
  if (!comprobar[m2.index]) continue;
  const abrir = texto.lastIndexOf('{', m2.index);
  const antes = Math.max(texto.lastIndexOf('}', abrir), texto.lastIndexOf(';', abrir), texto.lastIndexOf('{', abrir - 1));
  const nombre = texto.slice(antes + 1, abrir).replace(/\/\*[\s\S]*?\*\//g, '');
  // La franja del tipo cuenta como brillo Y NO LO ES: es el color del tipo, y el propio fichero la
  // documenta como deliberada. Contarla hacia el total decia «queda uno» con un resplandor que se ha
  // dejado puesto a proposito. Se lista aparte para que se vea en la salida y no haya que fiarse.
  const esFranja = m2[0].includes(FRANJA_NUEVA);
  if (esFranja) franjasQueQuedan++;
  else if (/:hover/.test(nombre)) remanentes++;
}
console.log(`hovers con brillo que quedan: ${remanentes}`);
console.log(`franjas del tipo conservadas a proposito: ${franjasQueQuedan}`);

const activa = /\.instance-tab-shell\.is-active \{[^}]*\}/.exec(texto);
const franjaViva = texto.includes(FRANJA_NUEVA);
const relieve = (texto.match(/drop-shadow/g) || []).length;

console.log(`marca de la pestana activa: ${activa && /box-shadow/.test(activa[0]) ? 'sigue' : 'PERDIDA'}`);
console.log(`franja del tipo: ${franjaViva ? 'sigue, como debe' : 'PERDIDA'}`);
console.log(`relieve de iconos (drop-shadow): ${relieve} usos`);

// ESTA COMPROBACION FALTA POR ERROR PROPIO, Y HACE FALTA.
//
// Al sustituir la sombra de dos capas por la de una, se escribio `inset 4px 0 0 var(--farm-type-color);`
// SIN el `box-shadow:` delante. El texto estaba, y la comprobacion de arriba —que busca la cadena
// exacta— daba verde. Pero para el navegador eso no es una declaracion: es basura, y la descarta
// entera. La franja del tipo habia desaparecido de la pantalla y el guion lo daba por bueno.
//
// Comprobar que una cadena ESTA no dice que esa cadena signifique nada. Lo que se comprueba aqui es
// que TODA declaracion de todo el fichero empiece por `propiedad:`, que es lo unico que hace que una
// linea dentro de unas llaves sea CSS en vez de texto suelto.
const declaracionesBuenas = [];
const patronDeclaracion = /(^|[;{])\s*([a-zA-Z-]+)\s*:/g;
let md;
while ((md = patronDeclaracion.exec(texto)) !== null) declaracionesBuenas.push(md[2]);

// Lo que se busca es una linea dentro de un bloque que empiece por `inset`, `0 9px` u otro valor:
// eso solo puede ser el resto de una declaracion a la que se le ha caido el nombre.
const sueltos = [];
const patronSuelto = /[;{]\s*(inset\s+[-\d]|var\(--pf-|rgba?\(|#[0-9a-f]{3,8}\b\s*[;,}])/gi;
let ms;
while ((ms = patronSuelto.exec(texto)) !== null) {
  const linea = texto.slice(0, ms.index + ms[0].length).split('\n').pop();
  sueltos.push(linea.trim().slice(0, 80));
}
console.log(`\ndeclaraciones sueltas (valor sin propiedad): ${sueltos.length ? sueltos.join(' | ') : 'ninguna'}`);
console.log(`propiedades distintas usadas en el fichero: ${new Set(declaracionesBuenas).size}`);

const ok = resplandores.length > 0
  && quitados === resplandores.length
  && perdidos.length === 0
  && nuevos.length === 0
  && llavesDespues === llavesAntes
  && cierresDespues === cierresAntes
  && remanentes === 0
  && Boolean(activa) && /box-shadow/.test(activa[0])
  && franjaViva
  && sueltos.length === 0;

if (!ok) {
  console.log('\nNO SE ESCRIBE: alguna comprobacion no cuadra. El fichero se queda como estaba.');
  process.exit(1);
}
fs.writeFileSync(FICHERO, texto, 'utf8');
console.log('\nescrito.');