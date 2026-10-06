/**
 * Testes de Extrair texto do PDF.
 *
 * O pdf.js de verdade (o mesmo arquivo de recursos/pdfjs/ que a página carrega) lê os PDFs
 * criados aqui com a pdf-lib; nada é desenhado, então não precisa de canvas. As linhas e os
 * parágrafos são conferidos à mão: cada PDF de teste escreve as linhas em posições conhecidas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pdfDeTeste, biblioteca } from './auxiliares/pdf-de-teste.mjs';
import { png } from './auxiliares/imagens-de-teste.mjs';
import {
  extrairTextoDoPdf, montarTextoDaPágina, linhasDaPágina, limparTexto, montarTextoFinal, mensagemDeErroDeExtração, listaDePáginas,
  LIMITE_DE_CARACTERES,
} from '../scripts/cálculos/extrair-texto-de-pdf.js';
import { TAMANHO_MÁXIMO_POR_ARQUIVO } from '../scripts/cálculos/pdf.js';
import { LIMITE_DE_PÁGINAS } from '../scripts/cálculos/pdf-páginas.js';
import { abrirComPdfjsParaTexto, itemEmCoordenadasDaVista } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import ferramenta from '../scripts/ferramentas/extrair-texto-de-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, StandardFonts } = biblioteca;

// O pdf.js avisa no Node que não tem canvas para desenhar; aqui só se lê texto, então o aviso é ruído.
const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };

const extrair = (bytes, opções = {}) => extrairTextoDoPdf({ nome: 'Contrato.pdf', bytes }, { abrir: abrirComPdfjsParaTexto, ...opções });

/**
 * PDF em que cada página é uma lista de linhas {texto, y} (y em pontos, do pé da página).
 * Linhas com `x` ficam deslocadas; o tamanho da letra é 12.
 */
async function pdfComLinhas(páginas, { tamanho = 12 } = {}) {
  const documento = await PDFDocument.create();
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  for (const linhas of páginas) {
    const página = documento.addPage([595.28, 841.89]);
    for (const { texto, y, x = 50 } of linhas) página.drawText(texto, { x, y, size: tamanho, font: fonte });
  }
  return documento.save();
}

/** PDF só com uma foto por página: o que um escaneamento faz. */
async function pdfEscaneado(quantidade) {
  const documento = await PDFDocument.create();
  const imagem = await documento.embedPng(png(40, 40));
  for (let i = 0; i < quantidade; i++) {
    const página = documento.addPage([300, 300]);
    página.drawImage(imagem, { x: 10, y: 10, width: 280, height: 280 });
  }
  return documento.save();
}

/* ----------------------------------------------- texto de verdade */

test('3 páginas viram um texto com o título de cada página, na ordem', async () => {
  const r = await extrair(await pdfDeTeste(3));
  assert.equal(r.ok, true);
  assert.equal(r.texto, '--- Página 1 ---\n\nOriginal 1\n\n--- Página 2 ---\n\nOriginal 2\n\n--- Página 3 ---\n\nOriginal 3');
  assert.deepEqual(r.páginas.map((p) => p.página), [1, 2, 3]);
  assert.equal(r.totalDePáginas, 3);
  assert.deepEqual(r.semTexto, []);
  assert.equal(r.caracteres, 3 * 'Original1'.length);
});

test('sem os títulos, as páginas ficam separadas por uma linha em branco', async () => {
  const r = await extrair(await pdfDeTeste(2), { títulos: false });
  assert.equal(r.texto, 'Original 1\n\nOriginal 2');
});

test('só as páginas pedidas são lidas, e os números de página são os do PDF', async () => {
  const r = await extrair(await pdfDeTeste(6), { páginas: '2, 5-6' });
  assert.deepEqual(r.páginas.map((p) => p.página), [2, 5, 6]);
  assert.match(r.texto, /^--- Página 2 ---\n\nOriginal 2\n\n--- Página 5 ---/);
  assert.equal(r.totalDePáginas, 6);
  assert.doesNotMatch(r.texto, /Original 1\b/);
});

test('acentos, cedilha e til do português saem como estão', async () => {
  const frase = 'Ação de cobrança: João pediu à Maria o coração inteiro, não pela metade.';
  const r = await extrair(await pdfComLinhas([[{ texto: frase, y: 700 }]]), { títulos: false });
  assert.equal(r.texto, frase);
});

