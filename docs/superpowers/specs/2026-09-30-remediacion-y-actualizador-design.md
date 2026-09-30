# Especificación de diseño — Remediación, rendimiento y nuevo actualizador

**Proyecto:** IDLE POKE LAUNCHER (`pokegrid-launcher`)
**Fecha:** 2026-09-30
**Estado:** aprobado por el usuario
**Documento de referencia:** [`ANALISIS-COMPLETO-PROYECTO.md`](../../ANALISIS-COMPLETO-PROYECTO.md)

---

## 1. Contexto

`IDLE POKE LAUNCHER` v0.23.0 es un launcher portátil de Electron 43 para Windows que gestiona 1–32 cuentas simultáneas de Poke Idle World en webviews con partición persistente propia, además de instancias de otros juegos web. El análisis completo identificó 25 bugs, 10 problemas de rendimiento, 2 hallazgos críticos de congelamiento del proceso principal y un canal de actualizaciones con problemas estructurales de distribución.

Este diseño addresses los hallazgos críticos sin sacrificar ninguna funcionalidad existente.

## 2. Objetivos

1. Eliminar los dos cuellos de botella críticos: congelamiento del proceso principal y crecimiento no acotado del historial.
2. Corregir los bugs que impiden que las funciones que la UI promete funcionen (opt-out de userscripts, limpiezas incompletas al desinstalar, confirmaciones ausentes, colores de cuenta que se repiten).
3. Reducir ~40 MB el tamaño del paquete distribuible y −5.8 MB el `app.asar`.
4. Reescribir el instalador de actualizaciones para que no dependa de PowerShell, no deje al usuario sin carpeta válida y sea reversible.
5. Eliminar ~4.400 líneas de código muerto de forma incremental y verificable.

## 3. No objetivos (decisiones explícitas del usuario)

- Capa adaptadora de selectores del juego con detección de versión. Se eliminan las funciones muertas pero **no se reestructuran los selectores que sobreviven**.
- Suite de unit tests de la lógica de negocio como objetivo propio. Solo se escriben los tests necesarios para demostrar cada corrección.
- Build `arm64`.
- Canal beta / prereleases.
- Instalador `.exe` firmado (NSIS).
- Firma de código Authenticode (no hay certificado disponible; ver §9).

## 4. Restricciones

- **Cero dependencias de runtime nuevas.** Ni `dependencies` ni `devDependencies`. El instalador nuevo debe usar solo APIs de Node ya disponibles.
- **Cero cambios observables** en cadencias de poll, salvo el desglose interno del monitor de capturas (§6.4).
- **El archivo de capturas (IndexedDB store `captures`) no se toca.** Es el dato de valor del producto.
- **Estrategia de installation in-place**: la nueva versión se instala en la misma carpeta desde la que se lanzó.
- Cada fase es commiteable y verificable por separado; ninguna depende de que la anterior sea perfecta, solo de que esté verde.

---

## 5. Arquitectura de las decisiones

### 5.1 Instalador en Node vía `ELECTRON_RUN_AS_NODE`

**Decisión.** El proceso hijo instalador se ejecuta con el propio binario de la app, con `ELECTRON_RUN_AS_NODE=1` en el entorno. Electron documenta esta variable y la convierten el exe en un proceso Node puro. Se elimina el script PowerShell embebido (~215 líneas en `updater.js:212-445`).

**Consecuencias.**
- Desaparecen `-ExecutionPolicy Bypass`, `-NoProfile`, `-NonInteractive`, `-WindowStyle Hidden` y la dependencia de Windows PowerShell 5.1 (deprecado, ausente en algunas imágenes).
- No se distribuye un `node.exe` adicional.
- El instalador usa `fs` y `crypto` de Node, ya probados en el propio `updater.js`.
- El código del instalador se lee, se revisa y se depura en el mismo lenguaje que el resto del proyecto.

**Riesgo aceptado.** Si el entorno impide ejecutar el binario con esa variable, la actualización falla con un mensaje explícito y el launcher actual sigue intacto. No hay estado parcial porque el swap es de dos renombrados.

### 5.2 Swap in-place de dos ficheros

**Decisión.** Entre dos builds del mismo Electron, solo cambian el `.exe` (Electron Builder lo reestampa con la versión) y `resources/app.asar`. El instalador intercambia esos dos ficheros en lugar de mover 305 MB de directorio.

