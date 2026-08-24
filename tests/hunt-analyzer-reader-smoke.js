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
    await window.loadFile(path.join(__dirname, 'hunt-analyzer-fixture.html'));
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const snapshotScript = loadRendererFunction(renderer, 'huntAnalyzerSnapshotScript', 'clearNativeHuntAnalyzerScript');
    const clearScript = loadRendererFunction(renderer, 'clearNativeHuntAnalyzerScript', 'renderHuntAnalyzer');

    const snapshot = await window.webContents.executeJavaScript(snapshotScript());
    const values = Object.fromEntries(snapshot.metrics.map((metric) => [metric.key, metric]));
    const expected = {
      defeated: '1,303',
      time: '2h 53m 01s',
      xp: '11,742,636',
      captured: '12',
      loot: '$156,402',
      supply: '-$172,225',
      lootRate: '+$85,134/h',
      xpRate: '4,063,977 XP/h',
      killRate: '451/h'
    };
    for (const [key, value] of Object.entries(expected)) {
      if (values[key]?.value !== value) {
        throw new Error(`${key}: expected ${value}, received ${values[key]?.value}`);
      }
    }
    if (values.captured.detail !== '+$216,000') throw new Error(`Captured detail missing: ${values.captured.detail}`);
    if (values.loot.detail !== '20,303 items') throw new Error(`Loot detail missing: ${values.loot.detail}`);
    if (values.supply.detail !== '1,303 balls · 15 potions') throw new Error(`Supply detail missing: ${values.supply.detail}`);
    if (snapshot.balance !== '+$245,991') throw new Error(`Balance missing: ${snapshot.balance}`);
    if (snapshot.drops.length !== 4) throw new Error(`Drops missing: ${snapshot.drops.length}`);
    if (snapshot.drops.some((drop) => !drop.icon)) {
      throw new Error(`Drop icons missing: ${JSON.stringify(snapshot.drops)}`);
    }

    const cleared = await window.webContents.executeJavaScript(clearScript());
    if (!cleared?.ok) throw new Error(`Native clear failed: ${JSON.stringify(cleared)}`);
    const resetSnapshot = await window.webContents.executeJavaScript(snapshotScript());
    if (resetSnapshot.metrics[0].value !== '0' || resetSnapshot.drops.length !== 0) {
      throw new Error('Native reset did not update the reader.');
    }

    console.log(JSON.stringify({
      metrics: Object.fromEntries(snapshot.metrics.map((metric) => [metric.key, metric.value])),
      balance: snapshot.balance,
      drops: snapshot.drops.length,
      dropIcons: snapshot.drops.filter((drop) => drop.icon).length,
      clear: cleared.ok
    }));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
