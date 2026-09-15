// Página "Ferramentas": busca por texto e filtro por categoria sobre a lista completa,
// que já vem toda visível no HTML gerado (funciona sem JavaScript). O script só
// esconde, com o atributo "hidden", os itens que não combinam com a busca ou a
// categoria escolhida.
const campoDeBusca = document.getElementById('busca-de-ferramentas');
const seleçãoDeCategoria = document.getElementById('categoria-de-ferramentas');
const itens = [...document.querySelectorAll('[data-lista-de-ferramentas] .item-de-ferramenta')];
const contagem = document.querySelector('[data-contagem]');
const semResultado = document.querySelector('[data-sem-resultado]');

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function filtrar() {
  const termo = normalizar(campoDeBusca.value.trim());
  const categoria = seleçãoDeCategoria.value;
  let visíveis = 0;
  for (const item of itens) {
    const combinaCategoria = categoria === 'todas' || item.dataset.categoria === categoria;
    const combinaBusca = termo === '' || normalizar(item.dataset.busca ?? '').includes(termo);
    const mostrar = combinaCategoria && combinaBusca;
    item.hidden = !mostrar;
    if (mostrar) visíveis += 1;
  }
  contagem.textContent = `${visíveis} ferramenta${visíveis === 1 ? '' : 's'} encontrada${visíveis === 1 ? '' : 's'}.`;
  semResultado.hidden = visíveis > 0;
}

campoDeBusca?.addEventListener('input', filtrar);
seleçãoDeCategoria?.addEventListener('change', filtrar);
filtrar();
