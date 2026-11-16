import { carregarAtualizacoes } from '../núcleo/atualizacoes.js';

const en = document.documentElement.lang === 'en';
const nomes = en
  ? { novo: 'New', melhoria: 'Improvement', correcao: 'Fix', ler: 'Read update', fechar: 'Close', link: 'Copy link', copiado: 'Link copied', selecione: 'Copy this link from the address bar:', erro: 'Updates could not be loaded right now.', destaques: 'What changed', ferramentas: 'Related tools', abrirFerramenta: 'Open tool', conversar: 'Chat with Flower', verFerramentas: 'Browse all tools', noSite: 'On this portal', destaqueSemApi: 'Standard answers are available without an online AI connection.' }
  : { novo: 'Novidade', melhoria: 'Melhoria', correcao: 'Correção', ler: 'Ler atualização', fechar: 'Fechar', link: 'Copiar link', copiado: 'Link copiado', selecione: 'Copie este link na barra de endereço:', erro: 'Não foi possível carregar as atualizações agora.', destaques: 'O que mudou', ferramentas: 'Ferramentas relacionadas', abrirFerramenta: 'Abrir ferramenta', conversar: 'Conversar com a Flower', verFerramentas: 'Ver todas as ferramentas', noSite: 'Neste portal', destaqueSemApi: 'Respostas padrão disponíveis sem uma conexão de IA online.' };
const lista = document.getElementById('lista-atualizacoes');
const status = document.getElementById('estado-atualizacoes');
const vazio = document.getElementById('vazio-atualizacoes');
const tentar = document.getElementById('tentar-atualizacoes');
let itens = [], filtro = 'todas';

// Metadados de apresentação permanecem na página: o schema do CMS continua enxuto.
// Os slugs abaixo são resolvidos contra o catálogo oficial antes de virar link.
const enriquecimentos = {
  'ocr-scanner-e-markdown': {
    visual: 'documento', etiqueta: 'OCR · PDF · MD',
    destaques: en
      ? ['Recognize Portuguese, English or Spanish text and review it before downloading.', 'Organize, crop and adjust photos before creating a PDF.', 'Export selectable PDF text as Markdown, with a structured preview.']
      : ['Reconheça português, inglês ou espanhol e revise o texto antes de baixar.', 'Organize, corte e trate as fotos antes de criar um PDF.', 'Leve o texto selecionável de PDFs para Markdown, com prévia estruturada.'],
    ferramentas: ['ocr-de-imagem', 'ocr-pdf', 'digitalizar-para-pdf', 'pdf-para-markdown'],
  },
  'flower-sua-assistente-no-portal': {
    visual: 'flower', etiqueta: 'FLOWER', flor: true,
    destaques: en
      ? ['Open the chat from the floating Flower button.', 'Standard replies work without an AI provider.', 'Online replies need a configured server and provider.']
      : ['Abra o chat pelo botão flutuante da Flower.', 'Respostas padrão funcionam sem provedor de IA.', 'Respostas online dependem de servidor e provedor configurados.'],
  },
  'flower-interativa-e-ajuda-guiada': {
    visual: 'flower', etiqueta: 'FLOWER', flor: true,
    destaques: en
      ? ['Tap or open Flower’s orange avatar to start.', 'Typing feedback and a guided help path make the chat easier to follow.', 'Browse the 12 help topics or open the full tool catalog.']
      : ['Toque no avatar laranja da Flower para começar.', 'A indicação de digitação e a ajuda guiada deixam o chat mais claro.', 'Explore os 12 assuntos de ajuda ou abra o catálogo de ferramentas.'],
  },
  'editores-pdf-imagens-audio-video-office': {
    visual: 'arquivos', etiqueta: '7 EDITORES',
    destaques: en
      ? ['Edit PDF and image layers in the browser.', 'Trim and adjust audio or video, then preview the result.', 'Revise DOCX/TXT, PPTX, and XLSX/CSV files.']
      : ['Edite PDF e camadas de imagem no navegador.', 'Corte e ajuste áudio ou vídeo e confira o resultado.', 'Revise arquivos DOCX/TXT, PPTX e XLSX/CSV.'],
    ferramentas: ['editar-pdf', 'editor-de-fotos', 'cortar-video-e-audio', 'converter-audio', 'editor-de-documentos', 'editor-de-apresentacoes', 'editor-de-planilhas'],
  },
  'blog-e-central-de-notificacoes': {
    visual: 'registro', etiqueta: 'BLOG',
    destaques: en
      ? ['Filter updates by type.', 'Open a post to read its details.', 'Notification preferences stay on this device.']
      : ['Filtre as publicações por tipo.', 'Abra um post para ler os detalhes.', 'As preferências do sino ficam salvas neste aparelho.'],
  },
  'excel-com-apresentacao-profissional': {
    visual: 'planilha', etiqueta: 'XLSX',
    destaques: en
      ? ['Headers and long cells are easier to read.', 'Professional reports include filters and frozen headers.', 'Values, formulas, and cell positions stay intact.']
      : ['Cabeçalhos e textos longos ficam mais fáceis de ler.', 'Relatórios profissionais trazem filtros e cabeçalhos fixos.', 'Valores, fórmulas e posições das células são preservados.'],
    ferramentas: ['editor-de-planilhas'],
  },
  'pdf-recibos-propostas-identidade-visual': {
    visual: 'documento', etiqueta: 'PDF',
    destaques: en
      ? ['Add your business identity to a receipt or proposal.', 'Review the PDF preview before downloading.']
      : ['Inclua a identidade do negócio no recibo ou na proposta.', 'Confira a prévia do PDF antes de baixar.'],
    ferramentas: ['recibo', 'orcamento'],
  },
  'relatorio-financeiro-indicadores-graficos': {
    visual: 'grafico', etiqueta: 'VPL · TIR',
    destaques: en
      ? ['Calculate NPV from the cash flows you enter.', 'Review IRR when the cash-flow pattern supports it.', 'Compare sensitivity scenarios based on your assumptions.']
      : ['Calcule VPL com os fluxos que você informar.', 'Consulte a TIR quando o padrão dos fluxos permitir.', 'Compare cenários de sensibilidade com as premissas usadas.'],
    ferramentas: ['orcamento-capital-vpl-tir'],
  },
  'animacoes-geracao-10-15-20-segundos': {
    visual: 'progresso', etiqueta: '10—20 S',
    destaques: en
      ? ['Presentation timing depends on the tool.', 'Reduced-motion preferences are respected.', 'Downloads become available when processing finishes.']
      : ['A duração depende da ferramenta usada.', 'A preferência por movimento reduzido é respeitada.', 'O download fica disponível quando o processamento termina.'],
  },
};

