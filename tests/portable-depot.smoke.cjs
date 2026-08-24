const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

let browser;
(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(7000);
    await page.route('https://poke.idleworld.online/test', route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><head></head><body><nav class="game-dock"><button data-guide="dock-inventory">Bag</button></nav></body></html>'
    }));
    await page.goto('https://poke.idleworld.online/test');
    await page.evaluate(() => {
        const depot = {
            inventory: [{ id: 'potion', name: 'Potion', quantity: 3, category: 'heal' }],
            depot: [{ id: 'gem', name: 'Gem', quantity: 2, category: 'material' }],
            maxSlots: 200
        };
        const family = {
            familyId: 'torrealba',
            familyName: 'TORREALBA',
            members: [{ name: 'SHOCKVINY' }, { name: 'SHOCKVOR' }],
            movesToday: 73,
            maxMoves: 250,
            inventory: [{ id: 'band-aid', name: 'Band Aid', quantity: 8, category: 'heal' }],
            storedItems: [{ id: 'earth-stone', name: 'Earth Stone', quantity: 26, category: 'stone' }],
            box: [{ id: 'family-own', name: 'Paras', pokeId: 46, level: 4, ivTotal: 80 }],
            storedPokemon: [{ id: 'family-stored', name: 'Paras', pokeId: 46, level: 6, ivTotal: 95 }]
        };
        localStorage.setItem('pgdp:family-transport:v1', JSON.stringify({
            get: { __pgTransport: 'fetch', url: '/api/game/family/depot', method: 'GET' }
        }));
        window.fetch = async (url, options = {}) => {
            const target = String(url);
            if (target.includes('items.json')) return new Response(JSON.stringify([
                { id: 'potion', name: 'Potion', category: 'heal', icon: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' },
                { id: 'gem', name: 'Gem', category: 'material', icon: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }
            ]), { status: 200 });
            if (target.includes('creatures.json')) return new Response(JSON.stringify([
                { id: 46, name: 'Paras', type1: 'bug', type2: 'grass', icon: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }
            ]), { status: 200 });
            if (target === '/api/game/depot/move') {
                const body = JSON.parse(options.body);
                const source = body.dir === 'store' ? depot.inventory : depot.depot;
                const targetList = body.dir === 'store' ? depot.depot : depot.inventory;
                const index = source.findIndex(item => item.id === body.itemId);
                if (index >= 0) targetList.push(source.splice(index, 1)[0]);
                return new Response(JSON.stringify(depot), { status: 200 });
            }
            if (target === '/api/game/family/depot/move') return new Response(JSON.stringify(family), { status: 200 });
            if (target === '/api/game/family/depot') return new Response(JSON.stringify(family), { status: 200 });
            if (target === '/api/game/depot') return new Response(JSON.stringify(depot), { status: 200 });
            return new Response('{}', { status: 404 });
        };
        class MockWebSocket extends EventTarget {
            static OPEN = 1;
            constructor() { super(); this.readyState = 1; }
            send(raw) {
                const request = JSON.parse(raw);
                if (request.type.startsWith('poke')) {
                    queueMicrotask(() => this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({
                        type: 'pokes',
                        list: [
                            { id: 'one', name: 'Paras', pokeId: 46, level: 12, ivTotal: 100, team: true },
                            { id: 'two', name: 'Paras', pokeId: 46, level: 8, ivTotal: 90, team: false }
                        ]
                    }) })));
                }
            }
        }
        window.WebSocket = MockWebSocket;
    });
    const script = fs.readFileSync(path.join(__dirname, '..', 'PokeGrid-Deposito-Portable.user.js'), 'utf8');
    await page.addScriptTag({ content: script });
    await page.evaluate(() => { window.__testSocket = new WebSocket('wss://poke.idleworld.online/ws'); });
    await page.locator('#pg-portable-depot-button').click();
    await page.locator('.pgdp-row').first().waitFor();
    if (await page.locator('.pgdp-column').count() !== 2) throw new Error('The item view did not render two columns.');
    if (!await page.getByText('Potion', { exact: true }).isVisible()) throw new Error('Inventory item is missing.');
    await page.locator('.pgdp-tab[data-tab="pokemon"]').click();
    if (await page.getByText('Paras', { exact: true }).count() !== 2) throw new Error('Team and Box were not rendered.');
    await page.locator('.pgdp-tab[data-tab="items"]').click();
    await page.getByRole('button', { name: 'Guardar →' }).click();
    await page.getByText('Objeto guardado.', { exact: true }).waitFor();
    const dimensions = await page.locator('.pgdp-window').boundingBox();
    if (dimensions.width > 800 || dimensions.height > 620) throw new Error('The compact panel exceeds its target size.');
    await page.locator('.pgdp-tab[data-tab="family-items"]').click();
    if (!await page.getByText('TORREALBA', { exact: true }).isVisible()) throw new Error('Family metadata is missing.');
    if (!await page.getByText('Band Aid', { exact: true }).isVisible()) throw new Error('Family bag did not render.');
    if (!await page.getByText('Earth Stone', { exact: true }).isVisible()) throw new Error('Family depot did not render.');
    await page.locator('.pgdp-tab[data-tab="family-pokemon"]').click();
    if (await page.getByText('Paras', { exact: true }).count() !== 2) throw new Error('Family Pokémon view did not render both columns.');
    await page.screenshot({ path: path.join(__dirname, 'portable-depot-family.png') });
    console.log('portable-depot smoke test: OK');
    await browser.close();
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
    return browser?.close();
});
