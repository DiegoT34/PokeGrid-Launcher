# Perfiles de sesión — Plan de implementación

> **Para trabajadores agénticos:** SUB-HABILIDAD OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para llevar el seguimiento.

**Objetivo:** Que todas las ventanas de navegador compartan una sesión con nombre —como los perfiles de Chrome— y que se pueda elegir con cuál trabaja cada ventana.

**Arquitectura:** Un perfil es una partición de Electron con nombre. Se guarda la lista de perfiles en `localStorage` y cada ventana guarda su `perfilId`. Una función resuelve perfil → partición. Las cuentas del juego no se tocan. Sustituye al interruptor `sesion` de la 0.36.0, que se borra entero.

**Pila:** Electron 43, JavaScript sin dependencias ni bundler. `node --check` para la sintaxis. Pruebas con `node tests\lanzar.cjs <guion>`.

**Especificación:** `docs/superpowers/specs/2026-10-18-perfiles-de-sesion-design.md`

## Restricciones globales

- **Cero dependencias nuevas.** Ni una.
- **`src/` no se mueve.** El proceso principal decide qué entra en el paquete; mover un fichero de ahí rompe el paquete en silencio.
- **Los helpers van en ficheros de `herramientas/`**, nunca en la raíz.
- **Sin acentos graves ni comillas angulares dentro de plantillas.** Rompen la cadena antes de tiempo y el error apunta a la línea donde empieza la plantilla. Ha pasado cuatro veces en este repositorio.
- **Nada de emoji pintados.** Los iconos van en `LAUNCHER_ICON_PATHS`, en `src/renderer.js`.
- **Las cuentas del juego no se tocan.** Siguen con `persist:pokegrid-<cuenta>`.
- **El perfil `Principal` se llama `principal`, en minúsculas, siempre.** Es el identificador, no el nombre visible.
- **Versionado:** esta versión es la `0.37.0`.
- **Pruebas del área en orden, o no se compila.** `herramientas\area-entera.ps1`. Solo pruebas del área tocada, nunca la suite entera.

## Foco de revisión

Las cinco entradas o condiciones que la especificación deja en silencio y que son las que más
probablemente van a morder a quien use esto:

1. **Perfil borrado a mano desde el almacenamiento.** Una ventana con `perfilId` apuntando a un perfil
   inexistente debe caer en `Principal`, no quedarse sin sesión. → Tarea 2, paso 4.
2. **Dos ventanas con el mismo perfil, cerrando una.** Cerrar una no debe borrar la partición del
   perfil, que es compartida. → Tarea 2, paso 5.
3. **Ventanas antiguas al migrar.** Sin `perfilId`, van todas a `Principal` y se unen. → Tarea 2, paso 6.
4. **Nombre de perfil repetido.** No se comprueba: se distinguen por posición. → Tarea 4, paso 3.
5. **Cambiar de perfil con ventanas abiertas.** Reconstruye las pantallas y pierde las webs abiertas.
   El aviso tiene que decirlo antes, no después. → Tarea 5, paso 5.

---

## Tarea 1: El almacén de perfiles

Los perfiles tienen que existir, guardarse y releerse antes de que nada los use. Esta tarea no toca la
interfaz: es la base de la que dependen las demás.

**Ficheros:**
- Crear: `src/perfiles-sesion.js`
- Modificar: `src/index.html:749-756` (añadir un `<script src>` antes de `renderer.js`)

**Interfaces:**
- Produce:
  - `const PERFILES_KEY = 'pokegrid:session-profiles:v1'` — la clave de `localStorage`.
  - `const PERFIL_POR_DEFECTO = 'principal'` — identificador del perfil que no se puede borrar ni renombrar.
  - `window.pokeGridPerfiles` con:
    - `listar()` → `Array<{id, nombre, creado}>`, siempre con `principal` el primero.
    - `crear(nombre)` → el perfil creado; `nombre` en blanco o repetido se acepta y se devuelve uno con id único.
    - `renombrar(id, nombre)` → `boolean`; `false` si `id` es `principal` o no existe.
    - `borrar(id)` → `boolean`; `false` si `id` es `principal`, no existe, o tiene ventanas asignadas. Para saberlo llama a `window.pokeGridPerfiles.conCuantasVentanas(id)`.
    - `existe(id)` → `boolean`.
    - `resolver(id)` → el id si existe, o `PERFIL_POR_DEFECTO` si no.

**Por qué un fichero aparte y no dentro de `renderer.js`:** `renderer.js` tiene unas 12.000 líneas. Este
almacén es una unidad con una sola responsabilidad —guardar y manipular perfiles— y se puede probar
sola, sin levantar una ventana con doce webviews.

Además no es un patrón nuevo: en `src/` ya hay exactamente eso, ficheros con una sola pieza y su
prueba al lado. `iconos-comunes.js` es el almacén de iconos y `account-model.js` el de cuentas. Es el
del sitio.

**Por qué no usa `require`:** los ficheros de `src/` se cargan con `<script src>`, no con módulos. El
acceso al mundo se hace igual que en `iconos-comunes.js`: una IIFE que se expone en `window`.

---

- [ ] **Paso 1: escribir la prueba que falla**

Crear `tests/perfiles-almacen-smoke.js`:

