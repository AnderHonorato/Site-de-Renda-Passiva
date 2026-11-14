/** Sino do cabeçalho. Lidas, limpeza e preferência ficam apenas neste aparelho. */
import { t, idioma, raizDoSite } from './idioma.js';
import { isolarBloco } from './isolar-bloco.js';
import { tocarSom } from './sons.js';
import { criarIconeMedalha } from './emblemas.js';
import { criarIconeNivel } from './nível.js';
import { carregarAtualizacoes } from './atualizacoes.js';

const CHAVE_DAS_LIDAS = 'notificacoes-lidas-v1';
const CHAVE_LIMPAS = 'notificacoes-limpas-v1';
const CHAVE_LIGADO = 'notificacoes-ligadas-v1';
const CHAVE_CONHECIDAS = 'notificacoes-conhecidas-v1';
const MÁXIMO_GUARDADO = 1000;
const fontes = new Map();
let itens = [];
let ligado = false;
let carregouAntes = false;
let aoMudar = () => {};
let itemAberto = null;
let abrirDetalhe = () => {};

const inglês = idioma === 'en';
const textos = inglês ? {
  limpar: 'Clear all',
  desligar: 'Turn off notifications', ligar: 'Turn on notifications', aparelho: 'Read status, clearing, and this setting are saved on this device.',
  voltar: 'Back to notifications', fechar: 'Close details', ir: 'Go to page', semLink: 'No page available for this notification.',
  detalhe: 'Notification details', data: 'Date', categoria: 'Category', versão: 'Version', verTodas: 'View all updates',
} : {
  limpar: 'Limpar todas',
  desligar: 'Desativar notificações', ligar: 'Ativar notificações', aparelho: 'Leituras, limpeza e esta preferência ficam salvas neste aparelho.',
  voltar: 'Voltar às notificações', fechar: 'Fechar detalhes', ir: 'Ir para página', semLink: 'Não há uma página disponível para esta notificação.',
  detalhe: 'Detalhes da notificação', data: 'Data', categoria: 'Categoria', versão: 'Versão', verTodas: 'Ver todas as atualizações',
};

function lerLista(chave) {
  try {
    const valor = JSON.parse(localStorage.getItem(chave) ?? '[]');
    return new Set(Array.isArray(valor) ? valor.filter((id) => typeof id === 'string') : []);
  } catch { return new Set(); }
}
function gravarLista(chave, conjunto) {
  try { localStorage.setItem(chave, JSON.stringify([...conjunto].slice(-MÁXIMO_GUARDADO))); } catch { /* storage indisponível */ }
}
function notificaçõesLigadas() {
  try { return localStorage.getItem(CHAVE_LIGADO) !== 'false'; } catch { return true; }
}
const éLida = (item, lidas) => item.lida === true || lidas.has(item.id);

/** Link só do próprio site. Endereços externos, protocolos diferentes e javascript: são descartados. */
export function linkSeguro(link) {
  if (typeof link !== 'string' || !link) return null;
  try {
    const url = new URL(link, new URL(raizDoSite || './', location.href));
    return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.href : null;
  } catch { return null; }
}

async function carregarDoCatálogo() {
  const resposta = await fetch(new URL(`${raizDoSite}dados/novidades.json`, location.href), { credentials: 'same-origin' });
  if (!resposta.ok) return [];
  const feed = await resposta.json();
  const língua = inglês ? 'en' : 'pt';
  return (Array.isArray(feed.itens) ? feed.itens : []).map((i) => ({
    id: i.id, título: i[língua]?.título ?? i.pt?.título ?? '', texto: i[língua]?.texto ?? i.pt?.texto ?? '',
    link: i.link, data: i.data, origem: 'catálogo',
  }));
}

async function carregarDoBlog() {
  const resultado = await carregarAtualizacoes();
  const língua = inglês ? 'en' : 'pt';
  return (Array.isArray(resultado?.itens) ? resultado.itens : []).map((i) => {
    const tradução = i[língua] ?? i.pt ?? {};
    return {
      id: `atualizacao:${i.id}`, título: tradução.titulo ?? tradução.título ?? '', texto: tradução.resumo ?? '',
      detalhe: tradução.conteudo ?? tradução.resumo ?? '', data: i.atualizado_em || i.publicado_em || '',
      link: `${inglês ? 'en/' : ''}atualizacoes.html#${encodeURIComponent(i.slug ?? '')}`,
      categoria: i.categoria, versão: i.versao, origem: 'atualizações',
    };
  });
}

