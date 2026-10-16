// El diálogo de nueva pestaña, el nombre que sigue a la página, y el botón del motor.
//
// EL DIÁLOGO
//
// El modo pasa a elegirse con dos botones anchos, y debajo solo sale lo que aplica a ese modo. Un
// desplegable con «Instancia: una URL, todas sus pantallas igual» obliga a leer una frase larga
// para elegir entre dos cosas: dos botones con un título corto y una línea de explicación se leen
// de un vistazo.
//
// `#browserInstanceMode` sigue existiendo, pero como campo oculto: es donde vive el valor, y
// `sincronizarModoElegido` es quien reparte. Asi el resto del codigo —y las pruebas que ya habia—
// siguen hablando del mismo sitio, y lo unico que cambia es quien lo escribe.
//
// EL NOMBRE
//
// En modo navegador no se pregunta porque lo pone la pagina. Eso obliga a algo que antes no habia:
// el nombre tiene que SEGUIR al titulo. El preload ya avisa del icono; ahora manda tambien el
// titulo, y el renderer renombra la pestaña. En modo instancia no se toca nada: ese nombre lo puso
// quien la creo y es el suyo.
//
// EL MOTOR
//
// Un botón con la marca en la barra, y un menú que se crea al abrirlo y se quita al cerrarlo: uno
// solo en el DOM a la vez. Con un menú fijo por pantalla habria seis menús ocultos y cualquier
// busqueda en el documento encontraria los seis.
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

// =====================================================================================
// 1. El diálogo: título, dos botones de modo, y una columna
// =====================================================================================
editar('src/index.html', [[
  '            <h1 id="browserInstanceTitle">Agregar otro juego</h1>',
  '            <h1 id="browserInstanceTitle">Nueva pesta&ntilde;a</h1>',
  'el diálogo se llama Nueva pestaña'
]]);

editar('src/index.html', [[
  [
    '        <form id="browserInstanceForm" class="browser-instance-form">',
    '          <label class="field">',
    '            <span>NOMBRE DE LA INSTANCIA</span>',
    '            <input id="browserInstanceName" maxlength="48" required placeholder="Ej. Otro juego">',
    '          </label>',
    '          <label class="field browser-instance-url-field">',
    '            <span>ENLACE HTTPS DEL JUEGO</span>',
    '            <input id="browserInstanceUrl" type="url" maxlength="1000" required inputmode="url" placeholder="https://juego.example/">',
    '          </label>',
    '          <label class="field">',
    '            <span>PANTALLAS / CUENTAS</span>',
    '            <select id="browserInstanceCount">',
    '              <option value="1">1 pantalla</option>',
    '              <option value="2">2 pantallas</option>',
    '              <option value="3">3 pantallas</option>',
    '              <option value="4" selected>4 pantallas</option>',
    '              <option value="5">5 pantallas</option>',
    '              <option value="6">6 pantallas</option>',
    '            </select>',
    '          </label>',
    '          <label class="field">',
    '            <span>MODO</span>',
    '            <select id="browserInstanceMode">',
    '              <option value="instancia" selected>Instancia: una URL, todas sus pantallas igual</option>',
    '              <option value="navegador">Navegador: navegaci&oacute;n normal, con barra</option>',
    '            </select>',
    '          </label>'
  ].join('\n'),
  [
    '        <form id="browserInstanceForm" class="browser-instance-form">',
    '          <!-- El modo, primero y con dos botones. Es la unica decision que cambia el resto del',
    '               formulario, asi que va arriba y no al final. -->',
    '          <div class="browser-instance-modo" role="radiogroup" aria-label="Qu&eacute; quieres abrir">',
    '            <button id="browserInstanceModeInstancia" class="modo-opcion is-elegido" type="button" role="radio" aria-checked="true" data-modo="instancia">',
    '              <strong>Un juego</strong>',
    '              <small>Una direcci&oacute;n fija. Todas sus pantallas abren esa misma p&aacute;gina, cada una con su sesi&oacute;n.</small>',
    '            </button>',
    '            <button id="browserInstanceModeNavegador" class="modo-opcion" type="button" role="radio" aria-checked="false" data-modo="navegador">',
    '              <strong>Un navegador</strong>',
    '              <small>Navegaci&oacute;n normal, con barra y buscador. El nombre lo pone la p&aacute;gina en la que est&eacute;s.</small>',
    '            </button>',
    '          </div>',
    '          <!-- El valor del modo vive aqui. Los dos botones de arriba solo lo escriben y avisan. -->',
    '          <input type="hidden" id="browserInstanceMode" value="instancia">',
    '          <label class="field browser-instance-name-field">',
    '            <span>NOMBRE</span>',
    '            <input id="browserInstanceName" maxlength="48" required placeholder="Ej. Poke Idle World">',
    '          </label>',
    '          <label class="field browser-instance-url-field">',
    '            <span>DIRECCI&Oacute;N</span>',
    '            <input id="browserInstanceUrl" type="url" maxlength="1000" required inputmode="url" placeholder="https://juego.example/">',
    '          </label>',
    '          <label class="field">',
    '            <span>PANTALLAS / CUENTAS</span>',
    '            <select id="browserInstanceCount">',
    '              <option value="1">1 pantalla</option>',
    '              <option value="2">2 pantallas</option>',
    '              <option value="3">3 pantallas</option>',
    '              <option value="4" selected>4 pantallas</option>',
    '              <option value="5">5 pantallas</option>',
    '              <option value="6">6 pantallas</option>',
    '            </select>',
    '          </label>'
  ].join('\n'),
  'el formulario: modo primero y una columna'
]]);

