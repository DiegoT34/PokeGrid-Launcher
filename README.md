# IDLE POKE LAUNCHER

Launcher portátil para Windows diseñado para administrar **Poke Idle World y otros juegos de navegador** con sesiones independientes, herramientas de seguimiento en tiempo real, userscripts multijuego y actualización automática.

[![Última versión](https://img.shields.io/github/v/release/DiegoT34/PokeGrid-Launcher?display_name=tag&label=versi%C3%B3n)](https://github.com/DiegoT34/PokeGrid-Launcher/releases/latest)
[![Descargas](https://img.shields.io/github/downloads/DiegoT34/PokeGrid-Launcher/total?label=descargas)](https://github.com/DiegoT34/PokeGrid-Launcher/releases)
[![Windows](https://img.shields.io/badge/Windows-port%C3%A1til-39bdf8)](https://github.com/DiegoT34/PokeGrid-Launcher/releases/latest)

> Proyecto independiente. PokeGrid Launcher no está afiliado con Pokémon, Nintendo, Game Freak ni Poke Idle World.

## Descargar

1. Abre la [última versión publicada](https://github.com/DiegoT34/PokeGrid-Launcher/releases/latest).
2. Descarga `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip`.
3. Descomprime el ZIP en una carpeta con permisos de escritura.
4. Ejecuta `IDLE POKE LAUNCHER.exe`.

No necesita instalador. Las cuentas, sesiones y preferencias se guardan en el perfil de usuario de Windows, fuera de la carpeta del programa.

![Cuadrícula principal con menú flotante](docs/assets/launcher-grid.png)

## Funciones principales

- De una a treinta y dos cuentas simultáneas de Poke Idle World en cuadrícula, con cookies, almacenamiento y conexión separados por cuenta.
- Cuentas ilimitadas (1–32): añadir, eliminar y reordenar desde el modal **Cuentas**, conservando la sesión de cada una.
- Pestañas de instancias para abrir otros juegos web sin cerrar las sesiones existentes.
- De una a seis pantallas independientes por cada instancia adicional, con restauración automática al iniciar.
- Menú lateral flotante con botones flat diferenciados; se superpone sin reducir ni desplazar las ventanas del juego.
- Barra superior ocultable, selector de paneles visibles, zoom y expansión individual por cuenta.
- Inicio conjunto, recarga escalonada, diagnóstico y recuperación de conexiones por pantalla.
- Credenciales cifradas con la protección de Windows mediante Electron `safeStorage`.
- Datos de perfil en tiempo real, Hunt Analyzer individual, Capture Log y estadísticas generales multicuentas.
- Comparación de hunts ordenada por rendimiento, con colores independientes para cada cuenta.
- Modo farmeo con filtros por nombre, región, tipo, nivel, combate y variante shiny.
- Pokédex en ventana independiente.
- Centro de userscripts multijuego con editor, permisos, instalación por URL, importación y arrastrar/soltar.
- Detección automática por `@match`/`@include`: cada script se instala, actualiza y recarga en las pantallas compatibles de su juego.
- Etiquetas de juego inferidas por dominio o declaradas con la directiva opcional `@game`.
- Shop online con catálogo actualizado desde GitHub, información, instalación, actualización, desinstalación y verificación SHA-256. El catálogo se ordena con los destacados primero y, dentro de cada grupo, del más reciente al más antiguo.
- Pestaña **Actualizaciones** en el centro de scripts: solo los scripts con versión publicada más nueva que la instalada, con su propio contador.
- Filtro de categoría por pastillas, con el número de cada una. Los números no cambian al elegir una, para poder saltar de una categoría a otra sin volver a «Todas».
- Limpieza segura de cachés visuales sin cerrar sesiones ni forzar el recolector de Chromium.
- Actualizador integrado que guarda ZIP y firma en Descargas, reintenta el arranque, confirma la ventana nueva y restaura la versión anterior si algo falla.
- Bolitas de aviso en el botón de menú: Shop en ámbar, notificaciones en rojo y actualizaciones del launcher en verde. Los avisos de contenido se apagan al entrar; el de actualización, solo al instalar.

## Cuentas ilimitadas y VPN/IP por cuenta

El launcher admite de **1 a 32 cuentas** en la misma instalación. Desde el modal **Cuentas** puedes añadir, eliminar o reordenar perfiles; cada uno conserva su partición persistente (cookies, almacenamiento y sesión) aunque se añadan o eliminen otras cuentas.

Cada cuenta puede usar una **IP/VPN distinta**: protocolo `http` o `socks5`, host, puerto y usuario/clave opcionales. El proxy solo afecta a la sesión de esa cuenta; las demás siguen con su conexión normal. Funciona con cualquier proxy compatible (V2RayN, Clash Verge, proxies residenciales de pago, etc.).

Para usar VPN gratuita sin coste mensual, una opción práctica es [V2RayN](https://github.com/2dust/v2rayN) o [Clash Verge](https://github.com/clash-verge-rev/clash-verge-rev) con nodos gratuitos: habilita un puerto local (mixed/socks/http) por cuenta y escribe ese host/puerto en la fila de cada cuenta. Consulta la [guía completa](docs/FUNCIONES.md#administración-de-cuentas).

> **Atajo:** el script [`scripts/vpn-per-account.cjs`](scripts/vpn-per-account.cjs) levanta automáticamente una instancia v2ray por nodo con su propio puerto local (`node scripts/vpn-per-account.cjs up --count 3`). Guía paso a paso en [docs/VPN-POR-CUENTA.md](docs/VPN-POR-CUENTA.md).

> **Nota:** al eliminar una cuenta, las siguientes heredan su posición; el historial asociado a esa posición (capturas, metas) pasa a la cuenta que ocupa ese lugar.

## Hunt Analyzer

Muestra derrotados, tiempo, experiencia, capturas, botín, suministros, rendimiento por hora, balance y drops de la sesión. Cada cuenta conserva su propio panel flotante.

![Hunt Analyzer](docs/assets/hunt-analyzer.png)

## Capture Log

Mantiene el historial de capturas por cuenta con IV, Quality/Tier, nivel, Poké Ball, fecha, filtros y detalle individual.

![Capture Log](docs/assets/capture-log.png)

## Modo farmeo

Analiza el Pokémon líder detectado, nivel, tipos, mapas y compatibilidad para organizar objetivos disponibles por cuenta.

![Modo farmeo](docs/assets/farm-mode.png)

## Actualizaciones automáticas

El menú lateral incluye **Actualizaciones**. El launcher comprueba por su cuenta al arrancar y cada seis horas, y avisa con una bolita verde en el botón de menú cuando hay versión nueva. Ese aviso **no se apaga al mirarlo**: sigue ahí hasta que la actualización se instala de verdad, porque si no, quien cerrara el aviso y no volviera a él perdería la única señal de que la tenía pendiente. Un arranque sin conexión no lo apaga tampoco.

Al pulsar el botón:

1. Consulta la Release estable más reciente de este repositorio.
2. Compara la versión instalada.
3. Si hay versión superior, **pregunta antes de descargar nada**, indicando la versión instalada y la disponible.
4. Si cancelas, no ocurre nada más y el aviso sigue pendiente.
5. Si aceptas, descarga el ZIP y lo conserva en **Descargas**.
6. Verifica su archivo `.sha256` antes de descomprimirlo.
7. Cierra el launcher y abre la nueva versión en una carpeta portátil independiente.
8. Confirma que la nueva ventana está preparada antes de retirar la versión anterior.
9. Si el arranque no se confirma, reintenta y restaura automáticamente la versión anterior.

Consulta [cómo funcionan las actualizaciones](docs/ACTUALIZACIONES.md), la [guía completa de funciones](docs/FUNCIONES.md) y [cómo publicar scripts en la Shop](docs/SCRIPT_SHOP.md).

## Desarrollo

Requisitos: Windows, Node.js 22 o superior y pnpm.

```powershell
pnpm install
pnpm check
pnpm test:updater
pnpm start
```

Para generar el ZIP portátil:

```powershell
pnpm dist
```

El resultado se crea en `dist/`. Los scripts personales que se encuentren junto al proyecto no forman parte del repositorio ni de las Releases.

Verificar que nada se rompió:

```powershell
pnpm check
pnpm test      # suites de Node, rápido
pnpm test:e2e  # suites de Electron
pnpm test:all  # ambas
```

## Privacidad y seguridad

- Las contraseñas no se publican ni se incluyen en los paquetes.
- Cada cuenta usa una partición persistente independiente.
- El actualizador solo acepta Releases de `DiegoT34/PokeGrid-Launcher` y exige SHA-256.
- Los enlaces externos se abren fuera de los paneles del juego.
- No se incluye telemetría propia del launcher.

Consulta [SECURITY.md](SECURITY.md) para informar problemas de seguridad.

### Aviso de Windows (SmartScreen)

El ejecutable del launcher no está firmado con un certificado comercial, así que
Windows SmartScreen puede mostrar «Windows ha protegido su PC» la primera vez
que lo abres en un equipo nuevo. Es el comportamiento normal de cualquier
aplicación portable sin firmar.

**Qué hacer:** pulsa **Más información** y luego **Ejecutar de todas formas**.

El aviso no aparece en las actualizaciones posteriores: el actualizador descarga
el ZIP con la red de Node y lo descomprime con PowerShell, sin la marca de
descarga que el navegador añade a los archivos y que es la que dispara el aviso.
Ese comportamiento depende de la configuración de cada equipo, así que si en
algún Windows vuelve a salir, aplica el mismo **Más información** →
**Ejecutar de todas formas**.

**Verificar la integridad antes de ejecutar:** descarga también el archivo
`IDLE-POKE-LAUNCHER-x.y.z-portatil.zip.sha256` de la misma Release y compara el
hash con el del ZIP. Puedes calcularlo con:

```powershell
Get-FileHash .\IDLE-POKE-LAUNCHER-x.y.z-portatil.zip -Algorithm SHA256
```

En la **primera descarga manual** esa comparación la tienes que hacer tú: el
launcher no comprueba el ZIP que descargaste a mano. La verificación automática
sí existe, pero solo dentro del actualizador, que rechaza el paquete y no
descomprime nada cuando el hash no coincide (ver
[Actualizaciones automáticas](#actualizaciones-automáticas)).

Guía completa y notas para quien mantenga el proyecto en
[docs/RECOMENDACIONES-SMART-SCREEN.md](docs/RECOMENDACIONES-SMART-SCREEN.md).

## Licencia

Código del launcher publicado bajo la licencia [MIT](LICENSE).

## Créditos

Creado y mantenido por **[DiegoT34](https://github.com/DiegoT34)**, autor y responsable principal de PokeGrid Launcher.
