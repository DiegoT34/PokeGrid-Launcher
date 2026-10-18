// Prueba de la 0.36.0: sesiones compartidas, farmeo en pestañas y los botones agrupados.
//
// QUE COMPRUEBA, Y POR QUE CADA COSA
//
//  - Que dos ventanas marcadas como compartidas getting the same partition. Es lo que hace falta para
//    entrar una vez en Google y tenerlo en las demas.
//  - Que una ventana propia NO la coja, y que dos propias sean distintas: si compartieran por error,
//    el launcher perderia lo de tener dos cuentas de la misma web en dos ventanas.
//  - Que una ventana sin el campo —creada antes de esto— siga siendo propia. Es lo que evita que al
//    reiniciar una ventana que llevaba semanas con su sesion se la cambie sola.
//  - Que cerrar una ventana compartida NO encole el borrado de la sesion comun. Este es el que mas
//    cuesta: si se colara, al cerrar una ventana se perderian las cookies de todas. Se comprueba que la
//    particion compartida NO empieza por el prefijo que el borrado filtra.
//
// QUE NO COMPRUEBA
//
// Que el modo pestañas del farmeo lea de verdad el equipo de las cuentas dormidas. Eso necesita una
// pagina de juego real, y aqui no hay ninguna. Lo que se comprueba es que la decision se tome por lo
// que tiene que ser.
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(RAIZ, 'src', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(RAIZ, 'src', 'index.html'), 'utf8');

// El nombre de la sesion compartida, leido del propio renderer. No se escribe aqui a mano: si se
// escribiera, la prueba seguiria dando verde cuando el nombre cambiara, que es justo cuando importa
// mas, porque de ese nombre depende que el borrado la respete.
const PARTICION = (() => {
  const m = /const PARTICION_COMPARTIDA = '([^']+)'/.exec(renderer);
  return m ? m[1] : '';
})();

let fallos = 0;
function comprobar(que, ok, detalle) {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
  return ok;
}

// Se saca la funcion de particion del renderer y se ejecuta aqui, en vez de copiar su texto: si se
// copiara, la prueba seguiria dando verde cuando la funcion cambiara, que es justo lo que hay que
// evitar.
function particionDe(instancia) {
  const opciones = (instancia && instancia.sesion) ? { sesion: instancia.sesion } : {};
  const cuerpo = renderer.slice(
    renderer.indexOf('function browserInstancePartition'),
    renderer.indexOf('function browserInstancePartition') + 900
  );
  // eslint-disable-next-line no-new-func
  const fn = new Function('PARTICION_COMPARTIDA', cuerpo + '\nreturn browserInstancePartition;')(PARTICION);
  // El id viene del caso que se esta probando, no escrito aqui. Con un id fijo, dos ventanas propias
  // salian con la misma particion y la comprobacion «dos propias son distintas» daba verde sin
  // comprobar nada: un falso positivo que oculta justo lo que se quiere demostrar.
  return fn(String(instancia.id || 'sin-id'), 0, opciones);
}

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: false }
  });

  try {
    console.log('\n0.36.0 — sesiones compartidas:\n');

    const compartidaA = particionDe({ id: 'a', sesion: 'compartida' });
    const compartidaB = particionDe({ id: 'b', sesion: 'compartida' });
    const propiaA = particionDe({ id: 'a', sesion: 'propia' });
    const propiaB = particionDe({ id: 'b', sesion: 'propia' });
    const sinCampo = particionDe({ id: 'c' });

    comprobar('dos ventanas compartidas usan la misma sesion', compartidaA === compartidaB && compartidaA === PARTICION,
      `${compartidaA}  vs  ${compartidaB}`);
    comprobar('y es exactamente la compartida', compartidaA === PARTICION, compartidaA);

    comprobar('una ventana propia NO usa la compartida', propiaA !== PARTICION, propiaA);
    comprobar('dos ventanas propias siguen siendo distintas', propiaA !== propiaB, `${propiaA} vs ${propiaB}`);
    // Una ventana creada antes de esto no trae el campo. Se compara con una ventana PROPIA de la MISMA id:
// comparar con otra distinta daria verde siempre, porque dos ventanas propias son distintas por
// definicion y no por el campo que falta.
    comprobar('una ventana sin el campo se queda propia',
      sinCampo !== PARTICION && sinCampo === particionDe({ id: 'c', sesion: 'propia' }),
      `${sinCampo}`);

    // El filtro real del borrado, leido del renderer tal cual. Si cambia, esto se entera.
    const filtro = /\.filter\(\(particion\) => particion\.startsWith\('([^']+)'\)\)/.exec(renderer);
    comprobar('el filtro de borrado existe', Boolean(filtro), 'no se encontro');
    const prefijo = filtro ? filtro[1] : '';
    comprobar('la sesion compartida NO entra en el filtro de borrado',
      Boolean(filtro) && !PARTICION.startsWith(prefijo), `prefijo=${prefijo}`);
    comprobar('una sesion propia SI entra, que es lo que se debe borrar al cerrar',
      Boolean(filtro) && propiaA.startsWith(prefijo), `${propiaA}  prefijo=${prefijo}`);

    // Que la opcion llega desde el interruptor y no desde un sitio fijo.
    comprobar('el interruptor esta en el HTML', /id="browserInstanceSesionCompartida"/.test(html));
    comprobar('y su valor se guarda al crear la ventana',
      /browserInstanceSesionCompartida\?\.checked \? 'compartida' : SESION_POR_DEFECTO/.test(renderer));
    comprobar('el valor por defecto es aislada', /const SESION_POR_DEFECTO = 'propia'/.test(renderer));

    console.log('\n0.36.0 — farmeo en modo pestañas:\n');
    const decide = /const leerTodas = farmeoEstaEnUso\(\);/.test(renderer);
    comprobar('la decision se toma una vez por pasada', decide);
    comprobar('la guarda usa esa decision', /!leerTodas && !panelEstaEnPantalla\(panel\)/.test(renderer));
    comprobar('se lee todo si el selector esta abierto', /if \(!farmPickerLayer\.hidden\) return true;/.test(renderer));
    comprobar('o si alguna cuenta esta farmeando',
      /panel\.farmRunState === 'ok' \|\| panel\.farmRunState === 'busy'/.test(renderer));
    comprobar('y sigue habiendo un camino barato cuando no se farmea',
      /if \(accountIndex === null && !leerTodas && !panelEstaEnPantalla/.test(renderer));

    console.log('\n0.36.0 — los botones van agrupados a la derecha:\n');
    comprobar('el nombre se lleva el hueco sobrante',
      /identity\.style\.flex = '1 1 auto';/.test(renderer));
    comprobar('y los botones van detras de la barra de acciones',
      /panelbar\.append\(identity, actions, masPantallaButton, menosPantallaButton\)/.test(renderer));

    console.log(`\ncomprobaciones fallan: ${fallos}`);
    ventana.destroy();
    app.exit(fallos ? 1 : 0);
  } catch (error) {
    console.error(error.stack || error.message);
    ventana.destroy();
    app.exit(1);
  }
});