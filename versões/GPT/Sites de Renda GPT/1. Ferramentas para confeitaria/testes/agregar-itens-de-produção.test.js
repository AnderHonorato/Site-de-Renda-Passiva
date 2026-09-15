import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agregarItensDeProdução } from '../scripts/cálculos/agregar-itens-de-produção.js';

test('soma o mesmo ingrediente de duas receitas multiplicado pelos lotes', () => {
  const resultado = agregarItensDeProdução({
    linhas: [
      { nomeDaReceita: 'Brigadeiro', lotes: 2, ingredientes: [{ nome: 'Chocolate em pó', unidadeUsada: 'g', quantidadeUsada: 100, unidadeComprada: 'kg', quantidadeComprada: 1, preçoComprado: 30 }] },
      { nomeDaReceita: 'Brownie', lotes: 1, ingredientes: [{ nome: 'chocolate em pó', unidadeUsada: 'kg', quantidadeUsada: 0.3, unidadeComprada: 'kg', quantidadeComprada: 1, preçoComprado: 30 }] },
    ],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.itens.length, 1);
  // A unidade do primeiro registro (g) é mantida: 2×100g + 0,3kg convertido (300g) = 500g.
  assert.equal(resultado.itens[0].unidadeNecessária, 'g');
  assert.ok(Math.abs(resultado.itens[0].quantidadeNecessária - 500) < 1e-9);
});

test('rejeita mesmo ingrediente com unidades incompatíveis entre receitas', () => {
  const resultado = agregarItensDeProdução({
    linhas: [
      { nomeDaReceita: 'A', lotes: 1, ingredientes: [{ nome: 'Leite', unidadeUsada: 'ml', quantidadeUsada: 200, unidadeComprada: 'L', quantidadeComprada: 1, preçoComprado: 5 }] },
      { nomeDaReceita: 'B', lotes: 1, ingredientes: [{ nome: 'Leite', unidadeUsada: 'g', quantidadeUsada: 200, unidadeComprada: 'L', quantidadeComprada: 1, preçoComprado: 5 }] },
    ],
  });
  assert.equal(resultado.válido, false);
});

test('rejeita lotes zero/negativos e lista vazia', () => {
  assert.equal(agregarItensDeProdução({ linhas: [] }).válido, false);
  assert.equal(agregarItensDeProdução({ linhas: [{ nomeDaReceita: 'A', lotes: 0, ingredientes: [] }] }).válido, false);
});
