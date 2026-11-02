// salvos-lista.js — linha da lista densa de ferramentas salvas, com estrela para remover.
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

function criarIcone(nome, classe) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

/** Linha de uma ferramenta salva; sempre com a estrela preenchida (já está nos salvos). */
export function montarLinhaSalvo(ferramenta, { aoRemover } = {}) {
  const item = document.createElement('li');
  item.className = 'lista-densa__item';

  const planejada = ferramenta.estado === 'planejada' || !ferramenta.url;
  if (planejada) item.classList.add('lista-densa__item--planejada');

  const ligacao = document.createElement(planejada ? 'span' : 'a');
  ligacao.className = 'lista-densa__ligacao';
  if (!planejada) ligacao.href = ferramenta.url;

  const nome = document.createElement('span');
  nome.className = 'lista-densa__nome';
  nome.textContent = ferramenta.nome;

  const descricao = document.createElement('span');
  descricao.className = 'lista-densa__descricao';
  descricao.textContent = ferramenta.descricao;

  ligacao.append(criarIcone(ferramenta.icone, 'icone lista-densa__icone'), nome, descricao);
  item.append(ligacao);

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-icone lista-densa__favorito';
  botao.setAttribute('aria-pressed', 'true');
  botao.setAttribute('aria-label', t('salvos.favorito.tirar', { nome: ferramenta.nome }));
  botao.append(criarIcone('estrela-cheia', 'icone icone--20'));
  if (typeof aoRemover === 'function') {
    botao.addEventListener('click', () => aoRemover(ferramenta.slug, ferramenta.nome, item));
  }
  item.append(botao);

  return item;
}
