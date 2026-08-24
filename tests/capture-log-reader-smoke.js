const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function loadRendererFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`Could not extract ${name}.`);
  return Function(`${source.slice(start, end)}; return ${name};`)();
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 900,
    height: 700,
    webPreferences: { contextIsolation: false, sandbox: false }
  });

  try {
    await window.loadFile(path.join(__dirname, 'capture-log-fixture.html'));
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const snapshotScript = loadRendererFunction(renderer, 'captureLogPanelSnapshotScript', 'captureMonitorInstallScript');
    const clearCaptureScript = loadRendererFunction(renderer, 'clearNativeCaptureLogScript', 'captureKeyCounts');
    const computeCapturedPokemonStats = loadRendererFunction(
      renderer,
      'computeCapturedPokemonStats',
      'captureQualityNumber'
    );
    const snapshot = await window.webContents.executeJavaScript(snapshotScript());
    const captureAuthorization = await window.webContents.executeJavaScript('window.__captureLogAuthorization');
    const inventoryOpened = await window.webContents.executeJavaScript("Boolean(document.querySelector('.inv-window, .inv-overlay'))");
    const first = snapshot.rows[0];
    const expected = {
      ok: true,
      total: 176,
      rows: 8,
      serverPokemonCount: 2,
      name: 'Gengar',
      level: 100,
      tier: 'legendary',
      iv: 102,
      ivMax: 192,
      captureNumber: '176',
      ball: '🟡 Ultra Ball',
      quality: '1.8',
      qualityMultiplier: 'x1.80',
      power: '5971',
      looktype: 321,
      hp: 472,
      specialAttack: 783,
      types: 'ghost,poison'
    };
    const actual = {
      ok: snapshot.ok,
      total: snapshot.total,
      rows: snapshot.rows.length,
      serverPokemonCount: snapshot.serverPokemonCount,
      name: first.name,
      level: first.level,
      tier: first.tier,
      iv: first.iv,
      ivMax: first.ivMax,
      captureNumber: first.captureNumber,
      ball: first.ball,
      quality: first.quality,
      qualityMultiplier: first.qualityMultiplier,
      power: first.power,
      looktype: first.looktype,
      hp: first.stats.hp,
      specialAttack: first.stats.specialAttack,
      types: first.types.join(',')
    };
    if (inventoryOpened) throw new Error('Capture Log opened the native inventory.');
    if (captureAuthorization !== 'Bearer capture-token') throw new Error(`Capture Log API was not authenticated: ${captureAuthorization}`);
    for (const [key, value] of Object.entries(expected)) {
      if (actual[key] !== value) throw new Error(`${key}: expected ${value}, received ${actual[key]}`);
    }
    const magnemite = snapshot.rows[1];
    const expectedMagnemite = {
      name: 'Magnemite',
      level: 10,
      tier: 'epic',
      iv: 150,
      captureNumber: '175',
      quality: '1.6',
      qualityMultiplier: 'x1.60',
      hp: 12,
      attack: 8,
      defense: 15,
      specialAttack: 14,
      specialDefense: 10,
      speed: 9,
      power: '109'
    };
    const actualMagnemite = {
      name: magnemite.name,
      level: magnemite.level,
      tier: magnemite.tier,
      iv: magnemite.iv,
      captureNumber: magnemite.captureNumber,
      quality: magnemite.quality,
      qualityMultiplier: magnemite.qualityMultiplier,
      ...magnemite.stats,
      power: magnemite.power
    };
    for (const [key, value] of Object.entries(expectedMagnemite)) {
      if (actualMagnemite[key] !== value) throw new Error(`Magnemite ${key}: expected ${value}, received ${actualMagnemite[key]}`);
    }
    const pinsirStats = computeCapturedPokemonStats(
      { hp: 65, attack: 125, defense: 100, specialAttack: 55, specialDefense: 70, speed: 85 },
      { hp: 20, attack: 20, defense: 20, specialAttack: 15, specialDefense: 15, speed: 20 },
      1,
      1.373
    );
    const expectedPinsir = { hp: 1, attack: 2, defense: 2, specialAttack: 1, specialDefense: 1, speed: 2 };
    for (const [key, value] of Object.entries(expectedPinsir)) {
      if (pinsirStats[key] !== value) throw new Error(`Pinsir ${key}: expected ${value}, received ${pinsirStats[key]}`);
    }
    const pinsirPower = Math.round(Object.values(pinsirStats).reduce((sum, value) => sum + value, 0) * 1.373);
    if (pinsirPower !== 12) throw new Error(`Pinsir power: expected 12, received ${pinsirPower}`);
    const cleared = await window.webContents.executeJavaScript(clearCaptureScript());
    if (!cleared?.ok) throw new Error(`Capture clear failed: ${JSON.stringify(cleared)}`);
    const clearedSnapshot = await window.webContents.executeJavaScript(snapshotScript());
    if (clearedSnapshot.rows.length !== 0 || clearedSnapshot.total !== 0) {
      throw new Error(`Capture Log was not cleared: ${JSON.stringify(clearedSnapshot)}`);
    }
    console.log(JSON.stringify({ ...actual, magnemite: actualMagnemite, pinsirStats, pinsirPower, clear: cleared.ok }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
