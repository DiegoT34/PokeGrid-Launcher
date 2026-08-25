# Publicar una actualización

Las Releases son el canal estable consumido por el botón **Actualizaciones**.

## Proceso recomendado

1. Actualiza `version` en `package.json` siguiendo `MAJOR.MINOR.PATCH`.
2. Ejecuta las comprobaciones locales.
3. Confirma los cambios en Git.
4. Crea y publica una etiqueta con la misma versión:

```powershell
git tag v0.21.1
git push origin main --tags
```

El flujo de GitHub Actions comprueba la versión, instala las dependencias, valida el código, construye el ZIP, genera SHA-256 y publica ambos archivos.

## Requisitos de la Release

El actualizador busca exactamente:

- `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip`
- `IDLE-POKE-LAUNCHER-x.y.z-portatil.zip.sha256`

Las Releases marcadas como borrador o pre-release no se instalan automáticamente.

## Recuperación

Después de validar el SHA-256, el launcher conserva en la carpeta **Descargas** tanto el ZIP como su archivo `.sha256`. La versión nueva se descomprime allí en una carpeta independiente con este formato:

`IDLE-POKE-LAUNCHER-x.y.z-portatil`

Durante la instalación, la carpeta anterior se mueve temporalmente a `*.pokegrid-old`. El instalador intenta abrir la versión nueva hasta tres veces y espera una confirmación emitida cuando su ventana ya está preparada. La versión anterior solo se elimina después de recibir esa confirmación.

Si la aplicación nueva se cierra, no confirma el arranque o falla la instalación, el instalador elimina la copia incompleta, restaura la versión anterior y vuelve a abrirla. El ZIP verificado permanece en **Descargas** para diagnóstico o instalación manual.
