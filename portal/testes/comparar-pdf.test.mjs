/**
 * Testes de Comparar PDF.
 *
 * O pdf.js de verdade lê os PDFs criados aqui com a pdf-lib. Os casos vêm de
 * documentação/pesquisa-ilovepdf/e-seguranca-e-ia.md (E5): comparar com ele mesmo = nenhuma
 * diferença, página removida = alinhamento correto (e não "tudo mudou"), título trocado A→B
 * = uma edição, página nova no fim = acréscimo da página inteira.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pdfDeTeste, biblioteca } from './auxiliares/pdf-de-teste.mjs';
import { png } from './auxiliares/imagens-de-teste.mjs';
import {
  compararPdfs, compararTextos, parearPáginas, diferençaDePalavras, mudançasDaPágina, palavrasDe, abreviar,
  relatórioEmTexto, linhasDoCsv, linhasDoRelatório, mensagemDeErroDeComparação,
  LIMITE_DE_PÁGINAS_COMPARADAS, CÉLULAS_MÁXIMAS, SEMELHANÇA_MÍNIMA,
} from '../scripts/cálculos/comparar-pdf.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import ferramenta from '../scripts/ferramentas/comparar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, StandardFonts } = biblioteca;

const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };

/** PDF em que cada página é uma lista de linhas de texto (de cima para baixo). */
async function pdfComPáginas(páginas) {
  const documento = await PDFDocument.create();
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  for (const linhas of páginas) {
    const página = documento.addPage([595.28, 841.89]);
    linhas.forEach((texto, i) => página.drawText(texto, { x: 50, y: 780 - i * 16, size: 12, font: fonte }));
  }
  return documento.save();
}

const comparar = (a, b, opções = {}) => compararPdfs({ nome: 'A.pdf', bytes: a }, { nome: 'B.pdf', bytes: b }, { abrir: abrirComPdfjsParaTexto, ...opções });

/* ------------------------------------------- casos da pesquisa (E5) */

const CONTRATO_A = [
  ['Contrato versao A de 2', 'O locatario paga o aluguel todo dia cinco.'],
  ['Clausula segunda: o prazo e de doze meses.'],
];
const CONTRATO_B = [
  ['Contrato versao B de 3', 'O locatario paga o aluguel todo dia cinco.', 'TEXTO ACRESCENTADO NA VERSAO B'],
  ['Clausula segunda: o prazo e de doze meses.'],
  ['PALAVRA-SECRETA-123 aparece somente nesta terceira pagina do contrato.'],
];

test('versão A de 2 páginas contra B de 3: edição do título, acréscimo na página 1 e a página 3 inteira como acréscimo', async () => {
  const r = await comparar(await pdfComPáginas(CONTRATO_A), await pdfComPáginas(CONTRATO_B));
  assert.equal(r.ok, true);
  const { resumo } = r;
  assert.equal(resumo.iguais, false);
  assert.deepEqual([resumo.páginasA, resumo.páginasB], [2, 3]);
  assert.deepEqual(resumo.acrescentadas, [3]);
  assert.deepEqual(resumo.removidas, []);
  const [p1, p2, p3] = r.páginas;
  assert.deepEqual([p1.a, p1.b, p2.a, p2.b, p3.a, p3.b], [1, 1, 2, 2, null, 3]);
  assert.equal(p2.mudanças.length, 0);
  // Página 1: "A de 2" virou "B de 3" (duas edições palavra a palavra) e uma linha foi acrescentada.
  const tipos = p1.mudanças.map((m) => m.tipo);
  assert.deepEqual(tipos, ['edição', 'edição', 'acréscimo']);
  assert.deepEqual([p1.mudanças[0].antigo, p1.mudanças[0].novo], ['A', 'B']);
  assert.deepEqual([p1.mudanças[1].antigo, p1.mudanças[1].novo], ['2', '3']);
  assert.equal(p1.mudanças[2].novo, 'TEXTO ACRESCENTADO NA VERSAO B');
  assert.match(p3.mudanças[0].novo, /^PALAVRA-SECRETA-123/);
  assert.equal(p3.mudanças[0].tipo, 'página acrescentada');
  assert.equal(resumo.totalDeMudanças, 4);
  assert.equal(resumo.páginasComDiferença, 2);
  assert.deepEqual([resumo.edição, resumo.acréscimo, resumo.remoção], [2, 1, 0]);
});

test('comparar um PDF com ele mesmo: nenhuma diferença', async () => {
  const pdf = await pdfDeTeste(5);
  const r = await comparar(pdf, pdf);
  assert.equal(r.resumo.iguais, true);
  assert.equal(r.resumo.totalDeMudanças, 0);
  assert.match(relatórioEmTexto(r), /Nenhuma diferença no texto\./);
});