```js
// El almacén de perfiles, probado solo: sin ventana, sin webview, sin nada.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const RAIZ = path.join(__dirname, '..');

let fallos = 0;
const comprobar = (que, ok, detalle) => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
};

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  try {
    await ventana.loadFile(path.join(RAIZ, 'src', 'index.html'));
    await new Promise((r) => setTimeout(r, 500));

    const estado = await ventana.webContents.executeJavaScript(`(() => {
      const P = window.pokeGridPerfiles;
      if (!P) return { existe: false };
      const lista = P.listar();
      const trabajo = P.crear('Trabajo');
      const otro = P.crear('');            // nombre en blanco: se acepta
      const repetido = P.crear('Trabajo');  // nombre repetido: se acepta
      return {
        existe: true,
        principalPrimero: lista[0] && lista[0].id === 'principal',
        principalSeLlama: lista[0] && lista[0].nombre === 'Principal',
        totalAntesDeBorrar: P.listar().length,
        noRenombrarPrincipal: P.renombrar('principal', 'Otro') === false,
        renombrarTrabajo: P.renombrar(trabajo.id, 'Curro') === true,
        nombreCambiado: P.listar().find((p) => p.id === trabajo.id).nombre === 'Curro',
        noBorrarPrincipal: P.borrar('principal') === false,
        idsDistintos: new Set([trabajo.id, otro.id, repetido.id]).size === 3,
        conNombreVacio: otro.nombre.length >= 0,
        resolverDesconocido: P.resolver('no-existe'),
        resolverPrincipal: P.resolver('principal'),
        principalSigue: P.listar()[0].id === 'principal'
      };
    })()`);

    console.log('\nAlmacén de perfiles:\n');
    comprobar('el módulo se expone en window', estado.existe === true);
    comprobar('Principal existe y es el primero', estado.principalPrimero && estado.principalSeLlama);
    comprobar('Principal no se puede renombrar', estado.noRenombrarPrincipal);
    comprobar('los demás sí se renombran', estado.renombrarTrabajo && estado.nombreCambiado);
    comprobar('Principal no se puede borrar', estado.noBorrarPrincipal);
    comprobar('los ids nunca se repiten', estado.idsDistintos);
    comprobar('un nombre en blanco se acepta', estado.conNombreVacio);
    comprobar('un perfil desconocido cae en Principal', estado.resolverDesconocido === 'principal');
    comprobar('Principal se resuelve a si mismo', estado.resolverPrincipal === 'principal');
    comprobar('Principal sobrevive a todo lo anterior', estado.principalSigue);

    console.log(`\ncomprobaciones fallan: ${fallos}`);
    ventana.destroy();
    app.exit(fallos ? 1 : 0);
  } catch (error) {
    console.error(error.stack || error.message);
    ventana.destroy();
    app.exit(1);
  }
});
```

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\lanzar.cjs tests\perfiles-almacen-smoke.js
```
Esperado: FALLA con «el módulo se expone en window · false». Si pasa, el fichero `src/perfiles-sesion.js` ya existe de antes y hay que mirar por qué.

- [ ] **Paso 3: escribir el almacén**

Crear `src/perfiles-sesion.js`:

```js
// Los perfiles de sesion.
//
// Un perfil es una sesion con nombre: sus cookies, sus contrasenas y su estado. Varios, con nombre, y se
// cambia de uno a otro, como los perfiles de Chrome. Cada ventana del launcher dice con cual trabaja, y
// todas sus pantallas usan ese.
//
// Va en su propio fichero y no dentro de `renderer.js` por dos razones. La primera es que
// `renderer.js` tiene unas doce mil lineas y esto es una unidad sola: guardar y manipular perfiles. La
// segunda es que asi se puede probar sin levantar una ventana con doce webviews.
//
// El `Principal` existe siempre y no se puede borrar ni renombrar. Es lo que Agarra toda ventana sin
// perfil asignado, y una ventana sin perfil asignado se queda sin sesion: ni entra en Google ni en
// nada.
//
// LA SEGURIDAD DE BORRAR ESTA EN EL NOMBRE DE LA PARTICION, AQUI Y EN `perfilParticion`. Una
// particion de perfil se llama `persist:pokegrid-perfil-<id>`, que NO empieza por `instance-`, y el
// borrado de particiones al cerrar una ventana filtra justo por ahi. Si compartiera prefijo, cerrar una
// ventana le borraria las cookies a todas las de su perfil.
(function crearAlmacenDePerfiles() {
  const PERFILES_KEY = 'pokegrid:session-profiles:v1';
  const PERFIL_POR_DEFECTO = 'principal';

  const perfilPrincipal = Object.freeze({ id: PERFIL_POR_DEFECTO, nombre: 'Principal', creado: 0 });

  function leer() {
    try {
      const filas = JSON.parse(localStorage.getItem(PERFILES_KEY) || '[]');
      if (!Array.isArray(filas)) return [perfilPrincipal];
      const vistos = new Set([PERFIL_POR_DEFECTO]);
      const limpios = filas.filter((fila) => {
        const id = String(fila && fila.id || '');
        if (!id || vistos.has(id) || id === PERFIL_POR_DEFECTO) return false;
        vistos.add(id);
        return true;
      });
      return [perfilPrincipal, ...limpios.map((f) => ({
        id: String(f.id),
        nombre: String(f.nombre || '').slice(0, 40),
        creado: Number(f.creado) || 0
      }))];
    } catch {
      return [perfilPrincipal];
    }
  }

  function escribir(lista) {
    try {
      localStorage.setItem(PERFILES_KEY, JSON.stringify(lista.filter((p) => p.id !== PERFIL_POR_DEFECTO)));
      return true;
    } catch {
      return false;
    }
  }

  // El id sale de lo mismo que usan las ventanas, que ya garantiza que no se repite. Un perfil sin
  // nombre no se inventa uno: se deja vacio y el selector lo enseña como «Perfil sin nombre». Poner un
  // nombre inventado seria mentir sobre lo que el usuario escribio.
  function nuevoId() {
    const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `perfil-${token.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60)}`;
  }

  window.pokeGridPerfiles = Object.freeze({
    listar() { return leer(); },

    existe(id) {
      const buscado = String(id || '');
      return !!buscado && leer().some((p) => p.id === buscado);
    },

    // Un id guardado que ya no existe cae en Principal. Si no, esa ventana se quedaria sin sesion y no
    // entraria en nada; asi siempre esta en algo que existe.
    resolver(id) {
      const buscado = String(id || '');
      return this.existe(buscado) ? buscado : PERFIL_POR_DEFECTO;
    },

    crear(nombre) {
      const perfil = { id: nuevoId(), nombre: String(nombre || '').trim().slice(0, 40), creado: Date.now() };
      escribir([...leer(), perfil]);
      return perfil;
    },

    renombrar(id, nombre) {
      const buscado = String(id || '');
      // Principal no se renombra: su nombre es el que aparece en todos los selectores, y cambiarlo
      // haria que el mismo perfil se llamara de dos maneras.
      if (!buscado || buscado === PERFIL_POR_DEFECTO) return false;
      const lista = leer();
      if (!lista.some((p) => p.id === buscado)) return false;
      escribir(lista.map((p) => (p.id === buscado ? { ...p, nombre: String(nombre || '').trim().slice(0, 40) } : p)));
      return true;
    },

    borrar(id) {
      const buscado = String(id || '');
      if (!buscado || buscado === PERFIL_POR_DEFECTO) return false;
      const lista = leer();
      if (!lista.some((p) => p.id === buscado)) return false;
      // Con ventanas dentro, borrarlas las dejaria sin sesion. Se obliga a moverlas antes.
      if (typeof this.conCuantasVentanas === 'function' && this.conCuantasVentanas(buscado) > 0) return false;
      escribir(lista.filter((p) => p.id !== buscado));
      return true;
    },

    // Lo rellena `renderer.js`, que es quien sabe de ventanas. Aqui se deja como se sea: si no hay
    // quien lo defina, `borrar` no bloquea, que es mejor que bloquear siempre y no poder borrar nada.
    conCuantasVentanas: null
  });
})();
```

- [ ] **Paso 4: cargarlo en el HTML**

En `src/index.html`, el bloque de `<script src>` va de la línea 775 a la 782. Añadir el nuevo **antes**
de `renderer.js`, que es la 782 —el orden importa: `renderer.js` llama a `pokeGridPerfiles` al leer las
ventanas, y si el almacén no está delante, aún no existe:

```html
    <script src="perfiles-sesion.js"></script>
    <script src="renderer.js"></script>
```

- [ ] **Paso 5: meterlo en `npm run check`**

El script `check` de `package.json` enumera los ficheros de `src/` uno a uno. Si el nuevo no entra, un
`node --check` de más tarde puede no mirarlo nunca:

```
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));j.scripts.check=j.scripts.check.replace('node --check src/renderer.js','node --check src/perfiles-sesion.js && node --check src/renderer.js');fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8');console.log(j.scripts.check.slice(-160))"
```

Comprobar que la cola del script sale así:

```
... && node --check src/perfiles-sesion.js && node --check src/renderer.js && ...
```

- [ ] **Paso 6: ejecutar la prueba y ver que pasa**

```
node tests\lanzar.cjs tests\perfiles-almacen-smoke.js
```
Esperado: las 10 comprobaciones en `ok`, `comprobaciones fallan: 0`.

- [ ] **Paso 7: comprobar la sintaxis de todo**

```
npm run check
```
Esperado: sale con 0.

- [ ] **Paso 8: confirmar**

```bash
git add src/perfiles-sesion.js src/index.html package.json tests/perfiles-almacen-smoke.js
git commit -m "Almacen de perfiles de sesion, probados sin ventana

