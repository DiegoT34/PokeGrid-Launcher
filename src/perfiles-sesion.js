// Los perfiles de sesion.
//
// Un perfil es una sesion con nombre: sus cookies, sus contrasenas y su estado. Hay varios, se les
// pone nombre, y cada ventana del launcher dice con cual trabaja. Es lo que hace Chrome con sus
// perfiles, y es lo que hace falta aqui: entrar una vez en Google y tenerlo en las demas ventanas.
//
// Va en su propio fichero y no dentro de `renderer.js` por dos razones. La primera es que
// `renderer.js` tiene unas doce mil lineas y esto es una unidad sola: guardar y manipular perfiles.
// La segunda es que asi se puede probar entero, sin levantar una ventana con doce webviews.
//
// El `Principal` existe siempre y no se puede borrar ni renombrar. Agarra toda ventana sin perfil
// asignado, y una ventana sin perfil asignado se queda sin sesion: ni entra en Google ni en nada.
//
// POR QUE NO ESTA CONGELADO
//
// Porque `conCuantasVentanas` se rellena DESPUES, desde `renderer.js`, que es quien sabe de
// ventanas. Congelarlo haria que esa asignacion fallara en silencio y `borrar` dejaria de bloquearse
// para siempre. Un `Object.freeze` aqui protege de un error improbable a cambio de uno seguro.
(function crearAlmacenDePerfiles() {
  const PERFILES_KEY = 'pokegrid:session-profiles:v1';
  const PERFIL_POR_DEFECTO = 'principal';

  const perfilPrincipal = Object.freeze({ id: PERFIL_POR_DEFECTO, nombre: 'Principal', creado: 0 });

  // Lo que venga de `localStorage` pasa por aqui: una lista editada a mano, o de una version vieja,
  // no puede dejar al launcher sin el Principal ni con dos perfiles que se llamen igual.
  function leer() {
    try {
      const filas = JSON.parse(localStorage.getItem(PERFILES_KEY) || '[]');
      if (!Array.isArray(filas)) return [perfilPrincipal];
      const vistos = new Set([PERFIL_POR_DEFECTO]);
      const limpios = filas.filter((fila) => {
        const id = String((fila && fila.id) || '');
        if (!id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
      });
      return [perfilPrincipal, ...limpios.map((fila) => ({
        id: String(fila.id),
        nombre: String(fila.nombre || '').slice(0, 40),
        creado: Number(fila.creado) || 0
      }))];
    } catch {
      return [perfilPrincipal];
    }
  }

  // El Principal no llega aqui nunca: se crea solo. Guardarlo en el almacen permitiria suplantarlo
  // desde fuera, y entonces el perfil que se crearia al arrancar no seria el de verdad.
  function escribir(lista) {
    try {
      localStorage.setItem(PERFILES_KEY, JSON.stringify(
        lista.filter((perfil) => perfil.id !== PERFIL_POR_DEFECTO)
      ));
      return true;
    } catch {
      return false;
    }
  }

  // El id sale de un UUID, no de un contador. Un contador se reutiliza: se borra un perfil, se crea
  // otro, y el nuevo hereda la sesion del que se borro. Con UUID no hay forma de que eso pase.
  function nuevoId() {
    const token = globalThis.crypto?.randomUUID?.();
    return `perfil-${String(token || `${Date.now()}-${Math.random()}`).toLowerCase()
      .replace(/[^a-z0-9-]/g, '').slice(0, 40)}`;
  }

  window.pokeGridPerfiles = {
    listar() {
      return leer();
    },

    existe(id) {
      const buscado = String(id || '');
      return !!buscado && leer().some((perfil) => perfil.id === buscado);
    },

    // Un id guardado que ya no existe cae en el Principal. Editar el almacenamiento a mano, o que se
    // borrara un perfil por la via que sea, dejaria esa ventana apuntando a algo inexistente: se
    // quedaria sin sesion y no entraria en nada. Caer en el Principal la deja siempre en algo real.
    resolver(id) {
      const buscado = String(id || '');
      return this.existe(buscado) ? buscado : PERFIL_POR_DEFECTO;
    },

    // Un nombre en blanco o repetido se acepta. No se comprueba: dos perfiles con el mismo nombre se
    // distinguen por su posicion en la lista, y poner un nombre inventado seria mentir sobre lo que
    // el usuario escribio. El selector los enseña como "Perfil sin nombre" cuando no lo tienen.
    crear(nombre) {
      const perfil = {
        id: nuevoId(),
        nombre: String(nombre || '').trim().slice(0, 40),
        creado: Date.now()
      };
      escribir([...leer(), perfil]);
      return perfil;
    },

    renombrar(id, nombre) {
      const buscado = String(id || '');
      // El Principal no se renombra: su nombre es el que sale en todos los selectores, y cambiarlo
      // haria que el mismo perfil se llamara de dos maneras segun donde se mire.
      if (!buscado || buscado === PERFIL_POR_DEFECTO) return false;
      const lista = leer();
      if (!lista.some((perfil) => perfil.id === buscado)) return false;
      escribir(lista.map((perfil) => (
        perfil.id === buscado
          ? { ...perfil, nombre: String(nombre || '').trim().slice(0, 40) }
          : perfil
      )));
      return true;
    },

    borrar(id) {
      const buscado = String(id || '');
      if (!buscado || buscado === PERFIL_POR_DEFECTO) return false;
      const lista = leer();
      if (!lista.some((perfil) => perfil.id === buscado)) return false;
      // Con ventanas dentro no se puede: borrarlas las dejaria apuntando a un perfil que ya no esta.
      // Si el gancho no esta puesto todavia —el arranque, antes de que el renderer lo rellene— no se
      // bloquea. Bloquear siempre dejaria al usuario sin poder quitar nunca un perfil sobrante.
      if (typeof this.conCuantasVentanas === 'function' && this.conCuantasVentanas(buscado) > 0) {
        return false;
      }
      escribir(lista.filter((perfil) => perfil.id !== buscado));
      return true;
    },

    // Lo rellena `renderer.js` con una funcion que mira las ventanas. Aqui se queda en null.
    conCuantasVentanas: null
  };
})();
