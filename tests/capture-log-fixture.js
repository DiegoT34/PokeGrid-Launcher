document.querySelectorAll('.clog-row').forEach((row, index) => {
  row[`__reactProps$fixture${index}`] = {
    capture: {
      quality: index === 0 ? 'Rare' : 'Common',
      qualityMultiplier: index === 0 ? 'x1.25' : 'x1.00',
      types: ['Ghost', 'Poison'],
      combatPower: 4632 - index,
      baseStats: {
        hp: 322,
        attack: 245,
        defense: 280,
        specialAttack: 610,
        specialDefense: 402,
        speed: 515
      }
    }
  };
});

const fixturePokemon = [{
      id: 'poke-gengar-1',
      speciesId: 94,
      name: 'Gengar',
      level: 100,
      quality: 1.8,
      ivTotal: 102,
      types: ['Ghost', 'Poison'],
      looktype: 321,
      power: 5971,
      stats: {
        hp: 472,
        atk: 458,
        def: 598,
        spAtk: 783,
        spDef: 583,
        speed: 433
      }
}, {
  id: 'poke-magnemite-2',
  speciesId: 81,
  name: 'Magnemite',
  level: 10,
  quality: 1.6,
  ivTotal: 150,
  type1: 'Electric',
  type2: 'Steel',
  looktype: 81,
  power: 109,
  stats: {
    hp: 12,
    atk: 8,
    def: 15,
    spAtk: 14,
    spDef: 10,
    speed: 9
  }
}];

const captureRows = [...document.querySelectorAll('.clog-row')].map((row, index) => ({
  id: index === 0 ? 'poke-gengar-1' : index === 1 ? 'poke-magnemite-2' : `capture-${index}`,
  speciesId: index === 1 ? 81 : 94,
  name: index === 1 ? 'Magnemite' : 'Gengar',
  level: index === 1 ? 10 : 100,
  quality: index === 0 ? 1.8 : index === 1 ? 1.6 : 1,
  ivTotal: Number(row.querySelector('.clog-meta').textContent.match(/IV\s*(\d+)/i)?.[1]),
  ballName: 'Ultra Ball',
  at: new Date().toISOString()
}));

const captureState = { total: captureRows.length, rows: captureRows };
document.querySelector('.clog-window').__reactFiber$fixtureCapture = {
  memoizedState: null,
  memoizedProps: null,
  return: {
    memoizedProps: null,
    memoizedState: {
      memoizedState: captureState,
      next: null
    },
    return: null
  }
};

document.querySelector('.game-root').__reactFiber$fixtureServerPokes = {
  memoizedState: null,
  memoizedProps: null,
  return: {
    memoizedProps: null,
    memoizedState: {
      memoizedState: fixturePokemon,
      next: null
    },
    return: null
  }
};

const fixtureFetch = window.fetch.bind(window);
sessionStorage.setItem('pokeweb:tokens', JSON.stringify({ accessToken: 'capture-token', refreshToken: 'capture-refresh' }));
window.__captureLogAuthorization = '';
window.fetch = async (input, options) => {
  if (String(input).includes('/api/game/capture-log')) {
    window.__captureLogAuthorization = options?.headers?.Authorization || '';
    const captures = [...document.querySelectorAll('.clog-row')].map((row, index) => ({
      pokemonName: 'Gengar',
      level: 100,
      quality: index === 0 ? 1.8 : index === 1 ? 1.6 : 1,
      qualityMultiplier: index === 0 ? 'x1.80' : 'x1.00',
      types: ['GHOST', 'POISON'],
      looktype: 321,
      combatPower: 5971 - index,
      computedStats: {
        hp: index === 0 ? 65 : 472,
        attack: index === 0 ? 125 : 458,
        defense: index === 0 ? 100 : 598,
        specialAttack: index === 0 ? 55 : 783,
        specialDefense: index === 0 ? 70 : 583,
        speed: index === 0 ? 85 : 433
      }
    }));
    return new Response(JSON.stringify({ captures }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return fixtureFetch(input, options);
};

window.eval(window.pokeGridTheme.buildInstallScript());

document.querySelectorAll('.clog-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.clog-tab').forEach((item) => item.classList.remove('on'));
    tab.classList.add('on');
  });
});

document.querySelector('.clog-clear').addEventListener('click', (event) => {
  const button = event.currentTarget;
  if (!button.classList.contains('arm')) {
    button.classList.add('arm');
    return;
  }
  button.classList.remove('arm');
  document.querySelector('.clog-list').replaceChildren();
  document.querySelectorAll('.clog-totals b').forEach((total) => { total.textContent = '0'; });
  // Simulate a stale React hook after the server and visible Capture Log were cleared.
  // The launcher must not resurrect these rows or reinterpret another Pokémon array as history.
});
