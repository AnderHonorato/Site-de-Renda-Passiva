/**
 * Calculadora de comissão.
 *
 * Os três casos de cálculo vêm da especificação (ander-flow/docs/catalogo/catalogo-vendas.md,
 * seção "comissao"), convertidos para centavos inteiros. Os números foram refeitos à mão:
 *   caso 1: 50.000,00 × 5% = 2.500,00
 *   caso 2: 10.000 × 3% + 10.000 × 5% + 5.000 × 8% = 300 + 500 + 400 = 1.200,00
 * Os demais valores de arredondamento e desconto estão calculados no próprio teste.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularComissão, emPontosBase, paraCentavos, MÁXIMO_DE_FAIXAS, LIMITE_DE_VENDAS_CENTAVOS, UNIDADES_POR_CENTAVO,
} from '../scripts/cálculos/comissao.js';
import comissão, { calcularComissãoNaTela, reaisExatos } from '../scripts/ferramentas/comissao.js';
import { arquivoBaixado, textosDoPdf, espaçosComuns } from './auxiliares/pdf-baixado.mjs';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { formatarMoeda } from '../scripts/comum/formatação/formatar-moeda.js';

/** Executa e devolve a recusa, falhando se não houver. */
function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperada uma recusa');
}

const FAIXAS_DA_ESPECIFICAÇÃO = [
  { ateCentavos: 1_000_000, percentual: 3 },
  { ateCentavos: 2_000_000, percentual: 5 },
  { ateCentavos: null, percentual: 8 },
];

/* ------------------------------------------------------------- cálculo */

test('caso 1 da especificação: R$ 50.000,00 a 5% rendem R$ 2.500,00', () => {
  const r = calcularComissão({ vendasCentavos: 5_000_000, modo: 'simples', percentual: 5 });
  assert.equal(r.brutaCentavos, 250_000);
  assert.equal(r.líquidaCentavos, 250_000);
  assert.equal(r.descontoCentavos, 0);
  assert.equal(r.partes.length, 1);
  assert.equal(r.partes[0].baseCentavos, 5_000_000);
});

test('caso 2 da especificação: faixas 3%, 5% e 8% sobre R$ 25.000,00 rendem R$ 1.200,00', () => {
  const r = calcularComissão({ vendasCentavos: 2_500_000, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO });
  assert.deepEqual(r.partes.map((p) => p.baseCentavos), [1_000_000, 1_000_000, 500_000]);
  // Em centavos: 30.000 + 50.000 + 40.000.
  assert.deepEqual(r.partes.map((p) => p.exatoEmUnidades / UNIDADES_POR_CENTAVO), [30_000, 50_000, 40_000]);
  assert.equal(r.brutaCentavos, 120_000);
  assert.equal(r.foraDeFaixaCentavos, 0);
});

test('caso 3 da especificação: faixas fora de ordem são recusadas como faixas_invalidas', () => {
  const erro = recusaDe(() => calcularComissão({
    vendasCentavos: 2_500_000,
    modo: 'escalonada',
    faixas: [{ ateCentavos: 2_000_000, percentual: 5 }, { ateCentavos: 1_000_000, percentual: 8 }],
  }));
  assert.equal(erro.código, 'faixas_invalidas');
  // A especificação aponta o campo "faixas"; aqui a recusa vai direto à faixa culpada, que é mais útil na tela.
  assert.equal(erro.campo, 'faixa2.ateCentavos');
  assert.match(erro.message, /faixa 2 precisa terminar acima de R\$\s20\.000,00, onde termina a faixa 1/);
});

test('o limite da faixa é fechado: vendas exatamente no limite ficam todas na faixa de baixo', () => {
  const r = calcularComissão({ vendasCentavos: 1_000_000, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO });
  assert.deepEqual(r.partes.map((p) => p.baseCentavos), [1_000_000, 0, 0]);
  assert.equal(r.brutaCentavos, 30_000);
});

test('um centavo acima do limite só esse centavo paga o percentual da faixa seguinte', () => {
  const r = calcularComissão({ vendasCentavos: 1_000_001, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO });
  assert.deepEqual(r.partes.map((p) => p.baseCentavos), [1_000_000, 1, 0]);
  // 30.000 centavos + 1 centavo × 5% = 30.000,05 centavos → 30.000.
  assert.equal(r.somaExataEmUnidades, 30_000 * UNIDADES_POR_CENTAVO + 500);
  assert.equal(r.brutaCentavos, 30_000);
});

test('sem vendas a comissão é zero, sem erro', () => {
  assert.equal(calcularComissão({ vendasCentavos: 0, percentual: 5 }).brutaCentavos, 0);
  const r = calcularComissão({ vendasCentavos: 0, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO });
  assert.equal(r.brutaCentavos, 0);
  assert.equal(r.líquidaCentavos, 0);
});

