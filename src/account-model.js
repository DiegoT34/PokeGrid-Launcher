'use strict';

// Modelo de cuentas dinámicas del launcher.
// Las cuentas tienen un id estable que define su partición persistente
// (cookies y sesión se conservan aunque se añadan o eliminen otras cuentas).

const DEFAULT_ACCOUNT_COUNT = 4;
const MAX_ACCOUNTS = 32;

function accountPartition(accountId) {
  return `persist:pokegrid-${accountId}`;
}

function normalizeAccountProxy(value) {
  const protocol = ['http', 'socks5'].includes(String(value?.protocol || '').toLowerCase()) ? String(value.protocol).toLowerCase() : '';
  const host = String(value?.host || '').trim().slice(0, 253);
  const port = Number(value?.port);
  const valid = value?.enabled === true && Boolean(protocol) && Boolean(host) && Number.isInteger(port) && port >= 1 && port <= 65535;
  return {
    enabled: Boolean(valid),
    protocol: valid ? protocol : '',
    host: valid ? host : '',
    port: valid ? port : 0,
    username: valid ? String(value?.username || '').slice(0, 120) : '',
    password: valid ? String(value?.password || '').slice(0, 200) : ''
  };
}

function normalizeAccounts(value) {
  const rows = Array.isArray(value) ? value : [];
  if (rows.length > MAX_ACCOUNTS) throw new Error(`Máximo ${MAX_ACCOUNTS} cuentas por launcher.`);
  const usedIds = new Set();
  let nextId = 1;
  return rows.map((row) => {
    let id = Number(row?.id);
    if (!Number.isInteger(id) || id < 1 || id > 9999 || usedIds.has(id)) {
      while (usedIds.has(nextId)) nextId += 1;
      id = nextId;
    }
    usedIds.add(id);
    return {
      id,
      label: String(row?.label || `Cuenta ${id}`).slice(0, 40),
      username: String(row?.username || '').slice(0, 180),
      password: String(row?.password || '').slice(0, 300),
      proxy: normalizeAccountProxy(row?.proxy)
    };
  });
}

// Sintaxis de reglas de proxy de Chromium: "host:puerto" aplica a todos los
// protocolos; solo SOCKS lleva prefijo de esquema (socks5://).
function buildProxyRules(proxy) {
  const auth = proxy.username ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password || '')}@` : '';
  if (proxy.protocol === 'socks5') return `socks5://${auth}${proxy.host}:${proxy.port}`;
  return `${auth}${proxy.host}:${proxy.port}`;
}

module.exports = {
  DEFAULT_ACCOUNT_COUNT,
  MAX_ACCOUNTS,
  accountPartition,
  normalizeAccountProxy,
  normalizeAccounts,
  buildProxyRules
};
