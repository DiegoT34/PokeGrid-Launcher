# 0.39.0 — avatares que se ven, el perfil en el menú y el actualizador partido en dos

Fecha: 2026-10-19. Antes: 0.38.0.

Diez peticiones en un mensaje. Este documento deja escrito **por qué** se resolvió cada una como se
resolvió, y sobre todo por qué no se hizo lo más obvio.

---

## 1. Los avatares no se previsualizaban

**Lo pedido:** que los avatares se vean en los cuadros seleccionables.

**Por qué no se veían.** `pintarRejillaDeAvatares` pintaba un sprite solo si `spritesDePerfil` ya lo
tenía, y `spritesDePerfil` se llenaba al **pulsar** una celda. La primera vez —que es la única que
importa— no había nada en la caché, así que salían treinta y seis cuadros vacíos con un nombre debajo.

La decisión de 0.38.0 («nada hasta que se elige uno») era correcta para lo que se pidió entonces, que
era *no descargar 36 imágenes sin que nadie las mire*. Pero es incompatible con *enseñar fotos para
elegir una*. Un desplegable tiene que enseñar lo que ofrece.

**Lo que se hizo.** Al abrir la rejilla se piden los sprites que falten y cada imagen que llega se
pinta en su celda. Sigue sin bajarse nada al arrancar el launcher.

- **Tandas de ocho**, no uno a uno. Son dos peticiones por especie —el id y el sprite— y van en cadena;
  en serie son varios minutos. Ocho a la vez es lo que se mantiene por debajo del «demasiadas
  peticiones a la vez» de un navegador. Más de ahí y PokéAPI contesta 429 y la rejilla se queda con la
  mitad sin saber por qué.
- **Celda antes que imagen.** La celda se crea con su forma y su sitio; el sprite se la pone cuando
  llega. Si la celda se creara al llegar la imagen, habría que repintar la rejilla entera por cada una.
- **Una especie sin sprite deja una inicial apagada**, no un hueco. Un hueco en blanco en una rejilla
  de ciento treinta cosas se lee como «esto está roto»; una silueta apagada se lee como «esta foto no
  carga», que es lo que ha pasado. Sin red, o con la especie mal escrita, las dos cosas sirven.
- **Si la celda ya no está, no se hace nada.** El usuario puede cerrar el gestor mientras descarga. Es
  lo normal, no es un fallo, y por eso se busca por atributo y se sale.

**Lo que cambia del requisito original.** Los 36 Pokémon pasan a **132**. Los 36 de antes siguen
primeros y en su orden; detrás van los *beginnings* de cada generación —para que de un vistazo se vea
de qué generación es cada uno— y los que la gente pide por el nombre.

---

## 2. El icono de «Perfiles» salía vacío

**Lo que pasó.** En 0.38.0 el botón llevaba `data-icon="profile"` y había un bucle que rellenaba los
`[data-icon]`. El bucle estaba dentro de `aplicarIconosBarraFarmeo()`, que **solo se llama al abrir el
modal de farmeo**. En el arranque no se ejecutaba, así que la caja se quedaba sin dibujo.

Encima, el botón no definía `--toolbar-accent`, y `.top-action-icon` pinta con
`color: var(--toolbar-accent)`: una variable que no existe deja el `currentColor` del SVG sin resolver.

**Lo importante: ya había pasado.** El engranaje de Configuraciones salió vacío exactamente por lo
mismo, y se arregló con una línea. La prueba que se escribió aquel día miraba
`#instanceSettingsButton` y **solo** ese botón. El fallo se repitió en otro botón sin que nada lo
notara, porque la única comprobación miraba otro sitio.

**Lo que se hizo.**

- El botón entra en `ICONOS_MENU`, que sí corre al arrancar. **No** en un bucle nuevo.
- Se quita el bucle de `[data-icon]`. Con dos caminos para pintar los iconos del menú, el que falla no
  avisa de nada — una imagen que no carga no da error, solo se ve que no está.
- `--toolbar-accent` para el botón, que es lo que hace que el SVG se pinte.
- **La prueba mira todos los botones**, no uno. Cada uno tiene que cumplir tres cosas: tener un dibujo,
  tener color de acento resuelto, y medir lo mismo que los demás. La última es la que encuentra el icono
  de Notificaciones.

---

## 3. La campana encima del título