**Secuencia exacta.**

```
1.  IDLE POKE LAUNCHER.exe      →  IDLE POKE LAUNCHER.exe.old-<ts>   (rename)
2.  IDLE POKE LAUNCHER.exe.new  →  IDLE POKE LAUNCHER.exe             (rename, atómico)
      └─ si el paso 2 falla: se deshace el paso 1. No queda nada roto.
3.  resources/app.asar          →  app.asar.old-<ts>
4.  copiar staged/resources/app.asar → resources/app.asar
5.  copiar de "staged" todo fichero cuya (ruta relativa, tamaño) difiera del destino
      └─ cubre una futura actualización de Electron sin pagar 305 MB
6.  lanzar el .exe nuevo con --pokegrid-update-handshake=<path>
7.  esperar el handshake (processId + executablePath + version coincidentes), 3 intentos
8.  solo tras confirmar: esperar a que mueran los procesos antiguos y borrar los *.old-*
```

**Por qué es posible.** Windows permite **renombrar** un ejecutable en ejecución pero no borrarlo ni sustituirlo. Renombrar no requiere que ningún proceso haya cerrado. Por eso el paso 1 es válido aunque el proceso actual siga vivo.

**Eliminación del matar de procesos.** El padre invoca `app.exit(0)` (ya implementado en `main.js:1431`), lo que arrastra los procesos GPU y renderer. El hijo **nunca** ejecuta `Stop-Process`. Si el padre no desaparece en 15 s, el hijo aborta con un mensaje honesto en `update-status.json` en vez de forzar nada.

**Rollback.** Simétrico: borrar el `.exe` y el `app.asar` nuevos, renombrar los `.old-*` de vuelta, relanzar. Si el `.exe` nuevo no arranca, nunca hubo handshake y el sistema viejo sigue en disco.

**Degradación segura.** Si el directorio de destino no permite escribir, el hijo aborta **antes** de cualquier rename, con el `errno` real y una recomendación de mover el launcher a una carpeta con permisos de escritura.

### 5.3 Retención del historial de notificaciones

**Decisión.** 90 días y 5.000 entradas, lo que se alcance antes. Configurable por el usuario.

**Aplicación.**
- **IndexedDB**: migración a versión 3 con índice `createdAt` sobre el store `notifications`. La poda usa un cursor de rango sobre ese índice (`IDBKeyRange.upperBound(corteISO)`) y borra por clave primaria, sin cargar el store completo.
- **Memoria**: el array `launcherNotifications` se recorta a 2.000 entradas en cada inserción.
- **`notificationSourceKeys`**: se reconstruye desde el conjunto ya podado (el mecanismo de hidratación existente).
- **`hydrateNotificationArchive()`**: deja de hacer `getAll()`; lee solo lo que sobrevive al corte.
- **Preferencia persistida**: nuevo `userData/user-preferences.json` con `{ notificationRetentionDays }`. El renderer escribe ahí (preferencias, no secretos); main lo lee si necesita.

**El store `captures` no se modifica.** Sin cambios de esquema ni de poda.

### 5.4 Caché de estado en el proceso principal

**Decisión.** Nuevo módulo `src/state-cache.js` con dos cachés write-through, invalidadas por la tupla `(mtimeMs, size)` del fichero.

```
readAccountsCached()      → { id, label, username, password, proxy }[]
readUserScriptsCached()   → Map<id, script>   (además: scripts[], byShopId)
invalidateUserscripts()
```

- `authorizeUserScriptRuntime` pasa a ser **O(1)** por `id` en lugar de parsear el JSON completo y buscar en un array.
- `getGameAccountIndex` deja de descifrar con DPAPI en cada llamada.
- `normalizeUserScript` recibe un tercer parámetro `{ validate }`. El `new Function()` de comprobación de sintaxis **solo se ejecuta al guardar**, nunca al leer. Es el coste de CPU dominante de la ruta caliente.
- Las funciones de escritura (`saveUserScript`, `removeUserScript`, `writeUserScripts`) actualizan la caché directamente (write-through), sin necesidad de `stat`.
- **Techo total:** `USER_SCRIPT_TOTAL_LIMIT = 25 MB` además del `USER_SCRIPT_CODE_LIMIT` por script, validado en `userscripts:save` con mensaje claro.

---

