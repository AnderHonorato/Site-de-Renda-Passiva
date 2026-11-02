/**
 * Testes de marca d'água no PDF.
 *
 * Os casos da pesquisa (documentação/pesquisa-ilovepdf/d-editar.md, D4) foram
 * conferidos à mão e lidos de volta do próprio PDF gerado: texto presente na
 * página, `ca` = 0,5 no estado gráfico, só as páginas pedidas, camada abaixo
 * antes do conteúdo original.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  biblioteca, pdfDeTeste, pdfProtegido, conteúdoDaPágina, textosDaPágina, matrizesDeTexto, opacidadesDaPágina, perto,
} from './auxiliares/pdf-de-teste.mjs';
import { png, jpeg } from './auxiliares/imagens-de-teste.mjs';
import {
  marcarPdf, mensagemDeErroDeMarcaDágua, caixaGirada, centrosDoMosaico, centroDaMarca, POSIÇÕES, MARCAS_MÁXIMAS_NO_MOSAICO,
} from '../scripts/cálculos/marca-dagua-no-pdf.js';
import { paraEspaçoDoPdf, matrizVisualParaPdf, geometriaDaPágina } from '../scripts/cálculos/pdf-páginas.js';
import { aplicarMatriz } from '../scripts/cálculos/imagens-em-pdf.js';
import ferramenta from '../scripts/ferramentas/marca-dagua-no-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, StandardFonts, degrees } = biblioteca;

const marcar = (bytes, opções = {}) => marcarPdf({ nome: 'teste.pdf', bytes }, { biblioteca, ...opções });
const reabrir = (bytes) => PDFDocument.load(bytes);
const marcas = (documento, índice) => textosDaPágina(documento, índice).filter((t) => !t.startsWith('Original'));
/** Matriz do último `cm` da página (a da marca de imagem). */
function matrizDaMarcaDeImagem(documento, índice) {
  const todas = [...conteúdoDaPágina(documento, índice).matchAll(/([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) ([-\d.e]+) cm/g)];
  assert.ok(todas.length > 0, 'a página deveria ter o desenho da imagem');
  return todas.at(-1).slice(1, 7).map(Number);
}
async function medidasDoTexto(texto, tamanho, fonte = StandardFonts.HelveticaBold) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(fonte);
  return { largura: f.widthOfTextAtSize(texto, tamanho), altura: f.heightAtSize(tamanho, { descender: false }) };
}

/* -------------------------------------------- casos da pesquisa (D4) */

test('"CONFIDENCIAL" a 50%, 45°, centralizada: toda página traz o texto, com ca = 0,5, e o conteúdo original continua lá', async () => {
  const r = await marcar(await pdfDeTeste(5), { texto: 'CONFIDENCIAL', opacidade: 50, rotação: 45 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.marcadas, [1, 2, 3, 4, 5]);
  const documento = await reabrir(r.bytes);
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(marcas(documento, i), ['CONFIDENCIAL'], `página ${i + 1}`);
    assert.deepEqual(opacidadesDaPágina(documento, i), [0.5]);
    assert.ok(textosDaPágina(documento, i).includes(`Original ${i + 1}`));
  }
});

test('só as páginas 2 e 3 recebem a marca quando a faixa é "2-3"', async () => {
  const r = await marcar(await pdfDeTeste(5), { texto: 'RASCUNHO', páginas: '2-3' });
  const documento = await reabrir(r.bytes);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => marcas(documento, i).length), [0, 1, 1, 0, 0]);
  assert.deepEqual(r.marcadas, [2, 3]);
});

test('camada abaixo: a marca vem antes do conteúdo original; acima, depois', async () => {
  const pdf = await pdfDeTeste(1);
  const ordem = async (camada) => textosDaPágina(await reabrir((await marcar(pdf, { texto: 'FUNDO', camada })).bytes), 0);
  assert.deepEqual(await ordem('abaixo'), ['FUNDO', 'Original 1'], 'abaixo: a marca vem antes do original');
  assert.deepEqual(await ordem('acima'), ['Original 1', 'FUNDO'], 'acima: a marca vem depois do original');
  assert.deepEqual((await marcar(pdf, { texto: 'X', camada: 'abaixo' })).avisos, ['camada_abaixo']);
});

/* -------------------------------------------------- geometria */

