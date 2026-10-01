# Especificación: capturas de pantalla en la ficha de la Script Shop

Fecha: 2026-10-01
Estado: aprobada por el usuario, pendiente de plan de implementación
Proyecto: 3 de 4

## Qué es esto

Al publicar un script en la Shop, poder adjuntar **capturas de pantalla** para que quien
lo instale vea cómo se ve antes de decidir.

Este documento cubre **solo el launcher**. Cubrir la herramienta que publica es un
proyecto aparte, y está al final del documento.

## Lo que ya existe y no hay que volver a inventar

Esto no es construir un visor de imágenes desde cero:

- **`loadAllowedImageDataUrl` (`src/main.js:155`)** ya valida HTTPS, comprueba que el
  `content-type` sea `image/*`, limita a 2 MB, cachea con LRU y **devuelve un `data:` URL**.
  Es la vía por la que el launcher ya muestra los sprites de Pokémon y las-species.
- **`raw.githubusercontent.com` ya está en la lista blanca**, pero solo para un regex
  estrecho de sprites de PokeAPI.
- **`assertScriptShopDownloadUrl` (`src/main.js:838`)** es el molde exacto que siguen las
  capturas: `/DiegoT34/PokeGrid-Script-Shop/(main|[a-f0-9]{40})/scripts/*.user.js`.
- **El CSP no es un problema**: `img-src 'self' data: https://poke.idleworld.online
  https://pokexguides.com` ya admite `data:`, así que **no hay que tocarlo**.

## Por qué las imágenes van en `data:` y no en un `<img src>` remoto

Poner `<img src="https://raw.githubusercontent.com/...">` lo bloquea el CSP, y meter
base64 dentro del `catalog.json` convertiría el catálogo en un archivo enorme. La única
vía es la que el launcher ya usa con los sprites: descargar en el proceso principal,
verificar, y entregar al renderer como `data:`.

## Decisiones tomadas

| | Decisión |
|---|---|
| D1 | El proyecto son **solo las capturas**, dentro de la tarjeta. Vista de lista y favoritos quedan fuera. |
| D2 | **Dos proyectos**: primero el launcher, después la herramienta publicadora. El launcher define el formato; la herramienta lo escribe. |
| D3 | Las capturas viven **planas y con prefijo del id**: `screenshots/exact-iv-scanner-1.png`. Sin carpetas, y dos scripts nunca chocan. |
| D4 | **Miniaturas en fila**, y al pulsar una se abre grande en un visor. |
| D5 | El catálogo guarda la **URL completa**, hasta **6 capturas**, y el límite del catálogo sube de **512 KB a 1 MB**. |

## El formato

Un campo nuevo por script, `screenshots`, con hasta 6 URLs completas, en el orden en que
se muestran:

```json
"screenshots": [
  "https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/exact-iv-scanner-1.png",
  "https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/screenshots/exact-iv-scanner-2.png"
]
```

**`schemaVersion` se queda en `1`.** `normalizeScriptShopCatalog` rechaza cualquier
catálogo cuya versión no sea 1, así que subirla a 2 dejaría sin Shop a todos los
launchers antiguos. Añadir un campo opcional no rompe a quien no lo conoce.

### Por qué el límite del catálogo sube a 1 MB

Medido, no estimado. El catálogo real son 14.236 bytes con 8 entradas, o 1.780 por
entrada, en un formato más ancho que dos espacios:

| 200 scripts | bytes | % de 512 KB |
|---|---|---|
| sin capturas | 356 KB | 69,5 % |
| 4 capturas | 449 KB | 87,7 % |
| 6 capturas | 495 KB | **96,7 %** |

`loadScriptShopCatalog` lanza si el catálogo pasa de 512 KB, y eso deja la Shop **entera en
blanco para todos y sin aviso**. Con 200 scripts ya se está al 69 % sin capturar nada.
Subir SCRIPT_SHOP_CATALOG_LIMIT (src/main.js:23) a 1 MB deja las 6 capturas en el 48 %, con sitio para los próximos
campos y sin acantilado. 1 MB sigue siendo un JSON pequeño, cacheado cinco minutos.

## Quién valida cada URL, y por qué no igual que `downloadUrl`

`assertScriptShopScreenshotUrl` es hermana de `assertScriptShopDownloadUrl` y tiene su
misma forma: HTTPS, sin credenciales, sin query ni fragmento, y la ruta clavada a
`/DiegoT34/PokeGrid-Script-Shop/(main|[a-f0-9]{40})/screenshots/`. Además **exige que el
archivo empiece por el id del script**, para que dos scripts no acaben con las capturas
cruzadas al copiar y pegar.

**Pero una captura inválida no tumba el catálogo, y aquí nos apartamos a propósito de
`downloadUrl`.**

- Una URL de descarga inválida **lanza**: es imprescindible. Sin ella no se puede
  instalar, y un catálogo con una entrada rota es un catálogo inservible.
- Una captura inválida **se descarta con un aviso en consola** y se sigue. Es decoración,
  y una URL mal escrita en una captura no puede dejar sin Shop a todo el mundo.

