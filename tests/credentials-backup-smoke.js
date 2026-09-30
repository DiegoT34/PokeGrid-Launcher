const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { normalizeAccounts } = require('../src/account-model');

let credentials = null;
try {
  credentials = require('../src/credentials');
} catch {
  console.error('No existe src/credentials.js. La logica de credenciales no es testeable todavia.');
  process.exit(1);
}

const { hasAccountsBackup, readAccountsFile, restoreAccountsBackup, writeAccountsFile } = credentials;

// safeStorage falso: "cifra" con una simple inversion de bytes, de modo que un
// fichero corrupto falla al descifrar y uno valido no.
const fakeSafeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value, 'utf8').map((byte) => 255 - byte),
  decryptString: (buffer) => {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('bloque vacio');
    const plain = Buffer.from(buffer).map((byte) => 255 - byte).toString('utf8');
    if (!plain.trim().startsWith('[')) throw new Error('el bloque descifrado no es una lista JSON');
    return plain;
  }
};

// fs de verdad con las tres llamadas que deciden si una escritura es atomica
// grabadas. Un fs que miente sobre copyFileSync/writeFileSync/renameSync es la unica
// forma de comprobar que accounts.enc nunca se escribe encima sino que se sustituye
// por un renombrado: si el codigo volviera a copyFileSync(backup, file), aqui se ve.
function spyFs(real = fs) {
  const calls = [];
  const record = (method, op, describe) => (...args) => {
    calls.push({ op, ...describe(args) });
    return real[method](...args);
  };
  const spy = new Proxy(real, {
    get(target, property) {
      if (property === 'calls') return calls;
      if (property === 'reset') return () => { calls.length = 0; };
      if (property === 'writeFileSync') return record('writeFileSync', 'write', (args) => ({ file: String(args[0]) }));
      if (property === 'copyFileSync') return record('copyFileSync', 'copy', (args) => ({ from: String(args[0]), to: String(args[1]) }));
      if (property === 'renameSync') return record('renameSync', 'rename', (args) => ({ from: String(args[0]), to: String(args[1]) }));
      return target[property];
    }
  });
  return spy;
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-credentials-'));
const file = path.join(dir, 'accounts.enc');
const backupFile = `${file}.bak`;
const temporal = `${file}.tmp`;

const accounts = normalizeAccounts([
  { id: 1, label: 'Uno', username: 'uno@ejemplo.test', password: 'secreto1' },
  { id: 2, label: 'Dos', username: 'dos@ejemplo.test', password: 'secreto2' }
]);

// 1. Primer arranque: no hay fichero -> defaults.
const arranque = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(arranque.accounts.length, 4, 'Sin fichero de credenciales deben devolverse las cuentas por defecto.');
assert.equal(arranque.source, 'defaults', 'Sin fichero no hay nada que recuperar: el origen es defaults.');
assert.equal(arranque.recovered, false, 'Arranque limpio no se anuncia como recuperación.');
assert.equal(hasAccountsBackup({ file, backupFile, fs }), false, 'Sin copia no puede haber botón que restaurar.');

// 2. Ida y vuelta fiel. La escritura tiene que pasar por .tmp + rename, porque
// escribir encima de accounts.enc lo deja a medias si el proceso se corta.
const espia = spyFs(fs);
assert.equal(writeAccountsFile({ file, fs: espia, safeStorage: fakeSafeStorage, accounts, normalize: normalizeAccounts }), true);
const escritoDirecto = espia.calls.filter((entry) => (entry.op === 'write' || entry.op === 'copy') && entry.to === file);
assert.deepEqual(escritoDirecto, [], `accounts.enc no puede escribirse ni copiarse encima: ${JSON.stringify(espia.calls)}`);
assert.ok(
  espia.calls.some((entry) => entry.op === 'write' && entry.file === temporal),
  `El cifrado se escribe en accounts.enc.tmp antes de renombrarlo: ${JSON.stringify(espia.calls)}`
);
assert.ok(
  espia.calls.some((entry) => entry.op === 'rename' && entry.from === temporal && entry.to === file),
  `El .tmp se renombra sobre accounts.enc: ${JSON.stringify(espia.calls)}`
);
assert.equal(fs.existsSync(temporal), false, 'El temporal no puede sobrevivir a un guardado correcto.');

const readBack = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(readBack.accounts.length, 2);
assert.equal(readBack.accounts[0].username, 'uno@ejemplo.test');
assert.equal(readBack.accounts[1].password, 'secreto2');
assert.equal(fs.existsSync(backupFile), false, 'El primer guardado no debe crear backup.');
assert.equal(hasAccountsBackup({ file, backupFile, fs }), false, 'Sin .bak no hay nada que restaurar.');

// 3. Segundo guardado: el previo queda como backup y el botón ya tiene sentido.
writeAccountsFile({ file, fs, safeStorage: fakeSafeStorage, accounts: normalizeAccounts([
  { id: 1, label: 'Uno', username: 'uno@ejemplo.test', password: 'secreto1' },
  { id: 2, label: 'Dos', username: 'dos@ejemplo.test', password: 'secreto2' },
  { id: 3, label: 'Tres', username: 'tres@ejemplo.test', password: 'secreto3' }
]), normalize: normalizeAccounts });
assert.equal(fs.existsSync(backupFile), true, 'El segundo guardado debe dejar accounts.enc.bak.');
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }).accounts.length, 3);
assert.equal(hasAccountsBackup({ file, backupFile, fs }), true, 'Con .bak distinto del principal hay algo que restaurar.');

