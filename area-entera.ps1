# Corre el area entera de la entrega, en orden, sin saltarse nada.
#
# LA REGLA
#
# Los seis, o no se compila. La entrega anterior se dio por cerrada sin el que cubria el punto mas
# delicado, y salio una regresion que mataba los inicios de sesion. Aqui no: o pasa todo, o se para.
#
# Cada prueba necesita matar los procesos de la vuelta anterior; si no, el Electron de la prueba
# anterior se queda vivo y el resumen no se imprime. Y cada una tarda entre uno y cuatro minutos,
# asi que el script no falla nunca: escribe el resultado de cada una y sigue, para que se vea el
# panorama entero en vez de solo el primer fallo.
$ErrorActionPreference = 'Continue'
$salida = 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-0310.txt'
Remove-Item $salida -Force -ErrorAction SilentlyContinue
Set-Location 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'

$pruebas = @(
  @{ nombre = 'npm run check';     comando = 'npm';      args = @('run', 'check');                       espera = 20 },
  @{ nombre = 'plantillas-rotas';   comando = 'node';     args = @('buscar-plantilla-rota.cjs', 'tests\descanso-smoke.js', 'tests\sondeos-visibles-smoke.js'); espera = 15 },
  @{ nombre = 'ipc-sender-guard';   comando = 'node';     args = @('tests\ipc-sender-guard-smoke.js');   espera = 20 },
  @{ nombre = 'instancia-vista';    comando = 'tests\lanzar.cjs'; args = @('tests\instancia-vista-smoke.js');        espera = 150 },
  @{ nombre = 'instancia-navegador';comando = 'tests\lanzar.cjs'; args = @('tests\instancia-navegador-smoke.js');    espera = 230 },
  @{ nombre = 'instancia-modos';    comando = 'tests\lanzar.cjs'; args = @('tests\instancia-modos-smoke.js');        espera = 90 },
  @{ nombre = 'instancia-ajustes';  comando = 'tests\lanzar.cjs'; args = @('tests\instancia-ajustes-smoke.js');      espera = 90 },
  @{ nombre = 'instancia-pestanas'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-pestanas-smoke.js');     espera = 95 },
  @{ nombre = 'instancia-cabecera'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-cabecera-smoke.js');   espera = 100 },
  @{ nombre = 'instancia-nueva-pestana'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-nueva-pestana-smoke.js'); espera = 100 },
  @{ nombre = 'instancia-reanudar'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-reanudar-smoke.js');     espera = 105 },
  @{ nombre = 'descanso';           comando = 'tests\lanzar.cjs'; args = @('tests\descanso-smoke.js');             espera = 110 },
  @{ nombre = 'sondeos-visibles';   comando = 'tests\lanzar.cjs'; args = @('tests\sondeos-visibles-smoke.js');      espera = 100 },
  @{ nombre = 'ventanas-emergentes';comando = 'tests\lanzar.cjs'; args = @('tests\ventanas-emergentes-smoke.js');   espera = 155 }
)
# `verificar-paquete` y `comprobar-entrega` NO estan aqui a proposito. Comprueban el ARTEFACTO, y antes
# de compilar mirarian el build de la entrega anterior: darian verde —o fallarian— por un fichero que
# no es el que se va a entregar. Se corren DESPUES de `npm run dist`, y entonces si significan algo.

$fallos = @()
foreach ($p in $pruebas) {
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Add-Content -Path $salida -Value "`n=== $($p.nombre) ===" -Encoding utf8
  $job = Start-Job -ScriptBlock {
    param($cmd, $args)
    Set-Location 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'
    & $cmd @args 2>&1 | Out-File -Encoding utf8 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-una.txt'
  } -ArgumentList $p.comando, $p.args
  Start-Sleep -Seconds $p.espera
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $texto = Get-Content 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-una.txt' -ErrorAction SilentlyContinue
  # MIRAR, no solo buscar un patron de fallo. Un error de Node â€”un throw, una excepcionâ€” no lleva
  # ninguno de los patrones de abajo, y asi se conto como verde una prueba que en realidad habia
  # reventado por no encontrar el ZIP. Eso es exactamente lo que no hay que hacer: mirar el resultado,
  # no suponerlo por la forma de la salida.
  $crudo = ($texto -join "`n")
  $fallo = $texto | Select-String -Pattern '^\s+FALLA|FALLO:|\d+ comprobaciones fallan|comprobaciones fallan:'
  # SIN anclas. Un `^` en PowerShell solo casa al principio del texto entero, y el rastro de un
  # error va en medio: con `^Node.js` esto contou como verde un verificador que habia reventado con
  # ENOENT. Dos veces seguidas el mismo error mio â€”dar por bueno un resultado sin mirar lo que
  # devuelveâ€”, y las dos por una comprobacion mal escrita en vez de por no correr la prueba.
  $excepcion = $crudo -match 'Node\.js v\d|ENOENT|CategoryInfo|FullyQualifiedErrorId|^\s*throw |SyntaxError:'
  if ($fallo -or $excepcion) {
    $fallos += $p.nombre
    Add-Content -Path $salida -Value 'FALLA' -Encoding utf8
    if ($fallo) {
      Add-Content -Path $salida -Value ($fallo | Select-Object -First 3 | ForEach-Object { '   ' + $_.Line }) -Encoding utf8
    } else {
      Add-Content -Path $salida -Value '   (no hay asercion que falle: el comando reventÃ³)' -Encoding utf8
      Add-Content -Path $salida -Value ('   ' + (($crudo -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 2) -join ' | ')) -Encoding utf8
    }
  } else {
    Add-Content -Path $salida -Value 'ok' -Encoding utf8
  }
}

Add-Content -Path $salida -Value "`n=== RESUMEN ===" -Encoding utf8
# Se cuenta, no se escribe el numero a mano. Una vez puesto Â«las nueveÂ» y ya habia diez, que es
# exactamente como un rotulo mal puesto acaba creyendo al que lo lee en vez de a la lista.
if ($fallos.Count) {
  Add-Content -Path $salida -Value ('fallan ' + $fallos.Count + ' de ' + $pruebas.Count + ': ' + ($fallos -join ', ')) -Encoding utf8
} else {
  Add-Content -Path $salida -Value ('las ' + $pruebas.Count + ' pasan') -Encoding utf8
}
'LISTO' | Out-File -Encoding utf8 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-fin.txt'