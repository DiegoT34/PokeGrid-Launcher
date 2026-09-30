#!/usr/bin/env node
/**
 * vpn-per-account.cjs — Levanta N instancias locales de v2ray-core (una por nodo)
 * para dar una IP/VPN distinta a cada cuenta extra del launcher.
 *
 * Cada instancia escucha en 127.0.0.1:<base+i> con protocolo "mixed"
 * (HTTP + SOCKS5 en el mismo puerto), saliendo por un servidor diferente.
 * Luego pegas host/puerto en la sección "VPN / IP distinta" del modal Cuentas.
 *
 * Uso:
 *   node scripts/vpn-per-account.cjs up [--servers .vpn/servers.txt] [--count N] [--base-port 10808] [--force]
 *   node scripts/vpn-per-account.cjs status
 *   node scripts/vpn-per-account.cjs down
 *
 * servers.txt: un enlace por línea (vmess://, vless://, trojan:// o ss://).
 * Cero dependencias npm; requiere Node 22+ y Windows (descarga el core de v2fly si no existe).
 */

'use strict';

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_DIR = path.join(ROOT, '.vpn');
const CORE_DIR = path.join(STATE_DIR, 'core');
const CORE_EXE = path.join(CORE_DIR, 'v2ray.exe');
const PIDS_FILE = path.join(STATE_DIR, 'pids.json');
const DEFAULT_SERVERS_FILE = path.join(STATE_DIR, 'servers.txt');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readPids() {
  try {
    const raw = JSON.parse(fs.readFileSync(PIDS_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function pidAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM'; // existe pero no es nuestro
  }
}

async function portListening(port, host = '127.0.0.1', timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const socket = net.connect({ port, host });
      const done = (result) => { socket.destroy(); resolve(result); };
      socket.once('connect', () => done(true));
      socket.once('error', () => done(false));
      socket.setTimeout(800, () => done(false));
    });
    if (ok) return true;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return false;
}

// ---------------------------------------------------------------------------
// Parseo de enlaces de servidor (vmess / vless / trojan / ss)
// ---------------------------------------------------------------------------

function base64UrlDecode(value) {
  let text = String(value).replace(/-/g, '+').replace(/_/g, '/');
  while (text.length % 4 !== 0) text += '=';
  return Buffer.from(text, 'base64').toString('utf8');
}

function parseQuery(query) {
  const params = {};
  for (const pair of String(query || '').split('&')) {
    if (!pair) continue;
    const [key, ...rest] = pair.split('=');
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
  }
  return params;
}

function splitLink(url) {
  // Devuelve { head: parte antes de ? sin fragmento, query, name }
  const hashIndex = url.indexOf('#');
  const name = hashIndex >= 0 ? decodeURIComponent(url.slice(hashIndex + 1)) : '';
  let main = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const qIndex = main.indexOf('?');
  const query = qIndex >= 0 ? main.slice(qIndex + 1) : '';
  if (qIndex >= 0) main = main.slice(0, qIndex);
  return { head: main, query, name };
}

function streamSettingsFrom({ net, security, sni, host, pathValue, fp, pbk, spx, serviceName }) {
  const settings = {};
  const network = ['ws', 'tcp', 'grpc'].includes(net) ? net : 'tcp';
  settings.network = network;
  if (security === 'tls' || security === 'reality') {
    settings.security = 'tls';
    if (sni || host) settings.sni = sni || host;
    if (fp) settings.realitySettings = { fingerprint: fp };
    if (security === 'reality') {
      settings.realitySettings = Object.assign(
        { serverNames: [sni || host || ''].filter(Boolean), shortId: spx || '' },
        fp ? { fingerprint: fp } : {},
        pbk ? { publicKey: pbk } : {}
      );
    } else if (fp) {
      settings.realitySettings = { fingerprint: fp };
    }
  }
  if (network === 'ws' && pathValue) settings.wsOptions = { path: pathValue, headers: host ? { Host: host } : undefined };
  if (network === 'grpc') {
    const serviceNameValue = serviceName || pathValue || '';
    if (serviceNameValue) settings.grpcServices = [{ name: serviceNameValue }];
  }
  return settings;
}

