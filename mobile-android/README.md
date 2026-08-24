# IDLE POKE LAUNCHER para Android

Port móvil experimental de la versión `0.18.3`, diseñado para teléfonos y tabletas en horizontal.

## Qué incluye

- Cuatro sesiones del juego con cookies y almacenamiento aislados mediante perfiles de Android WebView.
- Vista configurable de 1 a 4 cuentas, expansión individual y reordenamiento manteniendo pulsada la barra de cada cuenta.
- Credenciales cifradas con Android Keystore y acceso automático opcional.
- Monitor WebSocket/DOM para Pokémon, capturas, derrotas, drops, perfil y estado de caza.
- Accesos rápidos a perfil, Capture Log, Hunt y Modo Farmeo.
- Notificaciones nativas de Android y diseño oscuro adaptado a pantalla horizontal.
- La versión de escritorio permanece intacta en la carpeta raíz.

## Instalar

1. Copia `IDLE-POKE-LAUNCHER-0.18.3-mobile.apk` al teléfono.
2. Permite temporalmente la instalación desde el explorador de archivos que utilices.
3. Instala o actualiza **Android System WebView** desde Play Store.
4. Abre la aplicación en horizontal, entra en **Cuentas** y guarda cada acceso.

Android 8 o superior es obligatorio. El modo de cuatro cuentas exige una versión reciente de Android System WebView compatible con perfiles múltiples; si falta, la aplicación limita la vista a una sola sesión para impedir que se mezclen las cuentas.

## Compilar

Abre esta carpeta con Android Studio y ejecuta la configuración `app`, o usa `gradlew.bat assembleDebug` con JDK 17 y Android SDK 35 configurados. El APK se genera en `app/build/outputs/apk/debug/`.

## Nota de funcionamiento

Android puede suspender WebViews cuando la aplicación queda en segundo plano. Para mantener las cuatro sesiones y la lectura en tiempo real, deja la aplicación visible y exclúyela del ahorro de batería del fabricante. La primera validación de selectores y eventos debe hacerse con una cuenta real, porque el contenido del juego requiere una sesión autenticada.
