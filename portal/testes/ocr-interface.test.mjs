import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirImagemOCR, medidaRasterOCR, LIMITES_OCR } from '../scripts/ferramentas/auxiliares/ocr-interface.js';

function cabecalhoPng(largura, altura) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  const vista = new DataView(bytes.buffer); vista.setUint32(16, largura); vista.setUint32(20, altura);
  bytes[24] = 8; bytes[25] = 6;
  return bytes;
}
test('OCR recusa cabeçalho com pixels excessivos antes de decodificar', () => {
  assert.equal(conferirImagemOCR(cabecalhoPng(6000, 4000)).ok, false);
  assert.equal(conferirImagemOCR(cabecalhoPng(16385, 1)).ok, false);
  const normal = conferirImagemOCR(cabecalhoPng(2000, 3000));
  assert.equal(normal.ok, true); assert.equal(normal.largura, 2000); assert.equal(normal.altura, 3000);
  assert.equal(conferirImagemOCR(new Uint8Array()).ok, false);
  assert.equal(conferirImagemOCR(new TextEncoder().encode('<svg/>')).ok, false);
});
test('Raster OCR limita memória e preserva a proporção, inclusive em páginas grandes', () => {
  for (const [largura, altura, escala] of [[595, 842, 300 / 72], [842, 595, 300 / 72], [4000, 5000, 1], [50000, 500, 4], [200, 50000, 4]]) {
    const r = medidaRasterOCR(largura, altura, escala);
    assert.ok(r.largura > 0 && r.altura > 0);
    assert.ok(r.largura <= 6000 && r.altura <= 6000);
    assert.ok(r.largura * Math.ceil(altura * r.largura / largura) <= LIMITES_OCR.rasterPixels);
    assert.ok(Math.abs(r.altura - altura * r.largura / largura) <= 1);
  }
  const pequena = medidaRasterOCR(800, 600);
  assert.deepEqual([pequena.largura, pequena.altura, pequena.reduzida], [800, 600, false]);
  for (const valor of [0, -10, NaN, Infinity]) assert.throws(() => medidaRasterOCR(valor, 200));
});
