# Contadores y avisos del launcher — Diseño

**Fecha:** 2026-09-30
**Proyecto:** 1 de 4 de la ampliación de interfaz
**Alcance:** puntos 2, 4 y 5 de la petición del usuario, más las reglas de recuento y orden que reutilizará el proyecto 2.

---

## 1. Objetivo

Hoy el launcher no avisa de nada por su cuenta. El usuario tiene que abrir la Shop para enterarse de que un script suyo tiene versión nueva, y tiene que pulsar "Buscar actualizaciones" para enterarse de que hay una versión nueva del launcher. Ninguna de las dos cosas se anuncia.

Este proyecto introduce **un sistema de avisos con una fuente de verdad**, y con él:

- Una **bolita de color por origen** en el botón de 3 rayas, hasta tres, sin números.
- **Detección de actualizaciones del launcher en segundo plano**, sin que el usuario haga nada.
- **Cada contador con el color de su origen**, para poder distinguirlos de un vistazo.

### 1.1 Qué problema real resuelve

No es un añadido estético. El problema de fondo es que **el mismo número se pinta tres veces**:

| Elemento | Dónde | Cómo se pinta |
|---|---|---|
| `#hamburgerScriptBadge` | `index.html:15` | `setMenuBadge` (`userscripts.js:605`) |
| `#scriptsMenuBadge` | `index.html:39` | `setMenuBadge` (`userscripts.js:604`) |
| `#scriptShopUpdateBadge` | `index.html:317` | **a mano** (`userscripts.js:602-603`) |

Los tres muestran `updates + newScripts`. Dos pasan por el helper y el tercero está escrito a mano, así que hoy el mismo dato vive en dos sitios del código con dos colores distintos (rojo `#ff534d` para dos, ámbar `#e6b940` para el tercero). Añadir dos fuentes más a mano serían cuatro copias. Un registro lo arregla una vez.

---

## 2. Decisiones ya tomadas

Estas son decisiones del usuario, tomadas antes de escribir este documento. No se reabren aquí.

| # | Decisión |
|---|---|
| D1 | El botón de 3 rayas muestra **hasta tres bolitas de colores**, no un número. |
| D2 | La comprobación de actualizaciones se hace **al arrancar y cada 6 horas** mientras el launcher esté abierto. |
| D3 | Los avisos de contenido se apagan **al entrar** a verlos. El de actualización **solo se apaga al instalar**. |
| D4 | Orden de la Shop: **destacados primero y, dentro de cada grupo, por fecha** de la más reciente a la más antigua. |

D3 implica que la bolita de actualización **no se apaga al mirar**. Si se apagara, el usuario podría perder la única vez que ve que tiene algo pendiente. Es deliberado.

---

## 3. Lo que existe hoy (verificado)

### 3.1 Badges actuales

| id | Qué cuenta | Dónde se calcula | Color |
|---|---|---|---|
| `#hamburgerScriptBadge` | `updates + newScripts` de la Shop | `userscripts.js:605` | `#ff534d` (`styles.css:442-459`) |
| `#scriptsMenuBadge` | el mismo número | `userscripts.js:604` | `#ff534d` (`.is-scripts`, `styles.css:460`) |
| `#scriptShopUpdateBadge` | el mismo número | `userscripts.js:602-603`, a mano | `#e6b940` (`styles.css:2138-2148`) |
| `#notificationBadge` | notificaciones no leídas (`!notification.read`) | `renderer.js:1393-1396` | `#ff4d52` (`styles.css:315-329`) |

`setMenuBadge` (`userscripts.js:577-583`) ya hace lo que necesita un badge: texto, `hidden` cuando vale 0, `title` y `aria-label`.

`updateScriptShopBadge` (`userscripts.js:596-607`) se invoca **solo** desde `renderScriptShop` (`:616`). No tiene actualización propia: si no se re-renderiza la Shop, los badges quedan como estaban.

### 3.2 El botón de 3 rayas

`#topbarToggle` (`index.html:13`), con tres `<i>` dentro de un `span.hamburger-icon` (`:14`). **Ya tiene badge** (`#hamburgerScriptBadge`), hoy acoplado a la Shop.

### 3.3 Actualizaciones del launcher

- `app:check-update` (`main.js:1619-1644`) es **destructivo**: descarga, instala, borra la versión anterior y programa `app.exit(0)` a 800 ms (`:1636-1640`).
- Se invoca **únicamente** desde el clic del usuario (`renderer.js:9640-9670`, única llamada a `checkForUpdates` en `:9645`).
- **No hay ninguna comprobación en segundo plano.** Ni al arrancar, ni en `focus`, ni en `online`, ni en ningún `setInterval`.

