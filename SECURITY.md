# Seguridad

No publiques contraseñas, tokens, archivos de cuentas ni datos de sesión en Issues.

Para reportar una vulnerabilidad, usa **Security → Report a vulnerability** en
la pestaña Security del repositorio, que abre un canal privado. Si esa opción
no está disponible, abre un Issue sin información sensible y solicita un canal
privado de contacto. Incluye versión, sistema operativo y pasos mínimos para
reproducir el problema.

Las actualizaciones automáticas solo aceptan paquetes de las Releases estables de este repositorio y verifican su firma SHA-256 antes del reemplazo.

## Qué se guarda y dónde

| Qué | Dónde | Nota |
|---|---|---|
| Contraseñas de las cuentas | Cifradas con la protección de Windows (`safeStorage`/DPAPI) en el perfil de usuario | Solo se escriben en la página oficial de acceso |
| Sesiones, cookies y almacenamiento | Un perfil persistente por **cuenta** y otro por **perfil de sesión** | No se comparten entre perfiles |
| Preferencias e historial | Perfil de usuario de Windows | Nada dentro de la carpeta del programa |
| Sprites de los avatares | Solo en memoria, mientras el launcher está abierto | No se guardan en disco ni en el almacenamiento local |
| Archivo de cuentas `.txt` vinculado | El que elija el usuario | El launcher **no lo relee solo**: hay que pulsar *Sincronizar ahora* |

## Lo que el launcher no hace

- **No hay telemetría.** No se envía nada a ningún sitio salvo las peticiones que necesitas para
  jugar, buscar actualizaciones en GitHub y bajar un sprite de PokéAPI.
- **No se ejecutan actualizaciones de fuera.** El actualizador solo acepta Releases de este
  repositorio y exige que el SHA-256 coincida. Si no coincide, no descomprime nada.
- **No se abren enlaces externos dentro de los paneles del juego.** Salen fuera.
- **Los sprites de los avatares se piden al proceso principal**, nunca con un `fetch` desde la
  ventana: la CSP del launcher no permite `raw.githubusercontent.com`, así que una imagen que no
  llegara por el camino correcto se quedaría en blanco sin dar ningún error.