/** Outras áreas registram suas notificações sem acoplar ao sino. */
export function registrarFonte(nome, { carregar, aoLer = null }) {
  fontes.set(nome, { carregar, aoLer });
  if (ligado) void recarregar();
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
  const anteriores = new Set(itens.map((item) => item.id));
  const conhecidas = lerLista(CHAVE_CONHECIDAS);
  const desligadas = !notificaçõesLigadas();
  const carregados = lotes.flat().filter((i) => !vistos.has(i.id) && vistos.add(i.id));
  // Enquanto desligado, novas entradas não aparecem. Reativar carrega a fonte e as revela.
  itens = carregados.filter((i) => !desligadas || conhecidas.has(i.id) || anteriores.has(i.id))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  if (!desligadas) for (const i of carregados) conhecidas.add(i.id);
  gravarLista(CHAVE_CONHECIDAS, conhecidas);
  const limpas = lerLista(CHAVE_LIMPAS);
  if (carregouAntes && !desligadas && itens.some((item) => !anteriores.has(item.id) && !limpas.has(item.id) && !éLida(item, lerLista(CHAVE_DAS_LIDAS)))) tocarSom('notificacao');
  carregouAntes = true;
  aoMudar();
}

function marcarComoLidas(ids) {
  const lidas = lerLista(CHAVE_DAS_LIDAS);
  for (const id of ids) lidas.add(id);
  gravarLista(CHAVE_DAS_LIDAS, lidas);
  for (const [nome, fonte] of fontes) {
    const minhas = ids.filter((id) => itens.find((i) => i.id === id)?.fonte === nome);
    if (minhas.length && fonte.aoLer) { try { fonte.aoLer(minhas); } catch (erro) { console.error(erro); } }
  }
  aoMudar();
}

