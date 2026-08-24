const pokemonButton = [...document.querySelectorAll('.dock-btn')]
  .find((button) => button.getAttribute('title') === 'Pokémon');
const pokemonWrap = document.createElement('span');
pokemonWrap.className = 'dock-poke-wrap';
pokemonButton.replaceWith(pokemonWrap);
pokemonWrap.appendChild(pokemonButton);
const pokemonMenu = document.createElement('div');
pokemonMenu.className = 'poke-menu';
pokemonMenu.hidden = true;
pokemonMenu.innerHTML = '<button class="poke-menu-item" type="button">My Pokes</button><button class="poke-menu-item" type="button">All Pokes</button>';
pokemonWrap.appendChild(pokemonMenu);
pokemonButton.addEventListener('click', () => {
  pokemonMenu.hidden = !pokemonMenu.hidden;
});

window.eval(window.pokeGridTheme.buildInstallScript());

const helperDialog = document.querySelector('.auto-helper-dialog');
document.querySelector('.ah-head').addEventListener('click', () => {
  helperDialog.hidden = !helperDialog.hidden;
});
document.querySelector('.ah-close').addEventListener('click', () => {
  helperDialog.hidden = true;
});
