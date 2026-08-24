# Guía de funciones

## Panel principal multicuentas

La instancia principal abre cuatro webviews persistentes. Cada panel tiene sesión, cookies, zoom, recarga, expansión, Hunt Analyzer y Capture Log independientes. Ocultar una cuenta mediante **Modo vista** no cierra su proceso ni interrumpe el juego.

## Menú lateral y barra superior

El botón hamburguesa abre las herramientas del launcher. La barra completa puede ocultarse para evitar que cubra paneles y ventanas. Su estado se conserva al reiniciar.

El menú contiene:

- **Modo farmeo:** objetivos recomendados según los datos detectados.
- **Pokepedia:** ventana independiente para consultas.
- **Scripts:** administración de userscripts por cuenta.
- **Estadísticas:** resumen y comparación multicuentas.
- **Notificaciones:** capturas, metas, shinies y legendarios.
- **Cuentas:** configuración y cifrado de credenciales.
- **RAM:** limpieza segura de cachés controladas por el launcher.
- **Iniciar todas:** inicia o recupera las cuentas configuradas.
- **Recargar todas:** recarga escalonada para reducir picos y desconexiones.
- **Actualizaciones:** instala automáticamente la última Release estable.
- **Modo vista:** decide qué paneles se muestran en la cuadrícula.

## Instancias de otros juegos

El botón `+` de la barra de pestañas crea una instancia de navegador. El usuario define nombre, enlace HTTPS y cantidad de pantallas. Cada pantalla mantiene almacenamiento separado y las instancias reaparecen al abrir nuevamente el launcher.

## Administración de cuentas

Admite cuatro perfiles para Poke Idle World. Las credenciales se cifran con `safeStorage`/DPAPI y solo se completan en la página oficial de acceso. También permite importar una plantilla local y sincronizar sus cambios.

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

## Gestión de memoria

El botón RAM limpia únicamente cachés visuales regenerables y estructuras internas que no están abiertas. No fuerza el recolector de basura sobre webviews, no adjunta el depurador y no borra cookies, localStorage, IndexedDB ni sesiones.

## Conectividad

Las recargas múltiples se escalonan. Cada panel cuenta con límites de reintento, tiempos máximos y recuperación separada para evitar que una cuenta bloqueada afecte a las demás. Las instancias permanecen activas en segundo plano.

## Actualizador

El actualizador consulta GitHub únicamente cuando se pulsa el botón. Descarga la versión superior, valida SHA-256, prepara el reemplazo fuera de la carpeta instalada, cierra el proceso actual y reinicia. Mantiene una copia temporal de la versión anterior hasta confirmar que la nueva permanece abierta.
