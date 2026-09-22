// ponto-de-equilibrio-calculo.js — funções puras do ponto de equilíbrio (contrato §13.2).
// mcu = preco − custoVariavel − preco × percentualVariavel
// quantidade = teto((custosFixos + lucroDesejado) / mcu)
// receita = (custosFixos + lucroDesejado) / (mcu / preco)

export function arredondarCentavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularPontoDeEquilibrio({
  custosFixos,
  preco,
  custoVariavel = 0,
  percentualVariavel = 0,
  lucroDesejado = 0,
}) {
  const numeros = { custosFixos, preco, custoVariavel, percentualVariavel, lucroDesejado };
  for (const [campo, valor] of Object.entries(numeros)) {
    if (!Number.isFinite(valor)) return { ok: false, erro: 'numero_invalido', campo };
    if (valor < 0) return { ok: false, erro: 'valor_negativo', campo };
  }
  if (preco <= 0) return { ok: false, erro: 'preco_invalido', campo: 'preco' };
  if (percentualVariavel >= 1) return { ok: false, erro: 'percentual_acima_do_limite', campo: 'percentualVariavel' };

  const margemUnitaria = preco - custoVariavel - preco * percentualVariavel;
  if (margemUnitaria <= 0) return { ok: false, erro: 'margem_nao_positiva', campo: 'custoVariavel' };

  const alvo = custosFixos + lucroDesejado;
  const indice = margemUnitaria / preco;
  const quantidadeExata = alvo / margemUnitaria;

  return {
    ok: true,
    margemUnitaria: arredondarCentavos(margemUnitaria),
    indice,
    quantidade: Math.ceil(quantidadeExata),
    quantidadeExata,
    receita: arredondarCentavos(alvo / indice),
    receitaPorQuantidadeInteira: arredondarCentavos(Math.ceil(quantidadeExata) * preco),
    alvo: arredondarCentavos(alvo),
  };
}

/** Quanto sobra (ou falta) vendendo uma quantidade escolhida. */
export function resultadoNaQuantidade(entradas, quantidade) {
  const base = calcularPontoDeEquilibrio(entradas);
  if (!base.ok) return base;
  if (!Number.isFinite(quantidade) || quantidade < 0) return { ok: false, erro: 'numero_invalido', campo: 'quantidade' };
  return {
    ok: true,
    ...base,
    margemTotal: arredondarCentavos(base.margemUnitaria * quantidade),
    resultado: arredondarCentavos(base.margemUnitaria * quantidade - entradas.custosFixos),
  };
}
