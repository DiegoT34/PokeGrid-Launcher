# Registro de entregas

Una entrada por versión, con lo que cambió y **por qué**. Sin esto, dentro de seis meses el código
explica *qué* hace pero nadie recuerda *decide qué*.

Las versiones van en orden. La carpeta `dist/` conserva todas; nada se sustituye.

---

## 0.37.0 — perfiles de sesión, como los de Chrome

### Qué son

Un perfil es una sesión con nombre. Hay varios, se les pone nombre desde un gestor, y **cada ventana
elige con cuál trabaja**. Las ventanas que eligen el mismo perfil comparten lo que tengas iniciado
en ellas: entras una vez en Google y ya lo tienes en las demás.

Donde antes había un interruptor de «compartir la sesión con las demás ventanas», ahora hay una lista
de perfiles. El interruptor no se amplía: **se sustituye**, porque un perfil ya cubre compartir y
además permite tener más de una sesión distinta.

### Lo que hay que saber al actualizar

**Todas las ventanas pasan al perfil «Principal».** Es lo que se pidió, y conviene decir lo que
cuesta: si tenías dos ventanas de la misma web con cuentas distintas, dejan de poder estar separadas
hasta que crees un segundo perfil y asignes una de ellas. No se pierde nada: las sesiones antiguas se
quedan en disco, sin borrar.

**Cambiar el perfil de una ventana reinicia sus pantallas.** La partición se fija al crear la web, así
que no hay forma de cambiarla en caliente. El aviso sale antes de hacerlo y dice las dos cosas: que se
pierden las webs abiertas y que habrá que volver a entrar en los sitios.

**Las cuentas del juego no se tocan.** Siguen con su propia sesión, una por cuenta. Es la función
principal del launcher y nada de esto la afecta.

### Un fallo que salió al cambiar el nombre de la partición

Las particiones se llamaban `persist:pokegrid-instance-…`, y el proceso principal usaba ese prefijo
para saber qué webviews eran ventanas del navegador. Al pasar a `persist:pokegrid-perfil-…` **ninguna
dejaba de estar registrada**: sin permisos, sin modo de apertura y sin rueda de zoom. No petaba; las
ventanas seguían abriéndose y solo dejaban de hacer unas cosas, en silencio. Ahora hay dos preguntas
distintas en un solo sitio: qué es una ventana (las dos formas) y qué se puede borrar al cerrarla
(solo la antigua), porque la de un perfil la comparten otras ventanas.

### La puerta de pruebas llevaba tiempo sin comprobar

`herramientas/area-entera.ps1` usaba `param($cmd, $args)`. `$args` es una variable **automática** de
PowerShell, así que `@args` expandía la automática —vacía— y las pruebas se lanzaban sin argumentos,
sin imprimir nada. Como el guion solo buscaba un fallo en la salida, el silencio contaba como verde.
Además no borraba el fichero de salida entre pruebas, así que una que no corría leía el resultado de
la anterior.

**Cualquier «20 de 20» de esa puerta hasta ahora no valía nada.** Se ha arreglado, y además ahora
falla si una prueba no escribe nada.

### Cuatro pruebas que ya estaban en rojo

Estaban rotas desde el 16 de octubre y desde la 0.35.0, y nadie lo veía porque la puerta no miraba:

- `instancia-modos` e `instancia-nueva-pestana` manejaban un desplegable que ya no existe (ahora hay
  dos botones) y pedían que el enlace se viera en modo navegador, cuando el código lo esconde.
- `instancia-cabecera` medía el logo de la esquina, retirado en la 0.35.0, y miraba los números de la
  primera regla de `.instance-tab-shell` en vez de la del bloque de rediseño, que es la que se aplica.
- `instancia-navegador` destapó el fallo de las particiones de arriba.

---

## 0.36.0 — sesiones compartidas, el farmeo en pestañas y los botones agrupados

### Sesiones compartidas

