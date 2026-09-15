import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularAjusteDeQuantidade } from '../scripts/cálculos/calcular-ajuste-de-quantidade.js';

test('caso de conferência: receita rende 20, pedido 50 → fator 2,5 ou 3 lotes', () => {
  const resultado = calcularAjusteDeQuantidade({ rendimentoOriginal: 20, quantidadeDesejada: 50 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.fatorDeEscala, 2.5);
  assert.equal(resultado.rendimentoComFator, 50);
  assert.equal(resultado.lotesInteiros, 3);
  assert.equal(resultado.rendimentoComLotesInteiros, 60);
});

test('quando a quantidade desejada é múltiplo exato, lotes batem com o fator', () => {
  const resultado = calcularAjusteDeQuantidade({ rendimentoOriginal: 10, quantidadeDesejada: 30 });
  assert.equal(resultado.fatorDeEscala, 3);
  assert.equal(resultado.lotesInteiros, 3);
  assert.equal(resultado.rendimentoComLotesInteiros, 30);
});

test('não erra em fronteira de ponto flutuante (22 ÷ 2,2 não vira 11 lotes)', () => {
  const resultado = calcularAjusteDeQuantidade({ rendimentoOriginal: 2.2, quantidadeDesejada: 22 });
  assert.equal(resultado.lotesInteiros, 10);
});

test('rejeita rendimento ou quantidade desejada inválidos', () => {
  assert.equal(calcularAjusteDeQuantidade({ rendimentoOriginal: 0, quantidadeDesejada: 10 }).válido, false);
  assert.equal(calcularAjusteDeQuantidade({ rendimentoOriginal: 10, quantidadeDesejada: 0 }).válido, false);
  assert.equal(calcularAjusteDeQuantidade({ rendimentoOriginal: -5, quantidadeDesejada: 10 }).válido, false);
});
