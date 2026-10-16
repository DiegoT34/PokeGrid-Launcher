# El launcher como navegador, del todo — Plan de implementación

> **Para agentes que ejecutan esto:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development`
> (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan
> casillas (`- [ ]`) para llevar el control.

**Objetivo:** Que las tengan los dos modos al crear una instancia, el icono de cada web en su pestaña,
flechas para desplazar la barra de pestañas, que cada pantalla vuelva a la página en la que se quedó, y
las ventanas emergentes siempre activas sin casilla.

**Arquitectura:** Todo el modelo vive en el renderer, que es el que sabe de instancias y de pantallas.
El proceso principal solo necesita dos cosas nuevas: descargar el icono de una web —porque la CSP de la
página del launcher no deja meter una imagen remota— y guardar el modo de apertura por partición, que ya
hace desde la 0.28.0. El icono viaja del webview al renderer por `sendToHost`, del renderer al proceso
principal por un canal IPC con guard, y de vuelta como `data:`.

**Pila técnica:** Electron, JavaScript sin marcos, sin dependencias nuevas. `net.fetch` es de Electron.
`safeStorage` no se usa aquí: las contraseñas quedan fuera de esta entrega.

**Spec:** `docs/superpowers/specs/2026-10-15-navegador-completo-design.md` — el plan razona desde la spec
y quien lo ejecute tiene que leer las dos.

## Restricciones globales

- **Cero dependencias nuevas.** Nada de `npm install`. Todo lo que hace falta ya está en Electron.
- **Ficheros en CRLF.** Todos. Comprobado byte a byte después de cada edición.
- **`npm run check` después de cada edición.** Es solo `node --check` (sintaxis), pero detecta la clase
  de fallo más cara de esta sesión.
- **Pruebas solo del área que se toca.** Nunca la suite entera. Cada tarea nombra las suyas.
- **TDD estricto:** primero la prueba en rojo, luego el código.
- **Nada de mover código de `renderer.js` a ficheros nuevos.** Las unidades nuevas son funciones.
- **Nada de plantillas anidadas en guiones.** Se concatenan con `+` o `join`.
- **Cuidado con la coma final en las listas de `verificar-paquete.cjs`.** `['a']` seguido de `['b']` sin
  coma es JavaScript válido: `node --check` lo da por bueno y solo revienta al ejecutar. Ha pasado dos
  veces.
- **Vigilante con las trampas del editor:** una `,` que se come una entrada, un `\.` donde iba código
  plano, comillas anidadas, `await` dentro de una función que no es `async`.
- **El idioma es español con tildes.** Nada de restos de otro idioma en un comentario.
- **Nada se publica.** `git push` y `git tag` son del usuario.

## Foco de revisión

Cinco entradas que la spec calla y que son las que más probablemente muerden a quien use esto. Cada una
tiene su prueba en la tarea que le toca.

1. **Una instancia guardada antes de todo esto, sin `modo`.** Tiene que seguir abriendo igual, sin
   ventana de error y sin que aparezca un «modo» vacío. → Tarea 1.
2. **Un icono que apunta a otro sitio.** Casi todas las webs apuntan su icono a un CDN distinto del
   dominio de la página. Hay que descargar el de la dirección que dice el `<link>`, no el del dominio. Y si
   esa descarga falla, se queda el anillo, no un cuadro roto. → Tarea 4.
3. **Una dirección guardada que ya no carga.** La web cayó o el sitio cambió. La pantalla tiene que caer
   a la URL de la instancia, no quedarse en blanco ni romper el arranque. → Tarea 6.
4. **Dos pantallas originales de la misma instancia, cada una en su sitio.** Recuperar una no puede pisar
   la dirección guardada de la otra: cada pantalla tiene su memoria. → Tarea 6.
5. **Una web con el icono en un formato raro o enorme.** Un SVG de 2 MB, un `.ico`. No se descarga nada
   grande ni se intenta pintar algo que el navegador no sabe. → Tarea 4.

---

## Estructura de ficheros

| Fichero | Qué hace con esto |
|---|---|
| `src/renderer.js` | El modelo (`modo`), el modal de creación, el panel de ajustes, el icono en la pestaña, las flechas, el reanudado. Todas las unidades nuevas son funciones dentro de este fichero. |
| `src/main.js` | Descargar el icono y devolverlo como `data:`. Y quitar el interruptor de ventanas emergentes. |
| `src/preload.js` | Un canal más: `descargarIcono`. Y quitar el de `setPopupsEnabled`. |
| `src/instancia-rueda-preload.js` | Leer el `<link rel~="icon">` de la página y avisar al renderer con `sendToHost`. |
| `src/index.html` | El modal con «modo», el panel de ajustes con selector de instancia, y fuera el texto de la cabecera. |
| `src/styles.css` | Estilos de lo nuevo: icono en la pestaña, flechas, campos de ajustes. |
| `tests/instancia-modos-smoke.js` | Nuevo. El modelo de los dos modos y el modal de creación. |
| `tests/instancia-ajustes-smoke.js` | Nuevo. El panel de ajustes con selector de instancia. |
| `tests/instancia-pestanas-smoke.js` | Nuevo. Icono en la pestaña y flechas de desplazamiento. |
| `tests/instancia-reanudar-smoke.js` | Nuevo. Volver a la página en la que se estaba. |
| `tests/instancia-navegador-smoke.js` | El que ya hay. Se le quitan las comprobaciones que se mudan a los nuevos. |
| `tests/ventanas-emergentes-smoke.js` | El que ya hay. Cubre que las ventanas siguen abriéndose sin el interruptor. |
| `verificar-paquete.cjs` | Invariantes del área dentro del paquete. |

### Pruebas nuevas: por qué cuatro ficheros y no uno

Cada uno tarda entre 2 y 4 minutos en Electron, y hace falta matar los procesos de la vuelta anterior
antes de cada una. Un solo fichero gigante para las cuatro cosas tardaría media hora en cada
iteración y, cuando algo fallara, no se sabría en qué bloque. Cuatro ficheros, cuatro arranques, y el
fallo dice su nombre.

---

### Tarea 1: Los dos modos en el modelo y en el modal de creación

**Ficheros:**
- Modificar: `src/renderer.js` (el modelo, `normalizeBrowserInstance`, `inicioDeInstancia`, las
  referencias del modal, `openBrowserInstanceModal`, el envío del formulario, `createBrowserInstancePanel`)
- Modificar: `src/index.html` (el modal: fuera `browserInstanceStart` y `browserInstanceBuscadorField`,
  dentro `browserInstanceMode`)
- Crear: `tests/instancia-modos-smoke.js`

**Interfaces:**
- Consume: nada. Es la primera tarea.
- Produce:
  - `normalizarOpcionesDeInstancia(valor) -> { modo, buscador, apertura, inicio }`. `modo` sustituye al
    booleano `navegador`.
  - `esModoNavegador(instance) -> boolean`
  - `inicioDeInstancia(instance) -> string`
  - `sincronizarModoElegido() -> void`, en el renderer
  - Referencias del DOM: `browserInstanceMode`, `browserInstanceUrlField`, `browserInstanceUrl`

- [ ] **Paso 1: la prueba, en rojo**

  `tests/instancia-modos-smoke.js`, que arranca el launcher de verdad (`require('../src/main.js')`, como
  los demás) y espera a `window.__arranqueVista === 'ok'`. El cuerpo, después de esperar la ventana:

  ```js
  const modelo = await ventana.webContents.executeJavaScript(`(() => {
    const salida = {};
    // 1. Los dos modos, y como se traducen los registros viejos.
    salida.navegador = normalizeBrowserInstance({
      id: 'm-navegador', name: 'N', url: 'https://ejemplo.invalid/', count: 1,
      modo: 'navegador', buscador: 'google', apertura: 'panel'
    });
    salida.instancia = normalizeBrowserInstance({
      id: 'm-instancia', name: 'I', url: 'https://ejemplo.invalid/juego', count: 1,
      modo: 'instancia'
    });
    salida.veloDeLaMismaForma = normalizeBrowserInstance({
      id: 'm-viejo', name: 'V', url: 'https://ejemplo.invalid/', count: 2, navegador: true
    });
    salida.veloDeLaMismaFormaTambien = normalizeBrowserInstance({
      id: 'm-mas-viejo', name: 'W', url: 'https://ejemplo.invalid/', count: 1
    });
    salida.modoVacio = normalizeBrowserInstance({
      id: 'm-raro', name: 'X', url: 'https://ejemplo.invalid/', count: 1, modo: 'inventado'
    });
    salida.esNavegador = [esModoNavegador(salida.navegador), esModoNavegador(salida.instancia)];
    salida.modos = [salida.veloDeLaMismaForma.modo, salida.veloDeLaMismaFormaTambien.modo,
      salida.modoVacio.modo];
    salida.inicios = [inicioDeInstancia(salida.navegador), inicioDeInstancia(salida.instancia)];
    return salida;
  })()`);
  ```

  Y las comprobaciones, que son estas y ninguna más:

  ```js
  comprobar(modelo.modos.join(',') === 'navegador,instancia,instancia',
    'una instancia guardada sin modo se traduce sola y sin romperse', modelo.modos.join(','));
  comprobar(modelo.modoVacio?.modo === 'instancia',
    'y un modo que no existe cae al de instancia, el que era el de siempre', modelo.modoVacio?.modo);
  comprobar(modelo.esNavegador.join(',') === 'true,false',
    'el modo se lee con una sola pregunta, no comparando el campo de antes', modelo.esNavegador.join(','));
  comprobar(modelo.inicios[0] === 'https://www.google.com/search?q=',
    'el modo navegador arranca en el buscador elegido', modelo.inicios[0]);
  comprobar(modelo.inicios[1] === 'https://ejemplo.invalid/juego',
    'y el modo instancia arranca en su URL', modelo.inicios[1]);
  ```

  Más el modal, que se maneja de verdad y no por dentro:

  ```js
  const modal = await ventana.webContents.executeJavaScript(`(() => {
    openBrowserInstanceModal();
    const salida = {};
    const leer = () => ({
      oculto: browserInstanceUrlField.hidden,
      obligatorio: browserInstanceUrl.required,
      buscador: Boolean(document.querySelector('#browserInstanceBuscadorField'))
    });
    browserInstanceMode.value = 'navegador';
    browserInstanceMode.dispatchEvent(new Event('change'));
    salida.navegador = leer();
    browserInstanceMode.value = 'instancia';
    browserInstanceMode.dispatchEvent(new Event('change'));
    salida.instancia = leer();
    closeBrowserInstanceModal();
    return salida;
  })()`);
  comprobar(modal.navegador.oculto && modal.navegador.obligatorio === false,
    'en modo navegador el enlace se esconde y deja de ser obligatorio',
    JSON.stringify(modal.navegador));
  comprobar(modal.instancia.oculto === false && modal.instancia.obligatorio === true,
    'y en modo instancia vuelve y es obligatorio', JSON.stringify(modal.instancia));
  comprobar(modal.navegador.buscador === false,
    'el motor de búsqueda ya no está en el modal de creación', JSON.stringify(modal.navegador));
  comprobar(modal.instancia.buscador === false,
    'tampoco en modo instancia, que no lo necesita', JSON.stringify(modal.instancia));
  ```

  La cabecera y el `finally` son los mismos que en `tests/instancia-navegador-smoke.js`: borrar el
  `userData` temporal con reintentos, imprimir el resumen y `app.exit(fallos.length ? 1 : 0)`.

- [ ] **Paso 2: correr y ver que falla**

  ```
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-modos-smoke.js
  ```

  Se espera `ReferenceError: esModoNavegador is not defined`, y con eso se sabe que falla por lo que tiene
  que fallar: la función no existe todavía.

- [ ] **Paso 3: el modelo**

  En `src/renderer.js`, sustituir el bloque de `normalizarOpcionesDeInstancia` y `inicioDeInstancia` por:

  ```js
  const MODOS_DE_INSTANCIA = Object.freeze(['navegador', 'instancia']);
  const MODO_POR_DEFECTO = 'instancia';

  // Lo que no viene en una instancia guardada antes de esto se rellena aqui. No se reescribe
  // `localStorage`: los valores por defecto se aplican al leer. `modo` sustituye al booleano
  // `navegador`, que es lo que habia; un registro sin `modo` se traduce con el mismo criterio de
  // antes —si venia `navegador: true`, es modo navegador, y si no, modo instancia.
  function normalizarOpcionesDeInstancia(valor) {
    const opciones = valor && typeof valor === 'object' ? valor : {};
    const modo = MODOS_DE_INSTANCIA.includes(opciones.modo)
      ? opciones.modo
      : (opciones.navegador ? 'navegador' : MODO_POR_DEFECTO);
    const buscador = Object.prototype.hasOwnProperty.call(BUSCADORES, opciones.buscador)
      ? opciones.buscador
      : BUSCADOR_POR_DEFECTO;
    const apertura = MODOS_DE_APERTURA.includes(opciones.apertura)
      ? opciones.apertura
      : APERTURA_POR_DEFECTO;
    const inicio = String(opciones.inicio || '').slice(0, 1000);
    return { modo, buscador, apertura, inicio };
  }

  // El modo se lee con esta pregunta y no comparando el campo de antes, porque el campo ya no
  // existe en los registros nuevos y solo sobrevive en los viejos, y un sitio u otro acabaria
  // leyendo uno de los dos y rompiéndose con el otro.
  function esModoNavegador(instance) {
    return instance?.modo === 'navegador';
  }

  // La pagina de partida. El modo navegador arranca en el buscador —por eso el campo de enlace
  // deja de ser obligatorio— o en la ultima direccion escrita en su barra. Sin `inicio` puesto,
  // una instancia de navegador no tiene URL y se le pone la del buscador.
  function inicioDeInstancia(instance) {
    if (esModoNavegador(instance)) {
      return instance.inicio || BUSCADORES[instance.buscador] || BUSCADORES[BUSCADOR_POR_DEFECTO];
    }
    return instance.inicio || instance.url;
  }
  ```

  Y `MODOS_DE_APERTURA` pasa a llamarse `MODOS_DE_APERTURA` con valores `auto`, `panel`, `ventana`, que es
  lo que ya hay. No se toca.

  En `normalizeBrowserInstance`, el `catch` que inventa la URL del buscador pasa a mirar el modo en vez
  del booleano que ya no existe:

  ```js
    } catch (error) {
      if (opciones.modo !== 'navegador') throw error;
      url = BUSCADORES[opciones.buscador] || BUSCADORES[BUSCADOR_POR_DEFECTO];
    }
  ```

  El retorno, `return { id, name, url, count, ...normalizarOpcionesDeInstancia(value) };`, se queda igual:
  ahora trae `modo` en vez de `navegador`.

- [ ] **Paso 4: el modal**

  En `src/index.html`, dentro de `#browserInstanceForm`: fuera el `label` de `browserInstanceStart`, fuera
  el `label` de `browserInstanceBuscadorField` y fuera el `label` de `browserInstanceApertura`, y dentro,
  en el sitio del primero:

  ```html
          <label class="field">
            <span>MODO</span>
            <select id="browserInstanceMode">
              <option value="instancia" selected>Instancia: una URL y todas sus pantallas igual</option>
              <option value="navegador">Navegador: navegaci&oacute;n normal, con barra en cada pantalla</option>
            </select>
          </label>
  ```

  En `src/renderer.js`, las referencias: fuera `browserInstanceStart`, `browserInstanceBuscador`,
  `browserInstanceBuscadorField` y `browserInstanceApertura`; dentro
  `const browserInstanceMode = document.querySelector('#browserInstanceMode');`

  Y `sincronizarInicioElegido` pasa a esto:

  ```js
  // Mostrar u ocultar el enlace segun el modo. En modo navegador se esconde Y deja de ser
  // obligatorio: si se le quita el `required` sin esconderlo, el formulario deja pasar sin URL,
  // que es justo lo que se quiere, pero el campo molesta ahi pidiendo algo que no se usa.
  function sincronizarModoElegido() {
    const conUrl = browserInstanceMode.value !== 'navegador';
    browserInstanceUrlField.hidden = !conUrl;
    browserInstanceUrl.required = conUrl;
  }
  ```

  Su escucha pasa a `browserInstanceMode?.addEventListener('change', sincronizarModoElegido);` y la llamada
  suelta que había tras `browserInstancePopups?.addEventListener('change', ...)` pasa a
  `sincronizarModoElegido();`.

  El envío del formulario se queda con el motor y el reparto, aunque ya no haya campos para ellos: se
  mandan los de fábrica y se corrigen en los ajustes.

  ```js
      const instance = normalizeBrowserInstance({
        id: makeBrowserInstanceId(),
        name: browserInstanceName.value,
        url: browserInstanceUrl.value,
        count: browserInstanceCount.value,
        modo: browserInstanceMode.value,
        buscador: BUSCADOR_POR_DEFECTO,
        apertura: APERTURA_POR_DEFECTO,
        inicio: browserInstanceMode.value === 'navegador' ? '' : browserInstanceUrl.value
      });
  ```

  Y `openBrowserInstanceModal` sustituye las dos líneas que tocaban campos que ya no existen
  (`browserInstanceStart.value`, `browserInstanceBuscador.value`, `browserInstanceApertura.value`) por:

  ```js
    browserInstanceMode.value = MODO_POR_DEFECTO;
  ```

  Por último, `createBrowserInstancePanel` lee el modo con la pregunta nueva en los dos sitios donde
  usaba el booleano: el `if (instance.navegador) {` que dibuja la barra, y el `particionDePartida` que no
  cambia.