Cada ventana tiene su propia sesión, y eso es lo que permite tener dos cuentas distintas de la misma
web en dos ventanas a la vez. Pero quería lo contrario para Google, el correo o el banco: entrar una vez
y tenerlo en todas. Ahora cada ventana elige.

| | Partición |
|---|---|
| **Propia** *(por defecto, como siempre)* | `persist:pokegrid-instance-<id>-<n>` |
| **Compartida** | `persist:pokegrid-compartida`, la misma para todas las marcadas |

Las cuentas del juego **no se tocan**: siguen con `persist:pokegrid-<cuenta>`, que es la función del
launcher. Solo setocan las ventanas de navegador.

**El nombre de la partición compartida es una decisión de seguridad.** Al cerrar una instancia se borra
su partición del disco, y ese borrado filtra por el prefijo `persist:pokegrid-instance-`. Si la
compartida se llamara `instance-compartida`, entraría en el filtro y **al cerrar una sola ventana se le
borrarían las cookies a todas las demás**. Por eso se llama `compartida`: no casa con ese prefijo, y el
borrado la ignora por construcción y no por una condición que alguien pueda olvidar. La prueba lo
comprueba.

Lo que no viene marcado se queda en `propia`: una ventana creada antes de esto debe seguir viendo lo
mismo al reiniciar.

### El farmeo en modo pestañas

El sondeo de cada cinco segundos solo leía las cuentas **a la vista**. En rejilla eso son todas; en
pestañas es una sola, y las demás nunca se leían: el farmeo no tenía con qué trabajar.

Ahora se leen todas **cuando el farmeo está en uso** —el selector abierto o alguna cuenta farmeando— y
solo entonces. Quitar la guarda a secas habría devuelto el gasto de CPU y memoria que la 0.31.0 quitó,
y se notaría justo cuando no se está farmeando.

Una duda que documenta el código porque todo el mundo la tiene al leerlo: **se puede leer una pantalla
«dormida»**. `duermirPanel` pone la atenuación de fondo, que en Electron solo ralentiza temporizadores
y animaciones; no apaga la pantalla ni le bloquea el JavaScript. Por eso `executeJavaScript` sigue
devolviendo el DOM real de una cuenta dormida.

### Los botones `+` y `−`

Segecían mal por dos motivos encadenados. Primero iban en mitad de la barra, pegados al nombre. Luego,
al moverlos detrás de los botones, seguían sueltos: la barra era `justify-content: space-between` con
cuatro hijos, y eso reparte el hueco **entre todos** en vez de dejárselo al nombre. Ahora el nombre
ocupa el sobrante y los tres grupos quedan juntos al final.

### WhatsApp Web: la causa está confirmada, el arreglo no cabe

**Medido en una pantalla real:**

```
User-Agent:  … Chrome/150.0.7871.114 Electron/43.1.1 …
marcas:      Not;A=Brand 8   ·   Chromium 150
```

Un sitio busca la marca literal `Google Chrome`. Chromium se anuncia como `Chromium`. No la encuentra y
muestra el cartel. **Por eso limpiar la cadena del User-Agent no lo arregla**: son dos mecanismos
distintos, y el launcher ya limpiaba el primero.

Se probaron tres vías y **ninguna** sirve desde el preload:

| Vía | Resultado |
|---|---|
| `webFrame.executeInMainWorld` | **No existe** en Electron 43. El código no hacía nada y el `try/catch` se lo tragó: el síntoma era idéntico a no hacer nada. |
| Parchear la instancia de `userAgentData` | **Falso positivo.** `navigator.userAgentData` devuelve un objeto distinto en cada acceso, así que el parche solo valía dentro de la misma ejecución. |
| Parchear el prototipo inyectando un `<script>` | **Se ejecuta pero se pierde.** Llega, pero al navegar se crea un contexto nuevo y el getter vuelve a ser el nativo de Chromium. Comprobado: `getterEsNativo: true`. |

Lo que **sí funciona** es parchear el prototipo desde el mundo principal con la página ya cargada: da
`Not;A=Brand, Chromium, Google Chrome`.