test('percentual zero é válido (faixa que não paga comissão)', () => {
  const r = calcularComissão({
    vendasCentavos: 300_000,
    modo: 'escalonada',
    faixas: [{ ateCentavos: 100_000, percentual: 0 }, { ateCentavos: null, percentual: 10 }],
  });
  // Só os R$ 2.000,00 acima da primeira faixa pagam 10%: R$ 200,00.
  assert.equal(r.brutaCentavos, 20_000);
});

test('uma faixa só e sem limite equivale ao percentual único', () => {
  const simples = calcularComissão({ vendasCentavos: 1_234_567, percentual: 4.5 });
  const faixa = calcularComissão({ vendasCentavos: 1_234_567, modo: 'escalonada', faixas: [{ ateCentavos: null, percentual: 4.5 }] });
  assert.equal(faixa.brutaCentavos, simples.brutaCentavos);
  assert.equal(faixa.somaExataEmUnidades, simples.somaExataEmUnidades);
});

test('se a última faixa tem limite, o que passa dele não rende comissão e é informado', () => {
  const r = calcularComissão({
    vendasCentavos: 1_500_000, modo: 'escalonada', faixas: [{ ateCentavos: 1_000_000, percentual: 3 }],
  });
  assert.equal(r.foraDeFaixaCentavos, 500_000);
  assert.equal(r.brutaCentavos, 30_000);
});

/* ------------------------------------------------------- arredondamento */

test('o arredondamento é ao centavo e a metade sobe', () => {
  // R$ 0,10 × 5% = 0,5 centavo → 1 centavo; R$ 0,09 × 5% = 0,45 centavo → 0.
  assert.equal(calcularComissão({ vendasCentavos: 10, percentual: 5 }).brutaCentavos, 1);
  assert.equal(calcularComissão({ vendasCentavos: 9, percentual: 5 }).brutaCentavos, 0);
  // 3 × 50% = 1,5 → 2 e 5 × 50% = 2,5 → 3 (a metade sempre sobe, não vai para o par).
  assert.equal(calcularComissão({ vendasCentavos: 3, percentual: 50 }).brutaCentavos, 2);
  assert.equal(calcularComissão({ vendasCentavos: 5, percentual: 50 }).brutaCentavos, 3);
});

test('paraCentavos sobe a metade e desce o que passa pouco abaixo dela', () => {
  assert.equal(paraCentavos(0), 0);
  assert.equal(paraCentavos(4_999), 0);
  assert.equal(paraCentavos(5_000), 1);
  assert.equal(paraCentavos(14_999), 1);
  assert.equal(paraCentavos(15_000), 2);
  assert.equal(paraCentavos(25_000), 3);
  assert.equal(paraCentavos(10_000 * 99_999_999_999 + 5_000), 99_999_999_999 + 1);
});

test('só a soma das faixas é arredondada, não cada faixa', () => {
  // Faixa 1: 3 centavos a 50% = 1,5; faixa 2: mais 3 centavos a 50% = 1,5. Soma exata 3,0.
  // Arredondar cada uma daria 2 + 2 = 4, um centavo a mais do que o valor devido.
  const r = calcularComissão({
    vendasCentavos: 6, modo: 'escalonada', faixas: [{ ateCentavos: 3, percentual: 50 }, { ateCentavos: null, percentual: 50 }],
  });
  assert.equal(r.brutaCentavos, 3);
});

test('exemplo com fração de centavo: R$ 10.001,01 a 3,5% dão R$ 350,03535 exatos e R$ 350,04 arredondados', () => {
  // 1.000.101 centavos × 350 pontos-base = 350.035.350 unidades = 35.003,535 centavos.
  const r = calcularComissão({ vendasCentavos: 1_000_101, percentual: 3.5 });
  assert.equal(r.somaExataEmUnidades, 350_035_350);
  assert.equal(r.brutaCentavos, 35_004);
});

/* --------------------------------------------------------------- desconto */

test('desconto de 10% sobre R$ 1.200,00: desconto R$ 120,00 e líquida R$ 1.080,00', () => {
  const r = calcularComissão({
    vendasCentavos: 2_500_000, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO, descontoPercentual: 10,
  });
  assert.equal(r.brutaCentavos, 120_000);
  assert.equal(r.descontoCentavos, 12_000);
  assert.equal(r.líquidaCentavos, 108_000);
});

test('o desconto incide sobre a bruta já arredondada e a metade também sobe', () => {
  // Bruta 35.004 centavos × 12,5% = 4.375,5 centavos → 4.376; líquida 35.004 − 4.376 = 30.628.
  const r = calcularComissão({ vendasCentavos: 1_000_101, percentual: 3.5, descontoPercentual: 12.5 });
  assert.equal(r.descontoCentavos, 4_376);
  assert.equal(r.líquidaCentavos, 30_628);
});

test('desconto de 100% zera a líquida e desconto zero não mexe na bruta', () => {
  assert.equal(calcularComissão({ vendasCentavos: 100_000, percentual: 5, descontoPercentual: 100 }).líquidaCentavos, 0);
  assert.equal(calcularComissão({ vendasCentavos: 100_000, percentual: 5, descontoPercentual: 0 }).líquidaCentavos, 5_000);
});