test('linhas seguidas ficam em linhas; um espaço grande entre elas vira uma linha em branco', async () => {
  const pdf = await pdfComLinhas([[
    { texto: 'Primeira linha do bloco', y: 700 },
    { texto: 'Segunda linha do bloco', y: 686 },
    { texto: 'Novo parágrafo aqui', y: 640 },
  ]]);
  const r = await extrair(pdf, { títulos: false });
  assert.equal(r.texto, 'Primeira linha do bloco\nSegunda linha do bloco\n\nNovo parágrafo aqui');
});

test('com "parágrafos", as linhas do mesmo bloco se unem e a palavra partida por hífen é recomposta', async () => {
  const pdf = await pdfComLinhas([[
    { texto: 'A informa-', y: 700 },
    { texto: 'ção foi enviada ontem', y: 686 },
    { texto: 'Outro bloco', y: 640 },
  ]]);
  const r = await extrair(pdf, { títulos: false, parágrafos: true });
  assert.equal(r.texto, 'A informação foi enviada ontem\n\nOutro bloco');
  const mantido = await extrair(pdf, { títulos: false });
  assert.equal(mantido.texto, 'A informa-\nção foi enviada ontem\n\nOutro bloco');
});

test('dois pedaços na mesma linha, separados por um vazio, ficam com um espaço entre eles', async () => {
  const pdf = await pdfComLinhas([[{ texto: 'Nome:', y: 700 }, { texto: 'Maria', y: 700, x: 200 }]]);
  const r = await extrair(pdf, { títulos: false });
  assert.equal(r.texto, 'Nome: Maria');
});

test('o texto é conferido por fora: as linhas de um item do pdf.js, em coordenadas da vista', async () => {
  const abertura = await abrirComPdfjsParaTexto(await pdfComLinhas([[{ texto: 'Olá', y: 800 }]]));
  const { itens, largura, altura } = await abertura.texto(1);
  await abertura.fechar();
  assert.deepEqual([largura, altura], [595.28, 841.89]);
  assert.equal(itens.length, 1);
  // Linha de base a 800 pt do pé = 41,89 pt do topo; o vetor "para cima" aponta para y menor.
  assert.ok(Math.abs(itens[0].oy - 41.89) < 0.01);
  assert.ok(itens[0].vy < 0 && Math.abs(itens[0].vx) < 1e-9);
  assert.ok(itens[0].ux > 10 && Math.abs(itens[0].uy) < 1e-9);
});

/* ------------------------------------------------ montagem pura */

test('linhasDaPágina: fim de linha marcado pelo leitor, mudança de linha de base e espaços invisíveis', () => {
  const item = (str, ox, oy, mais = {}) => ({ str, ox, oy, ux: str.length * 6, uy: 0, vx: 0, vy: -12, ...mais });
  const linhas = linhasDaPágina([
    item('Pri', 10, 100), item('meira', 28, 100, { eol: true }),
    item('Segunda', 10, 114),
    item('​\u0000 ', 10, 114),
    item('Terceira', 10, 140),
  ]);
  assert.deepEqual(linhas.map((l) => l.texto), ['Primeira', 'Segunda', 'Terceira']);
  assert.equal(limparTexto('a b​c\u0000d e'), 'a bcd e');
});

test('montarTextoDaPágina com a lista vazia devolve texto vazio, sem erro', () => {
  assert.equal(montarTextoDaPágina([]), '');
  assert.equal(montarTextoDaPágina([{ str: '', ox: 0, oy: 0, ux: 0, uy: 0, vx: 0, vy: -10, eol: true }]), '');
});

test('colunas: ao subir para o topo, começa outro bloco (a ordem é a do arquivo)', () => {
  const item = (str, ox, oy) => ({ str, ox, oy, ux: str.length * 6, uy: 0, vx: 0, vy: -12, eol: true });
  const t = montarTextoDaPágina([item('coluna A 1', 10, 100), item('coluna A 2', 10, 114), item('coluna B 1', 300, 100)]);
  assert.equal(t, 'coluna A 1\ncoluna A 2\n\ncoluna B 1');
});

test('montarTextoFinal marca a página sem texto', () => {
  assert.equal(
    montarTextoFinal([{ página: 1, texto: 'a', vazia: false }, { página: 2, texto: '', vazia: true }]),
    '--- Página 1 ---\n\na\n\n--- Página 2 ---\n\n[Página sem texto]',
  );
});

/* -------------------------------------------------- PDF escaneado */