Este dato es la razón de que exista el canal nuevo de la sección 5.

### 3.4 Catálogo de la Shop

- Remoto, con caché de 5 min en main (`SCRIPT_SHOP_CACHE_MS`) y sondeo de 5 min en el renderer (`userscripts.js:110`).
- `normalizeScriptShopCatalog` (`main.js:850-894`) es una lista blanca. Trae, entre otros, **`publishedAt` (`:886`)** y **`featured`**.
- **`publishedAt` y `homepage` están muertos**: se descargan, se normalizan y no los usa nadie.
- Hoy el orden es **destacados primero y luego alfabético**, hecho en main antes de enviar nada (`main.js:892`). Consecuencia de D4: hay que tocar ese punto.
- Tope de 200 entradas (`main.js:855`).

### 3.5 Paleta de marca

Ya existen y se reutilizan, no se inventan colores:

| Token | Valor | `styles.css` |
|---|---|---|
| `--warning` | `#ffc857` | `:12` |
| `--danger` | `#ff6678` | `:13` |
| `--success` | `#4be08a` | `:11` |

### 3.6 Carga de módulos

`index.html:665-667`, en este orden y como `<script>` planos, sin módulos:

```html
<script src="game-theme.js"></script>
<script src="userscripts.js"></script>
<script src="renderer.js"></script>
```

`userscripts.js` e `renderer.js` son IIFE distintas y **no comparten ámbito**. Un módulo compartido tiene que ser un tercer `<script>` cargado antes que ambos.

---

## 4. Arquitectura: el registro de avisos

### 4.1 Qué es

Un fichero nuevo, `src/notification-hub.js`, cargado como `<script>` **antes** de `userscripts.js` y `renderer.js`, que expone `window.pokeGridNotifications`.

Se eligió un módulo compartido y no dejarlo dentro de `renderer.js` porque `renderer.js` tiene ~9.700 líneas y es el monolito que el Plan 1 lleva tiempo reduciendo; añadirle un tercer sistema de estado global va en dirección contraria. Y no se eligió hacerlo dentro de `userscripts.js` porque la Shop no debe ser la dueña de los avisos de actualizaciones del launcher.

### 4.2 Modelo

Una **fuente de aviso** es un objeto fijo, declarado en un solo sitio:

```js
const AVISOS = Object.freeze([
  { id: 'scripts',        color: 'var(--warning)', titulo: 'Shop de scripts' },
  { id: 'notifications', color: 'var(--danger)',  titulo: 'Notificaciones' },
  { id: 'updater',       color: 'var(--success)', titulo: 'Actualizaciones del launcher' }
]);
```

El orden del array es el orden en que se pintan las bolitas, y es fijo para que nunca salte de sitio.

El hub mantiene, por fuente: el **recuento**, y si está **vista** o **pendiente**. Expone cuatro operaciones y nada más:

| Operación | Qué hace |
|---|---|
| `set(id, count)` | Una fuente publica su recuento. Actualiza **el badge propio de esa fuente** y la bolita del 3 rayas. `0` los oculta. |
| `seen(id)` | El usuario ha mirado esa fuente. Para contenido limpia la bolita; **para `updater` no hace nada** (D3). |
| `dibujar()` | Repinta las bolitas del botón de 3 rayas. |
| `alCambiar(fn)` | Permite que quien tenga contadores propios se repinte al cambiar el hub. |

`dibujar()` se invoca desde `set()` y `seen()`. No hay que acordarse de llamarlo.

**El hub es el dueño de todos los badges de sus fuentes**, incluido el de cada botón, no solo las bolitas del 3 rayas. El elemento de cada fuente va declarado en `AVISOS`, junto a su color. Así `set('scripts', 3)` actualiza a la vez `#scriptsMenuBadge` y la bolita del menú, y nadie tiene que acordarse de llamar a dos sitios: esa es justamente la duplicación que este proyecto elimina (§1.1).

### 4.3 Por qué un registro y no retoques

Se evaluaron tres caminos:

- **Registro central (elegido).** Una fuente de verdad. Añadir una cuarta fuente el futuro son cuatro líneas y una entrada en el array.
- **Todo dentro de `renderer.js`.** Menos ficheros, pero suma estado global al monolito y acopla la Shop al renderer.
- **Solo retoques de CSS y markup.** Lo más rápido, pero deja las cuatro copias del mismo número y habría que repetir el patrón a mano dos veces más.

### 4.4 El botón de 3 rayas

