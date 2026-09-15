// Monta o PDF de impressão das divisórias de caixa: uma folha para cada tira vertical e
// cada tira horizontal, todas no mesmo documento (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeDivisórias({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Divisórias de caixa';
  const documento = criarDocumentoPdf({ título });
  resultado.tirasVerticais.forEach((tira, índice) => {
    desenharMoldeEmPdf(documento, { ...tira, títuloDaPeça: `${título} — tira vertical ${índice + 1} de ${resultado.tirasVerticais.length}` });
  });
  resultado.tirasHorizontais.forEach((tira, índice) => {
    desenharMoldeEmPdf(documento, { ...tira, títuloDaPeça: `${título} — tira horizontal ${índice + 1} de ${resultado.tirasHorizontais.length}` });
  });
  return documento.gerarBytes();
}
