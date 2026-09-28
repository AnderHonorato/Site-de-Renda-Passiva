/**
 * Ponto de equilíbrio.
 *
 * Os casos de cálculo vêm do Ander Flow (contrato §13.2 e
 * ander-flow/testes/testes-unidade/ponto-de-equilibrio-calculo.test.js),
 * convertidos para centavos inteiros como o portal exige.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pontoDeEquilíbrio } from '../scripts/cálculos/custos.js';
import { calcularPontoNaTela } from '../scripts/ferramentas/ponto-de-equilibrio.js';
import { pdfDoResumo } from '../scripts/ferramentas/auxiliares/resumo-de-custos.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { formatarMoeda } from '../scripts/comum/formatação/formatar-moeda.js';

// CF R$ 5.000,00, preço R$ 50,00, custo variável R$ 20,00, 10% sobre a venda.
const CASO_DO_CONTRATO = {
  custosFixosCentavos: 500000, preçoCentavos: 5000, custoVariávelCentavos: 2000, percentual: 10,
};

/** Executa e devolve a recusa, falhando se não houver. */
function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  assert.fail('era esperada uma recusa');
}

/* ------------------------------------------------------------- cálculo */

test('caso do contrato: margem R$ 25,00, 200 unidades e R$ 10.000,00', () => {
  const r = pontoDeEquilíbrio(CASO_DO_CONTRATO);
  assert.equal(r.margemCentavos, 2500);
  assert.equal(r.quantidade, 200);
  assert.equal(r.receitaCentavos, 1000000);
  assert.equal(r.índice, 0.5);
  assert.equal(r.alvoCentavos, 500000);
  assert.equal(r.porDia, 7); // 200 ÷ 30 = 6,67 → 7
});

test('quantidade sobe para o inteiro seguinte', () => {
  const exata = pontoDeEquilíbrio({ custosFixosCentavos: 100000, preçoCentavos: 3000, custoVariávelCentavos: 1000 });
  assert.equal(exata.quantidadeExata, 50);
  assert.equal(exata.quantidade, 50);

  const comSobra = pontoDeEquilíbrio({ custosFixosCentavos: 101000, preçoCentavos: 3000, custoVariávelCentavos: 1000 });
  assert.equal(comSobra.quantidade, 51);
  // O faturamento necessário é o exato; o de 51 unidades inteiras passa dele.
  assert.equal(comSobra.receitaCentavos, 151500);
  assert.equal(comSobra.receitaDaQuantidadeInteiraCentavos, 153000);
});

test('lucro desejado entra na conta', () => {
  const r = pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, lucroDesejadoCentavos: 250000 });
  assert.equal(r.quantidade, 300);
  assert.equal(r.receitaCentavos, 1500000);
  assert.equal(r.alvoCentavos, 750000);
});

test('margem não positiva é recusada no custo variável', () => {
  const erro = recusaDe(() => pontoDeEquilíbrio({ custosFixosCentavos: 100000, preçoCentavos: 2000, custoVariávelCentavos: 2500 }));
  assert.equal(erro.campo, 'custoVariávelCentavos');
  assert.match(erro.message, /não deixa nada/);

  // Margem exatamente zero também não fecha conta nenhuma.
  const zero = recusaDe(() => pontoDeEquilíbrio({ custosFixosCentavos: 100000, preçoCentavos: 2000, custoVariávelCentavos: 1000, percentual: 50 }));
  assert.equal(zero.campo, 'custoVariávelCentavos');
});

test('preço zero ou negativo é recusado antes da divisão', () => {
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ custosFixosCentavos: 10000, preçoCentavos: 0 })).campo, 'preçoCentavos');
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ custosFixosCentavos: 10000, preçoCentavos: -500 })).campo, 'preçoCentavos');
});

test('percentual de 100% ou mais é recusado', () => {
  const erro = recusaDe(() => pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, percentual: 100 }));
  assert.equal(erro.campo, 'percentual');
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, percentual: -1 })).campo, 'percentual');
});

test('valor fora de centavos inteiros é recusado no campo certo', () => {
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, custosFixosCentavos: 10.5 })).campo, 'custosFixosCentavos');
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, lucroDesejadoCentavos: -1 })).campo, 'lucroDesejadoCentavos');
  assert.equal(recusaDe(() => pontoDeEquilíbrio({ ...CASO_DO_CONTRATO, custoVariávelCentavos: 2 ** 60 })).campo, 'custoVariávelCentavos');
});

test('a margem com fração de centavo não é arredondada antes de dividir', () => {
  // R$ 19,99 com 4,99% de taxa: margem exata de 1899,2499 centavos. Com a
  // margem arredondada para R$ 18,99 a conta daria 101 vendas; o certo é 100.
  const r = pontoDeEquilíbrio({ custosFixosCentavos: 189924, preçoCentavos: 1999, percentual: 4.99 });
  assert.equal(r.margemCentavos, 1899);
  assert.equal(r.quantidade, 100);
});

test('divisão exata não ganha uma venda a mais por erro de ponto flutuante', () => {
  // 148362 ÷ 1483,62 dá 100,00000000000001 em ponto flutuante.
  const r = pontoDeEquilíbrio({ custosFixosCentavos: 148362, preçoCentavos: 1580, percentual: 6.1 });
  assert.equal(r.quantidade, 100);
  assert.equal(r.receitaCentavos, 158000);
});

test('sem custo fixo e sem lucro a quantidade é zero', () => {
  const r = pontoDeEquilíbrio({ custosFixosCentavos: 0, preçoCentavos: 5000, custoVariávelCentavos: 2000 });
  assert.equal(r.quantidade, 0);
  assert.equal(r.receitaCentavos, 0);
  assert.equal(r.porDia, 0);
});

