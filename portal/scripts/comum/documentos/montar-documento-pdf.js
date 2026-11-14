/** Construtor síncrono de documentos A4 com identidade visual e paginação. */
import { criarDocumentoPdf } from '../pdf/criar-documento-pdf.js';
import { site } from '../../../dados/site.js';
import { quebrarTextoEmLinhas } from '../pdf/quebrar-texto-em-linhas.js';
import { normalizarCorPdf, paletaPDF } from '../pdf/identidade-visual.js';

const MARGEM = 18;
const LARGURA = 210;
const ALTURA = 297;
const COR_TEXTO = paletaPDF.tinta;
const COR_SUAVE = paletaPDF.suave;
const ALTURA_UTIL = ALTURA - 22;
const ENTRELINHA = 4.8;

function canalHex(hexadecimal, deslocamento) {
  return parseInt(hexadecimal.slice(deslocamento, deslocamento + 2), 16) / 255;
}

function luminânciaRelativa(cor) {
  const canais = [1, 3, 5].map((posição) => canalHex(cor, posição)).map((canal) => (
    canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  ));
  return canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
}

function misturarComPapel(cor, proporção = 0.1) {
  const corSegura = normalizarCorPdf(cor, paletaPDF.marca);
  const papel = normalizarCorPdf(paletaPDF.papel);
  const canais = [1, 3, 5].map((posição) => {
    const marca = parseInt(corSegura.slice(posição, posição + 2), 16);
    const base = parseInt(papel.slice(posição, posição + 2), 16);
    return Math.round(base * (1 - proporção) + marca * proporção).toString(16).padStart(2, '0');
  });
  return `#${canais.join('')}`;
}

/**
 * Cria um documento A4 com cabeçalho de marca, rodapé numerado e conteúdo
 * paginado. `logo.bytes` deve conter JPEG RGB normalizado; largura/altura são
 * as dimensões em pixels usadas no JPEG.
 */
