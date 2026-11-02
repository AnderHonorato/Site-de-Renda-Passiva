import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { juntarPdfs, pareceArquivoPdf, validarArquivo } from '../../frontend/ferramentas/juntar-pdf/juntar-pdf-processamento.js';

const require = createRequire(import.meta.url);
const biblioteca = require('pdf-lib');
const { PDFDocument } = biblioteca;

async function pdfDeTeste(quantidadeDePaginas) {
  const documento = await PDFDocument.create();
  for (let i = 0; i < quantidadeDePaginas; i++) documento.addPage([200, 200]);
  return documento.save();
}

test('junta dois PDFs na ordem pedida e soma as páginas', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(2) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(3) },
  ];
  const resultado = await juntarPdfs(arquivos, { biblioteca });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.paginas, 5);

  const relido = await PDFDocument.load(resultado.bytes);
  assert.equal(relido.getPageCount(), 5);
});

test('o progresso conta página a página', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(1) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(2) },
  ];
  const passos = [];
  await juntarPdfs(arquivos, { biblioteca, aoProgredir: (p) => passos.push(p.pagina) });
  assert.deepEqual(passos, [1, 2, 3]);
});

test('cancelamento interrompe de verdade', async () => {
  const arquivos = [
    { nome: 'a.pdf', bytes: await pdfDeTeste(2) },
    { nome: 'b.pdf', bytes: await pdfDeTeste(2) },
  ];
  let vezes = 0;
  const resultado = await juntarPdfs(arquivos, {
    biblioteca,
    cancelado: () => ++vezes > 2,
  });
  assert.equal(resultado.ok, false);
  assert.equal(resultado.erro, 'cancelado');
});

test('arquivo que não é PDF é recusado pelo conteúdo, não pela extensão', async () => {
  const bytes = new TextEncoder().encode('isto aqui é um texto qualquer');
  assert.equal(pareceArquivoPdf(bytes), false);
  const resultado = await juntarPdfs(
    [{ nome: 'falso.pdf', bytes }, { nome: 'b.pdf', bytes: await pdfDeTeste(1) }],
    { biblioteca },
  );
  assert.equal(resultado.erro, 'arquivo_nao_pdf');
  assert.equal(resultado.extras.nome, 'falso.pdf');
});

test('PDF com cabeçalho certo e conteúdo quebrado vira pdf_corrompido', async () => {
  const bytes = new TextEncoder().encode('%PDF-1.7\nconteudo quebrado');
  const resultado = await juntarPdfs(
    [{ nome: 'quebrado.pdf', bytes }, { nome: 'b.pdf', bytes: await pdfDeTeste(1) }],
    { biblioteca },
  );
  assert.equal(resultado.erro, 'pdf_corrompido');
});

test('menos de dois arquivos e lote acima do limite são recusados', async () => {
  const um = [{ nome: 'a.pdf', bytes: await pdfDeTeste(1) }];
  assert.equal((await juntarPdfs(um, { biblioteca })).erro, 'poucos_arquivos');

  const quatro = await Promise.all([1, 2, 3, 4].map(async (n) => ({ nome: `${n}.pdf`, bytes: await pdfDeTeste(1) })));
  const resultado = await juntarPdfs(quatro, { biblioteca, limiteDeArquivos: 3 });
  assert.equal(resultado.erro, 'limite_de_arquivos');
  assert.equal(resultado.extras.limite, 3);
  assert.equal(resultado.extras.enviados, 4);

  const comPlus = await juntarPdfs(quatro, { biblioteca, limiteDeArquivos: 100 });
  assert.equal(comPlus.ok, true);
  assert.equal(comPlus.paginas, 4);
});

test('arquivo grande demais é recusado antes de ler', () => {
  const resultado = validarArquivo({ nome: 'g.pdf', tamanho: 200 * 1024 * 1024, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) });
  assert.equal(resultado.erro, 'arquivo_grande_demais');
});