Lleva **tres `<i>` siempre en el DOM**, uno por fuente, en el orden del array. Cada uno se muestra con el color de su fuente si esa fuente tiene algo pendiente, y se oculta si no.

No hay número en ningún caso. Con dos fuentes pendientes se ven dos bolitas; no se suman. El motivo de que no sume es que un `3` no dice *qué* hay pendiente: con bolitas de colores se ve si es la tienda, si son avisos del juego, o si hay versión nueva.

---

## 5. Detección de actualizaciones del launcher

### 5.1 El problema

`app:check-update` no comprueba: **instala**. Descarga el ZIP, lo descomprime, hace el intercambio de ficheros, borra la versión anterior y programa `app.exit(0)` (`main.js:1636-1640`). Si se usara para un sondeo en segundo plano, **el launcher se cerraría solo cada 6 horas**.

### 5.2 El canal nuevo

Se añade un canal **de solo lectura**, sin descargar ni escribir nada:

```
app:peek-update  →  { ok, hayActualizacion, actual, masReciente, error }
```

Reutiliza la comparación de versiones que ya existe (`normalizeVersion` / `compareVersions` en `updater.js:25-38`), pero **no** llama a `prepareUpdate` ni a `launchPreparedUpdate`.

### 5.3 El ritmo

| Momento | Qué hace |
|---|---|
| Al arrancar el launcher | Una comprobación |
| Después | Una cada 6 horas, mientras esté abierto |
| Al pulsar "Buscar actualizaciones" | **Pregunta antes de instalar** |

El tercer punto es una mejora que sale del diseño: hoy el botón instala sin preguntar. Con el canal nuevo, al pulsarlo se comprueba y, si hay algo, se pide confirmación antes de descargar.

### 5.4 Cuando no hay red

Si la comprobación falla, **la bolita no debe apagarse**. Se guarda la última versión pendiente conocida en `localStorage`, con una clave nueva del mismo estilo que la que ya usa la Shop (`pokegrid:script-shop-seen:v1`, `userscripts.js:109`), por ejemplo `pokegrid:launcher-update-pending:v1`.

Con eso, arrancar sin conexión sigue enseñando la versión pendiente que se sabía antes. Al reinstalar o desinstalar desde la propia aplicación, la clave se borra.

### 5.5 La bolita no se apaga hasta instalar

`seen('updater')` no hace nada (D3). La fuente `updater` se pone a cero **únicamente** cuando la actualización termina de instalarse con éxito, que es donde hoy `main.js:1644` ya devuelve `status: 'installing'` y `latestVersion`.

---

## 6. Contadores en los botones

| Botón | Elemento | Color | Fuente |
|---|---|---|---|
| Scripts | `#scriptsMenuBadge` (existe) | `--warning` ámbar | `scripts` |
| Notificaciones | `#notificationBadge` (existe) | `--danger` rojo | `notifications` |
| Actualizador | **nuevo**, sobre `#updateLauncherButton` | `--success` verde | `updater` |

Los dos primeros solo cambian de color. Los tres se alimentan del hub, con lo que el número de la Shop deja de estar escrito tres veces: ahora `userscripts.js:596-607` publica **un** recuento y el hub reparte a los tres destinos que lo necesiten.

---

## 7. Reglas de recuento y orden (compartidas con el proyecto 2)

La pestaña "Actualizaciones" es del **proyecto 2**. Lo que se fija aquí son las reglas, para que ambas piezas no se contradigan y para que el proyecto 2 no tenga que reinventarlas.

### 7.1 Qué cuenta como "para actualizar"

Un script **ya instalado** cuya versión del catálogo es mayor. Es decir, `scriptShopState(item).key === 'update'` (`userscripts.js:585-594`). Nada más entra.

Un script nuevo que no está instalado **no** cuenta aquí: eso es "nuevo", y es un estado distinto que ya se calcula aparte (`newScripts`, `userscripts.js:567-575`) y que no se mezcla.

### 7.2 Orden

**Destacados primero y, dentro de cada grupo, por fecha de la más reciente a la más antigua** (D4).

Cambia el punto actual de `main.js:892`, que ordena destacados y luego alfabéticamente.

La fecha sale de **`publishedAt`**, que el catálogo **ya trae y el launcher ya normaliza** (`main.js:886`) y que **hoy no usa nadie**. No hace falta tocar el catálogo ni la herramienta publicadora para esta feature.

- Si una entrada no trae `publishedAt`, se trata como la más antigua.
- La fecha se interpreta en UTC, que es como la publica el catálogo (`2026-09-25T11:48:47Z`).
- Con el orden dentro de cada grupo, `featured` deja de ser una prioridad absoluta y pasa a ordenar por grupo. La etiqueta dorada se conserva.

