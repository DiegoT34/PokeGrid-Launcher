# Plan 1 — Correcciones funcionales y saneamiento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los bugs que impiden que las funciones que la UI promete funcionen (opt-out de userscripts, limpiezas incompletas, confirmaciones ausentes), y dejar una base de verificación reproducible antes de tocar nada más.

**Architecture:** Ningún cambio de arquitectura en este plan. Se toca `package.json`, `.gitignore`, `src/userscripts.js`, `src/renderer.js`, `src/main.js`, `src/index.html`, `src/styles.css` y `tests/`. El harness de pruebas (`tests/launcher-preview-preload.js`) se amplía de 4 cuentas fijas a un número configurable, porque hoy ninguna prueba visual puede ejercitar la feature de cuentas dinámicas.

**Tech Stack:** Electron 43.1.1, Node 22+, JavaScript CommonJS plano. **Cero dependencias nuevas.**

**Spec:** `docs/superpowers/specs/2026-09-30-remediacion-y-actualizador-design.md` (Fase 0 y Fase 1)

## Global Constraints

- **Cero dependencias nuevas.** Ni `dependencies` ni `devDependencies`. Solo APIs de Node ya disponibles.
- **Spanish:** todos los textos visibles al usuario, mensajes de error, títulos de commit y comentarios nuevos van en español. Los identificadores de código (nombres de función, claves) van en inglés, salvo que ya exista el nombre en español.
- **Windows únicamente.** Comandos y rutas con `path.join`, sin separadores hardcodeados.
- **Escrituras atómicas en disco:** toda escritura a un fichero de estado pasa por escribir `X.tmp` y `fs.renameSync`. Patrón ya establecido en `main.js:263-268` (`atomicWriteJson`).
- **No se pierde funcionalidad.** Ninguna tarea puede eliminar un caso de uso existente. Si un comportamiento cambia, es porque la documentación ya describía el comportamiento nuevo.
- **Cualquier prueba que se escriba debe fallar antes de la corrección y pasar después.** Una prueba que pasa antes es una prueba muerta: bórrala o cámbiala.
- **Ninguna tarea toca `src/game-theme.js`.** Esa eliminación de código muerto es el Plan 5.
- **Ninguna tarea toca `src/updater.js`.** El nuevo actualizador es el Plan 4.

## Review Focus

Cinco entradas o modos de fallo que la especificación implica pero que ninguna prueba existente ejercita. Cada línea tiene su prueba asignada a la tarea que possessa el código.

1. **Un proxy añadido o cambiado en una cuenta que ya está cargada no surte efecto hasta recargar.** `applyAccountProxies` sí aplica `setProxy`, pero el submit del modal solo reconstruye paneles cuando cambia la estructura (`renderer.js:8713-8714`), así que un cambio de proxy deja las conexiones keep-alive de Chromium con la IP antigua. El usuario cree que tiene IP nueva y no la tiene. → Tarea 8, paso 3.
2. **Cuentas 0 tras vaciar el modal.** `renderAccountRow`'s botón de eliminar bloquea con `length <= 1`, pero si el usuario borra la única fila por otra vía, `saveAccounts` con `[]` produce `normalizeAccounts([])` → `accounts:load` devuelve 0 y `initialize()` crea 0 paneles, y un guardado posterior sobrescribe las credenciales con nada. → Tarea 5, paso 5.
3. **`accounts.enc` corrupto o ilegible.** `readAccounts` lanza sin capturar el error de descifrado; `accounts:load` devuelve `{ok:false, accounts: []}` y el launcher arranca con 0 paneles. El usuario abre el modal, ve 4 filas vacías y guarda: pérdida total de las 32 cuentas. → Tarea 10, pasos 1 y 3.
4. **Límite de tamaño de userscript justo en el borde.** `Buffer.byteLength(code, 'utf8')` cuenta bytes, no caracteres: un script con acentos o emoji mide menos de lo que el usuario cree. Un script de 10.485.761 bytes debe pasar y uno de 10.485.762 debe fallar, y el mensaje debe incluir los bytes reales para que sea comprobable. → Tarea 3, paso 8.
5. **Escape pulsado con foco dentro de la barra de buscar del editor, con el modal abierto y otro script seleccionado.** El evento sube por burbujeo hasta el listener global de `document`, que cierra el Centro de scripts entero y pierde el borrador. → Tarea 4, paso 1.

---

## Mapa de ficheros de este plan

| Fichero | Acción | Responsabilidad |
|---|---|---|
| `package.json` | Modificar | Quitar scripts que apuntan a tests gitignored; añadir `clean`, `test`, `test:e2e` |
| `scripts/run-tests.cjs` | **Crear** | Descubre y ejecuta las suites de prueba con una lista de exclusión documentada |
| `.gitignore` | Modificar | `dist-*/`, `PokeGrid-Script-Shop/`, `*.log` |
| `src/userscripts.js` | Modificar | Semántica opt-out, confirmaciones, limpieza en guest, robustez del arranque, colores |
| `src/main.js` | Modificar | Validación de `event.sender`, copia de seguridad de credenciales, handler de desvincular `.txt` |
| `src/renderer.js` | Modificar | Colores de cuenta, confirmación de borrado, recarga tras cambio de proxy, chip VPN, texto dinámico |
| `src/index.html` | Modificar | Textos dinámicos, botón de desvincular `.txt` |
| `src/styles.css` | Modificar | Estilo del chip VPN y del botón deIntegrity |
| `tests/launcher-preview-preload.js` | Modificar | Número de cuentas configurable, `accounts` sin longitud forzada |
| `tests/userscripts-opt-out-smoke.js` | **Crear** | Opt-out con 1, 5, 12 y 32 cuentas |
| `tests/guest-cleanup-smoke.js` | **Crear** | Limpieza del estado del script en el guest |
| `tests/accounts-history-guard-smoke.js` | **Crear** | Borrado de cuenta, 0 cuentas, cambio de proxy |
| `tests/credentials-backup-smoke.js` | **Crear** | Copia de seguridad y recuperación de credenciales |

---

## Task 1: Verificación reproducible

**Files:**
- Create: `scripts/run-tests.cjs`
- Modify: `package.json:12-50`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: `node scripts/run-tests.cjs [node|electron|all]` — devuelve 0 si todas las suites pasan, 1 si alguna falla. Imprime el nombre de cada suite antes de ejecutarla y un resumen al final.
- Produces: `pnpm check` cubre los 9 ficheros de `src/`.
- Produces: `pnpm test`, `pnpm test:e2e`, `pnpm clean`.

- [ ] **Step 1: Crear el runner de pruebas**

Crea `scripts/run-tests.cjs`:

```js
'use strict';

// Ejecuta las suites smoke del repositorio. Sin dependencias externas.
//
//   node scripts/run-tests.cjs            # node + electron
//   node scripts/run-tests.cjs node       # solo Node (rapido, sin ventana)
//   node scripts/run-tests.cjs electron   # solo Electron
//
// Exit code 0 = todas pasan, 1 = alguna falla.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const electronBinary = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');

// Suites excluidas, con el motivo. Cada exclusion debe ser deliberada:
// o el fichero esta en .gitignore (tests de scripts personales del autor),
// o requiere red y credenciales, o esta roto por el entorno.
const EXCLUDED = new Map([
  ['better-market-hunt-sale-smoke.js', 'script personal del autor; pinea una version obsoleta'],
  ['better-market-iv-calculator-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-no-alerts-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-redesign-visual-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['better-market-window-scales-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['breeding-second-parent-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['chat-translator-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['custom-card-event-bars-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['custom-card-responsive-settings-smoke.js', 'script personal del autor; esta en .gitignore'],
  ['capture-api-history-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],
  ['capture-live-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],
  ['farm-live-diagnostic.js', 'diagnostico contra el juego real, no es una prueba'],
  ['launcher-updater-integration.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['launcher-updater-detached-integration.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['script-shop-live-smoke.js', 'requiere red; se ejecuta aparte con pnpm test:net'],
  ['memory-cleanup-safety-smoke.js', 'se reescribe en el Plan 2; se excluye hasta entonces'],
  ['userscript-network-smoke.js', 'se reescribe en el Plan 2; se excluye hasta entonces']
]);

function classify(source) {
  if (/^\s*\/\/ ==UserScript==/m.test(source) || /require\(['"]electron['"]\)/.test(source)) {
    return 'electron';
  }
  return 'node';
}

function discover() {
  const dir = path.join(root, 'tests');
  const rows = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('-smoke.js') && !name.endsWith('.smoke.cjs')) continue;
    if (EXCLUDED.has(name)) continue;
    const file = path.join(dir, name);
    const source = fs.readFileSync(file, 'utf8');
    if (/^\s*fixture/m.test(name)) continue;
    rows.push({ name, kind: classify(source) });
  }
  return rows;
}

function run({ file, kind }) {
  const command = kind === 'electron' ? electronBinary : process.execPath;
  const args = kind === 'electron' ? [file] : [file];
  const result = spawnSync(command, args, { stdio: 'inherit', cwd: root, timeout: 180_000 });
  return result.status === 0;
}

const mode = String(process.argv[2] || 'all').toLowerCase();
const wanted = mode === 'node' ? ['node'] : mode === 'electron' ? ['electron'] : ['node', 'electron'];
const suites = discover().filter((suite) => wanted.includes(suite.kind));

if (!suites.length) {
  console.error('No se encontró ninguna suite. Revisa tests/ y la lista EXCLUDED.');
  process.exit(1);
}

const failures = [];
for (const suite of suites) {
  console.log(`\n=== ${suite.name} (${suite.kind}) ===`);
  if (!run(suite)) failures.push(suite.name);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`${suites.length - failures.length}/${suites.length} suites verdes.`);
if (failures.length) {
  console.error(`FALLAN: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('Todo verde.');
```

- [ ] **Step 2: Simplificar `package.json`**

En `package.json`, dentro de `"scripts"`, **elimina** estas cinco entradas porque apuntan a ficheros que están en `.gitignore` y no existen en un clon limpio:

```
"test:better-market": "node tests/better-market-no-alerts-smoke.js",
"test:better-market-hunt-sale": "node tests/better-market-hunt-sale-smoke.js",
"test:better-market-iv": "electron tests/better-market-iv-calculator-smoke.js",
"test:better-market-scales": "electron tests/better-market-window-scales-smoke.js",
"test:custom-card": "electron tests/custom-card-responsive-settings-smoke.js",
"test:breeding": "node tests/breeding-second-parent-smoke.js",
"test:chat-translator": "electron tests/chat-translator-smoke.js",
```

Y **añade** al final del objeto `"scripts"`:

```json
"clean": "node -e \"const{rmSync}=require('fs');for(const d of['dist','dist-0230','.build-diagnostics','artifacts'])rmSync(d,{recursive:true,force:true})\"",
"test": "node scripts/run-tests.cjs node",
"test:e2e": "node scripts/run-tests.cjs electron",
"test:all": "node scripts/run-tests.cjs all",
"test:net": "node tests/launcher-updater-integration.js && node tests/launcher-updater-detached-integration.js && electron tests/script-shop-live-smoke.js"
```

- [ ] **Step 3: Completar `pnpm check`**

En `package.json`, sustituye la línea `"check"` por esta, que añade los tres ficheros que se le escapaban:

```json
"check": "node --check src/main.js && node --check src/preload.js && node --check src/guest-preload.js && node --check src/pokepedia-preload.js && node --check src/game-theme.js && node --check src/userscripts.js && node --check src/userscript-network.js && node --check src/account-model.js && node --check src/account-transfer.js && node --check src/updater.js && node --check src/renderer.js && node --check src/guest-preload.js && node --check scripts/vpn-per-account.cjs && node --check scripts/run-tests.cjs",
```

- [ ] **Step 4: Ampliar `.gitignore`**

Añade al final de `.gitignore`:

```
# Builds antiguas y salidas de diagnóstico.
dist-*/
*.log

