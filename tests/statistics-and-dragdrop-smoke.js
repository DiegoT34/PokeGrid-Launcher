const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

async function waitFor(window, expression, timeout = 15_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await window.webContents.executeJavaScript(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    width: 1440,
    height: 920,
    webPreferences: {
      preload: path.join(__dirname, 'launcher-preview-preload.js'),
      contextIsolation: true,
      sandbox: false,
      webviewTag: true
    }
  });

  try {
    await window.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    await waitFor(window, 'window.pokeGridUserScriptManager && document.querySelectorAll(".panel").length === 4');
    const dropState = await window.webContents.executeJavaScript(`(async () => {
      window.pokeGridUserScriptManager.open(-1);
      const drop = async (version) => {
        const code = '// ==UserScript==\\n// @name Drag Smoke\\n// @namespace pokegrid.drag-smoke\\n// @version ' + version + '\\n// @match https://poke.idleworld.online/*\\n// ==/UserScript==\\nwindow.__dragSmoke = ' + JSON.stringify(version) + ';';
        const transfer = new DataTransfer();
        transfer.items.add(new File([code], 'Drag-Smoke.user.js', { type: 'text/javascript' }));
        document.querySelector('#scriptDropZone').dispatchEvent(new DragEvent('drop', {
          bubbles: true, cancelable: true, dataTransfer: transfer
        }));
        const started = Date.now();
        while (Date.now() - started < 3000) {
          const item = document.querySelector('.script-list-item');
          if (item && item.textContent.includes('v' + version)) return;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error('La versión arrastrada no apareció: ' + version);
      };
      await drop('1.0.0');
      await drop('2.0.0');
      return {
        count: document.querySelector('#scriptCount').textContent,
        title: document.querySelector('#scriptEditorName').textContent,
        version: document.querySelector('#scriptEditorMeta').textContent,
        accounts: document.querySelectorAll('#scriptAccountToggles input:checked').length,
        message: document.querySelector('#scriptsMessage').textContent,
        dropZone: Boolean(document.querySelector('#scriptDropZone'))
      };
    })()`);
    if (dropState.count !== '1' || dropState.title !== 'Drag Smoke' || !dropState.version.includes('v2.0.0') ||
        dropState.accounts !== 4 || !dropState.message.includes('actualizado') || !dropState.dropZone) {
      throw new Error(`Drag and drop install/update failed: ${JSON.stringify(dropState)}`);
    }

    const statisticsState = await window.webContents.executeJavaScript(`(() => {
      window.pokeGridUserScriptManager.close();
      statisticsBackdrop.hidden = false;
      document.body.classList.add('has-statistics-modal');
      const hunt = (defeated, captured, xp, seconds, balance, dropName) => ({
        ok: true,
        metrics: [
          { key: 'defeated', value: String(defeated) },
          { key: 'captured', value: String(captured) },
          { key: 'xp', value: String(xp) },
          { key: 'time', value: formatHuntDuration(seconds) },
          { key: 'loot', value: String(500 + defeated) },
          { key: 'supply', value: String(100 + captured) },
          { key: 'lootRate', value: String(3000 + defeated) },
          { key: 'xpRate', value: String(9000 + xp) },
          { key: 'killRate', value: String(400 + defeated) }
        ],
        balance: String(balance),
        drops: [{ name: dropName, quantity: '2', icon: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }],
        updatedAt: Date.now()
      });
      renderStatistics(Array.from({ length: 4 }, (_, index) => ({
        index,
        online: true,
        huntFresh: true,
        hunt: hunt(100 + index, 10 + index, 1000 + index, 60 + index, 500 + index, 'Leaves'),
        profile: { name: accounts[index].label, level: 100 + index, rank: 'Gold', pokedollars: 10000, diamonds: 25 },
        captures: 20 + index,
        shinyCaptures: index,
        legendaryCaptures: 1,
        averageIv: 150 + index,
        context: { zone: ['Viridian Forest', 'Mt. Moon', 'Cerulean Cave', 'Power Plant'][index], pokemon: ['Caterpie', 'Clefairy', 'Mewtwo', 'Magnemite'][index], leader: ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur'][index] },
        drops: [{ name: ['Leaves', 'Moon Stone', 'DNA Sample', 'Magnet'][index], quantity: 2 + index, icon: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', price: '$10', total: '$20' }]
      })));
      statisticsAccounts.querySelector('.statistics-account-card [data-account-view="drops"]').click();
      document.querySelector('[data-statistics-view="comparison"]').click();
      const totalCards = [...statisticsTotals.querySelectorAll('.statistics-total-card')];
      return {
        visible: !statisticsBackdrop.hidden,
        totalCards: totalCards.length,
        accountCards: statisticsAccounts.querySelectorAll('.statistics-account-card').length,
        accountColors: new Set([...statisticsAccounts.querySelectorAll('.statistics-account-card')].map((card) => card.style.getPropertyValue('--account-color'))).size,
        accountDropTabs: statisticsAccounts.querySelectorAll('[data-account-view="drops"]').length,
        dropSprites: statisticsAccounts.querySelectorAll('.statistics-drop-sprite').length,
        firstDropsVisible: !statisticsAccounts.querySelector('.statistics-account-card [data-account-pane="drops"]').hidden,
        comparisonVisible: !statisticsComparisonView.hidden,
        comparisonRows: statisticsComparisonTable.querySelectorAll('.statistics-comparison-row:not(.is-header)').length,
        comparisonHighlights: statisticsComparisonHighlights.querySelectorAll('.statistics-comparison-highlight').length,
        comparisonRanks: [...statisticsComparisonTable.querySelectorAll('.statistics-comparison-rank')].map((item) => item.textContent.trim()),
        comparisonNames: [...statisticsComparisonTable.querySelectorAll('.statistics-comparison-account strong')].map((item) => item.textContent.trim()),
        expectedComparisonNames: [...accounts].reverse().map((account) => account.label),
        comparisonColorValues: [...statisticsComparisonTable.querySelectorAll('.statistics-comparison-row:not(.is-header)')]
          .map((row) => row.style.getPropertyValue('--account-color')),
        text: statisticsBackdrop.textContent.replace(/\\s+/g, ' ').trim(),
        modalRect: document.querySelector('.statistics-modal').getBoundingClientRect().toJSON(),
        webviewsHidden: [...document.querySelectorAll('webview')].every((webview) => getComputedStyle(webview).visibility === 'hidden')
      };
    })()`);
    if (!statisticsState.visible || statisticsState.totalCards !== 10 || statisticsState.accountCards !== 4 || statisticsState.accountColors !== 4 ||
        statisticsState.accountDropTabs !== 4 || statisticsState.dropSprites !== 4 || !statisticsState.firstDropsVisible ||
        !statisticsState.comparisonVisible || statisticsState.comparisonRows !== 4 || statisticsState.comparisonHighlights !== 4 ||
        statisticsState.comparisonRanks.join(',') !== 'TOP 1,TOP 2,TOP 3,TOP 4' || new Set(statisticsState.comparisonColorValues).size !== 4 ||
        statisticsState.comparisonNames.join(',') !== statisticsState.expectedComparisonNames.join(',') ||
        !statisticsState.text.includes('Capturas guardadas') || !statisticsState.text.includes('Shinies capturados') ||
        !statisticsState.text.includes('Tiempo acumulado') || !statisticsState.text.includes('Viridian Forest') ||
        !statisticsState.text.includes('Comparación de Hunt') || !statisticsState.webviewsHidden ||
        statisticsState.modalRect.width > 1160 || statisticsState.modalRect.height > 800) {
      throw new Error(`Statistics dashboard failed: ${JSON.stringify(statisticsState)}`);
    }

    await window.webContents.executeJavaScript(`document.querySelectorAll('webview').forEach((element) => element.remove())`);
    window.show();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const comparisonImage = await window.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'statistics-comparison.png'), comparisonImage.toPNG());
    await window.webContents.executeJavaScript(`document.querySelector('[data-statistics-view="summary"]').click()`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const summaryImage = await window.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, 'statistics-and-dragdrop.png'), summaryImage.toPNG());
    console.log(JSON.stringify({ dropState, statisticsState }));
    window.destroy();
    app.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    window.destroy();
    app.exit(1);
  }
});
