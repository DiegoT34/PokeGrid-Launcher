// Prueba de la 0.37.0: que perfil usa cada ventana, y que las ventanas viejas migran al Principal.
//
// QUE COMPRUEBA, Y POR QUE CADA COSA
//
//  - Que dos ventanas con el MISMO perfil caigan en la misma particion. Es lo que hace falta para
//    entrar una vez en Google y tenerlo en las demas.
//  - Que dos ventanas con perfiles DISTINTOS caigan en particiones distintas. Si compartieran por
//    error, el launcher perderia lo de tener dos cuentas de la misma web en dos ventanas.
//  - Que una ventana sin `perfilId` —creada antes de esto— caiga en el Principal. Es lo que evita que
//    al reiniciar una ventana que llevaba semanas con su sesion se la cambie sola.
//  - Que una ventana cuyo perfil ya no exista tambien caiga en el Principal. Editar el almacen a
//    mano no puede dejar ventanas sin sesion.
//  - Que la particion de un perfil NO empiece por el prefijo que el borrado filtra. Este es el que
//    mas cuesta: si se colara, cerrar una ventana le borraria las cookies a todas las de su perfil.
//  - Que el campo `sesion` de la 0.36.0 no quede en ninguna parte.
//
// TAMBIEN COMPRUEBA, SIN QUERER
//
// El sondeo de farmeo en modo pestañas y el agrupado de los botones de la ventana. Son de la 0.36.0
// y no tienen nada que ver con los perfiles, pero vivian en la prueba que esta sustituye. Si no se
// copiaran aqui, dejarian de comprobarse sin que nadie se entere.
//
// QUE NO COMPRUEBA
//
// Que el almacen de perfiles haga su parte. Eso lo comprueba `perfiles-almacen-smoke.js`, entera.
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(RAIZ, 'src', 'renderer.js'), 'utf8');

// El nombre del perfil por defecto, leido del propio renderer. No se escribe aqui a mano: si se
// escribiera, la prueba seguiria dando verde cuando el nombre cambiara, que es justo cuando importa
// mas, porque de ese nombre dependen el prefijo de la particion y la migracion.
const POR_DEFECTO = (/const PERFIL_POR_DEFECTO = '([^']+)'/.exec(renderer) || [])[1] || '';

let fallos = 0;
function comprobar(que, ok, detalle) {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
  return ok;
}

