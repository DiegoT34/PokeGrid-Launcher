// La barra superior: las pestañas con minimo y maximo, la X, el icono del engranaje y el orden.
//
// LO DE LAS PESTAÑAS, Y POR QUE SE REVISA LO DE AYER
//
// Ayer se puso `flex: 1 0 auto`: las pestañas se repartian el ancho sobrante. Sobre el papel suena
// bien —«que no quede hueco»— y en pantalla queda mal: cinco pestañas estiradas a 240 px cada una,
// con el nombre nadando en medio, y un hueco igual al final porque el reparto tiene tope. Se pidio
// una eleccion abstracta y se eligio bien sobre el papel. El fallo fue preguntar sin enseñar.
//
// Ahora: cada pestaña se dimensiona a su contenido, con un MINIMO para que una corta no quede
// diminuta y un MAXIMO para que una larga no se coma la barra. Cuando el total no cabe, la tira
// desborda y las flechas hacen su trabajo, que es para lo que estan.
const fs = require('node:fs');
const path = require('node:path');

const cambios = [];
const editar = (rel, pares) => {
  const ruta = path.join(__dirname, rel);
  let texto = fs.readFileSync(ruta, 'utf8').split('\r\n').join('\n');
  for (const par of pares) {
    if (!Array.isArray(par) || par.length < 2) {
      throw new Error('Un par sin el texto de reemplazo se escribe como "undefined". En ' + rel + '.');
    }
    const [antes, despues, que] = par;
    if (typeof despues !== 'string') throw new Error('El reemplazo de ' + rel + ' no es cadena.');
    if (!texto.includes(antes)) throw new Error('El ancla no casa en ' + rel + ' (' + que + ').');
    if ((texto.split(antes).length - 1) !== 1) throw new Error('El ancla no es unica en ' + rel + ' (' + que + ').');
    texto = texto.replace(antes, despues);
    cambios.push(rel + ': ' + (que || 'sin etiqueta'));
  }
  fs.writeFileSync(ruta, texto.replace(/\n/g, '\r\n'), 'utf8');
};

// --- 1. Minimo y maximo, y nada de repartir ------------------------------------------
editar('src/styles.css', [[
  [
    '/* `flex: 1 0 auto` y no `1 1 auto`: crece con el espacio que sobra, hasta el maximo, pero NO se',
    '   encoge. Con `flex-shrink` en vez de 0, muchas pestanas se aplastarian hasta hacerse',
    '   ilegibles en vez de dejar que la lista se desplace con las flechas, que es lo que se quiere',
    '   cuando ya no cabe. El maximo evita que dos pestanas se estiren a media pantalla. */',
    '.instance-tab-shell {',
    '  flex: 1 0 auto;',
    '  max-width: 320px;',
    '  min-width: 0;'
  ].join('\n'),
  [
    '/* Tres reglas, y cada una por un motivo:',
    '   - `flex: 0 1 auto` — la pestaña se dimensiona a su contenido. NO crece para repartir el',
    '     sobrante: repartido, cinco pestañas se estiraban a 240 px con el nombre nadando en medio y',
    '     el hueco seguia al final, porque el reparto tambien tiene tope. Eso ya se probo y quedo mal.',
    '   - `min-width` — una pestaña de nombre corto no se queda diminuta ni se aplasta cuando hay',
    '     muchas: antes de encogerse mas, la lista desborda y se desplaza con las flechas.',
    '   - `max-width` — una de nombre largo no se come la barra; el nombre se corta con puntos.',
    '   Los tres numeros son los de la maqueta de la barra: 132 px es lo que mide el icono mas dos',
    '   palabras cortas, y 240 px es donde un nombre ya no aporta nada legible. */',
    '.instance-tab-shell {',
    '  flex: 0 1 auto;',
    '  min-width: 132px;',
    '  max-width: 240px;'
  ].join('\n'),
  'el minimo y el maximo de cada pestaña'
]]);

