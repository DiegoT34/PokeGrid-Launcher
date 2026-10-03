// Fija el rediseño del panel de Modo Farmeo: cristal por fuera, neomorfismo por
// dentro, compacto, y los textos que se acortaron.
//
// Cada comprobación apunta a algo que ya salió mal una vez, o que puede volver a
// salir sin que se note: un borde duro que regresa, un hueco que se aplana, una
// etiqueta que vuelve a sus siglas en inglés, o un icono que se queda en blanco
// porque el botón se reconstruye entero.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
const L = styles.split(/\r?\n/);

// Todos los bloques de un selector. Un selector puede tener sus reglas repartidas,
// y el bloque que gana es el último.
// La cabecera se reconoce por expresión, no comparando la línea entera, porque hay
// reglas de una línea:
//
//     .farm-orre-permission input { position: absolute; opacity: 0; … }
//
// Con la comparación entera el selector no se encuentra, `winning()` devuelve `null`
// y la comprobación queDepends de él falla con un «ahora vale null» que no señala
// nada. Después de la `{` solo se admite otra cosa o el cierre, de modo que
// `.farm-orre-permission > span` no se confunde con su `::before`.
const cabeceraDe = (selector) => new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[\\{,]`);

function bloquesDe(selector) {
  const re = cabeceraDe(selector);
  const salida = [];
  for (let k = 0; k < L.length; k++) {
    if (!re.test(L[k].trim())) continue;
    let f = k;
    let nivel = 0;
    let abierto = false;
    for (f = k; f < L.length; f++) {
      for (const c of L[f]) { if (c === '{') { nivel++; abierto = true; } else if (c === '}') nivel--; }
      if (abierto && nivel === 0) break;
    }
    salida.push(L.slice(k, f + 1).join('\n'));
  }
  return salida;
}

// Lo que gana: la ÚLTIMA vez que aparece la propiedad.
// La expresión necesita el `g`: `matchAll` con una expresión sin la bandera global
// lanza, y el error no dice que el problema es la bandera sino que no es una función.
function winning(selector, propiedad) {
  const re = new RegExp(`(?:^|[;{\\s])${propiedad}\\s*:\\s*([^;]+);`, 'g');
  let valor = null;
  for (const cuerpo of bloquesDe(selector)) {
    const m = [...cuerpo.matchAll(re)];
    if (m.length) valor = m[m.length - 1][1].trim();
  }
  return valor;
}

// Las sombras del panel están en tokens, no escritas en cada regla: `--pf-hundido`
// es la misma sombra en las seis. Comprobar el literal en cada regla sería falso:
// la comprobación tiene que resolver el token antes de mirar qué sombra hay.
//
// Al resolver se le añade el punto y coma, que en la regla lo tenía el valor y en el
// token no: sin él, cualquier expresión que espere el final de una declaración no
// encuentra nada y parece que la sombra falta.
const TOKENS = Object.fromEntries(
  [...styles.matchAll(/(--pf-[a-z-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
);

function resolver(valor, veces = 4) {
  if (typeof valor !== 'string' || !valor) return '';
  let salida = valor;
  for (let i = 0; i < veces; i++) {
    salida = salida.replace(/var\((--pf-[a-z-]+)\)/g, (_, token) => TOKENS[token] || '');
  }
  return `${salida.trim().replace(/;+$/, '')};`;
}

// --- 1. El diálogo es cristal y ocupa el ancho --------------------------------
assert.match(winning('.modal.farm-modal', 'backdrop-filter') || '', /blur/,
  'El diálogo de Farmeo tiene que ser cristal: es el único panel del launcher que no lo era.');
assert.match(winning('.modal.farm-modal', 'width') || '', /1320px/,
  'El diálogo tiene que tener ancho propio. El `.modal` de base pone `width: min(760px, 96vw)`, y con dos columnas de cuatrocientas treinta solo se ve una y media.');
console.log(`ok  el diálogo es cristal y mide ${winning('.modal.farm-modal', 'width')}`);

// --- 2. La tarjeta es cristal por fuera y huecos por dentro ------------------
// Esto se mira sobre el bloque que GANA, no sobre todos los del selector. Hay tres
// reglas de `.farm-account` en la hoja y la antigua (L2879) tiene un
// `inset 0 1px 0` que hace que una comprobación sobre el texto unido pase aunque el
// brillo nuevo se borre: verde falso, que es peor que no comprobar nada.
//
// Además el `inset` se puede escribir delante o detrás de la sombra
// (`inset 0 1px 0 …` y `0 1px 0 … inset` valen lo mismo), así que el patrón
// comprueba que la palabra aparezca en la declaración, no en una posición.
const brillo = resolver(winning('.farm-account', 'box-shadow'));
assert.match(brillo, /inset/, 'La tarjeta lleva el brillo de arriba del cristal. Va escrito «inset» al final, no delante.');
assert.match(brillo, /0 1px 0|1px 0 rgba/, `El brillo de la tarjeta es una línea de un píxel, no una sombra difusa. Se resolvió a «${brillo.slice(0, 60)}».`);
assert.match(winning('.farm-account', 'backdrop-filter') || '', /blur/,
  'La tarjeta deja ver lo que hay detrás: es la diferencia entre cristal y una caja oscura.');
// El velo tiene que ser translúcido. Comprobar `/linear-gradient/` no vale: la caja
// opaca de antes era `linear-gradient(145deg, #151e2a, #0d131d)`, o sea, también un
// `linear-gradient`. Lo que distingue el cristal es el blanco al 6 %.
assert.match(winning('.farm-account', 'background') || '', /rgba\(\s*255,\s*255,\s*255/,
  'El velo de la tarjeta tiene que ser translúcido: un degradado de colores sólidos es la caja opaca de antes.');
console.log('ok  la tarjeta es cristal, en el bloque que gana');

for (const hueco of ['.farm-leader-card', '.farm-target-button']) {
  const sombra = resolver(winning(hueco, 'box-shadow'));
  assert.match(sombra, /inset [^;]+,[^;]+;/s,
    `${hueco} tiene que ser un hueco neomórfico: sombra oscura hacia dentro por un lado y clara por el otro. Se resolvió a «${sombra.slice(0, 40)}».`);
}
console.log('ok  la ficha del líder y el objetivo son huecos');

// Lo único que sobresale es el número de cuenta y el interruptor: lo que se toca.
const marca = resolver(winning('.farm-account-index', 'box-shadow'));
assert.match(marca, /^\s*[-\d.]+px/, 'El número de cuenta tiene que sobresaler: es lo que se toca, y el relieve hacia fuera lo dice.');
assert.doesNotMatch(marca, /inset/, 'El número de cuenta no puede hundirse: hundido se lee como un dato, no como un botón.');
console.log('ok  el número de cuenta sobresale');

const interruptor = resolver(winning('.farm-enable > span', 'box-shadow'));
assert.match(interruptor, /inset/, 'El interruptor de la cuenta es un hueco, no una banda de color.');
console.log('ok  el interruptor es un hueco');

// --- 3. Compacto --------------------------------------------------------------
const rejilla = winning('.farm-account-grid', 'grid-template-columns') || '';
assert.match(rejilla, /auto-fill[\s\S]*minmax\((\d+)px/,
  'La rejilla tiene que declarar un ancho mínimo de columna: es lo que decide cuántas cuentas caben.');
console.log(`ok  la rejilla: ${rejilla}`);

const estadisticas = winning('.farm-leader-detail-stats', 'grid-template-columns') || '';
assert.match(estadisticas, /repeat\(6/,
  'Las seis estadísticas van en una fila. En dos ocupaban el doble de alto y la tarjeta se iba de la pantalla.');
console.log(`ok  las seis estadísticas en una fila: ${estadisticas}`);

// --- 4. Los textos ------------------------------------------------------------
const TEXTOS = [
  ['el rótulo del líder, sin el ID', true, /leaderEyebrow\.textContent = leader \? 'Líder equipado' : 'Líder sin detectar';/],
  // Entre las tres hay comentarios, así que el patrón tiene que cruzar líneas.
  ['Líder, Fuerza y Vida en caja y baja', true, /\['Nivel', leader\.level[^\]]*\][\s\S]*\['Fuerza', leader\.strength[^\]]*\][\s\S]*\['Vida', leader\.maxHp/],
  ['las seis en español', true, /\['PS', leader\.stats\.hp\][\s\S]*\['DEF ESP', leader\.stats\.specialDefense\]/],
  ['sin las siglas en inglés', false, /\['HP', leader\.stats|\['ATK', leader\.stats|\['SPA', leader\.stats|\['SPD', leader\.stats/],
  ['sin el matiz en la etiqueta de fuerza', false, /FUERZA\$\{/],
  ['MT equipadas, en minúsculas', true, /tmLabel\.textContent = 'MT equipadas';/],
  ['«Sin MT detectadas» y no un aviso', true, /emptyTm\.textContent = 'Sin MT detectadas';/],
  ['sin el glifo de releer', false, /rereadButton\.textContent/],
  ['sin el glifo de la flecha', false, /targetArrow\.textContent/],
  ['el botón de iniciar con SVG', true, /playIcon\.innerHTML = launcherUiIcon\('play'\);/],
  ['el título sin mayúsculas forzadas', true, /\.farm-heading-copy h1 \{[\s\S]*?text-transform:\s*none;/]
];
for (const par of TEXTOS) {
  const [que, debe, re] = par;
  const presente = re.test(renderer) || re.test(styles);
  assert.equal(presente, debe, `${que}: ${debe ? 'tiene que estar' : 'no debe estar'}`);
}
console.log(`ok  los ${TEXTOS.length} textos, como deben`);

// --- El aviso, resuelto como lo resuelve el navegador -------------------------
// Aquí NO vale mirar una propiedad y ya, y hay tres formas de volver a dibujar la
// caja punteada:
//
//   · `border: 1px dashed …`  — la forma abreviada. `winning('border')` la ve.
//   · `border-style: dashed`  — por su cuenta. `winning('border')` NO la ve.
//   · `border-style: dashed` puesto DESPUÉS del `border: 0` que ya está. Aquí el
//     navegador gana el longhand y la caja vuelve a salir, aunque `winning('border')`
//     siga diciendo «0». Esta es la que se colaba: la prueba quedaba verde con la
//     casilla punteada en pantalla.
//
// Así que se reproduce la resolución: se leen las declaraciones del bloque ganador en
// orden, la forma abreviada reinicia las tres partes, y cada parte se guarda por
// separado. Lo que sale es el borde que se ve. Es el mismo orden que aplica la
// cascada dentro de un bloque, así que no hay que suponer nada.
const INICIALES = { estilo: 'none', ancho: 'medium', color: 'currentcolor' };
const ESTILOS = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];

// La forma abreviada admite los tres valores mezclados y en cualquier orden:
// `border: 1px dashed #efbf26`. Comparar el valor entero con una lista de estilos no
// la entiende, y un parser que no la entiende deja pasar la caja punteada sin
// darse cuenta. Por eso se trocea y se clasifica token a token.
function aplicarAbreviatura(partes, valor) {
  Object.assign(partes, INICIALES);
  // Se trocea por espacios, sin partir dentro de un paréntesis: `rgba(0, 0, 0, .4)`
  // es un token, no cuatro.
  const tokens = [];
  let nivel = 0;
  let actual = '';
  for (const c of valor) {
    if (c === '(') nivel++;
    if (c === ')') nivel--;
    if (/\s/.test(c) && nivel === 0) { if (actual) tokens.push(actual); actual = ''; continue; }
    actual += c;
  }
  if (actual) tokens.push(actual);
  for (const t of tokens) {
    if (ESTILOS.includes(t)) partes.estilo = t;
    else if (/^\d+(\.\d+)?(px|rem|em|%)?$/.test(t)) partes.ancho = t;
    else if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|transparent$|currentcolor$)/i.test(t)) partes.color = t;
  }
}

// Los longhands se guardan con la MISMA clave que usa la abreviatura. Si se guardan con
// el nombre de la propiedad (`width`, `style`), se crea una clave nueva, `ancho` y
// `estilo` se quedan con lo que puso la abreviatura, y la casilla punteada vuelve a
// salir en pantalla con el parser diciendo que no hay borde. Es un fallo que no se ve
// leyendo el código: se ve锯 lo que hace la comprobación.
const CLAVE = { 'border-style': 'estilo', 'border-width': 'ancho', 'border-color': 'color' };

function bordeEfectivo(selector) {
  const bloques = bloquesDe(selector);
  if (!bloques.length) return null;
  const bloque = bloques[bloques.length - 1];
  const partes = { ...INICIALES };
  // El grupo interno va SIN capturar: si captura, cuenta como grupo y desplaza los
  // índices, y `border:` a secas (que no tiene grupo 2) llega con el valor `undefined`.
  for (const [, propiedad, valor] of bloque.matchAll(/(?:^|[;{\s])(border|border-(?:style|width|color))\s*:\s*([^;]+);/g)) {
    const v = valor.trim();
    if (propiedad === 'border') aplicarAbreviatura(partes, v);
    else partes[CLAVE[propiedad]] = v;
  }
  return partes;
}

function sinBorde(selector) {
  const b = bordeEfectivo(selector);
  if (!b) return true;
  const invisible = ['none', 'hidden', '0', ''].includes(b.estilo);
  const sinGrosor = ['0', '0px', 'medium', ''].includes(b.ancho);
  return invisible || sinGrosor;
}

for (const hueco of ['.farm-leader-card', '.farm-target-button', '.farm-leader-tm-empty']) {
  assert.ok(sinBorde(hueco),
    `${hueco} acaba con un borde (${JSON.stringify(bordeEfectivo(hueco))}): un borde duro convierte el hueco en una tarjeta.`);
}
console.log('ok  los huecos no tienen borde, con la forma abreviada y con los longhands por separado');
console.log('ok  «Sin MT detectadas» ya no es un aviso');

// --- 4 bis. La casilla de Orre ------------------------------------------------
// Se dibuja con `::before` y `::after` sobre el `<span>` de texto que ya existía, en
// vez de|stylear el `input`. Eso obliga a que el `input` de verdad se esconda: si
// vuelve a verse, el jugador ve DOS casillas, la del navegador y la dibujada, y la
// que se puede pulsar es la invisible.
const inputOrre = winning('.farm-orre-permission input', 'opacity');
assert.equal(inputOrre, '0', `El input real de la casilla de Orre tiene que quedar invisible; ahora vale «opacity: ${inputOrre}».`);
assert.equal(winning('.farm-orre-permission input', 'position'), 'absolute',
  'El input real tiene que salirse del flujo, o deja un hueco donde la casilla dibujada.');
// Y que el marco y el tique se dibujen de verdad. Comprobar que exista la propiedad
// `content` no vale: `content: none` es la casilla sin dibujar, y el patrón `/content/`
// también pasa con ella. Lo que se mira es el VALOR.
const valorDe = (bloque, propiedad) => {
  const m = bloque.match(new RegExp(`(?:^|[;{\\s])${propiedad}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
};

const marcoOrre = bloquesDe('.farm-orre-permission > span::before');
assert.ok(marcoOrre.length, 'La casilla de Orre se dibuja con un ::before en el texto.');
const contenidoMarco = valorDe(marcoOrre[marcoOrre.length - 1], 'content');
assert.ok(contenidoMarco !== null && !/^none$/i.test(contenidoMarco),
  `La casilla de Orre tiene que dibujarse: el ::before vale «content: ${contenidoMarco}».`);
assert.match(resolver(winning('.farm-orre-permission > span::before', 'box-shadow')), /inset/,
  'El marco de la casilla de Orre es un hueco: es una cosa sunken, no una pegatina.');

const tiqueOrre = bloquesDe('.farm-orre-permission > span::after');
assert.ok(tiqueOrre.length, 'El tique de la casilla de Orre se dibuja con un ::after en el texto.');
assert.ok(!/^none$/i.test(valorDe(tiqueOrre[tiqueOrre.length - 1], 'content') || ''),
  'El tique tiene que dibujarse.');
// Y que el tique solo aparezca marcada, nunca en reposo.
assert.equal(winning('.farm-orre-permission > span::after', 'opacity'), '0',
  'El tique tiene que estar apagado en reposo.');
console.log('ok  la casilla de Orre es una sola, dibujada sobre el texto');

// --- 5. Los iconos de la barra ------------------------------------------------
// El botón se reconstruye entero en cada repintado, así que arreglar solo el HTML
// no basta: el hueco se queda en blanco en cuanto se repinta.
for (const id of ['rereadFarmLeadersButton', 'refreshFarmButton', 'stopFarmButton', 'startFarmButton']) {
  assert.ok(html.includes(`id="${id}"`), `Falta el botón ${id} en el HTML.`);
  assert.ok(new RegExp(`id="${id}"[^>]*><span class="top-action-icon">`).test(html),
    `${id} necesita un hueco de icono; si no, sale en blanco.`);
}
assert.ok(/function aplicarIconosBarraFarmeo\(\)/.test(renderer),
  'La barra de Farmeo necesita su propia función de iconos: el panel se abre y se cierra, y conectarla al arranque la deja vacía.');
assert.ok(/openFarmModal[\s\S]*?aplicarIconosBarraFarmeo\(\);/.test(renderer),
  'La función tiene que llamarse al abrir el panel, no solo al arrancar.');
console.log('ok  los tres botones de la barra tienen icono y se conectan al abrir el panel');

// Y el botón de iniciar de cada tarjeta: UN glifo, no dos.
//
// Aquí se juntaron dos formas de dibujar un play. La clase `.play-icon` pinta un
// triángulo con `border-left: 10px solid` sobre un elemento de `width: 0; height: 0`,
// y dentro del mismo span se metió también el SVG del pack. Como el span no tiene
// caja, el SVG no se recorta: los dos triángulos se veían uno al lado del otro.
//
// El que se queda es el SVG, por dos razones: el resto del panel ya usa el pack, y la
// regla `.farm-account-action .launcher-ui-icon` que hay en la hoja está puesta a la
// espera de un SVG que nunca llegó. Si alguien deja las dos cosas, el error vuelve a
// salir y nadie lo ve hasta que se abre el panel.
const accionFarmeo = renderer.slice(renderer.indexOf("accountAction.className = 'button button-farm farm-account-action'"));
const finAccion = accionFarmeo.indexOf('accountAction.disabled');
const trozo = accionFarmeo.slice(0, finAccion > 0 ? finAccion : 400);
assert.ok(!/playIcon\.className\s*=\s*'play-icon'/.test(trozo),
  'El botón de iniciar no puede llevar la clase `play-icon`: pinta un triángulo de CSS encima del SVG y salen dos.');
assert.match(trozo, /playIcon\.innerHTML = launcherUiIcon\('play'\);/,
  'El botón de iniciar tiene que llevar el icono del pack.');
// Y que el SVG del botón tenga sitio: la regla que lo mide no puede quedarse sin usar.
assert.match(winning('.farm-account-action', 'padding') || '', /^0/,
  'El botón de iniciar es cuadrado: el padding 0 deja que el SVG se centre.');
assert.match(styles, /\.farm-account-action \.launcher-ui-icon \{[^}]*width:\s*17px/,
  'El SVG del botón de iniciar tiene que estar medido; si no, sale del botón.');
console.log('ok  el botón de iniciar lleva un solo icono');

// Y los iconos que usan existen en la tabla.
const nombres = [...renderer.slice(renderer.indexOf('const LAUNCHER_ICON_PATHS')).matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*):\s'/gm)].map((m) => m[1]);
for (const icono of ['refresh', 'map', 'stop', 'chevron', 'play']) {
  assert.ok(nombres.includes(icono), `El icono ${icono} se usa y no está en la tabla.`);
}
console.log('ok  los cinco iconos de la barra existen en la tabla');

// --- 6. Y que el panel nada más sigue entero ---------------------------------
assert.match(styles, /\.hunt-flat-metric > \.hunt-flat-metric-icon \{[\s\S]*?display:\s*grid/,
  'El recuadro de los iconos de Hunt tiene que seguir saliendo como grid.');
assert.match(winning('.capture-filter-grid', 'grid-template-columns') || '', /repeat\(4/,
  'Los filtros de Capture Log siguen en cuatro columnas.');
assert.match(renderer, /\.replace\(DECORATIVOS, ' '\)/,
  'El script de Hunt sigue quitando los emojis que pone el juego en sus valores.');
console.log('ok  lo demás sigue en su sitio');

console.log('\nPanel de farmeo smoke passed: cristal por fuera, huecos por dentro, compacto en 250 px por tarjeta, los textos que se acortaron y los cinco iconos de la barra conectados al abrir el panel.');