// El prefijo por el que el borrado de particiones filtra. Se lee del filtro de verdad y no se escribe
// aqui, porque su valor es justo lo que hace que las particiones de perfil esten a salvo.
const PREFIJO_DE_BORRADO = (/\.filter\(\(particion\) => particion\.startsWith\('([^']+)'\)\)/.exec(renderer) || [])[1] || '';

// Sacar una funcion del renderer y ejecutarla aqui, en vez de copiar su texto: si se copiara, la
// prueba seguiria dando verde cuando la funcion cambiara, que es justo lo que hay que evitar.
//
// El final se busca CONTANDO LLAVES, y no por el tamaño de la funcion ni por la siguiente declaracion.
// Las dos otras formas fallan: un tamaño fijo parte la funcion por mitad en cuanto crece, y buscar la
// siguiente declaracion se come lo que haya pegado detrás —que fue justo lo que pasó con el
// `window.pokeGridPerfiles` de la función anterior—.
//
// LIMITACION CONOCIDA: una llave sin emparejar dentro de una cadena o de un comentario descoloca el
// conteo. No hay ninguna en las tres funciones que se sacan aquí, y si algún día la hay, la prueba
// falla con un error de sintaxis apuntando a esta linea, no en silencio.
function sacarFuncion(nombre, params) {
  const inicio = renderer.indexOf(nombre);
  if (inicio < 0) throw new Error(`no se encuentra «${nombre}» en el renderer`);
  // El `return` final lleva SOLO el identificador. Con `return function perfilParticion;` —que es lo
  // que sale si se usa el nombre entero— es un error de sintaxis, y el mensaje no dice nada de lo que
  // pasa: parece un fallo del renderer y el fallo esta en la prueba.
  const identificador = nombre.slice(nombre.indexOf('function ') + 9).replace(/\(.*$/, '');
  // La llave de apertura es la del CUERPO, no la primera que aparece. Con `opciones = {}` en los
  // parametros, la primera llave esta dentro del paso de argumentos y el conteo se cierra ahi, con la
  // funcion cortada justo antes de su `return`. Se cuentan parentesis hasta que se cierran los de la
  // firma, y la llave siguiente es la del cuerpo.
  let parentesis = 0;
  let abre = -1;
  for (let i = renderer.indexOf('(', inicio); i < renderer.length && abre < 0; i++) {
    if (renderer[i] === '(') parentesis++;
    else if (renderer[i] === ')') {
      parentesis--;
      if (parentesis === 0) abre = renderer.indexOf('{', i);
    }
  }
  let nivel = 0;
  let fin = abre;
  for (; fin < renderer.length; fin++) {
    if (renderer[fin] === '{') nivel++;
    else if (renderer[fin] === '}' && --nivel === 0) { fin++; break; }
  }
  const cuerpo = renderer.slice(inicio, fin);
  // eslint-disable-next-line no-new-func
  return new Function(...params, cuerpo + `\nreturn ${identificador};`);
}

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, sandbox: false }
  });

  try {
    console.log('\n0.37.0 — la partición de un perfil:\n');

    // El almacen se falsea con lo unico que hace falta: decir si un id existe. Es la misma pregunta
    // que le hace el de verdad, y asi esta prueba no depende de `localStorage` ni de Electron.
    const existentes = new Set(['principal', 'perfil-trabajo', 'perfil-correo']);
    const Ventana = { pokeGridPerfiles: { resolver: (id) => (existentes.has(id) ? id : 'principal') } };

    const perfilParticion = sacarFuncion('function perfilParticion', ['PERFIL_POR_DEFECTO'])(POR_DEFECTO);

    const principal = perfilParticion('principal');
    comprobar('la forma es la de un perfil', /^persist:pokegrid-perfil-[a-z0-9-]+$/.test(principal), principal);
    comprobar('dos ventanas del mismo perfil comparten sesion', principal === perfilParticion('principal'));
    comprobar('y con otro perfil la particion es distinta',
      perfilParticion('perfil-trabajo') !== perfilParticion('perfil-correo'));
    comprobar('el perfil por defecto tiene su propia particion',
      perfilParticion(POR_DEFECTO) === principal, perfilParticion(POR_DEFECTO));

    // El identificador viene del caso que se esta probando. Con uno fijo, «distintas» daria verde sin
    // comprobar nada: es el falso positivo que ya se dio una vez en la 0.36.0.
    comprobar('sin id, la particion es la del Principal',
      perfilParticion('') === principal, perfilParticion(''));

    console.log('\n0.37.0 — que cerrar una ventana no borre las cookies de las demás:\n');

    comprobar('el filtro de borrado sigue existiendo', PREFIJO_DE_BORRADO.length > 0, PREFIJO_DE_BORRADO);
    comprobar('la particion de perfil NO entra en el filtro de borrado',
      !!PREFIJO_DE_BORRADO && !principal.startsWith(PREFIJO_DE_BORRADO),
      `${principal}  ·  prefijo ${PREFIJO_DE_BORRADO}`);
    comprobar('ni ninguna particion de perfil puede entrar en el',
      ['','x','perfil-trabajo','perfil-correo'].every((id) => !perfilParticion(id).startsWith(PREFIJO_DE_BORRADO)));
    // Y por el otro lado: el filtro tiene que seguir cogiendo ALGO. Si alguien lo ensancha hasta
    // `persist:pokegrid-` para «no dejar nada», dejaria de proteger a los perfiles —eso lo saltaria
    // la comprobacion de arriba, que es justo su trabajo— pero ademas se comeria las cuentas del
    // juego. Las ventanas viejas siguen usando `pokegrid-instance-` hasta que se recrean, asi que el
    // filtro no es teoria: cerrar una de ellas durante la migracion lo usa de verdad.
    comprobar('el filtro de borrado SI sigue cogiendo las particiones viejas de instancia',
      PREFIJO_DE_BORRADO === 'persist:pokegrid-instance-'
        && `persist:pokegrid-instance-vieja-1`.startsWith(PREFIJO_DE_BORRADO));
    comprobar('y no toca las cuentas del juego',
      PREFIJO_DE_BORRADO !== 'persist:pokegrid-'
        && !`persist:pokegrid-cuenta-7`.startsWith(PREFIJO_DE_BORRADO));
    console.log('\n0.37.0 — `browserInstancePartition` usa el perfil:\n');

    const browserInstancePartition = sacarFuncion('function browserInstancePartition', ['perfilParticion'])(
      perfilParticion
    );
    // Los ids de instancia van deliberadamente distintos: si la particion los usara, dos ventanas con
    // perfiles distintos podrian salir con la misma por casualidad del id.
    const deTrabajo = browserInstancePartition('inst-a', 0, { perfilId: 'perfil-trabajo' });
    const deTrabajoOtra = browserInstancePartition('inst-b', 3, { perfilId: 'perfil-trabajo' });
    const deCorreo = browserInstancePartition('inst-c', 0, { perfilId: 'perfil-correo' });
    comprobar('dos ventanas del mismo perfil comparten particion, ids distintos incluidos',
      deTrabajo === deTrabajoOtra, `${deTrabajo}  vs  ${deTrabajoOtra}`);
    comprobar('y con perfiles distintos no', deTrabajo !== deCorreo, `${deTrabajo}  vs  ${deCorreo}`);
    comprobar('el indice de la pantalla ya no cuenta para la sesion',
      browserInstancePartition('inst-a', 0, { perfilId: 'perfil-trabajo' })
        === browserInstancePartition('inst-a', 1, { perfilId: 'perfil-trabajo' }));
    comprobar('una ventana sin perfilId va al Principal',
      browserInstancePartition('inst-a', 0, {}) === principal,
      browserInstancePartition('inst-a', 0, {}));

    console.log('\n0.37.0 — las ventanas viejas migran al Principal:\n');

    // `normalizarOpcionesDeInstancia` es la que rellena los valores por defecto al leer una ventana
    // guardada. Es la de verdad, sacada del renderer. Los demas parametros son valores minimos
    // válidos, NO lo que se prueba aqui: van solo para que la funcion no reviente al ejecutarse.
    const normalizar = sacarFuncion('function normalizarOpcionesDeInstancia', [
      'MODOS_DE_INSTANCIA', 'MODO_POR_DEFECTO', 'BUSCADORES', 'BUSCADOR_POR_DEFECTO',
      'MODOS_DE_APERTURA', 'APERTURA_POR_DEFECTO', 'window', 'PERFIL_POR_DEFECTO'
    ])(
      ['instancia', 'navegador'], 'instancia', { google: true }, 'google',
      ['pestana', 'nueva'], 'pestana', Ventana, POR_DEFECTO
    );

    comprobar('una ventana vieja, sin perfilId, cae en el Principal',
      normalizar({}).perfilId === 'principal', JSON.stringify(normalizar({})));
    comprobar('una ventana con un perfil que existe lo conserva',
      normalizar({ perfilId: 'perfil-trabajo' }).perfilId === 'perfil-trabajo');
    comprobar('una ventana con un perfil que NO existe cae en el Principal',
      normalizar({ perfilId: 'borrado-a-mano' }).perfilId === 'principal',
      normalizar({ perfilId: 'borrado-a-mano' }).perfilId);
    comprobar('el Principal se resuelve a si mismo',
      normalizar({ perfilId: 'principal' }).perfilId === 'principal');
    comprobar('y el resto de valores por defecto no se han roto',
      normalizar({}).modo === 'instancia' && normalizar({}).buscador === 'google'
        && normalizar({}).apertura === 'pestana');
    comprobar('lo que venga informado se respeta',
      normalizar({ modo: 'navegador', buscador: 'google', apertura: 'nueva' }).modo === 'navegador');

    console.log('\n0.37.0 — lo que se quitó de la 0.36.0:\n');

    comprobar('ya no queda el interruptor de sesion', !renderer.includes('browserInstanceSesionCompartida'));
    comprobar('ni sus constantes', !renderer.includes('SESIONES_DE_INSTANCIA'));
    comprobar('ni el valor por defecto de sesion', !renderer.includes("SESION_POR_DEFECTO = 'propia'"));
    comprobar('ni la sesion compartida', !renderer.includes('PARTICION_COMPARTIDA'));
    comprobar('ni el texto que lo explicaba', !renderer.includes('explicarSesionCompartida'));
    comprobar('ni el campo `sesion` al crear una ventana',
      !/sesion:\s*browserInstance/.test(renderer) && !/opciones\.sesion/.test(renderer));

    // Y que no quede en el HTML ni en el CSS. Un interruptor al que ya no escucha nadie se ve bien en
    // la pagina y no hace nada, que es la forma mas traicionera de romper una cosa: nadie lo nota
    // hasta que lo pulsa.
    const html = fs.readFileSync(path.join(RAIZ, 'src', 'index.html'), 'utf8');
    const estilos = fs.readFileSync(path.join(RAIZ, 'src', 'styles.css'), 'utf8');
    comprobar('el interruptor no esta tampoco en el HTML',
      !html.includes('browserInstanceSesionCompartida') && !html.includes('switch-line'));
    comprobar('ni su CSS', !estilos.includes('switch-line') && !estilos.includes('browser-instance-sesion-field'));
    comprobar('pero el texto de ayuda de otros campos sigue existiendo',
      estilos.includes('.field-help'), 'no se deberia haber borrado .field-help');

    console.log('\n0.37.0 — el selector de perfil del modal:\n');

    // El texto de la pagina real, no una copia: el selector se pinta al abrir el modal, y eso solo
    // se puede comprobar abriendo el modal.
    const ventanaModal = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(RAIZ, 'tests', 'launcher-preview-preload.js'),
        contextIsolation: true,
        sandbox: false,
        webviewTag: true
      }
    });
    await ventanaModal.loadFile(path.join(RAIZ, 'src', 'index.html'));
    await new Promise((r) => setTimeout(r, 600));

    const modal = await ventanaModal.webContents.executeJavaScript(`(() => {
      openBrowserInstanceModal();
      const selector = document.querySelector('#browserInstancePerfil');
      const salida = {
        haySelector: Boolean(selector),
        opciones: selector ? [...selector.options].map((o) => o.textContent) : [],
        valores: selector ? [...selector.options].map((o) => o.value) : [],
        elegido: selector ? selector.value : '',
        formularioAbierto: !browserInstanceBackdrop.hidden,
        hayBotonDeNuevo: Boolean(document.querySelector('#nuevoPerfilButton')),
        elFormEmpiezaOculto: document.querySelector('#nuevoPerfilForm')?.hidden,
        // Se escribe un nombre y se pulsa Crear, como lo haria la persona.
        crea: (() => {
          document.querySelector('#nuevoPerfilButton').click();
          const form = document.querySelector('#nuevoPerfilForm');
          const visible = !form.hidden;
          const campo = document.querySelector('#nuevoPerfilNombre');
          campo.value = 'Curro';
          document.querySelector('#nuevoPerfilCrear').click();
          return {
            elFormSeEnseno: visible,
            elFormSeVuelveACerrar: form.hidden,
            elCampoSeEnfoco: document.activeElement === campo,
            elegidoAhora: document.querySelector('#browserInstancePerfil').value,
            nombresDespues: [...document.querySelector('#browserInstancePerfil').options].map((o) => o.textContent),
            elModalSigueAbierto: !browserInstanceBackdrop.hidden
          };
        })(),
        // Y el perfil elegido es el que se guardaria.
        loQueSeGuarda: browserInstancePerfil.value
      };
      closeBrowserInstanceModal();
      return salida;
    })()`);

    comprobar('el selector esta en el modal', modal.haySelector === true);
    comprobar('y sale con el Principal', modal.elegido === 'principal', modal.elegido);
    comprobar('con su nombre puesto, no con el identificador',
      modal.opciones[0] === 'Principal', JSON.stringify(modal.opciones));
    comprobar('el modal se abre de verdad', modal.formularioAbierto === true);
    comprobar('hay un boton para crear otro sin salir del modal', modal.hayBotonDeNuevo === true);
    comprobar('el campo de crear aparece al pulsar ese boton',
      modal.elFormEmpiezaOculto === true && modal.crea.elFormSeEnseno === true,
      `oculto al empezar: ${modal.elFormEmpiezaOculto}, visible al pulsar: ${modal.crea.elFormSeEnseno}`);
    comprobar('y se cierra al crearlo', modal.crea.elFormSeVuelveACerrar === true);
    comprobar('el perfil nuevo se crea y queda elegido',
      modal.crea.elegidoAhora !== 'principal' && modal.crea.elegidoAhora.startsWith('perfil-'),
      modal.crea.elegidoAhora);
    comprobar('y sale en la lista con su nombre',
      modal.crea.nombresDespues.includes('Curro'), JSON.stringify(modal.crea.nombresDespues));
    comprobar('sin cerrar el modal', modal.crea.elModalSigueAbierto === true);
    comprobar('lo que se guarda es el perfil elegido',
      modal.loQueSeGuarda === modal.crea.elegidoAhora, `${modal.loQueSeGuarda} vs ${modal.crea.elegidoAhora}`);

    // Volver a abrir el modal tiene que dejar el Principal elegido, no el perfil de la otra vez.
    const segunda = await ventanaModal.webContents.executeJavaScript(
      'openBrowserInstanceModal(); browserInstancePerfil.value'
    );
    comprobar('al reabrirlo vuelve al Principal, no al de la vez anterior', segunda === 'principal', segunda);
    await ventanaModal.webContents.executeJavaScript('closeBrowserInstanceModal(); true');
    ventanaModal.destroy();

    console.log('\n0.37.0 — cambiar el perfil de una ventana:\n');

    comprobar('el aviso va ANTES de cambiar nada',
      /function confirmarCambioDePerfil[\s\S]*?window\.confirm\(/.test(renderer)
        && renderer.indexOf('confirmarCambioDePerfil(instancia.perfilId') < renderer.indexOf('instancia.perfilId = nuevo'));
    comprobar('el aviso dice las dos cosas: que se pierden las webs y que hay que volver a entrar',
      /reiniciaran sus pantallas/.test(renderer) && /volver a entrar/.test(renderer));
    comprobar('si se dice que no, el selector vuelve a lo que tenia',
      /if \(!aplicarPerfilAInstancia\(instancia\.id, evento\.target\.value\)\) pintarPerfilEnLosAjustes\(\);/.test(renderer));
    comprobar('al cambiar se reconstruye la ventana', /createBrowserInstanceWorkspace\(instancia, indice\)/.test(renderer));
    // Lo que NO puede pasar: que al cambiar de perfil se borre alguna particion. La particion es del
    // perfil, la comparten varias ventanas, y vaciarla las dejaria a todas sin sesion.
    const desde = renderer.indexOf('function aplicarPerfilAInstancia');
    const bloque = desde < 0 ? '' : renderer.slice(desde, desde + 1400);
    comprobar('y al cambiar NO se borra ninguna particion',
      bloque.length > 0 && !bloque.includes('borrarParticion'));
    // `\s*` y no `\n`: los ficheros del repo van con CRLF, y un patron que pide un salto de linea
    // exacto no casa en Windows. Con `\s*` da lo mismo en los dos sistemas.
    comprobar('el selector de los ajustes se pinta al abrir el dialogo',
      /pintarPerfilEnLosAjustes\(\);\s*\}/.test(renderer));

    console.log('\n0.37.0 — el gestor de perfiles:\n');

    // Se abre el gestor de verdad y se leen las filas que pinta, sin copiar su codigo.
    const ventanaGestor = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(RAIZ, 'tests', 'launcher-preview-preload.js'),
        contextIsolation: true,
        sandbox: false,
        webviewTag: true
      }
    });
    await ventanaGestor.loadFile(path.join(RAIZ, 'src', 'index.html'));
    await new Promise((r) => setTimeout(r, 600));

    // El `try` va DENTRO del codigo que se ejecuta en la pagina. Fuera, `executeJavaScript` convierte
    // cualquier excepcion en un «Script failed to execute» que no dice ni que funcion fallo ni por que,
    // y hay que adivinarlo.
    const g = await ventanaGestor.webContents.executeJavaScript(`(() => {
      try {
      document.querySelector('#perfilesButton').click();
      const capa = document.querySelector('#perfilesBackdrop');
      const lista = document.querySelector('#perfilesList');
      const circulos = [...lista.querySelectorAll('.perfil-circulo:not(.es-nuevo)')];
      const nuevo = lista.querySelector('#perfilNuevoBoton');
      const leer = () => [...lista.querySelectorAll('.perfil-circulo:not(.es-nuevo)')].map((c) => ({
        nombre: c.querySelector('.perfil-circulo-nombre')?.textContent,
        uso: c.querySelector('.perfil-circulo-uso')?.textContent,
        esInicial: Boolean(c.querySelector('.es-inicial')),
        foto: c.querySelector('.perfil-circulo-foto')?.getAttribute('style') || ''
      }));

      const inicial = leer();
      const salir = { abierto: !capa.hidden, circulos: circulos.length, hayNuevo: Boolean(nuevo) };

      // Crear desde el «+», que es el camino de verdad.
      nuevo.click();
      const trasCrear = leer();
      const editorAbierto = !document.querySelector('#perfilEditor').hidden;
      const conFoco = document.activeElement === document.querySelector('#perfilEditorNombre');

      // Poner color: la paleta, sin abrir nada mas.
      const paleta = [...document.querySelectorAll('#perfilColorPalette .perfil-color')];
      const conColor = paleta.filter((b) => b.style.background).length;
      paleta[1]?.click();
      const trasColor = leer();

      // Abrir la rejilla de avatares.
      document.querySelector('#perfilEditorAvatar').click();
      const rejilla = document.querySelector('#perfilAvatarGrid');
      const abierto = !rejilla.hidden;
      const celdas = rejilla.querySelectorAll('.perfil-avatar').length;

      // El editor se cierra solo al reabrir el gestor, y no aparece editing lo ultimo editado.
      document.querySelector('#closePerfilesButton').click();
      document.querySelector('#perfilesButton').click();
      const editorTrasReabrir = !document.querySelector('#perfilEditor').hidden;

      return {
        salir, inicial, trasCrear, editorAbierto, conFoco,
        conColor, trasColor, abierto, celdas, editorTrasReabrir, error: ''
      };
      } catch (error) {
        return { error: String(error && error.stack ? error.stack.split('\\n').slice(0, 4).join(' | ') : error) };
      }
    })()`);

    if (g.error) {
      comprobar('el gestor se abre sin reventar', false, g.error);
    }
    comprobar('el gestor se abre desde el boton de la barra', g.salir?.abierto === true);
    comprobar('sale un circulo por perfil, sin el boton de nuevo', g.salir.circulos >= 1, JSON.stringify(g.salir));
    comprobar('y el boton «+» esta siempre, al final', g.salir.hayNuevo === true);
    comprobar('cada circulo dice su nombre y cuantas ventanas lo usan',
      g.inicial.every((c) => c.nombre && c.uso), JSON.stringify(g.inicial));
    comprobar('un perfil sin avatar enseña la inicial, no un hueco',
      g.inicial.every((c) => c.esInicial), JSON.stringify(g.inicial));

    comprobar('el «+» crea un perfil de verdad', g.trasCrear.length === g.salir.circulos + 1,
      `${g.salir.circulos} -> ${g.trasCrear.length}`);
    comprobar('y abre su editor con el nombre puesto y el cursor ahi',
      g.editorAbierto === true && g.conFoco === true);

    comprobar('la paleta tiene colores y tambien «sin fondo»', g.conColor >= 8, `colores: ${g.conColor}`);
    comprobar('elegir un color lo pone en el circulo',
      g.trasColor.some((c) => /background/.test(c.foto)), JSON.stringify(g.trasColor.map((c) => c.foto)));

    comprobar('la rejilla de avatares se abre al pedirla', g.abierto === true);
    comprobar('y trae la lista de Pokemon mas la opcion de ninguno', g.celdas >= 30, `celdas: ${g.celdas}`);
    comprobar('al reabrir el gestor no se queda ningun perfil editado',
      g.editorTrasReabrir === false);
    ventanaGestor.destroy();

    console.log('\n0.36.0 — farmeo en modo pestañas (trasplantado, no es de perfiles):\n');

    comprobar('la decision se toma una vez por pasada',
      /const leerTodas = farmeoEstaEnUso\(\);/.test(renderer));
    comprobar('la guarda usa esa decision', /!leerTodas && !panelEstaEnPantalla\(panel\)/.test(renderer));
    comprobar('se lee todo si el selector esta abierto', /if \(!farmPickerLayer\.hidden\) return true;/.test(renderer));
    comprobar('o si alguna cuenta esta farmeando',
      /panel\.farmRunState === 'ok' \|\| panel\.farmRunState === 'busy'/.test(renderer));
    comprobar('y sigue habiendo un camino barato cuando no se farmea',
      /if \(accountIndex === null && !leerTodas && !panelEstaEnPantalla/.test(renderer));

    console.log('\n0.36.0 — los botones van agrupados a la derecha (trasplantado):\n');

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
