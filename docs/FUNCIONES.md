# Guía de funciones

## Panel principal multicuentas

La instancia principal abre de uno a treinta y dos webviews persistentes (una por cuenta configurada). Cada panel tiene sesión, cookies, zoom, recarga, expansión, Hunt Analyzer y Capture Log independientes. Ocultar una cuenta mediante **Modo vista** no cierra su proceso ni interrumpe el juego.

La cuadrícula adapta sus columnas al número de cuentas: 1 cuenta → 1 columna; 2–4 → 2 columnas; 5–9 → 3 columnas; 10 o más → 4 columnas.

## Menú lateral y barra superior

El botón hamburguesa abre un panel lateral flotante. El panel se superpone a la cuadrícula, por lo que no reduce ni desplaza las ventanas del juego, y cada acción utiliza un color identificativo con estilo flat. La barra superior completa también puede ocultarse y ambos estados se conservan al reiniciar.

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

Admite de **1 a 32 perfiles** para Poke Idle World en la misma instalación. Las credenciales se cifran con `safeStorage`/DPAPI y solo se completan en la página oficial de acceso.

### Añadir, eliminar y reordenar cuentas

- El botón **+ Añadir cuenta (IP/VPN propia)** crea una fila nueva; el tope es 32 por memoria (cada webview carga el juego completo).
- Cada cuenta conserva su **identidad estable**: aunque se añadan o eliminen otras, la partición de cookies y sesión de cada una no cambia.
- Al eliminar una cuenta, el launcher pide confirmación y avisa de que el historial de esa posición (Capture Log, metas, notificaciones) pasará a la cuenta que ocupe ese lugar. Eliminar una cuenta intermedia **reasigna el historial**: el registro de la posición desplazada queda ligado a otra cuenta, así que tenlo en cuenta antes de borrar. Si la cuenta que eliminas es la última de la lista, el aviso lo dice en vez de nombrar a nadie.
- Al cambiar el proxy de una cuenta que ya está cargada, el launcher recarga solo esa sesión: las conexiones ya abiertas seguirían saliendo por la IP anterior.
- La barra del panel muestra una etiqueta **VPN** mientras la cuenta usa proxy, con el protocolo y el destino en el tooltip (por ejemplo `SOCKS5 · 127.0.0.1:1080`). Si el proxy no llegó a aplicarse, la etiqueta se oculta y el motivo aparece en la barra de estado del panel, para que la etiqueta y el error no se contradigan.
- La importación por plantilla `.txt` admite de 1 a 32 secciones `[CUENTA N]` consecutivas. Al re-sincronizar un archivo vinculado, las identidades existentes se conservan por posición para no perder sesiones.

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

**Atajo automatizado:** el script [`scripts/vpn-per-account.cjs`](../scripts/vpn-per-account.cjs) descarga v2ray-core una sola vez y levanta una instancia por nodo (enlaces `vmess://`, `vless://`, `trojan://` o `ss://`) con puertos locales propios: `node scripts/vpn-per-account.cjs up --count 3`. Guía completa en [VPN-POR-CUENTA.md](VPN-POR-CUENTA.md).

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

El actualizador consulta GitHub únicamente cuando se pulsa el botón. Descarga la versión superior, guarda el ZIP y su firma en Descargas, valida SHA-256 y descomprime la nueva carpeta portátil. Después cierra el proceso actual, intenta abrir la nueva versión hasta tres veces y espera una confirmación de su ventana. Mantiene una copia temporal de la versión anterior y solo la elimina después de confirmar el arranque; si falla, restaura y abre la versión anterior.