// --- 2. La X, que era una columna ----------------------------------------------------
editar('src/styles.css', [[
  [
    '.instance-tab-close {',
    '  width: 26px;',
    '  height: 32px;',
    '  border: 0;',
    '  border-left: 1px solid #354149;',
    '  background: transparent;',
    '  color: #81909b;',
    '  cursor: pointer;',
    '  font-size: 14px;',
    '}'
  ].join('\n'),
  [
    '/* Una X redonda y centrada, no una columna. Antes era de 26x32 pegada al borde derecho con una',
    '   linea divisoria, y con las pestañas anchas se leia como un panel pegado a la pestaña en vez',
    '   de como un boton. `flex: 0 0 auto` para que no la aplaste el nombre cuando el maximo aprieta. */',
    '.instance-tab-close {',
    '  flex: 0 0 auto;',
    '  width: 20px;',
    '  height: 20px;',
    '  margin-right: 6px;',
    '  padding: 0;',
    '  border: 0;',
    '  border-radius: 5px;',
    '  background: transparent;',
    '  color: #81909b;',
    '  cursor: pointer;',
    '  font-size: 13px;',
    '  line-height: 1;',
    '}'
  ].join('\n'),
  'la X pasa a ser un boton pequeño y centrado'
]]);

// --- 3. El icono del engranaje ------------------------------------------------------
editar('src/renderer.js', [[
  [
    "  '#viewModeButton': 'layout'",
    '};'
  ].join('\n'),
  [
    "  '#viewModeButton': 'layout',",
    '  // Faltaba, y por eso el engranaje salia como un cuadro vacio: esta lista es la que rellena el',
    '  // hueco del icono de cada boton del menu, y el engranaje no estaba en ella. Cuando vivia en la',
    '  // barra de pestañas se lo ponia una linea propia —`innerHTML` sobre el boton entero— y al',
    '  // quitar esa linea por vaciar el nombre, se quedo sin ninguna de las dos cosas.',
    "  '#instanceSettingsButton': 'settings'"
  ].join('\n'),
  'el engranaje entra en la lista de iconos del menu'
]]);

// --- 4. El orden: arrastrar y teclado ------------------------------------------------
editar('src/renderer.js', [[
  'function renderBrowserInstanceTabs() {',
  [
    '// Mover una instancia de sitio en la lista. El orden vive en `browserInstances`, que ya se',
    '// guarda, asi que basta con reordenar el array: la proxima vez que se abra el launcher las',
    '// pestañas salen en este orden sin nada mas que hacer.',
    '//',
    '// Se saca la que se mueve y se mete en la posicion de la otra, en vez de intercambiarlas: con',
    '// un intercambio, arrastrar la ultima sobre la primera no la pondria la primera, se quedaria',
    '// en el sitio de la primera y la primera en el suyo —que es correcto pero no es lo que parece',
    '// que va a pasar cuando sueltas una pestaña encima de otra—.',
    'function moverInstancia(instanciaId, destinoId) {',
    '  if (!instanciaId || !destinoId || instanciaId === destinoId) return false;',
    '  const desde = browserInstances.findIndex((fila) => fila.id === instanciaId);',
    '  const hasta = browserInstances.findIndex((fila) => fila.id === destinoId);',
    '  if (desde < 0 || hasta < 0) return false;',
    '  const [movida] = browserInstances.splice(desde, 1);',
    '  browserInstances.splice(hasta, 0, movida);',
    '  saveBrowserInstances();',
    '  renderBrowserInstanceTabs();',
    '  return true;',
    '}',
    '',
    '// Y una vuelta mas para el teclado. Arrastrar con el raton deja esto inservible sin el, y no',
    '// cuesta nada: Alt y la flecha mueve la pestaña que tenga el foco, que es lo que hace cualquier',
    '// navegador. Se devuelve el foco a la pestaña movida para poder seguir moviendola.',
    'function moverInstanciaConTeclado(instanciaId, paso) {',
    '  const desde = browserInstances.findIndex((fila) => fila.id === instanciaId);',
    '  if (desde < 0) return false;',
    '  const hasta = desde + paso;',
    '  if (hasta < 0 || hasta >= browserInstances.length) return false;',
    '  const [movida] = browserInstances.splice(desde, 1);',
    '  browserInstances.splice(hasta, 0, movida);',
    '  saveBrowserInstances();',
    '  renderBrowserInstanceTabs();',
    '  document.querySelector(`[data-instance-id="${instanciaId}"] .instance-tab`)?.focus();',
    '  return true;',
    '}',
    '',
    'function renderBrowserInstanceTabs() {'
  ].join('\n'),
  'las dos formas de reordenar'
]]);

