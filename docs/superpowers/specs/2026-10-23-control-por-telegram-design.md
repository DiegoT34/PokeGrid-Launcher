# Control del farmeo por Telegram — diseño

Fecha: 2026-10-23. Estado: aprobado el diseño, pendiente de plan de implementación.

## Qué se quiere

Poder leer en qué hunt está cada una de las cuatro cuentas y **enviarlas a otra hunt desde el móvil**,
por Telegram: todas a la vez o una sola.

Hoy eso está en el **Modo farmeo** del launcher, que hace tres cosas distintas y conviene separarlas:

1. **Leer** el equipo de cada cuenta. `refreshFarmContexts()` (`src/renderer.js`) inyecta
   `farmEnhancedContextScript()` en cada webview y devuelve, por cuenta, `level`, `location` (la hunt
   actual), `trainerName` y `leader` (el Pokémon 1 del equipo, con tipos, movimientos, objetos e IV).
2. **Leer el catálogo** de hunts. `farmEnhancedCatalogScript()`.
3. **Viajar y montar los monitores**. `buildFarmAutomationScript()` abre el mapa, elige mapa y zona,
   busca el marcador, viaja, acepta el aviso de Orre si está permitido, espera a llegar y después
   **abre Hunt Analyzer y Capture Log** y los coloca flotantes.

Este diseño hace **1, 2 y la parte de viajar de 3**. Los monitores flotantes se quedan donde están:
son una comodidad para mirar la pantalla, no algo que se pida desde el móvil.

## La decisión de fondo: un userscript dentro del juego

Se evaluaron tres sitios donde podía vivir el bot:

- **Dentro del launcher** (proceso principal o renderer). Es lo que más reutiliza, pero obliga a
  abrir una superficie nueva de IPC y unas opciones nuevas en el launcher.
- **Programa aparte.** Descartado: las cuentas son webviews del launcher; desde fuera no hay a qué
  conectarse.
- **Un userscript en cada página del juego.** Es el elegido.

El userscript tiene dos ventajas que no tienen las otras: se instala y se quita como cualquier otro
script, y **no hay que tocar la automatización del launcher**.

### Lo que hace viable al userscript

Comprobado en el código, no supuesto:

- **Cada script sabe qué cuenta es.** `buildRuntimeSource()` (`src/userscripts.js`) entrega
  `GM_info.script.account.index` y `.label`. No hay que adivinar ni mapear nada.
- **Hay un canal entre las cuatro páginas.** `GM_getSharedValue` / `GM_setSharedValue`, respaldado por
  `userscripts-shared.enc` en `userData`, cifrado con la protección de Windows (`safeStorage`). El
  almacén está separado **por id de script**, así que este script no puede leer la configuración del
  de alertas: tiene la suya.
- **El catálogo de hunts no necesita el DOM.** Sale de `/api/game/map-markers`, un endpoint del propio
  juego (lo usa `farmEnhancedCatalogScript`). La página puede pedirlo con `fetch` sin abrir el mapa ni
  tocar nada de la interfaz.
- **El estado de la cuenta se puede leer del DOM** con la versión corta del lector
  (`farmContextScript()`, 25 líneas), más el líder.

### Lo que obliga a que el launcher esté abierto

El launcher duerme las pantallas que no se miran (`setBackgroundThrottling(true)`), y al
**minimizarse duerme todas** (`mainWindow.on('minimize', dormirTodo)`). Chromium recorta entonces los
temporizadores a ~1 s primero y a 1/minuto pasados unos minutos.

Decisión tomada con el usuario: **se usa con el launcher abierto y las cuatro cuentas en cuadrícula**.
En ese modo las cuatro están en pantalla (`panelEstaEnPantalla()` devuelve `true` para toda la
instancia activa), así que ninguna está dormida y no hay recorte. Si el launcher se minimiza, el bot
deja de ser fiable y el diseño lo dice en el propio panel del script.

## Arquitectura

Cuatro páginas iguales ejecutando el mismo script. Tres piezas en el almacén compartido:

```
registro:<pageId>   { pageId, accountIndex, label, trainerName, location, leader, at }
turno               { pageId, hasta }
comando             { id, accion, destino, cuentas, desde, creadoEn }
resultado:<id>:<pageId>  { ok, mensaje, at }
pendiente:<shortId> { accion, destino, cuentas, creadoEn }
```

### El turno

Una sola página puede pedirle mensajes a Telegram: `getUpdates` no admite dos consumidores y el
segundo recibe **409 Conflict**.

