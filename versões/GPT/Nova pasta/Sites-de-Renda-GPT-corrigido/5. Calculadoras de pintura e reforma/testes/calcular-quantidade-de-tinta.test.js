import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularQuantidadeDeTinta } from '../scripts/cálculos/calcular-quantidade-de-tinta.js';

test('caso de conferência do catálogo: 40 m², 2 demãos, 10 m²/L por demão = 8 L', () => {
  const resultado = calcularQuantidadeDeTinta({ área: 40, demãos: 2, rendimento: 10, tipoDeRendimento: 'porDemão', reservaPercentual: 0 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.áreaTotalAPintar, 80);
  assert.equal(resultado.litrosNecessários, 8);
  assert.equal(resultado.litrosComReserva, 8);
});

test('rendimento "acabado" não multiplica pelas demãos de novo', () => {
  const resultado = calcularQuantidadeDeTinta({ área: 40, demãos: 2, rendimento: 20, tipoDeRendimento: 'acabado', reservaPercentual: 0 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.áreaTotalAPintar, 40);
  assert.equal(resultado.litrosNecessários, 2);
});

test('aplica reserva percentual sobre os litros necessários', () => {
  const resultado = calcularQuantidadeDeTinta({ área: 40, demãos: 2, rendimento: 10, tipoDeRendimento: 'porDemão', reservaPercentual: 10 });
  assert.equal(resultado.litrosNecessários, 8);
  assert.equal(Math.round(resultado.litrosComReserva * 100) / 100, 8.8);
});

test('converte para embalagens arredondando para cima e mostra a sobra', () => {
  const resultado = calcularQuantidadeDeTinta({
    área: 40,
    demãos: 2,
    rendimento: 10,
    tipoDeRendimento: 'porDemão',
    reservaPercentual: 0,
    embalagens: [{ id: 'e1', nome: '3,6 L', litros: 3.6 }, { id: 'e2', nome: '18 L', litros: 18 }],
  });
  assert.equal(resultado.porEmbalagem[0].quantidade, 3); // ceil(8/3.6) = 3
  assert.equal(Math.round(resultado.porEmbalagem[0].litrosComprados * 100) / 100, 10.8);
  assert.equal(resultado.porEmbalagem[1].quantidade, 1); // ceil(8/18) = 1
  assert.equal(resultado.porEmbalagem[1].litrosComprados, 18);
});

test('rejeita área, demãos ou rendimento inválidos', () => {
  assert.equal(calcularQuantidadeDeTinta({ área: 0, demãos: 1, rendimento: 10, tipoDeRendimento: 'acabado' }).válido, false);
  assert.equal(calcularQuantidadeDeTinta({ área: 10, demãos: 0, rendimento: 10, tipoDeRendimento: 'acabado' }).válido, false);
  assert.equal(calcularQuantidadeDeTinta({ área: 10, demãos: 1, rendimento: 0, tipoDeRendimento: 'acabado' }).válido, false);
  assert.equal(calcularQuantidadeDeTinta({ área: 10, demãos: 1, rendimento: 10, tipoDeRendimento: 'inventado' }).válido, false);
});
