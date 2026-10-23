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

  // --- Para las pruebas -----------------------------------------------------
  //
  // Sin `document` no hay pagina que decorar: el script solo tiene que dejar sus funciones puras a
  // mano. Es la unica concesion que se hace por poder probarlo, y no cambia nada en produccion.
  //
  // ESTE BLOQUE VA AL FINAL DEL IIFE, siempre. Las tareas siguientes anaden funciones y las suman a
  // estas dos listas; si el bloque se quedara en medio, el `return` cortaria el script antes de
  // definirlas y el bot arrancaria sin viaje ni lector.
  if (typeof document === 'undefined') {
    globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig };
    return;
  }

  globalThis.__pgControl = { parsearComando, parsearCallback, autorizado, buscarHunts, normalizarConfig };
})();