test('a marca única centralizada fica no centro da página, com o texto girado em 45°', async () => {
  const r = await marcar(await pdfDeTeste(1), { texto: 'CONFIDENCIAL', tamanho: 40, rotação: 45 });
  const [a, b, c, d, x, y] = matrizesDeTexto(await reabrir(r.bytes), 0).at(-1);
  assert.ok(perto(a, Math.SQRT1_2, 1e-3) && perto(b, Math.SQRT1_2, 1e-3) && perto(c, -Math.SQRT1_2, 1e-3) && perto(d, Math.SQRT1_2, 1e-3));
  const { largura, altura } = await medidasDoTexto('CONFIDENCIAL', 40);
  const centro = [x + a * (largura / 2) + c * (altura / 2), y + b * (largura / 2) + d * (altura / 2)];
  assert.ok(perto(centro[0], 595.28 / 2, 0.5) && perto(centro[1], 841.89 / 2, 0.5), `centro em ${centro}`);
});

test('propriedade: a marca inteira cabe na área visível, em qualquer posição, rotação da marca, rotação da página e CropBox', async () => {
  const tamanho = 30;
  const { largura, altura } = await medidasDoTexto('MARCA', tamanho);
  for (const rotaçãoDaPágina of [0, 90, 180, 270]) {
    for (const recorte of [false, true]) {
      const origem = await PDFDocument.create();
      const p = origem.addPage([500, 700]);
      p.setRotation(degrees(rotaçãoDaPágina));
      if (recorte) p.setCropBox(40, 60, 300, 450);
      const caixa = recorte ? [40, 60, 340, 510] : [0, 0, 500, 700];
      for (const posição of POSIÇÕES) {
        for (const rotação of [0, 30, -90, 180]) {
          const r = await marcar(await origem.save(), { texto: 'MARCA', tamanho, posição, rotação });
          assert.equal(r.ok, true);
          const [a, b, c, d, x, y] = matrizesDeTexto(await reabrir(r.bytes), 0).at(-1);
          const texto = `página ${rotaçãoDaPágina}° ${recorte ? 'recortada' : ''} ${posição} marca ${rotação}°`;
          for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const cx = x + a * largura * i + c * altura * j;
            const cy = y + b * largura * i + d * altura * j;
            assert.ok(cx >= caixa[0] - 0.5 && cx <= caixa[2] + 0.5 && cy >= caixa[1] - 0.5 && cy <= caixa[3] + 0.5, `${texto}: (${cx}, ${cy})`);
          }
          // O texto gira junto com a página: lê na direção (rotação visual + rotação da página).
          const ângulo = ((rotação + rotaçãoDaPágina) * Math.PI) / 180;
          assert.ok(perto(a, Math.cos(ângulo), 1e-3) && perto(b, Math.sin(ângulo), 1e-3), texto);
        }
      }
    }
  }
});

test('as nove posições ficam nos cantos, bordas e centro (com folga) e o mosaico cobre a página toda', () => {
  const caixa = { largura: 100, altura: 50 };
  const centro = (posição) => centroDaMarca(600, 800, caixa, posição);
  assert.deepEqual(centro('meio-centro'), { x: 300, y: 400 });
  assert.ok(centro('cima-esquerda').x < 100 && centro('cima-esquerda').y > 700);
  assert.ok(centro('baixo-direita').x > 500 && centro('baixo-direita').y < 100);
  const mosaico = centrosDoMosaico(600, 800, caixa);
  assert.ok(mosaico.length > 20);
  assert.ok(mosaico.some((m) => m.x < 50 && m.y < 50) && mosaico.some((m) => m.x > 550 && m.y > 750));
  assert.equal(centrosDoMosaico(600, 800, caixa, 3), null);
  const girada = caixaGirada(100, 100, 45);
  assert.ok(perto(girada.largura, 141.42, 0.01) && perto(girada.altura, 141.42, 0.01));
  assert.deepEqual(caixaGirada(100, 20, 90).largura.toFixed(6), '20.000000');
});

test('a matriz visual→PDF concorda com a conversão de pontos em todas as rotações', async () => {
  for (const rotação of [0, 90, 180, 270]) {
    const doc = await PDFDocument.create();
    const p = doc.addPage([300, 500]);
    p.setRotation(degrees(rotação));
    p.setCropBox(10, 20, 200, 400);
    const g = geometriaDaPágina(p);
    for (const [vx, vy] of [[0, 0], [37, 91], [g.largura, g.altura]]) {
      const a = paraEspaçoDoPdf(g, vx, vy);
      const b = aplicarMatriz(matrizVisualParaPdf(g), vx, vy);
      assert.ok(perto(a.x, b.x, 1e-9) && perto(a.y, b.y, 1e-9), `rotação ${rotação}`);
    }
  }
});