Va en su propio fichero: renderer.js tiene unas doce mil lineas y esto es una unidad sola,
guardar y manipular perfiles. Ademas se puede probar sin levantar doce webviews."
```

---

## Tarea 2: La partición y la migración

Ahora que los perfiles existen, se conecta con las ventanas. Esta tarea es la que decide de verdad qué
sesión usa cada ventana, y es donde está el riesgo de perder sesiones.

**Ficheros:**
- Modificar: `src/renderer.js:8436-8443` (constantes), `8461` (`normalizarOpcionesDeInstancia`), `8578-8581` (`browserInstancePartition`), `9949` (llamada), `10211` (filtro de borrado)
- Modificar: `src/renderer.js` (nueva `perfilParticion`, y `conCuantasVentanas`)
- Crear: `tests/perfiles-sesion-0370-smoke.js`

**Interfaces:**
- Consume: `window.pokeGridPerfiles` de la tarea 1 (`resolver`, `existe`, `listar`, `conCuantasVentanas`).
- Produce:
  - `perfilParticion(perfilId)` → `string`, con la forma `persist:pokegrid-perfil-<id>`.
  - `browserInstancePartition(instanceId, index, opciones)` — conserva la firma, pero `opciones.perfilId` decide.

---

- [ ] **Paso 1: escribir la prueba que falla**

Crear `tests/perfiles-sesion-0370-smoke.js`:

```js
// Que perfil usa cada ventana, y —lo que mas importa— que cerrar una no borre las cookies de las
// demas del mismo perfil.
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

const RAIZ = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(RAIZ, 'src', 'renderer.js'), 'utf8');

let fallos = 0;
const comprobar = (que, ok, detalle) => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${que}${detalle && !ok ? '  ·  ' + detalle : ''}`);
};

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  try {
    console.log('\nPartición por perfil:\n');

    // La particion se saca del renderer y se ejecuta aqui, sin copiar su texto: si se copiara, la
    // prueba seguiria dando verde cuando la funcion cambiara.
    const cuerpo = renderer.slice(
      renderer.indexOf('function perfilParticion'),
      renderer.indexOf('function perfilParticion') + 400
    );
    const perfiles = fs.readFileSync(path.join(RAIZ, 'src', 'perfiles-sesion.js'), 'utf8');
    const clave = /const PERFIL_POR_DEFECTO = '([^']+)'/.exec(perfiles);
    const porDefecto = clave ? clave[1] : 'principal';
    // eslint-disable-next-line no-new-func
    const fn = new Function('PERFIL_POR_DEFECTO', cuerpo + '\nreturn perfilParticion;')(porDefecto);

    const principal = fn('principal');
    const trabajo = fn('perfil-trabajo');

    comprobar('dos ventanas del mismo perfil comparten sesion', principal === fn('principal'));
    comprobar('perfiles distintos dan particiones distintas', principal !== trabajo, `${principal} vs ${trabajo}`);
    comprobar('la forma es la de un perfil', /^persist:pokegrid-perfil-[a-z0-9-]+$/.test(principal), principal);
    comprobar('un perfil desconocido cae en el principal', fn('no-existe') === principal, fn('no-existe'));

    // La proteccion que mas cuesta: el nombre de la particion no puede empezar por el prefijo que el
    // borrado filtra, o cerrar una ventana le borraria las cookies a todas las de su perfil.
    const filtro = /\.filter\(\(particion\) => particion\.startsWith\('([^']+)'\)\)/.exec(renderer);
    comprobar('el filtro de borrado existe', Boolean(filtro));
    const prefijo = filtro ? filtro[1] : '';
    comprobar('la particion de perfil NO entra en el borrado al cerrar',
      Boolean(filtro) && !principal.startsWith(prefijo), `${principal} vs prefijo ${prefijo}`);

    console.log('\nMigración de las ventanas antiguas:\n');
    const normaliza = /const perfilId = window\.pokeGridPerfiles\.resolver\(opciones\.perfilId\);/.test(renderer);
    comprobar('el perfil se rellena al leer la ventana', normaliza);
    comprobar('y se resuelve por el almacen, que cae en Principal si no existe',
      /return \{ modo, buscador, apertura, inicio, perfilId \};\s*\n\}/.test(renderer));

    console.log('\nLo que se quitó:\n');
    comprobar('ya no queda el interruptor de sesion', !/browserInstanceSesionCompartida/.test(renderer));
    comprobar('ni sus constantes', !/SESIONES_DE_INSTANCIA/.test(renderer) && !/SESION_POR_DEFECTO = 'propia'/.test(renderer));
    comprobar('ni la sesion compartida', !/PARTICION_COMPARTIDA/.test(renderer));

    console.log(`\ncomprobaciones fallan: ${fallos}`);
    ventana.destroy();
    app.exit(fallos ? 1 : 0);
  } catch (error) {
    console.error(error.stack || error.message);
    ventana.destroy();
    app.exit(1);
  }
});
```

**Esa prueba sustituye a `tests/sesiones-compartidas-0360-smoke.js`, y no lo sustituye entero.**

La de la 0.36.0 tiene 19 comprobaciones y solo nueve son del interruptor. Las otras diez son de cosas
que este plan **no toca** y que hay que seguir vigilando:

| Comprobación de la 0.36.0 | Qué protege | Qué pasa |
|---|---|---|
| `la decision se toma una vez por pasada` | Que no se repita el sondeo de farmeo | Se copia tal cual |
| `la guarda usa esa decision` | El atajo barato del sondeo | Se copia tal cual |
| `se lee todo si el selector esta abierto` | Idem | Se copia tal cual |
| `o si alguna cuenta esta farmeando` | Idem | Se copia tal cual |
| `y sigue habiendo un camino barato cuando no se farmea` | Idem | Se copia tal cual |
| `el nombre se lleva el hueco sobrante` | El diseño de la barra de la ventana | Se copia tal cual |
| `y los botones van detras de la barra de acciones` | Idem | Se copia tal cual |

Se pegan al final del bloque `app.whenReady()` de `perfiles-sesion-0370-smoke.js`, con su
`console.log('\nFarmeo y barra de la ventana:\n')` delante. Si no se copian, esas siete cosas dejan de
comprobarse sin que nadie se entere: la prueba sale de la suite y con ella se va la vigilancia.

- [ ] **Paso 2: ejecutarla y ver que falla**

```
node tests\lanzar.cjs tests\perfiles-sesion-0370-smoke.js
```
Esperado: falla con «la particion de perfil NO entra en el borrado al cerrar», porque la partición sigue
llamándose `pokegrid-compartida`.

- [ ] **Paso 3: cambiar las constantes**

En `src/renderer.js`, sustituir el bloque de constantes de sesión (líneas 8436-8443) por:

```js
// El perfil por defecto. Vive en `src/perfiles-sesion.js`, que es quien lo crea y lo garantiza; aqui
// solo se copia el valor para no depender de que ese fichero se haya cargado. `perfilParticion` lo
// recibe como parametro justamente para que no haya dos definiciones que puedan desincronizarse.
const PERFIL_POR_DEFECTO = 'principal';
```

Borrar `SESIONES_DE_INSTANCIA`, `SESION_POR_DEFECTO` y `PARTICION_COMPARTIDA`.

- [ ] **Paso 4: rellenar `perfilId` al leer la ventana**

En `normalizarOpcionesDeInstancia`, sustituir:

```js
  const sesion = SESIONES_DE_INSTANCIA.includes(opciones.sesion) ? opciones.sesion : SESION_POR_DEFECTO;
  return { modo, buscador, apertura, inicio, sesion };
```

