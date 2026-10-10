// Mide el coste del launcher SIN ningún juego cargado, para poder separarlo del coste de las
// webviews del juego.
//
// Por qué: en la instancia de verdad salen 15 procesos y unos 4 GB privados con casi cinco
// núcleos ocupados de forma continua. Eso mezcla dos cosas muy distintas:
//
//   · el launcher en sí —su ventana, sus sondeos, su reloj de un segundo—, que se puede
//     medir solo levantando una copia con una carpeta de datos VACÍA: sin cuentas guardadas
//     no se crea ninguna webview del juego;
//
//   · cada webview del juego, que es un juego WebGL entero y por eso pesa lo que pesa.
//
// Separarlas importa porque las soluciones no son las mismas: al launcher se le puede quitar
// trabajo, al juego no.
//
// La copia es aparte de la que el usuario tenga abierta: el bloqueo de instancia única de
// Electron va por carpeta de datos, y esta usa una vacía en el temporal.
//
// Uso:  node medir-coste-base.cjs [segundos_entre_medidas] [cuantas_medidas]
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RAIZ = __dirname;
const ELECTRON = path.join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');
const GUION_PS = path.join(os.tmpdir(), 'pokegrid-medir-arbol.ps1');

// Se recorre el árbol desde el proceso raíz, no se filtra por nombre: en la máquina puede
// haber OTRA copia del launcher abierta —la del usuario— y sumarla daría un número que no es
// de este experimento.
const PS = String.raw`
param([int]$Raiz)
$ErrorActionPreference = 'SilentlyContinue'
$todos = Get-CimInstance Win32_Process
$hijos = @{}
foreach ($p in $todos) {
  if (-not $hijos.ContainsKey([int]$p.ParentProcessId)) { $hijos[[int]$p.ParentProcessId] = @() }
  $hijos[[int]$p.ParentProcessId] += [int]$p.ProcessId
}
$cola = New-Object System.Collections.Queue
$cola.Enqueue($Raiz)
$vistos = @{}
$salida = @()
while ($cola.Count -gt 0) {
  $id = [int]$cola.Dequeue()
  if ($vistos.ContainsKey($id)) { continue }
  $vistos[$id] = $true
  $proc = Get-Process -Id $id
  if ($proc) {
    $p = $todos | Where-Object { $_.ProcessId -eq $id } | Select-Object -First 1
    $tipo = 'principal'
    if ($p.CommandLine -match '--type=([a-z]+)') { $tipo = $Matches[1] }
    $salida += [pscustomobject]@{
      pid      = $id
      tipo     = $tipo
      nombre   = $proc.ProcessName
      privada  = [math]::Round($proc.PrivateMemorySize64 / 1MB, 1)
      conjunto = [math]::Round($proc.WorkingSet64 / 1MB, 1)
      cpuSeg   = [math]::Round($proc.CPU, 1)
      hilos    = $proc.Threads.Count
    }
  }
  if ($hijos.ContainsKey($id)) { foreach ($h in $hijos[$id]) { $cola.Enqueue($h) } }
}
$salida | ConvertTo-Json -Depth 4
`;
fs.writeFileSync(GUION_PS, PS, 'utf8');

function dormir(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function arbol(raiz) {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', GUION_PS, '-Raiz', String(raiz)], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  if (r.error) throw r.error;
  const texto = (r.stdout || '').trim();
  if (!texto) return [];
  const datos = JSON.parse(texto);
  return Array.isArray(datos) ? datos : [datos];
}

const espera = Number(process.argv[2] || 30);
const cuantas = Number(process.argv[3] || 5);

const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-base-'));
const entorno = { ...process.env, POKEGRID_DIAGNOSTIC_USER_DATA: datos, ELECTRON_ENABLE_LOGGING: '' };
delete entorno.ELECTRON_RUN_AS_NODE;

const hijo = spawn(ELECTRON, ['.'], { cwd: RAIZ, env: entorno, stdio: ['ignore', 'pipe', 'pipe'], detached: false });
let salida = '';
hijo.stdout.on('data', (b) => { salida += b.toString(); });
hijo.stderr.on('data', (b) => { salida += b.toString(); });

const raizPid = hijo.pid;
console.log(`launcher de prueba: pid ${raizPid}, carpeta de datos vacía ${datos}`);
console.log(`(la copia del usuario, si está abierta, no cuenta: se recorre el árbol desde ${raizPid})\n`);

let anterior = null;
try {
  for (let i = 0; i < cuantas; i++) {
    dormir(i === 0 ? 12_000 : espera * 1000);
    const filas = arbol(raizPid);
    if (!filas.length) { console.log(`t=${i * espera}s  el proceso ya no está`); break; }
    const porTipo = new Map();
    for (const f of filas) {
      const a = porTipo.get(f.tipo) || { n: 0, privada: 0, conjunto: 0, cpu: 0, hilos: 0 };
      a.n++; a.privada += f.privada; a.conjunto += f.conjunto; a.cpu += f.cpuSeg; a.hilos += f.hilos;
      porTipo.set(f.tipo, a);
    }
    const total = {
      n: filas.length,
      privada: filas.reduce((s, f) => s + f.privada, 0),
      conjunto: filas.reduce((s, f) => s + f.conjunto, 0),
      cpu: filas.reduce((s, f) => s + f.cpuSeg, 0)
    };
    console.log(`=== t = ${i * espera} s ===`);
    console.log(`  ${total.n} procesos · ${total.privada.toFixed(0)} MB privada · ${total.conjunto.toFixed(0)} MB conjunto · ${total.cpu.toFixed(1)} s CPU`);
    if (anterior && i > 0) {
      console.log(`  en ${espera} s: ${(total.cpu - anterior.cpu).toFixed(1)} s de CPU (${(((total.cpu - anterior.cpu) / espera) * 100).toFixed(0)}% de un núcleo), ${(total.privada - anterior.privada >= 0 ? '+' : '')}${(total.privada - anterior.privada).toFixed(0)} MB privada`);
    }
    const orden = [...porTipo.entries()].sort((a, b) => b[1].cpu - a[1].cpu);
    for (const [tipo, a] of orden) {
      console.log(`   ${tipo.padEnd(10)} ${String(a.n).padStart(2)} proc  ${String(a.privada.toFixed(0)).padStart(5)} MB priv  ${String(a.cpu.toFixed(1)).padStart(7)} s CPU  ${a.hilos} hilos`);
    }
    anterior = total;
  }
} finally {
  try { spawnSync('taskkill', ['/PID', String(raizPid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ya no está */ }
  dormir(1500);
  for (let i = 0; i < 3; i++) {
    try { fs.rmSync(datos, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 }); break; } catch { /* Electron lo tiene abierto un momento */ }
  }
  const quedan = salida.split(/\r?\n/).filter((u) => /accounts|No se pudieron|error/i.test(u)).slice(0, 4);
  if (quedan.length) { console.log('\nlo que dijo el launcher:'); for (const u of quedan) console.log(`  ${u.trim()}`); }
}
