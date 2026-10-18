// Comprueba que CADA selector del bloque de rediseño existe en el HTML.
//
// POR QUE HACE FALTA
//
// Una regla de CSS con un selector equivocado no da error: no hace nada, y se queda ahi para siempre
// como si estuviera puesta. Pasó con `.scripts-head`, que se escribio en vez de `.scripts-heading` (que
// es como se llama en el HTML): tres reglas enterasDead, y la prueba de que no pasaba nada era que la
// pantalla seguia igual. Un CSS que compila y unas reglas que no hacen nada.
//
// Asi que aqui se comprueba una por una, sin Exceptions: la lista sale del bloque del rediseño y se
// busca en el HTML y en el CSS.
//
// LO QUE DICE DE CADA UNO
//
//  - en el HTML: que hay un elemento con esa clase, y por tanto la regla tiene a quien aplicarse.
//  - en el CSS: que la clase existe en algun sitio, para distinguir «no lo he puesto todavia» de «el
//    nombre esta mal escrito».
const fs = require('node:fs');
const path = require('node:path');

const CSS = path.join(__dirname, '..', 'src', 'styles.css');
const HTML = path.join(__dirname, '..', 'src', 'index.html');

const css = fs.readFileSync(CSS, 'utf8');
const html = fs.readFileSync(HTML, 'utf8');

// Se recorta el bloque del rediseño: empieza en su comentario de cabecera y acaba antes del ultimo
// media query. Todo lo de dentro es lo que se ha anadido en la 0.34.0 y lo que hay que comprobar.
const inicio = css.indexOf('REDISENO DEL CENTRO DE SCRIPTS');
const fin = css.lastIndexOf('@media (max-width: 430px)');
if (inicio < 0 || fin < 0 || fin < inicio) {
  console.log('NO SE ENCUENTRA EL BLOQUE DEL REDISENO. Revisar las marcas.');
  process.exit(1);
}
const bloque = css.slice(inicio, fin);

// Las clases que aparecen como selector en el bloque.
const clases = [...new Set([...bloque.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]))].sort();

console.log(`clases en el bloque del rediseño: ${clases.length}\n`);

const enHtml = [];
const soloCss = [];
for (const clase of clases) {
  // En el HTML, como atributo `class` de verdad: `"scripts-heading"` o dentro de una lista de clases.
  const enElHtml = new RegExp(`class="[^"]*\\b${clase}\\b`).test(html);
  // En el CSS, como selector: `.clase {` o `.clase,` o `.clase:` en un selector.
  const enElCss = new RegExp(`\\.${clase}\\s*[,{:\\s]`).test(css);
  if (enElHtml) enHtml.push(clase);
  else if (enElCss) soloCss.push(clase);
  else soloCss.push(clase + '  (no aparece en NINGUN sitio: nombre mal escrito)');
}

console.log(`con elemento en el HTML: ${enHtml.length}`);
for (const c of enHtml) console.log('  ok    ' + c);

console.log(`\nsolo en el CSS: ${soloCss.length}`);
for (const c of soloCss) console.log('  --    ' + c);

// Un selector que no existe en el HTML no rompe nada, pero su regla no hace nada. Se avisa, que es lo
// que sirve para no dar por puesto un rediseño que no se ve.
//
// Hay una excepcion legitima: los que crea JAVASCRIPT. La barra de pestañas se pinta entera desde
// `renderBrowserInstanceTabs`, asi que ni `instance-tab-shell` ni sus clases de arrastre estan en el
// HTML, y sus reglas son correctas. Sin esta lista, el aviso que sirve se vuelve ruido y acabaria
// ignorandose, que es peor que no avisar.
const CREADOS_POR_JS = new Set([
  'instance-tab',
  'instance-tab-shell',
  'is-arrastrando',
  'is-destino',
  'account-row-remove'
]);

const sinElemento = soloCss.filter((c) => !c.includes('ningun sitio') && !CREADOS_POR_JS.has(c.replace('  --    ', '')));
const deJs = soloCss.filter((c) => CREADOS_POR_JS.has(c.replace('  --    ', '')));
const malEscritos = soloCss.filter((c) => c.includes('ningun sitio'));

console.log(`\nlas reglas sin elemento que no hacen nada: ${sinElemento.length + malEscritos.length}`);
for (const c of malEscritos) console.log(`    MAL ESCRITO  ${c.replace('  --    ', '')}`);
for (const c of sinElemento) console.log(`    REVISAR      ${c.replace('  --    ', '')}`);
console.log(`\nlas que crea JavaScript y por eso no estan en el HTML: ${deJs.length}`);
for (const c of deJs) console.log(`    js           ${c.replace('  --    ', '')}`);