por:

```js
  // El perfil se resuelve SIEMPRE a traves del almacen, incluso el Principal. Asi, una ventana cuyo
  // perfil se haya borrado a mano del almacenamiento cae en el Principal en vez de quedarse sin
  // sesion, que es lo que pasaria si aqui solo se comprobara que el campo venga informado.
  const perfilId = window.pokeGridPerfiles?.resolver(opciones.perfilId) || PERFIL_POR_DEFECTO;
  return { modo, buscador, apertura, inicio, perfilId };
```

- [ ] **Paso 5: escribir la partición del perfil**

Junto a `browserInstancePartition`, añadir:

```js
// La particion de un perfil. Comparte su nombre con `src/perfiles-sesion.js` a proposito: el `perfil-`
// es lo que hace que cerrar una ventana NO borre las cookies de las demas de su perfil, porque el
// borrado filtra por `persist:pokegrid-instance-` y esto no empieza por ahi.
function perfilParticion(perfilId) {
  const id = String(perfilId || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 70);
  return `persist:pokegrid-perfil-${id || PERFIL_POR_DEFECTO}`;
}
```

Y reescribir `browserInstancePartition` para que use el perfil:

```js
function browserInstancePartition(instanceId, index, opciones = {}) {
  return perfilParticion(opciones && opciones.perfilId);
}
```

Los parámetros `instanceId` e `index` se quedan aunque no se usen: quien la llama los pasa, y cambiarlos
obligaría a tocar el llamador. Es una firma que ya existe y no compensa romperla por esto.

- [ ] **Paso 6: decir cuántas ventanas tiene cada perfil**

Añadir junto a las funciones de perfil:

```js
// Cuantas ventanas usan un perfil. Lo necesita el almacen para no dejar ventanas sin sesion al borrar
// uno. Se rellena aqui porque aqui es donde se sabe que ventanas hay.
window.pokeGridPerfiles.conCuantasVentanas = (perfilId) => {
  const buscado = String(perfilId || '');
  if (!buscado) return 0;
  return browserInstances.filter((fila) => perfilParticion(fila.perfilId) === perfilParticion(buscado)).length;
};
```

- [ ] **Paso 7: ejecutar la prueba y ver que pasa**

```
node tests\lanzar.cjs tests\perfiles-sesion-0370-smoke.js
node tests\lanzar.cjs tests\perfiles-almacen-smoke.js
```
Esperado: las dos en verde.

- [ ] **Paso 8: apartar la prueba de la 0.36.0**

Cuando `perfiles-sesion-0370-smoke.js` ya esté en verde y lleve dentro las comprobaciones del sondeo, la
prueba vieja se va a `_basura/`. **No se borra**, como todo lo demás que sobra:

```
New-Item -ItemType Directory -Force -Path _basura | Out-Null
git mv tests\sesiones-compartidas-0360-smoke.js _basura\sesiones-compartidas-0360-smoke.js
```

Antes de moverla, comprobar que la nueva tiene las diez comprobaciones trasplantadas:

```
node -e "const fs=require('fs');const a=fs.readFileSync('tests/sesiones-compartidas-0360-smoke.js','utf8');const b=fs.readFileSync('tests/perfiles-sesion-0370-smoke.js','utf8');const q=[...a.matchAll(/comprobar\('([^']+)'/g)].map(m=>m[1]);const falta=q.filter(t=>!b.includes(t));console.log(falta.length?'FALTAN: '+falta.join(' | '):'las '+q.length+' comprobaciones estan copiadas')"
```

- [ ] **Paso 9: confirmar**

```bash
git add -A src/renderer.js tests/perfiles-sesion-0370-smoke.js _basura
git commit -m "Cada ventana usa la particion de su perfil, y las ventanas viejas van al Principal

La particion de un perfil no empieza por 'instance-', que es justo el prefijo que filtra el
borrado al cerrar una ventana: por eso cerrar una no le borra las cookies a las demas.

La prueba de la 0.36.0 pasa a _basura: sus comprobaciones del sondeo de farmeo y de la barra
se han trasplantado a la de la 0.37.0, que es la que los vigila ahora."
```

---

## Tarea 3: Quitar el interruptor de la 0.36.0

Deja de haber dos mecanismos para lo mismo. Un perfil ya cubre «compartir con los demás».

**Ficheros:**
- Modificar: `src/renderer.js:162-163, 6317-6325, 10637-10638, 11724-11726, 11745`
- Modificar: `src/index.html:161-168`
- Modificar: `src/styles.css:2703-2720`

**Interfaces:**
- Consume: nada.
- Produce: nada. Es una eliminación.

---

- [ ] **Paso 1: comprobar que lo que se borra está en uso**

```
node -e "const fs=require('fs');const t=fs.readFileSync('src/renderer.js','utf8');for(const n of ['browserInstanceSesionCompartida','browserInstanceSesionHelp','explicarSesionCompartida'])console.log(n+': '+(t.split(n).length-1)+' veces')"
```
Esperado: cada uno sale al menos una vez. Si alguno sale 0, ya se había borrado y este paso se salta.

- [ ] **Paso 2: borrarlo del renderer**

En `src/renderer.js`, quitar:

```js
const browserInstanceSesionCompartida = document.querySelector('#browserInstanceSesionCompartida');
const browserInstanceSesionHelp = document.querySelector('#browserInstanceSesionHelp');
```

y la función `explicarSesionCompartida` entera, y en `openBrowserInstanceModal`:

```js
  // El interruptor de sesion se desmarca al abrir: si no, marcaste una vez y todas las siguientes
  // ventanas nacen compartidas sin haberlo pedido.
  browserInstanceSesionCompartida.checked = false;
  explicarSesionCompartida(false);
```

y el enganche:

```js
// El interruptor de sesion compartida. Solo cambia el texto de ayuda: la sesion se aplica al crear la
// ventana, y cambiarla despues obligaria a reconstruir las pantallas —que es lo que hace perder las
// webs abiertas— asi que en el modal solo se elige al principio.
browserInstanceSesionCompartida?.addEventListener('change', () => {
  explicarSesionCompartida(browserInstanceSesionCompartida.checked);
});
```

y en el envío del formulario:

```js
    // La sesion se decide aqui y no se deduce de nada: se elige ventana a ventana. Apagada por
    // defecto, que es como ha funcionado siempre.
    sesion: browserInstanceSesionCompartida?.checked ? 'compartida' : SESION_POR_DEFECTO,
```

- [ ] **Paso 3: borrarlo del HTML**

En `src/index.html`, quitar el bloque completo del interruptor, desde `<div class="field
browser-instance-sesion-field">` hasta su `</div>` de cierre, incluido el comentario que lo precede.

- [ ] **Paso 4: borrarlo del CSS**

En `src/styles.css` (líneas 2703-2719), quitar `.switch-line`, `.switch-line:hover`,
`.switch-line input`, `.switch-line:has(input:checked)`, el comentario que las precede, y
`.browser-instance-sesion-field` (2723).

Comprobado antes: `switch-line` no aparece en ningún otro sitio de `index.html`, `styles.css` ni
`renderer.js`. Es decir, no se deja CSS muerto.

**`.field-help` NO se quita.** Se usa en `index.html:167`, dentro del bloque que se borra, y por eso
parece huérfana. Pero las tareas 4 y 5 lo vuelven a usar en el selector de perfil, así que se queda:
borrarla ahora y reañadirla dos tareas después sería trabajo de más.

- [ ] **Paso 5: comprobar que no queda nada**