/* ---------------------------------------------------------------- recusas */

test('percentual: número, faixa de 0 a 100 e no máximo duas casas decimais', () => {
  const base = { vendasCentavos: 100_000 };
  for (const percentual of [-1, -0.01, 100.01, 101, NaN, Infinity, '5', null, undefined]) {
    const erro = recusaDe(() => calcularComissão({ ...base, percentual }));
    assert.equal(erro.campo, 'percentual', `percentual ${String(percentual)}`);
  }
  const casas = recusaDe(() => calcularComissão({ ...base, percentual: 3.255 }));
  assert.equal(casas.código, 'percentual_com_muitas_casas');
  assert.match(casas.message, /no máximo duas casas decimais/);
  // Valores com cara de erro de ponto flutuante continuam válidos.
  assert.equal(emPontosBase(0.07, 'percentual', 'x'), 7);
  assert.equal(emPontosBase(0.29, 'percentual', 'x'), 29);
  assert.equal(emPontosBase(3.25, 'percentual', 'x'), 325);
  assert.equal(emPontosBase(100, 'percentual', 'x'), 10_000);
});

test('desconto fora de 0 a 100 ou com muitas casas aponta o campo do desconto', () => {
  for (const descontoPercentual of [-5, 101, NaN, 2.555]) {
    const erro = recusaDe(() => calcularComissão({ vendasCentavos: 100_000, percentual: 5, descontoPercentual }));
    assert.equal(erro.campo, 'descontoPercentual', String(descontoPercentual));
  }
});

test('vendas: inteiras em centavos, sem negativo e até o limite', () => {
  for (const vendasCentavos of [-1, 0.5, NaN, Infinity, '100', null, undefined, 2 ** 60]) {
    const erro = recusaDe(() => calcularComissão({ vendasCentavos, percentual: 5 }));
    assert.equal(erro.campo, 'vendasCentavos', String(vendasCentavos));
  }
  const acima = recusaDe(() => calcularComissão({ vendasCentavos: LIMITE_DE_VENDAS_CENTAVOS + 1, percentual: 5 }));
  assert.equal(acima.campo, 'vendasCentavos');
  assert.match(acima.message, /limite é R\$\s1\.000\.000\.000,00/);
});

test('no limite de vendas, a 100%, a conta continua exata', () => {
  const r = calcularComissão({ vendasCentavos: LIMITE_DE_VENDAS_CENTAVOS, percentual: 100, descontoPercentual: 100 });
  assert.equal(r.brutaCentavos, LIMITE_DE_VENDAS_CENTAVOS);
  assert.equal(r.líquidaCentavos, 0);
  assert.ok(Number.isSafeInteger(r.somaExataEmUnidades));
  const faixas = calcularComissão({
    vendasCentavos: LIMITE_DE_VENDAS_CENTAVOS,
    modo: 'escalonada',
    faixas: [{ ateCentavos: LIMITE_DE_VENDAS_CENTAVOS - 1, percentual: 100 }, { ateCentavos: null, percentual: 99.99 }],
  });
  // O último centavo paga 99,99%: a soma exata é 99.999.999.999 × 10.000 + 9.999 unidades.
  assert.equal(faixas.somaExataEmUnidades, (LIMITE_DE_VENDAS_CENTAVOS - 1) * 10_000 + 9_999);
  assert.equal(faixas.brutaCentavos, LIMITE_DE_VENDAS_CENTAVOS);
});

test('tipo desconhecido é recusado', () => {
  assert.equal(recusaDe(() => calcularComissão({ vendasCentavos: 100, modo: 'progressiva', percentual: 5 })).campo, 'modo');
});

test('faixas: quantidade, limite sem fim só na última e ordem estritamente crescente', () => {
  const vendasCentavos = 100_000;
  const faixa = (ateCentavos, percentual = 5) => ({ ateCentavos, percentual });
  const recusa = (faixas) => recusaDe(() => calcularComissão({ vendasCentavos, modo: 'escalonada', faixas }));

  assert.equal(recusa([]).campo, 'faixas');
  assert.equal(recusa(undefined).campo, 'faixas');
  assert.equal(recusa(Array.from({ length: MÁXIMO_DE_FAIXAS + 1 }, (_, i) => faixa((i + 1) * 100))).campo, 'faixas');

  assert.equal(recusa([faixa(null), faixa(null)]).campo, 'faixa1.ateCentavos');
  assert.equal(recusa([faixa(0), faixa(null)]).campo, 'faixa1.ateCentavos');
  assert.equal(recusa([faixa(-100), faixa(null)]).campo, 'faixa1.ateCentavos');
  assert.equal(recusa([faixa(100), faixa(100)]).campo, 'faixa2.ateCentavos');
  assert.equal(recusa([faixa(100), faixa(200), faixa(150)]).campo, 'faixa3.ateCentavos');
  assert.equal(recusa([faixa(100.5), faixa(null)]).campo, 'faixa1.ateCentavos');
  assert.equal(recusa([faixa(LIMITE_DE_VENDAS_CENTAVOS + 1)]).campo, 'faixa1.ateCentavos');
  assert.equal(recusa([faixa(100, 101)]).campo, 'faixa1.percentual');
  assert.equal(recusa([faixa(100), faixa(null, -1)]).campo, 'faixa2.percentual');
  assert.equal(recusa([faixa(100), faixa(null, 3.333)]).campo, 'faixa2.percentual');
  assert.equal(recusa([null]).campo, 'faixa1.percentual');
  // No limite do permitido: cinco faixas crescentes são aceitas.
  const cinco = Array.from({ length: MÁXIMO_DE_FAIXAS }, (_, i) => faixa(i < MÁXIMO_DE_FAIXAS - 1 ? (i + 1) * 100 : null, i + 1));
  assert.equal(calcularComissão({ vendasCentavos, modo: 'escalonada', faixas: cinco }).partes.length, MÁXIMO_DE_FAIXAS);
});

