# Guía de funciones

## Panel principal multicuentas

La instancia principal abre de uno a treinta y dos webviews persistentes (una por cuenta configurada). Cada panel tiene sesión, cookies, zoom, recarga, expansión, Hunt Analyzer y Capture Log independientes. Ocultar una cuenta mediante **Modo vista** no cierra su proceso ni interrumpe el juego.

La cuadrícula adapta sus columnas al número de cuentas: 1 cuenta → 1 columna; 2–4 → 2 columnas; 5–9 → 3 columnas; 10 o más → 4 columnas.

## Perfiles de sesión

Hasta la 0.36.0 todas las ventanas del launcher compartían una sola sesión de navegador. Desde la
0.37.0 cada ventana trabaja en un **perfil**, que es una sesión con nombre.

- Las ventanas del **mismo perfil** comparten lo que tengas iniciado dentro.
- Las ventanas de **perfiles distintos no se ven entre sí**: ni cookies, ni almacenamiento, ni sesión.
- Eso es lo que permite tener dos cuentas del mismo sitio a la vez.

### Crear y editar

Desde el botón **Perfiles** del menú. Cada perfil tiene:

| Campo | Descripción |
|---|---|
| Nombre | Libre, hasta 40 caracteres. El perfil Principal no se renombra. |
| Avatar | Uno de **132** Pokémon de PokéAPI, o ninguno (entonces sale la inicial del nombre). |
| Color | Sin fondo, diez colores planos o doce degradados. |

El botón **+** crea un perfil nuevo y abre su campo de nombre con el cursor encima. El avatar se
**baja solo al abrir el selector**, nunca al arrancar el launcher: la rejilla se llena en tandas de
ocho, cada imagen en su celda al llegar, y se puede seguir usando el gestor mientras tanto. Una
especie sin sprite deja una inicial apagada, no un hueco.

### Dónde se aplica

Cada ventana —la principal y cada instancia de navegador— tiene su propio perfil, y se cambia desde
sus ajustes o desde el modal de crear instancia. **Cambiarlo reinicia las pantallas de esa ventana**,
así que el launcher **avisa antes**, indicando de qué perfil a cuál y recordando que habrá que volver
a entrar en los sitios donde estuvieras conectado. Cancelar deja el aviso pendiente.

Un perfil no se puede borrar si alguna ventana lo está usando: el almacén lo sabe porque compara por
partición, no por nombre.

### Dónde se ve

- **En la cabecera del menú**, el nombre del perfil de la pestaña activa y su círculo. Con varias
  ventanas de perfiles distintos abiertos es la única forma de saber en cuál de ellas estás, y el
  botón entero abre el gestor.
- **En el desplegable del modal de crear instancia**, con su círculo al lado. Crear perfiles **no** se
  hace desde ahí: aquí se elige con qué perfil se abre una ventana, y crear un perfil es decidir cómo
  se llama una sesión que tendrá las suyas.

El color vive **en el perfil**, no en la barra de pestañas: en la barra manda el nombre.

## Menú lateral y barra superior

El botón hamburguesa abre un panel lateral flotante. El panel se superpone a la cuadrícula, por lo que no reduce ni desplaza las ventanas del juego, y cada acción utiliza un color identificativo con estilo flat. La barra superior completa también puede ocultarse y ambos estados se conservan al reiniciar.

La cabecera del menú **no es un título**: dice el perfil de la pestaña activa, con su círculo, y el
botón entero abre el gestor.

El menú contiene:

- **Modo farmeo:** objetivos recomendados según los datos detectados.
- **Pokepedia:** ventana independiente para consultas.
- **Scripts:** administración de userscripts por cuenta.
- **Notificaciones:** capturas, metas, shinies y legendarios.
- **Cuentas:** configuración y cifrado de credenciales.
- **Perfiles:** perfiles de sesión del navegador.
- **RAM:** limpieza segura de cachés controladas por el launcher.
- **Iniciar todas:** inicia o recupera las cuentas configuradas.
- **Recargar todas:** recarga escalonada para reducir picos y desconexiones.
- **Modo vista:** decide qué paneles se muestran en la cuadrícula.
- **Configuraciones:** atajos, zoom, ajustes por instancia, perfil de sesión y **actualizaciones del launcher**.

> El botón de actualizaciones salió del menú en la 0.39.0 y está dentro de Configuraciones, que es
> donde cabe el botón de buscar, el aviso de si hay algo y qué versión es, y el de descargar. En el
> menú solo había un botón que al pulsarse empezaba a descargar 60 MB sin decir nada.

## Instancias de otros juegos

