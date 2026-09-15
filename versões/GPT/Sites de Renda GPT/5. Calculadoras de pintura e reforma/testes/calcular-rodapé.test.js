import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRodapé } from '../scripts/cálculos/calcular-rodapé.js';

test('caso de conferência do catálogo: 18 m úteis, barra de 2 m, sem perda = 9 barras', () => {
  const resultado = calcularRodapé({ lados: [18], trechosSemInstalação: [], perdaPercentual: 0, comprimentoDaBarra: 2 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.perímetroÚtil, 18);
  assert.equal(resultado.barras, 9);
});

test('soma os lados e desconta os trechos sem instalação (vãos de porta)', () => {
  const resultado = calcularRodapé({ lados: [4, 3, 4, 3], trechosSemInstalação: [0.8, 0.9], perdaPercentual: 0, comprimentoDaBarra: 2 });
  assert.equal(resultado.perímetroTotal, 14);
  assert.equal(Math.round(resultado.perímetroÚtil * 100) / 100, 12.3);
});

test('aplica perda percentual antes de arredondar por barra', () => {
  const resultado = calcularRodapé({ lados: [10], trechosSemInstalação: [], perdaPercentual: 10, comprimentoDaBarra: 2 });
  assert.equal(resultado.comprimentoComPerda, 11);
  assert.equal(resultado.barras, 6); // 11/2 = 5,5 -> 6
});

test('rejeita trechos sem instalação maiores do que o perímetro', () => {
  const resultado = calcularRodapé({ lados: [2], trechosSemInstalação: [3], perdaPercentual: 0, comprimentoDaBarra: 1 });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /somam mais do que o perímetro/);
});

test('rejeita lado zero ou comprimento de barra inválido', () => {
  assert.equal(calcularRodapé({ lados: [0], comprimentoDaBarra: 2 }).válido, false);
  assert.equal(calcularRodapé({ lados: [5], comprimentoDaBarra: 0 }).válido, false);
  assert.equal(calcularRodapé({ lados: [], comprimentoDaBarra: 2 }).válido, false);
});
