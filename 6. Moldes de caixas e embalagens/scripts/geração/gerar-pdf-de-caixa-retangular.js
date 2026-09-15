// Monta o PDF de impressão do molde de caixa retangular simples, em tamanho real, com
// linhas de corte e de dobra, legenda, aviso de 100% e quadrado de calibração — dividido em
// várias folhas automaticamente se não couber numa A4 (ver desenhar-molde-em-pdf.js).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharMoldeEmPdf } from './desenhar-molde-em-pdf.js';

export function gerarPdfDeCaixaRetangular({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Caixa retangular';
  const documento = criarDocumentoPdf({ título });
  desenharMoldeEmPdf(documento, {
    segmentosDeCorte: resultado.segmentosDeCorte,
    segmentosDeDobra: resultado.segmentosDeDobra,
    retânguloEnvolvente: resultado.retânguloEnvolvente,
    títuloDaPeça: título,
  });
  return documento.gerarBytes();
}
