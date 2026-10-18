// Prueba del almacen de perfiles de sesion.
//
// QUE COMPRUEBA, Y POR QUE CADA COSA
//
//  - Que `Principal` exista siempre y sea el primero. Sin el, una ventana sin perfil asignado se
//    queda sin sesion: ni entra en Google ni en nada.
//  - Que `Principal` no se pueda renombrar ni borrar. Su nombre es el que sale en todos los
//    selectores; si cambiara, el mismo perfil se llamaria de dos maneras.
//  - Que los ids nunca se repiten. Se borra un perfil y se crea otro: si el id se repitiera, el
//    nuevo heredaria la sesion del que se borro.
//  - Que un id guardado que ya no existe caiga en `Principal`. Es lo que pasa si alguien edita el
//    almacenamiento a mano, y sin esto esa ventana se quedaria sin sesion y no entraria en nada.
//  - Que un perfil con ventanas dentro no se pueda borrar. Si se borrara, esas ventanas se
//    quedarian apuntando a un perfil que no existe.
//
// QUE NO COMPRUEBA
//
// Que la particion de un perfil no entre en el filtro de borrado de particiones. Eso lo comprueba
// `perfiles-sesion-0370-smoke.js`, que necesita el nombre de la particion, y este aqui no lo tiene.
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'src', 'index.html'), 'utf8');

// Un `localStorage` de mentira, con la misma forma que el de verdad. Se pasa por parametro en vez
// de tocar el global: asi la prueba no depende de que exista un almacenamiento real, y el modulo
// sigue siendo el que se carga en el launcher.
function almacenFalso() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: (clave) => { datos.delete(clave); },
    _datos: datos
  };
}

// El modulo se ejecuta de verdad, no se copia su texto. Si se copiara, la prueba seguiria dando
// verde cuando el fichero cambiara, que es justo lo que hay que evitar: aqui la unica fuente es el
// fichero que se carga en el launcher.
//
// La lectura va DENTRO del `try`, y no arriba del todo. Arriba, un fichero que no exista revienta
// antes de que Electron llegue a `whenReady`, y sin ventana a la que llamar no hay nada que le
// ordene cerrar: el proceso se queda vivo y la prueba parece colgada en vez de fallar.
function cargarAlmacen(almacen, ventanasPorPerfil = () => 0) {
  const fuente = fs.readFileSync(path.join(RAIZ, 'src', 'perfiles-sesion.js'), 'utf8');
  const ventana = {};
  const cuerpo = fuente.slice(
    fuente.indexOf('(function'),
    fuente.lastIndexOf('})();') + '})();'.length
  );
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'localStorage', 'globalThis', cuerpo + '\nreturn window.pokeGridPerfiles;');
  const perfiles = fn(ventana, almacen, globalThis);
  if (perfiles) perfiles.conCuantasVentanas = ventanasPorPerfil;
  return perfiles;
}

