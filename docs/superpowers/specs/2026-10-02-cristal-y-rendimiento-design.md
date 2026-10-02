# Especificación: cristal, tipografía y coste de los tres paneles en vivo

## Qué es esto

El rediseño visual de los tres paneles que el launcher pone encima de la webview del juego:

- **Capture Log** (`index.html:624`), con el detalle de cada Pokémon al pulsarlo.
- **Hunt Analyzer** (`index.html:603`).
- **Datos de la cuenta** (`index.html:598`), el que se titula «DATOS EN TIEMPO REAL».

Y dos cosas más que no son estética pero salieron del mismo encargo: **que los paneles se reajusten al maximizar la ventana**, que hoy no se reajustan y además pueden quedar recortados, y **que dejen de costar lo mismo por segundo con muchas cuentas**.

## Lo que ya existe y no hay que volver a inventar

Antes de nada, porque cinco de las seis piezas de este proyecto **ya están escritas** y rehacerlas sería tirar trabajo:

- **`launcherUiIcon(name)` y `LAUNCHER_ICON_PATHS`** (`renderer.js:7526-7552`): una biblioteca de **20 iconos SVG** con trazo, `viewBox="0 0 24 24"` y `stroke="currentColor"`. Es exactamente lo que pide el encargo. Faltan cinco para cerrar el encargo (§3).
- **Los tres paneles ya están en `index.html`**, dentro de `panelTemplate` (`index.html:571-677`), con clases dedicadas. No hay que crearlos ni decidir su estructura.
- **Los tres paneles ya son contenedores CSS** (`container-type: inline-size` en `styles.css:1158`, `1306` y `3808`). El diseño interno ya reacciona al ancho del panel.
- **Hunt Analyzer y Datos de la cuenta ya usan iconos SVG.** `renderer.js:8592-8597` sustituye los botones de Hunt y el cierre del panel de datos nada más crear el panel.
- **`floatGeometryKey`, `readFloatGeometry`, `saveFloatGeometry` y `setupFloatGeometry`** (`renderer.js:7077-7173`): la geometría ya se guarda por cuenta y por tipo, ya hay arrastre con el ratón, ya hay botón de fijar y botón de restablecer, y ya hay un `resize` que recoloca. **El mecanismo está entero. Lo que está mal es el cálculo.**

Y lo que **no** existe, y hay que decir con todas sus letras porque es el peligro de este proyecto:

- **Capture Log es el único de los tres con emojis.** `index.html:631-636` pone `↺`, `📌`, `⌫` y `×` como texto, y **nadie los sustituye**: la línea 8592-8597 solo toca los de Hunt y el cierre del panel de datos. La biblioteca de iconos existe y a este panel no le llega.
- **La pila tipográfica de los tres paneles está rota.** `styles.css:3592` y `styles.css:3818` piden `"Arial Narrow", "Bahnschrift Condensed", "Roboto Condensed", "Segoe UI"`. De esas cuatro, dos no existen en un Windows normal: **«Roboto Condensed» no viene con el sistema** y **«Arial Narrow» no está en Windows 11**. Lo que se ve en casi cualquier máquina es Segoe UI metida en una pila que la espera condensada, y por eso el texto se ve estrecho y apiñado. Es el motivo de que el encargo pida «mejorar la fuente».
- **`Inter` no está empaquetada.** `styles.css:14` la pide, y no hay **ni un `@font-face` ni un fichero de fuente** en todo el repo. En Windows cae a Segoe UI.
- **El popover de detalle se posiciona a mano.** `renderer.js:3716-3724` mide el `getBoundingClientRect` de la fila y del panel y decide si lo pone abajo o arriba según si cabe. Si la fila está a media lista, salta hacia arriba y se superpone a la fila que tenías delante.
- **Las seis casillas de estadísticas se pintan siempre.** `renderer.js:3700-3707` itera las seis y hace `value ?? '—'`. Cuando el juego no las da, se pintan seis guiones que ocupan un tercio del detalle para no decir nada.

## El techo técnico, dicho antes de nada

**El cristal no puede difuminar el juego.**

Un `<webview>` de Electron se dibuja en una capa de composición separada y `backdrop-filter` **no la alcanza**. No es una preferencia de diseño ni un atajo: es que el filtro no tiene de dónde leer. Los tres `backdrop-filter` que ya existen en el launcher (`styles.css:202`, `1667`, `3034`) están en superficies del propio launcher —la barra lateral, un desplegable, un modal— y **ninguno** está sobre una webview. No hay precedente que diga que ahí sí funcione.

