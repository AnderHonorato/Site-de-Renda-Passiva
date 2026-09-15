// Monta o PDF de impressão do molde de envelope, em tamanho real, com o mesmo tratamento
// de legenda, aviso de 100% e calibração usado nas caixas (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeEnvelope({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Envelope';
  const documento = criarDocumentoPdf({ título });
  desenharMoldeEmPdf(documento, {
    segmentosDeCorte: resultado.segmentosDeCorte,
    segmentosDeDobra: resultado.segmentosDeDobra,
    retânguloEnvolvente: resultado.retânguloEnvolvente,
    títuloDaPeça: título,
  });
  return documento.gerarBytes();
}
