import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularGradeDeEtiquetas } from '../scripts/cálculos/calcular-grade-de-etiquetas.js';

test('etiqueta de 50×30 mm, margem 10 mm, sem espaçamento: cabem 3 colunas × 9 linhas = 27', () => {
  const resultado = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.colunas, 3);
  assert.equal(resultado.linhas, 9);
  assert.equal(resultado.total, 27);
  assert.equal(resultado.posições.length, 27);
});

test('espaçamento entre etiquetas reduz a quantidade que cabe', () => {
  const semEspaçamento = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30 });
  const comEspaçamento = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 50, alturaDaEtiquetaMm: 30, espaçamentoMm: 5 });
  assert.ok(comEspaçamento.total <= semEspaçamento.total);
});

test('etiqueta maior que a área útil da A4 é rejeitada', () => {
  const resultado = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 195, alturaDaEtiquetaMm: 30 });
  assert.equal(resultado.válido, false);
});

test('nenhuma etiqueta ultrapassa a folha A4 (todas dentro de 210×297 mm)', () => {
  const resultado = calcularGradeDeEtiquetas({ larguraDaEtiquetaMm: 63, alturaDaEtiquetaMm: 38, margemMm: 12 });
  for (const posição of resultado.posições) {
    assert.ok(posição.xMm + resultado.larguraDaEtiquetaMm <= 210 - 12 + 1e-9);
    assert.ok(posição.yMm + resultado.alturaDaEtiquetaMm <= 297 - 12 + 1e-9);
  }
});
