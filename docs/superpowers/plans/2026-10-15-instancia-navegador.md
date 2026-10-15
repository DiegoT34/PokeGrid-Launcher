# Instancia como navegador — plan de implementación

> **Para quien lo ejecute:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para llevar este plan tarea por tarea. Los pasos usan
> casillas (`- [ ]`) para poder carries el estado.

**Objetivo:** que una instancia pueda navegar —buscador inicial, barra de direcciones por panel y
apertura de enlaces como panel dentro de la misma instancia— sin tocar el soporte de ventanas
emergentes.

**Arquitectura:** el renderer es el dueño de la política: sabe el modo de apertura de cada instancia y
quién tiene los paneles. El proceso principal, al recibir una petición de pestaña nueva, **pregunta al
renderer** y actúa con lo que le conteste; `setWindowOpenHandler` admite respuesta asíncrona. Si nadie
contesta en 1,2 s, cae al comportamiento de hoy (ventana aparte). La barra de direcciones es DOM del
renderer sobre el webview, sin IPC.

**Stack:** Electron 3x, JavaScript sin marcos, sin dependencias nuevas. Pruebas con el lanzador de
Electron de `tests/lanzar.cjs`.

**Spec:** `docs/superpowers/specs/2026-10-15-instancia-navegador-design.md` — léela antes de empezar;
este plan no la sustituye.

## Restricciones globales

- **Cero dependencias nuevas.** Ni un `require` que no exista ya.
- **TDD.** Primero la prueba en rojo, luego el código. Una tarea sin su ciclo rojo-verde no está hecha.
- **Solo pruebas del área.** Nada de la suite entera. El área de esta entrega es
  `tests/instancia-navegador-smoke.js` (se crea en la tarea 1 y crece en cada tarea) más
  `tests/ipc-sender-guard-smoke.js` para los canales nuevos.
- **Ficheros en CRLF.** Todos. Al escribir código desde un guion, terminar con
  `texto.replace(/\n/g, '\r\n')` y comprobarlo.
- **`node --check` después de cada edición.** Es lo que avisa de las dos trampas de este repositorio:
  una coma que falta al final de una entrada de lista, y un punto o paréntesis escapado donde iba
  código plano. Pasa por `npm run check`.
- **Nada de plantillas anidadas.** `` `…${`${x}`}…` `` destruye el guion. Usa concatenación.
- **`will-attach-webview` quiere una ruta del sistema, no una URL `file://`** para el preload. Si se
  pone una URL, Electron avisa solo por consola y no carga nada.
- **Nada se publica.** `git push` y `git tag` son del usuario.
- **Para compilar**: `npm run dist`. Necesita el shim de `pnpm` en
  `C:\Users\Shockviny\AppData\Local\Temp\opencode\shim`, que se pierde cada vez que se limpia el
  temporal; si falla con «pnpm.cmd», rehazlo antes de culpar a nada más.
- **Verificar el paquete**: `node verificar-paquete.cjs`, que lee el `asar` del ZIP recién compilado.
- Al final: versión `0.28.0`.

## Foco de revisión

Las cinco entradas que la spec calla y que son las que más probablemente muerden a quien use esto:

1. **Un enlace con `target="_blank"` desde una instancia de juego**, no de navegador. Debe abrir panel
   igual: la barra es exclusiva del modo navegador, el reparto de aperturas no.
2. **Un destino que no es web** (`mailto:`, `steam://`): al navegador del sistema, nunca a un panel,
   porque una webview no puede abrirlo.
3. **Una instancia con doce paneles y todos originales**: no hay nada reciclable. Debe avisar y no
   abrir, sin romper nada ni quedarse a medias.
4. **Texto que parece una dirección pero no lo es**: «poke.co» debería ir a `https://poke.co`, pero
   «pokemon go» a una búsqueda. Y «sin nada» no debe navegar a una página en blanco.
5. **Una cadena de aperturas**: una ventana que a su vez pide otra ventana. El tope de seis ventanas
   tiene que seguir cortando, o un bucle de anuncios se come el escritorio.

Cada línea tiene su prueba en la tarea que posee el código, en el estilo de esa tarea.

---

## Estructura de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/index.html` | Modal «Agregar otro juego»: los campos nuevos. La barra no necesita maqueta: la construye el renderer. |
| `src/renderer.js` | Modelo de la instancia, barra, navegación, reparto de paneles y reciclado, persistencia del inicio. |
| `src/main.js` | La pregunta al renderer desde `setWindowOpenHandler` y el aviso de que una instancia quiere abrir algo. |
| `src/preload.js` | Los tres canales nuevos. |
| `src/styles.css` | La barra y sus estados; reglas de mosaico de 7 a 12. |
| `tests/instancia-navegador-smoke.js` | El área entera, creciendo tarea a tarea. |
| `tests/fixtures/navegador-prueba.html` | Página local con enlace a pestaña nueva y ventana con medidas. |

Nada se parte en ficheros nuevos: `renderer.js` es enorme pero ya lo está, y partirlo en esta entrega
sería refactorizar sin necesidad. Las unidades nuevas son **funciones**, no ficheros.

---

### Tarea 1: El modelo de la instancia y el modal

El interruptor de estilo navegador, el buscador inicial y el modo de apertura, con sus campos.

**Ficheros:**
- Modifica: `src/index.html` (modal «Agregar otro juego», tras `#browserInstanceCount`)
- Modifica: `src/renderer.js` (`normalizeBrowserInstance`, las referencias del modal, el `submit` del
  formulario)
- Crea: `tests/instancia-navegador-smoke.js`
- Test: `tests/instancia-navegador-smoke.js`

**Produce:**
- `const BUSCADORES` — `{ ddg, google, bing }`, cada valor la base a la que se le pega la consulta.
- `function inicioDeInstancia(instance)` → `string`. La página de partida: el buscador si
  `instance.navegador && instance.buscador`, si no `instance.inicio || instance.url`.
- `function normalizarOpcionesDeInstancia(valor)` → `{ navegador, buscador, inicio, apertura }`,
  aplicada dentro de `normalizeBrowserInstance`.
- Globales del renderer: `browserInstanceBuscador`, `browserInstanceApertura`.

- [ ] **Paso 1: la prueba que falla, y la página que necesita**

Antes de la prueba, la página de prueba. Hace falta desde la tarea 2 y la crea aquí para que no
aparezca a mitad del plan. `tests/fixtures/navegador-prueba.html`:

