// avisos-lista.js — linha de um aviso do sistema e balão de uma mensagem da conversa.
import { formatarTempoRelativo } from '/estatico/compartilhado/compartilhado-formatar.js';

function criarIcone(nome, classe) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

/** Uma linha da lista de avisos do sistema; marca lido/não lido e abre `aoAbrir` uma vez. */
export function montarLinhaAviso(aviso, { aoAbrir } = {}) {
  const item = document.createElement('li');
  item.className = aviso.lido ? 'avisos__item' : 'avisos__item avisos__item--nao-lido';

  const icone = document.createElement('span');
  icone.className = 'avisos__item-icone';
  icone.append(criarIcone('aviso', 'icone icone--20'));

  const textos = document.createElement('div');
  textos.className = 'avisos__item-textos';

  const titulo = document.createElement('b');
  titulo.className = 'avisos__item-titulo';
  titulo.textContent = aviso.titulo;

  const corpo = document.createElement('p');
  corpo.className = 'avisos__item-corpo texto-2';
  corpo.textContent = aviso.corpo;

  textos.append(titulo, corpo);

  if (aviso.link_url && aviso.link_rotulo) {
    const link = document.createElement('a');
    link.className = 'avisos__item-link';
    link.href = aviso.link_url;
    link.textContent = aviso.link_rotulo;
    textos.append(link);
  }

  const tempo = document.createElement('span');
  tempo.className = 'texto-pequeno texto-2 avisos__item-tempo';
  tempo.textContent = formatarTempoRelativo(aviso.inicio_em);

  item.append(icone, textos, tempo);

  if (typeof aoAbrir === 'function') {
    item.addEventListener('click', aoAbrir, { once: true });
  }

  return item;
}

/** Um balão da conversa com o administrador. */
export function montarMensagem(mensagem) {
  const item = document.createElement('li');
  item.className = mensagem.autor === 'admin'
    ? 'avisos__mensagem avisos__mensagem--admin'
    : 'avisos__mensagem avisos__mensagem--usuario';

  const corpo = document.createElement('p');
  corpo.className = 'avisos__mensagem-corpo';
  corpo.textContent = mensagem.corpo;
  item.append(corpo);

  return item;
}