editar('src/index.html', [[
  '        <p class="modal-copy">Cada pantalla conserva cookies, sesi&oacute;n y datos en una partici&oacute;n independiente. Las instancias guardadas vuelven a iniciarse autom&aacute;ticamente con el launcher.</p>',
  '',
  'el párrafo largo estorbaba más que ayudaba'
]]);

editar('src/index.html', [[
  '<button id="addBrowserInstanceButton" class="instance-add-button" type="button" aria-label="Agregar instancia de navegador" title="Agregar otro juego">+</button>',
  '<button id="addBrowserInstanceButton" class="instance-add-button" type="button" aria-label="Nueva pestaña" title="Nueva pestaña">+</button>',
  'el boton + tambien se llama Nueva pestaña'
]]);

// =====================================================================================
// 2. El renderer: las referencias, la sincronizacion y el formulario
// =====================================================================================
editar('src/renderer.js', [[
  "const browserInstanceMode = document.querySelector('#browserInstanceMode');",
  [
    "const browserInstanceMode = document.querySelector('#browserInstanceMode');",
    "const browserInstanceModeInstancia = document.querySelector('#browserInstanceModeInstancia');",
    "const browserInstanceModeNavegador = document.querySelector('#browserInstanceModeNavegador');",
    "const browserInstanceNameField = document.querySelector('.browser-instance-name-field');"
  ].join('\n'),
  'las referencias de los dos botones de modo'
]]);

editar('src/renderer.js', [[
  [
    'function sincronizarModoElegido() {',
    "  const conUrl = browserInstanceMode.value !== 'navegador';",
    '  browserInstanceUrlField.hidden = !conUrl;',
    '  browserInstanceUrl.required = conUrl;',
    '}'
  ].join('\n'),
  [
    'function sincronizarModoElegido() {',
    "  const conUrl = browserInstanceMode.value !== 'navegador';",
    '  browserInstanceUrlField.hidden = !conUrl;',
    '  browserInstanceUrl.required = conUrl;',
    '  // El nombre tampoco se pregunta en modo navegador: lo pone la pagina en la que estes. Si se',
    '  // dejara visible y obligatorio, no habria nada que escribir que no fuese a ser sustituido en',
    '  // cuanto la pagina cargara.',
    '  browserInstanceNameField.hidden = !conUrl;',
    '  browserInstanceName.required = conUrl;',
    '  // Y los dos botones dicen cual esta elegido, tambien para quien navega con teclado.',
    '  for (const boton of [browserInstanceModeInstancia, browserInstanceModeNavegador]) {',
    '    if (!boton) continue;',
    '    const elegido = boton.dataset.modo === browserInstanceMode.value;',
    "    boton.classList.toggle('is-elegido', elegido);",
    "    boton.setAttribute('aria-checked', String(elegido));",
    '  }',
    '}'
  ].join('\n'),
  'la sincronizacion cubre el nombre y los botones'
]]);