```html
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Página de prueba</title></head>
<body style="font:16px system-ui;background:#0d1418;color:#dfe9ee;padding:24px">
  <h1>Página de prueba</h1>
  <a id="pestana" href="https://ejemplo.invalid/pestana" target="_blank">Abrir en pestaña nueva</a>
  <button id="login" type="button">Abrir ventana de inicio de sesión</button>
  <button id="correo" type="button">Abrir un correo</button>
  <script>
    document.getElementById('login').addEventListener('click', () => {
      window.open('https://ejemplo.invalid/login', 'login', 'width=520,height=700');
    });
    document.getElementById('correo').addEventListener('click', () => {
      window.location.href = 'mailto:correo@example.invalid';
    });
  </script>
</body>
</html>
```

Es una página local porque las instancias solo admiten HTTPS y esta prueba no necesita Internet. El
proceso real —que un enlace de verdad sea una pestaña o una ventana— lo provoca un `<a target="_blank">`
de verdad, no una llamada a la función del launcher.

Crea `tests/instancia-navegador-smoke.js` con el arranque que usan las demás pruebas del área —el mismo
de `tests/instancia-vista-smoke.js`: `require('../src/main.js')` con
`process.env.POKEGRID_DIAGNOSTIC_USER_DATA` a un temporal, esperar a `window.__arranqueVista === 'ok'`,
y salir con `app.exit(fallos.length ? 1 : 0)`— y esta cabecera, que fija la página de prueba:

```js
const { pathToFileURL } = require('node:url');
const paginaNavegador = pathToFileURL(
  path.join(__dirname, '..', 'fixtures', 'navegador-prueba.html')
).href;
```

y esta comprobación:

```js
const modelo = await ventana.webContents.executeJavaScript(`(() => {
  const conBuscador = normalizeBrowserInstance({
    id: 'prueba-a', name: 'A', url: 'https://ejemplo.invalid/', count: 2,
    navegador: true, buscador: 'google', apertura: 'panel'
  });
  const conUrl = normalizeBrowserInstance({
    id: 'prueba-b', name: 'B', url: 'https://ejemplo.invalid/juego', count: 1
  });
  const conVentana = normalizeBrowserInstance({
    id: 'prueba-c', name: 'C', url: 'https://ejemplo.invalid/', count: 1, apertura: 'ventana'
  });
  return {
    buscador: conBuscador.buscador,
    apertura: conBuscador.apertura,
    inicioVacio: conBuscador.inicio === '',
    sinCambios: [conUrl.navegador, conUrl.buscador, conUrl.apertura],
    ventana: conVentana.apertura,
    inicioDeBuscador: inicioDeInstancia(conBuscador),
    inicioDeUrl: inicioDeInstancia(conUrl),
    motores: Object.keys(BUSCADORES)
  };
})()`);
comprobar(modelo.buscador === 'google' && modelo.apertura === 'panel',
  'una instancia de navegador guarda su buscador y su modo de apertura', JSON.stringify(modelo));
comprobar(modelo.inicioVacio === true,
  'y arranca en el buscador, así que no necesita dirección de inicio', String(modelo.inicioVacio));
comprobar(modelo.sinCambios.join(',') === 'false,ddg,auto',
  'una instancia normal no cambia de comportamiento', modelo.sinCambios.join(','));
comprobar(modelo.ventana === 'ventana', 'y se puede fijar en «siempre ventana aparte»', modelo.ventana);
comprobar(modelo.inicioDeBuscador === BUSCADORES.google,
  'el buscador es la página de partida de una instancia de navegador', modelo.inicioDeBuscador);
comprobar(modelo.inicioDeUrl === 'https://ejemplo.invalid/juego',
  'y en una normal es su URL', modelo.inicioDeUrl);
comprobar(modelo.motores.join(',') === 'ddg,google,bing', 'hay tres motores', modelo.motores.join(','));
```

- [ ] **Paso 2: correrla y ver que falla**

```
cd C:\Users\Shockviny\Downloads\PokeGrid-Launcher
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
```
Esperado: `ReferenceError: BUSCADORES is not defined` y la cuenta de fallos en rojo.

- [ ] **Paso 3: el modelo**

En `src/renderer.js`, junto a `normalizeBrowserInstance`:

```js
// Los motores de búsqueda de las instancias de estilo navegador. El de fábrica es DuckDuckGo: no
// mete el diálogo de consentimiento que se come media pantalla, que en un panel pequeño es
// inservible.
const BUSCADORES = Object.freeze({
  ddg: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q='
});
const BUSCADOR_POR_DEFECTO = 'ddg';
const APERTURA_POR_DEFECTO = 'auto';
const MODOS_DE_APERTURA = Object.freeze(['auto', 'panel', 'ventana']);

// Lo que no viene en una instancia guardada antes de esto se rellena aquí. No se reescribe
// `localStorage`: los valores por defecto se aplican al leer, y lo que se guarda después ya viene
// completo. Una instancia vieja se ve igual que antes.
function normalizarOpcionesDeInstancia(valor) {
  const opciones = valor && typeof valor === 'object' ? valor : {};
  const navegador = Boolean(opciones.navegador);
  const buscador = Object.prototype.hasOwnProperty.call(BUSCADORES, opciones.buscador)
    ? opciones.buscador
    : BUSCADOR_POR_DEFECTO;
  const apertura = MODOS_DE_APERTURA.includes(opciones.apertura)
    ? opciones.apertura
    : APERTURA_POR_DEFECTO;
  const inicio = String(opciones.inicio || '').slice(0, 1000);
  return { navegador, buscador, apertura, inicio };
}

// La página de partida. El modo navegador arranca en el buscador —por eso el campo de enlace
// deja de ser obligatorio— y el resto arranca en su dirección.
function inicioDeInstancia(instance) {
  if (instance.navegador) return BUSCADORES[instance.buscador] || BUSCADORES[BUSCADOR_POR_DEFECTO];
  return instance.inicio || instance.url;
}
```

Y en `normalizeBrowserInstance`, dentro del `return`, sustituye la forma actual por:

```js
    return { id, name, url, count, ...normalizarOpcionesDeInstancia(value) };
```

- [ ] **Paso 4: los campos del modal**

En `src/index.html`, después del `<select id="browserInstanceCount">`:

```html
          <label class="field">
            <span>C&Oacute;MO EMPIEZA</span>
            <select id="browserInstanceStart">
              <option value="buscador">En un buscador (estilo navegador)</option>
              <option value="url" selected>En el enlace de arriba</option>
            </select>
          </label>
          <label class="field" id="browserInstanceBuscadorField" hidden>
            <span>MOTOR DE B&Uacute;SQUEDA</span>
            <select id="browserInstanceBuscador">
              <option value="ddg" selected>DuckDuckGo</option>
              <option value="google">Google</option>
              <option value="bing">Bing</option>
            </select>
          </label>
          <label class="field">
            <span>LOS ENLACES NUEVOS SE ABREN</span>
            <select id="browserInstanceApertura">
              <option value="auto" selected>En la misma instancia, seg&uacute;n el enlace</option>
              <option value="panel">Siempre en un panel de la instancia</option>
              <option value="ventana">Siempre en una ventana aparte</option>
            </select>
          </label>
```

