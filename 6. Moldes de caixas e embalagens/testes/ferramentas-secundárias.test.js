import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCinta } from '../scripts/cálculos/calcular-cinta.js';
import { calcularDivisóriasDeCaixa } from '../scripts/cálculos/calcular-divisórias-de-caixa.js';
import { calcularSacoDePapel } from '../scripts/cálculos/calcular-saco-de-papel.js';
import { calcularAproveitamentoDeFolha } from '../scripts/cálculos/calcular-aproveitamento-de-folha.js';

test('cinta: perímetro 300 mm + sobreposição 15 mm = 315 mm (caso do catálogo)', () => {
  const resultado = calcularCinta({ perímetroMm: 300, sobreposiçãoMm: 15, alturaMm: 40 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.comprimentoTotalMm, 315);
  assert.equal(resultado.retânguloEnvolvente.larguraMm, 315);
});

test('cinta: rejeita sobreposição maior que a metade do perímetro', () => {
  assert.equal(calcularCinta({ perímetroMm: 100, sobreposiçãoMm: 60, alturaMm: 40 }).válido, false);
});

test('divisórias: grade 2×3 produz 6 compartimentos, com 2 tiras verticais e 1 horizontal', () => {
  const resultado = calcularDivisóriasDeCaixa({ comprimentoInternoMm: 200, larguraInternoMm: 150, alturaInternoMm: 80, linhas: 2, colunas: 3, espessuraMm: 2 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.compartimentos, 6);
  assert.equal(resultado.tirasVerticais.length, 2);
  assert.equal(resultado.tirasHorizontais.length, 1);
  // Cada tira vertical tem 1 entalhe (linhas-1) e cada horizontal tem 2 (colunas-1).
  assert.equal(resultado.tirasVerticais[0].segmentosDeCorte.length, 4 + 3 * 1);
  assert.equal(resultado.tirasHorizontais[0].segmentosDeCorte.length, 4 + 3 * 2);
});

test('divisórias: 1 linha e 1 coluna não precisam de nenhuma tira', () => {
  const resultado = calcularDivisóriasDeCaixa({ comprimentoInternoMm: 200, larguraInternoMm: 150, alturaInternoMm: 80, linhas: 1, colunas: 1, espessuraMm: 2 });
  assert.equal(resultado.compartimentos, 1);
  assert.equal(resultado.tirasVerticais.length, 0);
  assert.equal(resultado.tirasHorizontais.length, 0);
});

test('divisórias: rejeita grade fora da faixa aceita', () => {
  assert.equal(calcularDivisóriasDeCaixa({ comprimentoInternoMm: 200, larguraInternoMm: 150, alturaInternoMm: 80, linhas: 0, colunas: 3, espessuraMm: 2 }).válido, false);
});

test('saco de papel: monta a folha escalada com dobras nas seis posições esperadas', () => {
  const resultado = calcularSacoDePapel({ larguraMm: 120, profundidadeMm: 70, alturaMm: 200, abaSuperiorMm: 20, abaDeColagemMm: 15 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.retânguloEnvolvente.larguraMm, 120 * 2 + 70 * 2 + 15);
  assert.equal(resultado.retânguloEnvolvente.alturaMm, 20 + 200 + 70);
  // 5 dobras verticais + 2 horizontais (topo da aba superior e base do corpo).
  assert.equal(resultado.segmentosDeDobra.length, 7);
});

test('saco de papel: sem aba superior, tem uma dobra horizontal a menos', () => {
  const resultado = calcularSacoDePapel({ larguraMm: 120, profundidadeMm: 70, alturaMm: 200, abaSuperiorMm: 0, abaDeColagemMm: 15 });
  assert.equal(resultado.segmentosDeDobra.length, 6);
});

test('aproveitamento de folha: 200×280 mm com peças 50×70 mm sem espaçamento = 16 peças (caso do catálogo)', () => {
  const resultado = calcularAproveitamentoDeFolha({ larguraDaFolhaMm: 200, alturaDaFolhaMm: 280, larguraDaPeçaMm: 50, alturaDaPeçaMm: 70 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.totalDePeças, 16);
  assert.equal(resultado.melhorOrientação, 'normal');
});

test('aproveitamento de folha: escolhe a orientação girada quando ela cabe mais peças', () => {
  const resultado = calcularAproveitamentoDeFolha({ larguraDaFolhaMm: 210, alturaDaFolhaMm: 100, larguraDaPeçaMm: 90, alturaDaPeçaMm: 40 });
  // Normal: colunas=floor(210/90)=2, linhas=floor(100/40)=2 -> 4. Girada: colunas=floor(210/40)=5, linhas=floor(100/90)=1 -> 5.
  assert.equal(resultado.melhorOrientação, 'girada');
  assert.equal(resultado.totalDePeças, 5);
});

test('aproveitamento de folha: peça maior que a folha nas duas orientações é rejeitada', () => {
  assert.equal(calcularAproveitamentoDeFolha({ larguraDaFolhaMm: 100, alturaDaFolhaMm: 100, larguraDaPeçaMm: 150, alturaDaPeçaMm: 150 }).válido, false);
});
