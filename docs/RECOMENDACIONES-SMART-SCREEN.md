# Aviso de Windows (SmartScreen) al abrir el launcher

## Qué ocurre

Al abrir el ejecutable por primera vez en un equipo, Windows puede mostrar
**«Windows ha protegido tu PC»**. Es SmartScreen avisando de que el archivo no
tiene firma digital de un editor de confianza.

No es un virus ni un archivo infectado: es el comportamiento normal de cualquier
aplicación portable sin firmar, y no significa que el launcher esté dañado.

## Por qué aparece

El launcher se distribuye como un ZIP portátil, no como una instalación de
Microsoft Store ni como un programa con instalador firmado. El estado actual de
la firma está en `package.json` → `build.win`:

```json
"signAndEditExecutable": false
```

Con ese `false`, `electron-builder` no toca la firma del ejecutable, así que
Windows lo trata como software de editor desconocido.

## Qué hacer

1. Pulsa **Más información**.
2. Pulsa **Ejecutar de todas formas**.

El aviso no debería volver a salir en ese equipo. Si lo hace, repite los mismos
pasos: no cambia nada del launcher.

### ¿Y en las actualizaciones posteriores?

En principio **no aparece**. La actualización automática no usa el navegador:

- el ZIP se descarga con la red de Node (`fetch`), que no adjunta la marca de
  descarga del navegador —la que activa el aviso—;
- se descomprime con PowerShell (`Expand-Archive`), no con el explorador de
  archivos.

Sin esa marca, SmartScreen no tiene nada que evaluar. Aun así, **esto no está
verificado automáticamente en este repositorio**: depende de Windows y de la
configuración del equipo (SmartScreen habilitado, Directorio de archivos
downloadados, políticas de empresa, antivirus de terceros). Si en algún equipo
vuelve a salir, aplica el mismo **Más información** → **Ejecutar de todas
formas**.

## Verificar la integridad antes de ejecutar

La Release publica dos archivos: el ZIP y su firma.

```
IDLE-POKE-LAUNCHER-x.y.z-portatil.zip
IDLE-POKE-LAUNCHER-x.y.z-portatil.zip.sha256
```

El `.sha256` tiene una línea con el hash y el nombre del ZIP:

```
<hash de 64 caracteres>  IDLE-POKE-LAUNCHER-x.y.z-portatil.zip
```

Para comprobarlo en PowerShell:

```powershell
Get-FileHash .\IDLE-POKE-LAUNCHER-x.y.z-portatil.zip -Algorithm SHA256
```

`Get-FileHash` devuelve el hash en **mayúsculas** y el archivo `.sha256` lo
guarda en **minúsculas**, así que compara ignorando mayúsculas y minúsculas. Si
los dos hashes coinciden, el ZIP es el que publicó esta Release.

### Qué verifica el launcher y qué no

Conviene no confundir las dos cosas:

| Situación | ¿Quién comprueba el hash? |
|---|---|
| **Primera descarga manual** del ZIP de la Release | **Tú**, a mano. El launcher no comprueba el ZIP que descargaste. |
| **Actualización automática** desde dentro del launcher | **El launcher**, automáticamente. |

En la actualización automática la comprobación es real y ocurre *antes* de
descomprimir nada: el actualizador calcula el SHA-256 del ZIP descargado, lo
compara con el `.sha256` de la misma Release y, si no coincide, lanza el error
«la firma SHA-256 no coincide; la actualización fue descartada» y no llega a
extraer el paquete. Solo después de superarla copia el ZIP a **Descargas** y
entrega el archivo al instalador de PowerShell, que es quien descomprime.

> Fuente: `src/updater.js`, función `prepareUpdate` (el `throw` de la
> discrepancia ocurre antes de `persistVerifiedRelease` y antes de lanzar el
> script de PowerShell que hace `Expand-Archive`).

Aun así, compara el hash a mano en la primera descarga: es la única forma de
detectar un ZIP manipulado **antes** de ejecutarlo. Si el launcher ya está
arrancado, el daño ya está hecho.

> **Nota para quien mantenga el proyecto.** Firmar el ejecutable elimina este
> aviso y reduce los falsos positivos del antivirus. Requiere un certificado de
> firma de código (Organization Validation, ≈100–200 USD/año) y dos secretos en
> GitHub (`CSC_LINK`, `CSC_KEY_PASSWORD`). El punto de cambio está en
> `package.json` → `build.win`: poner `signAndEditExecutable: true` y
> `signtoolOptions: { certificateSubjectName: "..." }`. Hasta entonces, las
> mitigaciones de este documento son las únicas disponibles.
>
> Con la firma activa, `.github/workflows/release.yml` tiene que materialize el
> certificado en el runner antes de `pnpm dist` (escribir el `.pfx` desde
> `CSC_LINK` a un fichero y apuntar ahí la variable), porque `electron-builder`
> lo necesita en disco para firmar el `.exe`.