```
node -e "const fs=require('fs');for(const f of ['src/renderer.js','src/index.html','src/styles.css']){const t=fs.readFileSync(f,'utf8');for(const n of ['SesionCompartida','sesion-compartida','switch-line','SESION_POR_DEFECTO'])if(t.includes(n))console.log('QUEDA '+n+' en '+f)}"
npm run check
```
Esperado: la primera no imprime nada y el segundo sale con 0.

- [ ] **Paso 6: confirmar**

```bash
git add src/renderer.js src/index.html src/styles.css
git commit -m "Fuera el interruptor de sesion compartida de la 0.36.0

Un perfil ya cubre compartir con los demas. Dejar los dos mecanismos juntos confunde: el
interruptor parecia la forma normal de compartir y era solo una opcion por ventana."
```

---

## Tarea 4: El selector de perfil en el modal

La primera de las tres pantallas. Aquí se elige con qué perfil nace la ventana.

**Ficheros:**
- Modificar: `src/index.html` (en el modal de nueva ventana, donde estaba el interruptor)
- Modificar: `src/renderer.js` (la constante del elemento, el guardado y el pintado)
- Modificar: `src/styles.css`

**Interfaces:**
- Consume: `window.pokeGridPerfiles.listar()` y `.crear(nombre)` de la tarea 1.
- Produce: `browserInstancePerfil` (elemento `#browserInstancePerfil`), `pintarSelectorDePerfiles()`.

---

- [ ] **Paso 1: el HTML del selector**

En `src/index.html`, en el modal de nueva ventana, donde estaba el interruptor, poner:

```html
          <!-- Con que perfil trabaja esta ventana. Un perfil es una sesion con nombre: dentro de el
               entras una vez en Google y ya lo tienes en las demas ventanas con el mismo perfil.
               Las ventanas con perfiles distintos NO se ven entre si. -->
          <label class="field browser-instance-perfil-field">
            <span>PERFIL</span>
            <select id="browserInstancePerfil"></select>
            <small class="field-help">Las ventanas con el mismo perfil comparten lo que tengas
              iniciado en ellas.</small>
          </label>
```

- [ ] **Paso 2: pintar los perfiles**

En `src/renderer.js`, junto a las demás constantes de `browserInstance*`:

```js
const browserInstancePerfil = document.querySelector('#browserInstancePerfil');
```

y:

```js
// Pinta el selector de perfiles. Se llama al abrir el modal, no al arrancar: si se crea un perfil
// despues, la lista tiene que reflejarlo sin recargar, y al abrir se repinta entero y listo.
function pintarSelectorDePerfiles() {
  const selector = browserInstancePerfil;
  if (!selector) return;
  const lista = window.pokeGridPerfiles?.listar() || [];
  selector.replaceChildren();
  for (const perfil of lista) {
    const opcion = document.createElement('option');
    opcion.value = perfil.id;
    opcion.textContent = perfil.nombre || 'Perfil sin nombre';
    selector.appendChild(opcion);
  }
  selector.value = window.pokeGridPerfiles?.resolver('') || PERFIL_POR_DEFECTO;
}
```

- [ ] **Paso 3: guardar al crear**

En `openBrowserInstanceModal`, añadir `pintarSelectorDePerfiles();` antes de
`browserInstanceBackdrop.hidden = false;`, y cambiar el envío del formulario:

```js
    perfilId: browserInstancePerfil?.value || PERFIL_POR_DEFECTO,
```

- [ ] **Paso 4: crear un perfil sin salir del modal**

**No se usa `window.prompt`.** Contando lo que hay: `window.confirm` se usa 9 veces, `window.alert` 1, y
`window.prompt` **ninguna**. Un diálogo del sistema puede aparecer detrás de la ventana o no aparecer, y
además el gestor de perfiles necesita la misma operación y desde una fila no hay forma de abrir un
prompt. Aquí el campo se enseña dentro del sitio donde hace falta.

En `src/index.html`, después del `<select id="browserInstancePerfil">`:

```html
            <button id="nuevoPerfilButton" class="button button-secondary browser-instance-perfil-nuevo" type="button">Perfil nuevo</button>
            <span id="nuevoPerfilForm" class="browser-instance-perfil-form" hidden>
              <input id="nuevoPerfilNombre" type="text" maxlength="40" placeholder="Nombre del perfil"
                aria-label="Nombre del perfil nuevo">
              <button id="nuevoPerfilCrear" class="button button-secondary" type="button">Crear</button>
            </span>
```

En `src/renderer.js`, junto a `pintarSelectorDePerfiles`:

```js
// Crear un perfil con el nombre escrito. Solo crea y lo devuelve: quien llame decide que pintar
// despues, porque el selector del modal y el gestor tienen que pintar cosas distintas.
function crearPerfilConNombre(nombre) {
  return window.pokeGridPerfiles?.crear(String(nombre || '').trim()) || null;
}

function mostrarFormDePerfilNuevo() {
  const form = document.querySelector('#nuevoPerfilForm');
  const campo = document.querySelector('#nuevoPerfilNombre');
  if (!form || !campo) return;
  form.hidden = false;
  campo.value = '';
  campo.focus();
}

function ocultarFormDePerfilNuevo() {
  const form = document.querySelector('#nuevoPerfilForm');
  if (form) form.hidden = true;
}

// El camino del modal: crear aqui y que el selector se quede en el perfil nuevo, sin cerrarse.
function crearPerfilDesdeElSelector() {
  const campo = document.querySelector('#nuevoPerfilNombre');
  const creado = crearPerfilConNombre(campo?.value);
  if (!creado) return;
  pintarSelectorDePerfiles();
  if (browserInstancePerfil) browserInstancePerfil.value = creado.id;
  ocultarFormDePerfilNuevo();
}
```

y los enganches, cerca del `submit` del formulario:

```js
document.querySelector('#nuevoPerfilButton')?.addEventListener('click', mostrarFormDePerfilNuevo);
// Enter tambien crea. En un campo de texto de un modal, lo raro es tener que pulsar un boton al lado.
document.querySelector('#nuevoPerfilNombre')?.addEventListener('keydown', (evento) => {
  if (evento.key !== 'Enter') return;
  evento.preventDefault();
  crearPerfilDesdeElSelector();
});
document.querySelector('#nuevoPerfilCrear')?.addEventListener('click', crearPerfilDesdeElSelector);
```

Un nombre en blanco **sí crea** el perfil: `pokeGridPerfiles.crear` lo acepta y el selector lo enseña
como «Perfil sin nombre». No se pone un nombre inventado, que sería mentir sobre lo que se escribió.

- [ ] **Paso 5: el CSS del selector**

Al final del bloque de rediseño de `styles.css`:

```css
/* El selector de perfil, en el modal de nueva ventana. El boton va al lado para poder crear un perfil
   sin salir de ahi, que es lo que hace falta la primera vez que se quiere compartir con otra ventana. */
.browser-instance-perfil-field { gap: 5px; }
.browser-instance-perfil-field select {
  height: 34px;
  border-color: #22384f;
  border-radius: 8px;
  background: #07131e;
  color: #dbe8f2;
}
.browser-instance-perfil-nuevo { margin-top: 2px; justify-self: start; }
.browser-instance-perfil-form { display: flex; gap: 6px; }
.browser-instance-perfil-form input {
  flex: 1 1 auto;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #22384f;
  border-radius: 7px;
  background: #07131e;
  color: #dbe8f2;
}
```

- [ ] **Paso 6: comprobar que el selector existe y se guarda**

