/**
 * Testes de Girar PDF. Casos da pesquisa do iLovePDF (documentação/pesquisa-ilovepdf/d-editar.md, D2),
 * com PDFs gerados aqui: o "misto" tem 4 páginas, a última já com /Rotate 90.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  planejarGiro, girarPdf, rotaçãoNormalizada, ÂNGULOS, RÓTULO_DOS_ÂNGULOS,
} from '../scripts/cálculos/girar-pdf.js';
import ferramenta from '../scripts/ferramentas/girar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import {
  biblioteca, pdfNumerado, rotaçõesDasPáginas, origensDasPáginas, pdfProtegido, bytesDeTexto,
} from './auxiliares/pdfs-de-teste.mjs';

const { PDFDocument, PDFName, PDFNumber, degrees } = biblioteca;

/** Retrato A4, paisagem A4, Carta e A4 com /Rotate 90. */
async function pdfMisto() {
  const documento = await PDFDocument.create();
  documento.addPage([595.28, 841.89]);
  documento.addPage([841.89, 595.28]);
  documento.addPage([612, 792]);
  documento.addPage([595.28, 841.89]).setRotation(degrees(90));
  return documento.save({ useObjectStreams: false });
}

const girar = async (bytes, quais, ângulo, páginas = '') => {
  const nome = 'Escaneado Março.pdf';
  const plano = planejarGiro((await PDFDocument.load(bytes)).getPageCount(), { quais, páginas });
  assert.equal(plano.ok, true, plano.mensagem);
  const r = await girarPdf({ nome, bytes }, plano.páginas, ângulo, { biblioteca });
  assert.equal(r.ok, true, r.mensagem);
  return r;
};

test('girar tudo 90° à direita: 0, 0, 0 e 90 viram 90, 90, 90 e 180', async () => {
  const r = await girar(await pdfMisto(), 'todas', 90);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [90, 90, 90, 180]);
  assert.deepEqual(r.antes, [0, 0, 0, 90]);
  assert.deepEqual(r.depois, [90, 90, 90, 180]);
  assert.equal(r.jáGiradas, 1);
  assert.equal(r.nomeSugerido, 'escaneado-marco-girado');
});

test('só as páginas 2-3 por 270°: as outras ficam como estavam', async () => {
  const r = await girar(await pdfMisto(), 'escolhidas', 270, '2-3');
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [0, 270, 270, 90]);
  assert.deepEqual(r.giradas, [2, 3]);
});

test('quatro giros de 90° à direita voltam ao original', async () => {
  let bytes = await pdfNumerado(5);
  for (let i = 0; i < 4; i++) bytes = (await girar(bytes, 'todas', 90)).bytes;
  assert.deepEqual(await rotaçõesDasPáginas(bytes), [0, 0, 0, 0, 0]);
  assert.deepEqual(await origensDasPáginas(bytes), [1, 2, 3, 4, 5], 'a ordem e o tamanho das páginas não mudam');
});

test('180° duas vezes volta ao original; 90° à esquerda (270) desfaz 90° à direita', async () => {
  const original = await pdfNumerado(3, { rotações: { 2: 90 } });
  const duas = (await girar((await girar(original, 'todas', 180)).bytes, 'todas', 180)).bytes;
  assert.deepEqual(await rotaçõesDasPáginas(duas), [0, 90, 0]);
  const volta = (await girar((await girar(original, 'todas', 90)).bytes, 'todas', 270)).bytes;
  assert.deepEqual(await rotaçõesDasPáginas(volta), [0, 90, 0]);
});

test('ímpares e pares', async () => {
  const bytes = await pdfNumerado(5);
  assert.deepEqual(await rotaçõesDasPáginas((await girar(bytes, 'ímpares', 90)).bytes), [90, 0, 90, 0, 90]);
  assert.deepEqual(await rotaçõesDasPáginas((await girar(bytes, 'pares', 180)).bytes), [0, 180, 0, 180, 0]);
});

test('PDF de uma página: pares não existem e a recusa explica', () => {
  const r = planejarGiro(1, { quais: 'pares' });
  assert.equal(r.ok, false);
  assert.equal(r.campo, 'quais');
  assert.match(r.mensagem, /nenhuma é par/);
  assert.deepEqual(planejarGiro(1, { quais: 'ímpares' }).páginas, [1]);
});

