// Monta o PDF de "Flashcards" a partir da grade já calculada por montarPáginasDeFlashcards:
// para cada página, uma folha com as frentes (perguntas) seguida da folha com os versos
// (respostas) — assim, imprimindo as duas folhas nos dois lados do mesmo papel (duplex),
// cada verso cai atrás da frente certa quando espelharVerso foi usado no cálculo. O
// tamanho da letra de cada cartão se ajusta para caber o texto, sem estourar a caixa.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { quebrarTextoEmLinhas } from '../comum/pdf/quebrar-texto-em-linhas.js';

const MARGEM_MM = 15;
const LARGURA_MM = 210;
const ALTURA_MM = 297;
const PREENCHIMENTO_MM = 6;
const TAMANHOS_CANDIDATOS = [16, 14, 12, 11, 10, 9, 8];

function ajustarTexto(documento, texto, larguraDisponível, alturaDisponível) {
  let escolhido = null;
  for (const tamanho of TAMANHOS_CANDIDATOS) {
    const alturaDaLinha = tamanho * 0.42;
    const linhas = quebrarTextoEmLinhas(texto, larguraDisponível, (trecho) => documento.larguraDoTexto(trecho, tamanho));
    escolhido = { linhas, tamanho, alturaDaLinha };
    if (linhas.length * alturaDaLinha <= alturaDisponível) break;
  }
  return escolhido;
}

function desenharCartão(documento, texto, x, y, largura, altura) {
  documento.retângulo(x, y, largura, altura, { contorno: true, espessura: 0.3, cor: '#bdbdbd' });
  if (texto === null || texto === undefined) return;
  const larguraDisponível = largura - PREENCHIMENTO_MM * 2;
  const alturaDisponível = altura - PREENCHIMENTO_MM * 2;
  const { linhas, tamanho, alturaDaLinha } = ajustarTexto(documento, texto, larguraDisponível, alturaDisponível);
  const alturaDoBloco = linhas.length * alturaDaLinha;
  let yLinha = y + altura / 2 - alturaDoBloco / 2 + alturaDaLinha * 0.78;
  for (const linha of linhas) {
    documento.texto(x + largura / 2, yLinha, linha, { tamanho, alinhamento: 'centro' });
    yLinha += alturaDaLinha;
  }
}

function desenharFolha(documento, grade, colunas, linhas, legenda) {
  documento.novaPágina();
  documento.texto(MARGEM_MM, MARGEM_MM - 5, legenda, { tamanho: 9, cor: '#999999' });
  const yTopo = MARGEM_MM;
  const larguraDisponível = LARGURA_MM - MARGEM_MM * 2;
  const alturaDisponível = ALTURA_MM - MARGEM_MM - yTopo;
  const larguraCélula = larguraDisponível / colunas;
  const alturaCélula = alturaDisponível / linhas;
  grade.forEach((linhaDeCélulas, índiceDaLinha) => {
    linhaDeCélulas.forEach((texto, índiceDaColuna) => {
      desenharCartão(documento, texto, MARGEM_MM + índiceDaColuna * larguraCélula, yTopo + índiceDaLinha * alturaCélula, larguraCélula, alturaCélula);
    });
  });
}

export function gerarPdfDeFlashcards({ páginas, colunas, linhas, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Flashcards';
  const documento = criarDocumentoPdf({ título });
  páginas.forEach((página, índice) => {
    desenharFolha(documento, página.frente, colunas, linhas, `${título} — Frente, folha ${índice + 1} de ${páginas.length}`);
    desenharFolha(documento, página.verso, colunas, linhas, `${título} — Verso, folha ${índice + 1} de ${páginas.length}`);
  });
  return documento.gerarBytes();
}
