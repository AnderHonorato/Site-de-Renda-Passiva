/**
 * Sino de notificações do cabeçalho: para quem tem conta e para quem não tem.
 *
 * O sino junta itens de várias FONTES. A fonte "catálogo" já vem pronta: lê `dados/novidades.json`, o feed que o
 * `npm run gerar` monta sozinho a cada ferramenta nova, e o item leva para a página da ferramenta. Outras fontes
 * (os avisos da conta, no servidor) se registram com `registrarFonte`. Quem está sem conta tem tudo isso e a
 * lista de lidas fica no aparelho (localStorage); a fonte da conta pode dizer `lida` por conta própria.
 *
 *   registrarFonte('conta', { carregar: async () => [{ id, título, texto, link?, data, origem, lida? }], aoLer: (ids) => {} })
 *
 * O texto dos itens entra sempre por `textContent`, e o link só vale se for do próprio site.
 */
import { t, idioma, raizDoSite } from './idioma.js';
import { isolarBloco } from './isolar-bloco.js';
import { tocarSom } from './sons.js';

const CHAVE_DAS_LIDAS = 'notificacoes-lidas-v1';
const MÁXIMO_DE_LIDAS = 300;

const fontes = new Map();
/** @type {{id: string, título: string, texto: string, link?: string, data: string, origem: string, lida?: boolean, fonte: string}[]} */
let itens = [];
let ligado = false;
let carregouAntes=false;
let aoMudar = () => {};

/* ------------------------------------------------------------------ lidas (no aparelho) */

function lerLidas() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_DAS_LIDAS) ?? '[]');
    return new Set(Array.isArray(lista) ? lista.filter((id) => typeof id === 'string') : []);
  } catch { return new Set(); }
}

function gravarLidas(conjunto) {
  try { localStorage.setItem(CHAVE_DAS_LIDAS, JSON.stringify([...conjunto].slice(-MÁXIMO_DE_LIDAS))); } catch { /* sem armazenamento */ }
}

const éLida = (item, lidas) => item.lida === true || lidas.has(item.id);

/* ------------------------------------------------------------------ fontes */

