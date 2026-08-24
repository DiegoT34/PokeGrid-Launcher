const assert = require('node:assert/strict');
const { accountTemplateText, parseAccountsTemplate } = require('../src/account-transfer');

const template = accountTemplateText();
assert.equal(template.startsWith('\uFEFF# IDLE POKE LAUNCHER'), true);
assert.equal((template.match(/\[CUENTA [1-4]\]/g) || []).length, 4);

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

console.log(JSON.stringify({ ok: true, accounts: accounts.length, preservesEquals: accounts[0].password === 'clave=uno' }));