function parseServerLink(rawUrl, fallbackName) {
  const url = String(rawUrl).trim();
  let schemeIndex = url.indexOf('://');
  if (schemeIndex < 0) throw new Error(`Enlace sin esquema: ${url.slice(0, 48)}…`);
  const scheme = url.slice(0, schemeIndex).toLowerCase();
  const body = url.slice(schemeIndex + 3);
  const { head, query, name } = splitLink(body);
  const params = parseQuery(query);
  const label = name || `${scheme} ${head.split('@').pop()}`;

  if (scheme === 'vmess') {
    let data;
    try {
      data = JSON.parse(base64UrlDecode(head));
    } catch {
      throw new Error(`vmess:// ilegible: ${url.slice(0, 48)}…`);
    }
    const security = ['tls', 'reality'].includes(data.tls) ? data.tls : 'none';
    const outbound = {
      protocol: 'vmess',
      settings: {
        vnext: [{
          address: String(data.add || ''),
          port: Number(data.port) || 443,
          users: [{
            id: String(data.id || ''),
            v: data.v || '2',
            aid: Number(data.aid) || 0,
            security: security === 'none' ? 'auto' : 'auto',
            encryption: data.scy || 'auto'
          }]
        }]
      }
    };
    outbound.streamSettings = streamSettingsFrom({
      net: data.net, security, sni: data.host, host: data.host, pathValue: data.path,
      fp: data.fp, pbk: data.pbk, spx: data.spx
    });
    return { label, outbound };
  }

  if (scheme === 'vless' || scheme === 'trojan') {
    const atIndex = head.lastIndexOf('@');
    if (atIndex < 0) throw new Error(`${scheme}:// sin host: ${url.slice(0, 48)}…`);
    const credential = head.slice(0, atIndex);
    const [hostPart] = head.slice(atIndex + 1).split(':');
    const portMatch = head.slice(atIndex + 1).match(/:(\d+)(?:\/|$)/);
    const address = hostPart;
    const port = Number(portMatch?.[1]) || (scheme === 'trojan' ? 443 : 443);
    const security = ['tls', 'reality'].includes(params.security) ? params.security : 'none';
    const outbound = { protocol: scheme };
    if (scheme === 'vless') {
      // V2Fly usa la estructura vnext/users para VLESS.
      outbound.settings = {
        vnext: [{ address, port, users: [{ id: credential, encryption: 'none', level: 0, flow: params.flow || '' }] }]
      };
    } else {
      outbound.settings = { servers: [{ address, port, password: credential, level: 0 }] };
    }
    outbound.streamSettings = streamSettingsFrom({
      net: params.type, security, sni: params.sni, host: params.host || params.hostname,
      pathValue: params.path, fp: params.fp, pbk: params.pbk, spx: params.spx, serviceName: params.serviceName
    });
    return { label, outbound };
  }

  if (scheme === 'ss') {
    let method = '';
    let password = '';
    let address = '';
    let port = 0;
    const atIndex = head.lastIndexOf('@');
    try {
      const decoded = base64UrlDecode(atIndex >= 0 ? head.slice(0, atIndex) : head);
      if (atIndex >= 0) {
        [method, password] = decoded.split(':', 2);
        address = head.slice(atIndex + 1).split(':')[0];
        port = Number(head.slice(atIndex + 1).split(':')[1]) || 0;
      } else {
        // Estilo antiguo: base64(método:clave@host:puerto)
        const [cred, hostPart] = decoded.split('@');
        [method, password] = cred.split(':', 2);
        address = hostPart.split(':')[0];
        port = Number(hostPart.split(':')[1]) || 0;
      }
    } catch {
      throw new Error(`ss:// ilegible: ${url.slice(0, 48)}…`);
    }
    if (!method || !address) throw new Error(`ss:// incompleto: ${url.slice(0, 48)}…`);
    return {
      label,
      outbound: {
        protocol: 'shadowsocks',
        settings: { servers: [{ address, port: port || 8388, method, password: password || '' }] }
      }
    };
  }

  throw new Error(`Esquema no soportado "${scheme}://" (usa vmess/vless/trojan/ss).`);
}

