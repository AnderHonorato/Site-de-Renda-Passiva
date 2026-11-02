import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularMargemDeContribuicao } from '../../frontend/ferramentas/margem-de-contribuicao/margem-de-contribuicao-calculo.js';

const CASO_DO_CONTRATO = { preco: 80, custoVariavel: 32, percentualVariavel: 0.12, quantidade: 150, custosFixos: 4000 };

test('caso do contrato: preço 80, custo variável 32, 12% sobre a venda, 150 unidades, CF 4000', () => {
  const resultado = calcularMargemDeContribuicao(CASO_DO_CONTRATO);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.margemUnitaria, 38.4);
  assert.equal(resultado.indice, 0.48);
  assert.equal(resultado.total, 5760);
  assert.equal(resultado.resultado, 1760);
});

test('quantidade de equilíbrio sai da margem e dos custos fixos', () => {
  const resultado = calcularMargemDeContribuicao(CASO_DO_CONTRATO);
  assert.equal(resultado.quantidadeDeEquilibrio, 105); // 4000 / 38,40 = 104,17
});

test('sem custos fixos não existe quantidade de equilíbrio', () => {
  const resultado = calcularMargemDeContribuicao({ preco: 50, custoVariavel: 20, quantidade: 10 });
  assert.equal(resultado.quantidadeDeEquilibrio, null);
  assert.equal(resultado.total, 300);
});

test('margem negativa é sinalizada em vez de escondida', () => {
  const resultado = calcularMargemDeContribuicao({ preco: 20, custoVariavel: 25, quantidade: 5 });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.margemNegativa, true);
  assert.equal(resultado.margemUnitaria, -5);
  assert.equal(resultado.total, -25);
});

test('preço inválido e valor negativo apontam o campo', () => {
  assert.equal(calcularMargemDeContribuicao({ preco: 0 }).erro, 'preco_invalido');
  assert.deepEqual(
    calcularMargemDeContribuicao({ preco: 10, quantidade: -1 }),
    { ok: false, erro: 'valor_negativo', campo: 'quantidade' },
  );
});
