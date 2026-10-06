/**
 * Simulador de financiamento (F203): Tabela Price, SAC e custo efetivo total (CET).
 *
 * Tudo em centavos inteiros. Cada parcela é montada mês a mês: juros = saldo devedor × taxa
 * (arredondado ao centavo), amortização = o que sobra da parcela. A ÚLTIMA parcela quita o saldo
 * restante, absorvendo o arredondamento dos meses anteriores; sem isso o saldo final não fecharia
 * em zero e a soma das amortizações não bateria com o valor financiado.
 *
 * Premissas (a tela as repete junto do resultado):
 * - taxa constante durante todo o prazo, sem correção monetária (TR, IPCA) e sem IOF;
 * - seguro = percentual ao mês sobre o saldo devedor no início de cada mês;
 * - tarifa mensal = valor fixo somado a cada parcela;
 * - tarifa inicial = paga na assinatura, fora do valor financiado (não entra nas parcelas);
 * - CET = taxa interna de retorno do fluxo (valor recebido menos tarifa inicial, contra todas as
 *   parcelas), no espírito da Resolução CMN nº 3.517/2007. Sem IOF, o CET aqui é um piso: o do banco
 *   costuma sair um pouco maior.
 */

export const PRAZO_MÁXIMO = 480;
export const VALOR_MÁXIMO_CENTAVOS = 100_000_000_000; // R$ 1 bilhão
export const TAXA_MENSAL_MÁXIMA = 30; // % ao mês
export const TAXA_ANUAL_MÁXIMA = 1000; // % ao ano
export const SEGURO_MÁXIMO = 5; // % ao mês sobre o saldo devedor

/** Como a taxa foi informada. */
export const BASES_DA_TAXA = Object.freeze({
  mês: 'ao mês',
  'ano-efetiva': 'ao ano, efetiva (composta)',
  'ano-nominal': 'ao ano, nominal (dividida por 12)',
});

/** Erro de regra de negócio, com o campo da tela que a pessoa precisa corrigir. */
export class ErroDeFinanciamento extends Error {
  /** @param {string} mensagem @param {string} [campo] */
  constructor(mensagem, campo) {
    super(mensagem);
    this.name = 'ErroDeFinanciamento';
    this.campo = campo;
  }
}

/**
 * Taxa mensal (em fração, 0,01 = 1%) a partir da taxa informada.
 * - `mês`: já é mensal.
 * - `ano-efetiva`: (1 + a)^(1/12) − 1, a conta dos juros compostos (12,6825% a.a. = 1% a.m.).
 * - `ano-nominal`: a ÷ 12, como boa parte dos contratos de imóvel anuncia (12% a.a. = 1% a.m.).
 * @param {number} taxaPercentual
 * @param {keyof typeof BASES_DA_TAXA} base
 * @returns {number}
 */
export function taxaMensalEmFração(taxaPercentual, base) {
  if (!Number.isFinite(taxaPercentual) || taxaPercentual < 0) throw new ErroDeFinanciamento('A taxa de juros não pode ser negativa.', 'taxa');
  const fração = taxaPercentual / 100;
  if (base === 'mês') return fração;
  if (base === 'ano-efetiva') return (1 + fração) ** (1 / 12) - 1;
  if (base === 'ano-nominal') return fração / 12;
  throw new ErroDeFinanciamento('Escolha como a taxa foi informada.', 'baseDaTaxa');
}

/**
 * @typedef {{
 *   número: number, parcelaCentavos: number, jurosCentavos: number, amortizaçãoCentavos: number,
 *   seguroETarifaCentavos: number, saldoCentavos: number,
 * }} Parcela
 * `parcelaCentavos` é o que a pessoa paga no mês (inclui seguro e tarifa mensal).
 */

/**
 * Monta a tabela mês a mês. `amortizarNoMês` decide quanto do saldo cada sistema amortiza.
 * @param {{financiadoCentavos: number, prazo: number, taxaMensal: number, seguroPercentual: number, tarifaMensalCentavos: number}} entrada
 * @param {(mês: number, saldo: number, juros: number) => number} amortizarNoMês
 * @returns {Parcela[]}
 */
function montarTabela({ financiadoCentavos, prazo, taxaMensal, seguroPercentual, tarifaMensalCentavos }, amortizarNoMês) {
  const parcelas = [];
  let saldo = financiadoCentavos;
  for (let mês = 1; mês <= prazo; mês += 1) {
    const jurosCentavos = Math.round(saldo * taxaMensal);
    const seguroCentavos = Math.round(saldo * (seguroPercentual / 100));
    // A última parcela quita o que restou; nos outros meses, nunca amortiza mais que o saldo nem menos que zero.
    const amortizaçãoCentavos = mês === prazo ? saldo : Math.min(saldo, Math.max(0, amortizarNoMês(mês, saldo, jurosCentavos)));
    const seguroETarifaCentavos = seguroCentavos + tarifaMensalCentavos;
    saldo -= amortizaçãoCentavos;
    parcelas.push({
      número: mês,
      parcelaCentavos: amortizaçãoCentavos + jurosCentavos + seguroETarifaCentavos,
      jurosCentavos,
      amortizaçãoCentavos,
      seguroETarifaCentavos,
      saldoCentavos: saldo,
    });
  }
  return parcelas;
}

