// Las dos que faltaban del dialogo: el titulo en el oyente y el preload.
//
// El ancla del oyente la escribi de memoria y ya no existia: desde que el oyente pide la imagen por
// `pedirIconoAlProceso`, el `respuesta?.ok ? ...` de antes se fue. Otra vez lo mismo: leer el
// fichero antes de escribir el ancla, no recordarla.
const fs = require('node:fs');
const path = require('node:path');

const cambios = [];
const editar = (rel, pares) => {
  const ruta = path.join(__dirname, rel);
  let texto = fs.readFileSync(ruta, 'utf8').split('\r\n').join('\n');
  for (const par of pares) {
    if (!Array.isArray(par) || par.length < 2) {
      throw new Error('Un par sin el texto de reemplazo se escribe como "undefined". En ' + rel + '.');
    }
    const [antes, despues, que] = par;
    if (typeof despues !== 'string') throw new Error('El reemplazo de ' + rel + ' no es cadena.');
    if (!texto.includes(antes)) throw new Error('El ancla no casa en ' + rel + ' (' + que + ').');
    if ((texto.split(antes).length - 1) !== 1) throw new Error('El ancla no es unica en ' + rel + ' (' + que + ').');
    texto = texto.replace(antes, despues);
    cambios.push(rel + ': ' + (que || 'sin etiqueta'));
  }
  fs.writeFileSync(ruta, texto.replace(/\n/g, '\r\n'), 'utf8');
};

editar('src/renderer.js', [[
  [
    "      avisoDeIcono({ url }, dataUrl || '', instanceId);",
    '    }).catch(() => {});'
  ].join('\n'),
  [
    "      avisoDeIcono({ url }, dataUrl || '', instanceId);",
    '    }).catch(() => {});',
    '    // Y el nombre, si la pagina lo trae. Va aqui y no en otro canal porque el aviso ya viaja',
    '    // una vez por documento: el titulo y el icono llegan juntos, o no llega ninguno.',
    '    tituloDePagina(panel, evento.args?.[0]?.titulo);'
  ].join('\n'),
  'el titulo llega con el aviso del icono'
]]);

editar('src/instancia-rueda-preload.js', [[
  "  ipcRenderer.sendToHost('instancia:favicon', { url: absoluta });",
  "  ipcRenderer.sendToHost('instancia:favicon', { url: absoluta, titulo: document.title });",
  'el preload manda tambien el titulo'
]]);

console.log('cambios aplicados:');
for (const c of cambios) console.log('  · ' + c);
console.log('\n' + cambios.length + ' cambios');
