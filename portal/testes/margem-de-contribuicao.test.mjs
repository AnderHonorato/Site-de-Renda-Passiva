/**
 * Margem de contribuição.
 *
 * Os casos de cálculo vêm do Ander Flow (contrato §13.3 e
 * ander-flow/testes/testes-unidade/margem-de-contribuicao-calculo.test.js),
 * convertidos para centavos inteiros como o portal exige.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { margemDeContribuição, pontoDeEquilíbrio } from '../scripts/cálculos/custos.js';
import { calcularMargemNaTela } from '../scripts/ferramentas/margem-de-contribuicao.js';
import { pdfDoResumo } from '../scripts/ferramentas/auxiliares/resumo-de-custos.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';
import { formatarMoeda } from '../scripts/comum/formatação/formatar-moeda.js';

// Preço R$ 80,00, custo variável R$ 32,00, 12% sobre a venda, 150 unidades, custo fixo R$ 4.000,00.
const CASO_DO_CONTRATO = {
  preçoCentavos: 8000, custoVariávelCentavos: 3200, percentual: 12, quantidade: 150, custosFixosCentavos: 400000,
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

test('caso do contrato: margem R$ 38,40, índice 48%, total R$ 5.760,00 e resultado R$ 1.760,00', () => {
  const r = margemDeContribuição(CASO_DO_CONTRATO);
  assert.equal(r.margemCentavos, 3840);
  assert.equal(r.índice, 0.48);
  assert.equal(r.totalCentavos, 576000);
  assert.equal(r.resultadoCentavos, 176000);
  assert.equal(r.percentualCentavos, 960);
  assert.equal(r.margemNegativa, false);
});

test('quantidade de equilíbrio sai da margem e dos custos fixos', () => {
  // 4000 ÷ 38,40 = 104,17 → 105
  assert.equal(margemDeContribuição(CASO_DO_CONTRATO).quantidadeDeEquilíbrio, 105);
});

test('sem custos fixos não existe quantidade de equilíbrio', () => {
  const r = margemDeContribuição({ preçoCentavos: 5000, custoVariávelCentavos: 2000, quantidade: 10 });
  assert.equal(r.quantidadeDeEquilíbrio, null);
  assert.equal(r.totalCentavos, 30000);
  assert.equal(r.resultadoCentavos, 30000);
});

test('margem negativa é sinalizada em vez de escondida', () => {
  const r = margemDeContribuição({ preçoCentavos: 2000, custoVariávelCentavos: 2500, quantidade: 5 });
  assert.equal(r.margemNegativa, true);
  assert.equal(r.margemCentavos, -500);
  assert.equal(r.totalCentavos, -2500);
  assert.equal(r.quantidadeDeEquilíbrio, null);
});

test('margem exatamente zero também é sinalizada e não tem equilíbrio', () => {
  const r = margemDeContribuição({ preçoCentavos: 2000, custoVariávelCentavos: 1000, percentual: 50, custosFixosCentavos: 10000 });
  assert.equal(r.margemCentavos, 0);
  assert.equal(r.margemNegativa, true);
  assert.equal(r.quantidadeDeEquilíbrio, null);
});

test('preço inválido e valor negativo apontam o campo', () => {
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: 0 })).campo, 'preçoCentavos');
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: -500 })).campo, 'preçoCentavos');
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: 1000, quantidade: -1 })).campo, 'quantidade');
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: 1000, custoVariávelCentavos: -1 })).campo, 'custoVariávelCentavos');
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: 1000, custosFixosCentavos: -1 })).campo, 'custosFixosCentavos');
  assert.equal(recusaDe(() => margemDeContribuição({ preçoCentavos: 1000, percentual: -1 })).campo, 'percentual');
});

test('percentual de 100% ou mais é recusado', () => {
  const erro = recusaDe(() => margemDeContribuição({ ...CASO_DO_CONTRATO, percentual: 100 }));
  assert.equal(erro.campo, 'percentual');
  assert.match(erro.message, /menor que 100%/);
});

test('quantidade que estoura a precisão é recusada em vez de devolver número errado', () => {
  const erro = recusaDe(() => margemDeContribuição({ ...CASO_DO_CONTRATO, quantidade: 1e15 }));
  assert.equal(erro.campo, 'quantidade');
});

test('a margem com fração de centavo só é arredondada na saída', () => {
  // R$ 19,99 com 4,99% de taxa: margem exata de 1899,2499 centavos.
  const r = margemDeContribuição({ preçoCentavos: 1999, percentual: 4.99, quantidade: 100, custosFixosCentavos: 189924 });
  assert.equal(r.margemCentavos, 1899);
  assert.equal(r.totalCentavos, 189925); // 189924,99 → 189925, não 1899 × 100
  assert.equal(r.quantidadeDeEquilíbrio, 100);
});

test('margem e ponto de equilíbrio concordam sobre as vendas para empatar', () => {
  const entrada = { preçoCentavos: 5000, custoVariávelCentavos: 2000, percentual: 10, custosFixosCentavos: 500000 };
  assert.equal(margemDeContribuição(entrada).quantidadeDeEquilíbrio, pontoDeEquilíbrio(entrada).quantidade);
  assert.equal(margemDeContribuição(entrada).margemCentavos, pontoDeEquilíbrio(entrada).margemCentavos);
});

/* ------------------------------------------------------------------ tela */