/** Link só do próprio site; qualquer outra coisa (outro endereço, javascript:) vira nenhum link. */
export function linkSeguro(link) {
  if (typeof link !== 'string' || !link) return null;
  try {
    const url = new URL(link, new URL(raizDoSite || './', location.href));
    return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

/** Fonte automática: novas ferramentas, a partir do feed gerado com o site. */
async function carregarDoCatálogo() {
  const resposta = await fetch(new URL(`${raizDoSite}dados/novidades.json`, location.href), { credentials: 'same-origin' });
  if (!resposta.ok) return [];
  const feed = await resposta.json();
  const língua = idioma === 'en' ? 'en' : 'pt';
  return (Array.isArray(feed.itens) ? feed.itens : []).map((i) => ({
    id: i.id,
    título: i[língua]?.título ?? i.pt?.título ?? '',
    texto: i[língua]?.texto ?? i.pt?.texto ?? '',
    link: i.link,
    data: i.data,
    origem: 'catálogo',
  }));
}

/** Registra uma fonte de notificações e recarrega o sino. */
export function registrarFonte(nome, { carregar, aoLer = null }) {
  fontes.set(nome, { carregar, aoLer });
  if (ligado) recarregar();
}

async function recarregar() {
  const lotes = await Promise.all([...fontes.entries()].map(async ([nome, fonte]) => {
    try {
      const lista = await fonte.carregar();
      return (Array.isArray(lista) ? lista : []).filter((i) => i && typeof i.id === 'string' && i.título).map((i) => ({ ...i, fonte: nome }));
    } catch (erro) {
      console.error(`[notificações] fonte "${nome}" falhou`, erro);
      return [];
    }
  }));
  const vistos = new Set();
  const anteriores = new Set(itens.map(item=>item.id));
  itens = lotes.flat()
    .filter((i) => (vistos.has(i.id) ? false : vistos.add(i.id)))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  if(carregouAntes&&itens.some(item=>!anteriores.has(item.id)&&!éLida(item,lerLidas())))tocarSom('notificacao');
  carregouAntes=true;
  aoMudar();
}

function marcarComoLidas(ids) {
  const lidas = lerLidas();
  for (const id of ids) lidas.add(id);
  gravarLidas(lidas);
  for (const [nome, fonte] of fontes) {
    const meus = ids.filter((id) => itens.find((i) => i.id === id)?.fonte === nome);
    if (meus.length && fonte.aoLer) { try { fonte.aoLer(meus); } catch (erro) { console.error(erro); } }
  }
  aoMudar();
}

/* ------------------------------------------------------------------ tela */

const relativo = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat(idioma === 'en' ? 'en' : 'pt-BR', { numeric: 'auto' }) : null;

function quandoFoi(data) {
  const dias = Math.round((Date.parse(`${String(data).slice(0, 10)}T00:00:00`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00`)) / 86400000);
  if (!relativo || Number.isNaN(dias)) return '';
  if (dias > -30) return relativo.format(dias, 'day');
  return relativo.format(Math.round(dias / 30), 'month');
}

function desenhar(botão, contador, painel, lista, vazio, marcarTodas) {
  const lidas = lerLidas();
  const naoLidas = itens.filter((i) => !éLida(i, lidas));
  contador.hidden = naoLidas.length === 0;
  contador.textContent = naoLidas.length > 9 ? '9+' : String(naoLidas.length);
  botão.dataset.novas = naoLidas.length > 0 ? 'sim' : 'não';
  botão.setAttribute('aria-label', naoLidas.length > 0
    ? t('notificações.rótuloComNovas', { n: naoLidas.length }) : t('notificações.rótulo'));
  marcarTodas.hidden = naoLidas.length === 0;
  vazio.hidden = itens.length > 0;
  lista.replaceChildren(...itens.map((item) => {
    const linha = document.createElement('li');
    const href = linkSeguro(item.link);
    const corpo = document.createElement(href ? 'a' : 'div');
    corpo.className = 'notificações__item';
    if (href) corpo.href = href;
    if (!éLida(item, lidas)) corpo.dataset.nova = 'sim';
    const título = document.createElement('b');
    título.textContent = item.título;
    const texto = document.createElement('span');
    texto.textContent = item.texto ?? '';
    const data = document.createElement('small');
    data.textContent = quandoFoi(item.data);
    corpo.append(título, texto, data);
    corpo.addEventListener('click', () => marcarComoLidas([item.id]));
    linha.append(corpo);
    return linha;
  }));
}

/** Liga o sino que já está no HTML do cabeçalho. */
export function ligarNotificações() {
  const raiz = document.getElementById('notificações');
  const botão = document.getElementById('abrir-notificações');
  const painel = document.getElementById('painel-notificações');
  if (!raiz || !botão || !painel) return;
  const contador = botão.querySelector('.notificações__contador');
  const lista = painel.querySelector('.notificações__lista');
  const vazio = painel.querySelector('.notificações__vazio');
  const marcarTodas = painel.querySelector('[data-notificações="marcar-todas"]');
  if (!contador || !lista || !vazio || !marcarTodas) throw new Error('O sino de notificações está incompleto no HTML.');

  aoMudar = () => desenhar(botão, contador, painel, lista, vazio, marcarTodas);
  ligado = true;

  const fechar = () => { painel.hidden = true; botão.setAttribute('aria-expanded', 'false'); };
  const abrir = () => { painel.hidden = false; botão.setAttribute('aria-expanded', 'true'); };
  botão.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  marcarTodas.addEventListener('click', () => marcarComoLidas(itens.map((i) => i.id)));
  document.addEventListener('click', (evento) => {
    if (!painel.hidden && evento.target instanceof Node && !raiz.contains(evento.target)) fechar();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !painel.hidden) { fechar(); botão.focus(); }
  });

  if (!fontes.has('catálogo')) fontes.set('catálogo', { carregar: carregarDoCatálogo, aoLer: null });
  // O feed é pequeno, mas não disputa o carregamento da página.
  const começar = () => isolarBloco('notificações-carregar', recarregar);
  if ('requestIdleCallback' in window) requestIdleCallback(começar, { timeout: 2500 }); else setTimeout(começar, 800);
}
