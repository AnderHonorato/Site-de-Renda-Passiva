// Fator de conversão de massa entre duas formas de assar de mesma altura: a razão
// entre as áreas da forma de destino e da forma de origem. Não altera nem estima o
// tempo de cocção: só a proporção de massa que preenche a nova forma na mesma altura.
import { calcularÁreaDeForma } from './calcular-área-de-forma.js';

export function calcularConversorDeFormas({ origem, destino, quantidadeOriginal }) {
  const áreaDeOrigem = calcularÁreaDeForma(origem);
  if (!áreaDeOrigem.válido) return { válido: false, erro: `Forma de origem: ${áreaDeOrigem.erro}` };
  const áreaDeDestino = calcularÁreaDeForma(destino);
  if (!áreaDeDestino.válido) return { válido: false, erro: `Forma de destino: ${áreaDeDestino.erro}` };

  const fatorDeConversão = áreaDeDestino.área / áreaDeOrigem.área;
  const resultado = { válido: true, áreaDeOrigem: áreaDeOrigem.área, áreaDeDestino: áreaDeDestino.área, fatorDeConversão };
  if (Number.isFinite(quantidadeOriginal) && quantidadeOriginal > 0) {
    resultado.quantidadeConvertida = quantidadeOriginal * fatorDeConversão;
  }
  return resultado;
}
