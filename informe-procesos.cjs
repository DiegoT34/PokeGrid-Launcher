// Mide los procesos del launcher y, si se le pide, cómo evolucionan: cuántos hay, de qué
// tipo, cuánta memoria y cuánta CPU gasta cada uno, y si eso crece con el tiempo.
//
// El launcher es Electron, así que cada ventana y cada `<webview>` es un proceso aparte. Para
// saber qué pasa no basta «hay 15 procesos»: hay que saber de qué tipo es cada uno, porque un
// `--type=renderer` es una webview y un `--type=gpu` es el que dibuja. Y el que se hincha hay
// que verlo en memoria PRIVADA, no solo en el conjunto de trabajo: parte del conjunto de
// trabajo es compartida entre procesos y no es de nadie en concreto.
//
// Uso:
//   node informe-procesos.cjs                 una foto
//   node informe-procesos.cjs 30 6            seis fotos, una cada 30 s
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const GUION = path.join(require('node:os').tmpdir(), 'pokegrid-informe-procesos.ps1');

// El guion va a un fichero y no a `-Command` porque en PowerShell las comillas dobles dentro
// de una cadena de `node -e` se rompen, y aquí hay bastantes.
const PS = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
$salida = @()
foreach ($p in (Get-CimInstance Win32_Process)) {
  if ($p.Name -notmatch 'electron|IDLE|poke') { continue }
  $proc = Get-Process -Id $p.ProcessId
  if ($null -eq $proc) { continue }
  $tipo = 'principal'
  if ($p.CommandLine -match '--type=([a-z]+)') { $tipo = $Matches[1] }
  $rol = ''
  if ($p.CommandLine -match '--utility-sub-type=([a-zA-Z.]+)') { $rol = $Matches[1] }
  elseif ($p.CommandLine -match 'persist:pokegrid-([a-zA-Z0-9_.-]+)') { $rol = 'cuenta ' + $Matches[1] }
  elseif ($p.CommandLine -match '--renderer-client-id=(\d+)') { $rol = 'renderer ' + $Matches[1] }
  $salida += [pscustomobject]@{
    pid      = $p.ProcessId
    padre    = $p.ParentProcessId
    nombre   = $p.Name
    tipo     = $tipo
    rol      = $rol
    conjunto = [math]::Round($proc.WorkingSet64 / 1MB, 1)
    privada  = [math]::Round($proc.PrivateMemorySize64 / 1MB, 1)
    cpuSeg   = [math]::Round($proc.CPU, 1)
    hilos    = $proc.Threads.Count
    handles  = $proc.HandleCount
  }
}
$salida | ConvertTo-Json -Depth 4
`;
fs.writeFileSync(GUION, PS, 'utf8');

function dormir(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function medir() {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', GUION], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  if (r.error) throw r.error;
  const texto = (r.stdout || '').trim();
  if (!texto) return [];
  const datos = JSON.parse(texto);
  return Array.isArray(datos) ? datos : [datos];
}

function resumen(filas) {
  const porTipo = new Map();
  for (const f of filas) {
    const t = f.tipo || 'principal';
    const a = porTipo.get(t) || { n: 0, conjunto: 0, privada: 0, hilos: 0, handles: 0, cpu: 0 };
    a.n++;
    a.conjunto += f.conjunto;
    a.privada += f.privada;
    a.hilos += f.hilos;
    a.handles += f.handles;
    a.cpu += f.cpuSeg;
    porTipo.set(t, a);
  }
  return {
    porTipo,
    n: filas.length,
    conjunto: filas.reduce((s, f) => s + f.conjunto, 0),
    privada: filas.reduce((s, f) => s + f.privada, 0),
    cpu: filas.reduce((s, f) => s + f.cpuSeg, 0)
  };
}

const espera = Number(process.argv[2] || 0);
const cuantas = Number(process.argv[3] || 1);

let anterior = null;
let primera = null;
for (let i = 0; i < cuantas; i++) {
  if (i > 0) dormir(espera * 1000);
  const filas = medir();
  const r = resumen(filas);
  const segundos = i * espera;

  console.log(`\n=== t = ${segundos} s  (${cuantas > 1 ? `medida ${i + 1} de ${cuantas}` : 'una sola foto'}) ===`);
  console.log(`  ${r.n} procesos · ${r.conjunto.toFixed(0)} MB conjunto · ${r.privada.toFixed(0)} MB privada · ${r.cpu.toFixed(0)} s de CPU acumulada`);
  if (anterior && espera > 0) {
    const dPriv = r.privada - anterior.privada;
    const dCpu = r.cpu - anterior.cpu;
    console.log(`  desde la anterior: ${dPriv >= 0 ? '+' : ''}${dPriv.toFixed(0)} MB privada, ${dCpu.toFixed(1)} s de CPU en ${espera} s de reloj`);
  }
  const orden = [...r.porTipo.entries()].sort((a, b) => b[1].privada - a[1].privada);
  for (const [tipo, a] of orden) {
    console.log(`   ${tipo.padEnd(11)} ${String(a.n).padStart(2)} proc  ${String(a.privada.toFixed(0)).padStart(5)} MB privada  ${String(a.conjunto.toFixed(0)).padStart(5)} MB conjunto  ${String(a.cpu.toFixed(0)).padStart(4)} s CPU  ${a.hilos} hilos`);
  }
  const pesados = [...filas].sort((a, b) => b.privada - a.privada).slice(0, 8);
  console.log('  los que más memoria privada:');
  for (const f of pesados) {
    const dCpu = anterior ? (() => { const p = anterior.filas.find((x) => x.pid === f.pid); return p ? f.cpuSeg - p.cpuSeg : null; })() : null;
    console.log(`   pid ${String(f.pid).padStart(6)} ${String(f.tipo).padEnd(9)} ${String(f.privada).padStart(7)} MB priv   ${String(f.conjunto).padStart(6)} MB conj   ${String(f.cpuSeg).padStart(6)} s CPU${dCpu === null ? '' : `  (${dCpu >= 0 ? '+' : ''}${dCpu.toFixed(1)} s)`}   ${f.rol}`);
  }
  anterior = { ...r, filas };
  if (!primera) primera = { ...r, filas };
}
