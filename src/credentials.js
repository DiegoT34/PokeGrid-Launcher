'use strict';

// Lectura, escritura y restauracion del fichero de credenciales cifradas.
//
// fs y safeStorage se reciben por parametro a proposito: main.js no exporta sus
// funciones internas, asi que esta logica solo era comprobable arrancando la
// aplicacion entera. Con las dos dependencias inyectadas el modulo se prueba en
// Node puro, sin ventana y sin tocar el perfil real del usuario. Es el mismo patron
// que src/account-model.js.
//
// Dos reglas que no se pueden romper aqui, porque son las que hacen que esto valga:
//
// 1. accounts.enc se sustituye siempre con .tmp + renameSync, nunca escribiendolo
//    encima. Copiar el backup directamente sobre el principal puede dejar el archivo
//    a medias si el proceso se corta, que es exactamente el estado que la copia de
//    seguridad existe para evitar.
// 2. La copia anterior se toma ANTES de sustituir el principal, y si no se puede
//    tomar sale un aviso. Perder la copia anterior sin enterarse seria un fallo
//    silencioso de la unica proteccion que hay.

const path = require('node:path');

const DEFAULT_ACCOUNTS_ON_FIRST_RUN = 4;
const BACKUP_SUFFIX = '.bak';
const CORRUPT_SUFFIX = '.corrupt';
const TEMPORARY_SUFFIX = '.tmp';

function requireNormalize(normalize, caller) {
  if (typeof normalize !== 'function') throw new Error(`${caller} necesita la función normalize.`);
}

function requireEncryption(safeStorage, action) {
  if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
    throw new Error(`El cifrado seguro del sistema no está disponible${action}.`);
  }
}

// Un solo camino para descifrar: cualquier fallo aqui (bloque vacío, clave que no
// corresponde, JSON a medias) es lo mismo para el principal y para el backup.
function decryptAccounts({ file, fs, safeStorage, normalize }) {
  return normalize(JSON.parse(safeStorage.decryptString(fs.readFileSync(file))));
}

function readBytes(file, fs) {
  return Buffer.from(fs.readFileSync(file));
}

// Devuelve un informe y no solo el array porque el renderer necesita saber de dónde
// salieron las cuentas: recuperar del backup sin decirlo sería tapar el problema que
// el backup acaba de tapar. Un cambio silencioso de contrato a propósito.
function readAccountsFile({ file, backupFile, fs, safeStorage, defaults = DEFAULT_ACCOUNTS_ON_FIRST_RUN, normalize }) {
  requireNormalize(normalize, 'readAccountsFile');
  const count = Math.max(1, Math.floor(Number(defaults) || DEFAULT_ACCOUNTS_ON_FIRST_RUN));
  if (!fs.existsSync(file)) {
    return {
      accounts: normalize(Array.from({ length: count }, (_, index) => ({ id: index + 1 }))),
      source: 'defaults',
      recovered: false,
      corruptPreserved: false
    };
  }
  requireEncryption(safeStorage, '.');

  try {
    return { accounts: decryptAccounts({ file, fs, safeStorage, normalize }), source: 'file', recovered: false, corruptPreserved: false };
  } catch (primaryError) {
    // Un accounts.enc que no se descifra no puede dejar al usuario sin sus cuentas ni
    // sus contrasenas.
    //
    // El dañado se conserva ANTES de mirar la copia anterior, y no solo cuando esta
    // tampoco sirve: si se recupera del .bak y el principal roto se queda en su sitio,
    // el siguiente guardado copia ese garbage a .bak y la ultima copia buena
    // desaparece. Esa es la forma de perder las cuentas que la copia evita.
    const corruptPreserved = preserveCorruptPrimary({ file, fs });
    if (backupFile && fs.existsSync(backupFile)) {
      try {
        return {
          accounts: decryptAccounts({ file: backupFile, fs, safeStorage, normalize }),
          source: 'backup',
          recovered: true,
          corruptPreserved
        };
      } catch {}
    }
    throw new Error(
      `No se pudieron leer las cuentas guardadas (${primaryError.message}). ` +
      (corruptPreserved
        ? `El archivo original se conservó como accounts.enc${CORRUPT_SUFFIX}.`
        : 'Tampoco se pudo conservar una copia del archivo original.')
    );
  }
}

function preserveCorruptPrimary({ file, fs }) {
  try {
    fs.copyFileSync(file, `${file}${CORRUPT_SUFFIX}`);
    return true;
  } catch {
    return false;
  }
}

