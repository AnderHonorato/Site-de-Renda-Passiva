/**
 * Cálculos de dinheiro.
 *
 * Regra geral deste arquivo: todo dinheiro circula em **centavos inteiros**
 * dentro das funções e só vira reais na hora de mostrar. Misturar reais e
 * centavos foi a origem de um defeito real neste projeto (custos 100× maiores),
 * por isso a conversão fica em um lugar só.
 */

/** Converte reais para centavos inteiros, arredondando pelo padrão comercial. */
export function emCentavos(reais) {
  if (!Number.isFinite(reais)) throw new Error('Valor inválido.');
  return Math.round(reais * 100);
}

/** Converte centavos inteiros para reais. */
export function emReais(centavos) {
  if (!Number.isSafeInteger(centavos)) throw new Error('Os centavos precisam ser inteiros.');
  return centavos / 100;
}

/**
 * Operações de porcentagem.
 * @param {'de'|'aumento'|'desconto'|'variação'|'proporção'} operação
 * @param {number} a
 * @param {number} b
 * @returns {{valor: number, fórmula: string, extra?: [string, number][]}}
 */
export function porcentagem(operação, a, b) {
  switch (operação) {
    case 'de': // a% de b
      return { valor: (a / 100) * b, fórmula: `${a}% de ${b} = ${a} ÷ 100 × ${b}` };
    case 'aumento': {
      const acréscimo = (b / 100) * a;
      return {
        valor: a + acréscimo,
        fórmula: `${a} + ${b}% = ${a} + ${acréscimo}`,
        extra: [['Acréscimo', acréscimo]],
      };
    }
    case 'desconto': {
      const abatimento = (b / 100) * a;
      return {
        valor: a - abatimento,
        fórmula: `${a} − ${b}% = ${a} − ${abatimento}`,
        extra: [['Desconto', abatimento]],
      };
    }
    case 'variação': {
      if (a === 0) throw new Error('O valor inicial não pode ser zero para calcular variação.');
      const variação = ((b - a) / Math.abs(a)) * 100;
      return {
        valor: variação,
        fórmula: `(${b} − ${a}) ÷ ${Math.abs(a)} × 100`,
        extra: [['Diferença', b - a]],
      };
    }
    case 'proporção': // a é quanto por cento de b
      if (b === 0) throw new Error('O total não pode ser zero.');
      return { valor: (a / b) * 100, fórmula: `${a} ÷ ${b} × 100` };
    default:
      throw new Error(`Operação desconhecida: ${operação}`);
  }
}

/**
 * Preço de venda a partir do custo, com margem sobre a receita.
 *
 * Margem, taxas e imposto são percentuais **sobre o preço de venda**, não sobre
 * o custo. É a confusão mais cara do varejo: aplicar 30% sobre o custo não
 * devolve 30% de margem.
 *
 * @param {{custoCentavos: number, fixoCentavos?: number, margem: number, taxas?: number, imposto?: number, unidades?: number}} entrada
 * @returns {{preçoCentavos: number, porUnidadeCentavos: number, lucroCentavos: number, markup: number, composição: [string, number][]}}
 */
export function preçoDeVenda({ custoCentavos, fixoCentavos = 0, margem, taxas = 0, imposto = 0, unidades = 1 }) {
  if (!Number.isSafeInteger(custoCentavos) || custoCentavos < 0) throw new Error('Custo inválido.');
  if (!Number.isSafeInteger(fixoCentavos) || fixoCentavos < 0) throw new Error('Despesa fixa inválida.');
  if (!Number.isInteger(unidades) || unidades < 1) throw new Error('Informe pelo menos uma unidade.');

  const retido = (margem + taxas + imposto) / 100;
  if (retido >= 1) {
    throw new Error('Margem, taxas e imposto somam 100% ou mais: não sobra preço possível. Reduza algum deles.');
  }

  const base = custoCentavos + fixoCentavos;
  const preçoCentavos = Math.ceil(base / (1 - retido));
  const taxasCentavos = Math.round(preçoCentavos * (taxas / 100));
  const impostoCentavos = Math.round(preçoCentavos * (imposto / 100));
  const lucroCentavos = preçoCentavos - base - taxasCentavos - impostoCentavos;

  return {
    preçoCentavos,
    porUnidadeCentavos: Math.ceil(preçoCentavos / unidades),
    lucroCentavos,
    markup: base === 0 ? 0 : ((preçoCentavos - base) / base) * 100,
    composição: [
      ['Custo', custoCentavos],
      ['Despesa fixa', fixoCentavos],
      ['Taxas', taxasCentavos],
      ['Imposto', impostoCentavos],
      ['Lucro', lucroCentavos],
    ],
  };
}

/**
 * Juros simples ou compostos, com aporte no fim de cada período.
 * @param {{principalCentavos: number, taxa: number, períodos: number, composto?: boolean, aporteCentavos?: number}} entrada
 * @returns {{montanteCentavos: number, jurosCentavos: number, aportadoCentavos: number, evolução: {período: number, saldoCentavos: number, jurosCentavos: number}[]}}
 */
