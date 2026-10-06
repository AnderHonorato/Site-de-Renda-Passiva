/**
 * Testes de Extrair páginas do PDF. Casos da pesquisa do iLovePDF
 * (documentação/pesquisa-ilovepdf/a-organizar.md, A4), com PDFs gerados aqui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extrairPáginas } from '../scripts/cálculos/extrair-paginas-do-pdf.js';
import { abrirPdf } from '../scripts/cálculos/páginas-do-pdf.js';
import ferramenta from '../scripts/ferramentas/extrair-paginas-do-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import { biblioteca, pdfNumerado, origensDasPáginas } from './auxiliares/pdfs-de-teste.mjs';

async function abrir(quantidade, nome = 'Relatório Anual.pdf') {
  const r = await abrirPdf({ nome, bytes: await pdfNumerado(quantidade) }, { biblioteca });
  assert.equal(r.ok, true);
  return { ...r, nome };
}

test('extrai na ordem digitada: "8, 2-3" dá as páginas 8, 2 e 3', async () => {
  const r = await extrairPáginas(await abrir(10), '8, 2-3', { biblioteca });
  assert.equal(r.ok, true);
  assert.deepEqual(r.extraídas, [8, 2, 3]);
  assert.deepEqual(await origensDasPáginas(r.bytes), [8, 2, 3]);
  assert.equal(r.nomeSugerido, 'relatorio-anual-extraido');
});

test('extrai 2,4-6 de 10 páginas', async () => {
  const r = await extrairPáginas(await abrir(10), '2,4-6', { biblioteca });
  assert.deepEqual(await origensDasPáginas(r.bytes), [2, 4, 5, 6]);
  assert.equal(r.total, 10);
});

test('uma página só, a primeira e a última', async () => {
  assert.deepEqual(await origensDasPáginas((await extrairPáginas(await abrir(10), '1', { biblioteca })).bytes), [1]);
  assert.deepEqual(await origensDasPáginas((await extrairPáginas(await abrir(10), '10', { biblioteca })).bytes), [10]);
});

test('página repetida sai repetida e é avisada', async () => {
  const r = await extrairPáginas(await abrir(5), '1-3, 2, 2', { biblioteca });
  assert.deepEqual(await origensDasPáginas(r.bytes), [1, 2, 3, 2, 2]);
  assert.deepEqual(r.repetidas, [2]);
  const limpa = await extrairPáginas(await abrir(5), '1,2', { biblioteca });
  assert.deepEqual(limpa.repetidas, []);
});

test('o exemplo de "Como usar" bate com a conta: 3, 12-14, 1 em 40 páginas dá 3, 12, 13, 14, 1', async () => {
  const r = await extrairPáginas(await abrir(40), '3, 12-14, 1', { biblioteca });
  assert.deepEqual(await origensDasPáginas(r.bytes), [3, 12, 13, 14, 1]);
  assert.match(ferramenta.instruções.exemplo.texto, /5 páginas/);
});

test('propriedade: extrair todas as páginas em ordem devolve um PDF equivalente ao original', async () => {
  const aberto = await abrir(7);
  const r = await extrairPáginas(aberto, '1-7', { biblioteca });
  assert.deepEqual(await origensDasPáginas(r.bytes), [1, 2, 3, 4, 5, 6, 7]);
  // E extrair duas vezes o mesmo pedido dá o mesmo conteúdo de páginas.
  const de = async () => origensDasPáginas((await extrairPáginas(aberto, '5, 1-2', { biblioteca })).bytes);
  assert.deepEqual(await de(), await de());
});

test('"0-3", "5-11" e texto são recusados antes de processar, no campo das páginas', async () => {
  const aberto = await abrir(10);
  const zero = await extrairPáginas(aberto, '0-3', { biblioteca });
  assert.equal(zero.ok, false);
  assert.equal(zero.erro, 'página_zero');
  assert.equal(zero.campo, 'páginas');
  const fora = await extrairPáginas(aberto, '5-11', { biblioteca });
  assert.equal(fora.erro, 'fora_do_total');
  assert.equal(fora.mensagem, 'O intervalo 5-11 passa do fim: o PDF tem 10 páginas.');
  assert.equal((await extrairPáginas(aberto, 'um a três', { biblioteca })).erro, 'páginas_inválido');
  assert.equal((await extrairPáginas(aberto, '', { biblioteca })).erro, 'páginas_vazio');
  assert.equal((await extrairPáginas(aberto, '8-3', { biblioteca })).erro, 'intervalo_invertido');
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['extrair-paginas-do-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.doesNotMatch(`${ficha.entra} ${ficha.processa}`, /miniatura|PDF\.js/i);
  assert.match(ficha.processa, /não sai do aparelho/);
});

test('"Como usar" está completo', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3 && exemplo.texto && limites && perguntas.length >= 3);
  assert.match(limites, /100 MB/);
});
