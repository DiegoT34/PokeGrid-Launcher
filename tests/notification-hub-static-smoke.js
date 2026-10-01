const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fuente = fs.readFileSync(path.join(__dirname, '..', 'src', 'notification-hub.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');

// Las tres fuentes, cada una con su color. Este requisito entero se pierde en un
// refactor si nadie lo mira, porque en runtime dos colores iguales no fallan nada.
for (const [id, color] of [['scripts', 'var(--warning)'], ['notifications', 'var(--danger)'], ['updater', 'var(--success)']]) {
  assert.ok(fuente.includes(`id: '${id}'`), `Falta la fuente '${id}' en el registro.`);
  assert.ok(fuente.includes(color), `La fuente '${id}' no usa ${color}.`);
}

const colores = fuente.match(/var\(--(warning|danger|success)\)/g) || [];
assert.equal(new Set(colores).size, 3,
  `Las tres fuentes tienen que usar tres colores distintos. Hay ${colores.length} apariciones y ${new Set(colores).size} distintos.`);

// Las tres bolitas existen siempre en el DOM, en orden fijo.
const bolitas = html.match(/id="hamburgerAvisoDot(?:Shop|Notas|Actualizador)"/g) || [];
assert.equal(bolitas.length, 3, `Se esperaban 3 bolitas en el botón del menú, hay ${bolitas.length}.`);
assert.deepEqual(bolitas, [
  'id="hamburgerAvisoDotShop"',
  'id="hamburgerAvisoDotNotas"',
  'id="hamburgerAvisoDotActualizador"'
], 'Las bolitas tienen que estar en orden fijo: shop, notificaciones, actualizador.');

// El hub se carga antes que los dos módulos que van a publicar en el.
const orden = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const hub = orden.indexOf('notification-hub.js');
assert.ok(hub > -1, 'No se carga notification-hub.js.');
assert.ok(hub < orden.indexOf('userscripts.js') && hub < orden.indexOf('renderer.js'),
  `notification-hub.js tiene que cargarse antes que los dos módulos. Orden actual: ${orden.join(', ')}`);

console.log('Notification hub static smoke passed: 3 fuentes, 3 colores, 3 bolitas en orden.');