## 6. Diseño por fase

### Fase 0 — Saneación (riesgo nulo)

| Cambio | Detalle |
|---|---|
| `pnpm check` completo | Añadir `src/updater.js`, `src/account-transfer.js`, `src/pokepedia-preload.js` a la lista de `node --check` |
| `.gitignore` | Añadir `dist-*/`, `PokeGrid-Script-Shop/`, `*.log` |
| Assets muertos | Eliminar `src/assets/idle-poke-logo.png` y `src/assets/idle-poke-logo-keyed.png` (verificado: solo se referencia `idle-poke-logo-512.png`) |
| Release 0.23.0 | Commit de la feature pendiente y tag `v0.23.0` para desbloquear el pipeline |

### Fase 1 — Bugs críticos de userscripts

| ID | Cambio | Fichero |
|---|---|---|
| BUG-01/02 | `scriptAppliesToPanel` pasa a opt-out: `script.accounts?.[panel.index] === false` bloquea. Renderer y main quedan alineados con la documentación | `userscripts.js:796-802` |
| BUG-03 | `event.stopPropagation()` en Escape dentro de `#scriptFindInput` | `userscripts.js:1446-1448` |
| BUG-04 | `window.confirm()` antes de instalar un script de la Shop marcado como "modificado localmente", indicando que se pierden los cambios | `userscripts.js:619, 647` |
| BUG-10 | Comparar `@version` al resolver el destino de un `.user.js` arrastrado; solo pisa si la versión entrante es mayor o igual | `userscripts.js:930-940` |
| BUG-13 | Al desinstalar/borrar: enviar al guest una orden de limpieza de `localStorage` (`pokegrid:userscript:<id>:storage`), `<style data-pokegrid-userscript>`, toasts y la entrada del registro anti-duplicado | `userscripts.js:726-745, 868-882` + `guest-preload.js` |
| BUG-08 | Reordenar `saveEditor` para que `enabled` se evalúe antes que las cuentas, permitiendo guardar un script desactivado sin cuentas | `userscripts.js:838-866` |
| BUG-18 | Validar los 58 `querySelector` del arranque; si falta alguno, registrar un error claro en vez de dejar `window.pokeGridUserScriptManager` indefinido en silencio | `userscripts.js:23-79` |
| BUG-23 | Generar 12 colores de cuenta por rotación HSL a partir del índice, sustituyendo el array fijo de 4 | `renderer.js:241` |
| R-B2 | `confirm()` al eliminar una cuenta informando que el historial de las posiciones siguientes se reasigna | `renderer.js:8567-8571` |
| R-B4 | Chip "VPN" en la barra del panel cuando `account.proxy.enabled`, con tooltip de protocolo/host/puerto sin credenciales | `renderer.js:8355`, `styles.css` |
| R-E10 | Sustituir las 5 literales "las cuatro cuentas" por texto derivado de `accountCount()` | `index.html:21,110,183`, `renderer.js:7678, 8639, 8653` |
| R-B18 | Botón "Desvincular archivo .txt" que borra `accounts-source.json` | `main.js` (nuevo handler), `index.html` |
| S-1 | Validar `event.sender === mainWindow.webContents` en los handlers IPC de cuentas y assets | `main.js` |

**Test de aceptación:** `tests/multi-game-userscripts-smoke.js` y `tests/userscripts-manager-smoke.js` ampliados con los casos 1, 5, 12 y 32 cuentas para BUG-01/02.

### Fase 2 — Caché del proceso principal (P-01)

1. Nuevo `src/state-cache.js` con la API de §5.4. Lógica pura y testeable, siguiendo el patrón de `account-model.js`.
2. `main.js` enruta **todas** las lecturas de cuentas y userscripts a través de la caché. Se eliminan las llamadas directas a `readAccounts()` / `readUserScripts()` en las rutas calientes (`getGameAccountIndex`, `authorizeUserScriptRuntime`, `currentAccountCount`).
3. `normalizeUserScript(value, existing, { validate })`. Las llamadas de lectura pasan `validate:false`.
4. `USER_SCRIPT_TOTAL_LIMIT` validado en `saveUserScript`.
5. `getGameAccountIndex` cachea además un `Map<id, index>` invalidado en la misma escritura.

