/**
 * Testes de juntar PDF.
 *
 * Os casos vêm do teste do Ander Flow (testes/testes-unidade/
 * juntar-pdf-processamento.test.js) e rodam com o mesmo build da pdf-lib que
 * a página carrega, em recursos/.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import * as biblioteca from '../recursos/pdf-lib.esm.min.js';
import {
  juntarPdfs, pareceArquivoPdf, validarArquivoPdf, mensagemDeErroDoPdf, formatarTamanho,
  LIMITE_DE_ARQUIVOS, TAMANHO_MÁXIMO_POR_ARQUIVO,
} from '../scripts/cálculos/pdf.js';
import ferramenta from '../scripts/ferramentas/juntar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument } = biblioteca;

async function pdfDeTeste(quantidadeDePáginas, largura = 200) {
  const documento = await PDFDocument.create();
  for (let i = 0; i < quantidadeDePáginas; i++) documento.addPage([largura, 200]);
  return documento.save();
}

/* ------------------------------------------------- casos do Ander Flow */

test('junta dois PDFs na ordem pedida e soma as páginas', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(2, 111) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(3, 222) },
  ];
  const r = await juntarPdfs(arquivos, { biblioteca });
  assert.equal(r.ok, true);
  assert.equal(r.páginas, 5);
  assert.equal(r.arquivos, 2);
  assert.deepEqual(r.detalhes, [{ nome: 'a.pdf', páginas: 2 }, { nome: 'b.pdf', páginas: 3 }]);

  const relido = await PDFDocument.load(r.bytes);
  assert.equal(relido.getPageCount(), 5);
  // A ordem é a da lista: as páginas de a.pdf (largura 111) vêm antes das de b.pdf (222).
  assert.deepEqual(relido.getPages().map((p) => Math.round(p.getWidth())), [111, 111, 222, 222, 222]);
});

test('o progresso conta página a página', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(1) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(2) },
  ];
  const passos = [];
  await juntarPdfs(arquivos, { biblioteca, aoProgredir: (p) => passos.push([p.página, p.total, p.arquivo]) });
  assert.deepEqual(passos, [[1, 3, 'a.pdf'], [2, 3, 'b.pdf'], [3, 3, 'b.pdf']]);
});

test('cancelamento interrompe de verdade', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(2) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(2) },
  ];
  let vezes = 0;
  const r = await juntarPdfs(arquivos, { biblioteca, cancelado: () => ++vezes > 2 });
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'cancelado');
});

test('o clique em cancelar, que chega por fora enquanto a junção roda, é atendido', async () => {
  // O "Cancelar" da tela é um evento: só é atendido se a junção devolver a vez
  // ao navegador de tempos em tempos. Um laço sem folga terminaria antes.
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(30) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(30) },
  ];
  let cancelar = false;
  const passos = [];
  const junção = juntarPdfs(arquivos, {
    biblioteca,
    cancelado: () => cancelar,
    aoProgredir: ({ página }) => passos.push(página),
  });
  setTimeout(() => { cancelar = true; }, 0);
  const r = await junção;
  assert.equal(r.erro, 'cancelado');
  assert.ok(passos.length < 60, `copiou ${passos.length} de 60 páginas antes de parar`);
});

test('arquivo que não é PDF é recusado pelo conteúdo, não pela extensão', async () => {
  const bytes = new TextEncoder().encode('isto aqui é um texto qualquer');
  assert.equal(pareceArquivoPdf(bytes), false);
  const r = await juntarPdfs([{ nome: 'falso.pdf', bytes }, { nome: 'b.pdf', bytes: await pdfDeTeste(1) }], { biblioteca });
  assert.equal(r.erro, 'arquivo_nao_pdf');
  assert.equal(r.extras.nome, 'falso.pdf');
});

test('PDF com cabeçalho certo e conteúdo quebrado vira pdf_corrompido', async () => {
  const bytes = new TextEncoder().encode('%PDF-1.7\nconteudo quebrado');
  const r = await juntarPdfs([{ nome: 'quebrado.pdf', bytes }, { nome: 'b.pdf', bytes: await pdfDeTeste(1) }], { biblioteca });
  assert.equal(r.erro, 'pdf_corrompido');
  assert.equal(r.extras.nome, 'quebrado.pdf');
});