Lo que sí se consigue, y es lo que se entrega: la transparencia se ve en el **tono, el reflejo del borde y la profundidad**. El panel se lee como una capa de vidrio flotando sobre la escena, no como el juego visto a través de un cristal.

Si algún día se quiere ver el juego literalmente desenfocado a través del panel, hay que reescribir la capa del `webview` y sacar el panel de su contexto de composición. Eso es otro proyecto, y no es este.

## Decisiones tomadas

Seis, acordadas antes de escribir esto.

| | Decisión | Por qué |
|---|---|---|
| **D1** | El material es **cristal iOS en modo oscuro**, no el profundo ni el tintado | El launcher es oscuro de raíz, y un panel claro encima de un juego claro es justo donde no se lee |
| **D2** | Al maximizar, el panel **crece hasta un tope del 1,5×** lo guardado | «Que se autoajuste», sin llegar a comerse la pantalla |
| **D3** | El rendimiento entra, pero **solo toca el cuándo y el cuánto**. No se cambia qué se lee ni cómo se interpretan los datos | Es lo que hace falta para que el trabajo por segundo baje, y respeta la restricción de no tocar la lectura |
| **D4** | El detalle de un Pokémon **se expande en la fila** en vez de flotar encima | Nada queda tapado y sigues viendo el contexto. Es el gesto de iOS |
| **D5** | **Segoe UI Variable**, sin añadir ficheros al launcher | Viene con Windows 11, tiene tamaño óptico real y no suma nada al paquete |
| **D6** | Si las seis estadísticas vienen vacías, **no se pinta nada** | Seis guiones ocupan un tercio del detalle para no decir nada. Si el juego las da algún día, aparecen solas |

## El material

Un solo bloque de tokens CSS que los tres paneles comparten. No tres bloques parecidos: si el cristal se define en un sitio, los tres son **el mismo material** por construcción, y mañana se toca una vez.

```css
--glass-bg:    linear-gradient(180deg, rgba(58,68,84,.52), rgba(26,32,42,.62) 55%, rgba(18,22,29,.70));
--glass-edge:  rgba(255,255,255,.22);
--glass-fill:  rgba(255,255,255,.10);   /* filas y baldosas */
--glass-line:  rgba(255,255,255,.08);   /* borde de fila */
--glass-shine: rgba(255,255,255,.13);   /* banda de reflejo */
```

Y una sola regla que los tres paneles comparten:

- `background: var(--glass-bg)`, `border: 1px solid var(--glass-edge)`, `border-radius: 20px`.
- `box-shadow: 0 30px 70px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.16), inset 0 -1px 0 rgba(255,255,255,.05)`.
- `backdrop-filter: blur(30px) saturate(1.7) brightness(1.06)`.
- El reflejo, con un pseudo-elemento: una banda `linear-gradient(180deg, var(--glass-shine), transparent)` en el 44 % superior, con las esquinas superiores redondeadas.

**El detalle de un Pokémon va más denso que el panel**: `rgba(66,78,96,.80)` a `rgba(30,37,48,.88)`, borde al 30 % y `blur(40px)`. Para que se lea por encima del panel sin necesitar un borde grueso que rompa el material.

**Cada panel mantiene su color propio** para lo que significa algo: el verde del dinero y el balance, el ámbar de los suministros, el rojo de eliminar, el azul de la hora. El cristal es el mismo; los acentos no se tocan, porque ya significan algo.

## La tipografía

`"Arial Narrow", "Bahnschrift Condensed", "Roboto Condensed", "Segoe UI"` se sustituye por:

- **`"Segoe UI Variable Display"`** para títulos, cifras grandes y valores de métrica. Ahí es donde se nota: los números de Hunt Analyzer (`857.712`, `+$100.580/h`) ganan la presencia que la pila condensada les quitaba.
- **`"Segoe UI Variable Text"`** para el resto del texto.

Las dos vienen con Windows 11. **No se añade ningún `@font-face` ni ningún fichero de fuente**: cero bytes nuevos en el paquete, y en Windows 10 cae a `"Segoe UI"` sin romperse nada.

**Lo que se pierde y se acepta:** en Windows 10 el resultado es Segoe UI normal, que es lo que ya se ve hoy en la mayoría de máquinas. La mejora se nota en Windows 11. Es el precio de no meter 200 KB en el launcher, y se acepta a conciencia.

## Los iconos

Cinco iconos nuevos en `LAUNCHER_ICON_PATHS`, y con eso se cierra **todo** el encargo:

| Nombre | Sustituye a | Dónde |
|---|---|---|
| `user` | `👤` | Botón de datos de la cuenta (`index.html:584`) |
| `zoomOut` | `−` | `index.html:591` |
| `zoomIn` | `+` | `index.html:593` |
| `expand` | `⛶` | `index.html:595` |
| `collapse` | `↙` | `renderer.js:4757`, cuando el panel está agrandado |

Más los **cuatro de Capture Log** que ya existían en la biblioteca y nunca se conectaron: `refresh`, `pin`, `trash` y `close` en `index.html:631-636`.

Y un emoji suelto más: el `💪` de Fuerza (`renderer.js:3712`), que pasa a `launcherUiIcon('trend')` con el texto `Fuerza 12.345`.

**Un detalle de implementación que hay que respetar:** `renderer.js:4757` asigna con `textContent`, no con `innerHTML`. Para que un botón lleve un SVG hay que cambiarlo a `innerHTML` con `launcherUiIcon(...)`, y hay que hacerlo **en los dos estados** —agrandado y en rejilla— porque esa línea se ejecuta en cada cambio de disposición.

## El arreglo del redimensionado

### El bug, exacto

`applyFloatGeometry` (`renderer.js:7103-7107`) escribe `width`, `height`, `left` y `top` en **estilo inline**. El estilo inline gana a cualquier regla CSS, y el CSS **ya tenía la protección correcta**:

```css
.hunt-float-panel { min-width: min(280px, calc(100% - 14px)); }   /* styles.css:4068 */
```

Esa regla es inútil: el JS la pisa con un número fijo. Y la fórmula del JS tiene dos fallos medidos:

```js
width = Math.min(Math.max(minWidth, guardado), Math.max(minWidth, parentRect.width - 14))
```

1. **El mínimo puede superar al padre.** Ese segundo `Math.max(minWidth, …)` sube el suelo por encima del ancho disponible. Si la cuenta mide 280 px y `minWidth` es 300, el panel mide 300 y no cabe. Y `.panel` tiene `overflow: hidden` (`styles.css:950`), así que **no se sale de la ventana: se recorta**. Es exactamente el síntoma descrito: paneles que dejan de estar pintados en pantalla.
2. **Al maximizar no crece.** `parentRect` crece, pero el `Math.min(…)` exterior con el valor guardado manda, y el ancho se queda en el que se guardó. El panel no se reajusta.

Y `left` y `top` se recortan pero no se reescalan: un panel guardado a la derecha de una ventana ancha queda descoyado al cambiar la proporción.

### El arreglo

1. **El suelo nunca supera al padre.** `minWidth` pasa a ser `Math.min(300, parentRect.width - 14)`, y si aun así no cabe, el panel encoge por debajo de su suelo en vez de recortarse. Lo mismo en alto, con `parentRect.height - 56`.

2. **Crece hasta un tope del 1,5× lo que había medido cuando se guardó.** La geometría guardada es la que hay hoy: píxeles absolutos, un único objeto con `left`, `top`, `width`, `height` y `locked`, en `localStorage` bajo `floatGeometryKey` (`renderer.js:7077-7080`). **No se cambia el formato guardado**, para que las geometrías que la gente ya tiene en su máquina sigan valiendo.

   Para escalarla hace falta un tamaño de referencia, que es lo que hoy no existe y hay que guardar. Se añade `baseWidth` y `baseHeight` al objeto: **los píxeles que el panel tenía la última vez que el usuario lo ajustó a mano o lo fijó con el botón de fijar.** La primera vez que se aplica el arreglo, si el objeto guardado no los tiene, `baseWidth` y `baseHeight` toman el valor de `width` y `height` guardados, que es lo correcto: el usuario aún no ha tocado ese panel.

   Y hace falta un padre de referencia, que es lo que decide si la ventana ha crecido. Se añade `baseParent` con el `width` y el `height` del padre medidos en el mismo instante en que se guardó la geometría.

   Con las dos referencias, al redimensionar:

   ```
   razonX = parentRect.width  / geometry.baseParent.width
   razonY = parentRect.height / geometry.baseParent.height
   ancho  = clamp(geometry.baseWidth  * razonX, minWidth, min(geometry.baseWidth  * 1.5, parentRect.width  - 14))
   alto   = clamp(geometry.baseHeight * razonY, minHeight, min(geometry.baseHeight * 1.5, parentRect.height - 56))
   ```

   Tres techos, en este orden: el suelo, el 1,5× de lo ajustado, y lo que quepa. El primero impide que se corte, el segundo impide que se coma la pantalla, el tercero impide que se salga.

   **`razonX` y `razonY` se calculan por separado.** Con una ventana panorámica que crece solo en horizontal, el panel crece en horizontal y se queda en alto, que es lo razonable.