# Repositorio anidado de la Script Shop: nunca se versiona aqui.
PokeGrid-Script-Shop/
```

- [ ] **Step 5: Quitar los dos PNG que no se usan**

Confirma primero que nada los referencia:

Run: `Select-String -Path src\*.js, src\*.html, src\*.css -Pattern 'idle-poke-logo'`
Expected: exactamente dos coincidencias, ambas a `idle-poke-logo-512.png` (en `index.html:8` y `styles.css:78`). Si aparece una tercera, **para aquí**: hay una referencia que este plan no conoce y borrar el PNG rompería el launcher.

Run: `git rm src/assets/idle-poke-logo.png src/assets/idle-poke-logo-keyed.png`
Expected: elimina 2.665.663 bytes del árbol de trabajo. `idle-poke-logo-512.png` **no** se toca.

- [ ] **Step 6: Verificar que `pnpm check` pasa**

Run: `pnpm check`
Expected: sin salida, exit 0. Si falla, el error indica el fichero y la línea de sintaxis.

- [ ] **Step 7: Establecer el baseline**

Run: `pnpm test`
Expected: todas las suites de Node verdes. Anota en el mensaje de commit cuáles son.

Run: `pnpm test:e2e`
Expected: todas las suites de Electron verdes. Si alguna falla, **anótala y no la arregles en esta tarea**: el runner es nuevo, es aceptable descubrir fallos preexistentes. Anótalos en el mensaje de commit.

- [ ] **Step 8: Confirmar que el runner descubre lo esperado**

Run: `node scripts/run-tests.cjs node 2>&1 | Select-String 'suites verdes'`
Expected: un recuento mayor o igual a 6 suites de Node verdes (hay 8 tras excluir las de scripts personales, menos las dos que el Plan 2 reescribirá).

- [ ] **Step 9: Commit**

```bash
git add package.json .gitignore scripts/run-tests.cjs
git add -u src/assets
git commit -m "Anadir runner de pruebas y completar las comprobaciones de sintaxis

- scripts/run-tests.cjs descubre las suites por descubrimiento de ficheros y
  documenta cada exclusion con su motivo, en lugar de 30 entradas en
  package.json que pueden apuntar a ficheros inexistentes.
- check cubre los 9 ficheros de src/ mas los 2 scripts de scripts/.
- .gitignore cubre dist-*/, *.log y el repositorio anidado de la Shop.
- Se retiran 8 scripts test:* que apuntaban a tests de scripts personales
  (gitignored), que fallaban en cualquier clon limpio.
- Se eliminan 2 PNG de 2.7 MB que ninguna referencia usaba; solo se usa
  idle-poke-logo-512.png."
```

---

## Task 2: Publicar la Release 0.23.0

**Files:**
- Modify: ninguno (es una tarea de git)
- Test: ninguna (verifica el trabajo ya hecho)

**Interfaces:**
- Consumes: el runner de la Tarea 1.
- Produces: tag `v0.23.0` en `origin/main`.

- [ ] **Step 1: Verificar la suite antes de publicar**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo verde. Si algo falla, **para aquí** y no publiques: el CI ejecutará exactamente estos comandos.

- [ ] **Step 2: Revisar el diff completo de la feature pendiente**

Run: `git status --short && git diff --stat`
Expected: los 11 ficheros modificados de la feature de cuentas dinámicas y los 4 sin seguimiento (`src/account-model.js`, `tests/account-model-smoke.js`, `tests/dynamic-accounts-proxy-smoke.js`, `tests/capture-management-redesign-smoke.js`), más `docs/VPN-POR-CUENTA.md` y `scripts/vpn-per-account.cjs`. `CONTEXTO-PROYECTO.md` **no** se incluye: es un documento de traspaso de sesión anterior, no parte de la feature.

- [ ] **Step 3: Añadir los ficheros de la feature y el `.gitignore` actualizado**

```bash
git add .gitignore README.md docs/FUNCIONES.md docs/VPN-POR-CUENTA.md package.json scripts/vpn-per-account.cjs src/account-model.js src/account-transfer.js src/index.html src/main.js src/renderer.js src/styles.css src/userscripts.js tests/account-model-smoke.js tests/account-transfer-smoke.js tests/dynamic-accounts-proxy-smoke.js tests/capture-management-redesign-smoke.js
```

- [ ] **Step 4: Commit de la feature**

```bash
git commit -m "Cuentas dinamicas de 1 a 32 y proxy o VPN distinto por cuenta

Cada cuenta recibe un id estable del que se deriva su particion persistente,
de modo que anadir o eliminar cuentas no altera la sesion de las demas. La
plantilla .txt admite de 1 a 32 secciones y al re-sincronizar conserva los ids
por posicion. Cada cuenta puede usar un proxy http o socks5 propio aplicado a su
sesion, con deactivate automatico si la configuracion es invalida.

Se anade scripts/vpn-per-account.cjs para levantar una instancia de v2ray por
nodo con puertos locales propios."
```

- [ ] **Step 5: Etiquetar y publicar**

```bash
git tag v0.23.0
git push origin main --tags
```

Expected: el workflow de `.github/workflows/release.yml` valida que `v0.23.0` coincide con `package.json`, compila el ZIP, genera el SHA-256 y publica la Release.

- [ ] **Step 6: Verificar la Release**

Run: `gh release view v0.23.0 --json tagName,name,assets`
Expected: `tagName` es `v0.23.0` y hay dos assets: `IDLE-POKE-LAUNCHER-0.23.0-portatil.zip` y `IDLE-POKE-LAUNCHER-0.23.0-portatil.zip.sha256`.

---

## Task 3: Semántica opt-out unificada (BUG-01, BUG-02)

**Files:**
- Modify: `src/userscripts.js:796-802`
- Modify: `tests/launcher-preview-preload.js:55, 70-75`
- Test: `tests/userscripts-opt-out-smoke.js` (crear)

**Interfaces:**
- Consumes: `window.pokeGridUserScriptManager` de `src/userscripts.js`.
- Produces: `scriptAppliesToPanel(script, panel)` con semántica **opt-out**: un script se inyecta salvo que `script.accounts[panel.index] === false`. Para paneles de instancias que no sean la principal, la función sigue devolviendo `true` si la URL coincide, sin mirar `accounts`.
- Produces: `tests/launcher-preview-preload.js` expone `window.__pokeGridPreviewAccountCount` (número, por defecto 4) que controla tanto `loadAccounts()` como la longitud de `accounts` en `normalizePreviewScript`.

- [ ] **Step 1: Ampliar el preload de previsualización para N cuentas**

En `tests/launcher-preview-preload.js`, sustituye la línea 55:

```js
    accounts: Array.from({ length: 4 }, (_, index) => value.accounts?.[index] !== false),
```

por:

```js
    accounts: Array.isArray(value.accounts)
      ? value.accounts.slice(0, 32).map((entry) => entry === true)
      : [],
```

Y sustituye `loadAccounts` (líneas 68-75) por:

```js
  loadAccounts: async () => {
    const count = Math.max(1, Math.min(32, Number(window.__pokeGridPreviewAccountCount) || 4));
    return {
      ok: true,
      accounts: Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        label: ['SHOCKVOR', 'SHOCKOR', 'DIEGO20', 'SHOCKVINY'][index] || `Cuenta ${index + 1}`,
        username: '',
        password: '',
        proxy: { enabled: false, protocol: '', host: '', port: 0, username: '', password: '' }
      }))
    };
  },
```

Añade también un `saveAccounts` que devuelva cuentas y resultados de proxy, para que los tests de la Tarea 5 puedan ejercitarlo:

```js
  saveAccounts: async (value) => {
    const accounts = Array.isArray(value) ? value : [];
    return {
      ok: true,
      accounts,
      proxyResults: accounts.map((row) => ({ id: Number(row.id) || 0, ok: true }))
    };
  },
```

- [ ] **Step 2: Escribir la prueba que falla**

Crea `tests/userscripts-opt-out-smoke.js`:

```js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-optout-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

// Construye un panel falso cuyo webview registra el codigo inyectado, igual
// que hace tests/multi-game-userscripts-smoke.js.
function fakePanel(overrides) {
  const injected = [];
  return {
    injected,
    panel: {
      instanceId: 'poke-idle-world',
      instanceName: 'Poke Idle World',
      index: 0,
      startUrl: 'https://poke.idleworld.online/',
      lastUrl: 'https://poke.idleworld.online/',
      webview: {
        getURL: () => 'https://poke.idleworld.online/',
        executeJavaScript: async (source) => { injected.push(source); return 'installed'; }
      },
      ...overrides
    }
  };
}