test('menos de dois arquivos e lote acima do limite são recusados', async () => {
  const um = [{ nome: 'a.pdf', bytes: await pdfDeTeste(1) }];
  assert.equal((await juntarPdfs(um, { biblioteca })).erro, 'poucos_arquivos');
  assert.equal((await juntarPdfs([], { biblioteca })).erro, 'poucos_arquivos');

  const quatro = await Promise.all([1, 2, 3, 4].map(async (n) => ({ nome: `${n}.pdf`, bytes: await pdfDeTeste(1) })));
  const r = await juntarPdfs(quatro, { biblioteca });
  assert.equal(r.erro, 'limite_de_arquivos');
  assert.equal(r.extras.limite, 3);
  assert.equal(r.extras.enviados, 4);

  // O limite é parâmetro: o lote maior do Ander Flow (100, para conta Plus) funciona quando existir conta.
  const maior = await juntarPdfs(quatro, { biblioteca, limiteDeArquivos: 100 });
  assert.equal(maior.ok, true);
  assert.equal(maior.páginas, 4);
});

test('arquivo grande demais é recusado antes de ler', () => {
  const r = validarArquivoPdf({ nome: 'g.pdf', tamanho: 200 * 1024 * 1024, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) });
  assert.equal(r.erro, 'arquivo_grande_demais');
  assert.equal(validarArquivoPdf({ nome: 'ok.pdf', tamanho: TAMANHO_MÁXIMO_POR_ARQUIVO, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }).ok, true);
});

/* ------------------------------------------------------ só do portal */

test('PDF protegido por senha vira pdf_protegido', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([200, 200]);
  // Um dicionário /Encrypt no trailer é o que marca o PDF como protegido.
  documento.context.trailerInfo.Encrypt = documento.context.obj({ Filter: 'Standard', V: 2, R: 3 });
  const protegido = await documento.save({ useObjectStreams: false });
  const r = await juntarPdfs([{ nome: 'senha.pdf', bytes: protegido }, { nome: 'b.pdf', bytes: await pdfDeTeste(1) }], { biblioteca });
  assert.equal(r.erro, 'pdf_protegido');
  assert.equal(r.extras.nome, 'senha.pdf');
});

test('assinatura %PDF depois de lixo nos primeiros 1024 bytes é aceita; depois disso, não', () => {
  const com = (antes) => new Uint8Array([...new Uint8Array(antes).fill(0x20), 0x25, 0x50, 0x44, 0x46]);
  assert.equal(pareceArquivoPdf(com(3)), true);
  assert.equal(pareceArquivoPdf(com(1020)), true);
  assert.equal(pareceArquivoPdf(com(1021)), false);
  assert.equal(pareceArquivoPdf(new Uint8Array()), false);
});

test('mensagens de erro chegam em português, com o nome do arquivo', () => {
  assert.match(mensagemDeErroDoPdf('arquivo_nao_pdf', { nome: 'x.pdf' }), /"x\.pdf" não é um PDF/);
  assert.match(mensagemDeErroDoPdf('pdf_protegido', { nome: 'x.pdf' }), /senha/);
  assert.match(mensagemDeErroDoPdf('pdf_corrompido', { nome: 'x.pdf' }), /danificado/);
  assert.match(mensagemDeErroDoPdf('arquivo_grande_demais', { nome: 'x.pdf' }), /100 MB/);
  assert.match(mensagemDeErroDoPdf('limite_de_arquivos'), /até 3 arquivos/);
  assert.equal(mensagemDeErroDoPdf('poucos_arquivos'), 'Escolha pelo menos dois PDFs.');
  assert.match(mensagemDeErroDoPdf('qualquer'), /Não foi possível/);
});

test('tamanho de arquivo legível', () => {
  assert.equal(formatarTamanho(100 * 1024 * 1024), '100 MB');
  assert.equal(formatarTamanho(1.25 * 1024 * 1024), '1,3 MB');
  assert.equal(formatarTamanho(350 * 1024), '350 kB');
  assert.equal(formatarTamanho(10), '1 kB');
});

test('o limite sem conta é o do plano grátis do Ander Flow e aparece em "Como usar"', () => {
  assert.equal(LIMITE_DE_ARQUIVOS, 3);
  assert.ok(ferramenta.instruções.limites.startsWith('Até 3 arquivos por vez, cada um com até 100 MB.'));
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['juntar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('a pdf-lib do portal é o build ES module 1.17.1 sem eval, para caber na política de segurança', async () => {
  const código = await readFile(new URL('../recursos/pdf-lib.esm.min.js', import.meta.url), 'utf8');
  assert.equal(/\beval\(|new Function\(/.test(código), false);
  assert.equal(typeof biblioteca.PDFDocument.load, 'function');
  const licença = await readFile(new URL('../recursos/LICENSE-pdf-lib.txt', import.meta.url), 'utf8');
  assert.match(licença, /pdf-lib 1\.17\.1/);
  assert.match(licença, /MIT License/);
});