El botón `+` de la barra de pestañas crea una instancia de navegador. El usuario define nombre, enlace HTTPS, cantidad de pantallas (de 1 a 6) y **perfil de sesión**. Cada pantalla mantiene almacenamiento separado y las instancias reaparecen al abrir nuevamente el launcher.

Se admiten hasta **12 instancias** adicionales. El desplegable de perfil enseña el círculo del perfil elegido; crear perfiles se hace en el gestor, no aquí.

## Administración de cuentas

Admite de **1 a 32 perfiles** para Poke Idle World en la misma instalación. Las credenciales se cifran con `safeStorage`/DPAPI y solo se completan en la página oficial de acceso.

### Añadir, eliminar y reordenar cuentas

- El botón **+ Añadir cuenta (IP/VPN propia)** crea una fila nueva; el tope es 32 por memoria (cada webview carga el juego completo).
- Cada cuenta conserva su **identidad estable**: aunque se añadan o eliminen otras, la partición de cookies y sesión de cada una no cambia.
- Al eliminar una cuenta, el launcher pide confirmación y avisa de que el historial de esa posición (Capture Log, metas, notificaciones) pasará a la cuenta que ocupe ese lugar. Eliminar una cuenta intermedia **reasigna el historial**: el registro de la posición desplazada queda ligado a otra cuenta, así que tenlo en cuenta antes de borrar. Si la cuenta que eliminas es la última de la lista, el aviso lo dice en vez de nombrar a nadie.
- Al cambiar el proxy de una cuenta que ya está cargada, el launcher recarga solo esa sesión: las conexiones ya abiertas seguirían saliendo por la IP anterior.
- La barra del panel muestra una etiqueta **VPN** mientras la cuenta usa proxy, con el protocolo y el destino en el tooltip (por ejemplo `SOCKS5 · 127.0.0.1:1080`). Si el proxy no llegó a aplicarse, la etiqueta se oculta y el motivo aparece en la barra de estado del panel, para que la etiqueta y el error no se contradigan.
- La importación por plantilla `.txt` admite de 1 a 32 secciones `[CUENTA N]` consecutivas. Al re-sincronizar un archivo vinculado, las identidades existentes se conservan por posición para no perder sesiones.
- El archivo `.txt` vinculado **no se relee solo**. Se sincroniza cuando pulses **Sincronizar ahora**, en el modal de cuentas. Antes se comprobaba cada 15 segundos, lo que recargaba las cuentas sin que nadie hubiera tocado nada y releía doscientas veces por hora un archivo con contraseñas en texto plano. Si al pulsar el botón el archivo ya no está donde estaba, el modal lo dice.

### VPN / IP distinta por cuenta

Cada fila del modal **Cuentas** incluye la sección plegable **VPN / IP distinta**, con estos campos:

| Campo | Descripción |
|---|---|
| Protocolo | `http` o `socks5`. |
| Host | Dirección del proxy (p. ej. `127.0.0.1`). |
| Puerto | Puerto local del proxy (1–65535). |
| Usuario / Clave | Opcionales; solo si el proxy exige autenticación. |

El proxy se aplica únicamente a la sesión de esa cuenta: las demás cuentas y las instancias de otros juegos conservan su conexión normal. Si los datos son inválidos, el launcher desactiva el proxy en vez de romper el arranque, y tras guardar muestra cuántas cuentas no pudieron aplicarlo.

**Con VPN gratuita (V2RayN / Clash Verge):**

