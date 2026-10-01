# Especificación: pestaña «Actualizaciones» y filtro de categoría de la Shop

Fecha: 2026-10-01
Estado: aprobada por el usuario, pendiente de plan de implementación
Proyecto: 2 de 4 (contadores y avisos)

## Qué es esto

La pestaña «Shop online» del centro de scripts mezcla catálogo, búsqueda y estado en
una sola vista que se reconstruye entera en cada tecla. Este proyecto le añade:

1. Una tercera pestaña, **«Actualizaciones»**, que lista solo los scripts con versión
   publicada más nueva que la instalada.
2. Un **filtro de categoría** con pastillas y número, disponible en las dos vistas de
   la Shop.
3. Un **debounce** en la búsqueda, para que escribir no rehaga todas las tarjetas cada
   tecla.

No añade paginación, ni vista de lista, ni detalle, ni favoritos. Eso son los
proyectos 3 y 4.

## Por qué la lógica va en un módulo aparte

`tests/launcher-preview-preload.js` está vedado (Ruling R-03) y su catálogo tiene **un
solo script**. Con ese catálogo no se puede comprobar que un filtro filtre ni que una
pestaña liste lo que debe. Por eso la lógica de la vista vive en un módulo puro,
probable en Node con catálogos de 200 entradas, y `userscripts.js` se limita a pintar.

Es el mismo motivo por el que el orden del catálogo vive en `src/script-shop-order.js`.

## Decisiones tomadas

| | Decisión |
|---|---|
| D1 | La pestaña «Actualizaciones» muestra **solo actualizaciones reales** (estado `update`). No incluye scripts modificados localmente ni scripts nuevos. |
| D2 | Es una **tercera pestaña** del centro de scripts, con contador propio. |
| D3 | El filtro de categoría son **pastillas con número**, en las dos vistas. |
| D4 | Se recuerda **la pestaña** al reabrir el centro de scripts; **la categoría no**. |

## Ficheros

| Fichero | Qué pasa |
|---|---|
| `src/script-shop-view.js` | **Nuevo.** Puro: sin DOM, sin `window`, sin Electron. |
| `tests/script-shop-view-smoke.js` | **Nuevo.** Node. |
| `src/userscripts.js` | Renderiza lo que devuelve el módulo, pinta las pastillas, aplica el debounce, la tercera pestaña. |
| `src/notification-hub.js` | `set()` acepta un desglose; cada badge puede leer un campo distinto. |
| `src/index.html` | Tercera pestaña, sección de actualizaciones, contenedor de pastillas. |
| `src/styles.css` | Estilo de las pastillas. |
| `tests/multi-game-userscripts-static-smoke.js` | Ids nuevos en `REQUIRED_SCRIPT_ELEMENTS`. |
| `tests/notification-hub-smoke.js` | Desglose por badge. |

## API

```js
buildShopView({ scripts, view, query, category, stateOf, isNew })
  → { rows, categories, counts }
```

- `scripts`: array del catálogo ya normalizado. La función **no lo muta**.
- `view`: `'shop'` o `'updates'`.
- `query`: texto de la búsqueda, ya recortado. Se compara en minúsculas.
- `category`: categoría elegida, o cadena vacía para «Todas».
- `stateOf(item)`:inyectado desde `userscripts.js`, es el `scriptShopState` actual.
  Devuelve `{ key, label, installed }` y `key` es `available`, `update`, `modified`
  o `installed`.
- `isNew(item)`: inyectado desde `userscripts.js`. Devuelve `true` si el script no
  está instalado y todavía no se ha visto.

El módulo no sabe qué hay dentro de `stateOf` ni de `isNew`: solo los llama. Eso lo
hace comprobable sin arrancar nada, y evita mover el estado de la Shop, que vive
dentro de `userscripts.js` y depende de lo instalado.

El módulo exporta también `debounce(fn, ms)`. Va aquí y no en un tercer fichero
porque son cinco líneas y un fichero entero para eso sería más ruido que ayuda;
lo que importa es que también es comprobable.

### Salida

- `rows`: los items a pintar, ya ordenados con `orderShopCatalog` de
  `src/script-shop-order.js`.
- `categories`: `[{ name, count }]`, solo las categorías **que existen** en el conjunto
  base tras la búsqueda, ordenadas por número descendente y, a igualdad, por nombre.
  «Todas» no está en la lista: la pone el render.
