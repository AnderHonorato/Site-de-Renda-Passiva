import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularRendimentoComPerdas } from '../scripts/cálculos/calcular-rendimento-com-perdas.js';

test('caso de conferência: 100 unidades e 5% de perda → 95 aproveitáveis', () => {
  const resultado = calcularRendimentoComPerdas({ unidadesProduzidas: 100, percentualDePerda: 5 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.unidadesAproveitáveis, 95);
  assert.equal(resultado.perdaEmUnidades, 5);
});

test('calcula custo por unidade aproveitável quando o custo total é informado', () => {
  const resultado = calcularRendimentoComPerdas({ unidadesProduzidas: 100, percentualDePerda: 5, custoTotal: 200 });
  assert.ok(Math.abs(resultado.custoPorUnidadeAproveitável - 200 / 95) < 1e-9);
});

test('perda zero mantém todas as unidades', () => {
  const resultado = calcularRendimentoComPerdas({ unidadesProduzidas: 40, percentualDePerda: 0 });
  assert.equal(resultado.unidadesAproveitáveis, 40);
});

test('rejeita unidades produzidas inválidas e perda fora da faixa', () => {
  assert.equal(calcularRendimentoComPerdas({ unidadesProduzidas: 0, percentualDePerda: 5 }).válido, false);
  assert.equal(calcularRendimentoComPerdas({ unidadesProduzidas: 100, percentualDePerda: -1 }).válido, false);
  assert.equal(calcularRendimentoComPerdas({ unidadesProduzidas: 100, percentualDePerda: 100 }).válido, false);
});

test('rejeita custo total inválido quando informado', () => {
  assert.equal(calcularRendimentoComPerdas({ unidadesProduzidas: 100, percentualDePerda: 5, custoTotal: -10 }).válido, false);
});