function loadServers(file) {
  if (!fs.existsSync(file)) {
    fail(
      `No existe el archivo de servidores: ${file}\n` +
      'Crea uno con un enlace por línea (vmess://, vless://, trojan:// o ss://), p. ej. .vpn/servers.txt'
    );
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const servers = [];
  for (const [index, line] of lines.entries()) {
    if (/^[#\s]/.test(line)) continue; // comentarios
    try {
      servers.push(parseServerLink(line, `nodo-${index + 1}`));
    } catch (error) {
      console.warn(`AVISO: línea ${index + 1} ignorada → ${error.message}`);
    }
  }
  if (!servers.length) fail('El archivo de servidores no contiene enlaces válidos.');
  return servers;
}

// ---------------------------------------------------------------------------
// Descarga del core v2ray (una sola vez)
// ---------------------------------------------------------------------------

async function downloadFile(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} descargando ${url}`);
  const { Readable } = require('node:stream');
  const { pipeline } = require('node:stream/promises');
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destination));
}

function extractZip(zipPath, destinationDir) {
  ensureDir(destinationDir);
  // Intento 1: tar de Windows (bsdtar, sin shell).
  const systemTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  if (fs.existsSync(systemTar)) {
    const result = spawnSync(systemTar, ['-xf', zipPath, '-C', destinationDir], { encoding: 'utf8' });
    if (result.status === 0) return;
  }
  // Intento 2: PowerShell Expand-Archive.
  const ps = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destinationDir}' -Force`],
    { encoding: 'utf8' }
  );
  if (ps.status !== 0) throw new Error(`No se pudo descomprimir el core: ${ps.stderr || ps.stdout}`);
}

async function ensureCore() {
  if (fs.existsSync(CORE_EXE)) return;
  console.log('Descargando v2ray-core (solo la primera vez)…');
  ensureDir(STATE_DIR);
  const api = await fetch('https://api.github.com/repos/v2fly/v2ray-core/releases/latest').then((r) => r.json());
  const asset = (api.assets || []).find((entry) => /v2ray-windows-64\.zip$/.test(entry.name));
  if (!asset) throw new Error('No se encontró el binario Windows de v2ray-core en la release.');
  const zipPath = path.join(STATE_DIR, 'core.zip');
  await downloadFile(asset.browser_download_url, zipPath);
  extractZip(zipPath, CORE_DIR);
  fs.rmSync(zipPath, { force: true });
  if (!fs.existsSync(CORE_EXE)) fail('La descarga del core terminó pero v2ray.exe no está en .vpn/core/.');
  console.log(`Core instalado en ${CORE_DIR}`);
}

// ---------------------------------------------------------------------------
// Comandos up / status / down
// ---------------------------------------------------------------------------

function buildConfig(ports, outbound) {
  return {
    log: { level: 'warning' },
    inbounds: [
      { listen: '127.0.0.1', port: ports.socks, protocol: 'socks', settings: { udp: true }, tag: 'socks-in' },
      { listen: '127.0.0.1', port: ports.http, protocol: 'http', settings: {}, tag: 'http-in' }
    ],
    outbounds: [outbound, { protocol: 'freedom', tag: 'direct' }],
    routing: { domainStrategy: 'AsIs', rules: [] }
  };
}

