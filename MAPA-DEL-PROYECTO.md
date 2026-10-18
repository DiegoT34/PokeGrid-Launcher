# Mapa del proyecto — IDLE POKE LAUNCHER

Este documento es **el mapa del repositorio**. Está aquí para que cualquier trabajo posterior sepa
dónde va cada cosa sin tener que recorrer el árbol entero primero, y sobre todo para saber **qué se
puede tocar y qué no**.

---

## La regla de oro, y por qué existe

> **El launcher solo lee de `src/`. Todo lo demás es andamiaje.**

El proceso principal (`src/main.js`) decide qué ficheros entran en el paquete usando la lista `files`
de `package.json`. Si algo no está en esa lista, **no viaja**. Un fichero puesto en el sitio
equivocado no falla: simplemente no se ve, y el síntoma es una pantalla vacía o un botón que no hace
nada, dos horas después.

Por eso `src/` no se reorganiza. Mover un fichero de ahí obliga a tocar su `require()` **y** el
`<script src>` del HTML **y** la lista de `files`, y son tres sitios que se olvidan con una facilidad
desagradable.

---

## Las carpetas

### `src/` — **el launcher**. Nada de esto se mueve.

| Fichero | Qué es |
|---|---|
| `main.js` | Proceso principal: ventanas, sesiones, IPC, particiones. ~2.400 líneas |
| `renderer.js` | Toda la interfaz: barra, instancias, paneles del juego, modales. ~12.000 líneas |
| `preload.js` | Puente del launcher hacia el proceso principal |
| `guest-preload.js` | Puente de los webviews del juego |
| `pokepedia-preload.js` | Puente de la ventana de Pokepedia |
| `instancia-rueda-preload.js` | Solo el Ctrl+rueda dentro de una instancia |
| `game-theme.js` | El tema que se inyecta dentro de la página del juego |
| `userscripts.js` | Gestor de los scripts de usuario (instalar, editar, activar) |
| `userScriptNetwork.js` | Puente de red de los scripts |
| `script-shop-*.js` | El catálogo de la Script Shop: datos, vista, capturas |
| `account-model.js`, `account-transfer.js`, `credentials.js`, `updater.js` | Módulos puros del proceso principal |
| `iconos-comunes.js` | Reglas de icono **ejecutables**: hay una prueba que las corre, no las lee |
| `index.html`, `styles.css` | La superficie y su aspecto |
| `assets/` | Imágenes del launcher |

**Los iconos SVG viven en `LAUNCHER_ICON_PATHS`**, dentro de `renderer.js`. Trazo de 1,9 sobre lienzo
24×24, `stroke: currentColor`. Cuando haya que añadir uno: ahí, y **nunca** un emoji.

### `tests/` - las pruebas. Una por pantalla, o una por cosa que atraviesa varias.

Se lanzan con `tests/lanzar.cjs <guion>`, porque `electron.exe` no escribe en la consola de quien lo
llama y `spawnSync` no vale.

| Prefijo | Qué cubren |
|---|---|
| `instancia-*` | Todo lo de las instancias de navegador y las cuentas |
| `descanso`, `sondeos-visibles` | Que duerma lo que no se mira y los sondeos solo con su pantalla a la vista |
| `cuentas-pestanas` | El modo rejilla / pestañas de las cuentas del juego |
| `cuentas-iconos-0340` | Reordenado de pestañas, iconos SVG y cero brillos (0.34.0) |
| `ipc-sender-guard` | Que cada canal IPC tenga su comprobación de emisor |
| `*-smoke.js` | El resto, por pantalla |

### `herramientas/` — los guiones de este repositorio. **Fuera del paquete.**

Aquí vive todo lo que sirve para mirar y comprobar, pero que **no forma parte del launcher**:

- `area-entera.ps1` — **la puerta de entrada.** Corre las pruebas del área en orden. Si no sale verde,
  no se compila.