/**
 * Tabela Price: parcela de juros + amortização constante (PMT), com juros que caem e amortização que cresce.
 * PMT = PV × i ÷ (1 − (1 + i)^−n); com taxa zero, PV ÷ n.
 * @param {{financiadoCentavos: number, prazo: number, taxaMensal: number, seguroPercentual?: number, tarifaMensalCentavos?: number}} entrada
 * @returns {Parcela[]}
 */
export function tabelaPrice({ seguroPercentual = 0, tarifaMensalCentavos = 0, ...base }) {
  const { financiadoCentavos, prazo, taxaMensal } = base;
  const pmt = taxaMensal === 0
    ? Math.floor(financiadoCentavos / prazo)
    : Math.round((financiadoCentavos * taxaMensal) / (1 - (1 + taxaMensal) ** -prazo));
  return montarTabela({ ...base, seguroPercentual, tarifaMensalCentavos }, (_mês, _saldo, juros) => pmt - juros);
}

/**
 * SAC (Sistema de Amortização Constante): amortização fixa (PV ÷ n), parcela que cai a cada mês.
 * @param {{financiadoCentavos: number, prazo: number, taxaMensal: number, seguroPercentual?: number, tarifaMensalCentavos?: number}} entrada
 * @returns {Parcela[]}
 */
export function tabelaSac({ seguroPercentual = 0, tarifaMensalCentavos = 0, ...base }) {
  const amortização = Math.floor(base.financiadoCentavos / base.prazo);
  return montarTabela({ ...base, seguroPercentual, tarifaMensalCentavos }, () => amortização);
}

/**
 * Custo efetivo total: taxa interna de retorno do fluxo, mensal e anualizada.
 *
 * Acha r tal que Σ parcela_k ÷ (1 + r)^k = valor líquido recebido, por bisseção (a função é
 * estritamente decrescente em r, então a raiz é única). Devolve `null` quando não há taxa
 * possível (por exemplo, quando as parcelas somam menos que o valor recebido).
 * @param {number} recebidoCentavos o que a pessoa recebe na data zero (financiado menos a tarifa inicial)
 * @param {readonly number[]} parcelasCentavos parcelas dos meses 1..n
 * @returns {{mensal: number, anual: number} | null} em porcentagem
 */
export function calcularCet(recebidoCentavos, parcelasCentavos) {
  if (!(recebidoCentavos > 0) || parcelasCentavos.length === 0) return null;
  const valorPresente = (r) => {
    let soma = 0;
    let fator = 1;
    for (const parcela of parcelasCentavos) {
      fator /= 1 + r;
      soma += parcela * fator;
    }
    return soma;
  };
  const total = parcelasCentavos.reduce((s, p) => s + p, 0);
  if (total < recebidoCentavos) return null;

  let baixo = 0;
  let alto = 1;
  // Dobra o teto até a taxa certa caber (até 10.000% ao mês; acima disso o número não ajuda ninguém).
  while (valorPresente(alto) > recebidoCentavos && alto < 100) alto *= 2;
  if (valorPresente(alto) > recebidoCentavos) return null;
  for (let passo = 0; passo < 200; passo += 1) {
    const meio = (baixo + alto) / 2;
    if (valorPresente(meio) > recebidoCentavos) baixo = meio;
    else alto = meio;
  }
  const mensal = (baixo + alto) / 2;
  return { mensal: mensal * 100, anual: ((1 + mensal) ** 12 - 1) * 100 };
}

const soma = (parcelas, campo) => parcelas.reduce((total, p) => total + p[campo], 0);

/**
 * Resume uma tabela: primeira e última parcelas, totais e CET.
 * @param {Parcela[]} parcelas
 * @param {number} financiadoCentavos
 * @param {number} tarifaInicialCentavos
 */
function resumir(parcelas, financiadoCentavos, tarifaInicialCentavos) {
  const totalPagoCentavos = soma(parcelas, 'parcelaCentavos');
  return {
    parcelas,
    primeiraCentavos: parcelas[0].parcelaCentavos,
    últimaCentavos: parcelas[parcelas.length - 1].parcelaCentavos,
    totalPagoCentavos,
    jurosCentavos: soma(parcelas, 'jurosCentavos'),
    segurosETarifasCentavos: soma(parcelas, 'seguroETarifaCentavos'),
    // Custo do crédito: tudo o que se paga além do que foi emprestado (juros, seguro e tarifas).
    custoDoCréditoCentavos: totalPagoCentavos + tarifaInicialCentavos - financiadoCentavos,
    cet: calcularCet(financiadoCentavos - tarifaInicialCentavos, parcelas.map((p) => p.parcelaCentavos)),
  };
}