test('com a página 2 de 5 removida, só a página 2 aparece como removida: o resto continua emparelhado', async () => {
  const completo = await pdfDeTeste(5);
  const sem2 = await PDFDocument.load(completo);
  sem2.removePage(1);
  const r = await comparar(completo, await sem2.save());
  assert.deepEqual(r.resumo.removidas, [2]);
  assert.deepEqual(r.resumo.acrescentadas, []);
  assert.equal(r.resumo.totalDeMudanças, 1);
  assert.deepEqual(r.páginas.map((p) => [p.a, p.b]), [[1, 1], [2, null], [3, 2], [4, 3], [5, 4]]);
  assert.equal(r.páginas[1].mudanças[0].tipo, 'página removida');
});

test('página nova no meio: só ela é acrescentada, e as seguintes continuam emparelhadas', async () => {
  const base = [['Capitulo um sobre o inicio da historia'], ['Capitulo dois sobre o meio da historia'], ['Capitulo tres sobre o fim da historia']];
  const com = [base[0], ['Pagina inserida com assunto totalmente diferente xyz'], base[1], base[2]];
  const r = await comparar(await pdfComPáginas(base), await pdfComPáginas(com));
  assert.deepEqual(r.resumo.acrescentadas, [2]);
  assert.equal(r.resumo.totalDeMudanças, 1);
  assert.deepEqual(r.páginas.map((p) => [p.a, p.b]), [[1, 1], [null, 2], [2, 3], [3, 4]]);
});

test('só mudou a quebra de linha: não é diferença', async () => {
  const a = await pdfComPáginas([['O prazo de entrega e de dez dias uteis', 'contados da assinatura do contrato.']]);
  const b = await pdfComPáginas([['O prazo de entrega e de dez dias', 'uteis contados da assinatura', 'do contrato.']]);
  assert.equal((await comparar(a, b)).resumo.iguais, true);
});

test('"ignorar maiúsculas": Contrato e CONTRATO só diferem quando a opção está desligada', async () => {
  const a = await pdfComPáginas([['Contrato de locacao residencial']]);
  const b = await pdfComPáginas([['CONTRATO de locacao residencial']]);
  const sensível = await comparar(a, b);
  assert.equal(sensível.resumo.totalDeMudanças, 1);
  assert.deepEqual([sensível.páginas[0].mudanças[0].antigo, sensível.páginas[0].mudanças[0].novo], ['Contrato', 'CONTRATO']);
  assert.equal((await comparar(a, b, { ignorarCaixa: true })).resumo.iguais, true);
});

test('acentos e cedilha viram diferença exata: "ação" contra "acao"', async () => {
  const r = compararTextos(['A ação foi paga'], ['A acao foi paga']);
  assert.deepEqual([r.páginas[0].mudanças[0].antigo, r.páginas[0].mudanças[0].novo], ['ação', 'acao']);
});

/* ------------------------------------------------ diferença de palavras */

test('remoção, acréscimo e edição, com o contexto ao redor', () => {
  const m = mudançasDaPágina(
    palavrasDe('um dois três quatro cinco seis sete oito'),
    palavrasDe('um dois quatro cinco SEIS-NOVO sete oito nove'),
  );
  assert.deepEqual(m.map((x) => [x.tipo, x.antigo, x.novo]), [
    ['remoção', 'três', ''],
    ['edição', 'seis', 'SEIS-NOVO'],
    ['acréscimo', '', 'nove'],
  ]);
  assert.equal(m[0].antes, 'um dois');
  assert.equal(m[0].depois, 'quatro cinco');
});

test('propriedade: aplicar as operações à lista antiga dá a lista nova, e "igual" nunca troca de palavra', () => {
  let semente = 12345;
  const sorteio = (n) => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente % n; };
  for (let rodada = 0; rodada < 200; rodada++) {
    const alfabeto = ['a', 'b', 'c', 'd', 'e'];
    const a = Array.from({ length: sorteio(25) }, () => alfabeto[sorteio(5)]);
    const b = Array.from({ length: sorteio(25) }, () => alfabeto[sorteio(5)]);
    const ops = diferençaDePalavras(a, b);
    const refeita = [];
    const velhaVista = [];
    for (const op of ops) {
      if (op.op === 'igual') { assert.equal(a[op.ia], b[op.ib]); refeita.push(b[op.ib]); velhaVista.push(a[op.ia]); }
      else if (op.op === 'põe') refeita.push(b[op.ib]);
      else velhaVista.push(a[op.ia]);
    }
    assert.deepEqual(refeita, b);
    assert.deepEqual(velhaVista, a);
  }
});

