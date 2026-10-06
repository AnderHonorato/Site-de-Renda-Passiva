/**
 * Testes de Remover páginas do PDF. Os casos vêm da pesquisa do iLovePDF
 * (documentação/pesquisa-ilovepdf/a-organizar.md, A3), com PDFs gerados aqui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { removerPáginas } from '../scripts/cálculos/remover-paginas-do-pdf.js';
import { abrirPdf } from '../scripts/cálculos/páginas-do-pdf.js';
import ferramenta from '../scripts/ferramentas/remover-paginas-do-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import { biblioteca, pdfNumerado, origensDasPáginas } from './auxiliares/pdfs-de-teste.mjs';

const { PDFDocument, PDFDict, PDFName } = biblioteca;

async function abrir(quantidade) {
  const r = await abrirPdf({ nome: 'Meu Contrato.pdf', bytes: await pdfNumerado(quantidade) }, { biblioteca });
  assert.equal(r.ok, true);
  return { ...r, nome: 'Meu Contrato.pdf' };
}

test('remove 2,4-6 de 10 páginas: ficam 1, 3, 7, 8, 9, 10 na ordem original', async () => {
  const r = await removerPáginas(await abrir(10), '2,4-6', { biblioteca });
  assert.equal(r.ok, true);
  assert.equal(r.antes, 10);
  assert.equal(r.depois, 6);
  assert.deepEqual(r.removidas, [2, 4, 5, 6]);
  assert.deepEqual(await origensDasPáginas(r.bytes), [1, 3, 7, 8, 9, 10]);
  assert.equal(r.nomeSugerido, 'meu-contrato-sem-paginas');
});

test('remover a última página e a primeira', async () => {
  assert.deepEqual(await origensDasPáginas((await removerPáginas(await abrir(10), '10', { biblioteca })).bytes), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(await origensDasPáginas((await removerPáginas(await abrir(3), '1', { biblioteca })).bytes), [2, 3]);
});

test('a ordem e a repetição do que foi digitado não mudam o resultado', async () => {
  const aberto = await abrir(6);
  const a = await removerPáginas(aberto, '5, 1-2, 2', { biblioteca });
  const b = await removerPáginas(aberto, '1,2,5', { biblioteca });
  assert.deepEqual(a.removidas, b.removidas);
  assert.deepEqual(await origensDasPáginas(a.bytes), [3, 4, 6]);
});

test('propriedade: páginas que ficam + páginas removidas = total, sem sobra nem falta', async () => {
  const aberto = await abrir(12);
  for (const texto of ['1', '12', '1-11', '2,4,6,8,10,12', '3-5, 9']) {
    const r = await removerPáginas(aberto, texto, { biblioteca });
    assert.equal(r.depois + r.removidas.length, r.antes, texto);
    const origens = await origensDasPáginas(r.bytes);
    assert.deepEqual([...origens, ...r.removidas].sort((x, y) => x - y), Array.from({ length: 12 }, (_, i) => i + 1), texto);
  }
});

test('remover todas as páginas é recusado antes de processar, no campo das páginas', async () => {
  const r = await removerPáginas(await abrir(10), '1-10', { biblioteca });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'tudo_removido');
  assert.equal(r.campo, 'páginas');
  assert.match(r.mensagem, /pelo menos uma página/);
  assert.equal((await removerPáginas(await abrir(1), '1', { biblioteca })).erro, 'tudo_removido', 'PDF de uma página');
  assert.equal((await removerPáginas(await abrir(10), '1-9', { biblioteca })).ok, true, 'sobrando uma, vale');
});

test('páginas fora do total, texto e campo vazio são recusados com a mensagem do campo', async () => {
  const aberto = await abrir(10);
  const fora = await removerPáginas(aberto, '11', { biblioteca });
  assert.equal(fora.erro, 'fora_do_total');
  assert.equal(fora.campo, 'páginas');
  assert.equal(fora.mensagem, 'A página 11 não existe: o PDF tem 10 páginas.');
  assert.equal((await removerPáginas(aberto, '1,15-20,abc', { biblioteca })).erro, 'páginas_inválido');
  assert.equal((await removerPáginas(aberto, '', { biblioteca })).erro, 'páginas_vazio');
  assert.equal((await removerPáginas(aberto, '0', { biblioteca })).erro, 'página_zero');
  assert.equal((await removerPáginas(aberto, '5-2', { biblioteca })).erro, 'intervalo_invertido');
});

test('o PDF novo é íntegro, mantém o título e não carrega as páginas removidas dentro dele', async () => {
  const origem = await PDFDocument.create();
  for (let n = 1; n <= 6; n++) origem.addPage([100 + n, 200]);
  origem.setTitle('Relatório');
  const bytes = await origem.save({ useObjectStreams: false });
  const aberto = { ...(await abrirPdf({ nome: 'r.pdf', bytes }, { biblioteca })), nome: 'r.pdf' };

  const r = await removerPáginas(aberto, '2-3', { biblioteca });
  const novo = await PDFDocument.load(r.bytes);
  assert.equal(novo.getTitle(), 'Relatório');
  // Nenhum objeto de página sobrando: só as 4 que ficaram existem dentro do arquivo.
  const objetosDePágina = novo.context.enumerateIndirectObjects()
    .filter(([, objeto]) => objeto instanceof PDFDict && objeto.get(PDFName.of('Type')) === PDFName.of('Page'));
  assert.equal(objetosDePágina.length, 4);
});

test('o original aberto não é alterado e pode ser usado de novo', async () => {
  const aberto = await abrir(5);
  await removerPáginas(aberto, '1-2', { biblioteca });
  assert.equal(aberto.documento.getPageCount(), 5);
  assert.equal((await removerPáginas(aberto, '5', { biblioteca })).depois, 4);
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['remover-paginas-do-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.match(`${ficha.processa} ${ficha.entra}`, /navegador/);
  assert.doesNotMatch(`${ficha.entra} ${ficha.processa}`, /miniatura/, 'não existe miniatura nesta versão');
});

test('"Como usar" traz passos, exemplo, limites e perguntas, e o exemplo bate com a conta', async () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3 && exemplo.texto && limites && perguntas.length >= 3);
  assert.match(limites, /100 MB/);
  assert.match(limites, /2\.000 páginas/);
  const r = await removerPáginas(await abrir(10), '1, 4, 9-10', { biblioteca });
  assert.equal(r.depois, 6);
  assert.deepEqual(await origensDasPáginas(r.bytes), [2, 3, 5, 6, 7, 8]);
});
