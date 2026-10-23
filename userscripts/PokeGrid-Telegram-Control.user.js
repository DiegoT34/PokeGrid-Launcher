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
  function debeEjecutar(ultimoId, comando) {
    if (!comando || !comando.id) return false;
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
      const nombre = fila.trainerName || `Cuenta ${Number(fila.accountIndex) + 1}`;
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
      const mapa = document.querySelector('.map-window, [data-map-window], .map-overlay');
      if (!visible(mapa)) {
        const botonMapa = [...document.querySelectorAll('.game-dock .dock-btn, .game-dock button')]
          .find((boton) => /map|mapa/i.test(`${boton.dataset?.guide || ''} ${boton.textContent || ''}`));
        if (!botonMapa) return { ok: false, mensaje: 'No encontré el botón Mapa.' };
        botonMapa.click();
      }
      const ventanaMapa = await esperarA(() => {
        const actual = document.querySelector('.map-window, [data-map-window], .map-overlay');
        return visible(actual) ? actual : null;
      });
      if (!ventanaMapa) return { ok: false, mensaje: 'El mapa no abrió a tiempo.' };

      const buscado = normalizarTexto(destino.slug);
      let marcador = [...document.querySelectorAll('.hunt-marker, [data-hunt-slug], [data-teleport-slug]')]
        .find((elemento) => normalizarTexto(elemento.dataset?.huntSlug
          || elemento.dataset?.teleportSlug || elemento.dataset?.slug) === buscado);

      if (!marcador) {
        const buscador = document.querySelector('.map-filter-q, input[type="search"]');
        if (buscador) {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(buscador, destino.nombre); else buscador.value = destino.nombre;
          buscador.dispatchEvent(new Event('input', { bubbles: true }));
          marcador = await esperarA(() => [...document.querySelectorAll('.hunt-marker, [data-hunt-slug]')]
            .find((elemento) => normalizarTexto(elemento.dataset?.huntSlug) === buscado) || null, 6000);
        }
      }
      if (!marcador) return { ok: false, mensaje: `No encontré ${destino.nombre} en el mapa.` };

      marcador.click();
      const viajar = await esperarA(() => {
        const boton = document.querySelector('.map-travel, [data-travel], .map-enter');
        return visible(boton) ? boton : null;
      }, 5000);
      if (!viajar) return { ok: false, mensaje: 'Apareció el marcador pero no el botón de viajar.' };
      viajar.dataset.pulsado = 'true';
      viajar.click();

      // El aviso de Orre se detecta pero NO se acepta solo. Aceptarlo mueve la cuenta a una zona con
      // reglas distintas, y eso lo decide una persona con el interruptor del panel.
      const aviso = await esperarA(() => {
        const texto = String(document.body.textContent || '');
        return /orre/i.test(texto) && /(deseas entrar|quieres entrar|still want to enter)/i.test(texto)
          ? true : null;
      }, 2000);
      if (aviso && !opciones.orre) {
        return { ok: false, mensaje: 'El destino es de Orre y el permiso está apagado.' };
      }

      const llegada = await esperarA(() => {
        const sitio = String(document.querySelector('.phud-tloc')?.textContent || '');
        return normalizarTexto(sitio).includes(normalizarTexto(destino.nombre)) ? sitio : null;
      });
      return llegada
        ? { ok: true, mensaje: `En ${llegada}` }
        : { ok: false, mensaje: 'Viajé, pero el juego no confirmó la llegada.' };
    } catch (error) {
      return { ok: false, mensaje: error.message || 'Falló el viaje.' };
    }
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
    globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig, leerEstadoPagina, CLAVES, intentarTurno, debeEjecutar, formatearEstado, llamarTelegram, leerCatalogo, viajarA };
    return;
  }

  globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig, leerEstadoPagina, CLAVES, intentarTurno, debeEjecutar, formatearEstado, llamarTelegram, leerCatalogo, viajarA };
})();
