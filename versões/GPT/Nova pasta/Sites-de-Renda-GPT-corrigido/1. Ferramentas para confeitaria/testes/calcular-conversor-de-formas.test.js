import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularConversorDeFormas } from '../scripts/cálculos/calcular-conversor-de-formas.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência: formas redondas de 20 cm para 30 cm → fator 2,25', () => {
  const resultado = calcularConversorDeFormas({ origem: { tipo: 'redonda', diâmetro: 20 }, destino: { tipo: 'redonda', diâmetro: 30 } });
  assert.equal(resultado.válido, true);
  próximo(resultado.fatorDeConversão, 2.25);
});

test('converte quantidade original quando informada', () => {
  const resultado = calcularConversorDeFormas({ origem: { tipo: 'redonda', diâmetro: 20 }, destino: { tipo: 'redonda', diâmetro: 30 }, quantidadeOriginal: 1000 });
  próximo(resultado.quantidadeConvertida, 2250);
});

test('compara formas diferentes (quadrada para retangular)', () => {
  const resultado = calcularConversorDeFormas({ origem: { tipo: 'quadrada', lado: 20 }, destino: { tipo: 'retangular', largura: 20, comprimento: 30 } });
  próximo(resultado.fatorDeConversão, 1.5);
});

test('rejeita dimensões inválidas ou forma desconhecida', () => {
  assert.equal(calcularConversorDeFormas({ origem: { tipo: 'redonda', diâmetro: 0 }, destino: { tipo: 'redonda', diâmetro: 30 } }).válido, false);
  assert.equal(calcularConversorDeFormas({ origem: { tipo: 'redonda', diâmetro: 20 }, destino: { tipo: 'oval', diâmetro: 30 } }).válido, false);
});