1. Instala [V2RayN](https://github.com/2dust/v2rayN) o [Clash Verge](https://github.com/clash-verge-rev/clash-verge-rev) y añade un nodo gratuito de confianza.
2. Habilita el proxy local (puerto *mixed* o SOCKS/HTTP en `127.0.0.1`).
3. Para usar una IP distinta por cuenta, ejecuta una instancia adicional del cliente con otro puerto local (o usa varios clientes), cada uno apuntando a un nodo diferente.
4. En el launcher, escribe `127.0.0.1` y el puerto correspondiente en la fila de cada cuenta.

El launcher es genérico: cualquier proxy `http`/`socks5` funciona igual, incluidos proxies residenciales o datacentro de pago.

## Centro de scripts

Permite crear, importar, editar, validar, activar y asignar userscripts a cuentas concretas. Los archivos `.js` y `.user.js` pueden arrastrarse al panel para instalar o actualizar su copia. La vista informa permisos y dominios declarados antes de guardar.

La pestaña **Shop online** consulta el catálogo oficial publicado en un repositorio separado. Presenta versión, autor, descripción, categoría, etiquetas, permisos y cambios de cada script. Permite instalar, verificar actualizaciones y desinstalar. Todas las descargas se limitan al repositorio oficial y deben coincidir con el SHA-256 publicado antes de guardarse. Las actualizaciones conservan las cuentas seleccionadas y el estado activo del usuario.

Los userscripts personales almacenados junto al código fuente no se publican en este repositorio.

## Hunt Analyzer

Lee la sesión activa sin duplicar temporizadores y presenta:

- Pokémon derrotados y derrotados por hora.
- Duración y estado en vivo.
- XP total y XP por hora.
- Capturas, shinies y legendarios.
- Botín, suministros y balance.
- Drops con cantidad, icono y valor.

## Capture Log y notificaciones

Capture Log conserva capturas detectadas por cuenta y permite filtrarlas. El centro de notificaciones combina eventos de todas las cuentas y admite metas por Pokémon, IV, tier y cantidad.

## Estadísticas generales

La vista **Resumen por cuenta** muestra colores diferenciados, datos del perfil, ubicación, objetivo de hunt, rendimiento y drops. La vista **Comparación de Hunt** ordena las cuentas y destaca balance, XP/h, botín/h, capturas y derrotados/h.

## Modo farmeo

Combina el equipo detectado, nivel, tipos, mapas disponibles y requisitos. Los filtros permiten buscar por nombre, región, tipo, nivel, matchup y variante shiny. El modo no inicia viajes sin la acción o autorización correspondiente del usuario.

## Pokédex

Se abre en una ventana independiente a pantalla completa para no reducir el espacio de la cuadrícula principal. Conserva una partición propia y controles de minimizar/cerrar.

## Barra de pestañas

La barra de pestañas lleva una por ventana abierta: la principal y cada instancia. Cada pestaña se
ajusta a su nombre, con un máximo de 20 caracteres antes de recortarse.

- La **X** de cerrar va a la derecha, con su propio cuadro y fondo: pegada al final del nombre se
  leía como parte del texto.
- Se puede **arrastrar** para reordenar; la pestaña principal no se mueve.
- **Alt** + flechas reordena sin ratón.
- El botón `+` crea una instancia nueva.

## Gestión de memoria

El botón RAM limpia únicamente cachés visuales regenerables y estructuras internas que no están abiertas. No fuerza el recolector de basura sobre webviews, no adjunta el depurador y no borra cookies, localStorage, IndexedDB ni sesiones.

## Conectividad

Las recargas múltiples se escalonan. Cada panel cuenta con límites de reintento, tiempos máximos y recuperación separada para evitar que una cuenta bloqueada afecte a las demás. Las instancias permanecen activas en segundo plano.

## Actualizador

Desde la 0.39.0 el actualizador son **dos botones** dentro de **Configuraciones**, no uno en el menú:

- **Buscar actualización** solo mira. No instala, no pregunta por instalar y no puede cerrar el
  launcher.
- **Descargar actualización** sale apagado hasta que se ha confirmado que hay algo. Con un solo botón
  no había forma de saber si había actualización sin pulsarlo, y pulsar era descargar 60 MB.

El texto dice si estás al día o qué versión hay, con color: gris si no se ha comprobado todavía,
verde si estás al día, ámbar si hay algo. **No dice «estás al día» antes de haber comprobado**: el
sondeo va por red y tarda, y durante ese rato no se sabe nada.

El launcher **comprueba solo** al arrancar y cada seis horas. El aviso se ve en el botón de
Configuraciones y en el panel de notificaciones, y **no se apaga al mirarlo**: sigue hasta que la
actualización se instala de verdad. Un arranque sin conexión tampoco lo apaga.

Al descargar se **pregunta antes**, indicando la versión instalada y la disponible. El ZIP y su
`.sha256` se guardan **en la carpeta que contiene la del launcher**, no en Descargas: con el launcher
en `D:\Juegos\PokeGrid-Launcher\`, quedan en `D:\Juegos\`. Sin empaquetar, o si esa carpeta no existe
o no se puede escribir, se usa Descargas.

Después de validar el SHA-256, la nueva carpeta portátil se despliega ahí, se cierra el proceso
anterior, se intenta abrir la versión nueva hasta tres veces y se espera una confirmación de su
ventana. La versión anterior solo se elimina después; si falla, se restaura y se vuelve a abrir.

> **Se retiró el atajo automático.** El script `vpn-per-account.cjs`, que levantaba una instancia
> de v2ray por nodo, ya no está en el proyecto: la aplicación nunca lo llegaba a invocar, y solo
> servía quien lo ejecutara a mano desde la consola. El proxy por cuenta de más arriba sigue igual,
> y la forma de alimentarlo es la de siempre: un V2RayN o un Clash Verge con un puerto local por
> cuenta. Se quitó en la 0.33.0.
