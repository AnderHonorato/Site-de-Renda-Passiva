import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCustoDoMaterial } from '../scripts/cálculos/calcular-custo-do-material.js';

const próximo = (atual, esperado, tolerância = 1e-9) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência do prompt: novelo R$ 20 e 100 g, consumo de 25 g = R$ 5', () => {
  const resultado = calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 25, unidadeConsumo: 'g' });
  assert.equal(resultado.válido, true);
  próximo(resultado.custoProporcional, 5);
  assert.equal(resultado.convertido, false);
});

test('converte kg/g e m/cm dentro da mesma categoria sem precisar de relação do fio', () => {
  const emKg = calcularCustoDoMaterial({ precoDeCompra: 40, quantidadeComprada: 1, unidadeComprada: 'kg', consumo: 250, unidadeConsumo: 'g' });
  próximo(emKg.custoProporcional, 10);
  const emM = calcularCustoDoMaterial({ precoDeCompra: 15, quantidadeComprada: 2, unidadeComprada: 'm', consumo: 50, unidadeConsumo: 'cm' });
  próximo(emM.custoProporcional, 3.75);
});

test('quantidade comprada zero é rejeitada com erro claro', () => {
  const resultado = calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 0, unidadeComprada: 'g', consumo: 25, unidadeConsumo: 'g' });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /maior que zero/);
});

test('unidades incompatíveis (peso × unidade) são rejeitadas sem inventar conversão', () => {
  const resultado = calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 10, unidadeComprada: 'un', consumo: 25, unidadeConsumo: 'g' });
  assert.equal(resultado.válido, false);
  assert.match(resultado.erro, /incompatíveis/);
});

test('peso × comprimento sem relação do fio é rejeitado; com metros por 100 g, converte', () => {
  const semRelação = calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 2, unidadeConsumo: 'm' });
  assert.equal(semRelação.válido, false);
  assert.match(semRelação.erro, /metros esse fio rende/);

  const comRelação = calcularCustoDoMaterial({ precoDeCompra: 20, quantidadeComprada: 100, unidadeComprada: 'g', consumo: 2, unidadeConsumo: 'm', metrosPor100g: 200 });
  assert.equal(comRelação.válido, true);
  // 2 m a 200 m/100g pesam 1 g; custo proporcional = 20 * (1/100) = 0,20
  próximo(comRelação.custoProporcional, 0.2);
  assert.equal(comRelação.convertido, true);
});