test('margem minúscula diante de custo alto é recusada em vez de devolver número absurdo', () => {
  const erro = recusaDe(() => pontoDeEquilíbrio({
    custosFixosCentavos: 900_000_000_000_000, preçoCentavos: 100, custoVariávelCentavos: 99, percentual: 0.9999,
  }));
  assert.equal(erro.campo, 'custoVariávelCentavos');
});

/* ------------------------------------------------------------------ tela */

const TELA_DO_CONTRATO = { custosFixos: '5.000,00', lucro: '0', preço: '50,00', custoVariável: '20,00', percentual: '10' };

test('a tela mostra o caso do contrato com os números formatados', () => {
  const saída = calcularPontoNaTela(TELA_DO_CONTRATO);
  assert.equal(saída.valor, '200 unidades');
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Faturamento necessário'], formatarMoeda(10000));
  assert.equal(linhas['Margem de contribuição por unidade'], formatarMoeda(25));
  assert.equal(linhas['Índice de margem'], '50,0%');
  assert.equal(linhas['Média por dia (mês de 30 dias)'], '7 unidades');
  assert.match(saída.resumo, /cobrir R\$\s5\.000,00 de custos fixos, faturando R\$\s10\.000,00/);
  assert.ok(saída.observações.some((o) => o.includes(`200 unidades = ${formatarMoeda(5000)} ÷ ${formatarMoeda(25)}`)));
});

test('campos opcionais vazios valem zero e o lucro muda o resumo', () => {
  const vazio = calcularPontoNaTela({ ...TELA_DO_CONTRATO, lucro: '', custoVariável: '', percentual: '' });
  assert.equal(vazio.valor, '100 unidades'); // 5000 ÷ 50

  const comLucro = calcularPontoNaTela({ ...TELA_DO_CONTRATO, lucro: '2.500,00' });
  assert.equal(comLucro.valor, '300 unidades');
  assert.match(comLucro.resumo, /ainda lucrar R\$\s2\.500,00/);
});

test('uma unidade no singular', () => {
  const saída = calcularPontoNaTela({ custosFixos: '10,00', lucro: '', preço: '50,00', custoVariável: '', percentual: '' });
  assert.equal(saída.valor, '1 unidade');
});

test('sem nada a cobrir, a tela explica em vez de mostrar zero seco', () => {
  const saída = calcularPontoNaTela({ ...TELA_DO_CONTRATO, custosFixos: '0' });
  assert.equal(saída.valor, '0 unidades');
  assert.match(saída.resumo, /não há mínimo de vendas/);
});

test('cada recusa chega ao campo que a pessoa precisa corrigir', () => {
  const casos = [
    [{ ...TELA_DO_CONTRATO, custosFixos: '' }, 'custosFixos', /Preencha o campo "Custos fixos do mês"/],
    [{ ...TELA_DO_CONTRATO, preço: '' }, 'preço', /Preencha o campo "Preço de venda"/],
    [{ ...TELA_DO_CONTRATO, preço: '0' }, 'preço', /Informe o preço de venda/],
    [{ ...TELA_DO_CONTRATO, preço: 'abc' }, 'preço', /precisa ser um número/],
    [{ ...TELA_DO_CONTRATO, custosFixos: '-10' }, 'custosFixos', /não pode ser menor que 0/],
    [{ ...TELA_DO_CONTRATO, percentual: '100' }, 'percentual', /menor que 100%/],
    [{ ...TELA_DO_CONTRATO, custoVariável: '60,00' }, 'custoVariável', /não deixa nada/],
    [{ ...TELA_DO_CONTRATO, lucro: '1e5' }, 'lucro', /precisa ser um número/],
    [{ ...TELA_DO_CONTRATO, custosFixos: '999999999999999999' }, 'custosFixos', /grande demais/],
  ];
  for (const [dados, campo, mensagem] of casos) {
    const erro = recusaDe(() => calcularPontoNaTela(dados));
    assert.ok(erro instanceof ErroDeEntrada, `${JSON.stringify(dados)} deveria virar erro de campo`);
    assert.equal(erro.campo, campo, `${JSON.stringify(dados)} foi para ${erro.campo}`);
    assert.match(erro.message, mensagem);
  }
});

/* ------------------------------------------------------------ exportação */

test('o texto copiado leva resultado, dados usados e a conta', () => {
  const { texto } = calcularPontoNaTela(TELA_DO_CONTRATO);
  assert.match(texto, /^Ponto de equilíbrio\nVocê precisa vender: 200 unidades\n/);
  assert.ok(texto.includes(`Faturamento necessário: ${formatarMoeda(10000)}`));
  assert.ok(texto.includes('Dados usados'));
  assert.ok(texto.includes('Percentual que sai do preço: 10%'));
  assert.ok(texto.includes('A conta:'));
});

test('o PDF é um documento válido com o resultado escrito', () => {
  const saída = calcularPontoNaTela(TELA_DO_CONTRATO);
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].rótulo, 'Baixar resumo em PDF');

  const bytes = pdfDoResumo({
    título: 'Ponto de equilíbrio',
    destaque: ['Você precisa vender', saída.valor],
    resultados: saída.linhas,
    dados: [['Custos fixos do mês', formatarMoeda(5000)]],
    conta: saída.observações,
  });
  const conteúdo = typeof bytes === 'string' ? bytes : new TextDecoder('latin1').decode(bytes);
  assert.ok(conteúdo.startsWith('%PDF-1.4'));
  assert.ok(conteúdo.trimEnd().endsWith('%%EOF'));
  assert.ok(conteúdo.includes('(200 unidades)'));
  assert.ok(conteúdo.includes('Faturamento necess'));
});