Queda pendiente hacerlo por cada webview y en cada navegación, desde el renderer. El riesgo —que el
sitio lea la marca antes de que llegue el parche— solo se mide abriendo WhatsApp Web de verdad, así que
no se ha aplicado a ciegas.

---

## 0.35.0 — la barra, el arrastre, las cuentas y el modal de nueva pestaña

### El título de Notificaciones tapado por la campana

No era un problema de márgenes sino de **orden**. El panel tenía `z-index: 180` y la barra de la
aplicación `220`: el panel salía **por debajo** de la barra que lo abre, y el botón se dibujaba encima
de su propio título. Ahora el panel va en `235`, por encima de la barra (220) y por debajo de los
modales (245, 260 y 265), que sí deben taparlo.

### Los campos del modal que no se escondían

El punto de partida era el pedido: «en modo navegador, fuera los dos campos». El código ya ponía
`hidden = true` sobre ellos, y aun así **se veían**.

La causa no era el JavaScript: es que `.field` tiene `display: grid`, y **una regla de clase gana
siempre al `[hidden]` que aplica el navegador**. El DOM estaba correcto —el campo estaba marcado como
oculto— y el estilo lo contradecía. El DOM decía una cosa y la pantalla otra.

La arreglo es global y de una línea: `[hidden] { display: none !important; }`. Es global a propósito,
porque el problema es de todos los sitios que usen `hidden` sobre algo con un `display` propio, no solo
de este modal. Hay **55** asignaciones de `.hidden` en el programa y hasta ahora solo funcionaban las
que no tenían un `display` competido.

Comprobado antes de darlo por bueno: ninguna regla del CSS resucita algo marcado como `hidden`, y el
único `:not([hidden])` del proyecto sigue funcionando.

### El drag and drop del centro de scripts

La zona de arrastrar es un `grid` de **dos** columnas: 25 px para el icono y el resto para el texto.
Al cambiar el emoji por un SVG, el `<small>` de la extensión pasó a ser **una tercera celda**, se quedó
con el ancho justo y partió `.user.js` en varias líneas: «.js / .user / .js / rb updates».

El texto va ahora en un `<span>` que ocupa una columna con sus dos líneas dentro. No es un capricho: un `grid` trata cada hijo como una celda, y añadir un hijo cambia la rejilla.

### El bloque de VPN / IP por cuenta

**Aviso, porque es distinto de lo que parecía.** El guion de VPN (el `core` de WireGuard por cuenta) sí
se eliminó en la 0.33.0. Pero este desplegable era **otra cosa**: el proxy HTTP/SOCKS5 por cuenta, que
seguía vivo y aplicado en `main.js:311`. Se quita igualmente por indicación expresa, y con él: el
código que lo rellenaba, el que lo guardaba, la recarga de sesiones al cambiarlo y sus reglas de CSS.

### Los botones `+` y `−` de cada pantalla

Estaban **entre el nombre de la instancia y los botones de la derecha**, o sea en mitad de la barra y
pegados al nombre, sin que se entendiera de qué eran. Ahora van **detrás de `actions`**, juntos a los
demás botones de la pantalla, que es donde ya se busca uno cuando se quiere algo así.

### El logo de la esquina

Fuera. Ocupaba 34 px de alto por su cuenta y lo único que había al lado era el menú: la barra de
pestañas empezaba más allá, perdiendo sitio justo donde más falta hace para ver cuántas pestañas hay.
El nombre del launcher no se pierde, pasa al `aria-label` de la barra. El icono de la ventana sigue
siendo el mismo, porque ese no ocupa sitio dentro de la ventana.

### El arrastre de las pestañas

La marca de destino **existía en el CSS pero nunca se ponía**: el `dragover` no la añadía, así que se
veía una pestaña arrastrándose sin más. Ahora hay las dos pistas, como en Chrome pero más suave: la que
se mueve baja de opacidad, y la de destino se levanta y se marca con un fondo tenue.

Un fondo y no un borde de color, porque un borde fuerte tapa el nombre y deja de saber qué hay debajo.
Y todo el bloque respeta `prefers-reduced-motion`.