test('as recusas nunca vazam como TypeError com entrada estranha', () => {
  for (const entrada of [{}, { vendasCentavos: 100, modo: 'escalonada', faixas: 'texto' }, { vendasCentavos: 100, modo: 'escalonada', faixas: [undefined] }]) {
    const erro = recusaDe(() => calcularComissão(entrada));
    assert.equal(erro.constructor, Error, JSON.stringify(entrada));
    assert.ok(erro.campo, JSON.stringify(entrada));
  }
});

/* ----------------------------------------------------------- propriedades */

/** Gerador pseudoaleatório fixo (LCG): os testes repetem sempre os mesmos casos. */
function sorteador(semente) {
  let estado = semente >>> 0;
  return (máximo) => {
    estado = (Math.imul(estado, 1664525) + 1013904223) >>> 0;
    return estado % (máximo + 1);
  };
}

/**
 * Conta de outro jeito, centavo a centavo: o k-ésimo centavo das vendas paga o
 * percentual da faixa em que ele cai. Não usa `min` nem "restante", então
 * discorda do cálculo principal se a lógica de faixas estiver errada.
 */
function contaCentavoACentavo(vendasCentavos, faixas) {
  let unidades = 0;
  for (let k = 1; k <= vendasCentavos; k += 1) {
    for (const { ateCentavos, percentual } of faixas) {
      if (ateCentavos === null || k <= ateCentavos) {
        unidades += Math.round(percentual * 100);
        break;
      }
    }
  }
  return unidades;
}

test('propriedade: o cálculo por faixa coincide com a conta feita centavo a centavo', () => {
  const sortear = sorteador(20260610);
  for (let rodada = 0; rodada < 300; rodada += 1) {
    const quantidade = 1 + sortear(MÁXIMO_DE_FAIXAS - 1);
    const faixas = [];
    let limite = 0;
    for (let i = 0; i < quantidade; i += 1) {
      limite += 1 + sortear(400);
      const éÚltima = i === quantidade - 1;
      faixas.push({ ateCentavos: éÚltima && sortear(1) === 0 ? null : limite, percentual: sortear(10_000) / 100 });
    }
    const vendasCentavos = sortear(2_500);
    const r = calcularComissão({ vendasCentavos, modo: 'escalonada', faixas });
    assert.equal(r.somaExataEmUnidades, contaCentavoACentavo(vendasCentavos, faixas), JSON.stringify({ vendasCentavos, faixas }));
  }
});

test('propriedade: as partes mais o que passou da última faixa somam as vendas', () => {
  const sortear = sorteador(7);
  for (let rodada = 0; rodada < 300; rodada += 1) {
    const faixas = [
      { ateCentavos: 1 + sortear(1_000_000), percentual: sortear(10_000) / 100 },
      { ateCentavos: null, percentual: sortear(10_000) / 100 },
    ];
    faixas[1].ateCentavos = sortear(1) === 0 ? null : faixas[0].ateCentavos + 1 + sortear(1_000_000);
    const vendasCentavos = sortear(5_000_000);
    const r = calcularComissão({ vendasCentavos, modo: 'escalonada', faixas });
    const somaDasPartes = r.partes.reduce((soma, p) => soma + p.baseCentavos, 0);
    assert.equal(somaDasPartes + r.foraDeFaixaCentavos, vendasCentavos);
  }
});

test('propriedade: líquida mais desconto é sempre a bruta, e a bruta nunca passa das vendas', () => {
  const sortear = sorteador(99);
  for (let rodada = 0; rodada < 500; rodada += 1) {
    const vendasCentavos = sortear(LIMITE_DE_VENDAS_CENTAVOS);
    const r = calcularComissão({
      vendasCentavos, percentual: sortear(10_000) / 100, descontoPercentual: sortear(10_000) / 100,
    });
    assert.equal(r.líquidaCentavos + r.descontoCentavos, r.brutaCentavos);
    assert.ok(r.brutaCentavos <= vendasCentavos);
    assert.ok(r.descontoCentavos <= r.brutaCentavos);
    assert.ok(r.líquidaCentavos >= 0);
  }
});

