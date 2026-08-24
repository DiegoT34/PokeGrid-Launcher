(() => {
  if (window.__idlePokeMobileInstalled) return;
  window.__idlePokeMobileInstalled = true;
  const state = window.__idlePokeMobileState = window.__idlePokeMobileState || {
    captures: [], defeats: [], drops: [], pokes: [], hunt: {}, profile: {}, updatedAt: Date.now()
  };
  const emitted = { capture: new Set(), shiny: new Set(), drop: new Set() };
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const remember = (kind, value) => {
    const signature = JSON.stringify(value);
    if (emitted[kind].has(signature)) return;
    emitted[kind].add(signature);
    if (emitted[kind].size > 2000) emitted[kind].delete(emitted[kind].values().next().value);
    try { IdlePoke.emit(kind, signature); } catch {}
  };
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 7) return;
    if (Array.isArray(value)) return value.slice(0, 500).forEach(item => visit(item, depth + 1));
    const type = clean(value.type || value.event || value.action).toLowerCase();
    if (type === 'pokes' && Array.isArray(value.list)) state.pokes = value.list;
    if (/capture|caught/.test(type)) {
      const capture = value.capture || value.pokemon || value.data || value;
      state.captures.unshift(capture);
      remember(capture.shiny ? 'shiny' : 'capture', capture);
    }
    if (/defeat|killed/.test(type)) state.defeats.unshift(value.pokemon || value.data || value);
    if (/drop|loot/.test(type)) {
      const drop = value.drop || value.data || value;
      state.drops.unshift(drop);
      remember('drop', drop);
    }
    Object.values(value).slice(0, 100).forEach(child => visit(child, depth + 1));
    state.captures = state.captures.slice(0, 10000);
    state.defeats = state.defeats.slice(0, 2000);
    state.drops = state.drops.slice(0, 5000);
    state.updatedAt = Date.now();
  };
  const NativeWebSocket = window.WebSocket;
  if (NativeWebSocket && !NativeWebSocket.__idleWrapped) {
    const Wrapped = function(...args) {
      const socket = new NativeWebSocket(...args);
      socket.addEventListener('message', event => {
        if (typeof event.data !== 'string') return;
        try { visit(JSON.parse(event.data)); } catch {}
      });
      return socket;
    };
    Object.setPrototypeOf(Wrapped, NativeWebSocket);
    Wrapped.prototype = NativeWebSocket.prototype;
    Wrapped.__idleWrapped = true;
    window.WebSocket = Wrapped;
  }
  window.__idlePokeSnapshot = () => {
    const avatar = document.querySelector('.pf-avatar');
    const canvas = avatar?.querySelector('canvas');
    const profile = {
      name: clean(document.querySelector('.pf-name, [data-player-name], [data-trainer-name]')?.textContent),
      avatar: (() => { try { return canvas?.toDataURL('image/png') || avatar?.querySelector('img')?.src || ''; } catch { return ''; } })()
    };
    return JSON.stringify({ ...state, profile, path: location.pathname, title: document.title, online: navigator.onLine });
  };
  try { IdlePoke.emit('ready', JSON.stringify({ path: location.pathname })); } catch {}
})();
