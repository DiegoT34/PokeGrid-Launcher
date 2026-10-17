# Mide los procesos del launcher que estan corriendo AHORA MISMO, sin instrumentar nada.
# Para cada proceso: tipo real de Chromium (lo dice el --type= de la linea de orden), y memoria.
#
# --type=renderer   es una webview o la ventana
# --type=gpu-process  el proceso de graficos
# --type=utility     utilidades, red, almacenamiento
# sin --type         el proceso principal
$procesos = Get-CimInstance Win32_Process -Filter "Name='IDLE POKE LAUNCHER.exe'"

if (-not $procesos) {
  Write-Output 'no hay ningun proceso del launcher en marcha'
  exit 1
}

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
    CPU = [math]::Round($w.TotalProcessorTime.TotalSeconds, 1)
  }
}

$filas | Sort-Object MB -Descending | Format-Table -AutoSize | Out-String -Width 60 | Write-Output

Write-Output ''
Write-Output '=== por tipo ==='
$filas | Group-Object Tipo | ForEach-Object {
  [pscustomobject]@{
    Tipo = $_.Name
    Cuantos = $_.Count
    TotalMB = [math]::Round(($_.Group | Measure-Object MB -Sum).Sum, 1)
    PrivadoMB = [math]::Round(($_.Group | Measure-Object PrivadoMB -Sum).Sum, 1)
  }
} | Sort-Object TotalMB -Descending | Format-Table -AutoSize | Out-String -Width 60 | Write-Output

$total = ($filas | Measure-Object MB -Sum).Sum
$priv = ($filas | Measure-Object PrivadoMB -Sum).Sum
$cpu = ($filas | Measure-Object CPU -Sum).Sum
Write-Output ''
Write-Output ("procesos: {0}" -f $filas.Count)
Write-Output ("memoria de trabajo total: {0} MB" -f [math]::Round($total, 1))
Write-Output ("memoria privada total: {0} MB" -f [math]::Round($priv, 1))
Write-Output ("CPU acumulada desde el arranque: {0} s" -f [math]::Round($cpu, 1))

$os = Get-CimInstance Win32_OperatingSystem
Write-Output ''
Write-Output ("RAM total de la maquina: {0} MB" -f [math]::Round($os.TotalVisibleMemorySize / 1KB, 0))
Write-Output ("RAM libre ahora: {0} MB" -f [math]::Round($os.FreePhysicalMemory / 1KB, 0))
$lanzador = Get-Process | Where-Object { $_.ProcessName -eq 'IDLE POKE LAUNCHER' } | Measure-Object WorkingSet64 -Sum
Write-Output ("%% de la RAM que ocupa el launcher ahora: {0}%%" -f [math]::Round(($lanzador.Sum / 1MB) / ($os.TotalVisibleMemorySize / 1KB) * 100, 1))