test('propriedade: vender mais nunca rende menos comissão e a curva não tem salto na fronteira', () => {
  const faixas = FAIXAS_DA_ESPECIFICAÇÃO;
  let anterior = -1;
  for (let vendasCentavos = 990_000; vendasCentavos <= 1_010_000; vendasCentavos += 1_000) {
    const { brutaCentavos } = calcularComissão({ vendasCentavos, modo: 'escalonada', faixas });
    assert.ok(brutaCentavos >= anterior);
    anterior = brutaCentavos;
  }
  // Na fronteira dos R$ 10.000,00, passar um real não faz a comissão saltar: sobe 5% de R$ 1,00 = R$ 0,05.
  const antes = calcularComissão({ vendasCentavos: 1_000_000, modo: 'escalonada', faixas }).brutaCentavos;
  const depois = calcularComissão({ vendasCentavos: 1_000_100, modo: 'escalonada', faixas }).brutaCentavos;
  assert.equal(depois - antes, 5);
});

test('propriedade: calcular duas vezes dá o mesmo resultado (sem estado escondido)', () => {
  const entrada = { vendasCentavos: 1_234_567, modo: 'escalonada', faixas: FAIXAS_DA_ESPECIFICAÇÃO, descontoPercentual: 7.5 };
  assert.deepEqual(calcularComissão(entrada), calcularComissão(entrada));
});

/* ---------------------------------------------------------- reaisExatos */

test('reaisExatos mostra só as casas que a conta usou, com no mínimo duas', () => {
  assert.equal(reaisExatos(0), `R$ 0,00`);
  assert.equal(reaisExatos(300 * 100 * 10_000), `R$ 300,00`);
  assert.equal(reaisExatos(350_035_350), `R$ 350,03535`);
  assert.equal(reaisExatos(12_345_678), `R$ 12,345678`);
  assert.equal(reaisExatos(1), `R$ 0,000001`);
  assert.equal(reaisExatos(1_000_000_000 * 100 * 10_000), `R$ 1.000.000.000,00`);
  assert.equal(reaisExatos(5_000), `R$ 0,005`);
});

/* ------------------------------------------------------------------- tela */

const TELA_ESCALONADA = {
  modo: 'escalonada', vendas: '25.000,00', percentual: '',
  faixa1Ate: '10.000,00', faixa1Percentual: '3',
  faixa2Ate: '20.000,00', faixa2Percentual: '5',
  faixa3Ate: '', faixa3Percentual: '8',
  faixa4Ate: '', faixa4Percentual: '', faixa5Ate: '', faixa5Percentual: '',
  descontoPercentual: '0',
};

/** Recusa da tela: devolve campo e mensagem. */
function recusaDaTela(dados) {
  const erro = recusaDe(() => calcularComissãoNaTela(dados));
  assert.ok(erro instanceof ErroDeEntrada, `esperava ErroDeEntrada, veio ${erro.constructor.name}: ${erro.message}`);
  return erro;
}

test('a tela mostra o caso 1 da especificação', () => {
  const saída = calcularComissãoNaTela({ modo: 'simples', vendas: '50000,00', percentual: '5' });
  assert.equal(saída.valor, `${formatarMoeda(2500)} de comissão`);
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Comissão bruta'], formatarMoeda(2500));
  assert.equal(linhas['Comissão líquida'], formatarMoeda(2500));
  assert.equal(linhas['Vendas do período'], formatarMoeda(50000));
  assert.ok(!Object.keys(linhas).some((k) => k.startsWith('Desconto')));
  assert.ok(saída.observações[0].includes(`${formatarMoeda(50000)} × 5% = ${formatarMoeda(2500)}.`));
  assert.ok(saída.observações.some((o) => o.includes('nada foi arredondado')));
  // Uma só linha: a tabela não repete o total.
  assert.equal(saída.tabela.linhas.length, 1);
  assert.deepEqual(saída.tabela.linhas[0], ['Todas as vendas', formatarMoeda(50000), '5%', formatarMoeda(2500)]);
});

test('a tela mostra o caso 2 da especificação faixa a faixa e o total', () => {
  const saída = calcularComissãoNaTela(TELA_ESCALONADA);
  assert.equal(saída.valor, `${formatarMoeda(1200)} de comissão`);
  assert.deepEqual(saída.tabela.cabeçalho, ['Faixa', 'Vendas na faixa', 'Percentual', 'Comissão']);
  assert.deepEqual(saída.tabela.linhas, [
    [`Faixa 1 (até ${formatarMoeda(10000)})`, formatarMoeda(10000), '3%', formatarMoeda(300)],
    [`Faixa 2 (de ${formatarMoeda(10000)} a ${formatarMoeda(20000)})`, formatarMoeda(10000), '5%', formatarMoeda(500)],
    [`Faixa 3 (acima de ${formatarMoeda(20000)})`, formatarMoeda(5000), '8%', formatarMoeda(400)],
    ['Soma das faixas', formatarMoeda(25000), '', formatarMoeda(1200)],
  ]);
  const conta = saída.observações;
  assert.ok(conta.some((o) => o.includes(`${formatarMoeda(10000)} × 3% = ${formatarMoeda(300)}`)));
  assert.ok(conta.some((o) => o.includes(`${formatarMoeda(5000)} × 8% = ${formatarMoeda(400)}`)));
  assert.ok(conta.some((o) => o.includes(`Soma das faixas: ${formatarMoeda(300)} + ${formatarMoeda(500)} + ${formatarMoeda(400)} = ${formatarMoeda(1200)}.`)));
  assert.ok(conta.some((o) => o.includes('Na média, a comissão bruta equivale a 4,80% das vendas.')));
  assert.match(saída.resumo, /Sobre R\$\s25\.000,00 em vendas, a comissão bruta é R\$\s1\.200,00\./);
});

