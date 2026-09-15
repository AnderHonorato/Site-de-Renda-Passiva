import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCustoDeCompra } from '../scripts/cálculos/calcular-custo-de-compra.js';

test('caso relatado pelo orquestrador: 2 kg de carne a R$ 40,00/kg = R$ 80,00', () => {
  const custo = calcularCustoDeCompra({ quantidadeComprada: 2000, unidadeBase: 'g', embalagemNaUnidadeBase: 1000, preçoPorUnidadeDeCompraEmCentavos: 4000 });
  assert.equal(custo, 8000); // R$ 80,00 em centavos, não R$ 8.000,00
});

test('caso relatado pelo orquestrador: 1 pacote de pão de alho (4 unidades) a R$ 40,00 o pacote = R$ 40,00', () => {
  const custo = calcularCustoDeCompra({ quantidadeComprada: 4, unidadeBase: 'un', embalagemNaUnidadeBase: 4, preçoPorUnidadeDeCompraEmCentavos: 4000 });
  assert.equal(custo, 4000); // R$ 40,00, não R$ 960,00 nem R$ 4.000,00
});

test('item em unidade avulsa, sem embalagem: preço é por unidade', () => {
  const custo = calcularCustoDeCompra({ quantidadeComprada: 3, unidadeBase: 'un', embalagemNaUnidadeBase: null, preçoPorUnidadeDeCompraEmCentavos: 500 });
  assert.equal(custo, 1500); // 3 × R$ 5,00
});

test('item em litros: preço é por litro', () => {
  const custo = calcularCustoDeCompra({ quantidadeComprada: 1500, unidadeBase: 'ml', preçoPorUnidadeDeCompraEmCentavos: 800 });
  assert.equal(custo, 1200); // 1,5 L × R$ 8,00/L = R$ 12,00
});

test('sem preço informado, retorna null (não entra no total)', () => {
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: 500, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: null }), null);
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: 500, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: undefined }), null);
});

test('quantidade zero resulta em custo zero, nunca negativo ou NaN', () => {
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: 0, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: 4000 }), 0);
});

test('entradas inválidas retornam null em vez de NaN', () => {
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: -1, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: 100 }), null);
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: 100, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: -1 }), null);
  assert.equal(calcularCustoDeCompra({ quantidadeComprada: Number.NaN, unidadeBase: 'g', preçoPorUnidadeDeCompraEmCentavos: 100 }), null);
});
