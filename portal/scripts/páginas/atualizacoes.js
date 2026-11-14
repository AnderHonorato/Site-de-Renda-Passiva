import { carregarAtualizacoes } from '../núcleo/atualizacoes.js';

const en = document.documentElement.lang === 'en';
const nomes = en
  ? { novo: 'New', melhoria: 'Improvement', correcao: 'Fix', ler: 'Read update', fechar: 'Close', link: 'Copy link', copiado: 'Link copied', selecione: 'Copy this link from the address bar:', erro: 'Updates could not be loaded right now.' }
  : { novo: 'Novidade', melhoria: 'Melhoria', correcao: 'Correção', ler: 'Ler atualização', fechar: 'Fechar', link: 'Copiar link', copiado: 'Link copiado', selecione: 'Copie este link na barra de endereço:', erro: 'Não foi possível carregar as atualizações agora.' };
const lista = document.getElementById('lista-atualizacoes');
const status = document.getElementById('estado-atualizacoes');
const vazio = document.getElementById('vazio-atualizacoes');
const tentar = document.getElementById('tentar-atualizacoes');
let itens = [], filtro = 'todas';

const escaparSlug = (valor) => String(valor || '').trim();
const dataFormatada = (valor) => {
  const data = new Date(valor);
  if (!valor || Number.isNaN(data.valueOf())) return '';
  return new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(data);
};
const textoDo = (item, campo) => {
  const pt = item?.pt?.[campo] ?? '';
  const lingua = en ? item?.en?.[campo] : '';
  return String(lingua || pt || '');
};

function renderizar() {
  const visiveis = itens.filter((item) => filtro === 'todas' || item.categoria === filtro);
  lista.replaceChildren();
  vazio.hidden = visiveis.length > 0;
  for (const item of visiveis) {
    const li = document.createElement('li');
    li.className = 'atualizacoes__item';
    li.dataset.categoria = item.categoria;
    const artigo = document.createElement('article');
    artigo.className = 'atualizacoes__cartao';
    artigo.id = escaparSlug(item.slug);
    const topo = document.createElement('div');
    topo.className = 'atualizacoes__meta';
    const categoria = document.createElement('span');
    categoria.className = `atualizacoes__categoria atualizacoes__categoria--${item.categoria}`;
    categoria.textContent = nomes[item.categoria] || nomes.novo;
    const versao = document.createElement('span');
    versao.className = 'atualizacoes__versao';
    versao.textContent = item.versao ? `v${item.versao}` : '';
    topo.append(categoria, versao);
    const data = document.createElement('time');
    data.className = 'atualizacoes__data';
    data.dateTime = item.publicado_em || '';
    data.textContent = dataFormatada(item.publicado_em);
    const titulo = document.createElement('h3');
    titulo.textContent = textoDo(item, 'titulo');
    const resumo = document.createElement('p');
    resumo.className = 'atualizacoes__resumo';
    resumo.textContent = textoDo(item, 'resumo');
    const detalhes = document.createElement('div');
    detalhes.className = 'atualizacoes__detalhes';
    detalhes.hidden = decodeHash() !== item.slug;
    const texto = document.createElement('div');
    texto.className = 'atualizacoes__texto';
    for (const paragrafo of textoDo(item, 'conteudo').split(/\n\s*\n|\r?\n/u).map((s) => s.trim()).filter(Boolean)) {
      const p = document.createElement('p'); p.textContent = paragrafo; texto.append(p);
    }
    const acoes = document.createElement('div'); acoes.className = 'atualizacoes__acoes';
    const permalink = document.createElement('a');
    permalink.className = 'atualizacoes__permalink';
    permalink.href = `#${encodeURIComponent(item.slug)}`;
    permalink.textContent = nomes.link;
    permalink.addEventListener('click', (event) => {
      event.preventDefault();
      const hash = `#${encodeURIComponent(item.slug)}`;
      if (location.hash === hash) abrirHash({ focar: true }); else location.hash = encodeURIComponent(item.slug);
      const endereço = `${location.origin}${location.pathname}#${encodeURIComponent(item.slug)}`;
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(endereço).then(() => { status.textContent = nomes.copiado; }).catch(() => { status.textContent = `${nomes.selecione} ${endereço}`; });
      else status.textContent = `${nomes.selecione} ${endereço}`;
    });
    acoes.append(permalink);
    detalhes.append(texto, acoes);
    const abrir = document.createElement('button');
    abrir.className = 'atualizacoes__abrir'; abrir.type = 'button';
    abrir.textContent = detalhes.hidden ? nomes.ler : nomes.fechar;
    abrir.setAttribute('aria-expanded', String(!detalhes.hidden));
    abrir.addEventListener('click', () => {
      detalhes.hidden = !detalhes.hidden;
      abrir.setAttribute('aria-expanded', String(!detalhes.hidden));
      abrir.textContent = detalhes.hidden ? nomes.ler : nomes.fechar;
      if (!detalhes.hidden) {
        const hash = `#${encodeURIComponent(item.slug)}`;
        if (location.hash === hash) abrirHash({ focar: true }); else location.hash = encodeURIComponent(item.slug);
      }
      else if (location.hash === `#${item.slug}`) history.replaceState(null, '', location.pathname + location.search);
    });
    artigo.append(topo, data, titulo, resumo, abrir, detalhes);
    li.append(artigo); lista.append(li);
  }
}

function decodeHash() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch { return ''; }
}
function abrirHash({ focar = false } = {}) {
  const slug = decodeHash();
  const item = itens.find((atual) => atual.slug === slug);
  if (!item) return;
  if (filtro !== 'todas' && filtro !== item.categoria) {
    filtro = 'todas';
    document.querySelectorAll('[data-filtro]').forEach((botao) => botao.setAttribute('aria-pressed', String(botao.dataset.filtro === 'todas')));
    renderizar();
  }
  const artigo = document.getElementById(slug);
  if (!artigo) return;
  const detalhes = artigo.querySelector('.atualizacoes__detalhes');
  const botão = artigo.querySelector('.atualizacoes__abrir');
  if (detalhes) detalhes.hidden = false;
  if (botão) { botão.setAttribute('aria-expanded', 'true'); botão.textContent = nomes.fechar; }
  if (focar) {
    artigo.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const titulo = artigo.querySelector('h3');
    titulo?.setAttribute('tabindex', '-1');
    titulo?.focus({ preventScroll: true });
  }
}

document.querySelectorAll('[data-filtro]').forEach((botao) => botao.addEventListener('click', () => {
  filtro = botao.dataset.filtro;
  document.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
  renderizar();
}));

window.addEventListener('hashchange', () => abrirHash({ focar: true }));

async function carregar({ atualizar = false } = {}) {
  tentar.hidden = true;
  try {
    const feed = await carregarAtualizacoes({ atualizar });
    itens = Array.isArray(feed) ? feed : Array.isArray(feed?.itens) ? feed.itens : [];
    status.textContent = itens.length ? '' : (en ? 'There are no published updates yet.' : 'Ainda não há atualizações publicadas.');
    renderizar();
    abrirHash();
  } catch {
    status.textContent = nomes.erro;
    tentar.hidden = false;
  }
}

tentar.addEventListener('click', () => carregar({ atualizar: true }));

await carregar();