test('a tela explica desconto e arredondamento com a conta refeita à mão', () => {
  const saída = calcularComissãoNaTela({
    modo: 'simples', vendas: '10.001,01', percentual: '3,5', descontoPercentual: '12,5',
  });
  assert.equal(saída.valor, `${formatarMoeda(306.28)} de comissão líquida`);
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Comissão bruta'], formatarMoeda(350.04));
  assert.equal(linhas['Desconto (12,5%)'], formatarMoeda(43.76));
  assert.equal(linhas['Comissão líquida'], formatarMoeda(306.28));
  const conta = saída.observações.join('\n');
  assert.ok(conta.includes(`= R$ 350,03535.`));
  assert.ok(conta.includes(`a soma exata é R$ 350,03535 e foi arredondada ao centavo (a metade sobe): ${formatarMoeda(350.04)}.`));
  assert.ok(conta.includes(`Desconto: 12,5% de ${formatarMoeda(350.04)} = R$ 43,755, arredondado ao centavo (a metade sobe): ${formatarMoeda(43.76)}.`));
  assert.ok(conta.includes(`Comissão líquida = ${formatarMoeda(350.04)} − ${formatarMoeda(43.76)} = ${formatarMoeda(306.28)}.`));
  // Na tela, bruta − desconto = líquida sempre fecha.
  assert.equal(35004 - 4376, 30628);
});

test('a tela avisa quando as vendas passam do fim da última faixa', () => {
  const saída = calcularComissãoNaTela({
    ...TELA_ESCALONADA, vendas: '15.000,00', faixa2Ate: '', faixa2Percentual: '', faixa3Percentual: '',
    faixa1Ate: '10.000,00', faixa1Percentual: '3',
  });
  assert.equal(Object.fromEntries(saída.linhas)['Comissão bruta'], formatarMoeda(300));
  assert.ok(saída.observações.some((o) => o.startsWith(`Atenção: ${formatarMoeda(5000)} das vendas passam do fim da última faixa (${formatarMoeda(10000)})`)));
  assert.ok(saída.tabela.linhas.some(([nome, , percentual]) => nome.startsWith('Acima da última faixa') && percentual === '0%'));
});

test('vendas que não chegam à segunda faixa deixam as outras em zero, explicadas', () => {
  const saída = calcularComissãoNaTela({ ...TELA_ESCALONADA, vendas: '8.000,00' });
  assert.equal(Object.fromEntries(saída.linhas)['Comissão bruta'], formatarMoeda(240));
  assert.ok(saída.observações.some((o) => o.endsWith('as vendas não chegaram a esta faixa.')));
});

test('sem vendas a frase não inventa comissão', () => {
  const saída = calcularComissãoNaTela({ modo: 'simples', vendas: '0', percentual: '5' });
  assert.equal(saída.resumo, 'Sem vendas no período, não há comissão.');
  assert.equal(saída.valor, `${formatarMoeda(0)} de comissão`);
});

test('o tipo escolhido manda: campos do outro tipo são ignorados mesmo que estejam preenchidos', () => {
  const simples = calcularComissãoNaTela({ ...TELA_ESCALONADA, modo: 'simples', percentual: '10', faixa1Ate: 'lixo' });
  assert.equal(Object.fromEntries(simples.linhas)['Comissão bruta'], formatarMoeda(2500));
  const escalonada = calcularComissãoNaTela({ ...TELA_ESCALONADA, percentual: 'lixo' });
  assert.equal(Object.fromEntries(escalonada.linhas)['Comissão bruta'], formatarMoeda(1200));
});

test('mensagens apontam o campo certo e dizem o que fazer', () => {
  let erro = recusaDaTela({ modo: 'simples', vendas: '', percentual: '5' });
  assert.equal(erro.campo, 'vendas');
  assert.match(erro.message, /Preencha o campo "Vendas do período"/);

  erro = recusaDaTela({ modo: 'simples', vendas: '1000', percentual: '' });
  assert.equal(erro.campo, 'percentual');

  erro = recusaDaTela({ modo: 'simples', vendas: '1000', percentual: '101' });
  assert.equal(erro.campo, 'percentual');

  erro = recusaDaTela({ modo: 'simples', vendas: '1000', percentual: '3,255' });
  assert.equal(erro.campo, 'percentual');
  assert.match(erro.message, /no máximo duas casas decimais/);

  erro = recusaDaTela({ modo: 'simples', vendas: '1000', percentual: '5', descontoPercentual: '120' });
  assert.equal(erro.campo, 'descontoPercentual');

  erro = recusaDaTela({ modo: 'simples', vendas: '-5', percentual: '5' });
  assert.equal(erro.campo, 'vendas');

  erro = recusaDaTela({ modo: 'simples', vendas: 'abc', percentual: '5' });
  assert.equal(erro.campo, 'vendas');
  assert.match(erro.message, /precisa ser um número/);

  erro = recusaDaTela({ modo: 'progressiva', vendas: '1000', percentual: '5' });
  assert.equal(erro.campo, 'modo');
});

