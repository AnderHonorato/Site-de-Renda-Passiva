import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as biblioteca from '../recursos/pdf-lib.esm.min.js';
import { editarMetadadosPdf, lerMetadadosPdf, LIMITE_DE_CARACTERES, TAMANHO_MÁXIMO } from '../scripts/cálculos/editar-metadados-do-pdf.js';

const { PDFDocument, PDFName, PDFString, PDFRawStream } = biblioteca;

async function base({ metadados = true, xmp = true, personalizado = true } = {}) {
  const doc = await PDFDocument.create();
  doc.addPage([200, 300]);
  if (metadados) {
    doc.setTitle('Relatório antigo');
    doc.setAuthor('Ana');
    doc.setSubject('Vendas');
    doc.setKeywords(['vendas', 'novembro']);
    doc.setCreator('Editor original');
    doc.setProducer('Gerador original');
    doc.setCreationDate(new Date('2026-01-02T03:04:05Z'));
    doc.setModificationDate(new Date('2026-02-03T04:05:06Z'));
  }
  if (personalizado) doc.getInfoDict().set(PDFName.of('Custom'), PDFString.of('valor oculto'));
  if (xmp) doc.catalog.set(PDFName.of('Metadata'), doc.context.register(doc.context.stream('<x:xmpmeta>valor anterior</x:xmpmeta>')));
  return doc.save({ updateFieldAppearances: false });
}

const abrir = (bytes) => PDFDocument.load(bytes, { updateMetadata: false });
const temPacoteXmp = (documento) => [...documento.context.enumerateIndirectObjects()].some(([, objeto]) =>
  objeto instanceof PDFRawStream && new TextDecoder().decode(objeto.contents).includes('valor antigo'));

test('lê campos existentes, páginas e datas ISO do PDF', async () => {
  const r = await lerMetadadosPdf(await base(), biblioteca);
  assert.equal(r.páginas, 1);
  assert.deepEqual(r.campos, {
    titulo: 'Relatório antigo', autor: 'Ana', assunto: 'Vendas', 'palavras-chave': 'vendas novembro',
    criador: 'Editor original', produtor: 'Gerador original', 'criado-em': '2026-01-02T03:04:05Z', 'alterado-em': '2026-02-03T04:05:06Z',
  });
});

test('edita campos com acentos, preserva os campos informados, apaga o que fica vazio e remove XMP antigo', async () => {
  const entrada = await base();
  const r = await editarMetadadosPdf(entrada, {
    titulo: 'Relatório — novembro', autor: '', assunto: 'Resumo do mês', 'palavras-chave': '日本語; análise, 🚀',
    criador: 'Ferramentas do Ander', produtor: '', 'criado-em': '2024-02-29T23:59:59Z', 'alterado-em': '',
  }, biblioteca);
  const doc = await abrir(r.bytes);
  assert.equal(doc.getTitle(), 'Relatório — novembro');
  assert.equal(doc.getAuthor(), undefined);
  assert.equal(doc.getSubject(), 'Resumo do mês');
  assert.equal(doc.getKeywords(), '日本語, análise, 🚀');
  assert.equal(doc.getCreator(), 'Ferramentas do Ander');
  assert.equal(doc.getProducer(), undefined);
  assert.equal(doc.getCreationDate().toISOString(), '2024-02-29T23:59:59.000Z');
  assert.equal(doc.getModificationDate(), undefined);
  assert.equal(doc.catalog.get(PDFName.of('Metadata')), undefined);
  assert.equal(temPacoteXmp(doc), false);
  assert.deepEqual(r.camposAtualizados, ['Título', 'Assunto', 'Palavras-chave', 'Aplicativo criador', 'Data de criação (UTC)']);
  assert.deepEqual(await doc.getPageCount(), 1);
});

test('“limpar tudo” remove campos standard, personalizados e XMP', async () => {
  const r = await editarMetadadosPdf(await base(), {}, biblioteca, { limparTudo: true });
  const doc = await abrir(r.bytes);
  assert.equal(doc.getTitle(), undefined);
  assert.equal(doc.getAuthor(), undefined);
  assert.equal(doc.getInfoDict().has(PDFName.of('Custom')), false);
  assert.equal(doc.catalog.get(PDFName.of('Metadata')), undefined);
  assert.equal(temPacoteXmp(doc), false);
  assert.equal(r.limpoTudo, true);
});

test('campos em branco removem o valor anterior sem apagar campos personalizados', async () => {
  const r = await editarMetadadosPdf(await base(), { titulo: '', autor: '', assunto: '', 'palavras-chave': '', criador: '', produtor: '', 'criado-em': '', 'alterado-em': '' }, biblioteca);
  const doc = await abrir(r.bytes);
  assert.equal(doc.getTitle(), undefined);
  assert.equal(doc.getInfoDict().has(PDFName.of('Custom')), true);
});

test('recusa cabeçalho incorreto, limite excedido, data inválida e excesso de palavras-chave', async () => {
  await assert.rejects(editarMetadadosPdf(new Uint8Array([1, 2, 3, 4, 5]), {}, biblioteca), /não parece ser um PDF válido/);
  await assert.rejects(editarMetadadosPdf(new Uint8Array(TAMANHO_MÁXIMO + 1), {}, biblioteca), /passou do limite/);
  await assert.rejects(editarMetadadosPdf(await base(), { titulo: 'a'.repeat(LIMITE_DE_CARACTERES + 1) }, biblioteca), /passou de 4000 caracteres/);
  await assert.rejects(editarMetadadosPdf(await base(), { 'criado-em': 'não é uma data' }, biblioteca), /data de criação/);
  await assert.rejects(editarMetadadosPdf(await base(), { 'criado-em': '2026-02-30T12:00:00Z' }, biblioteca), /data de criação/);
  await assert.rejects(editarMetadadosPdf(await base(), { 'criado-em': '2026-11-14T15:30:00-03:00' }, biblioteca), /data de criação/);
  await assert.rejects(editarMetadadosPdf(await base(), { 'criado-em': '2026-11-14T15:30:00.123Z' }, biblioteca), /data de criação/);
  await assert.rejects(editarMetadadosPdf(await base(), { 'palavras-chave': Array.from({ length: 101 }, (_, i) => `k${i}`).join(',') }, biblioteca), /até 100 palavras-chave/);
});
