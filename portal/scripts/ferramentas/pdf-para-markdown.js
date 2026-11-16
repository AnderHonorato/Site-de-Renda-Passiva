/** PDF para Markdown: leitura local, prévia por nós de texto e exportações dos bytes reais. */
import { montarFerramenta, ErroDeEntrada, baixar, nomeDeArquivo } from '../núcleo/montador.js';
import { caminhoDoIdioma } from '../núcleo/sessão.js';
import { converterPdfParaMarkdown, mensagemMarkdown, LIMITE_BYTES_MARKDOWN, LIMITE_PRÉVIA_MARKDOWN } from '../cálculos/pdf-para-markdown.js';
import { montarEscolhaDeArquivos, validarPdfDaEscolha } from './auxiliares/escolher-arquivos.js';
import { prepararExecução } from './auxiliares/execução-longa.js';
import { abrirComPdfjsParaTexto } from './auxiliares/pdfjs-textos.js';
import { carregarBiblioteca } from './auxiliares/biblioteca-pdf.js';

const criar = (tag, classe, texto) => {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
};
const número = (n) => n.toLocaleString('pt-BR');

/** Apenas elementos fixos e textContent; conteúdo de PDF nunca passa por um parser HTML. */
function desenharPrévia(caixa, páginas) {
  caixa.replaceChildren();
  let usado = 0;
  let elementos = 0;
  for (const p of páginas) {
    if (usado >= LIMITE_PRÉVIA_MARKDOWN || elementos >= 1_000) break;
    caixa.append(criar('p', 'md-pdf__pagina', `Página ${p.página}`));
    elementos++;
    if (p.vazia) caixa.append(criar('p', 'suave', 'Página sem texto selecionável.'));
    for (const b of p.blocos) {
      if (usado >= LIMITE_PRÉVIA_MARKDOWN || elementos >= 1_000) break;
      const restante = LIMITE_PRÉVIA_MARKDOWN - usado;
      if (b.tipo === 'lista') {
        const lista = criar(b.ordenada ? 'ol' : 'ul');
        if (b.ordenada) lista.start = b.início;
        for (const texto of b.itens) {
          const recorte = texto.slice(0, LIMITE_PRÉVIA_MARKDOWN - usado);
          lista.append(criar('li', '', recorte));
          elementos++;
          usado += recorte.length;
          if (usado >= LIMITE_PRÉVIA_MARKDOWN || elementos >= 1_000) break;
        }
        caixa.append(lista);
      } else {
        const texto = b.texto.slice(0, restante);
        caixa.append(criar(b.tipo === 'titulo' ? `h${Math.min(4, b.nível + 1)}` : 'p', '', texto));
        elementos++;
        usado += texto.length;
      }
    }
  }
  return usado >= LIMITE_PRÉVIA_MARKDOWN || elementos >= 1_000;
}

