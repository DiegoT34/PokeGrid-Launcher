const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'styles.css'), 'utf8');

// --- Los ocho tokens existen ---------------------------------------------------
for (const token of [
  '--glass-bg', '--glass-edge', '--glass-fill', '--glass-line',
  '--glass-shine', '--glass-sombra', '--glass-filtro', '--glass-radio'
]) {
  const re = new RegExp(`${token}:`);
  assert.ok(re.test(styles), `Falta el token ${token} en :root.`);
}

// --- Una sola regla compartida por los tres -----------------------------------
// Si el cristal se define en tres sitios, los tres Ends son tres cristales
// parecidos que divergen en seis meses. Lo que se busca es UNA regla agrupada.
const agrupada = /\.hunt-float-panel,\s*\r?\n\.capture-float-panel,\s*\r?\n\.account-info-card\s*\{[^}]*var\(--glass-bg\)[^}]*var\(--glass-edge\)[^}]*var\(--glass-sombra\)[^}]*var\(--glass-filtro\)/;
assert.ok(agrupada.test(styles),
  'Los tres paneles tienen que compartir una sola regla con el material, no tres.');

// --- El reflejo del borde superior --------------------------------------------
const reflejo = /\.hunt-float-panel::before,\s*\r?\n\.capture-float-panel::before,\s*\r?\n\.account-info-card::before\s*\{[^}]*var\(--glass-shine\)/;
assert.ok(reflejo.test(styles),
  'Falta el reflejo del borde superior compartido, que es lo que hace que se lea como vidrio y no como un rectángulo oscuro.');

// --- Y viene DESPUÉS de los fondos planos, o no gana --------------------------
// Los tres paneles tenían su color propio con la misma especificidad, así que la
// regla compartida solo gana por orden de fuente. Si alguien la mueve arriba, el
// cristal deja de verse y nada falla.
const inicioCompartida = styles.indexOf('.hunt-float-panel,\n.capture-float-panel,\n.account-info-card {');
assert.ok(inicioCompartida > 0, 'No encuentro la regla compartida.');

for (const selector of ['.hunt-float-panel', '.capture-float-panel', '.account-info-card']) {
  const i = styles.indexOf(`${selector} {`);
  assert.ok(i > 0, `No encuentro el bloque plano de ${selector}.`);
  assert.ok(i < inicioCompartida,
    `El bloque plano de ${selector} está DESPUÉS de la regla compartida: con la misma especificidad, gana el plano y no se ve cristal.`);

  // Y tiene que tener un fondo propio plano que la regla compartida tenga que pisar.
  const bloque = styles.slice(i, styles.indexOf('}', i));
  assert.ok(/background:\s*(#|rgba?\()/.test(bloque),
    `El bloque plano de ${selector} ya no tiene un color propio: puede que la regla compartida esté antes y esto no compruebe nada.`);
}

// --- Los tres están en el grupo -----------------------------------------------
const grupo = styles.slice(inicioCompartida, styles.indexOf('}', inicioCompartida));
const selectores = grupo.slice(0, grupo.indexOf('{'));
for (const selector of ['.hunt-float-panel', '.capture-float-panel', '.account-info-card']) {
  assert.ok(selectores.includes(selector),
    `${selector} no está en el grupo del material. El grupo solo tiene: ${selectores.trim().split('\n').join(' | ')}`);
}
assert.ok(/border-color:\s*var\(--glass-edge\)/.test(grupo), 'El grupo tiene que usar var(--glass-edge) para el borde.');
assert.ok(/background:\s*var\(--glass-bg\)/.test(grupo), 'El grupo tiene que usar var(--glass-bg) para el fondo.');

// --- backdrop-filter con saturación, no solo blur ----------------------------
// Un blur sin saturación deja el color de detrás apagado, y el cristal se ve sucio.
const backdrop = styles.match(/backdrop-filter:[^;]+/g) || [];
assert.ok(backdrop.some((una) => /var\(--glass-filtro\)/.test(una)),
  `El material compartido tiene que llevar backdrop-filter: var(--glass-filtro). Se han encontrado: ${JSON.stringify(backdrop.slice(0, 8))}`);

// --- El detalle es más denso que el panel -------------------------------------
// Para leerse por encima del panel sin necesitar un borde grueso que rompa el
// material. Y tiene que ser su propio material, no el del panel.
const popover = styles.slice(styles.indexOf('.capture-detail-popover {'));
const bloquePopover = popover.slice(0, popover.indexOf('}'));
assert.ok(/background:\s*linear-gradient/.test(bloquePopover) || /background:\s*var\(--glass-/.test(bloquePopover),
  'El detalle tiene que tener su propio fondo, más denso que el del panel.');
assert.ok(/backdrop-filter/.test(bloquePopover),
  'El detalle necesita su propio backdrop-filter, más fuerte que el del panel.');
assert.equal(/position:\s*absolute/.test(bloquePopover), false,
  'El popover sigue en absolute. La Tarea 6 lo pone como hermano de su fila, y eso necesita position static.');

// --- El techo técnico, escrito en el CSS para que nadie lo "arregle" ----------
assert.ok(/backdrop-filter/.test(styles) && !/backdrop-filter:[^;]*poke\.idleworld/.test(styles),
  'Comprobación de coherencia del techo técnico.');

// --- Las filas y baldosas son vidrio apilado ----------------------------------
// El token puede existir y no usarse: eso sería una comprobación que no vigila
// nada. Estas sí miran el bloque real.
for (const selector of ['.capture-flat-row', '.hunt-flat-metric', '.account-info-metric']) {
  let bloqueConCristal = 0;
  let i = styles.indexOf(`${selector} {`);
  while (i > 0) {
    const fin = styles.indexOf('}', i);
    if (styles.slice(i, fin).includes('var(--glass-fill)')) bloqueConCristal++;
    i = styles.indexOf(`${selector} {`, fin);
  }
  assert.ok(bloqueConCristal > 0,
    `${selector} no usa var(--glass-fill) en ningún bloque. El token puede existir y no usarse, y eso no vigila nada.`);
}

console.log('Glass material smoke passed: ocho tokens, una regla compartida, reflejo, tres paneles y detalle más denso.');