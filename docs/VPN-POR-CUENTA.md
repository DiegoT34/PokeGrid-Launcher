# VPN/IP distinta por cuenta — guía práctica

El launcher permite hasta 32 cuentas locales, pero **el servidor del juego limita a 4 conexiones simultáneas por IP/red** (error "Límite de cuentas por red"). La solución: que cada cuenta extra salga por una **IP diferente** usando su propio proxy local.

Esta guía automatiza el levantamiento de N proxies locales con [v2ray-core](https://github.com/v2fly/v2ray-core) (el mismo núcleo que usa V2RayN, pero sin GUI y scripteable): un proceso por nodo, cada uno escuchando en su propio puerto local.

## Requisitos

- Windows 10/11 y Node.js 22+ (ya lo tienes si usas el launcher en desarrollo).
- Internet la primera vez (el script descarga v2ray-core una sola vez a `.vpn/core/`).
- Nodos de VPN: enlaces `vmess://`, `vless://`, `trojan://` o `ss://`.

## Paso 1 — Consigue nodos gratuitos

Fuentes habituales (cambian con frecuencia; verifica que cada enlace funcione antes de usarlo):

- Canales de Telegram y listas públicas de "free vless/vmess accounts".
- Herramientas tipo *v2ray free nodes* que publican enlaces nuevos a diario.

Copia **uno por línea** en el archivo `.vpn/servers.txt` (créalo si no existe, junto al proyecto):

```text
# un enlace por línea; las líneas que empiezan con # se ignoran
vmess://eyJ2IjoiMiIs...
vless://abcd-1234@nodo-ejemplo.com:443?security=reality&sni=ex.com&fp=chrome&pbk=...#mi-nodo
trojan://clave@otro-nodo.net:443?sni=ex.com&type=ws&path=%2Ftj
ss://YWVzLTI1Ni1nY206cGFzcw==@1.2.3.4:8388
```

> ⚠️ Los enlaces contienen credenciales del nodo. La carpeta `.vpn/` está en `.gitignore`: **no la subas a ningún sitio**.

## Paso 2 — Arranca una instancia por cuenta extra

Desde la raíz del proyecto (Git Bash, PowerShell o cmd):

```bash
node scripts/vpn-per-account.cjs up --count 3 --base-port 10808
```

- `--count N` → cuántas instancias levantar (por defecto: una por nodo en el archivo).
- `--base-port` → primer puerto SOCKS5 (por defecto 10808). Cada instancia ocupa **dos** puertos consecutivos: SOCKS5 y HTTP.
- `--servers <ruta>` → usar otro archivo de enlaces.
- `--force` → detener instancias previas antes de arrancar.

Salida esperada:

```text
Arrancando 3 instancia(s): SOCKS5 en 127.0.0.1:10808, +2 por cuenta…

Estado:
  ✅ escuchando  socks5 127.0.0.1:10808 · http 127.0.0.1:10809  (nodo-a)
  ✅ escuchando  socks5 127.0.0.1:10810 · http 127.0.0.1:10811  (nodo-b)
  ✅ escuchando  socks5 127.0.0.1:10812 · http 127.0.0.1:10813  (nodo-c)

Para el launcher (modal Cuentas → VPN / IP distinta):
  Cuenta 5 → protocolo http · host 127.0.0.1 · puerto 10809
             (o protocolo socks5 · host 127.0.0.1 · puerto 10808)
  ...
```

Comandos de gestión:

```bash
node scripts/vpn-per-account.cjs status   # ¿qué está corriendo y escuchando?
node scripts/vpn-per-account.cjs down     # detener todo lo arrancado por el script
```

## Paso 3 — Conéctalo al launcher

1. Menú lateral → **Cuentas**.
2. En la fila de cada cuenta extra (5, 6, …), abre **VPN / IP distinta**:
   - Protocolo: `http` (o `socks5`)
   - Host: `127.0.0.1`
   - Puerto: el que te indicó el script para esa cuenta
3. Guarda. El launcher aplica el proxy solo a la sesión de esa cuenta; las cuentas 1–4 pueden seguir sin proxy.

## Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| `❌ no responde` en algún puerto | Puerto ocupado por otro programa → cambia `--base-port`. |
| El juego sigue diciendo "Límite de cuentas por red" | El nodo es **compartido** y otras personas ya usan esa IP (o el mismo nodo está asignado a dos cuentas). Cambia ese nodo o usa uno distinto. |
| La cuenta entra pero se desconecta / va lenta | Nodo gratuito saturado o caído → prueba otro enlace del archivo. |
| `Descargando v2ray-core…` falla sin internet | Descarga manualmente el ZIP `v2ray-windows-64.zip` de las [releases](https://github.com/v2fly/v2ray-core/releases) y descomprímelo en `.vpn/core/` (debe quedar `.vpn/core/v2ray.exe`). |
| `Config inválida para el puerto …` | El enlace del nodo es incompleto o de un formato raro; revisa esa línea de `servers.txt`. |

## Notas de seguridad y privacidad

- **Confianza en el operador**: quien controla el nodo ve tu tráfico. Con nodos gratuitos, asume que no hay confidencialidad real.
- **Compartición de IP**: los nodos gratis suelen ser compartidos; el límite del juego se aplica por IP, así que "tu" IP puede estar agotada por otros usuarios aunque tú apenas uses una cuenta.
- **Términos del juego**: multi-cuenta con IPs distintas es un área gris de las reglas de Poke Idle World; el riesgo de sanción lo asumes tú.
- El script solo escucha en `127.0.0.1` (localhost): no expone puertos a la red y no requiere cambios en el firewall.
