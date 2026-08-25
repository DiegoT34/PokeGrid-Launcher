const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { app, net } = require('electron');

const catalogUrl = 'https://raw.githubusercontent.com/DiegoT34/PokeGrid-Script-Shop/main/catalog.json';

app.whenReady().then(async () => {
  try {
    const response = await net.fetch(catalogUrl, {
      redirect: 'error',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'User-Agent': 'PokeGrid-Launcher/Shop-Live-Smoke' }
    });
    assert.equal(response.ok, true, `Catálogo HTTP ${response.status}`);
    assert.ok(!response.url || response.url === catalogUrl, `Origen inesperado: ${response.url}`);
    const catalog = JSON.parse(Buffer.from(await response.arrayBuffer()).toString('utf8'));
    assert.equal(catalog.schemaVersion, 1);
    assert.ok(Array.isArray(catalog.scripts) && catalog.scripts.length > 0, 'El catálogo no contiene scripts.');
    assert.equal(new Set(catalog.scripts.map((item) => item.id)).size, catalog.scripts.length, 'El catálogo contiene IDs duplicados.');

    for (const item of catalog.scripts) {
      assert.match(item.downloadUrl, /^https:\/\/raw\.githubusercontent\.com\/DiegoT34\/PokeGrid-Script-Shop\/main\/scripts\/[a-z0-9._-]+\.user\.js$/i);
      const scriptResponse = await net.fetch(item.downloadUrl, { redirect: 'error', cache: 'no-store' });
      assert.equal(scriptResponse.ok, true, `${item.id} HTTP ${scriptResponse.status}`);
      const bytes = Buffer.from(await scriptResponse.arrayBuffer());
      const hash = crypto.createHash('sha256').update(bytes).digest('hex');
      assert.equal(hash, item.sha256, `SHA-256 no coincide: ${item.id}`);
    }
    console.log(`Script Shop live passed: ${catalog.scripts.length} scripts oficiales accesibles y verificados.`);
  } finally {
    app.quit();
  }
}).catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
