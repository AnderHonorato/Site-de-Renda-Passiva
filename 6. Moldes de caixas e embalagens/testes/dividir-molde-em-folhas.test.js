import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dividirMoldeEmFolhas } from '../scripts/geração/dividir-molde-em-folhas.js';

test('molde que cabe na área útil fica numa única folha', () => {
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente: { larguraMm: 150, alturaMm: 100 }, larguraÚtilMm: 190, alturaÚtilMm: 183 });
  assert.equal(plano.folhas.length, 1);
  assert.equal(plano.folhas[0].larguraMm, 150);
});

test('molde maior que a área útil é dividido em várias folhas, sem mudar a escala (mm continuam os mesmos)', () => {
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente: { larguraMm: 500, alturaMm: 400 }, larguraÚtilMm: 190, alturaÚtilMm: 183, sobreposiçãoMm: 12 });
  assert.ok(plano.folhas.length > 1);
  assert.ok(plano.colunas >= 3);
  assert.ok(plano.linhas >= 3);
  // A soma da largura útil coberta por cada folha da primeira linha, descontando a
  // sobreposição, deve reconstituir a largura total do molde (nenhuma escala foi alterada).
  const últimaFolhaDaLinha = plano.folhas.filter((folha) => folha.linha === 0).at(-1);
  assert.equal(últimaFolhaDaLinha.x + últimaFolhaDaLinha.larguraMm, 500);
});

test('folhas numeradas sequencialmente, linha por linha', () => {
  const plano = dividirMoldeEmFolhas({ retânguloEnvolvente: { larguraMm: 500, alturaMm: 200 }, larguraÚtilMm: 190, alturaÚtilMm: 183, sobreposiçãoMm: 12 });
  const números = plano.folhas.map((folha) => folha.número);
  assert.deepEqual(números, Array.from({ length: plano.folhas.length }, (_, índice) => índice + 1));
});