- [ ] **Paso 5: la comprobación rápida y la prueba en verde**

  ```
  npm run check
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-modos-smoke.js
  ```

  Se espera `Los dos modos.` y salida 0.

- [ ] **Paso 6: comprobar que no se rompió lo de antes**

  ```
  node tests\lanzar.cjs tests\instancia-navegador-smoke.js
  ```

  La sección de la barra usa `navegador: true` en su instancia de prueba: hay que pasarla a `modo:
  'navegador'`, porque el campo viejo ya no se lee. Y la comprobación de `modelo.sinCambios` espera
  `false,ddg,auto`: pasa a esperar `instancia,ddg,auto`.

  Se espera `Instancia como navegador.` y salida 0.

- [ ] **Paso 7: commit**

  ```bash
  git add src tests
  git commit -m "Los dos modos de instancia: navegador con barra, instancia con una URL fija"
  ```

---

### Tarea 2: Los ajustes por instancia, el engranaje al menú y la cabecera sin texto

**Ficheros:**
- Modificar: `src/index.html` (el panel de ajustes, y `#instanceSettingsButton` fuera de la barra de
  pestañas)
- Modificar: `src/renderer.js` (pintar los ajustes, guardarlos, mover el engranaje, quitar el texto)
- Modificar: `src/styles.css`
- Crear: `tests/instancia-ajustes-smoke.js`