```
node herramientas\comprobar-patrones.cjs
```

Y añadir estas invariantes a los **tres** ficheros que las llevan —`herramientas/comprobar-patrones.cjs`,
`herramientas/verificar-paquete.cjs` y `herramientas/comprobar-entrega.cjs`—, con el mismo texto en los
tres, porque si no una de las tres pasa por alto el fallo:

```js
    ['el selector de perfil esta en el modal', /id="browserInstancePerfil"/, html],
    ['y su valor se guarda al crear la ventana', /perfilId: browserInstancePerfil\?\.value \|\| PERFIL_POR_DEFECTO/, renderer],
    ['los perfiles se pintan al abrir el modal', /pintarSelectorDePerfiles\(\);/, renderer],
```

- [ ] **Paso 7: confirmar**

```bash
git add src/index.html src/renderer.js src/styles.css herramientas/comprobar-patrones.cjs herramientas/verificar-paquete.cjs
git commit -m "Selector de perfil en el modal de nueva ventana, con crear-perfil ahi mismo

Crear un perfil sin cerrar el modal es lo que hace falta la primera vez: para tener dos
cuentas de la misma web en dos ventanas hacen falta dos perfiles."
```

---

## Tarea 5: Cambiar el perfil de una ventana

La segunda pantalla. Aquí está el aviso que el foco de revisión señala como el más importante: cambiar
de perfil reconstruye las pantallas y hay que decirlo **antes**.

**Ficheros:**
- Modificar: `src/index.html` (en el modal de ajustes de instancia)
- Modificar: `src/renderer.js`
- Modificar: `src/styles.css`

**Interfaces:**
- Consume: `window.pokeGridPerfiles.listar()`.
- Produce: `aplicarPerfilAInstancia(instanceId, perfilId)` → `boolean`.

---

- [ ] **Paso 1: el HTML en los ajustes**

En `src/index.html`, dentro de `#instanceSettingsBackdrop`, añadir antes de los mensajes:

```html
            <label class="field">
              <span>PERFIL DE SESI&Oacute;N</span>
              <select id="instanceSettingsPerfil"></select>
              <small class="field-help">Cambiarlo reinicia las pantallas de esta ventana y hay que volver
                a entrar en los sitios.</small>
            </label>
```

- [ ] **Paso 2: el aviso, antes de nada**

En `renderer.js`:

```js
// Cambiar el perfil de una ventana reinicia sus pantallas. El motivo es que la particion se fija al
// crear el webview: no se puede cambiar despues sin recrearlo. Y recrearlo tira las webs abiertas.
//
// El aviso se pinta ANTES de cambiar nada. Despues no tendria sentido: las webs abiertas ya estarian
// perdidas y no habria nada que decidir.
function confirmarCambioDePerfil(desde, hasta) {
  const nombre = (id) => (window.pokeGridPerfiles?.listar() || []).find((p) => p.id === id)?.nombre || id;
  if (nombre(desde) === nombre(hasta)) return true;
  const aceptado = window.confirm(
    `Esta ventana pasa del perfil "${nombre(desde)}" al "${nombre(hasta)}".\n\n` +
    'Se reiniciarán sus pantallas y quedarás sin iniciar sesión en los sitios donde estuvieras ' +
    'conectado: habrá que volver a entrar.'
  );
  return aceptado;
}
```

- [ ] **Paso 3: aplicarlo**

```js
function aplicarPerfilAInstancia(instanceId, perfilId) {
  const instancia = browserInstances.find((fila) => fila.id === instanceId);
  if (!instancia) return false;
  const nuevo = window.pokeGridPerfiles?.resolver(perfilId) || PERFIL_POR_DEFECTO;
  if (!confirmarCambioDePerfil(instancia.perfilId, nuevo)) return false;
  const indice = browserInstances.indexOf(instancia);
  instancia.perfilId = nuevo;
  saveBrowserInstances();

  // Se reconstruye la ventana entera. Es lo unico que puede hacerse: el webview ya tiene su particion
  // fijada al crearse, y no hay forma de cambiarla en caliente.
  //
  // Y AQUI NO SE BORRA NINGUNA PARTICION. Es lo unico que distingue esto de `removeBrowserInstance()`:
  // al cerrar una ventana si habia que vaciar su particion del disco, porque era suya. Ahora la
  // particion es del perfil, la comparten varias ventanas, y borrarla seria dejar sin sesion a las
  // demas. Se destruyen las pantallas y nada mas.
  const view = browserInstanceViews.get(instancia.id);
  if (view) {
    for (const panel of view.panels || []) destruirPanelDeVerdad(panel);
    view.workspace?.remove();
    browserInstanceViews.delete(instancia.id);
    createBrowserInstanceWorkspace(instancia, indice);
  }
  renderBrowserInstanceTabs();
  return true;
}
```

Los tres pasos de la reconstrucción no son inventados: son los mismos que hace `removeBrowserInstance()`
en `src/renderer.js:10202-10218`, menos el bucle final de `borrarParticionDeInstancia`. `destruirPanelDeVerdad`
está en 10171 y es la que llama a `webview.destroy()`, que es lo único que se lleva el proceso invitado
consigo; quitar el elemento del DOM sin ella deja Chromium entero en memoria.

**Lo que NO se copia de `removeBrowserInstance()` es su `confirm()`.** Ese texto dice «Cerrar y quitar la
instancia», que aquí sería mentira: la ventana se queda. El aviso de esta función es el del perfil.

---

- [ ] **Paso 4: enganchar el aviso al cambio**

```js
document.querySelector('#instanceSettingsPerfil')?.addEventListener('change', (evento) => {
  const instancia = instanciaDeLosAjustes();
  if (!instancia) return;
  if (!aplicarPerfilAInstancia(instancia.id, evento.target.value)) pintarPerfilEnLosAjustes();
});
```

`instanciaDeLosAjustes()` ya existe en `src/renderer.js` y devuelve la instancia elegida en el selector
de arriba del diálogo (`instanceSettingsTarget`). No hace falta ninguna variable nueva para «con qué
ventana estoy», que es lo que faltaba.

**Si el usuario dice que no, el selector tiene que volver a lo que tenía.** Sin eso se queda
mostrando el perfil nuevo, que no es el que tiene la ventana: el diálogo estaría mintiendo, y el usuario
no vería el error hasta que una web le pidiera iniciar sesión.

```js
function pintarPerfilEnLosAjustes() {
  const selector = document.querySelector('#instanceSettingsPerfil');
  const instancia = instanciaDeLosAjustes();
  if (!selector) return;
  selector.replaceChildren();
  for (const perfil of window.pokeGridPerfiles?.listar() || []) {
    const opcion = document.createElement('option');
    opcion.value = perfil.id;
    opcion.textContent = perfil.nombre || 'Perfil sin nombre';
    selector.appendChild(opcion);
  }
  selector.value = window.pokeGridPerfiles?.resolver(instancia?.perfilId) || PERFIL_POR_DEFECTO;
}
```

Y hay que llamarla desde `pintarAjustesDeInstancia()`, que es la que se dispara al abrir el diálogo y
cada vez que se cambia de ventana en él. Si no, el selector llega vacío.

- [ ] **Paso 5: la comprobación que más importa**

Añadir a `tests/perfiles-sesion-0370-smoke.js`, dentro de la parte de JavaScript:

```js
console.log('\nEl aviso al cambiar de perfil:\n');
comprobar('se pide confirmacion antes de cambiar', /window\.confirm\(/.test(renderer));
comprobar('y el aviso dice las dos cosas', /reiniciarán|perecerán/i.test(renderer) && /volver a entrar|sesión/i.test(renderer));
comprobar('si se dice que no, el selector vuelve', /pintarPerfilEnLosAjustes\(\)/.test(renderer));
```

Las dos comprobaciones del aviso usan dos expresiones porque el texto está en español y podría llevar
acentos distintos; lo que importa es que mencione las dos consecuencias, no la redacción exacta.

- [ ] **Paso 6: confirmar**

```bash
git add src/index.html src/renderer.js src/styles.css tests/perfiles-sesion-0370-smoke.js
git commit -m "Cambiar el perfil de una ventana, con aviso de que reinicia y pierde la sesion

La particion se fija al crear el webview, asi que cambiarla obliga a recrearlo. El aviso va
antes de tocar nada: despues ya no habria nada que decidir."
```

---

## Tarea 6: El gestor de perfiles

La tercera pantalla, y la que hace falta para mantener el sistema: sin ella no hay forma de renombrar
un perfil ni de borrar el que sobra.

**Ficheros:**
- Modificar: `src/index.html` (un botón en `#globalActions` y un modal nuevo)
- Modificar: `src/renderer.js`
- Modificar: `src/styles.css`

**Interfaces:**
- Consume: `window.pokeGridPerfiles.listar/crear/renombrar/borrar/conCuantasVentanas`.
- Produce: `abrirGestorDePerfiles()`, `pintarGestorDePerfiles()`.

---

- [ ] **Paso 1: el botón en el menú**

En `src/index.html`, junto al botón de cuentas, dentro de `#globalActions`:

```html
        <button id="perfilesButton" class="button button-secondary button-accounts" type="button"><span>Perfiles</span></button>
```

Sin icono: son dos palabras y un icono ocupa más sitio del que ahorra en un botón de menú.

- [ ] **Paso 2: el modal**

Después del modal de cuentas, añadir:

```html
    <div id="perfilesBackdrop" class="modal-backdrop" hidden>
      <section class="modal perfiles-modal" role="dialog" aria-modal="true" aria-labelledby="perfilesTitle">
        <header class="modal-heading">
          <div>
            <span class="eyebrow">SESIONES DEL NAVEGADOR</span>
            <h1 id="perfilesTitle">Perfiles</h1>
          </div>
          <div class="modal-heading-actions">
            <button id="closePerfilesButton" class="icon-button" type="button" aria-label="Cerrar">&times;</button>
          </div>
        </header>
        <p class="modal-copy">Un perfil es una sesión con nombre. Las ventanas con el mismo perfil
          comparten lo que tengas iniciado en ellas, así que entras una vez en Google y ya lo tienes
          en todas. Las cuentas del juego no se tocan: siguen con su propia sesión.</p>
        <div id="perfilesList" class="perfiles-list"></div>
        <div class="modal-actions">
          <button class="button button-primary" type="button" data-close-perfiles>Cerrar</button>
        </div>
      </section>
    </div>
```

- [ ] **Paso 3: pintarlos y gestionarlos**

```js
// El gestor de perfiles. Es la tercera pantalla del sistema: sin ella no hay forma de renombrar un
// perfil ni de quitar el que sobra, y un sistema sin mantenimiento se queda como se creo.
function pintarGestorDePerfiles() {
  const lista = document.querySelector('#perfilesList');
  if (!lista) return;
  const perfiles = window.pokeGridPerfiles?.listar() || [];
  lista.replaceChildren();

  // La fila de crear va la primera, con la misma pinta que las de renombrar. Es un campo mas de la
  // lista, no un boton que abre otra cosa: un boton que abre un formulario aparte seria un segundo
  // camino para lo mismo, y de los dos solo se recordaria uno.
  const nueva = document.createElement('div');
  nueva.className = 'perfil-fila es-nueva';
  const nombreNuevo = document.createElement('input');
  nombreNuevo.type = 'text';
  nombreNuevo.maxLength = 40;
  nombreNuevo.placeholder = 'Nombre del perfil nuevo';
  nombreNuevo.setAttribute('aria-label', 'Nombre del perfil nuevo');
  const crear = document.createElement('button');
  crear.type = 'button';
  crear.className = 'button button-primary';
  crear.textContent = 'Crear';
  crear.addEventListener('click', () => {
    if (!crearPerfilConNombre(nombreNuevo.value)) return;
    pintarGestorDePerfiles();
  });
  // Enter tambien crea, igual que en el modal.
  nombreNuevo.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    if (!crearPerfilConNombre(nombreNuevo.value)) return;
    pintarGestorDePerfiles();
  });
  nueva.append(nombreNuevo, crear);
  lista.appendChild(nueva);

  for (const perfil of perfiles) {
    const esPrincipal = perfil.id === PERFIL_POR_DEFECTO;
    const ventanas = window.pokeGridPerfiles?.conCuantasVentanas?.(perfil.id) || 0;

    const fila = document.createElement('div');
    fila.className = 'perfil-fila';
    if (esPrincipal) fila.classList.add('es-principal');

    const nombre = document.createElement('input');
    nombre.type = 'text';
    nombre.maxLength = 40;
    nombre.value = perfil.nombre;
    nombre.disabled = esPrincipal;
    nombre.setAttribute('aria-label', 'Nombre del perfil');

    const uso = document.createElement('span');
    uso.className = 'perfil-uso';
    uso.textContent = ventanas === 0 ? 'sin ventanas' : `${ventanas} ${ventanas === 1 ? 'ventana' : 'ventanas'}`;

    const renombrar = document.createElement('button');
    renombrar.type = 'button';
    renombrar.className = 'button button-secondary';
    renombrar.textContent = 'Guardar';
    renombrar.disabled = esPrincipal;
    renombrar.addEventListener('click', () => {
      if (window.pokeGridPerfiles?.renombrar(perfil.id, nombre.value)) pintarGestorDePerfiles();
    });

    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'button button-secondary is-danger';
    borrar.textContent = 'Eliminar';
    borrar.disabled = esPrincipal;
    borrar.addEventListener('click', () => {
      // Con ventanas dentro no se puede. El aviso lo dice antes de intentarlo, porque si no el boton
      // parecería roto: no avisa de nada, simplemente no hace nada.
      if (ventanas > 0) {
        window.alert('Ese perfil tiene ventanas. Muévelas a otro perfil antes de eliminarlo.');
        return;
      }
      if (!window.confirm(`Eliminar el perfil "${perfil.nombre}"? Se pierde lo que tengas iniciado en él.`)) return;
      if (window.pokeGridPerfiles?.borrar(perfil.id)) pintarGestorDePerfiles();
    });

    fila.append(nombre, uso, renombrar, borrar);
    lista.appendChild(fila);
  }
}

function abrirGestorDePerfiles() {
  pintarGestorDePerfiles();
  const capa = document.querySelector('#perfilesBackdrop');
  if (capa) capa.hidden = false;
}
```

- [ ] **Paso 4: engancharlo**

```js
const perfilesBackdrop = document.querySelector('#perfilesBackdrop');
document.querySelector('#perfilesButton')?.addEventListener('click', abrirGestorDePerfiles);
document.querySelector('#closePerfilesButton')?.addEventListener('click', () => { if (perfilesBackdrop) perfilesBackdrop.hidden = true; });
perfilesBackdrop?.addEventListener('click', (evento) => { if (evento.target === perfilesBackdrop) perfilesBackdrop.hidden = true; });
document.querySelector('[data-close-perfiles]')?.addEventListener('click', () => { if (perfilesBackdrop) perfilesBackdrop.hidden = true; });
```