test('texto grande demais é reduzido para caber, e o resultado avisa em quais páginas', async () => {
  const r = await marcar(await pdfDeTeste(2, { largura: 300, altura: 300 }), { texto: 'CONFIDENCIAL', tamanho: 120, rotação: 0 });
  assert.deepEqual(r.reduzidas, [1, 2]);
  assert.deepEqual(r.avisos, ['marca_reduzida']);
  const [a, , , , x] = matrizesDeTexto(await reabrir(r.bytes), 0).at(-1);
  assert.equal(a, 1);
  assert.ok(x >= 300 * 0.05 - 0.5, `começa em x=${x}`);
  const pequena = await marcar(await pdfDeTeste(1), { texto: 'OK', tamanho: 20 });
  assert.deepEqual(pequena.reduzidas, []);
});

test('mosaico: várias marcas por página, sem encolher, e com opacidade', async () => {
  const r = await marcar(await pdfDeTeste(1), { texto: 'COPIA', tamanho: 36, mosaico: true, rotação: 30, opacidade: 20 });
  const documento = await reabrir(r.bytes);
  assert.ok(marcas(documento, 0).length >= 12, `${marcas(documento, 0).length} marcas`);
  assert.deepEqual(opacidadesDaPágina(documento, 0), [0.2]);
  assert.deepEqual(r.reduzidas, []);
});

test('mosaico que geraria marcas demais é recusado depressa, sem encher a memória', async () => {
  const gigante = await pdfDeTeste(1, { largura: 14400, altura: 14400, texto: false });
  const r = await marcar(gigante, { texto: '.', tamanho: 6, mosaico: true });
  assert.equal(r.erro, 'mosaico_pesado');
  assert.equal(MARCAS_MÁXIMAS_NO_MOSAICO, 100_000);
});

test('sem opacidade (100) não cria estado gráfico', async () => {
  const documento = await reabrir((await marcar(await pdfDeTeste(1), { texto: 'X', opacidade: 100 })).bytes);
  assert.deepEqual(opacidadesDaPágina(documento, 0), []);
  assert.doesNotMatch(conteúdoDaPágina(documento, 0), / gs\b/);
});

test('conteúdo antigo com a matriz torta não desloca a marca (o estado é restaurado antes)', async () => {
  const documento = await PDFDocument.create();
  const página = documento.addPage([300, 300]);
  página.node.addContentStream(documento.context.register(documento.context.contentStream([biblioteca.concatTransformationMatrix(0.5, 0, 0, 0.5, 10, 10)])));
  const r = await marcar(await documento.save(), { texto: 'X' });
  const conteúdo = conteúdoDaPágina(await reabrir(r.bytes), 0);
  const escala = conteúdo.indexOf('0.5 0 0 0.5 10 10 cm');
  const restaura = conteúdo.indexOf('\nQ', escala);
  assert.ok(escala >= 0 && restaura > escala && restaura < conteúdo.indexOf('Tm'));
});

/* ------------------------------------------------------ imagem */

test('marca de imagem sem giro e no centro: matriz com a largura pedida e centro da página', async () => {
  const r = await marcar(await pdfDeTeste(1), { tipo: 'imagem', imagem: { nome: 'logo.png', bytes: png(200, 100) }, escala: 40, rotação: 0, opacidade: 100 });
  assert.equal(r.ok, true);
  const [a, b, c, d, e, f] = matrizDaMarcaDeImagem(await reabrir(r.bytes), 0);
  const largura = 595.28 * 0.4;
  assert.ok(perto(a, largura, 0.05) && perto(d, largura / 2, 0.05) && b === 0 && c === 0);
  assert.ok(perto(e + a / 2, 595.28 / 2, 0.05) && perto(f + d / 2, 841.89 / 2, 0.05));
});

test('imagem girada 90°: a matriz gira, o centro continua no centro e a opacidade entra', async () => {
  const r = await marcar(await pdfDeTeste(1), { tipo: 'imagem', imagem: { nome: 'logo.png', bytes: png(200, 100, { alfa: true }) }, escala: 40, rotação: 90, opacidade: 30 });
  const documento = await reabrir(r.bytes);
  const m = matrizDaMarcaDeImagem(documento, 0);
  assert.ok(perto(m[0], 0, 1e-6) && perto(m[3], 0, 1e-6));
  const centro = aplicarMatriz(m, 0.5, 0.5);
  assert.ok(perto(centro.x, 595.28 / 2, 0.05) && perto(centro.y, 841.89 / 2, 0.05));
  assert.deepEqual(opacidadesDaPágina(documento, 0), [0.3]);
});

