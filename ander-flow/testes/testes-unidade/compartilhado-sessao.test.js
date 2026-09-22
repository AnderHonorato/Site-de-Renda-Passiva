import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adicionarComLimite, limitarLista } from '../../frontend/compartilhado/compartilhado-sessao.js';

test('adicionarComLimite coloca o valor no início, sem repetir', () => {
  assert.deepEqual(adicionarComLimite(['a', 'b'], 'a', 8), ['a', 'b']);
  assert.deepEqual(adicionarComLimite(['a', 'b'], 'c', 8), ['c', 'a', 'b']);
});

test('adicionarComLimite corta no máximo informado', () => {
  const lista = ['a', 'b', 'c', 'd'];
  assert.deepEqual(adicionarComLimite(lista, 'e', 3), ['e', 'a', 'b']);
});

test('limitarLista preserva a ordem e remove repetidos', () => {
  assert.deepEqual(limitarLista(['a', 'b', 'a', 'c'], 10), ['a', 'b', 'c']);
});

test('limitarLista corta no máximo informado', () => {
  assert.deepEqual(limitarLista(['a', 'b', 'c', 'd'], 2), ['a', 'b']);
});