**El síntoma.** Se leía «campana NOTIFICACIONES» y las tres primeras letras del subtítulo quedaban
tapadas.

**La causa, que estaba a mil líneas de distancia.** La campana es un `::before` con
`position: absolute; left: 10px`. La cabecera **reservaba 61 px de relleno a la izquierda** para que no
se montara encima. El bloque de rediseño, mucho más abajo, reescribió la cabecera con
`padding: 13px 15px 12px` — sin el hueco de la izquierda — y la campana se quedó encima. Dos reglas
que nadie ve a la vez.

**Lo que se hizo.** `position: static` sobre un `display: flex` convierte el `::before` en un elemento
más de la fila, y un elemento más de la fila **no se monta sobre nada**: por estrecho que sea el panel,
el hueco lo hace ella sola.

De paso, la campana pasa a ser un SVG con `mask` en vez del emoji 🔔. El launcher decidió en la 0.35.0
que las campanas fueran SVG y esta se quedó fuera; un emoji a 17 px dentro de un círculo de 31 sale más
grande de lo que cabe y con el color del sistema.

---

## 4. El icono de Notificaciones era más grande

**Por qué.** `#notificationButton` era el único botón cuyo `<svg>` era **a la vez la caja y el dibujo**.
Los demás tienen un `<span class="top-action-icon">` de 22 px con un SVG de 13 px dentro; ese tenía el
SVG de 22 px, que se pintaba con `.top-action-icon { width: 22px }`.

Aquí no hay forma de deducirlo leyendo el CSS: hay tres reglas de campana a distances distintas y la
ganadora depende de la especificidad. Se resolvió **midiendo**, y para eso se escribió
`herramientas/mirar-pantallas.cjs`, que además de capturar imprime el tamaño de cada icono. Los once
ahora son 13×13.

---

## 5. La «X» de las pestañas

**Lo pedido:** que esté cerca del lado derecho, no pegada al final del nombre.

**La tensión.** Las pestañas se ajustan a su nombre —`flex: 0 1 auto`—, así que no hay «lado derecho»:
el borde derecho *es* el final del nombre. Forzar un ancho mínimo rompería lo que se pidió antes.

**Lo que se hizo.** No un ancho mínimo, sino **separación**: 10 px de aire (eran 2) y un cuadro de 21 px
con fondo apagado que se enciende al pasar por encima. Un cuadrado con fondo se lee como botón aunque no
tenga borde; un asterisco pegado al texto no. La pestaña sigue midiendo lo que mide su nombre.

---

## 6. El perfil en la cabecera del menú

**Lo pedido:** el icono redondo del perfil en el panel de botones, y quitar «MENÚ PRINCIPAL» por el
nombre del perfil.

**Por qué no es un adorno.** «MENÚ PRINCIPAL» es el nombre de la ventana del sistema, que ya está en la
barra de tareas de Windows y en el título de la ventana. Lo que de verdad hace falta es saber **en qué
perfil se está**: con ventanas de perfil, dos sesiones pueden estar dentro a la vez, y el color y el
avatar son lo único que las distingue.

**De qué perfil.** El de la **pestaña activa**, no el último que se tocó. Se lee de
`activeBrowserInstanceId`.

**Dónde se repinta.** En `updateBrowserInstanceSelection()`, no en el manejador de clic, porque por esa
función pasa toda forma de cambiar de pestaña: el atajo, el botón, la restauración del arranque y el
cambio a pantalla completa. Es el mismo argumento que ya se usó para `aplicarDescanso()`.

**TDZ.** El primer intento la llamaba junto a `aplicarIconosMenu()`, «que también es arranque». Eso
reventaba: `pintarPerfilEnLaCabecera` lee `spritesDePerfil`, un `const` declarado mil líneas más abajo.
Zona muerta temporal, y el error que sale no menciona el perfil.

---

## 7. El actualizador: dos botones

**Lo pedido:** fuera del panel de botones, dentro de Configuraciones, con un botón de comprobar, si hay
actualización, qué versión es, y un botón de descargar.

**Lo que no se hizo, y por qué.** No se metió todo en un botón con más pasos. Se partió en dos:

- **Buscar** solo mira. No instala, no pregunta por instalar, no puede cerrar el launcher.
- **Descargar** sale apagado hasta que se ha confirmado que hay algo.

