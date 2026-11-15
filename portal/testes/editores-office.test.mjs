import test from 'node:test';
import assert from 'node:assert/strict';
import documentos from '../scripts/ferramentas/editor-de-documentos.js';
import apresentações from '../scripts/ferramentas/editor-de-apresentacoes.js';
import planilhas from '../scripts/ferramentas/editor-de-planilhas.js';
import { exportPackage, bytes, text } from '../scripts/comum/office/pacote.js';
import { compactarZip } from '../scripts/comum/exportação/compactar-zip.js';
import { lerZip, extrairEntrada } from '../scripts/cálculos/zip.js';

test('os três editores expõem instruções e montagem no contrato do gerador', () => {
  for (const editor of [documentos, apresentações, planilhas]) {
    assert.equal(typeof editor.montar, 'function');
    assert.ok(editor.instruções.passos.length >= 2);
    assert.ok(editor.instruções.limites.length > 20);
  }
});

test('a gravação OOXML conserva partes binárias e partes não editadas no ZIP', async () => {
  const imagem = new Uint8Array([0, 1, 127, 128, 255]);
  const zipOriginal = compactarZip([
    { nome: 'word/document.xml', conteúdo: '<document>antes</document>' },
    { nome: 'word/media/picture.bin', conteúdo: imagem },
    { nome: 'word/styles.xml', conteúdo: '<styles>intacto</styles>' },
  ]);
  const pacote = new Map();
  for (const e of lerZip(zipOriginal).entradas) pacote.set(e.nome, await extrairEntrada(zipOriginal, e));
  pacote.set('word/document.xml', bytes('<document>depois</document>'));
  const resultadoZip = exportPackage({ parts: pacote });
  const reaberto = lerZip(resultadoZip);
  const resultado = new Map();
  for (const e of reaberto.entradas) resultado.set(e.nome, await extrairEntrada(resultadoZip, e));
  assert.equal(text(resultado.get('word/document.xml')), '<document>depois</document>');
  assert.equal(text(resultado.get('word/styles.xml')), '<styles>intacto</styles>');
  assert.deepEqual(resultado.get('word/media/picture.bin'), imagem);
});
