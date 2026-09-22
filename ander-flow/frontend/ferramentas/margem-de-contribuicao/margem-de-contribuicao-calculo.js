// margem-de-contribuicao-calculo.js — funções puras da margem de contribuição (contrato §13.3).
// mcu = preco − custoVariavel − preco × percentualVariavel
// indice = mcu / preco · total = mcu × quantidade · resultado = total − custosFixos

export function arredondarCentavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularMargemDeContribuicao({
  preco,
  custoVariavel = 0,
  percentualVariavel = 0,
  quantidade = 0,
  custosFixos = 0,
}) {
  const numeros = { preco, custoVariavel, percentualVariavel, quantidade, custosFixos };
  for (const [campo, valor] of Object.entries(numeros)) {
    if (!Number.isFinite(valor)) return { ok: false, erro: 'numero_invalido', campo };
    if (valor < 0) return { ok: false, erro: 'valor_negativo', campo };
  }
  if (preco <= 0) return { ok: false, erro: 'preco_invalido', campo: 'preco' };
  if (percentualVariavel >= 1) return { ok: false, erro: 'percentual_acima_do_limite', campo: 'percentualVariavel' };

  const margemUnitaria = preco - custoVariavel - preco * percentualVariavel;
  const indice = margemUnitaria / preco;
  const total = margemUnitaria * quantidade;
  const resultado = total - custosFixos;

  return {
    ok: true,
    margemUnitaria: arredondarCentavos(margemUnitaria),
    indice,
    total: arredondarCentavos(total),
    resultado: arredondarCentavos(resultado),
    // Quantidade que zera o resultado; só existe quando a margem é positiva.
    quantidadeDeEquilibrio: margemUnitaria > 0 && custosFixos > 0 ? Math.ceil(custosFixos / margemUnitaria) : null,
    margemNegativa: margemUnitaria <= 0,
  };
}
