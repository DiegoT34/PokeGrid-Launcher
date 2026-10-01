// Comprobación del CONJUNTO de guards de emisor IPC, no de un caso suelto.
//
// Por qué un test y no una lista en el brief: la lista de canales a los que NO se les
// pone el guard es exactamente la que, si se equivoca, rompe el puente GM de los
// userscripts dentro de los webviews del juego. Un test que solo comprobara "un handler
// cualquiera rechaza a un emisor equivocado" pasaría igual con el puente roto, así que
// esta prueba hace las dos mitades:
//
//   A. Comportamiento real: un emisor que no es la ventana principal es RECHAZADO en
//      los canales de la UI, y NO RECHAZADO por el guard de ventana en el puente GM.
//   B. El conjunto declarado: la lista de este archivo tiene que coincidir con lo que
//      src/main.js hace, con lo que src/preload.js expone y con lo que
//      src/guest-preload.js invoca. Un canal nuevo sin clasificar hace fallar esto.
//
// La parte B es la que se aheada al error: si alguien añade un canal y lo mete en la
// lista equivocada, o se le olvida, el fallo aparece aquí y no con los userscripts
// rotos en el juego.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const mainSource = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'src', 'preload.js'), 'utf8');
const guestPreloadSource = fs.readFileSync(path.join(root, 'src', 'guest-preload.js'), 'utf8');

// Las dos listas, con el motivo de cada una al lado. Si esto y src/main.js dejan de
// coincidir, la prueba falla: eso es el objetivo.
const UI_CHANNELS = [
  'accounts:load',
  'accounts:sync-source',
  'accounts:save',
  'accounts:download-template',
  'accounts:import-file',
  'accounts:unlink-source',
  'accounts:restore-backup',
  'assets:image-data-url',
  'assets:pokemon-species',
  'userscripts:list',
  'userscripts:validate-syntax',
  'userscripts:save',
  'userscripts:delete',
  'userscripts:import-file',
  'userscripts:export-file',
  'userscripts:bundled-telegram',
  'userscripts:fetch-url',
  'userscripts:shop-catalog',
  'userscripts:shop-install',
  'userscripts:shop-uninstall',
  'userscripts:guest-preload',
  'extensions:pick-folder',
  'extensions:status',
  'extensions:apply'
];

// Los que invocan los webviews del juego. Con guard de ventana principal dejarían de
// funcionar siempre: event.sender sería el webContents del webview, no el de la
// ventana principal. Se autorizan con authorizeUserScriptRuntime (origen + partición
// + script habilitado), que es otro mecanismo.
const WEBVIEW_BRIDGE_CHANNELS = [
  'userscripts:request',
  'userscripts:shared-get',
  'userscripts:shared-set',
  'userscripts:shared-delete'
];

// Canales con una comprobación propia que NO es la de la ventana principal, y por qué.
// pokepedia:minimize y pokepedia:close los manda la ventana de Pokepedia, que es otra
// ventana y ya compara contra pokepediaWindow. app:cleanup-memory no lleva guard a
// propósito: lo llama el renderer principal y no protege nada que un invitado pueda
// aprovechar. app:version, app:check-update y app:peek-update ya traían su
// comprobación y ahora usan el helper compartido. app:proxy-results es de la
// Tarea 8 y no se toca (R-05).
const OTHER_CHANNELS = {
  'pokepedia:open': 'ventana principal, comprobación propia',
  'pokepedia:minimize': 'ventana de Pokepedia, no la principal',
  'pokepedia:close': 'ventana de Pokepedia, no la principal',
  'app:version': 'ventana principal, con el helper compartido',
  'app:check-update': 'ventana principal, con el helper compartido',
  'app:peek-update': 'ventana principal, con el helper compartido, y de solo lectura',
  'app:cleanup-memory': 'sin guard a propósito, no expone nada sensible',
  'app:proxy-results': 'Tarea 8, no se toca (R-05)'
};

// --- A. Comportamiento real del guard, sin arrancar Electron ------------------------
//
// isMainWindowSender se extrae del cuerpo de main.js y se ejecuta con un mainWindow
// falso. Es el mismo texto que corre en producción, no una reimplementación: si alguien
// cambiara la condición dentro de main.js, esta prueba cambia con ella.
const helperMatch = mainSource.match(/function isMainWindowSender\(event\) \{[\s\S]*?\n\}/);
assert.ok(helperMatch, 'src/main.js debe declarar isMainWindowSender(event).');
const helperBody = `${helperMatch[0]}\nresultado = isMainWindowSender(event);`;

