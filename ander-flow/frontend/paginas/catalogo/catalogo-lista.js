// catalogo-lista.js — uma linha da lista densa do catálogo, com estrela de salvar.
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

export function montarLinhaFerramenta(ferramenta, { guardado = false, aoFavoritar } = {}) {
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

  const etiquetaEstado = document.createElement('span');
  etiquetaEstado.className = planejada ? 'etiqueta etiqueta--planejada' : 'etiqueta etiqueta--pronta';
  etiquetaEstado.textContent = planejada
    ? t('compartilhado.ferramenta.estado_planejada')
    : t('compartilhado.ferramenta.estado_pronta');
  meta.append(etiquetaEstado);

  const etiquetaPlano = document.createElement('span');
  const ehPlus = ferramenta.plano === 'plus';
  etiquetaPlano.className = ehPlus ? 'etiqueta etiqueta--plus' : 'etiqueta etiqueta--gratis';
  etiquetaPlano.textContent = t(ehPlus ? 'compartilhado.ferramenta.plano_plus' : 'compartilhado.ferramenta.plano_gratis');
  meta.append(etiquetaPlano);

  ligacao.append(criarIcone(ferramenta.icone, 'icone lista-densa__icone'), nome, descricao, meta);
  item.append(ligacao);

  if (typeof aoFavoritar === 'function') {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-icone lista-densa__favorito';
    botao.setAttribute('aria-pressed', guardado ? 'true' : 'false');
    botao.setAttribute('aria-label', t(guardado ? 'catalogo.favorito.tirar' : 'catalogo.favorito.guardar', { nome: ferramenta.nome }));
    botao.append(criarIcone(guardado ? 'estrela-cheia' : 'estrela', 'icone icone--20'));
    botao.addEventListener('click', () => aoFavoritar(ferramenta.slug, ferramenta.nome, botao));
    item.append(botao);
  }

  return item;
}
