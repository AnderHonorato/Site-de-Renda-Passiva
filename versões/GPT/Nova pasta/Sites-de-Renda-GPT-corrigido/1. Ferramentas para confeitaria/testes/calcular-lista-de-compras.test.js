import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularListaDeCompras } from '../scripts/cálculos/calcular-lista-de-compras.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência: necessidade 1,2 kg e pacote 500 g → 3 pacotes', () => {
  const resultado = calcularListaDeCompras({
    itens: [{ nome: 'Farinha', unidadeNecessária: 'kg', quantidadeNecessária: 1.2, unidadeComprada: 'g', quantidadeComprada: 500, preçoComprado: 5 }],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.itens[0].pacotes, 3);
  próximo(resultado.itens[0].custoDosPacotes, 15);
  próximo(resultado.itens[0].sobraEmReais, 3);
  próximo(resultado.custoTotal, 15);
});

test('não compra pacote extra por erro de ponto flutuante quando a divisão é exata', () => {
  const resultado = calcularListaDeCompras({
    itens: [{ nome: 'Manteiga', unidadeNecessária: 'g', quantidadeNecessária: 22, unidadeComprada: 'g', quantidadeComprada: 2.2, preçoComprado: 1 }],
  });
  assert.equal(resultado.itens[0].pacotes, 10);
});

test('soma o custo total de vários ingredientes', () => {
  const resultado = calcularListaDeCompras({
    itens: [
      { nome: 'Farinha', unidadeNecessária: 'kg', quantidadeNecessária: 1, unidadeComprada: 'kg', quantidadeComprada: 1, preçoComprado: 6 },
      { nome: 'Açúcar', unidadeNecessária: 'kg', quantidadeNecessária: 1.5, unidadeComprada: 'kg', quantidadeComprada: 1, preçoComprado: 4 },
    ],
  });
  próximo(resultado.custoTotal, 6 + 8);
});

test('rejeita unidade incompatível e lista vazia', () => {
  assert.equal(calcularListaDeCompras({ itens: [] }).válido, false);
  assert.equal(
    calcularListaDeCompras({ itens: [{ nome: 'Leite', unidadeNecessária: 'ml', quantidadeNecessária: 100, unidadeComprada: 'kg', quantidadeComprada: 1, preçoComprado: 5 }] }).válido,
    false,
  );
});