test('imagem em página rotacionada: o centro da marca continua no centro da área visível', async () => {
  const origem = await PDFDocument.create();
  const p = origem.addPage([500, 700]);
  p.setRotation(degrees(90));
  p.setCropBox(50, 100, 300, 400);
  const r = await marcar(await origem.save(), { tipo: 'imagem', imagem: { nome: 'l.png', bytes: png(100, 100) }, escala: 20, rotação: 0, opacidade: 100 });
  const m = matrizDaMarcaDeImagem(await reabrir(r.bytes), 0);
  const centro = aplicarMatriz(m, 0.5, 0.5);
  assert.ok(perto(centro.x, 50 + 150, 0.05) && perto(centro.y, 100 + 200, 0.05), `${centro.x}, ${centro.y}`);
});

test('JPEG com rotação EXIF 6 como marca troca largura e altura (200×100 guardada vira 100×200 vista)', async () => {
  const r = await marcar(await pdfDeTeste(1), { tipo: 'imagem', imagem: { nome: 'pé.jpg', bytes: jpeg(200, 100, { orientação: 6 }) }, escala: 20, rotação: 0, opacidade: 100 });
  const m = matrizDaMarcaDeImagem(await reabrir(r.bytes), 0);
  const largura = 595.28 * 0.2;
  // Vista em pé: a largura vista (595,28 × 20%) vira o lado curto; o lado longo é o dobro.
  assert.ok(perto(Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3]), largura * 3, 0.1), `${m}`);
});

test('mosaico de imagem repete a imagem', async () => {
  const r = await marcar(await pdfDeTeste(1), { tipo: 'imagem', imagem: { nome: 'l.png', bytes: png(50, 50) }, escala: 15, mosaico: true, rotação: 0 });
  const quantas = [...conteúdoDaPágina(await reabrir(r.bytes), 0).matchAll(/ Do\b/g)].length;
  assert.ok(quantas >= 6, `${quantas} imagens`);
});

test('imagem inválida: vazia, texto com nome .png, formato sem suporte e PNG cortado (que travaria a pdf-lib) são recusados', async () => {
  const pdf = await pdfDeTeste(1);
  const com = (bytes) => marcar(pdf, { tipo: 'imagem', imagem: { nome: 'marca.png', bytes } });
  assert.equal((await com(new Uint8Array())).erro, 'imagem_vazia');
  assert.equal((await com(new TextEncoder().encode('não sou imagem, sou só texto comprido'))).erro, 'imagem_nao_suportada');
  assert.equal((await com(png(50, 50, { linhas: 10 }))).erro, 'imagem_corrompida');
  assert.equal((await com(png(50, 50).slice(0, 70))).erro, 'imagem_corrompida');
  const r = await com(png(50, 50).slice(0, 70));
  assert.match(mensagemDeErroDeMarcaDágua(r.erro, r.extras), /"marca\.png"/);
  assert.equal((await marcar(pdf, { tipo: 'imagem' })).erro, 'sem_imagem');
});

/* ------------------------------------------------ opções e entradas hostis */

test('texto da marca: vazio, só espaços, grande demais e com caracteres que a fonte não tem', async () => {
  const pdf = await pdfDeTeste(1);
  assert.equal((await marcar(pdf, { texto: '' })).erro, 'texto_vazio');
  assert.equal((await marcar(pdf, { texto: '    ' })).erro, 'texto_vazio');
  assert.equal((await marcar(pdf, { texto: 'x'.repeat(101) })).erro, 'texto_longo');
  const r = await marcar(pdf, { texto: 'CÓPIA → PROIBIDA' });
  assert.equal(r.erro, 'texto_caractere');
  assert.match(mensagemDeErroDeMarcaDágua(r.erro, r.extras), /"→" não existe na fonte do PDF/);
  assert.equal((await marcar(pdf, { texto: 'CÓPIA CONFIDENCIAL Nº 1 – “RESERVADO”' })).ok, true);
});

