// preco-de-venda-calculo.js — funções puras do preço de venda (sem DOM, testáveis no Node).
// Fórmula (contrato §13.1): preco = custoTotal / (1 − margem − taxa − imposto).

/** Arredonda para 2 casas sem erro de ponto flutuante visível. */
export function arredondarCentavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * @param {object} entradas — valores já numéricos; percentuais em fração (0,3 = 30%).
 * @returns {{ok: true, ...}|{ok: false, erro: string, campo?: string, extras?: object}}
 */
export function calcularPrecoDeVenda({ custoProduto, despesaFixaPorUnidade = 0, taxaCartao = 0, imposto = 0, margem = 0 }) {
  const numeros = { custoProduto, despesaFixaPorUnidade, taxaCartao, imposto, margem };
  for (const [campo, valor] of Object.entries(numeros)) {
    if (!Number.isFinite(valor)) return { ok: false, erro: 'numero_invalido', campo };
    if (valor < 0) return { ok: false, erro: 'valor_negativo', campo };
  }

  const custoTotal = custoProduto + despesaFixaPorUnidade;
  if (custoTotal <= 0) return { ok: false, erro: 'custo_zerado', campo: 'custoProduto' };

  const descontos = margem + taxaCartao + imposto;
  const denominador = 1 - descontos;
  if (denominador <= 0.0001) {
    const limite = 1 - taxaCartao - imposto;
    return { ok: false, erro: 'margem_acima_do_limite', campo: 'margem', extras: { limite } };
  }

  const preco = custoTotal / denominador;
  const taxaEImposto = preco * (taxaCartao + imposto);
  const sobra = preco * margem;
  const precoMinimo = custoTotal / (1 - taxaCartao - imposto);

  return {
    ok: true,
    custoTotal: arredondarCentavos(custoTotal),
    preco: arredondarCentavos(preco),
    taxaEImposto: arredondarCentavos(taxaEImposto),
    sobra: arredondarCentavos(sobra),
    precoMinimo: arredondarCentavos(precoMinimo),
    margem,
  };
}

/** Tabela de cenários de margem (usada na exportação em planilha, recurso do Plus). */
export function montarCenarios(entradas, { inicio = 0.1, fim = 0.5, passo = 0.05 } = {}) {
  const cenarios = [];
  for (let margem = inicio; margem <= fim + 1e-9; margem += passo) {
    const margemArredondada = Math.round(margem * 1000) / 1000;
    const resultado = calcularPrecoDeVenda({ ...entradas, margem: margemArredondada });
    if (resultado.ok) cenarios.push({ margem: margemArredondada, ...resultado });
  }
  return cenarios;
}
