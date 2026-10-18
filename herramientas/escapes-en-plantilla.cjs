// Busca escapes de expresiones regulares que viajan dentro de una plantilla.
//
// EL FALLO, EXPLICADO CON UN EJEMPLO QUE PASO DE VERDAD
//
// En una prueba se escribio:
//
//     bundledNamespace: /@namespace\s+pokegrid\.telegram-alerts/.test(codigo),
//
// dentro de una plantilla `executeJavaScript(\`...\`)`. La comprobacion daba `false`, el modulo de
// Telegram «no traia el namespace», y el codigo de la pagina estaba bien: lo traia, con el texto
// exacto.
//
// El motivo es que una plantilla no distingue el texto de una expresion regular del suyo propio. Al
// construir la cadena, `\s` se convierte en un ESPACIO de verdad y `\.` se convierte en `.`. Lo que
// llega al navegador no es la expresion que se ha escrito, es otra:
//
//     escrito:  /@namespace\s+pokegrid\.telegram-alerts/   (busca un espacio, un punto)
//     recibido: /@namespace +pokegrid.telegram-alerts/    (busca un o mas espacios, cualquier cosa)
//
// Que ademas es MAS permisiva, asi que falla por lo opuesto a lo que uno espera: no es que no encuentre
// nada, es que las dos expresiones no son la misma.
//
// ESTE GUION DICE DONDE HAY QUE TENER CUIDADO
//
// Busca, dentro de las plantillas, los `/.../ ` que llevan escapes de regex. Y distingue los dos
// casos:
//
//  - `\` seguido de una letra o un digito que NO es un escape conocido (`\d`, `\s`, `\w`, `\n`…):
//    dentro de una plantilla se convierte en otro caracter y la expresion cambia de significado.
//    Eso es un fallo seguro.
//
//  - La forma larga `\\.` y `\\s`: en una plantilla produce `\.` y `\s`, que es lo que se quiere. NO es
//    un fallo, y no se avisa de eso, o el guion acaba quejandose de codigo que esta bien.
//
// El aviso es para el primer caso, y para el segundo solo dice cuantas hay, sin fallar: asi se ve el
// numero y se decide uno a uno.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const GRAVE = String.fromCharCode(96);
const BARRA = String.fromCharCode(92);

// Los escapes que una plantilla SI entiende, y que dejan el mismo caracter.
const CONOCIDOS = /[btnvfrs0ux]/;

const ficheros = process.argv.slice(2);
if (!ficheros.length) {
  console.log('uso: node escapes-en-plantilla.cjs <fichero> [...]');
  process.exit(2);
}

let sospechosos = 0;
let formasLargas = 0;

for (const nombre of ficheros) {
  const completa = path.join(RAIZ, nombre);
  if (!fs.existsSync(completa)) {
    console.log(`  no existe: ${nombre}`);
    continue;
  }
  const lineas = fs.readFileSync(completa, 'utf8').split('\n');

  // Se recorren los tramos que estan dentro de una plantilla delimitada por acentos graves.
  let dentroDePlantilla = false;

  lineas.forEach((linea, indice) => {
    const graves = linea.split(GRAVE).length - 1;
    if (graves === 0) {
      if (dentroDePlantilla) dentroDePlantilla = false;
      return;
    }

    for (const trozo of linea.split(GRAVE)) {
      // Solo interesan los trozos con una barra: el resto no puede romper nada.
      if (!trozo.includes(BARRA)) continue;

      // Forma larga: `\\.` produce `\.`. Correcta, pero conviene saber que esta ahi.
      const largas = trozo.match(new RegExp(`${BARRA}${BARRA}[a-zA-Z0-9]`, 'g')) || [];
      if (largas.length && dentroDePlantilla) formasLargas += largas.length;

      // Forma corta: `\d`, `\s`… sin doblar. En una plantilla cambia de caracter y rompe la expresion.
      const cortas = trozo.match(new RegExp(`${BARRA}([a-zA-Z0-9])`, 'g')) || [];
      for (const corta of cortas) {
        if (largas.includes(corta + corta)) continue;
        if (CONOCIDOS.test(corta[1])) continue; // \n, \t… en una plantilla son el caracter de verdad
        sospechosos++;
        console.log(`  ${nombre}:L${indice + 1}  ${corta}  ·  ${linea.trim().slice(0, 78)}`);
      }
    }
    dentroDePlantilla = true;
  });
}

console.log(`\nescapes cortos dentro de plantillas: ${sospechosos}`);
console.log(`formas largas (correctas, se dejan): ${formasLargas}`);
console.log(sospechosos
  ? '\nLos cortos se convierten en otro caracter al construir la plantilla.'
  : '\nNo hay escapes cortos dentro de plantillas.');