- `verificar-paquete.cjs` — comprueba el `asar` de dentro del artefacto.
- `comprobar-entrega.cjs` — comprueba lo que se abre de un doble clic.
- `comprobar-patrones.cjs` — comprueba invariantes contra el código, sin esperar a compilar.
- `buscar-plantilla-rota.cjs` — plantillas inyectadas sin cerrar.
- `mirar-codificacion.cjs`, `arreglar-codificacion.cjs` — la trampa de la doble codificación.
- `medir-*.cjs`, `medir-*.ps1`, `informe-procesos.cjs`, `leer-instancias.cjs` — medición de memoria.
- `preparar-carpeta-portatil.cjs` — deja la carpeta con el `.exe` junto a lo que se acaba de compilar.
- `PokeGrid-Shop-Publisher.ps1` — publica el catálogo de la Script Shop en GitHub.

**Todos usan la raíz del proyecto a través de `path.join(__dirname, '..')`.** Si añades uno, igual:
`__dirname` es la carpeta de herramientas, no el proyecto.

### `_basura/` — lo que sobra. **No se borra, no se versiona.**

Con una subcarpeta por fecha. Aquí van las capturas viejas, las propuestas que se parchearon, los
guiones de un solo uso y las carpetas de compilación. Si algún día hace falta algo de aquí, se saca.

Nunca se borra nada de golpe: mover es reversible y borrar no lo es.

### `docs/` — documentación que se mantiene. `docs/superpowers/` guarda los planes viejos.

### `.superpowers/` — el registro de trabajo. **No se versiona.**

### `build/`, `dist/`, `node_modules/` — lo genera la compilación. No se tocan a mano.

---

## Dónde va cada cosa nueva

| Si añades… | Va en… |
|---|---|
| Una pantalla o un botón del launcher | `src/renderer.js` + `src/index.html` + `src/styles.css` |
| Un icono | `LAUNCHER_ICON_PATHS`, en `src/renderer.js`. Nunca un emoji |
| Un canal IPC | `src/main.js` + `src/preload.js` **y** la lista del guardia en `tests/ipc-sender-guard-smoke.js` |
| Un módulo del proceso principal | `src/`, como los que ya hay, e importarlo desde `main.js` |
| Una prueba | `tests/`, y añadirla a `herramientas/area-entera.ps1` en su sitio del orden |
| Un guion de comprobación o medición | `herramientas/` |
| Una nota de versión | `REGISTRO.md`, al principio, con qué cambió y **por qué** |
| Un icono o una regla de icono | `src/iconos-comunes.js`, que tiene una prueba que la **ejecuta** |
| Una captura o una propuesta vieja | `_basura/<fecha>/` |

---

## Lo que no se toca, y por qué

- **`src/`** — por `package.json` y su lista `build.files`. Mover un fichero de aquí es romper el paquete en
  silencio.
- **La marca de la pestaña activa** (`.instance-tab-shell.is-active`) — su `box-shadow` **no** es un
  brillo: es lo único que dice dónde estás. Los brillos de `hover` sí se quitan.
- **El aviso escrito en `app:cleanup-memory`** — no se adjunta el depurador ni se fuerza el GC de
  Chromium porque pueden dejar la ventana en negro. Ya se ha visto pasar.
- **`clearStorageData`** en la limpieza de RAM — cerraría la sesión y perderías el inicio de sesión de
  las cuentas. Se usa `clearCache`, que no toca cookies.
- **Las 16 pruebas del área** — o pasan todas, o no se compila. No se saltan.

---

## Las tres trampas de este repositorio

1. **Los acentos graves dentro de una plantilla inyectada.** Rompen el código *que se ejecuta*, no el
   que se lee, y `node --check` a veces ni se entera. Ha pasado siete veces.
2. **La codificación doble en ficheros nuevos.** `write` puede producir UTF-8 doble y con BOM. Se ve
   con `mirar-codificacion.cjs`.
3. **Una invariante que mira un artefacto viejo.** Si un verificador se ejecuta antes de compilar, da
   verde con lo de la entrega anterior. Las comprobaciones del artefacto van **después** de
   `npm run dist`, nunca antes.