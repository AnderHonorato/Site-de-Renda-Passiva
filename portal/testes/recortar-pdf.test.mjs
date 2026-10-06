/**
 * Testes de recortar PDF.
 *
 * Os casos da pesquisa (documentação/pesquisa-ilovepdf/d-editar.md, D5) foram
 * conferidos à mão: página A4 = 595,28 × 841,89 pt; 50 pt de cada lado dão
 * CropBox [50, 50, 545,28, 791,89] e a MediaBox não muda.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  biblioteca, pdfDeTeste, pdfProtegido, caixaDaPágina, textosDaPágina, perto,
} from './auxiliares/pdf-de-teste.mjs';
import {
  recortarPdf, caixaRecortada, mensagemDeErroDeRecorte, UNIDADES, SOBRA_MÍNIMA,
} from '../scripts/cálculos/recortar-pdf.js';
import { geometriaDaPágina, paraEspaçoDoPdf, mmParaPt } from '../scripts/cálculos/pdf-páginas.js';
import ferramenta from '../scripts/ferramentas/recortar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, degrees } = biblioteca;

const recortar = (bytes, opções = {}) => recortarPdf({ nome: 'teste.pdf', bytes }, { biblioteca, ...opções });
const reabrir = (bytes) => PDFDocument.load(bytes);
const iguais = (a, b, tolerância = 0.01) => a.length === b.length && a.every((n, i) => perto(n, b[i], tolerância));
const todos = { cima: 50, direita: 50, baixo: 50, esquerda: 50 };

/* -------------------------------------------- casos da pesquisa (D5) */

test('50 pt de cada lado em todas as páginas: CropBox [50, 50, 545,28, 791,89] e MediaBox intacta', async () => {
  const r = await recortar(await pdfDeTeste(5), { margens: todos, unidade: 'pt' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.cortadas, [1, 2, 3, 4, 5]);
  const documento = await reabrir(r.bytes);
  for (let i = 0; i < 5; i++) {
    assert.ok(iguais(caixaDaPágina(documento, i, 'CropBox'), [50, 50, 545.28, 791.89]), `CropBox da página ${i + 1}`);
    assert.ok(iguais(caixaDaPágina(documento, i, 'MediaBox'), [0, 0, 595.28, 841.89]), `MediaBox da página ${i + 1}`);
  }
});

test('só a página 2, com "página atual" = faixa "2": as outras ficam sem CropBox', async () => {
  const r = await recortar(await pdfDeTeste(5), { margens: todos, unidade: 'pt', páginas: '2' });
  const documento = await reabrir(r.bytes);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => caixaDaPágina(documento, i, 'CropBox') !== null), [false, true, false, false, false]);
  assert.deepEqual(r.cortadas, [2]);
});

test('páginas de tamanhos diferentes: as mesmas margens em pontos dão caixas de tamanhos diferentes', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([595.28, 841.89]);
  documento.addPage([841.89, 595.28]);
  documento.addPage([612, 792]);
  const r = await recortar(await documento.save(), { margens: todos, unidade: 'pt' });
  const saída = await reabrir(r.bytes);
  assert.ok(iguais(caixaDaPágina(saída, 0, 'CropBox'), [50, 50, 545.28, 791.89]));
  assert.ok(iguais(caixaDaPágina(saída, 1, 'CropBox'), [50, 50, 791.89, 545.28]));
  assert.ok(iguais(caixaDaPágina(saída, 2, 'CropBox'), [50, 50, 562, 742]));
});