test('vendas com fração de centavo ou acima do limite são recusadas, não arredondadas', () => {
  let erro = recusaDaTela({ modo: 'simples', vendas: '1.000,005', percentual: '5' });
  assert.equal(erro.campo, 'vendas');
  assert.match(erro.message, /duas casas decimais/);

  erro = recusaDaTela({ modo: 'simples', vendas: '1.000.000.000,01', percentual: '5' });
  assert.equal(erro.campo, 'vendas');
  assert.match(erro.message, /limite é R\$\s1\.000\.000\.000,00/);

  assert.equal(calcularComissãoNaTela({ modo: 'simples', vendas: '1.000.000.000,00', percentual: '100' }).linhas[1][1], formatarMoeda(1e9));
  // O ponto como separador decimal também vale (1000.50), como em qualquer campo do portal.
  assert.equal(calcularComissãoNaTela({ modo: 'simples', vendas: '1000.50', percentual: '10' }).linhas[1][1], formatarMoeda(100.05));
});

test('entrada hostil nos campos vira recusa, nunca erro de programação', () => {
  for (const vendas of ['Infinity', 'NaN', '1e5', '0x10', '9'.repeat(400), '１２３', '--5', '1,2,3,4', '<b>1</b>', '1.2.3.4']) {
    const erro = recusaDe(() => calcularComissãoNaTela({ modo: 'simples', vendas, percentual: '5' }));
    assert.ok(erro instanceof ErroDeEntrada, `vendas ${vendas.slice(0, 20)}`);
  }
  // Texto enorme num campo numérico: recusado sem travar.
  const inicio = Date.now();
  assert.equal(recusaDaTela({ modo: 'simples', vendas: '7'.repeat(1_000_000), percentual: '5' }).campo, 'vendas');
  assert.ok(Date.now() - inicio < 2_000);
});

test('faixas na tela: ordem, lacunas, última sem limite e linha incompleta', () => {
  let erro = recusaDaTela({ ...TELA_ESCALONADA, faixa1Ate: '', faixa1Percentual: '', faixa2Ate: '', faixa2Percentual: '', faixa3Percentual: '' });
  assert.equal(erro.campo, 'faixa1Percentual');
  assert.match(erro.message, /Informe pelo menos a faixa 1/);

  erro = recusaDaTela({ ...TELA_ESCALONADA, faixa2Ate: '5.000,00' });
  assert.equal(erro.campo, 'faixa2Ate');
  assert.match(erro.message, /A faixa 2 precisa terminar acima de R\$\s10\.000,00, onde termina a faixa 1\./);

  erro = recusaDaTela({ ...TELA_ESCALONADA, faixa2Ate: '10.000,00' });
  assert.equal(erro.campo, 'faixa2Ate');

  // Faixa com limite mas sem percentual.
  erro = recusaDaTela({ ...TELA_ESCALONADA, faixa2Percentual: '' });
  assert.equal(erro.campo, 'faixa2Percentual');
  assert.match(erro.message, /Informe a comissão da faixa 2.*use 0/);

  // Faixa sem limite no meio.
  erro = recusaDaTela({ ...TELA_ESCALONADA, faixa2Ate: '' });
  assert.equal(erro.campo, 'faixa2Ate');
  assert.match(erro.message, /Só a última faixa pode ficar sem limite/);

  // Linha em branco no meio.
  erro = recusaDaTela({ ...TELA_ESCALONADA, faixa2Ate: '', faixa2Percentual: '' });
  assert.equal(erro.campo, 'faixa2Percentual');
  assert.match(erro.message, /Preencha a faixa 2 antes das seguintes/);

  // Percentual de faixa acima de 100 e fim de faixa que não é número.
  assert.equal(recusaDaTela({ ...TELA_ESCALONADA, faixa1Percentual: '150' }).campo, 'faixa1Percentual');
  assert.equal(recusaDaTela({ ...TELA_ESCALONADA, faixa1Ate: 'dez mil' }).campo, 'faixa1Ate');
  assert.equal(recusaDaTela({ ...TELA_ESCALONADA, faixa1Ate: '0' }).campo, 'faixa1Ate');
  assert.equal(recusaDaTela({ ...TELA_ESCALONADA, faixa1Ate: '10.000,001' }).campo, 'faixa1Ate');
});

