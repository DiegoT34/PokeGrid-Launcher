// Primer arranque: sin fichero de cuentas, CERO cuentas.
//
// Lo que hacía antes: si `accounts.enc` no existía, el lector devolvía cuatro cuentas en
// blanco —`Cuenta 1` a `Cuenta 4`, sin usuario ni contraseña— y el renderer creaba un panel
// por cada una. Un panel es una `<webview>` que carga el juego, y el juego es un WebGL
// entero que no se frena nunca porque el launcher apaga el frenado de fondo a propósito.
// O sea: cuatro juegos abiertos en una instalación recién puesta, sin haber escrito una
// sola cuenta. Medido: tres núcleos ocupados de forma continua con la carpeta de datos
// vacía.
//
// El arreglo es en el origen, no un heurístico: «no hay fichero» significa «no hay cuentas».
// Las cuatro filas en blanco que ve el usuario al arrancar las pone la ventana de cuentas,
// que es una cosa de la interfaz y no tiene por qué crear webviews.
//
// No se puede distinguir una cuenta por defecto de una real sin usuario: `normalizeAccounts`
// rellena la etiqueta, así que `{id: 1}` sale como `{id: 1, label: 'Cuenta 1', username: ''}`,
// idéntico a una cuenta real llamada «Cuenta 1» sin usuario. Por eso el arreglo va donde
// está la diferencia de verdad —el fichero— y no en adivinar por los campos.
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const credentials = require('../src/credentials.js');
const { normalizeAccounts } = require('../src/account-model.js');

const { readAccountsFile } = credentials;

const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-primer-arranque-'));
const file = path.join(temporal, 'accounts.enc');
const backupFile = `${file}.bak`;

// Un `safeStorage` de mentira: aquí no se cifra nada, solo se comprueba qué se devuelve
// cuando el fichero no está.
const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (texto) => Buffer.from(`cifrado:${texto}`, 'utf8'),
  decryptString: (buffer) => String(buffer).replace(/^cifrado:/, '')
};

const fallos = [];
const comprobar = (ok, que, detalle) => {
  if (!ok) fallos.push(`${que}${detalle ? ` (${detalle})` : ''}`);
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle ? `  ${detalle}` : ''}`);
};

console.log('--- sin fichero de cuentas ---');
const arranque = readAccountsFile({ file, backupFile, fs, safeStorage, normalize: normalizeAccounts });
comprobar(arranque.accounts.length === 0, 'un primer arranque no se inventa ninguna cuenta', `${arranque.accounts.length} cuentas`);
comprobar(arranque.source !== 'defaults', 'y no dice que salieron de unos valores por defecto', `source: ${arranque.source}`);
comprobar(arranque.recovered === false && arranque.corruptPreserved === false,
  'sin fichero no hay nada que recuperar ni nada dañado que conservar',
  JSON.stringify({ recovered: arranque.recovered, corruptPreserved: arranque.corruptPreserved }));
comprobar(!fs.existsSync(file), 'y no escribe ningún fichero por su cuenta');

console.log('\n--- guardar y releer sigue funcionando ---');
credentials.writeAccountsFile({
  file, fs, safeStorage, normalize: normalizeAccounts,
  accounts: normalizeAccounts([
    { id: 1, label: 'Primera', username: 'una@ejemplo.test', password: 'clave-uno' },
    { id: 2, label: 'Segunda', username: 'dos@ejemplo.test', password: 'clave-dos' }
  ])
});
const releido = readAccountsFile({ file, backupFile, fs, safeStorage, normalize: normalizeAccounts });
comprobar(releido.accounts.length === 2, 'las cuentas guardadas se releen', `${releido.accounts.length} cuentas`);
comprobar(releido.accounts[0].username === 'una@ejemplo.test', 'con su usuario', releido.accounts[0].username);

console.log('\n--- el fichero se ha borrado a mano: tampoco se inventa nada ---');
fs.rmSync(file, { force: true });
const trasBorrar = readAccountsFile({ file, backupFile, fs, safeStorage, normalize: normalizeAccounts });
comprobar(trasBorrar.accounts.length === 0, 'un fichero ausente no resucita cuentas', `${trasBorrar.accounts.length} cuentas`);

console.log('');
if (fallos.length === 0) {
  console.log('Primer arranque: sin fichero de cuentas no se crea ninguna cuenta, y por tanto ningún panel ni webview.');
} else {
  console.log(`${fallos.length} comprobaciones fallan:`);
  for (const f of fallos) console.log(`  - ${f}`);
}
try { fs.rmSync(temporal, { recursive: true, force: true }); } catch { /* nada */ }
process.exit(fallos.length === 0 ? 0 : 1);
