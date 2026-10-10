// Siembra cuentas por la ventana de cuentas, que es la vía normal del launcher para crearlas.
//
// Por qué hace falta: estas suites no creaban ninguna cuenta. Se apoyaban en que el lector de
// credenciales se inventaba cuatro cuentas cuando no había fichero, y de ahí salían los cuatro
// paneles que todas esperan. Eso era justo el fallo que hacía que un perfil vacío abriera
// cuatro juegos —cuatro `<webview>` cargando el juego— y se quedara con ellos para siempre.
// Ahora, sin fichero, no hay cuentas; así que las pruebas las crean.
//
// Se crean por el modal y no escribiendo `accounts.enc` a mano porque ese fichero va cifrado
// con el cifrado del sistema, que solo existe con la aplicación ya arrancada, y porque el
// modal es lo que usa el usuario. Al guardar, cada cuenta tiene un panel.
//
// NO se rellenan usuario ni contraseña a propósito: las cuentas inventadas que había antes
// tampoco los tenían, y ponerlos haría que el launcher intentara entrar de verdad con
// credenciales falsas. Lo que se reproduce es el estado de antes —cuatro cuentas con su
// etiqueta y sin credenciales— sin inventárselas por detrás.
'use strict';

// Deja la ventana con `cuantas` cuentas guardadas y espera a que sus paneles existan.
async function sembrarCuentas(ventana, cuantas = 4, { esperaMs = 20_000 } = {}) {
  const arranque = Date.now();
  let estado = null;
  while (Date.now() - arranque < esperaMs) {
    estado = await ventana.webContents.executeJavaScript(`(async () => {
      const fondo = document.getElementById('modalBackdrop');
      // Sin cuentas guardadas el launcher abre la ventana por su cuenta, con filas en blanco.
      if (fondo.hidden) document.getElementById('accountsButton').click();
      await new Promise((r) => setTimeout(r, 250));
      while (document.querySelectorAll('.account-row').length < ${cuantas}) {
        const anadir = document.querySelector('#accountRowActions button');
        if (!anadir) break;
        anadir.click();
        await new Promise((r) => setTimeout(r, 80));
      }
      const filas = document.querySelectorAll('.account-row').length;
      if (filas >= ${cuantas}) {
        document.querySelector('#accountsForm').requestSubmit();
        await new Promise((r) => setTimeout(r, 900));
      }
      return {
        filas,
        paneles: document.querySelectorAll('#grid .panel').length,
        mensaje: document.getElementById('modalMessage').textContent
      };
    })()`);
    if (estado.paneles >= cuantas) return estado;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No se pudieron sembrar ${cuantas} cuentas: ${JSON.stringify(estado)}`);
}

module.exports = { sembrarCuentas };