test('PDF só de imagem não tem texto: a recusa diz que é escaneado e que o OCR é outra ferramenta', async () => {
  const r = await extrair(await pdfEscaneado(3));
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'sem_texto');
  const mensagem = mensagemDeErroDeExtração(r.erro, r.extras);
  assert.match(mensagem, /"Contrato\.pdf" não tem texto para extrair/);
  assert.match(mensagem, /escaneado/);
  assert.match(mensagem, /OCR/);
  assert.match(mensagem, /outra ferramenta/);
});

test('PDF de páginas em branco também é "sem texto"', async () => {
  const r = await extrair(await pdfDeTeste(2, { texto: false }));
  assert.equal(r.erro, 'sem_texto');
});

test('só uma página sem texto no meio: o texto sai, a página é listada como vazia', async () => {
  const documento = await PDFDocument.create();
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  documento.addPage([300, 300]).drawText('Capa', { x: 20, y: 200, size: 14, font: fonte });
  documento.addPage([300, 300]);
  documento.addPage([300, 300]).drawText('Fim', { x: 20, y: 200, size: 14, font: fonte });
  const r = await extrair(await documento.save());
  assert.equal(r.ok, true);
  assert.deepEqual(r.semTexto, [2]);
  assert.equal(r.páginas[1].vazia, true);
  assert.match(r.texto, /--- Página 2 ---\n\n\[Página sem texto\]/);
  assert.equal(listaDePáginas([2]), '2');
});

test('só sinais e espaços não contam como texto', async () => {
  const r = await extrair(await pdfComLinhas([[{ texto: '...  --  *', y: 700 }]]));
  assert.equal(r.erro, 'sem_texto');
});

/* ------------------------------------------------ entradas hostis */

test('arquivo vazio, texto com nome .pdf, imagem renomeada e PDF cortado ao meio', async () => {
  assert.equal((await extrair(new Uint8Array())).erro, 'arquivo_vazio');
  assert.equal((await extrair(new TextEncoder().encode('só texto'))).erro, 'arquivo_nao_pdf');
  assert.equal((await extrair(png(10, 10))).erro, 'arquivo_nao_pdf');
  const quebrado = await extrair(new TextEncoder().encode('%PDF-1.7\nconteudo quebrado'));
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'Contrato.pdf']);
  const inteiro = await pdfDeTeste(5);
  const metade = await extrair(inteiro.slice(0, Math.floor(inteiro.length / 2)));
  assert.equal(metade.ok, false);
  assert.ok(['pdf_corrompido', 'página_com_erro'].includes(metade.erro), metade.erro);
});

test('PDF maior que 100 MB é recusado antes de abrir', async () => {
  const grande = new Uint8Array(TAMANHO_MÁXIMO_POR_ARQUIVO + 1);
  grande.set([0x25, 0x50, 0x44, 0x46]);
  let abriu = false;
  const r = await extrairTextoDoPdf({ nome: 'g.pdf', bytes: grande }, { abrir: async () => { abriu = true; } });
  assert.equal(r.erro, 'arquivo_grande_demais');
  assert.equal(abriu, false);
});

test('protegido por senha e leitor fora do ar', async () => {
  const bytes = await pdfDeTeste(1);
  const comSenha = await extrairTextoDoPdf({ nome: 'x.pdf', bytes }, {
    abrir: async () => { const e = new Error('No password given'); e.name = 'PasswordException'; throw e; },
  });
  assert.equal(comSenha.erro, 'pdf_protegido');
  assert.match(mensagemDeErroDeExtração('pdf_protegido', { nome: 'x.pdf' }), /"x\.pdf" está protegido por senha/);
  const semLeitor = await extrairTextoDoPdf({ nome: 'x.pdf', bytes }, {
    abrir: async () => { const e = new Error('sem rede'); e.name = 'LeitorIndisponível'; throw e; },
  });
  assert.equal(semLeitor.erro, 'leitor_indisponível');
  assert.match(mensagemDeErroDeExtração(semLeitor.erro), /Não foi possível carregar o leitor de PDF/);
});

