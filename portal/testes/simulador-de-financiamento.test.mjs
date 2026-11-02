/**
 * Simulador de financiamento (F203).
 *
 * Os números de referência foram conferidos à mão, fora do código:
 * - SAC, juros totais = taxa × financiado × (n + 1) ÷ 2. Para R$ 120.000,00 em 12 meses a 1%: 0,01 × 120000 × 13 ÷ 2 = R$ 7.800,00.
 * - Price: PMT = PV × i ÷ (1 − (1 + i)^−n) = 120000 × 0,0888488 = R$ 10.661,85 (fator de 12 meses a 1% = 0,08884879).
 * - 12,6825% a.a. efetiva = 1% a.m., porque 1,01^12 = 1,126825; 12% a.a. nominal = 1% a.m.
 * - CET de um pagamento só (n = 1): parcela = 10000 × 1,02 = 10200; com tarifa inicial de 100 se recebe 9900;
 *   r = 10200 ÷ 9900 − 1 = 3,0303% ao mês.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  simularFinanciamento, tabelaPrice, tabelaSac, calcularCet, taxaMensalEmFração, linhasDaTabela,
  ErroDeFinanciamento, PRAZO_MÁXIMO,
} from '../scripts/cálculos/simulador-de-financiamento.js';
import { simularNaTela, PREMISSAS } from '../scripts/ferramentas/simulador-de-financiamento.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

const base = { valorCentavos: 15_000_000, entradaCentavos: 3_000_000, prazo: 12, taxa: 1 };

function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  return assert.fail('era esperada uma recusa');
}

const soma = (lista, campo) => lista.reduce((t, p) => t + p[campo], 0);

/* --------------------------------------------------- conferido à mão */

test('Price: R$ 120.000,00 em 12 meses a 1% dá parcela de R$ 10.661,85', () => {
  const r = simularFinanciamento(base);
  assert.equal(r.financiadoCentavos, 12_000_000);
  assert.equal(r.price.primeiraCentavos, 1_066_185);
  assert.equal(r.price.jurosCentavos, 794_226);
  // Total das parcelas = financiado + juros.
  assert.equal(r.price.totalPagoCentavos, 12_000_000 + 794_226);
});

test('SAC: amortização de R$ 10.000,00, primeira parcela R$ 11.200,00, última R$ 10.100,00 e juros de R$ 7.800,00', () => {
  const r = simularFinanciamento(base);
  assert.equal(r.sac.primeiraCentavos, 1_120_000);
  assert.equal(r.sac.últimaCentavos, 1_010_000);
  assert.equal(r.sac.jurosCentavos, 780_000);
  assert.ok(r.sac.parcelas.every((p) => p.amortizaçãoCentavos === 1_000_000));
});

test('a SAC paga menos juros que a Price quando há juros e mais de uma parcela', () => {
  const r = simularFinanciamento(base);
  assert.ok(r.sac.jurosCentavos < r.price.jurosCentavos);
  assert.equal(r.price.jurosCentavos - r.sac.jurosCentavos, 14_226);
});

test('taxa ao ano: 12,6825% efetiva e 12% nominal valem 1% ao mês', () => {
  assert.ok(Math.abs(taxaMensalEmFração(12.682503013196689, 'ano-efetiva') - 0.01) < 1e-12);
  assert.equal(taxaMensalEmFração(12, 'ano-nominal'), 0.01);
  assert.equal(taxaMensalEmFração(1, 'mês'), 0.01);
  // 12% efetiva ao ano é cerca de 0,9489% ao mês, não 1%.
  assert.ok(Math.abs(taxaMensalEmFração(12, 'ano-efetiva') - 0.0094887929) < 1e-9);
});

test('CET sem seguro nem tarifa é a própria taxa de juros', () => {
  const r = simularFinanciamento(base);
  assert.ok(Math.abs(r.price.cet.mensal - 1) < 1e-4);
  assert.ok(Math.abs(r.sac.cet.mensal - 1) < 1e-6);
  assert.ok(Math.abs(r.sac.cet.anual - 12.6825) < 1e-3);
});

