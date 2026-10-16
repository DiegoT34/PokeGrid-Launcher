// Los tres fallos del primer intento del motor y el dialogo.
//
// 1. `botonMotor` declarado DENTRO del bloque del modo navegador y usado FUERA, en el objeto del
//    panel. `let` vive en su bloque, asi que ahi no existia: ReferenceError al crear cualquier
//    pantalla. Va con sus hermanos, arriba del `if`.
// 2. El enlace del dialogo seguia oculto en modo navegador. Y la intencion escrita era la
//    contraria: si escribes una direccion, se arranca ahi; si no, en el buscador. Ocultarlo y a la
//    vez usar su valor es tener las dos mitades en desacuerdo — que es como se llega a un campo
//    invisible cuyo valor se guarda.
// 3. La marca del motor no tenia su CSS de posicion en el menu cuando se abre desde el cuerpo.
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

editar('src/renderer.js', [[
  [
    '  let botonRecargar = null;',
    '  if (esModoNavegador(instance)) {'
  ].join('\n'),
  [
    '  let botonRecargar = null;',
    '  // El del motor, aqui y no dentro del bloque de abajo: este es el ambito de la funcion, que es',
    '  // donde se usa —dentro del objeto `panel`, que se construye fuera del bloque—.',
    '  let botonMotor = null;',
    '  if (esModoNavegador(instance)) {'
  ].join('\n'),
  'botonMotor en el ambito de la funcion'
]]);

editar('src/renderer.js', [[
  [
    "    botonRecargar.title = 'Recargar esta pantalla';",
    '    let botonMotor = null;'
  ].join('\n'),
  [
    "    botonRecargar.title = 'Recargar esta pantalla';"
  ].join('\n'),
  'fuera la declaracion del sitio equivocado'
]]);

editar('src/renderer.js', [[
  [
    'function sincronizarModoElegido() {',
    "  const conUrl = browserInstanceMode.value !== 'navegador';",
    '  browserInstanceUrlField.hidden = !conUrl;',
    '  browserInstanceUrl.required = conUrl;'
  ].join('\n'),
  [
    'function sincronizarModoElegido() {',
    "  const conUrl = browserInstanceMode.value !== 'navegador';",
    '  // El enlace se ve SIEMPRE, y solo es obligatorio en modo instancia. En modo navegador es',
    '  // opcional: si lo escribes, la pestaña arranca ahi; si no, en el buscador. Antes se ocultaba y',
    '  // ademas se ignoraba su valor, que es la peor combinacion: un campo que no se ve y que tampoco',
    '  // hace nada.',
    '  browserInstanceUrl.required = conUrl;'
  ].join('\n'),
  'el enlace visible y opcional en modo navegador'
]]);

editar('src/index.html', [[
  [
    '          <label class="field browser-instance-url-field">',
    '            <span>DIRECCI&Oacute;N</span>',
    '            <input id="browserInstanceUrl" type="url" maxlength="1000" required inputmode="url" placeholder="https://juego.example/">',
    '          </label>'
  ].join('\n'),
  [
    '          <label class="field browser-instance-url-field">',
    '            <span>DIRECCI&Oacute;N <small class="field-opcional">(en navegador, opcional)</small></span>',
    '            <input id="browserInstanceUrl" type="url" maxlength="1000" required inputmode="url" placeholder="https://juego.example/">',
    '          </label>'
  ].join('\n'),
  'el campo dice cuando es opcional'
]]);

editar('src/styles.css', [[
  '.browser-instance-form select {',
  [
    '.field-opcional { color: var(--muted); font-size: 9px; letter-spacing: 0; text-transform: none; }',
    '',
    '.browser-instance-form select {'
  ].join('\n'),
  'el estilo de la aclaracion'
]]);

console.log('cambios aplicados:');
for (const c of cambios) console.log('  · ' + c);
console.log('\n' + cambios.length + ' cambios');
