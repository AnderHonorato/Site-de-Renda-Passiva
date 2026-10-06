/**
 * Testes de Assinar PDF.
 *
 * Casos da pesquisa (documentação/pesquisa-ilovepdf/e-seguranca-e-ia.md, E3): assinatura digitada
 * "Maria Teste" na página 3 em (350, 120) com 150 pt de largura; iniciais "MT" em todas as
 * páginas = 3 ocorrências; carimbo de data "05/10/2026" como texto; desenho = só traço (o resto
 * da caixa fica transparente, porque é vetor); PDF com /Rotate.
 *
 * O resultado em página girada é conferido de ponta a ponta: o pdf.js lê o PDF assinado e diz
 * onde o texto da assinatura aparece na página COMO É VISTA.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  pdfDeTeste, pdfProtegido, biblioteca, conteúdoDaPágina, matrizesDeTexto, textosDaPágina, perto,
} from './auxiliares/pdf-de-teste.mjs';
import { png, jpeg } from './auxiliares/imagens-de-teste.mjs';
import {
  assinarPdf, medirDesenho, faixaComPalavras, mensagemDeErroDeAssinatura,
  LARGURA_MÍN, LARGURA_MÁX, LIMITE_DE_TRAÇOS, LIMITE_DE_PONTOS, LIMITE_DO_TEXTO, FONTES_DA_ASSINATURA, TINTAS, ALTURA_MÁXIMA_DA_ASSINATURA,
} from '../scripts/cálculos/assinar-pdf.js';
import { TAMANHO_MÁXIMO_POR_ARQUIVO } from '../scripts/cálculos/pdf.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import ferramenta from '../scripts/ferramentas/assinar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, PDFName, StandardFonts, degrees } = biblioteca;

const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };

const assinar = (bytes, opções) => assinarPdf({ nome: 'Contrato.pdf', bytes }, { biblioteca, ...opções });
const texto = (t, mais = {}) => ({ tipo: 'texto', texto: t, ...mais });
const A4 = { largura: 595.28, altura: 841.89 };
const abrir = (bytes) => PDFDocument.load(bytes);

/** Texto e posição (na página como é vista) dos pedaços de texto da página. */
async function textoVisto(bytes, página = 1) {
  const abertura = await abrirComPdfjsParaTexto(bytes);
  try {
    return await abertura.texto(página);
  } finally {
    await abertura.fechar();
  }
}

/* ---------------------------------------- casos da pesquisa (E3) */