**Tests:** `tests/account-model-smoke.js` ampliado (caché coherente con escrituras, invalidación por `mtime`, aplicación de `validate`); nuevo `tests/state-cache-smoke.js` para la lógica de caché con `mtime` simulado.

**Aceptación:** un E2E que instale 5 userscripts y dispare 200 `GM_xmlhttpRequest` contra un servidor local debe mantener el proceso principal por debajo de 100 ms de trabajo por petición (medido con `process.cpuUsage`).

### Fase 3 — Retención del historial (P-02)

1. Migración de `pokegrid-capture-archive-v1` a versión 3 con índice `createdAt` en `notifications`.
2. `pruneNotificationArchive({maxAgeMs, maxEntries})` con cursor de rango. Se ejecuta una vez al arrancar, antes de hidratar.
3. Recorte del array en memoria a 2.000 en `unshift`.
4. `hydrateNotificationArchive()` deja de usar `getAll()`; hidrata desde el conjunto podado.
5. `user-preferences.json` con `notificationRetentionDays` (por defecto 90) y control en el modal de cuentas.

**Tests:** `tests/memory-cleanup-safety-smoke.js` ampliado con un escenario de 6.000 notificaciones inyectadas que verifica el tamaño tras la poda, que las de más de 90 días desaparecen y que la información de shiny/legendario se conserva.

### Fase 4 — Rendimiento del renderer

| ID | Cambio | Detalle |
|---|---|---|
| R-A6 | `cachedSource(fn)` | Nuevo helper que memoiza `fn.toString()` en un `Map` con clave por función. Sustituye las 16 llamadas directas |
| R-A5 | `Intl` hoisted | 4 constantes a nivel de módulo: reloj corto, reloj largo, hora de hunts, fecha de notificaciones |
| R-A4 | Debounce 120 ms en los 6 filtros de notificaciones | `renderer.js:8779-8782` deja de llamar `renderNotifications` directo en `input` |
| R-A7 | `renderHuntAnalyzer` incremental | Reutiliza las 9 tarjetas de métricas y las filas de drops; solo actualiza `textContent` cuando la estructura no cambia. **La cadencia sigue en 1.5 s** |
| R-A8 | `REMOTE_IMAGE_CACHE_LIMIT` 48 → 14 | `main.js:24` |
| R-A9 | Desglose del monitor de capturas | `captureSnapshotScript({ queueOnly: true })` genera un cuerpo mínimo que solo drena `window.__pokeGridCaptureQueue` y `__pokeGridDefeatQueue` / `__pokeGridDropQueue`. Se usa en el tick de 3.5 s; el snapshot completo del DOM pasa a cada 12 s como respaldo |
| R-A12 | Caché de `panelInstanceId → url` con TTL de 1 s | `userscripts.js:152-165` deja de llamar `webview.getURL()` sincrónicamente decenas de veces por render |

**Aceptación:** con 8 cuentas y Capture Log + Hunt abiertos, el trabajo del renderer por segundo no aumenta al duplicar cuentas, y `pollCaptureNotifications` pasa de ~9 a ~3 llamadas por segundo con 32 cuentas.

### Fase 5 — Nuevo actualizador

**Estructura de ficheros.**
- `src/updater.js` — lado padre. Conserva `prepareUpdate` y toda la verificación. `launchPreparedUpdate` reescrito para generar y lanzar el hijo.
- `src/updater/installer.js` — **nuevo**, lado hijo. Node puro. **No requiere `electron` en ninguna rama.** Lee su configuración de `argv[2]`.

**Contrato padre → hijo** (`install-update.json`):

```jsonc
{
  "launcherPid": 1234,
  "archivePath": "...",           // solo para verificar el hash del exe extraído
  "stagedDir": "...",             // carpeta extraída en userData/updates/
  "installDir": "...",            // dirname(process.execPath)
  "executableName": "IDLE POKE LAUNCHER.exe",
  "asarRelativePath": "resources/app.asar",
  "expectedExeSha256": "…",
  "statusPath": "...",            // userData/update-status.json
  "handshakePath": "...",         // userData/updates/<run>/launcher-ready.json
  "healthCheckSeconds": 30,
  "gracefulWaitSeconds": 8,
  "parentExitTimeoutMs": 15000
}
```

**Estados de `update-status.json`** (mismos nombres que hoy, más dos): `extracting` → `waiting` → `swapping` → `launching` → `cleanup` → `installed`, y `failed`. Se añade `installed` con `cleanupPending` (ya existe como variante).

