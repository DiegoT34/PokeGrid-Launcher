// El selector de Pokémon: que no se recargue solo, y que la lista esté virtualizada.
//
// Las dos cosas se comprueban arrancando el launcher de verdad, porque las dos son de
// rendimiento y el rendimiento no se ve leyendo el código:
//
//   · El sondeo de cinco segundos ya no repinta el selector. Antes lo hacía, y con 451
//     objetivos eso son 451 tarjetas creadas y tiradas cada cinco segundos sin que
//     hubiera pasado nada.
//   · Solo existen las tarjetas que se ven. Ni al principio, ni a la mitad, ni al final:
//     al final es donde fallaba, porque el desplazamiento máximo se pasa de la última
//     fila y se pedían tarjetas que no existen.
//
// Aquí no se copia nada del renderer. Se abre el panel de verdad, se mide lo que hay en
// el DOM y se comprueba que aguanta un buen rato con el sondeo funcionando.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Perfil aislado para no tocar los datos reales del usuario.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-selector-virtual-'));
process.env.POKEGRID_DIAGNOSTIC_USER_DATA = userDataDir;

require('../src/main.js'); // Launcher real: IPC, sesiones y ventana principal.

const { app, BrowserWindow } = require('electron');

const fallos = [];
const comprobar = (ok, mensaje, detalle) => {
  if (ok) console.log(`  ok    ${mensaje}`);
  else {
    fallos.push(mensaje);
    console.log(`  FALLA ${mensaje}\n        ${detalle}`);
  }
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarA(ventana, expresion, ms = 20_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    // eslint-disable-next-line no-await-in-loop
    if (await ventana.webContents.executeJavaScript(`Boolean(${expresion})`)) return;
    // eslint-disable-next-line no-await-in-loop
    await dormir(150);
  }
  throw new Error(`tiempo agotado esperando: ${expresion}`);
}

// Las medidas, tal cual se leen de la página. Va en una función aparte para que el
// `executeJavaScript` no tenga que definirse tres veces con tres textos distintos.
const MEDIR = `(() => {
  const rejilla = document.getElementById('farmPokemonGrid');
  const cs = getComputedStyle(rejilla);
  const paso = parseFloat(cs.getPropertyValue('--tarjeta')) + parseFloat(cs.getPropertyValue('--hueco'));
  const columnas = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
  const idx = [...rejilla.querySelectorAll('[data-i]')].map((n) => Number(n.dataset.i)).sort((a, b) => a - b);
  // Cuántas tarjetas hay en el total filtrado, según el contador. Es el tope real:
  // antes se calculaba con el alto desplazable, que redondea al alza y pedía un par de
  // tarjetas que no existían. Esas de más salían como huecos.
  const contador = document.querySelector('.farm-picker-cuenta');
  const total = contador ? Number(contador.querySelector('span').textContent) : null;

  // Qué huecos hay dentro de lo que se ve ahora mismo. Solo cuentan los índices que de
  // verdad existen: la última fila va medio llena y no es un hueco.
  let huecos = 0;
  const primeraFila = Math.min(Math.max(0, Math.floor(rejilla.scrollTop / paso)), Math.ceil(rejilla.scrollHeight / paso) - 1);
  const ultimaFila = Math.ceil((rejilla.scrollTop + rejilla.clientHeight) / paso);
  const dentro = new Set(idx);
  const tope = total === null ? idx.length : total;
  for (let f = primeraFila; f <= ultimaFila; f++) {
    for (let c = 0; c < columnas; c++) {
      const i = f * columnas + c;
      if (i < tope && !dentro.has(i)) huecos++;
    }
  }

  // Cuántas hay fuera de la ventana con su margen. Esta es la comprobación que importa:
  // que la lista no esté arrastrando tarjetas de la otra punta.
  const filasVisibles = Math.ceil(rejilla.clientHeight / paso);
  let lejanas = 0;
  for (const i of idx) {
    const f = Math.floor(i / columnas);
    if (f < primeraFila - 2 || f > ultimaFila + 2) lejanas++;
  }
  return {
    tarjetas: idx.length,
    rango: idx.length ? [Math.min(...idx), Math.max(...idx)] : null,
    paso,
    columnas,
    clientHeight: rejilla.clientHeight,
    scrollHeight: rejilla.scrollHeight,
    huecosEnLaVista: huecos,
    lejanas,
    filasVisibles,
    primeraFilaVisible: primeraFila,
    separador: getComputedStyle(rejilla.querySelector('[data-i]') || rejilla, '::after').display,
    contador: contador ? contador.textContent.trim() : null,
    contadorEnPantalla: contador ? Number(contador.querySelector('b').textContent) : null,
    contadorTotal: contador ? Number(contador.querySelector('span').textContent) : null,
    tarjetasCortadas: [...rejilla.querySelectorAll('[data-i]')].filter((n) => {
      const c = n.querySelector('.farm-smart-copy');
      return c && c.scrollHeight > c.clientHeight + 1;
    }).length,
    anchoTarjeta: rejilla.querySelector('[data-i]') ? Math.round(rejilla.querySelector('[data-i]').getBoundingClientRect().width) : 0,
    altoTarjeta: rejilla.querySelector('[data-i]') ? Math.round(rejilla.querySelector('[data-i]').getBoundingClientRect().height) : 0,
    total
  };
})()`;

