# Instancia como navegador — diseño

Fecha: 2026-10-15
Versión prevista: 0.28.0

## Qué quiere

Que una instancia pueda comportarse como un navegador, no solo como «una copia del mismo juego con
cookies propias». Tres cosas:

1. Al crearla, poder elegir que arranque en un **buscador** en vez de en una URL fija.
2. Una **barra de direcciones** por panel, para ir a cualquier página y cambiar la de inicio.
3. Que un enlace que pide **pestaña nueva** abra un panel dentro de la misma instancia, con su misma
   sesión, en lugar de salirse del launcher.

Y dos cosas que se hacen al pasar: ocultar el botón de agrandar cuando la instancia tiene una sola
pantalla, y el desplazamiento de la barra de pestañas cuando no caben. Esas son una entrega aparte.

## Decisiones tomadas

| Decisión | Valor | Por qué |
|---|---|---|
| Dónde se abren los enlaces | Automático, con interruptor por instancia | Un enlace normal es una pestaña; una ventana con medidas propias es un inicio de sesión. Automático lo decide, y el interruptor deshace la decisión. |
| De dónde parte la instancia | Desplegable: buscador o URL | Con buscador, el enlace deja de ser obligatorio. |
| Dónde va la barra | Solo en instancias de estilo navegador | Los juegos siguen con nombre y estado, sin cambios. La barra principal de Poke Idle World no se toca. |
| Qué lleva la barra | Atrás, adelante, recargar, dirección, inicio | Lo mismo que un navegador. Atrás y adelante se puts grises sin historial. |
| Tope de paneles | 12, reciclando el de enlace más viejo | Nunca se recicla un panel original: son tus cuentas. |
| Qué se recuerda | La dirección escrita pasa a ser el inicio | Lo pidió explícitamente. |
| Ventanas emergentes | **Se conservan** | Las sesiones de inicio de sesión las necesitan. |

## Modelo de datos

Una instancia guarda, además de lo de hoy:

```js
{
  id, name, url, count,          // lo de ahora
  navegador: false,              // ¿tiene barra de direcciones?
  buscador: 'ddg',               // 'ddg' | 'google' | 'bing'
  inicio: url,                   // dirección de partida actual
  apertura: 'auto'               // 'auto' | 'panel' | 'ventana'
}
```

Y cada panel:

```js
{
  instanceId,
  origen: 'inicial' | 'enlace',  // decide si se puede reciclar
  url, zoomLabel, webview, ...
}
```

**Migración.** Las instancias que ya existen pasan a `navegador: false`, `buscador: 'ddg'`,
`inicio: url`, `apertura: 'auto'`. No se reescribe `localStorage`: los valores por defecto se aplican
al leer, y un cambio se guarda con el registro completo. Una instancia vieja se ve igual que antes,
salvo en el punto que se dice ahora mismo.

**Consecuencia que hay que saber.** `apertura: 'auto'` cambia el comportamiento de las instancias que
ya tienes: un enlace con `target="_blank"` que antes salía en ventana aparte ahora sale en un panel.
Los juegos casi nunca abren enlaces, así que en la práctica no se nota; y para volver al
comportamiento anterior está el interruptor, puesto en «siempre ventana aparte».

## La barra

Solo si `instancia.navegador`. En la franja del panel, sustituyendo al nombre y al estado:

```
[←] [→] [⟳]   [ la dirección por aquí……................ ]   [🏠]
```

- **← / →** — `webview.canGoBack()` / `goBack()`, igual por delante. Se ponen grises cuando no hay
  historial, y se refrescan con `did-navigate` y `did-navigate-in-page`.
- **⟳** — el recargar que ya existe.
- **Dirección** — muestra `webview.getURL()`. Con **Ctrl**+**L** coge el foco, **Intro** navega,
  **Escape** lo suelta.
- **🏠** — a `instancia.inicio`: la página del buscador si es de estilo navegador, su URL si no.

En pantalla completa la franja sigue la regla de ahora: al 18 % de opacidad hasta que pasa el ratón.

### Qué pasa al escribir

Si lo escrito parece una dirección, se navega. Si no, se busca.

- empieza por `http://` o `https://` → dirección
- o tiene un punto y ningún espacio, y `new URL()` la entiende → se le pone `https://` si falta
- cualquier otra cosa → búsqueda en el buscador elegido

Motores: DuckDuckGo (`https://duckduckgo.com/?q=`, por defecto porque no mete diálogo de cookies que
se coma media pantalla), Google y Bing.

### Qué se guarda

La dirección con la que se navega pasa a ser `instancia.inicio` y se guarda. Queda explícito para que
no se preste a debate: **si la instancia tiene varios paneles, se actualiza el inicio y todos sus
paneles originales abrirán esa página la próxima vez**. Los paneles abiertos por enlace no cambian.

## Los enlaces

### El reparto

El proceso principal es quien recibe la petición de abrir una pestaña. Hoy decide él mismo:
permite la apertura y deja que Electron cree la ventana, y si no puede, la manda al navegador del
sistema.

Ahora decide así:

| Modo de la instancia | Enlace normal (`target=_blank`, sin medidas) | Ventana con medidas propias |
|---|---|---|
| `auto` | **panel** en la instancia | **ventana aparte**, como ahora |
| `panel` | panel | panel |
| `ventana` | ventana aparte | ventana aparte |