En `src/renderer.js`, junto a las referencias del modal:

```js
const browserInstanceStart = document.querySelector('#browserInstanceStart');
const browserInstanceBuscador = document.querySelector('#browserInstanceBuscador');
const browserInstanceBuscadorField = document.querySelector('#browserInstanceBuscadorField');
const browserInstanceApertura = document.querySelector('#browserInstanceApertura');
```

Y al abrir el modal, en la función que lo prepara, y en el `submit`:

```js
  // Mostrar u ocultar el motor según cómo vaya a empezar. Con buscador, el campo de enlace deja de
  // ser obligatorio: por eso hay que quitarle el `required` mientras siga escondido.
  const sincronizarInicioElegido = () => {
    const conBuscador = browserInstanceStart.value === 'buscador';
    browserInstanceBuscadorField.hidden = !conBuscador;
    browserInstanceUrl.required = !conBuscador;
    browserInstanceUrlField.hidden = conBuscador;
  };
  browserInstanceStart.addEventListener('change', sincronizarInicioElegido);
  sincronizarInicioElegido();
```

En el `submit`, dentro del `normalizeBrowserInstance`:

```js
      navegador: browserInstanceStart.value === 'buscador',
      buscador: browserInstanceBuscador.value,
      apertura: browserInstanceApertura.value,
      inicio: browserInstanceStart.value === 'buscador' ? '' : browserInstanceUrl.value,
```

La referencia `browserInstanceUrlField` no existe todavía: créala junto a las demás
(`document.querySelector('.browser-instance-url-field')`) y úsala.

- [ ] **Paso 5: correrla y ver que pasa**

```
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
npm run check
```
Esperado: todas las comprobaciones en `ok` y `check` en 0.

- [ ] **Paso 6: commit**

```bash
git add src/index.html src/renderer.js tests/instancia-navegador-smoke.js
git commit -m "El modelo de la instancia: buscador de partida y modo de apertura

Una instancia puede arrancar en un motor de busqueda en vez de en una URL fija, y decide
que se hace con los enlaces que piden pestana nueva. Los valores que no vienen se rellenan
al leer, sin reescribir localStorage: una instancia guardada antes de esto se ve igual que
antes."
```

---

### Tarea 2: La barra de direcciones

La superficie que ve el usuario. Solo en instancias de estilo navegador.

**Ficheros:**
- Modifica: `src/renderer.js` (`createBrowserInstancePanel`, y las funciones nuevas de navegación)
- Modifica: `src/styles.css`
- Test: `tests/instancia-navegador-smoke.js`

**Produce:**
- Dos iconos nuevos en `LAUNCHER_ICON_PATHS`: `volver` y `adelante`.
- `function resolverDestino(texto, buscadorBase)` → `string`. Devuelve la URL a la que navegar, o `''`.
- `function pareceDireccion(texto)` → `boolean`.
- `function panelConFoco()` → `panel | null`.
- `function pintarBarraDeNavegacion(panel)` → pone la dirección visible y el estado de atrás/adelante.
- `function navegar(panel, texto)` → resuelve y carga.
- `function guardarInicioDeInstancia(instanceId, url)` → persiste `inicio`.
- El panel gana `barra`, `campoDireccion`, `botonAtras`, `botonAdelante`.

- [ ] **Paso 1: la prueba que falla**

Añade a `tests/instancia-navegador-smoke.js`:

```js
// Una instancia de verdad, creada con el navegador puesto, para mirar su panel. Se llama a la
// función de creación en vez de pasar por el modal porque el modal solo admite HTTPS y aquí hace
// falta una página local.
await ventana.webContents.executeJavaScript(`(() => {
  createBrowserInstanceWorkspace({
    id: 'inst-nav', name: 'Navegador', url: ${JSON.stringify(paginaNavegador)},
    count: 1, navegador: true, buscador: 'ddg', inicio: '', apertura: 'auto'
  }, 0);
  createBrowserInstanceWorkspace({
    id: 'inst-juego', name: 'Juego', url: ${JSON.stringify(paginaNavegador)},
    count: 1, navegador: false, buscador: 'ddg', inicio: '', apertura: 'auto'
  }, 1);
  return true;
})()`);

const destinos = await ventana.webContents.executeJavaScript(`({
  web: resolverDestino('https://ejemplo.invalid/x', BUSCADORES.ddg),
  sinProtocolo: resolverDestino('poke.co', BUSCADORES.ddg),
  conPuntoRaro: resolverDestino('hola.com.mx', BUSCADORES.ddg),
  texto: resolverDestino('pokemon moves', BUSCADORES.ddg),
  vacio: resolverDestino('   ', BUSCADORES.ddg),
  conEspacios: resolverDestino('poke survivor game', BUSCADORES.ddg),
  ancho: resolverDestino('localhost:3000', BUSCADORES.ddg)
})`);
comprobar(destinos.web === 'https://ejemplo.invalid/x', 'una dirección se respeta tal cual', destinos.web);
comprobar(destinos.sinProtocolo === 'https://poke.co/', 'un dominio sin protocolo va con https', destinos.sinProtocolo);
comprobar(destinos.conPuntoRaro === 'https://hola.com.mx/', 'y con dominio completo también', destinos.conPuntoRaro);
comprobar(destinos.texto === BUSCADORES.ddg + 'pokemon+movements',
  'un texto se busca en el buscador', destinos.texto);
comprobar(destinos.vacio === '', 'nada escrito no navega a ninguna parte', JSON.stringify(destinos.vacio));
comprobar(!/localhost/.test(destinos.ancho) && /q=/.test(destinos.ancho),
  'algo con dos puntos y sin espacios se busca, no se toma por una dirección', destinos.ancho);

const barras = await ventana.webContents.executeJavaScript(`(() => {
  const delNavegador = browserInstanceViews.get('inst-nav').panels[0];
  const delJuego = browserInstanceViews.get('inst-juego').panels[0];
  return {
    barraEnNavegador: Boolean(delNavegador.barra),
    barraEnJuego: Boolean(delJuego.barra),
    hayAtras: Boolean(delNavegador.botonAtras),
    hayAdelante: Boolean(delNavegador.botonAdelante),
    hayCampo: Boolean(delNavegador.campoDireccion),
    atrasGris: delNavegador.botonAtras.disabled,
    adelanteGris: delNavegador.botonAdelante.disabled
  };
})()`);
comprobar(barras.barraEnNavegador && barras.hayAtras && barras.hayAdelante && barras.hayCampo,
  'la instancia de navegador tiene barra completa', JSON.stringify(barras));
comprobar(barras.barraEnJuego === false, 'la de juego no la tiene', JSON.stringify(barras));
comprobar(barras.atrasGris && barras.adelanteGris,
  'atrás y adelante están grises sin historial', JSON.stringify(barras));
```

