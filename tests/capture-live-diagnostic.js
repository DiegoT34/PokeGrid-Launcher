const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const diagnosticUserData = process.env.POKEGRID_DIAG_USERDATA;
if (!diagnosticUserData) throw new Error('POKEGRID_DIAG_USERDATA is required.');
app.setPath('userData', diagnosticUserData);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      partition: 'persist:pokegrid-1',
      contextIsolation: true,
      sandbox: true
    }
  });
  try {
    await window.loadURL('https://poke.idleworld.online/');
    await delay(8000);
    const result = await window.webContents.executeJavaScript(`(async () => {
      const clean = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const normalized = (value) => clean(value).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
      const waitFor = async (getter, timeout = 5000) => {
        const started = Date.now();
        while (Date.now() - started < timeout) {
          const value = getter();
          if (value) return value;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return null;
      };
      let analyzer = document.querySelector('.ha-window');
      if (!analyzer) {
        const trigger = [...document.querySelectorAll('button, [role="button"]')].find((button) =>
          /hunt analyzer|hunt_analyzer|analisador de hunt/.test(normalized([
            button.textContent, button.title, button.getAttribute('aria-label'),
            button.querySelector('img')?.alt, button.querySelector('img')?.src
          ].filter(Boolean).join(' ')))
        );
        trigger?.click();
        analyzer = await waitFor(() => document.querySelector('.ha-window'));
      }
      const logButton = analyzer?.querySelector('.ha-clog-btn') || [...analyzer?.querySelectorAll('button') || []]
        .find((button) => /capture log/.test(normalized(button.textContent)));
      logButton?.click();
      const captureLog = await waitFor(() => document.querySelector('.clog-window'));
      const row = captureLog?.querySelector('.clog-row');
      if (!row) return { url: location.href, body: clean(document.body.textContent).slice(0, 500), error: 'No capture row' };
      const icon = row.querySelector('.clog-ico');
      const styleData = (element, pseudo = null) => {
        if (!element) return null;
        const style = getComputedStyle(element, pseudo);
        return {
          tag: element.tagName,
          className: element.className,
          text: clean(element.textContent),
          backgroundImage: style.backgroundImage,
          backgroundPosition: style.backgroundPosition,
          backgroundSize: style.backgroundSize,
          maskImage: style.maskImage,
          content: style.content,
          width: style.width,
          height: style.height
        };
      };
      const entries = [];
      const seen = new WeakSet();
      const scan = (value, path = '', depth = 0) => {
        if (value === null || value === undefined || depth > 9 || entries.length > 4000) return;
        if (['string', 'number', 'boolean'].includes(typeof value)) {
          if (/pokemon|capture|stat|sprite|image|look|type|quality|rarity|tier|power|strength|level|health|attack|defen|speed|hp|iv/i.test(path)) {
            entries.push({ path, value: String(value).slice(0, 300) });
          }
          return;
        }
        if (typeof value !== 'object' || value instanceof Node || seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
          value.slice(0, 40).forEach((item, index) => scan(item, path + '.' + index, depth + 1));
          return;
        }
        Object.entries(value).slice(0, 140).forEach(([key, child]) => scan(child, path + '.' + key, depth + 1));
      };
      [row, ...row.querySelectorAll('*')].forEach((element, elementIndex) => {
        Object.keys(element).filter((key) => key.startsWith('__reactProps$')).forEach((key) => {
          scan(element[key], 'element' + elementIndex + '.props');
        });
      });
      ['pointerover', 'mouseover', 'mouseenter'].forEach((type) => row.dispatchEvent(new MouseEvent(type, {
        bubbles: type !== 'mouseenter',
        cancelable: true,
        view: window
      })));
      await new Promise((resolve) => setTimeout(resolve, 500));
      const tooltipCandidates = [...document.querySelectorAll('[role="tooltip"], [class*="tooltip" i], [class*="popover" i], [class*="pokemon-card" i]')]
        .filter((element) => /bellsprout|iv|quality|power|fuerza|forca/i.test(clean(element.textContent)))
        .slice(0, 10)
        .map((element) => ({ className: element.className, text: clean(element.textContent), html: element.outerHTML.slice(0, 5000) }));
      return {
        url: location.href,
        title: document.title,
        rowHtml: row.outerHTML.slice(0, 8000),
        rowText: clean(row.textContent),
        icon: styleData(icon),
        iconBefore: styleData(icon, '::before'),
        iconAfter: styleData(icon, '::after'),
        iconChildren: [...icon?.children || []].map((element) => ({
          ...styleData(element),
          src: element.currentSrc || element.src || '',
          html: element.outerHTML.slice(0, 2000)
        })),
        reactEntries: entries,
        tooltipCandidates
      };
    })()`);
    console.log(JSON.stringify(result, null, 2));
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    app.exit(1);
  }
});
