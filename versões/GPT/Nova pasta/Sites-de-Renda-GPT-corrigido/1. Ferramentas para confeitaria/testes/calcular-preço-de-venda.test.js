import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPreçoDeVenda } from '../scripts/cálculos/calcular-preço-de-venda.js';
import { validarPrecificaçãoSalva } from '../scripts/validação/validar-precificação-salva.js';

const próximo = (atual, esperado, tolerância = 1e-4) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência do prompt: R$ 80, 50 unidades, margem 30%, sem taxas', () => {
  const resultado = calcularPreçoDeVenda({ custoTotal: 80, quantidade: 50, margemPercentual: 30 });
  assert.equal(resultado.válido, true);
  próximo(resultado.preçoDoLoteMatemático, 114.2857);
  assert.equal(resultado.preçoUnitárioEmCentavos, 229);
  assert.equal(resultado.preçoDoLoteEmCentavos, 11450);
  próximo(resultado.margemEmReais, 34.5);
  próximo(resultado.acréscimoSobreCustoPercentual, 43.125);
});

test('taxas entram no mesmo denominador da margem', () => {
  const resultado = calcularPreçoDeVenda({ custoTotal: 60, quantidade: 1, margemPercentual: 20, taxasPercentuais: 10 });
  próximo(resultado.preçoDoLoteMatemático, 85.7143);
  assert.equal(resultado.preçoUnitárioEmCentavos, 8572);
  próximo(resultado.valorDasTaxas, 8.572);
});

test('arredondamento ao centavo mais próximo', () => {
  const resultado = calcularPreçoDeVenda({ custoTotal: 80, quantidade: 50, margemPercentual: 30, modoDeArredondamento: 'próximo' });
  assert.equal(resultado.preçoUnitárioEmCentavos, 229);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 10, quantidade: 3, margemPercentual: 0, modoDeArredondamento: 'próximo' }).preçoUnitárioEmCentavos, 333);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 10, quantidade: 3, margemPercentual: 0 }).preçoUnitárioEmCentavos, 334);
});

test('bloqueia denominador zero ou negativo e entradas inválidas', () => {
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 50, margemPercentual: 60, taxasPercentuais: 40 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 50, margemPercentual: 70, taxasPercentuais: 35 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 0, quantidade: 50, margemPercentual: 30 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 0, margemPercentual: 30 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 2.5, margemPercentual: 30 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: Number.NaN, quantidade: 5, margemPercentual: 30 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 5, margemPercentual: -1 }).válido, false);
  assert.equal(calcularPreçoDeVenda({ custoTotal: 80, quantidade: 5, margemPercentual: 30, modoDeArredondamento: 'baixo' }).válido, false);
});

test('validador de cálculo salvo recusa dados adulterados', () => {
  const válido = { nome: 'Brigadeiro', custoTotal: 80, quantidade: 50, margemPercentual: 30, taxasPercentuais: 0, modoDeArredondamento: 'acima' };
  assert.equal(validarPrecificaçãoSalva(válido), true);
  assert.equal(validarPrecificaçãoSalva({ ...válido, nome: '' }), false);
  assert.equal(validarPrecificaçãoSalva({ ...válido, nome: 'x'.repeat(121) }), false);
  assert.equal(validarPrecificaçãoSalva({ ...válido, custoTotal: '80' }), false);
  assert.equal(validarPrecificaçãoSalva({ ...válido, quantidade: 1.5 }), false);
  assert.equal(validarPrecificaçãoSalva({ ...válido, margemPercentual: 100 }), false);
  assert.equal(validarPrecificaçãoSalva({ ...válido, modoDeArredondamento: '<script>' }), false);
  assert.equal(validarPrecificaçãoSalva(null), false);
});
