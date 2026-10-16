// El boton del motor de busqueda, y los estilos del dialogo y del boton.
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

// --- 1. La marca y el menu -----------------------------------------------------------
editar('src/renderer.js', [[
  '// El aviso de una pantalla: «esta pagina declara este icono».',
  [
    '// El nombre de cada motor, para el menu del boton. Las claves son las de `BUSCADORES`.',
    'const NOMBRES_DE_MOTOR = Object.freeze({',
    "  ddg: 'DuckDuckGo',",
    "  google: 'Google',",
    "  bing: 'Bing'",
    '});',
    '',
    '// La marca de un motor: su inicial en un circulo de su color.',
    '//',
    '// NO son los logos de las empresas, y es a proposito: meter marcas registradas de terceros en el',
    '// paquete es un problema que no compensa por tres iconos de 16 px. Una inicial en el color que',
    '// todo el mundo asocia a cada buscador se lee de un vistazo y no pide permiso a nadie.',
    'function marcaDeMotor(clave) {',
    "  const COLORES = { ddg: '#de5833', google: '#4285f4', bing: '#008373' };",
    "  const INICIALES = { ddg: 'D', google: 'G', bing: 'B' };",
    "  const color = COLORES[clave] || '#83909a';",
    "  const inicial = INICIALES[clave] || '?';",
    '  return `<span class="motor-marca" style="--motor-color:${color}">${inicial}</span>`;',
    '}',
    '',
    '// El menu del motor: se crea al abrirlo y se quita al cerrarlo, asi que hay UNO en el DOM como',
    '// mucho. Con un menu fijo por pantalla habria seis menus ocultos y cualquier busqueda en el',
    '// documento encontraria los seis —empezando por la prueba—.',
    'function cerrarMenuDeMotor() {',
    "  document.querySelector('.navegacion-motor-menu')?.remove();",
    '}',
    '',
    'function alternarMenuDeMotor(panel) {',
    '  if (!panel?.botonMotor) return;',
    "  const llave = `${panel.instanceId}:${panel.instanceIndex}`;",
    "  const abierto = document.querySelector('.navegacion-motor-menu');",
    '  const eraEste = abierto?.dataset.de === llave;',
    '  cerrarMenuDeMotor();',
    '  if (eraEste) return;',
    '  const menu = document.createElement(\'div\');',
    "  menu.className = 'navegacion-motor-menu';",
    '  menu.dataset.de = llave;',
    '  for (const [clave, nombre] of Object.entries(NOMBRES_DE_MOTOR)) {',
    "    const opcion = document.createElement('button');",
    "    opcion.type = 'button';",
    '    opcion.dataset.motor = clave;',
    '    opcion.innerHTML = `${marcaDeMotor(clave)}<span>${nombre}</span>`;',
    "    opcion.addEventListener('click', () => {",
    '      cambiarMotorDeInstancia(panel.instanceId, clave);',
    '      cerrarMenuDeMotor();',
    '    });',
    '    menu.appendChild(opcion);',
    '  }',
    '  // Se cuelga del cuerpo y se coloca con las coordenadas del boton. Colgarlo del panel obligaria a',
    '  // que el panel, la franja y el mosaico tuvieran `position` y no lo desbordara nada: tres cosas',
    '  // que hoy no se sabe si son verdad y que cambiarian con cualquier retoque de la maqueta.',
    '  const caja = panel.botonMotor.getBoundingClientRect();',
    "  menu.style.position = 'fixed';",
    '  menu.style.top = `${Math.round(caja.bottom + 6)}px`;',
    '  menu.style.left = `${Math.round(Math.max(8, caja.left - 60))}px`;',
    '  document.body.appendChild(menu);',
    '}',
    '',
    '// Cambiar el motor de una instancia. Es de la INSTANCIA y no de la pantalla: las seis pantallas de',
    '// un juego buscan en el mismo sitio, igual que en los ajustes. Por eso se repinta el boton de',
    '// todas, no solo el de la que se pulso.',
    'function cambiarMotorDeInstancia(instanceId, clave) {',
    '  const fila = browserInstances.find((r) => r.id === instanceId);',
    '  if (!fila || !Object.prototype.hasOwnProperty.call(BUSCADORES, clave)) return false;',
    '  fila.buscador = clave;',
    '  saveBrowserInstances();',
    '  for (const panel of browserInstanceViews.get(instanceId)?.panels || []) {',
    '    if (!panel.botonMotor) continue;',
    '    panel.botonMotor.dataset.motor = clave;',
    '    panel.botonMotor.innerHTML = marcaDeMotor(clave);',
    '  }',
    '  return true;',
    '}',
    '',
    '// El aviso de una pantalla: «esta pagina declara este icono».'
  ].join('\n'),
  'la marca, el menu y el cambio de motor'
]]);

