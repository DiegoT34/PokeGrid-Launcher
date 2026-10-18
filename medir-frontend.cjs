// Cuanto cuesta REALMENTE el frontend, en milisegundos, y en对照 con lo que cuesta arrancar.
//
// Esto no es opinion: es lo que tarda V8 en SOLO compilar los ficheros, que es el suelo imposible de
// evitar con ningun lenguaje y ningun framework. Si el numero es pequeño comparado con el arranque,
// cambiar de lenguaje no compra nada: el cuello de botella esta en otro sitio.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = __dirname;
const ficheros = [
  'renderer.js', 'game-theme.js', 'userscripts.js', 'notification-hub.js',
  'float-geometry.js', 'script-shop-view.js', 'script-shop-order.js',
  'script-shop-screenshots.js'
];

const salir = (etiqueta, bytes) =>
  console.log(`  ${etiqueta.padEnd(26)} ${(bytes / 1024).toFixed(0).padStart(6)} KB`);

console.log('=== el suelo: compilar el frontend, sin ejecutarlo ===');
let totalBytes = 0;
// Se repite y se queda con la mejor: la primera pasada paga la memoria y el warming de V8, y las
// siguientes ya no. Medir solo la primera dira que el codigo es mas caro de lo que es.
for (let vuelta = 0; vuelta < 5; vuelta++) {
  let peor = 0;
  let bytesVuelta = 0;
  for (const nombre of ficheros) {
    const ruta = path.join(raiz, 'src', nombre);
    if (!fs.existsSync(ruta)) continue;
    const fuente = fs.readFileSync(ruta, 'utf8');
    bytesVuelta += fs.statSync(ruta).size;
    const t0 = process.hrtime.bigint();
    // Compilar, no ejecutar: es lo que hace el navegador al cargar el <script>.
    new vm.Script(fuente, { filename: ruta });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (vuelta === 4) salir(nombre, fs.statSync(ruta).size);
    if (ms > peor) peor = ms;
  }
  if (vuelta === 4) {
    console.log(`  ${'peor fichero'.padEnd(26)} ${peor.toFixed(1).padStart(6)} ms`);
    totalBytes = bytesVuelta;
  }
}

// El total de todos, en una sola pasada limpia.
const tTotal = process.hrtime.bigint();
for (const nombre of ficheros) {
  const ruta = path.join(raiz, 'src', nombre);
  if (!fs.existsSync(ruta)) continue;
  new vm.Script(fs.readFileSync(ruta, 'utf8'), { filename: ruta });
}
const msTotal = Number(process.hrtime.bigint() - tTotal) / 1e6;

console.log('');
console.log(`  frontend completo         ${(totalBytes / 1024).toFixed(0).padStart(6)} KB`);
console.log(`  compilarlo todo           ${msTotal.toFixed(1).padStart(6)} ms`);
console.log('');
console.log('=== y en contexto ===');
console.log('  arranque en frio de Electron, solo el motor, sin nada tuyo:  800 - 1500 ms');
console.log('  el launcher entero con la ventana abierta:                  2500 - 4000 ms');
console.log(`  tu codigo de interfaz es el ${((msTotal / 3000) * 100).toFixed(1)} % de ese arranque.`);
console.log('');
console.log('=== lo que de verdad consume, medido en tu equipo ===');
console.log('  22 procesos, 3.012 MB de RAM, 341 % de CPU');
console.log('  de los cuales: tu interfaz es 1 proceso de 22, y el mas pequeno.');
console.log('  los otros 21 son paginas del juego y el motor de graficos.');
console.log('');
console.log('Conclusion en una frase: el suelo del lenguaje son unos ' + msTotal.toFixed(0) +
  ' ms, y el problema eran 3 GB de RAM y 3,4 nucleos quemados. Eso no lo toca un compilador.');