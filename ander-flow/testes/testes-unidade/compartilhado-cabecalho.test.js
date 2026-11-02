import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deveMarcarAtual } from '../../frontend/compartilhado/compartilhado-cabecalho.js';

test('deveMarcarAtual bate igual quando a página é a mesma do item', () => {
  assert.equal(deveMarcarAtual('conta', 'conta'), true);
  assert.equal(deveMarcarAtual('conta', 'planos'), false);
});

test('deveMarcarAtual marca "ferramentas" quando a página é o slug de uma ferramenta', () => {
  assert.equal(deveMarcarAtual('ferramentas', 'preco-de-venda'), true);
});

test('deveMarcarAtual não marca "ferramentas" para outra página conhecida', () => {
  assert.equal(deveMarcarAtual('ferramentas', 'conta'), false);
});

test('deveMarcarAtual devolve false sem os dois valores', () => {
  assert.equal(deveMarcarAtual('', 'conta'), false);
  assert.equal(deveMarcarAtual('conta', ''), false);
});

test('deveMarcarAtual na Início marca só "inicio", nunca "ferramentas"', () => {
  assert.equal(deveMarcarAtual('inicio', 'principal'), true);
  assert.equal(deveMarcarAtual('ferramentas', 'principal'), false);
  assert.equal(deveMarcarAtual('conta', 'principal'), false);
});
