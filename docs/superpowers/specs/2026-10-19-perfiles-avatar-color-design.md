# Perfiles con avatar y color — Especificación

**Fecha:** 2026-10-19
**Versión objetivo:** 0.38.0
**Sigue a:** los perfiles de sesión de la 0.37.0, que ya existen y funcionan

---

## 1. Qué se pide

El gestor de perfiles es hoy una lista de filas con un campo de texto. Pasa a ser lo de Netflix o
Disney: **círculos grandes con avatar**, seleccionables, con el nombre debajo, el botón «+» al final,
y cada uno personalizable con **un Pokémon de avatar** y **un color de fondo**.

## 2. Decisiones ya tomadas, con el usuario

| Decisión | Respuesta |
|---|---|
| Forma | **Círculos**, como Disney. Netflix usa cuadros; el círculo funciona mejor aquí porque el avatar ya es redondo y no hay que recortarlo |
| Avatares | **Pokémon de PokéAPI** |
| Cuándo se descargan | **Solo al elegir el avatar.** Nada se pide al arrancar el launcher |
| Color | Paleta ajustable, **o sin fondo** |

**Lo que no se ha decidido y se decide aquí:** el color se queda **en el icono del perfil**. La barra de
pestañas no lo toma. Es lo más prudente: nadie lo pidió para las pestañas y cambiar la barra afecta a
todo lo demás.

## 3. Lo que ya existe y se reutiliza

Esto **no** es una función nueva desde cero, y esa es la diferencia entre que sea un día de trabajo y
que sean tres:

| Pieza | Dónde | Qué hace |
|---|---|---|
| `resolvePokeApiSpecies(slug)` | `main.js:254` | Nombre de Pokémon → id, con caché LRU |
| `resolvePokemonSpecies` | `preload.js:74` | El puente de esa de arriba |
| `loadImageDataUrl` | `preload.js` | Descarga un sprite y lo devuelve como `data:` |
| `loadPokeApiSpriteData(id)` | `renderer.js:4381` | Sprite de un id, con su caché |
| `LAUNCHER_ICON_PATHS` | `renderer.js` | El catálogo de iconos |

**Y hay una razón por la que tiene que ser por ahí y no en el renderer:** la CSP del launcher es
`img-src 'self' data: https://poke.idleworld.online https://pokexguides.com`. PokéAPI sirve sus sprites
desde `raw.githubusercontent.com`, que **no está en la lista**. Un `<img src="…githubusercontent…">` no
se pintaría. El proceso principal no tiene CSP, valida el origen y devuelve `data:`, que sí está.

## 4. El modelo de datos

Cada perfil gana dos campos. Los dos opcionales y los dos con valor por defecto:

```js
{ id: 'principal', nombre: 'Principal', creado: 0, avatar: '', color: '' }
```

- `avatar`: el **nombre** de la especie en minúsculas (`pikachu`), no una URL. Guardar el nombre y no la
  URL es a propósito: la URL lleva un número que PokéAPI puede cambiar, y un sprite guardado por URL se
  rompe sin que nadie entienda por qué. Con el nombre se resuelve cuando se pinta.
- `color`: `#rrggbb` o cadena vacía, que es **sin fondo**.

El perfil `Principal` puede tener avatar y color: es personalizable como cualquier otro. Lo que no puede
es renombrarse ni borrarse, y eso no cambia.

**Quien tenga un perfil ya creado y no haya tocado estos campos sigue funcionando igual.** `leer()`
rellena lo que falte, como ya hace con el resto.

## 5. La lista de Pokémon

**Curada y en el código, no descargada.** Unas 36 especies, las que cualquiera reconocería.

La razón: la lista es un dato, no una consulta. Si se pide a PokéAPI al abrir el diálogo, hace falta red
para *enseñar un menú*, y sin red el gestor se queda vacío justo cuando se quiere crear un perfil. Los
**sprites sí se descargan al elegir**, que es lo que pidió el usuario.

Si PokéAPI no responde al elegir, el círculo se queda con la inicial del nombre. No es un fallo: es un
perfil sin foto, y se puede volver a elegir otro.

## 6. La pantalla

```
   ( P )      ( Q )      ( C )      ( + )
  Pikachu    Quaxly   Charizard   Nuevo
   3 ventanas     Principal   0 ventanas
```

- **Círculo** de 76 px con el sprite dentro, el color elegido de fondo y un anillo cuando es el que
  estás editando. Sin avatar: la inicial, con el mismo color de fondo.
- **Nombre** debajo, truncado a lo que quepa.
- ** debajo**: cuántas ventanas usan ese perfil. Es el dato que hace falta para decidir si se puede borrar.
- **«+»** al final, siempre visible, con el mismo círculo. Es el camino de crear, y no se esconde nunca
  detrás de un botón de otra parte: en Netflix está siempre ahí porque es lo que se usa más.
- Pulsar un círculo lo selecciona y abre sus controles **debajo**: nombre, avatar y color.

## 7. Reglas

| Regla | Por qué |
|---|---|
| El `Principal` no se borra ni se renombra | Igual que en la 0.37.0 |
| No se puede borrar un perfil con ventanas | Sería dejarlas sin sesión |
| La inicial sustituye al sprite que no llega | Un perfil sin foto sigue siendo un perfil |
| Un Pokémon sin sprite no es un error | Se marca el círculo y se puede probar otro |

## 8. Pruebas

- `avatar` y `color` sobreviven a guardar y releer, y se rellenan vacíos si no vienen.
- El `Principal` acepta avatar y color.
- Un perfil con ventanas no se borra.
- La lista de Pokémon no está vacía y no tiene nombres repetidos ni acentos raros.
- El círculo del «+» existe siempre, incluso sin perfiles más que el `Principal`.
- Un perfil sin avatar enseña su inicial.
- El color se guarda como se elige y vuelve igual.

## 9. Lo que NO entra

- **Que la barra de pestañas tome el color del perfil.** No se ha pedido y afecta a toda la barra.
- **Avatares propios.** Subir una foto sería otra historia, con ficheros, tamaños y borrado.
- **Reordenar los perfiles.** No se ha pedido y son contados.
- **Un avatar por cuenta del juego.** Los perfiles son de las ventanas del navegador, no de las cuentas.

## 10. Riesgos

| Riesgo | Cómo se cubre |
|---|---|
| La CSP bloquea los sprites | Se comprobó: `img-src` no incluye `raw.githubusercontent.com`. Por eso van por el proceso principal y vuelven como `data:` |
| PokéAPI no responde | La inicial; el perfil sigue siendo utilizable |
| Un sprite enorme | El proceso principal ya rechaza lo que pasa de 2 MB |
| Que el nombre guardado no resuelva | Se comprueba antes de pintar y se cae a la inicial |
