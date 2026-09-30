const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { accountTemplateText, parseAccountsTemplate } = require('../src/account-transfer');

const template = accountTemplateText();
assert.equal(template.startsWith('\uFEFF# IDLE POKE LAUNCHER'), true);
const sectionLines = (text) => text.split(/\r?\n/).filter((line) => /^\[CUENTA \d+\]/.test(line.trim()));
assert.equal(sectionLines(template).length, 4);

const completed = template
  .replace('nombre_panel=Cuenta 1', 'nombre_panel=Principal')
  .replace('usuario=\r\ncontrasena=', 'usuario=shock1@example.com\r\ncontrasena=clave=uno')
  .replace('usuario=\r\ncontrasena=', 'usuario=shock2\r\ncontrasena=clave dos')
  .replace('usuario=\r\ncontrasena=', 'usuario=shock3\r\ncontrasena=clave-tres')
  .replace('usuario=\r\ncontrasena=', 'usuario=shock4\r\ncontrasena=clave_cuatro');

const accounts = parseAccountsTemplate(completed);
assert.deepEqual(accounts.map(({ label, username, password }) => ({ label, username, password })), [
  { label: 'Principal', username: 'shock1@example.com', password: 'clave=uno' },
  { label: 'Cuenta 2', username: 'shock2', password: 'clave dos' },
  { label: 'Cuenta 3', username: 'shock3', password: 'clave-tres' },
  { label: 'Cuenta 4', username: 'shock4', password: 'clave_cuatro' }
]);

assert.throws(() => parseAccountsTemplate(completed.replace('[CUENTA 4]', '[CUENTA 3]')), /repetida/);
assert.throws(() => parseAccountsTemplate(template), /necesita usuario y contraseña/);

// Plantillas personalizadas: de 1 a N cuentas (máximo 32).
const single = accountTemplateText(1);
assert.equal(sectionLines(single).length, 1);
const six = accountTemplateText(6)
  .replace(/usuario=/g, 'usuario=multi')
  .replace(/contrasena=/g, 'contrasena=secreta');
const multiAccounts = parseAccountsTemplate(six);
assert.equal(multiAccounts.length, 6);
assert.deepEqual(multiAccounts.map((row) => row.username), Array(6).fill('multi'));

// Una sola cuenta es válida.
const oneAccount = accountTemplateText(1)
  .replace('usuario=', 'usuario=unica')
  .replace('contrasena=', 'contrasena=sola');
assert.equal(parseAccountsTemplate(oneAccount).length, 1);

// Las secciones deben ser consecutivas desde [CUENTA 1].
const gap = '[CUENTA 1]\nnombre_panel=A\nusuario=a\ncontrasena=x\r\n[CUENTA 3]\nnombre_panel=B\nusuario=b\ncontrasena=y';
assert.throws(() => parseAccountsTemplate(gap), /consecutivas/);

// Más de 32 cuentas se rechaza.
const tooMany = Array.from({ length: 33 }, (_, index) => `[CUENTA ${index + 1}]\nnombre_panel=C${index + 1}\nusuario=u\ncontrasena=p`).join('\r\n');
assert.throws(() => parseAccountsTemplate(tooMany), /Máximo 32/);

// La plantilla descargada desde el launcher debe llevar el número de cuentas que
// hay, no las 4 por defecto. Aquí solo se comprueba el fuente, como en
// multi-game-userscripts-static-smoke.js: si la llamada en producción vuelve a
// quedarse sin argumento, la aserción falla aunque accountTemplateText siga bien.
const mainSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
assert.match(mainSource, /accountTemplateText\((?!\))/);

console.log(JSON.stringify({ ok: true, accounts: accounts.length, preservesEquals: accounts[0].password === 'clave=uno', multi: multiAccounts.length, templateConArgumento: true }));