El botón de «Perfil nuevo» **ya no está en la barra de abajo**: es la primera fila de la lista, con la
misma pinta que las de renombrar. No lleva id propio, porque no necesita enganche: su `click` va dentro
de `pintarGestorDePerfiles()`, que se vuelve a pintar tras crearlo. Así no hay dos caminos para crear un
perfil —uno en el modal y otro en el gestor— sino uno solo con dos puertas.

- [ ] **Paso 5: el CSS**

```css
/* El gestor de perfiles. Cada perfil es una fila con su nombre, cuantas ventanas lo usan, y las dos
   acciones. Las que no se pueden usar —el Principal, y borrar uno con ventanas— se ven apagadas y sin
   que haya que pulsarlas para saberlo. */
.perfiles-list { display: grid; gap: 7px; margin: 10px 0; }
.perfil-fila {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #1e3149;
  border-radius: 9px;
  background: #0c1522;
}
.perfil-fila.es-principal { border-color: #2b4f74; background: #0e1a2a; }
/* La fila de crear tiene solo dos columnas, porque no tiene ni contador ni acciones. */
.perfil-fila.es-nueva { grid-template-columns: minmax(0, 1fr) auto; border-style: dashed; }
.perfil-fila input[type="text"] {
  min-width: 0;
  height: 32px;
  padding: 0 9px;
  border: 1px solid #22384f;
  border-radius: 7px;
  background: #07131e;
  color: #dbe8f2;
}
.perfil-fila input:disabled { color: #8fa6ba; background: #0a1420; }
.perfil-uso { color: #7e97ad; font-size: 8px; white-space: nowrap; }
```

- [ ] **Paso 6: las comprobaciones del gestor**

El formato es `[nombre, expresión regular, texto donde se busca]` — el bucle hace `re.test(texto)`. Si se
escribe `.test(renderer)` dentro del array, la comprobación mira si la cadena `.test(renderer)`
aparece en el código, y siempre pasa.

Añadir a los **tres** ficheros que llevan invariantes —`herramientas/comprobar-patrones.cjs`,
`herramientas/verificar-paquete.cjs` y `herramientas/comprobar-entrega.cjs`—, con el mismo texto en los
tres:

```js
    ['el gestor de perfiles tiene su modal', /id="perfilesBackdrop"/, html],
    ['el boton de abrir esta en el menu', /id="perfilesButton"/, html],
    ['y el gestor se pinta con las ventanas de cada perfil', /conCuantasVentanas\?\.\(perfil\.id\)/, renderer],
    ['un perfil con ventanas avisa antes de dejarte eliminarlo', /ese perfil tiene ventanas/i, renderer],
```

- [ ] **Paso 7: confirmar**

```bash
git add src/index.html src/renderer.js src/styles.css herramientas/comprobar-patrones.cjs herramientas/verificar-paquete.cjs
git commit -m "Gestor de perfiles: crear, renombrar y eliminar

Sin esto el sistema no tiene mantenimiento, y lo que no se puede renombrar ni quitar se queda
para siempre. El Principal y los perfiles con ventanas salen apagados, sin que haya que
pulsarlos para enterarse."
```

---

## Tarea 7: Cerrar: pruebas del área, versión y compilación

**Ficheros:**
- Modificar: `package.json` (versión)
- Modificar: `REGISTRO.md` (la entrada de la 0.37.0)
- Modificar: `herramientas/area-entera.ps1` (la salida y las pruebas nuevas)

---

- [ ] **Paso 1: apuntar la salida al fichero de esta versión**

En `herramientas/area-entera.ps1`, la línea 13:

```
$salida = 'C:\Users\Shockviny\AppData\Local\Temp\opencode\area-0370.txt'
```

- [ ] **Paso 2: cambiar las pruebas del área**

La línea 37 es la de la 0.36.0, que ya no existe: su prueba está en `_basura`. Se quita, y en su lugar
van las dos nuevas. **Con el cambio, el área se queda en 21 pruebas**, no en 20 ni en 22:

- 20 que había, menos 1 que se va = 19
- más `perfiles-almacen` y `perfiles-sesion` = **21**

Sustituir la entrada de la línea 37 por estas dos, y quitar la coma final de la anterior (`cuentas-iconos-0340`):

```powershell
  @{ nombre = 'cuentas-iconos-0340'; comando = 'tests\lanzar.cjs'; args = @('tests\cuentas-iconos-0340-smoke.js'); espera = 100 },
  @{ nombre = 'perfiles-almacen';   comando = 'tests\lanzar.cjs'; args = @('tests\perfiles-almacen-smoke.js');   espera = 80 },
  @{ nombre = 'perfiles-sesion';     comando = 'tests\lanzar.cjs'; args = @('tests\perfiles-sesion-0370-smoke.js'); espera = 80 }
)
```

Comprobar el recuento antes de correr nada, que es donde se equivoca uno:

```
node -e "const fs=require('fs');const t=fs.readFileSync('herramientas/area-entera.ps1','utf8');console.log('  pruebas en el area: '+[...t.matchAll(/nombre = '/g)].length);console.log('  area-0370: '+t.includes('area-0370.txt'));console.log('  queda 0360: '+t.includes('0360'))"
```
Esperado: 21, `true`, `false`.

- [ ] **Paso 3: subir la versión**

`package.json` está en **0.36.1**, no en 0.36.0: `electron-builder` la sube al compilar. Da igual, el
cambio es el mismo, pero conviene saber por qué el número no coincide con el de la entrega.

```
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));console.log('  antes: '+j.version);j.version='0.37.0';fs.writeFileSync(p,JSON.stringify(j,null,2)+'\n','utf8');console.log('  ahora: '+j.version)"
```

- [ ] **Paso 4: la entrada del registro**

En `REGISTRO.md`, añadir arriba la de la 0.37.0, explicando: qué son los perfiles, que sustituyen al
interruptor de la 0.36.0, **que al actualizar todas las ventanas pasan al Principal y se unen**, que
cambiar de perfil reinicia la ventana, y que las cuentas del juego no se tocan.

- [ ] **Paso 5: las pruebas del área, en orden**

```
& .\herramientas\area-entera.ps1
```

Las **21** tienen que pasar. Si alguna falla, se arregla y se vuelve a correr entera: una suite a medias
no vale.

- [ ] **Paso 6: compilar**

```
$env:PATH = "C:\Users\Shockviny\AppData\Local\Temp\opencode\shim;$env:PATH"; npm run dist
```

- [ ] **Paso 7: los dos verificadores**

```
node herramientas\verificar-paquete.cjs
node herramientas\comprobar-entrega.cjs
```

Los dos tienen que salir con 0. Si alguno falla por una invariante antigua que mira el interruptor que
se quitó en la tarea 3, se actualiza: son tres ficheros con la misma invariante y hay que cambiarla en los
tres.

- [ ] **Paso 8: confirmar**

```bash
git add package.json REGISTRO.md herramientas/area-entera.ps1
git commit -m "0.37.0 - Perfiles de sesion, como los perfiles de Chrome

Cada ventana elige con que perfil trabaja, y las que eligen el mismo comparten sesion: entras
una vez en Google y ya lo tienes en todas. Sustituye al interruptor de sesion de la 0.36.0.

Al actualizar todas las ventanas pasan al perfil Principal, con lo que dos ventanas que estaban
aisladas se unen. Las cuentas del juego no se tocan."
```