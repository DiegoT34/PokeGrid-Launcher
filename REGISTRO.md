# Registro de entregas

Una entrada por versión, con lo que cambió y **por qué**. Sin esto, dentro de seis meses el código
explica *qué* hace pero nadie recuerda *decide qué*.

Las versiones van en orden. La carpeta `dist/` conserva todas; nada se sustituye.

---

## 0.34.0 — pestañas de cuenta que se mueven, iconos de verdad y fuera el brillo

### Pestañas de cuenta

- **Se pueden reordenar.** Antes se arrastraban y no pasaba nada: `moverInstancia` solo buscaba dentro de
  `browserInstances`, y una cuenta no está ahí — `findIndex` devolvía `-1` y la función se salía
  callada. El síntoma era una pestaña que no se movía, sin ningún aviso. Ahora cada clase se mueve en
  su propia lista (`moverCuenta`) y **el orden se guarda** (`ORDEN_CUENTAS_KEY`), así que al reiniciar
  no vuelve al orden de las cuentas.
  También funciona con `Alt` + flecha, como las instancias.
- **El icono se pinta.** `pintarIconoDeInstancia` solo pintaba el logo del juego en la instancia
  principal. Las cuentas (`cuenta-3`) no lo eran: caían al mapa de iconos, no había nada ahí y la
  pestaña salía **sin marca**.
- **El botón de agrandar se esconde** en modo pestañas, donde la cuenta está sola y no hay rejilla a la
  que agrandarla. `toggleExpanded` también lo rechaza, para el atajo de teclado y cualquier otra vía.

### Sin brillos

Las doce reglas de `:hover` con `box-shadow` y el `filter: brightness(1.08)` han desaparecido. Se dejan
cambios de color y de borde, que es lo mínimo para seguir diciendo «esto se puede pulsar».

**Lo que no se ha quitado, y por qué:**

| Qué | Por qué se queda |
|---|---|
| `.instance-tab-shell.is-active` | Su `box-shadow` no es un brillo: es lo único que dice qué pestaña estás mirando. Sin él, con cuatro pestañas abiertas no hay forma de saber cuál es cuál. |
| La franja del tipo en `.farm-pokemon-smart-option` | Es el color del Pokémon, un dato. Su sombra lleva dos capas y solo se quita la del resplandor. |
| Los `drop-shadow` de los iconos | Son relieve sobre el fondo, no resplandor. Sin ellos los iconos quedan pegados a la superficie. |

### Iconos SVG donde antes había emoji

Todos los que **se pintaban** ahora son SVG de la tabla `LAUNCHER_ICON_PATHS`, con trazo y
`currentColor`. Lo que se queda son tres cosas, y ninguna es un emoji:

- Los que están en **expresiones regulares** que limpian el texto del juego: se usan para *reconocer*
  emojis ajenos y quitarlos. Cambiarlos por un SVG haría que no reconocieran nada.
- Los que están en **comentarios**, que no se ven.
- Los **símbolos matemáticos y geométricos** (`≥`, `×`, `−`, `◈`), que no son emoji.

Se añadió `search` a la tabla y `window.launcherUiIcon` quedó expuesto, porque `userscripts.js` va en
su propio fichero y sin eso tendría que duplicar los trazos —que divergen en cuanto uno se toca—.

El tema del juego (`game-theme.js`) lleva sus iconos como `mask` en SVG en línea, porque ahí se inyecta
en la página y `launcherUiIcon` no llega.

### Fuera el botón de Telegram

`loadScripts()` ya instalaba el módulo oficial en cada arranque (`updateBundledTelegramScript`), así que
el botón era una segunda puerta a lo mismo. Se fueron el botón, su CSS, la función que solo él llamaba
y su enganche. **El módulo se sigue instalando solo**: eso no cambia.

### Rediseño

Centro de scripts, panel de notificaciones, «crear meta» y «gestionar metas», todo **solo con CSS**:
cabeceras con borde, pestañas como fichas, contadores con su propio color, filtros como caja separada y
barras de desplazamiento pintadas a mano con la paleta del launcher.

Va **al final** de `styles.css` y no reescribiendo lo que había: es una capa, y se quita borrando ese
bloque. Una regla con el nombre mal escrito no da error —se queda sin hacer nada—, así que
`comprobar-selectores-rediseno.cjs` comprueba que los 33 selectores tienen un elemento de verdad.

### El directorio, ordenando

17 herramientas y guiones de un solo uso pasaron a `herramientas/`, y lo que sobraba a `_basura/<fecha>/`
—**movido, no borrado**—. `MAPA-DEL-PROYECTO.md` es nuevo y explica dónde va cada cosa y qué no se toca.

`src/` y `tests/` no se han movido: el proceso principal decide qué entra en el paquete, y mover un
fichero de ahí rompe el paquete **en silencio**.

---

## Fallos propios que costaron tiempo en esta versión

Están escritos porque se repiten, y volver a caer en ellos no es de esta vez:

1. **Reconstruir una regla de CSS desde sus partes pierde el selector.** El parser cogía el bloque
   anterior y, con un comentario de por medio, se comió `.button-pokepedia:hover` entero. Revertido con
   `git checkout`. Ahora solo se borra una declaración del cuerpo, nunca se reconstruye la regla, y se
   comprueba que la lista de selectores es idéntica antes y después.
2. **Reponer una sombra sin su `box-shadow:` delante.** El navegador descarta la declaración, así que la
   franja del tipo desaparecía de la pantalla mientras el guion la daba por buena. Buscar la cadena no
   dice que signifique nada: la comprobación nueva busca declaraciones sueltas.
3. **`node --check` mira el fichero en disco, no lo que vas a escribir.** Dos guiones se comprobaban a sí
   mismos antes de guardar y, al ver el error del fichero viejo, no escribían nada. Ahora escriben a un
   temporal y comprueban ese.
4. **Un acento grave en un comentario dentro de una plantilla** cierra la plantilla antes de tiempo, y el
   error apunta a la línea donde empieza, no a la del comentario. Ha pasado cuatro veces.
5. **Los escapes de una expresión regular no sobreviven a una plantilla.** `\s` se convierte en un
   espacio y `\.` pierde la barra. Una comprobación daba «el módulo no trae el namespace» cuando el
   módulo sí lo traía. Ahora se usa `indexOf`.
6. **`node -e` desde PowerShell no admite barras ni corchetes.** Todo eso va en ficheros de
   `herramientas/`, y `herramientas/` existe por eso y no por organizacion.

---

## Pruebas de esta versión

- `tests/cuentas-iconos-0340-smoke.js` — nueva. 13 comprobaciones: reordenado, icono de la cuenta, botón
  de agrandar, cero brillos de hover, franja del tipo y marca de la pestaña activa intactas, iconos SVG
  y fuera el botón de Telegram.
- `tests/userscripts-manager-smoke.js` — adaptada. El botón ya no está, así que la prueba carga el
  módulo por la misma vía interna y hace lo mismo que él, **sin perder cobertura**.
- 13 invariantes nuevas en `comprobar-patrones.cjs` y 22 en `verificar-paquete.cjs`.