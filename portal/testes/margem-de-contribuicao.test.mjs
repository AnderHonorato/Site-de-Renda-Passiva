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
import { arquivoBaixado, textosDoPdf, espaçosComuns } from './auxiliares/pdf-baixado.mjs';
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
  assert.equal(margemDeContribuição(entrada).equilíbrioForaDeAlcance, false);
});

test('com margem minúscula as duas ferramentas concordam: nenhuma mostra número fora da precisão', () => {
  // R$ 10,00 com 99,99999% de taxa diante de R$ 5 bilhões de custo fixo: quase 5 quatrilhões de vendas.
  const casos = [
    { preçoCentavos: 1000, custoVariávelCentavos: 0, percentual: 99.99999, custosFixosCentavos: 500_000_000_000 },
    { preçoCentavos: 1, custoVariávelCentavos: 0, percentual: 99.9999, custosFixosCentavos: 9e15 },
  ];
  for (const entrada of casos) {
    assert.equal(recusaDe(() => pontoDeEquilíbrio(entrada)).campo, 'custoVariávelCentavos');
    const r = margemDeContribuição(entrada);
    assert.equal(r.quantidadeDeEquilíbrio, null, JSON.stringify(entrada));
    assert.equal(r.equilíbrioForaDeAlcance, true);
  }
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
    `= ${formatarMoeda(80)} − ${formatarMoeda(32)} − ${formatarMoeda(80)} × 12% = ${formatarMoeda(38.4)}.`,
  ));
  assert.ok(saída.observações.some((o) => o.includes(`sobram ${formatarMoeda(1760)}`)));
  assert.ok(saída.observações.some((o) => o.includes(
    `${formatarMoeda(4000)} ÷ ${formatarMoeda(38.4)} = 104,17; arredondando para cima, 105 unidades.`,
  )));
});

test('com margem de fração de centavo, a conta escrita usa a margem exata e reproduz os totais', () => {
  // R$ 19,90 com 4,99%: margem exata R$ 18,90699; a tela mostra R$ 18,91 e o total de 100 vendas é R$ 1.890,70.
  const saída = calcularMargemNaTela({ preço: '19,90', custoVariável: '', percentual: '4,99', quantidade: '100', custosFixos: '1.891,00' });
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Sobra por venda'], formatarMoeda(18.91));
  assert.equal(linhas['Margem total no mês'], formatarMoeda(1890.70));
  assert.equal(linhas['Resultado depois do custo fixo'], formatarMoeda(-0.30));
  assert.ok(saída.observações[0].endsWith('× 4,99% = R$\u00a018,90699.'), saída.observações[0]);
  assert.match(saída.observações[1], /sobra exata de cada venda é R\$\s18,90699; os resultados mostram R\$\s18,91/);
  assert.ok(saída.observações.some((o) => o.includes(`somam ${formatarMoeda(1890.7)} (100 × R$\u00a018,90699)`)));
});

test('sem fração de centavo não aparece aviso de arredondamento', () => {
  const saída = calcularMargemNaTela(TELA_DO_CONTRATO);
  assert.ok(!saída.observações.some((o) => o.includes('sobra exata')));
});

test('margem minúscula: a tela explica em vez de mostrar vendas para empatar fora da precisão', () => {
  const saída = calcularMargemNaTela({ preço: '10,00', custoVariável: '0', percentual: '99,99999', quantidade: '', custosFixos: '5.000.000.000,00' });
  const linhas = Object.fromEntries(saída.linhas);
  assert.equal(linhas['Vendas para empatar no mês'], undefined);
  assert.equal(linhas['Índice de margem'], 'menos de 0,01%');
  assert.ok(saída.observações.some((o) => o.includes('passam do que dá para calcular com precisão')));
  // O percentual aparece como foi digitado: arredondado, viraria 100%, que a ferramenta recusa.
  assert.ok(saída.observações[0].includes('× 99,99999% = R$\u00a00,000001.'), saída.observações[0]);
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
    // Valor positivo que arredonda para zero centavo: a recusa diz o mínimo, não "informe".
    [{ ...TELA_DO_CONTRATO, preço: '0,004' }, 'preço', /menor valor acima de zero é R\$ 0,01/],
    [{ ...TELA_DO_CONTRATO, custoVariável: '0,004' }, 'custoVariável', /menor valor acima de zero é R\$ 0,01/],
    [{ ...TELA_DO_CONTRATO, custosFixos: '0,001' }, 'custosFixos', /menor valor acima de zero é R\$ 0,01/],
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

test('o PDF baixado pelo botão tem o resultado, o subtítulo, todos os dados e a conta legível', async () => {
  const saída = calcularMargemNaTela(TELA_DO_CONTRATO);
  assert.equal(saída.arquivos.length, 1);
  assert.equal(saída.arquivos[0].rótulo, 'Baixar resumo em PDF');

  const { nome, tipo, bytes } = await arquivoBaixado(saída.arquivos[0].gerar);
  assert.equal(nome, 'margem-de-contribuicao.pdf');
  assert.equal(tipo, 'application/pdf');
  const bruto = new TextDecoder('latin1').decode(bytes);
  assert.ok(bruto.startsWith('%PDF-1.4'));
  assert.ok(bruto.trimEnd().endsWith('%%EOF'));

  const textos = textosDoPdf(bytes);
  const tudo = espaçosComuns(textos.join(' '));
  assert.ok(textos.includes(`${formatarMoeda(38.4)} por venda`), 'subtítulo');
  for (const [rótulo, valor] of saída.linhas) {
    assert.ok(textos.includes(rótulo) && textos.includes(valor), `resultado ${rótulo}`);
  }
  for (const [rótulo, valor] of [
    ['Preço de venda por unidade', formatarMoeda(80)], ['Custo variável por unidade', formatarMoeda(32)],
    ['Percentual que sai do preço', '12%'], ['Quantidade vendida no mês', '150 unidades'],
    ['Custos fixos do mês', formatarMoeda(4000)],
  ]) {
    assert.ok(textos.includes(rótulo) && textos.includes(valor), `dado ${rótulo}`);
  }
  // Os sinais de menos são a própria conta: nenhum pode virar "?" no PDF.
  assert.ok(!tudo.includes('?'), `caractere trocado por "?" no PDF: ${textos.filter((t) => t.includes('?')).join(' | ')}`);
  assert.ok(tudo.includes('A conta:'));
  assert.ok(tudo.includes(espaçosComuns(`= ${formatarMoeda(80)} – ${formatarMoeda(32)} – ${formatarMoeda(80)} × 12% = ${formatarMoeda(38.4)}.`)));
});