test('CET de um pagamento só com tarifa inicial: 3,0303% ao mês', () => {
  const r = simularFinanciamento({ valorCentavos: 1_000_000, prazo: 1, taxa: 2, tarifaInicialCentavos: 10_000 });
  assert.equal(r.price.primeiraCentavos, 1_020_000);
  assert.ok(Math.abs(r.price.cet.mensal - 3.030303) < 1e-4);
});

test('seguro e tarifa mensal entram na parcela e fazem o CET passar da taxa', () => {
  const r = simularFinanciamento({ ...base, seguroPercentual: 0.03, tarifaMensalCentavos: 2500 });
  // Seguro de 0,03% do saldo inicial de R$ 120.000,00 = R$ 36,00, mais R$ 25,00 de tarifa.
  assert.equal(r.price.parcelas[0].seguroETarifaCentavos, 3600 + 2500);
  assert.equal(r.price.primeiraCentavos, 1_066_185 + 3600 + 2500);
  assert.ok(r.price.cet.mensal > 1);
  assert.ok(r.price.custoDoCréditoCentavos > r.price.jurosCentavos);
});

test('taxa zero: sem juros, a soma das parcelas é o valor financiado', () => {
  const r = simularFinanciamento({ ...base, taxa: 0, valorCentavos: 70_000, entradaCentavos: 0, prazo: 3 });
  assert.equal(r.price.jurosCentavos, 0);
  assert.equal(r.price.totalPagoCentavos, 70_000);
  assert.equal(r.sac.totalPagoCentavos, 70_000);
  // R$ 700,00 em três vezes: 233,33 + 233,33 + 233,34.
  assert.deepEqual(r.price.parcelas.map((p) => p.parcelaCentavos), [23_333, 23_333, 23_334]);
});

/* --------------------------------------------------- propriedades que sempre valem */

for (const [rótulo, entrada] of [
  ['1 mês', { ...base, prazo: 1 }],
  ['prazo máximo com taxa baixa', { ...base, prazo: PRAZO_MÁXIMO, taxa: 0.5 }],
  ['taxa alta', { ...base, taxa: 25, prazo: 60 }],
  ['valor com centavos quebrados', { ...base, valorCentavos: 99_999_97, entradaCentavos: 1_234_56, prazo: 37, taxa: 0.87 }],
  ['taxa nominal ao ano', { ...base, taxa: 10.5, baseDaTaxa: 'ano-nominal', prazo: 360 }],
  ['valor mínimo', { valorCentavos: 100, prazo: 7, taxa: 3 }],
]) {
  test(`propriedades: ${rótulo}`, () => {
    const r = simularFinanciamento(entrada);
    for (const resumo of [r.price, r.sac]) {
      const { parcelas } = resumo;
      assert.equal(parcelas.length, entrada.prazo);
      // O saldo fecha em zero e as amortizações somam exatamente o valor financiado.
      assert.equal(parcelas[parcelas.length - 1].saldoCentavos, 0);
      assert.equal(soma(parcelas, 'amortizaçãoCentavos'), r.financiadoCentavos);
      // Cada parcela é juros + amortização + seguro e tarifa, e nada vira negativo.
      for (const p of parcelas) {
        assert.equal(p.parcelaCentavos, p.jurosCentavos + p.amortizaçãoCentavos + p.seguroETarifaCentavos);
        assert.ok(p.jurosCentavos >= 0 && p.amortizaçãoCentavos >= 0 && p.saldoCentavos >= 0);
      }
      assert.equal(resumo.totalPagoCentavos, resumo.jurosCentavos + r.financiadoCentavos + resumo.segurosETarifasCentavos);
      assert.ok(Number.isSafeInteger(resumo.totalPagoCentavos));
    }
    // O saldo devedor nunca sobe de um mês para o seguinte.
    for (const tabela of [r.price.parcelas, r.sac.parcelas]) {
      for (let i = 1; i < tabela.length; i += 1) assert.ok(tabela[i].saldoCentavos <= tabela[i - 1].saldoCentavos);
    }
    if (entrada.prazo > 1 && (entrada.taxa ?? 0) > 0 && r.financiadoCentavos > 10_000) {
      assert.ok(r.sac.jurosCentavos <= r.price.jurosCentavos);
    }
  });
}

