const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { peekLatestVersion } = require('../src/updater');

// --- El canal de sondeo no puede instalar. --------------------------------------------
// Este fichero no prueba solo la función: el canal que la expone es la mitad del
// contrato. app:check-update descarga, instala, borra la versión anterior y hace
// app.exit(0). Si el sondeo pasara por ahí, la aplicación se cerraría sola cada pocas
// horas y el usuario perdería lo que estuviera haciendo. Merece una aserción propia:
// son tres palabras y ninguna es difícil de añadir por descuido.
{
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  const registro = main.match(/ipcMain\.handle\(\s*'app:peek-update'[\s\S]*?(?=\nipcMain\.|\napp\.|\nfunction |\nconst )/);
  assert.ok(registro, 'No hay handler app:peek-update en src/main.js.');
  const cuerpo = registro[0];
  for (const prohibido of ['prepareUpdate', 'launchPreparedUpdate', 'app.exit', 'app.quit', 'app.relaunch']) {
    assert.ok(!cuerpo.includes(prohibido),
      `app:peek-update no puede llamar a ${prohibido}: es de solo lectura y no puede instalar ni cerrar la aplicación.`);
  }
  assert.ok(cuerpo.includes('peekLatestVersion'),
    'app:peek-update tiene que preguntar por peekLatestVersion, no ir a su aire.');
  assert.ok(cuerpo.includes('isMainWindowSender(event)'),
    'app:peek-update tiene que comprobar quién pregunta: solo la ventana principal.');
}

// `net` falso: el sondeo no descarga nada, solo pregunta. Por eso esta prueba vive
// en Node puro, sin red y sin arrancar Electron.
function netQueDevuelve(cuerpo) {
  return {
    fetch: async () => ({ ok: true, status: 200, json: async () => cuerpo })
  };
}

(async () => {
  // Hay versión más reciente.
  const hay = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v0.23.9', html_url: 'https://github.com/x/y/releases/tag/v0.23.9' }),
    '0.23.5'
  );
  assert.equal(hay.hayActualizacion, true, '0.23.9 sobre 0.23.5 es una actualización.');
  assert.equal(hay.masReciente, '0.23.9', 'Hay que decir cuál es la versión nueva.');
  assert.equal(hay.actual, '0.23.5', 'Hay que decir cuál es la instalada.');
  assert.equal(hay.releaseUrl, 'https://github.com/x/y/releases/tag/v0.23.9', 'Hay que decir dónde está.');

  // Misma versión: no hay nada pendiente.
  const igual = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.5' }), '0.23.5');
  assert.equal(igual.hayActualizacion, false, 'La misma versión no es actualización.');

  // Versión publicada más vieja: tampoco.
  const vieja = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.4' }), '0.23.5');
  assert.equal(vieja.hayActualizacion, false, 'Una versión más vieja no es actualización.');

  // Tag sin prefijo v también vale.
  const sinV = await peekLatestVersion(netQueDevuelve({ tag_name: '0.23.9' }), '0.23.5');
  assert.equal(sinV.masReciente, '0.23.9', 'El tag sin v tiene que leerse bien.');

  // Una release SIN assets no es "no hay versión nueva": es que está mal publicada.
  // El sondeo no puede tragarse eso y decir que estás al día.
  const sinAssets = await peekLatestVersion(netQueDevuelve({ tag_name: 'v0.23.9', assets: [] }), '0.23.5');
  assert.equal(sinAssets.hayActualizacion, true,
    'Una release sin ZIP sigue siendo una versión nueva: el error es de quien la publicó, no del launcher.');

  // Borrador o previa no cuentan.
  const borrador = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v9.0.0', draft: true, prerelease: false }), '0.23.5'
  );
  assert.equal(borrador.hayActualizacion, false, 'Un borrador no es una versión estable.');
  const previa = await peekLatestVersion(
    netQueDevuelve({ tag_name: 'v9.0.0', draft: false, prerelease: true }), '0.23.5'
  );
  assert.equal(previa.hayActualizacion, false, 'Una previa no es una versión estable.');

  // Formato imposible: error explícito, nunca un falso negativo.
  await assert.rejects(
    () => peekLatestVersion(netQueDevuelve({ tag_name: 'no-es-version' }), '0.23.5'),
    /no es v.lida/i,
    'Un tag con formato imposible tiene que dar error, no decir que no hay nada.'
  );

  // Red caída: el error se propaga. Quien llama decide si conserva lo que sabía.
  const caido = { fetch: async () => ({ ok: false, status: 503, json: async () => ({}) }) };
  await assert.rejects(
    () => peekLatestVersion(caido, '0.23.5'),
    /GitHub no respondi/i,
    'Si GitHub falla, el error tiene que llegar a quien llama.'
  );

  console.log('Update peek smoke passed: hay version, misma, vieja, sin assets, borrador, previa, formato malo y red caida. El canal de sondeo no instala ni cierra.');
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});