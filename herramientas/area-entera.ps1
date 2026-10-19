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
# La carpeta de trabajo se crea si no esta. La carpeta temporal la limpia el sistema de vez en cuando y
# este guion se ha encontrado sin ella: `Add-Content` fallaba en cada linea y el area «pasaba» sin
# haber escrito nada. Un directorio que se puede ir no puede dar por hecho que existe.
$carpeta = 'C:\Users\Shockviny\AppData\Local\Temp\opencode'
if (-not (Test-Path $carpeta)) { New-Item -ItemType Directory -Force -Path $carpeta | Out-Null }
$salida = Join-Path $carpeta 'area-0370.txt'
Remove-Item $salida -Force -ErrorAction SilentlyContinue
Set-Location 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'

$pruebas = @(
  @{ nombre = 'npm run check';     comando = 'npm';      args = @('run', 'check');                       espera = 20 },
  @{ nombre = 'plantillas-rotas';   comando = 'node';     args = @('herramientas\buscar-plantilla-rota.cjs', 'tests\descanso-smoke.js', 'tests\sondeos-visibles-smoke.js'); espera = 15 },
  @{ nombre = 'patrones';           comando = 'node';     args = @('herramientas\comprobar-patrones.cjs');   espera = 20 },
  @{ nombre = 'ipc-sender-guard';   comando = 'node';     args = @('tests\ipc-sender-guard-smoke.js');   espera = 20 },
  @{ nombre = 'instancia-vista';    comando = 'tests\lanzar.cjs'; args = @('tests\instancia-vista-smoke.js');        espera = 150 },
  @{ nombre = 'instancia-navegador';comando = 'tests\lanzar.cjs'; args = @('tests\instancia-navegador-smoke.js');    espera = 230 },
  @{ nombre = 'instancia-modos';    comando = 'tests\lanzar.cjs'; args = @('tests\instancia-modos-smoke.js');        espera = 90 },
  @{ nombre = 'instancia-ajustes';  comando = 'tests\lanzar.cjs'; args = @('tests\instancia-ajustes-smoke.js');      espera = 90 },
  @{ nombre = 'instancia-pestanas'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-pestanas-smoke.js');     espera = 95 },
  @{ nombre = 'instancia-cabecera'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-cabecera-smoke.js');   espera = 100 },
  @{ nombre = 'instancia-nueva-pestana'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-nueva-pestana-smoke.js'); espera = 100 },
  @{ nombre = 'instancia-pantallas';  comando = 'tests\lanzar.cjs'; args = @('tests\instancia-pantallas-smoke.js');      espera = 100 },
  @{ nombre = 'instancia-reanudar'; comando = 'tests\lanzar.cjs'; args = @('tests\instancia-reanudar-smoke.js');     espera = 105 },
  @{ nombre = 'cuentas-pestanas'; comando = 'tests\lanzar.cjs'; args = @('tests\cuentas-pestanas-smoke.js'); espera = 100 },
  @{ nombre = 'descanso';           comando = 'tests\lanzar.cjs'; args = @('tests\descanso-smoke.js');             espera = 110 },
  @{ nombre = 'sondeos-visibles';   comando = 'tests\lanzar.cjs'; args = @('tests\sondeos-visibles-smoke.js');      espera = 100 },
  @{ nombre = 'ventanas-emergentes';comando = 'tests\lanzar.cjs'; args = @('tests\ventanas-emergentes-smoke.js');   espera = 155 },
  @{ nombre = 'usuarios';          comando = 'tests\lanzar.cjs'; args = @('tests\userscripts-manager-smoke.js');  espera = 120 },
  @{ nombre = 'cuentas-iconos-0340'; comando = 'tests\lanzar.cjs'; args = @('tests\cuentas-iconos-0340-smoke.js'); espera = 100 },
  @{ nombre = 'perfiles-almacen';   comando = 'tests\lanzar.cjs'; args = @('tests\perfiles-almacen-smoke.js');   espera = 80 },
  @{ nombre = 'perfiles-sesion';     comando = 'tests\lanzar.cjs'; args = @('tests\perfiles-sesion-0370-smoke.js'); espera = 80 }
)
# `verificar-paquete` y `comprobar-entrega` NO estan aqui a proposito. Comprueban el ARTEFACTO, y antes
# de compilar mirarian el build de la entrega anterior: darian verde —o fallarian— por un fichero que
# no es el que se va a entregar. Se corren DESPUES de `npm run dist`, y entonces si significan algo.
# `verificar-paquete` y `comprobar-entrega` NO estan aqui a proposito. Comprueban el ARTEFACTO, y antes
# de compilar mirarian el build de la entrega anterior: darian verde —o fallarian— por un fichero que
# no es el que se va a entregar. Se corren DESPUES de `npm run dist`, y entonces si significan algo.

$fallos = @()
# El fichero de salida de CADA prueba. Antes no se borraba entre pruebas, y eso hacia que una prueba
# que no escribia nada —porque no existe, o porque revienta antes de imprimir— se leyera con lo que
# hubiera dejado la ANTERIOR. Como todas las anteriores acababan en verde, salian verdes. Asi es como
# `sesiones-0360` dio «ok» siendo que su fichero estaba en `_basura`: no llego a correr y nadie lo
# noto. Un contador que nunca puede dar rojo no es una puerta.
$salidaDeUna = Join-Path $carpeta 'area-una.txt'
foreach ($p in $pruebas) {
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Add-Content -Path $salida -Value "`n=== $($p.nombre) ===" -Encoding utf8
  Remove-Item $salidaDeUna -Force -ErrorAction SilentlyContinue
  # OJO con el nombre del segundo parametro. Se llamaba `$args`, que es una variable AUTOMATICA de
  # PowerShell: el parametro la tapaba, pero `@args` seguia expandiendo la automatica —que aqui esta
  # vacia—, asi que la prueba se lanzaba SIN NINGUN ARGUMENTO y no imprimia nada. Como el guion solo
  # miraba la salida en busca de un fallo, una salida vacia contaba como verde. O sea: este guion lleva
  # tiempo dando «ok» sin haber comprobado ninguna prueba, y cualquier «20 de 20» suyo no valia.
  $job = Start-Job -ScriptBlock {
    param($cmd, $argumentos)
    Set-Location 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'
    & $cmd @argumentos 2>&1 | Out-File -Encoding utf8 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-una.txt'
  } -ArgumentList $p.comando, $p.args
  Start-Sleep -Seconds $p.espera
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $texto = Get-Content $salidaDeUna -ErrorAction SilentlyContinue
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
  # Y una tercera cosa: que la prueba HAYA ESCRITO algo. Sin esto, una prueba que no existe, o que
  # muere antes del primer `console.log`, deja el fichero vacio —que es lo unico que se ha mirado— y
  # sale verde. Un silencio no es un aprobado.
  $sinSalida = -not ($texto | Where-Object { $_.Trim() })
  if ($fallo -or $excepcion -or $sinSalida) {
    $fallos += $p.nombre
    Add-Content -Path $salida -Value 'FALLA' -Encoding utf8
    if ($sinSalida) {
      Add-Content -Path $salida -Value '   (no ha escrito nada: el fichero de la prueba no existe, o revienta antes de imprimir)' -Encoding utf8
    } elseif ($fallo) {
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
'LISTO' | Out-File -Encoding utf8 (Join-Path $carpeta 'area-fin.txt')