export default {
  instruções: {
    passos: [
      'Escolha um PDF com texto selecionável. Para testar, use o PDF de exemplo sem enviar seus arquivos.',
      'Informe as páginas desejadas ou deixe em branco para converter todas.',
      'Converta e confira a prévia de leitura e o código Markdown. Copie ou baixe .md e .txt.',
    ],
    exemplo: { texto: 'Um guia com título maior, parágrafos e uma lista se transforma em Markdown para editar em um wiki, repositório ou bloco de notas.' },
    limites: 'PDF de até 20 MB e 100 páginas; saída de até 1 milhão de caracteres. O reconhecimento de títulos e listas usa regras de tamanho e espaçamento e pode precisar de revisão. Tabelas, colunas, imagens e fontes não são reconstruídas. PDFs protegidos precisam de uma cópia sem senha. PDFs de fotos precisam passar por OCR antes. Na tela aparecem até 100 mil caracteres; copiar e baixar incluem todo o conteúdo convertido.',
    perguntas: [
      { p: 'O arquivo sai do meu aparelho?', r: 'A leitura usa o PDF.js no navegador. O PDF não é enviado para conversão.' },
      { p: 'Por que um título não foi reconhecido?', r: 'O conversor compara o tamanho das letras com o corpo de texto da página. Um título com a mesma fonte ou um layout complexo pode virar parágrafo. Revise o Markdown baixado.' },
      { p: 'O PDF escaneado funciona?', r: 'Primeiro use OCR de PDF para reconhecer o texto da digitalização. Depois envie o PDF pesquisável para esta ferramenta.' },
    ],
  },
  montar(raiz, ferramenta) {
    raiz.classList.add('md-pdf');
    let escolha, execução, resultadoVisual, leitura, fonte, nota, demoBotão, demoEstado;
    let trabalhando = false;
    let preparandoExemplo = false;
    let pedidoExemplo = 0;
    let aplicaçãoDoExemplo = null;

    const invalidarExemplo = () => {
      pedidoExemplo++;
      preparandoExemplo = false;
      if (demoBotão) demoBotão.disabled = trabalhando || aplicaçãoDoExemplo !== null;
      if (demoEstado) demoEstado.textContent = '';
    };

    montarFerramenta(raiz, ferramenta, {
      rótuloDaAção: 'Converter para Markdown',
      demorada: true,
      campos: [
        { nome: 'arquivo', rótulo: 'Arquivo PDF', tipo: 'file', dica: 'Até 20 MB e 100 páginas. Processamento no navegador.' },
        { nome: 'páginas', rótulo: 'Páginas', tipo: 'text', exemplo: 'Todas', dica: 'Exemplos: 1-3, 5, 8-, pares. Em branco, todas.' },
        { nome: 'estrutura', rótulo: 'Reconhecer títulos e listas', tipo: 'caixa', padrão: true },
        { nome: 'marcas', rótulo: 'Marcar o número de cada página no arquivo', tipo: 'caixa', padrão: true },
      ],
      async calcular(dados) {
        resultadoVisual.hidden = true;
        if (preparandoExemplo) throw new ErroDeEntrada('Aguarde o PDF de exemplo terminar de carregar.', 'arquivo');
        const item = escolha.itens()[0];
        if (!item) throw new ErroDeEntrada('Escolha um arquivo PDF.', 'arquivo');
        trabalhando = true;
        demoBotão.disabled = true;
        const controles = ['páginas', 'estrutura', 'marcas'].map((nome) => raiz.querySelector(`#campo-${nome}`));
        controles.forEach((campo) => { campo.disabled = true; });
        try {
          return await execução.executar(async () => {
            execução.progresso.andar(undefined, 'Lendo o texto e a estrutura das páginas…');
            const r = await converterPdfParaMarkdown({ nome: item.nome, bytes: new Uint8Array(await item.arquivo.arrayBuffer()) }, {
              abrir: abrirComPdfjsParaTexto, páginas: dados.páginas,
              estrutura: dados.estrutura === 'sim', separarPáginas: dados.marcas === 'sim', cancelado: execução.cancelado,
              aoProgredir: ({ página, total }) => execução.progresso.andar(100 * página / total, `Estruturando página ${página} de ${total}…`),
            });
            if (!r.ok) throw new ErroDeEntrada(mensagemMarkdown(r.erro, r.extras), r.erro.startsWith('faixa_') || r.erro === 'texto_grande' ? 'páginas' : 'arquivo');
            const leituraReduzida = desenharPrévia(leitura, r.páginas);
            fonte.value = r.markdown.slice(0, LIMITE_PRÉVIA_MARKDOWN);
            nota.textContent = r.markdown.length > LIMITE_PRÉVIA_MARKDOWN
              ? `Prévia limitada a ${número(LIMITE_PRÉVIA_MARKDOWN)} caracteres. Copiar e baixar incluem os ${número(r.markdown.length)} caracteres.`
              : leituraReduzida ? 'A prévia de leitura foi reduzida para manter a página leve. Copiar e baixar incluem todo o conteúdo convertido.'
                : 'Confira os títulos, a ordem de leitura e as listas antes de usar o arquivo.';
            resultadoVisual.hidden = false;
            const base = nomeDeArquivo(item.nome.replace(/\.pdf$/i, '')) || 'documento';
            const blocos = r.páginas.flatMap((p) => p.blocos);
            return {
              valor: 'Markdown pronto', resumo: `${item.nome} · ${número(r.páginas.length)} páginas lidas · ${número(r.markdown.length)} caracteres.`,
              linhas: [['Títulos reconhecidos', número(blocos.filter((b) => b.tipo === 'titulo').length)], ['Listas reconhecidas', número(blocos.filter((b) => b.tipo === 'lista').length)]],
              texto: r.markdown,
              arquivos: [
                { rótulo: 'Baixar Markdown (.md)', gerar: () => baixar(r.markdown, `${base}.md`, 'text/markdown;charset=utf-8') },
                { rótulo: 'Baixar texto (.txt)', gerar: () => baixar(r.texto, `${base}.txt`, 'text/plain;charset=utf-8') },
              ],
              observações: [
                'Estrutura sugerida por tamanho e espaçamento das letras. Tabelas, colunas e imagens não são reconstruídas.',
                ...(r.semTexto.length ? [`Páginas sem texto selecionável: ${r.semTexto.join(', ')}. Use OCR de PDF para reconhecer essas páginas.`] : []),
              ],
            };
          });
        } finally { trabalhando = false; demoBotão.disabled = false; controles.forEach((campo) => { campo.disabled = false; }); }
      },
      aoMontar(elemento) {
        const ocultar = () => { resultadoVisual.hidden = true; elemento.querySelector('#resultado').hidden = true; fonte.value = ''; leitura.replaceChildren(); };
        escolha = montarEscolhaDeArquivos(elemento, {
          campo: 'arquivo', rótuloDoBotão: 'Escolher PDF', accept: 'application/pdf,.pdf',
          rótuloDaLista: 'PDF escolhido', textoDoVazio: 'Arraste um PDF para cá ou toque em Escolher PDF.', textoDeSolte: 'Solte o PDF para converter.',
          validar: async (arquivo, começo) => arquivo.size > LIMITE_BYTES_MARKDOWN ? { erro: 'Escolha um PDF de até 20 MB.' } : validarPdfDaEscolha(arquivo, começo),
          aoMudar: () => { if (aplicaçãoDoExemplo === null) invalidarExemplo(); if (resultadoVisual) ocultar(); },
        });
        // Invalide no começo da escolha, antes da leitura assíncrona do arquivo.
        elemento.querySelector('#campo-arquivo').addEventListener('change', invalidarExemplo, { capture: true });
        elemento.addEventListener('drop', (evento) => {
          if (evento.dataTransfer?.files.length) invalidarExemplo();
        }, { capture: true });
        execução = prepararExecução(elemento, { escolha });
        const ocr = criar('a', 'md-pdf__ocr', 'Seu PDF é uma foto? Use OCR de PDF primeiro.');
        ocr.href = caminhoDoIdioma('f/ocr-pdf/');
        elemento.querySelector('[data-campo="arquivo"]').append(ocr);

        resultadoVisual = criar('section', 'md-pdf__resultado');
        resultadoVisual.hidden = true;
        resultadoVisual.setAttribute('aria-label', 'Prévia do Markdown convertido');
        const barra = criar('div', 'md-pdf__barra');
        const verLeitura = criar('button', 'botão botão--linha', 'Prévia de leitura');
        const verFonte = criar('button', 'botão botão--linha', 'Código Markdown');
        verLeitura.type = verFonte.type = 'button';
        leitura = criar('article', 'md-pdf__papel');
        leitura.id = 'md-pdf-leitura';
        fonte = criar('textarea', 'md-pdf__fonte');
        fonte.id = 'md-pdf-fonte'; fonte.readOnly = true; fonte.rows = 16; fonte.spellcheck = false;
        fonte.setAttribute('aria-label', 'Código Markdown convertido');
        const selecionar = (código) => {
          leitura.hidden = código; fonte.hidden = !código;
          verLeitura.setAttribute('aria-pressed', String(!código)); verFonte.setAttribute('aria-pressed', String(código));
        };
        verLeitura.setAttribute('aria-controls', leitura.id); verFonte.setAttribute('aria-controls', fonte.id);
        verLeitura.addEventListener('click', () => selecionar(false)); verFonte.addEventListener('click', () => selecionar(true));
        selecionar(false);
        nota = criar('p', 'campo__dica');
        barra.append(verLeitura, verFonte); resultadoVisual.append(barra, nota, leitura, fonte);
        elemento.querySelector('#resultado').after(resultadoVisual);
        for (const campo of ['páginas', 'estrutura', 'marcas']) elemento.querySelector(`#campo-${campo}`).addEventListener('input', ocultar);
        elemento.querySelector('#formulário').addEventListener('reset', () => { invalidarExemplo(); ocultar(); });

        const demo = criar('section', 'md-pdf__demo');
        demo.setAttribute('aria-label', 'Exemplo visual da conversão');
        demo.append(criar('p', 'md-pdf__sobretitulo', 'DO PDF AO TEXTO ESTRUTURADO'));
        const pares = criar('div', 'md-pdf__pares');
        const papel = criar('div', 'md-pdf__amostra md-pdf__amostra--pdf');
        papel.setAttribute('aria-hidden', 'true');
        papel.append(criar('span', 'md-pdf__etiqueta', 'PDF'), criar('strong', '', 'Guia de projeto'), criar('p', '', 'Organize as próximas entregas.'), criar('p', '', '• Definir prioridades\n• Revisar resultados'));
        const código = criar('pre', 'md-pdf__amostra md-pdf__amostra--codigo', '# Guia de projeto\n\nOrganize as próximas entregas.\n\n- Definir prioridades\n- Revisar resultados');
        código.setAttribute('aria-hidden', 'true');
        pares.append(papel, código); demo.append(pares);
        demo.append(criar('p', 'campo__dica', 'Títulos, parágrafos e listas em um arquivo fácil de editar. Teste a conversão com este PDF de exemplo.'));
        demoBotão = criar('button', 'botão botão--linha', 'Usar PDF de exemplo'); demoBotão.type = 'button';
        demoEstado = criar('p', 'campo__dica'); demoEstado.setAttribute('role', 'status');
        demoBotão.addEventListener('click', async () => {
          if (trabalhando) return;
          const pedido = ++pedidoExemplo;
          const vigente = () => pedido === pedidoExemplo;
          preparandoExemplo = true;
          demoBotão.disabled = true;
          demoEstado.textContent = 'Preparando o PDF de exemplo…';
          try {
            const lib = await carregarBiblioteca();
            if (!vigente()) return;
            const doc = await lib.PDFDocument.create();
            if (!vigente()) return;
            const p = doc.addPage([595, 842]);
            const font = await doc.embedFont(lib.StandardFonts.Helvetica);
            if (!vigente()) return;
            p.drawText('Guia de projeto', { x: 52, y: 770, font, size: 24 });
            p.drawText('Organize as próximas entregas.', { x: 52, y: 720, font, size: 12 });
            p.drawText('Uma etapa por vez, com objetivos claros e resultados revisados.', { x: 52, y: 702, font, size: 12 });
            p.drawText('- Definir prioridades', { x: 52, y: 660, font, size: 12 });
            p.drawText('- Revisar resultados', { x: 52, y: 642, font, size: 12 });
            const bytes = await doc.save();
            if (!vigente()) return;
            const arquivo = new File([bytes], 'guia-de-projeto.pdf', { type: 'application/pdf' });
            aplicaçãoDoExemplo = pedido;
            const adição = escolha.adicionar([arquivo]);
            escolha.travar(true);
            await adição;
            if (!vigente()) {
              // O reset também pode ocorrer durante a validação curta da escolha.
              if (escolha.itens()[0]?.arquivo === arquivo) escolha.limpar();
              return;
            }
            demoEstado.textContent = 'Exemplo carregado. Toque em Converter para Markdown para gerar o resultado.';
          } catch { if (vigente()) demoEstado.textContent = 'Não consegui preparar o exemplo. Você pode escolher um PDF do aparelho.'; }
          finally {
            if (aplicaçãoDoExemplo === pedido) { aplicaçãoDoExemplo = null; escolha.travar(trabalhando); }
            if (vigente()) preparandoExemplo = false;
            demoBotão.disabled = trabalhando || preparandoExemplo || aplicaçãoDoExemplo !== null;
          }
        });
        demo.append(demoBotão, demoEstado);
        elemento.querySelector('#formulário').before(demo);
      },
    });
  },
};
