const { app, BrowserWindow, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const sourceUserData = process.env.POKEGRID_SOURCE_USERDATA;
if (!sourceUserData) throw new Error('POKEGRID_SOURCE_USERDATA is required.');
const reuseLauncherPartition = process.env.POKEGRID_REUSE_PARTITION === '1';
app.setPath('userData', sourceUserData);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function rendererFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  if (start < 0 || end < 0) throw new Error(`Could not extract ${name}.`);
  return Function(`${source.slice(start, end)}; return ${name};`)();
}

app.whenReady().then(async () => {
  const accounts = JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(sourceUserData, 'accounts.enc'))));
  const credentials = accounts.find((account) => account?.username && account?.password);
  if (!credentials) throw new Error('No configured account was found.');
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: { partition: reuseLauncherPartition ? 'persist:pokegrid-1' : 'persist:farm-live-diagnostic', contextIsolation: true, sandbox: true }
  });
  try {
    await window.loadURL(reuseLauncherPartition ? 'https://poke.idleworld.online/play' : 'https://poke.idleworld.online/login');
    if (!reuseLauncherPartition) await window.webContents.executeJavaScript(`(async () => {
      const username = ${JSON.stringify(credentials.username)};
      const password = ${JSON.stringify(credentials.password)};
      const setValue = (input, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const user = document.querySelector('input[autocomplete="username"], input[name*="user" i], input[name*="email" i], input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="image"])');
        const pass = document.querySelector('input[autocomplete="current-password"], input[type="password"]');
        const submit = document.querySelector('form button[type="submit"], form input[type="submit"], form input[type="image"], form button:not([type])');
        if (user && pass && submit) {
          setValue(user, username); setValue(pass, password); submit.click(); return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return false;
    })()`);
    for (let attempt = 0; attempt < 60 && window.webContents.getURL().includes('/login'); attempt += 1) await delay(500);
    await delay(8000);

    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const farmScript = rendererFunction(renderer, 'farmEnhancedContextScript', 'farmEnhancedCatalogScript');
    const farm = await window.webContents.executeJavaScript(farmScript());
    const diagnostic = await window.webContents.executeJavaScript(`(async () => {
      const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
      const active = document.querySelector('[data-pg-team-selected="true"], .phud-mon.active, .phud-mon.selected, .phud-mon.on, .pg-team-slot.active, .pg-team-slot.selected, .dock-poke-wrap, .phud-mon, .pg-team-slot');
      if (active) ['pointerover','mouseover','mouseenter'].forEach((type) => active.dispatchEvent(new MouseEvent(type, { bubbles: type !== 'mouseenter', view: window })));
      await new Promise((resolve) => setTimeout(resolve, 600));
      const entries = [];
      const seen = new WeakSet();
      const scan = (value, path = '', depth = 0) => {
        if (value == null || depth > 10 || entries.length > 2500) return;
        if (['string','number','boolean'].includes(typeof value)) {
          if (/iv|growth|quality|power|strength|stat|level|look|shiny|variant|form|active|leader|team|slot|equip/i.test(path)) entries.push({ path, value: String(value).slice(0, 180) });
          return;
        }
        if (typeof value !== 'object' || value instanceof Node || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) return value.slice(0, 100).forEach((child, index) => scan(child, path + '.' + index, depth + 1));
        Object.entries(value).slice(0, 150).forEach(([key, child]) => {
          if (!/^(return|child|sibling|stateNode|alternate|_owner)$/i.test(key)) scan(child, path + '.' + key, depth + 1);
        });
      };
      [active, ...Array.from(active?.querySelectorAll('*') || [])].filter(Boolean).forEach((element, index) => {
        Object.keys(element).filter((key) => /^__react(?:Props|Fiber|Container)/.test(key)).forEach((key) => scan(element[key], 'active' + index + '.' + key));
      });
      const endpoints = {};
      for (const endpoint of ['/api/characters/me', '/api/game/profile', '/api/game/pokedex', '/api/game/map-markers', '/api/game/all-pokes']) {
        try {
          const response = await fetch(endpoint, { cache: 'no-store' });
          const json = response.ok ? await response.json() : null;
          const relevant = [];
          const apiSeen = new WeakSet();
          const inspect = (value, path = '', depth = 0) => {
            if (value == null || depth > 8 || relevant.length > 1000) return;
            if (['string','number','boolean'].includes(typeof value)) {
              if (/iv|growth|quality|power|strength|stat|level|look|shiny|variant|form|active|leader|team|slot|equip/i.test(path)) relevant.push({ path, value: String(value).slice(0, 180) });
              return;
            }
            if (typeof value !== 'object' || apiSeen.has(value)) return;
            apiSeen.add(value);
            Object.entries(value).slice(0, 150).forEach(([key, child]) => inspect(child, path + '.' + key, depth + 1));
          };
          inspect(json);
          const summarizeShape = (value, depth = 0) => {
            if (depth > 3 || value == null || typeof value !== 'object') return typeof value;
            if (Array.isArray(value)) return { type:'array', length:value.length, first:value.length ? summarizeShape(value[0], depth + 1) : null };
            return { type:'object', keys:Object.keys(value).slice(0, 30), children:Object.fromEntries(Object.entries(value).slice(0, 12).map(([key, child]) => [key, summarizeShape(child, depth + 1)])) };
          };
          endpoints[endpoint] = { status: response.status, relevant, shape:summarizeShape(json) };
        } catch (error) { endpoints[endpoint] = { error: error.message }; }
      }
      const tooltips = [...document.querySelectorAll('[role="tooltip"], [class*="tooltip" i], [class*="popover" i], [class*="pokemon-card" i]')]
        .map((element) => ({ className: String(element.className), text: clean(element.textContent), html: element.outerHTML.slice(0, 5000) }))
        .filter((row) => /\bIV\b|Power|Poder|Força|Quality|Qualidade/i.test(row.text));
      const loginControls = {
        inputs:[...document.querySelectorAll('input')].map((input) => ({ type:input.type, name:input.name, placeholder:input.placeholder, autocomplete:input.autocomplete, ariaLabel:input.getAttribute('aria-label') })),
        buttons:[...document.querySelectorAll('button')].slice(0, 30).map((button) => ({ type:button.type, text:clean(button.textContent), ariaLabel:button.getAttribute('aria-label') }))
      };
      return { url: location.href, body: clean(document.body.textContent).slice(0, 1000), activeText: clean(active?.textContent), activeHtml: active?.outerHTML.slice(0, 7000), reactEntries: entries, endpoints, tooltips, loginControls };
    })()`);
    console.log(JSON.stringify({ farm, diagnostic }, null, 2));
    window.destroy(); app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy(); app.exit(1);
  }
});