Es disponibilidad contra consistencia, y en una captura gana la disponibilidad.

## Cómo llegan a la pantalla

**Se descargan al abrir los detalles, no al pintar.** El catálogo admite 200 scripts; con
6 capturas cada uno son **1.200 imágenes posibles**. Descargarlas al pintar dispararía
1.200 peticiones al abrir la Shop. El `<details>` que ya existe en cada tarjeta lleva un
escuchador en `toggle`: hasta que no se abre, no se descarga nada.

**Una sola descarga, dos tamaños.** El canal devuelve un `data:` URL, que *es* la
imagen; el CSS decide si se ve a 88 px o a pantalla completa. Pulsar una miniatura la abre
grande sin volver a descargar, porque la caché ya la tiene.

### Una segunda caché, y por qué

Hoy `remoteImageCache` guarda 48 imágenes con un tope de 2 MB cada una, y son sprites de
Pokémon: 48 × 2 MB es aceptable porque un sprite pesa unos 20 KB.

Una captura pesa mucho más, y en base64 crece otro 33 %. **48 capturas de 2 MB serían
128 MB en memoria.** Con sprites y capturas en la misma caché, abrir un catálogo grande
podía dejar al launcher sin memoria.

Así que hay una **segunda caché, solo para capturas, con 24 entradas**: unos 65 MB en el
peor caso y unos 9 MB en el normal. Sigue siendo más que hoy, pero está acotado y es un
número que se puede decir en voz alta.

El tope por imagen se queda en **2 MB**, el que ya existe. No se añade una regla nueva.

## La galería

Dentro del bloque `<details>` que ya existe, **al principio, antes de la descripción**:
quien abre los detalles quiere ver la captura, no leer texto.

- Una fila de miniaturas de ancho fijo, que envuelve a varias líneas si no caben.
- Al pulsar una, se abre grande en un visor por encima de la tarjeta. Se cierra con
  Escape o pulsando fuera.
- El visor es **un elemento reutilizado**, no uno por miniatura.

## Cuando una imagen falla, un hueco, no una tarjeta rota

El cargador ya rechaza lo que no sea `image/*` o pase de 2 MB, y con un catálogo escrito a
mano eso va a pasar. Se pinta un hueco con el nombre del archivo, no un icono de imagen
rota.

## Fuera de alcance

- Vista de lista y de tarjeta, panel de detalle a pantalla completa, favoritos.
- Una miniatura en la cabecera de la tarjeta. La tarjeta sigue con su emoji de icono.
- **Reducir o recomprimir las imágenes.** El publicador sube lo que le den; el launcher
  no las toca. Una captura de 4K pesa más y se ve bien en el visor; por eso la miniatura
  lleva `object-fit` y tamaño fijo en vez de reducirlas.
- Galerías por script con muchas imágenes. El tope es 6.

## Pruebas

### Node, puro

La construcción de la URL de captura y su validación son funciones puras y se prueban
solas, con el mismo patrón que `script-shop-order.js`: catálogo con rutas malas, rutas de
otro repositorio, `http://`, query, fragmento, credenciales, más de 6 capturas, capturas
sin el prefijo del id.

### Estático

- Que `normalizeScriptShopCatalog` **no lanza** con una captura inválida y **sí la
  descarta**: es la excepción deliberada a la regla de `downloadUrl`, y una excepción sin
  prueba se convierte en norma por accidente.
- Que el límite del catálogo sube a 1 MB.
- Que `schemaVersion` sigue aceptando 1.

### Electron

- Abrir los detalles **no descarga nada** hasta que se abren.
- Al abrirlos, salen las miniaturas con su color de fondo.
- Una captura que falla deja un hueco, no rompe la tarjeta.
- Cerrar y abrir otra vez no vuelve a descargar.

### Lo que no se cubre, dicho claro

**La sensación de la descarga no es comprobable**: cuánto tarda en aparecer una miniatura
depende de la red y de que el harness de previsualización no tiene capturas. Lo que se
comprueba es que la petición **no ocurre antes de abrir los detalles**, que es la
propiedad que protege de las 1.200 peticiones.

## El proyecto siguiente: la herramienta publicadora

Está en `C:\Users\Shockviny\Downloads\PokeGrid-Script-Shop`, rama `main`. Es una GUI en
PowerShell de unos 101 KB (`PokeGrid-Shop-Publisher.ps1` más `ui.ps1`, `theme.ps1`,
`git-helper.ps1`) con **30 pruebas propias** en `tools/`.

Lo que necesitará, cuando este proyecto esté cerrado:

- Añadir el campo `screenshots` a `catalog.schema.json`. El esquema tiene
  `"additionalProperties": true` en cada entrada, así que **no rompe la validación**; el
  campo se declara para que el publicador pueda escribirlo y validarlo.
- Subir las capturas a `screenshots/<id>-N.png` en el mismo commit que el script.
- Poder escribirlas sin el error de «debe empezar por el id», que en un formulario es un
  mensaje imposible de acertar: **el publicador genera el nombre**, no lo pide.

Ese repositorio es otro proyecto con su propia spec, su propio plan y sus propias 30
pruebas. Este documento no lo toca.