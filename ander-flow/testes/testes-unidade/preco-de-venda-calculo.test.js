import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularPrecoDeVenda, montarCenarios } from '../../frontend/ferramentas/preco-de-venda/preco-de-venda-calculo.js';

const CASO_DO_CONTRATO = {
  custoProduto: 38.4,
  despesaFixaPorUnidade: 6.1,
  taxaCartao: 0.042,
  imposto: 0.06,
  margem: 0.3,
};

test('caso do contrato: custo 38,40 + despesa 6,10, taxa 4,2%, imposto 6%, margem 30%', () => {
  const resultado = calcularPrecoDeVenda(CASO_DO_CONTRATO);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.custoTotal, 44.5);
  assert.equal(resultado.preco, 74.41);
  assert.equal(resultado.taxaEImposto, 7.59);
  assert.equal(resultado.sobra, 22.32);
  assert.equal(resultado.precoMinimo, 49.55);
});

test('as partes fecham com o preço', () => {
  const { preco, custoTotal, taxaEImposto, sobra } = calcularPrecoDeVenda(CASO_DO_CONTRATO);
  assert.ok(Math.abs(preco - (custoTotal + taxaEImposto + sobra)) < 0.02);
});

test('margem de 96% com taxa 4,2% e imposto 6% é recusada, com o limite informado', () => {
  const resultado = calcularPrecoDeVenda({ ...CASO_DO_CONTRATO, margem: 0.96 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.erro, 'margem_acima_do_limite');
  assert.equal(resultado.campo, 'margem');
  assert.ok(Math.abs(resultado.extras.limite - 0.898) < 1e-9);
});

test('margem exatamente no limite também é recusada (denominador zero)', () => {
  const resultado = calcularPrecoDeVenda({ ...CASO_DO_CONTRATO, margem: 0.898 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.erro, 'margem_acima_do_limite');
});

test('valor negativo e número inválido apontam o campo', () => {
  assert.deepEqual(
    calcularPrecoDeVenda({ ...CASO_DO_CONTRATO, taxaCartao: -0.1 }),
    { ok: false, erro: 'valor_negativo', campo: 'taxaCartao' },
  );
  assert.deepEqual(
    calcularPrecoDeVenda({ ...CASO_DO_CONTRATO, custoProduto: Number.NaN }),
    { ok: false, erro: 'numero_invalido', campo: 'custoProduto' },
  );
});

test('custo total zerado é recusado', () => {
  const resultado = calcularPrecoDeVenda({ custoProduto: 0, despesaFixaPorUnidade: 0, margem: 0.3 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.erro, 'custo_zerado');
});

test('sem taxa, sem imposto e sem margem, o preço é o próprio custo', () => {
  const resultado = calcularPrecoDeVenda({ custoProduto: 10, despesaFixaPorUnidade: 0 });
  assert.equal(resultado.preco, 10);
  assert.equal(resultado.precoMinimo, 10);
  assert.equal(resultado.sobra, 0);
});

test('cenários vão de 10% a 50% de margem, de 5 em 5', () => {
  const cenarios = montarCenarios(CASO_DO_CONTRATO);
  assert.equal(cenarios.length, 9);
  assert.equal(cenarios[0].margem, 0.1);
  assert.equal(cenarios.at(-1).margem, 0.5);
  assert.ok(cenarios[0].preco < cenarios.at(-1).preco);
});