- Cada página intenta coger el turno si está libre o caducado. Caduca a los **15 s**; se renueva cada
  **10**.
- El que lo tiene hace *long polling* (`getUpdates?timeout=25&offset=N`).
- **El turno no es la garantía de corrección**: es solo para no gastar peticiones. Si dos páginas se
  creen dueñas, la que pierde recibe 409, se aparta 5 s y no procesa nada.
- Lo que evita ejecutar dos veces un comando es su **`id` único**: cada página recuerda el último id
  que ejecutó.

Esto importa porque el turno puede cambiar de manos a mitad de un comando: cerrar la cuenta que lo
tenía no puede dejar el bot mudo ni ejecutar el viaje dos veces.

### El bus de comandos

**Quien tiene el turno es también quien contesta en Telegram.** Esa página:

1. Lee todos los `registro:<pageId>` y compone el `/estado`.
2. Hace la búsqueda de hunts contra el catálogo y compone los botones.
3. Escribe `comando`.

Las demás leen esa clave cada **1,5 s** y lo ejecutan solo si `cuentas` las incluye. Cada página
escribe su `resultado:<id>:<pageId>`.

Que conteste el del turno y no una página fija es lo que hace que cerrar una cuenta no deje el bot
mudo: el turno pasa a otra y esa hereda la conversación. El precio es que el `offset` de `getUpdates`
viaja con el turno, así que se guarda en el almacén junto con él.

**El último id ejecutado se guarda** en el almacén local de la página (`GM_setValue`), no solo en
memoria. Si la página se recarga a mitad de un comando, al volver no lo repite.

Las escrituras al almacén no se pisan: el manejador de IPC de `main.js` es síncrono (lee, modifica y
escribe el fichero en la misma llamada), así que el bucle de eventos serializa las cuatro páginas.

### Por qué claves separadas para el registro

Si las cuatro escribieran en una sola clave `registro`, cada una tendría que leer, modificar y
reescribir: una podría pisar el cambio de otra y desaparecer una cuenta del `/estado`. Con una clave
por página no hay nada que pisar.

## Telegram

### Configuración

Panel dentro del juego, con el mismo patrón visual que el script de alertas: token de BotFather, ids de
usuario autorizados y el interruptor de Orre. El token se guarda en el almacén compartido cifrado.

Validación del token con la misma forma que ya usa el script de alertas:
`/^\d+:[A-Za-z0-9_-]{20,}$/`.

### Seguridad

- **Lista blanca de ids de usuario.** Un usuario no autorizado no puede ejecutar nada. El bot le
  responde con **su propio id** para que el dueño lo añada si quiere: no revela nada que el usuario no
  sepa ya.
- Los botones también se validan: un `callback_query` de un usuario no autorizado se ignora.
- **«Las cuatro» pide confirmación con un botón.** Mover cuatro cuentas de sitio por un toque
  accidental es recuperable, pero se evita.

### Comandos

```
/estado     → una línea por cuenta: entrenador, hunt actual y líder, con la antigüedad del dato.
              Una cuenta cerrada o sin leer sale marcada, no se omite.
              Botones: [Actualizar] [Ir a una hunt]
/ir <texto> → busca en el catálogo y enseña hasta 6 coincidencias con nivel y mapa.
              Al elegir una: [Las 4] [SHOCKVOR] [SHOCKOR] [DIEGO20] [SHOCKVINY]
/ir         → pide el texto
/ayuda
```

`/estado` **enseña también lo viejo**. Un registro de hace dos minutos es información; una cuenta que
desaparece de la lista sin decirlo, no. Si una cuenta lleva más de 60 s sin actualizar su registro, se
marca con la edad del dato.

Los datos de un botón están limitados a **64 bytes** en Telegram, así que el botón lleva solo
`a:<shortId>` y el detalle vive en `pendiente:<shortId>`, que se borra al usarlo.

## Viajar

Cada página ejecuta su propia secuencia. Es una **copia reducida** de `buildFarmAutomationScript()`
del launcher: mismo criterio, menos pasos.

1. Si el mapa no está abierto, pulsar su botón del dock.
2. Elegir mapa y zona si el destino los trae (`data-map-slug`, `data-area`).
3. Buscar el marcador por `slug`. Si no está, escribir el nombre en el buscador del mapa.
4. Pulsar el marcador y después viajar/entrar.
5. **Aviso de Orre**: no se acepta salvo que el interruptor esté activo. El original hace lo mismo con
   `farmAllowOrreTravel`. Si el destino es de Orre y está apagado, se devuelve un error que lo dice.
