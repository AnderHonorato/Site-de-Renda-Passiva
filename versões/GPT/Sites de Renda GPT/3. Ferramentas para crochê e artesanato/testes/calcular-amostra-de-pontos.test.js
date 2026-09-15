import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularAmostraDePontos } from '../scripts/cálculos/calcular-amostra-de-pontos.js';

test('caso de conferência do catálogo: 20 pontos por 10 cm, largura 35 cm = 70 pontos', () => {
  const resultado = calcularAmostraDePontos({ pontosDaAmostra: 20, larguraDaAmostraCm: 10, larguraDesejadaCm: 35 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.pontosFinais, 70);
  assert.equal(resultado.precisaAjuste, false);
});

test('avisa quando o total não é múltiplo do padrão de pontos e sugere os dois mais próximos', () => {
  const resultado = calcularAmostraDePontos({ pontosDaAmostra: 20, larguraDaAmostraCm: 10, larguraDesejadaCm: 35, múltiploDoPadrão: 8, pontosDeBorda: 2 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.pontosFinais, 70);
  assert.equal(resultado.precisaAjuste, true);
  assert.equal(resultado.ajustadoParaBaixo, 66);
  assert.equal(resultado.ajustadoParaCima, 74);
});

test('não avisa ajuste quando o total já é múltiplo do padrão', () => {
  const resultado = calcularAmostraDePontos({ pontosDaAmostra: 16, larguraDaAmostraCm: 10, larguraDesejadaCm: 40, múltiploDoPadrão: 8, pontosDeBorda: 0 });
  assert.equal(resultado.pontosFinais, 64);
  assert.equal(resultado.precisaAjuste, false);
});

test('rejeita entradas zero ou negativas', () => {
  assert.equal(calcularAmostraDePontos({ pontosDaAmostra: 0, larguraDaAmostraCm: 10, larguraDesejadaCm: 35 }).válido, false);
  assert.equal(calcularAmostraDePontos({ pontosDaAmostra: 20, larguraDaAmostraCm: 0, larguraDesejadaCm: 35 }).válido, false);
});
