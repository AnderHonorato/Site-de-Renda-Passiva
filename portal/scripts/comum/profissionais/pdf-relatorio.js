/** Relatório profissional vetorial, com todos os dados distribuídos em páginas legíveis. */
import { criarDocumentoPdf } from '../pdf/criar-documento-pdf.js';
import { codificarWinAnsi } from '../pdf/codificar-winansi.js';
import { paletaPDF } from '../pdf/identidade-visual.js';

const cor = {
  tinta: paletaPDF.tinta, suave: paletaPDF.suave, papel: paletaPDF.papel, painel: paletaPDF.marcaFraca,
  linha: paletaPDF.borda, terracota: paletaPDF.marca, terracotaEscura: '#783821', positivo: paletaPDF.ok, negativo: '#a23f32', branco: '#ffffff',
};

export function gerarPdfRelatorio(r, { slug = '' } = {}) {
  const pdf = criarDocumentoPdf({ título: r.titulo, autor: 'Ander Flow', largura: 297, altura: 210 });
  const margem = 12, largura = 273, rodape = 198, limite = 188;
  let y = 20, pagina = 0, unicode = false;
  const financeiro = slug === 'fluxo-caixa-descontado';
  const fmtFinanceiro = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6, useGrouping: true });
  const textoValor = (valor, coluna = '') => {
    if (valor === null || valor === undefined) return 'Não aplicável';
    if (typeof valor === 'number' && Number.isFinite(valor)) {
      if (financeiro && coluna !== 'Período') return fmtFinanceiro.format(valor);
      if (financeiro && coluna === 'Período') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(valor);
      if (valor !== 0 && Math.abs(valor) < 0.000001) return new Intl.NumberFormat('pt-BR', { notation: 'scientific', maximumSignificantDigits: 6 }).format(valor);
      return fmtNumero.format(valor);
    }
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
    return String(valor);
  };
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
  function moldura(cabecalho = 'Relatório profissional') {
    pdf.novaPágina(); pagina++;
    pdf.retângulo(0, 0, 297, 17, { preenchimento: cor.papel, contorno: false });
    pdf.retângulo(margem, 5, 2, 5, { preenchimento: cor.terracota, contorno: false });
    pdf.texto(margem + 5, 9, cabecalho, { tamanho: 8, negrito: true, cor: cor.tinta });
    pdf.linha(margem, 14, 285, 14, { cor: cor.linha, espessura: 0.25 });
    pdf.linha(margem, 194, 285, 194, { cor: cor.linha, espessura: 0.25 });
    pdf.texto(margem, rodape, 'Ander Flow | Dados e método conforme entrada', { tamanho: 7, cor: cor.suave });
    pdf.texto(285, rodape, `Página ${pagina}`, { tamanho: 7, cor: cor.suave, alinhamento: 'direita' });
    y = 21;
  }
  function garantir(altura, cabecalho) { if (y + altura > limite) moldura(cabecalho); }
  function paragrafo(texto, { tamanho = 9, negrito = false, depois = 2, corTexto = cor.tinta } = {}) {
    for (const linha of quebrar(texto, largura, tamanho, negrito)) {
      garantir(tamanho * 0.43 + 1, 'Relatório profissional');
      pdf.texto(margem, y, linha, { tamanho, negrito, cor: corTexto });
      y += tamanho * 0.43 + 0.7;
    }
    y += depois;
  }
  function secao(titulo) {
    garantir(9, 'Relatório profissional');
    pdf.texto(margem, y, titulo, { tamanho: 11, negrito: true, cor: cor.terracotaEscura });
    pdf.linha(margem, y + 2, margem + largura, y + 2, { cor: cor.linha, espessura: 0.25 });
    y += 6;
  }

  moldura('Relatório de resultados');
  // Cabeçalho de abertura e método ficam juntos no início, sem empurrar o método para apêndice.
  pdf.retângulo(margem, y - 2, largura, 25, { preenchimento: cor.papel, contorno: false });
  pdf.retângulo(margem, y - 2, 2, 25, { preenchimento: cor.terracota, contorno: false });
  const tituloLinhas = quebrar(r.titulo, largura - 12, 17, true);
  tituloLinhas.forEach((linha, i) => pdf.texto(margem + 7, y + 5 + i * 7, linha, { tamanho: 17, negrito: true, cor: cor.tinta }));
  y += Math.max(27, tituloLinhas.length * 7 + 6);
  paragrafo(financeiro ? `${r.linhas.length} períodos · ${r.series?.length || 0} cenários de sensibilidade` : `${r.linhas.length} registros · ${r.colunas.length} campos · relatório completo`, { tamanho: 8, corTexto: cor.suave, depois: 3 });
  if (r.indicadores?.length) {
    secao('Indicadores');
    const colunasCartao = Math.min(2, r.indicadores.length), gap = 4, cartaoW = (largura - gap * (colunasCartao - 1)) / colunasCartao;
    for (let base = 0; base < r.indicadores.length; base += colunasCartao) {
      const conjunto = r.indicadores.slice(base, base + colunasCartao);
      const preparados = conjunto.map(([nome, valor]) => ({ nome: quebrar(nome, cartaoW - 6, 7, true), valor: quebrar(textoValor(valor), cartaoW - 6, 10, true) }));
      const altura = Math.max(20, ...preparados.map((v) => 8 + v.nome.length * 3.2 + v.valor.length * 5.6));
      if (altura + 2 > limite - 21) {
        preparados.forEach((item) => {
          paragrafo(item.nome.join(' '), { tamanho: 8, negrito: true, depois: 0, corTexto: cor.terracotaEscura });
          paragrafo(item.valor.join(' '), { tamanho: 10, negrito: true, depois: 3 });
        });
        continue;
      }
      garantir(altura + 2, 'Indicadores');
      preparados.forEach((item, j) => {
        const x = margem + j * (cartaoW + gap);
        pdf.retângulo(x, y - 2, cartaoW, altura, { preenchimento: cor.painel, contorno: true, cor: cor.linha, espessura: 0.3 });
        item.nome.forEach((linha, k) => pdf.texto(x + 3, y + 2 + k * 3.4, linha, { tamanho: 7, negrito: true, cor: cor.suave }));
        item.valor.forEach((linha, k) => pdf.texto(x + 3, y + 5 + item.nome.length * 3.2 + k * 5.6, linha, { tamanho: 14, negrito: true, cor: cor.tinta }));
      });
      y += altura + 3;
    }
  }

  if (r.series?.length) {
    const séries = r.series.slice(0, 20);
    const esquerda = margem + 78, direita = margem + largura - 34;
    const minimo = Math.min(0, ...séries.map((s) => s.valor)), maximo = Math.max(0, ...séries.map((s) => s.valor));
    const dominio = maximo - minimo;
    const eixo = dominio === 0 ? esquerda : esquerda + (0 - minimo) / dominio * (direita - esquerda);
    const escala = dominio === 0 ? 0 : (direita - esquerda) / dominio;
    const passo = 5.5, alto = séries.length * passo + 5;
    const tituloGrafico = financeiro
      ? `Análise de sensibilidade · ${séries.length} cenários`
      : `Comparação dos resultados · ${séries.length} de ${r.series.length} séries`;
    // Reserva a seção inteira antes de pôr o título para evitar cabeçalho órfão.
    garantir(6 + alto, 'Gráfico de séries');
    secao(tituloGrafico);
    pdf.linha(eixo, y, eixo, y + séries.length * passo, { cor: cor.suave, espessura: 0.3 });
    séries.forEach((s, i) => {
      const yy = y + 2.8 + i * passo;
      const labels = quebrar(s.nome, 74, 6.5);
      labels.slice(0, 2).forEach((linha, n) => pdf.texto(margem, yy + n * 2.7, linha, { tamanho: 6.5, cor: cor.tinta }));
      const fim = esquerda + (s.valor - minimo) * escala;
      if (s.valor !== 0) pdf.retângulo(Math.min(eixo, fim), yy - 2, Math.max(0.35, Math.abs(fim - eixo)), 3.2, { preenchimento: s.valor < 0 ? cor.negativo : cor.terracota, contorno: false });
      pdf.texto(margem + largura, yy, textoValor(s.valor), { tamanho: 7, cor: cor.tinta, alinhamento: 'direita' });
    });
    y += alto + 1;
    if (r.series.length > 20) paragrafo('O gráfico mostra as primeiras 20 séries; a tabela de apoio a seguir inclui todas as séries.', { tamanho: 7, corTexto: cor.suave });
    // Tabela de apoio mantém rótulos integrais e os valores completos, sem truncar no gráfico.
    tabela(['Série', 'Valor'], r.series.map((s) => [s.nome, textoValor(s.valor)]), 'Dados das séries');
  }

  secao('Método e premissas');
  paragrafo(r.metodo || 'Método não informado.');
  for (const nota of r.notas || []) paragrafo(nota, { tamanho: 8, corTexto: cor.suave });
  if (financeiro) paragrafo('Valores apresentados com duas casas decimais; valores monetários mantêm a unidade dos dados de entrada, que não identifica uma moeda.', { tamanho: 8, corTexto: cor.suave });

  function tabela(colunas, linhas, titulo, introducao = '') {
    const porPainel = Math.min(5, colunas.length), quantidade = Math.ceil(colunas.length / porPainel);
    for (let painel = 0; painel < quantidade; painel++) {
      const inicio = painel * porPainel, painelColunas = colunas.slice(inicio, inicio + porPainel);
      const numeroLargura = 16, celulaLargura = (largura - numeroLargura) / painelColunas.length;
      const cabecalhos = painelColunas.map((nome) => quebrar(nome, celulaLargura - 4, 8, true));
      const alturaCabecalho = Math.max(...cabecalhos.map((l) => l.length), 1) * 4 + 4;
      const linhasIntro = introducao ? quebrar(introducao, largura, 8) : [];
      const alturaIntro = linhasIntro.length ? linhasIntro.length * 4.2 + 2 : 0;
      const cabecalhoTabela = `${titulo} · Painel ${painel + 1}/${quantidade}`;
      const desenharCabecalho = () => {
        pdf.retângulo(margem, y - 3, largura, alturaCabecalho, { preenchimento: cor.painel, contorno: false });
        pdf.texto(margem + 1, y + 1, 'Linha', { tamanho: 8, negrito: true, cor: cor.terracotaEscura });
        cabecalhos.forEach((ls, c) => ls.forEach((linha, l) => pdf.texto(margem + numeroLargura + c * celulaLargura + 2, y + 1 + l * 4, linha, { tamanho: 8, negrito: true, cor: cor.terracotaEscura })));
        y += alturaCabecalho + 1;
      };
      // Reserve seção, descrição, cabeçalho e ao menos o início da primeira linha juntos.
      const alturaTitulo = titulo ? 9 : 0;
      if ((painel > 0 || y + alturaTitulo + alturaIntro + alturaCabecalho + 7 > limite)) moldura(cabecalhoTabela);
      if (titulo) secao(titulo);
      linhasIntro.forEach((linha) => {
        pdf.texto(margem, y, linha, { tamanho: 8, cor: cor.suave });
        y += 4.2;
      });
      if (linhasIntro.length) y += 2;
      desenharCabecalho();
      for (let i = 0; i < linhas.length; i++) {
        const celulas = linhas[i].slice(inicio, inicio + painelColunas.length).map((v, j) => quebrar(typeof v === 'number' ? textoValor(v, painelColunas[j]) : (v === null ? 'N/A' : v), celulaLargura - 4, 8));
        const totalLinhas = Math.max(...celulas.map((c) => c.length), 1);
        let posicao = 0;
        while (posicao < totalLinhas) {
          if (y + 5 > limite) { moldura(cabecalhoTabela); desenharCabecalho(); }
          const cabem = Math.max(1, Math.floor((limite - y - 2) / 4));
          const quantidadeLinhas = Math.min(cabem, totalLinhas - posicao);
          pdf.texto(margem + 1, y, `${i + 1}${posicao ? '+' : ''}`, { tamanho: 8, cor: cor.suave });
          celulas.forEach((ls, c) => ls.slice(posicao, posicao + quantidadeLinhas).forEach((linha, l) => pdf.texto(margem + numeroLargura + c * celulaLargura + 2, y + l * 4, linha, { tamanho: 8, cor: cor.tinta })));
          y += quantidadeLinhas * 4 + 2;
          pdf.linha(margem, y - 2, margem + largura, y - 2, { cor: cor.linha, espessura: 0.15 });
          posicao += quantidadeLinhas;
          if (posicao < totalLinhas) { moldura(cabecalhoTabela); desenharCabecalho(); }
        }
      }
      if (!linhas.length) paragrafo('Não há linhas de resultados.');
    }
  }

  tabela(r.colunas, r.linhas, 'Dados completos', 'Todas as linhas são exportadas. Tabelas largas usam painéis de até cinco campos com índice da linha; células longas continuam em páginas seguintes. Valores originais permanecem disponíveis em CSV e JSON.');
  if (unicode) {
    moldura('Representação de caracteres');
    secao('Representação de caracteres');
    paragrafo('Caracteres fora da fonte WinAnsi aparecem como [U+XXXX]. Acentos do português são preservados no PDF; TXT, CSV, JSON e Excel preservam os caracteres originais.');
  }
  return pdf.gerarBytes();
}
