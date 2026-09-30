# ANÁLISIS TÉCNICO COMPLETO — IDLE POKE LAUNCHER (PokeGrid Launcher)

> Documento de referencia técnica y de auditoría. Generado el 2026-09-30.
> Alcance: análisis de código fuente, empaquetado, distribución, pruebas y riesgos.
> **No se modificó ningún archivo de código.** Este documento es de solo lectura + recomendaciones.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Identidad, alcance y distribución](#2-identidad-alcance-y-distribución)
3. [Arquitectura general](#3-arquitectura-general)
4. [Inventario técnico de archivos](#4-inventario-técnico-de-archivos)
5. [Modelo de cuentas, particiones y proxy](#5-modelo-de-cuentas-particiones-y-proxy)
6. [Instancias de navegador multijuego](#6-instancias-de-navegador-multijuego)
7. [Ciclo de vida del panel y resiliencia de conexión](#7-ciclo-de-vida-del-panel-y-resiliencia-de-conexión)
8. [Capa de instrumentación dentro del juego](#8-capa-de-instrumentación-dentro-del-juego)
9. [Herramientas de datos](#9-herramientas-de-datos)
10. [Userscripts y Script Shop](#10-userscripts-y-script-shop)
11. [Extensiones desempaquetadas](#11-extensiones-desempaquetadas)
12. [Autoactualizador](#12-autoactualizador)
13. [Mapa de persistencia](#13-mapa-de-persistencia)
14. [Seguridad](#14-seguridad)
15. [Desempeño: hallazgos concretos](#15-desempeño-hallazgos-concretos)
16. [Errores y riesgos detectados (consolidado)](#16-errores-y-riesgos-detectados-consolidado)
17. [Empaquetado, exportación y CI](#17-empaquetado-exportación-y-ci)
18. [Estrategia de pruebas](#18-estrategia-de-pruebas)
19. [Recomendaciones priorizadas](#19-recomendaciones-priorizadas)
20. [Plan de acción sugerido](#20-plan-de-acción-sugerido)
21. [Anexos](#21-anexos)

---

## 1. Resumen ejecutivo

**Qué es.** `IDLE POKE LAUNCHER` (paquete npm `pokegrid-launcher`) v0.23.0 es un launcher de escritorio para Windows, construido sobre **Electron 43.1.1**, que permite gestionar múltiples cuentas simultáneas del juego web **Poke Idle World** y además abrir instancias de otros juegos web. No hay dependencias de runtime: el código es CommonJS + JavaScript plano, sin bundler, sin framework, sin transpilación.

**Estado actual verificado:**
- La versión de `package.json` es **0.23.0**, pero el último commit/tag publicado es **v0.22.15**. La feature 0.23.0 (cuentas dinámicas 1–32 + proxy/VPN por cuenta) está **sin commitear**: 11 archivos modificados y 8 sin seguimiento en `git status`.
- `dist/` está **obsoleto e incompleto**: contiene `app.asar` de la v0.22.12 en `win-unpacked/` y una carpeta portátil desempaquetada de la v0.22.15, pero **no hay ningún ZIP**. La build actual 0.23.0 solo existe en `dist-0230/win-unpacked/` (4.1 MB, sin ZIP), carpeta que **no está en `.gitignore`**.
- El tamaño descomprimido de la app es **~305 MB** (exe de 215 MB + runtime de Chromium), comprimido en ZIP ~130 MB.

**Fortalezas reales del diseño:**
- Aislamiento sólido por diseño: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, un `<webview>` por cuenta con partición persistente propia.
- Modelo de identidad estable por cuenta (`id` → `persist:pokegrid-{id}`) que sobrevive a altas y bajas de cuentas.
- Validación de entrada extrema y consistente (límites de tamaño, allowlists de cabeceras/métodos, verificación SHA-256 en tienda y actualizador).
- Persistencia bien diseñada: escrituras atómicas (`.tmp` + `rename`), cifrado DPAPI vía `safeStorage`, IndexedDB con fusión de filas por "completitud del dato".
- Sistema de autoactualizador con handshake de confirmación de arranque y rollback, muy por encima de la media.
- Suite de pruebas amplia (~40 smoke tests, E2E reales con `userData` temporal y sondas conductuales de proxy).

**Debilidades principales (resumen de los 5 puntos críticos):**
1. **Degradación de rendimiento en el proceso principal**: `readUserScripts()` relee, re-parsea y **re-compila con `new Function()` los 100 userscripts** en *cada* llamada IPC, incluida cada `GM_xmlhttpRequest`. Con los límites actuales (100 scripts × 10 MB) esto puede bloquear el main process.
2. **Crecimiento no acotado del historial de notificaciones**: `launcherNotifications` en memoria, el `Set` `notificationSourceKeys` y el object store `notifications` de IndexedDB crecen sin límite; en cada arranque se hace `getAll()` de todo el histórico.
3. **Scripts de la Shop recién instalados nunca se inyectan**: el renderer exige `accounts[i] === true` (opt-in) mientras `main.js` usa `=== false` (opt-out). Bug de contrato entre capas.
4. **~4.000 líneas muertas en `game-theme.js`** con un `if (false && dock)` que desactiva el bloque principal, fuga ilimitada de listeners `keydown` por reinstalación, y escrituras a `localStorage` en cada refresco.
5. **Cadena de build/QA incompleta**: `pnpm check` no valida 3 de los 9 archivos de `src/`; el CI ejecuta 4 de ~40 suites; varios scripts de `test:*` referencian tests que están en `.gitignore` (fallan en un clon limpio).

---

## 2. Identidad, alcance y distribución

| Campo | Valor |
|---|---|
| Nombre del paquete | `pokegrid-launcher` |
| Nombre comercial | `IDLE POKE LAUNCHER` |
| Versión declarada | **0.23.0** (sin publicar; último tag `v0.22.15`) |
| Descripción | "Launcher portátil multicuenta y multijuego para Windows" |
| Autor | DiegoT34 |
| Licencia | MIT (el archivo `LICENSE` **no** se incluye en el paquete portable) |
| Repositorio | `github.com/DiegoT34/PokeGrid-Launcher` |
| Entry point | `src/main.js` |
| `appId` | `online.idleworld.pokegrid` |
| Plataforma | Windows x64 únicamente |
| Dependencias de runtime | **ninguna** |
| Dev deps | `electron@43.1.1`, `electron-builder@26.0.12` |
| Gestor | pnpm (`lockfileVersion 9.0`), `pnpm-workspace.yaml` con `onlyBuiltDependencies: [electron, electron-winstaller]` |
| Node requerido | 22+ (CI usa Node 22; local Node 24.19) |

**Producto distribuible:** un único ZIP portable `IDLE-POKE-LAUNCHER-{version}-portatil.zip` que el usuario descomprime y ejecuta. Sin instalador, sin registro, sin servicios. Los datos del usuario (credenciales, sesión de cada cuenta, usuarioscripts) viven en `%APPDATA%/IDLE POKE LAUNCHER` (`app.getPath('userData')`), fuera de la carpeta del programa.

**Repositorio hermano:** `PokeGrid-Script-Shop/` es un **repositorio git anidado** (tiene su propio `.git`) con el catálogo de la tienda de scripts, su schema JSON, un publisher en PowerShell y su propio CI de validación de catálogo. Contiene 6 scripts publicados (los más pesados: `better-market-and-more` 920 KB, `telegram-alerts` 171 KB, `custom-card-ultimate` 109 KB).

---

## 3. Arquitectura general

### 3.1 Procesos y contextos de aislamiento

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PROCESO PRINCIPAL (Node) — src/main.js                                 │
│  • app.whenReady → configureGameSessions() → createWindow()             │
│  • ~30 handlers ipcMain.handle/on                                       │
│  • safeStorage (DPAPI) para credenciales y almacén compartido            │
│  • net.fetch (sesión por defecto, SIN proxy de cuenta)                  │
│  • Cachés LRU: remoteImageCache(48), pokeApiSpeciesCache(256)           │
│  • Caches de Chromium: mantenimiento cada 7 días, presupuesto 96 MB    │
│  • Lanzador del actualizador (PowerShell)                                │
└──────┬───────────────────────────────────────────────────────────────────┘
       │ contextBridge (preload.js:37 métodos) — "pokeGrid"
┌──────▼───────────────────────────────────────────────────────────────────┐┐
│ RENDERER PRINCIPAL (Chromium, sandbox:true) — index.html               ││
│  styles.css + game-theme.js + userscripts.js + renderer.js             ││
│  • UI del launcher: appbar, grid, modales, paneles flotantes            ││
│  • localStorage (preferencias, filtros, geometría)                     ││
│  • IndexedDB `pokegrid-capture-archive-v1` (capturas + notificaciones)  ││
│  • Timers globales: 6 setInterval permanentes                           ││
└──────┬───────────────────────────────────────────────────────────────────┘
       │  <webview> por cuenta / por pantalla de instancia
       │  preload: src/guest-preload.js  (solo paneles del juego)
┌──────▼───────────────────────────────────────────────────────────────────┐┐
│ WEBVIEWS (uno por cuenta, partición persist:pokegrid-{id})             ││
│  • Ejecutan https://poke.idleworld.online  (juego real)                 ││
│  • backgroundThrottling=false (para que el juego no se suspenda)        ││
│  • setPermissionRequestHandler →SIEMPRE false (deniega todo)            ││
│  • setProxy por cuenta (http / socks5)                                 ││
│  • Reciben por executeJavaScript: tema, monitor de capturas,           ││
│    snapshots de Hunt/Capture/Perfil/Farm, login automático,            ││
│    automatización de farmeo y userscripts del usuario                  ││
└─────────────────────────────────────────────────────────────────────────┘
       │
       ├── WEBVIEWS DE INSTANCIAS (persist:pokegrid-instance-{id}-{n})
       │   sin preload, sandbox forzado, navegación https libre
       │
       └── VENTANA POKÉDEX (partición persist:pokegrid-pokepedia)
           fullscreen, frame:false, con webview del /pokepedia del juego
```

### 3.2 Decisiones estructurales correctas

- **Un webview por cuenta, no iframes.** Cada `<webview>` tiene su partición persistente ⇒ cookies, `localStorage`, IndexedDB y caché de red completamente separados. Es la decisión correcta y difícil de replicar.
- **`backgroundThrottling` desactivado globalmente** (`app.commandLine.appendSwitch('disable-renderer-backgrounding')` en `main.js:31` + `backgroundThrottling:false` en cada `webPreferences`). Sin esto Chromium suspende los timers del juego al minimizar el launcher. Comentario explícito y bien justificado en el código.
- **Instancias secundarias con endurecimiento adicional**: `will-attach-webview` (`main.js:994-1005`) les **borra el preload**, fuerza `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` y les pone `setPermissionRequestHandler → false`. Los paneles del juego no pasan por ese endurecimiento (su preload lo fija el renderer), lo cual es una asimetría de defensa en profundidad (ver R-S2).
- **`app.userAgentFallback` saneado** (`main.js:1616-1618`): elimina el token `Electron/x` y colapsa la versión de Chrome. Reduce huella de fingerprinting, con el riesgo de que el juego deje de funcionar siegmenta browsers.
- **Doble instancia bloqueada** con `requestSingleInstanceLock()` + `second-instance` que restaura y enfoca.

### 3.3 Mapa de IPC (proceso principal)

| Canal | Tipo | Función |
|---|---|---|
| `accounts:load` / `accounts:sync-source` / `accounts:save` | handle | Carga, sincroniza desde `.txt` vinculado y guarda (cifrado) la lista de cuentas |
| `accounts:download-template` / `accounts:import-file` | handle | Diálogos de diálogo de archivo |
| `app:version` / `app:check-update` | handle | Versión y actualización (**valida `event.sender === mainWindow.webContents`**) |
| `app:cleanup-memory` | handle | Limpieza segura de cachés (no toca procesos del juego) |
| `assets:image-data-url` | handle | Proxy de sprites remotos → data URL (allowlist de hosts) |
| `assets:pokemon-species` | handle | Proxy a PokéAPI con caché LRU |
| `userscripts:list / save / delete / import-file / export-file / validate-syntax` | handle | CRUD de userscripts + validación de sintaxis con `vm.Script` |
| `userscripts:fetch-url` / `bundled-telegram` / `guest-preload` | handle | Descarga HTTPS, script empaquetado, URL del preload del guest |
| `userscripts:shop-catalog / shop-install / shop-uninstall` | handle | Tienda online con SHA-256 |
| `userscripts:request` | handle | **Puente `GM_xmlhttpRequest`** (HTTPS + `@connect` + límites) |
| `userscripts:shared-get / shared-set / shared-delete` | handle | Almacén compartido cifrado, exige `@grant PokeGrid_sharedStorage` |
| `extensions:pick-folder / status / apply` | handle | Extensión MV2/MV3 desempaquetada por cuenta |
| `pokepedia:open / minimize / close` | handle+send | Ventana Pokédex (valida el sender) |

> **Observación:** solo 3 de ~30 handlers validan `event.sender`. El resto está expuesto a cualquier renderer vivo. Hoy el riesgo es bajo porque los webviews de instancias pierden el preload y los del juego solo reciben `guest-preload.js` (4 canales ya autorizados), pero es una defensa que falta (ver R-S2).

---

## 4. Inventario técnico de archivos

### 4.1 Código de la aplicación (`src/`)

| Archivo | Líneas | Bytes | Rol |
|---|---:|---:|---|
| `renderer.js` | **9.478** | 480 KB | **Monstruo monolítico.** UI completa, 16 scripts de instrumentación inyectados (~2.900 líneas de código string), 6 timers globales, IndexedDB, drag&drop, modales |
| `game-theme.js` | **5.377** | 243 KB | Generador del script de tema inyectado. ~3.370 líneas de `THEME_CSS` + ~2.000 de `buildInstallScript()`. **~4.000 líneas muertas** |
| `styles.css` | 4.203 | 169 KB | 1.411 selectores, 1.435 reglas, 16 `@media`, 2 `@keyframes`, 34 `!important` |
| `main.js` | 1.623 | 75 KB | Proceso principal: sesiones, permisos, proxy, ~30 IPC, cachés LRU, sprites allowlist, mantenimiento de caché, limpieza de memoria |
| `userscripts.js` | 1.483 | 68 KB | Centro de scripts: editor, toggles por cuenta, matching `@match`/`@game`, runtime GM inyectado, Script Shop |
| `index.html` | 661 | 43 KB | DOM completo: appbar, template del panel, 8 modales, panel de notificaciones |
| `updater.js` | 564 | 27 KB | Autoactualizador: consulta GitHub, descarga, SHA-256, instalador PowerShell con handshake y rollback |
| `account-transfer.js` | 87 | 4 KB | Plantilla `.txt` de 1–32 secciones y su parser estricto |
| `account-model.js` | 66 | 2 KB | Modelo puro de cuentas dinámicas + sintaxis de reglas de proxy de Chromium |
| `preload.js` | 37 | 2 KB | `contextBridge` del renderer: 37 métodos `pokeGrid.*` |
| `userscript-network.js` | 11 | 0.5 KB | Resolver de URL final de respuesta (redirecciones) |
| `pokepedia-preload.js` | 29 | 1 KB | Controles de la ventana Pokédex (minimizar/cerrar) |
| `guest-preload.js` | 8 | 0.5 KB | Puente `pokeGridUserScripts` (4 canales) para los guests del juego |
| `pokepedia-shell.html` + `.css` | 29 + 79 | 2 KB | Cáscara de la ventana Pokédex |
| `assets/*.png` | — | **3.0 MB** | 3 PNG; **solo se usa `idle-poke-logo-512.png` (360 KB)**. Los otros 2 (2.7 MB) son peso muerto |

**Total código aplicación: ~24.100 líneas.**

### 4.2 Documentación

| Archivo | Contenido |
|---|---|
| `README.md` | Descarga, funciones, VPN por cuenta, 3 herramientas, actualizaciones, desarrollo, privacidad |
| `CONTEXTO-PROYECTO.md` | Handoff de la sesión del 2026-09-23 (feature cuentas ilimitadas + VPN). **Desactualizado**: ya no refleja el estado actual |
| `docs/FUNCIONES.md` | Guía funcional completa (13 secciones) |
| `docs/ACTUALIZACIONES.md` | Proceso de publicación y recuperación |
| `docs/SCRIPT_SHOP.md` | Publicación de scripts en la Shop |
| `docs/VPN-POR-CUENTA.md` | Guía V2RayN/Clash Verge + troubleshooting |
| `SECURITY.md` | Política de reporte (sin canal privado real: pide abrir Issue) |
| `docs/assets/*.png` | 4 capturas para el README |

### 4.3 Scripts y utilidades

| Archivo | Líneas | Rol |
|---|---:|---|
| `scripts/vpn-per-account.cjs` | 429 | Levanta N instancias de v2ray-core (parsea `vmess://`, `vless://`, `trojan://`, `ss://`), valida configs con `v2ray test`, asigna puertos SOCKS+HTTP por instancia. **Cero dependencias** — bien hecho |
| `scripts/generate_icon.py` | 22 | Genera `build/icon.ico` con Pillow (7 tamaños). Dependencia de Python+Pillow no declarada |
| `PokeGrid-Script-Shop/PokeGrid-Shop-Publisher.ps1` | — | Publicador de scripts a la Shop (11 herramientas PS1 + 9 tests) |

### 4.4 Pruebas (113 archivos, 44 `.js`, 60 `.png`, 22.8 MB)

Suite muy amplia de *smoke tests*: 24 de Node puro, 17 de Electron (E2E con `userData` temporal), más fixtures HTML/CSS/JS. Se analizan en detalle en la [sección 18](#18-estrategia-de-pruebas).

### 4.5 Ruido en el árbol de trabajo

| Carpeta | Tamaño | Estado |
|---|---:|---|
| `.build-diagnostics/` | **384 MB** (210 archivos) | Ignorada por git. Capturas PNG y logs de smokes históricos |
| `dist/` | **355 MB** | Ignorada. Obsoleta e incompleta (§17) |
| `dist-0230/` | 4.1 MB | **NO ignorada por git** — riesgo de commitear un binario |
| `artifacts/` | 2.1 MB | Ignorada |
| `tests/` | 22.8 MB | 60 PNG de regresión visual, ignorados por git |
| `.vpn/` | 62 MB | Ignorada. Contiene `servers.txt` con enlaces `vmess://` reales (2 líneas) = **credenciales en texto plano en el disco de desarrollo** |
| `PokeGrid-Script-Shop/` | 2.1 MB | **Repo git anidado, no ignorado** — riesgo de commitear un gitlink |

---

## 5. Modelo de cuentas, particiones y proxy

### 5.1 Modelo de datos (`src/account-model.js`, lógica pura y testeable)

```js
DEFAULT_ACCOUNT_COUNT = 4      // primer arranque
MAX_ACCOUNTS          = 32     // tope duro (memoria)
accountPartition(id)  => `persist:pokegrid-${id}`
```

Una cuenta es `{ id, label(≤40), username(≤180), password(≤300), proxy }`.
`normalizeAccounts()` asigna `id`s estables (enteros 1–9999, sin duplicados), rechaza >32 con excepción, y degrada a `{enabled:false}` cualquier proxy inválido en vez de romper.

### 5.2 Por qué el `id` estable es la decisión correcta

La partición persistente es **derivada del `id`, no del índice**. Consecuencias:

- Añadir una cuenta **no** altera las cookies de las demás.
- Eliminar la cuenta con `id=3` **no** borra la sesión de `id=3` (la partición `persist:pokegrid-3` sobrevive en disco) ⇒ se puede reincorporar y recuperar la sesión.
- Migración desde la versión de 4 cuentas fijas: los ids 1–4 se mapcan a las mismas particiones de antes ⇒ **cero pérdida de sesión**.

### 5.3 El punto débil del modelo: estado por índice vs identidad por `id`

El launcher mantiene **dos** identificadores distintos y no siempre coherentes:

| Dato | Clave | Consecuencia de eliminar una cuenta intermedia |
|---|---|---|
| Partición / sesión / cookies | `id` | ✅ se conserva |
| Scripts habilitados | `accounts[i]` por **índice** | ⚠️ se desplaza |
| Notificaciones (`accountIndex`) | **índice** | ⚠️ se desplaza |
| Archivo de capturas IndexedDB | `accountIndex` + índice `accountIndex` | ⚠️ se desplaza |
| Metas de captura | `goal.account` (índice) | ⚠️ se desplaza |
| Filtros/zoom/orden de Capture Log | `localStorage` `captureLogFilters:{i}`, `panelZoom:{i}`, `captureLogSort:{i}` | ⚠️ se desplaza |

`README.md:53` y `docs/FUNCIONES.md:39` **sí lo documentan** ("las siguientes heredan su posición; el historial pasa a la cuenta que ocupe ese lugar"), pero:

- La UI **no avisa** al eliminar. El `title` del botón dice *"Eliminar esta cuenta al guardar (conserva las demás)"* (`renderer.js:8566`), que es tranquilizador pero no menciona la reasignación de historial.
- El propio `CONTEXTO-PROYECTO.md:161` lo lista como "pulido pendiente" desde hace sesiones.
- No hay reordenamiento real de cuentas: el arrastre de barras de panel solo cambia el **orden visual** (`panelOrder` + CSS `order`, `renderer.js:4621-4629`), no el array `accounts`. **`README.md:25` afirma "añadir, eliminar y reordenar desde el modal Cuentas"**, lo cual es inexistente.

### 5.4 Proxy/VPN por cuenta

Modelo: `{ enabled, protocol:'http'|'socks5', host, port, username?, password? }`.

Flujo:
1. El modal arma `proxy.enabled = Boolean(protocol && host && port >= 1)` (`renderer.js:8700-8702`).
2. `ipcMain.handle('accounts:save')` cifra, relee y llama `applyAccountProxies(saved)`.
3. Por cuenta: `session.fromPartition('persist:pokegrid-'+id).setProxy({ proxyRules })`, o `'direct://'` si está desactivado. Devuelve `[{id, ok, error?}]`.
4. El renderer muestra cuántos fallos hubo y guarda el resultado.

**Detalle crítico y muy bien documentado** (`account-model.js:51-57` + `CONTEXTO-PROYECTO.md:198-199`): la sintaxis de reglas de proxy de Chromium **no** acepta el prefijo `http://`. Para HTTP hay que emitir `user:pass@host:port` (bare, aplica a todos los protocolos); para SOCKS5 sí `socks5://...`. El prefijo `http://` hace que Chromium **no aplique el proxy** (verificado con repro). Este es un tipo de trampa que muy poca gente conoce; está bien documentado en el código.

`setPermissionRequestHandler → false` en todas las sesiones de juego, Pokédex e instancias.

**Verificación de que el proxy funciona:** el E2E `tests/dynamic-accounts-proxy-smoke.js` usa una **prueba conductual** (servidor de sonda local + dominio `.invalid` inresoluble que solo carga si la sesión enruta por el proxy). Es la forma correcta de probar algo que antes solo se podía "observar" con `session.getProxy()` (que Electron 43 eliminó).

---

## 6. Instancias de navegador multijuego

- Persistidas en `localStorage` (`pokegrid:browser-instances:v1`) y **restauradas automáticamente** al arrancar (`initializeBrowserInstances`, `renderer.js:8190`).
- Cada instancia = nombre (≤48) + URL HTTPS (≤1000) + 1–6 pantallas.
- Partición por pantalla: `persist:pokegrid-instance-{instanceId}-{n}` (`renderer.js:7789-7792`) ⇒ cada pantalla es una sesión totalmente independiente.
- Se muestran como pestañas en la barra superior (`renderBrowserInstanceTabs`), con botón de cierre por pestaña.
- Endurecimiento en `main.js:994-1005` (§3.2).
- Carga **escalonada** con `launchDelay` (`renderer.js:8136`) para no saturar la red.
- Barras de instancias conGeometry flotante independiente por tipo (`capture`/`hunt`) con `localStorage` por posición de panel — mismo problema de indexación que las cuentas.

**Limitación conocida:** el puente GM no funciona en estas instancias (ver BUG-06). Los scripts se inyectan (el launcher lo anuncia en la UI como *"automático por `@match`"*) pero `GM_xmlhttpRequest` y el almacén compartido fallan siempre, porque (a) `main.js:1000` borra el preload y (b) `getGameAccountIndex()` (`main.js:518-528`) solo reconoce `persist:pokegrid-<n>`.

---

## 7. Ciclo de vida del panel y resiliencia de conexión

### 7.1 `createPanel(index)` (`renderer.js:8200-8475`)

Clona `#panelTemplate`, crea el `<webview>` con `partition=persist:pokegrid-{accountId}`, `src=about:blank`, `allowpopups=false`, `webpreferences=backgroundThrottling=no,contextIsolation=yes,nodeIntegration=no`, y conecta ~25 listeners. Registra un objeto `panel` con ~45 campos de estado. Cada panel tiene:

- `captureArchive: Map` + `captureArchiveSignatures: Map` (archivo de capturas en memoria, sincronizado con IndexedDB)
- `captureSignatureCounts: Map` (detección de novedades por conteo)
- `captureMonitorReady`, `captureMonitorHealthAt`
- `captureLogReadPromise` / `captureLogReadGeneration` (anti-carrera con invalidación por generación)
- `huntOpen` / `huntSnapshot` / `huntElapsedBase` / `huntElapsedAt`
- `connectionFailures`, `recoveryTimer`, `stallTimer`, `isLoading`, `lastUrl`, `lastLoginAttempt`

### 7.2 `attachResilientWebview()` (`renderer.js:7897-7957`)

Gestor de eventos con recuperación:

| Evento | Acción |
|---|---|
| `console-message` (nivel ≥2) | Ring buffer de 24 entradas para diagnóstico |
| `did-start-loading` | Marca `isLoading`, arranca `startConnectionStallWatch` |
| `did-stop-loading` | `isLoading=false`, cancela stall, estado "Sesión disponible" |
| `did-fail-load` | Ignora `-3` (ABORTED) y no-main-frame; agenda recuperación |
| `dom-ready` | `markConnectionReady` → `onReady` |
| `did-navigate` / `did-navigate-in-page` | Guarda `lastUrl`, reintenta login, reinstala userscripts |
| `render-process-gone` / `crashed` / `unresponsive` | Recuperación inmediata |

**Recuperación con backoff exponencial + jitter** (`recoveryDelay`, `renderer.js:7819-7822`): `2s · 2^(min(4, intento-1))` hasta 30 s, más 0–20 % aleatorio. Tope de 20 fallos consecutivos. Excelente.

**Vigilancia de bloqueo** (`startConnectionStallWatch`, `renderer.js:7860-7884`): a los 120 s, si el documento sigue en carga, **no** lo detiene a ciegas: primero le pregunta `readyState`/`location.href` por `executeJavaScript`. Comentario muy autorizado en el código: *"Poke Idle World mantiene solicitudes abiertas mientras sincroniza el mundo. Detener el webview por tiempo cortaba /play a mitad de la carga y lo dejaba atrapado permanentemente en 'Loading world…'"*. Esta es la clase de detalle que distingue un launcher que funciona de uno que no.

**Reconexión por evento de red**: `window.addEventListener('offline'/'online')` marca todos los paneles y reagenda con `index * 350` ms de escalonado.

### 7.3 Inicio escalonado y login automático

- Arranque: `450 + index * 900` ms por panel (`renderer.js:8473`).
- "Iniciar todas": `index * 700` ms. "Recargar todas": `index * 700` ms.
- `loginScript()` (`renderer.js:6737-6779`): rellena el formulario nativo con el setter real de `HTMLInputElement.prototype.value` (para que React lo detecte), espera hasta 60 intentos × 250 ms, y luego instala un watcher de 500 ms que pulsa submit cuando el captcha Turnstile esté resuelto. **Contorna correctamente el doble click de React** y espera al captcha. Rate-limit de 15 s entre intentos por panel.

### 7.4 Geometría flotante

`setupFloatGeometry(panel, 'capture'|'hunt')` (`renderer.js:6854-6901`): paneles flotantes arrastrables y redimensionables con `setPointerCapture`, geometría persistida en `localStorage` con clave versionada (`v1`/`v2`) y botón de reinicio. Los paneles de un tipo se cierran al abrir el otro (`setHuntAnalyzerOpen` cierra Capture Log y viceversa) para no saturar la cuadrícula pequeña.

---

## 8. Capa de instrumentación dentro del juego

Esta es la parte **más frágil y más valiosa** del proyecto. El launcher no se integra con el juego por API: **lee y manipula el DOM interno del juego** (y en un caso, sus internos de React).

### 8.1 Los 16 scripts inyectados (`renderer.js`)

| Función generadora | Líneas aprox. | Propósito | Cadencia |
|---|---:|---|---|
| `captureSnapshotScript` | 1645–1761 (117) | Lee el Capture Log nativo + cola de red de eventos | cada 3.5 s (todos los paneles) |
| `captureLogPanelSnapshotScript` | 1762–2407 (**646**) | Renderiza un panel de capturas *dentro* del juego y lo lee | cada 4 s (paneles abiertos) |
| `captureMonitorInstallScript` | 2408–2740 (**333**) | **Se suscribe al socket del juego** para eventos de captura/derrota/drop | instalación + salud cada 30 s |
| `clearNativeCaptureLogScript` | 2741–2775 | Vacía el log nativo pulsando dos veces el botón de borrado | a demanda |
| `huntAnalyzerSnapshotScript` | 4013–4216 (204) | Abre el Hunt Analyzer nativo si hace falta y extrae 9 métricas + drops | cada 1.5 s (abiertos) |
| `clearNativeHuntAnalyzerScript` | 4218–4235 | Reinicia contadores de la sesión de caza | a demanda |
| `farmContextScript` | 4631–4659 | Nivel + ubicación del jugador | 5 s (con farmeo abierto) |
| `farmEnhancedContextScriptLegacy` | 4660–4846 (187) | **Código muerto** | — |
| `farmEnhancedContextScript` | 4847–5322 (**476**) | Catálogo de mapas/Pokémon, líderes, requisitos | 5 s |
| `farmEnhancedCatalogScript` | 5323–5448 (126) | Descarga el catálogo deätz Pokémon del juego | bajo demanda |
| `captureReferenceCatalogScript` | 5449–5464 | Catálogo de referencia de capturas | bajo demanda |
| `buildFarmAutomationScript` | 6239–6559 (**321**) | **Automatización de juego**: abrir mapa, navegar región, teletransportar, activar hunt, confirmar diálogos | a demanda |
| `loginScript` | 6737–6779 | Login automático | bajo demanda |
| `accountProfileSnapshotScriptLegacy` | 6903–7078 (176) | **Código muerto** | — |
| `accountProfileSnapshotScript` | 7079–7243 (165) | Perfil del jugador: nombre, nivel, rango, monedas, diamantes, VIP, avatar | 4 s (abierto) / 30 s (estadísticas) |
| `statisticsHuntContextScript` | 7390–7420 | Zona + Pokémon + líder para estadísticas | 15 s |

**Total: ~2.900 líneas de código string**, generado con `fn.toString()` en cada llamada.

### 8.2 La técnica más arriesgada: `captureMonitorInstallScript`

Para no depender del polling del DOM, el launcher **busca el contexto del socket WebSocket del juego dentro del árbol de React**:

```js
// renderer.js:2575-2590 (dentro del script inyectado)
if (key.startsWith('__reactProps')) inspect(element[key], 0);
let fiber = element[key];
if (fiber?.current) fiber = fiber.current;
for (let depth = 0; fiber && depth < 45; depth += 1, fiber = fiber.return) {
  inspect(fiber.memoizedProps, 0);
  inspect(fiber.memoizedState, 0);
  inspect(fiber.dependencies?.firstContext?.context?._currentValue, 0);
  inspect(fiber.dependencies?.firstContext?.context?._currentValue2, 0);
}
```

Luego se suscribe a `'field-kill'` para obtener **`{derrotados, drops, capturas}` en tiempo real**, con deduplicación por evidencia del payload (30+ rutas posibles para el nombre, 30+ para la calidad).

**Esmonths excelente en diseño**: tiene *fallback en dos capas* (suscripción al socket → polling del DOM), reintento cada 2 s durante 120 s si falla, y un **watchdog de salud cada 30 s** (`window.__pokeGridCaptureMonitorHealth`) que re-suscribe si la suscripción lleva más de 60 s sin actividad. Además el launcher lo reinstala cada 30 s por panel (`renderer.js:2891-2894`).

**Pero es también el mayor acoplamiento del proyecto**: depende de los nombres de claves internas de React (`__reactProps$…`, `fiber.return`, `memoizedProps`, `dependencies.firstContext`) y de la API interna del socket (`subscribe('field-kill')`). Una actualización de React, un cambio de estructura del componente o un rename en el juego rompe la captura en tiempo real. El fallback a DOM lo mitiga, pero no lo oculta: el usuario verá "Monitor de capturas sin respuesta" sin entender por qué.

### 8.3 El patrón "ventana espejo fuera de pantalla"

`captureLogPanelSnapshotScript` (646 líneas) **renderiza dentro de la página del juego una réplica del panel de capturas**, y luego:

```js
function hideMonitorSource(element, source) {
  element.dataset.pgLauncherMonitorSource = source;
  element.style.setProperty('position', 'fixed', 'important');
  element.style.setProperty('left', '-12000px', 'important');
  ...
}
```

Lee de esa réplica y la descarta; el launcher vuelve a renderizar la misma información en su propia UI. Esto duplica el DOM y el trabajo, y depende de clases CSS internas del juego (`.clog-window`, `.clog-row`, `.clog-ico`, `.clog-totals`, `.ha-window`, `.game-dock .dock-btn`, `.ah-panel`, `.phud`…). Funcional, pero es deuda técnica con forma de bomba de relojería.

### 8.4 `game-theme.js`: 5.377 líneas de las cuales ~4.000 están muertas

Análisis exhaustivo (verificado con grep y contra el test `tests/panel-injection-smoke.js`):

- `buildInstallScript()` serializa ~3.370 líneas de `THEME_CSS` y lo inyecta como `<style>`.
- **El propio archivo se auto-invalida**: `removeNativePanelRules` (líneas 3.391–3.421) parsea su CSS con `new CSSStyleSheet()` + `replaceSync()`, recorre `cssRules` y **borra toda regla cuyo selector toque clases del juego**, luego re-serializa. Resultado: de ~1.400 reglas CSS sobreviven únicamente los bloques `[data-pg-my-pokes-dialog]`, `[data-pg-surface]`, `.pg-float-resizer` y `html.pg-floating-active`.
- **Un `if (false && dock)` (línea 5.235)** desactiva todo el bloque de tematización del dock (líneas 5.236–5.316).
- Seis funciones `refresh*` completas — `refreshAutoHelper` (3.673), `refreshHuntAnalyzer` (3.876), `refreshProfilePanel` (4.085), `refreshTeamPanel` (4.475), `refreshCaptureManagement` (5.051), `refreshCaptureLog` (5.182) — **nunca se invocan**. Más `scoreLegacyTeamMedia` (4.225) y `markLegacyTeamSlotMedia` (4.245), y `centerAutoHelperOnOpen` (4.626) que nunca se pone a `true`.
- **El test `tests/panel-injection-smoke.js:39-53` valida explícitamente este estado**: comprueba que `data-pg-themed !== 'true'`, que no hay `[data-pg-team-panel]`, que el CSS del dock fue eliminado y que `window.__pgTeamPanelObserver` no existe. O sea: **la retracción de la feature está fijada por test**, lo cual es excelente en intención pero significa que eliminar el código muerto requiere también actualizar ese test.

**Lo que sí está vivo** (el núcleo mínimo): inyectar el `<style>`, limpiar estado previo, `refreshMyPokesPanel()` + `refreshGenericSurfaces()`, un `MutationObserver` global con debounce de 60 ms, un `resize` con `requestAnimationFrame`, y listeners `pointerdown`/`keydown`. Correcto: **cero `setInterval`, cero polling** en este archivo.

**Bugs concretos en el núcleo vivo** (todos en `game-theme.js`):

| # | Problema | Ref |
|---|---|---|
| G-1 | **Fuga ilimitada de listeners `keydown` en `window`**: el guardián `if (!burger.dataset.pgBound)` nunca se cumple porque `burger` se crea nuevo y **se borra inmediatamente** (3.481–3.483). Cada `dom-ready` añade un `addEventListener('keydown', …, true)` más con un closure muerto | 3.442–3.498 |
| G-2 | **Create-then-delete**: `burger`, `topToggle` y `backdrop` se crean, se les asignan atributos, se les bindean listeners, se les persiste `localStorage` y acto seguido se eliminan. Trabajo 100 % desperdiciado en cada instalación | 3.442–3.483 |
| G-3 | **`localStorage` escrito en cada `refresh()`**: la rama `else` de 5.317 siempre llama `setTopHidden(false)` ⇒ `setItem('pokegrid:dock-top-hidden:v1','false')` ⇒ **~16 escrituras sincrónicas/segundo** bajo carga de mutaciones, y **sobrescribe la preferencia del usuario** | 3.462–3.467 / 5.317 |
| G-4 | Atributos `data-pg-player-source-hidden` (4.457) y `data-pg-team-host-neutralized` (4.548) **nunca se revierten** ⇒ estado pegajoso en el DOM del juego | 4.457 / 4.548 |
| G-5 | **Regex con mojibake** en 3.924 y 3.941: contienen `Ã—` (doble codificación UTF-8 de `×`), por lo que esas búsquedas de botón de cierre **nunca coinciden** con una `×` real | 3.924 / 3.941 |
| G-6 | `summary.innerHTML = sourceTotals.innerHTML` (5.217) **reinyecta HTML del juego** sin sanear (mismo origen ⇒ no hay escalada, pero re-materializa marcado). Además serializa dos `innerHTML` completos por refresco | 5.217 |
| G-7 | `data.imageSrc` interpolado en CSS (4.470) escapa `"` pero **no** `)`, `\` ni salto de línea ⇒ CSS injection parcial | 4.470 |
| G-8 | El `setTimeout` de debounce de 60 ms (5.360) **no se cancela** al reinstalar; el observer previo se desconecta pero su temporizador vivo ejecutará el `refresh()` de un closure obsoleto | 3.437 / 5.360 |
| G-9 | `refreshMyPokesPanel` → `panelFromTitle` (4.066–4.083) hace `[...document.querySelectorAll('body *')]` y, por candidato, `getBoundingClientRect()` + `getComputedStyle()`; el `.sort()` (4.081) llama `querySelectorAll('*')` **dentro del comparador**. Con debounce de 60 ms ⇒ layout thrashing ~16×/s | 4.066–4.083 |
| G-10 | `refresh()` y sus sub-llamadas **no están dentro de `try/catch`**; una excepción a mitad deja el estado a medias sin registro | 5.231–5.326 |

---

## 9. Herramientas de datos

### 9.1 Hunt Analyzer (`renderer.js:4013-4496`)

- Lee el diálogo nativo del juego (o lo abre pulsando el botón del dock), extrae 9 métricas (derrotados, tiempo, XP, capturados, botín, suministros, botín/h, XP/h, derrotados/h), balance, estado de mercado y la tabla de drops con icono/valor.
- **No duplica temporizadores del juego** (requisito explícito en `docs/FUNCIONES.md:76`): lee contadores, no los genera.
- Reloj vivo: guarda `huntElapsedBase` + `huntElapsedAt` y actualiza solo el texto del temporizador cada segundo sin re-render completo.
- Iconos de drops hidratados con `hydrateHuntDropIcons` (caché LRU).
- Botones: Reset (relea), Eliminar sesión (limpia contadores nativos), Fijar/Reiniciar geometría, Cerrar.
- Cadencia: 1.5 s solo en paneles con el analizador abierto, con flag `huntPollBusy` y `Promise.allSettled`.

### 9.2 Capture Log (`renderer.js:1645-3740` + `game-theme.js`)

Es la herramienta más elaborada del proyecto:

- **Triple fuente de datos** con fusión: (1) cola de red en tiempo real del socket (`field-kill`), (2) filas del Capture Log nativo (`.clog-*`), (3) parcheo de `fetch`/XHR para capturar respuestas de captura. `processCapturedEvent(panel, capture, source)` marca la procedencia.
- **Archivo persistente en IndexedDB** (`pokegrid-capture-archive-v1`, v2, stores `captures` + `notifications`, índice `accountIndex`).
- **Fusión de filas por "completitud del dato"** (`captureRowCompleteness` + `mergeCaptureArchiveRow`, `renderer.js:3117-3188`): puntúa cada fila (id=12, IV=5, calidad=5, timestamp=5, 6 stats×2, etc.) y solo **pisa** un campo existente si la fila entrante es más completa o el campo estaba vacío. Resultado: si el snapshot del DOM llega con menos datos que la cola de red, **no se pierde información**. Diseño excelente.
- **Detección de novedades por conteo** (`captureKeyCounts`): no se comparan objetos completos, se comparan `Map<clave, cantidad>` — evita processing masivo cuando el log nativo trae las mismas 500 filas.
- **Firma de archivo** (`captureArchiveSignatures`) con `JSON.stringify` para no re-escribir filas idénticas.
- 9 filtros (días, nº captura, Pokémon múltiple con acumulación por clic, IV mín/máx, Power mín/máx, ball, variante shiny) + 9 criterios de orden, persistidos por cuenta.
- Sprite de cada Pokémon con sistema de 3 capas: sprite nativo del juego → sprite de PokéAPI (data URL) → emoji de reserva.
- `captureLogReadGeneration` + `captureLogReadPromise` evitan carreras entrelectura y borrado.

### 9.3 Notificaciones y metas (`renderer.js:871-1644`)

- Eventos: **captura** (cumple meta), **shiny derrotado**, **legendario capturado/derrotado**, **drop obtenido**.
- `isDuplicateNotificationEvent` con dos estrategias: `sourceKey` estable (Set, deduplicación permanente) o **firma temporal** de 60 s (Map con purga a 120 s).
- Notificación de escritorio del SO + toast interno con `context.close()` automático.
- Metas configurables: tipo (captura/drop), Pokémon objetivo (catálogo searchable), cuenta (-1 = cualquiera), IV mínimo, cantidad mínima, tiers permitidos, nivel mínimo.
- 6 filtros del panel (texto, tipo, rango de fechas, IV mínimo, tier) + contadores (Metas/Shinies/Legendarias) + gestor de metas (buscar, filtrar, crear, editar, eliminar).

### 9.4 Estadísticas (`renderer.js:7346-7737`)

- Dos vistas: **Resumen por cuenta** (perfil, zona, objetivo, 12 métricas, drops) y **Comparación de Hunt** (ranking ponderado por XP/h, botín/h, capturas, derrotados/h, balance).
- Cachés escalonadas para no golpear los webviews: hunt 5 s, contexto 15 s, perfil 30 s (`STATISTICS_*_INTERVAL_MS`).
- `STATISTICS_ACCOUNT_COLORS` con **solo 4 colores** y módulo (`index % 4`) ⇒ con 5+ cuentas los colores se repiten y la identificación por color se pierde.
- Gantt de color por cuenta con variable CSS `--account-color`.

### 9.5 Perfil de cuenta (`renderer.js:7079-7345`)

Lee nombre, nivel, rango, Pokédolares, diamantes, VIP y avatar. **Fusión defensiva**: `mergeStatisticsProfile` solo acepta campos verificados, conserva el último valor bueno (`accountProfileLastGood`) y muestra "Último dato válido" si la lectura falla. Avatar con validación de esquema (`data:` o `https://poke.idleworld.online/`) y filtro de logos.

### 9.6 Modo farmeo (`renderer.js:329-3320` + `scripts/vpn-per-account.cjs`)

El módulo más complejo a nivel de lógica de negocio:

- **Catálogo de objetivos** leído del propio juego (`farmEnhancedCatalogScript`, 476 líneas) → normalizado a objetivos con área, nivel, tipos, tier, variantes shiny, especie de sprite.
- **Motor de recomendación** (`evaluateFarmTarget`, `renderer.js:632-715`): tabla de efectividad de tipos de 18×18 (`TYPE_EFFECTIVENESS`), puntuación ponderada por nivel accesible, ventaja de tipo, rareza, y penalización por coste/riesgo. Genera un **"plan de ruta"** ordenado (`renderFarmRoute`).
- Filtros: búsqueda, región, tipo, nivel (5 franjas + "solo accesibles"), matchup (recomendado/ventaja/seguro), orden, variante shiny.
- **Automatización** (`buildFarmAutomationScript`, 321 líneas): abre el mapa, navega regiones, teletransporta, activa la caza, confirma diálogos de advertencia, con `waitFor` generoso (10 s) y mensajes de error en español. **Pide autorización explícita para viajar a Orre** (checkbox separado).
- `farmEnhancedContextScriptLegacy` (187 líneas) es **código muerto**.

### 9.7 Pokédex

Ventana `BrowserWindow` independiente, fullscreen, `frame:false`, partición propia, con controles de minimizar/cerrar propios vía `pokepedia-preload.js`. Motivo documentado: no reducir la cuadrícula principal.

### 9.8 Gestión de memoria (botón "RAM")

Enfoque **deliberadamente conservador y bien documentado**:

- `main.js:1437-1464`: mide `app.getAppMetrics()` antes/después, limpia `remoteImageCache` y `pokeApiSpeciesCache`, y **NO** toca los procesos del juego. Comentario explícito: *"No se adjunta el depurador ni se fuerza el GC de Chromium: ambas operaciones pueden invalidar la superficie gráfica de webviews activas y dejar la ventana completamente negra."*
- `renderer.js:9069-9096` (`releaseLauncherMemoryCaches`): limpia cachés de iconos/especies/sprites y vacía los paneles de Capture Log / Hunt / perfil que estén **cerrados**.
- El tooltip del botón informa de las 5 cosas que hizo y de las 3 que deliberadamente no hizo. Transparencia excelente.

### 9.9 Estadísticas de sprites

- `main.js:98-124` (`loadAllowedImageDataUrl`): allowlist estricta — solo `poke.idleworld.online`, `pokexguides.com` y sprites de `raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/[1-9]\d{0,3}.png`. Rechaza HTTP, credenciales en URL, query, hash, `content-type` que no sea `image/*` y >2 MB. LRU de 48 entradas que **guarda la promesa** (dedupe de peticiones concurrentes).
- `main.js:126-147` (`resolvePokeApiSpecies`): valida slug `/^[a-z0-9-]{1,80}$/`, LRU de 256, y valida el ID de especie (1–2000).

---

## 10. Userscripts y Script Shop

### 10.1 Modelo

Normalización autoritativa en `main.js:307-363`:

```
id, name, namespace, version, description, author, sourceUrl,
shopId, shopVersion, shopSha256, shopCatalogUrl,
code, enabled,
accounts: boolean[]  (longitud variable, recortada a 32)
matches: string[]   (@match + @include; si vacío → ["https://poke.idleworld.online/*"])
games: string[]     (@game explícito o derivado de matches, ≤8)
excludes, grants, connects: string[]  (≤50)
runAt: document-start | document-end | document-idle  (default document-end)
createdAt, updatedAt
```

Doble validación de sintaxis al guardar: en el renderer (`vm.Script`, solo compila) y en main (`new Function`, que además **ejecuta la comprobación de sintaxis de la función async**).

### 10.2 Editor (1.483 líneas, muy completo para ser vanilla JS)

- `textarea` + `<pre>` de números de línea sincronizados.
- Deshacer/Rehacer, comentar líneas, duplicar línea, Tab/Shift-Tab con 2 espacios (usa `setRangeText` + evento `input` sintético).
- Buscar con contador `n/m`, navegación cíclica con Enter,匹配 por offsets.
- Validación con debounce de 420 ms, **bloquea el guardado si no valida**.
- Resumen de permisos: chips de juego, `@match`/`@include`, `@grant` (oculta `none`), `@connect` en amarillo, aviso de `document-start` no soportado, aviso de directivas no soportadas.
- Indicador `Ln X, Col Y` en la barra de estado.

### 10.3 Inyección en los guests

- `buildRuntimeSource()` genera el código con la API GM completa (`GM_addStyle`, `GM_setValue`/`getValue`/`deleteValue`, `GM_xmlhttpRequest`, `GM_notification`, `GM_openInTab`, `GM_download`, `GM_registerMenuCommand`, `PokeGrid_sharedStorage`) + `unsafeWindow = window`.
- **Anti-duplicado** por `scriptId + '::' + location.href` en un `Set` global del guest: una navegación SPA a otra URL re-ejecuta (semántica Tampermonkey), un `pushState` a la misma URL no.
- Registro **antes** de ejecutar; se borra solo si el script lanza.
- Inyección **secuencial** con `await` por script y por panel, en el main world (por eso `unsafeWindow` funciona).
- La ejecución **no** se espera (`__execute()` sin await) ⇒ no bloquea el login. Decisión correcta.
- Tras cualquier cambio (guardar/borrar/instalar) el launcher **recarga el webview** en vez de re-inyectar (necesario por el registro anti-duplicado).

### 10.4 Script Shop

- Catálogo en `https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/catalog.json` (`raw.githubusercontent` no tiene rate limit como la API).
- Caché de 5 min en main; si el fetch falla y hay caché, devuelve `{stale:true, warning}` y la UI lo dice.
- Validaciones en main: `schemaVersion===1`, IDs únicos con regex, SHA-256 hex de 64, versión semver, `downloadUrl` restringida a `raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/(main|[a-f0-9]{40})/scripts/<id>.user.js`, ≤200 ítems, ≤512 KB de catálogo, BOM tolerado.
- Instalación: descarga con `redirect:'error'` → SHA-256 exacto → `@version` y `@namespace` del archivo coinciden con el catálogo → `minLauncherVersion` ≤ versión del launcher → adopción de copias manuales con mismo `namespace`+`@name`.
- 4 estados de UI: disponible / actualizar / **modificado localmente** / instalado. Badges en 3 sitios con tope "99+".
- Refresco: al arrancar, al abrir el modal sin caché, cada 5 min **si la ventana está visible**, al enfocar la ventana, al volver la conexión.
- Publisher propio en PowerShell (11 herramientas + 9 tests) + CI que valida catálogo, metadatos, SHA-256 de cada archivo y coincidencia `@version`/`@namespace`.

---

## 11. Extensiones desempaquetadas

Bloque `<details class="extension-lab">` marcado **"Experimental"** en el Centro de scripts.

- Selección de carpeta → validación de `manifest.json` (debe tener `name`, `version` y `manifest_version` 2 o 3).
- `session.extensions.loadExtension(path, { allowFileAccess: false })` **por cuenta**, con remoción previa de la anterior.
- Semántica **opt-in** (a diferencia de los scripts que son opt-out).
- El texto de la UI es honesto: *"Electron no admite Chrome Web Store ni archivos CRX y solo implementa parte de las APIs de Chrome. Esta opción no sustituye el centro nativo ni garantiza que Tampermonkey funcione."*

---

## 12. Autoactualizador

### 12.1 Flujo

```
main.js:app:check-update
  └─ updater.js:prepareUpdate
       ├─ readLatestRelease  → GET api.github.com/repos/DiegoT34/PokeGrid-Launcher/releases/latest
       │    · cache:no-store, User-Agent propio
       │    · rechaza draft/prerelease
       │    · compara versiones (normalizeVersion + compareVersions)
       │    · exige assets EXACTOS: IDLE-POKE-LAUNCHER-x.y.z-portatil.zip  y  .zip.sha256
       │    · assertGitHubDownloadUrl → solo https://github.com/... (no username/password)
       │    · UPDATE_MAX_BYTES = 1 GB
       ├─ downloadFile  → TransformStream con medidor de progreso + límite duro de 1 GB
       ├─ sha256File    → pipeline(fs.createReadStream, hash)
       ├─ comparación estricta; si no coincide → descarta
       ├─ persistVerifiedRelease → copia ZIP + .sha256 a app.getPath('downloads')
       └─ devuelve {status:'ready', updateRoot, statusPath, sha256, ...}
  └─ updater.js:launchPreparedUpdate
       ├─ escribe install-update.ps1 (PowerShell embebido como String.raw)
       ├─ escribe install-update.json (config con todos los parámetros)
       ├─ escribe start-update.ps1 (bootstrap oculto) + redirige stdout/stderr a logs
       ├─ spawn(powershell, ['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File', bootstrap])
       └─ poll de update-status.json cada 200 ms; resuelve al ver un estado de progreso;
          rechaza si hay 'failed', exit≠0, o 15 s sin confirmar
```

### 12.2 El instalador PowerShell: lo mejor y lo peor del proyecto

**Lo mejor — un protocolo de instalación correcto:**

1. Validaciones de rutas: nada puede ser la raíz, `TargetDir` debe ser hijo directo de `DownloadsDir`, `TargetDir ≠ InstallDir`.
2. Extrae a un *staging* y **valida que existe el ejecutable esperado y `resources\app.asar`**.
3. Espera cierre elegante (8 s), luego `Stop-Process -Force` solo de los procesos **de ese mismo ejecutable** (filtra por `ExecutablePath` con `GetFullPath -ieq`).
4. Mueve la carpeta nueva a un lado (`*.pokegrid-previous-$PID`), instala, y **reintenta el arranque hasta 3 veces**.
5. **Handshake de confirmación**: el nuevo launcher recibe `--pokegrid-update-handshake=<path>` y, cuando su ventana está lista, escribe un JSON con `processId` + `executablePath` (`main.js:41-62`, con validación de que la ruta esté dentro de `userData/updates/`). El instalador compara **pid y ruta** antes de dar por buena la instalación.
6. Flag `$installationCommitted`: una vez confirmada la ventana nueva, **ningún error de limpieza posterior revierte** la actualización (sale con código 0 y marca `cleanupPending`).
7. Rollback completo: mata el proceso nuevo, borra la carpeta incompleta, restaura la anterior, y **vuelve a abrir la versión previa**.
8. Limpiezas con reintento exponencial (`Remove-DirectoryWithRetry`, hasta 60 s) porque Windows bloquea archivos de procesos que acaba de morir.

**Lo peor — consecuencias de diseño:**

| Problema | Detalle |
|---|---|
| **Instala en Descargas y borra la carpeta original** | Tras la primera actualización el launcher **deja de estar donde el usuario lo puso**. El acceso directo/atajo del usuario apunta a una ruta inexistente. |
| **Ejecutar desde Descargas es problemático** | Windows-controlled folders, carpeta monitoreada por AV/EDR, el usuario ve aparecer un `.zip` de 130 MB y una carpeta con el ejecutable mezcladas entre sus descargas. |
| **Los ZIP se acumulan para siempre** | Cada actualización deja un `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip` + `.sha256` en Descargas. Tras 10 actualizaciones son ~1.3 GB. |
| **`-ExecutionPolicy Bypass`** | Bandera que muchos AV/EDR y políticas corporate marcan. Justificada (PowerShell 5.1 no admite shebang), pero avoidable. |
| **El estado no se relee nunca** | `update-status.json` se escribe con mucho cuidado pero **el launcher nunca lo lee al arrancar**. El usuario no se entera de si la limpieza anterior quedó pendiente, ni de dónde quedó instalado. |
| **Sin notar al usuario** | Tras instalar, la app se cierra, abre la nueva y no dice nada. |
| **Sin comprobación al arrancar** | Solo se consulta GitHub si el usuario pulsa el botón. Una versión con fix de seguridad crítico no se propaga sola. |
| **Windows PowerShell 5.1** | Presente en Windows 10/11 pero en deprecación. No hay fallback a `pwsh` ni a un instalador en Node. |

### 12.3 Seguridad del canal de actualización

Correcta y bien pensada:
- Solo acepta `DiegoT34/PokeGrid-Launcher`.
- `assertGitHubDownloadUrl` exige `https` + host `github.com` + sin credenciales.
- SHA-256 obligatorio y comparado byte a byte.
- Rechaza `draft` y `prerelease`.
- El handshake valida que la ruta esté dentro de `userData/updates/` (evita que un `--pokegrid-update-handshake` arbitrario escriba fuera).
- El instalador nunca ejecuta nada de la Release: solo extrae y lanza el `.exe` que el usuario ya había descargado desde GitHub.

**Ausencia notable:** no hay **firma de código** (Authenticode). `signAndEditExecutable: false`. Sin firma, Windows SmartScreen avisa ("Editor desconocido: Windows ha protegido su PC") en cada usuario nuevo, y muchos AV generan falsos positivos con un binario de 215 MB sin firmar. Es, con diferencia, el mayor obstáculo de distribución del proyecto.

---

## 13. Mapa de persistencia

### 13.1 En disco (`%APPDATA%/IDLE POKE LAUNCHER`)

| Archivo | Formato | Contenido | Escritura |
|---|---|---|---|
| `accounts.enc` | **Cifrado DPAPI** (`safeStorage`) | Cuentas: id, label, usuario, contraseña, proxy | Atómica (`.tmp` + `rename`). **Sin copia de seguridad** |
| `accounts-source.json` | JSON plano | Ruta del `.txt` vinculado + `mtimeMs` | Atómica |
| `userscripts.json` | JSON plano | Hasta 100 scripts con su código (≤10 MB cada uno) | Atómica |
| `userscripts-shared.enc` | **Cifrado DPAPI** | Almacén compartido de los scripts, ≤1 MB | Atómica |
| `unpacked-extension.json` | JSON plano | Ruta de la extensión + flags por cuenta | Atómica |
| `game-cache-maintenance.json` | JSON plano | Marca de la última limpieza de caché (cada 7 días) | Atómica |
| `update-status.json` | JSON plano | Estado del actualizador | Atómica |
| `updates/v{ver}-{ts}/` | Directorio | ZIP, firma, `.ps1`, `.json`, logs | Transitorio, se autolimpia |
| `Partitions/pokegrid-{id}/` | Chromium | Cookies, Local Storage, IndexedDB, Service Worker, Cache de cada cuenta | Chromium |

### 13.2 En `localStorage` (renderer)

| Clave | Contenido |
|---|---|
| `pokegrid:farm-config:v1` | Configuración de farmeo por cuenta |
| `pokegrid:farm-orre-permission:v1` | Autorización de viaje a Orre |
| `pokegrid:notifications:v1` | Últimas **500** notificaciones (mirror del IndexedDB) |
| `pokegrid:capture-goals:v1` | Metas de captura/drop |
| `pokegrid:grid-visible:v1`, `idle-poke:grid-order:v1` | Visibilidad y orden del grid |
| `pokegrid:grid-view:v1` | Legacy (migrado) |
| `pokegrid:browser-instances:v1`, `pokegrid:active-browser-instance:v1` | Instancias multijuego |
| `pokegrid:notification-counters:v1` | Contadores de metas/shiny/legendario |
| `pokegrid:script-shop-seen:v1` | Scripts de la Shop ya vistos |
| `launcherSidebarOpen`, `launcherTopbarCollapsed` | Estado del menú y de la barra |
| `panelZoom:{i}`, `captureLogSort:{i}`, `captureLogFilters:{i}` | Por **posición** de panel |
| `huntFloatGeometry:*`, `captureFloatGeometry:*` | Geometría de paneles flotantes |

### 13.3 En IndexedDB (renderer)

Base `pokegrid-capture-archive-v1` (versión 2):
- `captures` (keyPath `archiveKey`, índice `accountIndex`) — archivo de capturas.
- `notifications` (keyPath `id`) — historial permanente de notificaciones.

### 13.4 En el guest (dentro de la página del juego)

- `pokegrid:userscript:<id>:storage` — `GM_setValue` de los scripts del usuario.
- `pokegrid:dock-top-hidden:v1`, `pokegrid:team-hud-collapsed:v1`, `pokegrid:*-geometry:v{1,2,3}` — preferencias del tema inyectado.

---

## 14. Seguridad

### 14.1 Lo que está bien

| Control | Implementación |
|---|---|
| Aislamiento del renderer | `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`, `webviewTag:true` |
| Aislamiento de instancias | `will-attach-webview` borra preload y fuerza sandbox |
| Permisos | `setPermissionRequestHandler → false` en sesiones de juego, Pokédex e instancias |
| Credenciales | `safeStorage` (DPAPI). Nunca se escriben en `localStorage` ni se envían por red propia |
| CSP del launcher | `default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: https://poke.idleworld.online https://pokexguides.com` |
| Puentes de red de scripts | Solo HTTPS, `@connect` explícito, revalidación **después** de redirecciones, allowlist de métodos, cabeceras prohibidas (`cookie/host/origin/referer/content-length`), ≤1 MB de cuerpo, ≤2 MB de respuesta, ≤40 partes multipart con MIME allowlist |
| Autorización por origen | `authorizeUserScriptRuntime` exige partición conocida + `isGameUrl(sender.getURL())` + script habilitado y no bloqueado en esa cuenta + `@grant` cuando aplica |
| Sprites remotos | Allowlist de host + regex de ruta PokéAPI + `content-type` de imagen + ≤2 MB + sin query/credenciales |
| Tienda | `redirect:'error'` + host exacto + SHA-256 + versión + namespace + `minLauncherVersion` |
| Actualizador | Repositorio fijado + SHA-256 + handshake con validación de ruta + rollback |
| Validación de entrada | Límites en todos los lados; todo `.slice(0, N)` |
| XSS en el launcher | `escapeHtml` (`& < > ' "`) aplicado consistentemente en los 8 sitios de `innerHTML` con datos. **No se encontró XSS explotable** |
| Telemetry | Ninguna. El `User-Agent` enviado a la tienda y al actualizador es `PokeGrid-Launcher/{version}` |
| Secretos en git | `.vpn/` ignorado (contiene enlaces `vmess://` reales); `accounts.enc` y `accounts-source.json` ignorados; scripts personales ignorados |

### 14.2 Lo que falta o preocupa

| # | Hallazgo | Ref |
|---|---|---|
| S-1 | **Solo 3 de ~30 handlers IPC validan `event.sender`** | `main.js:1323, 1407, 1411` vs el resto |
| S-2 | **Los webviews del juego no pasan por el endurecimiento de `will-attach-webview`**; su `preload` lo fija el renderer. Sin defensa en profundidad | `main.js:994-1005` |
| S-3 | **`@grant` es puramente informativo.** Todas las APIs GM se definen siempre en el runtime inyectado, aunque el script declare `@grant none`. Solo el almacén compartido comprueba el grant en main. **La UI promete un control de permisos que no existe** | `userscripts.js:1113-1233` vs `main.js:539-541` |
| S-4 | **Scripts sin sandbox por diseño**: `executeJavaScript` en el main world + `unsafeWindow = window` + `localStorage` + `fetch` + `window.open` + descarga de ficheros. Un script malicioso tiene control total de la sesión de esa cuenta. La nota de seguridad de la UI lo dice, pero el modelo no tiene aislamiento | `userscripts.js:1234` |
| S-5 | **Sin firma de código** (`signAndEditExecutable:false`) ⇒ SmartScreen y posibles falsos positivos de AV | `package.json:77` |
| S-6 | **La plantilla `.txt` de cuentas contiene contraseñas en texto plano** y queda vinculada permanentemente; el launcher la re-lee cada 15 s y la **nunca borra**. La UI lo advierte, pero no hay expiración ni "desvincular" | `renderer.js:8677`, `main.js:228-243` |
| S-7 | `SECURITY.md` pide **abrir un Issue** para reportar vulnerabilidades ⇒ exposición pública de detalles sensibles | `SECURITY.md` |
| S-8 | `mergeAccountIds`/plantilla: al re-sincronizar se conservan ids **por posición**. Si el usuario reordena el `.txt`, las sesiones se asignan a cuentas equivocadas | `main.js:217-226` |
| S-9 | El HTML del sprite del perfil se sanea solo con `.replace(/["<>]/g,'')` (permite `data:` de cualquier MIME). Riesgo bajo (SVG/HTML en `<img src>` no ejecuta) pero evitable | `renderer.js:7298-7299` |
| S-10 | `setPermissionRequestHandler → false` **para todo** puede romper features legítimas del juego (notificaciones push, portapapeles, geolocalización) y no hay `setPermissionCheckHandler` | `main.js:903, 911, 999` |
| S-11 | El `User-Agent` sin token Electron puede **provocar el bloqueo del juego** si este detecta el navegador. Riesgo de negocio, no de seguridad | `main.js:1616-1618` |
| S-12 | El kill-switch de diagnóstico (`POKEGRID_DIAGNOSTIC_DISABLE_SCRIPT_PATTERN`) solo actúa en la **copia del renderer**: el script **sigue ejecutándose en los guests** | `userscripts.js:825-830` |

---

## 15. Desempeño: hallazgos concretos

### 15.1 Timers globales permanentes (`renderer.js:9468-9473`)

| Intervalo | Función | Coste con 32 cuentas |
|---:|---|---|
| 1.000 ms | `updatePanelLiveClocks` | Recorre todos los paneles; **`new Intl.DateTimeFormat` creado cada segundo** (4272); 2 `querySelector` por fila y segundo en estadísticas (4293, 4298) |
| 1.500 ms | `pollHuntAnalyzers` | Solo paneles abiertos, pero **`huntAnalyzerSnapshotScript()` re-serializa ~200 líneas con `toString()` en cada llamada** (4215) + re-render completo del DOM (4307) |
| 3.500 ms | `pollCaptureNotifications` | **TODOS los paneles, sin importar si la UI está abierta** (2888). Con 32 cuentas ≈ 9 `executeJavaScript`/s, cada uno con `captureSnapshotScript()` |
| 4.000 ms | `pollCaptureLogs` | Solo paneles con Capture Log abierto |
| 4.000 ms | `pollAccountProfiles` | Solo paneles con perfil abierto |
| 15.000 ms | `syncLinkedAccounts` | Lee `mtime` del `.txt` vinculado |
| 5.000 ms | `refreshFarmContexts` (solo con farmeo abierto) | `farmEnhancedContextScript()` de 476 líneas, re-serializado cada vez |
| 5 min | Shop (usuarioscripts) | Catálogo |

### 15.2 P-01 · El proceso principal se congela con muchos scripts (CRÍTICO)

`readUserScripts()` (`main.js:365-377`):
```js
for (const row of rows.slice(0, USER_SCRIPT_LIMIT)) {      // hasta 100
  try { scripts.push(normalizeUserScript(row, row)); } catch {}
}
```
Y `normalizeUserScript` **compila el código**:
```js
new Function(`return async function () {\n${code}\n};`);    // main.js:314
```

Y `readUserScripts()` se llama en:
- `userscripts:list`, `userscripts:save`, `userscripts:delete`, `userscripts:shop-*` — esperado.
- **`authorizeUserScriptRuntime`** (`main.js:530-543`) — llamado en **cada** `GM_xmlhttpRequest`, `getSharedValue`, `setSharedValue`, `deleteSharedValue`.

Combinado con `getGameAccountIndex()` (`main.js:518-528`), que hace `readAccounts()` → **`safeStorage.decryptString(fs.readFileSync(...))` + `JSON.parse` + `normalizeAccounts` en disco**, también en cada llamada.

**Coste real por petición de red de un script**, en el proceso principal:
1. Leer y descifrar `accounts.enc` (I/O + DPAPI).
2. Leer `userscripts.json` (hasta 100 × 10 MB = **1 GB**).
3. `JSON.parse` de hasta 1 GB.
4. **`new Function()` sobre hasta 100 scripts de 10 MB** (compilación de V8, CPU pura, síncrono, en el hilo del main process).
5. Recién entonces autorizar.

Un script que envía 200 alertas de Telegram por hora puede bloquear el launcher varios segundos por llamada. Con `writeUserScripts` → `JSON.stringify` de 1 GB el problema se repite en cada guardado.

### 15.3 P-02 · Crecimiento no acotado del historial de notificaciones (CRÍTICO)

Tres estructuras crecen para siempre:

1. `launcherNotifications` (array en memoria): solo se le hace `unshift` (1502, 1562, 1627). `saveLauncherNotifications()` limita a 500 **solo al escribir en `localStorage`** (948), pero el array en memoria no se recorta.
2. `notificationSourceKeys` (`Set`): una entrada por notificación con `sourceKey` (1439-1441). **Nunca se poda** (solo se reconstruye al hidratar y al borrar todo).
3. Store `notifications` de IndexedDB: `persistLauncherNotifications` hace `put` incremental (3063-3073) y **nunca borra**. En cada arranque, `hydrateNotificationArchive()` hace **`getAll()` de todo el histórico** (3075-3095) y lo funde en memoria.

Un usuario con 8 cuentas farmeando 24 h/día puede generar miles de eventos al mes. El arranque se ralentiza de forma progresiva e invisible.

### 15.4 P-03 · `renderNotifications()` reconstruye hasta 500 tarjetas por pulsación

`renderer.js:8779-8782` engancha **`input` y `change`** de los 6 filtros a `renderNotifications` directamente. Y `renderNotifications` (1288-1395) hace `replaceChildren()` y reconstruye hasta **500 `<article>`** completos, cada uno con `new Intl.DateTimeFormat` (1359). Escribir 8 caracteres en el buscador = 8 reconstrucciones de 500 tarjetas.

### 15.5 P-04 · Re-render completo del DOM en bucles de alta frecuencia

| Función | Cadencia | Coste |
|---|---|---|
| `renderHuntAnalyzer` (4307) | 1.5 s por panel abierto | `replaceChildren()` + reconstruye 9 tarjetas, balance, tabla de drops |
| `renderStatistics` (7621) | 5 s con el modal abierto | `replaceChildren()` + `innerHTML` de tarjeta completa (7667, ~1 KB) por cuenta + tabla de comparación |
| `renderCaptureLog` (3501) | 4 s por panel abierto | Reconstruye la lista completa de capturas |
| `renderScriptShop` (577) | En **cada tecla** del buscador (1357, sin debounce) | Hasta 200 tarjetas con `innerHTML` + 3 listeners cada una; además colapsa los `<details>` de permisos, resetea el scroll y puede perder el foco |

### 15.6 P-05 · Caché de imágenes remotas en el proceso principal

`REMOTE_IMAGE_CACHE_LIMIT = 48` entradas, cada una un **data URL base64** de hasta 2 MB binarios ≈ 2.7 MB de string. Peor caso: **~130 MB de strings en el proceso principal**, que nunca se vacían salvo que el usuario pulse "RAM". `pokeApiSpeciesCache` (256) y `pokeApiSpriteCache` (renderer) son mucho más pequeños.

### 15.7 P-6 · `Intl.DateTimeFormat` creado en bucle

- `updatePanelLiveClocks`: **uno por segundo** (4272).
- `renderHuntAnalyzer`: uno por render (4324).
- `renderNotifications`: **uno por notificación** (1359) ⇒ hasta 500 por render.
- `renderAccountProfile`: uno por render (7314).

`Intl.DateTimeFormat` es de las construcciones más caras de la plataforma. Deben ser constantes de módulo.

### 15.8 P-7 · Cargas de `localStorage` en operaciones de alta frecuencia

- `updateZoom` (4512) escribe en cada llamada.
- `game-theme.js:5.317` escribe `dock-top-hidden` en **cada `refresh()`** ⇒ ~16 escrituras sincrónicas/segundo (G-3).
- `syncCaptureFilterOptions` (3356) se ejecuta en cada cambio de filtro.

### 15.9 P-8 · Operaciones O(n²) y llamadas IPC síncronas repetidas (userscripts.js)

- `customGameDescriptors` (152-165): `panelRows.filter(...)` **dentro** de un `for` ⇒ O(n²), y llama `webview.getURL()` (IPC síncrono) por panel. Se invoca desde `scriptScope` y `scriptGameLabels`, que a su vez se llaman en `displayMetadata` (2 veces), en `renderList` por script y en `renderScriptShop` por tarjeta ⇒ **decenas de `getURL()` síncronos por reconstrucción de UI**.
- `reloadScriptPanels` (808-814) llama `currentPanelUrl(panel)` **dos veces en la misma línea**.
- `scriptShopNotificationCounts` (530-538): 2 filtros con búsqueda lineal por ítem ⇒ O(n²) sobre 200 ítems.

### 15.10 P-9 · Editor de código con archivos de hasta 10 MB

- `updateLineNumbers` (336-340): `value.split('\n')` + `Array.from({length})` + `join` **en cada pulsación** (se llama desde `refreshEditor` síncrono).
- `updateCursorStatus` (342-346): `value.slice(0, selectionStart).split('\n')` en cada `keyup`/`click`/`select` ⇒ O(n) por tecla.
- `validateSyntax` (348-370): envía el **código completo** por IPC cada 420 ms tras dejar de escribir, y main lo compila con `vm.Script`.
- `updateFindMatches` (440-456): escaneo O(n) del búfer en cada tecla si la barra de búsqueda está abierta.
- `refreshEditor()` **sin debounce** (1406); el debounce de 120 ms solo cubre `displayMetadata` y el de 420 ms la validación.

Con el script real más pesado del catálogo (`better-market-and-more`, **920 KB**) el editor es usable. Con 10 MB es inutilizable.

### 15.11 P-10 · Coste del CSS

- 1.411 selectores, 1.435 reglas, **241 grupos de selectores duplicados** (379 reglas redundantes, ~27 %). Ejemplos: `.farm-pokemon-grid` ×8, `.hunt-float-action` ×6, `.account-info-card` ×4, `.capture-flat-row` ×4. Consecuencia típica de parches iterativos sin `@layer`.
- 34 `!important` (muchos legítimos por la especificidad del DOM del juego inyectado).
- Los assets PNG sin usar (2.7 MB) se analysean desde el asar en cada arranque del renderer.

### 15.12 Coste de instalación de `game-theme.js` por carga

Por cada `dom-ready` de cada webview: `JSON.stringify(THEME_CSS)` sobre ~100 KB + `new CSSStyleSheet()` + `replaceSync()` + recorrido de `cssRules` con `split(',')` + **re-serialización completa con `cssText`**. Con 32 cuentas recargando simultáneamente son 32 veces. Y recordemos que **la mayor parte de ese CSS se descarta acto seguido** (el autofiltro lo invalida).

---

## 16. Errores y riesgos detectados (consolidado)

### 16.1 Funcionalidad (bloquean o rompen features)

| ID | Severidad | Descripción | Ref |
|---|---|---|---|
| **BUG-01** | 🔴 Alta | **Script recién instalado desde la Shop nunca se inyecta en Poke Idle World.** `installFromScriptShop` envía solo `{shopId}`; main guarda `accounts: []`; el renderer exige `accounts[i] === true` | `userscripts.js:702`, `main.js:844-846`, `userscripts.js:801` |
| **BUG-02** | 🔴 Alta | **Opt-in vs opt-out contradictorios entre capas.** Renderer: `=== true` (estricto). Main: `=== false` bloquea (fail-open). Doc: "opt-out". Con 1–32 cuentas, un script con 4 flags no se ejecuta en la 5ª, **pero la UI la muestra marcada** | `userscripts.js:801` vs `main.js:536` |
| **BUG-03** | 🟠 Media | **Escape en la barra de buscar del editor cierra el Centro de scripts entero** (falta `stopPropagation`) | `userscripts.js:1446-1448` vs `1455-1457` |
| **BUG-04** | 🟠 Media | **"Actualizar" pisa ediciones locales sin confirmar.** Editar un script de la Shop vacía `shopSha256` ⇒ estado "modificado" ⇒ el botón pasa a "Actualizar" y sobrescribe sin `confirm` (el uninstall sí lo pide) | `userscripts.js:619, 647` |
| **BUG-05** | 🟠 Media | **Pérdida de cambios sin control de "sucio".** `showDraft` reasigna `codeInput.value` (destruye el undo nativo) sin aviso; se llama al seleccionar, al crear, al deshacer, en install/uninstall de Shop y en `loadScripts`. No hay `beforeunload` del editor | `userscripts.js:769-781, 832` |
| **BUG-06** | 🟠 Media | **El puente GM no existe en las instancias de navegador secundarias.** El script se inyecta (la UI lo anuncia) pero `GM_xmlhttpRequest` y el almacén compartido fallan siempre: `main.js:1000` borra el preload y `getGameAccountIndex` no reconoce `persist:pokegrid-instance-*` | `main.js:1000, 518-528` |
| **BUG-07** | 🟠 Media | `GM_xmlhttpRequest` lanza `TypeError` **de forma síncrona** si el preload no está (el optional chaining solo protege el acceso a la propiedad, no la llamada), y el `.catch` re-lanza generando *unhandled rejection* en el guest | `userscripts.js:1203-1212` |
| **BUG-08** | 🟡 Baja-media | **Imposible guardar un script desactivado con todas las cuentas desmarcadas** (la validación ocurre antes de mirar `enabled`) | `userscripts.js:845-848` |
| **BUG-09** | 🟡 Baja-media | **Auto-sobrescritura silenciosa del módulo Telegram**: en cada `loadScripts()`, si la versión empaquetada es mayor, se guarda encima y **se pierde cualquier edición local sin aviso** | `userscripts.js:215-230, 824` |
| **BUG-10** | 🟡 Baja-media | **Arrastrar un `.user.js` más antiguo sobrescribe el más nuevo** (busca por `namespace`+`name` sin comparar `@version`) | `userscripts.js:930-940` |
| **BUG-11** | 🟡 Baja | `toLocaleLowerCase()` **puede cambiar la longitud** de la cadena (`İ` → `i`+U+0307), desalineando los offsets del buscador respecto al valor original | `userscripts.js:444-445` |
| **BUG-12** | 🟡 Baja | APIs GM muertas o neutras: `GM_registerMenuCommand` escribe en un array que nadie lee; `GM_openInTab` con `allowpopups="false"` siempre devuelve handle cerrado; `GM_download` hace `click()` sobre un `<a>` no insertado en el DOM | `userscripts.js:1178-1200` |
| **BUG-13** | 🟡 Baja | **Desinstalar no limpia el estado en el guest**: ni `localStorage` (`pokegrid:userscript:<id>:storage`), ni `<style>` inyectados, ni toasts, ni la entrada del registro anti-duplicado | `userscripts.js:726-745, 868-882` |
| **BUG-14** | 🟡 Baja | La Shop se reconstruye en cada tecla y en cada poll, colapsando los `<details>` de permisos y reseteando el scroll | `userscripts.js:1357, 673` |
| **BUG-15** | 🟡 Baja | `item.sha256.slice(...)` (640) asume string; un catálogo `stale` de un esquema anterior rompe **todo** el render y el error se enmascara como "No se pudo cargar el catálogo" | `userscripts.js:640` |
| **BUG-16** | 🟡 Baja | "Aplicar extensión" **recarga todas las cuentas** aunque el usuario haya desmarcado todas, e incluso si la aplicación falló parcialmente | `userscripts.js:1336` |
| **BUG-17** | 🟡 Baja | El kill-switch de diagnóstico no desactiva nada en los guests (solo en la copia del renderer) | `userscripts.js:825-830` |
| **BUG-18** | 🟡 Baja | 58 `querySelector` sin validar en el parseo del módulo: un rename de id deja `window.pokeGridUserScriptManager` indefinido **sin error visible** (el optional chaining del renderer lo silencia) | `userscripts.js:23-79` |
| **BUG-19** | 🟡 Baja | `setAccounts` pierde la selección previa cuando el script no aplica al juego primario (`renderScriptTargetControls` vacía el contenedor) | `userscripts.js:1465-1475, 253` |
| **BUG-20** | 🟠 Media | **El launcher se instala en Descargas y borra la carpeta original del usuario** (§12.2) | `updater.js:455, 394` |
| **BUG-21** | 🟡 Baja | `README.md:25` promete reordenar cuentas desde el modal; **solo se reordena el grid visual** | `renderer.js:4621-4629` |
| **BUG-22** | 🟡 Baja | Sin aviso en la UI al eliminar una cuenta de que el historial se reasigna (§5.3) | `renderer.js:8566` |
| **BUG-23** | 🟡 Baja | `STYLES_ACCOUNT_COLORS` con 4 colores y módulo ⇒ con 5+ cuentas los colores se repiten | `renderer.js:241, 7588, 7617, 7645` |
| **BUG-24** | 🟡 Baja | `dist-0230/` (4.1 MB de binario) **no está en `.gitignore`** ⇒ riesgo de commitearlo | `.gitignore` |
| **BUG-25** | 🟡 Baja | `PokeGrid-Script-Shop/` es un repo anidado **no ignorado** ⇒ riesgo de commitear un gitlink o 2.1 MB de archivos | `.gitignore` |
| **G-1..G-10** | 🟠 Media | Los 10 bugs del núcleo vivo de `game-theme.js` (§8.4), siendo G-1 (fuga de listeners) y G-3 (localStorage 16×/s) los más concretos | `game-theme.js` |

### 16.2 Build, CI y repositorio

| ID | Severidad | Descripción |
|---|---|---|
| **C-01** | 🟠 Media | **`pnpm check` no valida 3 de los 9 archivos de `src/`**: faltan `updater.js`, `account-transfer.js` y `pokepedia-preload.js` |
| **C-02** | 🔴 Alta | **Varios scripts de `test:*` referencian tests que están en `.gitignore`** (`better-market-*.js`, `chat-translator-smoke.js`, `custom-card-*.js`, `breeding-second-parent-smoke.js`) ⇒ en un clon limpio esos `pnpm test:*` **fallan por archivo inexistente** |
| **C-03** | 🟠 Media | **El CI ejecuta 4 de ~40 suites** (`check`, `test:updater`, `test:script-shop`, `test:script-shop-live`). Nada de los 17 tests de Electron E2E, nada de `test:account-model`, `test:dynamic-accounts`, `test:visual` |
| **C-04** | 🟠 Media | `dist/` obsoleto e incompleto: sin ZIP, con asar de v0.22.12 y carpeta de v0.22.15 |
| **C-05** | 🟡 Baja | `CONTEXTO-PROYECTO.md` dice 5.377/4.920 líneas y "sin commitear"; ya está desactualizado respecto al estado real |
| **C-06** | 🟡 Baja | El `LICENSE` MIT no se incluye en el paquete portable (solo `LICENSE.electron.txt`) |
| **C-07** | 🟡 Baja | `SECURITY.md` sin canal privado real |

### 16.3 Rendimiento y memoria

| ID | Severidad | Descripción | Ref |
|---|---|---|---|
| **P-01** | 🔴 Crítica | Proceso principal se congela: `readUserScripts()` reparsea y **recompila con `new Function()` los 100 scripts** en cada IPC, incluido cada `GM_xmlhttpRequest`; `getGameAccountIndex()` descifra `accounts.enc` en cada llamada | `main.js:365-377, 314, 518-528` |
| **P-02** | 🔴 Crítica | Crecimiento no acotado: `launcherNotifications`, `notificationSourceKeys` y el store `notifications` de IndexedDB. `getAll()` de todo el histórico en cada arranque | `renderer.js:219-225, 1439-1441, 1502, 3063-3095` |
| **P-03** | 🟠 Media | `renderNotifications()` reconstruye hasta 500 tarjetas por pulsación de teclado | `renderer.js:8779-8782, 1288-1395` |
| **P-04** | 🟠 Media | Re-render completo del DOM en bucles de 1.5 s / 4 s / 5 s y en cada tecla en la Shop | varios |
| **P-05** | 🟠 Media | Caché de imágenes remotas: hasta ~130 MB de data URLs en el proceso principal | `main.js:24, 98-124` |
| **P-06** | 🟡 Baja | `Intl.DateTimeFormat` creado en bucle, hasta 500 por render | varios |
| **P-07** | 🟡 Baja | Escrituras a `localStorage` sin throttling (16/s en `game-theme.js`) | G-3, `renderer.js:4512` |
| **P-08** | 🟡 Baja | O(n²) + IPC síncronos repetidos en `userscripts.js` | §15.9 |
| **P-09** | 🟡 Baja | Editor inusable con archivos de varios MB | §15.10 |
| **P-10** | 🟡 Baja | 27 % de reglas CSS redundantes; 2.7 MB de assets PNG sin usar | §15.11 |

---

## 17. Empaquetado, exportación y CI

### 17.1 Configuración actual (`package.json:55-86`)

```jsonc
"build": {
  "appId": "online.idleworld.pokegrid",
  "productName": "IDLE POKE LAUNCHER",
  "asar": true,
  "compression": "store",          // ← sin comprimir dentro del asar
  "files": ["src/**/*", "build/icon.ico", "package.json"],
  "extraResources": [{ "from": "userscripts", "to": "userscripts" }],
  "directories": { "output": "dist" },
  "win": {
    "icon": "build/icon.ico",
    "signAndEditExecutable": false,  // ← sin firma
    "target": [{ "target": "zip", "arch": ["x64"] }],
    "artifactName": "IDLE-POKE-LAUNCHER-${version}-portatil.${ext}"
  }
}
```

### 17.2 Composición del paquete entregado (medido)

| Elemento | Tamaño |
|---|---:|
| `IDLE POKE LAUNCHER.exe` | **215.0 MB** |
| `dxcompiler.dll` | 24.4 MB |
| `LICENSES.chromium.html` | 19.4 MB |
| `icudtl.dat` | 10.4 MB |
| `resources.pak` | 6.8 MB |
| `libGLESv2.dll` | 7.7 MB |
| `d3dcompiler_47.dll` | 4.5 MB |
| `resources/app.asar` | 4.15 MB (contiene **2.7 MB de PNG sin usar**) |
| `vk_swiftshader.dll` | 5.3 MB |
| `ffmpeg.dll` / `dxil.dll` / `libEGL.dll` / `vulkan-1.dll` | 2.9 / 1.4 / 0.45 / 0.9 MB |
| `locales/*.pak` (**54 idiomas**) | **~40 MB** |
| `resources/userscripts/PokeGrid-Telegram-Alerts.user.js` | 0.07 MB |
| **Total descomprimido** | **~305 MB** |
| `PokeGrid-cuentas-plantilla.txt` | presente en la carpeta local, **no** en el build (copia manual) |

### 17.3 CI (`.github/workflows/release.yml`)

Disparador: `push` de tag `v*.*.*` en `windows-latest`.

```
1. checkout
2. pnpm 11.19.0 + Node 22 (cache pnpm)
3. Validar que "v$version" == tag  ← buena práctica
4. pnpm install --frozen-lockfile
5. pnpm check && pnpm test:updater && pnpm test:script-shop && pnpm test:script-shop-live
6. pnpm dist                                    ← electron-builder --win zip
7. SHA-256 del ZIP → .zip.sha256
8. softprops/action-gh-release@v2 con generate_release_notes
```

**Lo que funciona:** verificación de coherencia tag↔`package.json`, lockfile congelado, checksum publicado, notas de release automáticas.

**Lo que falta:** solo `x64`; sin caché de `electron-builder` (re-descarga ~200 MB en cada build); sin `pnpm test:visual`; sin tests de las 17 suites E2E; sin matriz de versiones de Node; sin `attest-build-provenance` de GitHub; sin verificación de que el ZIP arranca; sin checksum de los assets individually en la Release (solo el ZIP).

### 17.4 `.gitignore`

Correcto en lo esencial (`node_modules/`, `dist/`, `.build-diagnostics/`, `accounts.enc`, `accounts-source.json`, `.vpn/`, scripts personales).
**Faltan:** `dist-*/`, `PokeGrid-Script-Shop/` (repo anidado), `*.log`.

---

## 18. Estrategia de pruebas

### 18.1 Qué hay

**44 archivos `.js` de test** en tres categorías:

| Categoría | Nº | Ejemplos | Requisitos |
|---|---:|---|---|
| Node puro (sin Electron) | 24 | `account-model-smoke`, `account-transfer-smoke`, `launcher-updater-smoke`, `userscript-network-smoke`, `memory-cleanup-safety-smoke`, `script-shop-smoke` | `node archivo.js` |
| Electron E2E (proceso real) | 17 | `dynamic-accounts-proxy-smoke`, `userscripts-manager-smoke`, `browser-instances-and-connectivity-smoke`, `accounts-modal-smoke`, `launcher-visual-smoke` | `electron archivo.js` |
| Diagnósticos (no son tests) | 3 | `capture-live-diagnostic`, `farm-live-diagnostic`, `capture-api-history-diagnostic` | red real |

**Fixtures reutilizables:** `launcher-preview-preload.js` (159 líneas), `dock-fixture.*`, `hunt-analyzer-fixture.*`, `capture-log-fixture.*`, `custom-card-smoke.html`, `panel-injection-fixture.html`, `team-native-check.html`, `unpacked-extension-fixture/`.

**Sesiones de captura visual:** 60 PNG en `tests/` (ignorados por git) + 210 en `.build-diagnostics/` (384 MB). El nombre de los PNG codifica la regresión exacta (`team-hud-v3-backgrounds-final.png`, `better-market-10.5-depot.png`, `farm-sprite-framing-v0151-wait.png`). Excelente disciplina de regresión visual, aunque el volumen es excesivo y esas carpetas deberían rotarse o ignorarse con más agresividad.

### 18.2 Debilidades

| # | Problema |
|---|---|
| T-1 | **`launcher-preview-preload.js` está congelado en 4 cuentas** (`Array.from({length: 4})` en 3 sitios). Todos los tests visuales/UI solo ejercitan el camino de 4 cuentas. **La feature 0.23.0 (1–32 cuentas + proxy) solo la cubre un E2E de 99 líneas** |
| T-2 | `saveAccounts` del preview devuelve `{ok:true}` sin `accounts` ni `proxyResults` ⇒ los tests no ejercitan la ruta de `proxyResults` ni la detección de `structureChanged` |
| T-3 | **El CI no corre casi ninguno de estos tests** (C-03) |
| T-4 | Los tests de `better-market` pinean la versión de un script personal (`10.7.3`, `10.14.0`) y **fallan已知** porque el script real está en otra versión. Documentado en `CONTEXTO-PROYECTO.md:147-150` como falla preexistente |
| T-5 | `launcher-updater-integration.js` y `-detached-integration.js` fallan en Git Bash por el `tar` de MSYS2 (interpretan `C:\...` como host remoto). No es regresión, pero ensucia la señal |
| T-6 | No hay **tests unitarios** de las funciones puras más complejas: `evaluateFarmTarget` (motor de recomendación), `mergeCaptureArchiveRow` (fusión de capturas), `normalizeFarmTarget`, `computeCapturedPokemonStats`, `statisticNumber`. Son lógica de negocio de alto valor y están acopladas al DOM |
| T-7 | No hay cobertura de `game-theme.js` más allá de `panel-injection-smoke.js` (66 líneas) |
| T-8 | `scripts/vpn-per-account.cjs` (429 líneas) no tiene ningún test, pese a tener verificación E2E manual documentada |
| T-9 | `pnpm test` no existe: no hay forma de correr "todo" con un comando |

---

## 19. Recomendaciones priorizadas

Leyenda: 🔴 crítico · 🟠 alto · 🟡 medio · ⚪ bajo. Esfuerzo: `S` (<1 h) · `M` (1-3 h) · `L` (>3 h).

### A. Desempeño

| # | Prioridad | Esf. | Recomendación |
|---|---|---|---|
| **R-A1** | 🔴 | **L** | **Cachear el estado de cuentas y de userscripts en el proceso principal con invalidación por `mtime`.** Hoy `readAccounts()` y `readUserScripts()` leen, descifran, parsean y **compilan** en cada llamada IPC, incluida cada `GM_xmlhttpRequest`. Un `Map` con `{mtime, parsed}` y un índice `id → script` elimina el problema de raíz. **Impacto: el congelamiento del proceso principal desaparece.** Ver P-01 |
| **R-A2** | 🔴 | **M** | **Poner un techo total al tamaño de userscripts** (`USER_SCRIPT_TOTAL_LIMIT`, p. ej. 25 MB) además del techo por script, y validar en `userscripts:save`. Sin esto, 100 × 10 MB = 1 GB de JSON que se parsea y recompila. Ver P-01 |
| **R-A3** | 🔴 | **M** | **Acotar el historial de notificaciones en las 3 capas**: recorte del array en memoria (p. ej. 2.000), purga de `notificationSourceKeys` (reconstruir desde el Set recortado), y purga del store `notifications` por antigüedad (borrar al arrancar lo que supere N o más de X días). Además, `hydrateNotificationArchive()` debería usar un cursor con `getAllKeys` + filtrado en vez de `getAll()` a ciegas. Ver P-02 |
| **R-A4** | 🟠 | **S** | **Debounce de 150 ms en los 6 filtros de notificaciones** (o `requestAnimationFrame`) en vez de `renderNotifications` directo en `input`. Ver P-03 |
| **R-A5** | 🟠 | **S** | **Hoist de los `Intl.DateTimeFormat` a constantes de módulo.** 4 sitios, cambio trivial, ahorro notable. Ver P-06 |
| **R-A6** | 🟠 | **M** | **Memorizar los scripts inyectados con `fn.toString()`**: un `Map` de función → string. Elimina ~2.900 líneas re-serializadas por ciclo de polling. Ver §15.1 |
| **R-A7** | 🟠 | **M** | **Render incremental en `renderHuntAnalyzer` y `renderStatistics`**: reutilizar nodos y actualizar solo `textContent` cuando la estructura no cambia (ya se hace en `updatePanelLiveClocks` para el reloj). Alternativa inmediata: bajar `pollHuntAnalyzers` de 1.5 s a 2.5–3 s. Ver P-04 |
| **R-A8** | 🟠 | **S** | **Reducir `REMOTE_IMAGE_CACHE_LIMIT`** de 48 a 12–16 y/o cachear el `Buffer` en vez del data URL (el data URL es 33 % más grande). Ver P-05 |
| **R-A9** | 🟡 | **S** | **`pollCaptureNotifications`: saltar paneles cuya pestaña esté oculta** (owhose `document.hidden` de ese webview) ynjecutar el snapshot a menor frecuencia cuando no haya panel con Capture Log/notificaciones abierto. Reduce 9 `executeJavaScript`/s a un mínimo en el uso típico |
| **R-A10** | 🟡 | **M** | **Debounce en el buscador de la Shop** (`userscripts.js:1357`) y preservar el estado de展开 de los `<details>` al re-renderizar. Ver BUG-14, P-04 |
| **R-A11** | 🟡 | **M** | **Arreglar la fuga de listeners `keydown` de `game-theme.js`** (G-1): eliminar el patrón create-then-delete (G-2) y usar un flag global `window.__pgDockBound` en vez de un flag en un nodo que se borra. De paso, **dejar de escribir en `localStorage` en cada `refresh()`** (G-3). Recupera ~16 escrituras/segundo por webview |
| **R-A12** | 🟡 | **M** | **Indexar `customGameDescriptors` y evitar `webview.getURL()` síncronos repetidos**: cachear `panelInstanceId → {url}` con TTL de 1 s. Ver P-08 |
| **R-A13** | 🟡 | **M** | **Debounce real del editor**: `refreshEditor` sin debounce (1406) hace `updateLineNumbers` en cada tecla. Con 920 KB ya se nota; con varios MB es inutilizable. Alternativa: renderizar números de línea solo del viewport visible |
| **R-A14** | ⚪ | **S** | **Throttle de escrituras a `localStorage`**: agrupar `panelZoom`, `captureLogFilters`, geometría flotante en un buffer que se volca cada 2 s o al perder foco |

### B. Beneficio al usuario (funcionalidad y experiencia)

| # | Prioridad | Esf. | Recomendación |
|---|---|---|---|
| **R-B1** | 🔴 | **S** | **Unificar la semántica de `accounts[]` en opt-out** (`=== false` bloquea) en renderer, main y `userscripts.js`, tal como ya documenta `CONTEXTO-PYOECTO.md`. Esto arregla de raíz BUG-01, BUG-02 y el caso "script con 4 flags no corre en la cuenta 5". Añadir el test correspondiente. Ver §16.1 |
| **R-B2** | 🟠 | **S** | **`window.confirm()` al eliminar una cuenta** si quedan historial (capturas, metas, notificaciones) asociado a las posiciones que se desplazan. Texto explícito: "El historial de la posición N pasará a la cuenta que la ocupe". Cierra BUG-22 y el pendiente de `CONTEXTO-PROYECTO.md:161`. Además, **aviso visible cuando la plantilla `.txt` vinculada está en uso** (ya se muestra la ruta) |
| **R-B3** | 🟠 | **M** | **Botones de reordenar cuentas ↑/↓ en el modal** (o drag & drop de filas). Actualiza `README.md:25` y `docs/FUNCIONES.md:35` para que la promesa sea cierta. Cierra BUG-21 |
| **R-B4** | 🟠 | **M** | **Chip "VPN" en la barra del panel** cuando `account.proxy.enabled`, con un tooltip que muestre protocolo/host/puerto (enmascarando usuario). Es el pendiente de `CONTEXTO-PROYECTO.md:161` y da visibilidad inmediata de que la cuenta va por otra IP |
| **R-B5** | 🟠 | **S** | **Estado visual del proxy por cuenta** tras guardar: no solo el conteo de fallos (`renderer.js:8722-8723`) sino el detalle por cuenta (✓ / ✗ con motivo) |
| **R-B6** | 🟠 | **S** | **Probar el proxy al arrancar** y marcar en el panel cuando no se pudo aplicar (hoy solo se reporta en el momento de guardar, y `configureGameSessions` solo hace `console.warn`) |
| **R-B7** | 🟠 | **M** | **Arreglar el puente GM en instancias secundarias** (BUG-06) o, si no se quiere, **dejar de inyectar scripts ahí y decirlo en la UI**. Hoy se promete algo que no funciona. Dos caminos: (a) mantener el preload solo con `guest-preload.js` en las instancias y ampliar `getGameAccountIndex` para reconocer `persist:pokegrid-instance-*` con un `accountIndex` sintético; (b) marcar las instancias como "sin soporte de scripts" |
| **R-B8** | 🟠 | **M** | **Estado "sucio" en el editor de scripts** + `beforeunload`. Avísar al seleccionar otro script, al cerrar el modal, al instalar/desinstalar de la Shop, y en `loadScripts`. Cierra BUG-05 |
| **R-B9** | 🟠 | **S** | **`confirm()` antes de "Actualizar" un script modificado localmente**, mostrando "se perderán tus cambios". Cierra BUG-04 |
| **R-B10** | 🟠 | **S** | **`stopPropagation()` en Escape dentro de la barra de buscar** y en los campos del editor. Cierra BUG-03 |
| **R-B11** | 🟡 | **S** | **Comparar `@version` al arrastrar un `.user.js`** (igual que ya se hace con el módulo Telegram). Cierra BUG-10 |
| **R-B12** | 🟡 | **M** | **Pedir confirmación (o avisar en el toast) cuando `updateBundledTelegramScript` sobrescriba una edición local**, o marcarlo como "modificado por el launcher". Cierra BUG-09 |
| **R-B13** | 🟡 | **M** | **Limpiar el estado del guest al desinstalar**: borrar `pokegrid:userscript:<id>:storage`, quitar los `<style data-pokegrid-userscript>`, quitar la entrada del registro. Cierra BUG-13 |
| **R-B14** | 🟡 | **S** | **Más de 4 colores de cuenta** (o generarlos por HSL a partir del índice) para que con 5–32 cuentas la identificación por color siga funcionando. Cierra BUG-23 |
| **R-B15** | 🟡 | **M** | **Hacer que `@grant` signifique algo**, o cambiar el texto de la UI. Hoy la sección de permisos del editor informa pero no restringe (S-3). Opciones: implementar `@grant`-based filtering de la API expuesta, o etiquetar la lista como "permisos declarados (informativos)" |
| **R-B16** | ⚪ | **S** | **Eliminar las APIs GM muertas** (`registerMenuCommand`, `openInTab`, `download`) o implementarlas. Hoy dan falsa sensación de compatibilidad |
| **R-B17** | ⚪ | **M** | **Boton "Abrir carpeta de instalación" y "Abrir Descargas"** en el tooltip del botón Actualizar, para que el usuario sepa dónde quedó la app tras actualizarse |
| **R-B18** | ⚪ | **S** | **Botón "Desvincular archivo .txt"** en el modal de cuentas, que borre `accounts-source.json` (el launcher deja de re-leer el archivo con contraseñas en texto plano) |
| **R-B19** | ⚪ | **S** | **Indicador de versión del juego / compatibilidad**: si el launcher depende de clases internas, una nota "el juego se actualizó y algunas herramientas pueden no funcionar" con fecha de última verificación reduciría la frustación cuando algo se rompa |
| **R-B20** | ⚪ | **M** | **"Última verificación de actualizaciones" visible** y opción de comprobación al arrancar (opt-in), para que las versiones con fix crítico se propaguen |

### C. Facilidad de actualizaciones (proceso y distribución del launcher)

| # | Prioridad | Esf. | Recomendación |
|---|---|---|---|
| **R-C1** | 🔴 | **M** | **Firmar el ejecutable (Authenticode).** `signAndEditExecutable:false` + un `.exe` de 215 MB sin firmar ⇒ SmartScreen en cada máquina nueva y falsos positivos de AV. Opciones: certificado OV/EV, o al menos un certificado de firma de código de bajo coste. Añadir ` CSC_LINK` / secrets de firma en el CI. **Es el cambio de mayor impacto en la tasa de instalación successful** |
| **R-C2** | 🔴 | **L** | **Dejar de instalar en Descargas.** Extraer la nueva versión **junto a la instalación actual** (o en `%LOCALAPPDATA%\Programs\IDLE POKE LAUNCHER\current` con un puntero), para que: (a) el atajo del usuario siga funcionando, (b) no se ejecute desde una carpeta controlada por Windows, (c) el AV no escanee Descargas. Cierra BUG-20 |
| **R-C3** | 🟠 | **S** | **Podar los ZIP antiguos de Descargas** (conservar el último + el `.sha256`), y ofrecer un " Limpiar actualizaciones" en el menú. Hoy cada actualización deja ~130 MB |
| **R-C4** | 🟠 | **M** | **Releer `update-status.json` al arrancar** y mostrar un aviso si el estado anterior fue `cleanupPending` o `failed` (con la ruta de los logs). Ese archivo se escribe con mucho cuidado y nunca se lee |
| **R-C5** | 🟠 | **M** | **Añadir un flag `--pointer-events:none` al handshake y un log en `%LOCALAPPDATA%`** para que el usuario pueda enviar un diagnóstico si el handshake falla. El sistema es robusto pero opaco |
| **R-C6** | 🟠 | **M** | **Reemplazar el instalador PowerShell por uno en Node** (un `.js` empaquetado que se ejecuta con el propio `node.exe` de Electron, o un segundo `electron.exe --installer`). Ventajas: sin `-ExecutionPolicy Bypass`, sin dependencia de PowerShell 5.1 (deprecado), mensajes de error en el mismo formato, y reutilización de `fs`/`crypto` ya probados. Alternativa intermedia: **fallback a `pwsh`** si no existe `powershell.exe` |
| **R-C7** | 🟡 | **S** | **Prereleases opt-in**: hoy `readLatestRelease` las rechaza siempre. Añadir un canal "beta" que el usuario pueda activar (útil para el propio autor y para testers) |
| **R-C8** | 🟡 | **M** | **Publicar también un `.sha256` por archivo y considerar `attest-build-provenance`** en el CI. Y **verificar el arranque del ZIP en el CI** (extraer y ejecutar `--version` o un smoke) antes de publicar la Release |
| **R-C9** | 🟡 | **S** | **Cachear `electron-builder` y el binario de Electron** en el CI (`actions/cache` sobre `~/.cache/electron`), y usar `pnpm/action-setup` con la versión del `packageManager` |
| **R-C10** | ⚪ | **M** | **Automatizar el bump de versión**: hoy hay que editar `package.json`, hacer commit y crear el tag a mano (`docs/ACTUALIZACIONES.md`). Un `pnpm release` que verifique que no hay cambios sin commitear, bumpee, etiquete y empuje |

### D. Mejor exportación y compilación

| # | Prioridad | Esf. | Recomendación |
|---|---|---|---|
| **R-D1** | 🟠 | **S** | **Borrar los 2 PNG sin usar** (`idle-poke-logo.png` 1.06 MB, `idle-poke-logo-keyed.png` 1.6 MB). Ahorra **2.7 MB en el asar** sin ningún cambio funcional. Verificado: solo se referencia `idle-poke-logo-512.png` |
| **R-D2** | 🟠 | **S** | **Reducir los locales**: `"electronLanguages": ["es-419","es","en-US"]` en `build.win`. Ahorra **~40 MB** (de 54 locales a 3). Es un 13 % del paquete para una app que solo habla español |
| **R-D3** | 🟠 | **S** | **Añadir `LICENSE` (MIT) al paquete** en `build.extraFiles`. Es una recomendación de la licencia y cuesta una línea |
| **R-D4** | 🟠 | **M** | **Añadir `arm64` al target** (`"arch": ["x64","arm64"]`) o al menos declarar claramente "solo x64" en el README. Windows on ARM es un mercado creciente y el `.exe` x64 ya funciona vía emulación, pero no hay ZIP que lo sugiera |
| **R-D5** | 🟠 | **M** | **Cambiar `compression: "store"` a `"normal"`.** El asar pasa de 4.15 MB a ~1 MB. El coste es tiempo de arranque (descomprimir ~4 MB es trivial frente a descomprimir los ~200 MB del runtime, que el target ZIP comprime igual) |
| **R-D6** | 🟡 | **S** | **Añadir `dist-*` y `PokeGrid-Script-Shop/` a `.gitignore`**, y `*.log`. Cierra BUG-24 y BUG-25 |
| **R-D7** | 🟡 | **S** | **Añadir un `pnpm clean`** que borre `dist*` y `.build-diagnostics` (384 MB acumulados). Y **rotar `.build-diagnostics`**: conservar las últimas ~20 capturas de cada regresión y borrar el resto |
| **R-D8** | 🟡 | **S** | **Completar `pnpm check`**: añadir `src/updater.js`, `src/account-transfer.js`, `src/pokepedia-preload.js` a la lista de `node --check`. Cierra C-01 |
| **R-D9** | 🟡 | **M** | **Añadir un `pnpm test` que corra todas las suites de Node** (rápidas, sin display) y un `pnpm test:e2e` para las de Electron. Y **arreglar la incongruencia `.gitignore`/`package.json`**: o se dejan de ignorar los tests de scripts personales, o se quitan esos scripts de `package.json`. Cierra C-02 y T-9 |
| **R-D10** | 🟡 | **M** | **CI: correr las suites de Node + `test:account-model` + `test:dynamic-accounts` + `test:account-transfer`** antes de compilar. Son rápidas y cubren el núcleo de la 0.23.0. Subir el resto de los E2E a un job opcional o por `workflow_dispatch`. Cierra C-03 |
| **R-D11** | ⚪ | **S** | **Documentar `scripts/generate_icon.py`** (depende de Python 3 + Pillow, no declarado en ninguna parte) en el README de desarrollo |
| **R-D12** | ⚪ | **S** | **`.gitattributes`** en el repo raíz con `* text=auto eol=lf` y `*.ps1 text eol=crlf`, `*.ico binary`, `*.png binary`. Evita sorpresas de fin de línea en los `.ps1` y `.cjs` |
| **R-D13** | ⚪ | **M** | **Publicar un `SHA256SUMS.txt`** con el hash del ZIP **y** del `.exe` extraído, para verificación manual |
| **R-D14** | ⚪ | **M** | **Extraer la lógica pura a un módulo común** (`account-model.js` ya es el patrón correcto): `evaluateFarmTarget`, `mergeCaptureArchiveRow`, `TYPE_EFFECTIVENESS`, `computeCapturedPokemonStats`, `normalizeFarmTarget`, `statisticNumber`, `parseAccountsTemplate`, `metadataFromUserScript`. Permite unit tests sin DOM (T-6), reutilización desde `userscripts.js` (elimina la duplicación de `metadataFromUserScript`) y reduce `renderer.js` |

### E. Calidad, seguridad y mantenibilidad

| # | Prioridad | Esf. | Recomendación |
|---|---|---|---|
| **R-E1** | 🟠 | **L** | **Eliminar el código muerto de `game-theme.js`.** ~4.000 líneas (5.235 `if (false && dock)`, 6 funciones `refresh*` nunca invocadas, 2 duplicados `*Legacy*`, ~1.000 reglas CSS que el autofiltro ya descarta) más los bloques `Legacy` de `renderer.js` (`farmEnhancedContextScriptLegacy` 187 líneas, `accountProfileSnapshotScriptLegacy` 176 líneas, `refreshPanelCaptureLogLegacy`) y `tests/panel-injection-smoke.js` (hay que actualizarlo). **Resultado: −4.400 líneas (−18 % del código) y un archivo que se vuelve a entender.** Empieza por una rama, mide el `app.asar` antes/después |
| **R-E2** | 🟠 | **M** | **Centralizar los selectores del juego en una capa adaptadora.** Hoy las clases internas (`.clog-*`, `.ha-window`, `.game-dock .dock-btn`, `.ah-panel`, `.phud`, `.pk-ts-*`) están repetidas en 16 scripts inyectados de `renderer.js` + `game-theme.js`. Un objeto `GAME_SELECTORS` con **detección de versión del juego** y degradación explícita ("el juego cambió: Capture Log no disponible") convierte un fallo silencioso en un mensaje accionable. Es la mayor reducción de riesgo de mantenimiento del proyecto |
| **R-E3** | 🟠 | **M** | **Validar `event.sender` en los handlers IPC que falten** y **aplicar el endurecimiento de `will-attach-webview` también a los webviews del juego** (`delete webPreferences.preload` no aplica a los del juego porque su preload es el puente GM legítimo; lo que sí conviene es forzar `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true` y `backgroundThrottling` explícito, sin tocar el preload). Ver S-1, S-2 |
| **R-E4** | 🟠 | **M** | **Copia de seguridad de credenciales.** `writeAccounts` es atómico pero un archivo corrupto = **pérdida total de las 32 cuentas y sus contraseñas**. Escribir `accounts.enc.bak` (y `userscripts.json.bak`) al detectar un fallo de lectura, y un botón "Restaurar copia anterior" en el modal. Además, `readAccounts` no captura `JSON.parse` inválido: un cifrado corrupto lanza y el modal se abre vacío |
| **R-E5** | 🟡 | **S** | **`SECURITY.md`**: habilitar *Private vulnerability reporting* de GitHub y documentarlo. Hoy pide abrir un Issue, lo que expone detalles |
| **R-E6** | 🟡 | **M** | **Pruebas unitarias de la lógica de negocio pura** (ver R-D14). Casos de mayor valor: `evaluateFarmTarget` con 20 escenarios de tipos/niveles; `mergeCaptureArchiveRow` con las 3 direcciones de fusión; `captureRowCompleteness`; `statisticNumber` con los separadores_ES/PT; `urlMatchesPattern` con 15 patrones |
| **R-E7** | 🟡 | **M** | **Actualizar `tests/launcher-preview-preload.js` para soportar N cuentas dinámicas** (parámetro desde el test) y devolver `accounts` + `proxyResults` en `saveAccounts`. Es lo que permitiría cubrir la feature 0.23.0 en los tests visuales. Cierra T-1, T-2 |
| **R-E8** | ⚪ | **M** | **Refrescar `CONTEXTO-PROYECTO.md`** (o archivarlo y dejar el nuevo documento como fuente de verdad), con los números de línea reales |
| **R-E9** | ⚪ | **S** | **Sanear el sprite del perfil con una allowlist estricta** (`^data:image/(png|jpeg|webp|gif);base64,`) en vez de solo quitar `"<>`. Ver S-9 |
| **R-E10** | ⚪ | **S** | **Mover el HTML de "las cuatro cuentas" a texto dinámico.** `index.html:21, 110, 183` y `renderer.js:8639, 8653, 7678` siguen diciendo "las cuatro cuentas" aunque ahora pueden ser 32. Es un detalle de pulido que un usuario nuevo notará de inmediato |

---

## 20. Plan de acción sugerido

### Fase 0 — sanitation (30 min, riesgo nulo, beneficio inmediato)

1. `pnpm check` completo (R-D8).
2. `.gitignore`: añadir `dist-*`, `PokeGrid-Script-Shop/`, `*.log` (R-D6).
3. Borrar los 2 PNG sin usar (R-D1).
4. Commitar la feature 0.23.0 con un mensaje claro y etiquetar `v0.23.0` (C-04 cierra con esto).

### Fase 1 — bloqueantes de funcionalidad (1 día)

5. Unificar la semántica `accounts[]` (R-B1) + test.
6. `Escape` en la barra de buscar (R-B10).
7. `confirm()` al eliminar cuenta con historial + aviso de reasignación (R-B2).
8. Confirmación en "Actualizar" script modificado (R-B9).
9. Comparar `@version` al arrastrar (R-B11).
10. Arreglar `Bunpkg` de `metadataFromUserScript` duplicado (mover a `account-model.js` o a un `metadata.js` compartido).

### Fase 2 — rendimiento crítico (2–3 días)

11. Caché en main de `readAccounts`/`readUserScripts` por `mtime` + índice por id (R-A1).
12. Techo total de userscripts (R-A2).
13. Techo + purga del historial de notificaciones (R-A3).
14. Debounce de los filtros de notificaciones (R-A4).
15. Hoist de los `Intl.DateTimeFormat` (R-A5).
16. Memoizar los scripts inyectados (R-A6).
17. Reducir `REMOTE_IMAGE_CACHE_LIMIT` (R-A8).

### Fase 3 — distribución (2–3 días)

18. Firma de código en el CI (R-C1) ← **mayor impacto en instalaciones exitosas**.
19. Instalar junto a la instalación actual en vez de en Descargas (R-C2).
20. Podar ZIPs antiguos (R-C3) + releer `update-status.json` (R-C4).
21. Reducir locales a 3 (R-D2) + `LICENSE` en el paquete (R-D3) + `compression: normal` (R-D5).
22. Nuevo CI: correr las suites de Node y las E2E núcleo (R-D10).

### Fase 4 — mantenibilidad (1–2 semanas)

23. Eliminar el código muerto de `game-theme.js` + bloques `Legacy` de `renderer.js` (R-E1).
24. Capa adaptadora de selectores del juego con detección de versión (R-E2).
25. Extraer la lógica pura a módulos testeables (R-D14) + unit tests (R-E6).
26. `pnpm test` / `pnpm test:e2e` / `pnpm clean` (R-D9, R-D7).
27. Contexto sucio en el editor de scripts (R-B8).
28. Chips de VPN en el panel + estado por cuenta (R-B4, R-B5).

---

## 21. Anexos

### 21.1 Comandos (entorno Windows; `pnpm` puede no estar en el PATH)

```powershell
# Requisitos: Node 22+, pnpm 11.19.0

# Instalación
pnpm install

# Sintaxis (ampliado: añade updater.js, account-transfer.js, pokepedia-preload.js)
pnpm check

# Tests de Node (rápidos, sin display)
node tests/account-model-smoke.js
node tests/account-transfer-smoke.js
node tests/launcher-updater-smoke.js
node tests/userscript-network-smoke.js
node tests/memory-cleanup-safety-smoke.js
node tests/script-shop-smoke.js

# Tests de Electron (E2E)
node_modules\electron\dist\electron.exe tests/dynamic-accounts-proxy-smoke.js
node_modules\electron\dist\electron.exe tests/accounts-modal-smoke.js
node_modules\electron\dist\electron.exe tests/userscripts-manager-smoke.js
node_modules\electron\dist\electron.exe tests/launcher-visual-smoke.js
node_modules\electron\dist\electron.exe tests/browser-instances-and-connectivity-smoke.js

# Actualizador
node tests/launcher-updater-smoke.js
node tests/launcher-updater-integration.js
node tests/launcher-updater-detached-integration.js

# VPN por cuenta
node scripts/vpn-per-account.cjs up --count 3
node scripts/vpn-per-account.cjs status
node scripts/vpn-per-account.cjs down

# Arranque manual
node_modules\electron\dist\electron.exe .

# Build
pnpm dist            # electron-builder --win zip  → dist/
```

### 21.2 Variables de entorno de diagnóstico

| Variable | Efecto |
|---|---|
| `POKEGRID_DIAGNOSTIC_USER_DATA` | Redirige `userData` (los E2E lo usan para no tocar datos reales) |
| `POKEGRID_SMOKE_SCREENSHOT` | Captura de pantalla + salida JSON + `app.quit()` tras 8 s |
| `POKEGRID_SMOKE_WIDTH` / `_HEIGHT` / `_COLLAPSED` | Fija tamaño y estado del menú en los smokes |
| `POKEGRID_SMOKE_FARM` / `_HUNT` / `_CAPTURE_LOG` / `_NOTIFICATIONS` / `_POKEPEDIA` / `_BROWSER_INSTANCE` / `_MEMORY_CLEANUP` / `_USERSCRIPTS` / `_EXTENSION_PATH` | Activa la captura de una función concreta |
| `POKEGRID_DIAGNOSTIC_GAME` + `_DELAY_MS` + `_COMPACT` | Recopila diagnósticos de cada webview (URL, `readyState`, canvas, recursos, consola) |
| `POKEGRID_ALLOW_DEV_UPDATE_CHECK` | Permite probar el actualizador sin empaquetar |
| `POKEGRID_DIAGNOSTIC_DISABLE_SCRIPT_PATTERN` | Kill-switch de diagnóstico (⚠️ **no funciona en los guests**, ver S-12) |

### 21.3 Glosario interno

| Término | Significado |
|---|---|
| **Panel** | Un `<webview>` + su barra de herramientas dentro de la cuadrícula |
| **Cuenta** | Un perfil con `id` estable, credenciales cifradas, partición propia y proxy opcional |
| **Partición** | `persist:pokegrid-{id}` — perfil de Chromium con cookies/almacenamiento/conexión aislados |
| **Instancia** | Otro juego web abierto en pestañas, con 1–6 pantallas de partición propia |
| **Guest** | La página que se ejecuta dentro de un `<webview>` |
| **Script inyectado** | Código generado por `fn.toString()` y ejecutado con `executeJavaScript` en el guest |
| **Monitor source** | La ventana espejo del juego que el launcher oculta a `-12000px` para leerla |
| **Cuadrícula** | `#grid`, con columnas dinámicas 1/2/3/4 según el número de cuentas |
| **Handshake** | Confirmación por archivo de que la ventana nueva del actualizador está lista |
| **Firma (signature)** | SHA-256 del ZIP de la Release; no es firma criptográfica de autor |

### 21.4 Variables de solo lectura para diagnóstico

```powershell
# Estado real del paquete portable
node -e "const c=require('./package.json');console.log(c.version, JSON.stringify(c.build.win))"

# Tamaño de la app compilada
Get-ChildItem dist\win-unpacked -Recurse | Measure-Object -Sum Length

# Ubicación de los datos de usuario
node -e "const {app}=require('electron');app.whenReady().then(()=>{console.log(app.getPath('userData'));app.quit()})"
```

---

*Fin del análisis. Ningún archivo de código del proyecto fue modificado durante esta auditoría.*
