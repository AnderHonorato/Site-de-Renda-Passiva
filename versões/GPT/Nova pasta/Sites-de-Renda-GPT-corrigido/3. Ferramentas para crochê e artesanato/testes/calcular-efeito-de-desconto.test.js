import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEfeitoDeDesconto } from '../scripts/cálculos/calcular-efeito-de-desconto.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência do catálogo: preço R$ 100, custo R$ 60, desconto 10% = sobra R$ 30', () => {
  const resultado = calcularEfeitoDeDesconto({ preço: 100, custo: 60, descontoPercentual: 10 });
  assert.equal(resultado.válido, true);
  próximo(resultado.preçoComDesconto, 90);
  próximo(resultado.contribuição, 30);
  assert.equal(resultado.prejuízo, false);
});

test('avisa claramente quando o desconto derruba o preço abaixo do custo', () => {
  const resultado = calcularEfeitoDeDesconto({ preço: 100, custo: 95, descontoPercentual: 10 });
  próximo(resultado.contribuição, -5);
  assert.equal(resultado.prejuízo, true);
});

test('rejeita preço zero e desconto fora da faixa', () => {
  assert.equal(calcularEfeitoDeDesconto({ preço: 0, custo: 10, descontoPercentual: 10 }).válido, false);
  assert.equal(calcularEfeitoDeDesconto({ preço: 100, custo: 10, descontoPercentual: 100 }).válido, false);
  assert.equal(calcularEfeitoDeDesconto({ preço: 100, custo: 10, descontoPercentual: -5 }).válido, false);
});
