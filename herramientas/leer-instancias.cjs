// Lee la lista de instancias guardadas de donde vive de verdad: el localStorage de la ventana
// principal, que en disco es un leveldb con los valores metidos en crudo.
//
// Hace falta para comparar lo guardado con lo que hay en disco. Diecisiete particiones de instancia
// para un maximo de doce instancias guardadas significa que hay particiones de instancias que ya no
// existen — y esas no se limpian solas.
//
// El leveldb esta bloqueado mientras el launcher esta abierto, asi que se copia antes de leer.
// Copiar solo el .log y el .ldb pequeno; los .ldb grandes se ignoran si estan pillados.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const RAIZ = process.env.APPDATA || path.join(String(process.env.USERPROFILE || ''), 'AppData', 'Roaming');
const nivel = path.join(RAIZ, 'pokegrid-launcher', 'Local Storage', 'leveldb');

if (!fs.existsSync(nivel)) {
  console.log('no esta el leveldb en ' + nivel);
  process.exit(1);
}

const CLAVE = 'pokegrid:browser-instances:v1';
const caleta = fs.mkdtempSync(path.join(os.tmpdir(), 'pokegrid-lvl-'));
let encontrado = null;
let leidos = 0;

// El valor es un ARRAY, no un objeto: hay que buscar el '[' y contar corchetes hasta cerrarlo.
// Con buscar '{' me comia el primer objeto suelto y nunca llegaba a ver la lista entera.
function buscarEn(texto) {
  let i = texto.indexOf(CLAVE);
  while (i >= 0) {
    const desde = texto.indexOf('[', i + CLAVE.length);
    if (desde < 0) return;
    let fondo = 0;
    let cierre = -1;
    const tope = Math.min(texto.length, desde + 200000);
    for (let k = desde; k < tope; k++) {
      const c = texto[k];
      if (c === '[') fondo++;
      else if (c === ']') {
        fondo--;
        if (fondo === 0) { cierre = k + 1; break; }
      }
    }
    if (cierre > 0) {
      try {
        const lista = JSON.parse(texto.slice(desde, cierre));
        if (Array.isArray(lista) && lista.length) encontrado = lista;
      } catch { /* el niveldb mete ruido alrededor: se prueba el siguiente corte */ }
    }
    i = texto.indexOf(CLAVE, i + CLAVE.length);
  }
}

for (const nombre of fs.readdirSync(nivel)) {
  if (!/\.(log|ldb)$/.test(nombre)) continue;
  const ruta = path.join(nivel, nombre);
  const copia = path.join(caleta, nombre);
  try {
    fs.copyFileSync(ruta, copia);
  } catch {
    continue; // pillado por el launcher: otro fichero nos dira lo mismo
  }
  leidos++;
  buscarEn(fs.readFileSync(copia, 'latin1'));
}

fs.rmSync(caleta, { recursive: true, force: true });

if (!encontrado) {
  console.log('ficheros leidos: ' + leidos + ' — no se ha podido leer la lista de instancias');
  process.exit(1);
}

console.log('instancias guardadas: ' + encontrado.length);
for (const fila of encontrado) {
  console.log('  ' + String(fila.id).padEnd(38) + String(fila.count == null ? '?' : fila.count).padStart(3)
    + ' pantallas  ' + String(fila.modo || 'instancia').padEnd(10) + '  ' + (fila.name || ''));
}

const porUuid = new Set(encontrado.map((f) => String(f.id || '').replace(/-(\d+)$/, '')));
console.log('ids distintos guardados: ' + porUuid.size);