async function commandUp(options) {
  const running = readPids().filter((entry) => pidAlive(entry.pid));
  if (running.length && !options.force) {
    fail(`Ya hay ${running.length} instancia(s) activa(s). Usa "down" para detenerlas o "up --force".`);
  }
  if (running.length) await commandDown();

  const servers = loadServers(options.serversFile);
  const count = Math.max(1, Number(options.count) || servers.length);
  const basePort = Number(options.basePort) || 10808;
  // Cada instancia usa dos puertos: SOCKS5 (base+2i) y HTTP (base+2i+1).
  if (!Number.isInteger(basePort) || basePort < 1 || basePort + 2 * count - 1 > 65535) {
    fail('Rango de puertos inválido (usa --base-port entre 1 y 65535).');
  }

  await ensureCore();

  const instances = [];
  for (let i = 0; i < count; i += 1) {
    const server = servers[i % servers.length];
    const socksPort = basePort + 2 * i;
    const httpPort = socksPort + 1;
    const configPath = path.join(STATE_DIR, `config-${socksPort}.json`);
    fs.writeFileSync(configPath, JSON.stringify(buildConfig({ socks: socksPort, http: httpPort }, server.outbound), null, 2));
    instances.push({ index: i, socksPort, httpPort, label: server.label, shared: count > servers.length });
  }

  // Validación previa de cada config (v2ray test) para fallar con mensaje claro.
  for (const instance of instances) {
    const configPath = path.join(STATE_DIR, `config-${instance.socksPort}.json`);
    const check = spawnSync(CORE_EXE, ['test', '-config', configPath], { cwd: CORE_DIR, encoding: 'utf8' });
    if (check.status !== 0) {
      fail(`Config inválida para el puerto ${instance.socksPort}:\n${(check.stderr || check.stdout).trim()}`);
    }
  }

  console.log(`Arrancando ${instances.length} instancia(s): SOCKS5 en 127.0.0.1:${basePort}, +2 por cuenta…`);
  const records = [];
  for (const instance of instances) {
    const configPath = path.join(STATE_DIR, `config-${instance.socksPort}.json`);
    const child = spawn(CORE_EXE, ['run', '-config', configPath], {
      cwd: CORE_DIR,
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    records.push({ pid: child.pid, socksPort: instance.socksPort, httpPort: instance.httpPort, label: instance.label, shared: instance.shared });
  }

  // Verificación de escucha (ambos puertos por instancia).
  const results = [];
  for (const record of records) {
    record.ok = await portListening(record.socksPort) && await portListening(record.httpPort);
    results.push(record);
  }
  fs.writeFileSync(PIDS_FILE, JSON.stringify(records, null, 2));

  console.log('');
  console.log('Estado:');
  for (const record of results) {
    const state = record.ok ? '✅ escuchando' : '❌ no responde';
    console.log(`  ${state}  socks5 127.0.0.1:${record.socksPort} · http 127.0.0.1:${record.httpPort}  (${record.label}${record.shared ? ', nodo compartido' : ''})`);
  }

  if (results.every((r) => r.ok)) {
    console.log('');
    console.log('Para el launcher (modal Cuentas → VPN / IP distinta):');
    results.forEach((record, i) => {
      console.log(`  Cuenta ${5 + i} → protocolo http · host 127.0.0.1 · puerto ${record.httpPort}`);
      console.log(`             (o protocolo socks5 · host 127.0.0.1 · puerto ${record.socksPort})`);
    });
    if (results.some((r) => r.shared)) {
      console.log('');
      console.log('AVISO: hay más instancias que nodos; algunas comparten IP y podrían chocar contra el límite del juego.');
    }
  } else {
    console.log('');
    console.log('Alguna instancia no escuchó. Revisa puertos en uso (--base-port) o ejecuta "status".');
  }
}

async function commandStatus() {
  const records = readPids();
  if (!records.length) {
    console.log('No hay instancias registradas (usa "up").');
    return;
  }
  for (const record of records) {
    const alive = pidAlive(record.pid);
    const listening = alive ? await portListening(record.socksPort, '127.0.0.1', 1500) : false;
    console.log(`  ${alive && listening ? '✅' : '❌'}  PID ${record.pid} · socks5 127.0.0.1:${record.socksPort} · http 127.0.0.1:${record.httpPort} · ${record.label}`);
  }
}

async function commandDown() {
  const records = readPids();
  for (const record of records) {
    if (!pidAlive(record.pid)) continue;
    try {
      process.kill(Number(record.pid));
    } catch {
      spawnSync('taskkill', ['/F', '/T', '/PID', String(record.pid)], { encoding: 'utf8' });
    }
  }
  fs.rmSync(PIDS_FILE, { force: true });
  console.log(`Detenidas ${records.length} instancia(s).`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--servers') options.serversFile = path.resolve(argv[++i] || '');
    else if (arg === '--count') options.count = Number(argv[++i]);
    else if (arg === '--base-port') options.basePort = Number(argv[++i]);
    else if (arg === '--force') options.force = true;
  }
  return options;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  switch (command) {
    case 'up':
      await commandUp(Object.assign({ serversFile: DEFAULT_SERVERS_FILE }, options));
      break;
    case 'status':
      await commandStatus();
      break;
    case 'down':
      await commandDown();
      break;
    default:
      console.log('Uso:');
      console.log('  node scripts/vpn-per-account.cjs up [--servers .vpn/servers.txt] [--count N] [--base-port 10808] [--force]');
      console.log('  node scripts/vpn-per-account.cjs status');
      console.log('  node scripts/vpn-per-account.cjs down');
      process.exitCode = command ? 1 : 0;
  }
}

if (require.main === module) {
  main().catch((error) => fail(error.message || String(error)));
} else {
  module.exports = { parseServerLink, buildConfig, loadServers };
}
