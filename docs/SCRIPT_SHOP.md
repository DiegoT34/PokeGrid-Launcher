# Publicar scripts en PokeGrid Script Shop

La Shop del launcher lee su catálogo oficial desde:

`https://github.com/DiegoT34/PokeGrid-Script-Shop`

Los scripts se mantienen en un repositorio separado para que el código del launcher y los scripts descargables no se mezclen. El launcher solo consulta el catálogo cuando el usuario abre el Centro de scripts o pulsa **Verificar**.

## Requisitos de un script

El archivo debe:

- terminar en `.user.js`;
- pesar como máximo 10 MB;
- contener un bloque `==UserScript==` válido;
- declarar `@name`, `@namespace` y una versión semántica `@version` con formato `X.Y.Z`;
- declarar sus `@match`, `@grant` y `@connect` reales;
- declarar opcionalmente `@game` para mostrar un nombre amigable del juego; si se omite, se infiere desde `@match`/`@include`;
- utilizar un `@namespace` estable y exclusivo;
- coincidir en versión y namespace con la entrada de `catalog.json`.

Ejemplo mínimo:

```javascript
// ==UserScript==
// @name         Mi herramienta PokeGrid
// @namespace    pokegrid.shop.mi-herramienta
// @version      1.0.0
// @description  Explica exactamente qué hace.
// @author       DiegoT34
// @game         Poke Idle World
// @match        https://poke.idleworld.online/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';
  // Código del script.
})();
```

## Publicar desde GitHub.com

1. Abre el repositorio **PokeGrid-Script-Shop**.
2. Entra en la carpeta `scripts`.
3. Pulsa **Add file → Upload files**.
4. Sube el archivo con un nombre estable, por ejemplo `mi-herramienta.user.js`.
5. Guarda el cambio con **Commit changes**.
6. Calcula su SHA-256 en PowerShell:

   ```powershell
   (Get-FileHash -LiteralPath '.\mi-herramienta.user.js' -Algorithm SHA256).Hash.ToLowerInvariant()
   ```

7. Abre `catalog.json`, pulsa el lápiz de edición y añade o actualiza su entrada.
8. Coloca el hash calculado en `sha256` y la misma versión declarada por `@version`.
9. Guarda `catalog.json` mediante **Commit changes**.
10. Abre el launcher, entra en **Scripts → Shop online** y pulsa **Verificar**.

## Entrada del catálogo

```json
{
  "id": "mi-herramienta",
  "name": "Mi herramienta PokeGrid",
  "namespace": "pokegrid.shop.mi-herramienta",
  "version": "1.0.0",
  "author": "DiegoT34",
  "summary": "Descripción breve para la tarjeta de la Shop.",
  "description": "Explicación completa de funciones, límites y comportamiento.",
  "category": "Utilidades",
  "tags": ["interfaz", "calidad de vida"],
  "games": ["Poke Idle World"],
  "permissions": ["Lee elementos visibles de la página del juego"],
  "minLauncherVersion": "0.22.0",
  "downloadUrl": "https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/scripts/mi-herramienta.user.js",
  "sha256": "HASH_SHA256_DE_64_CARACTERES",
  "homepage": "https://github.com/DiegoT34/PokeGrid-Script-Shop",
  "changelog": "Primera publicación.",
  "icon": "🧩",
  "featured": false,
  "publishedAt": "2026-08-24T00:00:00Z"
}
```

`id`, `namespace` y el nombre del archivo deben mantenerse estables entre versiones. Esto permite que el launcher reconozca una actualización y conserve las cuentas seleccionadas y el estado activo.

## Scripts para varios juegos e instancias

El alcance real de ejecución siempre se decide con `@match`, `@include`, `@exclude` y `@exclude-match`. La etiqueta `@game` es únicamente informativa.

- Un script para Poke Idle World mantiene sus casillas por cuenta.
- Un script para otro dominio se instala automáticamente en todas las pantallas compatibles de las instancias abiertas.
- Al instalar, actualizar, habilitar, deshabilitar o eliminar un script, el launcher recarga únicamente las pantallas cuyo URL coincide con sus reglas.
- Las instancias creadas después también reciben los scripts compatibles cuando su webview termina de cargar.

Ejemplo para otro juego:

```javascript
// @game         Mi juego web
// @match        https://juego.example.com/*
// @exclude      https://juego.example.com/logout*
```

Para que un mismo script opere en varios juegos, declara una línea `@match` por dominio y, si lo deseas, una línea `@game` por nombre visible. Evita `<all_urls>` salvo que el script realmente necesite ejecutarse en cualquier sitio.

## Publicar una actualización

1. Modifica el archivo existente sin cambiar su nombre, `id` o `@namespace`.
2. Incrementa `@version`; por ejemplo, de `1.0.0` a `1.1.0`.
3. Sube el archivo actualizado.
4. Calcula el nuevo SHA-256.
5. Actualiza en `catalog.json` los campos `version`, `sha256`, `changelog` y `publishedAt`.
6. Confirma los cambios.

Cuando el usuario pulse **Verificar**, la tarjeta mostrará **Actualización disponible**. Al actualizar, el launcher conservará las cuentas y el estado activo del script instalado.

## Retirar un script

Elimina su entrada de `catalog.json`. Dejará de aparecer para instalaciones nuevas, pero no se borrará silenciosamente de los equipos que ya lo tengan. Cada usuario podrá conservarlo o desinstalarlo desde **Mis scripts**.

## Controles de seguridad

El launcher:

- solo acepta descargas HTTPS procedentes del repositorio oficial `DiegoT34/PokeGrid-Script-Shop`;
- limita catálogo y scripts a tamaños seguros;
- exige una firma SHA-256 de 64 caracteres;
- compara el hash descargado antes de guardar el script;
- valida que versión y namespace coincidan con el catálogo;
- rechaza scripts que requieran una versión más reciente del launcher;
- conserva una copia de catálogo durante cinco minutos para reducir tráfico y consumo.