const raizDoSite = document.documentElement.dataset.raiz || '';
let catálogoPromise;
function obterCatálogo() {
  catálogoPromise ||= import('../../dados/catálogo.js').then((módulo) => módulo.ferramentas);
  return catálogoPromise;
}
const textosDoItem = (item) => [item?.pt?.titulo, item?.pt?.resumo, item?.pt?.conteudo, item?.en?.titulo, item?.en?.resumo, item?.en?.conteudo].filter((v) => typeof v === 'string').join('\n').toLocaleLowerCase();
async function ferramentasDoItem(item) {
  const conhecido = enriquecimentos[item.slug]?.ferramentas || [];
  // O catálogo oficial é a única fonte de slugs e nomes que podem virar links.
  const catálogo = await obterCatálogo();
  const texto = textosDoItem(item);
  const slugsDetectados = conhecido.length ? conhecido : catálogo
    .filter((ferramenta) => ferramenta.status === 'pronta' && ferramenta.nome && texto.includes(ferramenta.nome.toLocaleLowerCase()))
    .slice(0, 3).map((ferramenta) => ferramenta.slug);
  const porSlug = new Map(catálogo.filter((ferramenta) => ferramenta.status === 'pronta').map((ferramenta) => [ferramenta.slug, ferramenta]));
  return [...new Set(slugsDetectados)].map((slug) => porSlug.get(slug)).filter(Boolean).slice(0, 8);
}

