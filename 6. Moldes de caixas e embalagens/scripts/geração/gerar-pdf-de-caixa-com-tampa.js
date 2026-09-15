// Monta o PDF de impressão da caixa com tampa separada: primeiro as folhas da base, depois
// as folhas da tampa, no mesmo documento — cada peça com sua própria legenda, aviso de
// 100% e quadrado de calibração (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeCaixaComTampa({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Caixa com tampa';
  const documento = criarDocumentoPdf({ título });
  desenharMoldeEmPdf(documento, { ...resultado.base, títuloDaPeça: `${título} — base` });
  desenharMoldeEmPdf(documento, { ...resultado.tampa, títuloDaPeça: `${título} — tampa` });
  return documento.gerarBytes();
}
