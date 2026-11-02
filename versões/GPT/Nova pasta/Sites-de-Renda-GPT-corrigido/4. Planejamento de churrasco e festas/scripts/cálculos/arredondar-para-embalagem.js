// Arredonda uma quantidade necessária para o múltiplo mais próximo (para cima) de uma
// embalagem indivisível informada pela pessoa usuária (ex.: pacote de 500 g, fardo de 6
// garrafas). Usa arredondarParaCima do módulo comum para ignorar resíduo de ponto
// flutuante. Quando não há embalagem informada (tamanhoDaEmbalagem nulo ou zero), a
// quantidade comprada é a própria quantidade necessária, sem arredondar por pacote.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';

export function arredondarParaEmbalagem(quantidadeNecessária, tamanhoDaEmbalagem) {
  if (!Number.isFinite(quantidadeNecessária) || quantidadeNecessária < 0) {
    return { válido: false, erro: 'A quantidade necessária precisa ser um número maior ou igual a zero.' };
  }
  if (tamanhoDaEmbalagem === null || tamanhoDaEmbalagem === undefined || tamanhoDaEmbalagem === 0) {
    return { válido: true, unidadesDeEmbalagem: null, quantidadeComprada: quantidadeNecessária };
  }
  if (!Number.isFinite(tamanhoDaEmbalagem) || tamanhoDaEmbalagem <= 0) {
    return { válido: false, erro: 'O tamanho da embalagem precisa ser maior que zero.' };
  }
  if (quantidadeNecessária === 0) return { válido: true, unidadesDeEmbalagem: 0, quantidadeComprada: 0 };
  const unidadesDeEmbalagem = arredondarParaCima(quantidadeNecessária / tamanhoDaEmbalagem);
  return { válido: true, unidadesDeEmbalagem, quantidadeComprada: unidadesDeEmbalagem * tamanhoDaEmbalagem };
}