const TELA_DO_CONTRATO = { preço: '80,00', custoVariável: '32,00', percentual: '12', quantidade: '150', custosFixos: '4.000,00' };

test('a tela mostra o caso do contrato com os números formatados', () => {
  const saída = calcularMargemNaTela(TELA_DO_CONTRATO);
  assert.equal(saída.valor, `${formatarMoeda(38.4)} por venda`);
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Sobra por venda'], formatarMoeda(38.4));
  assert.equal(linhas['Índice de margem'], '48,0%');
  assert.equal(linhas['Margem total no mês'], formatarMoeda(5760));
  assert.equal(linhas['Resultado depois do custo fixo'], formatarMoeda(1760));
  assert.equal(linhas['Vendas para empatar no mês'], '105 unidades');
  assert.match(saída.resumo, /De cada R\$\s80,00 vendido, R\$\s38,40 \(48,0%\) ficam/);
  assert.ok(saída.observações[0].includes(
    `${formatarMoeda(38.4)} = ${formatarMoeda(80)} − ${formatarMoeda(32)} − ${formatarMoeda(80)} × 12%`,
  ));
  assert.ok(saída.observações.some((o) => o.includes(`sobram ${formatarMoeda(1760)}`)));
});

test('só a venda: sem quantidade nem custo fixo, a tela não inventa total do mês', () => {
  const saída = calcularMargemNaTela({ preço: '80,00', custoVariável: '32,00', percentual: '12', quantidade: '', custosFixos: '' });
  assert.deepEqual(saída.linhas.map(([r]) => r), ['Sobra por venda', 'Índice de margem']);
  assert.ok(saída.observações.some((o) => o.includes('Informe a quantidade vendida')));
});

test('só o custo fixo: mostra as vendas para empatar, sem resultado do mês', () => {
  const saída = calcularMargemNaTela({ ...TELA_DO_CONTRATO, quantidade: '' });
  const rótulos = saída.linhas.map(([r]) => r);
  assert.ok(rótulos.includes('Vendas para empatar no mês'));
  assert.ok(!rótulos.includes('Margem total no mês'));
  assert.ok(!rótulos.includes('Resultado depois do custo fixo'));
});

test('mês no vermelho diz quanto falta', () => {
  const saída = calcularMargemNaTela({ ...TELA_DO_CONTRATO, quantidade: '100' });
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Resultado depois do custo fixo'], formatarMoeda(-160));
  assert.ok(saída.observações.some((o) => o.includes(`faltam ${formatarMoeda(160)}`)));
});

test('margem negativa aparece no resultado com o aviso', () => {
  const saída = calcularMargemNaTela({ preço: '20,00', custoVariável: '25,00', percentual: '', quantidade: '5', custosFixos: '' });
  assert.equal(saída.valor, `${formatarMoeda(-5)} por venda`);
  assert.match(saída.resumo, /margem está negativa/);
  assert.equal(Object.fromEntries(saída.linhas)['Margem total no mês'], formatarMoeda(-25));
});