Electron distingue los dos casos: una ventana creada con `window.open(url, nombre, 'width=…, height=…')`
llega con esas medidas dentro de `features`; un enlace `target="_blank"` llega sin nada. **Se cuenta como
ventana cuando trae `width` o `height`** en `features`, y como pestaña en cualquier otro caso.

Y en los dos casos, si no se puede abrir la ventana —se llega al tope de seis ventanas abiertas, o
el destino no es una dirección web—, se cae al navegador del sistema. Esa red de seguridad no se
toca: es lo que permite que «iniciar sesión con X» siga funcionando.

### El flujo de un panel

```
la página pide pestaña
   └─ el proceso principal lo rechaza y avisa al renderer: «instancia X quiere abrir Y»
        └─ el renderer cuenta los paneles de esa instancia
             ├─ hay hueco        → crea un panel con origen 'enlace' y la carga
             ├─ hay 12 y alguno 'enlace' → lo recicla: lo navega a la URL nueva
             └─ hay 12 y ninguno 'enlace' → avisa en la barra y no abre
```

El panel nuevo usa la **misma partición** que el resto de la instancia, así que las cookies y la
sesión están ahí: es lo que hace que servir dentro del launcher tenga sentido.

**Quién decide.** La política vive en el renderer, que es quien sabe el modo de cada instancia y
quién tiene los paneles. El proceso principal le pregunta antes de responder: `setWindowOpenHandler`
admite una respuesta asíncrona, así que se consulta el modo y se devuelve la decisión. Si el renderer
no contesta, se cae al comportamiento de hoy —ventana aparte—, que es lo que ya funcionaba.

## Lo que hay que cambiar

| Fichero | Qué |
|---|---|
| `src/index.html` | El desplegable buscador/URL, el buscador y el interruptor de apertura, en el modal de «Agregar otro juego». La franja de la barra no es nueva: sustituye a la del nombre. |
| `src/renderer.js` | La barra, la navegación, el estado de atrás/adelante, el reparto de paneles y su reciclaje, y la persistencia del inicio. |
| `src/main.js` | La consulta del modo de apertura en `setWindowOpenHandler` y el aviso de «esta instancia quiere abrir tal cosa». |
| `src/preload.js` | Los dos canales nuevos. |
| `src/styles.css` | La barra y sus estados. |

## Bordes

- **La página no carga.** El panel muestra su error y la barra se queda con lo que escribiste, para
  poder corregirlo sin volver a escribirlo. Es lo que hace un navegador.
- **Destino que no es web** (`mailto:`, `steam://`, protocolos de otra aplicación). Va al sistema: una
  webview no puede abrirlos. Igual que hoy.
- **Tope de ventanas.** Seis ventanas, como ahora. Lo que no cabe, al navegador del sistema.
- **Enlace que pide pestaña desde una instancia de juego.** Funciona igual: se le aplica el mismo
  reparto. Solo la barra es exclusiva del estilo navegador.
- **Reciclar un panel de enlace.** El panel se navega a la URL nueva en vez de cerrarse y abrir otro,
  para no perder la posición ni la sesión de esa pestaña.
- **Cerrar un panel.** Ya se puede; un panel «de enlace» se cierra sin más, y uno original también.
  Lo que no se puede es quedarse sin paneles: no baja de los que la instancia creó.

## Pruebas

`tests/instancia-navegador-smoke.js`, del área, con el launcher de verdad.

- La barra existe en las instancias de estilo navegador y **no** en las de juego, ni en la principal
  de Poke Idle World.
- Escribir una dirección lleva a esa página; escribir texto busca en el buscador elegido.
- Atrás y adelante se puts grises sin historial y funcionan con él.
- El botón de inicio va al buscador en modo navegador y a la URL en modo juego.
- Un enlace que pide pestaña nueva abre un panel **en esa instancia**, con su misma sesión: se
  comprueba con una cookie sembrada antes, como se hizo con las ventanas emergentes.
- Al llegar a doce, se recicla el de enlace más viejo y no uno original.
- La dirección escrita se guarda como inicio y vuelve al reiniciar.
- Con el modo «siempre ventana aparte», una ventana de esas medidas sale en ventana, no en panel.

`tests/ipc-sender-guard-smoke.js`, con los canales nuevos clasificados.

`verificar-paquete.cjs`, con las invariantes del área dentro del paquete.

### Lo que no se puede probar

Una pestaña nueva la pide la página, y eso hay que provocarlo. Se puede con una página de prueba
local que tenga un enlace con `target="_blank"`: eso es un enlace de verdad, no un `executeJavaScript`
que llame a la función del launcher. Lo que no se puede fabricar es que **el usuario** pulse.

## Fuera de esta entrega

- **Iconos de las webs en las pestañas.** Bloque siguiente. Necesita un puente del invitado al
  renderer para traer el icono de cada sitio.
- **Flechas de desplazamiento en la barra de pestañas**, para cuando no caben. Bloque siguiente.
- **Quitar el texto del logo** dejando solo el icono, y **ocultar «agrandar panel»** cuando hay una
  sola pantalla. Es pequeño, pero el segundo choca con esta barra: hay más botones y esconder uno
  tiene más sentido después. Bloque siguiente.