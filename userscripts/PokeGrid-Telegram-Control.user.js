// ==UserScript==
// @name         PokeGrid Telegram Control
// @namespace    pokegrid.telegram-control
// @version      1.0.0
// @description  Lee en que hunt esta cada cuenta y las envia a otra desde Telegram.
// @author       PokeGrid
// @match        https://poke.idleworld.online/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        PokeGrid_sharedStorage
// @connect      api.telegram.org
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // --- Comandos -------------------------------------------------------------
  //
  // Telegram entrega «/ir@MiBot algo» cuando el bot esta en un grupo. Si no se quita el sufijo, el
  // comando no coincide con nada y el bot se queda mudo justo en el caso de cuatro cuentas en un grupo.
  function parsearComando(texto) {
    const limpio = String(texto || '').trim();
    if (!limpio.startsWith('/')) return { accion: '', argumento: '' };
    const [cabeza, ...resto] = limpio.slice(1).split(/\s+/);
    return {
      accion: cabeza.split('@')[0].toLowerCase(),
      argumento: resto.join(' ').trim()
    };
  }

  // --- Busqueda de hunts ----------------------------------------------------
  //
  // Se normaliza sin tildes porque el catalogo del juego las trae y el usuario escribe sin ellas la
  // mitad de las veces. Sin esto, buscar «pokemon» no encuentra «Pokémon».
  function normalizarTexto(valor) {
    return String(valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
  }

  function buscarHunts(catalogo, texto, limite = 6) {
    const buscado = normalizarTexto(texto);
    if (!buscado) return [];
    const lista = Array.isArray(catalogo) ? catalogo : [];
    const puntuar = (hunt) => {
      const nombre = normalizarTexto(hunt.nombre);
      if (nombre === buscado) return 0;
      if (nombre.startsWith(buscado)) return 1;
      if (nombre.includes(buscado)) return 2;
      return 3;
    };
    return lista
      .filter((hunt) => normalizarTexto(hunt.nombre).includes(buscado)
        || normalizarTexto(hunt.slug).includes(buscado))
      .sort((a, b) => puntuar(a) - puntuar(b) || a.nombre.localeCompare(b.nombre))
      .slice(0, Math.max(1, limite));
  }

  // --- Botones --------------------------------------------------------------
  //
  // Los datos de un boton de Telegram no pueden pasar de 64 bytes, asi que llevan solo la forma
  // corta. El detalle de la hunt vive en el almacen, bajo el identificador corto.
  function parsearCallback(datos) {
    const texto = String(datos || '');
    if (texto === 'a:estado') return { tipo: 'estado' };
    const elige = texto.match(/^h:([a-z0-9]+):(\d+)$/);
    if (elige) return { tipo: 'elegirCuenta', corto: elige[1], indice: Number(elige[2]) };
    const orden = texto.match(/^a:([a-z0-9]+):(\d+):(.+)$/);
    if (orden) {
      return { tipo: 'viajar', corto: orden[1], indice: Number(orden[2]), destino: orden[3] };
    }
    return { tipo: '' };
  }

  // La puerta de seguridad, en una sola funcion. La usan el mensaje y el boton, y por eso esta aqui:
  // si la comprobacion se copiara en cada sitio, un dia uno de los dos se olvidaria de mirarla.
  function autorizado(config, id) {
    const lista = Array.isArray(config?.autorizados) ? config.autorizados : [];
    return lista.includes(String(id ?? ''));
  }

  // --- Configuracion --------------------------------------------------------
  function normalizarConfig(bruta) {
    const valor = bruta && typeof bruta === 'object' ? bruta : {};
    const ids = Array.isArray(valor.autorizados) ? valor.autorizados : [];
    return {
      token: String(valor.token || '').trim(),
      autorizados: [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))],
      orre: valor.orre === true
    };
  }

  // --- Leer el estado de esta cuenta ---------------------------------------
  //
  // Es la version corta del lector del launcher: aqui solo hace falta entrenador, sitio y el primer
  // Pokemon. Los movimientos, objetos e IV que lee el modo farmeo son para recomendar hunts, y el bot
  // no recomienda: informa y obedece.
  function textoDe(elemento) {
    return String(elemento?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function primerElemento(selectores) {
    for (const selector of selectores) {
      const encontrado = document.querySelector(selector);
      if (encontrado) return encontrado;
    }
    return null;
  }

  function leerEstadoPagina() {
    const sitio = textoDe(primerElemento(['.phud-tloc', '.pg-player-meta', '[class*="trainer-meta"]']));
    const meta = textoDe(primerElemento(['.pg-player-meta', '[class*="trainer-meta"]']));
    const entrenador = (meta.match(/(?:entrenador|trainer)[:\s]+([^·|]+)/i)?.[1] || '').trim();
    const nivel = Number(sitio.match(/(?:level|nivel|n[ií]vel|lv|nv)\.?\s*(\d+)/i)?.[1] || 0) || null;

    const ranura = document.querySelector('.pg-team-slot, [class*="team-slot"]');
    let leader = null;
    if (ranura) {
      const hp = textoDe(ranura.querySelector('[class*="hp"]')).match(/(\d+)\s*\/\s*(\d+)/);
      leader = {
        nombre: textoDe(ranura.querySelector('[class*="name"]')),
        nivel: Number(textoDe(ranura.querySelector('[class*="level"]')).replace(/\D/g, '')) || null,
        hp: hp ? Number(hp[1]) : null,
        maxHp: hp ? Number(hp[2]) : null
      };
      if (!leader.nombre) leader = null;
    }

    return {
      ready: location.pathname.startsWith('/play') && Boolean(document.body),
      trainerName: entrenador,
      location: sitio,
      level: nivel,
      leader
    };
  }

  // --- Turno y comandos ------------------------------------------------------
  //
  // El turno no es la garantia de correccion —eso lo hace el id del comando—, es lo que evita que las
  // cuatro paginas pidan mensajes a la vez y se coman un 409. Por eso se puede robar cuando caduca sin
  // miedo: como mucho habra dos pidiendo un momento, y la que pierda se aparta.
  const CLAVES = Object.freeze({
    config: 'pgc:config',
    turno: 'pgc:turno',
    comando: 'pgc:comando',
    catalogo: 'pgc:catalogo',
    indice: 'pgc:indice',
    offset: 'pgc:offset',
    registro: (pageId) => `pgc:registro:${pageId}`,
    resultado: (id, pageId) => `pgc:resultado:${id}:${pageId}`,
    pendiente: (corto) => `pgc:pendiente:${corto}`
  });

  const TURNO_MS = 15_000;
  const TURNO_RENOVAR_MS = 10_000;

  async function intentarTurno(almacen, pageId, ahora) {
    const actual = await almacen.leer(CLAVES.turno, null);
    if (actual && actual.pageId !== pageId && Number(actual.hasta) > ahora) return false;
    await almacen.escribir(CLAVES.turno, { pageId, hasta: ahora + TURNO_MS });
    return true;
  }

  // Telegram reintenta si el acuse tarda, asi que el mismo mensaje puede llegar dos veces. Lo que evita
  // mover la cuenta dos veces no es el turno: es que cada comando lleva un id y cada pagina recuerda el
  // ultimo que ejecuto.
  //
  // Y caduca: el comando se queda en el almacen para siempre. Sin la caducidad, una pagina que se abre
  // media hora despues se lo encuentra y viaja sola a donde ya no hace falta.
  const VIGENCIA_COMANDO_MS = 120_000;

  function debeEjecutar(ultimoId, comando, ahora = Date.now()) {
    if (!comando || !comando.id) return false;
    const desde = Number(comando.desde || 0);
    if (!desde || ahora - desde > VIGENCIA_COMANDO_MS || desde - ahora > 60_000) return false;
    return String(ultimoId || '') !== String(comando.id);
  }

  // --- Telegram -------------------------------------------------------------
  function llamarTelegram(token, metodo, parametros) {
    return new Promise((resolve) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: `https://api.telegram.org/bot${token}/${metodo}`,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify(parametros || {}),
        timeout: 35_000,
        onload: (respuesta) => {
          let cuerpo = null;
          try { cuerpo = JSON.parse(respuesta.responseText || '{}'); } catch { cuerpo = null; }
          if (!cuerpo) return resolve({ ok: false, error: 'Telegram no devolvió JSON.' });
          if (!cuerpo.ok) return resolve({ ok: false, error: cuerpo.description || 'Telegram rechazó la petición.' });
          resolve({ ok: true, result: cuerpo.result });
        },
        onerror: () => resolve({ ok: false, error: 'No se pudo conectar con Telegram.' }),
        ontimeout: () => resolve({ ok: false, error: 'Telegram no contestó.' })
      });
    });
  }

  // La edad del dato se dice. Un registro de hace dos minutos es informacion; una cuenta que
  // desaparece de la lista sin decirlo, no.
  function edadTexto(at, ahora) {
    const segundos = Math.max(0, Math.round((ahora - Number(at || 0)) / 1000));
    if (segundos < 60) return '';
    if (segundos < 3600) return ` · hace ${Math.round(segundos / 60)} min`;
    return ` · hace ${Math.round(segundos / 3600)} h`;
  }

  function formatearEstado(registros, ahora) {
    const lista = (Array.isArray(registros) ? registros : [])
      .slice()
      .sort((a, b) => Number(a.accountIndex) - Number(b.accountIndex));
    if (!lista.length) return 'No hay ninguna cuenta registrada todavía.';
    return lista.map((fila) => {
      const nombre = fila.trainerName || fila.label || `Cuenta ${Number(fila.accountIndex) + 1}`;
      const sitio = fila.location || 'sin leer';
      const lider = fila.leader && fila.leader.nombre
        ? ` · ${fila.leader.nombre}${fila.leader.nivel ? ` Nv. ${fila.leader.nivel}` : ''}`
        : '';
      return `${nombre}: ${sitio}${lider}${edadTexto(fila.at, ahora)}`;
    }).join('\n');
  }

  // --- Catalogo y viaje -----------------------------------------------------
  //
  // Esta secuencia es una COPIA RECORTADA de la del launcher. Se queda con lo que hace falta para
  // viajar y nada mas: no monta los monitores flotantes ni valida Orre por su cuenta. El precio de
  // este enfoque es que el dia que el juego cambie el mapa hay que tocar los dos sitios; se paga a
  // gusto quedandose con lo minimo.
  const ESPERA_MS = 12_000;

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function esperarA(condicion, ms = ESPERA_MS) {
    const inicio = Date.now();
    while (Date.now() - inicio < ms) {
      const valor = condicion();
      if (valor) return valor;
      await esperar(100);
    }
    return null;
  }

  function visible(elemento) {
    if (!elemento || elemento.hidden) return false;
    const estilo = getComputedStyle(elemento);
    const caja = elemento.getBoundingClientRect();
    return estilo.display !== 'none' && estilo.visibility !== 'hidden'
      && caja.width > 0 && caja.height > 0;
  }

  // El catalogo sale del endpoint del propio juego, el mismo que usa el modo farmeo. No hace falta
  // abrir el mapa ni tocar la interfaz para saber que hunts hay.
  async function leerCatalogo() {
    const respuesta = await fetch('/api/game/map-markers', { cache: 'no-cache' });
    if (!respuesta.ok) throw new Error('No se pudo leer el catálogo de hunts.');
    const datos = await respuesta.json();
    const lista = Array.isArray(datos) ? datos : (datos?.markers || datos?.hunts || []);
    return lista.map((fila) => ({
      slug: String(fila.slug || fila.huntSlug || fila.id || '').trim(),
      nombre: String(fila.name || fila.huntName || fila.label || '').trim(),
      mapa: String(fila.map || fila.mapSlug || fila.world || '').trim(),
      zona: String(fila.area || fila.region || fila.zone || '').trim(),
      nivel: Number(fila.level || fila.requiredLevel || 0) || 0
    })).filter((hunt) => hunt.slug && hunt.nombre);
  }

  async function viajarA(destino, opciones = {}) {
    try {
      // El permiso de Orre se mira ANTES de tocar el juego. Si se mirara despues, la cuenta podria
      // haberse movido ya y el mensaje diria «permiso apagado» mintiendo.
      const region = normalizarTexto([destino.mapa, destino.zona].filter(Boolean).join(' '));
      const esOrre = /(^|[^a-z0-9])orre([^a-z0-9]|$)/.test(region);
      if (esOrre && !opciones.orre) {
        return { ok: false, mensaje: 'El destino es de Orre y el permiso está apagado.' };
      }

      // La ventana del mapa no siempre es `.map-window`: a veces es un contenedor que envuelve los
      // marcadores. Se busca igual que en el launcher, subiendo por los padres.
      const buscarMapa = () => {
        const directo = [
          '.map-window', '[data-map-window]', '[data-guide="map-window"]',
          '.map-overlay', '.map-modal', '[class*="map-window"]'
        ].flatMap((selector) => [...document.querySelectorAll(selector)])
          .find((elemento) => visible(elemento));
        if (directo) return directo;
        // El respaldo solo vale si hay un marcador VISIBLE. Si no, cuando el mapa esta cerrado los
        // marcadores siguen en el DOM (ocultos) y subir por los padres acaba en el contenedor de la
        // pagina entera, que tiene botones: el codigo creeria que el mapa esta abierto y no lo
        // abriria nunca.
        const control = [...document.querySelectorAll(
          '.map-viewport, .map-inner, .hunt-marker, [data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug]')]
          .find((elemento) => visible(elemento));
        let padre = control?.parentElement || null;
        for (let profundidad = 0; padre && profundidad < 8; profundidad += 1, padre = padre.parentElement) {
          if (padre === document.body) break;
          if (visible(padre) && padre.querySelector('button, [role="button"], .hunt-marker')) return padre;
        }
        return null;
      };

      if (!buscarMapa()) {
        const botonMapa = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button')]
          .find((boton) => /(^| )map($| )|mapa/i.test(`${boton.dataset?.guide || ''} ${boton.textContent || ''}`));
        if (!botonMapa) return { ok: false, mensaje: 'No encontré el botón Mapa.' };
        botonMapa.click();
      }
      const ventanaMapa = await esperarA(() => {
        const actual = buscarMapa();
        return visible(actual) ? actual : null;
      }, 8500);
      if (!ventanaMapa) return { ok: false, mensaje: 'El mapa no abrió a tiempo.' };

      // El mapa tiene pestañas de region. Sin elegir la del destino, sus marcadores ni siquiera
      // existen en el DOM y el viaje fallaria por buscar donde no esta.
      const estaElegido = (elemento) => Boolean(
        elemento.classList?.contains('on') || elemento.classList?.contains('active')
        || elemento.classList?.contains('selected')
        || elemento.getAttribute('aria-selected') === 'true'
        || elemento.getAttribute('aria-pressed') === 'true');
      const elegirRegion = async (valor, atributos) => {
        const buscado = normalizarTexto(valor);
        if (!buscado) return true;
        const candidatos = [...document.querySelectorAll(
          '.map-area, .map-plate, .map-tab, .map-region, [data-map], [data-map-slug], [data-world], [data-region], [data-area], [role="tab"]')]
          .filter((elemento) => !elemento.matches(
            '.hunt-marker, [data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug]'));
        const control = candidatos.find((elemento) => atributos.some(
          (atributo) => normalizarTexto(elemento.getAttribute(atributo)) === buscado)
          || normalizarTexto(textoDe(elemento)) === buscado);
        if (!control) return false;
        if (!estaElegido(control)) {
          control.click();
          await esperar(350);
        }
        return true;
      };
      if (destino.mapa) await elegirRegion(destino.mapa, ['data-map-slug', 'data-map', 'data-world']);
      if (destino.zona && normalizarTexto(destino.zona) !== normalizarTexto(destino.mapa)) {
        await elegirRegion(destino.zona, ['data-area', 'data-region', 'data-zone']);
      }

      const buscado = normalizarTexto(destino.slug);
      const encontrarMarcador = () => [...document.querySelectorAll(
        '.hunt-marker, [data-hunt-slug], [data-teleport-slug], [data-field-teleport-slug], [data-guide^="hunt-"]')]
        .find((elemento) => [
          elemento.dataset?.huntSlug,
          elemento.dataset?.teleportSlug,
          elemento.dataset?.fieldTeleportSlug,
          elemento.dataset?.slug,
          (elemento.dataset?.guide || '').replace(/^hunt[-_:]/i, '')
        ].map(normalizarTexto).filter(Boolean).includes(buscado)) || null;

      let marcador = await esperarA(encontrarMarcador, 4500);
      if (!marcador) {
        const buscador = [...document.querySelectorAll(
          '.map-filter-q, input[type="search"], input[data-map-search]')].find(visible);
        if (buscador) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(buscador, destino.nombre); else buscador.value = destino.nombre;
          buscador.dispatchEvent(new Event('input', { bubbles: true }));
          buscador.dispatchEvent(new Event('change', { bubbles: true }));
          marcador = await esperarA(encontrarMarcador, 7000);
        }
      }
      if (!marcador) return { ok: false, mensaje: `No encontré ${destino.nombre} en el mapa.` };
      if (marcador.classList.contains('no') || marcador.disabled) {
        return { ok: false, mensaje: `${destino.nombre} todavía está bloqueado para esta cuenta.` };
      }

      // La llegada se comprueba contra el HUD. Vale el nombre o el slug. Y si el HUD nombra una
      // region, tiene que ser la del destino: sin eso, «Blastoise» de Kanto coincidiria con el de
      // Orre y el viaje se daria por hecho sin haberse movido.
      const REGIONES = ['kanto', 'johto', 'hoenn', 'sinnoh', 'teselia', 'unova', 'kalos', 'alola', 'galar', 'paldea', 'orre'];
      const textoUbicacion = () => textoDe(document.querySelector(
        '.phud-tloc, .pg-player-meta, [data-current-hunt], [data-current-location]'));
      const ubicacionCoincide = () => {
        const descriptor = normalizarTexto(textoUbicacion());
        if (!descriptor) return false;
        const mapa = normalizarTexto(destino.mapa);
        const mencionadas = REGIONES.filter((nombreRegion) => descriptor.includes(nombreRegion));
        if (mapa && mencionadas.length && !mencionadas.includes(mapa)) return false;
        return descriptor.includes(normalizarTexto(destino.nombre)) || descriptor.includes(buscado);
      };

      // Ya estar alli no es un fallo: es lo que el usuario pidio. Se cierra el mapa y se dice.
      if (marcador.classList.contains('here') || ubicacionCoincide()) {
        const cerrar = buscarMapa()?.querySelector(
          '.cfg-x, [data-action="close"], [aria-label*="cerrar" i], [aria-label*="close" i]');
        cerrar?.click();
        return { ok: true, mensaje: `Ya estabas en ${destino.nombre}.` };
      }

      // Pulsar el marcador ES el viaje. No hay boton de viajar aparte: si se esperara uno, el viaje
      // no ocurriria nunca.
      marcador.click();

      // El aviso de Orre solo se acepta con permiso. Se corta en cuanto el mapa se cierra o la
      // ubicacion ya coincide, para no esperar 6,5 s en cada viaje a Orre sin aviso.
      if (esOrre && opciones.orre) {
        const aviso = await esperarA(() => {
          if (!buscarMapa() || ubicacionCoincide()) return { saltado: true };
          const texto = String(document.body.textContent || '');
          if (!/(still want to enter|deseas entrar|quieres entrar|aun asi|tms de aoe)/i.test(texto)) return null;
          const si = [...document.querySelectorAll('button, [role="button"]')]
            .filter(visible)
            .find((boton) => /^(si|sí|yes|confirm|confirmar|aceptar|entrar)$/i.test(textoDe(boton)));
          if (!si) return null;
          si.click();
          return { confirmado: true };
        }, 6500);
        if (aviso && !aviso.confirmado && !aviso.saltado) {
          return { ok: false, mensaje: 'Salió el aviso de Orre pero no encontré cómo confirmarlo.' };
        }
      }

      const iniciado = await esperarA(() => ubicacionCoincide() || !buscarMapa(), 9000);
      if (!iniciado) {
        return { ok: false, mensaje: 'El viaje no se inició. Revisa el nivel y que el Pokémon líder tenga vida.' };
      }
      const llegada = await esperarA(() => (ubicacionCoincide() ? textoUbicacion() : null), 15_000);
      return llegada
        ? { ok: true, mensaje: `En ${llegada}` }
        : { ok: false, mensaje: 'Viajé, pero el juego no confirmó la llegada.' };
    } catch (error) {
      return { ok: false, mensaje: error.message || 'Falló el viaje.' };
    }
  }

  // --- Estado compartido y bucle --------------------------------------------
  const almacen = {
    leer: (clave, porDefecto) => GM_getSharedValue(clave, porDefecto),
    escribir: (clave, valor) => GM_setSharedValue(clave, valor),
    borrar: (clave) => GM_deleteSharedValue(clave)
  };

  const PAGE_ID = (globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random()}`).slice(0, 36);
  let ultimoIdEjecutado = GM_getValue('ultimoId', '');
  let turnoPropio = false;

  // El almacen no sabe listar claves, asi que se guarda un indice de paginas. Sin el, `/estado` no
  // tendria forma de saber que cuentas hay.
  async function mantenerIndice() {
    const indice = await almacen.leer(CLAVES.indice, []);
    if (indice.includes(PAGE_ID)) return;
    await almacen.escribir(CLAVES.indice, [...indice, PAGE_ID]);
  }

  async function registrar() {
    const estado = leerEstadoPagina();
    await almacen.escribir(CLAVES.registro(PAGE_ID), {
      pageId: PAGE_ID,
      accountIndex: Number(GM_info?.script?.account?.index ?? -1),
      label: String(GM_info?.script?.account?.label || ''),
      ...estado,
      at: Date.now()
    });
  }

  // El registro se refresca solo cuando cambia algo, y ademas con un latido cada 5 minutos.
  //
  // Escribir cada 5 s seria un chorro de escrituras: cada `GM_setSharedValue` serializa y cifra el
  // almacen ENTERO y lo escribe en disco, y son cuatro paginas. Con el cambio detectado, viajar se
  // refleja en la siguiente vuelta (1,5 s) y una cuenta quieta escribe una vez cada 5 minutos, que
  // basta para que la edad de `/estado` distinga una cuenta viva de una cerrada.
  const REGISTRO_CAMBIO_MS = 1500;
  const REGISTRO_LATIDO_MS = 300_000;
  let ultimoRegistro = 0;
  let ultimaFirma = '';

  function firmaDelEstado(estado) {
    return JSON.stringify([estado.ready, estado.trainerName, estado.location, estado.level, estado.leader]);
  }

  async function registrarSiToca(ahora) {
    const momento = Number(ahora) || Date.now();
    if (momento - ultimoRegistro < REGISTRO_CAMBIO_MS) return false;
    const estado = leerEstadoPagina();
    const firma = firmaDelEstado(estado);
    if (firma === ultimaFirma && momento - ultimoRegistro < REGISTRO_LATIDO_MS) return false;
    ultimoRegistro = momento;
    ultimaFirma = firma;
    await registrar();
    return true;
  }

  async function registros() {
    const indice = await almacen.leer(CLAVES.indice, []);
    const filas = [];
    for (const pageId of indice) {
      const fila = await almacen.leer(CLAVES.registro(pageId), null);
      if (fila) filas.push(fila);
    }
    return filas;
  }

  function boton(texto, dato) {
    return { text: texto, callback_data: dato };
  }

  async function emitirComando(config, accion, destino, cuentas) {
    const comando = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      accion,
      destino,
      cuentas,
      desde: Date.now()
    };
    await almacen.escribir(CLAVES.comando, comando);
    return comando;
  }

  // El resultado de un viaje tarda: hay que abrir el mapa, buscar, viajar y esperar la llegada. El bot
  // promete avisar cuando acabe, asi que esta funcion espera a que cada cuenta escriba su linea y las
  // manda juntas. Si una no contesta en 40 s se dice «sin respuesta» en vez de callarse: una cuenta
  // cerrada y una que fallo son cosas distintas, y el silencio no distingue entre las dos.
  async function informarResultados(config, chatId, comandoId, esperados) {
    // Sin cuentas, el texto seria vacio y Telegram rechaza un mensaje vacio. Se dice lo que pasa.
    if (!esperados.length) {
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId, text: 'No hay ninguna cuenta registrada todavía.'
      });
      return;
    }
    const inicio = Date.now();
    const lineas = new Map();
    const limite = 40_000;
    while (Date.now() - inicio < limite) {
      for (const pageId of esperados) {
        if (lineas.has(pageId)) continue;
        const fila = await almacen.leer(CLAVES.resultado(comandoId, pageId), null);
        if (fila) lineas.set(pageId, fila);
      }
      if (lineas.size >= esperados.length) break;
      await esperar(1000);
    }
    const nombres = new Map((await registros()).map((fila) => [fila.pageId, fila.trainerName || 'Cuenta']));
    const texto = esperados.map((pageId) => {
      const fila = lineas.get(pageId);
      const nombre = nombres.get(pageId) || 'Cuenta';
      if (!fila) return `${nombre}: sin respuesta (¿cuenta cerrada?)`;
      return `${nombre}: ${fila.ok ? '✓' : '✗'} ${fila.mensaje}`;
    }).join('\n');
    await llamarTelegram(config.token, 'sendMessage', { chat_id: chatId, text: texto });
    for (const pageId of esperados) await almacen.borrar(CLAVES.resultado(comandoId, pageId));
  }

  async function atenderMensaje(config, mensaje) {
    if (!autorizado(config, mensaje.from?.id)) {
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: mensaje.chat.id,
        text: `No autorizado.\nTu id de Telegram es ${mensaje.from?.id}.`
      });
      return;
    }
    const { accion, argumento } = parsearComando(mensaje.text);
    const chatId = mensaje.chat.id;
    if (accion === 'estado' || accion === 'start') {
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: formatearEstado(await registros(), Date.now()),
        reply_markup: { inline_keyboard: [[boton('Actualizar', 'a:estado')]] }
      });
      return;
    }
    if (accion === 'ir') {
      if (!argumento) {
        await llamarTelegram(config.token, 'sendMessage', {
          chat_id: chatId, text: 'Dime a qué hunt: /ir blastoise'
        });
        return;
      }
      let catalogo = await almacen.leer(CLAVES.catalogo, null);
      if (!catalogo) {
        catalogo = await leerCatalogo();
        await almacen.escribir(CLAVES.catalogo, catalogo);
      }
      const encontrados = buscarHunts(catalogo, argumento);
      if (!encontrados.length) {
        await llamarTelegram(config.token, 'sendMessage', {
          chat_id: chatId, text: `No encontré ninguna hunt que se parezca a «${argumento}».`
        });
        return;
      }
      // La lista se guarda ENTERA, no solo el primero: el boton de cada coincidencia lleva su indice
      // y sin la lista no habria a que indice apuntar.
      const corto = Math.random().toString(36).slice(2, 10);
      await almacen.escribir(CLAVES.pendiente(corto), { hunts: encontrados, creadoEn: Date.now() });
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: '¿A qué hunt las mando?',
        // Un boton por fila. Seis etiquetas largas en la misma fila no se leen en un movil.
        reply_markup: {
          inline_keyboard: encontrados.slice(0, 6).map((hunt, indice) => [
            boton(`${hunt.nombre} · ${hunt.mapa || '—'} · Nv.${hunt.nivel || '?'}`, `h:${corto}:${indice}`)
          ])
        }
      });
    }
  }

  // Los botones.
  //
  // Se contesta SIEMPRE al callback, aunque sea para rechazarlo: si no se contesta, el boton se queda
  // girando en el movil y parece que el bot esta muerto. Y el rechazo no dice nada del estado de las
  // cuentas: un desconocido no puede sacar informacion pulsando.
  async function atenderCallback(config, consulta) {
    const contestar = (texto) => llamarTelegram(config.token, 'answerCallbackQuery', {
      callback_query_id: consulta.id, text: texto
    });
    if (!autorizado(config, consulta.from?.id)) {
      await contestar('No autorizado.');
      return;
    }
    const chatId = consulta.message?.chat?.id;
    const elegido = parsearCallback(consulta.data);

    if (elegido.tipo === 'estado') {
      await contestar('Actualizando…');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId, text: formatearEstado(await registros(), Date.now())
      });
      return;
    }

    if (elegido.tipo === 'elegirCuenta') {
      const pendiente = await almacen.leer(CLAVES.pendiente(elegido.corto), null);
      const hunt = pendiente?.hunts?.[elegido.indice];
      if (!hunt) { await contestar('Esa lista caducó. Vuelve a escribir /ir.'); return; }
      const filas = await registros();
      await contestar('Elige a quién.');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: `${hunt.nombre} · ${hunt.mapa || '—'} · Nv.${hunt.nivel || '?'}\n¿A quién la mando?`,
        reply_markup: {
          inline_keyboard: [
            [boton('Las 4', `a:${elegido.corto}:${elegido.indice}:todas`)],
            ...filas.map((fila) => [
              boton(fila.trainerName || 'Cuenta', `a:${elegido.corto}:${elegido.indice}:${fila.pageId}`)
            ])
          ]
        }
      });
      return;
    }

    // Este es el segundo toque: elegir el destino es la confirmacion de mover las cuatro.
    if (elegido.tipo === 'viajar') {
      const pendiente = await almacen.leer(CLAVES.pendiente(elegido.corto), null);
      const hunt = pendiente?.hunts?.[elegido.indice];
      if (!hunt) { await contestar('Esa lista caducó. Vuelve a escribir /ir.'); return; }
      const comando = await emitirComando(config, 'ir', hunt, elegido.destino);
      await contestar('Enviado.');
      await llamarTelegram(config.token, 'sendMessage', {
        chat_id: chatId,
        text: `Viajando a ${hunt.nombre}. Te digo el resultado en unos segundos.`
      });
      await almacen.borrar(CLAVES.pendiente(elegido.corto));
      // Sin `await`: el bucle tiene que seguir contestando mientras los viajes ocurren. Si se esperara
      // aqui, el bot dejaria de responder 40 segundos y pareceria caido.
      const esperados = elegido.destino === 'todas'
        ? (await registros()).map((fila) => fila.pageId)
        : [elegido.destino];
      informarResultados(config, chatId, comando.id, esperados).catch(() => {});
      return;
    }

    await contestar('No entendí ese botón.');
  }

  async function bucle() {
    const config = normalizarConfig(await almacen.leer(CLAVES.config, null));
    if (!config.token || !config.autorizados.length) return;
    let offset = Number(await almacen.leer(CLAVES.offset, 0)) || 0;
    let proximaRenovacion = 0;
    let proximoIndice = 0;

    while (true) {
      try {
        const ahora = Date.now();
        // El indice se reescribe cada 30 s: si dos paginas arrancan a la vez, una puede perder la
        // carrera al apuntarse y quedarse fuera de /estado para siempre. Reintentarlo lo cura.
        if (ahora >= proximoIndice) {
          await mantenerIndice();
          proximoIndice = ahora + 30_000;
        }
        // Y el registro se refresca solo cuando toca, para que `/estado` no cuente la hunt del
        // arranque toda la tarde.
        await registrarSiToca(ahora);
        if (turnoPropio && ahora >= proximaRenovacion) {
          await almacen.escribir(CLAVES.turno, { pageId: PAGE_ID, hasta: ahora + TURNO_MS });
          proximaRenovacion = ahora + TURNO_RENOVAR_MS;
        } else if (!turnoPropio) {
          turnoPropio = await intentarTurno(almacen, PAGE_ID, ahora);
          proximaRenovacion = ahora + TURNO_RENOVAR_MS;
        }

        // Obedecer: cualquier pagina, tenga turno o no.
        const comando = await almacen.leer(CLAVES.comando, null);
        if (debeEjecutar(ultimoIdEjecutado, comando)
            && (comando.cuentas === 'todas' || comando.cuentas === PAGE_ID)) {
          ultimoIdEjecutado = comando.id;
          GM_setValue('ultimoId', ultimoIdEjecutado);
          const resultado = comando.accion === 'ir'
            ? await viajarA(comando.destino, { orre: config.orre })
            : { ok: false, mensaje: 'Comando desconocido.' };
          await almacen.escribir(CLAVES.resultado(comando.id, PAGE_ID), {
            ...resultado, at: Date.now()
          });
        }

        if (turnoPropio) {
          const respuesta = await llamarTelegram(config.token, 'getUpdates', {
            offset, timeout: 25, allowed_updates: ['message', 'callback_query']
          });
          if (!respuesta.ok) { turnoPropio = false; await esperar(5000); continue; }
          for (const actualizacion of respuesta.result || []) {
            offset = Math.max(offset, Number(actualizacion.update_id) + 1);
            await almacen.escribir(CLAVES.offset, offset);
            if (actualizacion.message) await atenderMensaje(config, actualizacion.message);
            if (actualizacion.callback_query) await atenderCallback(config, actualizacion.callback_query);
          }
        } else {
          await esperar(1500);
        }
      } catch (error) {
        await esperar(3000);
      }
    }
  }

  // --- Panel de configuracion -----------------------------------------------
  function montarPanel() {
    GM_addStyle(`
      .pgc-boton { position: fixed; left: 10px; bottom: 10px; z-index: 2147483000;
        width: 30px; height: 30px; border-radius: 50%; border: 1px solid #4a6fa5;
        background: #101827; color: #cfe4ff; font-size: 14px; cursor: pointer; }
      .pgc-panel { position: fixed; left: 10px; bottom: 48px; z-index: 2147483001;
        width: 300px; padding: 12px; border-radius: 10px; border: 1px solid #4a6fa5;
        background: #0d1622; color: #e6eef7; font: 12px/1.4 system-ui; display: grid; gap: 8px; }
      .pgc-panel[hidden] { display: none; }
      .pgc-panel input { width: 100%; padding: 6px; border-radius: 6px;
        border: 1px solid #2b3f54; background: #071019; color: #e6eef7; }
      .pgc-panel label { display: grid; gap: 3px; font-size: 10px; letter-spacing: .08em; }
      .pgc-estado { color: #8fa6ba; font-size: 10px; }
    `);
    const botonAbrir = document.createElement('button');
    botonAbrir.type = 'button';
    botonAbrir.className = 'pgc-boton';
    botonAbrir.textContent = '✈';
    botonAbrir.title = 'Control por Telegram';

    const panel = document.createElement('div');
    panel.className = 'pgc-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <label>TOKEN DE BOTFATHER<input data-campo="token" type="password" autocomplete="off"></label>
      <label>IDS AUTORIZADOS (separados por comas)<input data-campo="autorizados" type="text"></label>
      <label><span><input data-campo="orre" type="checkbox"> Permitir viajar a Orre</span></label>
      <button data-accion="guardar" type="button">Guardar</button>
      <span class="pgc-estado"></span>`;

    document.body.append(botonAbrir, panel);
    botonAbrir.addEventListener('click', () => { panel.hidden = !panel.hidden; });

    const campo = (nombre) => panel.querySelector(`[data-campo="${nombre}"]`);
    const estado = panel.querySelector('.pgc-estado');

    (async () => {
      const config = normalizarConfig(await almacen.leer(CLAVES.config, null));
      campo('token').value = config.token;
      campo('autorizados').value = config.autorizados.join(', ');
      campo('orre').checked = config.orre;
    })();

    panel.querySelector('[data-accion="guardar"]').addEventListener('click', async () => {
      const token = campo('token').value.trim();
      if (token && !/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
        estado.textContent = 'El token no tiene el formato de BotFather.';
        return;
      }
      const config = normalizarConfig({
        token,
        autorizados: campo('autorizados').value.split(','),
        orre: campo('orre').checked
      });
      await almacen.escribir(CLAVES.config, config);
      estado.textContent = config.token && config.autorizados.length
        ? 'Guardado. Recarga las cuentas para que arranque.'
        : 'Guardado, pero falta el token o los ids.';
    });
  }

  // --- Para las pruebas -----------------------------------------------------
  //
  // Sin `document` no hay pagina que decorar: el script solo tiene que dejar sus funciones puras a
  // mano. Es la unica concesion que se hace por poder probarlo, y no cambia nada en produccion.
  //
  // ESTE BLOQUE VA AL FINAL DEL IIFE, siempre. Las tareas siguientes anaden funciones y las suman a
  // estas dos listas; si el bloque se quedara en medio, el `return` cortaria el script antes de
  // definirlas y el bot arrancaria sin viaje ni lector.
  if (typeof document === 'undefined') {
    globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig, leerEstadoPagina, CLAVES, intentarTurno, debeEjecutar, formatearEstado, llamarTelegram, leerCatalogo, viajarA, PAGE_ID, registrar, registrarSiToca };
    return;
  }

  globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig, leerEstadoPagina, CLAVES, intentarTurno, debeEjecutar, formatearEstado, llamarTelegram, leerCatalogo, viajarA, PAGE_ID, registrar, registrarSiToca };

  // Arranca solo si hay configuracion. `bucle` lo comprueba y se queda quieto si falta el token o los
  // ids, asi que no hace falta preguntarlo dos veces aqui.
  montarPanel();
  bucle().catch(() => {});
})();