function evaluarGuard(ventanaPrincipal, evento) {
  const contexto = { mainWindow: ventanaPrincipal, event: evento, resultado: undefined };
  vm.createContext(contexto);
  vm.runInContext(helperBody, contexto);
  return contexto.resultado;
}

const principalVivo = { isDestroyed: () => false, webContents: { id: 'ventana-principal' } };
const emisorPrincipal = { sender: principalVivo.webContents };
const emisorWebview = { sender: { id: 'webview-del-juego', getURL: () => 'https://poke.idleworld.online/' } };

assert.equal(evaluarGuard(principalVivo, emisorPrincipal), true,
  'La ventana principal tiene que pasar su propio guard.');
assert.equal(evaluarGuard(principalVivo, emisorWebview), false,
  'Un webview del juego no puede pasar por ventana principal.');
assert.equal(evaluarGuard(principalVivo, { sender: null }), false,
  'Un evento sin emisor no puede pasar.');
assert.equal(evaluarGuard(null, emisorPrincipal), false,
  'Sin ventana principal no se acepta a nadie.');
assert.equal(evaluarGuard({ isDestroyed: () => true, webContents: principalVivo.webContents }, emisorPrincipal), false,
  'Con la ventana principal destruida no se acepta a nadie.');

// El puente GM depende de que estos cuatro NO lleven el guard. Esto es el aserto que
// detecta un guard de más antes de que rompa los userscripts dentro del juego.
for (const canal of WEBVIEW_BRIDGE_CHANNELS) {
  assert.equal(evaluarGuard(principalVivo, emisorWebview), false,
    `${canal} lo invoca un webview: el guard de ventana principal lo rechazaría siempre.`);
}

// --- B. El conjunto declarado, contrasted con los tres ficheros de cableado ----------

