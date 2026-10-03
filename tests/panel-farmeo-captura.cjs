// Levanta el panel de Modo Farmeo de verdad: el HTML del launcher, el CSS del
// launcher y el mismo código que construye las tarjetas, y saca una captura.
//
// No es una maqueta: es el panel con los estilos nuevos ya dentro del proyecto.
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

// El script vive en `tests/`, así que la raíz del proyecto es un nivel arriba. Con
// `path.join(__dirname, 'src', …)` buscaba `tests/src/index.html` y Electron se
// quedaba colgado sin decir dónde.
const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'panel-farmeo.png');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const ventana = new BrowserWindow({
    show: false,
    width: 1400,
    height: 900,
    webPreferences: { preload: path.join(RAIZ, 'src', 'preload.js'), contextIsolation: true }
  });

  const errores = [];
  ventana.webContents.on('console-message', (evento) => {
    const params = evento && evento.message !== undefined ? evento : null;
    const mensaje = params ? params.message : String(evento);
    if (params && params.level >= 2) errores.push(mensaje);
    if (/before initialization|is not a function|Cannot access|Uncaught/.test(mensaje)) {
      console.log(`[error] ${mensaje}`);
    }
  });

  await ventana.loadFile(path.join(RAIZ, 'src', 'index.html'));
  await new Promise((r) => setTimeout(r, 3000));

  // Se pinta el panel con datos de mentira y se mide. Es lo mismo que hace
  // `renderFarmAccounts`, pero con valores fijos: no hace falta un juego detrás.
  const medidas = await ventana.webContents.executeJavaScript(`(async () => {
    const backdrop = document.getElementById('farmBackdrop');
    backdrop.hidden = false;

    // Los iconos de la barra, con la misma función que usa el launcher.
    const ICONOS = {
      '#rereadFarmLeadersButton': 'refresh',
      '#refreshFarmButton': 'map'
    };
    const paths = (n) => ({
      refresh: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
      map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
      stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
      chevron: '<path d="m9 6 6 6-6 6"/>',
      play: '<path d="M6 4.5v15l13-7.5z"/>'
    })[n] || '';
    const ic = (n) => '<svg class="launcher-ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + paths(n) + '</svg>';
    for (const [sel, n] of Object.entries(ICONOS)) {
      const h = document.querySelector(sel).querySelector('.top-action-icon');
      h.classList.add('menu-svg-icon');
      h.innerHTML = ic(n);
    }
    document.querySelector('#stopFarmButton .top-action-icon').innerHTML = ic('stop');
    document.getElementById('farmGlobalState').textContent = '451 zonas disponibles';

    // Cuatro tarjetas con el marcado que construye renderFarmAccounts.
    const CUENTAS = [
      { i: '02', n: 'SHOKAVIN', m: 'SHOKCVIN · Nivel 391 · Furious Slarmory', nv: 375, fz: 8644, vd: '317/1596', s: [833, 1098, 955, 698, 734, 631] },
      { i: '03', n: 'SHOKAVIN', m: 'SHOKAVIN · Nivel 317 · Furious Slarmory', nv: 303, fz: 6632, vd: '5532/7392', s: [616, 794, 794, 515, 600, 488] },
      { i: '01', n: 'SHOCKVOR', m: 'SHOCKVOR · Nivel 345 · Furious Slarmory', nv: 318, fz: 7276, vd: '2802/7200', s: [600, 936, 926, 473, 657, 450] },
      { i: '04', n: 'DIEGO200', m: 'DIEGO200 · Nivel 342 · Furious Slarmory', nv: 320, fz: 8961, vd: '5535/8628', s: [719, 831, 900, 579, 598, 413] }
    ];
    const disco = (t) => '<span class="farm-sprite" style="width:34px;height:34px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#e8cf7a,' + t + ' 62%,#7a6412)"></span>';
    document.getElementById('farmAccountGrid').innerHTML = CUENTAS.map((c) => {
      const est = [['PS', c.s[0]], ['ATQ', c.s[1]], ['DEF', c.s[2]], ['ATA', c.s[3]], ['DEF ESP', c.s[4]], ['VEL', c.s[5]]];
      return '<article class="farm-account">' +
        '<div class="farm-account-head"><div class="farm-account-name"><span class="farm-account-index">' + c.i + '</span><div><strong>' + c.n + '</strong><span class="farm-account-meta">' + c.m + '</span></div></div>' +
        '<div class="farm-account-head-actions"><button class="farm-leader-refresh">' + ic('refresh') + '</button><label class="farm-enable"><input type="checkbox" checked><span></span></label></div></div>' +
        '<section class="farm-leader-card">' +
        '<span class="farm-leader-visual">' + disco('#c9a227') + '</span>' +
        '<div class="farm-leader-copy"><span class="farm-leader-eyebrow">Líder equipado</span><strong>Golem</strong>' +
        '<div class="farm-leader-types"><span data-type="rock">Roca</span><span data-type="ground">Tierra</span></div></div>' +
        '<div class="farm-leader-stats"><span><small>Nivel</small><b>' + c.nv + '</b></span><span><small>Fuerza</small><b>' + c.fz + '</b></span><span><small>Vida</small><b>' + c.vd + '</b></span></div>' +
        '<div class="farm-leader-detail-stats">' + est.map((e) => '<span><small>' + e[0] + '</small><b>' + e[1] + '</b></span>').join('') + '</div>' +
        '<div class="farm-leader-tms is-empty"><small>MT equipadas</small><span class="farm-leader-tm-empty">' + ic('stop') + 'Sin MT detectadas</span></div>' +
        '</section>' +
        '<div class="farm-account-body">' +
        '<button class="farm-target-button">' + disco('#d9d9d9').replace('34px', '30px') + '<span class="farm-target-copy"><strong>Furious Slarmory</strong><small>Outlandia · Nivel 150 · Muy recomendado 82%</small></span><span class="farm-target-arrow">' + ic('chevron') + '</span></button>' +
        '<button class="button button-farm farm-account-action">' + ic('play') + '</button>' +
        '</div></article>';
    }).join('');

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rej = document.getElementById('farmAccountGrid');
    const tar = document.querySelector('.farm-account');
    const titulo = document.querySelector('.farm-heading-copy h1').getBoundingClientRect();
    const cabeza = document.querySelector('.farm-heading').getBoundingClientRect();
    return {
      tarjetas: document.querySelectorAll('.farm-account').length,
      altoTarjeta: Math.round(tar.getBoundingClientRect().height),
      altoRejilla: Math.round(rej.getBoundingClientRect().height),
      necesitaScroll: rej.scrollHeight > rej.clientHeight + 1,
      tituloX: Math.round(titulo.left - cabeza.left),
      svgEnBarra: document.querySelectorAll('.farm-toolbar svg, .farm-actions svg').length,
      huecosSinIcono: [...document.querySelectorAll('.top-action-icon')].filter((c) => !c.querySelector('svg')).length,
      elRecorta: [...document.querySelectorAll('.farm-target-copy small, .farm-account-meta')].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      rotuloLider: document.querySelector('.farm-leader-eyebrow').textContent,
      etiquetas: [...document.querySelectorAll('.farm-leader-detail-stats small')].map((e) => e.textContent).join(' ')
    };
  })()`);

  console.log('--- medidas ---');
  console.log(JSON.stringify(medidas, null, 2));
  console.log(`errores de consola: ${errores.filter((m) => !/No handler registered/.test(m)).length}`);

  const fs = require('node:fs');
  const imagen = await ventana.webContents.capturePage();
  fs.writeFileSync(SALIDA, imagen.toPNG());
  console.log(`captura: ${SALIDA}`);

  app.quit();
});