- [ ] **Paso 2: correrla y ver que falla**

Esperado: `ReferenceError: resolverDestino is not defined`.

- [ ] **Paso 3: decidir si es dirección o búsqueda**

```js
// Qué es una dirección y qué es una pregunta. El criterio es el de un navegador corriente: que
// tenga esquema, o un punto y ningún espacio, y que `new URL()` la entienda.
function pareceDireccion(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio || /\s/.test(limpio)) return false;
  if (/^https?:\/\//i.test(limpio)) return true;
  if (!/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(limpio)) return false;
  try { return Boolean(new URL(limpio.includes('://') ? limpio : `https://${limpio}`)); }
  catch { return false; }
}

function resolverDestino(texto, buscadorBase) {
  const limpio = String(texto || '').trim();
  if (!limpio) return '';
  if (pareceDireccion(limpio)) return limpio.includes('://') ? limpio : `https://${limpio}`;
  const consulta = encodeURIComponent(limpio).replace(/%20/g, '+');
  return `${buscadorBase || BUSCADORES.ddg}${consulta}`;
}
```

El `replace(/%20/g, '+')` es para que la consulta se lea como en la barra de un navegador, no con
%20 por medio.

- [ ] **Paso 4: los iconos**

En `LAUNCHER_ICON_PATHS`, dos entradas más:

```js
  volver: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  adelante: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
```

Cada entrada lleva su coma. Es la trampa que ha tumbado el fichero tres veces: al añadir una entrada
al final de una lista, comprobar con `npm run check` antes de seguir.

- [ ] **Paso 5: la barra en el panel**

En `createBrowserInstancePanel`, antes de `actions.append(...)`:

```js
  // La barra sustituye al nombre y al estado SOLO en instancias de estilo navegador. En los juegos
  // se quedan como estaban, y la barra principal de Poke Idle World ni se mira.
  let barra = null;
  let campoDireccion = null;
  let botonAtras = null;
  let botonAdelante = null;
  if (instance.navegador) {
    barra = document.createElement('nav');
    barra.className = 'browser-instance-navegacion';
    botonAtras = document.createElement('button');
    botonAtras.type = 'button';
    botonAtras.className = 'navegacion-atras';
    botonAtras.innerHTML = launcherUiIcon('volver');
    botonAtras.title = 'Atrás';
    botonAtras.disabled = true;
    botonAdelante = document.createElement('button');
    botonAdelante.type = 'button';
    botonAdelante.className = 'navegacion-adelante';
    botonAdelante.innerHTML = launcherUiIcon('adelante');
    botonAdelante.title = 'Adelante';
    botonAdelante.disabled = true;
    const recargar = document.createElement('button');
    recargar.type = 'button';
    recargar.className = 'navegacion-recargar';
    recargar.innerHTML = launcherUiIcon('refresh');
    recargar.title = 'Recargar esta pantalla';
    campoDireccion = document.createElement('input');
    campoDireccion.type = 'text';
    campoDireccion.className = 'navegacion-direccion';
    campoDireccion.placeholder = 'Escribe una dirección o busca';
    campoDireccion.spellcheck = false;
    campoDireccion.setAttribute('aria-label', 'Dirección de la pantalla');
    barra.append(botonAtras, botonAdelante, recargar, campoDireccion);
    panelbar.insertBefore(barra, panelbar.firstChild);
  }
```

Y en el objeto `panel`, añade `barra, campoDireccion, botonAtras, botonAdelante, destinoActual: ''`.

- [ ] **Paso 6: la navegación**

```js
function actualizarEstadoDeHistorial(panel) {
  if (!panel?.botonAtras) return;
  const antes = Boolean(panel.webview.canGoBack?.());
  const despues = Boolean(panel.webview.canGoForward?.());
  panel.botonAtras.disabled = !antes;
  panel.botonAdelante.disabled = !despues;
  panel.puedeAtras = antes;
  panel.puedeAdelante = despues;
}

function pintarBarraDeNavegacion(panel) {
  if (!panel?.campoDireccion) return;
  const actual = webviewCurrentUrl(panel) || panel.destinoActual || '';
  if (document.activeElement !== panel.campoDireccion) panel.campoDireccion.value = actual;
  actualizarEstadoDeHistorial(panel);
}

// Al escribir una dirección, esa pasa a ser el inicio de la instancia y se guarda. Se declara
// aquí a propósito: si la instancia tiene varios paneles, actualiza el inicio y TODOS sus paneles
// originales abrirán esa página la próxima vez. Los paneles abiertos por enlace no cambian.
function guardarInicioDeInstancia(instanceId, url) {
  const instance = browserInstances.find((row) => row.id === instanceId);
  if (!instance || !url) return;
  instance.inicio = url;
  saveBrowserInstances();
}

function navegar(panel, texto) {
  if (!panel || panel.destroyed) return;
  const instance = browserInstances.find((row) => row.id === panel.instanceId);
  const destino = resolverDestino(texto, instance ? BUSCADORES[instance.buscador] : BUSCADORES.ddg);
  if (!destino) return;
  panel.destinoActual = destino;
  panel.connectionFailures = 0;
  loadConnectionPanel(panel, destino, { reason: 'Navegando' });
  pintarBarraDeNavegacion(panel);
}
```

Conecta en `createBrowserInstancePanel`, dentro del `if (instance.navegador)` de más abajo:

```js
    recargar.addEventListener('click', () => {
      panel.connectionFailures = 0;
      loadConnectionPanel(panel, webviewCurrentUrl(panel), { reason: 'Recargando' });
    });
    campoDireccion.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const destino = resolverDestino(campoDireccion.value, BUSCADORES[instance.buscador]);
        if (destino) guardarInicioDeInstancia(instance.id, destino);
        navegar(panel, campoDireccion.value);
        panel.campoDireccion.blur();
        return;
      }
      if (event.key === 'Escape') {
        pintarBarraDeNavegacion(panel);
        panel.campoDireccion.blur();
      }
    });
    botonAtras.addEventListener('click', () => {
      if (!panel.puedeAtras) return;
      panel.webview.goBack();
      pintarBarraDeNavegacion(panel);
    });
    botonAdelante.addEventListener('click', () => {
      if (!panel.puedeAdelante) return;
      panel.webview.goForward();
      pintarBarraDeNavegacion(panel);
    });
```

En el panel, el botón de inicio pasa a usar el inicio de la instancia:

```js
  homeButton.addEventListener('click', () => {
    panel.connectionFailures = 0;
    loadConnectionPanel(panel, inicioDeInstancia(instance), { reason: 'Abriendo inicio' });
  });
