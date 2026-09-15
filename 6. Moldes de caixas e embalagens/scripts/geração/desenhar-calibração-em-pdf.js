// Desenha, num documento PDF já aberto (criar-documento-pdf.js), um quadrado de
// calibração de 50×50 mm com uma régua de 10 em 10 mm, para o usuário conferir com uma
// régua física que a impressão saiu em tamanho real (100%, sem ajustar à página). Efeito
// colateral sobre "documento" — não é uma função pura, mas isolada num arquivo próprio
// para ficar testável (o PDF gerado é conferido nos testes).
const LADO_MM = 50;

export function desenharCalibraçãoEmPdf(documento, xMm, yMm) {
  documento.retângulo(xMm, yMm, LADO_MM, LADO_MM, { contorno: true, espessura: 0.3, cor: '#000000' });
  for (let marca = 0; marca <= LADO_MM; marca += 10) {
    const alturaDaMarca = marca % 50 === 0 ? 3 : 1.6;
    documento.linha(xMm + marca, yMm + LADO_MM, xMm + marca, yMm + LADO_MM + alturaDaMarca, { espessura: 0.25, cor: '#000000' });
  }
  documento.texto(xMm, yMm + LADO_MM + 6.5, 'Quadrado de calibração: 50 × 50 mm. Meça com uma régua antes de montar.', { tamanho: 7, cor: '#444444' });
  return documento;
}