test('propriedade: girar não muda tamanho nem ordem das páginas, e só as escolhidas mudam de rotação', async () => {
  const bytes = await pdfMisto();
  const antes = await rotaçõesDasPáginas(bytes);
  const r = await girar(bytes, 'escolhidas', 90, '1, 3');
  const depois = await rotaçõesDasPáginas(r.bytes);
  assert.deepEqual(depois.map((g, i) => g - antes[i]), [90, 0, 90, 0]);
  const tamanhos = async (b) => (await PDFDocument.load(b)).getPages().map((p) => p.getSize());
  assert.deepEqual(await tamanhos(r.bytes), await tamanhos(bytes));
});

test('rotação herdada do nó da árvore de páginas entra na soma', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([200, 300]);
  documento.addPage([200, 300]);
  documento.catalog.Pages().set(PDFName.of('Rotate'), PDFNumber.of(90));
  const bytes = await documento.save({ useObjectStreams: false });
  assert.deepEqual(await rotaçõesDasPáginas(bytes), [90, 90], 'a leitura enxerga o valor herdado');
  const r = await girar(bytes, 'escolhidas', 90, '1');
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [180, 90]);
});

test('/Rotate fora do padrão (45, negativo) é normalizado antes de somar', async () => {
  assert.equal(rotaçãoNormalizada(45), 0);
  assert.equal(rotaçãoNormalizada(-90), 270);
  assert.equal(rotaçãoNormalizada(450), 90);
  assert.equal(rotaçãoNormalizada(360), 0);
  assert.equal(rotaçãoNormalizada(NaN), 0);
  assert.equal(rotaçãoNormalizada(Infinity), 0);
  const documento = await PDFDocument.create();
  const página = documento.addPage([200, 300]);
  página.node.set(PDFName.of('Rotate'), PDFNumber.of(45));
  const r = await girar(await documento.save({ useObjectStreams: false }), 'todas', 90);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [90]);
});

test('página escolhida fora do total, texto, vazio e intervalo invertido são recusados no campo das páginas', async () => {
  const recusa = (páginas) => planejarGiro(4, { quais: 'escolhidas', páginas });
  assert.equal(recusa('5').mensagem, 'A página 5 não existe: o PDF tem 4 páginas.');
  assert.equal(recusa('0').erro, 'página_zero');
  assert.equal(recusa('abc').erro, 'páginas_inválido');
  assert.equal(recusa('').erro, 'páginas_vazio');
  assert.equal(recusa('4-2').erro, 'intervalo_invertido');
  assert.equal(recusa('abc').campo, 'páginas');
  assert.deepEqual(recusa('4, 1-2, 2').páginas, [1, 2, 4]);
  // "todas" ignora o campo, mesmo com lixo digitado antes.
  assert.deepEqual(planejarGiro(4, { quais: 'todas', páginas: 'abc' }).páginas, [1, 2, 3, 4]);
});

test('ângulo inválido, PDF protegido, corrompido, vazio e que não é PDF são recusados com mensagem', async () => {
  const bom = await pdfNumerado(2);
  assert.equal((await girarPdf({ nome: 'a.pdf', bytes: bom }, [1], 45, { biblioteca })).erro, 'ângulo_inválido');
  assert.equal((await girarPdf({ nome: 'a.pdf', bytes: bom }, [1], 360, { biblioteca })).ok, false);

  const protegido = await girarPdf({ nome: 'senha.pdf', bytes: await pdfProtegido() }, [1], 90, { biblioteca });
  assert.equal(protegido.erro, 'pdf_protegido');
  assert.match(protegido.mensagem, /senha/);
  assert.equal((await girarPdf({ nome: 'q.pdf', bytes: bytesDeTexto('%PDF-1.7\nquebrado') }, [1], 90, { biblioteca })).erro, 'pdf_corrompido');
  assert.equal((await girarPdf({ nome: 'v.pdf', bytes: new Uint8Array() }, [1], 90, { biblioteca })).erro, 'arquivo_vazio');
  assert.equal((await girarPdf({ nome: 'f.pdf', bytes: bytesDeTexto('texto') }, [1], 90, { biblioteca })).erro, 'arquivo_nao_pdf');
});

test('o rótulo de cada giro existe e a ficha do catálogo promete só o que a ferramenta entrega', () => {
  for (const ângulo of ÂNGULOS) assert.ok(RÓTULO_DOS_ÂNGULOS[ângulo]);
  const ficha = ferramentaPorSlug['girar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.match(ficha.processa, /não sai do aparelho/);
});

test('"Como usar" está completo e o exemplo bate com a conta', async () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3 && exemplo.texto && limites && perguntas.length >= 3);
  assert.match(limites, /100 MB/);
  const r = await girar(await pdfNumerado(6, { rotações: { 2: 270, 5: 270 } }), 'escolhidas', 90, '2, 5');
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [0, 0, 0, 0, 0, 0]);
});
