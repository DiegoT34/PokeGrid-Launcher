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

  // El Principal no está en el almacen: se crea solo y por eso se puede renombrar o cambiar su
  // avatar sin tocar `localStorage`. Se guarda la forma base congelada y una copia viva: la congelada
  // es la que no se puede alterar por accidente, y la viva es la que `ponerAvatar` cambia cuando el
  // usuario personaliza el Principal.
  const PERFIL_PRINCIPAL_BASE = Object.freeze({
    id: PERFIL_POR_DEFECTO,
    nombre: 'Principal',
    creado: 0,
    avatar: '',
    color: ''
  });
  const perfilPrincipal = { ...PERFIL_PRINCIPAL_BASE };

  // Un color es `#rrggbb`, o un degradado lineal, o la cadena vacia —que es «sin fondo»—. Se comprueba
  // con la forma, no con el nombre: `CSS.supports` no existe en un fichero que se carga sin pagina, y
  // aqui no hay donde mirar. Lo que no pase por estas formas se trata como «sin fondo», que es lo que
  // el usuario quiere decir cuando escribe algo que no es un color.
  // El color de un perfil es un color PLANO (`#rrggbb`) o un DEGRADADO lineal. Las dos cosas se
  // ponen en `style.background` igual, asi que de ahi no se distingue; lo que se distingue es lo que
  // se acepta guardar, y por eso el degradado se valida pieza a pieza en vez de pasar tal cual.
  //
  // POR QUE NO SE ACEPTA CUALQUIER CADENA. Este valor sale del almacenamiento local y acaba en un
  // `background`. Con `url(...)` alguien podria apuntar a un archivo que el launcher lee, y con
  // `image-set()` a una imagen remota. Se podria decir que el almacenamiento es del propio usuario y
  // que no hay de que, y es verdad; pero el que lo escribe puede ser un archivo de perfiles importado
  // de otra parte, o un texto pegado. Aceptar solo «linear-gradient con un angulo y colores hex» no
  // cuesta nada y quita la categoria entera de problemas.
  const COLOR_PLANO = /^#[0-9a-f]{6}$/;
  const COLOR_GRADIENTE = /^linear-gradient\(\s*-?\d{1,3}deg\s*,\s*#[0-9a-f]{6}\s*,\s*#[0-9a-f]{6}\s*\)$/;

  function esColor(texto) {
    const valor = String(texto || '').trim();
    return COLOR_PLANO.test(valor) || COLOR_GRADIENTE.test(valor);
  }

  function esColorPlano(texto) {
    return COLOR_PLANO.test(String(texto || '').trim());
  }

  // El avatar es el NOMBRE de la especie en minusculas —`pikachu`— y no una URL.
  //
  // Guardar la URL seria un error que solo se nota dentro de seis meses: PokéAPI numera las especies y
  // un numero puede cambiar, y entonces el sprite guardado no apunta a nada y el perfil aparece sin
  // foto sin que se sepa por que. Con el nombre se resuelve cada vez que se pinta, y si PokéAPI no
  // responde se cae a la inicial.
  function esEspecie(texto) {
    return /^[a-z0-9-]{1,40}$/.test(texto);
  }

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
        creado: Number(fila.creado) || 0,
        // Lo que venga raro se deja en su valor neutro en vez de propagarse: un color que no es un
        // color se pinta como si no hubiera color, que es lo que el usuario quiere decir.
        avatar: esEspecie(String(fila.avatar || '').toLowerCase()) ? String(fila.avatar).toLowerCase() : '',
        color: esColor(String(fila.color || '').toLowerCase()) ? String(fila.color).toLowerCase() : ''
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
        creado: Date.now(),
        avatar: '',
        color: ''
      };
      escribir([...leer(), perfil]);
      return perfil;
    },

    // Poner avatar y color de golpe. Se hacen juntos porque en la pantalla se cambian juntos —es el
    // mismo círculo— y porque un «poner solo el avatar» y un «poner solo el color» exigirian dos
    // caminos para la misma fila.
    //
    // El Principal SI se puede personalizar. Lo que no puede es renombrarse ni borrarse, y eso se
    // decide en `renombrar` y `borrar`, no aqui.
    //
    // Se guardan por id, y no por posición: el `Principal` no está en el almacen, asi que la lista
    // que recorre esto no lo contiene. Si el id es `principal` se cambia el objeto congelado por otro
    // identico con los campos nuevos.
    ponerAvatar(id, especie, color) {
      const buscado = String(id || '');
      if (!buscado) return false;
      const normalizados = {
        avatar: esEspecie(String(especie || '').toLowerCase()) ? String(especie).toLowerCase() : '',
        color: esColor(String(color || '').toLowerCase()) ? String(color).toLowerCase() : ''
      };
      if (buscado === PERFIL_POR_DEFECTO) {
        perfilPrincipal.avatar = normalizados.avatar;
        perfilPrincipal.color = normalizados.color;
        return true;
      }
      const lista = leer();
      if (!lista.some((perfil) => perfil.id === buscado)) return false;
      escribir(lista.map((perfil) => (perfil.id === buscado ? { ...perfil, ...normalizados } : perfil)));
      return true;
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

  // LOS POKÉMON PARA LOS AVATARES.
  //
  // Una lista CURADA y escrita aqui, y no una consulta a PokéAPI al abrir el diálogo. La razón es una
  // sola: el menú tiene que aparecer SIN red. Si depende de una llamada, sin conexión —o con PokéAPI
  // caído— el gestor se queda vacío justo cuando se quiere crear un perfil, que es cuando peor viene
  // que falle. Los SPRITES sí se descargan al elegir, que es lo que se pidió: esto solo dice qué hay.
  //
  // El valor es el nombre de la especie en la forma de PokéAPI, en minúsculas y sin tildes. No se
  // escribe el nombre bonito aparte porque se compone del primero: `bulbasaur` → «Bulbasaur». Así no
  // pueden quedar desincronizados el nombre que se enseña y el que se busca.
  //
  // LA LISTA CRECE EN LA 0.39.0, DE 36 A 132. Treinta y seis se quedan cortos en cuanto se abre el
  // gestor: son los que se ven rapido, y a los cinco segundos uno ya los conoce todos. Lo que se ha
  // anadido son los beginnings de cada generacion —para que de un vistazo se vea de que generacion
  // es cada uno— y los que la gente quiere de verdad: Rayquaza, Gengar, Eevee y companyia.
  //
  // Va escrito aqui y no se pide a PokéAPI porque el menu tiene que aparecer sin red: si la lista
  // saliera de ahi, sin conexion no habria ni un solo avatar que elegir.
  const ESPECIES_DE_AVATAR = Object.freeze([
    // Los 36 de siempre, al principio y en su orden.
    'bulbasaur', 'charmander', 'squirtle', 'chikorita', 'cyndaquil', 'totodile',
    'treecko', 'torchic', 'mudkip', 'turtwig', 'chimchar', 'piplup',
    'rowlet', 'litten', 'popplio', 'grookey', 'scorbunny', 'sobble',
    'eevee', 'snorlax', 'gengar', 'lapras', 'meowth', 'pikachu',
    'charizard', 'blastoise', 'alakazam', 'gyarados', 'dragonite', 'mewtwo',
    'ho-oh', 'jigglypuff', 'vaporeon', 'flareon', 'jolteon', 'umbreon',

    // Generacion I.
    'raichu', 'vulpix', 'nidoran-f', 'nidoran-m', 'clefairy', 'zubat',
    'oddish', 'diglett', 'psyduck', 'mankey', 'growlithe', 'poliwag',
    'abra', 'machop', 'geodude', 'slowpoke', 'onix', 'rhyhorn',
    'tangela', 'kangaskhan', 'scyther', 'electabuzz', 'tauros', 'mew',

    // Generacion II.
    'sentret', 'noctowl', 'ledian', 'houndour', 'kingdra', 'donphan',
    'stantler', 'miltank', 'blissey', 'raikou', 'entei', 'suicune', 'lugia',

    // Generacion III.
    'sceptile', 'blaziken', 'swampert', 'gardevoir', 'metagross', 'flygon',
    'absol', 'salamence', 'milotic', 'sharpedo', 'aggron', 'manectric',
    'hariyama', 'torkoal', 'rayquaza', 'kyogre', 'groudon', 'deoxys',

    // Generacion IV.
    'infernape', 'empoleon', 'staraptor', 'roserade', 'garchomp', 'lucario',
    'gastrodon', 'mamoswine', 'glaceon', 'leafeon', 'weavile', 'heatran',
    'dialga', 'palkia', 'arceus', 'darkrai',

    // Generacion V.
    'excadrill', 'ferrothorn', 'volcarona', 'landorus', 'reshiram', 'zekrom',

    // Generacion VI.
    'greninja', 'delphox', 'talonflame', 'hawlucha', 'klefki', 'trevenant',
    'gourgeist', 'zygarde', 'xerneas', 'yveltal', 'sylveon', 'goomy',

    // Generacion VII.
    'toucannon', 'vikavolt', 'ribombee', 'comfey', 'silvally', 'magearna',

    // Generacion VIII y IX.
    'dragapult', 'corviknight', 'gholdengo', 'zacian', 'eternatus',
    'sprigatito', 'fuecoco', 'quaxly', 'pawmot', 'kingambit',

    // Los que se piden por el nombre, con o sin generacion.
    'rotom', 'aegislash', 'mimikyu', 'salazzle', 'naganadel'
  ]);

  window.pokeGridPerfiles.especiesDeAvatar = () => ESPECIES_DE_AVATAR.slice();
})();