const SCRIPT = `// ==UserScript==
// @name Opt Out Probe
// @namespace pokegrid.test.optout
// @version 1.0.0
// @match https://poke.idleworld.online/*
// @grant none
// ==/UserScript==
window.__optOutProbe = true;`;

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');

    // 32 cuentas: un script guardado con 4 flags debe inyectarse tambien en la
    // cuenta 5..32 porque la semantica documentada es opt-out.
    await window.webContents.executeJavaScript('window.__pokeGridPreviewAccountCount = 32');
    await window.webContents.executeJavaScript(`(() => {
      window.pokeGridUserScriptManager.open();
      document.querySelector('#newScriptButton').click();
      const editor = document.querySelector('#scriptCodeInput');
      editor.value = ${JSON.stringify(SCRIPT)};
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 520));
    await window.webContents.executeJavaScript(`document.querySelector('#scriptEditorForm').requestSubmit()`);
    await new Promise((resolve) => setTimeout(resolve, 450));

    const probes = await window.webContents.executeJavaScript(`(async () => {
      const manager = window.pokeGridUserScriptManager;
      const results = {};
      for (const index of [0, 3, 4, 11, 31]) {
        const injected = [];
        await manager.installIntoPanel({
          instanceId: 'poke-idle-world', instanceName: 'Poke Idle World', index,
          startUrl: 'https://poke.idleworld.online/', lastUrl: 'https://poke.idleworld.online/',
          webview: { getURL: () => 'https://poke.idleworld.online/', executeJavaScript: async (s) => { injected.push(s); return 'installed'; } }
        });
        results[index] = injected.length;
      }
      return results;
    })()`);

    const state = { probes, installedCount: await window.webContents.executeJavaScript('document.querySelector("#scriptCount").textContent') };

    // Con opt-out, toda cuenta debe recibir la inyeccion: las que estaban
    // marcadas y las que no tenian entrada.
    for (const index of [0, 3, 4, 11, 31]) {
      if (state.probes[index] !== 1) throw new Error(`Opt-out fallo: la cuenta ${index} recibio ${state.probes[index]} inyecciones, se esperaba 1.`);
    }
    if (state.installedCount !== '1') throw new Error(`Se esperaba 1 script instalado, hay ${state.installedCount}.`);

    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
```

- [ ] **Step 3: Ejecutar la prueba y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-opt-out-smoke.js`
Expected: FAIL con `Opt-out fallo: la cuenta 4 recibio 0 inyecciones, se esperaba 1.`

Ese mensaje es la prueba de que el bug existe: con el código actual, `script.accounts?.[panel.index] === true` es `undefined` para los índices 4, 11 y 31, así que no inyecta.

- [ ] **Step 4: Aplicar la semántica opt-out**

En `src/userscripts.js`, dentro de `scriptAppliesToPanel`, sustituye la línea 801:

```js
  if (panelInstanceId(panel) !== PRIMARY_INSTANCE_ID) return true;
  return script.accounts?.[panel.index] === true;
```

por:

```js
  if (panelInstanceId(panel) !== PRIMARY_INSTANCE_ID) return true;
  // Semantica opt-out: la ausencia de entrada significa habilitado. Coincide
  // con la documentacion y con authorizeUserScriptRuntime en main.js, que
  // bloquea solo cuando el valor es exactamente false. Asi un script guardado
  // cuando habia menos cuentas sigue funcionando en las cuentas nuevas.
  return script.accounts?.[panel.index] !== false;
```

- [ ] **Step 5: Ejecutar la prueba y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-opt-out-smoke.js`
Expected: PASS, imprime `{"probes":{"0":1,"3":1,"4":1,"11":1,"31":1},"installedCount":"1"}`.

- [ ] **Step 6: Verificar que la prueba estática sigue pasando**

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: imprime `Multi-game userscript static smoke passed: ...`

Esta prueba comprueba que el script externo NO se inyecta en la instancia principal. Con el cambio sigue siendo cierto, porque `panelInstanceId(panel) !== PRIMARY_INSTANCE_ID` retorna antes de llegar a la línea modificada.

- [ ] **Step 7: Verificar que la prueba de multijuego sigue pasando**

Run: `node_modules\electron\dist\electron.exe tests\multi-game-userscripts-smoke.js`
Expected: PASS.

- [ ] **Step 8: Fijar el límite de tamaño en bytes (Review Focus #4)**

En `src/main.js`, sustituye el bloque de las líneas 310-312:

```js
  if (Buffer.byteLength(code, 'utf8') > USER_SCRIPT_CODE_LIMIT) {
    throw new Error('El script supera el límite de 10 MB.');
  }
```

por:

```js
  if (Buffer.byteLength(code, 'utf8') > USER_SCRIPT_CODE_LIMIT) {
    throw new Error('El script supera el limite de 10 MB.');
  }
```

El texto se reescribe sin tilde para que la comparación en pruebas sea exacta. Añade inmediatamente después, dentro de `normalizeUserScript`, esta comprobación del **tope por script** que devuelve bytes exactos:

```js
  const codeBytes = Buffer.byteLength(code, 'utf8');
  if (codeBytes > USER_SCRIPT_CODE_LIMIT) {
    throw new Error(`El script supera el limite de 10 MB (${codeBytes} bytes).`);
  }
```

Con esto el mensaje incluye los bytes reales, y una prueba puede afirmar sobre el límite sin depender del idioma.

- [ ] **Step 9: Commit**

```bash
git add src/userscripts.js src/main.js tests/launcher-preview-preload.js tests/userscripts-opt-out-smoke.js
git commit -m "Unificar la semantica opt-out de cuentas por script

El renderer exigia accounts[i] === true (opt-in) mientras main.js bloquea solo
cuando el valor es false (opt-out) y la documentacion describe opt-out. Un
script recien instalado desde la Shop se guardaba con accounts vacio y no se
inyectaba nunca, y un script guardado con 4 flags dejaba de ejecutarse en la
cuenta 5 en adelante aunque la UI la mostrara marcada.

El preload de previsualizacion deja de forzar 4 cuentas para poder ejercitar
1, 5, 12 y 32, y saveAccounts devuelve ahora cuentas y resultados de proxy."
```

---

## Task 4: Escape no cierra el Centro de scripts (BUG-03)

**Files:**
- Modify: `src/userscripts.js:1446-1448`
- Test: extender `tests/userscripts-opt-out-smoke.js` con un segundo escenario

**Interfaces:**
- Consumes: `window.pokeGridUserScriptManager.open()` / `.close()`.
- Produces: Escape dentro de `#scriptFindInput` cierra solo la barra de buscar.

- [ ] **Step 1: Escribir la prueba que falla**

Añade al final de `tests/userscripts-opt-out-smoke.js`, antes del bloque `console.log(JSON.stringify(state))`, este bloque que abre la barra de buscar y pulsa Escape:

```js
    const escapeState = await window.webContents.executeJavaScript(`(() => {
      window.pokeGridUserScriptManager.open();
      document.querySelector('#findScriptButton').click();
      const bar = document.querySelector('#scriptFindBar');
      const wasOpen = !bar.hidden;
      document.querySelector('#scriptFindInput').dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      return {
        wasOpen,
        findBarHidden: bar.hidden,
        modalHidden: document.querySelector('#scriptsBackdrop').hidden
      };
    })()`);

    if (!escapeState.wasOpen) throw new Error('La barra de buscar no se abrio.');
    if (!escapeState.findBarHidden) throw new Error('Escape no cerro la barra de buscar.');
    if (escapeState.modalHidden) throw new Error('Escape en la barra de buscar cerro el Centro de scripts entero.');
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-opt-out-smoke.js`
Expected: FAIL con `Escape en la barra de buscar cerro el Centro de scripts entero.`

- [ ] **Step 3: Aplicar la corrección**

En `src/userscripts.js`, sustituye el handler de las líneas 1446-1448:

```js
  findInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); closeFind(); }
  });
```

por:

```js
  findInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // stopPropagation evita que el listener global de document cierre el
    // Centro de scripts entero cuando Escape se pulsa aqui dentro.
    event.preventDefault();
    event.stopPropagation();
    closeFind();
  });
```

- [ ] **Step 4: Verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-opt-out-smoke.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/userscripts.js tests/userscripts-opt-out-smoke.js
git commit -m "Escape en la barra de buscar ya no cierra el Centro de scripts

El handler de #scriptFindInput hacia preventDefault pero no stopPropagation, de
modo que el evento subia por burbujeo hasta el listener global de document y
cerraba el modal entero, perdiendo el borrador del script."
```

---

## Task 5: Confirmaciones y guarda de la lista de cuentas (BUG-04, BUG-22, Review Focus #2)

**Files:**
- Modify: `src/userscripts.js:610-650, 696-724`
- Modify: `src/renderer.js:8562-8572, 8683-8726`
- Test: `tests/accounts-history-guard-smoke.js` (crear)

**Interfaces:**
- Consumes: `installFromScriptShop(item)` de `src/userscripts.js`; `accountsForm` submit de `src/renderer.js`.
- Produces: `installFromScriptShop` pide confirmación cuando el script instalado tiene `shopVersion` y su `shopSha256` no coincide con el código guardado (es decir, fue editado localmente).
- Produces: el botón de eliminar de una fila del modal de cuentas pide confirmación indicando cuántas filas quedan y que el historial de las posiciones siguientes se reasigna.
- Produces: el submit del modal de cuentas **rechaza** un conjunto de 0 filas con el mensaje `Añade al menos una cuenta.` (ya existe) **y** garantiza que nunca se envíe una lista vacía a `saveAccounts`.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `tests/accounts-history-guard-smoke.js`:

```js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-history-guard-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGrid && document.querySelectorAll(".panel").length === 4');

    // Intercepta window.confirm y window.pokeGrid.saveAccounts para observar
    // lo que el modal realmente envia, sin tocar disco.
    const state = await window.webContents.executeJavaScript(`(async () => {
      const prompts = [];
      const originalConfirm = window.confirm;
      window.confirm = (message) => { prompts.push(String(message)); return false; };
      const saved = [];
      const originalSave = window.pokeGrid.saveAccounts;
      window.pokeGrid.saveAccounts = async (value) => { saved.push(value); return originalSave(value); };

      document.querySelector('#accountsButton').click();
      await new Promise((resolve) => setTimeout(resolve, 120));

      const removeButtons = [...document.querySelectorAll('.account-row-remove')];
      removeButtons[3].click();
      removeButtons[2].click();
      await new Promise((resolve) => setTimeout(resolve, 120));

      const rowsAfterRemoval = document.querySelectorAll('.account-row').length;
      const lastRemove = document.querySelector('.account-row-remove');
      lastRemove.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const rowsAfterLastAttempt = document.querySelectorAll('.account-row').length;

      return { prompts, saved, rowsAfterRemoval, rowsAfterLastAttempt, minimumRows: 1 };
    })()`);

    if (state.rowsAfterRemoval !== 2) {
      throw new Error(`Se esperaban 2 filas tras borrar 2, hay ${state.rowsAfterRemoval}.`);
    }
    if (state.rowsAfterLastAttempt !== 1) {
      throw new Error(`La ultima fila no se pudo borrar: hay ${state.rowsAfterLastAttempt}.`);
    }
    if (state.prompts.length === 0) {
      throw new Error('Borrar una cuenta no pidio confirmacion. El historial de las posiciones siguientes se reasigna en silencio.');
    }

    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js`
Expected: FAIL con `Borrar una cuenta no pidio confirmacion. ...`

- [ ] **Step 3: Aplicar la confirmación de borrado**

En `src/renderer.js`, sustituye el handler del botón de eliminar (líneas 8567-8571):

```js
  removeButton.addEventListener('click', () => {
    if (accountRows.querySelectorAll('.account-row').length <= 1) return;
    row.remove();
    reindexAccountRows();
  });
```

por:

```js
  removeButton.addEventListener('click', () => {
    const remaining = accountRows.querySelectorAll('.account-row').length;
    if (remaining <= 1) {
      setModalMessage('Debe quedar al menos una cuenta.');
      return;
    }
    // Eliminar una cuenta desplaza las siguientes una posicion hacia arriba y
    // su historial (capturas, metas, notificaciones) pasa a la cuenta que
    // ocupa ese lugar. Sin este aviso el usuario pierde datos sin entenderlo.
    const name = account.label || `Cuenta ${index + 1}`;
    const nextOwner = accounts[index + 1]?.label || (index + 2 <= accounts.length ? `Cuenta ${index + 2}` : '');
    if (!window.confirm(
      `¿Eliminar ${name} al guardar?\n\n` +
      (nextOwner
        ? `El historial de esa posición (capturas, metas y notificaciones) pasará a ${nextOwner}.`
        : 'Es la última cuenta de la lista.')
    )) return;
    row.remove();
    reindexAccountRows();
  });
```

- [ ] **Step 4: Añadir el helper `setModalMessage`**

En `src/renderer.js`, inserta este helper justo antes de `function renderAccountRow(` (línea 8519):

```js
function setModalMessage(text, ok = false) {
  modalMessage.textContent = String(text || '');
  modalMessage.classList.toggle('is-ok', Boolean(ok));
}
```

Y sustituye el cuerpo de los tres sitios que ya hacen esto manualmente para que no divergan:
- en `openAccountsModal` (líneas 8584-8585), reemplaza las dos líneas por `setModalMessage('');`
- en `importAccountsButton` (línea 8640), reemplaza `modalMessage.textContent = 'Leyendo y validando las cuatro cuentas…';` y `modalMessage.classList.remove('is-ok');` por `setModalMessage('Leyendo y validando las cuentas…');`
- en `importAccountsButton` (línea 8653), reemplaza las dos líneas de asignación por `setModalMessage(\`${result.file}: cuentas importadas y vinculadas. Los cambios futuros se sincronizarán automáticamente.\`, true);`

- [ ] **Step 5: Blindar el submit contra la lista vacía**

En `src/renderer.js`, dentro del handler de `accountsForm` submit, sustituye el bloque inicial:

```js
  const rowElements = Array.from(accountRows.querySelectorAll('.account-row'));
  if (!rowElements.length) {
    modalMessage.textContent = 'Añade al menos una cuenta.';
    return;
  }
```

por:

```js
  const rowElements = Array.from(accountRows.querySelectorAll('.account-row'));
  if (!rowElements.length) {
    setModalMessage('Añade al menos una cuenta.');
    return;
  }
  const incomplete = rowElements.filter((rowEl) => {
    const value = (field) => rowEl.querySelector(`[data-field="${field}"]`)?.value?.trim() || '';
    return !value('username') || !value('password');
  });
  if (incomplete.length) {
    setModalMessage(`${incomplete.length} fila(s) sin usuario o contraseña. Completa todas o elimina la fila.`);
    return;
  }
```

- [ ] **Step 6: Verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js`
Expected: PASS, imprime `{"prompts":[...],...}`

- [ ] **Step 7: Verificar que el modal de cuentas sigue pasando**

Run: `node_modules\electron\dist\electron.exe tests\accounts-modal-smoke.js`
Expected: PASS. Si falla con el mensaje de filas incompletas, es porque `tests/launcher-preview-preload.js` sirve cuentas con `username: ''`. Rellena `usuario1@ejemplo.test` y `clave1` en las 4 filas dentro de `accounts-modal-smoke.js` antes de volver a ejecutarlo; es un ajuste de la prueba, no del código del launcher.

- [ ] **Step 8: Añadir la confirmación de sobrescritura en la Shop (BUG-04)**

En `src/userscripts.js`, dentro de `installFromScriptShop`, inserta este bloque justo **después** de resolver `existing` y **antes** de la llamada a `installScriptShopItem`:

```js
  const alreadyInstalled = installedShopScript(item.id);
  if (alreadyInstalled && String(alreadyInstalled.shopVersion || '') &&
      String(alreadyInstalled.shopSha256 || '') &&
      String(item.sha256 || '') !== String(alreadyInstalled.shopSha256)) {
    const accepted = window.confirm(
      `Has editado «${alreadyInstalled.name}» de la Shop (versión ${alreadyInstalled.shopVersion || '—'}).\n\n` +
      `Actualizar a ${item.version} descarta tus cambios y no se puede deshacer.\n\n¿Continuar?`
    );
    if (!accepted) return;
  }
```

- [ ] **Step 9: Verificar que la tienda sigue pasando**

Run: `node_modules\electron\dist\electron.exe tests\script-shop-visual-smoke.js && node tests\script-shop-smoke.js`
Expected: ambos PASS.

- [ ] **Step 10: Commit**

```bash
git add src/renderer.js src/userscripts.js tests/accounts-history-guard-smoke.js
git commit -m "Confirmar antes de eliminar una cuenta o sobrescribir un script editado

Eliminar una cuenta desplaza las siguientes una posicion y su historial pasa a
la cuenta que ocupa ese lugar. El boton solo decia 'conserva las demas', lo que
sugeria lo contrario. Ahora el aviso nombra la cuenta que heredara el historial.

El submit del modal rechaza una lista vacia o con filas sin credenciales antes
de llamar a saveAccounts, para no sobrescribir el archivo cifrado con nada.

Actualizar un script de la Shop que fue editado localmente pide confirmacion y
declara que los cambios se pierden."
```

---

## Task 6: Integridad de userscripts (BUG-10, BUG-13, BUG-08)

**Files:**
- Modify: `src/userscripts.js:895-970, 726-745, 838-866, 1256-1278`
- Test: `tests/guest-cleanup-smoke.js` (crear)

**Interfaces:**
- Consumes: `installDroppedFiles`, `uninstallFromScriptShop`, `deleteSelected`, `installIntoPanel`.
- Produces: `buildGuestCleanupSource(scriptId)` — devuelve el código a ejecutar en el guest que borra `localStorage['pokegrid:userscript:<id>:storage']`, los `style[data-pokegrid-userscript="<id>"]`, los `[data-pokegrid-userscript-toast="<id>"]`, las entradas de `window.__pokeGridUserScriptsRuntime` con prefijo `<id>::` y las de `window.__pokeGridUserScriptCommands` con `scriptId === <id>`. Devuelve un objeto `{ removed: { storage, styles, toasts, registry, commands } }`.
- Produces: `cleanupScriptInPanels(scriptId)` — itera `panelRows` y ejecuta `buildGuestCleanupSource` en cada webview, resolviendo sin lanzar.
- Produces: `compareScriptVersions(left, right)` — devuelve `-1 | 0 | 1` comparando `@version` numérico por segmentos; reutilizable por el drag & drop y por `updateBundledTelegramScript`.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `tests/guest-cleanup-smoke.js`:

```js
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

app.setPath('userData', path.join(app.getPath('temp'), `pokegrid-guest-cleanup-${process.pid}`));

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1360,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');

    const apiShape = await window.webContents.executeJavaScript(`(() => {
      const manager = window.pokeGridUserScriptManager;
      return {
        cleanupScriptInPanels: typeof manager.cleanupScriptInPanels,
        buildGuestCleanupSource: typeof manager.buildGuestCleanupSource
      };
    })()`);

    if (apiShape.cleanupScriptInPanels !== 'function' || apiShape.buildGuestCleanupSource !== 'function') {
      throw new Error(`La API de limpieza en el guest no esta expuesta: ${JSON.stringify(apiShape)}`);
    }

    // Siembra el estado que dejaria un script inyectado, ejecuta el codigo de
    // limpieza y comprueba que solo desaparece lo de ese script.
    const state = await window.webContents.executeJavaScript(`(() => {
      const manager = window.pokeGridUserScriptManager;
      const id = 'probe-1';
      const other = 'probe-2';

      localStorage.setItem('pokegrid:userscript:' + id + ':storage', JSON.stringify({ flag: 'on' }));
      localStorage.setItem('pokegrid:userscript:' + other + ':storage', JSON.stringify({ flag: 'on' }));

      const style = document.createElement('style');
      style.dataset.pokegridUserscript = id;
      style.textContent = '.probe { color: red }';
      document.head.appendChild(style);
      const otherStyle = document.createElement('style');
      otherStyle.dataset.pokegridUserscript = other;
      document.head.appendChild(otherStyle);

      const toast = document.createElement('div');
      toast.dataset.pokegridUserscriptToast = id;
      document.documentElement.appendChild(toast);

      const registry = window.__pokeGridUserScriptsRuntime || (window.__pokeGridUserScriptsRuntime = new Set());
      registry.add(id + '::https://poke.idleworld.online/');
      registry.add(other + '::https://poke.idleworld.online/');

      const commands = window.__pokeGridUserScriptCommands || (window.__pokeGridUserScriptCommands = []);
      commands.push({ id: id + ':0', scriptId: id, caption: 'Menu' });
      commands.push({ id: other + ':0', scriptId: other, caption: 'Menu' });

      const source = manager.buildGuestCleanupSource(id);
      if (typeof source !== 'string' || source.length < 50) {
        throw new Error('buildGuestCleanupSource no devolvio una cadena utilizable.');
      }
      // eslint-disable-next-line no-eval
      const removed = eval(source);

      return {
        removed,
        ownStorage: localStorage.getItem('pokegrid:userscript:' + id + ':storage'),
        otherStorage: localStorage.getItem('pokegrid:userscript:' + other + ':storage'),
        ownStyles: document.querySelectorAll('style[data-pokegrid-userscript="' + id + '"]').length,
        otherStyles: document.querySelectorAll('style[data-pokegrid-userscript="' + other + '"]').length,
        ownToasts: document.querySelectorAll('[data-pokegrid-userscript-toast="' + id + '"]').length,
        registryHasOwn: [...registry].some((entry) => entry.startsWith(id + '::')),
        registryHasOther: [...registry].some((entry) => entry.startsWith(other + '::')),
        commandsHaveOwn: commands.some((entry) => entry.scriptId === id),
        commandsHaveOther: commands.some((entry) => entry.scriptId === other)
      };
    })()`);

    if (state.ownStorage !== null) throw new Error('La limpieza no borro el almacenamiento del script.');
    if (state.otherStorage === null) throw new Error('La limpieza borro el almacenamiento de OTRO script.');
    if (state.ownStyles !== 0) throw new Error(`Quedaron ${state.ownStyles} <style> del script.`);
    if (state.otherStyles !== 1) throw new Error('La limpieza borro los <style> de otro script.');
    if (state.ownToasts !== 0) throw new Error('Quedaron toasts del script.');
    if (state.registryHasOwn) throw new Error('Quedo la entrada del script en el registro anti-duplicado.');
    if (!state.registryHasOther) throw new Error('La limpieza vacio el registro de otros scripts.');
    if (state.commandsHaveOwn) throw new Error('Quedaron comandos de menu del script.');
    if (!state.commandsHaveOther) throw new Error('La limpio los comandos de menu de otro script.');

    console.log(JSON.stringify(state));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\guest-cleanup-smoke.js`
Expected: FAIL con `La API de limpieza en el guest no esta expuesta por pokeGridUserScriptManager.`

- [ ] **Step 3: Implementar `buildGuestCleanupSource` y `cleanupScriptInPanels`**

En `src/userscripts.js`, inserta este bloque justo después de `function installIntoPanel(` termina (después de la línea 1278):

```js
  function buildGuestCleanupSource(scriptId) {
    const id = JSON.stringify(String(scriptId || ''));
    return `(() => {
      const id = ${id};
      const removed = { storage: false, styles: 0, toasts: 0, registry: 0, commands: 0 };
      const key = 'pokegrid:userscript:' + id + ':storage';
      try {
        if (localStorage.getItem(key) !== null) { localStorage.removeItem(key); removed.storage = true; }
      } catch {}
      document.querySelectorAll('style[data-pokegrid-userscript="' + id + '"]').forEach((node) => { node.remove(); removed.styles += 1; });
      document.querySelectorAll('[data-pokegrid-userscript-toast="' + id + '"]').forEach((node) => { node.remove(); removed.toasts += 1; });
      const registry = window.__pokeGridUserScriptsRuntime;
      if (registry && typeof registry.forEach === 'function') {
        [...registry].forEach((entry) => {
          if (String(entry).startsWith(id + '::')) { registry.delete(entry); removed.registry += 1; }
        });
      }
      const commands = window.__pokeGridUserScriptCommands;
      if (Array.isArray(commands)) {
        for (let index = commands.length - 1; index >= 0; index -= 1) {
          if (commands[index] && commands[index].scriptId === id) { commands.splice(index, 1); removed.commands += 1; }
        }
      }
      return removed;
    })()`;
  }

  async function cleanupScriptInPanels(scriptId) {
    if (!scriptId) return [];
    const source = buildGuestCleanupSource(scriptId);
    const results = await Promise.allSettled(panelRows.map(async (panel) => {
      const removed = await panel.webview.executeJavaScript(source);
      return { index: panel.index, removed: removed || null };
    }));
    return results.map((result) => (result.status === 'fulfilled' ? result.value : { index: -1, removed: null }));
  }
```

- [ ] **Step 4: Exponer `cleanupScriptInPanels` y el generador en la API pública**

En `src/userscripts.js`, en el objeto `window.pokeGridUserScriptManager` (líneas 1459-1482), añade dos entradas antes de la llave de cierre:

```js
    cleanupScriptInPanels,
    buildGuestCleanupSource
```

- [ ] **Step 5: Llamar a la limpieza al desinstalar y al borrar**

En `uninstallFromScriptShop`, justo después de la llamada `removeScriptShopItem` que ya existe, añade:

```js
    await cleanupScriptInPanels(installed?.id);
```

En `deleteSelected`, justo después de la llamada `deleteUserScript`, añade:

```js
    await cleanupScriptInPanels(selected?.id);
```

- [ ] **Step 6: Implementar `compareScriptVersions` y usarlo en el drag & drop**

En `src/userscripts.js`, inserta este helper junto a `compareVersions` (después de la línea 138):

```js
  const compareScriptVersions = (left, right) => {
    const parse = (value) => {
      const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
      return match ? match.slice(1).map(Number) : null;
    };
    const a = parse(left);
    const b = parse(right);
    if (!a || !b) return 0;
    for (let index = 0; index < 3; index += 1) {
      if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    }
    return 0;
  };
```

En `installDroppedFiles`, sustituye la búsqueda del script existente por una quecompare versiones. Localiza el bloque que empareja por `namespace` + `name` (líneas 930-940) y sustitúyelo por:

```js
      const candidate = scripts.find((row) => row.namespace === parsed.namespace && row.name === parsed.name);
      if (candidate && compareScriptVersions(parsed.version, candidate.version) < 0) {
        // Un archivo mas antiguo no pisa una copia mas nueva. Se informa y se
        // sigue con el resto de la tanda.
        setMessage(`«${parsed.name}» ${parsed.version} es mas antiguo que la copia instalada (${candidate.version}). No se instalo.`);
        continue;
      }
```

- [ ] **Step 7: Corregir el guard de `saveEditor` (BUG-08)**

En `saveEditor` (líneas 838-866), localiza la validación que exige al menos una cuenta marcada y sustitúyela por una que considere el interruptor de estado:

```js
    if (!enabledInput.checked && !nextAccounts.some(Boolean) && !external && !customGames) {
      setMessage('Activa el script o marca al menos una cuenta donde ejecutarlo.');
      return;
    }
```

- [ ] **Step 8: Ejecutar la prueba y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\guest-cleanup-smoke.js`
Expected: PASS.

- [ ] **Step 9: Verificar que el gestor de scripts sigue pasando**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-manager-smoke.js && node_modules\electron\dist\electron.exe tests\multi-game-userscripts-smoke.js && node_modules\electron\dist\electron.exe tests\script-shop-visual-smoke.js`
Expected: los tres PASS.

- [ ] **Step 10: Commit**

```bash
git add src/userscripts.js tests/guest-cleanup-smoke.js
git commit -m "Limpiar el estado del script en el guest y no dejar pisar versiones nuevas

Desinstalar o borrar un script dejaba en cada webview su localStorage
(pokegrid:userscript:<id>:storage), sus <style> inyectados, sus toasts, su
entrada del registro anti-duplicado y sus comandos de menu. La funcion nueva
buildGuestCleanupSource los elimina y cleanupScriptInPanels la aplica a todos los
paneles registrados.

Arrastrar un .user.js mas antiguo ahora compara @version y no pisa una copia mas
nueva, en vez de sobrescribir a ciegas como ya hacia el modulo de Telegram.

Guardar un script desactivado con todas las cuentas desmarcadas ya no es
imposible: el guard de saveEditor mira el interruptor de estado primero."
```

---

## Task 7: Robustez del arranque y colores de cuenta (BUG-18, BUG-23)

**Files:**
- Modify: `src/userscripts.js:23-79, 241` (no, 241 es renderer)
- Modify: `src/renderer.js:241, 7588, 7617, 7645`
- Test: extender `tests/multi-game-userscripts-static-smoke.js`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: si falta algún elemento del DOM del modal, el módulo registra `console.error` con el id que falta y sigue exponiendo `window.pokeGridUserScriptManager` con los métodos que no dependen de ese elemento, en lugar de abortar el parseo.
- Produces: `accountColor(index)` en `renderer.js` devuelve un color HSL estable para cualquier índice, sin límite superior.

- [ ] **Step 1: Escribir la prueba que falla**

En `tests/multi-game-userscripts-static-smoke.js`, añade al final, antes del `console.log`:

```js
// La paleta de cuentas no puede tener un tope: con 32 cuentas un array fijo
// de 4 colores hace que dos cuentas compartan color.
assert.doesNotMatch(renderer, /const STATISTICS_ACCOUNT_COLORS = \[/);
assert.match(renderer, /function accountColor\(index\)/);

// El arranque del modulo de scripts debe validar el DOM en vez de abortar.
assert.match(manager, /const missing = REQUIRED_SCRIPT_ELEMENTS\.filter/);
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: FAIL en `assert.doesNotMatch(renderer, /const STATISTICS_ACCOUNT_COLORS = \[/)`, con el mensaje de aserción.

- [ ] **Step 3: Reemplazar la paleta por una función**

En `src/renderer.js`, sustituye la línea 241:

```js
const STATISTICS_ACCOUNT_COLORS = ['#49c8e8', '#ff806b', '#a889ff', '#e1b74e'];
```

por:

```js
// 12 tonos equiespaciados: con el tope actual de 32 cuentas ninguna repite color.
const ACCOUNT_COLOR_HUES = 12;
function accountColor(index) {
  const hue = Math.round(((Number(index) || 0) % ACCOUNT_COLOR_HUES) * (360 / ACCOUNT_COLOR_HUES));
  return `hsl(${hue} 72% 64%)`;
}
```

Y sustituye las tres usos (líneas 7588, 7617, 7645). Cada una tiene la forma:

```js
    card.style.setProperty('--account-color', STATISTICS_ACCOUNT_COLORS[index % STATISTICS_ACCOUNT_COLORS.length]);
```

Sustituye por:

```js
    card.style.setProperty('--account-color', accountColor(index));
```

Aplica el mismo cambio en las líneas 7617 (variable `row`) y 7645 (variable `card` con `row.index`):

```js
    row.style.setProperty('--account-color', accountColor(index));
    card.style.setProperty('--account-color', accountColor(row.index));
```

- [ ] **Step 4: Ejecutar y verificar que pasa la primera aserción**

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: FAIL en la segunda aserción, `assert.match(manager, /const missing = REQUIRED_SCRIPT_ELEMENTS\.filter/)`.

- [ ] **Step 5: Validar el DOM al arrancar el módulo de scripts**

En `src/userscripts.js`, inserta este bloque justo **antes** de la sección de `const ... = document.querySelector(...)` que empieza en la línea 23:

```js
// Ids del DOM que el modulo necesita. Si alguno falta, se avisa de forma
// explicita en vez de abortar el parseo del modulo y dejar el Centro de scripts
// entero sin definir sin ningun error visible.
const REQUIRED_SCRIPT_ELEMENTS = [
  '#scriptsBackdrop', '#installedScriptsView', '#scriptShopView', '#scriptsList', '#scriptCount',
  '#newScriptButton', '#importScriptButton', '#installTelegramAlertsButton', '#scriptDropZone',
  '#scriptUrlForm', '#scriptUrlInput', '#scriptEditorForm', '#scriptCodeInput', '#scriptLineNumbers',
  '#scriptEditorName', '#scriptEditorMeta', '#scriptEnabledInput', '#scriptAccountToggles',
  '#validateScriptButton', '#undoScriptButton', '#redoScriptButton', '#commentScriptButton',
  '#duplicateScriptLineButton', '#findScriptButton', '#scriptFindBar', '#scriptFindInput',
  '#scriptFindCount', '#scriptFindPreviousButton', '#scriptFindNextButton', '#closeScriptFindButton',
  '#scriptSyntaxStatus', '#scriptCursorStatus', '#scriptPermissionSummary', '#deleteScriptButton',
  '#exportScriptButton', '#cancelScriptChangesButton', '#scriptsMessage', '#extensionPathOutput',
  '#pickExtensionButton', '#extensionAccountToggles', '#extensionStatus', '#applyExtensionButton',
  '#installedScriptsTab', '#scriptShopTab', '#scriptShopUpdateBadge', '#scriptShopSearch',
  '#refreshScriptShopButton', '#scriptShopSummary', '#scriptShopGrid', '#scriptShopMessage'
];

const missing = REQUIRED_SCRIPT_ELEMENTS.filter((selector) => !document.querySelector(selector));
if (missing.length) {
  console.error(`[PokeGrid] Centro de scripts incompleto. Faltan ${missing.length} elemento(s): ${missing.join(', ')}`);
}
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `node tests\multi-game-userscripts-static-smoke.js`
Expected: PASS, imprime `Multi-game userscript static smoke passed: ...`

- [ ] **Step 7: Verificar que nada se rompió**

Run: `node_modules\electron\dist\electron.exe tests\userscripts-manager-smoke.js && node_modules\electron\dist\electron.exe tests\launcher-visual-smoke.js`
Expected: ambos PASS.

- [ ] **Step 8: Commit**

```bash
git add src/renderer.js src/userscripts.js tests/multi-game-userscripts-static-smoke.js
git commit -m "Colores de cuenta sin tope y arranque del Centro de scripts validado

La paleta de estadisticas tenia 4 colores con modulo, de modo que con 5 o mas
cuentas dos accounts compartian color y la identificacion por color se perdia.
accountColor() genera 12 tonos equiespaciados, ninguno repetido dentro del tope
actual de 32 cuentas.

El modulo de scripts resolvia 58 elementos del DOM sin comprobarlos: un rename
de id en index.html dejaba window.pokeGridUserScriptManager indefinido y, por el
optional chaining del renderer, sin Centro de scripts y sin inyeccion, sin
ningun error visible. Ahora se valida y se informa por consola."
```

---

## Task 8: El proxy se aplica a la sesión viva (nuevo, Review Focus #1)

**Files:**
- Modify: `src/renderer.js:8712-8726`
- Modify: `src/index.html:567-576`
- Modify: `src/styles.css` (bloque `.account-proxy-details`, tras la línea de `.account-proxy-grid`)
- Test: extender `tests/accounts-history-guard-smoke.js`

**Interfaces:**
- Consumes: el resultado de `window.pokeGrid.saveAccounts()` y sus `proxyResults`.
- Produces: cuando un cambio de proxy altera alguna cuenta, el renderer recarga **solo** los webviews de esas cuentas (no reconstruye la lista completa) y muestra un estado "Recargando con la nueva conexión…" durante la recarga.
- Produce: en el modal, cada fila muestra un chip con el estado de su proxy tras guardar.

- [ ] **Step 1: Escribir la prueba que falla**

Añade al final de `tests/accounts-history-guard-smoke.js`, antes del `console.log(JSON.stringify(state))`:

```js
    const proxyState = await window.webContents.executeJavaScript(`(async () => {
      document.querySelector('#accountsButton').click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const row = document.querySelector('.account-row');
      const details = row.querySelector('.account-proxy-details');
      details.open = true;
      row.querySelector('[data-field="proxy.protocol"]').value = 'http';
      row.querySelector('[data-field="proxy.host"]').value = '127.0.0.1';
      row.querySelector('[data-field="proxy.port"]').value = '1080';
      document.querySelector('#accountsForm').requestSubmit();
      await new Promise((resolve) => setTimeout(resolve, 700));
      return {
        message: document.querySelector('#modalMessage').textContent,
        hasProxyChip: Boolean(document.querySelector('.account-proxy-status'))
      };
    })()`);

    if (!/conexi[oó]n|nueva conexi[oó]n|recarg/i.test(proxyState.message)) {
      throw new Error(`Tras cambiar un proxy el launcher no recargo la sesion affected. Mensaje: "${proxyState.message}"`);
    }
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js`
Expected: FAIL con `Tras cambiar un proxy el launcher no recargo la sesion affected. ...`

- [ ] **Step 3: Recargar los paneles de las cuentas cuyo proxy cambió**

En `src/renderer.js`, sustituye el bloque final del submit de `accountsForm` (líneas 8712-8726) por:

```js
  const previousProxies = new Map(accounts.map((account) => [
    Number(account.id),
    JSON.stringify({ ...(account.proxy || {}), password: '' })
  ]));
  accounts = normalizeAccounts(result.accounts || nextAccounts);
  const structureChanged = accounts.length !== panels.length ||
    accounts.some((account, index) => Number(panels[index]?.accountId) !== account.id);
  const proxyChangedIndexes = [];
  accounts.forEach((account, index) => {
    const signature = JSON.stringify({ ...(account.proxy || {}), password: '' });
    if (previousProxies.get(Number(account.id)) !== signature) proxyChangedIndexes.push(index);
  });

  if (structureChanged) {
    rebuildGamePanels();
    setModalMessage('Cuentas guardadas y paneles actualizados.', true);
  } else {
    refreshPanelNames();
    if (proxyChangedIndexes.length) {
      // setProxy solo afecta a conexiones nuevas: las sockets ya abiertas
      // siguen saliendo por la IP anterior. Hay que recargar la sesion de
      // esas cuentas o el usuario cree que tiene una IP nueva y no la tiene.
      proxyChangedIndexes.forEach((index) => {
        const panel = panels[index];
        if (!panel) return;
        clearConnectionTimers(panel);
        panel.connectionFailures = 0;
        setConnectionVisual(panel, 'loading', 'Recargando con la nueva conexión…');
        panel.proxyReloading = true;
        loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Cambio de proxy' });
      });
      setModalMessage(`Cuentas guardadas. Recargando ${proxyChangedIndexes.length} sesión(es) para aplicar la nueva conexión.`, true);
    } else {
      setModalMessage('Cuentas guardadas de forma segura.', true);
    }
  }
  const proxyFailures = (result.proxyResults || []).filter((entry) => !entry.ok);
  if (proxyFailures.length) {
    setModalMessage(
      `${modalMessage.textContent} · Proxy no aplicado en ${proxyFailures.length} cuenta(s).`,
      proxyFailures.length === 0
    );
  }
  window.setTimeout(closeAccountsModal, structureChanged ? 900 : 500);
```

- [ ] **Step 4: Limpiar el estado `proxyReloading` cuando el panel queda listo**

En `src/renderer.js`, dentro de `markConnectionReady` (líneas 7886-7895), añade al principio del cuerpo:

```js
  if (panel.proxyReloading) {
    panel.proxyReloading = false;
    const account = accounts[panel.index];
    if (account?.proxy?.enabled) {
      panel.status.textContent = `Sesión con ${String(account.proxy.protocol).toUpperCase()} · ${account.proxy.host}:${account.proxy.port}`;
    }
  }
```

- [ ] **Step 5: Añadir el chip VPN a la barra del panel**

En `src/renderer.js`, en `createPanel`, sustituye la línea que fija el nombre (8355):

```js
  name.textContent = accounts[index].label || `Cuenta ${index + 1}`;
```

por:

```js
  name.textContent = accounts[index].label || `Cuenta ${index + 1}`;
  const proxy = accounts[index]?.proxy;
  if (proxy?.enabled) {
    const chip = document.createElement('span');
    chip.className = 'panel-vpn-chip';
    chip.textContent = 'VPN';
    chip.title = `Conexión ${String(proxy.protocol).toUpperCase()} · ${proxy.host}:${proxy.port}`;
    name.after(chip);
  }
```

- [ ] **Step 6: Estilizar el chip**

En `src/styles.css`, añade al final:

```css
/* Etiqueta de proxy activo en la barra del panel. */
.panel-vpn-chip {
  display: inline-flex;
  align-items: center;
  height: 16px;
  padding: 0 6px;
  border: 1px solid rgba(255, 200, 87, 0.45);
  border-radius: 999px;
  background: rgba(255, 200, 87, 0.12);
  color: var(--warning);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  pointer-events: none;
}
```

- [ ] **Step 7: Mostrar el estado del proxy por cuenta en el modal**

En `src/renderer.js`, en el handler de submit de `accountsForm`, después del bloque de `proxyFailures`, añade antes del `window.setTimeout`:

```js
  const resultsById = new Map((result.proxyResults || []).map((entry) => [Number(entry.id), entry]));
  accountRows.querySelectorAll('.account-row').forEach((rowEl) => {
    rowEl.querySelector('.account-proxy-status')?.remove();
    const id = Number(rowEl.dataset.accountId);
    const entry = resultsById.get(id);
    if (!entry) return;
    const status = document.createElement('small');
    status.className = `account-proxy-status ${entry.ok ? 'is-ok' : 'is-error'}`;
    status.textContent = entry.ok
      ? `Proxy aplicado: ${nextAccounts.find((a) => Number(a.id) === id)?.proxy?.protocol?.toUpperCase() || '—'}`
      : `Proxy no aplicado: ${entry.error || 'error desconocido'}`;
    rowEl.appendChild(status);
  });
```

Y en `src/styles.css`, añade:

```css
.account-proxy-status {
  flex-basis: 100%;
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.4;
}
.account-proxy-status.is-ok { color: var(--success); }
.account-proxy-status.is-error { color: var(--danger); }
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js`
Expected: PASS.

- [ ] **Step 9: Verificar el proxy al arrancar (R-B6)**

En `src/main.js`, sustituye el bloque de `configureGameSessions` que hoy solo avisa por consola (líneas 907-909):

```js
  try { await applyAccountProxies(accountList); } catch (error) {
    console.warn(`No se pudieron aplicar los proxies de cuenta: ${error.message}`);
  }
```

por:

```js
  lastProxyResults = await applyAccountProxies(accountList);
  const failed = lastProxyResults.filter((entry) => !entry.ok);
  if (failed.length) {
    console.warn(`No se pudo aplicar el proxy de ${failed.length} cuenta(s): ${failed.map((e) => `${e.id} (${e.error})`).join(', ')}`);
  }
```

`configureGameSessions` se ejecuta antes de `createWindow()` (`main.js:1615-1621`), así que cuando el renderer consulta el handler, `lastProxyResults` ya está poblado: no hace falta evento alguno.

Y añade en `main.js` el handler que lleva el aviso a la UI, junto a los de `app:cleanup-memory`:

```js
ipcMain.handle('app:proxy-results', (event) => {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    return { ok: false, results: [] };
  }
  return { ok: true, results: lastProxyResults };
});
```

Con `let lastProxyResults = [];` declarado junto a las demás variables de estado de la parte superior (después de `let scriptShopCache = null;` en `main.js`).

En `src/preload.js`:

```js
  loadProxyResults: () => ipcRenderer.invoke('app:proxy-results'),
```

En `src/renderer.js`, al final de `initialize()`, antes de `if (!result.ok) {`:

```js
  const proxyReport = await window.pokeGrid.loadProxyResults?.();
  (proxyReport?.results || []).forEach((entry) => {
    if (entry.ok) return;
    const panel = panels[entry.account];
    if (!panel) return;
    panel.status.textContent = `Proxy no aplicado: ${entry.error || 'error desconocido'}`;
    panel.element.classList.add('is-error');
  });
```

`applyAccountProxies` ya devuelve `[{id, ok, error?}]` en el orden de `accountList`, así que `entry.account` es el índice de la cuenta.

- [ ] **Step 10: Verificar que la cuadrícula y las instancias siguen pasando**

Run: `node_modules\electron\dist\electron.exe tests\browser-instances-and-connectivity-smoke.js && node_modules\electron\dist\electron.exe tests\statistics-and-dragdrop-smoke.js`
Expected: ambos PASS.

- [ ] **Step 10: Commit**

```bash
git add src/renderer.js src/styles.css tests/accounts-history-guard-smoke.js
git commit -m "Recargar la sesion de una cuenta cuando su proxy cambia

applyAccountProxies llamaba a session.setProxy correctamente, pero el submit del
modal solo reconstruia paneles cuando cambiaba la estructura. Una cuenta que ya
estaba cargada conservaba las conexiones keep-alive de Chromium y salia por la IP
anterior: el usuario creia tener una IP nueva y no la tenia.

Ahora se detecta el cambio de proxy por firma, se recargan solo esos webviews y
se muestra el destino en la barra del panel hasta que queda lista. El modal
tambien informa cuenta por cuenta si el proxy se aplico o no, y no solo el
numero total de fallos."
```

---

## Task 9: Textos dinámicos y desvincular el `.txt` (R-E10, R-B18)

**Files:**
- Modify: `src/index.html:21, 110, 183`
- Modify: `src/renderer.js:7678, 8639, 8653` (los de "cuatro cuentas")
- Modify: `src/main.js` (nuevo handler `accounts:unlink-source`)
- Modify: `src/preload.js` (nuevo método)
- Modify: `src/renderer.js` (handler del botón)
- Test: extender `tests/accounts-history-guard-smoke.js`

**Interfaces:**
- Consumes: `accountCount()` de `renderer.js`.
- Produces: `accountCountText()` en `renderer.js` devuelve `"4 cuentas"`, `"1 cuenta"` o `"32 cuentas"`.
- Produces: `window.pokeGrid.unlinkAccountsSource()` → IPC `accounts:unlink-source`, que borra `userData/accounts-source.json` con escritura atómica y devuelve `{ ok: true }`.

- [ ] **Step 1: Añadir el handler y el método preload**

En `src/main.js`, inserta este handler junto a los demás de cuentas (después del handler `accounts:import-file`):

```js
ipcMain.handle('accounts:unlink-source', () => {
  try {
    const file = accountSourcePath();
    if (!fs.existsSync(file)) return { ok: true, alreadyUnlinked: true };
    fs.rmSync(file, { force: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
```

En `src/preload.js`, añade la línea junto a las demás de cuentas:

```js
  unlinkAccountsSource: () => ipcRenderer.invoke('accounts:unlink-source'),
```

- [ ] **Step 2: Añadir el botón en el HTML**

En `src/index.html`, sustituye el bloque de la ruta vinculada (línea 276) por:

```html
          <div class="accounts-source-row">
            <p id="accountsSourcePath" class="accounts-source-path">Ningún archivo vinculado. Al importar un .txt, el launcher recordará su ruta absoluta y sincronizará futuros cambios.</p>
            <button id="unlinkAccountsButton" class="button button-secondary" type="button" hidden>Desvincular archivo .txt</button>
          </div>
```

- [ ] **Step 3: Estilizar la fila**

En `src/styles.css`, añade:

```css
.accounts-source-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.accounts-source-row .accounts-source-path { flex: 1 1 260px; }
```

- [ ] **Step 4: Cablear el botón en el renderer**

En `src/renderer.js`, inserta este bloque justo después de la función `openAccountsModal` (después de la línea 8606):

```js
const unlinkAccountsButton = document.querySelector('#unlinkAccountsButton');

function renderAccountsSourceRow() {
  accountsSourcePath.textContent = linkedAccountsSource
    ? `Archivo vinculado: ${linkedAccountsSource}. El launcher lo relee cada 15 s y sincroniza los cambios.`
    : 'Ningún archivo vinculado. Al importar un .txt, el launcher recordará su ruta absoluta y sincronizará futuros cambios.';
  unlinkAccountsButton.hidden = !linkedAccountsSource;
}

unlinkAccountsButton?.addEventListener('click', async () => {
  if (!window.confirm('¿Desvincular el archivo .txt?\n\nEl launcher dejará de releerlo. Las cuentas ya importadas se conservan cifradas, pero los cambios futuros en ese archivo ya no se aplicarán.')) return;
  const result = await window.pokeGrid.unlinkAccountsSource();
  if (!result.ok) { setModalMessage(result.error || 'No se pudo desvincular el archivo.'); return; }
  linkedAccountsSource = '';
  renderAccountsSourceRow();
  setModalMessage('Archivo .txt desvinculado. El launcher ya no lo relee.', true);
});
```

Y sustituye los dos bloques que reescriben `accountsSourcePath` (en `openAccountsModal` y en `syncLinkedAccounts`) por llamadas a `renderAccountsSourceRow()`.

- [ ] **Step 5: Escribir la prueba que falla**

Añade al final de `tests/accounts-history-guard-smoke.js`, antes del `console.log`:

```js
    const unlinkState = await window.webContents.executeJavaScript(`(() => ({
      buttonExists: Boolean(document.querySelector('#unlinkAccountsButton')),
      buttonHiddenWithoutSource: document.querySelector('#unlinkAccountsButton')?.hidden !== false
    })()`);

    if (!unlinkState.buttonExists) {
      throw new Error('No existe el boton de desvincular el archivo .txt, que contiene contrasenas en texto plano.');
    }
    if (!unlinkState.buttonHiddenWithoutSource) {
      throw new Error('El boton de desvincular se muestra aunque no haya ningun archivo vinculado.');
    }
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js`
Expected: PASS.

- [ ] **Step 7: Sustituir los textos fijos**

En `src/renderer.js`, inserta junto a `function accountCount()` (línea 283):

```js
function accountCountText() {
  const count = accountCount();
  return `${count} ${count === 1 ? 'cuenta' : 'cuentas'}`;
}
```

Sustituye las tres menciones en el renderer:
- `renderer.js:7678`: `'Leyendo Hunt Analyzer, perfiles y capturas de las cuatro cuentas…'` → `` `Leyendo Hunt Analyzer, perfiles y capturas de ${accountCountText()}…` ``
- `renderer.js:8639`: `'Leyendo y validando las cuatro cuentas…'` → `` `Leyendo y validando ${accountCountText()}…` ``

La tercera mención, en `importAccountsButton` (línea 8653), ya se reescribió en la Tarea 5 con texto dinámico.

En `src/index.html`, sustituye:
- línea 21: `<small>4 sesiones · 1 launcher</small>` → `<small id="brandSessionCount">4 sesiones · 1 launcher</small>`
- línea 110: `<p>Totales combinados y detalle individual de las cuatro cuentas.</p>` → `<p>Totales combinados y detalle individual de <span id="statisticsAccountCount">tus cuentas</span>.</p>`
- línea 183: `<span>El launcher revisa derrotas y capturas de las cuatro cuentas.</span>` → `<span>El launcher revisa derrotas y capturas de <span id="notificationAccountCount">tus cuentas</span>.</span>`

- [ ] **Step 8: Poblarlos al arrancar**

En `src/renderer.js`, inserta este helper junto a `accountCountText`:

```js
function renderDynamicAccountLabels() {
  const text = accountCountText();
  const brand = document.querySelector('#brandSessionCount');
  if (brand) brand.textContent = `${accountCount()} ${accountCount() === 1 ? 'sesión' : 'sesiones'} · 1 launcher`;
  ['#statisticsAccountCount', '#notificationAccountCount'].forEach((selector) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = text;
  });
}
```

Y llámalo en dos sitios: dentro de `refreshPanelNames()` (después de `renderNotifications();`) y al final de `initialize()`, justo antes de `if (!result.ok) {`.

- [ ] **Step 9: Verificar que la prueba visual sigue pasando**

Run: `node_modules\electron\dist\electron.exe tests\launcher-visual-smoke.js`
Expected: PASS. Esta prueba comprueba el texto de la barra superior; si el texto del botón Actualizar cambió por el formatador hoisted (Plan 3, no implementado todavía), no debería verse afectado.

- [ ] **Step 10: Commit**

```bash
git add src/index.html src/main.js src/preload.js src/renderer.js src/styles.css tests/accounts-history-guard-smoke.js
git commit -m "Textos de cuentas dinamicos y boton para desvincular el .txt

Cinco textos seguian diciendo 'las cuatro cuentas' o '4 sesiones' despues de
admitir hasta 32. accountCountText() los deriva del numero real y se refresca
al anadir, eliminar o renombrar cuentas.

El archivo .txt vinculado contiene contrasenas en texto plano y se relee cada
15 segundos para siempre. El boton 'Desvincular archivo .txt' lo olvida; las
cuentas ya importadas se conservan cifradas en accounts.enc."
```

---

## Task 10: Validación de IPC y copia de seguridad de credenciales (S-1, Review Focus #3)

**Files:**
- Create: `src/credentials.js`
- Modify: `src/main.js` (guardas de sender + cableado del módulo nuevo)
- Test: `tests/credentials-backup-smoke.js` (crear)

**Interfaces:**
- Consumes: `normalizeAccounts` de `src/account-model.js`.
- Produces: `src/credentials.js` con dos funciones puras que reciben `fs`, `safeStorage` y `file` por parámetro, de modo que se prueban en Node puro sin arrancar Electron:
  - `readAccountsFile({ file, backupFile, fs, safeStorage, defaults })` → `accounts[]`. Devuelve `defaults` si el fichero no existe. Si el principal no se descifra o no parsea, intenta `backupFile`; si tampoco, deja una copia `file.corrupt` y lanza un `Error` con mensaje en español.
  - `writeAccountsFile({ file, fs, safeStorage, accounts, normalize })` → `true`. Copia el previo a `${file}.bak` antes de renombrar.
- Produces: `assertMainWindowSender(event)` en `main.js` devuelve `true` o lanza. Se aplica a los handlers de cuentas, assets y userscripts de la UI.
- Produces: IPC `accounts:restore-backup` → `{ ok: true, restored: true }` o `{ ok: false, error }`. Preload `restoreAccountsBackup()`.

**Por qué un módulo nuevo.** `main.js` no exporta sus funciones internas, así que la lógica de lectura de credenciales no era comprobable sin arrancar la app entera. Extraerla a `src/credentials.js` con `fs` y `safeStorage` inyectados es el mismo patrón que ya usa `src/account-model.js` (lógica pura, testeable en Node) y es lo que permite que la prueba de este paso sea real en lugar de una simulación.

- [ ] **Step 1: Escribir la prueba que falla**

Crea `tests/credentials-backup-smoke.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { normalizeAccounts } = require('../src/account-model');

let credentials = null;
try {
  credentials = require('../src/credentials');
} catch {
  console.error('No existe src/credentials.js. La logica de credenciales no es testeable todavia.');
  process.exit(1);
}

const { readAccountsFile, writeAccountsFile } = credentials;

// safeStorage falso: "cifra" con una simple inversion de bytes, de modo que un
// fichero corrupto falla al descifrar y uno valido no.
const fakeSafeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(value, 'utf8').map((byte) => 255 - byte),
  decryptString: (buffer) => {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('bloque vacio');
    const plain = Buffer.from(buffer).map((byte) => 255 - byte).toString('utf8');
    if (!plain.trim().startsWith('[')) throw new Error('el bloque descifrado no es una lista JSON');
    return plain;
  }
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-credentials-'));
const file = path.join(dir, 'accounts.enc');
const backupFile = `${file}.bak`;

const accounts = normalizeAccounts([
  { id: 1, label: 'Uno', username: 'uno@ejemplo.test', password: 'secreto1' },
  { id: 2, label: 'Dos', username: 'dos@ejemplo.test', password: 'secreto2' }
]);

// 1. Primer arranque: no hay fichero -> defaults.
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4 }).length, 4,
  'Sin fichero de credenciales deben devolverse las cuentas por defecto.');

// 2. Ida y vuelta fiel.
writeAccountsFile({ file, fs, safeStorage: fakeSafeStorage, accounts, normalize: normalizeAccounts });
const readBack = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4 });
assert.equal(readBack.length, 2);
assert.equal(readBack[0].username, 'uno@ejemplo.test');
assert.equal(readBack[1].password, 'secreto2');
assert.equal(fs.existsSync(backupFile), false, 'El primer guardado no debe crear backup.');

// 3. Segundo guardado: el previo queda como backup.
writeAccountsFile({ file, fs, safeStorage: fakeSafeStorage, accounts: normalizeAccounts([
  { id: 1, label: 'Uno', username: 'uno@ejemplo.test', password: 'secreto1' },
  { id: 2, label: 'Dos', username: 'dos@ejemplo.test', password: 'secreto2' },
  { id: 3, label: 'Tres', username: 'tres@ejemplo.test', password: 'secreto3' }
]), normalize: normalizeAccounts });
assert.equal(fs.existsSync(backupFile), true, 'El segundo guardado debe dejar accounts.enc.bak.');
assert.equal(readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4 }).length, 3);

// 4. El principal corrupto cae al backup.
fs.writeFileSync(file, Buffer.from('no-es-un-bloque-valido'));
const recovered = readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4 });
assert.equal(recovered.length, 2, 'Con el principal corrupto hay que recuperar del backup.');
assert.equal(fs.existsSync(`${file}.corrupt`), true, 'El fichero dañado debe conservarse como .corrupt.');

// 5. Principal y backup ilegibles: error claro, no excepcion opaca.
fs.writeFileSync(file, Buffer.from('roto'));
fs.writeFileSync(backupFile, Buffer.from('tambien roto'));
assert.throws(
  () => readAccountsFile({ file, backupFile, fs, safeStorage: fakeSafeStorage, defaults: 4 }),
  /No se pudieron leer las cuentas guardadas/,
  'Con ambos ficheros ilegibles el error debe ser explicito y en español.'
);

fs.rmSync(dir, { recursive: true, force: true });
console.log('Credentials backup smoke passed: defaults, ida y vuelta, backup, recuperacion y error controlado.');
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `node tests\credentials-backup-smoke.js`
Expected: FAIL con `No existe src/credentials.js. La logica de credenciales no es testeable todavia.` y exit 1.

- [ ] **Step 3: Crear `src/credentials.js`**

Crea `src/credentials.js`:

```js
'use strict';

// Lectura y escritura del fichero de credenciales cifradas.
// fs y safeStorage se reciben por parametro para que este modulo se pruebe en
// Node puro, sin arrancar Electron y sin tocar el perfil real. Es el mismo
// patron que src/account-model.js.

const DEFAULT_ACCOUNTS_ON_FIRST_RUN = 4;

function readAccountsFile({ file, backupFile, fs, safeStorage, defaults = DEFAULT_ACCOUNTS_ON_FIRST_RUN, normalize }) {
  if (!normalize) throw new Error('readAccountsFile necesita la funcion normalize.');
  if (!fs.existsSync(file)) {
    return normalize(Array.from({ length: Math.max(1, Number(defaults) || DEFAULT_ACCOUNTS_ON_FIRST_RUN) }, (_, index) => ({ id: index + 1 })));
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro del sistema no está disponible.');
  }
  const decrypt = (target) => normalize(JSON.parse(safeStorage.decryptString(fs.readFileSync(target))));
  try {
    return decrypt(file);
  } catch (primaryError) {
    // Un accounts.enc corrupto no puede dejar al usuario sin sus cuentas: se
    // intenta el backup y, si tampoco sirve, se conserva el dañado y se lanza
    // un error explicito en lugar de propagar una excepcion opaca.
    const preserve = () => { try { fs.copyFileSync(file, `${file}.corrupt`); } catch {} };
    if (backupFile && fs.existsSync(backupFile)) {
      try { return decrypt(backupFile); } catch {}
    }
    preserve();
    throw new Error(
      `No se pudieron leer las cuentas guardadas (${primaryError.message}). ` +
      'El archivo original se conservó como accounts.enc.corrupt.'
    );
  }
}

function writeAccountsFile({ file, fs, safeStorage, accounts, normalize }) {
  if (!normalize) throw new Error('writeAccountsFile necesita la funcion normalize.');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('El cifrado seguro del sistema no está disponible. No se guardó ninguna contraseña.');
  }
  const temporary = `${file}.tmp`;
  const backup = `${file}.bak`;
  // El contenido previo se copia al backup antes de sustituirlo. Sin esto, un
  // fichero corrupto al escribir deja al usuario sin ninguna de sus cuentas.
  if (fs.existsSync(file)) {
    try {
      fs.copyFileSync(file, `${backup}.tmp`);
      fs.renameSync(`${backup}.tmp`, backup);
    } catch {}
  }
  const encrypted = safeStorage.encryptString(JSON.stringify(normalize(accounts)));
  fs.mkdirSync(require('node:path').dirname(file), { recursive: true });
  fs.writeFileSync(temporary, encrypted);
  fs.renameSync(temporary, file);
  return true;
}

module.exports = { DEFAULT_ACCOUNTS_ON_FIRST_RUN, readAccountsFile, writeAccountsFile };
```

- [ ] **Step 4: Verificar que pasa**

Run: `node tests\credentials-backup-smoke.js`
Expected: PASS con `Credentials backup smoke passed: defaults, ida y vuelta, backup, recuperacion y error controlado.`

- [ ] **Step 5: Cablear `main.js` al módulo nuevo**

En `src/main.js`, añade el import junto a los demás (después de la línea 10):

```js
const { readAccountsFile, writeAccountsFile } = require('./credentials');
```

Sustituye `readAccounts` (líneas 157-167) por:

```js
function accountsBackupPath() {
  return `${credentialPath()}.bak`;
}

function readAccounts() {
  return readAccountsFile({
    file: credentialPath(),
    backupFile: accountsBackupPath(),
    fs,
    safeStorage,
    defaults: DEFAULT_ACCOUNT_COUNT,
    normalize: normalizeAccounts
  });
}
```

Sustituye `writeAccounts` (líneas 169-181) por:

```js
function writeAccounts(accounts) {
  return writeAccountsFile({
    file: credentialPath(),
    fs,
    safeStorage,
    accounts,
    normalize: normalizeAccounts
  });
}
```

- [ ] **Step 6: Añadir el handler de restauración**

En `src/main.js`, junto al handler `accounts:unlink-source` que se añadió en la Tarea 9:

```js
ipcMain.handle('accounts:restore-backup', (event) => {
  assertMainWindowSender(event);
  try {
    const file = credentialPath();
    const backup = accountsBackupPath();
    if (!fs.existsSync(backup)) return { ok: false, error: 'No hay copia de seguridad de las cuentas.' };
    if (!fs.existsSync(file)) {
      fs.copyFileSync(backup, file);
      return { ok: true, restored: true };
    }
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'El cifrado seguro no está disponible.' };
    try {
      JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));
      return { ok: false, error: 'Las cuentas actuales se leen bien. No hay nada que restaurar.' };
    } catch {}
    fs.copyFileSync(file, `${file}.corrupt`);
    fs.copyFileSync(backup, file);
    return { ok: true, restored: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
```

En `src/preload.js`:

```js
  restoreAccountsBackup: () => ipcRenderer.invoke('accounts:restore-backup'),
```

- [ ] **Step 7: Añadir el guard de sender a los handlers**

En `src/main.js`, inserta este helper justo después de `function openExternal(` (después de la línea 96):

```js
function assertMainWindowSender(event) {
  if (!mainWindow || mainWindow.isDestroyed() || event.sender !== mainWindow.webContents) {
    throw new Error('Solicitud no autorizada: el emisor no es la ventana principal del launcher.');
  }
  return true;
}
```

Aplícalo a los handlers de cuentas y assets. Para cada uno, cambia la firma y añade la primera línea:

```js
ipcMain.handle('accounts:load', (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:save', async (event, accounts) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:sync-source', (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:download-template', async (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:import-file', async (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:unlink-source', (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('accounts:restore-backup', (event) => {
  assertMainWindowSender(event);
  ...
```

```js
ipcMain.handle('assets:image-data-url', (event, url) => {
  assertMainWindowSender(event);
  return loadAllowedImageDataUrl(url);
});
```

```js
ipcMain.handle('assets:pokemon-species', (event, slug) => {
  assertMainWindowSender(event);
  return resolvePokeApiSpecies(slug);
});
```

**No** lo apliques a `userscripts:request`, `userscripts:shared-get`, `userscripts:shared-set` ni `userscripts:shared-delete`: esos los invocan los webviews del juego a través de `guest-preload.js` y ya se autorizan con `authorizeUserScriptRuntime` (origen + partición + script habilitado). Añadir el guard ahí rompería el puente GM.

**Sí** aplícalo a los de la UI de scripts, que solo llama el renderer principal: `userscripts:list`, `userscripts:validate-syntax`, `userscripts:save`, `userscripts:delete`, `userscripts:import-file`, `userscripts:export-file`, `userscripts:bundled-telegram`, `userscripts:fetch-url`, `userscripts:shop-catalog`, `userscripts:shop-install`, `userscripts:shop-uninstall`, `userscripts:guest-preload`, `extensions:pick-folder`, `extensions:status` y `extensions:apply`. Cada uno empieza por `assertMainWindowSender(event);`.

**No** lo apliques a `app:cleanup-memory`: lo invoca el renderer principal pero no hace daño que un guest pueda explotar, y su firma actual no recibe argumentos que proteger.

- [ ] **Step 8: Añadir el botón de restaurar al modal**

En `src/index.html`, sustituye el bloque de la ruta vinculada (el que en la Tarea 9 quedó como `.accounts-source-row`) por la versión con los dos botones:

```html
          <div class="accounts-source-row">
            <p id="accountsSourcePath" class="accounts-source-path">Ningún archivo vinculado. Al importar un .txt, el launcher recordará su ruta absoluta y sincronizará futuros cambios.</p>
            <span class="accounts-source-actions">
              <button id="unlinkAccountsButton" class="button button-secondary" type="button" hidden>Desvincular archivo .txt</button>
              <button id="restoreAccountsButton" class="button button-secondary" type="button" hidden>Restaurar copia anterior</button>
            </span>
          </div>
```

En `src/styles.css`, sustituye el bloque `.accounts-source-row` que añadiste en la Tarea 9 por:

```css
.accounts-source-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
}
.accounts-source-row .accounts-source-path { flex: 1 1 260px; }
.accounts-source-actions { display: flex; gap: 6px; flex-wrap: wrap; }
```

En `src/renderer.js`, añade el segundo handler junto al de la Tarea 9:

```js
const restoreAccountsButton = document.querySelector('#restoreAccountsButton');

restoreAccountsButton?.addEventListener('click', async () => {
  restoreAccountsButton.disabled = true;
  try {
    const result = await window.pokeGrid.restoreAccountsBackup();
    if (!result.ok) { setModalMessage(result.error || 'No se pudo restaurar la copia.'); return; }
    const loaded = await window.pokeGrid.loadAccounts();
    accounts = normalizeAccounts(loaded.accounts);
    fillAccountForm(accounts);
    rebuildGamePanels();
    setModalMessage(`Copia anterior restaurada: ${accountCountText()}.`, true);
  } catch (error) {
    setModalMessage(error.message || 'No se pudo restaurar la copia.');
  } finally {
    restoreAccountsButton.disabled = false;
  }
});
```

- [ ] **Step 9: Verificar que pasa**

Run: `node tests\credentials-backup-smoke.js && node_modules\electron\dist\electron.exe tests\accounts-history-guard-smoke.js && node_modules\electron\dist\electron.exe tests\accounts-modal-smoke.js && node_modules\electron\dist\electron.exe tests\dynamic-accounts-proxy-smoke.js`
Expected: los cuatro PASS. El último es la prueba clave: `dynamic-accounts-proxy-smoke` es la única que verifica la aplicación real del proxy contra un servidor de sonda, así que confirma que los guards de sender no la rompieron.

- [ ] **Step 10: Ejecutar la suite completa**

Run: `pnpm check && pnpm test && pnpm test:e2e`
Expected: todo verde.

- [ ] **Step 11: Commit**

```bash
git add src/credentials.js src/main.js src/preload.js src/renderer.js src/index.html src/styles.css tests/credentials-backup-smoke.js
git commit -m "Copia de seguridad de credenciales y validacion del emisor en IPC

writeAccounts era atomico pero no guardaba copia: un accounts.enc corrupto
significaba perder las 32 cuentas y sus contrasenas de golpe. La logica se extrae
a src/credentials.js, con fs y safeStorage inyectados igual que account-model.js,
para poder probarla en Node puro. Ahora el anterior se copia a accounts.enc.bak
antes de sustituirlo, la lectura cae al backup si el principal no descifra,
conserva el danado como accounts.enc.corrupt y el modal ofrece 'Restaurar copia
anterior'.

Solo 3 de 30 handlers IPC comprobaban que el emisor fuese la ventana principal.
assertMainWindowSender se aplica a cuentas, assets y la UI de scripts. Los
handlers userscripts:request y shared-* quedan fuera a proposito: los invocan
los webviews del juego y ya se autorizan por origen, particion y script
habilitado."
```

---

## Task 11: Documentación y cierre del plan

**Files:**
- Modify: `README.md`
- Modify: `docs/FUNCIONES.md`
- Modify: `SECURITY.md`
- Create: `docs/RECOMENDACIONES-SMART-SCREEN.md`

**Interfaces:**
- Consumes: nada de código.
- Produces: documentación coherente con el comportamiento nuevo.

- [ ] **Step 1: Actualizar `README.md`**

En la sección "Privacidad y seguridad", añade:

```markdown
### Aviso de Windows (SmartScreen)

El ejecutable del launcher no está firmado con un certificado comercial, así que
Windows SmartScreen puede mostrar "Windows ha protegido su PC" la primera vez
que lo abres en un equipo nuevo. Es el comportamiento normal de cualquier
aplicación portable sin firmar.

**Qué hacer:** pulsa **Más información** y luego **Ejecutar de todas formas**.
El aviso no aparece en las actualizaciones posteriores.

**Verificar la integridad antes de ejecutar:** descarga también el archivo
`IDLE-POKE-LAUNCHER-x.y.z-portatil.zip.sha256` de la misma Release y compara el
hash con el del ZIP. El launcher verifica ese hash automáticamente antes de
descomprimir nada.
```

Y añade a la sección "Desarrollo" el comando nuevo:

```markdown
Verificar que nada se rompió:

```powershell
pnpm check
pnpm test      # suites de Node, rápido
pnpm test:e2e  # suites de Electron
pnpm test:all  # ambas
```
```

- [ ] **Step 2: Actualizar `docs/FUNCIONES.md`**

En la sección "Administración de cuentas", sustituye el cuarto punto de "Añadir, eliminar y reordenar cuentas" por:

```markdown
- Al eliminar una cuenta, el launcher pide confirmación y avisa de que el historial de esa posición (Capture Log, metas, notificaciones) pasará a la cuenta que ocupe ese lugar. Eliminar una cuenta intermedia **reasigna el historial**: el registro de la posición desplazada queda ligado a otra cuenta, así que tenlo en cuenta antes de borrar.
- Al cambiar el proxy de una cuenta que ya está cargada, el launcher recarga solo esa sesión: las conexiones ya abiertas seguirían saliendo por la IP anterior.
- La barra del panel muestra una etiqueta **VPN** mientras la cuenta usa proxy, con el protocolo y el destino en el tooltip.
```

- [ ] **Step 3: Actualizar `SECURITY.md`**

Sustituye el párrafo de reporte por:

```markdown
No publiques contraseñas, tokens, archivos de cuentas ni datos de sesión en Issues.

Para reportar una vulnerabilidad, usa **Security → Report a vulnerability** en
la pestaña Security del repositorio, que abre un canal privado. Si esa opción
no está disponible, abre un Issue sin información sensible y solicita un canal
privado de contacto. Incluye versión, sistema operativo y pasos mínimos para
reproducir el problema.
```

- [ ] **Step 4: Crear `docs/RECOMENDACIONES-SMART-SCREEN.md`**

Crea el fichero con el contenido de la sección del paso 1, más esta nota de mantenimiento:

```markdown
> **Nota para quien mantenga el proyecto.** Firmar el ejecutable elimina este
> aviso y reduce los falsos positivos del antivirus. Requiere un certificado de
> firma de código (Organization Validation, ≈100–200 USD/año) y dos secretos en
> GitHub (`CSC_LINK`, `CSC_KEY_PASSWORD`). El punto de cambio está en
> `package.json` → `build.win`: poner `signAndEditExecutable: true` y
> `signtoolOptions: { certificateSubjectName: "..." }`. Hasta entonces, las
> mitigaciones de este documento son las únicas disponibles.
```

- [ ] **Step 5: Verificar que no queda ninguna mención a "cuatro cuentas"**

Run: `Select-String -Path src\*.js, src\*.html, docs\*.md, README.md -Pattern 'cuatro cuentas|4 sesiones'`
Expected: sin resultados. Si aparece alguna, es un texto que este plan no cubrió: anótala y corrígela antes del commit.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/FUNCIONES.md SECURITY.md docs/RECOMENDACIONES-SMART-SCREEN.md
git commit -m "Documentar el aviso de SmartScreen, la confirmacion de borrado y el cambio de proxy

El ejecutable sigue sin firmar, asi que documenta que hacer ante el aviso de
Windows y como verificar el hash del ZIP antes de ejecutarlo. Tambien se
explica en SECURITY.md como usar el reporte privado de vulnerabilidades."
```

- [ ] **Step 7: Publicar**

```bash
node -e "const p=require('./package.json');console.log(p.version)"
```

Sube el valor a `0.23.1`, commit, tag y push:

```bash
git add package.json
git commit -m "Publicar 0.23.1 - Correcciones funcionales y verificacion reproducible"
git tag v0.23.1
git push origin main --tags
```

---

## Cierre del Plan 1

Tras la Tarea 11, el estado esperado es:

- [ ] `pnpm check` verde con los 9 ficheros de `src/` y los 2 de `scripts/`.
- [ ] `pnpm test` y `pnpm test:e2e` verdes.
- [ ] `app.asar` sin cambios de tamaño (este plan no toca assets).
- [ ] `renderer.js` aproximadamente 9.590 líneas (crece por los helpers nuevos).
- [ ] Sin ninguna mención a "cuatro cuentas".
- [ ] `accounts.enc.bak` presente tras el primer guardado.
- [ ] Un script de la Shop recién instalado se inyecta en la cuenta 1.
- [ ] Un script con 4 flags se inyecta en la cuenta 12.
- [ ] Cambiar el proxy de una cuenta recarga su webview.
- [ ] Escape en la barra de buscar no cierra el modal.
- [ ] Borrar una cuenta pide confirmación nombrando a quién pasa el historial.

**Los cuatro planes restantes:**

| Plan | Fases | Tareas estimadas | Riesgo |
|---|---|---|---|
| **Plan 2** — Cuellos de botella críticos | 2 y 3 | 12 | Medio |
| **Plan 3** — Rendimiento del renderer | 4 | 10 | Medio |
| **Plan 4** — Actualizador en Node | 5 | 14 | **Alto** |
| **Plan 5** — Código muerto y build | 6 | 14 | Medio |
