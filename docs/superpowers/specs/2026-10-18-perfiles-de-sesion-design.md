# Perfiles de sesión — Especificación

**Fecha:** 2026-10-18
**Versión objetivo:** 0.37.0
**Sustituye a:** el interruptor `sesion: 'propia' | 'compartida'` de la 0.36.0

---

## 1. Qué hay que conseguir

Hoy cada ventana de navegador tiene su propia sesión. Eso permite tener dos cuentas distintas de la
misma web en dos ventanas a la vez, pero obliga a escribir el correo una vez por ventana.

Se quiere lo que hace Chrome: entrar una vez en Google y que Gmail esté disponible en todas las ventanas.

Y no solo eso: poder cambiar. Como los perfiles de Chrome, se quieren **varios perfiles con nombre**, y
elegir con cuál trabaja cada ventana. Así se recupera lo de las dos cuentas de la misma web, pero por
perfil y no por ventana.

## 2. Decisiones tomadas, y por qué

### El perfil se asigna a la ventana, no a la persona

Chrome tiene un perfil por persona y las ventanas que abres las usas tú. Aquí hay varias ventanas y
puede que las use gente distinta, así que la unidad correcta es la ventana.

**Consecuencia:** cambiar de perfil es cambiar de ventana. Todas las pantallas de esa ventana usan el
mismo perfil.

### Todas las ventanas existentes pasan al perfil «Principal»

Decisión del usuario, consciente de lo que cuesta: **al actualizar, dos ventanas que estaban aisladas
se unen**. Quien tenga dos ventanas de la misma web con cuentas distintas pierde la separación y tiene
que crear un segundo perfil.

Se prefiere esto a «cada ventana nace con su perfil propio» porque hace lo pedido sin pasos de más, y
porque los perfiles se pueden crear en cualquier momento.

### Las cuentas del juego no se tocan

Siguen con `persist:pokegrid-<cuenta>`, una por cuenta. Es la función principal del launcher: cuatro
cuentas de Poke Idle World abiertas a la vez, cada una con su sesión. Nada de esto las afecta.

## 3. Modelo de datos

### Los perfiles

Almacenamiento nuevo, `pokegrid:session-profiles:v1`:

```js
[
  { id: 'principal', nombre: 'Principal', creado: 1758000000000 },
  { id: 'trabajo',  nombre: 'Trabajo',  creado: 1758000060000 }
]
```

El perfil `principal` **existe siempre** y no se puede borrar. Es el que usan las ventanas sin perfil
asignado, y el que reciben todas al migrar.

Los identificadores no se renumeran nunca: se borra el perfil `trabajo` y el `principal` sigue siendo
`principal`. Los ids salen de `makeBrowserInstanceId()`, que ya existe y garantiza que no colisionan.

### Las ventanas

Cada instancia de navegador gana `perfilId`. Se guarda **dentro de la instancia**, no en una lista aparte:
así el perfil viaja con la ventana y no hay dos sitios que puedan desincronizarse. Es el mismo criterio
que ya se sigue con `modo`, `buscador` y `apertura`, que se rellenan al leer y no se reescriben.

Se rellena en `normalizarOpcionesDeInstancia`, **junto a los otros valores por defecto**. Lo que no
venga —una ventana creada antes— cae en `principal`.

**Y cae en `principal` también cuando el `perfilId` guardado no existe**, por ejemplo si el perfil se
borró a mano editando el almacenamiento. Una ventana con un perfil inexistente se quedaría sin sesión y
no entraría en nada; caer en `principal` la deja siempre en algo que existe.

### La partición

```
perfil     ->  persist:pokegrid-perfil-<id>
```

El prefijo `perfil-` **no** empieza por `instance-`, que es lo que filtra el borrado de particiones al
cerrar una ventana. Es la misma protección que tenía la sesión compartida de 0.36.0, y por el mismo
motivo: si compartiese prefijo, cerrar una ventana le borraría las cookies a todas las de su perfil.

Una consecuencia de esto, que conviene tener presente: **cerrar una ventana ya no limpia su partición**,
porque no es suya sino de su perfil. Eso es lo correcto para compartir, y significa que las particiones
de perfil se limpian a mano desde el gestor de perfiles, si alguna vez hace falta.

## 4. Qué se quita

El campo `sesion`, sus constantes (`SESIONES_DE_INSTANCIA`, `SESION_POR_DEFECTO`,
`PARTICION_COMPARTIDA`), el interruptor del modal, su CSS y la función `explicarSesionCompartida`.

**No se quedan dos mecanismos** para lo mismo. Un perfil ya cubre «compartir con los demás»: quien
quiera compartir marca las ventanas con el mismo perfil.