test('propriedade: comparar qualquer texto com ele mesmo nunca dá diferença, e a diferença é simétrica em quantidade', () => {
  for (const texto of ['', 'a', 'um dois três', 'repete repete repete', 'x\ny\n\nz']) {
    assert.equal(compararTextos([texto], [texto]).resumo.iguais, true);
  }
  const ab = compararTextos(['a b c d'], ['a x c']).resumo;
  const ba = compararTextos(['a x c'], ['a b c d']).resumo;
  assert.equal(ab.totalDeMudanças, ba.totalDeMudanças);
  assert.equal(ab.acréscimo, ba.remoção);
});

test('páginas enormes e totalmente diferentes viram uma troca só, sem montar uma tabela gigante', () => {
  const lista = (prefixo, n) => ({ texto: Array.from({ length: n }, (_, i) => `${prefixo}${i}`), chave: Array.from({ length: n }, (_, i) => `${prefixo}${i}`) });
  const lado = Math.ceil(Math.sqrt(CÉLULAS_MÁXIMAS)) + 5;
  assert.equal(diferençaDePalavras(lista('a', lado).chave, lista('b', lado).chave), null);
  const m = mudançasDaPágina(lista('a', lado), lista('b', lado));
  assert.equal(m.length, 1);
  assert.equal(m[0].tipo, 'edição');
});

test('abreviar corta trechos longos e diz que cortou', () => {
  assert.equal(abreviar('curto'), 'curto');
  assert.equal(abreviar('x'.repeat(700)).length, 601);
  assert.ok(abreviar('x'.repeat(700)).endsWith('…'));
});

/* -------------------------------------------- pareamento de páginas */

test('páginas movidas de lugar aparecem como removida e acrescentada (a ordem importa)', () => {
  const r = compararTextos(['alfa alfa alfa', 'beta beta beta'], ['beta beta beta', 'alfa alfa alfa']);
  assert.equal(r.resumo.iguais, false);
  assert.equal(r.resumo.removidas.length + r.resumo.acrescentadas.length, 2);
});

test('uma página reescrita por inteiro, no meio de páginas iguais, é pareada por posição e não vira remoção mais acréscimo', () => {
  const pares = parearPáginas(
    [['inicio', 'igual'], ['texto', 'antigo', 'completamente', 'velho'], ['fim', 'igual']],
    [['inicio', 'igual'], ['assunto', 'novo', 'sem', 'relacao'], ['fim', 'igual']],
  );
  assert.deepEqual(pares.map((p) => [p.a, p.b]), [[0, 0], [1, 1], [2, 2]]);
  assert.ok(pares[1].semelhança < SEMELHANÇA_MÍNIMA);
});

test('páginas vazias dos dois lados se emparelham; vazia contra cheia não', () => {
  const pares = parearPáginas([[], ['a', 'b']], [[], ['a', 'b']]);
  assert.deepEqual(pares.map((p) => [p.a, p.b]), [[0, 0], [1, 1]]);
  const r = compararTextos(['', 'texto'], ['texto']);
  assert.deepEqual(r.resumo.removidas, [1]);
});

test('300 páginas contra 300 páginas com uma mudança no meio: rápido e sem falso alarme', () => {
  const páginas = Array.from({ length: 300 }, (_, i) => `pagina ${i} ${'palavra '.repeat(80)} marca${i}`);
  const alterada = páginas.slice();
  alterada[150] = alterada[150].replace('marca150', 'MARCA-NOVA');
  const início = performance.now();
  const r = compararTextos(páginas, alterada);
  assert.ok(performance.now() - início < 4000, 'a comparação de 300 páginas passou de 4 segundos');
  assert.equal(r.resumo.totalDeMudanças, 1);
  assert.equal(r.resumo.páginasComDiferença, 1);
  assert.equal(r.páginas[150].mudanças[0].novo, 'MARCA-NOVA');
});

/* ------------------------------------------------ relatório e CSV */

test('o relatório diz o resumo, as páginas e o trecho antigo e novo; o CSV leva uma linha por mudança', async () => {
  const r = await comparar(await pdfComPáginas(CONTRATO_A), await pdfComPáginas(CONTRATO_B));
  const texto = relatórioEmTexto(r);
  assert.match(texto, /Original: A\.pdf \(2 páginas\)/);
  assert.match(texto, /Novo: B\.pdf \(3 páginas\)/);
  assert.match(texto, /4 diferenças em 2 páginas: 1 acréscimos, 0 remoções, 2 edições\./);
  assert.match(texto, /Páginas acrescentadas no novo: 3\./);
  assert.match(texto, /- A\n {2}\+ B/);
  assert.match(texto, /\+ TEXTO ACRESCENTADO NA VERSAO B/);
  assert.match(texto, /Só o texto foi comparado/);
  const csv = linhasDoCsv(r);
  assert.deepEqual(csv[0], ['Página no original', 'Página no novo', 'Tipo', 'Antes', 'Depois']);
  assert.equal(csv.length, 1 + linhasDoRelatório(r).length);
  assert.deepEqual(csv.at(-1).slice(0, 3), ['', 3, 'página acrescentada']);
});