```

Y en `attachResilientWebview`, su `onNavigate` ya recibe el evento: al final, dentro de
`if (panel.campoDireccion) pintarBarraDeNavegacion(panel);`.

Falta el **Ctrl+L**: en el `document.addEventListener('keydown')` del arranque, dentro del bloque
aislado que ya existe:

```js
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && !event.shiftKey && !event.altKey && (event.key === 'l' || event.key === 'L')) {
        const panel = panelConFoco();
        if (panel?.campoDireccion) {
          event.preventDefault();
          panel.campoDireccion.focus();
          panel.campoDireccion.select();
        }
        return;
      }
      if (event.key !== 'Escape') return;
      // …lo que ya había
    });
```

con

```js
// El panel sobre el que está el foco. Si el foco está dentro de un panel, ese; si no, el único
// visible, que es el caso normal: hay una instancia abierta.
function panelConFoco() {
  const activo = document.activeElement?.closest?.('.browser-instance-panel');
  if (activo) {
    for (const view of browserInstanceViews.values()) {
      const panel = view.panels.find((row) => row.element === activo);
      if (panel) return panel;
    }
  }
  const visibles = [];
  for (const view of browserInstanceViews.values()) {
    if (!view.workspace.classList.contains('is-active')) continue;
    visibles.push(view.panels.find((row) => row.element.classList.contains('is-expanded')) || view.panels[0]);
  }
  return visibles.find(Boolean) || null;
}
```

- [ ] **Paso 7: la dirección se queda escrita si la página no carga**

Un navegador deja lo que escribiste cuando la página falla, para poder corregirlo sin volver a
escribirlo. Añade esta comprobación al test:

```js
const trasFallo = await ventana.webContents.executeJavaScript(`(() => {
  const panel = browserInstanceViews.get('inst-nav').panels[0];
  panel.campoDireccion.value = 'https://ejemplo.invalid/no-existe';
  panel.campoDireccion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return panel.destinoActual;
})()`);
comprobar(trasFallo === 'https://ejemplo.invalid/no-existe',
  'lo que escribes es lo que queda apuntado, aunque la página no cargue', trasFallo);
```

- [ ] **Paso 8: los estilos**

```css
/* La barra de direcciones. Solo existe en instancias de estilo navegador, así que aquí no hace
  falta ni un selector para los juegos: lo que no existe no hay que esconderlo. */
