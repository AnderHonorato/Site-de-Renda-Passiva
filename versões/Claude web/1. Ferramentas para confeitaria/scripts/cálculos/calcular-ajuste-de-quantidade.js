// Escala uma receita de um rendimento original para uma quantidade desejada.
// Mostra dois caminhos: o fator de escala contínuo (não considera lotes) e o número
// de lotes inteiros necessários (arredondado para cima), com o rendimento real de cada um.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

export function calcularAjusteDeQuantidade({ rendimentoOriginal, quantidadeDesejada }) {
  if (!Number.isFinite(rendimentoOriginal) || rendimentoOriginal <= 0) {
    return { válido: false, erro: 'O rendimento original da receita precisa ser maior que zero.' };
  }
  if (!Number.isFinite(quantidadeDesejada) || quantidadeDesejada <= 0) {
    return { válido: false, erro: 'A quantidade desejada precisa ser maior que zero.' };
  }

  const fatorDeEscala = quantidadeDesejada / rendimentoOriginal;
  const lotesInteiros = arredondarParaCima(quantidadeDesejada / rendimentoOriginal);
  const rendimentoComLotesInteiros = lotesInteiros * rendimentoOriginal;

  return {
    válido: true,
    fatorDeEscala,
    rendimentoComFator: rendimentoOriginal * fatorDeEscala,
    lotesInteiros,
    rendimentoComLotesInteiros,
  };
}
