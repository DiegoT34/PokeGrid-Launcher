# Dos muestras separadas en el tiempo para ver si la memoria CRECE con el uso.
#
# Esto es lo que separa "coste inherente" de "fuga": si entre la muestra A y la B el total sube y no
# baja, hay algo que se acumula. Si se mantiene plano, es el precio de tener las pantallas abiertas y no
# un fallo.
#
# Aparte mide el tiempo de ejecucion real y el porcentaje de CPU, que con la suma de CPU acumulada no
# se puede saber: hay que dividir entre el tiempo que lleva vivo.

$espera = 90
$salida = "C:\Users\Shockviny\AppData\Local\Temp\opencode\muestras.txt"

function Muestrear {
  $procesos = Get-CimInstance Win32_Process -Filter "Name='IDLE POKE LAUNCHER.exe'"
  $filas = foreach ($p in $procesos) {
    $tipo = 'principal'
    if ($p.CommandLine -match '--type=([a-z\-]+)') { $tipo = $Matches[1] }
    $w = Get-Process -Id $p.ProcessId -ErrorAction SilentlyContinue
    if (-not $w) { continue }
    [pscustomobject]@{
      Tipo = $tipo
      PID = $p.ProcessId
      MB = [math]::Round($w.WorkingSet64 / 1MB, 1)
      PrivadoMB = [math]::Round($w.PrivateMemorySize64 / 1MB, 1)
      CPU = $w.TotalProcessorTime.TotalSeconds
      Arranque = $w.StartTime
    }
  }
  return $filas
}

$a = Muestrear
if (-not $a) { Write-Output 'no hay procesos del launcher'; exit 1 }
$arranque = ($a | Sort-Object Arranque | Select-Object -First 1).Arranque
$cpuA = ($a | Measure-Object CPU -Sum).Sum
$privA = ($a | Measure-Object PrivadoMB -Sum).Sum
$workA = ($a | Measure-Object MB -Sum).Sum
Write-Output ("muestra A  {0:HH:mm:ss}  procesos {1}  trabajo {2} MB  privado {3} MB  CPU {4} s" -f (Get-Date), $a.Count, $workA, $privA, [math]::Round($cpuA, 1))

Write-Output ("esperando {0} segundos con el launcher tal cual esta..." -f $espera)
Start-Sleep -Seconds $espera

$b = Muestrear
if (-not $b) { Write-Output 'los procesos han desaparecido antes de la segunda muestra'; exit 1 }
$cpuB = ($b | Measure-Object CPU -Sum).Sum
$privB = ($b | Measure-Object PrivadoMB -Sum).Sum
$workB = ($b | Measure-Object MB -Sum).Sum

$segundos = ((Get-Date) - $arranque).TotalSeconds
$cpuPct = ($cpuB - $cpuA) / $espera * 100

Write-Output ("muestra B  {0:HH:mm:ss}  procesos {1}  trabajo {2} MB  privado {3} MB  CPU {4} s" -f (Get-Date), $b.Count, $workB, $privB, [math]::Round($cpuB, 1))
Write-Output ''
Write-Output '=== lo que importa ==='
Write-Output ("tiempo que lleva abierto: {0} h {1} min" -f [math]::Floor($segundos / 3600), [math]::Round(($segundos % 3600) / 60))
Write-Output ("CPU usada en la ventana observada: {0}%" -f [math]::Round($cpuPct, 1))
Write-Output ("equivale a {0} nucleos ocupados a tope" -f [math]::Round($cpuPct / 100, 2))
Write-Output ('cambio de memoria de trabajo en {0} s: {1} MB' -f $espera, [math]::Round($workB - $workA, 1))
Write-Output ('cambio de memoria privada en {0} s: {1} MB' -f $espera, [math]::Round($privB - $privA, 1))
Write-Output ('ritmo de crecimiento: {0} MB de memoria privada por hora en marcha' -f [math]::Round((($privB - $privA) / $espera) * 3600, 1))
Write-Output ''
Write-Output '=== proceso a proceso, lo que mas crecio ==='
foreach ($p in $b) {
  $antes = $a | Where-Object { $_.PID -eq $p.PID }
  if (-not $antes) { Write-Output ("  PID {0}  NUEVO  {1} MB" -f $p.PID, $p.MB); continue }
  $delta = $p.PrivadoMB - $antes.PrivadoMB
  if ($delta -lt 1) { continue }
  Write-Output ("  {0,-10} PID {1,-6} privado {2} MB -> {3} MB   ({4} MB mas)" -f $p.Tipo, $p.PID, $antes.PrivadoMB, $p.PrivadoMB, [math]::Round($delta, 1))
}