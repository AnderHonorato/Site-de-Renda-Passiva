import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recortarSegmentoEmRetângulo } from '../scripts/geração/recortar-segmento-em-retângulo.js';

test('segmento inteiramente dentro do retângulo não é alterado', () => {
  const recortado = recortarSegmentoEmRetângulo({ x1: 5, y1: 5, x2: 15, y2: 5, tipo: 'corte' }, { x: 0, y: 0, larguraMm: 20, alturaMm: 20 });
  assert.deepEqual(recortado, { tipo: 'corte', x1: 5, y1: 5, x2: 15, y2: 5 });
});

test('segmento que cruza a borda é cortado exatamente na borda', () => {
  const recortado = recortarSegmentoEmRetângulo({ x1: -10, y1: 10, x2: 10, y2: 10, tipo: 'dobra' }, { x: 0, y: 0, larguraMm: 20, alturaMm: 20 });
  assert.equal(recortado.x1, 0);
  assert.equal(recortado.x2, 10);
});

test('segmento inteiramente fora do retângulo devolve null', () => {
  const recortado = recortarSegmentoEmRetângulo({ x1: 30, y1: 30, x2: 40, y2: 30 }, { x: 0, y: 0, larguraMm: 20, alturaMm: 20 });
  assert.equal(recortado, null);
});

test('segmento diagonal também é recortado corretamente', () => {
  const recortado = recortarSegmentoEmRetângulo({ x1: -5, y1: -5, x2: 25, y2: 25 }, { x: 0, y: 0, larguraMm: 20, alturaMm: 20 });
  assert.ok(recortado);
  assert.equal(recortado.x1, 0);
  assert.equal(recortado.y1, 0);
  assert.equal(recortado.x2, 20);
  assert.equal(recortado.y2, 20);
});
