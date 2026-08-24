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
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: false, sandbox: false } });
  try {
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf8');
    const profileScript = loadRendererFunction(renderer, 'accountProfileSnapshotScript', 'formatAccountAmount');
    await window.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <main id="game"><button class="player-profile-button" onclick="window.__profileAutoOpened = true">Profile</button></main>
      <div class="pf-avatar"><canvas id="liveAvatar" width="48" height="64"></canvas></div>
      <div class="profile-modal" role="dialog">
        <h1>PROFILE</h1>
        <div class="profile-name">SHOCKVOR</div>
        <img class="trainer-outfit" width="96" height="120" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='120'%3E%3Crect width='96' height='120' fill='%23123456'/%3E%3C/svg%3E">
        <h2>GENERAL INFORMATION</h2>
        <div class="profile-row"><span>Level</span><b>559</b></div>
        <div class="profile-row"><span>Experience</span><b>2.887.458.374 XP</b></div>
        <div class="profile-row"><span>Gold</span><b>$ 19.966.639</b></div>
        <div class="profile-row"><span>Diamonds</span><b>💎 0</b></div>
        <div class="profile-row"><span>Fishing</span><b>Lv 10</b></div>
        <div class="profile-row"><span>VIP</span><b>9d 20h</b></div>
        <div class="profile-row"><span>Bless</span><b>No Bless</b></div>
        <div class="profile-row"><span>Clan</span><b>raibolt · Rank 2</b></div>
        <button aria-label="Close">×</button>
      </div>
      <script>const avatarContext = document.querySelector('#liveAvatar').getContext('2d'); avatarContext.fillStyle = '#29d7e5'; avatarContext.fillRect(0, 0, 48, 64);<\/script>`));
    await window.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('#game');
      root.__reactFiber$profile = { memoizedProps: { username: 'SHOCKVOR', level: 0, rank: 'INGS INVENTORY TRADE WITH PLAYER', gold: 0, diamonds: 0 }, memoizedState: null, return: null };
    })()`);
    const profile = await window.webContents.executeJavaScript(profileScript());
    if (profile.name !== 'SHOCKVOR' || profile.level !== 559 || profile.pokedollars !== 19966639 ||
      profile.diamonds !== 0 || profile.rank !== 'Rank 2' || profile.vip !== true || !profile.sprite.startsWith('data:image/png')) {
      throw new Error(`Profile fields were not read from PROFILE rows: ${JSON.stringify(profile)}`);
    }
    const profileAutoOpened = await window.webContents.executeJavaScript('Boolean(window.__profileAutoOpened)');
    if (profileAutoOpened) throw new Error('The account reader must never open PROFILE automatically.');

    await window.loadFile(__filename);
    await window.webContents.executeJavaScript(`(() => {
      sessionStorage.setItem('pokeweb:tokens', JSON.stringify({ accessToken: 'live-token', refreshToken: 'refresh-token' }));
      window.__profileAuthorization = '';
      window.fetch = async (endpoint, options = {}) => {
        if (endpoint !== '/api/game/profile') throw new Error('Unexpected endpoint: ' + endpoint);
        window.__profileAuthorization = options.headers?.Authorization || '';
        return {
          ok: true,
          status: 200,
          json: async () => ({
            name: 'SHOCKVINY', level: 583, gold: 19966639, diamonds: 42,
            rank: 58, totalPlayers: 70000, vip: true, vipUntil: Date.now() + 86400000
          })
        };
      };
    })()`);
    const apiProfile = await window.webContents.executeJavaScript(profileScript());
    const authorization = await window.webContents.executeJavaScript('window.__profileAuthorization');
    if (authorization !== 'Bearer live-token' || apiProfile.name !== 'SHOCKVINY' || apiProfile.level !== 583 ||
      apiProfile.pokedollars !== 19966639 || apiProfile.diamonds !== 42 || apiProfile.rank !== '#58 / 70.000' || apiProfile.vip !== true) {
      throw new Error(`Authenticated profile API was not read correctly: ${authorization} ${JSON.stringify(apiProfile)}`);
    }
    await window.webContents.executeJavaScript(`(() => {
      sessionStorage.setItem('pokeweb:tokens', JSON.stringify({ accessToken: 'expired-token', refreshToken: 'refresh-token' }));
      window.__profileAuthorization = '';
      window.fetch = async (endpoint, options = {}) => {
        if (endpoint === '/api/auth/refresh') return {
          ok: true, status: 200, json: async () => ({ accessToken: 'renewed-token', refreshToken: 'renewed-refresh' })
        };
        const authorization = options.headers?.Authorization || '';
        window.__profileAuthorization = authorization;
        if (authorization === 'Bearer expired-token') return { ok: false, status: 401, json: async () => ({}) };
        return { ok: true, status: 200, json: async () => ({
          name: 'SHOCKVINY', level: 584, gold: 20000000, diamonds: 43,
          rank: 57, totalPlayers: 70001, vip: false, vipUntil: 0
        }) };
      };
    })()`);
    const renewedProfile = await window.webContents.executeJavaScript(profileScript());
    const renewedAuthorization = await window.webContents.executeJavaScript('window.__profileAuthorization');
    if (renewedAuthorization !== 'Bearer renewed-token' || renewedProfile.level !== 584 || renewedProfile.vip !== false) {
      throw new Error(`Expired profile token was not renewed: ${renewedAuthorization} ${JSON.stringify(renewedProfile)}`);
    }
    console.log(JSON.stringify(profile));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
