// Monta o PDF de impressão do molde de cinta para embalagem (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeCinta({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Cinta para embalagem';
  const documento = criarDocumentoPdf({ título });
  desenharMoldeEmPdf(documento, {
    segmentosDeCorte: resultado.segmentosDeCorte,
    segmentosDeDobra: resultado.segmentosDeDobra,
    retânguloEnvolvente: resultado.retânguloEnvolvente,
    títuloDaPeça: título,
  });
  return documento.gerarBytes();
}