export function montarDocumentoPdf({
  título = 'Documento', subtítulo = '', marca = site.nome, autor = site.autor,
  corMarca = paletaPDF.marca, logo = null,
} = {}) {
  const corMarcaSegura = normalizarCorPdf(corMarca, paletaPDF.marca);
  const luminânciaMarca = luminânciaRelativa(corMarcaSegura);
  const luminânciaPapel = luminânciaRelativa(paletaPDF.papel);
  const contrasteMarca = (Math.max(luminânciaMarca, luminânciaPapel) + 0.05) / (Math.min(luminânciaMarca, luminânciaPapel) + 0.05);
  const corTextoMarca = contrasteMarca >= 4.5 ? corMarcaSegura : COR_TEXTO;
  const fundoMarca = misturarComPapel(corMarcaSegura, 0.1);
  const pdf = criarDocumentoPdf({ título, autor, largura: LARGURA, altura: ALTURA });
  let y = 0;
  let página = 1;
  const páginasComRodapé = new Set();

  const linhas = (conteúdo, tamanho, negrito, largura) => {
    const texto = String(conteúdo ?? '');
    // Preserva espaços fixos de moeda e o conteúdo literal quando já cabe na coluna.
    if (!/[\r\n]/.test(texto) && pdf.larguraDoTexto(texto, tamanho, negrito) <= largura) return [texto];
    return quebrarTextoEmLinhas(texto, largura, linha => pdf.larguraDoTexto(linha, tamanho, negrito));
  };

  function abreviar(conteúdo, tamanho, negrito, largura) {
    const texto = String(conteúdo ?? '');
    if (pdf.larguraDoTexto(texto, tamanho, negrito) <= largura) return texto;
    let prefixo = texto.trimEnd();
    while (prefixo && pdf.larguraDoTexto(`${prefixo}...`, tamanho, negrito) > largura) prefixo = prefixo.slice(0, -1).trimEnd();
    return prefixo ? `${prefixo}...` : '';
  }

  function limitarLinhas(conteúdo, tamanho, negrito, largura, limite) {
    const todas = linhas(conteúdo, tamanho, negrito, largura);
    const visíveis = todas.slice(0, limite);
    if (todas.length > limite && visíveis.length) {
      visíveis[visíveis.length - 1] = abreviar(`${visíveis.at(-1)}...`, tamanho, negrito, largura);
    }
    return visíveis;
  }

  function cabeçalho() {
    pdf.retângulo(0, 0, LARGURA, ALTURA, { preenchimento: paletaPDF.papel, contorno: false });
    pdf.retângulo(0, 0, LARGURA, 3, { preenchimento: corMarcaSegura, contorno: false });
    const existeLogo = logo && logo.bytes && Number.isInteger(logo.largura) && Number.isInteger(logo.altura);
    const inícioTexto = MARGEM;
    const larguraTexto = existeLogo ? 146 : LARGURA - MARGEM * 2;
    if (existeLogo) {
      const caixaLargura = 19;
      const caixaAltura = 17;
      const escala = Math.min(caixaLargura / logo.largura, caixaAltura / logo.altura);
      const larguraLogo = logo.largura * escala;
      const alturaLogo = logo.altura * escala;
      pdf.imagemJpeg(LARGURA - MARGEM - caixaLargura, 8, larguraLogo, alturaLogo, logo.bytes, {
        larguraPixels: logo.largura, alturaPixels: logo.altura,
      });
    }
    const marcaLinhas = limitarLinhas(marca, 8.5, true, larguraTexto, 2);
    marcaLinhas.forEach((linha, i) => pdf.texto(inícioTexto, 11 + i * 4.1, linha, {
      tamanho: 8.5, negrito: true, cor: corTextoMarca,
    }));
    const títuloLinhas = limitarLinhas(título, 15, true, larguraTexto, 2);
    títuloLinhas.forEach((linha, i) => pdf.texto(MARGEM, 22 + i * 6.2, linha, {
      tamanho: 15, negrito: true, cor: COR_TEXTO,
    }));
    const subtítuloLinhas = limitarLinhas(subtítulo, 8.5, false, larguraTexto, 2);
    subtítuloLinhas.forEach((linha, i) => pdf.texto(MARGEM, 34 + i * 4.3, linha, {
      tamanho: 8.5, cor: COR_SUAVE,
    }));
    pdf.linha(MARGEM, 40, LARGURA - MARGEM, 40, { cor: paletaPDF.borda, espessura: 0.35 });
    y = 47;
  }

  function novaPágina() {
    rodapé(página);
    pdf.novaPágina();
    página += 1;
    cabeçalho();
  }

  /** Reserva espaço para uma unidade e repete o cabeçalho se necessário. */
  function reservar(altura) {
    if (y + altura > ALTURA_UTIL && y > 47) novaPágina();
  }

  function rodapé(numeroPágina) {
    if (páginasComRodapé.has(numeroPágina)) return;
    páginasComRodapé.add(numeroPágina);
    pdf.linha(MARGEM, ALTURA - 17, LARGURA - MARGEM, ALTURA - 17, { cor: paletaPDF.borda, espessura: 0.3 });
    pdf.texto(MARGEM, ALTURA - 10, abreviar(marca, 7.5, false, 100), { tamanho: 7.5, cor: COR_SUAVE });
    pdf.texto(LARGURA - MARGEM, ALTURA - 10,
      `Página ${numeroPágina} · ${new Date().toLocaleDateString('pt-BR')}`,
      { tamanho: 7.5, cor: COR_SUAVE, alinhamento: 'direita' });
  }

  cabeçalho();

  const documento = {
    /** Texto corrido com quebra de linhas e de páginas. */
    parágrafo(conteúdo, { tamanho = 10, negrito = false, cor = COR_TEXTO, espaço = 2 } = {}) {
      const alturaLinha = Math.max(3.2, tamanho * 0.48);
      for (const linha of linhas(conteúdo, tamanho, negrito, LARGURA - MARGEM * 2)) {
        reservar(alturaLinha);
        pdf.texto(MARGEM, y, linha, { tamanho, negrito, cor: normalizarCorPdf(cor, COR_TEXTO) });
        y += alturaLinha;
      }
      y += espaço;
      return this;
    },

    seção(nome) {
      reservar(13);
      y += 2;
      pdf.texto(MARGEM, y, String(nome), { tamanho: 11, negrito: true, cor: corTextoMarca });
      y += 3;
      pdf.linha(MARGEM, y, LARGURA - MARGEM, y, { cor: paletaPDF.borda, espessura: 0.3 });
      y += 5;
      return this;
    },

    /** Rótulo/valor em duas colunas; conteúdo longo continua na página seguinte. */
    campo(rótulo, valor) {
      const larguraRótulo = 42;
      const larguraValor = LARGURA - MARGEM * 2 - larguraRótulo - 5;
      const rótuloLinhas = linhas(rótulo, 8.5, false, larguraRótulo);
      const valorLinhas = linhas(valor, 9.5, false, larguraValor);
      const quantidade = Math.max(rótuloLinhas.length, valorLinhas.length, 1);
      for (let i = 0; i < quantidade; i += 1) {
        reservar(ENTRELINHA);
        if (i < rótuloLinhas.length) pdf.texto(MARGEM, y, rótuloLinhas[i], { tamanho: 8.5, cor: COR_SUAVE });
        if (i < valorLinhas.length) pdf.texto(MARGEM + larguraRótulo + 5, y, valorLinhas[i], { tamanho: 9.5, cor: COR_TEXTO });
        y += ENTRELINHA;
      }
      y += 1;
      return this;
    },

    /** Tabela com células quebráveis, linhas contínuas e cabeçalho repetido. */
    tabela(cabeçalhoDaTabela, linhasDaTabela, larguras) {
      if (!Array.isArray(cabeçalhoDaTabela) || !Array.isArray(larguras) || !larguras.length || larguras.length !== cabeçalhoDaTabela.length) return this;
      const útil = LARGURA - MARGEM * 2;
      const total = larguras.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0);
      if (!total) return this;
      const colunas = larguras.map((l) => (Math.max(0, Number(l) || 0) / total) * útil);
      const desenharCabeçalho = () => {
        const alturaCabeçalho = 8;
        reservar(alturaCabeçalho + ENTRELINHA);
        pdf.retângulo(MARGEM, y - 4.5, útil, alturaCabeçalho, { preenchimento: fundoMarca, contorno: false });
        let x = MARGEM + 2;
        cabeçalhoDaTabela.forEach((célula, i) => {
          const alinhamento = i > 0 ? 'direita' : 'esquerda';
          const coluna = colunas[i];
          const linhasCabeçalho = linhas(célula, 8, true, Math.max(5, coluna - 5));
          pdf.texto(alinhamento === 'direita' ? x + coluna - 4 : x, y, linhasCabeçalho[0] || '', {
            tamanho: 8, negrito: true, cor: COR_SUAVE, alinhamento,
          });
          x += coluna;
        });
        y += 6.5;
      };

      desenharCabeçalho();
      for (const linha of Array.isArray(linhasDaTabela) ? linhasDaTabela : []) {
        const células = Array.from({ length: cabeçalhoDaTabela.length }, (_, i) => String(linha?.[i] ?? ''));
        const quebradas = células.map((célula, i) => linhas(célula, 8.6, false, Math.max(5, colunas[i] - 5)));
        const alturas = Math.max(1, ...quebradas.map((item) => item.length));
        for (let parte = 0; parte < alturas; parte += 1) {
          if (y + ENTRELINHA > ALTURA_UTIL) {
            novaPágina();
            desenharCabeçalho();
          }
          let x = MARGEM + 2;
          células.forEach((_, i) => {
            const alinhamento = i > 0 ? 'direita' : 'esquerda';
            const texto = quebradas[i][parte] || '';
            if (texto) pdf.texto(alinhamento === 'direita' ? x + colunas[i] - 4 : x, y, texto, {
              tamanho: 8.6, cor: COR_TEXTO, alinhamento,
            });
            x += colunas[i];
          });
          y += ENTRELINHA;
        }
        pdf.linha(MARGEM, y - 1.1, LARGURA - MARGEM, y - 1.1, { cor: paletaPDF.borda, espessura: 0.2 });
        y += 2;
      }
      y += 3;
      return this;
    },

    destaque(rótulo, valor, { grande = false } = {}) {
      if (grande) {
        const larguraDisponível = LARGURA - MARGEM * 2 - 8;
        const rótuloLinhas = linhas(rótulo, 9, true, larguraDisponível);
        const valorLinhas = linhas(valor, 24, true, larguraDisponível);
        const linhasValor = Math.max(1, valorLinhas.length);
        const alturaCaixa = 32 + Math.max(0, linhasValor - 1) * 12;
        reservar(alturaCaixa + 3);
        pdf.retângulo(MARGEM, y - 2, LARGURA - MARGEM * 2, alturaCaixa, { preenchimento: fundoMarca, contorno: false });
        const inícioValor = y + 14 + Math.max(0, rótuloLinhas.length - 1) * 4.5;
        rótuloLinhas.forEach((linha, índice) => pdf.texto(MARGEM + 4, y + 5 + índice * 4.5, linha, {
          tamanho: 9, negrito: true, cor: corTextoMarca,
        }));
        valorLinhas.forEach((linha, índice) => pdf.texto(MARGEM + 4, inícioValor + índice * 10.5, linha, {
          tamanho: 24, negrito: true, cor: corTextoMarca,
        }));
        y += alturaCaixa + 3;
        return this;
      }
      const larguraTexto = (LARGURA - MARGEM * 2 - 12) / 2;
      const rótuloLinhas = linhas(rótulo, 10, true, larguraTexto);
      const valorLinhas = linhas(valor, 12, true, larguraTexto);
      const quantidade = Math.max(rótuloLinhas.length, valorLinhas.length, 1);
      const alturaCaixa = Math.max(16, quantidade * 5.5 + 7);
      reservar(alturaCaixa + 3);
      pdf.retângulo(MARGEM, y - 2, LARGURA - MARGEM * 2, alturaCaixa, { preenchimento: fundoMarca, contorno: false });
      for (let i = 0; i < quantidade; i += 1) {
        if (rótuloLinhas[i]) pdf.texto(MARGEM + 4, y + 4 + i * 5.5, rótuloLinhas[i], { tamanho: 10, negrito: true, cor: corTextoMarca });
        if (valorLinhas[i]) pdf.texto(LARGURA - MARGEM - 4, y + 4 + i * 5.5, valorLinhas[i], {
          tamanho: 12, negrito: true, cor: corTextoMarca, alinhamento: 'direita',
        });
      }
      y += alturaCaixa + 3;
      return this;
    },

    assinatura(nome) {
      const linhasNome = linhas(nome, 9, false, LARGURA - MARGEM * 2 - 16);
      reservar(17 + Math.max(1, linhasNome.length) * ENTRELINHA);
      y += 12;
      pdf.linha(MARGEM + 25, y, LARGURA - MARGEM - 25, y, { cor: paletaPDF.borda, espessura: 0.4 });
      y += 5;
      for (const linha of linhasNome) {
        reservar(ENTRELINHA);
        pdf.texto(LARGURA / 2, y, linha, { tamanho: 9, cor: COR_SUAVE, alinhamento: 'centro' });
        y += ENTRELINHA;
      }
      y += 4;
      return this;
    },

    espaço(milímetros) {
      if (Number.isFinite(milímetros) && milímetros > 0) y += milímetros;
      reservar(0);
      return this;
    },

    /** Abre uma nova página, mantendo o cabeçalho do documento. */
    novaPágina() { novaPágina(); return this; },

    gerarBytes() {
      rodapé(página);
      return pdf.gerarBytes();
    },
  };

  return documento;
}
