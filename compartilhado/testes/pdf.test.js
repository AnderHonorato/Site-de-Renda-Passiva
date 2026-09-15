import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codificarWinAnsi } from '../scripts/pdf/codificar-winansi.js';
import { criarDocumentoPdf } from '../scripts/pdf/criar-documento-pdf.js';
import { medirTextoHelvetica } from '../scripts/pdf/medir-texto-helvetica.js';

const comoTexto = (bytes) => Buffer.from(bytes).toString('latin1');

test('codifica português em WinAnsi e conta caracteres sem equivalente', () => {
  assert.deepEqual(codificarWinAnsi('ção').bytes, [0xe7, 0xe3, 0x6f]);
  assert.deepEqual(codificarWinAnsi('“Olá” — €').bytes, [0x93, 0x4f, 0x6c, 0xe1, 0x94, 0x20, 0x97, 0x20, 0x80]);
  const emoji = codificarWinAnsi('bolo 🎂');
  assert.equal(emoji.substituídos, 1);
  assert.equal(emoji.bytes.at(-1), 0x3f);
});

test('mede texto com as métricas da Helvetica', () => {
  assert.ok(Math.abs(medirTextoHelvetica('AAA', 10) - 20.01) < 1e-9);
  assert.equal(medirTextoHelvetica('ã', 10), medirTextoHelvetica('a', 10));
  assert.ok(medirTextoHelvetica('m', 10, true) > medirTextoHelvetica('m', 10));
});

test('gera PDF estruturalmente válido com várias páginas e tabela xref correta', () => {
  const documento = criarDocumentoPdf({ título: 'Atividade de João', autor: 'Anderson' });
  documento.novaPágina().texto(20, 20, 'Operações — atenção', { tamanho: 14, negrito: true });
  documento.linha(10, 30, 200, 30, { tracejado: [3, 2] });
  documento.retângulo(10, 40, 50, 20, { preenchimento: '#eeeeee' });
  documento.polilinha([[10, 70], [60, 70], [60, 90]], { fechar: true });
  documento.novaPágina().texto(105, 20, 'Gabarito (parêntese) \\ barra', { alinhamento: 'centro', contorno: true });
  const bytes = documento.gerarBytes();
  const texto = comoTexto(bytes);

  assert.ok(texto.startsWith('%PDF-1.4\n'));
  assert.ok(texto.endsWith('%%EOF\n'));
  assert.match(texto, /\/Count 2/);
  assert.match(texto, /\/Title <FEFF/);
  assert.match(texto, /\(Gabarito \\\(par\\352ntese\\\) \\\\ barra\) Tj/);

  const inícioDaTabela = Number(/startxref\n(\d+)\n%%EOF/.exec(texto)[1]);
  assert.equal(texto.slice(inícioDaTabela, inícioDaTabela + 4), 'xref');
  const entradas = texto.slice(inícioDaTabela).split('\n').slice(3).filter((linha) => / 00000 n $/.test(linha));
  entradas.forEach((linha, índice) => {
    const posição = Number(linha.slice(0, 10));
    assert.ok(texto.startsWith(`${índice + 1} 0 obj`, posição), `objeto ${índice + 1} na posição ${posição}`);
  });
  for (const [, tamanho, conteúdo] of texto.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) {
    assert.equal(conteúdo.length, Number(tamanho));
  }
});

test('documento vazio ainda gera uma página', () => {
  const texto = comoTexto(criarDocumentoPdf().gerarBytes());
  assert.match(texto, /\/Count 1/);
});
