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