editar('src/renderer.js', [[
  [
    "browserInstanceMode?.addEventListener('change', sincronizarModoElegido);",
    'sincronizarModoElegido();'
  ].join('\n'),
  [
    '// Los dos botones escriben el modo y avisan, que es lo que hacia el desplegable.',
    'for (const boton of [browserInstanceModeInstancia, browserInstanceModeNavegador]) {',
    '  boton?.addEventListener(\'click\', () => {',
    '    if (!boton.dataset.modo) return;',
    '    browserInstanceMode.value = boton.dataset.modo;',
    "    sincronizarModoElegido();",
    '  });',
    '}',
    'sincronizarModoElegido();'
  ].join('\n'),
  'los dos botones de modo'
]]);

editar('src/renderer.js', [[
  [
    '      modo: browserInstanceMode.value,',
    '      // El motor y el reparto de enlaces no se preguntan aqui: van en los ajustes, que es donde',
    '      // se cambian. Se mandan los de fabrica y se corrigen alli.',
    '      buscador: BUSCADOR_POR_DEFECTO,',
    '      apertura: APERTURA_POR_DEFECTO,',
    "      inicio: browserInstanceMode.value === 'navegador' ? '' : browserInstanceUrl.value"
  ].join('\n'),
  [
    '      modo: browserInstanceMode.value,',
    '      // El reparto de enlaces no se pregunta aqui: va en los ajustes, que es donde se cambia, y',
    '      // el motor tiene su boton en la barra de cada pantalla.',
    '      buscador: BUSCADOR_POR_DEFECTO,',
    '      apertura: APERTURA_POR_DEFECTO,',
    '      // En modo navegador el enlace es opcional: si se escribe, se arranca ahi; si no, en el',
    '      // buscador. Antes se ignoraba lo que se escribiera, que es peor que no pedirlo.',
    '      inicio: browserInstanceUrl.value'
  ].join('\n'),
  'el enlace de arranque se usa tambien en modo navegador'
]]);

// =====================================================================================
// 3. El nombre sigue a la página
// =====================================================================================
editar('src/renderer.js', [[
  'function renderBrowserInstanceTabs() {',
  [
    '// El nombre de una pestaña de navegador es el de la pagina en la que esta. En modo instancia NO',
    '// se toca: ahi el nombre lo puso quien la creo, y su sitio es siempre el mismo.',
    '//',
    '// Un titulo vacio no borra el que hay: hay paginas que no ponen titulo hasta que cargan del',
    '// todo, y dejarlo en blanco seria peor que quedarse con el anterior.',
    'function tituloDePagina(panel, titulo) {',
    "  if (!panel || panel.origen === 'enlace') return false;",
    '  const fila = browserInstances.find((r) => r.id === panel.instanceId);',
    '  if (!fila || !esModoNavegador(fila)) return false;',
    "  const limpio = String(titulo || '').replace(/\\s+/g, ' ').trim().slice(0, 48);",
    '  if (!limpio || limpio === fila.name) return false;',
    '  fila.name = limpio;',
    '  saveBrowserInstances();',
    '  renderBrowserInstanceTabs();',
    '  return true;',
    '}',
    '',
    'function renderBrowserInstanceTabs() {'
  ].join('\n'),
  'el nombre sigue al titulo de la pagina'
]]);

editar('src/renderer.js', [[
  [
    "      avisoDeIcono({ url }, respuesta?.ok ? respuesta.dataUrl : '', instanceId);",
    '    }).catch(() => {});'
  ].join('\n'),
  [
    "      avisoDeIcono({ url }, respuesta?.ok ? respuesta.dataUrl : '', instanceId);",
    '    }).catch(() => {});',
    '    // Y el nombre, si la pagina lo trae. Va aqui y no en otro canal porque el aviso ya viaja',
    '    // una vez por documento: el titulo y el icono llegan juntos o no llega ninguno.',
    '    tituloDePagina(panel, evento.args?.[0]?.titulo);'
  ].join('\n'),
  'el titulo llega con el aviso del icono'
]]);

editar('src/instancia-rueda-preload.js', [[
  "  ipcRenderer.sendToHost('instancia:favicon', { url: absoluta });",
  "  ipcRenderer.sendToHost('instancia:favicon', { url: absoluta, titulo: document.title });",
  'el preload manda tambien el titulo'
]]);

console.log('cambios aplicados:');
for (const c of cambios) console.log('  · ' + c);
console.log('\n' + cambios.length + ' cambios');