function fazerVisual(item, configuração) {
  const visual = document.createElement('div');
  visual.className = `atualizacoes__visual atualizacoes__visual--${configuração?.visual || 'geral'}`;
  visual.setAttribute('aria-hidden', 'true');
  const quadro = document.createElement('span'); quadro.className = 'atualizacoes__visual-quadro';
  const etiqueta = document.createElement('b'); etiqueta.className = 'atualizacoes__visual-etiqueta'; etiqueta.textContent = configuração?.etiqueta || (en ? 'UPDATE' : 'NOVIDADE');
  const linha1 = document.createElement('i'), linha2 = document.createElement('i');
  linha1.className = 'atualizacoes__visual-linha'; linha2.className = 'atualizacoes__visual-linha atualizacoes__visual-linha--curta';
  quadro.append(etiqueta, linha1, linha2);
  const selo = document.createElement('span'); selo.className = 'atualizacoes__visual-selo';
  selo.textContent = configuração?.visual === 'flower' ? '✿' : configuração?.visual === 'grafico' ? '↗' : configuração?.visual === 'planilha' ? '▦' : configuração?.visual === 'documento' ? 'PDF' : configuração?.visual === 'arquivos' ? '✦' : configuração?.visual === 'registro' ? '≋' : '＋';
  visual.append(quadro, selo);
  return visual;
}

function montarEnriquecimento(item, ferramentas) {
  const configuração = enriquecimentos[item.slug] || {};
  const seção = document.createElement('section'); seção.className = 'atualizacoes__enriquecimento';
  seção.setAttribute('aria-label', nomes.destaques);
  const grade = document.createElement('div'); grade.className = 'atualizacoes__conteudo-visual';
  grade.append(fazerVisual(item, configuração));
  const conteúdo = document.createElement('div'); conteúdo.className = 'atualizacoes__destaques';
  const título = document.createElement('h4'); título.textContent = nomes.destaques;
  const lista = document.createElement('ul');
  for (const destaque of configuração.destaques || ferramentas.slice(0, 2).map(f => f.resumo)) { const linha = document.createElement('li'); linha.textContent = destaque; lista.append(linha); }
  conteúdo.append(título, lista);
  grade.append(conteúdo); seção.append(grade);

  if (configuração.flor) {
    const açõesFlower = document.createElement('div'); açõesFlower.className = 'atualizacoes__flower-acoes';
    const conversar = document.createElement('button'); conversar.className = 'atualizacoes__cta atualizacoes__cta--flower'; conversar.type = 'button'; conversar.textContent = nomes.conversar;
    conversar.addEventListener('click', () => window.dispatchEvent(new CustomEvent('portal:flower-abrir')));
    const verFerramentas = document.createElement('a'); verFerramentas.className = 'atualizacoes__cta atualizacoes__cta--secundario'; verFerramentas.href = `${raizDoSite}${en ? 'en/' : ''}ferramentas.html`; verFerramentas.textContent = nomes.verFerramentas;
    açõesFlower.append(conversar, verFerramentas); seção.append(açõesFlower);
  }
  if (ferramentas.length) {
    const ferramentasBox = document.createElement('div'); ferramentasBox.className = 'atualizacoes__ferramentas';
    const subtítulo = document.createElement('h4'); subtítulo.textContent = nomes.ferramentas;
    const cartões = document.createElement('ul'); cartões.className = 'atualizacoes__ferramentas-lista';
    for (const ferramenta of ferramentas) {
      const itemFerramenta = document.createElement('li');
      const link = document.createElement('a'); link.className = 'atualizacoes__ferramenta'; link.href = `${raizDoSite}f/${encodeURIComponent(ferramenta.slug)}/`;
      const nome = document.createElement('span'); nome.textContent = ferramenta.nome;
      const chamada = document.createElement('b'); chamada.textContent = nomes.abrirFerramenta;
      link.append(nome, chamada); itemFerramenta.append(link); cartões.append(itemFerramenta);
    }
    ferramentasBox.append(subtítulo, cartões); seção.append(ferramentasBox);
  }
  return seção;
}

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
    const ferramentas = item.__ferramentasRelacionadas || [];
    if (enriquecimentos[item.slug] || ferramentas.length) artigo.append(montarEnriquecimento(item, ferramentas));
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
    artigo.prepend(topo, data, titulo, resumo);
    artigo.append(abrir, detalhes);
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
    const relacionados = await Promise.all(itens.map((item) => ferramentasDoItem(item)));
    itens.forEach((item, índice) => { item.__ferramentasRelacionadas = relacionados[índice]; });
    status.textContent = itens.length ? '' : (en ? 'There are no published updates yet.' : 'Ainda não há atualizações publicadas.');
    renderizar();
    abrirHash();
  } catch (erro) {
    console.error('Falha ao renderizar atualizações.', erro);
    status.textContent = nomes.erro;
    tentar.hidden = false;
  }
}

tentar.addEventListener('click', () => carregar({ atualizar: true }));

await carregar();