test('opções fora do combinado são recusadas sem abrir o PDF', async () => {
  const vazio = new Uint8Array(); // se abrisse, daria arquivo_vazio
  const erro = async (opções) => (await marcar(vazio, { texto: 'X', ...opções })).erro;
  assert.equal(await erro({ tipo: 'som' }), 'tipo_inválido');
  assert.equal(await erro({ posição: 'lá' }), 'posição_inválida');
  assert.equal(await erro({ camada: 'meio' }), 'camada_inválida');
  assert.equal(await erro({ cor: 'rosa' }), 'cor_inválida');
  assert.equal(await erro({ fonte: 'comic' }), 'fonte_inválida');
  assert.equal(await erro({ tamanho: 5 }), 'tamanho_inválido');
  assert.equal(await erro({ tamanho: 401 }), 'tamanho_inválido');
  assert.equal(await erro({ tamanho: Number.NaN }), 'tamanho_inválido');
  assert.equal(await erro({ opacidade: 0 }), 'opacidade_inválida');
  assert.equal(await erro({ opacidade: 101 }), 'opacidade_inválida');
  assert.equal(await erro({ opacidade: Infinity }), 'opacidade_inválida');
  assert.equal(await erro({ rotação: 181 }), 'rotação_inválida');
  assert.equal(await erro({ rotação: -181 }), 'rotação_inválida');
  assert.equal(await erro({ rotação: Number.NaN }), 'rotação_inválida');
  assert.equal((await marcar(vazio, { tipo: 'imagem', imagem: { nome: 'a.png', bytes: png(2, 2) }, escala: 4 })).erro, 'escala_inválida');
  assert.equal((await marcar(vazio, { tipo: 'imagem', imagem: { nome: 'a.png', bytes: png(2, 2) }, escala: 101 })).erro, 'escala_inválida');
});

test('rotações nos limites (-180, 0 e 180) e opacidade 1 funcionam', async () => {
  for (const rotação of [-180, 0, 180]) assert.equal((await marcar(await pdfDeTeste(1), { texto: 'X', rotação, opacidade: 1 })).ok, true);
});

test('faixa de páginas inválida chega com o motivo; 0, invertida e fora do PDF', async () => {
  const pdf = await pdfDeTeste(5);
  assert.equal((await marcar(pdf, { texto: 'X', páginas: '0' })).erro, 'faixa_zero');
  assert.equal((await marcar(pdf, { texto: 'X', páginas: '4-2' })).erro, 'faixa_invertida');
  const r = await marcar(pdf, { texto: 'X', páginas: '9' });
  assert.deepEqual([r.erro, r.extras.página, r.extras.total], ['faixa_fora', 9, 5]);
  assert.equal(mensagemDeErroDeMarcaDágua(r.erro, r.extras), 'A página 9 não existe: o PDF tem 5 páginas.');
});

test('PDF vazio, texto com nome .pdf, corrompido e protegido por senha', async () => {
  assert.equal((await marcar(new Uint8Array(), { texto: 'X' })).erro, 'arquivo_vazio');
  assert.equal((await marcar(new TextEncoder().encode('só texto'), { texto: 'X' })).erro, 'arquivo_nao_pdf');
  assert.equal((await marcar(new TextEncoder().encode('%PDF-1.7\nquebrado'), { texto: 'X' })).erro, 'pdf_corrompido');
  assert.equal((await marcar(await pdfProtegido(), { texto: 'X' })).erro, 'pdf_protegido');
  assert.match(mensagemDeErroDeMarcaDágua('pdf_protegido', { nome: 'x.pdf' }), /"x\.pdf" está protegido por senha/);
});

test('PDF de 200 páginas é marcado inteiro; cancelar interrompe e não gera arquivo', async () => {
  const pdf = await pdfDeTeste(200, { texto: false });
  const passos = [];
  const r = await marcar(pdf, { texto: 'X', aoProgredir: (p) => passos.push(p.página) });
  assert.equal(r.marcadas.length, 200);
  assert.equal(passos.length, 200);
  assert.equal((await reabrir(r.bytes)).getPageCount(), 200);
  let vezes = 0;
  assert.equal((await marcar(pdf, { texto: 'X', cancelado: () => ++vezes > 20 })).erro, 'cancelado');
});

test('propriedade: o número de páginas e o tamanho de cada uma não mudam', async () => {
  const original = await reabrir(await pdfDeTeste(4, { largura: 300 }));
  const r = await marcar(await original.save(), { texto: 'X', mosaico: true });
  const marcado = await reabrir(r.bytes);
  assert.equal(marcado.getPageCount(), 4);
  assert.deepEqual(marcado.getPages().map((p) => p.getSize()), original.getPages().map((p) => p.getSize()));
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['marca-dagua-no-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('o "Como usar" avisa que a marca não é à prova de remoção e traz limites e perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /CONFIDENCIAL.*50%.*45 graus/s);
  assert.match(limites, /NÃO é à prova de remoção/);
  assert.match(limites, /abaixo do conteúdo/);
  assert.match(limites, /100 MB/);
});
