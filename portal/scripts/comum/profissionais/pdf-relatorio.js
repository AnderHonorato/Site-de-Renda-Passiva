/** PDF vetorial local; painéis mantêm todas as colunas e linhas longas continuam em outra página. */
import { criarDocumentoPdf } from '../pdf/criar-documento-pdf.js';
import { codificarWinAnsi } from '../pdf/codificar-winansi.js';

export function gerarPdfRelatorio(r) {
  const pdf = criarDocumentoPdf({ título: r.titulo, autor: 'Ander Flow', largura: 297, altura: 210 });
  const margem = 12, largura = 273, rodape = 198;
  let y = 20, pagina = 0, unicode = false;
  // Helvetica cobre PT-BR. Outros alfabetos são representados explicitamente, sem perda silenciosa.
  const legivel = (valor) => [...String(valor ?? '').normalize('NFC')].map((c) => {
    if (c === '\n' || c === '\r' || c === '\t') return c;
    if (!codificarWinAnsi(c).substituídos) return c;
    unicode = true;
    return `[U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}]`;
  }).join('');
  const medida = (texto, tamanho = 9, negrito = false) => pdf.larguraDoTexto(texto, tamanho, negrito);
  function quebrar(valor, maximo, tamanho = 9, negrito = false) {
    const saida = [];
    for (const paragrafo of legivel(valor).replace(/\t/g, '    ').split(/\r\n|\r|\n/)) {
      let restante = paragrafo;
      if (!restante) { saida.push(''); continue; }
      while (restante) {
        if (medida(restante, tamanho, negrito) <= maximo) { saida.push(restante); break; }
        let baixo = 1, alto = restante.length;
        while (baixo < alto) {
          const meio = Math.ceil((baixo + alto) / 2);
          if (medida(restante.slice(0, meio), tamanho, negrito) <= maximo) baixo = meio;
          else alto = meio - 1;
        }
        let corte = Math.max(1, baixo);
        const espaco = restante.lastIndexOf(' ', corte);
        if (espaco > corte / 2) corte = espaco;
        saida.push(restante.slice(0, corte));
        restante = restante.slice(corte).replace(/^ /, '');
      }
    }
    return saida;
  }
  function novaPagina(cabecalho = 'Relatório profissional') {
    pdf.novaPágina(); pagina++;
    pdf.texto(margem, 11, cabecalho, { tamanho: 9, negrito: true, cor: '#27344a' });
    pdf.linha(margem, 14, 285, 14, { cor: '#b7c2d1', espessura: 0.25 });
    pdf.linha(margem, 194, 285, 194, { cor: '#b7c2d1', espessura: 0.25 });
    pdf.texto(margem, rodape, 'Ander Flow | Método e premissas nas páginas iniciais', { tamanho: 7 });
    pdf.texto(285, rodape, `Página ${pagina}`, { tamanho: 7, alinhamento: 'direita' });
    y = 21;
  }
  function paragrafo(texto, { tamanho = 9, negrito = false, depois = 2 } = {}) {
    for (const linha of quebrar(texto, largura, tamanho, negrito)) {
      if (y > 188) novaPagina();
      pdf.texto(margem, y, linha, { tamanho, negrito });
      y += tamanho * 0.43 + 0.7;
    }
    y += depois;
  }
  novaPagina();
  paragrafo(r.titulo, { tamanho: 16, negrito: true, depois: 5 });
  paragrafo(`${r.linhas.length} linha(s) de resultados | ${r.colunas.length} coluna(s)`, { depois: 4 });
  if (r.indicadores?.length) {
    paragrafo('Indicadores', { tamanho: 11, negrito: true });
    for (const [nome, valor] of r.indicadores) paragrafo(`${nome}: ${valor === null ? 'Não aplicável' : valor}`);
  }
  paragrafo('Método', { tamanho: 11, negrito: true });
  paragrafo(r.metodo || 'Não informado.');
  paragrafo('Notas e premissas', { tamanho: 11, negrito: true });
  for (const nota of r.notas || []) paragrafo(nota);
  paragrafo('Todas as linhas são exportadas. Tabelas largas são divididas em painéis de colunas; o número da linha permite relacioná-los. Células longas continuam na página seguinte. N/A significa valor não aplicável. Caracteres fora de WinAnsi aparecem como [U+XXXX]; acentos do português são preservados.', { tamanho: 8 });
  if (r.series?.length) {
    paragrafo('Séries do gráfico (dados)', { tamanho: 11, negrito: true });
    for (const serie of r.series) paragrafo(`${serie.nome}: ${serie.valor === null ? 'Não aplicável' : serie.valor}`);
  }
  const porPainel = 5;
  const quantidade = Math.ceil(r.colunas.length / porPainel);
  for (let painel = 0; painel < quantidade; painel++) {
    const inicio = painel * porPainel;
    const colunas = r.colunas.slice(inicio, inicio + porPainel);
    const numeroLargura = 16, celulaLargura = (largura - numeroLargura) / colunas.length;
    const linhasCabecalho = colunas.map((nome) => quebrar(nome, celulaLargura - 4, 8, true));
    const alturaCabecalho = Math.max(...linhasCabecalho.map((l) => l.length), 1) * 4 + 4;
    const novaTabela = () => {
      novaPagina(`Resultados | Painel ${painel + 1}/${quantidade} | Colunas ${inicio + 1} a ${inicio + colunas.length}`);
      pdf.retângulo(margem, y - 3, largura, alturaCabecalho, { preenchimento: '#edf1f6', contorno: false });
      pdf.texto(margem + 1, y + 1, 'Linha', { tamanho: 8, negrito: true });
      linhasCabecalho.forEach((linhas, c) => linhas.forEach((linha, l) => pdf.texto(margem + numeroLargura + c * celulaLargura + 2, y + 1 + l * 4, linha, { tamanho: 8, negrito: true })));
      y += alturaCabecalho + 1;
    };
    novaTabela();
    for (let i = 0; i < r.linhas.length; i++) {
      const celulas = r.linhas[i].slice(inicio, inicio + colunas.length).map((v) => quebrar(v === null ? 'N/A' : v, celulaLargura - 4, 8));
      const totalLinhas = Math.max(...celulas.map((c) => c.length), 1);
      let posicao = 0;
      while (posicao < totalLinhas) {
        if (y + 5 > 190) novaTabela();
        const cabem = Math.max(1, Math.floor((190 - y - 2) / 4));
        const quantidadeLinhas = Math.min(cabem, totalLinhas - posicao);
        pdf.texto(margem + 1, y, `${i + 1}${posicao ? '+' : ''}`, { tamanho: 8 });
        celulas.forEach((linhas, c) => linhas.slice(posicao, posicao + quantidadeLinhas).forEach((linha, l) => {
          pdf.texto(margem + numeroLargura + c * celulaLargura + 2, y + l * 4, linha, { tamanho: 8 });
        }));
        y += quantidadeLinhas * 4 + 2;
        pdf.linha(margem, y - 2, margem + largura, y - 2, { cor: '#dce2e9', espessura: 0.15 });
        posicao += quantidadeLinhas;
        if (posicao < totalLinhas) novaTabela();
      }
    }
    if (!r.linhas.length) paragrafo('Não há linhas de resultados.');
  }
  // Lido para tornar explícito o tratamento, mesmo quando só aparece na tabela.
  if (unicode) { novaPagina(); paragrafo('Representação de caracteres', { negrito: true }); paragrafo('Alguns caracteres não pertencem à fonte WinAnsi e foram representados por seu código Unicode [U+XXXX]. TXT, CSV, JSON e Excel preservam os caracteres originais.'); }
  return pdf.gerarBytes();
}
