/** Prévia do mesmo PDF entregue no download, desenhada localmente sob a CSP do portal. */
function criar(tag, classe, texto) {
  const no = document.createElement(tag);
  if (classe) no.className = classe;
  if (texto !== undefined) no.textContent = texto;
  return no;
}

export function montarPreviaPdf(raiz, { bytes, nome = 'documento.pdf' }) {
  if (!(bytes instanceof Uint8Array) || !bytes.length) throw new TypeError('Prévia PDF sem bytes.');
  raiz.classList.add('pdf-previa');
  raiz.dataset.pdfPrevia = '';
  raiz.dataset.pdfEstado = 'preparando';
  raiz.setAttribute('role', 'region');
  raiz.setAttribute('aria-label', 'Prévia do documento PDF');
  const topo = criar('div', 'pdf-previa__topo');
  const titulo = criar('h3', '', 'Confira seu documento');
  const detalhe = criar('p', 'pequeno suave', 'A prévia reproduz o PDF que será baixado.');
  const apresentacao = criar('div'); apresentacao.append(titulo, detalhe);
  const rotuloZoom = criar('label', 'pdf-previa__zoom', 'Zoom');
  const zoom = criar('select'); zoom.setAttribute('aria-label', 'Zoom da prévia');
  for (const [valor, texto] of [['ajustar', 'Ajustar à tela'], ['1', '100%'], ['1.5', '150%']]) {
    const opcao = criar('option', '', texto); opcao.value = valor; zoom.append(opcao);
  }
  rotuloZoom.append(zoom); topo.append(apresentacao, rotuloZoom);
  const estado = criar('p', 'pdf-previa__estado', 'Preparando a prévia…');
  estado.setAttribute('role', 'status'); estado.setAttribute('aria-live', 'polite');
  const area = criar('div', 'pdf-previa__area');
  const papel = criar('div', 'pdf-previa__papel');
  const tela = criar('canvas'); tela.setAttribute('role', 'img'); tela.setAttribute('aria-label', 'Prévia do PDF em preparação');
  papel.append(tela); area.append(papel);
  const navegacao = criar('div', 'pdf-previa__navegacao');
  const anterior = criar('button', 'botão botão--linha', 'Página anterior'); anterior.type = 'button';
  const proxima = criar('button', 'botão botão--linha', 'Próxima página'); proxima.type = 'button';
  const contagem = criar('p', 'pequeno');
  navegacao.append(anterior, contagem, proxima); navegacao.hidden = true;
  raiz.replaceChildren(topo, estado, area, navegacao);
  zoom.disabled = true; anterior.disabled = true; proxima.disabled = true;

  let ativo = true, leitor = null, pagina = 1, versao = 0, fila = Promise.resolve(), ultimaLargura = 0;
  function falhar() {
    if (!ativo || !raiz.isConnected) return;
    raiz.dataset.pdfEstado = 'erro';
    estado.textContent = 'Não foi possível mostrar a prévia. O PDF continua disponível no botão de download.';
    area.hidden = true; navegacao.hidden = true; zoom.disabled = true;
  }
  function desenhar() {
    if (!ativo || !leitor) return;
    const pedido = ++versao;
    fila = fila.then(async () => {
      if (!ativo || pedido !== versao || !raiz.isConnected) return;
      raiz.dataset.pdfEstado = 'preparando';
      area.setAttribute('aria-busy', 'true');
      anterior.disabled = true; proxima.disabled = true;
      const medida = await leitor.tamanho(pagina);
      if (!ativo || pedido !== versao) return;
      const largura = zoom.value === 'ajustar'
        ? Math.max(160, Math.min(900, area.clientWidth - 32))
        : Math.min(1800, medida.largura * 96 / 72 * Number(zoom.value));
      papel.style.width = `${largura}px`;
      const densidade = Math.min(2, window.devicePixelRatio || 1);
      await leitor.desenharNaTela(pagina, tela, Math.round(largura * densidade));
      if (!ativo || pedido !== versao || !raiz.isConnected) return;
      tela.setAttribute('aria-label', `Prévia da página ${pagina} de ${leitor.páginas} de ${nome}. O PDF para download contém o texto completo.`);
      contagem.textContent = `Página ${pagina} de ${leitor.páginas}`;
      estado.textContent = leitor.páginas === 1 ? 'Prévia pronta · 1 página' : `Prévia pronta · ${leitor.páginas} páginas`;
      raiz.dataset.pdfEstado = 'pronta';
      area.setAttribute('aria-busy', 'false');
      anterior.disabled = pagina === 1; proxima.disabled = pagina === leitor.páginas;
      zoom.disabled = false;
    }).catch(falhar);
  }
  const observador = new ResizeObserver(() => {
    if (!raiz.isConnected) { destruir(); return; }
    const largura = Math.round(area.clientWidth);
    if (largura === ultimaLargura) return;
    ultimaLargura = largura;
    if (zoom.value === 'ajustar') desenhar();
  });
  observador.observe(area);
  anterior.addEventListener('click', () => { if (pagina > 1) { pagina--; desenhar(); } });
  proxima.addEventListener('click', () => { if (leitor && pagina < leitor.páginas) { pagina++; desenhar(); } });
  zoom.addEventListener('change', desenhar);
  void (async () => {
    try {
      const { abrirComPdfjsParaTexto } = await import('../ferramentas/auxiliares/pdfjs-textos.js');
      const aberto = await abrirComPdfjsParaTexto(bytes);
      if (!ativo || !raiz.isConnected) { await aberto.fechar(); return; }
      leitor = aberto;
      navegacao.hidden = leitor.páginas < 2;
      desenhar();
    } catch { falhar(); }
  })();
  function destruir() {
    if (!ativo) return;
    ativo = false; versao++;
    observador.disconnect();
    void leitor?.fechar().catch(() => {});
    leitor = null;
    tela.width = 0; tela.height = 0;
  }
  return { destruir };
}