/**
 * Compara Price e SAC para o mesmo financiamento.
 * @param {{
 *   valorCentavos: number, entradaCentavos?: number, prazo: number, taxa: number,
 *   baseDaTaxa?: keyof typeof BASES_DA_TAXA, seguroPercentual?: number,
 *   tarifaMensalCentavos?: number, tarifaInicialCentavos?: number,
 * }} entrada
 */
export function simularFinanciamento({
  valorCentavos, entradaCentavos = 0, prazo, taxa, baseDaTaxa = 'mês',
  seguroPercentual = 0, tarifaMensalCentavos = 0, tarifaInicialCentavos = 0,
}) {
  if (!Number.isSafeInteger(valorCentavos) || valorCentavos < 100) throw new ErroDeFinanciamento('O valor do bem precisa ser de pelo menos R$ 1,00.', 'valor');
  if (valorCentavos > VALOR_MÁXIMO_CENTAVOS) throw new ErroDeFinanciamento('O valor do bem passa do limite de R$ 1 bilhão.', 'valor');
  if (!Number.isSafeInteger(entradaCentavos) || entradaCentavos < 0) throw new ErroDeFinanciamento('A entrada não pode ser negativa.', 'entrada');
  if (entradaCentavos >= valorCentavos) {
    throw new ErroDeFinanciamento('A entrada cobre o valor todo: não sobra nada para financiar. Informe uma entrada menor que o valor do bem.', 'entrada');
  }
  if (!Number.isInteger(prazo) || prazo < 1 || prazo > PRAZO_MÁXIMO) throw new ErroDeFinanciamento(`O prazo precisa ser de 1 a ${PRAZO_MÁXIMO} meses.`, 'prazo');
  const limiteDaTaxa = baseDaTaxa === 'mês' ? TAXA_MENSAL_MÁXIMA : TAXA_ANUAL_MÁXIMA;
  if (!Number.isFinite(taxa) || taxa < 0) throw new ErroDeFinanciamento('A taxa de juros não pode ser negativa.', 'taxa');
  if (taxa > limiteDaTaxa) throw new ErroDeFinanciamento(`A taxa passa de ${limiteDaTaxa}% ${BASES_DA_TAXA[baseDaTaxa]}. Confira se digitou a taxa certa.`, 'taxa');
  if (!Number.isFinite(seguroPercentual) || seguroPercentual < 0 || seguroPercentual > SEGURO_MÁXIMO) {
    throw new ErroDeFinanciamento(`O seguro precisa ficar entre 0% e ${SEGURO_MÁXIMO}% ao mês.`, 'seguro');
  }
  if (!Number.isSafeInteger(tarifaMensalCentavos) || tarifaMensalCentavos < 0 || tarifaMensalCentavos > valorCentavos) {
    throw new ErroDeFinanciamento('A tarifa mensal não pode ser negativa nem maior que o valor do bem.', 'tarifaMensal');
  }

  const financiadoCentavos = valorCentavos - entradaCentavos;
  if (financiadoCentavos < 100) throw new ErroDeFinanciamento('O valor financiado ficaria abaixo de R$ 1,00. Reduza a entrada.', 'entrada');
  if (!Number.isSafeInteger(tarifaInicialCentavos) || tarifaInicialCentavos < 0 || tarifaInicialCentavos >= financiadoCentavos) {
    throw new ErroDeFinanciamento('A tarifa inicial precisa ser menor que o valor financiado.', 'tarifaInicial');
  }

  const taxaMensal = taxaMensalEmFração(taxa, baseDaTaxa);
  const base = { financiadoCentavos, prazo, taxaMensal, seguroPercentual, tarifaMensalCentavos };
  const price = resumir(tabelaPrice(base), financiadoCentavos, tarifaInicialCentavos);
  const sac = resumir(tabelaSac(base), financiadoCentavos, tarifaInicialCentavos);

  return {
    financiadoCentavos,
    entradaCentavos,
    tarifaInicialCentavos,
    prazo,
    taxaMensalPercentual: taxaMensal * 100,
    price,
    sac,
    // Desembolso total: entrada + tarifa inicial + todas as parcelas (o custo real de ter o bem pelo financiamento).
    desembolsoDoPriceCentavos: entradaCentavos + tarifaInicialCentavos + price.totalPagoCentavos,
    desembolsoDoSacCentavos: entradaCentavos + tarifaInicialCentavos + sac.totalPagoCentavos,
  };
}

/** Linhas de CSV de uma tabela (valores em reais com vírgula decimal, prontos para a planilha). */
export function linhasDaTabela(parcelas) {
  const reais = (centavos) => (centavos / 100).toFixed(2).replace('.', ',');
  return [
    ['Parcela nº', 'Prestação (R$)', 'Juros (R$)', 'Amortização (R$)', 'Seguro e tarifa (R$)', 'Saldo devedor (R$)'],
    ...parcelas.map((p) => [
      p.número, reais(p.parcelaCentavos), reais(p.jurosCentavos), reais(p.amortizaçãoCentavos),
      reais(p.seguroETarifaCentavos), reais(p.saldoCentavos),
    ]),
  ];
}
