// Soma o custo de todos os ingredientes de uma receita com mão de obra, embalagem de
// venda e custos adicionais (gás, energia etc.), e separa três totais: o custo
// realmente consumido, o custo de estoque (embalagens compradas que sobram) e o
// dinheiro necessário para comprar todas as embalagens inteiras envolvidas.
import { calcularCustoDoIngrediente } from './calcular-custo-do-ingrediente.js';

export function calcularCustoDaReceita({
  ingredientes = [],
  rendimentoAproveitável,
  embalagemDeVendaPorUnidade = 0,
  tempoDePreparoEmMinutos = 0,
  valorDaHora = 0,
  custosAdicionais = 0,
}) {
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    return { válido: false, erro: 'Adicione pelo menos um ingrediente à receita.' };
  }
  if (!Number.isFinite(rendimentoAproveitável) || rendimentoAproveitável <= 0) {
    return { válido: false, erro: 'Informe o rendimento aproveitável, em unidades.' };
  }
  if (!Number.isFinite(embalagemDeVendaPorUnidade) || embalagemDeVendaPorUnidade < 0) {
    return { válido: false, erro: 'A embalagem de venda por unidade não pode ser negativa.' };
  }
  if (!Number.isFinite(tempoDePreparoEmMinutos) || tempoDePreparoEmMinutos < 0) {
    return { válido: false, erro: 'O tempo de preparo não pode ser negativo.' };
  }
  if (!Number.isFinite(valorDaHora) || valorDaHora < 0) {
    return { válido: false, erro: 'O valor da hora não pode ser negativo.' };
  }
  if (!Number.isFinite(custosAdicionais) || custosAdicionais < 0) {
    return { válido: false, erro: 'Os custos adicionais não podem ser negativos.' };
  }

  const ingredientesCalculados = [];
  for (const ingrediente of ingredientes) {
    const calculado = calcularCustoDoIngrediente(ingrediente);
    if (!calculado.válido) return { válido: false, erro: calculado.erro };
    ingredientesCalculados.push(calculado);
  }

  const custoIngredientesConsumido = ingredientesCalculados.reduce((soma, item) => soma + item.custoConsumido, 0);
  const custoDeEstoqueTotal = ingredientesCalculados.reduce((soma, item) => soma + item.custoDeEstoque, 0);
  const dinheiroNecessárioIngredientes = ingredientesCalculados.reduce((soma, item) => soma + item.dinheiroNecessário, 0);

  const custoDaMãoDeObra = (tempoDePreparoEmMinutos / 60) * valorDaHora;
  const custoDasEmbalagensDeVenda = embalagemDeVendaPorUnidade * rendimentoAproveitável;

  const custoConsumidoTotal = custoIngredientesConsumido + custosAdicionais + custoDaMãoDeObra + custoDasEmbalagensDeVenda;
  const dinheiroNecessárioTotal = dinheiroNecessárioIngredientes + custosAdicionais + custoDaMãoDeObra + custoDasEmbalagensDeVenda;
  const custoPorUnidade = custoConsumidoTotal / rendimentoAproveitável;

  return {
    válido: true,
    ingredientesCalculados,
    custoIngredientesConsumido,
    custoDeEstoqueTotal,
    dinheiroNecessárioIngredientes,
    dinheiroNecessárioTotal,
    custoDaMãoDeObra,
    custoDasEmbalagensDeVenda,
    custoConsumidoTotal,
    custoPorUnidade,
  };
}