El estilo de la pestaña también cambia: la activa ya no se distingue solo por el color de fondo —lo que
obliga a leer los nombres—, sino que lleva una línea de color pegada al panel.

### El modal de nueva pestaña

- **«Un juego» → «Url única».** Decía «juego» cuando lo único que se pide es una dirección.
- **En modo navegador se esconden los dos campos.** El código ya ocultaba el nombre, pero el comentario
  decía «el enlace se ve SIEMPRE» y el campo nunca se ocultaba. Ahora van los dos juntos: si no hay nada
  que escribir, no se pregunta.
- **El nombre es opcional** y con el texto que corresponde: «Nombre de la pestaña». Si se deja vacío,
  la pestaña lo toma del **dominio de la URL**; antes ponía «Otro juego», que además mentía y salía
  idéntico en todas.
- La URL de ejemplo ya no es `https://juego.example/` sino `https://sitio/pagina`.

### La interfaz de cuentas

Cada cuenta era una fila con tres campos del mismo tamaño y un borde flojo. Ahora es una ficha con su
**número** —por posición y no por id, porque los ids nunca se renumeran y saltaban huecos—, los campos
con nombre encima y la contraseña en su propia columna.

---

## 0.34.0 — pestañas de cuenta que se mueven, iconos de verdad y fuera el brillo

### Pestañas de cuenta

- **Se pueden reordenar.** Antes se arrastraban y no pasaba nada: `moverInstancia` solo buscaba dentro de
  `browserInstances`, y una cuenta no está ahí — `findIndex` devolvía `-1` y la función se salía
  callada. El síntoma era una pestaña que no se movía, sin ningún aviso. Ahora cada clase se mueve en
  su propia lista (`moverCuenta`) y **el orden se guarda** (`ORDEN_CUENTAS_KEY`), así que al reiniciar
  no vuelve al orden de las cuentas.
  También funciona con `Alt` + flecha, como las instancias.
- **El icono se pinta.** `pintarIconoDeInstancia` solo pintaba el logo del juego en la instancia
  principal. Las cuentas (`cuenta-3`) no lo eran: caían al mapa de iconos, no había nada ahí y la
  pestaña salía **sin marca**.
- **El botón de agrandar se esconde** en modo pestañas, donde la cuenta está sola y no hay rejilla a la
  que agrandarla. `toggleExpanded` también lo rechaza, para el atajo de teclado y cualquier otra vía.

### Sin brillos

Las doce reglas de `:hover` con `box-shadow` y el `filter: brightness(1.08)` han desaparecido. Se dejan
cambios de color y de borde, que es lo mínimo para seguir diciendo «esto se puede pulsar».

**Lo que no se ha quitado, y por qué:**

| Qué | Por qué se queda |
|---|---|
| `.instance-tab-shell.is-active` | Su `box-shadow` no es un brillo: es lo único que dice qué pestaña estás mirando. Sin él, con cuatro pestañas abiertas no hay forma de saber cuál es cuál. |
| La franja del tipo en `.farm-pokemon-smart-option` | Es el color del Pokémon, un dato. Su sombra lleva dos capas y solo se quita la del resplandor. |
| Los `drop-shadow` de los iconos | Son relieve sobre el fondo, no resplandor. Sin ellos los iconos quedan pegados a la superficie. |

### Iconos SVG donde antes había emoji

Todos los que **se pintaban** ahora son SVG de la tabla `LAUNCHER_ICON_PATHS`, con trazo y
`currentColor`. Lo que se queda son tres cosas, y ninguna es un emoji:

- Los que están en **expresiones regulares** que limpian el texto del juego: se usan para *reconocer*
  emojis ajenos y quitarlos. Cambiarlos por un SVG haría que no reconocieran nada.
- Los que están en **comentarios**, que no se ven.
- Los **símbolos matemáticos y geométricos** (`≥`, `×`, `−`, `◈`), que no son emoji.