- `counts`:

```js
{
  published,   // cuántos hay en el catálogo
  installed,   // cuántos están instalados
  updates,     // cuántos tienen versión nueva
  newScripts,  // cuántos son nuevos y no vistos
  total,       // updates + newScripts, lo que publica el registro
  showing,     // cuántas filas se van a pintar
  filtered     // true si hay búsqueda o categoría activa
}
```

Los recuentos de `published`, `installed`, `updates` y `newScripts` cuentan **el
catálogo entero** y no cambian al escribir ni al filtrar. Miden cómo está la Shop, no
qué se está viendo.

### Filtro con contadores: la regla que más fácil se olvida

**Los números de las pastillas se calculan antes de aplicar el filtro de categoría.**

Si se calcularan después, al elegir «Combate» las demás pastillas pasarían a decir 0 y
perderías la capacidad de saltar a otra categoría sin volver a «Todas». Es el
comportamiento de una búsqueda facetada: cada muestra cuántos elementos tiene en total,
y el número no se mueve mientras navegas.

El desglose que devuelve la función, entonces, es sobre el conjunto **base + búsqueda**,
no sobre el conjunto ya filtrado por categoría.

### Reglas, en orden

1. **Conjunto base según la vista.** `shop` → todos los scripts. `updates` → solo los
   que tienen `stateOf(item).key === 'update'`.
2. **Búsqueda**, con la misma lista de campos que hoy: `name`, `summary`,
   `description`, `category`, `author`, `tags`, `games`. Todo en minúsculas.
3. **Categoría**, coincidencia exacta con `item.category`. Una categoría que no existe
   devuelve cero filas, no todas.
4. **Orden**, con `orderShopCatalog`: destacados primero y, dentro de cada grupo, de
   más reciente a más antigua. El mismo en las dos vistas.

En la pestaña de actualizaciones el orden también pone los destacados primero. No hay
dato de «hace cuánto no actualizo», así que la alternativa sería inventar una regla.

## Contadores y el registro de avisos

Con la tercera pestaña, los tres sitios que muestran un número quieren números
distintos. Hoy el registro de avisos (`src/notification-hub.js`) pinta todos los
badges de una fuente con el mismo número, así que hay que extenderlo.

| Sitio | Número |
|---|---|
| Bolita ámbar del botón de menú | `total` (solo importa si es mayor que cero) |
| Botón **Scripts** de la barra superior | `total` |
| Pestaña **Shop online** | `newScripts` |
| Pestaña **Actualizaciones** | `updates` |

La extensión, mínima y contenida:

- `set(id, total, desglose)` acepta un segundo argumento opcional. Sin él, todo
  funciona igual que ahora.
- Una entrada de `badgeIds` puede ser una cadena —usa el total— o `{ id, campo }` —
  lee `desglose[campo]`.

La fuente `scripts` pasa a declarar sus tres badges, y el punto se sigue painting con
el total:

```js
badgeIds: [
  { id: 'scriptShopUpdateBadge', campo: 'newScripts' },
  'scriptsMenuBadge',
  { id: 'scriptShopUpdatesBadge', campo: 'updates' }
]
```

**No se crea una segunda fuente.** Habría que darle un `dotId` o hacerlo opcional, y
una fuente sin bolita en el menú es más difícil de entender que tres badges con
campos distintos dentro de la misma.

Consecuencia asumida: si tienes 0 scripts nuevos y 2 actualizaciones, al entrar en
Shop la bolita ámbar se apaga aunque queden actualizaciones. Es correcto según D1: la
bolita avisa de **contenido sin ver**, y la pestaña «Actualizaciones» con su contador
sigue mostrando las 2. Queda escrito para que no parezca un descuido.

## Debounce

250 ms sobre la llamada a `buildShopView`, que es lo único que cambia al escribir. Los
recuentos del resumen no dependen de la búsqueda, así que no ganan nada esperándose.

Dos escapes:

- **Enter** aplica al instante.
- Al cambiar de pestaña o al cerrar el panel, se cancela el temporizador pendiente,
  para que no salte un render dentro de un panel ya oculto.

## Estados

