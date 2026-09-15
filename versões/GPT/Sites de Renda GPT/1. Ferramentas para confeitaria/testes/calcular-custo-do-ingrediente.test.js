import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCustoDoIngrediente } from '../scripts/cálculos/calcular-custo-do-ingrediente.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('custo proporcional simples, mesma unidade', () => {
  const resultado = calcularCustoDoIngrediente({ nome: 'Novelo', preçoComprado: 20, quantidadeComprada: 100, unidadeComprada: 'g', quantidadeUsada: 25, unidadeUsada: 'g' });
  assert.equal(resultado.válido, true);
  próximo(resultado.custoConsumido, 5);
  assert.equal(resultado.pacotesNecessários, 1);
  próximo(resultado.dinheiroNecessário, 20);
  próximo(resultado.custoDeEstoque, 15);
});

test('converte a quantidade usada para a unidade comprada antes de calcular', () => {
  const resultado = calcularCustoDoIngrediente({ nome: 'Farinha', preçoComprado: 6, quantidadeComprada: 1, unidadeComprada: 'kg', quantidadeUsada: 500, unidadeUsada: 'g' });
  próximo(resultado.custoConsumido, 3);
});

test('quando o uso ultrapassa uma embalagem, soma pacotes inteiros', () => {
  const resultado = calcularCustoDoIngrediente({ nome: 'Chocolate', preçoComprado: 10, quantidadeComprada: 100, unidadeComprada: 'g', quantidadeUsada: 250, unidadeUsada: 'g' });
  assert.equal(resultado.pacotesNecessários, 3);
  próximo(resultado.dinheiroNecessário, 30);
  próximo(resultado.custoConsumido, 25);
  próximo(resultado.custoDeEstoque, 5);
});

test('rejeita unidades incompatíveis (massa e volume)', () => {
  const resultado = calcularCustoDoIngrediente({ nome: 'Leite', preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: 'L', quantidadeUsada: 200, unidadeUsada: 'g' });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /Leite/);
});

test('bloqueia quantidade comprada zero e valores negativos', () => {
  assert.equal(calcularCustoDoIngrediente({ nome: 'X', preçoComprado: 5, quantidadeComprada: 0, unidadeComprada: 'g', quantidadeUsada: 10, unidadeUsada: 'g' }).válido, false);
  assert.equal(calcularCustoDoIngrediente({ nome: 'X', preçoComprado: -5, quantidadeComprada: 100, unidadeComprada: 'g', quantidadeUsada: 10, unidadeUsada: 'g' }).válido, false);
  assert.equal(calcularCustoDoIngrediente({ nome: 'X', preçoComprado: 5, quantidadeComprada: 100, unidadeComprada: 'g', quantidadeUsada: 0, unidadeUsada: 'g' }).válido, false);
});
