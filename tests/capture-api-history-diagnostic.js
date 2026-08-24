const { app, BrowserWindow } = require('electron');

const diagnosticUserData = process.env.POKEGRID_DIAG_USERDATA;
if (!diagnosticUserData) throw new Error('POKEGRID_DIAG_USERDATA is required.');
app.setPath('userData', diagnosticUserData);

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { partition: 'persist:pokegrid-1', contextIsolation: true, sandbox: true }
  });
  try {
    await window.loadURL('https://poke.idleworld.online/');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const result = await window.webContents.executeJavaScript(`(async () => {
      const candidates = [
        '/api/game/capture-log?filter=all',
        '/api/game/capture-log?filter=all&limit=10000&offset=0',
        '/api/game/capture-log?filter=all&limit=500&page=1',
        '/api/game/capture-log?filter=all&limit=500&page=2'
      ];
      const summarize = (value) => {
        const arrays = [];
        const seen = new WeakSet();
        const visit = (item, path = 'root', depth = 0) => {
          if (!item || typeof item !== 'object' || seen.has(item) || depth > 5) return;
          seen.add(item);
          if (Array.isArray(item)) {
            arrays.push({ path, length: item.length, firstId: item[0]?.id || item[0]?.captureId || null,
              lastId: item.at(-1)?.id || item.at(-1)?.captureId || null });
            return;
          }
          Object.entries(item).forEach(([key, child]) => visit(child, path + '.' + key, depth + 1));
        };
        visit(value);
        return { topKeys: value && typeof value === 'object' ? Object.keys(value).slice(0, 30) : [], arrays };
      };
      const rows = [];
      for (const url of candidates) {
        try {
          const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
          const payload = await response.json().catch(() => null);
          rows.push({ url, status: response.status, redirected: response.redirected, ...summarize(payload) });
        } catch (error) {
          rows.push({ url, error: String(error.message || error) });
        }
      }
      const storage = Object.keys(localStorage).map((key) => {
        const value = localStorage.getItem(key) || '';
        return { key, length: value.length, shape: value.trim().startsWith('{') ? 'object' : value.trim().startsWith('[') ? 'array' : 'string' };
      });
      return { location: location.href, title: document.title, storage, body: document.body.innerText.slice(0, 300), rows };
    })()`);
    console.log(JSON.stringify(result, null, 2));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