- **Orden de las pestañas**: «Mis scripts», «Shop online», «Actualizaciones». La nueva
  va **última**, porque es un subconjunto de la Shop y no tiene sentido como destino de
  partida.
- **Sin búsqueda en «Actualizaciones»**: la caja de búsqueda pertenece a la vista
  Shop y no se repite. Con pocas actualizaciones sobraría, y dos cajas de búsqueda que
  se ignoran la una a la otra confunden. El filtro de categoría sí está en las dos, que
  es lo que evita tener que desplazarse.
- **Actualizaciones sin nada pendiente**: la pestaña **no se esconde**. Dice que estás
  al día. Esconder navegación según los datos hace que el menú cambie de forma bajo
  los dedos del usuario.
- **Catálogo sin cargar**: entrar en «Actualizaciones» dispara la carga igual que
  Shop, y mientras carga se muestra el mismo aviso de conexión que ya existe.
- **Categoría sin resultados en Shop**: el aviso de «no hay resultados» de hoy.
- **Categoría sin actualizaciones**: mensaje distinto que diga que el filtro es lo
  que filtró, para que no parezca que la Shop está vacía.

## Ver lo nuevo se marca al abrir Shop, y solo al abrir Shop

Entrar en «Actualizaciones» **no** marca los scripts nuevos como vistos. Si se
marcaran al abrir cualquier pestaña, el contador de Shop se vaciaría sin que el
usuario hubiera pasado por Shop nunca.

Marcar lo visto es lo que apaga la bolita ámbar, y eso solo debe pasar cuando los
scripts nuevos se han visto de verdad.

## Memoria

La pestaña se guarda en `localStorage` con la clave `pokegrid:scripts-view:v1`. Si el
valor guardado no es `'installed'`, `'shop'` ni `'updates'`, se ignora y se empieza en
«Mis scripts».

La categoría **no** se guarda: al reabrir, «Todas». Es una decisión de trabajo, no
una preferencia del launcher.

## Pruebas

### `tests/script-shop-view-smoke.js` (Node)

Con catálogos que el harness no puede dar:

- Conjunto base por vista, incluido que en `updates` solo entra lo que tiene versión
  más nueva.
- Búsqueda con la lista de campos de hoy; acentos y mayúsculas no la rompen.
- Filtro de categoría; una categoría inexistente devuelve cero filas.
- Orden con destacados primero y fecha dentro, en las dos vistas.
- **Que los números de las pastillas no cambien al elegir una categoría.**
- Que los recuentos del resumen no cambien al escribir ni al filtrar.
- `showing` y `filtered`.
- Que no mute el array recibido.
- Un `debounce(fn, ms)` mínimo, con relojes de verdad: no dispara antes de la pausa y
  dispara una sola vez.

### Extensiones

- `tests/multi-game-userscripts-static-smoke.js`: los ids nuevos en
  `REQUIRED_SCRIPT_ELEMENTS`, para que la puerta siga avisando si alguien borra una
  pestaña.
- `tests/notification-hub-smoke.js`: el desglose por badge, que una fuente sin
  desglose sigue funcionando igual, y que un badge que pide un campo que no existe no
  rompe nada.

### Lo que esta prueba no cubre, dicho claro

**El retardo real del debounce no es comprobable aquí.** Es una sensación, y con un
script en el catálogo del harness no se reproducen 200 tarjetas ni se mide nada. Lo que
queda cubierto es:

- Comprobación estática de que el `input` de la búsqueda **pasa por el debounce** y no
  llama al render directamente. Si alguien lo revierte, la puerta falla.
- Que Enter salta la espera.
- Que el temporizador se cancela al cambiar de pestaña.

Con un catálogo de 200 scripts, el primer render sigue pintando 200 tarjetas. Es lo que
ya hace hoy y no se ha tocado.

## Fuera de alcance

- Paginación o «ver más».
- Vista de lista, imagen en la tarjeta, panel de detalle, favoritos (proyecto 3).
- Capture Log y Hunt Analyzer (proyecto 4).
- Ordenar por afinidad con lo instalado.
- Recordar la categoría.
- Cambiar el publicador de `DiegoT34/PokeGrid-Script-Shop`: `category` ya está en la
  lista blanca de `src/main.js` con valor por defecto `Utilidades`, así que el filtro
  no necesita nada del publicador.