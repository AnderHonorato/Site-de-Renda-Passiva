import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escalarIngredientes } from '../scripts/cálculos/escalar-ingredientes.js';

test('multiplica a quantidade usada de cada ingrediente pelo fator', () => {
  const ingredientes = [
    { nome: 'Farinha', quantidadeUsada: 500, unidadeUsada: 'g' },
    { nome: 'Ovos', quantidadeUsada: 3, unidadeUsada: 'unidade' },
  ];
  const escalados = escalarIngredientes(ingredientes, 2.5);
  assert.equal(escalados[0].quantidadeUsada, 1250);
  assert.equal(escalados[1].quantidadeUsada, 7.5);
  // não muda o array original
  assert.equal(ingredientes[0].quantidadeUsada, 500);
});

test('rejeita fator inválido', () => {
  assert.throws(() => escalarIngredientes([{ quantidadeUsada: 1 }], 0));
  assert.throws(() => escalarIngredientes([{ quantidadeUsada: 1 }], -2));
  assert.throws(() => escalarIngredientes([{ quantidadeUsada: 1 }], Number.NaN));
});
