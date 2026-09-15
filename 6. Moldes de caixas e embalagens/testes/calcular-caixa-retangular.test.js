import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCaixaRetangular } from '../scripts/cálculos/calcular-caixa-retangular.js';

test('caixa 100×60×40 mm com aba de 15 mm é válida e traz medidas internas preservadas', () => {
  const resultado = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 0, tamanhoDaAbaMm: 15 });
  assert.equal(resultado.válido, true);
  assert.deepEqual(resultado.medidasInternasMm, { comprimento: 100, largura: 60, altura: 40 });
  assert.equal(resultado.retânguloEnvolvente.larguraMm, 2 * 40 + 100);
});

test('espessura do papel aumenta a base do molde mas mantém a medida interna nominal informada', () => {
  const semEspessura = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 });
  const comEspessura = calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 0.5, tamanhoDaAbaMm: 15 });
  assert.equal(comEspessura.medidasInternasMm.comprimento, 100);
  assert.ok(comEspessura.retânguloEnvolvente.larguraMm > semEspessura.retânguloEnvolvente.larguraMm);
});

test('rejeita dimensões fora da faixa e aba maior que a altura', () => {
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 0, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 15 }).válido, false);
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 41 }).válido, false);
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 0 }).válido, false);
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 5000, larguraInternoMm: 60, alturaInternoMm: 40, tamanhoDaAbaMm: 10 }).válido, false);
});

test('rejeita espessura fora da faixa aceita', () => {
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: -1, tamanhoDaAbaMm: 10 }).válido, false);
  assert.equal(calcularCaixaRetangular({ comprimentoInternoMm: 100, larguraInternoMm: 60, alturaInternoMm: 40, espessuraDoPapelMm: 10, tamanhoDaAbaMm: 10 }).válido, false);
});