3. **`left` y `top` se reescalan con la misma razón que el tamaño**, para que un panel no se vaya de su esquina al cambiar la proporción de la ventana. Y después se recortan al padre, como hoy.

4. **`left` y `top` sí los sigue escribiendo el JS, porque tienen que ser absolutos; el tamaño, no.** `applyFloatGeometry` pasa a escribir en estilo inline **solo `left` y `top`**, y el tamaño lo resuelve el CSS con `width: min(Xpx, calc(100% - 14px))` y `height: min(Ypx, calc(100% - 56px))`. Las dos piezas de las que salen `X` y `Y` —el ancho y el alto ya escalados y recortados— se pasan al CSS como propiedades personalizadas (`--float-w`, `--float-h`) desde un único sitio.

   Así la protección que ya estaba escrita en `styles.css:4068` vuelve a servir de algo, y si el padre encoge más de lo previsto, **el CSS recorta antes que el JS**.

   El punto 4 es el que importa de verdad: **mientras el JS escriba el tamaño en estilo inline, el CSS no puede reaccionar.** Quitarle el tamaño al JS es lo que hace que el arreglo sea robusto y no solo parcheado.

5. **El botón de fijar respeta la referencia nueva.** Con `locked === true`, `applyFloatGeometry` deja de escalar y aplica la geometría tal cual, recortada al padre. Hoy es lo que ya hace; se mantiene, y ahora el recorte usa el suelo que nunca supera al padre, así que un panel fijado tampoco puede quedar cortado.

## El detalle de un Pokémon

### Hoy

`capture-detail-popover` es `position: absolute` (`styles.css:1597-1608`) y `renderer.js:3716-3724` lo coloca midiendo rectángulos: prefiere ponerlo debajo de la fila, y si no cabe, por encima. En una fila a media lista **salta hacia arriba y tapa las filas anteriores**. Además el popover **cubre la fila sobre la que se ha pulsado**, porque se ancla a su borde inferior.

### Después

El detalle se inserta como **hermano inmediato de su fila**, dentro del bloque de la fila. No hay posicionamiento manual: no se mide nada, el CSS lo coloca.

- **Solo uno abierto a la vez.** Al pulsar otra fila, el anterior se recoge.
- **Las estadísticas solo se pintan si hay valor** (D6). Si las seis vienen vacías, no se pinta ni el rótulo «Estadísticas exactas no disponibles». Si el juego las da algún día, aparecen solas.
- El bloque de la fila abierta se marca con un fondo y un borde más marcados, para que se vea qué fila está desplegada.

### Lo que esto cambia, dicho claro

**El punto 3 del encargo dice «no cambies la forma en que muestran a los Pokémon y su información».** La información no cambia: mismos datos, mismos nombres, mismos tipos, mismas cifras, mismas casillas cuando hay valor.

**Lo que sí cambia es la forma**, porque D4 lo pide así: la lista se mueve al pulsar. Antes no se movía. Es el precio de que nada quede tapado, y está acordado.

## Rendimiento

**Solo el cuándo y el cuánto. No se toca qué se lee.** Ni `captureLogPanelSnapshotScript`, ni `huntAnalyzerSnapshotScript`, ni la llamada a la API, ni la lectura de tokens, ni una línea de lo que se lee del DOM del juego.

El coste medido: `pollHuntAnalyzers` corre **cada 1.500 ms** (`renderer.js:10165`), y por cada cuenta con el panel abierto inyecta `huntAnalyzerSnapshotScript` (`renderer.js:4239-4443`, 205 líneas) con **26 apariciones de `querySelector`**, una de ellas un `querySelectorAll('*')` sobre el diálogo y otra un `.sort()` que llama a `querySelectorAll('*').length` sobre cada candidato. Con 8 cuentas son 8 scripts de ese tamaño cada 1,5 segundos. Y a eso se le suma la espera de los iconos de los drops, que es el punto donde hay un fallo real y no solo coste (ver la medida 3, más abajo).

**Una precisión para que nadie lo lea como un olvido:** Hunt Analyzer **no habla con la API del juego**. El único `fetch` que inyecta es a `/game/items.json` (`renderer.js:4379`), un catálogo estático de objetos, y va memoizado con `||=` para que salga **una sola vez** por webview. Todo lo demás lo lee del DOM del juego. Por eso no se puede centralizar en un módulo de API como sí se hace con Capture Log: no hay API que centralizar.

