// principal-lista.js — monta uma linha de ferramenta na lista densa dos resultados da busca.
import { t } from '/estatico/compartilhado/compartilhado-idioma.js';

function criarIcone(nome, classe = 'icone lista-densa__icone') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', classe);
  svg.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${nome}`);
  svg.append(uso);
  return svg;
}

export function montarLinhaFerramenta(ferramenta) {
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

  const meta = document.createElement('span');
  meta.className = 'lista-densa__meta';
  const etiqueta = document.createElement('span');
  etiqueta.className = planejada ? 'etiqueta etiqueta--planejada' : 'etiqueta etiqueta--pronta';
  etiqueta.textContent = planejada
    ? t('compartilhado.ferramenta.estado_planejada')
    : t('compartilhado.ferramenta.estado_pronta');
  meta.append(etiqueta);

  if (ferramenta.plano === 'plus') {
    const plus = document.createElement('span');
    plus.className = 'etiqueta etiqueta--plus';
    plus.textContent = t('compartilhado.ferramenta.plano_plus');
    meta.append(plus);
  }

  ligacao.append(criarIcone(ferramenta.icone), nome, descricao, meta);
  item.append(ligacao);
  return item;
}

export { criarIcone };