// --- 2. El boton, en la barra --------------------------------------------------------
editar('src/renderer.js', [[
  [
    '    barra.append(botonAtras, botonAdelante, botonRecargar, campoDireccion);',
    '    panelbar.classList.add(\'tiene-barra\');'
  ].join('\n'),
  [
    '    // El motor, antes del campo de direccion: es una eleccion previa a lo que escribas. Con su',
    '    // marca, que dice cual esta puesto sin abrir nada.',
    "    botonMotor = document.createElement('button');",
    "    botonMotor.type = 'button';",
    "    botonMotor.className = 'navegacion-motor';",
    '    botonMotor.dataset.motor = instance.buscador || BUSCADOR_POR_DEFECTO;',
    "    botonMotor.title = 'Cambiar el motor de búsqueda';",
    "    botonMotor.setAttribute('aria-label', 'Motor de búsqueda');",
    '    botonMotor.innerHTML = marcaDeMotor(botonMotor.dataset.motor);',
    "    botonMotor.addEventListener('click', (evento) => {",
    '      // Sin esto, el clic llega al documento y el oyente de fuera cierra el menu que se acaba de',
    '      // abrir: se abriria y se cerraria en el mismo clic.',
    '      evento.stopPropagation();',
    '      alternarMenuDeMotor(panel);',
    '    });',
    '    barra.append(botonMotor, botonAtras, botonAdelante, botonRecargar, campoDireccion);',
    "    panelbar.classList.add('tiene-barra');"
  ].join('\n'),
  'el boton del motor en la barra'
]]);

editar('src/renderer.js', [[
  [
    '    botonRecargar = document.createElement(\'button\');',
    '    botonRecargar.type = \'button\';',
    '    botonRecargar.className = \'navegacion-recargar\';',
    '    botonRecargar.innerHTML = launcherUiIcon(\'refresh\');',
    '    botonRecargar.title = \'Recargar esta pantalla\';'
  ].join('\n'),
  [
    '    botonRecargar = document.createElement(\'button\');',
    '    botonRecargar.type = \'button\';',
    '    botonRecargar.className = \'navegacion-recargar\';',
    '    botonRecargar.innerHTML = launcherUiIcon(\'refresh\');',
    '    botonRecargar.title = \'Recargar esta pantalla\';',
    '    let botonMotor = null;'
  ].join('\n'),
  'el boton del motor, declarado antes de usarlo'
]]);

editar('src/renderer.js', [[
  [
    '    startUrl: partida,',
    '    lastUrl: partida,',
    '    destinoActual: partida,'
  ].join('\n'),
  [
    '    startUrl: partida,',
    '    lastUrl: partida,',
    '    destinoActual: partida,',
    '    // El boton del motor, para poder repintarlo cuando cambie desde cualquier pantalla.',
    '    botonMotor,'
  ].join('\n'),
  'el boton en el objeto del panel'
]]);

// --- 3. Cerrar el menu al pulsar fuera -----------------------------------------------
editar('src/renderer.js', [[
  'function conectarFlechasDePestanas() {',
  [
    '// El menu del motor se cierra al pulsar en cualquier otro sitio. Un menu que se queda abierto',
    '// tapando la barra es peor que no tenerlo.',
    'function conectarCierreDelMenuDeMotor() {',
    "  document.addEventListener('click', (evento) => {",
    "    if (evento.target.closest('.navegacion-motor-menu, .navegacion-motor')) return;",
    '    cerrarMenuDeMotor();',
    '  });',
    '}',
    '',
    'function conectarFlechasDePestanas() {'
  ].join('\n'),
  'el cierre del menu al pulsar fuera'
]]);