export function juros({ principalCentavos, taxa, períodos, composto = true, aporteCentavos = 0 }) {
  if (!Number.isSafeInteger(principalCentavos) || principalCentavos < 0) throw new Error('Valor inicial inválido.');
  if (!Number.isInteger(períodos) || períodos < 1 || períodos > 1200) {
    throw new Error('Informe de 1 a 1200 períodos.');
  }
  if (taxa < -100) throw new Error('Taxa inválida.');

  const fator = taxa / 100;
  const evolução = [];
  let saldo = principalCentavos;
  let aportado = 0;

  for (let período = 1; período <= períodos; período += 1) {
    // Juros simples incidem sempre sobre o principal; compostos, sobre o saldo.
    const base = composto ? saldo : principalCentavos;
    const jurosDoPeríodo = Math.round(base * fator);
    saldo += jurosDoPeríodo + aporteCentavos;
    aportado += aporteCentavos;
    evolução.push({ período, saldoCentavos: saldo, jurosCentavos: jurosDoPeríodo });
  }

  return {
    montanteCentavos: saldo,
    jurosCentavos: saldo - principalCentavos - aportado,
    aportadoCentavos: aportado,
    evolução,
  };
}

/**
 * Parcelamento pela Tabela Price.
 * @param {{valorCentavos: number, entradaCentavos?: number, parcelas: number, taxa: number}} entrada
 * @returns {{parcelaCentavos: number, totalCentavos: number, jurosCentavos: number}}
 */
export function parcelamento({ valorCentavos, entradaCentavos = 0, parcelas, taxa }) {
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 480) {
    throw new Error('Informe de 1 a 480 parcelas.');
  }
  if (entradaCentavos >= valorCentavos) throw new Error('A entrada não pode cobrir o valor todo.');
  const financiado = valorCentavos - entradaCentavos;
  const i = taxa / 100;
  const parcelaCentavos = i === 0
    ? Math.round(financiado / parcelas)
    : Math.round((financiado * i) / (1 - (1 + i) ** -parcelas));
  const totalCentavos = parcelaCentavos * parcelas + entradaCentavos;
  return { parcelaCentavos, totalCentavos, jurosCentavos: totalCentavos - valorCentavos };
}

/**
 * Acerto de contas de um grupo.
 *
 * Devolve o menor conjunto razoável de transferências: casa sempre o maior
 * credor com o maior devedor, o que zera os saldos em no máximo n−1 acertos.
 *
 * @param {{nome: string, pagouCentavos: number, peso?: number}[]} participantes
 * @returns {{totalCentavos: number, saldos: {nome: string, saldoCentavos: number, deveriaPagarCentavos: number}[], acertos: {de: string, para: string, valorCentavos: number}[]}}
 */
export function divisãoDeContas(participantes) {
  if (!Array.isArray(participantes) || participantes.length < 2) {
    throw new Error('Informe pelo menos duas pessoas.');
  }
  for (const p of participantes) {
    if (!Number.isSafeInteger(p.pagouCentavos) || p.pagouCentavos < 0) {
      throw new Error(`Valor inválido para ${p.nome}.`);
    }
  }

  const totalCentavos = participantes.reduce((soma, p) => soma + p.pagouCentavos, 0);
  const pesoTotal = participantes.reduce((soma, p) => soma + (p.peso ?? 1), 0);
  if (pesoTotal <= 0) throw new Error('A soma dos pesos precisa ser maior que zero.');

  // Distribui o total pelos pesos e joga a sobra de arredondamento na última pessoa.
  let distribuído = 0;
  const saldos = participantes.map((p, i) => {
    const éÚltima = i === participantes.length - 1;
    const deveriaPagarCentavos = éÚltima
      ? totalCentavos - distribuído
      : Math.round((totalCentavos * (p.peso ?? 1)) / pesoTotal);
    distribuído += deveriaPagarCentavos;
    return { nome: p.nome, deveriaPagarCentavos, saldoCentavos: p.pagouCentavos - deveriaPagarCentavos };
  });

  const credores = saldos.filter((s) => s.saldoCentavos > 0)
    .map((s) => ({ nome: s.nome, valor: s.saldoCentavos }))
    .sort((a, b) => b.valor - a.valor);
  const devedores = saldos.filter((s) => s.saldoCentavos < 0)
    .map((s) => ({ nome: s.nome, valor: -s.saldoCentavos }))
    .sort((a, b) => b.valor - a.valor);

  const acertos = [];
  let c = 0;
  let d = 0;
  while (c < credores.length && d < devedores.length) {
    const valorCentavos = Math.min(credores[c].valor, devedores[d].valor);
    if (valorCentavos > 0) {
      acertos.push({ de: devedores[d].nome, para: credores[c].nome, valorCentavos });
    }
    credores[c].valor -= valorCentavos;
    devedores[d].valor -= valorCentavos;
    if (credores[c].valor === 0) c += 1;
    if (devedores[d].valor === 0) d += 1;
  }

  return { totalCentavos, saldos, acertos };
}

/**
 * Compara embalagens pelo custo da unidade base.
 * @param {{nome: string, preçoCentavos: number, quantidade: number, fator: number}[]} opções fator converte a quantidade para a unidade base
 * @returns {{ordenadas: {nome: string, porBaseCentavos: number, economia: number}[], melhor: string}}
 */
export function preçoPorUnidade(opções) {
  if (!Array.isArray(opções) || opções.length < 2) throw new Error('Informe pelo menos duas opções.');
  const calculadas = opções.map((o) => {
    const base = o.quantidade * o.fator;
    if (!(base > 0)) throw new Error(`Quantidade inválida em ${o.nome}.`);
    return { nome: o.nome, porBaseCentavos: o.preçoCentavos / base };
  }).sort((a, b) => a.porBaseCentavos - b.porBaseCentavos);

  const melhorPreço = calculadas[0].porBaseCentavos;
  return {
    melhor: calculadas[0].nome,
    ordenadas: calculadas.map((c) => ({
      ...c,
      economia: melhorPreço === 0 ? 0 : ((c.porBaseCentavos - melhorPreço) / c.porBaseCentavos) * 100,
    })),
  };
}
