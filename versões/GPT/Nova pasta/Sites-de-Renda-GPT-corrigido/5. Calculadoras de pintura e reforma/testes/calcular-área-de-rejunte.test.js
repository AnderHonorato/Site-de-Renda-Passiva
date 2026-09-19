import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularÁreaDeRejunte } from '../scripts/cálculos/calcular-área-de-rejunte.js';

test('calcula comprimento de junta, volume e massa a partir das medidas da peça', () => {
  const resultado = calcularÁreaDeRejunte({
    área: 10,
    comprimentoDaPeçaEmMm: 300,
    larguraDaPeçaEmMm: 300,
    larguraDaJuntaEmMm: 5,
    profundidadeDaJuntaEmMm: 8,
    densidadeEmKgPorLitro: 1.6,
  });
  assert.equal(resultado.válido, true);
  // comprimento de junta por m² = 1/0,3 + 1/0,3 = 6,6667; total = 66,667 m
  assert.equal(Math.round(resultado.comprimentoTotalDeJuntaEmM * 100) / 100, 66.67);
  // volume = 66,667 * 0,005 * 0,008 m³ = 0,0026667 m³ = 2,6667 L
  assert.equal(Math.round(resultado.volumeEmLitros * 1000) / 1000, 2.667);
  // massa = 2,6667 L * 1,6 kg/L = 4,2667 kg
  assert.equal(Math.round(resultado.massaEmKg * 1000) / 1000, 4.267);
});

test('peças maiores geram menos comprimento de junta por m²', () => {
  const peçaPequena = calcularÁreaDeRejunte({ área: 10, comprimentoDaPeçaEmMm: 100, larguraDaPeçaEmMm: 100, larguraDaJuntaEmMm: 3, profundidadeDaJuntaEmMm: 6, densidadeEmKgPorLitro: 1.6 });
  const peçaGrande = calcularÁreaDeRejunte({ área: 10, comprimentoDaPeçaEmMm: 600, larguraDaPeçaEmMm: 600, larguraDaJuntaEmMm: 3, profundidadeDaJuntaEmMm: 6, densidadeEmKgPorLitro: 1.6 });
  assert.ok(peçaPequena.massaEmKg > peçaGrande.massaEmKg);
});

test('rejeita medidas ou densidade ausentes/zeradas', () => {
  assert.equal(calcularÁreaDeRejunte({ área: 0, comprimentoDaPeçaEmMm: 300, larguraDaPeçaEmMm: 300, larguraDaJuntaEmMm: 5, profundidadeDaJuntaEmMm: 8, densidadeEmKgPorLitro: 1.6 }).válido, false);
  assert.equal(calcularÁreaDeRejunte({ área: 10, comprimentoDaPeçaEmMm: 300, larguraDaPeçaEmMm: 300, larguraDaJuntaEmMm: 5, profundidadeDaJuntaEmMm: 8, densidadeEmKgPorLitro: 0 }).válido, false);
});
