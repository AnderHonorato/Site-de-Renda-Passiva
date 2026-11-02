// Monta o PDF de "Caça-palavras": grade + lista de palavras, e um gabarito em página
// separada com uma linha marcando cada palavra encontrada — funciona também em preto e
// branco, já que a marca é um traço, não uma cor. Se alguma palavra não coube, o
// gabarito também lista o motivo (nunca omite em silêncio). Usa criarDocumentoPdf.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 16;
const LARGURA_MM = 210;
const ALTURA_MM = 297;
const VETORES_POR_DIREÇÃO = { horizontal: [0, 1], vertical: [1, 0], 'diagonal-desce': [1, 1], 'diagonal-sobe': [-1, 1] };

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Caça-palavras', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y + 7;
}

function desenharGrade(documento, grade, linhas, colunas, yTopo) {
  const larguraDisponível = LARGURA_MM - MARGEM_MM * 2;
  const alturaDisponível = ALTURA_MM - MARGEM_MM - yTopo - 40;
  const pitch = Math.max(5, Math.min(larguraDisponível / colunas, alturaDisponível / linhas, 9.5));
  const larguraGrade = pitch * colunas;
  const xInicial = MARGEM_MM + (larguraDisponível - larguraGrade) / 2;
  const tamanhoDaFonte = Math.max(7, Math.min(13, pitch * 2.1));

  documento.retângulo(xInicial, yTopo, larguraGrade, pitch * linhas, { contorno: true, espessura: 0.5, cor: '#333333' });
  for (let linha = 0; linha <= linhas; linha += 1) {
    documento.linha(xInicial, yTopo + linha * pitch, xInicial + larguraGrade, yTopo + linha * pitch, { espessura: 0.15, cor: '#cfcfcf' });
  }
  for (let coluna = 0; coluna <= colunas; coluna += 1) {
    documento.linha(xInicial + coluna * pitch, yTopo, xInicial + coluna * pitch, yTopo + pitch * linhas, { espessura: 0.15, cor: '#cfcfcf' });
  }
  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const x = xInicial + coluna * pitch + pitch / 2;
      const y = yTopo + linha * pitch + pitch * 0.68;
      documento.texto(x, y, grade[linha][coluna], { tamanho: tamanhoDaFonte, alinhamento: 'centro' });
    }
  }
  return { pitch, xInicial, alturaGrade: pitch * linhas };
}

function centroDaCélula(geometria, yTopo, linha, coluna) {
  return { x: geometria.xInicial + coluna * geometria.pitch + geometria.pitch / 2, y: yTopo + linha * geometria.pitch + geometria.pitch / 2 };
}

function desenharListaDePalavras(documento, palavras, yInicial) {
  const colunas = 3;
  const larguraColuna = (LARGURA_MM - MARGEM_MM * 2) / colunas;
  let coluna = 0;
  let linha = 0;
  for (const palavra of palavras) {
    documento.texto(MARGEM_MM + coluna * larguraColuna, yInicial + linha * 6.5, `• ${palavra}`, { tamanho: 11 });
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
  return yInicial + (linha + (coluna > 0 ? 1 : 0)) * 6.5;
}

export function gerarPdfDeCaçaPalavras({ grade, linhas, colunas, colocadas, nãoColocadas, tituloDaAtividade = '', comCabeçalho = false, sementeUsada }) {
  const título = tituloDaAtividade || 'Caça-palavras';
  const documento = criarDocumentoPdf({ título });

  documento.novaPágina();
  const yInicial = desenharCabeçalho(documento, título, comCabeçalho);
  const geometria = desenharGrade(documento, grade, linhas, colunas, yInicial);
  const yLista = yInicial + geometria.alturaGrade + 8;
  documento.texto(MARGEM_MM, yLista, 'Encontre:', { tamanho: 11, negrito: true });
  desenharListaDePalavras(documento, colocadas.map((item) => item.palavra), yLista + 6.5);
  if (sementeUsada !== undefined) documento.texto(MARGEM_MM, ALTURA_MM - 9, `Semente usada nesta folha: ${sementeUsada}`, { tamanho: 8, cor: '#999999' });

  documento.novaPágina();
  const yGabarito = desenharCabeçalho(documento, `Gabarito — ${título}`, false);
  const geometriaGabarito = desenharGrade(documento, grade, linhas, colunas, yGabarito);
  for (const item of colocadas) {
    const [dl, dc] = VETORES_POR_DIREÇÃO[item.direção];
    const [pdl, pdc] = item.invertida ? [-dl, -dc] : [dl, dc];
    const comprimento = item.palavraNaGrade.length;
    const início = centroDaCélula(geometriaGabarito, yGabarito, item.linha, item.coluna);
    const fim = centroDaCélula(geometriaGabarito, yGabarito, item.linha + pdl * (comprimento - 1), item.coluna + pdc * (comprimento - 1));
    documento.linha(início.x, início.y, fim.x, fim.y, { espessura: 1.6, cor: '#c0392b' });
  }
  let yApósGabarito = yGabarito + geometriaGabarito.alturaGrade + 8;
  if (nãoColocadas.length > 0) {
    documento.texto(MARGEM_MM, yApósGabarito, 'Não coube nesta grade:', { tamanho: 11, negrito: true });
    yApósGabarito += 6.5;
    for (const item of nãoColocadas) {
      documento.texto(MARGEM_MM, yApósGabarito, `• ${item.palavra} — ${item.motivo}`, { tamanho: 9.5, cor: '#333333' });
      yApósGabarito += 5.5;
    }
  }

  return documento.gerarBytes();
}