.browser-instance-navegacion {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.browser-instance-navegacion button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #b9cbd6;
  cursor: pointer;
}
.browser-instance-navegacion button:hover:not(:disabled) { color: #effcff; border-color: #3d5563; }
.browser-instance-navegacion button:disabled { opacity: .3; cursor: default; }
.browser-instance-navegacion svg { width: 14px; height: 14px; }
.navegacion-direccion {
  flex: 1 1 auto;
  min-width: 0;
  height: 22px;
  padding: 0 8px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 6px;
  background: rgba(255, 255, 255, .05);
  color: #e9f1f6;
  font-size: 12px;
}
.navegacion-direccion:focus { outline: none; border-color: #5ec7dd; }
```

En la regla de pantalla completa que ya existe (`.instancia-pantalla-completa
.browser-instance-panelbar`) la barra no necesita reglas nuevas: hereda la opacidad con la que la
franja se atenúa hasta que pasa el ratón.

- [ ] **Paso 9: correrla y ver que pasa**

```
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
npm run check
```

- [ ] **Paso 10: commit**

```bash
git add src/renderer.js src/styles.css tests/instancia-navegador-smoke.js
git commit -m "La barra de direcciones en las instancias de navegador

Atras, adelante, recargar, la direccion y el inicio. Solo en las instancias de estilo
navegador: los juegos se quedan con su nombre y su estado, y la barra principal de Poke Idle
World no se toca.

Escribir una direccion la guarda como inicio de la instancia, y un texto se busca en el motor
elegido."
```

---

### Tarea 3: Un enlace pide pestaña y abre un panel

El reparto de aperturas. La política vive en el renderer; el proceso principal pregunta.

**Ficheros:**
- Modifica: `src/main.js` (`setWindowOpenHandler` de los webview de instancia)
- Modifica: `src/renderer.js`
- Modifica: `src/preload.js`
- Crea: `tests/fixtures/navegador-prueba.html`
- Test: `tests/instancia-navegador-smoke.js`

**Produce:**
- `main.js`: `pendientesDeApertura` (Map), `preguntarModoDeApertura(contents)` → `'auto' | 'panel' | 'ventana'`
- `main.js`: canal `instancia:responder-apertura` (`ipcMain.on`), el aviso `instancia:preguntar-apertura`
- `preload.js`: `responderApertura(id, modo)`, `onPreguntarApertura(fn)`
- `renderer.js`: `modoDeAperturaDeInstancia(instanceId)`, `crearPanelDeEnlace(instance, url)`

- [ ] **Paso 1: la prueba que falla**

La página de prueba ya está, se creó en la tarea 1. Lo que se añade aquí es lo que se comprueba:
un enlace de verdad que pide pestaña, una ventana con medidas y un destino que no es web.

```js
const idPestana = await ventana.webContents.executeJavaScript(`(() => {
  const panel = browserInstanceViews.get('inst-nav').panels[0];
  panel.webview.executeJavaScript("document.querySelector('#pestana').click()");
  return panel.webview.getWebContentsId();
})()`);
await dormir(1500);

const reparto = await ventana.webContents.executeJavaScript(`(() => {
  const view = browserInstanceViews.get('inst-nav');
  return { paneles: view.panels.length, origenes: view.panels.map((p) => p.origen || 'sin-origen') };
})()`);
comprobar(reparto.paneles === 2, 'un enlace a pestaña nueva abre un panel en la instancia',
  `paneles: ${reparto.paneles}`);
comprobar(reparto.origenes.includes('enlace'), 'y ese panel es de enlace, no original',
  reparto.origenes.join(','));

// Lo que de verdad importa: el panel nuevo comparte la sesión con el resto, o no serviría de nada.
// Que compartan el objeto `session` es exactamente lo que hace que las cookies estén ahí.
const idsDePaneles = await ventana.webContents.executeJavaScript(
  'browserInstanceViews.get("inst-nav").panels.map((p) => p.webview.getWebContentsId())'
);
const sesiones = idsDePaneles.map((id) => webContents.fromId(id)).filter(Boolean);
comprobar(sesiones.length === 2 && sesiones.every((c) => c.session === sesiones[0].session),
  'y los paneles de una instancia comparten la sesión y las cookies',
  `${sesiones.length} paneles, misma sesión: ${sesiones.length > 1 && sesiones.every((c) => c.session === sesiones[0].session)}`);

// La barra es solo del modo navegador, pero el REPARTO de aperturas no: un enlace de una instancia
// de juego también abre un panel, porque el reparto no depende de la barra.
const desdeJuego = await ventana.webContents.executeJavaScript(`(() => {
  const view = browserInstanceViews.get('inst-juego');
  view.panels[0].webview.executeJavaScript("document.querySelector('#pestana').click()");
  return view.panels.length;
})()`);
await dormir(1500);
const despuesJuego = await ventana.webContents.executeJavaScript(
  'browserInstanceViews.get("inst-juego").panels.length'
);
comprobar(despuesJuego === desdeJuego + 1,
  'un enlace desde una instancia de juego también abre un panel allí',
  `antes: ${desdeJuego}, despues: ${despuesJuego}`);

// Un destino que no es web no puede abrirlo una webview: eso va al sistema, como hasta ahora.
const conCorreo = await ventana.webContents.executeJavaScript(`(() => {
  const view = browserInstanceViews.get('inst-nav');
  view.panels[0].webview.executeJavaScript("document.querySelector('#correo').click()");
  return view.panels.length;
})()`);
await dormir(1500);
const despuesCorreo = await ventana.webContents.executeJavaScript(
  'browserInstanceViews.get("inst-nav").panels.length'
);
comprobar(despuesCorreo === conCorreo,
  'un destino que no es web no abre panel: se va al sistema',
  `antes: ${conCorreo}, despues: ${despuesCorreo}`);

// Y lo que el usuario corrigió: una ventana de inicio de sesión SIGUE saliendo en ventana aparte,
// con su tope de seis. Es lo que hace posible iniciar sesión en cosas que no son el juego.
const ventanasAntes = BrowserWindow.getAllWindows().length;
await ventana.webContents.executeJavaScript(
  "browserInstanceViews.get('inst-nav').panels[0].webview.executeJavaScript(\"document.querySelector('#login').click()\")"
);
await dormir(2000);
const ventanasDespues = BrowserWindow.getAllWindows().length;
comprobar(ventanasDespues > ventanasAntes,
  'una ventana con medidas propias sigue saliendo en ventana aparte, no en un panel',
  `ventanas: ${ventanasAntes} -> ${ventanasDespues}`);
comprobar(ventanasDespues <= ventanasAntes + 1,
  'y sale una sola, no se encadena una detrás de otra',
  `ventanas: ${ventanasDespues}`);

// Y el tope de seis: del que ya existe, pero que esta tarea puede romper al preguntar antes de
// responder. Ocho veces seguidas, y no puede haber más de seis.
for (let vuelta = 0; vuelta < 8; vuelta += 1) {
  await ventana.webContents.executeJavaScript(
    "browserInstanceViews.get('inst-nav').panels[0].webview.executeJavaScript(\"document.querySelector('#login').click()\")"
  );
  await dormir(300);
}
await dormir(1500);
const ventanasTope = BrowserWindow.getAllWindows().length;
comprobar(ventanasTope <= 7,
  'y ocho ventanas seguidas se paran en el tope, para que un bucle no se coma el escritorio',
  `ventanas: ${ventanasTope}`);
for (const extra of BrowserWindow.getAllWindows()) {
  if (extra !== ventana) extra.destroy();
}
```

- [ ] **Paso 2: correrla y ver que falla**

Esperado: `paneles: 1`.

- [ ] **Paso 3: el proceso principal pregunta**

En `src/main.js`, junto a las funciones de ventana emergente:

```js
// Las preguntas que el proceso principal le hace al renderer. Vive en un Map porque cada pregunta
// es una vuelta del IPC con su respuesta y con su reloj: si el renderer no contesta —que es lo que
// pasa si la ventana del launcher se está cerrando— la pregunta caduca y se cae al comportamiento
// de hoy.
const preguntasDeApertura = new Map();
const PREGUNTA_ABIERTURA_MS = 1200;

function preguntarModoDeApertura(contents) {
  if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve('ventana');
  return new Promise((resolver) => {
    const id = (preguntasDeApertura.size ? Math.max(...preguntasDeApertura.keys()) : 0) + 1;
    const reloj = setTimeout(() => {
      preguntasDeApertura.delete(id);
      resolver('ventana');
    }, PREGUNTA_ABIERTURA_MS);
    preguntasDeApertura.set(id, (modo) => {
      clearTimeout(reloj);
      preguntasDeApertura.delete(id);
      resolver(modo);
    });
    mainWindow.webContents.send('instancia:preguntar-apertura', { id, webContentsId: contents.id });
  });
}
```

En `setWindowOpenHandler` del webview de instancia, delante de la lógica de ventanas:

```js
    // Primero se pregunta al renderer, que es quien sabe el modo de apertura de la instancia. Si no
    // contesta, `preguntarModoDeApertura` devuelve 'ventana' y sigue todo como hasta ahora.
    const modo = await preguntarModoDeApertura(contents);
    if ((modo === 'panel' || modo === 'auto') && urlPermitidaEnVentana(url) && !pideVentanaConMedidas(features)) {
      mainWindow?.webContents?.send('instancia:peticion-pestana', { webContentsId: contents.id, url });
      return { action: 'deny' };
    }
```

y el detector de ventana con medidas:

```js
// Una ventana con medidas propias es un inicio de sesión, una pasarela: eso sigue saliendo aparte.
// Un `target="_blank"` normal no trae nada aquí, y por eso se distinguen tan bien.
function pideVentanaConMedidas(features) {
  const texto = String(features || '');
  return /(^|[\s,;])(width|height)\s*=/i.test(texto);
}
```

El manejador de apertura puede ser asíncrono: hay que poner `async` en
`contents.setWindowOpenHandler(async ({ url, features }) => { … })`.

Y el canal que recoge la respuesta:

```js
ipcMain.on('instancia:responder-apertura', (event, datos) => {
  if (!isMainWindowSender(event)) return;
  const id = Number(datos && datos.id);
  const resolver = preguntasDeApertura.get(id);
  if (resolver) resolver(String(datos.modo || 'ventana'));
});
```

- [ ] **Paso 4: el preload**

```js
  responderApertura: (id, modo) => ipcRenderer.send('instancia:responder-apertura', { id, modo }),
  onPreguntarApertura: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:preguntar-apertura', handler);
    return () => ipcRenderer.removeListener('instancia:preguntar-apertura', handler);
  },
  onPeticionPestana: (listener) => {
    const handler = (_event, value) => listener(value);
    ipcRenderer.on('instancia:peticion-pestana', handler);
    return () => ipcRenderer.removeListener('instancia:peticion-pestana', handler);
  },
```

- [ ] **Paso 5: el renderer responde y crea el panel**

```js
function modoDeAperturaDeInstancia(instanceId) {
  const instance = browserInstances.find((row) => row.id === instanceId);
  return instance?.apertura || APERTURA_POR_DEFECTO;
}

// Un aviso en la franja del panel. Se queda también en `window.__avisoInstancia` para que la
// prueba pueda leerlo: el texto que ve una persona no se puede leer desde fuera.
function avisarEnPanel(panel, texto) {
  if (!panel?.element) return;
  panel.element.dataset.aviso = texto;
  window.__avisoInstancia = texto;
}

// Marca los paneles que creó la instancia al arrancar. Los que se abren por enlace llevan
// `origen: 'enlace'`, y esa es la diferencia de la que depende el reciclado: un original es una
// cuenta del usuario y no se toca nunca.
function marcarPanelesOriginales(panels) {
  for (const panel of panels) if (!panel.origen) panel.origen = 'inicial';
}

// Abre la URL en un panel NUEVO de esa instancia. Devuelve el panel, o null si no se pudo: eso
// pasa cuando la instancia ya no tiene un panel donde ponerlo.
function crearPanelDeEnlace(instance, url) {
  const view = browserInstanceViews.get(instance.id);
  if (!view) return null;
  const panel = createBrowserInstancePanel(instance, view.workspace, view.panels.length, 0);
  panel.origen = 'enlace';
  view.workspace.dataset.viewCount = String(view.panels.length);
  panel.connectionFailures = 0;
  loadConnectionPanel(panel, url, { reason: 'Enlace abierto en la instancia' });
  return panel;
}
```

Y en `createBrowserInstanceWorkspace`, justo antes de `const view = { instance, workspace, panels: panelsForInstance };`:
una llamada a `marcarPanelesOriginales(panelsForInstance)`.

En el bloque de arranque:

```js
    window.pokeGrid?.onPreguntarApertura?.(({ id, webContentsId }) => {
      const panel = panelDeWebContents(webContentsId);
      window.pokeGrid.responderApertura(id, panel ? modoDeAperturaDeInstancia(panel.instanceId) : 'ventana');
    });
    window.pokeGrid?.onPeticionPestana?.(({ webContentsId, url }) => {
      const panel = panelDeWebContents(webContentsId);
      if (!panel) return;
      const instance = browserInstances.find((row) => row.id === panel.instanceId);
      if (!instance) return;
      const creado = crearPanelDeEnlace(instance, url);
      if (!creado) avisarEnPanel(panel, 'No se ha podido abrir: la instancia no admite más pantallas.');
    });
```

- [ ] **Paso 6: correrla y ver que pasa**

```
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
npm run check
node tests\ipc-sender-guard-smoke.js
```

- [ ] **Paso 7: commit**

```bash
git add src/main.js src/preload.js src/renderer.js tests/fixtures/navegador-prueba.html tests/instancia-navegador-smoke.js
git commit -m "Un enlace que pide pestana abre un panel en la misma instancia

El proceso principal ya no decide solo: pregunta al renderer, que sabe el modo de apertura de
cada instancia y quien tiene sus paneles. Si nadie contesta en 1,2 s, se cae al comportamiento
de hoy.

Lo que sigue saliendo en ventana aparte son las ventanas con medidas propias —inicio de sesion
y pasarelas—, que Electron distingue porque llegan con sus medidas en features. Un
target=_blank normal no trae nada ahi."
```

---

### Tarea 4: El tope de doce y el reciclado

Que no crezca sin límite, y que recicle lo suyo sin tocar tus cuentas.

**Ficheros:**
- Modifica: `src/renderer.js` (`crearPanelDeEnlace`, `createBrowserInstanceWorkspace`)
- Modifica: `src/styles.css`
- Test: `tests/instancia-navegador-smoke.js`

**Produce:**
- `const TOPE_PANELES_INSTANCIA = 12`
- `function panelEnlaceMasViejo(instanceId)` → `panel | null`

- [ ] **Paso 1: la prueba que falla**

```js
const reciclado = await ventana.webContents.executeJavaScript(`(() => {
  const view = browserInstanceViews.get('inst-nav');
  const url = 'https://ejemplo.invalid/nueva';
  // Primero se llena de paneles de enlace.
  while (view.panels.filter((p) => p.origen === 'enlace').length < 3) crearPanelDeEnlace(view.instance, url);
  const antes = view.panels.length;
  const primerEnlace = view.panels.find((p) => p.origen === 'enlace');
  const total = antes + 30;
  for (let i = 0; i < 30; i += 1) crearPanelDeEnlace(view.instance, url);
  return {
    antes,
    despues: view.panels.length,
    originales: view.panels.filter((p) => p.origen !== 'enlace').length,
    reciclados: view.panels.filter((p) => p.origen === 'enlace').length,
    elViejoSigue: view.panels.includes(primerEnlace),
    viewCount: view.workspace.dataset.viewCount
  };
})()`);
comprobar(reciclado.despues === TOPE_PANELES_INSTANCIA,
  'la instancia no pasa de doce paneles', `antes: ${reciclado.antes}, despues: ${reciclado.despues}`);
comprobar(reciclado.originales === reciclado.antes,
  'y los originales no se tocan nunca', `${reciclado.originales} de ${reciclado.antes}`);
comprobar(reciclado.reciclados === TOPE_PANELES_INSTANCIA - reciclado.antes,
  'los huecos los llenan paneles de enlace', String(reciclado.reciclados));
comprobar(reciclado.viewCount === String(TOPE_PANELES_INSTANCIA),
  'y el mosaico se redimensiona', reciclado.viewCount);
comprobar(reciclado.elViejoSigue === false,
  'al reciclar, el panel viejo se reutiliza en vez de duplicarse', String(reciclado.elViejoSigue));

// El borde del borde: doce paneles y todos originales. No hay nada que reciclar.
const sinReciclable = await ventana.webContents.executeJavaScript(`(() => {
  const solo = createBrowserInstanceWorkspace({
    id: 'inst-sola', name: 'Solo', url: ${JSON.stringify(paginaNavegador)},
    count: 1, navegador: true, buscador: 'ddg', inicio: '', apertura: 'panel'
  }, 2);
  const url = 'https://ejemplo.invalid/x';
  while (solo.panels.length < TOPE_PANELES_INSTANCIA) crearPanelDeEnlace(solo.instance, url);
  solo.panels.forEach((p) => { p.origen = 'inicial'; });
  const resultado = crearPanelDeEnlace(solo.instance, url);
  return { paneles: solo.panels.length, creoPanel: Boolean(resultado), aviso: window.__avisoInstancia || '' };
})()`);
comprobar(sinReciclable.creoPanel === false && sinReciclable.paneles === TOPE_PANELES_INSTANCIA,
  'si no hay nada reciclable, no abre ni rompe nada',
  `paneles: ${sinReciclable.paneles}, creo: ${sinReciclable.creoPanel}`);
comprobar(Boolean(sinReciclable.aviso), 'y avisa de por qué', sinReciclable.aviso);
```

- [ ] **Paso 2: correrla y ver que falla**

Esperado: `despues: 32` o similar, sin tope.

- [ ] **Paso 3: el tope y el reciclado**

```js
const TOPE_PANELES_INSTANCIA = 12;

// El panel de enlace más viejo de la instancia: el primero que se recycle. Los originales no
// entran nunca —son cuentas del usuario— y si no queda ninguno, el enlace no se abre.
function panelEnlaceMasViejo(instanceId) {
  const view = browserInstanceViews.get(instanceId);
  if (!view) return null;
  return view.panels.find((panel) => panel.origen === 'enlace') || null;
}
```

`avisarEnPanel` ya está, definida en la tarea 3: se reutiliza, no se vuelve a escribir.

Y `crearPanelDeEnlace` empieza así:

```js
function crearPanelDeEnlace(instance, url) {
  const view = browserInstanceViews.get(instance.id);
  if (!view) return null;
  if (view.panels.length >= TOPE_PANELES_INSTANCIA) {
    const reciclable = panelEnlaceMasViejo(instance.id);
    if (!reciclable) {
      avisarEnPanel(view.panels[view.panels.length - 1], 'No caben más pantallas en esta instancia.');
      return null;
    }
    // Se reutiliza en vez de cerrar y abrir: así el panel conserva su posición y su sesión.
    reciclable.connectionFailures = 0;
    loadConnectionPanel(reciclable, url, { reason: 'Enlace reciclado' });
    return reciclable;
  }
  …
}
```

- [ ] **Paso 4: el mosaico de siete a doce**

`workspace.dataset.viewCount` manda sobre el CSS, y solo hay reglas hasta seis. Añade:

```css
.browser-instance-workspace[data-view-count="7"],
.browser-instance-workspace[data-view-count="8"] { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); }
.browser-instance-workspace[data-view-count="9"] { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); }
.browser-instance-workspace[data-view-count="10"],
.browser-instance-workspace[data-view-count="11"],
.browser-instance-workspace[data-view-count="12"] { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr)); }
```

- [ ] **Paso 5: correrla y ver que pasa**

```
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
npm run check
```

- [ ] **Paso 6: commit**

```bash
git add src/renderer.js src/styles.css tests/instancia-navegador-smoke.js
git commit -m "Tope de doce paneles por instancia, reciclando los de enlace

