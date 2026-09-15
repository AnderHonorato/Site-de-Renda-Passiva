// Monta o PDF de impressão do molde plano do saco de papel (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeSacoDePapel({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Saco de papel';
  const documento = criarDocumentoPdf({ título });
  desenharMoldeEmPdf(documento, {
    segmentosDeCorte: resultado.segmentosDeCorte,
    segmentosDeDobra: resultado.segmentosDeDobra,
    retânguloEnvolvente: resultado.retânguloEnvolvente,
    títuloDaPeça: título,
  });
  return documento.gerarBytes();
}