editar('src/renderer.js', [[
  [
    "    button.addEventListener('click', () => activateBrowserInstance(instance.id));",
    '    shell.appendChild(button);'
  ].join('\n'),
  [
    "    button.addEventListener('click', () => activateBrowserInstance(instance.id));",
    '    // El teclado, en el boton, que ya es enfocable por ser un boton. No hace falta un `tabindex`',
    '    // ni un elemento mas: se engancha donde ya se puede llegar con el tabulador.',
    "    button.addEventListener('keydown', (evento) => {",
    "      if (!evento.altKey) return;",
    "      const paso = evento.key === 'ArrowLeft' ? -1 : evento.key === 'ArrowRight' ? 1 : 0;",
    '      if (!paso) return;',
    '      evento.preventDefault();',
    '      moverInstanciaConTeclado(instance.id, paso);',
    '    });',
    '    shell.appendChild(button);'
  ].join('\n'),
  'el teclado en el boton de la pestaña'
]]);

editar('src/renderer.js', [[
  [
    '    if (!instance.primary) {',
    "      const close = document.createElement('button');"
  ].join('\n'),
  [
    '    if (!instance.primary) {',
    '      // La principal no se arrastra: es la del juego y va siempre primera. Tampoco se puede',
    '      // arrastrar nada por delante de ella, porque su sitio no esta en `browserInstances` y',
    '      // `moverInstancia` no la encuentra.',
    "      shell.draggable = true;",
    "      shell.addEventListener('dragstart', (evento) => {",
    '        instanciaArrastrada = instance.id;',
    "        shell.classList.add('is-arrastrando');",
    '        // Hay que poner algo en el `dataTransfer` aunque no se use: sin esto, algunos motores',
    '        // ni siquiera empiezan el arrastre.',
    "        try { evento.dataTransfer.setData('text/plain', instance.id); } catch { /* sin permiso */ }",
    '        evento.dataTransfer.effectAllowed = \'move\';',
    '      });',
    "      shell.addEventListener('dragend', () => {",
    '        instanciaArrastrada = \'\';',
    "        shell.classList.remove('is-arrastrando');",
    "        instanceTabs.querySelectorAll('.is-destino').forEach((n) => n.classList.remove('is-destino'));",
    '      });',
    '      // `dragover` tiene que decir que si, o el navegador no deja soltar encima.',
    "      shell.addEventListener('dragover', (evento) => {",
    '        if (!instanciaArrastrada || instanciaArrastrada === instance.id) return;',
    '        evento.preventDefault();',
    "        evento.dataTransfer.dropEffect = 'move';",
    '      });',
    "      shell.addEventListener('drop', (evento) => {",
    '        if (!instanciaArrastrada) return;',
    '        evento.preventDefault();',
    '        moverInstancia(instanciaArrastrada, instance.id);',
    '      });',
    "      const close = document.createElement('button');"
  ].join('\n'),
  'arrastrar las pestañas'
]]);

editar('src/renderer.js', [[
  "const iconosDeInstancia = new Map();",
  [
    "const iconosDeInstancia = new Map();",
    '',
    '// Cual se esta arrastrando ahora mismo, si es que hay alguna. Vive fuera del bucle porque el',
    '// arrastre empieza en una pestaña y termina en otra, y las dos tienen que ver lo mismo.',
    "let instanciaArrastrada = '';"
  ].join('\n'),
  'el estado del arrastre'
]]);

console.log('cambios aplicados:');
for (const c of cambios) console.log('  · ' + c);
console.log('\n' + cambios.length + ' cambios');
