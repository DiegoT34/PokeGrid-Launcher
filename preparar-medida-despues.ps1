# Mide el launcher NUEVO con la configuracion REAL del usuario, sin tocar sus datos.
#
# COMO SE HACE, Y POR QUE COPIAR SOLO 5 MB
#
# La carpeta de datos real pesa 2.867 MB, y 2.853 de ellos son las particiones de los navegadores de
# las instancias. Copiar eso para medir seria lento y no aportaria nada: lo que se quiere reproducir es
# «12 instancias y 4 cuentas abiertas», no el historial de cache de medio año.
#
# Asi que se copian SOLO lo que define la configuracion —las cuentas cifradas, la lista de instancias
# del localStorage y los usuarios de scripts— y las particiones se crean limpias. La cuenta de
# procesos y la de RAM es la misma; lo unico que cambia es que el juego tendra que recargar.
#
# Los datos del usuario NO se tocan: la copia va a una carpeta aparte y el launcher se arranca con
# POKEGRID_DIAGNOSTIC_USER_DATA apuntando ahi.
$repo = 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'
$real = "$env:APPDATA\pokegrid-launcher"
$copia = "$env:LOCALAPPDATA\Temp\opencode\medida-despues"

Write-Output '=== preparando una copia limpia con la configuracion real ==='
if (Test-Path $copia) { Remove-Item $copia -Recurse -Force }
New-Item -ItemType Directory -Path $copia -Force | Out-Null

foreach ($uno in @('accounts.enc', 'accounts-source.json', 'userscripts.json', 'update-status.json')) {
  $de = Join-Path $real $uno
  if (Test-Path $de) { Copy-Item $de (Join-Path $copia $uno) -Force; Write-Output "  copiado $uno" }
}
$ls = Join-Path $real 'Local Storage'
if (Test-Path $ls) {
  Copy-Item $ls (Join-Path $copia 'Local Storage') -Recurse -Force
  Write-Output '  copiado Local Storage (la lista de instancias)'
}
$estado = Join-Path $real 'Local State'
if (Test-Path $estado) { Copy-Item $estado (Join-Path $copia 'Local State') -Force; Write-Output '  copiado Local State' }

$medida = (Get-ChildItem $copia -Recurse -File | Measure-Object -Sum Length).Sum
Write-Output ("  la copia pesa {0} MB, frente a {1} MB de la original" -f [math]::Round($medida / 1MB, 1), [math]::Round((Get-ChildItem $real -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Sum Length).Sum / 1MB, 1))
Write-Output ''
Write-Output 'Los datos del usuario NO se han tocado. La copia esta en:'
Write-Output "  $copia"
Write-Output ''
Write-Output 'Para lanzar el launcher nuevo con esta copia:'
Write-Output "  `$env:POKEGRID_DIAGNOSTIC_USER_DATA = '$copia'"
Write-Output "  & '.\dist\IDLE-POKE-LAUNCHER-0.31.0-portatil\IDLE POKE LAUNCHER.exe'"