Un solo botón no resuelve el problema: para saber si hay actualización habría que pulsarlo, y pulsar
sería descargar 60 MB. El fallo de fondo era ese, no la falta de un botón.

**El texto con color.** Gris para «no comprobado», verde para «estás al día», ámbar para «hay algo». Es
la única parte del diálogo que responde a una pregunta, y la respuesta tiene que verse sin leerla.

**El aviso sigue igual.** El sondeo automático, el aviso del panel de notificaciones y la insignia no
se tocan. La insignia **se mudó** al botón de Configuraciones, que es donde vive lo de las
actualizaciones.

**El mensaje de progreso.** El progreso va al texto, no a un botón girando: setenta megas son cinco
minutos de pantalla quieta, y una fila que no se mueve parece colgada.

---

## 8. La descarga va a la carpeta de al lado del launcher

**Lo pedido:** que se guarde en el directorio exterior donde está la carpeta del launcher, en vez de
Descargas.

Con el launcher en `D:\Juegos\PokeGrid-Launcher\`, el ZIP aparece en `D:\Juegos\`. El portable nuevo se
despliega ahí también, que es lo coherente con lo pedido y además deja la versión nueva en el mismo
disco que la anterior.

**Los tres casos en los que no se cumple**, que son los que hacen que esto no sea cambiar una línea:

- **Sin empaquetar.** El ejecutable está dentro de `node_modules\electron\dist`, y ahí dentro no se va
  a dejar un ZIP de 60 MB. Sin empaquetar se sigue usando Descargas.
- **La carpeta de al lado no existe.**
- **La carpeta de al lado no se puede escribir.**

En los tres se cae en Descargas, que es lo de antes. Un fallo al elegir carpeta tiene que acabar
**descargando**, no rompiendo el launcher.

El mismo valor `downloadsDirectory` va también al instalador de PowerShell, así que el cambio afecta a
las dos cosas: dónde se guarda el ZIP y dónde se despliega la versión nueva. El mensaje de error del
instalador («debe instalarse en la carpeta de Descargas») se quedó viejo y se corrigió.

---

## 9. En el modal de crear instancia ya no se crean perfiles

**Lo pedido:** quitarlo de ahí.

**Por qué, más allá de la razón de gusto.** El desplegable llevaba un botón «Perfil nuevo». Ahí se está
eligiendo **con qué perfil se abre una ventana**; crear un perfil es decidir **cómo se llama una sesión
que tendrá las suyas**. Son dos decisiones distintas, y mezclarlas en un desplegable además producía un
fallo concreto: se acababa creando un perfil en blanco cada vez que se buscaba uno que ya existía.

**Lo que se cambia en su sitio.** El desplegable ahora enseña el **círculo del perfil elegido** al lado.
Un desplegable con texto pelado obliga a recordar de memoria cómo se llama cada perfil, y como los
nombres son libres, «Amazon» y «Amazon 2» no se distinguen de otra manera.

El círculo es el mismo que en el gestor, para que el perfil se parezca a como se ve ahí.

---

## 10. El gestor de perfiles

Un rótulo encima de la fila —«TUS PERFILES»—, círculos con más presencia, y el editor dice **de quién
era**. Antes el editor salía del nada debajo de la lista y con tres perfiles no se sabía si lo que se
estaba cambiando era el que estaba marcado.

**Lo que no se cambió.** Se entra con el editor cerrado. Abrirlo con el último perfil editado haría que
apareciera seleccionado algo que en ese momento no se ha elegido, y el botón «+» —que es lo que más se
usa— quedaría en segundo plano.

---

## Lo que se mide

`herramientas/mirar-pantallas.cjs`, nueva en esta versión. Levanta el launcher de verdad, abre el menú,
el panel de notificaciones, el gestor y el modal, y guarda un PNG de cada uno. Además **mide** los once
iconos de la barra e imprime nombre, tipo de elemento, tamaño y color.

Existe porque en esta entrega hubo que diagnosticar tres fallos que **no se deducen leyendo el CSS**:

- el icono de Perfiles, que salía vacío — y donde la culprits era *cuándo* se ejecuta el bucle, no qué
  pone;
- el icono de Notificaciones, que era más grande — y donde había tres reglas de campana y ganaba la de
  mayor especificidad;
- la campana sobre el título, cuya causa estaba a mil líneas de la regla que la rompía.

Una captura enseña que algo se ve mal. No dice cuál, ni por cuánto, ni por qué.