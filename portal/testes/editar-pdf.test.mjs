import { test } from 'node:test';
import assert from 'node:assert/strict';
import { biblioteca, pdfDeTeste, textosDaPágina, matrizesDeTexto, perto } from './auxiliares/pdf-de-teste.mjs';
import { aplicarEdiçõesPdf, validarOperacoes, LIMITE_DE_OPERACOES } from '../scripts/cálculos/editar-pdf.js';

const { PDFDocument, StandardFonts } = biblioteca;

test('anota texto e imagem, mantém páginas e confere as coordenadas após reabrir', async () => {
  const entrada = await pdfDeTeste(3, { largura: 300, altura: 400 });
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7ioAAAAASUVORK5CYII=','base64'));
  const ops = [
    { tipo: 'texto', pagina: 2, x: 40, y: 60, largura: 180, altura: 30, tamanho: 18, cor: '#a94f3d', texto: 'Nota clara' },
    { tipo: 'imagem', pagina: 3, x: 20, y: 25, largura: 40, altura: 40, formato: 'png', bytes: png },
  ];
  const r = await aplicarEdiçõesPdf({ nome: 'entrada.pdf', bytes: entrada }, { biblioteca, operações: ops });
  assert.equal(r.ok, true);
  const saída = await PDFDocument.load(r.bytes, { updateMetadata: false });
  assert.equal(saída.getPageCount(), 3);
  assert.ok(textosDaPágina(saída, 1).includes('Nota clara'));
  const matrix = matrizesDeTexto(saída, 1).at(-1);
  assert.ok(perto(matrix[4], 40), `x esperado 40pt; veio ${matrix[4]}`);
  assert.ok(perto(matrix[5], 310), `y esperado 310pt; veio ${matrix[5]}`);
  const página = saída.getPage(1);
  const conteúdo = página.node.Contents();
  assert.ok(conteúdo, 'há fluxo de conteúdo anotado');
  assert.equal(página.getWidth(), 300);
  assert.equal(página.getHeight(), 400);
  assert.ok(textosDaPágina(saída, 0).includes('Original 1'));
  assert.ok(textosDaPágina(saída, 2).includes('Original 3'));
  const { PDFName } = biblioteca;
  const xobjects = saída.getPage(2).node.Resources().lookup(PDFName.of('XObject'));
  assert.ok(xobjects?.entries().length > 0, 'a imagem foi incorporada como XObject');
  const reload = await aplicarEdiçõesPdf({ nome: 'saída.pdf', bytes: r.bytes }, { biblioteca, operações: [] });
  assert.equal(reload.ok, true);
  const reopened = await PDFDocument.load(reload.bytes);
  assert.ok(textosDaPágina(reopened, 1).includes('Nota clara'));
});

test('texto e desenho viram operadores visíveis, sem alterar o texto original', async () => {
  const entrada = await pdfDeTeste(1, { largura: 240, altura: 320 });
  const r = await aplicarEdiçõesPdf({ nome: 'base.pdf', bytes: entrada }, { biblioteca, operações: [
    { tipo: 'texto', pagina: 1, x: 25, y: 30, largura: 150, altura: 24, tamanho: 16, texto: 'Overlay', cor: '#222222' },
    { tipo: 'linha', pagina: 1, x: 20, y: 100, x2: 180, y2: 120, largura: 160, altura: 20, cor: '#a94f3d' },
  ] });
  assert.equal(r.ok, true);
  const doc = await PDFDocument.load(r.bytes);
  const texts = textosDaPágina(doc, 0);
  assert.ok(texts.includes('Original 1'));
  assert.ok(texts.includes('Overlay'));
  const page = doc.getPage(0);
  assert.equal(page.getWidth(), 240);
  assert.equal(page.getHeight(), 320);
});

test('recusa operação inválida, fora da página e excesso de anotações', async () => {
  const bytes = await pdfDeTeste(1, { largura: 100, altura: 100 });
  assert.equal(validarOperacoes(Array.from({ length: LIMITE_DE_OPERACOES + 1 }, () => ({})), 1), 'operacoes_demais');
  const fora = await aplicarEdiçõesPdf({ nome: 'base.pdf', bytes }, { biblioteca, operações: [{ tipo: 'texto', pagina: 1, x: 90, y: 90, largura: 30, altura: 20, tamanho: 12, texto: 'Fora' }] });
  assert.deepEqual(fora, { ok: false, erro: 'geometria_fora_da_pagina' });
  const cancelado = await aplicarEdiçõesPdf({ nome: 'base.pdf', bytes }, { biblioteca, operações: [{ tipo: 'texto', pagina: 1, x: 1, y: 1, largura: 30, altura: 20, tamanho: 12, texto: 'A' }], cancelado: () => true });
  assert.equal(cancelado.erro, 'cancelado');
});

test('barra PNG muito comprimido com mais de 8 megapixels antes de incorporá-lo', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/7ioAAAAASUVORK5CYII=','base64');
  png.writeUInt32BE(4000,16); png.writeUInt32BE(3000,20);
  assert.equal(validarOperacoes([{tipo:'imagem',pagina:1,x:0,y:0,largura:100,altura:100,formato:'png',bytes:new Uint8Array(png)}],1),'imagem_pixels_demais');
});