**Verificación añadida.** El hijo calcula el SHA-256 del `.exe` extraído y lo compara con `expectedExeSha256`, que el padre obtiene del propio ZIP ya verificado. Detecta corrupción de extracción o manipulación del staging.

**Mecanismo de arranque del hijo:**

```js
spawn(process.execPath, ['--pokegrid-install', configPath], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  detached: true, stdio: 'ignore', windowsHide: true
}).unref();
```

**Handshake.** Se mantiene el contrato actual (`main.js:41-62`): el launcher nuevo, en `ready-to-show`, escribe `{processId, executablePath, version, readyAt}` validando que la ruta esté dentro de `userData/updates/`. El hijo valida los tres campos. Se añade: si la versión del handshake no coincide con la esperada, se rechaza.

**Poda de Descargas.** Tras un `installed` confirmado, el padre (en el siguiente arranque) conserva el ZIP + `.sha256` más recientes y borra los anteriores del patrón `IDLE-POKE-LAUNCHER-*-portatil.zip*`. Antes de borrar, comprueba que el tamaño del candidato no sea el de la versión en uso.

**Aviso al usuario.** Al arrancar, `main.js` lee `update-status.json`. Si el estado es `installed` con `cleanupPending`, o `failed`, o `installed` de una versión distinta a la actual, se muestra un aviso no bloqueante con la ruta de los logs y un botón "Abrir carpeta".

**Eliminaciones.** Se borran `updaterPowerShell()` (`updater.js:212-445`), `bootstrapPath`, `installerOutputPath`, `installerErrorPath` y toda la lógica de `Get-OldLauncherProcesses` / `Remove-DirectoryWithRetry` / `$oldBackupDir` / `$targetBackupDir`.

**Se conserva sin cambios.** `normalizeVersion`, `compareVersions`, `safeAssetName`, `safePortableDirectoryName`, `assertGitHubDownloadUrl`, `fetchChecked`, `readLatestRelease`, `downloadFile`, `sha256File`, `persistVerifiedRelease`, `prepareUpdate`, `writeUpdateStatus`, `writeUpdateLaunchHandshake`. Es decir, **toda la seguridad del canal de actualización permanece idéntica**; solo cambia el ejecutor.

**Tests:** `tests/launcher-updater-smoke.js` se amplía con: verificación del hash del exe; rechazo de un hash incorrecto; manifiesto de ficheros (que solo copia lo que difiere); rechazo de un directorio no escribible antes de cualquier rename; secuencia de estados escrita en `update-status.json`. `tests/launcher-updater-integration.js` y `-detached-integration.js` se reescriben contra el hijo real, lo que además elimina la dependencia de `tar` que hoy los rompe en Git Bash.

**Aceptación:** una actualización real ejecutada desde una carpeta de usuario sin permisos de administrador no deja la carpeta original vacía, no borra el atajo, no crea carpetas en Descargas, y un fallo de arranque restaura el `.exe` anterior byte a byte.

### Fase 6 — Código muerto y build

**6.1 Eliminación incremental (10 commits, cada uno verde).**

Orden por dependencia inversa:

1. `farmEnhancedContextScriptLegacy` (187 líneas), `accountProfileSnapshotScriptLegacy` (176), `refreshPanelCaptureLogLegacy` (30) — `renderer.js`. Sin consumidores.
2. `FALLBACK_LABELS` (6) y el bloque `if (false && dock)` (5.236–5.316) — `game-theme.js`.
3. Las 6 funciones `refresh*` nunca invocadas: `refreshAutoHelper`, `refreshHuntAnalyzer`, `refreshProfilePanel`, `refreshTeamPanel`, `refreshCaptureManagement`, `refreshCaptureLog`; más `scoreLegacyTeamMedia`, `markLegacyTeamSlotMedia`, `centerAutoHelperOnOpen`, `findPlayerInfoSource`, `readPlayerSummary`, `refreshPlayerSummary`, `markTeamSlotMedia`, `normalizeTeamToken`, `teamTypePattern`, `getTeamPokemonName`, `scoreTeamMedia`, y las 4 funciones `enableFloating*`, `beginFloatingInteraction`, toda la geometría flotante, y `window.__pgTeamPanelObserver*` / `__pgTeamPlayerSource`.
4. Recorte de `THEME_CSS` a los bloques que sobreviven hoy al autofiltro: `[data-pg-my-pokes-dialog]`, `[data-pg-surface]`, `.pg-float-resizer`, `html.pg-floating-active`. Se eliminan `removeNativePanelRules`, `nativePanelSelector` y los helpers que solo existían para el autofiltro.
5. Arreglo de la fuga: se elimina el patrón create-then-delete de `burger` / `topToggle` / `backdrop` y se sustituye el guardián `burger.dataset.pgBound` por `window.__pgDockBound`.
6. Se deja de escribir `localStorage` en cada `refresh()`; la preferencia se escribe solo en el handler del botón que la cambia.
7. Se elimina `window.__pgDockThemeRefresh` (sin consumidores).
8. Se envuelve `refresh()` y sus sub-llamadas en un único `try/catch` con registro.
9. Actualización de `tests/panel-injection-smoke.js` para verificar el estado **nuevo** (sin autofiltro, sin dock, sin team panel, y que el CSS inyectado solo contenga los cuatro bloques permitidos).
10. Medición del `app.asar` antes/después y registro del tamaño en el mensaje de commit.

**6.2 Build y CI.**

| Cambio | Detalle |
|---|---|
| `electronLanguages` | `["es-419", "es", "en-US"]` en `build.win` → −40 MB |
| `compression` | `"store"` → `"normal"` → −3.1 MB en el asar |
| `extraFiles` | Añadir `LICENSE` (MIT) → cumplimiento |
| `scripts` | `clean` (borra `dist*` y `.build-diagnostics`), `test` (todas las suites de Node), `test:e2e` (todas las de Electron) |
| CI | Añadir un paso con `pnpm test`, `pnpm test:account-model`, `pnpm test:account-transfer` antes de `pnpm dist` |
| CI | Cachear `~/.cache/electron` |

**Aceptación de la fase 6:** el `app.asar` baja de 4.15 MB a **≤ 2.2 MB**; el paquete descomprimido de 305 MB a **≤ 262 MB**; el repositorio baja en ~4.400 líneas; la suite completa está verde.

---

## 7. Plan de pruebas

El objetivo es **garantizar que no se pierde funcionalidad**, no ampliar cobertura.

**Toda fase debe dejar verde:** `pnpm check` + las suites de Node (`account-model`, `account-transfer`, `launcher-updater-smoke`, `userscript-network`, `memory-cleanup-safety`, `script-shop`) + `panel-injection` + `accounts-modal` + `launcher-visual` + `userscripts-manager` + `multi-game-userscripts` (static + electron) + `browser-instances-and-connectivity` + `account-events-and-farm`.

**Tests nuevos, uno por corrección:**

| Test | Cubre |
|---|---|
| `state-cache-smoke.js` (nuevo) | Coherencia caché↔escritura, invalidación por `mtime`, aplicación de `validate` |
| `installer-smoke.js` (nuevo) | Manifiesto de ficheros, secuencia de estados, hash del exe, rechazo de directorio no escribible **antes** de cualquier rename |
| `launcher-updater-integration.js` (reescrito) | Actualización real de principio a fin con el hijo Node |
| `launcher-updater-detached-integration.js` (reescrito) | Igual, con el proceso padre ya cerrado |
| `account-model-smoke.js` (ampliado) | Cuentas 1/5/12/32, alturas de array |
| `userscripts-manager-smoke.js` (ampliado) | Opt-out con 1, 5, 12 y 32 cuentas; script de Shop recién instalado sí se inyecta |
| `memory-cleanup-safety-smoke.js` (ampliado) | 6.000 notificaciones inyectadas → poda correcta, shiny/legendario conservados, arranque acotado |
| `panel-injection-smoke.js` (actualizado) | Estado nuevo de `game-theme.js` |

**No se ejecutan en esta fase:** los tests de scripts personales (`better-market-*`, `chat-translator`, `custom-card-*`, `breeding-*`). Siguen gitignored y fuera de `package.json` (recomendación R-D9 registrada como deuda).

---

## 8. Migración y reversibilidad