test('margem zero tem aviso próprio', () => {
  const saída = calcularMargemNaTela({ preço: '20,00', custoVariável: '10,00', percentual: '50', quantidade: '', custosFixos: '' });
  assert.match(saída.resumo, /margem é zero/);
});

test('campos opcionais vazios valem zero', () => {
  const saída = calcularMargemNaTela({ preço: '50,00', custoVariável: '', percentual: '', quantidade: '', custosFixos: '' });
  assert.equal(saída.valor, `${formatarMoeda(50)} por venda`);
  assert.equal(Object.fromEntries(saída.linhas)['Índice de margem'], '100,0%');
});

test('cada recusa chega ao campo que a pessoa precisa corrigir', () => {
  const casos = [
    [{ ...TELA_DO_CONTRATO, preço: '' }, 'preço', /Preencha o campo "Preço de venda"/],
    [{ ...TELA_DO_CONTRATO, preço: '0' }, 'preço', /Informe o preço de venda/],
    [{ ...TELA_DO_CONTRATO, preço: 'abc' }, 'preço', /precisa ser um número/],
    [{ ...TELA_DO_CONTRATO, custoVariável: '-1' }, 'custoVariável', /não pode ser menor que 0/],
    [{ ...TELA_DO_CONTRATO, percentual: '100' }, 'percentual', /menor que 100%/],
    [{ ...TELA_DO_CONTRATO, quantidade: '10,5' }, 'quantidade', /número inteiro/],
    [{ ...TELA_DO_CONTRATO, quantidade: '-3' }, 'quantidade', /não pode ser menor que 0/],
    [{ ...TELA_DO_CONTRATO, quantidade: '1000000000000000' }, 'quantidade', /grande demais/],
    [{ ...TELA_DO_CONTRATO, custosFixos: '999999999999999999' }, 'custosFixos', /grande demais/],
    [{ ...TELA_DO_CONTRATO, preço: '999999999999999999' }, 'preço', /grande demais/],
  ];
  for (const [dados, campo, mensagem] of casos) {
    const erro = recusaDe(() => calcularMargemNaTela(dados));
    assert.ok(erro instanceof ErroDeEntrada, `${JSON.stringify(dados)} deveria virar erro de campo`);
    assert.equal(erro.campo, campo, `${JSON.stringify(dados)} foi para ${erro.campo}`);
    assert.match(erro.message, mensagem);
  }
});

/* ------------------------------------------------------------ exportação */

test('o texto copiado leva resultado, dados usados e a conta', () => {
  const { texto } = calcularMargemNaTela(TELA_DO_CONTRATO);
  assert.match(texto, /^Margem de contribuição\nSobra por venda: R\$\s38,40\nÍndice de margem: 48,0%\n/);
  assert.ok(texto.includes(`Resultado depois do custo fixo: ${formatarMoeda(1760)}`));
  assert.ok(texto.includes('Dados usados'));
  assert.ok(texto.includes('Percentual que sai do preço: 12%'));
  assert.ok(texto.includes('Quantidade vendida no mês: 150 unidades'));
  assert.ok(texto.includes('A conta:'));
  // O destaque não se repete na lista de resultados.
  assert.equal(texto.split('Sobra por venda:').length, 2);
});

test('o PDF é um documento válido com o resultado escrito', () => {
  const saída = calcularMargemNaTela(TELA_DO_CONTRATO);
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].rótulo, 'Baixar resumo em PDF');

  const bytes = pdfDoResumo({
    título: 'Margem de contribuição',
    destaque: ['Sobra por venda', formatarMoeda(38.4)],
    resultados: saída.linhas.slice(1),
    dados: [['Preço de venda por unidade', formatarMoeda(80)]],
    conta: saída.observações,
  });
  const conteúdo = typeof bytes === 'string' ? bytes : new TextDecoder('latin1').decode(bytes);
  assert.ok(conteúdo.startsWith('%PDF-1.4'));
  assert.ok(conteúdo.trimEnd().endsWith('%%EOF'));
  assert.ok(conteúdo.includes('Sobra por venda'));
  assert.ok(conteúdo.includes('(105 unidades)'));
});