**Interfaces:**
- Consume: `esModoNavegador`, `normalizarOpcionesDeInstancia`, `saveBrowserInstances`,
  `browserInstances` (tarea 1).
- Produce:
  - `pintarAjustesDeInstancia() -> void`
  - `guardarAjustesDeInstancia() -> void`
  - Referencias del DOM: `instanceSettingsTarget`, `instanceSettingsSearch`, `instanceSettingsSearchField`,
    `instanceSettingsLinks`, `instanceSettingsLinksCopy`

- [ ] **Paso 1: la prueba, en rojo**

  `tests/instancia-ajustes-smoke.js`. La parte interesante: se crean dos instancias de cada modo, se abren
  los ajustes y se comprueba que el selector existe, que el motor solo sale para modo navegador, y que al
  guardar cambia en la instancia correcta y no en la otra.

  ```js
  const ajustes = await ventana.webContents.executeJavaScript(`(() => {
    createBrowserInstanceWorkspace({
      id: 'aj-navegador', name: 'N', url: 'https://ejemplo.invalid/', count: 1,
      modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 0);
    createBrowserInstanceWorkspace({
      id: 'aj-instancia', name: 'I', url: 'https://ejemplo.invalid/juego', count: 1,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 1);
    browserInstances.length = 0;
    browserInstances.push(
      { id: 'aj-navegador', name: 'N', url: 'https://ejemplo.invalid/', count: 1,
        modo: 'navegador', buscador: 'ddg', apertura: 'auto', inicio: '' },
      { id: 'aj-instancia', name: 'I', url: 'https://ejemplo.invalid/juego', count: 1,
        modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: '' }
    );
    const leer = () => ({
      opciones: instanceSettingsTarget.options.length,
      motorOculto: instanceSettingsSearchField.hidden,
      motor: instanceSettingsSearch.value,
      reparto: instanceSettingsLinks.value
    });
    abrirAjustesDeInstancia();
    instanceSettingsTarget.value = 'aj-navegador';
    instanceSettingsTarget.dispatchEvent(new Event('change'));
    const enNavegador = leer();
    instanceSettingsSearch.value = 'bing';
    instanceSettingsLinks.value = 'panel';
    instanceSettingsSearch.dispatchEvent(new Event('change'));
    instanceSettingsLinks.dispatchEvent(new Event('change'));
    const guardadoDelNavegador = { motor: '', reparto: '' };
    instanceSettingsTarget.value = 'aj-instancia';
    instanceSettingsTarget.dispatchEvent(new Event('change'));
    const enInstancia = leer();
    instanceSettingsLinks.value = 'ventana';
    instanceSettingsLinks.dispatchEvent(new Event('change'));
    instanceSettingsTarget.value = 'aj-navegador';
    instanceSettingsTarget.dispatchEvent(new Event('change'));
    const trasVolver = leer();
    const enDisco = JSON.parse(localStorage.getItem('pokegrid:browser-instances:v1') || '[]');
    cerrarAjustesDeInstancia();
    return {
      enNavegador, enInstancia, trasVolver, enDisco,
      motorGuardado: enDisco.find((f) => f.id === 'aj-navegador')?.buscador || '',
      repartoGuardado: enDisco.find((f) => f.id === 'aj-navegador')?.apertura || '',
      instanciaIntacta: enDisco.find((f) => f.id === 'aj-instancia')?.buscador || 'sin-buscador'
    };
  })()`);
  ```

  Comprobaciones:

  ```js
  comprobar(ajustes.enNavegador.opciones === 2,
    'los ajustes eligen a qué instancia se aplican', String(ajustes.enNavegador.opciones));
  comprobar(ajustes.enNavegador.motorOculto === false,
    'en modo navegador se ve el motor de búsqueda', JSON.stringify(ajustes.enNavegador));
  comprobar(ajustes.enInstancia.motorOculto === true,
    'y en modo instancia se esconde, que ahí no sirve de nada', JSON.stringify(ajustes.enInstancia));
  comprobar(ajustes.motorGuardado === 'bing',
    'el motor se guarda en la instancia que estaba seleccionada', ajustes.motorGuardado);
  comprobar(ajustes.repartoGuardado === 'panel',
    'y el reparto de enlaces también, y en esa sola', ajustes.repartoGuardado);
  comprobar(ajustes.instanciaIntacta === 'ddg',
    'la otra instancia no se ha enterado de nada', ajustes.instanciaIntacta);
  comprobar(ajustes.trasVolver.motor === 'bing',
    'al volver a la primera sigue con lo que se le puso', ajustes.trasVolver.motor);
  ```

  Y dos comprobaciones más, del DOM, que no dependen de los datos:

  ```js
  const cabecera = await ventana.webContents.executeJavaScript(`(() => {
    const marca = document.querySelector('.brand');
    return {
      sinTexto: !marca.querySelector('strong') && !marca.querySelector('small'),
      conNombre: Boolean(marca.getAttribute('aria-label')),
      engranajeEnElMenu: Boolean(document.querySelector('#globalActions #instanceSettingsButton')),
      engranajeEnLaBarra: Boolean(document.querySelector('#instanceTabbar #instanceSettingsButton'))
    };
  })()`);
  comprobar(cabecera.sinTexto && cabecera.conNombre,
    'de la cabecera solo queda el logo, con nombre para quien lee con lector de pantalla',
    JSON.stringify(cabecera));
  comprobar(cabecera.engranajeEnElMenu && !cabecera.engranajeEnLaBarra,
    'y el engranaje está en el panel de botones, no en la barra de pestañas',
    JSON.stringify(cabecera));
  ```

- [ ] **Paso 2: correr y ver que falla**

  ```
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-ajustes-smoke.js
  ```

  Se espera `ReferenceError: instanceSettingsTarget is not defined`.

- [ ] **Paso 3: el HTML**

  En `src/index.html`, dentro de `#instanceSettingsBackdrop`, después del atajo y antes del cierre del
  `section`:

  ```html
        <div class="instance-settings-separator"></div>
        <div class="instance-settings-field">
          <span class="instance-settings-label">AJUSTES DE</span>
          <select id="instanceSettingsTarget"></select>
        </div>
        <div class="instance-settings-field" id="instanceSettingsSearchField">
          <span class="instance-settings-label">MOTOR DE B&Uacute;SQUEDA</span>
          <select id="instanceSettingsSearch">
            <option value="ddg">DuckDuckGo</option>
            <option value="google">Google</option>
            <option value="bing">Bing</option>
          </select>
        </div>
        <div class="instance-settings-field">
          <span class="instance-settings-label">LOS ENLACES NUEVOS SE ABREN</span>
          <select id="instanceSettingsLinks">
            <option value="auto">En la misma instancia, seg&uacute;n el enlace</option>
            <option value="panel">Siempre en un panel de la instancia</option>
            <option value="ventana">Siempre en una ventana aparte</option>
          </select>
          <small id="instanceSettingsLinksCopy" class="instance-settings-copy"></small>
        </div>
  ```

  Y `#instanceSettingsButton` se mueve del final de `#instanceTabbar` al final de `#globalActions`, después
  del `div.view-mode-control`. Se queda con sus mismos atributos.

- [ ] **Paso 4: el renderer**

  Cuatro referencias nuevas junto a las de los ajustes que ya hay, en `#instanceSettingsBackdrop`:

  ```js
  const instanceSettingsTarget = document.querySelector('#instanceSettingsTarget');
  const instanceSettingsSearch = document.querySelector('#instanceSettingsSearch');
  const instanceSettingsSearchField = document.querySelector('#instanceSettingsSearchField');
  const instanceSettingsLinks = document.querySelector('#instanceSettingsLinks');
  const instanceSettingsLinksCopy = document.querySelector('#instanceSettingsLinksCopy');
  ```

  Y estas dos funciones, antes de `abrirAjustesDeInstancia`:

  ```js
  // Los ajustes por instancia. El panel es global —el atajo de pantalla completa vale para todas—,
  // asi que hace falta saber a quien se le habla, y para eso el selector.
  function instanciaDeLosAjustes() {
    return browserInstances.find((fila) => fila.id === instanceSettingsTarget.value) || null;
  }

  function pintarAjustesDeInstancia() {
    const anterior = instanceSettingsTarget.value;
    instanceSettingsTarget.replaceChildren();
    for (const instancia of browserInstances) {
      const opcion = document.createElement('option');
      opcion.value = instancia.id;
      opcion.textContent = instancia.name;
      instanceSettingsTarget.appendChild(opcion);
    }
    // Si la instancia que estaba seleccionada ya no existe, se va a la primera: dejar el selector
    // vacio haria que guardar escribiera sobre la instance de al lado.
    if (browserInstances.some((fila) => fila.id === anterior)) instanceSettingsTarget.value = anterior;
    const instancia = instanciaDeLosAjustes();
    const enNavegador = Boolean(instancia) && esModoNavegador(instancia);
    instanceSettingsSearchField.hidden = !enNavegador;
    instanceSettingsSearch.value = instancia?.buscador || BUSCADOR_POR_DEFECTO;
    instanceSettingsLinks.value = instancia?.apertura || APERTURA_POR_DEFECTO;
    instanceSettingsLinksCopy.textContent = instancia
      ? (esModoNavegador(instancia)
        ? 'Un enlace normal se abre en un panel de esta instancia, con la misma sesion. Uno con medidas propias —un inicio de sesion, una pasarela— sale en ventana aparte.'
        : 'Un enlace normal se abre en un panel de esta instancia. Las ventanas con medidas propias —un inicio de sesion, una pasarela— salen en ventana aparte.')
      : '';
  }

  function guardarAjustesDeInstancia() {
    const instancia = instanciaDeLosAjustes();
    if (!instancia) return;
    instancia.buscador = instanceSettingsSearch.value;
    instancia.apertura = instanceSettingsLinks.value;
    saveBrowserInstances();
    // El modo de apertura vive en el proceso principal por particion, asi que hay que avisarle o
    // el cambio no se nota hasta que se reinicie el launcher.
    if (typeof window.pokeGrid?.setInstanceApertura === 'function') {
      const view = browserInstanceViews.get(instancia.id);
      for (const panel of view?.panels || []) {
        const particion = panel.webview?.getAttribute?.('partition') || '';
        if (particion) window.pokeGrid.setInstanceApertura(particion, instancia.apertura).catch(() => {});
      }
    }
    renderBrowserInstanceTabs();
    setInstanceSettingsMessage('Guardado en ' + instancia.name + '.');
  }
  ```

  Y `abrirAjustesDeInstancia` llama a `pintarAjustesDeInstancia()` antes de mostrar:

  ```js
  function abrirAjustesDeInstancia() {
    pintarAtajoEnLosAjustes();
    pintarAjustesDeInstancia();
    setInstanceSettingsMessage('');
    instanceSettingsBackdrop.hidden = false;
    instanceSettingsClose.focus();
  }
  ```

  Las tres escuchas van al mismo nivel que las dos del atajo —junto a
  `instanceSettingsShortcutField.addEventListener('click', ...)`, sobre la línea 9399—, sin envolverlas en
  nada: hoy esas dos están sueltas y no hay función que las agrupe.

  ```js
    instanceSettingsTarget?.addEventListener('change', pintarAjustesDeInstancia);
    instanceSettingsSearch?.addEventListener('change', guardarAjustesDeInstancia);
    instanceSettingsLinks?.addEventListener('change', guardarAjustesDeInstancia);
  ```

  La cabecera: en `src/index.html`, el `div.brand` se queda solo con el logo y su nombre.

  ```html
      <div class="brand" aria-label="IDLE POKE LAUNCHER">
        <span class="brand-mark" aria-hidden="true"></span>
      </div>
  ```

  Y en `src/renderer.js`, el bloque que pinta el contador (la línea con
  `const brand = document.querySelector('#brandSessionCount');`) se borra entero, con su función y su
  llamada: el contador ya no existe en el DOM y dejarlo sería código muerto. **Hay que localizar la función
  que lo contiene antes de borrarla**, porque puede hacer más cosas que el contador.

- [ ] **Paso 5: los estilos**

  En `src/styles.css`, después de las reglas de `.instance-settings-field`:

  ```css
  .instance-settings-separator { height: 1px; margin: 14px 0 12px; background: rgba(255, 255, 255, .1); }
  .instance-settings-copy { color: #8fa3b0; font-size: 11px; line-height: 1.45; }
  #instanceSettingsTarget, #instanceSettingsSearch, #instanceSettingsLinks {
    width: 100%; height: 34px; padding: 0 10px;
    border: 1px solid rgba(255, 255, 255, .14); border-radius: 8px;
    background: rgba(255, 255, 255, .06); color: #e9f1f6; font-size: 13px;
  }
  ```

  Y una regla para que el logo solo no se quede pegado a la barra de pestañas:

  ```css
  .brand:has(> .brand-mark:only-child) { margin-right: 10px; }
  ```

  Si `:has` no estuviera soportado —Electron va sobrado de versión para eso—, se cambia por una clase
  `brand--solo` que pone el renderer. Comprobar en el navegador antes de dar por buena la primera.

- [ ] **Paso 6: en verde**

  ```
  npm run check
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-ajustes-smoke.js
  node tests\lanzar.cjs tests\instancia-navegador-smoke.js
  ```

- [ ] **Paso 7: commit**

  ```bash
  git add src tests
  git commit -m "Los ajustes son por instancia, y el motor deja de estar en el modal de creacion"
  ```

---

### Tarea 3: Ventanas emergentes siempre activas

**Ficheros:**
- Modificar: `src/index.html` (fuera el `div.browser-instance-popups` y su explicación)
- Modificar: `src/main.js` (`ventanasEmergentesHabilitadas` constante, fuera el `ipcMain.handle`)
- Modificar: `src/preload.js` (fuera `setPopupsEnabled`)
- Modificar: `src/renderer.js` (fuera las seis piezas del interruptor)
- Modificar: `tests/instancia-navegador-smoke.js` (fuera el bloque de las emergentes de sus comprobaciones)

**Interfaces:**
- Consume: nada de las tareas anteriores.
- Produce: nada. Deja el terreno limpio para el resto.

- [ ] **Paso 1: la prueba, en rojo**

  Antes de tocar nada, la prueba que tiene que seguir en verde y la que tiene que ponerse roja:

  ```
  node tests\lanzar.cjs tests\ventanas-emergentes-smoke.js
  ```

  Ahora mismo pasa. Después de esta tarea tiene que seguir pasando: es la que demuestra que quitar el
  interruptor no rompió nada.

  La prueba en rojo es una comprobación de que la casilla ya no está:

  ```js
  const sinCasilla = await ventana.webContents.executeJavaScript(`(() => ({
    casilla: Boolean(document.querySelector('#browserInstancePopups')),
    interruptorEnElPuente: typeof window.pokeGrid.setPopupsEnabled === 'function',
    bloque: Boolean(document.querySelector('.browser-instance-popups'))
  }))()`);
  comprobar(!sinCasilla.casilla && !sinCasilla.bloque,
    'la casilla de ventanas emergentes ya no está en el modal', JSON.stringify(sinCasilla));
  comprobar(sinCasilla.interruptorEnElPuente === false,
    'y el puente ya no tiene con qué encenderla ni apagarla', JSON.stringify(sinCasilla));
  ```

  Eso va en `tests/instancia-modos-smoke.js`, en el bloque del modal.

- [ ] **Paso 2: correr y ver que falla**

  ```
  node tests\lanzar.cjs tests\instancia-modos-smoke.js
  ```

  Falla en las dos, que es lo que tiene que pasar.

- [ ] **Paso 3: fuera la casilla**

  En `src/index.html`, fuera el `div.browser-instance-popups` entero con su `label` y su `p`, y con él el
  texto que explicaba las ventanas emergentes —ese texto no se pierde: en la tarea 2 se copia al pie del
  ajuste de reparto de enlaces—.

  En `src/renderer.js`:

  - fuera `const browserInstancePopups = document.querySelector('#browserInstancePopups');`
  - fuera la escucha `browserInstancePopups?.addEventListener('change', ...)` y su cuerpo, que era el que
    llamaba a `setVentanasEmergentes(...)` con el valor de la casilla
  - fuera `normalizarVentanasEmergentes`, `cargarVentanasEmergentes`, `guardarVentanasEmergentes`,
    `aplicarVentanasEmergentes`, `setVentanasEmergentes`, la constante
    `VENTANAS_EMERGENTES_POR_DEFECTO` y la clave `VENTANAS_EMERGENTES_KEY`
  - fuera la línea `let ventanasEmergentes = cargarVentanasEmergentes();`
  - fuera la llamada a `aplicarVentanasEmergentes()` del arranque

  En `src/preload.js`, fuera esta línea:

  ```js
    setPopupsEnabled: (habilitado) => ipcRenderer.invoke('ventanas-emergentes:ajustar', Boolean(habilitado)),
  ```

  En `src/main.js`: `let ventanasEmergentesHabilitadas = ...` pasa a constante siempre activa, y fuera el
  `ipcMain.handle('ventanas-emergentes:ajustar', ...)`.

  ```js
  // Las ventanas emergentes están siempre activas y no hay manera de apagarlas. No es una decisión
  // de producto arbitraria: los inicios de sesion con Google y las pasarelas de pago las necesitan,
  // y apagarlas solo rompia cosas sin ganar nada. Lo que si se conserva es el tope de seis.
  const VENTANAS_EMERGENTES_SIEMPRE = true;
  ```

  Y el manejador de apertura pasa a leer esa constante. El nombre de la variable antigua se conserva
  (`ventanasEmergentesHabilitadas`) para no tocar la condición, pero pasa a ser `= VENTANAS_EMERGENTES_SIEMPRE`
  sin ninguna otra vía que la cambie.

- [ ] **Paso 4: en verde**

  ```
  npm run check
  node tests\lanzar.cjs tests\instancia-modos-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\ventanas-emergentes-smoke.js
  ```

  Las dos en verde. La segunda es la que importa: si el tope de seis o la salida al navegador del sistema
  han dejado de funcionar, salta aquí.

- [ ] **Paso 5: commit**

  ```bash
  git add src tests
  git commit -m "Las ventanas emergentes siempre estan activas: fuera la casilla y su interruptor"
  ```

---

### Tarea 4: El icono de la web en su pestaña

**Ficheros:**
- Modificar: `src/instancia-rueda-preload.js` (leer el icono y avisar)
- Modificar: `src/main.js` (descargarlo y devolverlo como `data:`)
- Modificar: `src/preload.js` (el canal `instancia:icono`)
- Modificar: `src/renderer.js` (`iconosDeInstancia`, `pedirIconoDeWebview`, `pintarIconoDeInstancia`)
- Modificar: `src/styles.css`
- Crear: `tests/instancia-pestanas-smoke.js`

**Interfaces:**
- Consume: `browserInstanceViews`, `registrarPanelEnMapa`, `instanceTabs` (0.28.0).
- Produce:
  - `esIconoAdmisible(contentType, bytes) -> boolean`, en `src/main.js`, pura y sin estado
  - `ipcMain.handle('instancia:icono', (event, url) -> { ok, dataUrl })`
  - `window.pokeGrid.descargarIcono(url)` en el preload
  - `iconosDeInstancia: Map<string, string>` y `pedirIconoDeWebview(panel)` en el renderer
  - `data-instancia-favicon="<id>"` en el `<span>` del icono de cada pestaña

- [ ] **Paso 1: la prueba, en rojo**

  `tests/instancia-pestanas-smoke.js`. Tres partes.

  La primera, la regla que decide qué se descarga. Está en el proceso principal, así que se prueba con
  `esIconoAdmisible`, que es pura:

  ```js
  const regla = await ventana.webContents.executeJavaScript('null').catch(() => null);
  ```
  No: `esIconoAdmisible` vive en el proceso principal y el test también lo es. Se llama directamente:

  ```js
  const formatos = [
    { contentType: 'image/png', bytes: 1024, ok: true },
    { contentType: 'image/x-icon', bytes: 4096, ok: true },
    { contentType: 'image/vnd.microsoft.icon', bytes: 200, ok: true },
    { contentType: 'image/svg+xml', bytes: 200, ok: false },
    { contentType: 'text/html', bytes: 200, ok: false },
    { contentType: 'image/png', bytes: 300000, ok: false }
  ];
  const decidedos = formatos.map((c) => esIconoAdmisible(c.contentType, c.bytes) === c.ok);
  comprobar(decidedos.every(Boolean),
    'solo se aceptan imágenes que el navegador pinta de verdad y no pasan de 256 KB',
    decidedos.map((d, i) => `${formatos[i].contentType}/${formatos[i].bytes}:${d}`).join(' '));
  ```

  La segunda, el preload avisando. Se lee el fichero y se busca el código:

  ```js
  const pre = fs.readFileSync(path.join(__dirname, '..', 'src', 'instancia-rueda-preload.js'), 'utf8');
  comprobar(/sendToHost\(\s*'instancia:favicon'/.test(pre),
    'el preload avisa del icono al renderer, que no necesita pasar por el proceso principal');
  ```

  La tercera, el DOM. Se comprueba que hay un sitio donde poner el icono y que el anillo aguanta cuando no
  hay icono:

  ```js
  const icono = await ventana.webContents.executeJavaScript(`(() => {
    renderBrowserInstanceTabs();
    const salida = {};
    const pestaña = document.querySelector('[data-instance-id="pest-navegador"] .instance-tab');
    const hueco = pestaña?.querySelector('.instance-tab-icon');
    salida.hayHueco = Boolean(hueco);
    salida.hayImagen = Boolean(hueco?.querySelector('img'));
    salida.anilloPorDefecto = Boolean(hueco?.querySelector('.instance-tab-icon-globo'));
    iconosDeInstancia.set('pest-navegador', 'data:image/png;base64,iVBORw0KGgo=');
    pintarIconoDeInstancia('pest-navegador');
    const despues = document.querySelector('[data-instance-id="pest-navegador"] .instance-tab-icon');
    salida.imagenTrasPintar = Boolean(despues?.querySelector('img'));
    salida.srcTrasPintar = despues?.querySelector('img')?.getAttribute('src') || '';
    iconosDeInstancia.delete('pest-navegador');
    pintarIconoDeInstancia('pest-navegador');
    const sinIcono = document.querySelector('[data-instance-id="pest-navegador"] .instance-tab-icon');
    salida.vuelveAlGlobo = Boolean(sinIcono?.querySelector('.instance-tab-icon-globo'));
    salida.primaryIntacto = Boolean(
      document.querySelector('[data-instance-id="poke-idle-world"] .instance-tab-icon svg')
      || document.querySelector('[data-instance-id="poke-idle-world"] .instance-tab-icon')?.innerHTML.includes('svg')
    );
    return salida;
  })()`);
  comprobar(icono.hayHueco && icono.imagenTrasPintar && icono.srcTrasPintar.startsWith('data:image/'),
    'la pestaña muestra el icono cuando lo hay', JSON.stringify(icono));
  comprobar(icono.vuelveAlGlobo,
    'y vuelve al globo cuando la web no tiene icono, en vez de un cuadro roto', JSON.stringify(icono));
  comprobar(icono.primaryIntacto,
    'la pantalla principal de Poke Idle World conserva su icono propio', JSON.stringify(icono));
  ```

  Las dos primeras van antes, en un bloque que se lee del fichero, porque el icono de verdad —descargarlo de
  una web por Internet— no se puede comprobar sin red. **Lo que sí se comprueba es que la regla existe y
  que el DOM responde.** Decirlo aquí para que nadie lo tome por una prueba de la descarga.

- [ ] **Paso 2: correr y ver que falla**

  ```
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-pestanas-smoke.js
  ```

  Se espera `ReferenceError: esIconoAdmisible is not defined`.

- [ ] **Paso 3: el preload de la instancia**

  En `src/instancia-rueda-preload.js`, al final:

  ```js
  // El icono de la pagina, que en la mayoria de las webs apunta a un CDN distinto del dominio. Se
  // manda el que dice el `<link>`, no el del dominio, que es donde esta el fallo clasico.
  function avisarDelIcono() {
    const declarado = document.querySelector('link[rel~="icon"]')
      || document.querySelector('link[rel="shortcut icon"]')
      || document.querySelector('link[rel="apple-touch-icon"]');
    const url = declarado?.getAttribute('href') || '';
    if (!url) return;
    ipcRenderer.sendToHost('instancia:favicon', { url: new URL(url, document.baseURI).href });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', avisarDelIcono, { once: true });
  } else {
    avisarDelIcono();
  }
  ```

  Y al principio, el `require`:

  ```js
  const { ipcRenderer } = require('electron');
  ```

  **Si el fichero ya no hace `require('electron')`** —porque hasta ahora solo escuchaba el `wheel`—, esa
  línea es nueva y hay que ponerla arriba del todo, dentro del bloque que ya tiene `contextIsolation` y
  `sandbox` activados. No se cambia ningún otro ajuste de ese preload.

- [ ] **Paso 4: el proceso principal**

  En `src/main.js`, antes del manejador de apertura:

  ```js
  // Que es una imagen que el navegador sabe pintar y no ocupa mas de 256 KB. Los SVG quedan fuera a
  // proposito: un icono es un icono, y un SVG de la web es un documento entero con scripts.
  const ICONO_MAXIMO_BYTES = 256 * 1024;
  const TIPOS_DE_IMAGEN = new Set(['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/gif', 'image/jpeg', 'image/webp']);

  function esIconoAdmisible(contentType, bytes) {
    return TIPOS_DE_IMAGEN.has(String(contentType || '').split(';')[0].trim().toLowerCase())
      && Number.isInteger(bytes) && bytes > 0 && bytes <= ICONO_MAXIMO_BYTES;
  }

  const cacheDeIconos = new Map();

  // Descargar el icono de una web. Va por `net.fetch`, que es de Electron, porque descargar en el
  // renderer choca con la CSP de la pagina del launcher: `img-src` no deja meter imagenes remotas, y
  // por eso esto devuelve `data:` y no una direccion.
  async function iconoComoDataUrl(url) {
    const yaEsta = cacheDeIconos.get(url);
    if (yaEsta) return yaEsta;
    let respuesta;
    try {
      respuesta = await net.fetch(url, { headers: { Accept: 'image/*' } });
    } catch {
      return '';
    }
    if (!respuesta.ok) return '';
    const tipo = respuesta.headers.get('content-type') || '';
    const cuerpo = await respuesta.arrayBuffer().catch(() => null);
    if (!cuerpo) return '';
    if (!esIconoAdmisible(tipo, cuerpo.byteLength)) return '';
    const dataUrl = `data:${tipo.split(';')[0].trim()};base64,${Buffer.from(cuerpo).toString('base64')}`;
    cacheDeIconos.set(url, dataUrl);
    return dataUrl;
  }

  ipcMain.handle('instancia:icono', async (event, url) => {
    assertMainWindowSender(event);
    const limpio = String(url || '').slice(0, 2000);
    // Solo https: un icono de http en una pagina https queda bloqueado, y no vale la pena.
    if (!/^https:\/\//i.test(limpio)) return { ok: false, error: 'El icono tiene que ser https.' };
    const dataUrl = await iconoComoDataUrl(limpio);
    return dataUrl ? { ok: true, dataUrl } : { ok: false, error: 'Esa web no tiene icono.' };
  });
  ```

  `net` **ya está importado** en la línea 1 de `src/main.js`, dentro del destructuring de `require('electron')`.
  No hay que añadir nada: por eso el canal nuevo es solo el `ipcMain.handle`.

- [ ] **Paso 5: el preload del launcher**

  En `src/preload.js`:

  ```js
    descargarIcono: (url) => ipcRenderer.invoke('instancia:icono', String(url || '')),
  ```

- [ ] **Paso 6: el renderer**

  Cerca de `renderBrowserInstanceTabs`, y el `icon` de cada pestaña pasa a ser:

  ```js
    const icon = document.createElement('span');
    icon.className = 'instance-tab-icon';
    icon.dataset.instanciaIcono = instance.id;
    if (instance.primary) {
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = launcherUiIcon('live');
    } else {
      icon.setAttribute('aria-hidden', 'true');
      pintarIconoDeInstancia(instance.id, icon);
    }
  ```

  Y estas dos funciones, antes de `renderBrowserInstanceTabs`:

  ```js
  // El icono de cada instancia. Vive en un mapa aparte porque lo pinan las pestanas, que se
  // redibujan enteras cada vez que se activa una, y el icono no se puede volver a descargar cada
  // vez que eso pasa.
  const iconosDeInstancia = new Map();

  function pintarIconoDeInstancia(instanceId, hueco) {
    const destino = hueco || document.querySelector(`[data-instancia-icono="${instanceId}"]`);
    if (!destino) return;
    const dataUrl = iconosDeInstancia.get(instanceId) || '';
    destino.replaceChildren();
    if (dataUrl) {
      const imagen = document.createElement('img');
      imagen.className = 'instance-tab-favicon';
      imagen.src = dataUrl;
      imagen.alt = '';
      destino.appendChild(imagen);
      return;
    }
    // Sin icono se pone un globo y no un `<img>` roto: un icono que no se ve es peor que no
    // tener icono, porque ocupa el sitio y no dice nada.
    const globo = document.createElement('span');
    globo.className = 'instance-tab-icon-globo';
    globo.setAttribute('aria-hidden', 'true');
    globo.textContent = '○';
    destino.appendChild(globo);
  }

  // Del webview al icono de la pestaña. El aviso lo manda el preload de la instancia; aqui se pide
  // la imagen al proceso principal y se guarda en el mapa para las pestanas siguientes.
  function pedirIconoDeWebview(panel) {
    if (!panel?.webview || !esModoNavegador(panel.instancia) && !esModoNavegador(instanciaDePanel(panel.instanceId))) return;
    const instanceId = panel.instanceId;
    if (iconosDeInstancia.has(instanceId)) return;
    const alRecibir = (evento) => {
      if (evento.channel !== 'instancia:favicon') return;
      const url = evento.args?.[0]?.url;
      if (!url) return;
      if (typeof window.pokeGrid?.descargarIcono !== 'function') return;
      window.pokeGrid.descargarIcono(url).then((respuesta) => {
        if (!respuesta?.ok || !respuesta.dataUrl) return;
        iconosDeInstancia.set(instanceId, respuesta.dataUrl);
        pintarIconoDeInstancia(instanceId);
      }).catch(() => {});
    };
    panel.webview.addEventListener('ipc-message', alRecibir);
  }
  ```

  Y `pedirIconoDeWebview(panel)` se llama en `registrarPanelEnMapa(panel)`, que es donde ya se sabe que la
  webview está lista, **solo para paneles originales**: una pantalla de enlace se recicla, y su icono no
  describe la instancia.

  ```js
    if (panel.origen !== 'enlace') pedirIconoDeWebview(panel);
  ```

  **La primera línea de `pedirIconoDeWebview` hay que limpiarla**: el modo no importa para el icono, que
  también lo tiene una instancia de juego. Lo que importa es que sea original, y eso ya se comprueba en la
  llamada. Se queda así:

  ```js
  function pedirIconoDeWebview(panel) {
    if (!panel?.webview) return;
    const instanceId = panel.instanceId;
    if (iconosDeInstancia.has(instanceId)) return;
  ```

  Se anota aquí porque es el tipo de línea que se escribe con la cabeza en otra cosa y luego no se
  revisa.

- [ ] **Paso 7: los estilos**

  En `src/styles.css`:

  ```css
  .instance-tab-icon { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; flex: 0 0 auto; }
  .instance-tab-favicon { width: 14px; height: 14px; border-radius: 3px; object-fit: contain; }
  .instance-tab-icon-globo { color: #6f8694; font-size: 12px; line-height: 1; }
  ```

- [ ] **Paso 8: en verde**

  ```
  npm run check
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-pestanas-smoke.js
  node tests\lanzar.cjs tests\instancia-navegador-smoke.js
  node tests\ipc-sender-guard-smoke.js
  ```

  El guard tiene que seguir listado el canal nuevo: `instancia:icono` va en `UI_CHANNELS` de
  `tests/ipc-sender-guard-smoke.js`, en la posición donde estaban los de instancia.

- [ ] **Paso 9: commit**

  ```bash
  git add src tests
  git commit -m "El icono de cada web en su pestana"
  ```

---

### Tarea 5: Las flechas de la barra de pestañas

**Ficheros:**
- Modificar: `src/index.html` (los dos botones alrededor de `#instanceTabs`)
- Modificar: `src/renderer.js` (`actualizarFlechasDePestanas` y su escucha)
- Modificar: `src/styles.css`
- Modificar: `tests/instancia-pestanas-smoke.js` (el bloque de las flechas)

**Interfaces:**
- Consume: nada de las tareas anteriores.
- Produce: `actualizarFlechasDePestanas() -> void`, y los botones `#instanceTabsBack` y
  `#instanceTabsForward`.

- [ ] **Paso 1: la prueba, en rojo**

  En `tests/instancia-pestanas-smoke.js`:

  ```js
  const flechas = await ventana.webContents.executeJavaScript(`(() => {
    const salida = {};
    const medir = () => Object.defineProperty(instanceTabs, 'scrollWidth', {
      configurable: true, get: () => window.__anchoDePestanas || 0
    });
    medir();
    Object.defineProperty(instanceTabs, 'clientWidth', { configurable: true, get: () => 400 });
    window.__anchoDePestanas = 400;
    actualizarFlechasDePestanas();
    salida.caben = { izquierda: !instanceTabsBack.hidden, derecha: !instanceTabsForward.hidden };
    window.__anchoDePestanas = 900;
    instanceTabs.scrollLeft = 200;
    actualizarFlechasDePestanas();
    salida.noCaben = { izquierda: !instanceTabsBack.hidden, derecha: !instanceTabsForward.hidden };
    instanceTabs.scrollLeft = 0;
    actualizarFlechasDePestanas();
    salida.alPrincipio = { izquierda: !instanceTabsBack.hidden, derecha: !instanceTabsForward.hidden };
    window.__anchoDePestanas = 900;
    instanceTabs.scrollLeft = 900;
    actualizarFlechasDePestanas();
    salida.alFinal = { izquierda: !instanceTabsBack.hidden, derecha: !instanceTabsForward.hidden };
    return salida;
  })()`);
  comprobar(!flechas.caben.izquierda && !flechas.caben.derecha,
    'con todas las pestañas a la vista, las flechas no estorban', JSON.stringify(flechas.caben));
  comprobar(flechas.noCaben.izquierda && flechas.noCaben.derecha,
    'y en cuanto no caben, aparecen las dos', JSON.stringify(flechas.noCaben));
  comprobar(!flechas.alPrincipio.izquierda && flechas.alPrincipio.derecha,
    'al principio solo se puede ir hacia delante', JSON.stringify(flechas.alPrincipio));
  comprobar(flechas.alFinal.izquierda && !flechas.alFinal.derecha,
    'y al final, solo hacia atras', JSON.stringify(flechas.alFinal));
  ```

  Falsear `scrollWidth` es lo unico que hay para probar esto sin abrir doce pestañas: un mosaico de trece
  instancias en una prueba de cuatro minutos no compensa por dos botones.

- [ ] **Paso 2: correr y ver que falla**

  ```
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-pestanas-smoke.js
  ```

- [ ] **Paso 3: el HTML**

  En `src/index.html`, dentro de `#instanceTabbar`:

  ```html
        <button id="instanceTabsBack" class="instance-tabs-scroll" type="button" aria-label="Pestañas anteriores" title="Pestañas anteriores" hidden>&lsaquo;</button>
  ```

  antes de `#instanceTabs`, y

  ```html
        <button id="instanceTabsForward" class="instance-tabs-scroll" type="button" aria-label="Pestañas siguientes" title="Pestañas siguientes" hidden>&rsaquo;</button>
  ```

  justo detrás.

- [ ] **Paso 4: el renderer**

  ```js
  // Las flechas solo aparecen cuando hay algo que desplazar. Con cuatro pestañas —el caso normal— no
  // se ven, porque dos botones apagados al lado de las pestañas son ruido.
  function actualizarFlechasDePestanas() {
    const sobra = instanceTabs.scrollWidth - instanceTabs.clientWidth;
    const alPrincipio = instanceTabs.scrollLeft <= 1;
    const alFinal = instanceTabs.scrollLeft >= sobra - 1;
    instanceTabsBack.hidden = sobra <= 1 || alPrincipio;
    instanceTabsForward.hidden = sobra <= 1 || alFinal;
  }

  function desplazarPestanas(paso) {
    instanceTabs.scrollBy({ left: paso * Math.max(120, instanceTabs.clientWidth * 0.7), behavior: 'smooth' });
  }
  ```

  Las dos referencias, junto a `const instanceTabs = ...`:

  ```js
  const instanceTabsBack = document.querySelector('#instanceTabsBack');
  const instanceTabsForward = document.querySelector('#instanceTabsForward');
  ```

  Las escuchas, al final de `renderBrowserInstanceTabs()`:

  ```js
    instanceTabsBack?.addEventListener('click', () => desplazarPestanas(-1));
    instanceTabsForward?.addEventListener('click', () => desplazarPestanas(1));
    instanceTabs.addEventListener('scroll', actualizarFlechasDePestanas, { passive: true });
    window.addEventListener('resize', actualizarFlechasDePestanas);
    requestAnimationFrame(actualizarFlechasDePestanas);
  ```

  Y `actualizarFlechasDePestanas()` al final de `activateBrowserInstance(...)`, porque activar una pestaña
  la deja fuera de la vista y las flechas tienen que enterarse.

- [ ] **Paso 5: los estilos**

  En `src/styles.css`:

  ```css
  .instance-tabs-scroll { flex: 0 0 auto; width: 20px; height: 22px; padding: 0; border: 0; border-radius: 6px; background: transparent; color: #9fb4c0; font-size: 14px; line-height: 1; cursor: pointer; }
  .instance-tabs-scroll:hover { background: rgba(255, 255, 255, .07); color: #effcff; }
  .instance-tabs-scroll[hidden] { display: none; }
  ```

- [ ] **Paso 6: en verde**

  ```
  npm run check
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-pestanas-smoke.js
  ```

- [ ] **Paso 7: commit**

  ```bash
  git add src tests
  git commit -m "Flechas para desplazar la barra de pestañas cuando no caben"
  ```

---

### Tarea 6: Reanudar donde se quedó cada pantalla

**Ficheros:**
- Modificar: `src/renderer.js` (las tres funciones y sus llamadas)
- Crear: `tests/instancia-reanudar-smoke.js`

**Interfaces:**
- Consume: `browserInstanceViews`, `inicioDeInstancia`, `crearPanelDeEnlace`, `panel.origen` (0.28.0).
- Produce:
  - `ULTIMA_PAGINA_POR_PANTALLA_KEY = 'pokegrid:instance-last-page:v1'`
  - `ultimaPaginaDe(instanceId, indice) -> string`
  - `recordarUltimaPagina(instanceId, indice, url) -> void`
  - `olvidarUltimaPagina(instanceId, indice) -> void`

- [ ] **Paso 1: la prueba, en rojo**

  `tests/instancia-reanudar-smoke.js`:

  ```js
  const reanudar = await ventana.webContents.executeJavaScript(`(() => {
    const salida = {};
    // 1. Una pantalla normal vuelve a donde estaba.
    const primera = createBrowserInstanceWorkspace({
      id: 're-normal', name: 'Normal', url: 'https://ejemplo.invalid/', count: 1,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 0);
    const otra = createBrowserInstanceWorkspace({
      id: 're-otra', name: 'Otra', url: 'https://ejemplo.invalid/', count: 2,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 1);
    recordarUltimaPagina('re-normal', 0, 'https://ejemplo.invalid/donde-estaba');
    recordarUltimaPagina('re-otra', 0, 'https://ejemplo.invalid/pantalla-cero');
    recordarUltimaPagina('re-otra', 1, 'https://ejemplo.invalid/pantalla-uno');
    // 2. Se vuelve a crear desde cero, que es lo que pasa al reabrir el launcher.
    const deNuevo = createBrowserInstanceWorkspace({
      id: 're-normal', name: 'Normal', url: 'https://ejemplo.invalid/', count: 1,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 2);
    const deNuevoOtra = createBrowserInstanceWorkspace({
      id: 're-otra', name: 'Otra', url: 'https://ejemplo.invalid/', count: 2,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 3);
    salida.primeraVuelve = deNuevo.panels[0].startUrl;
    salida.otraCero = deNuevoOtra.panels[0].startUrl;
    salida.otraUno = deNuevoOtra.panels[1].startUrl;
    // 3. Una pantalla de enlace NO guarda su pagina: si la guardara, la original perderia la suya.
    const enlace = crearPanelDeEnlace(deNuevo.instancia, 'https://ejemplo.invalid/enlace', deNuevo.panels[0]);
    salida.enlaceEsEnlace = enlace?.origen === 'enlace';
    salida.enlaceNoPisa = ultimaPaginaDe('re-normal', 0);
    // 4. Una pagina que ya no carga: se guarda igual y se decide al cargar, no al arrancar.
    recordarUltimaPagina('re-normal', 0, 'no-es-una-direccion');
    const conRota = createBrowserInstanceWorkspace({
      id: 're-normal', name: 'Normal', url: 'https://ejemplo.invalid/', count: 1,
      modo: 'instancia', buscador: 'ddg', apertura: 'auto', inicio: ''
    }, 4);
    salida.arrancaIgual = conRota.panels[0].startUrl;
    return salida;
  })()`);
  comprobar(reanudar.primeraVuelve === 'https://ejemplo.invalid/donde-estaba',
    'al reabrir, cada pantalla vuelve a la pagina en la que se quedo', reanudar.primeraVuelve);
  comprobar(reanudar.otraCero === 'https://ejemplo.invalid/pantalla-cero'
    && reanudar.otraUno === 'https://ejemplo.invalid/pantalla-uno',
    'y cada pantalla tiene la suya, sin pisarse entre si',
    `${reanudar.otraCero} / ${reanudar.otraUno}`);
  comprobar(reanudar.enlaceEsEnlace && reanudar.enlaceNoPisa === 'https://ejemplo.invalid/donde-estaba',
    'una pantalla abierta por enlace no guarda su pagina, que si no la original pierde la suya',
    `${reanudar.enlaceEsEnlace} / ${reanudar.enlaceNoPisa}`);
  comprobar(reanudar.arrancaIgual === 'no-es-una-direccion',
    'una pagina guardada que no es una direccion se descarta al cargar, no al arrancar',
    reanudar.arrancaIgual);
  ```

  El último caso necesita una segunda comprobacion, la de lo que pasa de verdad cuando la pagina no carga:

  ```js
  const conCaida = await ventana.webContents.executeJavaScript(`(async () => {
    const panel = browserInstanceViews.get('re-normal').panels[0];
    panel.webview.setAttribute('src', 'no-es-una-direccion');
    await new Promise((r) => setTimeout(r, 1200));
    return panel.webview.getAttribute('src');
  })()`);
  comprobar(conCaida === 'https://ejemplo.invalid/',
    'y si no se puede cargar, la pantalla cae a la URL de la instancia en vez de quedarse en blanco',
    conCaida);
  ```

- [ ] **Paso 2: correr y ver que falla**

  ```
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-reanudar-smoke.js
  ```

  Se espera `ReferenceError: recordarUltimaPagina is not defined`.

- [ ] **Paso 3: las tres funciones**

  Cerca de `guardarInicioDeInstancia`, en `src/renderer.js`:

  ```js
  // Donde se quedó cada pantalla. NO son las cookies ni la caché, que eso se guarda solo porque cada
  // pantalla tiene su partición: esto es «en qué página estaba», que es otra cosa.
  //
  // La clave lleva instancia Y número de pantalla, porque dos pantallas de la misma instancia están
  // en sitios distintos a propósito —son cuentas distintas— y una sola dirección no valdría.
  const ULTIMA_PAGINA_POR_PANTALLA_KEY = 'pokegrid:instance-last-page:v1';

  function leerUltimasPaginas() {
    try {
      const guardado = JSON.parse(localStorage.getItem(ULTIMA_PAGINA_POR_PANTALLA_KEY) || '{}');
      return guardado && typeof guardado === 'object' ? guardado : {};
    } catch {
      return {};
    }
  }

  function ultimaPaginaDe(instanceId, indice) {
    return String(leerUltimasPaginas()[`${instanceId}:${indice}`] || '').slice(0, 2000);
  }

  function recordarUltimaPagina(instanceId, indice, url) {
    const limpio = String(url || '').slice(0, 2000);
    if (!instanceId || Number.isNaN(Number(indice)) || !pareceDireccion(limpio)) return;
    const guardado = leerUltimasPaginas();
    guardado[`${instanceId}:${indice}`] = limpio;
    try {
      localStorage.setItem(ULTIMA_PAGINA_POR_PANTALLA_KEY, JSON.stringify(guardado));
    } catch {
      // Si no se puede guardar —la cuota llena, el almacenamientocapado— la pantalla abre en su
      // pagina de partida y ya esta. Perder el reanudar es molesto; romper el arranque, no.
    }
  }

  function olvidarUltimaPagina(instanceId, indice) {
    const guardado = leerUltimasPaginas();
    delete guardado[`${instanceId}:${indice}`];
    try {
      localStorage.setItem(ULTIMA_PAGINA_POR_PANTALLA_KEY, JSON.stringify(guardado));
    } catch {}
  }
  ```

  Se reusa `pareceDireccion` de la 0.28.0 para no tener dos reglas de que es una direccion: es justo el
  caso en el que tener dos reglas diverge.

- [ ] **Paso 4: dónde se guarda y dónde se lee**

  En `createBrowserInstancePanel`, el valor por defecto de `urlDePartida` pasa a tener en cuenta lo
  recordado:

  ```js
  function createBrowserInstancePanel(instance, workspace, index, launchDelay, urlDePartida = null, particionDePartida = '') {
    // La direccion con la que arranca ESTE panel. Por defecto, la ultima pagina en la que se
    // quedo —que es lo que se ha pedido: volver donde se estaba—, y si no hay ninguna, la de la
    // instancia. Se pasa en `null` y no en el valor final para que se decida aqui y no en la
    // llamada, que es donde no llega el numero de pantalla.
    const partida = urlDePartida || ultimaPaginaDe(instance.id, index) || inicioDeInstancia(instance);
  ```

  Y todas las que usan `urlDePartida` pasan a usar `partida`: el `startUrl`, el `lastUrl`, el
  `destinoActual` y el `setTimeout` del arranque.

  El guardado, en `pintarBarraDeNavegacion`, que ya se llama en cada navegacion. El número de pantalla es
  `panel.instanceIndex`, que `createBrowserInstancePanel` guarda siempre —sobre la línea 8971—, y no
  `panel.index`, que solo tienen algunos paneles:

  ```js
    // Solo las pantallas originales. Una de enlace se recicla, y si guardara su direccion, la
    // original perderia la suya al reiniciar.
    if (panel.origen !== 'enlace') {
      const actual = webviewCurrentUrl(panel);
      if (actual) recordarUltimaPagina(panel.instanceId, panel.instanceIndex, actual);
    }
  ```

  Y el recorte, **una sola vez por panel**, al crearlo —no dentro de `loadConnectionPanel`, que se llama
  en cada carga y acumularía escuchas que dispararían la vuelta al inicio varias veces—:

  ```js
    // Si la pagina guardada ya no carga, esta pantalla cae a la de la instancia y se olvida la
    // pagina mala, para que no lo intente otra vez en cada arranque. Perder una pantalla por una
    // direccion caducada seria peor que empezar de nuevo.
    webview.addEventListener('did-fail-load', () => {
      const guardada = ultimaPaginaDe(instance.id, index);
      if (!guardada || guardada === webviewCurrentUrl(panel) || guardada === panel.lastUrl) return;
      olvidarUltimaPagina(instance.id, index);
      loadConnectionPanel(panel, inicioDeInstancia(instance), { reason: 'Volviendo al inicio' });
    });
  ```

- [ ] **Paso 5: en verde**

  ```
  npm run check
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-reanudar-smoke.js
  node tests\lanzar.cjs tests\instancia-navegador-smoke.js
  ```

  La segunda es importante: `inicioDeInstancia` y `startUrl` se han tocado, y `instancia-navegador-smoke`
  comprueba que una instancia de navegador sigue arrancando en su buscador.

- [ ] **Paso 6: commit**

  ```bash
  git add src tests
  git commit -m "Cada pantalla vuelve a la pagina en la que se quedo"
  ```

---

### Tarea 7: Invariantes, versión y compilación

**Ficheros:**
- Modificar: `verificar-paquete.cjs`
- Modificar: `tests/instancia-navegador-smoke.js` (las comprobaciones que se mudaron de sitio)
- Modificar: `package.json`

**Interfaces:**
- Consume: todo lo anterior.
- Produce: el ZIP.

- [ ] **Paso 1: las invariantes**

  En `verificar-paquete.cjs`, en la lista donde ya están las de la instancia, y cada una mirando algo que
  de verdad pueda romperse:

  ```js
    ['los dos modos, y lo viejo se traduce al leerlo', /MODOS_DE_INSTANCIA = Object\.freeze/.test(renderer) && /opciones\.navegador \? 'navegador'/.test(renderer)],
    ['el motor y el reparto se editan en los ajustes, no al crear', /id="browserInstanceBuscador"/.test(html) === false && /id="instanceSettingsSearch"/.test(html)],
    ['las ventanas emergentes no tienen interruptor', /setPopupsEnabled/.test(preloadCodigo) === false && /ventanas-emergentes:ajustar/.test(mainCodigo) === false],
    ['el icono llega como data:, porque la CSP no deja meter imagenes remotas', /ipcMain\.handle\('instancia:icono'/.test(mainCodigo) && /data:\$\{tipo/.test(mainCodigo)],
    ['y solo se acepta lo que el navegador pinta y no pasa de 256 KB', /const ICONO_MAXIMO_BYTES = 256 \* 1024/.test(mainCodigo) && /function esIconoAdmisible/.test(mainCodigo)],
    ['el reanudar es por instancia Y por pantalla', /function ultimaPaginaDe\(instanceId, indice\)/.test(renderer) && /recordarUltimaPagina\(panel\.instanceId, panel\.instanceIndex/.test(renderer)],
    ['y una pantalla de enlace no lo guarda', /panel\.origen !== 'enlace'/.test(renderer)],
    ['las flechas solo cuando sobra algo que ver', /instanceTabs\.scrollWidth - instanceTabs\.clientWidth/.test(renderer)],
  ```

  Y quitar las que miren lo que esta entrega borra: las que hablen de `browserInstancePopups` o de
  `VENTANAS_EMERGENTES`. **Revisar el fichero entero, no solo las líneas que salten**, porque esta
  entrega toca muchas cosas de golpe y dejar una invariante mirando un patrón viejo es como se rompió
  el verificador las dos veces anteriores.

- [ ] **Paso 2: las pruebas que se mudaron**

  En `tests/instancia-navegador-smoke.js`: las comprobaciones del modelo que usan `navegador: true` pasan a
  `modo: 'navegador'`, y las que esperan `false,ddg,auto` pasan a `instancia,ddg,auto`. Las comprobaciones
  de la barra, del reparto y del tope se quedan: esta entrega no las toca.

  Lo que se ha ido a `instancia-pestanas-smoke.js` y `instancia-reanudar-smoke.js` sale de aquí, para que
  la prueba no crezca hasta los seis minutos.

- [ ] **Paso 3: la versión**

  `package.json`: `0.28.0` → `0.29.0`. Es un cambio de comportamiento grande y no un parche.

- [ ] **Paso 4: pasar el área entera antes de compilar**

  ```
  npm run check
  node tests\ipc-sender-guard-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-navegador-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-modos-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-ajustes-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-pestanas-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-reanudar-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\ventanas-emergentes-smoke.js
  Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
  node tests\lanzar.cjs tests\instancia-vista-smoke.js
  node verificar-paquete.cjs
  ```

  **Los seis, en el mismo orden y sin saltarse ninguno.** La última vez se dio una entrega por cerrada
  sin ejecutar el que cubria el punto mas delicado del plan, y salio una regresion que mataba los inicios
  de sesion. Esta vez la regla es: o los seis en verde, o no se compila.

  Si alguno falla, se arregla y se vuelve a empezar por el primero que falle. No se sigue adelante.

- [ ] **Paso 5: commit**

  ```bash
  git add -A
  git commit -m "Cerrar la entrega del navegador completo"
  ```

- [ ] **Paso 6: compilar y verificar el paquete**

  ```
  $shim="C:\Users\Shockviny\AppData\Local\Temp\opencode\shim"
  if (-not (Test-Path "$shim\pnpm.cmd")) {
    New-Item -ItemType Directory -Path $shim -Force | Out-Null
    Set-Content -Path "$shim\pnpm.cmd" -Encoding ascii -Value "@echo off`ncall corepack pnpm %*`nexit /b %ERRORLEVEL%"
  }
  $env:PATH = "$shim;$env:PATH"
  npm run dist
  node verificar-paquete.cjs
  node -e "const b=require('fs').readFileSync(process.argv[1]);console.log((b.length/1048576).toFixed(1)+' MB');console.log(require('crypto').createHash('sha256').update(b).digest('hex'))" dist\IDLE-POKE-LAUNCHER-0.29.0-portatil.zip
  ```

  La ruta va como argumento y no dentro del entrecomillado: metida dentro, PowerShell la parte mal y
  el comando falla con un error que no menciona el shell.

  El shim de `pnpm` se pierde al limpiar el temporal: es un fichero de dos líneas que llama a
  `corepack pnpm`, y sin él `npm run dist` falla al final con un error que no menciona el shim.

- [ ] **Paso 7: pasarlo por un revisor de contexto fresco**

  Un subagente con contexto nuevo revisa el rango entero, y en particular los cinco casos del Foco de
  revisión, comprobando de verdad si hay prueba de cada uno. El revisor recibe la spec, el plan y este
  registro. Lo que encuentre critico se arregla antes de decir que está listo.

---

## Lo que este plan deja a medias

- **Las contraseñas que persisten.** Fuera, por seguridad y por tamaño. Va con spec propia.
- **Historial y marcadores.** No se han pedido.
- **Cambiar de modo una instancia ya creada.** No, y con razon.
- **Los indicadores del icono para modo instancia.** El icono se pide para cualquier pantalla original, no
  solo para las de modo navegador: el icono de la web es de la web.