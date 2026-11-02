import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deveMostrarFaixa } from '../../frontend/compartilhado/compartilhado-primeira-visita.js';

test('deveMostrarFaixa é true quando nunca foi salvo', () => {
  assert.equal(deveMostrarFaixa(null), true);
  assert.equal(deveMostrarFaixa(undefined), true);
});

test('deveMostrarFaixa é false quando já existe valor salvo', () => {
  assert.equal(deveMostrarFaixa('1'), false);
});