test('na Price as parcelas só diferem na última, por arredondamento de poucos centavos', () => {
  const tabela = tabelaPrice({ financiadoCentavos: 12_345_678, prazo: 37, taxaMensal: 0.0087 });
  const [primeira] = tabela;
  for (const p of tabela.slice(0, -1)) assert.equal(p.parcelaCentavos, primeira.parcelaCentavos);
  assert.ok(Math.abs(tabela[36].parcelaCentavos - primeira.parcelaCentavos) < 40);
});

test('na SAC a parcela nunca cresce de um mês para o outro (sem seguro)', () => {
  const tabela = tabelaSac({ financiadoCentavos: 12_345_678, prazo: 40, taxaMensal: 0.01 });
  for (let i = 1; i < tabela.length - 1; i += 1) assert.ok(tabela[i].parcelaCentavos <= tabela[i - 1].parcelaCentavos);
});

test('o CET é monotônico: mais tarifa inicial, CET maior', () => {
  const a = simularFinanciamento({ ...base, tarifaInicialCentavos: 0 }).price.cet.anual;
  const b = simularFinanciamento({ ...base, tarifaInicialCentavos: 50_000 }).price.cet.anual;
  const c = simularFinanciamento({ ...base, tarifaInicialCentavos: 200_000 }).price.cet.anual;
  assert.ok(a < b && b < c);
});

test('calcularCet devolve null quando não há taxa possível', () => {
  assert.equal(calcularCet(100_000, [40_000, 40_000]), null);
  assert.equal(calcularCet(0, [100]), null);
  assert.equal(calcularCet(100, []), null);
});

/* --------------------------------------------------- entradas hostis */

test('recusa entrada igual ou maior que o valor, com o campo certo', () => {
  for (const entradaCentavos of [15_000_000, 16_000_000]) {
    const erro = recusaDe(() => simularFinanciamento({ ...base, entradaCentavos }));
    assert.ok(erro instanceof ErroDeFinanciamento);
    assert.equal(erro.campo, 'entrada');
    assert.match(erro.message, /entrada/i);
  }
});

test('recusa prazo zero, negativo, fracionado e acima do máximo', () => {
  for (const prazo of [0, -12, 1.5, PRAZO_MÁXIMO + 1, Number.NaN]) {
    assert.equal(recusaDe(() => simularFinanciamento({ ...base, prazo })).campo, 'prazo', `prazo ${prazo}`);
  }
  assert.doesNotThrow(() => simularFinanciamento({ ...base, prazo: PRAZO_MÁXIMO }));
});

test('recusa taxa negativa, acima do limite e não finita', () => {
  for (const taxa of [-1, 31, Number.NaN, Infinity]) {
    assert.equal(recusaDe(() => simularFinanciamento({ ...base, taxa })).campo, 'taxa', `taxa ${taxa}`);
  }
  assert.doesNotThrow(() => simularFinanciamento({ ...base, taxa: 30 }));
  // Ao ano o limite é maior.
  assert.doesNotThrow(() => simularFinanciamento({ ...base, taxa: 400, baseDaTaxa: 'ano-efetiva' }));
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, taxa: 1001, baseDaTaxa: 'ano-efetiva' })).campo, 'taxa');
});

test('recusa valor pequeno demais, enorme demais e financiado abaixo de R$ 1,00', () => {
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, valorCentavos: 0, entradaCentavos: 0 })).campo, 'valor');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, valorCentavos: -5, entradaCentavos: 0 })).campo, 'valor');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, valorCentavos: 200_000_000_000, entradaCentavos: 0 })).campo, 'valor');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, valorCentavos: 1000, entradaCentavos: 950 })).campo, 'entrada');
});

