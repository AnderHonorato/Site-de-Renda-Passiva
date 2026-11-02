import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarRegistroDeReceita } from '../scripts/validação/validar-registro-de-receita.js';

const receitaVálida = {
  nome: 'Brigadeiro',
  ingredientes: [{ nome: 'Leite condensado', preçoComprado: 6, quantidadeComprada: 1, unidadeComprada: 'unidade', quantidadeUsada: 1, unidadeUsada: 'unidade' }],
  rendimentoAproveitável: 30,
  embalagemDeVendaPorUnidade: 0.1,
  tempoDePreparoEmMinutos: 40,
  valorDaHora: 20,
  custosAdicionais: 2,
};

test('aceita uma receita bem formada', () => {
  assert.equal(validarRegistroDeReceita(receitaVálida), true);
});

test('recusa nome vazio ou grande demais', () => {
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, nome: '' }), false);
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, nome: 'x'.repeat(121) }), false);
});

test('recusa lista de ingredientes vazia ou com item inválido (importação maliciosa)', () => {
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, ingredientes: [] }), false);
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, ingredientes: [{ nome: 'X', preçoComprado: -5, quantidadeComprada: 1, unidadeComprada: 'g', quantidadeUsada: 1, unidadeUsada: 'g' }] }), false);
  assert.equal(
    validarRegistroDeReceita({ ...receitaVálida, ingredientes: [{ nome: 'X', preçoComprado: 5, quantidadeComprada: 1, unidadeComprada: '<script>', quantidadeUsada: 1, unidadeUsada: 'g' }] }),
    false,
  );
});

test('recusa rendimento não inteiro ou fora da faixa', () => {
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, rendimentoAproveitável: 1.5 }), false);
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, rendimentoAproveitável: 0 }), false);
});

test('recusa registro nulo, não-objeto ou com campos com prototype poluído', () => {
  assert.equal(validarRegistroDeReceita(null), false);
  assert.equal(validarRegistroDeReceita('receita'), false);
  assert.equal(validarRegistroDeReceita({ ...receitaVálida, custosAdicionais: -1 }), false);
});
