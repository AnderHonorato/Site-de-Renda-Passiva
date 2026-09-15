// Monta o PDF de "Papel quadriculado" em tamanho real (1 mm no PDF = 1 mm impresso,
// já que criarDocumentoPdf trabalha em milímetros), a partir da mesma geometria calculada
// por calcularPapelQuadriculado. Inclui um quadrado de calibração de 10 mm de verdade e
// um aviso para imprimir em 100%, sem "ajustar à página" — do contrário a régua não bate.
import { criarDocumentoPdf } from '../comum/pdf/criar-documento-pdf.js';

export function gerarPdfDePapelQuadriculado({ folha, tituloDaAtividade = '', comCabeçalho = false }) {
  const título = tituloDaAtividade || 'Papel quadriculado';
  const documento = criarDocumentoPdf({ título });
  documento.novaPágina();

  let y = folha.margemMm;
  documento.texto(folha.margemMm, y, título, { tamanho: 14, negrito: true });
  y += 8;
  if (comCabeçalho) {
    documento.texto(folha.margemMm, y, 'Nome: _______________________________________', { tamanho: 10 });
    documento.texto(folha.larguraPáginaMm - folha.margemMm - 44, y, 'Data: ____ / ____ / ______', { tamanho: 10 });
  }

  for (let coluna = 0; coluna <= folha.colunas; coluna += 1) {
    const x = folha.xInicialMm + coluna * folha.tamanhoDaQuadrículaMm;
    documento.linha(x, folha.yInicialMm, x, folha.yInicialMm + folha.alturaGradeMm, { espessura: 0.15, cor: folha.corDaLinhaHex });
  }
  for (let linha = 0; linha <= folha.linhas; linha += 1) {
    const yLinha = folha.yInicialMm + linha * folha.tamanhoDaQuadrículaMm;
    documento.linha(folha.xInicialMm, yLinha, folha.xInicialMm + folha.larguraGradeMm, yLinha, { espessura: 0.15, cor: folha.corDaLinhaHex });
  }

  documento.retângulo(folha.calibraçãoXMm, folha.calibraçãoYMm, folha.tamanhoDaCalibraçãoMm, folha.tamanhoDaCalibraçãoMm, { contorno: true, espessura: 0.5, cor: '#c0392b' });
  documento.texto(folha.calibraçãoXMm - 2, folha.calibraçãoYMm - 2, `${folha.tamanhoDaCalibraçãoMm} mm de calibração`, { tamanho: 7, cor: '#c0392b', alinhamento: 'direita' });

  documento.texto(folha.margemMm, folha.alturaPáginaMm - 9, 'Imprima este PDF em tamanho real (100%), sem "ajustar à página" — confira o quadrado de calibração com uma régua.', {
    tamanho: 8,
    cor: '#666666',
  });

  return documento.gerarBytes();
}