// 4. El principal corrupto cae al backup, y se dice que se recuperó.
fs.writeFileSync(file, Buffer.from('no-es-un-bloque-valido'));
const recovered = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(recovered.accounts.length, 2, 'Con el principal corrupto hay que recuperar del backup.');
assert.equal(recovered.source, 'backup');
assert.equal(recovered.recovered, true, 'Recuperar del backup no puede ser silencioso: el renderer lo muestra.');
assert.equal(fs.existsSync(`${file}.corrupt`), true, 'El fichero dañado debe conservarse como .corrupt.');

// 5. Principal y backup ilegibles: error claro, no excepcion opaca.
fs.writeFileSync(file, Buffer.from('roto'));
fs.writeFileSync(backupFile, Buffer.from('tambien roto'));
assert.throws(
  () => readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }),
  /No se pudieron leer las cuentas guardadas/,
  'Con ambos ficheros ilegibles el error debe ser explicito y en español.'
);

// 6. Restaurar: sin copia no hay nada que hacer, y se dice.
fs.rmSync(backupFile, { force: true });
const sinCopia = restoreAccountsBackup({ file, backupFile, fs, safeStorage: fakeSafeStorage, normalize: normalizeAccounts });
assert.equal(sinCopia.ok, false);
assert.match(sinCopia.error, /No hay copia de seguridad/, 'Sin .bak la respuesta tiene que explicarlo.');
assert.equal(hasAccountsBackup({ file, backupFile, fs }), false, 'Sin .bak el botón no puede enseñarse.');

// 7. Restaurar de verdad: el backup se promueve con .tmp + rename, nunca copiado
// encima. Un copyFileSync(backup, file) se puede cortar y dejar accounts.enc a medias,
// que es justo el estado que el botón existe para arreglar.
fs.writeFileSync(backupFile, fakeSafeStorage.encryptString(JSON.stringify(normalizeAccounts([
  { id: 1, label: 'Rescatada', username: 'rescate@ejemplo.test', password: 'clave-rescatada' }
]))));
espia.reset();
const restaurado = restoreAccountsBackup({ file, backupFile, fs: espia, safeStorage: fakeSafeStorage, normalize: normalizeAccounts });
assert.equal(restaurado.ok, true, `La restauración debe responder ok: ${JSON.stringify(restaurado)}`);
assert.equal(restaurado.restored, true);
assert.equal(restaurado.preservedCorrupt, true, 'El principal ilegible se conserva como .corrupt antes de sustituirlo.');
const copiaDirecta = espia.calls.filter((entry) => entry.op === 'copy' && entry.to === file);
assert.deepEqual(copiaDirecta, [], `La restauración no puede copiar encima de accounts.enc: ${JSON.stringify(espia.calls)}`);
assert.ok(
  espia.calls.some((entry) => entry.op === 'rename' && entry.from === temporal && entry.to === file),
  `La restauración renombra un temporal sobre accounts.enc: ${JSON.stringify(espia.calls)}`
);
const trasRestaurar = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(trasRestaurar.accounts.length, 1, 'Después de restaurar se leen las cuentas de la copia.');
assert.equal(trasRestaurar.accounts[0].username, 'rescate@ejemplo.test');
assert.equal(trasRestaurar.accounts[0].password, 'clave-rescatada');
assert.equal(trasRestaurar.source, 'file', 'Tras restaurar, el principal es el bueno: ya no se recupera nada.');
assert.equal(hasAccountsBackup({ file, backupFile, fs }), false, 'Restaurado, el .bak es idéntico: el botón debe esconderse solo.');

// Y volver a pulsar no puede ser un botón que no hace nada.
const repetido = restoreAccountsBackup({ file, backupFile, fs, safeStorage: fakeSafeStorage, normalize: normalizeAccounts });
assert.equal(repetido.ok, false, 'Restaurar dos veces seguidas no puede decir que sí.');
assert.match(repetido.error, /nada que restaurar/, 'La segunda restauración tiene que decirlo.');

