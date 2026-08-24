document.querySelector('.ha-clear').addEventListener('click', () => {
  document.querySelectorAll('.ha-card strong').forEach((value) => { value.textContent = '0'; });
  document.querySelectorAll('.ha-rate').forEach((value) => { value.textContent = '—'; });
  document.querySelector('.ha-balance strong').textContent = '$0';
  document.querySelector('.ha-drops').replaceChildren();
});

const fixtureFetch = window.fetch.bind(window);
window.fetch = async (input, options) => {
  if (String(input).includes('/game/items.json')) {
    return new Response(JSON.stringify({
      items: [
        { id: 59195, name: 'Rare Pokemon Picture', icon: '/assets/items/rare-picture.png' },
        { id: 201, name: 'Venom Stone', icon: '/assets/stones/venom.gif' },
        { id: 202, name: 'Darkness Stone', icon: '/assets/stones/darkness.gif' },
        { id: 203, name: 'Ultra Ball', icon: '/assets/balls/ultra-ball.png' }
      ]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return fixtureFetch(input, options);
};

window.eval(window.pokeGridTheme.buildInstallScript());

document.querySelector('[aria-label="Close"]').addEventListener('click', () => {
  document.querySelector('.hunt-analyzer-dialog').hidden = true;
});