let fallos = 0;
function comprobar(que, ok, detalle) {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
  return ok;
}

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: false }
  });

  try {
    console.log('\nAlmacén de perfiles:\n');

    const almacen = almacenFalso();
    const P = cargarAlmacen(almacen);
    comprobar('el módulo se expone en window', Boolean(P));
    if (!P) throw new Error('sin modulo, no hay nada mas que comprobar');

    const listaVacia = P.listar();
    comprobar('con el almacen vacio solo esta Principal',
      listaVacia.length === 1 && listaVacia[0].id === 'principal',
      JSON.stringify(listaVacia));
    comprobar('y se llama Principal, con mayuscula',
      listaVacia[0].nombre === 'Principal', listaVacia[0].nombre);

    const trabajo = P.crear('Trabajo');
    const otro = P.crear('');
    const repetido = P.crear('Trabajo');

    comprobar('crear devuelve el perfil con su id', Boolean(trabajo && trabajo.id));
    comprobar('Principal sigue siendo el primero despues de crear',
      P.listar()[0].id === 'principal');
    comprobar('los ids nunca se repiten',
      new Set([trabajo.id, otro.id, repetido.id]).size === 3,
      `${trabajo.id} ${otro.id} ${repetido.id}`);
    comprobar('un nombre repetido se acepta, a proposito',
      repetido.nombre === 'Trabajo' && repetido.id !== trabajo.id);
    comprobar('un nombre en blanco se acepta y queda en blanco',
      otro.nombre === '', JSON.stringify(otro.nombre));

    console.log('\nEl Principal no se toca:\n');

    comprobar('no se puede renombrar', P.renombrar('principal', 'Otro') === false);
    comprobar('y sigue con su nombre', P.listar()[0].nombre === 'Principal');
    comprobar('no se puede borrar', P.borrar('principal') === false);
    comprobar('y sigue en la lista', P.listar().some((p) => p.id === 'principal'));

    console.log('\nRenombrar y borrar los demás:\n');

    comprobar('los demas si se renombran', P.renombrar(trabajo.id, 'Curro') === true);
    comprobar('y el nombre cambia',
      P.listar().find((p) => p.id === trabajo.id).nombre === 'Curro');
    comprobar('renombrar uno que no existe no dice que si', P.renombrar('nada', 'X') === false);
    comprobar('borrar uno que no existe no dice que si', P.borrar('nada') === false);

    const antes = P.listar().length;
    comprobar('un perfil sin ventanas se borra', P.borrar(otro.id) === true);
    comprobar('y desaparece de la lista', P.listar().length === antes - 1);
    comprobar('los otros siguen intactos',
      P.listar().some((p) => p.id === trabajo.id) && P.listar().some((p) => p.id === repetido.id));

    console.log('\nUn perfil con ventanas dentro:\n');

    // Aqui `conCuantasVentanas` se rellena desde el renderer, que es quien sabe de ventanas. Aqui se
    // falsea a proposito, para poder probar las dos ramas: con ventanas no se borra, sin ellas si.
    const ocupado = cargarAlmacen(almacenFalso());
    const suyo = ocupado.crear('Trabajo');
    // El gancho se pone DESPUES de crear, con el id que salio de verdad. Escribir aqui un id a mano
    // seria el de otro perfil, el gancho no responderia por el bueno y el borrado pasaria sin
    // comprobar nada. Es el mismo falso positivo de al revés del que ya se dio en la 0.36.0.
    ocupado.conCuantasVentanas = (id) => (id === suyo.id ? 3 : 0);
    comprobar('con ventanas dentro no se puede borrar', ocupado.borrar(suyo.id) === false);
    comprobar('y sigue en la lista', ocupado.listar().some((p) => p.id === suyo.id));
    // El mismo perfil, las mismas tres ventanas y el mismo gancho, pero con cero ventanas: si ahora
    // si se borra, queda demostrado que lo que lo paraba era el gancho y no otra cosa.
    ocupado.conCuantasVentanas = () => 0;
    comprobar('sin ventanas el mismo perfil si se borra', ocupado.borrar(suyo.id) === true);
    comprobar('el Principal tampoco se borra', ocupado.borrar('principal') === false);
    comprobar('y sigue siendo el primero', ocupado.listar()[0].id === 'principal');

    console.log('\nUn perfil que ya no existe:\n');

    comprobar('resolver uno desconocido cae en Principal', P.resolver('no-existe') === 'principal');
    comprobar('resolver el Principal devuelve el Principal', P.resolver('principal') === 'principal');
    comprobar('resolver nada cae en Principal', P.resolver('') === 'principal');
    comprobar('resolver null cae en Principal', P.resolver(null) === 'principal');
    comprobar('resolver uno que si existe lo devuelve tal cual', P.resolver(trabajo.id) === trabajo.id);
    comprobar('existe dice la verdad', P.existe(trabajo.id) && !P.existe('no-existe'));

    console.log('\nLo que venga roto:\n');

    // Editar el almacenamiento a mano, o una version vieja, puede dejar cualquier cosa. Nada de eso
    // puede dejar al launcher sin perfiles.
    const roto = almacenFalso();
    roto.setItem('pokegrid:session-profiles:v1', 'esto no es json');
    comprobar('con basura en el almacen sale el Principal',
      cargarAlmacen(roto).listar().length === 1);

    const raro = almacenFalso();
    raro.setItem('pokegrid:session-profiles:v1', JSON.stringify([
      'esto es una cadena',
      null,
      { nombre: 'sin id' },
      { id: 'principal', nombre: 'suplantado' },
      { id: 'a', nombre: 'Primero' },
      { id: 'a', nombre: 'Repetido' }
    ]));
    const conRaros = cargarAlmacen(raro).listar();
    comprobar('las filas sin id o basura se descartan',
      conRaros.length === 2, JSON.stringify(conRaros.map((p) => p.id)));
    comprobar('y el Principal no se puede suplantar desde el almacen',
      conRaros[0].nombre === 'Principal', conRaros[0].nombre);
    comprobar('los ids repetidos se quedan en uno', conRaros[1].nombre === 'Primero');

    console.log('\nLo que se guarda de verdad:\n');

    const persists = almacenFalso();
    const uno = cargarAlmacen(persists);
    const creado = uno.crear('Guardado');
    uno.renombrar(creado.id, 'Renombrado');
    const reread = cargarAlmacen(persists);
    comprobar('lo escrito se lee igual al cargar otra vez',
      reread.listar().some((p) => p.id === creado.id && p.nombre === 'Renombrado'));
    comprobar('y el Principal se crea solo si falta',
      reread.listar()[0].id === 'principal');
    comprobar('el Principal no se escribe en el almacen',
      !JSON.parse(persists.getItem('pokegrid:session-profiles:v1') || '[]')
        .some((p) => p && p.id === 'principal'));

    console.log('\nY que el fichero cargue de verdad en la pagina:\n');

    // Todo lo de arriba lee el fichero como texto. Esta parte carga la pagina entera, que es lo unico
    // que demuestra que el `<script>` esta en el sitio, que el nombre del fichero es el bueno y que
    // va ANTES de `renderer.js`: `renderer.js` usa `pokeGridPerfiles` al leer las ventanas, y cargado
    // despues, al arrancar el launcher ya no estaria.
    const real = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(RAIZ, 'tests', 'launcher-preview-preload.js'),
        contextIsolation: true,
        sandbox: false,
        webviewTag: true
      }
    });
    await real.loadFile(path.join(RAIZ, 'src', 'index.html'));
    const cargado = await real.webContents.executeJavaScript(
      'Boolean(window.pokeGridPerfiles && typeof window.pokeGridPerfiles.listar === "function")'
    );
    comprobar('el almacen existe en la pagina real, no solo en el texto', cargado === true);

    // Y que el Principal se cree solo al arrancar, con la pagina recien abierta y el almacen vacio.
    const primera = await real.webContents.executeJavaScript(
      'window.pokeGridPerfiles.listar().map((p) => p.id)'
    );
    comprobar('y al arrancar sale el Principal sin que nadie lo haya creado',
      JSON.stringify(primera) === '["principal"]', JSON.stringify(primera));

    // El orden de los `<script>`, leido del HTML. Esto no se deduce de la prueba de arriba: pasaria
    // igual con el almacen cargado despues, porque el HTML entero se carga antes de que corra nada.
    const ordenHtml = html.indexOf('src="perfiles-sesion.js"') < html.indexOf('src="renderer.js"');
    comprobar('y en el HTML va antes que renderer.js', ordenHtml === true);

    real.destroy();

    console.log(`\ncomprobaciones fallan: ${fallos}`);
    ventana.destroy();
    app.exit(fallos ? 1 : 0);
  } catch (error) {
    console.error(error.stack || error.message);
    ventana.destroy();
    app.exit(1);
  }
});
