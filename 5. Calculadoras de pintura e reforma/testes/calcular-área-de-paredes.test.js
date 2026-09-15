import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularÁreaDeParedes } from '../scripts/cálculos/calcular-área-de-paredes.js';

test('caso de conferência do catálogo: parede 4×3 m menos porta de 2 m² = 10 m²', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [{ id: 's1', nome: 'Parede', largura: 4, altura: 3 }],
    aberturas: [{ id: 'a1', nome: 'Porta', superfícieId: 's1', largura: 1, altura: 2, descontar: true }],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.áreaBruta, 12);
  assert.equal(resultado.áreaDeAberturasDescontadas, 2);
  assert.equal(resultado.áreaÚtil, 10);
});

test('soma várias superfícies e só desconta aberturas marcadas para desconto', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [
      { id: 's1', nome: 'Parede A', largura: 5, altura: 2.6 },
      { id: 's2', nome: 'Parede B', largura: 3, altura: 2.6 },
    ],
    aberturas: [
      { id: 'a1', nome: 'Janela', superfícieId: 's1', largura: 1.2, altura: 1, descontar: true },
      { id: 'a2', nome: 'Porta', superfícieId: 's2', largura: 0.8, altura: 2.1, descontar: false },
    ],
  });
  assert.equal(resultado.válido, true);
  // 5*2.6 + 3*2.6 = 13 + 7.8 = 20.8; só a janela (1.2) é descontada
  assert.equal(Math.round(resultado.áreaBruta * 100) / 100, 20.8);
  assert.equal(resultado.áreaDeAberturasDescontadas, 1.2);
  assert.equal(Math.round(resultado.áreaÚtil * 100) / 100, 19.6);
});

test('rejeita abertura maior do que a superfície correspondente', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [{ id: 's1', nome: 'Parede pequena', largura: 1, altura: 1 }],
    aberturas: [{ id: 'a1', nome: 'Porta grande', superfícieId: 's1', largura: 2, altura: 2, descontar: true }],
  });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /maior do que a superfície/);
});

test('rejeita soma de aberturas descontadas maior do que a superfície', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [{ id: 's1', nome: 'Parede', largura: 3, altura: 2 }], // área 6
    aberturas: [
      { id: 'a1', superfícieId: 's1', largura: 2, altura: 1.5, descontar: true }, // 3
      { id: 'a2', superfícieId: 's1', largura: 2.5, altura: 1.5, descontar: true }, // 3,75 -> soma 6,75 > 6
    ],
  });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /somam mais do que a área/);
});

test('rejeita superfície sem largura ou altura (área zero)', () => {
  assert.equal(calcularÁreaDeParedes({ superfícies: [{ id: 's1', largura: 0, altura: 2 }] }).válido, false);
  assert.equal(calcularÁreaDeParedes({ superfícies: [{ id: 's1', largura: 2, altura: 0 }] }).válido, false);
  assert.equal(calcularÁreaDeParedes({ superfícies: [] }).válido, false);
});

test('rejeita abertura sem superfície correspondente selecionada', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [{ id: 's1', largura: 3, altura: 2 }],
    aberturas: [{ id: 'a1', superfícieId: 'inexistente', largura: 1, altura: 1, descontar: true }],
  });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /selecione a superfície/);
});

test('nunca resulta em área útil negativa por superfície', () => {
  const resultado = calcularÁreaDeParedes({
    superfícies: [{ id: 's1', largura: 2, altura: 2 }],
    aberturas: [{ id: 'a1', superfícieId: 's1', largura: 2, altura: 2, descontar: true }],
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.porSuperfície[0].áreaÚtil, 0);
  assert.ok(resultado.áreaÚtil >= 0);
});
