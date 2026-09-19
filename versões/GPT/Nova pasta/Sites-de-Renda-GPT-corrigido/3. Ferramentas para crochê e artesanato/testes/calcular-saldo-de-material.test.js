import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularSaldoDeMaterial } from '../scripts/cálculos/calcular-saldo-de-material.js';

test('caso de conferência do catálogo: 100 g disponíveis − 25 g consumidos = saldo 75 g', () => {
  const resultado = calcularSaldoDeMaterial({ saldoInicial: 100, lançamentos: [{ tipo: 'consumo', quantidade: 25 }] });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.saldoAtual, 75);
  assert.equal(resultado.totalConsumos, 25);
});

test('soma entradas e consumos em sequência, com histórico acumulado', () => {
  const resultado = calcularSaldoDeMaterial({
    saldoInicial: 50,
    lançamentos: [
      { tipo: 'entrada', quantidade: 100 },
      { tipo: 'consumo', quantidade: 30 },
      { tipo: 'consumo', quantidade: 20 },
    ],
  });
  assert.equal(resultado.saldoAtual, 100);
  assert.equal(resultado.histórico.map((item) => item.saldoAcumulado).join(','), '150,120,100');
});

test('sinaliza saldo abaixo de zero sem bloquear o cálculo', () => {
  const resultado = calcularSaldoDeMaterial({ saldoInicial: 10, lançamentos: [{ tipo: 'consumo', quantidade: 30 }] });
  assert.equal(resultado.saldoAtual, -20);
  assert.equal(resultado.abaixoDeZero, true);
});

test('rejeita lançamento sem tipo válido ou com quantidade zero', () => {
  assert.equal(calcularSaldoDeMaterial({ saldoInicial: 10, lançamentos: [{ tipo: 'ajuste', quantidade: 5 }] }).válido, false);
  assert.equal(calcularSaldoDeMaterial({ saldoInicial: 10, lançamentos: [{ tipo: 'entrada', quantidade: 0 }] }).válido, false);
  assert.equal(calcularSaldoDeMaterial({ saldoInicial: 10, lançamentos: [] }).válido, false);
});
