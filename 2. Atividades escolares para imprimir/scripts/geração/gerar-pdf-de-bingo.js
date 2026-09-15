// Monta o PDF de "Bingo de números": uma cartela por página (mesmos números de
// gerarCartelasDeBingo) e uma página final com a lista de sorteio embaralhada, separada
// das cartelas, para o organizador chamar os números em ordem. Usa criarDocumentoPdf.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

const MARGEM_MM = 18;
const LARGURA_MM = 210;
const ALTURA_MM = 297;

function desenharCabeçalho(documento, título, comCabeçalho) {
  let y = MARGEM_MM;
  documento.texto(MARGEM_MM, y, título || 'Bingo de números', { tamanho: 16, negrito: true });
  y += 9;
  if (comCabeçalho) {
    documento.texto(MARGEM_MM, y, 'Nome: _______________________________________', { tamanho: 11 });
    documento.texto(LARGURA_MM - MARGEM_MM - 48, y, 'Data: ____ / ____ / ______', { tamanho: 11 });
    y += 8;
  }
  documento.linha(MARGEM_MM, y, LARGURA_MM - MARGEM_MM, y, { espessura: 0.4, cor: '#a3a3a3' });
  return y + 8;
}

function desenharCartela(documento, grade, tamanhoDaGrade, yTopo) {
  const larguraDisponível = LARGURA_MM - MARGEM_MM * 2;
  const alturaDisponível = ALTURA_MM - MARGEM_MM - yTopo - 12;
  const pitch = Math.min(larguraDisponível / tamanhoDaGrade, alturaDisponível / tamanhoDaGrade, 28);
  const larguraGrade = pitch * tamanhoDaGrade;
  const xInicial = MARGEM_MM + (larguraDisponível - larguraGrade) / 2;
  const tamanhoDaFonte = Math.max(10, Math.min(22, pitch * 0.42));

  documento.retângulo(xInicial, yTopo, larguraGrade, pitch * tamanhoDaGrade, { contorno: true, espessura: 0.6, cor: '#333333' });
  for (let linha = 1; linha < tamanhoDaGrade; linha += 1) {
    documento.linha(xInicial, yTopo + linha * pitch, xInicial + larguraGrade, yTopo + linha * pitch, { espessura: 0.2, cor: '#cfcfcf' });
  }
  for (let coluna = 1; coluna < tamanhoDaGrade; coluna += 1) {
    documento.linha(xInicial + coluna * pitch, yTopo, xInicial + coluna * pitch, yTopo + pitch * tamanhoDaGrade, { espessura: 0.2, cor: '#cfcfcf' });
  }
  for (let linha = 0; linha < tamanhoDaGrade; linha += 1) {
    for (let coluna = 0; coluna < tamanhoDaGrade; coluna += 1) {
      const x = xInicial + coluna * pitch + pitch / 2;
      const y = yTopo + linha * pitch + pitch * 0.6;
      documento.texto(x, y, String(grade[linha][coluna]), { tamanho: tamanhoDaFonte, alinhamento: 'centro' });
    }
  }
  return yTopo + pitch * tamanhoDaGrade;
}

function desenharListaDeSorteio(documento, lista, yInicial) {
  const colunas = 6;
  const larguraColuna = (LARGURA_MM - MARGEM_MM * 2) / colunas;
  let coluna = 0;
  let linha = 0;
  for (const [índice, número] of lista.entries()) {
    if (yInicial + linha * 7 > ALTURA_MM - MARGEM_MM) {
      documento.novaPágina();
      documento.texto(MARGEM_MM, MARGEM_MM, 'Lista de sorteio (continuação)', { tamanho: 12, negrito: true });
      yInicial = MARGEM_MM + 10;
      linha = 0;
      coluna = 0;
    }
    documento.texto(MARGEM_MM + coluna * larguraColuna, yInicial + linha * 7, `${índice + 1}) ${número}`, { tamanho: 10.5 });
    coluna += 1;
    if (coluna >= colunas) {
      coluna = 0;
      linha += 1;
    }
  }
}

export function gerarPdfDeBingo({ cartelas, listaDeSorteio, tamanhoDaGrade, tituloDaAtividade = '', comCabeçalho = false, sementeUsada }) {
  const título = tituloDaAtividade || 'Bingo de números';
  const documento = criarDocumentoPdf({ título });

  for (const cartela of cartelas) {
    documento.novaPágina();
    const yTopo = desenharCabeçalho(documento, `${título} — Cartela ${cartela.número}`, comCabeçalho);
    desenharCartela(documento, cartela.grade, tamanhoDaGrade, yTopo);
  }

  documento.novaPágina();
  documento.texto(MARGEM_MM, MARGEM_MM, `Lista de sorteio — ${título}`, { tamanho: 16, negrito: true });
  documento.texto(MARGEM_MM, MARGEM_MM + 8, 'Ordem embaralhada para chamar os números; separada das cartelas.', { tamanho: 10, cor: '#666666' });
  desenharListaDeSorteio(documento, listaDeSorteio, MARGEM_MM + 18);
  if (sementeUsada !== undefined) documento.texto(MARGEM_MM, ALTURA_MM - 9, `Semente usada nesta folha: ${sementeUsada}`, { tamanho: 8, cor: '#999999' });

  return documento.gerarBytes();
}
