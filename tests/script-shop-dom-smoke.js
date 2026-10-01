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

    // Volver a Shop desde Actualizaciones tiene que dejar el filtro limpio. La categoría es
    // una decisión de la visita, no un estado: si se recuerda al volver, el usuario
    // llega a Shop ya filtrado sin haber pedido nada y no ve por qué la lista es corta.
    await ventana.webContents.executeJavaScript(`(async () => {
      document.querySelector('#scriptShopTab').click();
      await new Promise((r) => setTimeout(r, 400));
      document.querySelectorAll('#scriptShopCategories .script-shop-category')[1].click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#scriptShopUpdatesTab').click();
      await new Promise((r) => setTimeout(r, 400));
      document.querySelector('#scriptShopTab').click();
      await new Promise((r) => setTimeout(r, 400));
    })()`);
    const alVolver = await ventana.webContents.executeJavaScript(`(() => ({
      todas: document.querySelectorAll('#scriptShopCategories .script-shop-category')[0].getAttribute('aria-pressed'),
      mostrando: document.querySelector('#scriptShopSummary').textContent.includes('mostrando')
    }))()`);
    assert.equal(alVolver.todas, 'true', 'Volver a Shop tiene que dejar «Todas» pulsada: el filtro no se recuerda entre visitas.');
    assert.equal(alVolver.mostrando, false, 'Y el resumen no dice que se esté mostrando nada.');

    // Y la pestaña se recuerda al reabrir el centro de scripts. Antes de cerrar se entra en
    // Actualizaciones, que es la pestaña que se quiere encontrar al volver.
    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptShopUpdatesTab').click(); true`);
    await wait(400);
    await ventana.webContents.executeJavaScript(`document.querySelector('#closeScriptsButton').click(); true`);
    await wait(300);
    await ventana.webContents.executeJavaScript(`document.querySelector('#scriptsButton').click(); true`);
    await wait(500);
    const recordada = await ventana.webContents.executeJavaScript(
      "document.querySelector('#scriptShopUpdatesTab').getAttribute('aria-selected')"
    );
    assert.equal(recordada, 'true', 'La pestaña elegida se recuerda al reabrir el centro de scripts.');

    console.log(JSON.stringify({ ok: true, estructura, shop, filtrada, todas, updates, recordada }));
    ventana.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    if (ventana && !ventana.isDestroyed()) ventana.destroy();
    app.exit(1);
  }
});