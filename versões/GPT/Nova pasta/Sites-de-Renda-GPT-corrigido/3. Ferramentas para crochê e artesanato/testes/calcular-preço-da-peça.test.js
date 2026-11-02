import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPreçoDaPeça } from '../scripts/cálculos/calcular-preço-da-peça.js';

const próximo = (atual, esperado, tolerância = 1e-4) => assert.ok(Math.abs(atual - esperado) < tolerância, `${atual} ≠ ${esperado}`);

test('caso de conferência do catálogo: R$ 20 materiais + 2 h a R$ 15 = custo R$ 50 antes da margem', () => {
  const resultado = calcularPreçoDaPeça({ custoDeMateriais: 20, horas: 2, valorHora: 15, margemPercentual: 0 });
  assert.equal(resultado.válido, true);
  próximo(resultado.custoDeMãoDeObra, 30);
  próximo(resultado.custoDoArtesanato, 50);
});

test('soma de materiais, mão de obra, embalagem e custos adicionais é conferida antes da margem', () => {
  const resultado = calcularPreçoDaPeça({ custoDeMateriais: 20, horas: 2, valorHora: 15, embalagem: 5, custosAdicionais: 3, margemPercentual: 0 });
  próximo(resultado.custoDoArtesanato, 58);
});

test('margem sobre a venda e preço do conjunto', () => {
  const resultado = calcularPreçoDaPeça({ custoDeMateriais: 20, horas: 2, valorHora: 15, margemPercentual: 30, quantidadeDoConjunto: 3 });
  // custo 50 ÷ 0,70 = 71,4286 → 71,43 por peça
  assert.equal(resultado.preçoPorPeçaEmCentavos, 7143);
  assert.equal(resultado.preçoDoConjuntoEmCentavos, 7143 * 3);
});

test('comparação com preço informado indica se cobre ou não o mínimo calculado', () => {
  const cobre = calcularPreçoDaPeça({ custoDeMateriais: 50, horas: 0, valorHora: 0, margemPercentual: 0, precoInformado: 60 });
  assert.equal(cobre.comparação.cobre, true);
  const nãoCobre = calcularPreçoDaPeça({ custoDeMateriais: 50, horas: 0, valorHora: 0, margemPercentual: 0, precoInformado: 40 });
  assert.equal(nãoCobre.comparação.cobre, false);
  assert.equal(nãoCobre.comparação.diferençaEmCentavos < 0, true);
});

test('rejeita quando nenhum custo é informado e quando margem+taxas ≥ 100%', () => {
  assert.equal(calcularPreçoDaPeça({ custoDeMateriais: 0, horas: 0, valorHora: 0, margemPercentual: 0 }).válido, false);
  assert.equal(calcularPreçoDaPeça({ custoDeMateriais: 50, horas: 0, valorHora: 0, margemPercentual: 60, taxasPercentuais: 40 }).válido, false);
});
