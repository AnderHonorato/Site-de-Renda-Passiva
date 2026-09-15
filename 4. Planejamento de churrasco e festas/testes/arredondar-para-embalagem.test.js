import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arredondarParaEmbalagem } from '../scripts/cálculos/arredondar-para-embalagem.js';

test('exemplo do prompt: necessidade 1,2 kg e pacote 500 g → comprar 3 pacotes', () => {
  const resultado = arredondarParaEmbalagem(1200, 500);
  assert.equal(resultado.válido, true);
  assert.equal(resultado.unidadesDeEmbalagem, 3);
  assert.equal(resultado.quantidadeComprada, 1500);
});

test('sem embalagem informada, a quantidade comprada é a própria necessidade', () => {
  const resultado = arredondarParaEmbalagem(450, null);
  assert.equal(resultado.válido, true);
  assert.equal(resultado.unidadesDeEmbalagem, null);
  assert.equal(resultado.quantidadeComprada, 450);
});

test('necessidade exatamente múltipla da embalagem não sobra pacote extra por erro de ponto flutuante', () => {
  const resultado = arredondarParaEmbalagem(22, 2.2);
  assert.equal(resultado.unidadesDeEmbalagem, 10);
});

test('necessidade zero não compra nada', () => {
  const resultado = arredondarParaEmbalagem(0, 500);
  assert.equal(resultado.unidadesDeEmbalagem, 0);
  assert.equal(resultado.quantidadeComprada, 0);
});

test('rejeita necessidade negativa e embalagem zero ou negativa', () => {
  assert.equal(arredondarParaEmbalagem(-1, 500).válido, false);
  assert.equal(arredondarParaEmbalagem(100, -5).válido, false);
  assert.equal(arredondarParaEmbalagem(Number.NaN, 500).válido, false);
});