test('recusa entrada, seguro e tarifas absurdos', () => {
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, entradaCentavos: -1 })).campo, 'entrada');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, seguroPercentual: -0.1 })).campo, 'seguro');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, seguroPercentual: 6 })).campo, 'seguro');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, tarifaMensalCentavos: -1 })).campo, 'tarifaMensal');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, tarifaInicialCentavos: 12_000_000 })).campo, 'tarifaInicial');
  assert.equal(recusaDe(() => simularFinanciamento({ ...base, baseDaTaxa: 'quinzena' })).campo, 'baseDaTaxa');
});

test('valor de R$ 1 bilhão com 480 meses a 30% ao mês não estoura nem devolve NaN', () => {
  const r = simularFinanciamento({ valorCentavos: 100_000_000_000, prazo: 480, taxa: 30 });
  for (const resumo of [r.price, r.sac]) {
    assert.ok(Number.isSafeInteger(resumo.totalPagoCentavos) && resumo.totalPagoCentavos > 0);
    assert.equal(resumo.parcelas.at(-1).saldoCentavos, 0);
  }
});

/* --------------------------------------------------- a tela */

const dadosBons = { valor: '150.000,00', entrada: '30000', prazo: '12', taxa: '1', baseDaTaxa: 'mês', seguro: '', tarifaMensal: '', tarifaInicial: '', tabela: 'price' };

test('a tela mostra parcela, juros, CET, a tabela inteira e as premissas', () => {
  const saída = simularNaTela(dadosBons);
  assert.match(saída.valor, /SAC custa R\$\s?142,26 a menos/);
  assert.equal(saída.tabela.linhas.length, 12);
  assert.equal(saída.tabela.semExportação, true);
  assert.ok(saída.linhas.some(([r, v]) => r === 'Price: primeira parcela' && /10\.661,85/.test(v)));
  assert.ok(saída.linhas.some(([r, v]) => r === 'SAC: juros totais' && /7\.800,00/.test(v)));
  assert.ok(saída.linhas.some(([r]) => r === 'Price: CET'));
  assert.ok(saída.observações.includes(PREMISSAS));
  assert.match(saída.texto, /Premissas/);
  assert.equal(saída.arquivos.length, 3);
});

test('a tela mostra a SAC quando escolhida', () => {
  const saída = simularNaTela({ ...dadosBons, tabela: 'sac' });
  assert.match(saída.tabela.linhas[0][1], /11\.200,00/);
});

test('a tela vazia pede o campo certo, e texto onde se espera número é recusado', () => {
  let erro = recusaDe(() => simularNaTela({ ...dadosBons, valor: '' }));
  assert.ok(erro instanceof ErroDeEntrada);
  assert.equal(erro.campo, 'valor');
  erro = recusaDe(() => simularNaTela({ ...dadosBons, prazo: 'doze' }));
  assert.equal(erro.campo, 'prazo');
  assert.match(erro.message, /número/);
  erro = recusaDe(() => simularNaTela({ ...dadosBons, taxa: '1e3' }));
  assert.equal(erro.campo, 'taxa');
  erro = recusaDe(() => simularNaTela({ ...dadosBons, entrada: '200000' }));
  assert.equal(erro.campo, 'entrada');
  erro = recusaDe(() => simularNaTela({ ...dadosBons, prazo: '12,5' }));
  assert.equal(erro.campo, 'prazo');
  erro = recusaDe(() => simularNaTela({ ...dadosBons, valor: '-100' }));
  assert.equal(erro.campo, 'valor');
});

test('as linhas do CSV usam vírgula decimal e têm cabeçalho', () => {
  const r = simularFinanciamento(base);
  const linhas = linhasDaTabela(r.price.parcelas);
  assert.equal(linhas.length, 13);
  assert.equal(linhas[1][1], '10661,85');
  assert.equal(linhas[12][5], '0,00');
});