editar('src/renderer.js', [[
  [
    'function initializeBrowserInstances() {',
    '  conectarFlechasDePestanas();'
  ].join('\n'),
  [
    'function initializeBrowserInstances() {',
    '  conectarFlechasDePestanas();',
    '  conectarCierreDelMenuDeMotor();'
  ].join('\n'),
  'y se conecta al arrancar'
]]);

// --- 4. Los estilos ------------------------------------------------------------------
editar('src/styles.css', [[
  '.browser-instance-form { display: grid; grid-template-columns: minmax(0, 1fr) 160px; gap: 11px; }',
  [
    '/* Una columna. La rejilla de dos columnas ponia «pantallas» al lado de «modo» y el desplegable',
    '   de modo se solapaba con su propio texto. Con una columna cada campo ocupa lo que necesita. */',
    '.browser-instance-form { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }',
    '',
    '/* El modo, lo primero y con dos botones. Es la unica decision que cambia el resto del',
    '   formulario, asi que va arriba y se lee de un vistazo sin desplegar nada. */',
    '.browser-instance-modo { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
    '.modo-opcion {',
    '  display: grid; gap: 3px; text-align: left; padding: 12px 13px;',
    '  border: 1px solid rgba(255, 255, 255, .12); border-radius: 10px;',
    '  background: rgba(255, 255, 255, .03); color: var(--text); cursor: pointer; font: inherit;',
    '}',
    '.modo-opcion strong { font-size: 13px; letter-spacing: .01em; }',
    '.modo-opcion small { color: var(--muted); font-size: 11px; line-height: 1.4; }',
    '.modo-opcion:hover { border-color: rgba(255, 255, 255, .24); background: rgba(255, 255, 255, .06); }',
    '.modo-opcion.is-elegido {',
    '  border-color: #48bdd8; background: rgba(72, 189, 216, .12);',
    '  box-shadow: inset 0 0 0 1px rgba(72, 189, 216, .3);',
    '}',
    '.modo-opcion:focus-visible { outline: 2px solid #48bdd8; outline-offset: 2px; }'
  ].join('\n'),
  'el formulario en una columna y el modo con dos botones'
]]);

editar('src/styles.css', [[
  '.navegacion-direccion::placeholder { color: #6f8694; }',
  [
    '.navegacion-direccion::placeholder { color: #6f8694; }',
    '',
    '/* El motor de busqueda en la barra: la marca del que este puesto. */',
    '.navegacion-motor {',
    '  flex: 0 0 auto; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 7px;',
    '  background: rgba(255, 255, 255, .05); cursor: pointer;',
    '  display: inline-grid; place-items: center;',
    '}',
    '.navegacion-motor:hover { background: rgba(255, 255, 255, .11); }',
    '.motor-marca {',
    '  width: 15px; height: 15px; border-radius: 50%;',
    '  display: inline-grid; place-items: center;',
    '  background: var(--motor-color, #83909a); color: #fff;',
    '  font-size: 10px; font-weight: 700; line-height: 1;',
    '}',
    '/* El menu: uno solo, colgado del cuerpo y colocado con las coordenadas del boton. */',
    '.navegacion-motor-menu {',
    '  z-index: 60; display: grid; gap: 2px; padding: 5px; min-width: 150px;',
    '  border: 1px solid rgba(255, 255, 255, .13); border-radius: 10px;',
    '  background: rgba(20, 25, 29, .98); box-shadow: 0 12px 30px rgba(0, 0, 0, .5);',
    '}',
    '.navegacion-motor-menu button {',
    '  display: flex; align-items: center; gap: 9px; padding: 6px 9px;',
    '  border: 0; border-radius: 7px; background: transparent; color: var(--text);',
    '  cursor: pointer; font: inherit; font-size: 12px; text-align: left;',
    '}',
    '.navegacion-motor-menu button:hover { background: rgba(255, 255, 255, .08); }'
  ].join('\n'),
  'los estilos del motor'
]]);

console.log('cambios aplicados:');
for (const c of cambios) console.log('  · ' + c);
console.log('\n' + cambios.length + ' cambios');
