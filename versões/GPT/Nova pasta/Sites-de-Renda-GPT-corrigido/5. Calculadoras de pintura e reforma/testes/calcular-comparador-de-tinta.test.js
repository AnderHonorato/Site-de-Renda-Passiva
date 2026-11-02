import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularComparadorDeTinta } from '../scripts/cálculos/calcular-comparador-de-tinta.js';

test('caso de conferência do catálogo: lata de 3,6 L por R$ 90 = R$ 25 por litro', () => {
  const resultado = calcularComparadorDeTinta({
    embalagens: [
      { id: 'e1', nome: 'Lata 3,6 L', litros: 3.6, preço: 90, coberturaDeclaradaEmM2: 36 },
      { id: 'e2', nome: 'Balde 18 L', litros: 18, preço: 400, coberturaDeclaradaEmM2: 180 },
    ],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.itens[0].custoPorLitro, 25);
});

test('aponta a embalagem com menor custo por litro e por m² cobrido', () => {
  const resultado = calcularComparadorDeTinta({
    embalagens: [
      { id: 'barata-por-litro', litros: 1, preço: 10, coberturaDeclaradaEmM2: 5 }, // 10/L, 2/m²
      { id: 'barata-por-m2', litros: 5, preço: 40, coberturaDeclaradaEmM2: 50 }, // 8/L, 0.8/m²
    ],
  });
  assert.equal(resultado.melhorPorM2Id, 'barata-por-m2');
});

test('exige ao menos duas embalagens para comparar', () => {
  assert.equal(calcularComparadorDeTinta({ embalagens: [{ id: 'e1', litros: 1, preço: 1, coberturaDeclaradaEmM2: 1 }] }).válido, false);
});

test('rejeita embalagem sem cobertura declarada', () => {
  const resultado = calcularComparadorDeTinta({
    embalagens: [
      { id: 'e1', litros: 1, preço: 10, coberturaDeclaradaEmM2: 0 },
      { id: 'e2', litros: 1, preço: 10, coberturaDeclaradaEmM2: 10 },
    ],
  });
  assert.equal(resultado.válido, false);
});
