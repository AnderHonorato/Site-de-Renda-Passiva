import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularEnvelope } from '../scripts/cálculos/calcular-envelope.js';
import { construirRedeDeEnvelope } from '../scripts/cálculos/construir-rede-de-envelope.js';

test('cartão de 100×150 mm com folga declarada monta um bolso maior que o cartão', () => {
  const resultado = calcularEnvelope({ larguraDoConteúdoMm: 100, alturaDoConteúdoMm: 150, folgaMm: 3, tamanhoDaAbaMm: 25 });
  assert.equal(resultado.válido, true);
  assert.equal(resultado.larguraDoBolsoMm, 106);
  assert.equal(resultado.alturaDoBolsoMm, 156);
  assert.equal(resultado.retânguloEnvolvente.larguraMm, 106 + 2 * 25);
});

test('rejeita aba maior ou igual à metade da largura/altura do bolso', () => {
  const resultado = calcularEnvelope({ larguraDoConteúdoMm: 60, alturaDoConteúdoMm: 90, folgaMm: 2, tamanhoDaAbaMm: 35 });
  assert.equal(resultado.válido, false);
  assert.equal(resultado.campo, 'tamanhoDaAbaMm');
});

test('rejeita dimensões fora da faixa aceita', () => {
  assert.equal(calcularEnvelope({ larguraDoConteúdoMm: 5, alturaDoConteúdoMm: 90, folgaMm: 2, tamanhoDaAbaMm: 15 }).válido, false);
});

test('construirRedeDeEnvelope recusa aba maior que metade de uma dimensão diretamente', () => {
  assert.equal(construirRedeDeEnvelope({ larguraMm: 100, alturaMm: 100, abaMm: 60 }), null);
});

test('todas as coordenadas da rede do envelope ficam dentro do retângulo envolvente', () => {
  const rede = construirRedeDeEnvelope({ larguraMm: 106, alturaMm: 156, abaMm: 25 });
  const { larguraMm, alturaMm } = rede.retânguloEnvolvente;
  for (const segmento of [...rede.segmentosDeCorte, ...rede.segmentosDeDobra]) {
    for (const [x, y] of [[segmento.x1, segmento.y1], [segmento.x2, segmento.y2]]) {
      assert.ok(x >= -1e-9 && x <= larguraMm + 1e-9);
      assert.ok(y >= -1e-9 && y <= alturaMm + 1e-9);
    }
  }
});