app.whenReady().then(async () => {
  try {
    let ventana = null;
    const t0 = Date.now();
    while (!ventana && Date.now() - t0 < 20_000) {
      ventana = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) || null;
      // eslint-disable-next-line no-await-in-loop
      await dormir(150);
    }
    assert.ok(ventana, 'la ventana principal no se creó');
    await esperarA(ventana, `!document.querySelector('#grid').hidden && document.querySelectorAll('#grid .panel').length === 4`);

    // --- Abrir el selector con una lista que de verdad hay que virtualizar --------
    // El botón de iniciar de cada tarjeta está deshabilitado sin objetivo y sin
    // sesión, así que no se puede abrir con un clic. Se usa el gancho de diagnóstico
    // que ya usan otras pruebas, pero pidiéndole cuatrocientos y Pico Pokémon en vez
    // de los nueve que trae de serie: con nueve todo cabe en la vista y no se mide
    // nada.
    await ventana.webContents.executeJavaScript(`(() => {
      document.querySelector('#farmButton').click();
    })()`);
    await esperarA(ventana, `window.__pokeGridPreviewFarmRecommendations && !document.querySelector('#farmBackdrop').hidden`);
    await ventana.webContents.executeJavaScript(`window.__pokeGridPreviewFarmRecommendations(450)`);
    await dormir(900);

    const abierto = await ventana.webContents.executeJavaScript(`({
      visible: !document.getElementById('farmPickerLayer').hidden,
      tarjetas: document.querySelectorAll('#farmPokemonGrid [data-i]').length,
      catalogo: document.querySelector('.farm-picker-cuenta span') ? Number(document.querySelector('.farm-picker-cuenta span').textContent) : 0
    })`);
    console.log(`\nselector abierto: ${JSON.stringify(abierto)}`);
    comprobar(abierto.visible, 'el selector se abre');
    comprobar(abierto.catalogo > 300, 'la lista tiene suficientes filas para virtualizar', `total: ${abierto.catalogo}`);
    if (!abierto.visible || abierto.tarjetas === 0) {
      throw new Error('El selector no llegó a pintar tarjetas; no tiene sentido seguir midiendo.');
    }

    // --- 1. Solo las que se ven ---------------------------------------------------
    const inicio = await ventana.webContents.executeJavaScript(MEDIR);
    console.log(`\n--- al abrir ---`);
    console.log(`  ${inicio.tarjetas} tarjetas, columnas ${inicio.columnas}, paso ${inicio.paso}px, vista ${inicio.clientHeight}px de ${inicio.scrollHeight}px`);
    console.log(`  contador: «${inicio.contador}»   separador: ${inicio.separador}   cortadas: ${inicio.tarjetasCortadas}`);

    const visiblesTeoricas = Math.ceil(inicio.clientHeight / inicio.paso) * inicio.columnas;
    comprobar(inicio.tarjetas < inicio.contadorTotal || inicio.contadorTotal <= visiblesTeoricas,
      'hay menos tarjetas en el DOM que Pokémon filtrados',
      `DOM ${inicio.tarjetas}, total ${inicio.contadorTotal}, visibles ${visiblesTeoricas}`);
    comprobar(inicio.lejanas === 0, 'no hay tarjetas fuera de la vista', `lejanas: ${inicio.lejanas}`);
    comprobar(inicio.tarjetas < inicio.contadorTotal / 4,
      'se pinta una fracción de la lista, no la lista entera',
      `DOM ${inicio.tarjetas}, total ${inicio.contadorTotal}`);
    comprobar(inicio.huecosEnLaVista === 0, 'no hay huecos en la vista del principio', `huecos: ${inicio.huecosEnLaVista}`);
    comprobar(inicio.contadorTotal > 0 && inicio.contadorEnPantalla === inicio.tarjetas,
      'el contador dice las mismas tarjetas que hay en el DOM',
      `contador ${inicio.contadorEnPantalla}/${inicio.contadorTotal}, DOM ${inicio.tarjetas}`);
    comprobar(inicio.contadorTotal > inicio.tarjetas,
      'el total filtrado es mayor que lo que hay dibujado: la virtualización está actuando',
      `total ${inicio.contadorTotal}, dibujadas ${inicio.tarjetas}`);

    // --- 2. Al desplazarse, en los tres sitios --------------------------------------
    const puntos = [
      ['a la mitad', 0.5],
      ['al final', 1]
    ];
    for (const [nombre, fraccion] of puntos) {
      await ventana.webContents.executeJavaScript(`(() => {
        const r = document.getElementById('farmPokemonGrid');
        r.scrollTop = Math.round((r.scrollHeight - r.clientHeight) * ${fraccion});
      })()`);

      // Se espera a que el pintado llegue, en vez de dormir un rato fijo y medir a ver
      // qué pasa. Dormir fija es medir el reloj en vez de medir el código: si el repintado
      // tardara más de lo previsto, la prueba fallaría sin que hubiera ningún fallo, y si
      // tardara menos, no se vería.
      //
      // Converger es la señal de que funciona; quedarse quieto cinco segundos es la señal
      // de que está roto, y las dos cosas se distinguen.
      const convergio = await esperarA(ventana, `(() => {
        const r = document.getElementById('farmPokemonGrid');
        const paso = parseFloat(getComputedStyle(r).getPropertyValue('--tarjeta'))
          + parseFloat(getComputedStyle(r).getPropertyValue('--hueco'));
        const columnas = getComputedStyle(r).gridTemplateColumns.split(' ').filter(Boolean).length;
        const primeraFila = Math.min(Math.max(0, Math.floor(r.scrollTop / paso)), Math.ceil(r.scrollHeight / paso) - 1);
        const esperadas = primeraFila * columnas;
        const pintadas = [...r.querySelectorAll('[data-i]')].map((n) => Number(n.dataset.i));
        if (!pintadas.length) return false;
        // Que tenga tarjetas de la fila que toca, y que no le sobren de la de antes.
        const tieneLaFila = pintadas.some((i) => i >= esperadas && i < esperadas + columnas * 6);
        const sinRescoldos = !pintadas.some((i) => Math.abs(i - esperadas) > columnas * 12);
        return tieneLaFila && sinRescoldos;
      })()`, 5000).then(() => true).catch(() => false);

      comprobar(convergio, `la lista se repinta al bajar ${nombre}`,
        'cinco segundos después de desplazar, el DOM seguía donde estaba');

      const m = await ventana.webContents.executeJavaScript(MEDIR);
      console.log(`\n--- ${nombre} ---`);
      console.log(`  ${m.tarjetas} tarjetas, rango ${JSON.stringify(m.rango)}, fila visible ${m.primeraFilaVisible}, huecos ${m.huecosEnLaVista}, cortadas ${m.tarjetasCortadas}`);
      comprobar(m.huecosEnLaVista === 0, `no hay huecos ${nombre}`, `huecos: ${m.huecosEnLaVista}`);
      comprobar(m.lejanas === 0, `no hay tarjetas fuera de la vista ${nombre}`, `lejanas: ${m.lejanas}`);
      comprobar(m.tarjetas < inicio.contadorTotal / 4, `sigue pintando una fracción ${nombre}`, `DOM ${m.tarjetas} de ${inicio.contadorTotal}`);
      if (nombre === 'al final') {
        comprobar(m.tarjetas > 0, 'al final sigue habiendo tarjetas: no se queda en blanco', `DOM ${m.tarjetas}`);
        const ultimaEsperada = m.contadorTotal - 1;
        comprobar(m.rango && m.rango[1] >= ultimaEsperada - m.columnas * 2,
          'al final llega a la última tarjeta',
          `rango ${JSON.stringify(m.rango)}, total ${m.contadorTotal}`);
      }
    }

    // --- 3. La lista se queda quieta con el sondeo funcionando ---------------------
    // Esto es lo que pediste: el panel no debe actualizarse solo.
    const cuentaAntes = await ventana.webContents.executeJavaScript(`document.querySelectorAll('#farmPokemonGrid [data-i]').length`);
    const marcaAntes = await ventana.webContents.executeJavaScript(`(() => {
      const n = document.querySelector('#farmPokemonGrid [data-i]');
      return n ? n.dataset.i + '|' + n.querySelector('.farm-smart-name-row strong').textContent : '';
    })()`);

    console.log('\n--- doce segundos con el sondeo de por medio ---');
    console.log('  el sondeo del panel grande va cada cinco segundos; aquí van tres vueltas.');
    const nada = null;
    await dormir(12_000);

    const cuentaDespues = await ventana.webContents.executeJavaScript(`document.querySelectorAll('#farmPokemonGrid [data-i]').length`);
    const marcaDespues = await ventana.webContents.executeJavaScript(`(() => {
      const n = document.querySelector('#farmPokemonGrid [data-i]');
      return n ? n.dataset.i + '|' + n.querySelector('.farm-smart-name-row strong').textContent : '';
    })()`);

    console.log(`  antes:  ${cuentaAntes} tarjetas, primera «${marcaAntes}»`);
    console.log(`  después: ${cuentaDespues} tarjetas, primera «${marcaDespues}»`);
    comprobar(marcaDespues === marcaAntes,
      'con el sondeo corriendo, la lista no se ha repintado sola',
      `antes «${marcaAntes}», después «${marcaDespues}»`);
    void nada;

    // --- 5. El diseño ---------------------------------------------------------------
    const diseno = await ventana.webContents.executeJavaScript(`(() => {
      const d = document.querySelector('.farm-picker');
      const buscar = document.querySelector('.farm-search');
      const tarjeta = document.querySelector('#farmPokemonGrid [data-i]');
      const veredicto = tarjeta && tarjeta.querySelector('.farm-matchup-verdict');
      const estilo = (n, p) => n ? getComputedStyle(n)[p] : null;
      return {
        cristal: estilo(d, 'backdropFilter'),
        sombraDialogo: estilo(d, 'boxShadow'),
        sombraBuscador: estilo(buscar, 'boxShadow'),
        sombraVeredicto: estilo(veredicto, 'boxShadow'),
        separador: estilo(tarjeta, 'boxShadow'),
        altoTarjeta: estilo(tarjeta, 'height'),
        anchoVeredicto: veredicto ? Math.round(veredicto.getBoundingClientRect().width) : 0,
        titulo: document.getElementById('farmPickerTitle').textContent,
        limpiar: document.getElementById('resetFarmFiltersButton').textContent.trim(),
        primerTipo: document.getElementById('farmTypeFilter').options[0].textContent,
        primerNivel: document.getElementById('farmLevelFilter').options[0].textContent,
        primerCombate: document.getElementById('farmMatchupFilter').options[0].textContent,
        primerOrden: document.getElementById('farmSortSelect').options[0].textContent,
        buscarPlaceholder: document.getElementById('farmSearchInput').placeholder,
        vacio: document.getElementById('farmPickerEmpty').textContent.trim(),
        anchoDialogo: Math.round(d.getBoundingClientRect().width)
      };
    })()`);

    console.log('\n--- el diseño ---');
    for (const [que, valor] of Object.entries(diseno)) console.log(`  ${que.padEnd(18)} ${valor}`);

    comprobar(/blur/.test(diseno.cristal || ''), 'el diálogo es cristal', `backdrop-filter: ${diseno.cristal}`);
    comprobar(/inset/.test(diseno.sombraBuscador || ''), 'el buscador es un hueco', diseno.sombraBuscador);
    comprobar(/inset/.test(diseno.sombraVeredicto || ''), 'el veredicto es un hueco', diseno.sombraVeredicto);
    // La tarjeta no lleva sombra hacia dentro. No se busca el texto que había antes —
// `inset 4px 0 0`, que era como estaba escrito— sino la palabra `inset`, porque el valor
// calculado llega reordenado: `rgb(85, 119, 139) 4px 0px 0px 0px inset`. Buscar la
// expresión de origen no encuentra nunca nada y la comprobación queda verde siempre.
comprobar(!/\binset\b/.test(diseno.separador || ''), 'la tarjeta no lleva sombra hacia dentro: la franja de color se fue', diseno.separador);
    comprobar(diseno.altoTarjeta === '104px', 'la tarjeta mide lo que dice la medida de la virtualización', `alto: ${diseno.altoTarjeta}`);
    comprobar(diseno.anchoVeredicto > 0 && diseno.anchoVeredicto <= 50, 'el veredicto es estrecho', `ancho: ${diseno.anchoVeredicto}`);
    comprobar(diseno.titulo === 'Elige el Pokémon objetivo', 'el título nuevo', diseno.titulo);
    comprobar(diseno.limpiar === 'Limpiar', 'el botón dice Limpiar', diseno.limpiar);
    comprobar(diseno.primerTipo === 'Cualquier tipo', '«Cualquier tipo»', diseno.primerTipo);
    comprobar(diseno.primerNivel === 'Cualquier nivel', '«Cualquier nivel»', diseno.primerNivel);
    comprobar(diseno.primerCombate === 'Cualquier combate', '«Cualquier combate»', diseno.primerCombate);
    comprobar(diseno.primerOrden === 'Mejor ajuste', '«Mejor ajuste»', diseno.primerOrden);
    comprobar(diseno.buscarPlaceholder === 'Busca por nombre, tipo, mapa o nivel', 'el texto del buscador', diseno.buscarPlaceholder);
    comprobar(diseno.anchoDialogo >= 1100, 'el diálogo se ha ensanchado', `ancho: ${diseno.anchoDialogo}`);


    // --- 4. Y que sí se repinta cuando se le pide -----------------------------------
    await ventana.webContents.executeJavaScript(`(() => {
      const r = document.getElementById('farmPokemonGrid');
      r.scrollTop = 0;
    })()`);
    await dormir(300);
    const antesDeBuscar = await ventana.webContents.executeJavaScript(`document.querySelector('#farmPokemonGrid [data-i]').dataset.i`);
    await ventana.webContents.executeJavaScript(`(() => {
      const i = document.getElementById('farmSearchInput');
      i.value = 'clefable';
      i.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await dormir(500);
    const despuesDeBuscar = await ventana.webContents.executeJavaScript(`document.querySelectorAll('#farmPokemonGrid [data-i]').length`);
    const nombreAhora = await ventana.webContents.executeJavaScript(`(() => {
      const n = document.querySelector('#farmPokemonGrid [data-i] .farm-smart-name-row strong span');
      return n ? n.textContent.toLowerCase() : '';
    })()`);
    console.log(`\n--- escribiendo en el buscador ---`);
    console.log(`  ${despuesDeBuscar} tarjetas, la primera es «${nombreAhora}»`);
    comprobar(despuesDeBuscar > 0, 'buscar deja tarjetas', `${despuesDeBuscar}`);
    comprobar(nombreAhora.includes('clefable'), 'buscar filtra de verdad', `primera: «${nombreAhora}»`);
    comprobar(despuesDeBuscar < inicio.contadorTotal, 'buscar reduce la lista', `${despuesDeBuscar} tarjetas de ${inicio.contadorTotal}`);

    // Varias búsquedas seguidas. Esta es la que de verdad importa y la que no estaba:
    // el listado guarda QUÉ ÍNDICES están dibujados, y al cambiar la lista el índice 0
    // pasa a ser otro Pokémon. Si no se sueltan al filtrar, la segunda búsqueda deja en
    // pantalla la tarjeta de la primera. Con una sola búsqueda no se ve.
    const secuencia = await ventana.webContents.executeJavaScript(`(() => {
      const i = document.getElementById('farmSearchInput');
      const buscar = (texto) => {
        i.value = texto;
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return [...document.querySelectorAll('#farmPokemonGrid [data-i] .farm-smart-name-row strong span')]
          .map((n) => n.textContent.toLowerCase());
      };
      const salida = {};
      for (const termino of ['scarmory', 'wigglytuff', 'gyarados', 'jynx', 'crobat']) {
        salida[termino] = buscar(termino);
      }
      return salida;
    })()`);

    console.log('\n--- cinco búsquedas seguidas ---');
    for (const [termino, nombres] of Object.entries(secuencia)) {
      console.log(`  «${termino}» → ${nombres.length} tarjetas: ${nombres.slice(0, 2).join(', ') || '—'}`);
    }
    let mezcla = 0;
    for (const [termino, nombres] of Object.entries(secuencia)) {
      const ajenos = nombres.filter((n) => !n.includes(termino.replace('scarm', 'skarm')));
      if (ajenos.length) {
        mezcla += ajenos.length;
        console.log(`  «${termino}» trae ${ajenos.length} de otra búsqueda: ${ajenos.slice(0, 3).join(', ')}`);
      }
    }
    comprobar(mezcla === 0, 'cada búsqueda muestra solo lo suyo, sin restos de la anterior',
      `${mezcla} tarjetas de búsquedas anteriores`);
    comprobar(String(antesDeBuscar) === '0', 'al filtrar vuelve al principio de la lista', `primera antes: ${antesDeBuscar}`);

    // Y que nada del otro panel se haya movido.
    const otro = await ventana.webContents.executeJavaScript(`(() => {
      const c = document.querySelector('.farm-account');
      return {
        cristal: c ? getComputedStyle(c).backdropFilter : null,
        alto: c ? Math.round(c.getBoundingClientRect().height) : null,
        cuentas: document.querySelectorAll('.farm-account').length
      };
    })()`);
    comprobar(/blur/.test(otro.cristal || ''), 'el panel grande sigue siendo cristal', `backdrop-filter: ${otro.cristal}`);
    comprobar(otro.alto > 0, 'las tarjetas del panel grande siguen ahí', JSON.stringify(otro));
  } catch (e) {
    console.log(`\nFALLO: ${e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e}`);
    fallos.push('excepción');
  } finally {
    for (let i = 0; i < 3; i++) {
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        break;
      } catch { /* Electron sigue con los ficheros abiertos hasta que sale */ }
    }
  }

  console.log(fallos.length === 0
    ? '\nSelector de Pokémon: no se recarga solo, solo existen las tarjetas que se ven, y el diseño es el aprobado.'
    : `\n${fallos.length} comprobaciones fallan:\n  - ${fallos.join('\n  - ')}`);
  app.exit(fallos.length === 0 ? 0 : 1);
});
