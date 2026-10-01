const assert = require('node:assert/strict');
const path = require('node:path');

const { app, BrowserWindow } = require('electron');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-shop-dom-${process.pid}`));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(window, expression, timeoutMs = 15_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return true;
    await wait(120);
  }
  throw new Error(`Tiempo agotado esperando: ${expression}`);
}

// Lo que el catálogo del harness puede demostrar, y no más. Trae un solo script, así
// que aquí se comprueba la estructura del DOM, el cambio de vista y los estados. El
// filtrado de verdad se prueba en Node con catálogos de 200 entradas, en
// tests/script-shop-view-smoke.js: es el motivo de que ese módulo exista, y el motivo
// de que esta prueba no tenga que fingir más alcance del que tiene.
app.whenReady().then(async () => {
  let ventana = null;
  try {
    ventana = new BrowserWindow({
      show: false, width: 1360, height: 840,
      webPreferences: {
        preload: path.join(__dirname, 'launcher-preview-preload.js'),
        contextIsolation: true, sandbox: false,
        backgroundThrottling: false, webviewTag: true
      }
    });
    await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

    const estructura = await ventana.webContents.executeJavaScript(`(() => ({
      instaladas: Boolean(document.querySelector('#installedScriptsTab')),
      shop: Boolean(document.querySelector('#scriptShopTab')),
      updates: Boolean(document.querySelector('#scriptShopUpdatesTab')),
      badge: Boolean(document.querySelector('#scriptShopUpdatesBadge')),
      pastillas: Boolean(document.querySelector('#scriptShopCategories'))
    }))()`);
    assert.deepEqual(estructura, { instaladas: true, shop: true, updates: true, badge: true, pastillas: true },
      `Las tres pestañas y el filtro tienen que existir. Obtenido: ${JSON.stringify(estructura)}`);

    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptsButton').click(); true`);
    await wait(600);
    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptShopTab').click(); true`);
    await waitFor(ventana, "document.querySelectorAll('#scriptShopCategories .script-shop-category').length > 0");

    const shop = await ventana.webContents.executeJavaScript(`(() => ({
      seleccionada: document.querySelector('#scriptShopTab').getAttribute('aria-selected'),
      updatesSeleccionada: document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected'),
      herramientasVisibles: !document.querySelector('.script-shop-tools').hidden,
      pastillas: [...document.querySelectorAll('#scriptShopCategories .script-shop-category')].map((b) => ({
        nombre: b.querySelector('span').textContent,
        numero: b.querySelector('.script-shop-category-count').textContent,
        pulsada: b.getAttribute('aria-pressed')
      }))
    }))()`);
    assert.equal(shop.seleccionada, 'true', 'En Shop, su pestaña queda marcada.');
    assert.equal(shop.updatesSeleccionada, 'false', 'Y la de Actualizaciones no.');
    assert.equal(shop.herramientasVisibles, true, 'En Shop se ven el buscador y el botón de verificar.');
    assert.equal(shop.pastillas.length, 2, `Con el catálogo del harness hay «Todas» y una categoría. Obtenido: ${JSON.stringify(shop.pastillas)}`);
    assert.equal(shop.pastillas[0].nombre, 'Todas', 'La primera pastilla es «Todas».');
    assert.equal(shop.pastillas[0].pulsada, 'true', 'Y «Todas» viene pulsada.');
    assert.equal(shop.pastillas[1].numero, '1', 'La categoría del catálogo tiene una entrada.');

    // La pastilla filtra de verdad, en el DOM.
    await ventana.webContents.executeJavaScript(
      `document.querySelectorAll('#scriptShopCategories .script-shop-category')[1].click(); true`
    );
    await wait(400);
    const filtrada = await ventana.webContents.executeJavaScript(`(() => ({
      tarjetas: document.querySelectorAll('#scriptShopGrid .script-shop-card').length,
      mostrando: document.querySelector('#scriptShopSummary').textContent.includes('mostrando')
    }))()`);
    assert.equal(filtrada.tarjetas, 1, 'Elegir la categoría deja su tarjeta y quita las demás.');
    assert.equal(filtrada.mostrando, true, 'Con filtro activo el resumen dice cuántas se están mostrando.');

    await ventana.webContents.executeJavaScript(
      `document.querySelectorAll('#scriptShopCategories .script-shop-category')[0].click(); true`
    );
    await wait(400);
    const todas = await ventana.webContents.executeJavaScript(`(() => ({
      tarjetas: document.querySelectorAll('#scriptShopGrid .script-shop-card').length,
      mostrando: document.querySelector('#scriptShopSummary').textContent.includes('mostrando')
    }))()`);
    assert.equal(todas.tarjetas, 1, '«Todas» vuelve a quitar el filtro.');
    assert.equal(todas.mostrando, false, 'Sin filtro, el resumen no dice cuántas se muestran.');

    // Los dos contadores de las pestañas se esconden al abrir Shop: entrar ahí marca lo
    // nuevo como visto, que es justo lo que debe pasar. Lo que NO se puede comprobar en
    // esta prueba es que los dos lean campos distintos del desglose: con un script que
    // no está instalado no hay actualizaciones, así que los dos contadores valen lo mismo y no hay diferencia que ver. Eso lo comprueba
    // tests/notification-hub-smoke.js con números de verdad, y tests/script-shop-smoke.js
    // comprueba que la llamada publique el desglose. Aquí solo se fija que no queda un
    // contador colgando con un cero o un «0» a la vista.
    const badges = await ventana.webContents.executeJavaScript(`(() => ({
      shop: document.querySelector('#scriptShopTab i').hidden,
      updates: document.querySelector('#scriptShopUpdatesTab i').hidden,
      textoShop: document.getElementById('scriptShopUpdateBadge').textContent,
      textoUpdates: document.getElementById('scriptShopUpdatesBadge').textContent
    }))()`);
    assert.equal(badges.shop, true, 'Al abrir Shop, el contador de nuevos se esconde: ya los has visto.');
    assert.equal(badges.updates, true, 'Y el de actualizaciones también: no hay ninguna pendiente.');
    assert.equal(badges.textoShop, '0', `Nada de «NaN» ni «undefined» en el contador de Shop. Valor: "${badges.textoShop}".`);
    assert.equal(badges.textoUpdates, '0', `Nada de «NaN» ni «undefined» en el de Actualizaciones. Valor: "${badges.textoUpdates}".`);

    // Actualizaciones: sin herramientas, con su encabezado, y con el estado de al día
    // porque el único script del harness no está instalado.
    const updates = await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#scriptShopUpdatesTab').click();
      await new Promise((r) => setTimeout(r, 500));
      return {
        seleccionada: document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected'),
        shopSeleccionada: document.querySelector('#scriptShopTab').getAttribute('aria-selected'),
        herramientasVisibles: !document.querySelector('.script-shop-tools').hidden,
        encabezado: document.querySelector('#scriptShopHeading').textContent,
        vacio: document.querySelector('#scriptShopGrid .script-shop-empty')?.textContent || ''
      };
    })()`);
    assert.equal(updates.seleccionada, 'true', 'Al entrar en Actualizaciones, su pestaña queda marcada.');
    assert.equal(updates.shopSeleccionada, 'false', 'Y la de Shop deja de estarlo.');
    assert.equal(updates.herramientasVisibles, false, 'En Actualizaciones no hay buscador ni botón de verificar: son de Shop.');
    assert.equal(updates.encabezado, 'Actualizaciones', 'El encabezado dice en qué vista estás.');
    assert.match(updates.vacio, /Estás al día/,
      `Sin actualizaciones tiene que decir que estás al día, no "no hay resultados". Obtenido: "${updates.vacio}"`);

    // El filtro sobrevive al cambio entre las dos vistas de la Shop, porque siguen siendo
    // la misma visita: si estás mirando «Combate» y quieres saber si hay actualizaciones
    // de «Combate», shouldn't perder el filtro al preguntar. Y al entrar en Actualizaciones
    // con una categoría que no tiene nada, tiene que decir exactamente eso en vez de
    // fingir que no hay resultados: es el catálogo del harness, un script sin instalar,
    // así que no hay ninguna actualización y esa es la situation que se puede provocar.
    await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#scriptShopTab').click();
      await new Promise((r) => setTimeout(r, 400));
      document.querySelectorAll('#scriptShopCategories .script-shop-category')[1].click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#scriptShopUpdatesTab').click();
      await new Promise((r) => setTimeout(r, 500));
    })()`);
    const filtradaEnUpdates = await ventana.webContents.executeJavaScript(`(() => {
      const chips = [...document.querySelectorAll('#scriptShopCategories .script-shop-category')];
      return {
        tarjetas: document.querySelectorAll('#scriptShopGrid .script-shop-card').length,
        mensaje: document.querySelector('#scriptShopGrid .script-shop-empty')?.textContent || '',
        pulsadas: chips.filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.querySelector('span').textContent),
        mercado: chips.find((b) => b.dataset.category === 'market')?.querySelector('.script-shop-category-count')?.textContent || null
      };
    })()`);
    assert.equal(filtradaEnUpdates.tarjetas, 0, 'Con la categoría elegida y sin actualizaciones, no hay tarjetas.');
    assert.deepEqual(filtradaEnUpdates.pulsadas, ['Market'],
      `La categoría elegida tiene que seguir pulsada, para que se vea por qué no hay nada. Pulsadas: ${JSON.stringify(filtradaEnUpdates.pulsadas)}`);
    assert.equal(filtradaEnUpdates.mercado, '0',
      'La categoría sin actualizaciones se muestra con 0, no desaparece: si no, el filtro aplicado sería invisible.');
    assert.match(filtradaEnUpdates.mensaje, /Nada por aquí/,
      `El mensaje tiene que decir que no hay nada en la categoría, no "no hay resultados". Obtenido: "${filtradaEnUpdates.mensaje}"`);
    assert.match(filtradaEnUpdates.mensaje, /Market/,
      'Y tiene que nombrar la categoría que filtró.');
    assert.doesNotMatch(filtradaEnUpdates.mensaje, /Prueba otra palabra/,
      'En Actualizaciones no hay caja de búsqueda, así que no puede pedir buscar otra palabra.');

    // Quitar el filtro devuelve las actualizaciones. Aquí no hay ninguna, así que lo que
    // se comprueba es que el mensaje pase a ser el de «Estás al día», no el de categoría.
    await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelectorAll('#scriptShopCategories .script-shop-category')[0].click();
      await new Promise((r) => setTimeout(r, 400));
    })()`);
    const sinFiltro = await ventana.webContents.executeJavaScript(`(() => ({
      mensaje: document.querySelector('#scriptShopGrid .script-shop-empty')?.textContent || ''
    }))()`);
    assert.match(sinFiltro.mensaje, /Estás al día/,
      `Sin filtro y sin actualizaciones, el mensaje es el de estar al día. Obtenido: "${sinFiltro.mensaje}"`);

    // «Mis scripts» también se recuerda. Si solo se guardan las dos vistas de la Shop,
    // quien cierra en «Mis scripts» vuelve a la Shop, que es lo contrario de lo
    // prometido y lo que más sorprende: es la pestaña de la que se sale menos.
    await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#installedScriptsTab').click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#closeScriptsButton').click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#scriptsButton').click();
      await new Promise((r) => setTimeout(r, 500));
    })()`);
    const scriptsRecordada = await ventana.webContents.executeJavaScript(
      "document.querySelector('#installedScriptsTab').getAttribute('aria-selected')"
    );
    assert.equal(scriptsRecordada, 'true',
      '«Mis scripts» también se recuerda al reabrir: si no, quien sale de ella vuelve a la Shop.');

    // Y al reabrir, el filtro de categoría está limpio aunque se saliera filtrando.
    const filtroAlReabrir = await ventana.webContents.executeJavaScript(`(() => ({
      todas: document.querySelectorAll('#scriptShopCategories .script-shop-category')[0]?.getAttribute('aria-pressed'),
      marcadas: document.querySelectorAll('#scriptShopCategories .script-shop-category[aria-pressed="true"]').length
    }))()`);
    assert.equal(filtroAlReabrir.marcadas, 1,
      'Al reabrir hay exactamente una pastilla pulsada: si se recuerda el filtro, al reabrir se abriría con otro.');
    assert.equal(filtroAlReabrir.todas, 'true', 'Y es «Todas»: la categoría no se recuerda, la pestaña sí.');

    // Y la pestaña de Actualizaciones se recuerda al reabrir el centro de scripts.
    await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#scriptShopUpdatesTab').click();
      await new Promise((r) => setTimeout(r, 400));
      document.querySelector('#closeScriptsButton').click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#scriptsButton').click();
      await new Promise((r) => setTimeout(r, 500));
    })()`);
    const recordada = await ventana.webContents.executeJavaScript(
      "document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected')"
    );
    assert.equal(recordada, 'true', 'La pestaña elegida se recuerda al reabrir el centro de scripts.');

    // La pestaña recordada tiene que aplicarse de verdad al abrir, y eso solo se puede
    // comprobar sobre una página recién cargada: dentro de la misma sesión las pestañas
    // conservan su estado de la última vez y la comprobación pasaría aunque la memoria no
    // se usara para nada. Por eso se recarga.
    const recargarYMirar = async (guardado) => {
      await ventana.webContents.executeJavaScript(
        `localStorage.setItem('pokegrid:scripts-view:v1', ${JSON.stringify(guardado)}); true`
      );
      await ventana.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
      await wait(900);
      await ventana.webContents.executeJavaScript(`document.querySelector('#scriptsButton').click(); true`);
      await wait(600);
      return ventana.webContents.executeJavaScript(`(() => ({
        instaladas: document.querySelector('#installedScriptsTab').getAttribute('aria-selected'),
        shop: document.querySelector('#scriptShopTab').getAttribute('aria-selected'),
        updates: document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected')
      }))()`);
    };

    const guardadaUpdates = await recargarYMirar('updates');
    assert.deepEqual(guardadaUpdates, { instaladas: 'false', shop: 'false', updates: 'true' },
      `Guardar «updates» tiene que abrir ahí al recargar, no solo guardarlo. Obtenido: ${JSON.stringify(guardadaUpdates)}`);

    // Un valor guardado que no es una de las tres pestañas —de una versión antigua del
    // formato, o escrito a mano— se ignora. Si no, el centro abriría en una vista que no
    // existe, con las tres pestañas desmarcadas.
    const guardadaRota = await recargarYMirar('banana');
    assert.deepEqual(guardadaRota, { instaladas: 'true', shop: 'false', updates: 'false' },
      `Un valor guardado que no es una pestaña válida se ignora y se empieza en «Mis scripts». Obtenido: ${JSON.stringify(guardadaRota)}`);

    console.log(JSON.stringify({ ok: true, estructura, shop, filtrada, todas, updates, filtradaEnUpdates, sinFiltro, scriptsRecordada, recordada, guardadaUpdates, guardadaRota }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});