test('cinco faixas preenchidas funcionam e a conta fecha', () => {
  const saída = calcularComissãoNaTela({
    modo: 'escalonada', vendas: '5.000,00', percentual: '',
    faixa1Ate: '1.000,00', faixa1Percentual: '1',
    faixa2Ate: '2.000,00', faixa2Percentual: '2',
    faixa3Ate: '3.000,00', faixa3Percentual: '3',
    faixa4Ate: '4.000,00', faixa4Percentual: '4',
    faixa5Ate: '', faixa5Percentual: '5',
    descontoPercentual: '',
  });
  // 10 + 20 + 30 + 40 + 50 = 150 reais.
  assert.equal(Object.fromEntries(saída.linhas)['Comissão bruta'], formatarMoeda(150));
  assert.equal(saída.tabela.linhas.length, 6);
});

test('o texto copiado traz resultado, dados usados e a conta', () => {
  const saída = calcularComissãoNaTela({ ...TELA_ESCALONADA, descontoPercentual: '10' });
  const texto = saída.texto;
  assert.ok(texto.startsWith('Calculadora de comissão\n'));
  assert.ok(texto.includes(`Comissão líquida: ${formatarMoeda(1080)}`));
  assert.ok(texto.includes(`Comissão bruta: ${formatarMoeda(1200)}`));
  assert.ok(texto.includes('Dados usados'));
  assert.ok(texto.includes('Tipo de comissão: Escalonada por faixa'));
  assert.ok(texto.includes(`Faixa 1: até ${formatarMoeda(10000)}, 3%`));
  assert.ok(texto.includes('Faixa 3: sem limite, 8%'));
  assert.ok(texto.includes('Desconto sobre a comissão: 10%'));
  assert.ok(texto.includes('Soma das faixas:'));
  // O destaque não se repete na lista de resultados.
  assert.equal(texto.split('Comissão líquida:').length, 2);
});

test('o PDF baixado pelo botão tem o resultado, a tabela por faixa, os dados e a conta legível', async () => {
  const saída = calcularComissãoNaTela({ ...TELA_ESCALONADA, descontoPercentual: '10' });
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].rótulo, 'Baixar resumo em PDF');

  const { nome, tipo, bytes } = await arquivoBaixado(saída.arquivos[0].gerar);
  assert.equal(nome, 'comissao.pdf');
  assert.equal(tipo, 'application/pdf');
  const bruto = new TextDecoder('latin1').decode(bytes);
  assert.ok(bruto.startsWith('%PDF-1.4'));
  assert.ok(bruto.trimEnd().endsWith('%%EOF'));

  const textos = textosDoPdf(bytes);
  const tudo = espaçosComuns(textos.join(' '));
  for (const esperado of [
    'Calculadora de comissão', 'Comissão líquida', formatarMoeda(1080), 'Comissão bruta', formatarMoeda(1200),
    `Vendas de ${formatarMoeda(25000)}`, 'Comissão por faixa', 'Faixa 1', 'Faixa 2', 'Faixa 3', 'Soma das faixas',
    'Dados informados', 'Tipo de comissão', 'Escalonada por faixa', 'A conta',
    formatarMoeda(300), formatarMoeda(500), formatarMoeda(400), '3%', '5%', '8%',
  ]) {
    assert.ok(textos.map(espaçosComuns).includes(espaçosComuns(esperado)) || tudo.includes(espaçosComuns(esperado)), `PDF sem "${esperado}"`);
  }
  assert.ok(tudo.includes(espaçosComuns(`Comissão líquida = ${formatarMoeda(1200)} – ${formatarMoeda(120)} = ${formatarMoeda(1080)}.`)));
  assert.ok(!tudo.includes('?'), `caractere trocado por "?" no PDF: ${textos.filter((t) => t.includes('?')).join(' | ')}`);
});

test('o PDF de comissão simples também sai sem caractere trocado', async () => {
  const saída = calcularComissãoNaTela({ modo: 'simples', vendas: '10.001,01', percentual: '3,5', descontoPercentual: '12,5' });
  const { bytes } = await arquivoBaixado(saída.arquivos[0].gerar);
  const tudo = espaçosComuns(textosDoPdf(bytes).join(' '));
  assert.ok(tudo.includes(espaçosComuns(`${formatarMoeda(350.04)} – ${formatarMoeda(43.76)} = ${formatarMoeda(306.28)}`)));
  assert.ok(!tudo.includes('?'));
});

/* --------------------------------------------------------- módulo da tela */

test('o módulo traz a seção "Como usar" completa', () => {
  const { instruções } = comissão;
  assert.ok(instruções.passos.length >= 4);
  assert.ok(instruções.exemplo.texto.includes('R$ 1.200,00'));
  assert.ok(instruções.exemplo.texto.includes('R$ 1.080,00'));
  assert.ok(instruções.limites.includes(formatarMoeda(1e9)));
  assert.ok(instruções.perguntas.length >= 3);
  for (const { p, r } of instruções.perguntas) assert.ok(p && r);
  assert.equal(typeof comissão.montar, 'function');
});
