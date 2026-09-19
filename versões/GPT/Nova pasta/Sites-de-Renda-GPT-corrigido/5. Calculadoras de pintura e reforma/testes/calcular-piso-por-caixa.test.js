import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPisoPorCaixa } from '../scripts/cálculos/calcular-piso-por-caixa.js';

test('caso de conferência do catálogo: 20 m², 10% de margem, 2,2 m²/caixa = 10 caixas', () => {
  const resultado = calcularPisoPorCaixa({ área: 20, margemPercentual: 10, coberturaPorCaixa: 2.2 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.áreaAjustada, 22);
  assert.equal(resultado.caixas, 10);
});

test('não compra caixa extra por erro de ponto flutuante (22 / 2,2)', () => {
  // 22 / 2.2 em ponto flutuante binário vale 10,000000000000002 — não pode virar 11 caixas.
  assert.equal(22 / 2.2 > 10, true);
  const resultado = calcularPisoPorCaixa({ área: 20, margemPercentual: 10, coberturaPorCaixa: 2.2 });
  assert.equal(resultado.caixas, 10);
});

test('arredonda para cima quando sobra parte de uma caixa', () => {
  const resultado = calcularPisoPorCaixa({ área: 10, margemPercentual: 0, coberturaPorCaixa: 3 });
  assert.equal(resultado.caixas, 4); // 10/3 = 3,333... -> 4
  assert.equal(resultado.áreaComprada, 12);
  assert.equal(Math.round(resultado.sobraEmÁrea * 100) / 100, 2);
});

test('sem margem, área múltipla exata da caixa não soma caixa extra', () => {
  const resultado = calcularPisoPorCaixa({ área: 6, margemPercentual: 0, coberturaPorCaixa: 2 });
  assert.equal(resultado.caixas, 3);
});

test('rejeita área zero, margem negativa ou cobertura inválida', () => {
  assert.equal(calcularPisoPorCaixa({ área: 0, margemPercentual: 0, coberturaPorCaixa: 2 }).válido, false);
  assert.equal(calcularPisoPorCaixa({ área: 10, margemPercentual: -1, coberturaPorCaixa: 2 }).válido, false);
  assert.equal(calcularPisoPorCaixa({ área: 10, margemPercentual: 0, coberturaPorCaixa: 0 }).válido, false);
});