Tres medidas:

1. **`pollHuntAnalyzers` de 1.500 ms a 3.000 ms.** Es el único sondeo por debajo de 3.000; los otros cinco (`pollCaptureNotifications` 3.500, `pollCaptureLogs` 4.000, `pollAccountProfiles` 4.000, `updatePanelLiveClocks` 1.000) están fuera de ese rango. En un panel que se lee mirando, nadie nota 300 ms.
2. **Caché del diálogo de Hunt por cuenta.** Si ya se encontró el diálogo, se reutiliza la referencia y **solo se vuelve a buscar si ha desaparecido**. Eso elimina la parte más cara del bucle, que es el `querySelectorAll` sobre todos los candidatos y su `.sort()`.
3. **Un icono lento ya no puede tumbar el panel entero.** Esta medida cambió al medirla, y el fallo real es peor de lo que parecía.

   Lo que se creía: «`hydrateHuntDropIcons` espera 4.000 ms **por icono**, en serie».

   Lo que hay: `hydrateHuntDropIcons` (`renderer.js:4462-4474`) recorre los drops con **`Promise.all`**, o sea **en paralelo**, y el 4.000 ms es un único `withTimeout` que envuelve a la llamada entera (`renderer.js:4651`). **No hay espera por icono.**

   El fallo real está en lo que pasa cuando ese techo se agota. `withTimeout` rechaza, el `catch` de `refreshPanelHuntAnalyzer` (`renderer.js:4653`) pinta `{ ok: false, error }`, y **`renderHuntAnalyzer` nunca llega a ejecutarse** (`renderer.js:4652` está después del `await`). Consecuencia: **si un solo icono tarda más de 4 segundos, Hunt Analyzer deja de mostrar los datos enteros** y se queda con un mensaje de error. Un icono lento borra las nueve métricas.

   El arreglo: **renderizar primero, hidratar después.** `renderHuntAnalyzer` se llama con el snapshot ya leído; la hidratación de iconos se dispara después, sin `await`, y cuando un icono llega se parchea su celda. Si un icono no llega nunca, se queda sin icono y **el resto del panel sigue vivo**. El techo de 4.000 ms se conserva, pero deja de ser una puerta de salida y pasa a ser el límite de una mejora cosmetic.

   Y por qué esto importa más de lo que parece: los iconos vienen de URLs externas de objetos del juego. **Una sola URL lenta tumba el panel entero.** Con el arreglo, solo se pierde ese icono.

### Lo que esto NO arregla, y va escrito para que nadie lo confunda

**El acoplamiento frágil con las clases CSS y el texto del juego sigue ahí, entero.**

Hunt Analyzer no tiene API: el launcher abre el panel del juego, lo esconde, y **lee las tarjetas buscando etiquetas por texto**. `findLabel` busca un texto; si el juego renombra «Sesiones» por «Partidas», la función devuelve la tarjeta equivocada y **enseña un número que no es el de esa métrica**. No falla: miente. Y `readCardValue` puntúa candidatos con una heurística, así que un número mal atribuido es indistinguible de uno correcto.

Capture Log tiene un problema gemelo: la respuesta de la API se interpreta **puntuando objetos** buscando claves como `pokemonname` o `tier`. Si el juego renombra un campo, deja de detectarlo y devuelve menos filas **sin error**.

Ese es el peor modo de fallo que veo en este código, y este proyecto **no lo arregla**. Es un proyecto aparte, con otro nombre y otra spec.

## Pruebas

Cuatro, todas verificables sin el juego.

### La geometría, que es el RED más real

La prueba importa por encima de Electron: **`applyFloatGeometry` y `readFloatGeometry` son funciones puras** salvo por el `getBoundingClientRect()` del padre y el `localStorage`. Se extraen a un módulo sin DOM, se les pasa el rectángulo del padre como dato, y la prueba los llama con números. Por eso esto se prueba con `node` y aserciones, sin lanzar Electron.

**Y el caso más fuerte sale de las constantes del propio código, no de números inventados.** `renderer.js:7101-7102` fija `minWidth` en 300 para Capture Log y 280 para Hunt, y `minHeight` en 250 y 230. Una cuenta estrecha, por debajo de 300 px, es un caso real de uso —una cuenta con la barra lateral abierta y zoom alto la deja así— y con esos números:

```json
{"left":7,"top":49,"width":300,"height":250,"locked":true}
```

en un panel de **280 px de ancho**. Hoy el suelo de 300 gana al padre de 280, y como `.panel` tiene `overflow: hidden`, **el panel se recorta y no está pintado entero**. Ese caso se pone como aserción.

Se comprueban seis cosas:

- con padre de 280 px y geometría de 300, el panel resultante **cabe entero**: `left + width <= parentRect.width`. Hoy falla.
- al **maximizar**, el ancho crece, y se detiene en `baseWidth * 1.5`. Hoy no crece nada.
- al cambiar solo el **ancho** del padre, el alto no cambia (`razonY` independiente).
- al cambiar solo el **alto** del padre, el ancho no cambia.
- `left` y `top` se reescalan y el panel sigue dentro del padre.
- una geometría guardada **sin** `baseWidth` ni `baseParent` —las que ya tiene la gente en su máquina— se aplica sin romperse, tomando `width` y `height` como base.

Las seis tienen que fallar contra el `renderer.js` de hoy, menos la última, que debe pasar antes y después: es la que garantiza que el arreglo no rompe lo que ya está instalado. Esa asimetría es intencionada y hay que comprobarla así.

### El coste de trabajo

Un perfil que cuenta cuántas veces se llama al script de Hunt con 1, 4 y 8 cuentas, y comprueba que a 3.000 ms la carga por segundo es la mitad, y que con 8 cuentas la vuelta **ya no crece linealmente** por el diálogo cacheado.

### Un icono lento no puede tumbar el panel

El RED más valioso de este proyecto, porque **describe un fallo real y no un riesgo futuro**.

Una vuelta de Hunt Analyzer con **un icono que no resuelve nunca**, y las nueve métricas presentes en el snapshot. Hoy el resultado es que el panel **no muestra ninguna métrica**: se queda en el mensaje de error del `catch`. Lo que hay que comprobar es que **las nueve métricas se pintan igualmente**, y que solo ese icono se queda vacío.

Y un segundo caso: **una URL que tarda 10 segundos** pero acaba resuelviendo. Hoy, a los 4 segundos el panel ya está en error y se queda ahí. Después, el panel enseña los datos y, cuando el icono llega, su celda se actualiza sola.

Los dos casos tienen que **fallar contra el `renderer.js` de hoy**.

### Regresión

Las suites de Electron que ya existen, que abren y cierran paneles, más `node scripts\run-tests.cjs node` en verde.

### Lo que no se cubre, dicho claro

**No se mide «va pesado» en condiciones reales.** No hay forma de medirlo sin el juego en marcha y 8 cuentas reales. Lo que se demuestra es que el trabajo por segundo **se reduce a la mitad** y que con 8 cuentas la vuelta deja de crecer linealmente. Que eso se note en la máquina del usuario es algo que solo puede comprobar él, y no se le va a prometer una cifra de FPS que no se ha medido.

## Fuera de alcance

- **El acoplamiento con el DOM y el texto del juego.** Otra spec.
- **El puente central de tokens y API.** Seçamento en un módulo de `main.js`. Descartado: el `fetch` **tiene que** seguir corriendo dentro de la webview, porque la API vive en `poke.idleworld.online`, el launcher corre en `file://`, el CSP no tiene `connect-src` y el token está en el `sessionStorage` de otro proceso. Lo único que se puede es dejar de repetir el patrón, y eso no baja el riesgo.
- **Los 19 usos restantes de `executeJavaScript`.** Hay 26 llamadas en `renderer.js` y 7 tocan estos dos paneles (`renderer.js:3119`, `3854`, `3922`, `4650`, `4682`, `7709`, `8818`). Se deja un inventario escrito de las 19, no se migra ninguna.
- **El resto de la interfaz del launcher.** Solo los tres paneles y la barra de cada cuenta.

## La regla que este proyecto no rompe

**Ninguna prueba puede pasar con lo que debería fallar.** Es la comprobación floja más repetida de este repo, y la que más veces ha dado por bueno un arreglo que no arreglaba nada. En concreto:

- La prueba de geometría tiene que **fallar contra el código de hoy**. Si pasa contra `renderer.js` sin modificar, la prueba está mal.
- El perfil de coste tiene que comprobar **una cifra concreta**, no que «baja un poco».
- Toda comprobación que afirme que algo «ya no se toca» tiene que **buscar la cadena en el fichero** y fallar si aparece. Una comprobación que no aplica no es una comprobación: es decorado.
