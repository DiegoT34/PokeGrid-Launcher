const assert = require('node:assert/strict');
const {
  DEFAULT_ACCOUNT_COUNT,
  MAX_ACCOUNTS,
  accountPartition,
  normalizeAccountProxy,
  normalizeAccounts,
  buildProxyRules
} = require('../src/account-model');

// Migración de la plantilla legacy (4 cuentas sin id) → ids estables 1..4.
const legacy = [
  { label: 'Principal', username: 'a@x.com', password: 'p1' },
  { label: '', username: 'b', password: 'p2' },
  { label: '', username: 'c', password: 'p3' },
  { label: '', username: 'd', password: 'p4' }
];
const migrated = normalizeAccounts(legacy);
assert.equal(migrated.length, 4);
assert.deepEqual(migrated.map((row) => row.id), [1, 2, 3, 4]);
assert.deepEqual(migrated.map((row) => accountPartition(row.id)), [
  'persist:pokegrid-1', 'persist:pokegrid-2', 'persist:pokegrid-3', 'persist:pokegrid-4'
]);
assert.equal(migrated[0].label, 'Principal');

// Cuentas nuevas heredan ids estables y no colisionan.
const grown = normalizeAccounts([
  { id: 1, label: 'A' },
  { id: 2, label: 'B' },
  { id: 5, label: 'E' },
  { label: 'Sin id' }
]);
assert.deepEqual(grown.map((row) => row.id), [1, 2, 5, 3]);

// Los ids duplicados se reasignan.
const duplicated = normalizeAccounts([{ id: 7 }, { id: 7 }, {}]);
assert.equal(new Set(duplicated.map((row) => row.id)).size, 3);

// El límite máximo se respeta.
assert.throws(() => normalizeAccounts(Array.from({ length: MAX_ACCOUNTS + 1 }, () => ({}))), /Máximo/);
const capped = normalizeAccounts(Array.from({ length: MAX_ACCOUNTS }, (_, index) => ({ id: index + 1 })));
assert.equal(capped.length, MAX_ACCOUNTS);

// Proxy válido http con credenciales.
const httpProxy = normalizeAccountProxy({ enabled: true, protocol: 'http', host: 'proxy.example.com', port: 8080, username: 'user', password: 'p@ss' });
assert.deepEqual(httpProxy, { enabled: true, protocol: 'http', host: 'proxy.example.com', port: 8080, username: 'user', password: 'p@ss' });
assert.equal(buildProxyRules(httpProxy), 'user:p%40ss@proxy.example.com:8080');

// Proxy válido socks5 sin credenciales.
const socks = normalizeAccountProxy({ enabled: true, protocol: 'socks5', host: '127.0.0.1', port: 1080 });
assert.equal(socks.enabled, true);
assert.equal(buildProxyRules(socks), 'socks5://127.0.0.1:1080');

// Proxies inválidos se desactivan en lugar de romperse.
for (const invalid of [
  { enabled: true, protocol: 'ftp', host: 'x', port: 80 },
  { enabled: true, protocol: 'http', host: '', port: 80 },
  { enabled: true, protocol: 'http', host: 'x', port: 70000 },
  { enabled: false, protocol: 'http', host: 'x', port: 80 }
]) {
  const normalized = normalizeAccountProxy(invalid);
  assert.equal(normalized.enabled, false);
  assert.equal(normalized.host, '');
}

// Las cuentas conservan su proxy normalizado.
const withProxy = normalizeAccounts([{ id: 1, label: 'A', username: '', password: '', proxy: { enabled: true, protocol: 'socks5', host: 'vpn.local', port: 9050 } }]);
assert.equal(withProxy[0].proxy.enabled, true);
assert.equal(buildProxyRules(withProxy[0].proxy), 'socks5://vpn.local:9050');

console.log(JSON.stringify({ ok: true, defaultCount: DEFAULT_ACCOUNT_COUNT, maxAccounts: MAX_ACCOUNTS, migratedIds: migrated.map((row) => row.id) }));
