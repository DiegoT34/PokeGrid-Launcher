# El launcher como navegador, del todo

**Fecha:** 2026-10-15
**Estado:** aprobado en conversación, pendiente de revisión escrita
**Continúa:** `2026-10-15-instancia-navegador-design.md` (0.28.0, ya entregada)

## Por qué existe

La 0.28.0 convirtió las instancias en pantallas con barra de direcciones y repartió los enlaces que
piden pestaña nueva dentro de la propia instancia. Salió con dos huecos grandes: el icono de cada web
no aparece en su pestaña, la barra de pestañas no se puede desplazar cuando no caben, y —lo más
importante— al reabrir el launcher cada pantalla vuelve a la URL con la que se creó la instancia, no
a la página en la que el usuario se había quedado.

Además el modelo de «modo navegador» se había quedado a medio camino: se llamaba así porque sí, pero
seguía pidiendo una URL y no era una alternativa real al modo instancia. Y quedaban tres cosas
sueltas de la entrega anterior: el texto del logo, la posición del engranaje de ajustes y una casilla
de ventanas emergentes que el usuario no debería tener que decidir.

## Lo que se pide

1. El icono de la web en la pestaña de su instancia.
2. Flechas para desplazar la barra de pestañas cuando no caben.
3. Reanudar cada pantalla donde el usuario se había quedado.
4. Dos modos al crear una instancia: navegador e instancia.
5. Ventanas emergentes siempre activas, sin casilla.
6. Fuera el texto del título, solo el logo.
7. El engranaje de ajustes al panel de botones.
8. El motor de búsqueda en los ajustes, no al crear la instancia.

## Lo que NO entra aquí

**Las contraseñas que persisten.** Chromium no guarda contraseñas dentro de un webview de Electron:
no hay interfaz de gestor de contraseñas, así que no hay nada que activar. Habría que hacerlo
nosotros —capturar el envío del formulario, cifrarlo con el almacén seguro de Electron y rellenarlo al
volver— y eso tiene implicaciones de seguridad que merecen su propio diseño y su propia revisión.
Queda anotado aquí para que no se pierda, y es el paso siguiente a este.

## El modelo de datos

La instancia gana `modo`, con dos valores: `navegador` e `instancia`. El campo `navegador` (booleano)
desaparece de los registros nuevos; el que hay guardado se traduce al leerlo, sin reescribir nada:

- `navegador: true` → `modo: 'navegador'`
- `navegador: false` o ausente → `modo: 'instancia'`

Se quedan como están `buscador`, `inicio` y `apertura`. Lo que cambia es dónde se editan: `buscador`
y `apertura` pasan del modal de creación a los ajustes, porque son cosas que se cambian después de
crear la instancia, no al crearla.

### Modo navegador

Navegación normal. Cada pantalla lleva su propia barra con atrás, adelante, recargar, dirección e
inicio. No hay URL fija: arranca en el buscador elegido y de ahí se navega a donde sea. Es lo que
permiten las pestañas que abren enlaces dentro de la instancia.

### Modo instancia

Una sola URL y nada más. Todas las pantallas cargan esa URL directamente y **no llevan barra**. Es
una instancia de juego: cuatro cuentas del mismo juego, cada una con su sesión, y la URL es la del
juego. Los enlaces que piden pestaña nueva abren igualmente un panel dentro de la instancia, como en
modo navegador —compartiendo la sesión de la pantalla de la que salieron—; lo que no hay en este modo
es la barra con la que cambiar de sitio a mano.

Lo que cambia de verdad entre modos es la barra y el punto de partida. El reparto de enlaces no cambia:
ya es el mismo en los dos, y así se pidió.

## El modal de creación

Cuatro campos: nombre, modo, pantallas y —solo en modo instancia— el enlace HTTPS.

Al elegir modo navegador, el campo de enlace se esconde y deja de ser obligatorio. Al elegir modo
instancia aparece y es obligatorio. El motor de búsqueda y el reparto de enlaces no están aquí: van a
los ajustes.

Las instancias que ya existen no se tocan. Abren en el modal con su modo y su enlace puesta.

## El panel de ajustes

Hoy es global: guarda el atajo de pantalla completa para todas las instancias, y no sabe de qué
instancia se trata. Con los ajustes por instancia dentro, hace falta un selector.

Arriba, el atajo, que es global como hasta ahora. Debajo, un selector «Ajustes de» con la lista de
instancias. Al elegir una aparecen sus dos ajustes:

- **Motor de búsqueda** — solo en modo navegador. En modo instancia no tiene sentido y no se muestra.
- **Los enlaces nuevos se abren** — `auto`, `panel` o `ventana`, con la explicación que antes estaba
  bajo la casilla de ventanas emergentes.

El engranaje se mueve del final de la barra de pestañas al final del menú principal. Sigue abriendo lo
mismo.

## Ventanas emergentes

Fuera la casilla, y fuera con ella todo el mecanismo: el canal de IPC que la activaba, la clave de
`localStorage`, la función que la leía y la variable del proceso principal. Las ventanas emergentes
están siempre activas porque no hay ningún caso en el que tenerlas apagadas sirva de algo: los inicios
de sesión con Google y las pasarelas de pago las necesitan, y apagarlas solo rompe cosas.

El tope de seis ventanas se queda igual, con su salida al navegador del sistema para lo que no cabe.
Ese tope es lo único que impide que una página con anuncios en bucle se coma el escritorio.

