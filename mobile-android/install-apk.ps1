$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$apk = Join-Path $projectDir "IDLE-POKE-LAUNCHER-0.18.3-mobile.apk"
$adb = Join-Path $projectDir ".toolchains\android-sdk\platform-tools\adb.exe"

if (-not (Test-Path -LiteralPath $apk)) {
    throw "No se encontró el APK: $apk"
}
if (-not (Test-Path -LiteralPath $adb)) {
    throw "No se encontró ADB. Instala Android Platform Tools o abre el proyecto con Android Studio."
}

& $adb install -r $apk
