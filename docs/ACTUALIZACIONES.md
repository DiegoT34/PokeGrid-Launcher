# Publicar una actualización

Las Releases son el canal estable que consume el actualizador del launcher. Desde la **0.39.0** el
actualizador **no se busca en un botón del menú**: se busca en **Configuraciones**, en la fila
*Actualizaciones del launcher*, y son **dos** botones: uno que solo mira y otro que descarga.

## Proceso recomendado

1. Actualiza `version` en `package.json` siguiendo `MAJOR.MINOR.PATCH`.
2. Ejecuta la puerta del área: sin ella en verde, no se compila.

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File herramientas\area-entera.ps1
   ```

3. Compila:

   ```powershell
   pnpm dist
   node herramientas\verificar-paquete.cjs
   node herramientas\comprobar-entrega.cjs
   ```

   Las dos últimas **no** se pueden correr antes de compilar: miran el artefacto, y antes de compilar
   estarían leyendo el de la entrega anterior.

4. Confirma los cambios en Git.
5. Crea y publica la etiqueta con la misma versión:

   ```powershell
   git tag -a v0.39.0 -m "0.39.0 - lo que cambia y por que"
   git push origin main
   git push origin v0.39.0
   ```

El flujo de GitHub Actions comprueba la versión, instala las dependencias, valida el código,
construye el ZIP, genera SHA-256 y publica ambos archivos. También conserva las cinco releases
más recientes; las etiquetas de las releases retiradas se quedan.

> Para subir la versión sin romper la codificación del `package.json`, usa
> `node herramientas\subir-version.cjs 0.39.0`. Editar el fichero con PowerShell mete un BOM y
> deja el JSON sin validar.

## Requisitos de la Release

El actualizador busca exactamente:

- `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip`
- `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip.sha256`

Las Releases marcadas como borrador o pre-release no se instalan automáticamente.

## Política de releases

Se conservan **las cinco últimas**. Las anteriores se borran para no ocupar espacio; el código de
cada versión **sigue en el historial de Git**, con su etiqueta, así que nada se pierde de verdad.

## Qué hace el actualizador al encontrar una versión

1. Compara la versión instalada con la de la Release estable más reciente.
2. Muestra el resultado en la fila de Configuraciones, con color: gris si no se ha comprobado, verde
   si estás al día, ámbar si hay algo.
3. Si hay versión nueva, habilita **Descargar actualización** y avisa por el panel de notificaciones.
4. Al pulsar descargar **pregunta antes de nada**, indicando la versión instalada y la disponible. Si
   cancelas, el aviso sigue pendiente: es lo único que le queda para volver a intentarlo más tarde.

## Dónde se guarda

**En la carpeta que contiene la del launcher**, no en Descargas. Si el launcher está en
`D:\Juegos\PokeGrid-Launcher\`, el ZIP y su `.sha256` quedan en `D:\Juegos\`.

Lo decide `carpetaDeDescargaDeActualizaciones()` en `src/updater.js`, y hay tres casos en los que cae
en Descargas, que es lo de siempre:

- **Sin empaquetar**, que es el caso de desarrollo: el ejecutable vive dentro de
  `node_modules\electron\dist` y ahí dentro no se deja un ZIP de 60 MB.
- **La carpeta de al lado no existe.**
- **La carpeta de al lado no se puede escribir.**

Un fallo al elegir carpeta tiene que acabar **descargando**, no rompiendo el launcher.

## Instalación

Después de validar el SHA-256, la versión nueva se descomprime en una carpeta hermana, al lado, con
este formato:

`IDLE-POKE-LAUNCHER-x.y.z-portatil`

Durante la instalación, la carpeta anterior se mueve temporalmente a `*.pokegrid-old`. El instalador
intenta abrir la versión nueva hasta tres veces y espera una confirmación emitida cuando su ventana
ya está preparada. La versión anterior solo se elimina después de recibir esa confirmación.

Si la aplicación nueva se cierra, no confirma el arranque o falla la instalación, el instalador
elimina la copia incompleta, restaura la versión anterior y vuelve a abrirla. El ZIP verificado
permanece junto al launcher para diagnóstico o instalación manual.