---

## 8. Fuera de alcance

Cosas que se han deemed fuera de este proyecto, y por qué:

- **La pestaña "Actualizaciones" en sí.** Es el punto 1 del usuario y es del proyecto 2. Aquí solo se fijan sus reglas de recuento y orden (§7).
- **El buscador por nombre y el filtro por categoría** (punto 3). Proyecto 2. Nota para el proyecto 2: la búsqueda por texto ya existe (`userscripts.js:626-629`) y **rehace todas las tarjetas en cada tecla, sin debounce** (listener en `:1521`), con un techo de 200 tarjetas.
- **La vista de lista y la de tarjeta con foto** (punto 6). Proyecto 3. Dato relevante: el CSP del launcher es `img-src 'self' data: https://poke.idleworld.online https://pokepguides.com` (`index.html:6`), así que **una imagen remota desde GitHub Raw queda bloqueada**. El catálogo tampoco tiene campo de imagen: `icon` es un emoji cortado a 8 caracteres (`main.js:884`).
- **El panel de detalle de un script y los favoritos** (punto 7). Proyecto 3. Hoy no existe nada de favoritos, confirmado.
- **El rediseño de Capture Log y Hunt Analyzer.** Proyecto 4.
- **La herramienta publicadora.** Es otro repositorio (`DiegoT34/PokeGrid-Script-Shop`). Se hará su propia especificación al final.

---

## 9. Cómo se prueba

El repo tiene un runner propio (`scripts/run-tests.cjs`, sin dependencias) y un requisito que este proyecto no puede saltarse: **un behavioural check tiene que fallar antes del cambio y pasar después**.

| Prueba | Tipo | Qué fija |
|---|---|---|
| `tests/notification-hub-static-smoke.js` (nueva, Node) | Node puro | Que las tres fuentes existen con sus tres colores distintos, y que un color repetido hace fallar la prueba |
| `tests/notification-hub-smoke.js` (nueva, Electron) | Electron | Que la bolita de una fuente aparece y desaparece con su recuento, que `seen()` la apaga, y que **`seen('updater')` NO la apaga** (D3) |
| extender `tests/multi-game-userscripts-static-smoke.js` | Node puro | Que todo id nuevo que se añada a `index.html` entra en `REQUIRED_SCRIPT_ELEMENTS` (`userscripts.js:42-44`), que es lo que ya se verifica para los ids del módulo de scripts |
| extender `tests/script-shop-smoke.js` | Electron | Que el orden es destacados primero y por fecha dentro, y que `publishedAt` ausente cae al final |

Sobre el detalle de cada fuente, con el mismo criterio que ya se aplicó en este repo: **una aserción que no se ha saboteado no vale nada**. Cada comprobación de este proyecto tiene que ir acompañada de su sabotaje, con el rojo y el verde pegados.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Que se olvide un id nuevo** y el módulo se quede sin comprobar. Ya pasó: la lista de `REQUIRED_SCRIPT_ELEMENTS` salta si el renderer no ve el elemento. | Toda id nueva entra en la lista y la prueba estática lo comprueba contra `index.html`. |
| **Que una bolita se apague sola** y el usuario se pierda un aviso de actualización (D3). | `seen('updater')` es deliberadamente un no-op, y la prueba lo fija. |
| **Que el sondeo en segundo plano dispare una instalación** y cierre el launcher. | El canal nuevo no comparte código con `prepareUpdate` ni con `launchPreparedUpdate`. Es el motivo de que exista. |
| **Que el hub se quede desincronizado** con contadores escritos a mano. | Se elimina el caso: `updateScriptShopBadge` pasa a publicar un recuento al hub, y el hub es el único que escribe los badges (§4.2). |
| **Que `featured` deje de sentirse prioritario.** | D4 lo resuelve manteniendo los destacados arriba, y la etiqueta se conserva. |
| **Que añadir el sondeo eleve el tráfico a GitHub.** | Como mucho **5 peticiones al día por usuario**, y solo si deja el launcher abierto 24 horas seguidas. GitHub limita a 60 por hora y dirección IP, así que el margen es amplio para un usuario por IP. |

---

## 11. Cierre

Con este proyecto, el launcher avisa de las tres cosas sin que el usuario busque nada, y cada compteur se distingue por su color. El proyecto 2 puede añadir la pestaña "Actualizaciones" apoyándose en reglas que ya están escritas y probadas, en lugar de decidir por su cuenta qué cuenta y en qué orden se muestra.