// B1. guest-preload.js: los canales del puente tienen que ser exactamente los que
// src/guest-preload.js invoca. Si mañana se le añade uno nuevo al puente y no está en
// la lista, esta comparación falla.
const guestInvokes = [...guestPreloadSource.matchAll(/ipcRenderer\.invoke\(\s*'([^']+)'/g)].map((m) => m[1]);
assert.deepEqual([...guestInvokes].sort(), [...WEBVIEW_BRIDGE_CHANNELS].sort(),
  `Los canales que invoca src/guest-preload.js y la lista del puente GM tienen que ser los mismos. ` +
  `guest-preload: ${JSON.stringify(guestInvokes)}`);

// B2. preload.js: los canales de la UI tienen que estar expuestos ahí, y los del puente
// NO. Si un canal de la UI no está en el preload es código muerto; si uno del puente se
// cuela en el preload, el renderer de la ventana principal podría invocarlo y lo
// rechazaría.
const preloadInvokes = [...preloadSource.matchAll(/ipcRenderer\.invoke\(\s*'([^']+)'/g)].map((m) => m[1]);
for (const canal of UI_CHANNELS) {
  assert.ok(preloadInvokes.includes(canal),
    `${canal} está en la lista de la UI pero src/preload.js no lo expone: el guard lo haría inalcanzable.`);
}
for (const canal of WEBVIEW_BRIDGE_CHANNELS) {
  assert.ok(!preloadInvokes.includes(canal),
    `${canal} es del puente GM y no puede exponerse en el preload de la ventana principal.`);
}

// B3. main.js: cada canal de la UI tiene que llamar al guard, y cada canal del puente
// tiene que quedarse sin él. Se lee el cuerpo de cada handler por el intervalo de
// líneas que va desde su registro hasta el siguiente ipcMain.
const registros = [...mainSource.matchAll(/ipcMain\.(handle|on)\(\s*'([^']+)'/g)];
assert.ok(registros.length > 0, 'No se encontró ningún registro ipcMain en src/main.js.');
const cuerpos = registros.map((match, index) => {
  const fin = index + 1 < registros.length ? registros[index + 1].index : mainSource.length;
  return mainSource.slice(match.index, fin);
});
const porCanal = new Map(registros.map((match, index) => [match[2], cuerpos[index]]));

const usaGuardDeVentana = (cuerpo) =>
  /assertMainWindowSender\(event\)|mainWindowSenderRefusal\(event|isMainWindowSender\(event\)/.test(cuerpo);

for (const canal of UI_CHANNELS) {
  const cuerpo = porCanal.get(canal);
  assert.ok(cuerpo, `No hay ningún ipcMain.handle/on para ${canal}.`);
  assert.ok(usaGuardDeVentana(cuerpo),
    `${canal} está en la lista de la UI pero su handler no comprueba el emisor.`);
}
for (const canal of WEBVIEW_BRIDGE_CHANNELS) {
  const cuerpo = porCanal.get(canal);
  assert.ok(cuerpo, `No hay ningún ipcMain.handle/on para ${canal}.`);
  assert.ok(!usaGuardDeVentana(cuerpo),
    `${canal} lo invocan los webviews del juego: un guard de ventana principal rompería el puente GM.`);
}

// B4. Clasificación completa: todo canal registrado tiene que estar en una de las tres
// listas. Esta es la que avisa de un canal nuevo sin decidir, que es donde se cuela el
// olvido.
const declarados = new Set([...UI_CHANNELS, ...WEBVIEW_BRIDGE_CHANNELS, ...Object.keys(OTHER_CHANNELS)]);
const sinClasificar = [...porCanal.keys()].filter((canal) => !declarados.has(canal));
assert.deepEqual(sinClasificar, [],
  `Canales IPC sin clasificar: ${JSON.stringify(sinClasificar)}. Añádelos a UI_CHANNELS, ` +
  'WEBVIEW_BRIDGE_CHANNELS u OTHER_CHANNELS en esta prueba, decidiendo si les corresponde el guard.');
const sobrantes = [...declarados].filter((canal) => !porCanal.has(canal));
assert.deepEqual(sobrantes, [],
  `Canales clasificados que ya no existen en src/main.js: ${JSON.stringify(sobrantes)}.`);

// B5. Los canales de OTHER_CHANNELS que dicen usar el helper, lo usan de verdad, y los
// que dicen NO usarlo no lo tienen. Sirve para que la lista no se vuelva decorativa.
for (const [canal, motivo] of Object.entries(OTHER_CHANNELS)) {
  const cuerpo = porCanal.get(canal);
  assert.ok(cuerpo, `${canal} está en OTHER_CHANNELS pero no existe en src/main.js.`);
  const tieneGuardDeVentana = /assertMainWindowSender\(event\)|mainWindowSenderRefusal\(event|isMainWindowSender\(event\)/.test(cuerpo);
  if (canal === 'app:cleanup-memory') {
    assert.ok(!tieneGuardDeVentana, 'app:cleanup-memory se decidió sin guard a propósito.');
  }
  // La condición mira el motivo, no una lista de nombres. Con los nombres escritos a
  // mano, añadir un canal que use el helper era Fácil: se clasificaba, la puerta se
  // ponía en verde, y el guard se podía borrar sin que nada lo notara. Leyendo el
  // motivo, clasificar es declararlo y la prueba lo hace cumplir sola.
  if (/helper compartido/.test(motivo)) {
    assert.ok(tieneGuardDeVentana, `${canal} dice usar el helper compartido y debe seguir usándolo.`);
  }
  assert.ok(motivo.length > 10, `${canal} necesita un motivo de verdad en OTHER_CHANNELS, no un placeholder.`);
}

// B6. El puente GM tiene su propia autorización, y esta es la que sustituye al guard de
// ventana. Si alguien la quitara, los shared-* quedarían abiertos a cualquier emisor.
assert.match(mainSource, /function authorizeUserScriptRuntime\(event, scriptId, requiredGrant = ''\)/,
  'El puente GM se autoriza con authorizeUserScriptRuntime.');
const autorizacion = mainSource.match(/function authorizeUserScriptRuntime\(event, scriptId, requiredGrant = ''\) \{[\s\S]*?\n\}/);
assert.ok(autorizacion, 'No se encontró el cuerpo de authorizeUserScriptRuntime.');
assert.match(autorizacion[0], /getGameAccountIndex\(event\.sender\)/,
  'La autorización del puente tiene que comprobar la partición del emisor.');
assert.match(autorizacion[0], /isGameUrl\(event\.sender\.getURL\(\)\)/,
  'La autorización del puente tiene que comprobar el origen del emisor.');
assert.match(autorizacion[0], /!script\?\.enabled/,
  'La autorización del puente tiene que comprobar que el script está habilitado.');
for (const nombre of ['getUserScriptSharedValue', 'setUserScriptSharedValue', 'deleteUserScriptSharedValue']) {
  const cuerpo = mainSource.match(new RegExp(`function ${nombre}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(cuerpo, `No se encontró ${nombre}.`);
  assert.match(cuerpo[0], /authorizeUserScriptRuntime\(event, scriptId, 'PokeGrid_sharedStorage'\)/,
    `${nombre} tiene que autorizarse antes de tocar el almacenamiento compartido.`);
}

console.log(
  `IPC sender guard smoke passed: ${UI_CHANNELS.length} canales de UI con guard, ` +
  `${WEBVIEW_BRIDGE_CHANNELS.length} del puente GM sin guard (autorizados por origen, partición y script), ` +
  `${Object.keys(OTHER_CHANNELS).length} con otra comprobación, y el emisor ajeno rechazado.`
);
