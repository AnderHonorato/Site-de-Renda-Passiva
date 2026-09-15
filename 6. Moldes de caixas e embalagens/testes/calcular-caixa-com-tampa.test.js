import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCaixaComTampa } from '../scripts/cálculos/calcular-caixa-com-tampa.js';

test('base de 100 mm e folga de 1 mm por lado → largura interna da tampa 102 mm (caso do prompt-mestre)', () => {
  const resultado = calcularCaixaComTampa({
    comprimentoInternoMm: 150,
    larguraInternoMm: 100,
    alturaDaBaseMm: 40,
    alturaDaTampaMm: 15,
    folgaMm: 1,
    tamanhoDaAbaMm: 12,
  });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.resumoDaFolga.larguraInternaDaBaseMm, 100);
  assert.equal(resultado.resumoDaFolga.larguraInternaDaTampaMm, 102);
  assert.equal(resultado.tampa.medidasInternasMm.largura, 102);
});

test('a folga também é aplicada ao comprimento, nos dois lados', () => {
  const resultado = calcularCaixaComTampa({
    comprimentoInternoMm: 150,
    larguraInternoMm: 100,
    alturaDaBaseMm: 40,
    alturaDaTampaMm: 15,
    folgaMm: 2,
    tamanhoDaAbaMm: 12,
  });
  assert.equal(resultado.resumoDaFolga.comprimentoInternoDaTampaMm, 154);
});

test('rejeita aba maior que a altura da base ou da tampa e folga fora da faixa', () => {
  assert.equal(
    calcularCaixaComTampa({ comprimentoInternoMm: 150, larguraInternoMm: 100, alturaDaBaseMm: 40, alturaDaTampaMm: 10, folgaMm: 1, tamanhoDaAbaMm: 11 }).válido,
    false,
  );
  assert.equal(
    calcularCaixaComTampa({ comprimentoInternoMm: 150, larguraInternoMm: 100, alturaDaBaseMm: 40, alturaDaTampaMm: 15, folgaMm: -1, tamanhoDaAbaMm: 10 }).válido,
    false,
  );
});

test('base e tampa produzem redes distintas e ambas geometricamente válidas', () => {
  const resultado = calcularCaixaComTampa({
    comprimentoInternoMm: 150,
    larguraInternoMm: 100,
    alturaDaBaseMm: 40,
    alturaDaTampaMm: 15,
    folgaMm: 1,
    tamanhoDaAbaMm: 12,
  });
  // A tampa tem footprint (comprimento × largura) maior que a base, mesmo que o retângulo
  // envolvente da tampa possa ser menor (paredes mais baixas ocupam menos moldura ao redor).
  assert.ok(resultado.tampa.medidasInternasMm.comprimento > resultado.base.medidasInternasMm.comprimento);
  assert.ok(resultado.tampa.medidasInternasMm.largura > resultado.base.medidasInternasMm.largura);
  assert.notDeepEqual(resultado.base.retânguloEnvolvente, resultado.tampa.retânguloEnvolvente);
  assert.ok(resultado.base.segmentosDeCorte.length > 0);
  assert.ok(resultado.tampa.segmentosDeCorte.length > 0);
});
