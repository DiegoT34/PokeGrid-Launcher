const { app, BrowserWindow } = require('electron');
const path = require('node:path');

// Perfil aislado: la prueba abre el launcher en modo previsualización y no debe
// tocar los datos reales de quien la ejecuta.
app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-history-guard-${process.pid}`));

async function waitFor(window, expression, timeout = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Se agotó el tiempo esperando: ${expression}`);
}

// Todo el recorrido ocurre en un único executeJavaScript porque los ayudantes se
// declaran con const: al partirlo en varias llamadas cada una tendría su propio
// ámbito y los avisos se perderían entre ellas.
//
// window.confirm es un diálogo nativo bloqueante: sin stub la prueba colgaría
// esperando a un botón que nadie va a pulsar. El stub registra el texto y obedece
// a la bandera `aceptar`, para recorrer tanto "acepto" como "cancelo".
//
// Lo que se envía a saveAccounts no se puede espiar: window.pokeGrid viene de
// contextBridge y sus propiedades no admiten asignación desde el mundo principal,
// así que ni sustituir el preload ni parchearlo serviría. Lo que se guarda se
// comprueba por lo que se ve: los paneles de la rejilla, que se reconstruyen con
// el número de cuentas que se han guardado.
const RECORRIDO = `(async () => {
  const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const problemas = [];
  window.addEventListener('error', (event) => problemas.push(String(event.message || event.reason)));
  window.addEventListener('unhandledrejection', (event) => problemas.push(String(event.reason?.message || event.reason)));

  const avisos = [];
  let aceptar = true;
  window.confirm = (message) => { avisos.push(String(message)); return aceptar; };

  const filas = () => [...document.querySelectorAll('.account-row')];
  const etiquetas = () => filas().map((row) => row.querySelector('[data-field="label"]').value);
  const botonesEliminar = () => [...document.querySelectorAll('.account-row-remove')];
  const mensaje = () => document.querySelector('#modalMessage').textContent;
  const paneles = () => [...document.querySelectorAll('#grid .panel')];
  const nombresDePanel = () => paneles().map((panel) => panel.querySelector('.panel-name')?.textContent || '');
  // Estado visible de cada panel: el texto de la barra, la marca de recarga por proxy y
  // la etiqueta de VPN. Las fases de proxy comparan esto entero, carácter a carácter,
  // contra la instantánea previa. No se mira "si ha cambiado" porque una recarga
  // escribe siempre el mismo texto: lo único que separa "ha recargado" de "no ha
  // recargado" es el texto exacto que había antes.
  const estadosDePanel = () => paneles().map((panel) => {
    const chip = panel.querySelector('.panel-vpn-chip');
    return {
      estado: panel.querySelector('.panel-status')?.textContent || '',
      recargando: panel.classList.contains('is-proxy-reloading'),
      vpn: chip ? !chip.hidden : null,
      vpnTitulo: chip?.title || ''
    };
  });
  const abrir = async () => { document.querySelector('#accountsButton').click(); await esperar(160); };
  const enviar = async () => {
    document.querySelector('#accountsForm').requestSubmit();
    await esperar(500);
    return mensaje();
  };
  // Los pulsos son defensivos a propósito: sin el aviso, borrar no necesita
  // confirmación y la lista se acorta antes de tiempo, así que un recorrido que
  // asumiera que siempre queda una fila reventaría al pulsar un botón inexistente
  // y el fallo se atribuiría al arnés en vez de al comportamiento.
  const pulsarEliminar = async (indice) => {
    const boton = botonesEliminar()[indice];
    if (!boton) return false;
    boton.click();
    await esperar(160);
    return true;
  };
  const rellenar = (indice, campo, valor) => {
    const control = filas()[indice]?.querySelector('[data-field="' + campo + '"]');
    if (!control) return false;
    control.value = valor;
    return true;
  };

  // --- El modal arranca con las cuatro cuentas de la previsualización ---
  await abrir();
  const etiquetasIniciales = etiquetas();
  const panelesIniciales = { total: paneles().length, nombres: nombresDePanel() };

  // --- A: se pide aviso y, al aceptarlo, el borrado ocurre y se guarda ---
  // Se borran filas del principio, que son las que tienen a otra cuenta detrás:
  // ahí es donde se ve a quién se le pasa el historial.
  const pulsadoA1 = await pulsarEliminar(0);   // SHOCKVOR, y SHOCKOR sube a su posición
  const etiquetasTrasPrimera = etiquetas();
  const pulsadoA2 = await pulsarEliminar(1);   // DIEGO20, y SHOCKVINY sube a su posición
  const aceptando = {
    pulsados: [pulsadoA1, pulsadoA2],
    avisos: avisos.slice(),
    etiquetasTrasPrimera,
    etiquetasDespues: etiquetas(),
    filas: filas().length,
    mensaje: await enviar(),
    paneles: { total: paneles().length, nombres: nombresDePanel() }
  };

  // --- B: cancelar no borra ---
  aceptar = false;
  await abrir();
  const etiquetasAntesDeCancelar = etiquetas();
  const pulsadoB = await pulsarEliminar(0);
  const cancelando = {
    pulsado: pulsadoB,
    etiquetasAntes: etiquetasAntesDeCancelar,
    etiquetasDespues: etiquetas(),
    filas: filas().length,
    aviso: avisos.at(-1) || ''
  };

  // --- C: la última de la lista se avisa como tal y la única no se puede borrar ---
  aceptar = true;
  const avisosAntesDeLaUltima = avisos.length;
  const pulsadoC1 = await pulsarEliminar(1);
  const ultimaFila = {
    pulsado: pulsadoC1,
    filas: filas().length,
    aviso: avisos.at(-1) || '',
    avisosAntes: avisosAntesDeLaUltima,
    avisosDespues: avisos.length
  };
  const avisosAntesDelMinimo = avisos.length;
  const pulsadoC2 = await pulsarEliminar(0);
  const minimo = {
    pulsado: pulsadoC2,
    filas: filas().length,
    mensaje: mensaje(),
    avisosAntes: avisosAntesDelMinimo,
    avisosDespues: avisos.length
  };

  // --- D: una lista vacía nunca llega a guardarse. El nodo se quita a mano
  // porque la interfaz no debe poder llegar a ese estado: el bloqueo real es que
  // nunca haya menos de una fila. ---
  rellenar(0, 'label', '');
  rellenar(0, 'username', '');
  rellenar(0, 'password', '');
  filas()[0]?.remove();
  const panelesAntesDeVacia = { total: paneles().length, nombres: nombresDePanel() };
  const listaVacia = { mensaje: await enviar(), panelesAntes: panelesAntesDeVacia, paneles: { total: paneles().length, nombres: nombresDePanel() } };

  // --- E: una fila a medio rellenar tampoco se guarda ---
  // La fila se renombra además de rellenarse a medias, y el aserto mira el nombre
  // del panel: si el guard fallara, la cuenta se guardaría, structureChanged sería
  // false (mismas filas, mismos accountId) y refreshPanelNames escribiría el nombre
  // nuevo en el panel. Contar paneles NO serviría, porque no cambiarían; el nombre sí.
  await abrir();
  const renombrada = rellenar(1, 'label', 'SHOCKOR-RENOMBRADA');
  const rellenada = rellenar(1, 'username', 'usuario2');
  const panelesAntesDeIncompleta = { total: paneles().length, nombres: nombresDePanel() };
  const filaIncompleta = {
    renombrada,
    rellenada,
    filas: filas().length,
    mensaje: await enviar(),
    panelesAntes: panelesAntesDeIncompleta,
    paneles: { total: paneles().length, nombres: nombresDePanel() }
  };

  // --- F: el plural del recuento. Con dos filas a medias tiene que decir
  // "2 filas están", no "1 filas están": es el mensaje que el usuario lee cuando ha
  // metido la pata, y si se contradice parece que el launcher está roto.
  // Las dos filas son las que quedan tras la fase A, que sí llegó a guardar.
  //
  // Una de las dos se renombra, por el mismo motivo que en la fase E: el aserto va
  // sobre el NOMBRE del panel. Contar paneles no serviría de nada — con el guard
  // roto el guardado conserva las filas y sus accountId, así que structureChanged
  // es false, el número no se mueve y la comprobación pasaría con el bug presente.
  await abrir();
  const renombradaEnPlural = rellenar(0, 'label', 'PLURAL-RENOMBRADA');
  const rellenadas = [rellenar(0, 'username', 'usuario2'), rellenar(1, 'password', 'clave2')];
  const panelesAntesDelPlural = { total: paneles().length, nombres: nombresDePanel() };
  const plural = {
    renombrada: renombradaEnPlural,
    rellenadas,
    filas: filas().length,
    mensaje: await enviar(),
    panelesAntes: panelesAntesDelPlural,
    paneles: { total: paneles().length, nombres: nombresDePanel() }
  };

  // Un webview recién creado dispara sus propios eventos y la barra pasa sola por
  // "Cargando…" antes de settlear en "Sesión disponible". Se espera a que ningún panel
  // esté en ese transitorio: si no, la instantánea fotografía un estado que el launcher
  // va a cambiar por su cuenta y la comparación daría falsos negativos.
  const asentar = async () => {
    for (let intento = 0; intento < 40; intento += 1) {
      if (!estadosDePanel().some((estado) => estado.estado === 'Cargando…')) return;
      await esperar(100);
    }
  };
  // Guardar y dejar que los estados se asienten antes de fotografiarlos.
  const enviarAsentado = async () => {
    const texto = await enviar();
    await asentar();
    return texto;
  };

  // --- G: guardar sin tocar ningún proxy no puede mover ninguna sesión ---
  await abrir();
  await asentar();
  const estadosG = { antes: estadosDePanel(), despues: null, mensaje: '' };
  estadosG.mensaje = await enviarAsentado();
  estadosG.despues = estadosDePanel();

  // --- H: activar el proxy de la fila 0 recarga ese panel y solo ese ---
  await abrir();
  const proxyMontado = [
    rellenar(0, 'proxy.protocol', 'http'),
    rellenar(0, 'proxy.host', '127.0.0.1'),
    rellenar(0, 'proxy.port', '1080')
  ];
  await asentar();
  const estadosH = { proxyMontado, antes: estadosDePanel(), despues: null, mensaje: '' };
  estadosH.mensaje = await enviarAsentado();
  estadosH.despues = estadosDePanel();

  // --- I: una fila nueva reconstruye la rejilla y deja los paneles limpios ---
  // Hace falta un panel sin recargar para la fase J: en previsualización ninguna
  // sesión termina de cargar, así que el texto de la fase H se quedaría puesto y en
  // la J no se podría distinguir "ha recargado por la clave" de "sigue recargando de
  // antes". La reconstrucción también deja escrito que el estado de recarga pertenece
  // al panel y no sobrevive a su sustitución.
  await abrir();
  const botonAnadir = document.querySelector('#accountRowActions button');
  const filasAntesDeAnadir = filas().length;
  if (botonAnadir) botonAnadir.click();
  const estadosI = { anadida: false, antes: estadosDePanel(), despues: null, mensaje: '' };
  estadosI.anadida = filas().length === filasAntesDeAnadir + 1;
  estadosI.mensaje = await enviarAsentado();
  estadosI.despues = estadosDePanel();

  // --- J: cambiar SOLO la clave del proxy también recarga ---
  // El destino no se mueve: mismo protocolo, mismo host, mismo puerto. Una firma que
  // ignorase la clave daría las dos sesiones por iguales y dejaría al usuario con la
  // IP anterior creyendo que la tiene nueva, que es justo el fallo que se corrige.
  await abrir();
  const clavePuesta = rellenar(0, 'proxy.password', 'clave-del-proxy');
  await asentar();
  const estadosJ = { clavePuesta, antes: estadosDePanel(), despues: null, mensaje: '' };
  estadosJ.mensaje = await enviarAsentado();
  estadosJ.despues = estadosDePanel();

  // --- K: un guardado que no cambia nada del proxy no recarga a nadie ---
  await abrir();
  await asentar();
  const estadosK = { antes: estadosDePanel(), despues: null, mensaje: '' };
  estadosK.mensaje = await enviarAsentado();
  estadosK.despues = estadosDePanel();

  // --- L: una importación sin proxy retira la etiqueta de VPN del panel ---
  // La importación cambia las cuentas por su cuenta y pasa por refreshPanelNames, no
  // por el formulario. Si esa función no repintase la etiqueta, el panel seguiría
  // anunciando un proxy que la cuenta ya no tiene. El número de cuentas de la
  // plantilla se baja a 3 para que no cambie y la ruta sea la de refresco y no la de
  // reconstrucción: con reconstrucción el nodo se crearía limpio y la fase no probaría
  // nada de refreshPanelNames.
  await window.pokeGrid.setPreviewAccountCount(3);
  await abrir();
  // Botón de desvincular: antes de importar no hay archivo vinculado, así que no
  // puede verse. Importarlo lo pone. Es el estado que el usuario ve, no una
  // aserción sobre que el nodo exista.
  const botonDesvincular = () => document.querySelector('#unlinkAccountsButton');
  const desvinculo = { antes: botonDesvincular()?.hidden !== false, ruta: document.querySelector('#accountsSourcePath')?.textContent || '' };
  document.querySelector('#importAccountsButton').click();
  await esperar(400);
  desvinculo.despues = botonDesvincular()?.hidden !== false;
  desvinculo.rutaDespues = document.querySelector('#accountsSourcePath')?.textContent || '';
  const estadosL = { nombres: nombresDePanel(), despues: estadosDePanel(), mensaje: mensaje() };

  return {
    problemas, etiquetasIniciales, panelesIniciales, aceptando, cancelando, ultimaFila, minimo,
    listaVacia, filaIncompleta, plural, avisos, desvinculo,
    proxy: { estadosG, estadosH, estadosI, estadosJ, estadosK, estadosL }
  };
})()`;

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGrid && document.querySelectorAll("#grid .panel").length === 4');

    const state = await window.webContents.executeJavaScript(RECORRIDO);
    // El estado se imprime antes de comprobar nada: si algo falla, el recorrido
    // entero queda en la salida en vez de solo la comprobación que saltó.
    console.log(JSON.stringify(state));
    const { aceptando, cancelando, ultimaFila, minimo, listaVacia, filaIncompleta, plural, desvinculo } = state;

    if (state.problemas.length) {
      throw new Error(`La página lanzó errores durante el recorrido: ${JSON.stringify(state.problemas)}`);
    }

    // 0. Arnés de pruebas, no producto: que el preload siga sirviendo estas cuatro
    // etiquetas es una precondición de todo lo que viene después, porque los avisos
    // se comprueban nombrando cuentas concretas. Sin esta comprobación, un cambio en
    // launcher-preview-preload.js haría fallar esta prueba con un mensaje que habla
    // de borrado y de historial, y el fallo parecería del launcher. Es el mismo
    // patrón que ya se aplica en userscripts-opt-out-smoke.js.
    const ETIQUETAS_ESPERADAS = 'SHOCKVOR,SHOCKOR,DIEGO20,SHOCKVINY';
    if (state.etiquetasIniciales.join(',') !== ETIQUETAS_ESPERADAS) {
      throw new Error(
        `ARNÉS: el preload no sirvió las etiquetas ${ETIQUETAS_ESPERADAS}, sirvió ${JSON.stringify(state.etiquetasIniciales)}. ` +
        'Arregla el arnés antes de leer los resultados de abajo.'
      );
    }

    // 1. Lo primero que se comprueba es que el aviso existe. Si esto falla, el
    // borrado sigue ocurriendo en silencio y el historial de las posiciones
    // siguientes cambia de dueño sin que nadie se entere.
    if (aceptando.avisos.length !== 2) {
      throw new Error(`Borrar una cuenta no pidió confirmación. Avisos: ${JSON.stringify(aceptando.avisos)}`);
    }

    // 2. Y solo después, que el recorrido de verdad pudo pulsar lo que necesitaba:
    // si faltara un botón, el fallo sería del arnés y no del launcher.
    const pulsados = {
      phaseA: aceptando.pulsados, cancelando: cancelando.pulsado, ultimaFila: ultimaFila.pulsado,
      minimo: minimo.pulsado, rellenada: filaIncompleta.rellenada, renombrada: filaIncompleta.renombrada
    };
    if (Object.values(pulsados).some((value) => Array.isArray(value) ? value.includes(false) : !value)) {
      throw new Error(`El recorrido no encontró los controles que necesitaba: ${JSON.stringify(pulsados)}`);
    }

    // 3. El aviso tiene que ser útil: decir que el borrado es al guardar, nombrar
    // a la cuenta que se elimina y a la que hereda su historial.
    const [avisoPrimero, avisoSegundo] = aceptando.avisos;
    if (!/al guardar/i.test(avisoPrimero) || !avisoPrimero.includes('SHOCKVOR')) {
      throw new Error(`El aviso no explica que se borra al guardar ni nombra la cuenta eliminada: ${JSON.stringify(avisoPrimero)}`);
    }
    if (!avisoPrimero.includes('SHOCKOR')) {
      throw new Error(`El aviso no dice que SHOCKOR hereda el historial de SHOCKVOR: ${JSON.stringify(avisoPrimero)}`);
    }
    if (!avisoSegundo.includes('DIEGO20') || !avisoSegundo.includes('SHOCKVINY')) {
      throw new Error(`El aviso no dice que SHOCKVINY hereda el historial de DIEGO20: ${JSON.stringify(avisoSegundo)}`);
    }

    // 4. Aceptar el aviso borra de verdad y el estado final es el correcto.
    if (aceptando.etiquetasTrasPrimera.join(',') !== 'SHOCKOR,DIEGO20,SHOCKVINY') {
      throw new Error(`Tras borrar SHOCKVOR quedaban ${JSON.stringify(aceptando.etiquetasTrasPrimera)}.`);
    }
    if (aceptando.filas !== 2 || aceptando.etiquetasDespues.join(',') !== 'SHOCKOR,SHOCKVINY') {
      throw new Error(`Se esperaban 2 filas (SHOCKOR, SHOCKVINY) tras borrar 2: ${JSON.stringify(aceptando.etiquetasDespues)}`);
    }
    if (!/Cuentas guardadas/.test(aceptando.mensaje)) {
      throw new Error(`Aceptar el aviso debe dejar guardar: ${JSON.stringify(aceptando.mensaje)}`);
    }
    if (aceptando.paneles.total !== 2 || aceptando.paneles.nombres.join(',') !== 'SHOCKOR,SHOCKVINY') {
      throw new Error(`Las cuentas borradas no se guardaron: ${JSON.stringify(aceptando.paneles)}`);
    }

    // 5. Cancelar no borra nada: es lo que le da dientes al aviso. Se comprueba el
    // DOM, no los paneles: esta fase no envía el formulario, así que nada podría
    // cambiar la rejilla y una aserción sobre paneles aquí no podría fallar nunca.
    // Lo que de verdad se verifica es que la fila sigue puesta tras cancelar.
    if (cancelando.filas !== 2 || cancelando.etiquetasDespues.join(',') !== cancelando.etiquetasAntes.join(',')) {
      throw new Error(`Cancelar el aviso borró la cuenta: ${JSON.stringify(cancelando)}`);
    }
    if (!cancelando.aviso || !cancelando.aviso.includes('SHOCKOR') || !cancelando.aviso.includes('SHOCKVINY')) {
      throw new Error(`El aviso de cancelación no dice a quién pasaría el historial: ${JSON.stringify(cancelando.aviso)}`);
    }

    // 6. La última de la lista se avisa como tal, y la única no se puede borrar:
    // su motivo va en el modal, porque ya no queda a quién preguntarle.
    if (ultimaFila.avisosDespues !== ultimaFila.avisosAntes + 1 || !/última cuenta/i.test(ultimaFila.aviso || '')) {
      throw new Error(`Borrar la última de la lista debe avisar de que no hereda nadie: ${JSON.stringify(ultimaFila)}`);
    }
    if (ultimaFila.filas !== 1) {
      throw new Error(`Borrar la última de la lista debe dejar 1 fila: quedan ${ultimaFila.filas}.`);
    }
    if (minimo.avisosDespues !== minimo.avisosAntes) {
      throw new Error(`Intentar borrar la única cuenta no debe abrir un aviso: ${JSON.stringify(minimo)}`);
    }
    if (minimo.filas !== 1) {
      throw new Error(`La única cuenta se pudo borrar: quedan ${minimo.filas}.`);
    }
    if (!/al menos una cuenta/i.test(minimo.mensaje)) {
      throw new Error(`El motivo de no poder borrar la única cuenta no se muestra: ${JSON.stringify(minimo.mensaje)}`);
    }

    // 7. Una lista vacía no llega nunca a guardarse.
    if (listaVacia.mensaje !== 'Añade al menos una cuenta.') {
      throw new Error(`Mensaje inesperado para la lista vacía: ${JSON.stringify(listaVacia.mensaje)}`);
    }
    if (listaVacia.paneles.total !== listaVacia.panelesAntes.total) {
      throw new Error(`Una lista vacía llegó a guardarse: ${JSON.stringify(listaVacia)}`);
    }

    // 8. Una fila con usuario y sin contraseña tampoco se guarda. El aserto mira el
    // NOMBRE del panel, no su número: si el guard se rompiera, la cuenta se guardaría
    // con los mismos id y accountId, así que structureChanged sería false y el número
    // de paneles no cambiaría (por eso se quitó el aserto por cantidad, que habría
    // pasado con el bug presente). refreshPanelNames sí escribiría el nombre nuevo, y
    // eso ya no puede pasar: el guard corta antes de llegar a guardar.
    if (!/1 fila está a medio rellenar/.test(filaIncompleta.mensaje)) {
      throw new Error(`El mensaje de fila incompleta no explica el problema: ${JSON.stringify(filaIncompleta.mensaje)}`);
    }
    if (filaIncompleta.paneles.nombres.join(',') !== filaIncompleta.panelesAntes.nombres.join(',')) {
      throw new Error(`Una fila a medio rellenar llegó a guardarse: ${JSON.stringify(filaIncompleta)}`);
    }

    // 9. El plural del recuento se ejercita con dos filas a medias. El aserto de
    // guardado va sobre el nombre del panel, no sobre su número: con el guard roto
    // las filas y sus accountId no cambian, así que el número de paneles tampoco y
    // una comparación por cantidad pasaría con el bug presente. El nombre sí cambia:
    // la fila se renombra a propósito, y refreshPanelNames lo escribiría en el panel
    // si el guardado llegara a pasar.
    if (!plural.renombrada || !plural.rellenadas.every(Boolean)) {
      throw new Error(`No se pudo montar el caso de plural: ${JSON.stringify(plural)}`);
    }
    if (!/2 filas están a medio rellenar/.test(plural.mensaje)) {
      throw new Error(`Con dos filas incompletas el mensaje no concuerda: ${JSON.stringify(plural.mensaje)}`);
    }
    if (plural.paneles.nombres.join(',') !== plural.panelesAntes.nombres.join(',')) {
      throw new Error(`Con dos filas incompletas se guardó algo: ${JSON.stringify(plural)}`);
    }

    // ---------------------------------------------------------------------------------
    // Proxy: session.setProxy ya se llamaba, pero solo afecta a las conexiones nuevas.
    // Una cuenta que ya estaba cargada conservaba los sockets de Chromium y seguía
    // saliendo por la IP anterior, así que el launcher tenía que recargar ese webview.
    //
    // Estas fases comprueban el EFECTO y no el texto del modal. Una implementación que
    // no recargara pondría el mismo texto de éxito y la prueba seguiría verde; una que
    // recargara siempre dejaría el mismo "recargando…" en todas y también. Lo que las
    // separa es el estado de cada panel: la marca de recarga y el texto de su barra.
    //
    // Las comparaciones de "nada se movió" van sobre la marca y sobre el patrón del
    // texto, no sobre el texto entero. En previsualización los webviews de about:blank
    // disparan sus propios eventos y la barra pasa sola por "Cargando…" hasta
    // "Sesión disponible", así que comparar el texto entero daría falsos negativos
    // según el momento en que se fotografiara.
    // ---------------------------------------------------------------------------------
    const { estadosG, estadosH, estadosI, estadosJ, estadosK, estadosL } = state.proxy;
    const RECARGANDO = /Recargando con la nueva conexión/;
    const marcas = (estados) => estados.map((estado) => estado.recargando);
    const textoDeRecarga = (estados) => estados.filter((estado) => RECARGANDO.test(estado.estado)).length;
    const sinLaFila = (estados, indice) => estados.filter((_estado, position) => position !== indice);
    const arrancoConRecarga = (estados) => estados.filter((estado) => estado.recargando).length;

    if (estadosG.despues.length !== estadosG.antes.length) {
      throw new Error(`G: el número de paneles se movió sin cambiar cuentas: ${JSON.stringify(estadosG)}`);
    }
    if (JSON.stringify(marcas(estadosG.despues)) !== JSON.stringify(marcas(estadosG.antes)) || textoDeRecarga(estadosG.despues)) {
      throw new Error(`G: guardar sin tocar ningún proxy no puede tocar ninguna sesión: ${JSON.stringify(estadosG)}`);
    }
    if (estadosG.mensaje !== 'Cuentas guardadas de forma segura.') {
      throw new Error(`G: un guardado sin cambios de proxy no debe anunciar recargas: ${JSON.stringify(estadosG.mensaje)}`);
    }

    if (!estadosH.proxyMontado.every(Boolean)) {
      throw new Error(`H: no se pudo montar el caso del proxy: ${JSON.stringify(estadosH)}`);
    }
    if (!estadosH.despues[0]?.recargando || !RECARGANDO.test(estadosH.despues[0]?.estado || '')) {
      throw new Error(`H: cambiar el proxy de la fila 0 no recargó su panel: ${JSON.stringify(estadosH)}`);
    }
    if (JSON.stringify(sinLaFila(marcas(estadosH.despues), 0)) !== JSON.stringify(sinLaFila(marcas(estadosH.antes), 0))
      || textoDeRecarga(sinLaFila(estadosH.despues, 0)) !== textoDeRecarga(sinLaFila(estadosH.antes, 0))) {
      throw new Error(`H: cambiar el proxy de la fila 0 recargó cuentas que no lo cambiaron: ${JSON.stringify(estadosH)}`);
    }
    if (!/Recargando 1 sesión/.test(estadosH.mensaje)) {
      throw new Error(`H: el modal no dice cuántas sesiones se recargan: ${JSON.stringify(estadosH.mensaje)}`);
    }
    if (estadosH.despues[0].vpn !== true || !/127\.0\.0\.1:1080/.test(estadosH.despues[0].vpnTitulo)) {
      throw new Error(`H: el panel de la cuenta con proxy no muestra su destino: ${JSON.stringify(estadosH.despues[0])}`);
    }
    if (estadosH.despues[1].vpn !== false) {
      throw new Error(`H: el panel de la cuenta sin proxy no puede llevar la etiqueta: ${JSON.stringify(estadosH.despues[1])}`);
    }

    if (!estadosI.anadida) {
      throw new Error(`I: no se pudo añadir la fila que deja los paneles limpios: ${JSON.stringify(estadosI)}`);
    }
    if (estadosI.despues.length !== estadosI.antes.length + 1) {
      throw new Error(`I: añadir una cuenta debe reconstruir la rejilla: ${JSON.stringify(estadosI)}`);
    }
    if (arrancoConRecarga(estadosI.despues)) {
      throw new Error(`I: un panel nuevo no puede heredar el estado de recarga del que sustituye: ${JSON.stringify(estadosI.despues)}`);
    }

    if (!estadosJ.clavePuesta) {
      throw new Error(`J: no se pudo cambiar solo la clave del proxy: ${JSON.stringify(estadosJ)}`);
    }
    // Arnés: si el panel de la fila 0 ya estuviera recargando, la comparación de la fase
    // J no probaría nada, porque su estado antes y después sería el mismo.
    if (estadosJ.antes[0]?.recargando || RECARGANDO.test(estadosJ.antes[0]?.estado || '')) {
      throw new Error(`ARNÉS: el panel de la fase J ya estaba recargando, así que la fase no prueba nada: ${JSON.stringify(estadosJ.antes)}`);
    }
    if (!estadosJ.despues[0]?.recargando || !RECARGANDO.test(estadosJ.despues[0]?.estado || '')) {
      throw new Error(
        'J: cambiar solo la clave del proxy debe recargar la sesión: es lo único que Chromium rehace ' +
        `aunque el destino sea el mismo. ${JSON.stringify(estadosJ)}`
      );
    }
    if (JSON.stringify(sinLaFila(marcas(estadosJ.despues), 0)) !== JSON.stringify(sinLaFila(marcas(estadosJ.antes), 0))
      || textoDeRecarga(sinLaFila(estadosJ.despues, 0)) !== textoDeRecarga(sinLaFila(estadosJ.antes, 0))) {
      throw new Error(`J: cambiar la clave del proxy de la fila 0 recargó a las demás: ${JSON.stringify(estadosJ)}`);
    }

    // K no puede exigir cero paneles recargando: el de la fase J lo sigue estando,
    // porque en previsualización ninguna sesión termina de cargar y nadie cierra el
    // estado. Lo que sí tiene que valer es que el conjunto no CREZCA y que el modal no
    // anuncie recargas: una implementación que recargara siempre añadiría los otros dos.
    if (JSON.stringify(marcas(estadosK.despues)) !== JSON.stringify(marcas(estadosK.antes))
      || textoDeRecarga(estadosK.despues) !== textoDeRecarga(estadosK.antes)) {
      throw new Error(`K: un guardado que no cambia el proxy recargó alguna sesión: ${JSON.stringify(estadosK)}`);
    }
    if (arrancoConRecarga(estadosK.despues) > arrancoConRecarga(estadosK.antes)) {
      throw new Error(`K: un guardado que no cambia el proxy recargó alguna sesión: ${JSON.stringify(estadosK)}`);
    }
    if (estadosK.mensaje !== 'Cuentas guardadas de forma segura.') {
      throw new Error(`K: un guardado que no cambia el proxy no debe anunciar recargas: ${JSON.stringify(estadosK.mensaje)}`);
    }

    if (estadosL.nombres.join(',') !== 'IMPORTADA 1,IMPORTADA 2,IMPORTADA 3') {
      throw new Error(`L: la importación no llegó a renombrar los paneles, así que la fase no prueba nada: ${JSON.stringify(estadosL.nombres)}`);
    }
    if (estadosL.despues.length !== 3) {
      throw new Error(`L: importar 3 cuentas sobre 3 debe refrescar, no reconstruir: ${JSON.stringify(estadosL.despues)}`);
    }
    if (estadosL.despues.some((estado) => estado.vpn !== false)) {
      throw new Error(`L: una importación sin proxy dejó la etiqueta de VPN puesta: ${JSON.stringify(estadosL.despues)}`);
    }

    // 10. El botón de desvincular solo aparece con archivo vinculado. El estado se
    // mide antes y después de la importación de la fase L, que es lo que dispara el
    // "Archivo vinculado: …" sin pasar por el formulario.
    //
    // Esto no puede probar el resto del desvinculado —el aviso, el cancelar y el
    // borrado de accounts-source.json necesitan el proceso principal—, así que eso
    // lo hace accounts-source-unlink-smoke.js contra el launcher real. Aquí solo se
    // vigila que el botón no aparezca ofreciendo algo que no existe.
    if (!desvinculo.antes || desvinculo.despues !== false) {
      throw new Error(`El botón de desvincular no acompaña al archivo vinculado: ${JSON.stringify(desvinculo)}`);
    }
    if (!/Ningún archivo vinculado/.test(desvinculo.ruta) || !/cuentas-prueba\.txt/.test(desvinculo.rutaDespues)) {
      throw new Error(`La ruta del archivo vinculado no cambió al importar: ${JSON.stringify(desvinculo)}`);
    }

    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
