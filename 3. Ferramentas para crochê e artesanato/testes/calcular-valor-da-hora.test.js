import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularValorDaHora } from '../scripts/cálculos/calcular-valor-da-hora.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência do catálogo: R$ 3.000 ÷ 100 h produtivas = R$ 30/h', () => {
  const resultado = calcularValorDaHora({ metaMensal: 3000, custosFixosMensais: 0, horasProdutivasPorMês: 100 });
  assert.equal(resultado.válido, true);
  próximo(resultado.valorPorHora, 30);
  próximo(resultado.totalMensalNecessário, 3000);
});

test('custos fixos somam à meta antes de dividir pelas horas produtivas', () => {
  const resultado = calcularValorDaHora({ metaMensal: 2500, custosFixosMensais: 500, horasProdutivasPorMês: 100 });
  próximo(resultado.totalMensalNecessário, 3000);
  próximo(resultado.valorPorHora, 30);
});

test('rejeita horas produtivas zero ou meta e custos somados a zero', () => {
  assert.equal(calcularValorDaHora({ metaMensal: 3000, custosFixosMensais: 0, horasProdutivasPorMês: 0 }).válido, false);
  assert.equal(calcularValorDaHora({ metaMensal: 0, custosFixosMensais: 0, horasProdutivasPorMês: 100 }).válido, false);
  assert.equal(calcularValorDaHora({ metaMensal: -10, custosFixosMensais: 0, horasProdutivasPorMês: 100 }).válido, false);
});
