const principaisPdf = [
  'juntar-pdfs',
  'separar-paginas-de-pdf',
  'organizar-paginas-de-pdf',
  'girar-paginas-de-pdf',
  'imagens-para-pdf',
  'pdf-para-imagens'
];

const principaisImagem = [
  'comprimir-imagem',
  'redimensionar-imagem',
  'converter-formato-de-imagem',
  'recortar-imagem',
  'girar-e-espelhar-imagem',
  'remover-metadados-de-imagem'
];

const visualPorFerramenta = {
  'juntar-pdfs': 'pilha',
  'separar-paginas-de-pdf': 'dividir',
  'organizar-paginas-de-pdf': 'organizar',
  'girar-paginas-de-pdf': 'girar',
  'imagens-para-pdf': 'imagem-pdf',
  'pdf-para-imagens': 'pdf-imagem',
  'numerar-paginas-de-pdf': 'numerar',
  'marca-dagua-em-pdf': 'marca',
  'informacoes-do-pdf': 'info',
  'extrair-texto-de-pdf': 'texto',
  'redimensionar-imagem': 'redimensionar',
  'comprimir-imagem': 'comprimir',
  'converter-formato-de-imagem': 'converter',
  'recortar-imagem': 'recortar',
  'girar-e-espelhar-imagem': 'espelhar',
  'marca-dagua-pessoal': 'marca-imagem',
  'remover-metadados-de-imagem': 'privacidade',
  'paleta-de-cores-de-imagem': 'paleta',
  'imagem-em-tons-de-cinza': 'cinza',
  'folha-de-contato-de-imagens': 'grade'
};

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto != null) el.textContent = texto;
  return el;
}

function montarRecorte(ferramenta, categoria) {
  const recorte = criar('span', `recorte-visual recorte-${visualPorFerramenta[ferramenta.id] || 'padrao'}`);
  recorte.setAttribute('aria-hidden', 'true');
  recorte.style.setProperty('--cor-recorte', categoria.cor);
  recorte.innerHTML = '<i></i><i></i><i></i><b></b>';
  return recorte;
}

function criarCard(ferramenta, categoria, abrir) {
  const botao = criar('button', 'card-midia');
  botao.type = 'button';
  botao.style.setProperty('--cor-midia', categoria.cor);
  botao.setAttribute('aria-label', `Abrir ${ferramenta.titulo}`);
  botao.append(montarRecorte(ferramenta, categoria));

  const corpo = criar('span', 'card-midia-corpo');
  const rotulo = criar('span', 'card-midia-categoria', categoria.nome);
  const titulo = criar('strong', '', ferramenta.titulo);
  const descricao = criar('span', 'card-midia-descricao', ferramenta.descricao);
  const acao = criar('span', 'card-midia-acao', 'Abrir ferramenta');
  acao.append(criar('span', 'seta-card'));
  corpo.append(rotulo, titulo, descricao, acao);
  botao.append(corpo);
  botao.addEventListener('click', () => abrir(ferramenta));
  return botao;
}

function criarItemMenu(ferramenta, abrir) {
  const item = criar('button', 'mega-ferramenta');
  item.type = 'button';
  item.append(criar('span', 'mega-mini-icone', ferramenta.categoria === 9 ? 'PDF' : 'IMG'));
  const textos = criar('span', 'mega-ferramenta-textos');
  textos.append(criar('strong', '', ferramenta.titulo), criar('small', '', ferramenta.descricao));
  item.append(textos);
  item.addEventListener('click', () => abrir(ferramenta));
  return item;
}

export function configurarDocumentosVisuais({ ferramentas, categorias, abrir }) {
  const grade = document.getElementById('midia-destaques');
  const menuPdf = document.getElementById('menu-pdf-lista');
  const menuImagem = document.getElementById('menu-imagem-lista');
  if (!grade || !menuPdf || !menuImagem) return;

  const pdf = ferramentas.filter(f => f.categoria === 9);
  const imagens = ferramentas.filter(f => f.categoria === 8);
  const categoriaPdf = categorias.find(c => c.id === 9);
  const categoriaImagem = categorias.find(c => c.id === 8);
  const porId = new Map(ferramentas.map(f => [f.id, f]));

  const renderizar = filtro => {
    const lista = filtro === 'todos' ? [...pdf, ...imagens] : filtro === '8' ? imagens : pdf;
    const frag = document.createDocumentFragment();
    lista.forEach(f => frag.append(criarCard(f, f.categoria === 9 ? categoriaPdf : categoriaImagem, abrir)));
    grade.replaceChildren(frag);
    document.querySelectorAll('[data-midia-filtro]').forEach(botao => {
      botao.setAttribute('aria-pressed', String(botao.dataset.midiaFiltro === filtro));
    });
    const contador = document.getElementById('midia-contador');
    if (contador) contador.textContent = `${lista.length} ferramentas prontas para usar`;
  };

  document.querySelectorAll('[data-midia-filtro]').forEach(botao => {
    botao.addEventListener('click', () => renderizar(botao.dataset.midiaFiltro));
  });

  principaisPdf.map(id => porId.get(id)).filter(Boolean).forEach(f => menuPdf.append(criarItemMenu(f, abrir)));
  principaisImagem.map(id => porId.get(id)).filter(Boolean).forEach(f => menuImagem.append(criarItemMenu(f, abrir)));

  const gatilho = document.getElementById('menu-documentos-gatilho');
  const wrapper = document.getElementById('menu-documentos');
  if (gatilho && wrapper) {
    gatilho.addEventListener('click', event => {
      event.stopPropagation();
      const aberto = wrapper.classList.toggle('aberto');
      gatilho.setAttribute('aria-expanded', String(aberto));
    });
    wrapper.addEventListener('mouseenter', () => gatilho.setAttribute('aria-expanded', 'true'));
    wrapper.addEventListener('mouseleave', () => {
      wrapper.classList.remove('aberto');
      gatilho.setAttribute('aria-expanded', 'false');
    });
    document.addEventListener('click', event => {
      if (!wrapper.contains(event.target)) {
        wrapper.classList.remove('aberto');
        gatilho.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        wrapper.classList.remove('aberto');
        gatilho.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('[data-abrir-categoria]').forEach(link => {
    link.addEventListener('click', () => {
      const seletor = document.getElementById('categoria');
      if (seletor) {
        seletor.value = link.dataset.abrirCategoria;
        seletor.dispatchEvent(new Event('change'));
      }
    });
  });

  renderizar('9');
}