| Cambio | Migración | Reversibilidad |
|---|---|---|
| Caché de estado | Ninguna en disco. La caché es un optimisation de memoria; si falla, se degrada a lectura directa | Total (se puede desactivar por bandera) |
| `normalizeUserScript({validate:false})` | Ninguna. Se deja de recompilar al leer | Total |
| Techo de 25 MB de userscripts | Solo afecta a nuevas escrituras que superen el techo. Las ya guardadas se leen igual | El usuario puede borrar scripts |
| IndexedDB v3 | `onupgradeneeded` añade el índice. El store `captures` no se toca | Los datos previos se conservan; la poda es irreversible **por diseño** (90 días) |
| `user-preferences.json` | Archivo nuevo. Ausente ⇒ 90 días por defecto | Borrar el archivo restaura el valor por defecto |
| Opt-out de userscripts | Cambio de comportamiento: un script con `accounts: [true,true,true,true]` **pasará a ejecutarse** en las cuentas 5–32. Esto coincide con la documentación y con lo que la UI ya muestra marcado, pero es un cambio observable | Un usuario que quiera el comportamiento anterior marca esas cuentas explícitamente en el editor |
| Monitor de capturas desglosado | Ninguno. La cola de red se lee igual; solo cambia la frecuencia del snapshot del DOM | Total |
| Instalador Node | El launcher nuevo ya no trae el instalador PowerShell. Un launcher 0.23.0 antiguo que intente actualizar a una versión con instalador Node seguirá funcionando: al arrancar, el nuevo lee `update-status.json` heredado y lo muestra como aviso | Total (el `.exe` y el `app.asar` anteriores se restauran byte a byte) |
| Poda de ZIP en Descargas | Solo al arrancar tras una actualización confirmada | Los ZIP son re-descargables desde la Release |

**Orden de las fases 2, 3 y 6 respecto a la 5:** las fases 2, 3 y 6 **no** cambian el formato de `update-status.json` ni el contrato del handshake, por lo que un launcher antiguo que actualice a uno nuevo seguirá funcionando. La fase 5 introduce el instalador Node, y a partir de ahí los lanzadores antiguos quedan obsoletos solo en su instalador, nunca en su capacidad de arrancar.

---

## 9. Firma de código: mitigaciones sin coste

No hay certificado disponible. Se aplican, en orden:

1. **Verificación del hash del `.exe` extraído**, no solo del ZIP. El hijo del instalador lo comprueba antes de hacer ningún cambio.
2. **Eliminación de `-ExecutionPolicy Bypass`**, la señal que más dispara el antivirus y las políticas corporativas. Este es el cambio de mayor impacto sin coste.
3. **Reducción del binario de 305 MB a ≤ 262 MB** (locales, PNG, compresión). Menos superficie que escanear.
4. **Instrucciones visibles** ante el aviso de SmartScreen, tanto en el README como dentro del propio launcher la primera vez, con captura.
5. **Tarea documentada, no ejecutada:** comprar un certificado OV de código (≈100–200 USD/año) y firmar en el CI con `CSC_LINK`. El punto de cambio es una sola entrada de `build.win` y dos secrets en GitHub. Queda registrada en el README de desarrollo.

---

## 10. Criterios de aceptación globales

- [ ] Todas las suites existentes y las nuevas están verdes.
- [ ] `app.asar` ≤ 2.2 MB. Paquete descomprimido ≤ 262 MB.
- [ ] `pnpm check` cubre los 9 ficheros de `src/`.
- [ ] El CI ejecuta las suites de Node y las 3 E2E núcleo antes de compilar.
- [ ] Un script recién instalado desde la Shop se inyecta en la cuenta elegida.
- [ ] Un script con `accounts` de 4 flags se inyecta en las cuentas 5 a N (opt-out documentado).
- [ ] El proceso principal mantiene menos de 100 ms de CPU por `GM_xmlhttpRequest` con 5 scripts instalados.
- [ ] El arranque con 6.000 notificaciones históricas termina en el mismo orden de magnitud que con 200.
- [ ] `dist/` y `dist-0230/` no están en git; el asar de ambos tiene la versión vigente.
- [ ] Una actualización real no deja la carpeta original vacía ni crea carpetas en Descargas.
- [ ] Un fallo de arranque de la nueva versión restaura el `.exe` anterior byte a byte.
- [ ] `grep -c 'if (false' src/game-theme.js` devuelve 0.
- [ ] `renderer.js` baja de 9.478 a ≤ 9.200 líneas; `game-theme.js` de 5.377 a ≤ 1.600.
