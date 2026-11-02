import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPreçoPorUnidade } from '../scripts/cálculos/calcular-preço-por-unidade.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência: 500 g por R$ 12 (R$ 24/kg) contra 1 kg por R$ 20 → o quilo é mais econômico', () => {
  const resultado = calcularPreçoPorUnidade({
    embalagens: [
      { nome: 'Pacote pequeno', quantidade: 500, unidade: 'g', preço: 12 },
      { nome: 'Pacote grande', quantidade: 1, unidade: 'kg', preço: 20 },
    ],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.unidadeDeReferência, 'kg');
  próximo(resultado.embalagens[0].preçoPorUnidadeDeReferência, 24);
  próximo(resultado.embalagens[1].preçoPorUnidadeDeReferência, 20);
  assert.equal(resultado.maisEconômicaNome, 'Pacote grande');
});

test('compara até quatro embalagens em volume', () => {
  const resultado = calcularPreçoPorUnidade({
    embalagens: [
      { nome: 'A', quantidade: 250, unidade: 'ml', preço: 5 },
      { nome: 'B', quantidade: 1, unidade: 'L', preço: 18 },
      { nome: 'C', quantidade: 2, unidade: 'L', preço: 30 },
    ],
  });
  assert.equal(resultado.maisEconômicaNome, 'C');
});

test('recusa grandezas diferentes e quantidade fora do intervalo permitido', () => {
  assert.equal(
    calcularPreçoPorUnidade({
      embalagens: [
        { nome: 'A', quantidade: 500, unidade: 'g', preço: 12 },
        { nome: 'B', quantidade: 1, unidade: 'L', preço: 20 },
      ],
    }).válido,
    false,
  );
  assert.equal(calcularPreçoPorUnidade({ embalagens: [{ nome: 'A', quantidade: 1, unidade: 'kg', preço: 1 }] }).válido, false);
  assert.equal(
    calcularPreçoPorUnidade({
      embalagens: [
        { nome: 'A', quantidade: 0, unidade: 'kg', preço: 1 },
        { nome: 'B', quantidade: 1, unidade: 'kg', preço: 1 },
      ],
    }).válido,
    false,
  );
});