test('PDF com mais de 3.000 páginas é recusado, dizendo quantas tem', async () => {
  const r = await extrairTextoDoPdf({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, {
    abrir: async () => ({ páginas: LIMITE_DE_PÁGINAS + 1, texto: async () => ({ itens: [] }), fechar() {} }),
  });
  assert.deepEqual([r.erro, r.extras.total, r.extras.limite], ['pdf_páginas_demais', 3001, 3000]);
  assert.match(mensagemDeErroDeExtração(r.erro, r.extras), /3\.001 páginas.*3\.000/);
});

test('faixa de páginas inválida chega com o motivo, e o leitor é fechado mesmo assim', async () => {
  let fechou = 0;
  const abrir = async (bytes) => { const d = await abrirComPdfjsParaTexto(bytes); return { ...d, fechar: async () => { fechou++; await d.fechar(); } }; };
  const bytes = await pdfDeTeste(3);
  const r = await extrairTextoDoPdf({ nome: 'x.pdf', bytes }, { abrir, páginas: '9' });
  assert.deepEqual([r.erro, r.extras.página, r.extras.total], ['faixa_fora', 9, 3]);
  assert.equal(fechou, 1);
  assert.equal((await extrairTextoDoPdf({ nome: 'x.pdf', bytes }, { abrir, páginas: 'abc' })).erro, 'faixa_inválida');
  assert.equal(fechou, 2);
});

test('texto maior que o limite é interrompido com a orientação de escolher menos páginas', async () => {
  const linha = { str: 'x'.repeat(1_000_000), ox: 0, oy: 10, ux: 100, uy: 0, vx: 0, vy: -10, eol: true };
  const r = await extrairTextoDoPdf({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, {
    abrir: async () => ({ páginas: 20, texto: async () => ({ itens: [linha] }), fechar() {} }),
  });
  assert.equal(r.erro, 'texto_grande');
  assert.ok(LIMITE_DE_CARACTERES === 10_000_000);
  assert.match(mensagemDeErroDeExtração(r.erro), /10\.000\.000 caracteres/);
});

test('página que o leitor não consegue ler vira erro com o número da página, sem texto pela metade', async () => {
  const r = await extrairTextoDoPdf({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, {
    abrir: async () => ({
      páginas: 3,
      texto: async (n) => { if (n === 2) throw new Error('quebrou'); return { itens: [{ str: `p${n}`, ox: 0, oy: 10, ux: 5, uy: 0, vx: 0, vy: -10, eol: true }] }; },
      fechar() {},
    }),
  });
  assert.deepEqual([r.erro, r.extras.página], ['página_com_erro', 2]);
  assert.equal(r.texto, undefined);
  assert.equal(mensagemDeErroDeExtração(r.erro, r.extras), 'Não foi possível ler o texto da página 2. O PDF pode ter um defeito nela.');
});

test('cancelar interrompe de verdade, e o progresso conta página a página', async () => {
  const passos = [];
  await extrair(await pdfDeTeste(3), { aoProgredir: (p) => passos.push([p.página, p.total]) });
  assert.deepEqual(passos, [[1, 3], [2, 3], [3, 3]]);
  let vezes = 0;
  const r = await extrair(await pdfDeTeste(10), { cancelado: () => ++vezes > 4 });
  assert.equal(r.erro, 'cancelado');
});

test('item do pdf.js sem forma de texto é ignorado e matriz degenerada não quebra', () => {
  const viewport = { transform: [1, 0, 0, -1, 0, 100] };
  const Util = { transform: (a, b) => [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3], b[4] + a[4], a[5] - b[5]] };
  assert.equal(itemEmCoordenadasDaVista({ type: 'beginMarkedContent' }, viewport, Util), null);
  const zerado = itemEmCoordenadasDaVista({ str: 'a', width: 5, height: 0, transform: [0, 0, 0, 0, 3, 4] }, viewport, Util);
  assert.equal(Number.isFinite(zerado.ox) && Number.isFinite(zerado.ux), true);
});

/* ------------------------------------------------------ propriedades */

test('propriedade: extrair duas vezes dá o mesmo texto, e a soma das partes é o total de caracteres', async () => {
  const pdf = await pdfComLinhas([
    [{ texto: 'Alfa beta', y: 700 }, { texto: 'gama delta', y: 686 }],
    [{ texto: 'Épsilon', y: 700 }],
  ]);
  const a = await extrair(pdf);
  const b = await extrair(pdf);
  assert.equal(a.texto, b.texto);
  assert.equal(a.caracteres, a.páginas.reduce((s, p) => s + p.caracteres, 0));
  // Tudo o que está nas páginas aparece no texto final.
  for (const p of a.páginas) assert.ok(a.texto.includes(p.texto));
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['extrair-texto-de-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
  assert.equal(ficha.local, true);
  assert.match(ficha.sai, /escaneada/);
});

test('"Como usar" traz o exemplo, os limites (OCR é outra ferramenta) e as perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /--- Página 1 ---/);
  assert.match(limites, /ESCANEADO/);
  assert.match(limites, /OCR/);
  assert.match(limites, /Apache 2\.0/);
  assert.match(limites, /100 MB/);
});
