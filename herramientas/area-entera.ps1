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
$salida = Join-Path $carpeta 'area-0390.txt'
Remove-Item $salida -Force -ErrorAction SilentlyContinue
Set-Location 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher'

$pruebas = @(
  @{ nombre = 'npm run check';     comando = 'npm';      args = @('run', 'check');                       espera = 20 },
  @{ nombre = 'plantillas-rotas';   comando = 'node';     args = @('herramientas\buscar-plantilla-rota.cjs', 'tests\descanso-smoke.js', 'tests\sondeos-visibles-smoke.js'); espera = 15 },
  @{ nombre = 'patrones';           comando = 'node';     args = @('herramientas\comprobar-patrones.cjs');   espera = 20 },
  @{ nombre = 'ipc-sender-guard';   comando = 'node';     args = @('tests\ipc-sender-guard-smoke.js');   espera = 20 },
  @{ nombre = 'instancia-vista';    comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-vista-smoke.js');        espera = 150 },
  @{ nombre = 'instancia-navegador';comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-navegador-smoke.js');    espera = 230 },
  @{ nombre = 'instancia-modos';    comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-modos-smoke.js');        espera = 90 },
  @{ nombre = 'instancia-ajustes';  comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-ajustes-smoke.js');      espera = 90 },
  @{ nombre = 'instancia-pestanas'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-pestanas-smoke.js');     espera = 95 },
  @{ nombre = 'instancia-cabecera'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-cabecera-smoke.js');   espera = 100 },
  @{ nombre = 'instancia-nueva-pestana'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-nueva-pestana-smoke.js'); espera = 100 },
  @{ nombre = 'instancia-pantallas';  comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-pantallas-smoke.js');      espera = 100 },
  @{ nombre = 'instancia-reanudar'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\instancia-reanudar-smoke.js');     espera = 105 },
  @{ nombre = 'cuentas-pestanas'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\cuentas-pestanas-smoke.js'); espera = 100 },
  @{ nombre = 'descanso';           comando = 'node'; args = @('tests\lanzar.cjs', 'tests\descanso-smoke.js');             espera = 110 },
  @{ nombre = 'sondeos-visibles';   comando = 'node'; args = @('tests\lanzar.cjs', 'tests\sondeos-visibles-smoke.js');      espera = 100 },
  @{ nombre = 'ventanas-emergentes';comando = 'node'; args = @('tests\lanzar.cjs', 'tests\ventanas-emergentes-smoke.js');   espera = 155 },
  @{ nombre = 'usuarios';          comando = 'node'; args = @('tests\lanzar.cjs', 'tests\userscripts-manager-smoke.js');  espera = 120 },
  @{ nombre = 'cuentas-iconos-0340'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\cuentas-iconos-0340-smoke.js'); espera = 100 },
  @{ nombre = 'perfiles-almacen';   comando = 'node'; args = @('tests\lanzar.cjs', 'tests\perfiles-almacen-smoke.js');   espera = 80 },
  @{ nombre = 'perfiles-sesion';     comando = 'node'; args = @('tests\lanzar.cjs', 'tests\perfiles-sesion-0370-smoke.js'); espera = 80 },
  # Las de lo que se ha tocado en la 0.39.0: los iconos de la barra, el sitio donde se guarda la
  # actualizacion, los dos botones que la sustituyen y el badge que avisa de que hay version nueva.
  @{ nombre = 'launcher-iconos';   comando = 'node'; args = @('tests\launcher-icons-smoke.js');                       espera = 30 },
  # El control por Telegram: lo puro en Node, y el lector y el viaje contra una pagina de verdad.
  @{ nombre = 'control-telegram-puro'; comando = 'node'; args = @('tests\control-telegram-puro-smoke.js'); espera = 40 },
  @{ nombre = 'control-telegram-navegador'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\control-telegram-navegador-smoke.js'); espera = 120 },
  @{ nombre = 'control-telegram-persistencia'; comando = 'node'; args = @('tests\lanzar.cjs', 'tests\control-telegram-persistencia-smoke.js'); espera = 90 },
  @{ nombre = 'launcher-updater';  comando = 'node'; args = @('tests\launcher-updater-smoke.js');                      espera = 40 },
  @{ nombre = 'notification-hub';  comando = 'node'; args = @('tests\lanzar.cjs', 'tests\notification-hub-smoke.js');    espera = 100 },
  @{ nombre = 'update-poll';       comando = 'node'; args = @('tests\lanzar.cjs', 'tests\update-poll-persistence-smoke.js'); espera = 110 },
  @{ nombre = 'launcher-visual';   comando = 'node'; args = @('tests\lanzar.cjs', 'tests\launcher-visual-smoke.js');     espera = 130 }
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
  # NO se usa `Start-Job`. Un job corre en un espacio de ejecucion SIN consola, y Electron es de
  # subsistema grafico: sin consola no escribe en la salida que se le pase. `tests\lanzar.cjs` depende
  # de `stdio: 'inherit'`, que sin consola no es nada, y el guion se quedaba con el fichero vacio y
  # contaba todas las pruebas como «no ha escrito nada». Con `Start-Process` y redireccion a fichero
  # Electron si recibe un mango de verdad, y las pruebas de ahi salen.
  #
  # El limite de tiempo se conserva con `WaitForExit`: sin el, una prueba colgada dejaria el area
  # esperando para siempre, que es como se manifestaba antes el cuelgue de `instancia-cabecera`.
  Remove-Item $salidaDeUna -Force -ErrorAction SilentlyContinue
  Remove-Item "$salidaDeUna.err" -Force -ErrorAction SilentlyContinue
  # El ejecutable se resuelve. `npm` en Windows es un `npm.cmd`, y `Start-Process` no lo encuentra
  # por su cuenta: se le pasa la ruta entera.
  # El ejecutable se resuelve, y se prefiere el `.cmd`. `Get-Command npm` devuelve `npm.ps1`, que no es
  # una aplicacion de Win32 y `Start-Process` lo rechaza con «no es una aplicacion Win32 valida».
  # `npm.cmd` es el mismo npm y si se ejecuta.
  $ejecutable = $p.comando
  if ($ejecutable -notmatch '[/\\]') {
    foreach ($candidato in @("$ejecutable.cmd", $ejecutable)) {
      $resuelto = Get-Command $candidato -CommandType Application -ErrorAction SilentlyContinue
      if ($resuelto) { $ejecutable = $resuelto.Source; break }
    }
    if (-not (Test-Path -LiteralPath $ejecutable -PathType Leaf)) {
      $resuelto = Get-Command $ejecutable -ErrorAction SilentlyContinue
      if ($resuelto) { $ejecutable = $resuelto.Source }
    }
  }
  $proceso = Start-Process -FilePath $ejecutable -ArgumentList $p.args `
    -WorkingDirectory 'C:\Users\Shockviny\Downloads\PokeGrid-Launcher' `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput $salidaDeUna -RedirectStandardError "$salidaDeUna.err"
  if (-not $proceso.WaitForExit(($p.espera + 20) * 1000)) {
    Write-Output "  (se paso de $($p.espera) s y se le mato)"
    $proceso.Kill()
  }
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  $texto = Get-Content $salidaDeUna -ErrorAction SilentlyContinue
  if (Test-Path "$salidaDeUna.err") {
    $texto = @($texto) + @(Get-Content "$salidaDeUna.err" -ErrorAction SilentlyContinue)
  }
  # MIRAR, no solo buscar un patron de fallo. Un error de Node â€”un throw, una excepcionâ€” no lleva
  # ninguno de los patrones de abajo, y asi se conto como verde una prueba que en realidad habia
  # reventado por no encontrar el ZIP. Eso es exactamente lo que no hay que hacer: mirar el resultado,
  # no suponerlo por la forma de la salida.
  $crudo = ($texto -join "`n")
  # OJO con el numero del patron. `\d+ comprobaciones fallan` ALSO casa con «0 comprobaciones
  # fallan», que es justo lo que imprime una prueba que PASA: con ese patron toda prueba salia en
  # rojo por haber escrito bien su resumen. Se pide un numero que no sea cero.
  $fallo = $texto | Select-String -Pattern '^\s+FALLA|FALLO:|comprobaciones fallan: [1-9]|fallan [1-9] '
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
      Add-Content -Path $salida -Value '   (no hay asercion que falle: el comando reventó)' -Encoding utf8
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



