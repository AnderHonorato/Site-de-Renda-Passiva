import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTextoParaPdf } from '../../frontend/compartilhado/compartilhado-ferramenta.js';

test('normalizarTextoParaPdf troca o sinal menos tipográfico pelo hífen comum', () => {
  assert.equal(normalizarTextoParaPdf('R$ −74,41'), 'R$ -74,41');
});

test('normalizarTextoParaPdf não altera texto sem o sinal', () => {
  assert.equal(normalizarTextoParaPdf('R$ 74,41'), 'R$ 74,41');
});

test('normalizarTextoParaPdf trata valor nulo como texto vazio', () => {
  assert.equal(normalizarTextoParaPdf(null), '');
});