## 5. Dónde se elige el perfil

| Sitio | Qué hay |
|---|---|
| Modal de nueva ventana | Selector de perfil, con «crear uno nuevo» ahí mismo |
| Ajustes de la instancia | Cambiar el perfil de esa ventana, con aviso |
| Menú del launcher | **Gestor de perfiles**: crear, renombrar y borrar |

### El aviso al cambiar de perfil

La partición se fija al crear la pantalla, así que cambiarla **reconstruye todas las pantallas de esa
ventana**. Se pierden las webs abiertas.

El aviso tiene que decir las dos cosas, no solo la mala:

1. Que se pierden las webs abiertas de esa ventana.
2. Que se cambia de sesión: hay que volver a entrar en los sitios.

## 6. Reglas de los perfiles

| Regla | Por qué |
|---|---|
| El perfil `Principal` no se borra | Todas las ventanas sin perfil asignado caen en él; sin él, se quedan sin sesión |
| No se puede renombrar el `Principal` | Su nombre es el que aparece en los selectores; mantenerlo evita_confusión |
| No se puede borrar un perfil con ventanas | Sería dejarlas sin sesión. Hay que moverlas antes |
| Los nombres se repiten por el usuario, no se comprueban | Dos perfiles con el mismo nombre se distinguen por su posición en la lista. Complicarlo no aporta nada |

## 7. Cuándo se reescriben las particiones viejas

Al migrar, cada ventana pasa a usar `persist:pokegrid-perfil-principal` en vez de
`persist:pokegrid-instance-<id>-<n>`. La partición vieja se queda en disco, huérfana.

**No se borra automáticamente.** Borrar datos de sesión sin que nadie lo pida no se hace, aunque ocupen
unos pocos megabytes. Se encolan para el borrado diferido que ya existía, que las borra al siguiente
arranque **solo si están vacías de verdad**. Es la misma comprobación que hace
`vaciarPendientesDeParticiones()`, y evita que se borre algo que todavía está en uso.

Los que no se limpian nunca son los directorios `pokegrid-perfil-*`: las particiones de perfil no se
borran al cerrar una ventana porque no son suyas, solo se limpian a mano desde el gestor de perfiles.

## 8. Qué ve el usuario la primera vez

Nada de esto se pregunta: **no hay aviso al abrir el launcher**. Las ventanas existentes ya tienen
perfil —el `principal`— y siguen funcionando.

La razón para no poner un aviso en pantalla es que no hay ninguna decisión que tomar: no se está
eligiendo nada, se está aplicando lo que ya se pidió. Un «¿quieres compartir tus sesiones?» con un
solo botón posible es una pregunta sin respuesta.

## 9. Pruebas

### Comportamiento (`tests/perfiles-sesion-0370-smoke.js`)

- Dos ventanas con el mismo perfil reciben la misma partición.
- Dos ventanas con perfiles distintos reciben particiones distintas.
- Una ventana sin `perfilId` cae en `Principal`.
- Una ventana con un perfil que no existe cae en `Principal` — un perfil borrado a mano no deja
  ventanas sin sesión.
- **El perfil `Principal` no entra en el filtro de borrado.** Este es el que más importa: si se colara,
  cerrar una ventana le borraría las cookies a todas.
- Una partición de perfil **no** entra en la lista de borrado de las ventanas: no es de ninguna.
- El perfil `Principal` no se puede borrar.
- No se puede borrar un perfil que tiene ventanas.
- El campo `sesion` ya no existe en ninguna parte.

### Invariantes

En `comprobar-patrones.cjs` y `verificar-paquete.cjs`, lo mismo que se lleva en las versiones
anteriores, contra el **artefacto** y no contra el árbol.

## 10. Riesgos

| Riesgo | Cómo se cubre |
|---|---|
| Se pierde una sesión al migrar | Es lo que se pidió. Se dice en el registro de la versión |
| Dos ventanas que estaban aisladas se unen | Igual. Se dice en el registro |
| El perfil se borra con ventanas dentro | La comprobación lo impide, y se prueba |
| El perfil compartido entra en el borrado | El nombre no lleva el prefijo `instance-`, y hay prueba de ello |
| Quedan carpetas huérfanas en disco | Aceptado. Se encolan para el borrado diferido, que las borra al arrancar si están vacías |

## 11. Lo que NO entra

- **Perfiles por persona**, como Chrome. El perfil se asigna a la ventana, ya está decidido.
- **Cuentas de Google dentro del launcher**, con cambio rápido entre varias. Eso es una función de los
  sitios de Google, no del launcher, y no se puede hacer desde aquí.
- **Borrado de las particiones viejas.** Decidido no hacerlo.