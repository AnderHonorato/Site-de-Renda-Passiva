// erro.js — mostra as ferramentas mais usadas na página de erro, quando o catálogo responde.
import { chamarApi } from '/estatico/compartilhado/compartilhado-api.js';

const QUANTIDADE = 6;

function montarItem(ferramenta) {
  const item = document.createElement('li');
  item.className = 'lista-densa__item';

  const ligacao = document.createElement('a');
  ligacao.className = 'lista-densa__ligacao';
  ligacao.href = ferramenta.url ?? `/ferramentas/${ferramenta.slug}`;

  const icone = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icone.setAttribute('class', 'icone lista-densa__icone');
  icone.setAttribute('aria-hidden', 'true');
  const uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', `/estatico/compartilhado/compartilhado-icones.svg#icone-${ferramenta.icone}`);
  icone.append(uso);

  const nome = document.createElement('span');
  nome.className = 'lista-densa__nome';
  nome.textContent = ferramenta.nome;

  const descricao = document.createElement('span');
  descricao.className = 'lista-densa__descricao';
  descricao.textContent = ferramenta.descricao;

  ligacao.append(icone, nome, descricao);
  item.append(ligacao);
  return item;
}

async function mostrarMaisUsadas() {
  const secao = document.querySelector('.erro__mais-usadas');
  const lista = document.querySelector('.erro__lista');
  if (!secao || !lista) return;

  try {
    const resposta = await chamarApi('/api/ferramentas');
    const prontas = (resposta?.ferramentas ?? []).filter((f) => f.estado === 'pronta').slice(0, QUANTIDADE);
    if (!prontas.length) return;
    for (const ferramenta of prontas) lista.append(montarItem(ferramenta));
    secao.hidden = false;
  } catch {
    // Sem catálogo agora: a página de erro continua útil com a busca e os atalhos.
  }
}

function focarBusca() {
  const campo = document.querySelector('.busca-intencao__entrada');
  if (campo) campo.focus();
}

mostrarMaisUsadas();
focarBusca();