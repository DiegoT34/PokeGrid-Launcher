# CONTEXTO DE PROYECTO — IDLE POKE LAUNCHER

> Documento de handoff para continuar el trabajo en otra sesión/ventana de contexto.
> Última actualización: 2026-09-23 (sesión de desarrollo de "cuentas ilimitadas + VPN por cuenta").

---

## 1. Qué es este proyecto

**IDLE POKE LAUNCHER** (`pokegrid-launcher`) v0.23.0 — launcher portátil de **Electron para Windows** que administra cuentas simultáneas del juego web [Poke Idle World](https://poke.idleworld.online) en una cuadrícula, con sesiones aisladas (cookies/almacenamiento/conexión separados por partición), herramientas de seguimiento (Hunt Analyzer, Capture Log, modo farmeo, estadísticas), centro de userscripts multijuego y auto-actualizador.

- Autor: **DiegoT34** · Licencia MIT · Repo: `github.com/DiegoT34/PokeGrid-Launcher`
- Sin dependencias runtime: solo `electron@43.1.1` + `electron-builder@26.0.12` (devDependencies). Node 22+ requerido.
- Código plano CommonJS/vanilla JS, sin bundler.

### Mapa de archivos clave

| Archivo | Líneas aprox. | Rol |
|---|---|---|
| `src/renderer.js` | ~9.470 | UI principal: cuadrícula, paneles (webviews), Hunt Analyzer, Capture Log (IndexedDB), farmeo, estadísticas, notificaciones, modal de cuentas |
| `src/game-theme.js` | 5.377 | Inyección de temas/paneles dentro del juego |
| `src/styles.css` | ~4.200 | Estilos |
| `src/main.js` | ~1.620 | Proceso principal: sesiones, IPC (~30 handlers), cachés LRU, sprites allowlist, limpieza memoria |
| `src/userscripts.js` | ~1.480 | Centro de userscripts: editor, permisos por cuenta, detección `@match`/`@game`, Script Shop |
| `src/updater.js` | 564 | Auto-actualizador con SHA-256 y rollback |
| `src/account-model.js` | ~66 | **NUEVO en esta sesión**: modelo de cuentas dinámicas + proxy (lógica pura, testeable en Node) |
| `src/account-transfer.js` | ~87 | Plantilla .txt de importación de cuentas (ahora 1–32 secciones) |
| `src/preload.js`, `guest-preload.js` | — | Puentes `contextBridge` (`pokeGrid` / `pokeGridUserScripts`) |

### Arquitectura base (antes del cambio actual)

- **4 cuentas fijas** "quemadas" en toda la app: constante `ACCOUNT_COUNT = 4` en main/renderer/userscripts/account-transfer.
- Cada cuenta = un `<webview>` con partición `persist:pokegrid-{1..4}` (creado por `createPanel(index)` en renderer.js).
- Instancias de otros juegos web: particiones `persist:pokegrid-instance-{id}-{n}` (hasta 6 pantallas cada una) — **no se toca en esta feature**.
- Credenciales cifradas con `safeStorage` (DPAPI Windows) en `userData/credentials`.
- Userscripts autorizados por posición de cuenta (`script.accounts[i]`) + origen del webContents.
- Tests: ~30 suites smoke (Electron + Node) en `tests/`; CI en `.github/workflows/release.yml` (tag `v*.*.*` → build ZIP portátil + SHA-256 + release).

---

## 2. La feature que se está implementando (APROBADA por el usuario)

**Objetivo:** mejorar la función de "crear más instancias" del launcher:
1. **Cuentas ilimitadas** (agregar/eliminar/reordenar) en una sola app — hoy máximo 4 fijas.
2. **IP/VPN distinta por cuenta**: cada cuenta puede usar su propio proxy (protocolo `http`/`socks5`, host, puerto, usuario/pass opcionales), aplicado a la sesión/partición de esa cuenta con `session.setProxy()`.

**Contexto del usuario:** quiere ejecutar >4 cuentas sin límite usando opciones **gratuitas**. Se recomendó V2RayN/Clash Verge con nodos gratuitos (un puerto local por cuenta); el launcher se implementa de forma **genérica** (cualquier proxy http/socks5), para que mañana funcione igual con proxies residenciales de pago sin cambios.

### Decisiones de diseño acordadas

| Decisión | Detalle |
|---|---|
| Identidad estable por cuenta | `id` entero positivo; **partición = `persist:pokegrid-{id}`** → cookies/sesión se conservan al añadir/eliminar otras cuentas |
| Migración legacy | Las 4 cuentas actuales (sin id) reciben ids 1–4 en orden → mismas particiones de antes, cero pérdida de sesión |
| Cuentas nuevas | `id = max(ids existentes) + 1` |
| Límites | Mínimo 1 cuenta, **máximo 32** (`MAX_ACCOUNTS`) — tope por memoria (cada webview carga el juego completo); UI bloquea y main rechaza con mensaje claro |
| Estado interno | Sigue siendo **por posición** en la lista (capturas IndexedDB `accountIndex`, notificaciones, farmeo, metas). Añadir al final = cero perturbación; eliminar reasigna posiciones de las siguientes (aceptado; ver "pulido pendiente") |
| Proxy por cuenta | `{ enabled, protocol: 'http'\|'socks5', host, port, username?, password? }`; inválido → se desactiva en vez de romper |
| Userscripts | Semántica **opt-out**: entrada ausente = habilitado (`script.accounts?.[i] === false` bloquea). Scripts viejos funcionan en cuentas nuevas por defecto |
| Extensiones desempaquetadas | Semántica **opt-in**: `value[i] === true` (ausente = deshabilitada) — se mantiene |
| Importación .txt | 1–32 secciones `[CUENTA N]` consecutivas; al re-sincronizar un archivo vinculado, `preserveAccountIds()` conserva los ids por posición para no perder cookies |
| Grid visual | Columnas dinámicas: 1→1 col, 2–4→2 cols, 5–9→3 cols, 10+→4 cols (inline style en `#grid`) |

---

## 3. Cambios YA HECHOS en esta sesión (todos sin commitear)

### `src/account-model.js` (NUEVO — lógica pura compartida)
- `DEFAULT_ACCOUNT_COUNT=4`, `MAX_ACCOUNTS=32`
- `accountPartition(id)` → `persist:pokegrid-{id}`
- `normalizeAccountProxy(value)` — valida y normaliza proxy; inválido → desactivado
- `normalizeAccounts(value)` — lista variable (1–32), asigna ids estables, rechaza >32 con throw
- `buildProxyRules(proxy)` — **sintaxis de reglas de Chromium**: http → `user:pass@host:port` (bare, aplica a todos los protocolos); socks5 → `socks5://user:pass@host:port`. ⚠️ El prefijo `http://` ROMPE el parsing de Chromium (verificado con repro).

### `src/main.js`
- Importa el modelo desde `account-model.js`; elimina definiciones locales duplicadas.
- `readAccounts()`: primer arranque (sin archivo) → 4 cuentas default ids 1–4.
- **NUEVO** `applyAccountProxies(accounts)`: por cuenta, `session.fromPartition(partition).setProxy({proxyRules})` o `'direct://'` si desactivado; devuelve `[{id, ok, error?}]`.
- `configureGameSessions()`: itera cuentas guardadas (no 1–4 fijas) + aplica proxies al arrancar.
- `getGameAccountIndex(webContents)`: ahora por **nombre de partición** → id → posición en lista (antes: identidad de objeto de sesión, solo 4).
- `authorizeUserScriptRuntime`: `script.accounts?.[accountIndex] === false` (opt-out).
- `normalizeUserScript` / `installScriptShopItem`: array `accounts` ya no forzado a longitud 4.
- Config de extensiones: normalizada al número actual de cuentas; apply itera la lista real con particiones por id.
- **NUEVO** `preserveAccountIds(parsed)` — conserva ids existentes por posición en import/sync de plantilla .txt.
- IPC `accounts:save` ahora async: guarda, aplica proxies y devuelve `{ok, accounts, proxyResults}`.

### `src/account-transfer.js`
- Plantilla 1–32 secciones (regex `[0-9]+`, tope 32); import acepta 1+ secciones consecutivas desde `[CUENTA 1]`.

### `src/userscripts.js`
- Toggles por cuenta **dinámicos** (`accountRows.length` en vez de 4).
- `createAccountToggles(container, selected, {defaultEnabled})`: scripts = opt-out (ausente→checked), extensiones = opt-in (ausente→unchecked).
- `setAccounts(value)` dinámico; `draftAccounts()`, Telegram install y reload usan `accountRows.map(...)`.

### `src/renderer.js`
- Constantes: `DEFAULT_ACCOUNT_COUNT=4`, `MAX_ACCOUNTS=32`; helper `accountCount()` = `accounts.length || 4`.
- `normalizeProxy/normalizeAccounts` con id + proxy (espejo del modelo; el renderer no puede usar require de Node).
- **NUEVO** `renderAccountRow(account, index)`: fila con label/usuario/pass + `<details>` "VPN / IP distinta" (protocolo select http/socks5, host, puerto, user, pass proxy) + botón eliminar por fila.
- **NUEVO** `reindexAccountRows()`, botón "+ Añadir cuenta (IP/VPN propia)" en `#accountRowActions`.
- **NUEVO** `gridLayoutForCount/setGridLayout()` — columnas dinámicas del grid.
- **NUEVO** `rebuildGamePanels()` — destruye paneles de juego, recrea para la nueva lista, re-aplica visibilidad/orden/userscripts/notificaciones/metas.
- `createPanel(index)`: partición por `accounts[index].id`; panel guarda `accountId`.
- Modal submit: lee filas del DOM (incluye campos `proxy.*`), preserva ids existentes, detecta cambio estructural → `rebuildGamePanels()`; muestra fallos de proxy desde `result.proxyResults`.
- `fillAccountForm(rows)` reconstruye filas (usado tras import/sync).
- `initialize()`: re-normaliza farmConfigs, `resetFarmContexts()`, `setGridLayout()`, crea paneles por `accounts.length`.
- Todas las referencias a `ACCOUNT_COUNT` reemplazadas por dinámicas (clamps de metas/notificaciones, grid visible/orden, stats "Cuentas en línea", tabs de instancias, brand summary, viewModeAll).

### `src/index.html`
- Nuevo contenedor `<div id="accountRowActions">`; textos actualizados ("Tus cuentas", "Importación de cuentas", scripts "en tus cuentas").

### `src/styles.css`
- Estilos nuevos: `.account-row-remove`, `.account-proxy-details`, `.account-proxy-grid` (5 cols, responsive 2), `.account-row-actions`.

### `package.json`
- `check`: incluye `node --check src/account-model.js`.
- Scripts nuevos: `test:account-model` (Node) y `test:dynamic-accounts` (Electron E2E).

### Tests
- **NUEVO** `tests/account-model-smoke.js` — unitarios del modelo (migración legacy, ids, tope 32, proxy válido/inválido, reglas de proxy). ✅ PASA.
- **ACTUALIZADO** `tests/account-transfer-smoke.js` — plantilla 1/4/6 cuentas, consecutividad, tope 32. ✅ PASA.
- **NUEVO** `tests/dynamic-accounts-proxy-smoke.js` — E2E con el launcher REAL (userData temporal): arranca → 4 paneles default → modal: añade 2 cuentas + proxy HTTP local en la última → 6 paneles/3 columnas → **prueba conductual**: servidor de sonda local + dominio `.invalid` inresoluble que solo carga si la sesión enruta por el proxy (cuenta con proxy ✅ / cuenta sin proxy ❌) → elimina una cuenta → 5 paneles. ✅ PASA sin bloque debug (verificado tras fix #1).
- `tests/probe-setproxy-repro.js` — **BORRADO** (era repro descartable).

---

## 4. ESTADO EXACTO EN EL QUE QUEDÓ (importante)

### ✅ Verificado y pasando
1. Sintaxis de todos los archivos (`node --check`) — OK.
2. `tests/account-model-smoke.js` — OK.
3. `tests/account-transfer-smoke.js` — OK.
4. E2E `tests/dynamic-accounts-proxy-smoke.js` — **EXIT=0** sin bloque debug, tras el fix de bug #1.

### ✅ BUG #1 — CORREGIDO y verificado
El submit del modal de cuentas nunca ponía `proxy.enabled = true`; `normalizeAccountProxy` lo desactivaba silenciosamente. **Fix aplicado** en el handler de submit (`src/renderer.js`, tras el forEach que rellena campos):

```js
// El proxy se considera activo cuando el usuario completó protocolo + host + puerto.
const p = account.proxy;
p.enabled = Boolean(p.protocol && p.host && Number(p.port) >= 1);
```

**Verificado:** bloque debug (`SAVE_STATE`/`saveDebug`) borrado del E2E y `tests/probe-setproxy-repro.js` eliminado; el E2E pasa **sin** el saveDebug (sonda conductual OK: cuenta con proxy enruta, la sin proxy no).

### ✅ Regresión completa — ejecutada
- **PASS:** sintaxis de todos los `src/*`; account-model, account-transfer, dynamic-accounts-proxy (E2E), accounts-modal, userscripts-manager, statistics-and-dragdrop, hunt-analyzer-reader, hunt-account-redesign, capture-log-reader, account-profile, better-market-no-alerts, better-market-hunt-sale-excepto-pin*, breeding-second-parent, memory-cleanup-safety, userscript-network, script-shop (smoke/live/ui), multi-game-userscripts (static+electron), account-events-and-farm, panel-injection, pokepedia-preload, launcher-visual, browser-instances-and-connectivity, better-market-iv-calculator, better-market-window-scales, custom-card-responsive-settings, chat-translator, telegram-alerts, telegram-game-assets, launcher-updater-smoke, capture-management-redesign (preexistente).
- **FALLAS PREEXISTENTES (no causadas por esta feature; archivos no tocados en la sesión):**
  1. `tests/better-market-hunt-sale-smoke.js` — pin de versión `@version 10.7.3`; el script personal está en **10.18.0** y su interna cambió (varias aserciones de código ya no existen). Requiere decisión del usuario: actualizar el test a la semántica 10.18 o fijar versión vieja del script.
  2. `tests/launcher-updater-integration.js` + `launcher-updater-detached-integration.js` — **entorno Git Bash**: el tar de MSYS2 interpreta rutas `C:\...` como host remoto (`tar: Cannot connect to C: resolve failed`). Falla incluso ejecutando `tar.exe` a mano; en cmd/PowerShell (bsdtar de Windows) funciona. No es regresión.
- **Fix menor aplicado:** `tests/better-market-no-alerts-smoke.js` — pin `@version 10.14.0` → `10.18.0` (todas las demás aserciones del test pasaban; solo el pin estaba desactualizado).

### 🆕 Script VPN por cuenta (agregado esta sesión)
- `scripts/vpn-per-account.cjs` — cero dependencias: parsea enlaces `vmess://`, `vless://`, `trojan://`, `ss://`; descarga v2ray-core 5.53 una vez a `.vpn/core/`; valida configs con `v2ray test`; arranca N instancias detached (SOCKS5 en base+2i, HTTP en base+2i+1); verifica escucha; `status`/`down`. Atajos `pnpm vpn:up|status|down`.
- **Verificado E2E**: parseo de los 4 esquemas, validación (detectó UUID inválido y estructura VLESS incorrecta), arranque de 2 instancias, handshake SOCKS5 OK en ambos puertos, apagado limpio sin procesos huérfanos.
- ⚠️ El core 5.53 **no soporta inbound `mixed`** → se usan inbounds socks+http separados (dos puertos por instancia). VLESS de V2Fly usa estructura `vnext/users`, no `servers`.
- Docs: `docs/VPN-POR-CUENTA.md` (guía paso a paso + troubleshooting); enlaces desde README y FUNCIONES; `.vpn/` en .gitignore.

### ⏳ Pendiente
1. ~~Regresión completa~~ — **COMPLETADO** (ver resultados arriba).
2. ✅ **Docs** — README.md (sección "Cuentas ilimitadas y VPN/IP por cuenta" + bullet de funciones) y `docs/FUNCIONES.md` (panel multicuentas dinámico, añadir/eliminar/reordenar, tabla de campos del proxy, guía V2RayN/Clash Verge con puertos locales, advertencia de reasignación al eliminar).
3. **Pulido opcional**: aviso explícito al eliminar una cuenta sobre la reasignación de historial; chip "VPN" en la barra del panel cuando `account.proxy.enabled`; mostrar estado del proxy por cuenta tras guardar (ya se devuelve `proxyResults`).
4. ✅ **Versionado** — bump a **0.23.0** aplicado en package.json (feature nueva). Nota de release pendiente de publicar.

---

## 5. Comandos útiles (entorno Windows / Git Bash)

⚠️ **`pnpm` NO está en el PATH** de esta máquina. Alternativas verificadas:

```bash
# Sintaxis
node --check src/main.js && node --check src/renderer.js && node --check src/userscripts.js \
  && node --check src/account-model.js && node --check src/preload.js && node --check src/guest-preload.js \
  && node --check src/game-theme.js && node --check src/userscript-network.js

# Tests Node (sin Electron)
node tests/account-model-smoke.js
node tests/account-transfer-smoke.js

# Tests Electron (usar el binario directo de node_modules)
node_modules/electron/dist/electron.exe tests/dynamic-accounts-proxy-smoke.js
node_modules/electron/dist/electron.exe tests/accounts-modal-smoke.js
node_modules/electron/dist/electron.exe tests/userscripts-manager-smoke.js

# Arranque manual del launcher (userData real)
node_modules/electron/dist/electron.exe .
```

Notas de entorno:
- Node v24.19.0 disponible; Electron 43.1.1 en `node_modules/electron/dist/`.
- En este entorno **no hay red** hacia `poke.idleworld.online` (los webviews fallan con ERR_FAILED al cargar el login) — es ruido ambiental, no bloquea los tests (los paneles existen igualmente).
- Los E2E crean un userData temporal en `%TEMP%` (`POKEGRID_DIAGNOSTIC_USER_DATA`).

---

## 6. Lecciones aprendidas / trampas de esta sesión

1. **Electron 43 eliminó `session.getProxy()`** — solo existe `setProxy(config)`. Para verificar proxy, usar prueba conductual (servidor local + dominio `.invalid` inresoluble que solo carga si pasa por el proxy).
2. **Sintaxis de reglas de proxy de Chromium**: bare `host:port` = todos los protocolos; `socks5://host:port` para SOCKS. El prefijo `http://` hace que Chromium NO aplique el proxy (verificado con repro: carga directa falla, bare funciona).
3. **`edit_file_tool` es atómico por lote**: si una búsqueda no coincide exactamente, TODO el lote falla. Ante fallo, aislar edición por edición.
4. **`search_file_line` en modo plain NO soporta alternación `|`** — buscar términos uno a uno (o usar grep vía shell).
5. Los tests smoke de este repo corren el renderer con un **preload falso** (`tests/launcher-preview-preload.js`) que simula la API; su `saveAccounts` devuelve `{ok:true}` sin `accounts` ni `proxyResults` — los handlers del renderer deben tolerar ambos (ya lo hacen).
6. `safeStorage` (DPAPI) funciona en esta máquina Windows; las credenciales se cifran en `userData`.

---

## 7. Estado git

- Rama: `main`, sin commits nuevos de esta sesión.
- Modificados: `package.json`, `src/account-transfer.js`, `src/index.html`, `src/main.js`, `src/renderer.js`, `src/styles.css`, `src/userscripts.js`, `tests/account-transfer-smoke.js`.
- Nuevos (untracked): `src/account-model.js`, `tests/account-model-smoke.js`, `tests/dynamic-accounts-proxy-smoke.js`, `tests/probe-setproxy-repro.js` (descartable).
- Untracked PREEXISTENTES de antes de esta sesión (no tocar): scripts personales en la raíz (`*.user.js`, `scripts.rar`) y `tests/capture-management-redesign-smoke.js`.

### Orden sugerido para la próxima sesión
1. ✅ Fix bug #1 (`proxy.enabled` en el submit del modal) — **HECHO**
2. ✅ Borrar bloque debug + repro descartable — **HECHO**
3. ✅ Re-ejecutar E2E sin saveDebug — **PASA**
4. ✅ Suites de regresión — **COMPLETADO** (ver fallas preexistentes arriba)
5. ✅ Docs README/FUNCIONES — **HECHO**
6. ✅ Bump a 0.23.0 — **HECHO** · Pulido UI opcional sigue pendiente.
