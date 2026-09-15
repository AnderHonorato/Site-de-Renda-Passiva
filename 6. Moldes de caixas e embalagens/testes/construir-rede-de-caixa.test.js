import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirRedeDeCaixa } from '../scripts/cálculos/construir-rede-de-caixa.js';

test('monta a rede de uma caixa 100×60×40 com aba de 15 mm e calcula o retângulo envolvente', () => {
  const rede = construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: 60, alturaMm: 40, abaMm: 15 });
  assert.ok(rede);
  // largura = 2×altura + comprimento; altura = 2×altura + largura (abas cabem dentro da altura).
  assert.equal(rede.retânguloEnvolvente.larguraMm, 2 * 40 + 100);
  assert.equal(rede.retânguloEnvolvente.alturaMm, 2 * 40 + 60);
  assert.ok(rede.segmentosDeCorte.length > 0);
  assert.ok(rede.segmentosDeDobra.length > 0);
});

test('sem aba (abaMm = 0), a rede não ganha os quatro retalhos de canto, mas tem menos dobras', () => {
  const comAba = construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: 60, alturaMm: 40, abaMm: 10 });
  const semAba = construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: 60, alturaMm: 40, abaMm: 0 });
  // Com aba: os 4 encontros parede-topo/parede-baixo × esquerda/direita viram dobra (para a
  // aba) em vez de corte, e cada uma das 4 abas soma 3 arestas de corte próprias.
  assert.ok(comAba.segmentosDeDobra.length > semAba.segmentosDeDobra.length);
  assert.ok(comAba.segmentosDeCorte.length > semAba.segmentosDeCorte.length);
  assert.equal(comAba.segmentosDeCorte.length + comAba.segmentosDeDobra.length, semAba.segmentosDeCorte.length + semAba.segmentosDeDobra.length + 4 * 3);
});

test('todas as coordenadas ficam dentro do retângulo envolvente (nenhum segmento escapa)', () => {
  const rede = construirRedeDeCaixa({ comprimentoMm: 80, larguraMm: 50, alturaMm: 30, abaMm: 12 });
  const { larguraMm, alturaMm } = rede.retânguloEnvolvente;
  for (const segmento of [...rede.segmentosDeCorte, ...rede.segmentosDeDobra]) {
    for (const [x, y] of [[segmento.x1, segmento.y1], [segmento.x2, segmento.y2]]) {
      assert.ok(x >= -1e-9 && x <= larguraMm + 1e-9, `x=${x} fora de [0,${larguraMm}]`);
      assert.ok(y >= -1e-9 && y <= alturaMm + 1e-9, `y=${y} fora de [0,${alturaMm}]`);
    }
  }
});

test('rejeita dimensões impossíveis: comprimento/largura/altura não positivos ou aba maior que a altura', () => {
  assert.equal(construirRedeDeCaixa({ comprimentoMm: 0, larguraMm: 60, alturaMm: 40, abaMm: 10 }), null);
  assert.equal(construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: -5, alturaMm: 40, abaMm: 10 }), null);
  assert.equal(construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: 60, alturaMm: 0, abaMm: 10 }), null);
  assert.equal(construirRedeDeCaixa({ comprimentoMm: 100, larguraMm: 60, alturaMm: 40, abaMm: 41 }), null);
});

test('valores extremos: caixa muito pequena e caixa muito grande continuam consistentes', () => {
  const pequena = construirRedeDeCaixa({ comprimentoMm: 5, larguraMm: 5, alturaMm: 5, abaMm: 2 });
  assert.ok(pequena);
  assert.equal(pequena.retânguloEnvolvente.larguraMm, 15);

  const grande = construirRedeDeCaixa({ comprimentoMm: 900, larguraMm: 600, alturaMm: 300, abaMm: 40 });
  assert.ok(grande);
  assert.equal(grande.retânguloEnvolvente.larguraMm, 2 * 300 + 900);
});
