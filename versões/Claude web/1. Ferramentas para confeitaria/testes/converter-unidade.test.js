import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterUnidade } from '../scripts/cálculos/converter-unidade.js';

test('converte massa entre g e kg', () => {
  assert.equal(converterUnidade(500, 'g', 'kg').valor, 0.5);
  assert.equal(converterUnidade(1, 'kg', 'g').valor, 1000);
});

test('converte volume entre ml e L', () => {
  assert.equal(converterUnidade(2, 'L', 'ml').valor, 2000);
  assert.equal(converterUnidade(250, 'ml', 'L').valor, 0.25);
});

test('unidade não muda ao converter para a mesma unidade', () => {
  assert.equal(converterUnidade(5, 'unidade', 'unidade').valor, 5);
  assert.equal(converterUnidade(3, 'g', 'g').valor, 3);
});

test('bloqueia conversão entre grandezas diferentes (massa e volume)', () => {
  assert.equal(converterUnidade(1, 'g', 'ml').válido, false);
  assert.equal(converterUnidade(1, 'kg', 'L').válido, false);
  assert.equal(converterUnidade(1, 'unidade', 'g').válido, false);
});

test('rejeita quantidade e unidade inválidas', () => {
  assert.equal(converterUnidade(-1, 'g', 'kg').válido, false);
  assert.equal(converterUnidade(Number.NaN, 'g', 'kg').válido, false);
  assert.equal(converterUnidade(1, 'litro', 'ml').válido, false);
});