test('página rotacionada 90°: a esquerda que se vê é a base do PDF (e assim por diante nas outras rotações)', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([600, 800]).setRotation(degrees(90));
  const r = await recortar(await documento.save(), { margens: { cima: 10, direita: 20, baixo: 30, esquerda: 40 }, unidade: 'pt' });
  // Vista a 90° (horária): esquerda visual = base do PDF; direita visual = topo; cima visual = esquerda do PDF; baixo visual = direita.
  assert.ok(iguais(caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox'), [10, 40, 570, 780]));
});

test('as quatro rotações: cada margem tira o lado que a pessoa vê, e só ele', async () => {
  for (const rotação of [0, 90, 180, 270]) {
    const documento = await PDFDocument.create();
    documento.addPage([600, 800]).setRotation(degrees(rotação));
    const bytes = await documento.save();
    const original = geometriaDaPágina((await reabrir(bytes)).getPage(0));
    const { largura: L, altura: A } = original;
    // Retângulo que deve sobrar, como se vê (origem embaixo à esquerda), para cada lado cortado em 100 pt.
    const sobra = {
      cima: [0, 0, L, A - 100], direita: [0, 0, L - 100, A], baixo: [0, 100, L, A], esquerda: [100, 0, L, A],
    };
    for (const [lado, [x1, y1, x2, y2]] of Object.entries(sobra)) {
      const r = await recortar(bytes, { margens: { [lado]: 100 }, unidade: 'pt' });
      const caixa = caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox');
      const cantos = [paraEspaçoDoPdf(original, x1, y1), paraEspaçoDoPdf(original, x2, y2)];
      const esperado = [
        Math.min(cantos[0].x, cantos[1].x), Math.min(cantos[0].y, cantos[1].y),
        Math.max(cantos[0].x, cantos[1].x), Math.max(cantos[0].y, cantos[1].y),
      ];
      assert.ok(iguais(caixa, esperado), `${rotação}° cortando ${lado}: ${caixa} em vez de ${esperado}`);
    }
  }
});

test('a conversão de margens da tela para o espaço do PDF, lado a lado', () => {
  const base = { x: 0, y: 0, w: 600, h: 800 };
  const m = { cima: 1, direita: 2, baixo: 3, esquerda: 4 };
  // [x, y, largura, altura] esperado em cada rotação, conferido à mão:
  // 90° → esquerda do PDF = cima visto, direita = baixo, base = esquerda vista, topo = direita vista; e assim por diante.
  const esperado = {
    0: [4, 3, 594, 796],
    90: [1, 4, 596, 794],
    180: [2, 1, 594, 796],
    270: [3, 2, 596, 794],
  };
  for (const [rot, caixa] of Object.entries(esperado)) {
    const c = caixaRecortada({ ...base, rot: Number(rot) }, m);
    assert.deepEqual([c.x, c.y, c.w, c.h], caixa, `rotação ${rot}`);
  }
});

test('CropBox que já existia: o corte parte da área visível, e não da página inteira', async () => {
  const documento = await reabrir(await pdfDeTeste(1));
  documento.getPage(0).setCropBox(100, 100, 300, 400);
  const r = await recortar(await documento.save(), { margens: { esquerda: 20, direita: 30, cima: 10, baixo: 40 }, unidade: 'pt' });
  assert.ok(iguais(caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox'), [120, 140, 370, 490]));
});

test('CropBox maior que a MediaBox vale como a interseção dela com a página', async () => {
  const documento = await reabrir(await pdfDeTeste(1, { largura: 200, altura: 200 }));
  documento.getPage(0).setCropBox(-50, -50, 400, 400);
  const r = await recortar(await documento.save(), { margens: { cima: 10 }, unidade: 'pt' });
  assert.ok(iguais(caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox'), [0, 0, 200, 190]));
});

test('MediaBox que não começa em zero é respeitada', async () => {
  const documento = await PDFDocument.create();
  const página = documento.addPage([300, 300]);
  página.setMediaBox(100, 200, 300, 300);
  const r = await recortar(await documento.save(), { margens: { esquerda: 10, baixo: 20 }, unidade: 'pt' });
  assert.ok(iguais(caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox'), [110, 220, 400, 500]));
});

test('TrimBox, BleedBox e ArtBox que passariam da nova área saem, para valer a CropBox', async () => {
  const documento = await reabrir(await pdfDeTeste(1));
  const página = documento.getPage(0);
  página.setTrimBox(10, 10, 500, 700);
  página.setBleedBox(0, 0, 595, 841);
  página.setArtBox(20, 20, 400, 600);
  const r = await recortar(await documento.save(), { margens: todos, unidade: 'pt' });
  const saída = await reabrir(r.bytes);
  for (const nome of ['TrimBox', 'BleedBox', 'ArtBox']) assert.equal(caixaDaPágina(saída, 0, nome), null, nome);
});

/* ------------------------------------------ o conteúdo cortado continua lá */

test('o texto que ficou fora do recorte CONTINUA no arquivo (é o aviso central da ferramenta)', async () => {
  const r = await recortar(await pdfDeTeste(2), { margens: { cima: 500 }, unidade: 'pt' });
  const documento = await reabrir(r.bytes);
  // "Original 1" fica a 80 pt do topo: cai dentro dos 500 pt cortados e mesmo assim está no arquivo.
  assert.deepEqual(textosDaPágina(documento, 0), ['Original 1']);
  assert.deepEqual(textosDaPágina(documento, 1), ['Original 2']);
  assert.deepEqual(r.avisos, ['conteúdo_continua']);
});

test('o aviso do conteúdo cortado aparece na ficha, nos limites, nas perguntas e no resumo do catálogo', () => {
  const { limites, perguntas } = ferramenta.instruções;
  assert.match(limites, /CONTINUA DENTRO DO ARQUIVO/);
  assert.match(limites, /ocultar informações/);
  assert.match(perguntas[0].r, /continua dentro do PDF/);
  assert.match(ferramentaPorSlug['recortar-pdf'].resumo, /continua dentro do arquivo/);
  assert.match(ferramentaPorSlug['recortar-pdf'].processa, /apagar de verdade/);
});

/* ------------------------------------------------------- unidades */

test('milímetros, centímetros e pontos valem a mesma coisa convertida', async () => {
  const ref = await recortar(await pdfDeTeste(1), { margens: { esquerda: mmParaPt(10) }, unidade: 'pt' });
  for (const [unidade, valor] of [['mm', 10], ['cm', 1]]) {
    const r = await recortar(await pdfDeTeste(1), { margens: { esquerda: valor }, unidade });
    assert.ok(iguais(caixaDaPágina(await reabrir(r.bytes), 0, 'CropBox'), caixaDaPágina(await reabrir(ref.bytes), 0, 'CropBox'), 0.001), unidade);
  }
  assert.ok(perto(UNIDADES.mm * 25.4, 72, 1e-9) && perto(UNIDADES.cm, UNIDADES.mm * 10, 1e-9) && UNIDADES.pt === 1);
});

/* ------------------------------------------------- entradas hostis */

test('sem nenhum corte, margem negativa, NaN, infinito e absurdo são recusados sem abrir o PDF', async () => {
  const vazio = new Uint8Array(); // se abrisse, daria arquivo_vazio
  const erro = async (opções) => (await recortar(vazio, opções)).erro;
  assert.equal(await erro({ margens: {} }), 'sem_corte');
  assert.equal(await erro({ margens: { cima: 0, baixo: 0 } }), 'sem_corte');
  assert.equal(await erro({ margens: { cima: -1 } }), 'margem_inválida');
  assert.equal(await erro({ margens: { cima: Number.NaN } }), 'margem_inválida');
  assert.equal(await erro({ margens: { esquerda: Infinity } }), 'margem_inválida');
  assert.equal(await erro({ margens: { direita: '10' } }), 'margem_inválida');
  assert.equal(await erro({ margens: { baixo: 1e308 } }), 'margem_grande');
  assert.equal(await erro({ margens: { cima: 1 }, unidade: 'polegada' }), 'unidade_inválida');
  const r = await recortar(vazio, { margens: { direita: -3 } });
  assert.equal(mensagemDeErroDeRecorte(r.erro, r.extras), 'A margem à direita precisa ser um número, zero ou maior.');
  assert.equal(mensagemDeErroDeRecorte('sem_corte'), 'Informe quanto cortar em pelo menos um dos lados.');
});

test('corte que come a página inteira é recusado, dizendo a página, e nenhuma página muda', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([600, 800]);
  documento.addPage([100, 100]);
  const r = await recortar(await documento.save(), { margens: { esquerda: 60, direita: 60 }, unidade: 'pt' });
  assert.equal(r.erro, 'corte_demais');
  assert.equal(r.extras.página, 2);
  assert.match(mensagemDeErroDeRecorte(r.erro, r.extras), /Na página 2 o corte deixa só/);
  // A sobra mínima é um limite de verdade: 10 pt passa, 9,9 não.
  const ponto = await PDFDocument.create();
  ponto.addPage([100, 100]);
  const bytes = await ponto.save();
  assert.equal((await recortar(bytes, { margens: { esquerda: 90 }, unidade: 'pt' })).ok, true);
  assert.equal((await recortar(bytes, { margens: { esquerda: 90.1 }, unidade: 'pt' })).erro, 'corte_demais');
  assert.equal(SOBRA_MÍNIMA, 10);
});

test('faixa de páginas inválida e fora do PDF chega com o motivo', async () => {
  const pdf = await pdfDeTeste(3);
  assert.equal((await recortar(pdf, { margens: todos, páginas: 'abc' })).erro, 'faixa_inválida');
  const r = await recortar(pdf, { margens: todos, páginas: '7' });
  assert.deepEqual([r.erro, r.extras.página, r.extras.total], ['faixa_fora', 7, 3]);
});

test('PDF vazio, texto com nome .pdf, corrompido e protegido por senha', async () => {
  assert.equal((await recortar(new Uint8Array(), { margens: todos })).erro, 'arquivo_vazio');
  assert.equal((await recortar(new TextEncoder().encode('só texto'), { margens: todos })).erro, 'arquivo_nao_pdf');
  const quebrado = await recortar(new TextEncoder().encode('%PDF-1.7\nquebrado'), { margens: todos });
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'teste.pdf']);
  assert.equal((await recortar(await pdfProtegido(), { margens: todos })).erro, 'pdf_protegido');
  assert.match(mensagemDeErroDeRecorte('pdf_corrompido', { nome: 'x.pdf' }), /Não foi possível ler "x\.pdf"/);
});

test('PDF de 500 páginas é recortado inteiro; cancelar interrompe e não gera arquivo', async () => {
  const pdf = await pdfDeTeste(500, { texto: false });
  const r = await recortar(pdf, { margens: todos, unidade: 'pt' });
  assert.equal(r.cortadas.length, 500);
  assert.equal((await reabrir(r.bytes)).getPageCount(), 500);
  let vezes = 0;
  assert.equal((await recortar(pdf, { margens: todos, cancelado: () => ++vezes > 100 })).erro, 'cancelado');
});

test('propriedade: recortar duas vezes soma os cortes, e o número de páginas e a MediaBox nunca mudam', async () => {
  const uma = await recortar(await pdfDeTeste(3), { margens: { esquerda: 10, cima: 20 }, unidade: 'pt' });
  const duas = await recortar(uma.bytes, { margens: { esquerda: 5, cima: 5 }, unidade: 'pt' });
  const documento = await reabrir(duas.bytes);
  assert.equal(documento.getPageCount(), 3);
  for (let i = 0; i < 3; i++) {
    assert.ok(iguais(caixaDaPágina(documento, i, 'CropBox'), [15, 0, 595.28, 841.89 - 25]));
    assert.ok(iguais(caixaDaPágina(documento, i, 'MediaBox'), [0, 0, 595.28, 841.89]));
  }
});

test('a página recortada continua sendo uma página válida: abre, tem o mesmo conteúdo e as dimensões da área visível', async () => {
  const r = await recortar(await pdfDeTeste(1), { margens: { cima: 100, baixo: 100 }, unidade: 'pt' });
  const g = geometriaDaPágina((await reabrir(r.bytes)).getPage(0));
  assert.ok(perto(g.largura, 595.28) && perto(g.altura, 841.89 - 200));
  assert.deepEqual(r.tamanhos.map((t) => [t.página, Math.round(t.altura)]), [[1, 642]]);
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['recortar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('"Como usar" traz passos, exemplo conferido, limites e perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /495,3 × 741,9/);
  assert.match(limites, /100 MB/);
});