// 8. Deshacer un guardado válido pero equivocado: el principal se lee bien y aun así
// hay algo que restaurar. Si el botón se escondiera con "el principal se lee bien",
// el único caso que queda —guardar por error— se quedaría sin salida.
fs.writeFileSync(backupFile, fakeSafeStorage.encryptString(JSON.stringify(normalizeAccounts([
  { id: 1, label: 'Antes del error', username: 'antes@ejemplo.test', password: 'clave-buena' }
]))));
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }).accounts[0].username,
  'rescate@ejemplo.test', 'Punto de partida: el principal es la generación mala.');
const deshecho = restoreAccountsBackup({ file, backupFile, fs, safeStorage: fakeSafeStorage, normalize: normalizeAccounts });
assert.equal(deshecho.ok, true, 'Un principal legible pero distinto también se puede deshacer.');
assert.equal(deshecho.preservedCorrupt, false, 'Un principal que se lee bien no es un archivo dañado: no se etiqueta como .corrupt.');
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }).accounts[0].password, 'clave-buena');

// 9. Si la copia no se pudo tomar, la escritura sigue y el aviso sale. Perder la copia
// anterior callado es el fallo que la copia existe para evitar; abortar el guardado
// del usuario, en cambio, solo empeora una situación ya degradada: el .bak que queda
// es una generación anterior válida y la escritura principal es atómica.
const avisos = [];
const sinCopiaPosible = new Proxy(fs, {
  get(target, property) {
    if (property === 'copyFileSync') {
      return (from, to) => {
        if (String(to).startsWith(backupFile)) throw new Error('archivo bloqueado por el antivirus');
        return target.copyFileSync(from, to);
      };
    }
    return target[property];
  }
});
assert.equal(writeAccountsFile({
  file, fs: sinCopiaPosible, safeStorage: fakeSafeStorage,
  accounts: normalizeAccounts([{ id: 7, label: 'Siete', username: 'siete@ejemplo.test', password: 'ultima' }]),
  normalize: normalizeAccounts,
  onWarning: (message) => avisos.push(message)
}), true);
assert.equal(avisos.length, 1, `Si la copia falla tiene que haber un aviso, no un silencio: ${JSON.stringify(avisos)}`);
assert.match(avisos[0], /copia de seguridad/i, 'El aviso nombra lo que falló.');
assert.match(avisos[0], /antivirus/, 'El aviso dice por qué.');
const guardadoIgual = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(guardadoIgual.accounts[0].password, 'ultima', 'La escritura principal se completa aunque la copia falle.');
assert.equal(guardadoIgual.source, 'file', 'El .bak intacto no se confunde con el principal nuevo.');

// 9 bis. Un principal que no se descifra no puede promocionarse a copia: se estaria
// tirando la ultima copia buena para guardar el mismo desastre dos veces.
fs.writeFileSync(file, Buffer.from('basura-que-no-descifra'));
const avisosDanado = [];
writeAccountsFile({
  file, fs, safeStorage: fakeSafeStorage,
  accounts: normalizeAccounts([{ id: 8, label: 'Ocho', username: 'ocho@ejemplo.test', password: 'ocho-clave' }]),
  normalize: normalizeAccounts,
  onWarning: (message) => avisosDanado.push(message)
});
assert.equal(avisosDanado.length, 1, `Un principal dañado también tiene que avisar: ${JSON.stringify(avisosDanado)}`);
assert.match(avisosDanado[0], /dañado/, 'El aviso distingue "no se pudo copiar" de "no se pudo descifrar".');
const copiaIntacta = readAccountsFile({ file: backupFile, backupFile: `${backupFile}.bak`, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts });
assert.equal(copiaIntacta.accounts[0].password, 'clave-buena', 'La copia anterior legible no puede desaparecer al guardar sobre un principal roto.');
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }).accounts[0].password,
  'ocho-clave', 'El guardado nuevo sí se aplica al principal.');

// 10. Sin cifrado disponible no se toca el disco: ni el principal ni la copia.
const sinCifrar = { isEncryptionAvailable: () => false, encryptString: () => Buffer.alloc(0), decryptString: () => '' };
assert.throws(
  () => writeAccountsFile({ file, fs, safeStorage: sinCifrar, accounts, normalize: normalizeAccounts }),
  /cifrado seguro/i,
  'Sin cifrado disponible el guardado se niega, no deja un archivo vacío.'
);
assert.throws(
  () => readAccountsFile({ file, backupFile, fs, safeStorage: sinCifrar, defaults: 4, normalize: normalizeAccounts }),
  /cifrado seguro/i,
  'Sin cifrado disponible la lectura se niega en vez de devolver cuentas vacías.'
);
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4, normalize: normalizeAccounts }).accounts[0].password,
  'ocho-clave', 'Los dos intentos negados no han tocado accounts.enc.');

fs.rmSync(dir, { recursive: true, force: true });
console.log('Credentials backup smoke passed: defaults, ida y vuelta, escritura atómica, backup, recuperacion, restauracion atomica y error controlado.');