/* ------------------------------------------------- entradas hostis */

test('PDF escaneado em qualquer lado é recusado, dizendo qual e que o OCR é outra ferramenta', async () => {
  const documento = await PDFDocument.create();
  const imagem = await documento.embedPng(png(20, 20));
  documento.addPage([200, 200]).drawImage(imagem, { x: 0, y: 0, width: 200, height: 200 });
  const escaneado = await documento.save();
  const bom = await pdfDeTeste(1);
  const r = await comparar(bom, escaneado);
  assert.equal(r.erro, 'sem_texto');
  assert.equal(r.extras.arquivo, 'novo');
  const mensagem = mensagemDeErroDeComparação(r.erro, r.extras);
  assert.match(mensagem, /PDF novo, "B\.pdf", não tem texto/);
  assert.match(mensagem, /OCR/);
  assert.equal((await comparar(escaneado, bom)).extras.arquivo, 'original');
});

test('arquivos vazios, falsos e corrompidos são recusados dizendo qual dos dois', async () => {
  const bom = await pdfDeTeste(1);
  assert.deepEqual([(await comparar(new Uint8Array(), bom)).erro, (await comparar(new Uint8Array(), bom)).extras.arquivo], ['arquivo_vazio', 'original']);
  const falso = await comparar(bom, new TextEncoder().encode('não sou pdf'));
  assert.deepEqual([falso.erro, falso.extras.arquivo], ['arquivo_nao_pdf', 'novo']);
  const imagem = await comparar(png(5, 5), bom);
  assert.equal(imagem.erro, 'arquivo_nao_pdf');
  const quebrado = await comparar(bom, new TextEncoder().encode('%PDF-1.7\nlixo'));
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'B.pdf']);
  assert.equal((await compararPdfs(null, { nome: 'x', bytes: bom }, { abrir: abrirComPdfjsParaTexto })).erro, 'sem_original');
  assert.equal((await compararPdfs({ nome: 'x', bytes: bom }, undefined, { abrir: abrirComPdfjsParaTexto })).erro, 'sem_novo');
  assert.match(mensagemDeErroDeComparação('sem_original'), /PDF original/);
  assert.match(mensagemDeErroDeComparação('sem_novo'), /PDF novo/);
});

test('mais de 300 páginas em uma das versões é recusado com o número certo', async () => {
  const bom = await pdfDeTeste(1);
  const grande = async () => ({ páginas: LIMITE_DE_PÁGINAS_COMPARADAS + 1, texto: async () => ({ itens: [] }), fechar() {} });
  const r = await compararPdfs({ nome: 'G.pdf', bytes: bom }, { nome: 'B.pdf', bytes: bom }, { abrir: grande });
  assert.equal(r.erro, 'páginas_demais_comparar');
  assert.match(mensagemDeErroDeComparação(r.erro, { nome: 'G.pdf', ...r.extras }), /"G\.pdf" tem 301 páginas\. Dá para comparar até 300/);
});

test('protegido por senha, leitor fora do ar e cancelamento', async () => {
  const bom = await pdfDeTeste(1);
  const falhar = (nome) => async () => { const e = new Error(nome); e.name = nome; throw e; };
  assert.equal((await comparar(bom, bom, { abrir: falhar('PasswordException') })).erro, 'pdf_protegido');
  assert.equal((await comparar(bom, bom, { abrir: falhar('LeitorIndisponível') })).erro, 'leitor_indisponível');
  let vezes = 0;
  const r = await comparar(await pdfDeTeste(8), await pdfDeTeste(8), { cancelado: () => ++vezes > 6 });
  assert.equal(r.erro, 'cancelado');
});

test('o progresso passa pelo original, pelo novo e pela comparação', async () => {
  const etapas = [];
  await comparar(await pdfDeTeste(2), await pdfDeTeste(2), { aoProgredir: (p) => etapas.push(p.etapa) });
  assert.deepEqual([...new Set(etapas)], ['original', 'novo', 'comparar']);
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo não promete comparação visual', () => {
  const ficha = ferramentaPorSlug['comparar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
  assert.equal(ficha.local, true);
  const promessa = [ficha.resumo, ficha.processa, ficha.sai].join(' ');
  assert.doesNotMatch(promessa, /sobrep|imagem das páginas|áreas da página/i);
  assert.match(ficha.processa, /não há comparação visual/);
});

test('"Como usar" deixa claro que só o texto é comparado e que PDF escaneado não funciona', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /Nenhuma diferença no texto/);
  assert.match(limites, /NÃO faz comparação visual/);
  assert.match(limites, /OCR/);
  assert.match(limites, /300 páginas/);
  assert.match(limites, /Apache 2\.0/);
});
