// trabalho-lista.js — linha de um trabalho "Em aberto" e linha da prévia de salvos, ambas
// montadas via createElement/textContent (nunca innerHTML).
import { formatarTempoRelativo } from '/estatico/compartilhado/compartilhado-formatar.js';
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

/** Uma linha da lista "Em aberto": ícone, título, ferramenta + tempo, retomar e excluir. */
export function montarLinhaTrabalho(trabalho, ferramenta, { aoExcluir } = {}) {
  const item = document.createElement('li');
  item.className = 'trabalho__item';

  const icone = document.createElement('span');
  icone.className = 'trabalho__item-icone';
  icone.append(criarIcone(ferramenta?.icone ?? 'trabalho', 'icone icone--20'));

  const textos = document.createElement('span');
  textos.className = 'trabalho__item-textos';

  const titulo = document.createElement('b');
  titulo.className = 'trabalho__item-titulo';
  titulo.textContent = trabalho.titulo;

  const meta = document.createElement('small');
  meta.className = 'texto-pequeno texto-2 trabalho__item-meta';
  meta.textContent = t('trabalho.em_aberto.meta', {
    ferramenta: ferramenta?.nome ?? trabalho.ferramenta_slug,
    tempo: formatarTempoRelativo(trabalho.atualizado_em),
  });

  textos.append(titulo, meta);

  const retomar = document.createElement('a');
  retomar.className = 'botao botao--secundario botao--pequeno trabalho__item-retomar';
  retomar.textContent = t('trabalho.em_aberto.retomar');
  retomar.href = ferramenta?.url
    ? `${ferramenta.url}?trabalho=${trabalho.id}`
    : `/ferramentas/${trabalho.ferramenta_slug}?trabalho=${trabalho.id}`;

  const excluir = document.createElement('button');
  excluir.type = 'button';
  excluir.className = 'botao-icone trabalho__item-excluir';
  excluir.setAttribute('aria-label', t('trabalho.em_aberto.excluir_rotulo', { titulo: trabalho.titulo }));
  excluir.append(criarIcone('excluir', 'icone icone--20'));
  if (typeof aoExcluir === 'function') {
    excluir.addEventListener('click', () => aoExcluir(trabalho, item));
  }

  item.append(icone, textos, retomar, excluir);
  return item;
}

/** Uma linha compacta da prévia de salvos (reaproveita a lista densa comum). */
export function montarLinhaSalvo(ferramenta) {
  const item = document.createElement('li');
  item.className = 'lista-densa__item';

  const ligacao = document.createElement('a');
  ligacao.className = 'lista-densa__ligacao';
  ligacao.href = ferramenta.url ?? '#';

  const nome = document.createElement('span');
  nome.className = 'lista-densa__nome';
  nome.textContent = ferramenta.nome;

  ligacao.append(criarIcone(ferramenta.icone, 'icone lista-densa__icone'), nome);
  item.append(ligacao);
  return item;
}