test('"Maria Teste" digitada na página 3, com o canto em (350, 120) e 150 pt de largura: só a página 3 muda, no lugar certo', async () => {
  const pdf = await pdfDeTeste(3);
  const fonte = await (await PDFDocument.create()).embedFont(StandardFonts.TimesRomanItalic);
  const largura100 = fonte.widthOfTextAtSize('Maria Teste', 100);
  const altura100 = fonte.heightAtSize(100, { descender: true });
  const h = 150 / (largura100 / altura100);
  // Pedido em pontos (350, 120 do pé da página), traduzido para as porcentagens da ferramenta.
  const r = await assinar(pdf, {
    assinatura: texto('Maria Teste'), páginas: '3',
    esquerda: (350 / A4.largura) * 100, topo: ((A4.altura - 120 - h) / A4.altura) * 100, largura: (150 / A4.largura) * 100,
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.assinadas, [3]);
  const antes = await abrir(pdf);
  const depois = await abrir(r.bytes);
  for (const i of [0, 1]) assert.equal(conteúdoDaPágina(depois, i), conteúdoDaPágina(antes, i), `a página ${i + 1} não pode mudar`);
  const [, assinatura] = matrizesDeTexto(depois, 2);
  const tamanho = (150 / largura100) * 100;
  const descida = fonte.heightAtSize(tamanho, { descender: true }) - fonte.heightAtSize(tamanho, { descender: false });
  assert.ok(perto(assinatura[4], 350, 0.05), `x = ${assinatura[4]}`);
  assert.ok(perto(assinatura[5], 120 + descida, 0.05), `y = ${assinatura[5]}`);
  assert.match(conteúdoDaPágina(depois, 2), new RegExp(`${tamanho.toFixed(3).slice(0, 6)}\\d* Tf`));
  // E o leitor de PDF vê o nome na página 3 e o texto original continua lá.
  assert.match((await textoVisto(r.bytes, 3)).itens.map((i) => i.str).join(' '), /Maria Teste/);
  assert.deepEqual(textosDaPágina(depois, 2).length, 2);
});

test('iniciais "MT" em todas as páginas: 3 ocorrências', async () => {
  const r = await assinar(await pdfDeTeste(3), { assinatura: texto('MT'), páginas: 'todas', largura: 8 });
  assert.deepEqual(r.assinadas, [1, 2, 3]);
  for (let p = 1; p <= 3; p++) assert.ok((await textoVisto(r.bytes, p)).itens.some((i) => i.str === 'MT'), `página ${p}`);
});

test('data como texto: "05/10/2026" abaixo da assinatura, junto com a legenda', async () => {
  const r = await assinar(await pdfDeTeste(1), { assinatura: texto('Maria Teste'), legenda: 'Maria da Silva', data: '05/10/2026' });
  const itens = (await textoVisto(r.bytes)).itens;
  const linha = itens.find((i) => i.str.includes('05/10/2026'));
  assert.match(linha.str, /^Maria da Silva\s+·\s+05\/10\/2026$/);
  const nome = itens.find((i) => i.str === 'Maria Teste');
  assert.ok(linha.oy > nome.oy, 'a legenda fica abaixo da assinatura (y da vista cresce para baixo)');
});

test('páginas "última", "primeira", intervalos e pares', async () => {
  const pdf = await pdfDeTeste(5);
  const quais = async (páginas) => (await assinar(pdf, { assinatura: texto('x'), páginas })).assinadas;
  assert.deepEqual(await quais('última'), [5]);
  assert.deepEqual(await quais('Primeira, ultima'), [1, 5]);
  assert.deepEqual(await quais('2-3'), [2, 3]);
  assert.deepEqual(await quais('pares'), [2, 4]);
  assert.deepEqual(await quais(''), [1, 2, 3, 4, 5]);
  assert.equal(faixaComPalavras('última página', 9), '9 página');
  assert.equal(faixaComPalavras('penúltima', 9), 'penúltima');
});

/* ------------------------------------------------------ desenho */

test('desenho: um traço de 3 pontos e um toque viram caminhos vetoriais dentro da caixa, com o resto transparente', async () => {
  const traços = [[[0, 0], [10, 20], [30, 5]], [[40, 10]]];
  const medida = medirDesenho(traços, 2.5);
  assert.equal(medida.ok, true);
  assert.deepEqual([medida.caixa.largura, medida.caixa.altura], [45, 25]);
  const r = await assinar(await pdfDeTeste(1), { assinatura: { tipo: 'desenho', traços }, largura: 30, esquerda: 10, topo: 10 });
  const conteúdo = conteúdoDaPágina(await abrir(r.bytes), 0);
  assert.match(conteúdo, /2\.5 w\n1 J\n1 j\n2\.5 22\.5 m\n12\.5 2\.5 l\n32\.5 17\.5 l\nS\n42\.5 12\.5 m\n42\.51 12\.5 l\nS/);
  // 30% de 595,28 = 178,584 pt de largura para uma caixa de 45 unidades.
  const escala = (0.3 * A4.largura) / 45;
  const m = conteúdo.match(/([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm\n0\.05 0\.05 0\.05 RG/);
  const [sx, sy, e, f] = m.slice(1).map(Number);
  assert.ok(perto(sx, escala, 1e-6) && perto(sy, escala, 1e-6));
  assert.ok(perto(e, 0.1 * A4.largura, 1e-6));
  assert.ok(perto(f, A4.altura * 0.9 - 25 * escala, 1e-6));
});

test('desenho vazio, de um toque minúsculo, malformado ou enorme é recusado', async () => {
  const pdf = await pdfDeTeste(1);
  const erro = async (traços) => (await assinar(pdf, { assinatura: { tipo: 'desenho', traços } })).erro;
  assert.equal(await erro([]), 'desenho_vazio');
  assert.equal(await erro(undefined), 'desenho_vazio');
  assert.equal(await erro([[]]), 'desenho_vazio');
  assert.equal(await erro([[[5, 5]]]), 'desenho_vazio');
  assert.equal(await erro([[[5, 5], [5.5, 5.5]]]), 'desenho_vazio');
  assert.equal(await erro([[[1, 2], ['a', 3]]]), 'desenho_inválido');
  assert.equal(await erro([[[1, Infinity], [2, 3]]]), 'desenho_inválido');
  assert.equal(await erro('traço'), 'desenho_vazio');
  assert.equal(await erro([42]), 'desenho_inválido');
  assert.equal(await erro(Array.from({ length: LIMITE_DE_TRAÇOS + 1 }, () => [[0, 0], [9, 9]])), 'desenho_grande');
  assert.equal(await erro([Array.from({ length: LIMITE_DE_PONTOS + 1 }, (_, i) => [i, i])]), 'desenho_grande');
  assert.match(mensagemDeErroDeAssinatura('desenho_vazio'), /Desenhe a assinatura no quadro/);
});

test('um risco horizontal comprido ainda é uma assinatura válida (altura mínima)', async () => {
  const r = await assinar(await pdfDeTeste(1), { assinatura: { tipo: 'desenho', traços: [[[0, 10], [100, 10]]] } });
  assert.equal(r.ok, true);
});

/* ------------------------------------------------------- imagem */

test('imagem PNG: entra como imagem na caixa pedida, com o branco multiplicado para sumir', async () => {
  const r = await assinar(await pdfDeTeste(1), {
    assinatura: { tipo: 'imagem', imagem: { nome: 'a.png', bytes: png(200, 100, { alfa: true }) } }, esquerda: 10, topo: 10, largura: 40,
  });
  assert.equal(r.ok, true);
  const documento = await abrir(r.bytes);
  const conteúdo = conteúdoDaPágina(documento, 0);
  const m = conteúdo.match(/([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm\n\/Assinatura-\d+ Do/);
  assert.ok(m, conteúdo);
  const [w, h, x, y] = m.slice(1).map(Number);
  assert.ok(perto(w, 0.4 * A4.largura, 1e-6) && perto(h, w / 2, 1e-6));
  assert.ok(perto(x, 0.1 * A4.largura, 1e-6) && perto(y, A4.altura - 0.1 * A4.altura - h, 1e-6));
  const estados = documento.getPage(0).node.Resources().lookup(PDFName.of('ExtGState'));
  const [, estado] = estados.entries().find(([nome]) => String(nome).startsWith('/AssinaturaMultiplicar'));
  assert.equal(String(documento.context.lookup(estado).lookup(PDFName.of('BM'))), '/Multiply');
});

test('imagem sem o fundo transparente não usa multiplicar', async () => {
  const r = await assinar(await pdfDeTeste(1), {
    assinatura: { tipo: 'imagem', imagem: { nome: 'a.png', bytes: png(10, 10) }, fundoTransparente: false },
  });
  const conteúdo = conteúdoDaPágina(await abrir(r.bytes), 0);
  assert.doesNotMatch(conteúdo, /\/AssinaturaMultiplicar/);
});

test('foto de celular (JPG com orientação 6): a proporção usada é a da imagem como vista, em pé', async () => {
  const r = await assinar(await pdfDeTeste(1), {
    assinatura: { tipo: 'imagem', imagem: { nome: 'f.jpg', bytes: jpeg(400, 200, { orientação: 6 }) } }, largura: 20,
  });
  assert.equal(r.ok, true);
  const conteúdo = conteúdoDaPágina(await abrir(r.bytes), 0);
  // Vista em pé, a imagem fica 200 × 400: a altura é o dobro da largura (0, w, -h, 0 na matriz girada).
  const m = conteúdo.match(/(-?[\d.e]+) (-?[\d.e]+) (-?[\d.e]+) (-?[\d.e]+) (-?[\d.e]+) (-?[\d.e]+) cm\n\/Assinatura-\d+ Do/);
  assert.ok(m);
  const [a, b, c, d] = m.slice(1, 5).map(Number);
  assert.ok(perto(Math.hypot(a, b), 0.2 * A4.largura * 2, 1e-6) || perto(Math.hypot(c, d), 0.2 * A4.largura * 2, 1e-6));
});

test('imagem que não é imagem, vazia, GIF sem conversor e ausente são recusadas com a mensagem certa', async () => {
  const pdf = await pdfDeTeste(1);
  const erro = async (imagem, converter) => (await assinar(pdf, { assinatura: { tipo: 'imagem', imagem, converter } })).erro;
  assert.equal(await erro(undefined), 'sem_imagem');
  assert.equal(await erro({ nome: 'x.png', bytes: new TextEncoder().encode('texto') }), 'imagem_nao_suportada');
  assert.equal(await erro({ nome: 'x.png', bytes: new Uint8Array() }), 'imagem_vazia');
  assert.equal(await erro({ nome: 'x.gif', bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0]) }), 'imagem_nao_suportada');
  assert.equal(await erro({ nome: 'x.png', bytes: png(40, 40, { linhas: 5 }) }), 'imagem_corrompida');
  assert.match(mensagemDeErroDeAssinatura('sem_imagem'), /Escolha a imagem da assinatura/);
});

/* ------------------------------------------------ geometria da página */

test('em página girada (90, 180, 270) e com CropBox, a assinatura aparece no lugar pedido, em pé e legível', async () => {
  for (const rotação of [0, 90, 180, 270]) {
    const documento = await PDFDocument.create();
    const página = documento.addPage([600, 800]);
    página.setRotation(degrees(rotação));
    página.setCropBox(50, 100, 400, 500); // área visível menor que a página
    const pdf = await documento.save();
    const r = await assinar(pdf, { assinatura: texto('Ana'), esquerda: 10, topo: 20, largura: 30 });
    assert.equal(r.ok, true, `rotação ${rotação}`);
    const { itens, largura, altura } = await textoVisto(r.bytes);
    const [i] = itens;
    assert.equal(i.str, 'Ana');
    // A letra fica em pé: segue para a direita, sem descer, e a base fica dentro da caixa pedida (a partir de 20% do topo).
    assert.ok(i.ux > 0 && Math.abs(i.uy) < 1e-6, `rotação ${rotação}: a assinatura precisa estar em pé`);
    assert.ok(perto(i.ox, largura * 0.1, 0.05), `rotação ${rotação}: x = ${i.ox} de ${largura}`);
    assert.ok(i.oy > altura * 0.2 && i.oy < altura * 0.2 + largura * 0.3, `rotação ${rotação}: y = ${i.oy} de ${altura}`);
    assert.ok(perto(i.ux, largura * 0.3, 0.05), `rotação ${rotação}: largura ${i.ux}`);
  }
});

test('posição fora da página é puxada para dentro (e avisada); assinatura alta demais encolhe', async () => {
  const pdf = await pdfDeTeste(2);
  const canto = await assinar(pdf, { assinatura: texto('Ana Maria Souza'), esquerda: 100, topo: 100, largura: 30 });
  assert.deepEqual(canto.ajustadas, [1, 2]);
  assert.deepEqual(canto.avisos, ['assinatura_ajustada']);
  const { itens, largura, altura } = await textoVisto(canto.bytes);
  const i = itens.find((x) => x.str === 'Ana Maria Souza');
  assert.ok(i.ox >= 0 && i.ox + i.ux <= largura + 0.01, 'dentro da largura');
  assert.ok(i.oy <= altura + 0.01 && i.oy >= 0, 'dentro da altura');
  // Desenho muito alto e estreito: passaria de metade da página; encolhe mantendo a proporção.
  const alta = await assinar(pdf, { assinatura: { tipo: 'desenho', traços: [[[0, 0], [10, 400]]] }, largura: 40, esquerda: 10, topo: 10 });
  assert.deepEqual(alta.ajustadas, [1, 2]);
  const m = conteúdoDaPágina(await abrir(alta.bytes), 0).match(/([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm\n0\.05/);
  assert.ok(Number(m[1]) * 405 <= ALTURA_MÁXIMA_DA_ASSINATURA * A4.altura + 0.01);
});

test('cor da tinta e estilo da letra: cada um dá a sua cor e a sua fonte', async () => {
  for (const [cor, [r, g, b]] of Object.entries(TINTAS)) {
    const saída = await assinar(await pdfDeTeste(1), { assinatura: texto('Ana'), cor });
    assert.match(conteúdoDaPágina(await abrir(saída.bytes), 0), new RegExp(`${r} ${g} ${b} rg\\n/Assinatura-`));
  }
  const base = [];
  for (const fonte of Object.keys(FONTES_DA_ASSINATURA)) {
    const saída = await assinar(await pdfDeTeste(1), { assinatura: texto('Ana', { fonte }) });
    assert.equal(saída.ok, true);
    const documento = await abrir(saída.bytes);
    const fontes = documento.getPage(0).node.Resources().lookup(PDFName.of('Font'));
    base.push(...fontes.entries().map(([, ref]) => String(documento.context.lookup(ref).lookup(PDFName.of('BaseFont')))));
  }
  for (const nome of ['/Times-Italic', '/Times-BoldItalic', '/Helvetica-Oblique', '/Courier-Oblique']) assert.ok(base.includes(nome), nome);
});

/* -------------------------------------------------- validações */

test('opções fora do combinado são recusadas, com a mensagem certa, sem abrir o PDF', async () => {
  const vazio = new Uint8Array();
  const erro = async (opções) => (await assinar(vazio, opções)).erro;
  const ok = { assinatura: texto('Ana') };
  assert.equal(await erro({}), 'tipo_inválido');
  assert.equal(await erro({ assinatura: { tipo: 'carimbo' } }), 'tipo_inválido');
  assert.equal(await erro({ ...ok, cor: 'rosa' }), 'cor_inválida');
  for (const largura of [LARGURA_MÍN - 0.1, LARGURA_MÁX + 0.1, Number.NaN, Infinity]) assert.equal(await erro({ ...ok, largura }), 'largura_inválida');
  for (const esquerda of [-1, 100.5, Number.NaN]) assert.equal(await erro({ ...ok, esquerda }), 'posição_inválida');
  assert.equal(await erro({ ...ok, topo: 101 }), 'posição_inválida');
  assert.equal(await erro({ assinatura: texto('   ') }), 'texto_vazio');
  assert.equal(await erro({ assinatura: texto('x'.repeat(LIMITE_DO_TEXTO + 1)) }), 'texto_longo');
  assert.equal(await erro({ assinatura: texto('Ana', { fonte: 'comic' }) }), 'fonte_inválida');
  assert.equal(await erro({ ...ok, legenda: 'x'.repeat(101) }), 'legenda_longa');
  const emoji = await assinar(vazio, { assinatura: texto('Ana ✍') });
  assert.deepEqual([emoji.erro, emoji.extras.caractere], ['texto_caractere', '✍']);
  assert.match(mensagemDeErroDeAssinatura(emoji.erro, emoji.extras), /"✍" não existe na fonte do PDF/);
  const legenda = await assinar(vazio, { ...ok, legenda: 'olá → você' });
  assert.deepEqual([legenda.erro, legenda.extras.caractere], ['legenda_caractere', '→']);
  assert.match(mensagemDeErroDeAssinatura('largura_inválida'), /5% a 80%/);
});

test('acentos, cedilha e til na assinatura e na legenda funcionam', async () => {
  const r = await assinar(await pdfDeTeste(1), { assinatura: texto('João Conceição'), legenda: 'Ação concluída' });
  assert.equal(r.ok, true);
  const t = (await textoVisto(r.bytes)).itens.map((i) => i.str).join('|');
  assert.match(t, /João Conceição/);
  assert.match(t, /Ação concluída/);
});

/* ------------------------------------------------ entradas hostis */

test('PDF vazio, falso, corrompido, protegido por senha, grande demais e faixa inválida', async () => {
  const opções = { assinatura: texto('Ana') };
  assert.equal((await assinar(new Uint8Array(), opções)).erro, 'arquivo_vazio');
  assert.equal((await assinar(new TextEncoder().encode('só texto'), opções)).erro, 'arquivo_nao_pdf');
  assert.equal((await assinar(png(5, 5), opções)).erro, 'arquivo_nao_pdf');
  const quebrado = await assinar(new TextEncoder().encode('%PDF-1.7\nlixo'), opções);
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'Contrato.pdf']);
  assert.equal((await assinar(await pdfProtegido(), opções)).erro, 'pdf_protegido');
  const grande = new Uint8Array(TAMANHO_MÁXIMO_POR_ARQUIVO + 1);
  grande.set([0x25, 0x50, 0x44, 0x46]);
  assert.equal((await assinar(grande, opções)).erro, 'arquivo_grande_demais');
  const pdf = await pdfDeTeste(3);
  assert.deepEqual([(await assinar(pdf, { ...opções, páginas: '9' })).erro, (await assinar(pdf, { ...opções, páginas: '0' })).erro], ['faixa_fora', 'faixa_zero']);
  assert.equal((await assinar(pdf, { ...opções, páginas: 'abc' })).erro, 'faixa_inválida');
});

test('PDF com assinatura digital já feita: avisa que assinar de novo a invalida', async () => {
  const documento = await PDFDocument.create();
  const página = documento.addPage([300, 300]);
  const form = documento.getForm();
  form.createTextField('x').addToPage(página, { x: 0, y: 0, width: 10, height: 10 });
  const contexto = documento.context;
  const ref = contexto.register(contexto.obj({
    Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: biblioteca.PDFString.of('assinatura'), Rect: [20, 20, 120, 60], F: 4, P: página.ref,
    V: contexto.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite' }),
  }));
  página.node.addAnnot(ref);
  form.acroForm.addField(ref);
  const r = await assinar(await documento.save(), { assinatura: texto('Ana') });
  assert.deepEqual(r.avisos, ['assinatura_existente']);
});

test('cancelar interrompe de verdade, e o progresso conta página a página', async () => {
  const passos = [];
  await assinar(await pdfDeTeste(3), { assinatura: texto('Ana'), aoProgredir: (p) => passos.push([p.página, p.total]) });
  assert.deepEqual(passos, [[1, 3], [2, 3], [3, 3]]);
  let vezes = 0;
  const r = await assinar(await pdfDeTeste(8), { assinatura: texto('Ana'), cancelado: () => ++vezes > 4 });
  assert.equal(r.erro, 'cancelado');
});

/* ------------------------------------------------- propriedades */

test('propriedade: assinar nunca tira nada da página (o texto original continua lá) e o PDF continua abrindo', async () => {
  const pdf = await pdfDeTeste(4, { rotações: [0, 90, 180, 270] });
  for (const assinatura of [texto('Ana'), { tipo: 'desenho', traços: [[[0, 0], [5, 9], [20, 3]]] }, { tipo: 'imagem', imagem: { nome: 'a.png', bytes: png(30, 20) } }]) {
    const r = await assinar(pdf, { assinatura, páginas: 'todas', legenda: 'Ana', data: '05/10/2026' });
    assert.equal(r.ok, true);
    const antes = await abrir(pdf);
    const depois = await abrir(r.bytes);
    for (let i = 0; i < 4; i++) {
      assert.ok(textosDaPágina(depois, i).includes(`Original ${i + 1}`));
      assert.equal(depois.getPage(i).getRotation().angle, antes.getPage(i).getRotation().angle);
    }
    const abertura = await abrirComPdfjsParaTexto(r.bytes);
    assert.equal(abertura.páginas, 4);
    await abertura.fechar();
  }
});

test('o original não é alterado e assinar duas vezes dá duas assinaturas', async () => {
  const pdf = await pdfDeTeste(1);
  const cópia = pdf.slice();
  const uma = await assinar(pdf, { assinatura: texto('Ana') });
  assert.deepEqual(pdf, cópia);
  const duas = await assinar(uma.bytes, { assinatura: texto('Bia'), topo: 50 });
  const itens = (await textoVisto(duas.bytes)).itens.map((i) => i.str);
  assert.ok(itens.includes('Ana') && itens.includes('Bia'));
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo diz que NÃO é assinatura digital com certificado', () => {
  const ficha = ferramentaPorSlug['assinar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  const texto = [ficha.resumo, ficha.processa, ficha.sai].join(' ');
  assert.match(texto, /sem certificado/);
  assert.match(texto, /ICP-Brasil/);
  assert.match(ficha.sai, /marca visual/);
});

test('"Como usar" repete o aviso: marca visual, sem certificado, sem prova de quem assinou', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /Maria Teste/);
  assert.match(limites, /NÃO é assinatura digital/);
  assert.match(limites, /ICP-Brasil/);
  assert.match(limites, /não prova quem assinou/);
  assert.match(limites, /100 MB/);
  assert.match(limites, /MIT/);
  assert.ok(perguntas.some((q) => /vale/i.test(q.p) && /certificado/i.test(q.r)));
});
