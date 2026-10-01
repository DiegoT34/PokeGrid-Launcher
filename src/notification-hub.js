'use strict';

// Registro central de avisos del launcher.
//
// Vivir en un fichero propio, y no dentro de renderer.js, es deliberado:
// userscripts.js y renderer.js son IIFE distintas sin ámbito compartido, y el hub
// tiene que ser accesible para las dos. Se carga antes que ellas.
//
// El hub es el dueño de todos los badges de sus fuentes, incluida la bolita del
// botón de 3 rayas. Antes el mismo número de la Shop se escribía a mano en tres
// sitios distintos; añadir dos fuentes más así habría sido escribirlo cinco veces.

const AVISOS = Object.freeze([
  // La fuente de la Shop pinta dos badges, no uno: el del botón de Scripts y el de
  // la pestaña "Shop online". Los dos decían lo mismo y los dos tienen que seguir
  // diciéndolo; por eso badgeIds es una lista y no un id suelto.
  Object.freeze({
    id: 'scripts',
    color: 'var(--warning)',
    titulo: 'Shop de scripts',
    dotId: 'hamburgerAvisoDotShop',
    badgeIds: Object.freeze(['scriptsMenuBadge', 'scriptShopUpdateBadge'])
  }),
  Object.freeze({
    id: 'notifications',
    color: 'var(--danger)',
    titulo: 'Notificaciones',
    dotId: 'hamburgerAvisoDotNotas',
    badgeIds: Object.freeze(['notificationBadge'])
  }),
  Object.freeze({
    id: 'updater',
    color: 'var(--success)',
    titulo: 'Actualizaciones del launcher',
    dotId: 'hamburgerAvisoDotActualizador',
    badgeIds: Object.freeze(['updateLauncherBadge'])
  })
]);

// La actualización del launcher no se apaga al mirar: sigue pendiente hasta que se
// instala de verdad. Si se apagara al visitarla, el usuario podría perder la única
// vez que ve que tiene algo pendiente.
const PENDIENTE_SIEMPRE = Object.freeze(['updater']);

const estado = new Map(AVISOS.map((aviso) => [
  aviso.id,
  // vistoHasta es el último recuento que el usuario dio por visto, no un booleano.
  // Con un booleado, marcar como visto fijaba la fuente para siempre: si después
  // llegaba algo nuevo, la bolita no volvía a aparecer. Con un número, lo nuevo
  // supera lo visto y vuelve a avisar.
  Object.assign({}, aviso, { count: 0, vistoHasta: 0 })
]));
const suscriptores = new Set();

function textoContador(count) {
  return count > 99 ? '99+' : String(count);
}

function pendienteDe(aviso) {
  if (aviso.count <= 0) return false;
  return PENDIENTE_SIEMPRE.includes(aviso.id) || aviso.count > aviso.vistoHasta;
}

function pintarUno(aviso) {
  const texto = `${aviso.titulo}: ${aviso.count} pendiente${aviso.count === 1 ? '' : 's'}`;

  const dot = document.getElementById(aviso.dotId);
  if (dot) {
    dot.hidden = !pendienteDe(aviso);
    dot.style.background = aviso.color;
    dot.title = texto;
  }

  // Un id puede no existir todavía: updateLauncherBadge llega en una tarea posterior.
  for (const badgeId of aviso.badgeIds) {
    const badge = document.getElementById(badgeId);
    if (!badge) continue;
    badge.textContent = textoContador(aviso.count);
    badge.hidden = aviso.count === 0;
    badge.style.background = aviso.color;
    badge.style.color = '#17140a';
    badge.title = texto;
    badge.setAttribute('aria-label', texto);
  }
}

function dibujar() {
  for (const aviso of estado.values()) pintarUno(aviso);
  for (const fn of suscriptores) {
    try {
      fn();
    } catch (error) {
      console.error(`[PokeGrid] Un suscriptor de avisos falló: ${error.message}`);
    }
  }
}

const pokeGridNotifications = Object.freeze({
  fuentes: AVISOS,
  set(id, count) {
    const aviso = estado.get(String(id || ''));
    if (!aviso) {
      console.error(`[PokeGrid] Fuente de aviso desconocida: ${id}`);
      return 0;
    }
    const total = Math.max(0, Number(count) || 0);
    aviso.count = total;
    dibujar();
    return total;
  },
  get(id) {
    const aviso = estado.get(String(id || ''));
    return aviso ? Object.assign({}, aviso) : null;
  },
  seen(id) {
    const aviso = estado.get(String(id || ''));
    if (!aviso || PENDIENTE_SIEMPRE.includes(aviso.id)) {
      // Una fuente que queda pendiente siempre no se marca como vista, ni aunque
      // se llame a seen(). Es a propósito y la prueba lo fija.
      return false;
    }
    aviso.vistoHasta = aviso.count;
    dibujar();
    return true;
  },
  limpiar(id) {
    const aviso = estado.get(String(id || ''));
    if (!aviso) return 0;
    const total = aviso.count;
    aviso.count = 0;
    aviso.vistoHasta = 0;
    dibujar();
    return total;
  },
  dibujar,
  alCambiar(fn) {
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }
});

window.POKEGRID_AVISOS = AVISOS;
window.pokeGridNotifications = pokeGridNotifications;

// El badge de la Shop deja de escribirse a mano: pasa a hablar con el hub, que es
// quien lo pinta. Sin esto seguiríamos con tres copias del mismo número en tres
// sitios, y es justo lo que este módulo viene a quitar.
window.__pokeGridBadgeLegacy = function badgeLegacy(element, total, title) {
  if (!element) return;
  element.textContent = textoContador(total);
  element.hidden = total === 0;
  element.title = title;
  element.setAttribute('aria-label', title);
};