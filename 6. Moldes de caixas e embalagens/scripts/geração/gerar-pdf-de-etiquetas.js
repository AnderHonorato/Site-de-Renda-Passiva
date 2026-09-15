// Monta o PDF da folha de etiquetas: uma página de instruções e calibração, seguida da
// página com a grade de etiquetas cortável (sem linhas de dobra — etiqueta não dobra).
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';
import { desenharCalibraçãoEmPdf } from './desenhar-calibração-em-pdf.js';

const LARGURA_PÁGINA_MM = 210;

export function gerarPdfDeEtiquetas({ resultado, tituloDaAtividade = '' }) {
  const título = tituloDaAtividade || 'Etiquetas';
  const documento = criarDocumentoPdf({ título });

  documento.novaPágina();
  documento.texto(10, 16, título, { tamanho: 15, negrito: true });
  documento.texto(10, 24, 'Imprima em 100% (tamanho real), sem ajustar à página.', { tamanho: 9, cor: '#444444' });
  documento.texto(
    10,
    31,
    `${resultado.colunas} colunas × ${resultado.linhas} linhas = ${resultado.total} etiquetas de ${resultado.larguraDaEtiquetaMm} × ${resultado.alturaDaEtiquetaMm} mm, margem ${resultado.margemMm} mm.`,
    { tamanho: 9 },
  );
  desenharCalibraçãoEmPdf(documento, 10, 45);

  documento.novaPágina();
  documento.retângulo(0, 0, LARGURA_PÁGINA_MM, 1, { contorno: false, preenchimento: '#ffffff' });
  for (const segmento of resultado.segmentosDeCorte) {
    documento.linha(segmento.x1, segmento.y1, segmento.x2, segmento.y2, { espessura: 0.3, cor: '#000000' });
  }
  if (resultado.textoOpcional) {
    for (const posição of resultado.posições) {
      documento.texto(posição.xMm + resultado.larguraDaEtiquetaMm / 2, posição.yMm + resultado.alturaDaEtiquetaMm / 2 + 1.5, resultado.textoOpcional.slice(0, 40), {
        tamanho: 8,
        alinhamento: 'centro',
      });
    }
  }

  return documento.gerarBytes();
}
