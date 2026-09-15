// Custo proporcional de um ingrediente: preço da embalagem × quantidade usada ÷
// quantidade comprada, convertendo a quantidade usada para a unidade de compra.
// Também calcula quantos pacotes inteiros seriam necessários para ter esse ingrediente
// em estoque, o dinheiro que isso exigiria e o valor que sobraria em embalagem aberta.
import { arredondarParaCima } from '../comum/matemática/arredondar-para-cima.js';
import { converterUnidade } from './converter-unidade.js';

export function calcularCustoDoIngrediente({ nome = '', preçoComprado, quantidadeComprada, unidadeComprada, quantidadeUsada, unidadeUsada }) {
  const rótulo = nome && nome.trim() ? nome.trim() : 'Ingrediente';
  if (!Number.isFinite(preçoComprado) || preçoComprado <= 0) {
    return { válido: false, erro: `${rótulo}: informe o preço pago pela embalagem.` };
  }
  if (!Number.isFinite(quantidadeComprada) || quantidadeComprada <= 0) {
    return { válido: false, erro: `${rótulo}: a quantidade da embalagem comprada precisa ser maior que zero.` };
  }
  if (!Number.isFinite(quantidadeUsada) || quantidadeUsada <= 0) {
    return { válido: false, erro: `${rótulo}: informe a quantidade usada na receita.` };
  }

  const convertido = converterUnidade(quantidadeUsada, unidadeUsada, unidadeComprada);
  if (!convertido.válido) {
    return { válido: false, erro: `${rótulo}: ${convertido.erro}` };
  }

  const quantidadeUsadaNaUnidadeComprada = convertido.valor;
  const custoConsumido = preçoComprado * (quantidadeUsadaNaUnidadeComprada / quantidadeComprada);
  const pacotesNecessários = arredondarParaCima(quantidadeUsadaNaUnidadeComprada / quantidadeComprada);
  const dinheiroNecessário = pacotesNecessários * preçoComprado;
  const custoDeEstoque = dinheiroNecessário - custoConsumido;

  return {
    válido: true,
    nome: rótulo,
    custoConsumido,
    pacotesNecessários,
    dinheiroNecessário,
    custoDeEstoque,
  };
}
