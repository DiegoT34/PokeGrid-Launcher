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
  const panelesAntesDeCancelar = { total: paneles().length, nombres: nombresDePanel() };
  const pulsadoB = await pulsarEliminar(0);
  const cancelando = {
    pulsado: pulsadoB,
    etiquetasAntes: etiquetasAntesDeCancelar,
    etiquetasDespues: etiquetas(),
    filas: filas().length,
    aviso: avisos.at(-1) || '',
    paneles: { total: paneles().length, nombres: nombresDePanel() },
    panelesAntes: panelesAntesDeCancelar
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
  await abrir();
  const rellenada = rellenar(1, 'username', 'usuario2');
  const panelesAntesDeIncompleta = { total: paneles().length, nombres: nombresDePanel() };
  const filaIncompleta = {
    rellenada,
    filas: filas().length,
    mensaje: await enviar(),
    panelesAntes: panelesAntesDeIncompleta,
    paneles: { total: paneles().length, nombres: nombresDePanel() }
  };

  return { problemas, etiquetasIniciales, panelesIniciales, aceptando, cancelando, ultimaFila, minimo, listaVacia, filaIncompleta, avisos };
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
    const { aceptando, cancelando, ultimaFila, minimo, listaVacia, filaIncompleta } = state;

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
      minimo: minimo.pulsado, rellenada: filaIncompleta.rellenada
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

    // 5. Cancelar no borra nada: es lo que le da dientes al aviso.
    if (cancelando.filas !== 2 || cancelando.etiquetasDespues.join(',') !== cancelando.etiquetasAntes.join(',')) {
      throw new Error(`Cancelar el aviso borró la cuenta: ${JSON.stringify(cancelando)}`);
    }
    if (!cancelando.aviso || !cancelando.aviso.includes('SHOCKOR') || !cancelando.aviso.includes('SHOCKVINY')) {
      throw new Error(`El aviso de cancelación no dice a quién pasaría el historial: ${JSON.stringify(cancelando.aviso)}`);
    }
    if (cancelando.paneles.total !== cancelando.panelesAntes.total) {
      throw new Error(`Cancelar el aviso cambió los paneles: ${JSON.stringify(cancelando)}`);
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

    // 8. Una fila con usuario y sin contraseña tampoco se guarda.
    if (!/1 fila está a medio rellenar/.test(filaIncompleta.mensaje)) {
      throw new Error(`El mensaje de fila incompleta no explica el problema: ${JSON.stringify(filaIncompleta.mensaje)}`);
    }
    if (filaIncompleta.paneles.total !== filaIncompleta.panelesAntes.total) {
      throw new Error(`Una fila a medio rellenar llegó a guardarse: ${JSON.stringify(filaIncompleta)}`);
    }

    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});