## Los iconos de las pestañas

El icono va en su pestaña, en el sitio donde ahora hay un anillo. La pantalla principal de Poke Idle
World conserva su icono propio.

**Cómo se consigue, y por qué tiene que ser así:** la página del launcher tiene una CSP con
`img-src 'self' data: https://poke.idleworld.online https://pokexguides.com`. Un `<img>` con la
dirección del icono de otra web queda bloqueado, punto. Por eso el icono lo descarga el proceso
principal y lo pasa como `data:`, que sí está permitido. No es una decisión de estilo: la CSP obliga.

El camino:

1. El preload de instancia, que ya existe, lee `<link rel~="icon">` de la página en la que está y se
   lo dice al renderer con `sendToHost`. No hace falta ir a buscarlo con una ida y vuelta, porque el
   preload ya está dentro de la página.
2. El renderer pide el icono al proceso principal.
3. El proceso principal lo descarga con `net.fetch` —que es de Electron, no una dependencia nueva—,
   comprueba que sea una imagen y que no pase de 256 KB, y lo devuelve como `data:`.
4. Se cachea por origen para no volver a descargarlo en cada cambio de pestaña.

Si la web no declara icono, o el descarga falla, se queda el anillo de ahora. Un icono que no se
puede ver es peor que no tener icono.

**Un icono por instancia, tomado de una pantalla original.** No de un panel de enlace, que se recicla: el
icono de un enlace que se abrió un momento no describe la instancia. Cuando una pantalla original navega
a otra página, el icono de la pestaña se actualiza a esa página, y si hay varias, gana la última que
navegó.

## Las flechas de la barra de pestañas

Dos botones `‹` y `›` a los lados de la lista de pestañas, que desplazan una pestaña cada vez. Solo se
muestran cuando hay más pestañas de las que caben; con cuatro o menos no se ven, que es el caso
normal.

## Reanudar donde lo dejaste

Cada pantalla recuerda la página en la que estaba y vuelve a ella al reabrir el launcher. Es lo que
llamamos datos de navegación, y no tiene nada que ver con cookies ni con caché: eso ya se guarda solo,
porque cada pantalla tiene su partición persistente.

Se guarda en el launcher, en clave por instancia y por número de pantalla. **Solo la recuerdan las
pantallas originales de la instancia.** Una pantalla que se abrió por enlace se recicla y no puede
guardar su dirección: si lo hiciera, la siguiente pantalla original perdería la suya.

La dirección guardada es la real de la webview, no la que se escribió en la barra. Si la página se
ha movido, es lo que hay.

Y si la página guardada ya no carga —la web cayó, el sitio cambió—, se cae a la URL de la instancia
sin más. Perder una pantalla por una dirección caduca sería peor que empezar de nuevo.

## La cabecera y el engranaje

De la cabecera se va el texto «IDLE POKE LAUNCHER» y el contador de cuentas y juegos. Se queda solo el
logo, con su nombre accesible para quien usa un lector de pantalla.

El título de la ventana del sistema no se toca: es otra cosa y no es la que está señalada.

El engranaje pasa al final del menú principal, debajo de «Modo vista».

## Decisiones, con su coste

**El motor se edita en los ajustes y no al crear.** Pedido así. El coste es que se crea una instancia
de navegador y hay que ir a los ajustes a cambiar el motor, y que hasta entonces va con DuckDuckGo.

**Los enlaces de una instancia se abren en panel, en los dos modos.** Elegido a mano. El coste es que
un juego con muchísimos enlaces puede llenar los doce paneles antes de que el usuario vea una ventana
independiente. El tope y el reciclado están para que eso no se vaya de las manos.

**El icono se descarga desde el proceso principal.** La CSP lo obliga. El coste es un icono en la
memoria del proceso principal, que se tira al cerrar: la próxima vez se descarga otra vez.

**Las contraseñas no entran.** Es la parte con más riesgo de seguridad de todo lo que ha salido en
esta sesión, y mezclarla con esto la dejaría medio pensada.

## Las pruebas

Una por bloque, y solo del área que se toca:

- El modelo: los dos modos, la traducción de lo que ya está guardado, y que una instancia normal no
  cambie de comportamiento.
- El modal: que en modo navegador el enlace deje de ser obligatorio y se esconda, y que en modo
  instancia siga siendo obligatorio.
- Los iconos: que se pida el icono, que se acepte una imagen y se rechace lo que no lo sea, y que una
  web sin icono no rompe nada.
- Las flechas: que la barra se desplaza y que no aparecen cuando todo cabe.
- Reanudar: que una pantalla vuelve a su página, que una que se abrió por enlace no pisa la de la
  original, y que una dirección caducada no rompe el arranque.
- Las emergentes: que siguen abriéndose, que el tope de seis sigue cortando, y que ya no hay casilla
  ni interruptor en ningún sitio.

## Lo que se descarta

- **Caché de iconos en disco.** Se cachea en memoria. En la próxima ejecución se descargan otra vez,
  que es lo que hace cualquier navegador con la primera visita a cada web.
- **Historial y marcadores.** No se han pedido. Lo que se ha pedido es volver al sitio donde se estaba.
- **Gestor de contraseñas.** Fuera, por lo de arriba.
- **Que el modo se pueda cambiar después de crear la instancia.** No se puede. Cambiar de modo cambia
  lo que es la instancia —una cosa con barra y una URL libre, o una cosa con URL fija y sin barra— y
  eso merece su propio diseño.