Un panel de enlace se reutiliza en lugar de cerrar y abrir, para que conserve su posicion y
su sesion. Los originales no se reciclan nunca, porque son cuentas del usuario. Si los doce
son originales, el enlace no se abre y la barra avisa de por que."
```

---

### Tarea 5: Cerrar la entrega

Verificador, guards, versión, compilación y paquete.

**Ficheros:**
- Modifica: `verificar-paquete.cjs`
- Modifica: `tests/ipc-sender-guard-smoke.js`
- Modifica: `package.json`

- [ ] **Paso 1: los canales en la prueba de guards**

`tests/ipc-sender-guard-smoke.js` clasifica **peticiones** de IPC —lo que el renderer invoca—, no los
mensajes que el proceso principal envía. De los tres canales nuevos solo `instancia:responder-apertura`
es una petición del renderer al proceso principal: como va con el guard de la ventana principal, entra
en `UI_CHANNELS` detrás de `'instancia:pantalla-completa'`. Los otros dos
(`instancia:preguntar-apertura` e `instancia:peticion-pestana`) los manda el proceso principal hacia el
renderer y esa prueba no los recoge.

- [ ] **Paso 2: las invariantes del verificador**

```js
  ['el modelo tiene buscador, inicio y modo de apertura', /const BUSCADORES = Object\.freeze/.test(renderer) && /normalizarOpcionesDeInstancia/.test(renderer)],
  ['una instancia vieja se rellena al leer, sin reescribir localStorage', /const opciones = valor && typeof valor === 'object' \? valor : \{\}/.test(renderer)],
  ['la barra es solo de las instancias de navegador', /if \(instance\.navegador\) \{/.test(renderer) && !/navegacion-direccion/.test(html)],
  ['y hay reglas para el mosaico de siete a doce', /data-view-count="12"/.test(styles)],
  ['los enlaces se reparten preguntando al renderer', /preguntarModoDeApertura\(contents\)/.test(mainCodigo) && /instancia:preguntar-apertura/.test(mainCodigo)],
  ['con reloj, para que no se cuelgue si nadie contesta', /PREGUNTA_ABIERTURA_MS/.test(mainCodigo)],
  ['una ventana con medidas sigue yendo aparte', /pideVentanaConMedidas/.test(mainCodigo)],
  ['y el tope de paneles no toca los originales', /origen === 'enlace'/.test(renderer) && /TOPE_PANELES_INSTANCIA = 12/.test(renderer)],
```

- [ ] **Paso 3: la versión**

`package.json`: `"version": "0.28.0"`.

- [ ] **Paso 4: comprobar**

```
npm run check
node tests\lanzar.cjs tests\instancia-navegador-smoke.js
node tests\ipc-sender-guard-smoke.js
```

Los tres en verde.

- [ ] **Paso 5: commit**

```bash
git add verificar-paquete.cjs tests/ipc-sender-guard-smoke.js package.json
git commit -m "Cerrar la entrega de la instancia-navegador

Invariantes del área dentro del paquete, canales nuevos clasificados en la prueba de guards y
version 0.28.0."
```

- [ ] **Paso 6: compilar y verificar el paquete**

Si el shim ha desaparecido, rehazlo:

```powershell
$shim = "C:\Users\Shockviny\AppData\Local\Temp\opencode\shim"
New-Item -ItemType Directory -Path $shim -Force | Out-Null
Set-Content -Path "$shim\pnpm.cmd" -Encoding ascii -Value "@echo off`ncall corepack pnpm %*`nexit /b %ERRORLEVEL%"
$env:PATH = "$shim;$env:PATH"
cd C:\Users\Shockviny\Downloads\PokeGrid-Launcher
npm run dist
node verificar-paquete.cjs
```

Y el sha256 del ZIP:

```
node -e "const fs=require('fs'),c=require('crypto');const z='dist/IDLE-POKE-LAUNCHER-0.28.0-portatil.zip';console.log((fs.statSync(z).size/1048576).toFixed(1)+' MB', c.createHash('sha256').update(fs.readFileSync(z)).digest('hex'))"
```

---

## Fuera de este plan

Queda dicho otra vez para que no se pierda: los **iconos de las webs** en las pestañas, las **flechas
de desplazamiento** de la barra de pestañas y los **dos retoquitos** —quitar el texto del logo y
ocultar «agrandar panel» cuando hay una sola pantalla— son las tres entregas siguientes. El segundo
de los retoquitos toca esta barra: hay más botones en la franja y esconder uno tiene más sentido
ahora.