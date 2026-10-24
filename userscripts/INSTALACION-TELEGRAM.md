# PokeGrid Telegram Alerts

Este userscript recibe los eventos locales de las cuatro sesiones del launcher y envía alertas al Bot API oficial de Telegram. No necesita un servidor adicional.

## Crear el bot

1. Abre `@BotFather` en Telegram y envía `/newbot`.
2. Elige el nombre y un usuario terminado en `bot`.
3. Copia el token que entrega BotFather. Trátalo como una contraseña.
4. Abre el bot recién creado y pulsa **Start** o envía `/start`.
5. Envía cualquier otro mensaje al bot.

El panel de Telegram puede detectar ese chat automáticamente. Como alternativa manual, abre en el navegador:

   `https://api.telegram.org/botTU_TOKEN/getUpdates`

Busca `"chat":{"id":123456789}` y copia ese número. En un grupo suele comenzar por `-100`.

## Instalar y configurar

1. En PokeGrid Launcher abre **Centro de scripts**.
2. Pulsa **Instalar alertas Telegram**.
3. Revisa que estén seleccionadas las cuatro cuentas y pulsa **Guardar e instalar**.
4. Tras recargar las sesiones, pulsa el botón circular con el icono de **Telegram** dentro de cualquiera de las cuentas.
5. Pega el token y pulsa **Detectar chats**. También puedes agregar destinatarios manualmente, uno por línea:

   `Mi Telegram | 123456789`

6. Sigue los pasos numerados, configura los eventos y filtros, pulsa **Guardar** y después **Probar bot**.

La misma configuración se comparte entre las cuatro cuentas. El token se guarda cifrado mediante la protección segura de Windows.

## Seguridad

- Nunca publiques el token ni lo incluyas en capturas.
- Si se filtra, usa `/revoke` en BotFather y reemplázalo en el panel TG.
- El script solo realiza conexiones HTTPS a `api.telegram.org` y al propio juego (`poke.idleworld.online`).
- Las capturas y derrotas usan los sprites `.dat/.spr` renderizados por el juego. Los drops usan los iconos publicados en `/game/items.json`.

---

# PokeGrid Telegram Control

El segundo script de Telegram **no manda avisos: manda cuentas**. Lee en qué hunt está cada una y las
envía a otra, todas a la vez o una sola. Es independiente del de alertas: tiene su propio token y su
propia configuración, y se pueden usar los dos con **el mismo bot** o con dos distintos.

## Crear el bot

Igual que arriba, con `@BotFather`. Si quieres usar el **mismo bot** que las alertas, salta este paso
y pega el mismo token.

## Instalar y configurar

1. En PokeGrid Launcher abre **Centro de scripts**.
2. Busca **PokeGrid Telegram Control** en la lista. Se instala solo, pero **desactivado**: márcalo y
   elige las cuatro cuentas, como con cualquier script.
3. Recarga las sesiones.
4. Dentro de cualquiera de las cuentas, pulsa el botón redondo **TG** (abajo a la izquierda).
5. Pega el token y pulsa **Guardar**.
6. Escríbele `/estado` al bot. Te contestará **«No autorizado»** con tu id de Telegram: cópialo.
7. Pégalo en **IDS AUTORIZADOS** y pulsa **Guardar**.
8. Espera unos segundos: el bot recoge la configuración solo, sin recargar. Envía `/estado` y debe
   contestar con las cuatro cuentas.

## Comandos

| Comando | Qué hace |
|---|---|
| `/estado` | Una línea por cuenta: entrenador, hunt actual y líder. Marca las cuentas sin leer y los datos viejos. |
| `/ir blastoise` | Busca coincidencias y las enseña como botones. Al elegir una, pregunta a quién. |
| `/ir` | Te pide el nombre. |
| `/ayuda` | Lo mismo que esta tabla, en corto. |

Para mover **las cuatro**, elige la hunt y luego **Las 4**. El segundo toque es la confirmación.

## Lo que hay que saber

- **Funciona con el launcher abierto y las cuentas en cuadrícula.** Si minimizas el launcher, todas
  las páginas se duermen —es una función del launcher para no gastar CPU— y el bot deja de ser fiable.
- **Viajar a Orre está apagado por defecto.** Actívalo en el panel si quieres que pueda entrar ahí.
- **Una cuenta cerrada no se mueve**, y el bot lo dice: «sin respuesta (¿cuenta cerrada?)».
- El token se guarda **cifrado** con la protección de Windows, en el almacén del gestor de scripts.
  Nunca se escribe en el `localStorage` de la página.

## Seguridad

- La lista de ids es la puerta. Sin ella el bot no ejecuta nada, y a un desconocido solo le dice su
  propio id (que ya sabe).
- Si el token se filtra, `/revoke` en BotFather y lo pegas de nuevo.
- El script solo habla con `api.telegram.org` y con el propio juego.
