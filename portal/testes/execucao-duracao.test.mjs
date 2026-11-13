import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverDuracaoApresentacao } from '../scripts/núcleo/execucao-visual.js';

test('a duração padrão mantém ferramentas rápidas em dez segundos', () => {
  assert.equal(resolverDuracaoApresentacao(), 10_000);
  assert.equal(resolverDuracaoApresentacao({ tipo: 'analise' }), 10_000);
});

test('arquivos, campos de arquivo e categorias de PDF/imagem recebem vinte segundos', () => {
  assert.equal(resolverDuracaoApresentacao({ tipo: 'arquivo' }), 20_000);
  assert.equal(resolverDuracaoApresentacao({ campos: [{ nome: 'entrada', tipo: 'file' }] }), 20_000);
  assert.equal(resolverDuracaoApresentacao({ campos: ['arquivo'] }), 20_000);
  assert.equal(resolverDuracaoApresentacao({ cat: 'pdf' }), 20_000);
  assert.equal(resolverDuracaoApresentacao({ cat: 'Imagens' }), 20_000);
  assert.equal(resolverDuracaoApresentacao({ cat: 'imagem' }), 20_000);
});

test('importações permanecem rápidas mesmo com campo de arquivo', () => {
  assert.equal(resolverDuracaoApresentacao({ tipo: 'importacao', campos: [{ tipo: 'file' }] }), 10_000);
});

test('análises demoradas, profissionais e exportações PDF/XLSX recebem quinze segundos', () => {
  assert.equal(resolverDuracaoApresentacao({ profissional: true }), 15_000);
  assert.equal(resolverDuracaoApresentacao({ demorada: true }), 15_000);
  assert.equal(resolverDuracaoApresentacao({ exporta: ['csv', 'pdf'] }), 15_000);
  assert.equal(resolverDuracaoApresentacao({ exporta: 'xlsx' }), 15_000);
});
