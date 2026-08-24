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

Durante la instalación, la carpeta anterior se mueve temporalmente a `*.pokegrid-old`. Si el nuevo ejecutable termina durante los primeros cinco segundos, el instalador elimina la copia fallida, restaura la anterior y vuelve a abrirla.
