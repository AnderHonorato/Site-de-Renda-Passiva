/**
 * Custos, margem de contribuição e ponto de equilíbrio.
 *
 * As duas ferramentas partem da mesma conta: quanto sobra de cada venda depois
 * do que só existe por causa dela. Essa sobra é a margem de contribuição
 *
 *   margem = preço − custo variável − preço × percentual que sai do preço
 *
 * e é ela que paga o custo fixo do mês. O ponto de equilíbrio é só o número de
 * vendas cujas margens somadas cobrem o custo fixo (e o lucro desejado).
 *
 * Todo dinheiro entra e sai em **centavos inteiros**. A margem exata pode ter
 * fração de centavo (R$ 19,99 com 4,99% de taxa), então as contas usam o valor
 * exato e só arredondam o que vai para a tela — arredondar a margem antes de
 * dividir mudaria a quantidade de equilíbrio em casos de fronteira.
 *
 * O percentual é escrito como na tela: 10 significa 10%.
 */

/** Mês comercial usado para a média por dia, como no restante do portal. */
export const DIAS_DO_MÊS = 30;

/**
 * Cria a recusa de uma regra de negócio apontando o dado culpado.
 * A interface usa `campo` para mostrar a mensagem no campo certo.
 * @param {string} mensagem
 * @param {string} campo nome da propriedade de entrada que precisa ser corrigida
 */
function recusa(mensagem, campo) {
  const erro = new Error(mensagem);
  erro.campo = campo;
  return erro;
}

/** Centavos inteiros, arredondando metade para longe do zero (padrão comercial). */
function centavos(valor) {
  return Math.sign(valor) * Math.round(Math.abs(valor)) || 0;
}

/**
 * Arredonda para cima sem cair no erro de ponto flutuante: 148362 ÷ 1483,62
 * sai 100,00000000000001 e viraria 101 vendas. A folga é relativa ao tamanho
 * do número, porque o erro da divisão cresce junto com ele.
 * @param {number} valor
 * @returns {number}
 */
function paraCima(valor) {
  return éQuaseInteiro(valor) ? Math.round(valor) : Math.ceil(valor);
}

/**
 * Diz se a divisão deu um inteiro, descontado o erro de ponto flutuante. A tela
 * usa para decidir se precisa explicar o arredondamento para cima.
 * @param {number} valor
 */
export function éQuaseInteiro(valor) {
  return Math.abs(valor - Math.round(valor)) <= Math.max(1, Math.abs(valor)) * 1e-12;
}

/**
 * Vendas que cobrem um valor-alvo com a margem exata de cada venda.
 *
 * Devolve `null` quando a quantidade (ou o faturamento dela) passa da precisão
 * segura do JavaScript: com margem de fração de centavo diante de um custo
 * alto, o número deixa de ser algo que alguém consiga planejar, e mostrar
 * "4.999.999.995.570.761 unidades" seria inventar precisão. As duas
 * ferramentas usam esta mesma regra para nunca discordarem.
 * @param {number} alvoCentavos inteiro, maior que zero
 * @param {number} margem margem exata por venda, em centavos, maior que zero
 * @param {number} preçoCentavos
 * @returns {{quantidade: number, quantidadeExata: number, receitaDaQuantidadeInteira: number}|null}
 */
function vendasParaCobrir(alvoCentavos, margem, preçoCentavos) {
  const quantidadeExata = alvoCentavos / margem;
  const quantidade = paraCima(quantidadeExata);
  const receitaDaQuantidadeInteira = quantidade * preçoCentavos;
  if (!Number.isSafeInteger(quantidade) || !Number.isSafeInteger(receitaDaQuantidadeInteira)) return null;
  return { quantidade, quantidadeExata, receitaDaQuantidadeInteira };
}

function exigirCentavos(valor, campo, rótulo) {
  if (!Number.isInteger(valor)) throw recusa(`${rótulo}: o valor precisa estar em centavos inteiros.`, campo);
  if (!Number.isSafeInteger(valor)) throw recusa(`${rótulo}: valor grande demais para calcular com precisão.`, campo);
  if (valor < 0) throw recusa(`${rótulo}: o valor não pode ser negativo.`, campo);
}

/**
 * Valida o que as duas contas têm em comum e devolve a margem exata.
 * @returns {number} margem de contribuição por unidade, em centavos, sem arredondar
 */
function margemExata({ preçoCentavos, custoVariávelCentavos, percentual }) {
  exigirCentavos(preçoCentavos, 'preçoCentavos', 'Preço de venda');
  if (preçoCentavos === 0) throw recusa('Informe o preço de venda para calcular.', 'preçoCentavos');
  exigirCentavos(custoVariávelCentavos, 'custoVariávelCentavos', 'Custo variável');
  if (!Number.isFinite(percentual)) throw recusa('O percentual precisa ser um número.', 'percentual');
  if (percentual < 0) throw recusa('O percentual que sai do preço não pode ser negativo.', 'percentual');
  if (percentual >= 100) throw recusa('O percentual que sai do preço precisa ser menor que 100%.', 'percentual');
  return preçoCentavos - custoVariávelCentavos - (preçoCentavos * percentual) / 100;
}

