import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularPontoDeEquilibrio, resultadoNaQuantidade } from '../../frontend/ferramentas/ponto-de-equilibrio/ponto-de-equilibrio-calculo.js';

const CASO_DO_CONTRATO = { custosFixos: 5000, preco: 50, custoVariavel: 20, percentualVariavel: 0.1 };

test('caso do contrato: CF 5000, preço 50, custo variável 20, 10% sobre a venda', () => {
  const resultado = calcularPontoDeEquilibrio(CASO_DO_CONTRATO);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.margemUnitaria, 25);
  assert.equal(resultado.quantidade, 200);
  assert.equal(resultado.receita, 10000);
  assert.equal(resultado.indice, 0.5);
});

test('quantidade sobe para o inteiro seguinte', () => {
  const resultado = calcularPontoDeEquilibrio({ custosFixos: 1000, preco: 30, custoVariavel: 10 });
  assert.equal(resultado.quantidadeExata, 50);
  assert.equal(resultado.quantidade, 50);
  const comSobra = calcularPontoDeEquilibrio({ custosFixos: 1010, preco: 30, custoVariavel: 10 });
  assert.equal(comSobra.quantidade, 51);
});

test('lucro desejado entra na conta', () => {
  const resultado = calcularPontoDeEquilibrio({ ...CASO_DO_CONTRATO, lucroDesejado: 2500 });
  assert.equal(resultado.quantidade, 300);
  assert.equal(resultado.receita, 15000);
});

test('margem não positiva é recusada', () => {
  const resultado = calcularPontoDeEquilibrio({ custosFixos: 1000, preco: 20, custoVariavel: 25 });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.erro, 'margem_nao_positiva');
  assert.equal(resultado.campo, 'custoVariavel');
});

test('preço zero ou negativo é recusado antes da divisão', () => {
  assert.equal(calcularPontoDeEquilibrio({ custosFixos: 100, preco: 0 }).erro, 'preco_invalido');
  assert.equal(calcularPontoDeEquilibrio({ custosFixos: 100, preco: -5 }).erro, 'valor_negativo');
});

test('percentual variável de 100% ou mais é recusado', () => {
  const resultado = calcularPontoDeEquilibrio({ ...CASO_DO_CONTRATO, percentualVariavel: 1 });
  assert.equal(resultado.erro, 'percentual_acima_do_limite');
});

test('resultado numa quantidade escolhida', () => {
  const abaixo = resultadoNaQuantidade(CASO_DO_CONTRATO, 150);
  assert.equal(abaixo.margemTotal, 3750);
  assert.equal(abaixo.resultado, -1250);
  const acima = resultadoNaQuantidade(CASO_DO_CONTRATO, 250);
  assert.equal(acima.resultado, 1250);
});