function writeAccountsFile({ file, fs, safeStorage, accounts, normalize, onWarning = () => {} }) {
  requireNormalize(normalize, 'writeAccountsFile');
  requireEncryption(safeStorage, '. No se guardó ninguna contraseña.');

  const backupFile = `${file}${BACKUP_SUFFIX}`;
  if (fs.existsSync(file)) {
    // Solo se promociona a copia un principal que todavia se descifra. Copiar a .bak
    // un principal danado no daria una copia: daria otra copia del mismo garbage y
    // tiraria la ultima copia buena, que es justo la que puede sacar al usuario de
    // un lio.
    let promoting = true;
    try {
      decryptAccounts({ file, fs, safeStorage, normalize: (rows) => rows });
    } catch {
      promoting = false;
    }
    if (promoting) {
      // Que la copia falle NO aborta el guardado. El .bak que sobrevive es una
      // generacion anterior completa y descifrable, la escritura principal es atomica
      // y abortar dejaria al usuario sin poder guardar cuentas por un archivo bloqueado
      // por el antivirus. Lo que no puede ser es silencioso: ahi se avisa, y el aviso
      // sale del modulo para que main.js lo lleve al renderer.
      try {
        const backupTemporary = `${backupFile}${TEMPORARY_SUFFIX}`;
        fs.copyFileSync(file, backupTemporary);
        fs.renameSync(backupTemporary, backupFile);
      } catch (error) {
        onWarning(
          `No se pudo guardar la copia de seguridad anterior de las cuentas (${error.message}). ` +
          'Las cuentas sí se han guardado, pero la copia anterior se queda en su versión anterior.'
        );
      }
    } else {
      onWarning(
        'El archivo de cuentas anterior está dañado y no se ha podido descifrar, así que no se creó una copia nueva: ' +
        'se conserva la que hubiera para no perder la última versión legible.'
      );
    }
  }

  const temporary = `${file}${TEMPORARY_SUFFIX}`;
  const encrypted = safeStorage.encryptString(JSON.stringify(normalize(accounts)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(temporary, encrypted);
  fs.renameSync(temporary, file);
  return true;
}

// El botón de restaurar solo puede enseñarse si al pulsarlo ocurre algo. Por eso la
// pregunta no es "existe accounts.enc.bak" sino "hay una copia que difiere de lo que
// hay ahora": restaurada la copia, ambos archivos coinciden y el botón se esconde
// solo, sin que nadie tenga que acordarse de borrar nada.
function hasAccountsBackup({ file, backupFile, fs }) {
  if (!backupFile || !fs.existsSync(backupFile)) return false;
  if (!fs.existsSync(file)) return true;
  try {
    return !readBytes(backupFile, fs).equals(readBytes(file, fs));
  } catch {
    // Una copia que no se puede ni leer no se puede restaurar: esconder el botón es
    // mejor que prometer una recuperación que va a fallar.
    return false;
  }
}

function restoreAccountsBackup({ file, backupFile, fs, safeStorage, normalize }) {
  if (!backupFile || !fs.existsSync(backupFile)) {
    return { ok: false, error: 'No hay copia de seguridad de las cuentas.' };
  }

  let backupBytes = null;
  try {
    backupBytes = readBytes(backupFile, fs);
  } catch (error) {
    return { ok: false, error: `No se pudo leer la copia de seguridad (${error.message}).` };
  }

  const primaryExists = fs.existsSync(file);
  if (primaryExists) {
    let primaryBytes = null;
    try {
      primaryBytes = readBytes(file, fs);
    } catch {
      primaryBytes = null;
    }
    if (primaryBytes && primaryBytes.equals(backupBytes)) {
      return { ok: false, error: 'Las cuentas guardadas ya son las de la copia anterior: no hay nada que restaurar.' };
    }
  }

  // El principal que se va a sustituir solo se conserva cuando no se puede leer: es
  // la prueba del problema y puede servir para un rescate a mano. Un principal que se
  // lee bien no está dañado, así que no se etiqueta como .corrupt.
  let preservedCorrupt = false;
  if (primaryExists) {
    let readable = false;
    try {
      requireEncryption(safeStorage, '.');
      decryptAccounts({ file, fs, safeStorage, normalize });
      readable = true;
    } catch {}
    if (!readable) preservedCorrupt = preserveCorruptPrimary({ file, fs });
  }

  const temporary = `${file}${TEMPORARY_SUFFIX}`;
  try {
    fs.copyFileSync(backupFile, temporary);
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.rmSync(temporary, { force: true }); } catch {}
    return { ok: false, error: `No se pudo restaurar la copia anterior (${error.message}).` };
  }
  return { ok: true, restored: true, preservedCorrupt };
}

module.exports = {
  DEFAULT_ACCOUNTS_ON_FIRST_RUN,
  hasAccountsBackup,
  readAccountsFile,
  restoreAccountsBackup,
  writeAccountsFile
};
