import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPapelDeParede } from '../scripts/cálculos/calcular-papel-de-parede.js';

test('caso de conferência do catálogo: parede de 4 m, rolo de 0,5 m de largura = 8 faixas', () => {
  const resultado = calcularPapelDeParede({ larguraDaParede: 4, alturaDoAmbiente: 2.6, larguraDoRolo: 0.5, comprimentoDoRolo: 10, repetiçãoDoPadrão: 0, folgaPorFaixa: 0 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.faixas, 8);
});

test('ajusta a altura da faixa para o próximo múltiplo da repetição do padrão', () => {
  const resultado = calcularPapelDeParede({ larguraDaParede: 3, alturaDoAmbiente: 2.55, larguraDoRolo: 0.53, comprimentoDoRolo: 10, repetiçãoDoPadrão: 0.64, folgaPorFaixa: 0 });
  assert.equal(resultado.válido, true);
  // 2.55 / 0.64 = 3,98... -> arredonda para 4 repetições -> 2.56
  assert.equal(Math.round(resultado.alturaDaFaixaAjustada * 100) / 100, 2.56);
});

test('calcula rolos necessários a partir de faixas por rolo', () => {
  const resultado = calcularPapelDeParede({ larguraDaParede: 4, alturaDoAmbiente: 2.5, larguraDoRolo: 0.5, comprimentoDoRolo: 10, repetiçãoDoPadrão: 0, folgaPorFaixa: 0.1 });
  // faixas = 8; altura da faixa = 2.6; faixas por rolo = floor(10/2.6) = 3; rolos = ceil(8/3) = 3
  assert.equal(resultado.faixasPorRolo, 3);
  assert.equal(resultado.rolos, 3);
});

test('rejeita quando a faixa fica maior do que o comprimento do rolo', () => {
  const resultado = calcularPapelDeParede({ larguraDaParede: 4, alturaDoAmbiente: 3, larguraDoRolo: 0.5, comprimentoDoRolo: 2, repetiçãoDoPadrão: 0, folgaPorFaixa: 0 });
  assert.equal(resultado.válido, false);
});

test('rejeita medidas zero ou negativas', () => {
  assert.equal(calcularPapelDeParede({ larguraDaParede: 0, alturaDoAmbiente: 2.6, larguraDoRolo: 0.5, comprimentoDoRolo: 10 }).válido, false);
  assert.equal(calcularPapelDeParede({ larguraDaParede: 4, alturaDoAmbiente: 2.6, larguraDoRolo: 0, comprimentoDoRolo: 10 }).válido, false);
});