/**
 * Margem de contribuição de uma venda e, opcionalmente, do mês.
 *
 * Margem negativa não é recusada: ela é um diagnóstico (cada venda aumenta o
 * prejuízo) e precisa aparecer, não ser escondida atrás de um erro.
 *
 * @param {{preçoCentavos: number, custoVariávelCentavos?: number, percentual?: number, quantidade?: number, custosFixosCentavos?: number}} entrada
 * @returns {{
 *   margemCentavos: number, margemExataCentavos: number, índice: number,
 *   percentualCentavos: number, totalCentavos: number, resultadoCentavos: number,
 *   quantidadeDeEquilíbrio: number|null, quantidadeExataDeEquilíbrio: number|null,
 *   equilíbrioForaDeAlcance: boolean, margemNegativa: boolean
 * }}
 */
export function margemDeContribuição({
  preçoCentavos,
  custoVariávelCentavos = 0,
  percentual = 0,
  quantidade = 0,
  custosFixosCentavos = 0,
}) {
  const margem = margemExata({ preçoCentavos, custoVariávelCentavos, percentual });
  if (!Number.isFinite(quantidade)) throw recusa('A quantidade precisa ser um número.', 'quantidade');
  if (quantidade < 0) throw recusa('A quantidade não pode ser negativa.', 'quantidade');
  exigirCentavos(custosFixosCentavos, 'custosFixosCentavos', 'Custos fixos');

  const total = margem * quantidade;
  const equilíbrio = margem > 0 && custosFixosCentavos > 0
    ? vendasParaCobrir(custosFixosCentavos, margem, preçoCentavos)
    : null;
  if (!Number.isSafeInteger(Math.round(total - custosFixosCentavos)) || !Number.isSafeInteger(Math.round(total))) {
    throw recusa('A quantidade é grande demais para calcular com precisão.', 'quantidade');
  }

  return {
    margemCentavos: centavos(margem),
    margemExataCentavos: margem,
    índice: margem / preçoCentavos,
    percentualCentavos: centavos((preçoCentavos * percentual) / 100),
    totalCentavos: centavos(total),
    resultadoCentavos: centavos(total - custosFixosCentavos),
    // Quantidade que zera o resultado: só existe com margem positiva e custo fixo a pagar.
    quantidadeDeEquilíbrio: equilíbrio ? equilíbrio.quantidade : null,
    quantidadeExataDeEquilíbrio: equilíbrio ? equilíbrio.quantidadeExata : null,
    // Margem positiva e custo fixo informado, mas a quantidade passa da precisão:
    // a tela explica em vez de mostrar um número que ninguém consegue planejar.
    equilíbrioForaDeAlcance: margem > 0 && custosFixosCentavos > 0 && equilíbrio === null,
    margemNegativa: margem <= 0,
  };
}

/**
 * Ponto de equilíbrio: quantas vendas e quanto de faturamento pagam o custo
 * fixo do mês e, se informado, o lucro desejado.
 *
 * A quantidade sobe para o inteiro seguinte, porque não se vende 200,4
 * unidades. O faturamento é o valor exato (custo fixo + lucro) ÷ índice.
 *
 * @param {{custosFixosCentavos: number, preçoCentavos: number, custoVariávelCentavos?: number, percentual?: number, lucroDesejadoCentavos?: number}} entrada
 * @returns {{
 *   margemCentavos: number, margemExataCentavos: number, índice: number,
 *   alvoCentavos: number, quantidade: number, quantidadeExata: number,
 *   receitaCentavos: number, receitaDaQuantidadeInteiraCentavos: number, porDia: number
 * }}
 */
export function pontoDeEquilíbrio({
  custosFixosCentavos,
  preçoCentavos,
  custoVariávelCentavos = 0,
  percentual = 0,
  lucroDesejadoCentavos = 0,
}) {
  exigirCentavos(custosFixosCentavos, 'custosFixosCentavos', 'Custos fixos');
  exigirCentavos(lucroDesejadoCentavos, 'lucroDesejadoCentavos', 'Lucro desejado');
  const margem = margemExata({ preçoCentavos, custoVariávelCentavos, percentual });
  if (margem <= 0) {
    throw recusa(
      'Cada venda não deixa nada: o custo variável mais o percentual chegam ao preço. '
      + 'Aumente o preço ou reduza o custo.',
      'custoVariávelCentavos',
    );
  }

  const alvo = custosFixosCentavos + lucroDesejadoCentavos;
  if (!Number.isSafeInteger(alvo)) {
    throw recusa('Custos fixos e lucro somados passam do que dá para calcular com precisão.', 'custosFixosCentavos');
  }
  const vendas = vendasParaCobrir(alvo, margem, preçoCentavos);
  if (!vendas) {
    throw recusa(
      'A sobra de cada venda é pequena demais para cobrir esse custo. Revise preço, custo variável ou percentual.',
      'custoVariávelCentavos',
    );
  }

  const { quantidade, quantidadeExata, receitaDaQuantidadeInteira } = vendas;
  return {
    margemCentavos: centavos(margem),
    margemExataCentavos: margem,
    índice: margem / preçoCentavos,
    alvoCentavos: alvo,
    quantidade,
    quantidadeExata,
    // alvo ÷ (margem ÷ preço), escrito sem a divisão intermediária para não
    // acumular erro de ponto flutuante.
    receitaCentavos: centavos((alvo * preçoCentavos) / margem),
    receitaDaQuantidadeInteiraCentavos: receitaDaQuantidadeInteira,
    porDia: Math.ceil(quantidade / DIAS_DO_MÊS),
  };
}
