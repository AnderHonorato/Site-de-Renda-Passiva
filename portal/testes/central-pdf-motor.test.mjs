import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { biblioteca, pdfNumerado } from './auxiliares/pdfs-de-teste.mjs';
import { executarLotePdf, validarOpcoesPdf } from '../servidor/central-pdf-motor.mjs';
import { lerZip } from '../scripts/cálculos/zip.js';

test('recusa perfil desconhecido e opções de conversão inválidas', () => {
  for (const opcoes of [{ perfil: 'constructor' }, { unir: 1 }, { args: [] }, null]) assert.throws(() => validarOpcoesPdf(opcoes), /opções|perfil/);
});

async function lote(t, bytes) {
  const pasta = await mkdtemp(join(tmpdir(), 'teste-lote-pdf-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const diretorio = join(pasta, 'resultado');
  await mkdir(diretorio);
  const entradas = [];
  for (const [i, conteudo] of bytes.entries()) {
    const caminho = join(pasta, 'entrada-' + i);
    await writeFile(caminho, conteudo);
    entradas.push({ nome: '../../proposta.pdf', caminho });
  }
  return { arquivos: entradas, pastaSaida: diretorio };
}

test('confere assinatura, páginas e cancelamento antes do processamento nativo', async t => {
  await assert.rejects(executarLotePdf(await lote(t, [Buffer.from('texto')])), /válido/);
  const grande = await lote(t, [await pdfNumerado(101)]);
  await assert.rejects(executarLotePdf(grande), /100 páginas/);
  await assert.rejects(executarLotePdf({ ...grande, signal: AbortSignal.abort() }), { name: 'AbortError' });
});

test('Ghostscript otimiza dois arquivos, limpa metadados e empacota PDFs e relatórios reais', {
  skip: spawnSync('gs', ['--version']).error?.code === 'ENOENT' && 'Ghostscript indisponível'
}, async t => {
  const doc = await biblioteca.PDFDocument.load(await pdfNumerado(2));
  doc.setTitle('Título privado');
  const pedido = await lote(t, [await doc.save(), await pdfNumerado(1)]);
  const { arquivos, relatorio } = await executarLotePdf({ ...pedido, opcoes: { unir: true, cinza: true } });
  const ler = nome => readFile(arquivos.find(a => a.nome === nome).caminho);
  assert.equal(arquivos.length, 9);
  assert.equal((await biblioteca.PDFDocument.load(await ler('lote-unificado.pdf'))).getPageCount(), 3);
  assert.equal((await biblioteca.PDFDocument.load(await ler('1-proposta-otimizado.pdf'), { updateMetadata: false })).getTitle(), undefined);
  assert.deepEqual(JSON.parse(await ler('relatorio-do-lote.json')), relatorio);
  assert.equal(relatorio.linhas[0][3], (await ler('1-proposta-otimizado.pdf')).length);
  assert.ok(lerZip(await ler('relatorio-do-lote.xlsx')).entradas.some(e => e.nome === 'xl/workbook.xml'));
  const membros = lerZip(await ler('central-pdf-em-lote.zip')).entradas.map(e => e.nome);
  assert.deepEqual(membros, arquivos.slice(0, -1).map(a => a.nome));
});