6. Esperar a que la ubicación coincida con el destino, con 12 s de margen.

**No** se abre Hunt Analyzer ni Capture Log, ni se colocan monitores.

### El precio de la copia

El código de viaje existe dos veces. Es inevitable en este enfoque y conviene decirlo: **si el juego
cambia el mapa, hay que tocar `src/renderer.js` y este script**. Se mitiga quedándose con lo mínimo:
sin monitores, sin validación de Orre duplicada en dos sitios, sin recomendaciones.

### Lo que se lee

- `trainerName`, `location` y `ready`, con la versión corta del lector (`farmContextScript()`).
- `leader`: **nombre, nivel y HP**. El lector corto no trae el líder, así que se añade un lector
  pequeño que mira la ficha del primer Pokémon del equipo. **Es best-effort**: si no lo encuentra, la
  línea dice «líder: —» y el resto del estado sigue saliendo. Un dato de menos no puede tumbar el
  comando.
- Lo que **no** se lee: movimientos, objetos, IV, calidad ni recomendaciones. El bot informa y obedece;
  no aconseja.
- Catálogo: `GET /api/game/map-markers`, reducido a `{slug, nombre, mapa, zona, nivel}`.

## Errores y latencia

- Cada cuenta devuelve su línea con el error tal cual. Los mensajes del original ya están en español y
  se entienden.
- Si una página no contesta en **20 s**: «sin respuesta (¿cuenta cerrada?)».
- Si ninguna está dentro del juego: «No hay ninguna cuenta en el juego».
- Objetivo: el acuse de un comando en menos de 3 s; el resultado de un viaje, en menos de 40 s.

## Ficheros

| Fichero | Qué cambia |
|---|---|
| `userscripts/PokeGrid-Telegram-Control.user.js` | **Nuevo.** El script entero. |
| `userscripts/INSTALACION-TELEGRAM.md` | Se amplía con el bot de control. |
| `src/main.js` | El canal `userscripts:bundled-telegram` está clavado a un nombre de fichero. Pasa a `userscripts:bundled-script` con una **lista blanca** de nombres. Una sola ruta, no dos. |
| `src/preload.js` | `loadBundledUserScript(name)`. |
| `src/userscripts.js` | La entrada para instalar/actualizar el script de control, junto a la de alertas. |
| `tests/userscripts-manager-smoke.js` o nueva | Instalación y arranque del script. |
| `tests/ipc-sender-guard-smoke.js` | Clasificar el canal nuevo. |
| `herramientas/comprobar-patrones.cjs` | Invariantes del script. |
| `herramientas/area-entera.ps1` | La prueba nueva, en su sitio del orden. |

Nada de esto toca la automatización del modo farmeo: `renderer.js` no se modifica por esta función.

## Pruebas

- **Smoke del script**: se instala en la vista previa, se falsea `GM_xmlhttpRequest` con un Telegram de
  mentira y se comprueba que se registra, que coge el turno, que entiende `/estado`, que emite un
  comando y que una segunda página lo ejecuta **una sola vez** aunque llegue repetido.
- **Invariantes estáticas**: declara los `@grant` y `@connect`, no escribe el token en claro en
  `localStorage`, y no usa `eval` ni `new Function`.
- **Prueba real, contigo**: crear el bot en BotFather, pegar el token, autorizarte, mover una cuenta y
  comprobar en el juego que llegó.

## Fuera de alcance

- Montar los monitores flotantes desde Telegram.
- Mandar alertas: eso es del script de alertas, que no se toca.
- Funcionar con el launcher minimizado o cerrado.
- Recomendar hunts por equipo y tipos; el bot informa y obedece.

## Riesgos

| Riesgo | Qué lo limita |
|---|---|
| El juego cambia el mapa y el viaje deja de funcionar | El error se ve en el chat, no se queda en silencio. Hay que tocar dos sitios. |
| Dos páginas creen tener el turno | 409 + id de comando: no se ejecuta dos veces. |
| El token se filtra | Va cifrado con `safeStorage`, nunca en `localStorage` ni en el código. |
| Un desconocido encuentra el bot | Lista blanca de ids; sin autorización no se ejecuta nada. |
| El catálogo cambia de forma | Se lee por nombre de campo con alternativas, como el original; si falta, se avisa. |