function dataCurta(data) {
  if (!data) return '';
  const valor = new Date(data);
  return Number.isNaN(valor.getTime()) ? String(data) : new Intl.DateTimeFormat(inglês ? 'en' : 'pt-BR', { dateStyle: 'medium' }).format(valor);
}
const relativo = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat(inglês ? 'en' : 'pt-BR', { numeric: 'auto' }) : null;
function quandoFoi(data) {
  const dias = Math.round((Date.parse(`${String(data).slice(0, 10)}T00:00:00`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00`)) / 86400000);
  if (!relativo || Number.isNaN(dias)) return '';
  if (dias > -30) return relativo.format(dias, 'day');
  return relativo.format(Math.round(dias / 30), 'month');
}
function texto(tag, classe, conteúdo) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  el.textContent = conteúdo ?? '';
  return el;
}

function desenhar(botão, contador, lista, vazio, marcarTodas, limparTodas, alternar) {
  const lidas = lerLista(CHAVE_DAS_LIDAS);
  const limpas = lerLista(CHAVE_LIMPAS);
  const visíveis = itens.filter((i) => !limpas.has(i.id));
  const nãoLidas = visíveis.filter((i) => !éLida(i, lidas));
  const ligada = notificaçõesLigadas();
  contador.hidden = !ligada || nãoLidas.length === 0;
  contador.textContent = nãoLidas.length > 9 ? '9+' : String(nãoLidas.length);
  botão.dataset.novas = ligada && nãoLidas.length ? 'sim' : 'não';
  botão.setAttribute('aria-label', ligada && nãoLidas.length
    ? t('notificações.rótuloComNovas', { n: nãoLidas.length }) : t('notificações.rótulo'));
  marcarTodas.hidden = nãoLidas.length === 0;
  limparTodas.hidden = visíveis.length === 0;
  alternar.textContent = ligada ? textos.desligar : textos.ligar;
  alternar.setAttribute('aria-pressed', String(ligada));
  vazio.hidden = visíveis.length > 0;
  lista.replaceChildren(...visíveis.map((item) => {
    const linha = document.createElement('li');
    const corpo = document.createElement('button');
    corpo.type = 'button';
    corpo.className = 'notificações__item';
    corpo.setAttribute('aria-label', `${item.título}${item.texto ? ` — ${item.texto}` : ''}`);
    if (item.conquista) {
      corpo.classList.add('notificações__item--conquista');
      const selo = document.createElement('span'); selo.className = 'notificações__insignia'; selo.setAttribute('aria-hidden', 'true');
      selo.append(item.conquista.tipo === 'nivel' ? criarIconeNivel(item.conquista.nivel) : criarIconeMedalha(item.conquista.medalha)); corpo.append(selo);
    }
    if (!éLida(item, lidas)) corpo.dataset.nova = 'sim';
    const conteúdo = document.createElement('span'); conteúdo.className = 'notificações__conteúdo';
    conteúdo.append(texto('b', '', item.título), texto('span', '', item.texto ?? ''), texto('small', '', quandoFoi(item.data)));
    corpo.append(conteúdo);
    corpo.addEventListener('click', () => {
      abrirDetalhe(item);
      // A leitura redesenha a lista; adie até o click ter subido ao documento para que o
      // listener de clique externo ainda reconheça o item como parte do painel.
      queueMicrotask(() => marcarComoLidas([item.id]));
    });
    linha.append(corpo);
    return linha;
  }));
  if (itemAberto && !visíveis.some((item) => item.id === itemAberto.id)) itemAberto = null;
}

/** Liga o sino já presente no cabeçalho e cria a vista de detalhes dentro do painel. */
export function ligarNotificações() {
  const raiz = document.getElementById('notificações');
  const botão = document.getElementById('abrir-notificações');
  const painel = document.getElementById('painel-notificações');
  if (!raiz || !botão || !painel) return;
  if (raiz.dataset.notificaçõesLigadas === 'sim') return;
  raiz.dataset.notificaçõesLigadas = 'sim';
  const contador = botão.querySelector('.notificações__contador');
  const lista = painel.querySelector('.notificações__lista');
  const vazio = painel.querySelector('.notificações__vazio');
  const marcarTodas = painel.querySelector('[data-notificações="marcar-todas"]');
  if (!contador || !lista || !vazio || !marcarTodas) throw new Error('O sino de notificações está incompleto no HTML.');

  const detalhe = document.createElement('section');
  detalhe.className = 'notificações__detalhe'; detalhe.hidden = true;
  detalhe.setAttribute('role', 'dialog'); detalhe.setAttribute('aria-modal', 'false'); detalhe.setAttribute('aria-label', textos.detalhe);
  const detalheTopo = document.createElement('div'); detalheTopo.className = 'notificações__topo notificações__topo--detalhe';
  const voltar = document.createElement('button'); voltar.type = 'button'; voltar.className = 'botão botão--texto'; voltar.textContent = textos.voltar;
  const fecharDetalhe = document.createElement('button'); fecharDetalhe.type = 'button'; fecharDetalhe.className = 'notificações__fechar'; fecharDetalhe.setAttribute('aria-label', textos.fechar); fecharDetalhe.textContent = '×';
  const detalheTítulo = document.createElement('h2'); detalheTítulo.className = 'notificações__detalhe-título'; detalheTítulo.id = 'notificações-detalhe-título'; detalhe.setAttribute('aria-labelledby', detalheTítulo.id);
  detalheTopo.append(voltar, fecharDetalhe); const detalheCorpo = document.createElement('div'); detalheCorpo.className = 'notificações__detalhe-corpo';
  const irPara = document.createElement('a'); irPara.className = 'botão botão--primário notificações__ir'; irPara.textContent = textos.ir;
  detalhe.append(detalheTopo, detalheTítulo, detalheCorpo, irPara);

  const rodapé = document.createElement('div'); rodapé.className = 'notificações__rodapé';
  const limparTodas = document.createElement('button'); limparTodas.type = 'button'; limparTodas.className = 'botão botão--texto'; limparTodas.textContent = textos.limpar; limparTodas.dataset.notificações = 'limpar-todas';
  const alternar = document.createElement('button'); alternar.type = 'button'; alternar.className = 'botão botão--texto'; alternar.dataset.notificações = 'alternar';
  const verTodas = document.createElement('a'); verTodas.className = 'botão botão--texto notificações__ver-todas'; verTodas.textContent = textos.verTodas;
  verTodas.href = linkSeguro(`${inglês ? 'en/' : ''}atualizacoes.html`);
  const aparelho = texto('small', 'notificações__aparelho', textos.aparelho);
  rodapé.append(limparTodas, alternar, verTodas, aparelho);
  painel.append(detalhe, rodapé);

  const voltarLista = () => { itemAberto = null; detalhe.hidden = true; lista.hidden = false; vazio.hidden = itens.filter(i => !lerLista(CHAVE_LIMPAS).has(i.id)).length > 0; painel.querySelector('.notificações__topo').hidden = false; marcarTodas.hidden = !itens.some(i => !lerLista(CHAVE_LIMPAS).has(i.id) && !éLida(i, lerLista(CHAVE_DAS_LIDAS))); (lista.querySelector('.notificações__item') || lista).focus(); };
  abrirDetalhe = (item) => {
    itemAberto = item;
    detalheTítulo.textContent = item.título;
    detalheCorpo.replaceChildren(texto('p', 'notificações__detalhe-resumo', item.texto ?? ''));
    if (item.detalhe) detalheCorpo.append(texto('div', 'notificações__detalhe-texto', item.detalhe));
    const metadados = [item.categoria && `${textos.categoria}: ${item.categoria}`, item.versão && `${textos.versão}: ${item.versão}`, item.data && `${textos.data}: ${dataCurta(item.data)}`].filter(Boolean);
    if (metadados.length) detalheCorpo.append(texto('small', 'notificações__metadados', metadados.join(' · ')));
    const href = linkSeguro(item.link);
    irPara.hidden = !href;
    if (href) irPara.href = href; else detalheCorpo.append(texto('p', 'notificações__sem-link', textos.semLink));
    painel.querySelector('.notificações__topo').hidden = true;
    lista.hidden = true; vazio.hidden = true; detalhe.hidden = false;
    fecharDetalhe.focus();
  };
  // A função desenhar usa este fechamento em cada item, mantendo leitura e abertura sincronizadas.
  aoMudar = () => desenhar(botão, contador, lista, vazio, marcarTodas, limparTodas, alternar);
  voltar.addEventListener('click', voltarLista);
  fecharDetalhe.addEventListener('click', voltarLista);
  marcarTodas.addEventListener('click', () => { marcarComoLidas(itens.filter(i => !lerLista(CHAVE_LIMPAS).has(i.id)).map((i) => i.id)); lista.focus(); });
  limparTodas.addEventListener('click', () => {
    const limpas = lerLista(CHAVE_LIMPAS);
    for (const item of itens) limpas.add(item.id);
    gravarLista(CHAVE_LIMPAS, limpas);
    aoMudar(); voltarLista();
  });
  alternar.addEventListener('click', () => {
    try { localStorage.setItem(CHAVE_LIGADO, String(!notificaçõesLigadas())); } catch { /* storage indisponível */ }
    aoMudar();
    if (notificaçõesLigadas()) void recarregar();
  });
  botão.addEventListener('click', () => {
    const abrindo = painel.hidden;
    if (abrindo) posicionarPainel();
    painel.hidden = !abrindo; botão.setAttribute('aria-expanded', String(abrindo));
    if (!abrindo && !detalhe.hidden) voltarLista();
  });
  document.addEventListener('click', (evento) => {
    const caminho = typeof evento.composedPath === 'function' ? evento.composedPath() : [];
    if (!painel.hidden && evento.target instanceof Node && !raiz.contains(evento.target) && !caminho.includes(raiz)) { painel.hidden = true; botão.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || painel.hidden) return;
    evento.preventDefault();
    if (!detalhe.hidden) voltarLista();
    else { painel.hidden = true; botão.setAttribute('aria-expanded', 'false'); botão.focus(); }
  });
  const posicionarPainel = () => {
    if (matchMedia('(max-width: 720px)').matches) {
      const caixa = botão.getBoundingClientRect();
      const margem = 12;
      const largura = Math.min(380, innerWidth - margem * 2);
      const esquerda = Math.max(margem, Math.min(caixa.right - largura, innerWidth - margem - largura));
      painel.style.left = `${esquerda}px`;
      painel.style.right = 'auto';
      painel.style.top = `${Math.max(8, caixa.bottom + 8)}px`;
    } else {
      painel.style.left = '';
      painel.style.right = '';
      painel.style.top = '';
    }
  };
  window.addEventListener('resize', () => { if (!painel.hidden) posicionarPainel(); });
  window.addEventListener('scroll', () => { if (!painel.hidden) posicionarPainel(); }, true);
  window.addEventListener('storage', (evento) => {
    if ([CHAVE_DAS_LIDAS, CHAVE_LIMPAS, CHAVE_LIGADO].includes(evento.key)) {
      if (evento.key === CHAVE_LIGADO && notificaçõesLigadas()) void recarregar();
      else aoMudar();
      if (evento.key === CHAVE_LIMPAS && !detalhe.hidden && !itemAberto) voltarLista();
    }
  });

  ligado = true;
  if (!fontes.has('catálogo')) fontes.set('catálogo', { carregar: carregarDoCatálogo, aoLer: null });
  if (!fontes.has('atualizações')) fontes.set('atualizações', { carregar: carregarDoBlog, aoLer: null });
  const começar = () => isolarBloco('notificações-carregar', recarregar);
  if ('requestIdleCallback' in window) requestIdleCallback(começar, { timeout: 2500 }); else setTimeout(começar, 800);
}