Se añadió `search` a la tabla y `window.launcherUiIcon` quedó expuesto, porque `userscripts.js` va en
su propio fichero y sin eso tendría que duplicar los trazos —que divergen en cuanto uno se toca—.

El tema del juego (`game-theme.js`) lleva sus iconos como `mask` en SVG en línea, porque ahí se inyecta
en la página y `launcherUiIcon` no llega.

### Fuera el botón de Telegram

`loadScripts()` ya instalaba el módulo oficial en cada arranque (`updateBundledTelegramScript`), así que
el botón era una segunda puerta a lo mismo. Se fueron el botón, su CSS, la función que solo él llamaba
y su enganche. **El módulo se sigue instalando solo**: eso no cambia.

### Rediseño

Centro de scripts, panel de notificaciones, «crear meta» y «gestionar metas», todo **solo con CSS**:
cabeceras con borde, pestañas como fichas, contadores con su propio color, filtros como caja separada y
barras de desplazamiento pintadas a mano con la paleta del launcher.

Va **al final** de `styles.css` y no reescribiendo lo que había: es una capa, y se quita borrando ese
bloque. Una regla con el nombre mal escrito no da error —se queda sin hacer nada—, así que
`comprobar-selectores-rediseno.cjs` comprueba que los 33 selectores tienen un elemento de verdad.

### El directorio, ordenando

17 herramientas y guiones de un solo uso pasaron a `herramientas/`, y lo que sobraba a `_basura/<fecha>/`
—**movido, no borrado**—. `MAPA-DEL-PROYECTO.md` es nuevo y explica dónde va cada cosa y qué no se toca.

`src/` y `tests/` no se han movido: el proceso principal decide qué entra en el paquete, y mover un
fichero de ahí rompe el paquete **en silencio**.

---

## Fallos propios que costaron tiempo en esta versión

Están escritos porque se repiten, y volver a caer en ellos no es de esta vez:

1. **Reconstruir una regla de CSS desde sus partes pierde el selector.** El parser cogía el bloque
   anterior y, con un comentario de por medio, se comió `.button-pokepedia:hover` entero. Revertido con
   `git checkout`. Ahora solo se borra una declaración del cuerpo, nunca se reconstruye la regla, y se
   comprueba que la lista de selectores es idéntica antes y después.
2. **Reponer una sombra sin su `box-shadow:` delante.** El navegador descarta la declaración, así que la
   franja del tipo desaparecía de la pantalla mientras el guion la daba por buena. Buscar la cadena no
   dice que signifique nada: la comprobación nueva busca declaraciones sueltas.
3. **`node --check` mira el fichero en disco, no lo que vas a escribir.** Dos guiones se comprobaban a sí
   mismos antes de guardar y, al ver el error del fichero viejo, no escribían nada. Ahora escriben a un
   temporal y comprueban ese.
4. **Un acento grave en un comentario dentro de una plantilla** cierra la plantilla antes de tiempo, y el
   error apunta a la línea donde empieza, no a la del comentario. Ha pasado cuatro veces.
5. **Los escapes de una expresión regular no sobreviven a una plantilla.** `\s` se convierte en un
   espacio y `\.` pierde la barra. Una comprobación daba «el módulo no trae el namespace» cuando el
   módulo sí lo traía. Ahora se usa `indexOf`.
6. **`node -e` desde PowerShell no admite barras ni corchetes.** Todo eso va en ficheros de
   `herramientas/`, y `herramientas/` existe por eso y no por organizacion.

---

## Pruebas de esta versión

- `tests/cuentas-iconos-0340-smoke.js` — nueva. 13 comprobaciones: reordenado, icono de la cuenta, botón
  de agrandar, cero brillos de hover, franja del tipo y marca de la pestaña activa intactas, iconos SVG
  y fuera el botón de Telegram.
- `tests/userscripts-manager-smoke.js` — adaptada. El botón ya no está, así que la prueba carga el
  módulo por la misma vía interna y hace lo mismo que él, **sin perder cobertura**.
- 13 invariantes nuevas en `comprobar-patrones.cjs` y 22 en `verificar-paquete.cjs`.