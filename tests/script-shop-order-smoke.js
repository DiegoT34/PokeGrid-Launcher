const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { orderShopCatalog, publicationDate } = require('../src/script-shop-order');

const item = (over) => ({
  id: 'x', name: 'X', featured: false, publishedAt: '2026-01-01T00:00:00Z', ...over
});

// Destacados primero, y dentro de cada grupo de más reciente a más antigua.
const orden = orderShopCatalog([
  item({ id: 'a', name: 'Antiguo', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'b', name: 'Reciente', publishedAt: '2026-09-01T00:00:00Z' }),
  item({ id: 'c', name: 'Destacado viejo', featured: true, publishedAt: '2025-01-01T00:00:00Z' }),
  item({ id: 'd', name: 'Destacado nuevo', featured: true, publishedAt: '2026-05-01T00:00:00Z' })
]);
assert.deepEqual(orden.map((i) => i.id), ['d', 'c', 'b', 'a'],
  `Destacados primero y por fecha dentro. Orden obtenido: ${orden.map((i) => i.id).join(', ')}`);

// Sin publishedAt va al final, porque no se sabe cuándo se publicó.
const sinFecha = orderShopCatalog([
  item({ id: 'con', name: 'Con fecha', publishedAt: '2020-01-01T00:00:00Z' }),
  item({ id: 'sin', name: 'Sin fecha', publishedAt: '' })
]);
assert.deepEqual(sinFecha.map((i) => i.id), ['con', 'sin'], 'Sin publishedAt va al final.');

// Y da igual cómo se llame. Una entrada sin fecha tiene que caer al final aunque su
// nombre se ordenara antes que el de la que sí lo tiene: si el desempate por nombre
// se cuela aquí, el nombre pasa a mandar sobre la fecha. Esta es la forma en que se
// cuela un -infinito por la puerta de atrás: -infinito menos una fecha sigue siendo
// -infinito, que no es un número finito, y un `Number.isFinite` lo confunde con el
// caso del otro.
const nombrePrimero = orderShopCatalog([
  item({ id: 'aaa', name: 'AAA', publishedAt: '' }),
  item({ id: 'zzz', name: 'ZZZ', publishedAt: '2020-01-01T00:00:00Z' })
]);
assert.deepEqual(nombrePrimero.map((i) => i.id), ['zzz', 'aaa'],
  `Sin fecha va al final aunque su nombre se ordene antes. Orden obtenido: ${nombrePrimero.map((i) => i.id).join(', ')}`);

// Una fecha que no se entiende también cae al final, y sin reventar.
const invalida = orderShopCatalog([
  item({ id: 'buena', name: 'Buena', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'mala', name: 'Mala', publishedAt: 'no-es-una-fecha' })
]);
assert.deepEqual(invalida.map((i) => i.id), ['buena', 'mala'], 'Una publishedAt inválida cae al final, no revienta.');

// featured ordena esté venga como booleano, texto o número.
const banderas = orderShopCatalog([
  item({ id: 'f', featured: false, name: 'F' }),
  item({ id: 't', featured: true, name: 'T' }),
  item({ id: 'x', featured: 'sí', name: 'X' })
]);
assert.deepEqual(banderas.map((i) => i.id), ['t', 'x', 'f'], 'featured ordena venga como venga.');

// Empate de fecha: desempate por nombre, para que el orden sea estable.
const empate = orderShopCatalog([
  item({ id: 'z', name: 'Zeta', publishedAt: '2026-01-01T00:00:00Z' }),
  item({ id: 'a', name: 'Alfa', publishedAt: '2026-01-01T00:00:00Z' })
]);
assert.deepEqual(empate.map((i) => i.id), ['a', 'z'], 'Con la misma fecha el orden tiene que ser estable.');

// No muta la entrada: el llamante no puede verse afectado.
const entrada = [
  item({ id: 'b', name: 'B', publishedAt: '2026-05-01T00:00:00Z' }),
  item({ id: 'a', name: 'A', publishedAt: '2026-06-01T00:00:00Z' })
];
const copia = entrada.map((i) => i.id);
orderShopCatalog(entrada);
assert.deepEqual(entrada.map((i) => i.id), copia, 'No se puede mutar el array recibido.');

// Tampoco puede reordenar en sitio cuando el llamante pasa algo que no es un array.
for (const raro of [null, undefined, 'texto', 42, {}]) {
  assert.deepEqual(orderShopCatalog(raro), [], `Con ${JSON.stringify(raro) ?? 'undefined'} tiene que devolver una lista vacía.`);
}

assert.equal(publicationDate({ publishedAt: '1970-01-02T00:00:00Z' }), 86400000, 'publicationDate devuelve milisegundos.');
assert.equal(publicationDate({}), Number.NEGATIVE_INFINITY, 'Sin fecha vale -infinito, para que caiga al final.');
assert.equal(publicationDate({ publishedAt: 'basura' }), Number.NEGATIVE_INFINITY, 'Una fecha que no se entiende vale -infinito.');
assert.equal(publicationDate(null), Number.NEGATIVE_INFINITY, 'Sobre null no revienta.');

// --- El modulo tiene que estar de verdad en el camino del catalogo ---------------------
// Lo de arriba comprueba que la función ordena bien. Esto comprueba que se usa. La
// diferencia importa: si el cableado se rompe, la función sigue siendo correcta, sus
// pruebas siguen en verde, y el catálogo sigue saliendo en el orden viejo sin que
// nadie entienda por qué. El sort viejo ordenaba por destacados y nombre, así que el
// síntoma sería "las más recientes no salen arriba" y nada más.
{
  const main = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
  assert.match(main, /const \{ orderShopCatalog \} = require\('\.\/script-shop-order'\);/,
    'src/main.js tiene que pedir el modulo de orden.');
  assert.match(main, /scripts: orderShopCatalog\(scripts\)/,
    'src/main.js tiene que ordenar el catalogo con orderShopCatalog.');
  assert.doesNotMatch(main, /scripts\.sort\(/,
    'El sort viejo sigue en src/main.js. Si se queda junto al nuevo gana el viejo y todo esto pasa en verde sin cambiar nada.');
  assert.doesNotMatch(main, /Number\(b\.featured\)\s*-\s*Number\(a\.featured\)/,
    'El orden viejo por destacados sigue en src/main.js.');
  // publishedAt tenía que estar en la lista blanca para que el orden por fecha tenga
  // algo que leer. Si alguien la quita, el módulo sigue verde y el catálogo, no.
  const publicado = /publishedAt/.test(main);
  assert.ok(publicado, 'publishedAt tiene que seguir llegando al catalogo normalizado, o el orden por fecha no tiene de donde leer.');
}

console.log('Script shop order smoke passed: destacados, fecha, sin fecha, fecha invalida, empate y no mutacion. Y el modulo esta en el camino del catalogo.');