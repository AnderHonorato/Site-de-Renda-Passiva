/**
 * Testes de PDF para JPG.
 *
 * O pdf.js de verdade (o mesmo arquivo de recursos/pdfjs/ que a página carrega)
 * abre os PDFs e mede as páginas; só o desenho no canvas é falso, porque o Node
 * não tem canvas. O desenho de verdade é conferido no navegador.
 *
 * Os casos da pesquisa (documentação/pesquisa-ilovepdf/c-de-pdf.md, C1) foram
 * conferidos à mão: A4 a 150 dpi = 595,28 × 150/72 = 1240,2 e 841,89 × 150/72 = 1753,9
 * pixels, que arredondam para 1240 × 1754; a 72 dpi, 595 × 842.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { pdfDeTeste, pdfProtegido, biblioteca } from './auxiliares/pdf-de-teste.mjs';
import {
  converterPdfEmImagens, tamanhoDaImagem, nomeDaImagem, mensagemDeErroDePdfParaImagem,
  LADO_MÁXIMO_EM_PIXELS, PIXELS_MÁXIMOS, LIMITE_DE_PÁGINAS_CONVERTIDAS, SAÍDA_MÁXIMA, DPI_MÍN, DPI_MÁX,
} from '../scripts/cálculos/pdf-para-jpg.js';
import { compactarZip } from '../scripts/comum/exportação/compactar-zip.js';
import ferramenta from '../scripts/ferramentas/pdf-para-jpg.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument } = biblioteca;

// O pdf.js avisa no Node que não tem canvas para desenhar; aqui só se mede, então o aviso é ruído.
const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };
const pdfjs = await import('../recursos/pdfjs/pdf.mjs');

/** Leitor com o pdf.js de verdade para abrir e medir, e um desenho falso que devolve bytes identificáveis. */
function leitor({ desenhar } = {}) {
  const chamadas = [];
  const abrir = async (bytes) => {
    const tarefa = pdfjs.getDocument({ data: bytes.slice(), useWasm: false, verbosity: 0, disableFontFace: true });
    const documento = await tarefa.promise;
    return {
      páginas: documento.numPages,
      async tamanho(número) {
        const { width, height } = (await documento.getPage(número)).getViewport({ scale: 1 });
        return { largura: width, altura: height };
      },
      async desenhar(número, medida, formato, qualidade) {
        chamadas.push({ número, medida, formato: formato.tipo, qualidade });
        if (desenhar) return desenhar(número, medida);
        return new Uint8Array([número, formato.tipo === 'image/png' ? 1 : 0]);
      },
      fechar: () => tarefa.destroy(),
    };
  };
  return { abrir, chamadas };
}

const converter = (bytes, { leitor: l = leitor(), ...opções } = {}) => converterPdfEmImagens({ nome: 'Minha Apostila.pdf', bytes }, { abrir: l.abrir, ...opções });

/* -------------------------------------------- casos da pesquisa (C1) */

test('A4 de 3 páginas em JPG a 150 dpi: 3 imagens de 1240 × 1754, com nomes que ordenam', async () => {
  const l = leitor();
  const r = await converter(await pdfDeTeste(3), { leitor: l, dpi: 150 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.imagens.map((i) => [i.nome, i.largura, i.altura]), [
    ['Minha Apostila-pagina-001.jpg', 1240, 1754],
    ['Minha Apostila-pagina-002.jpg', 1240, 1754],
    ['Minha Apostila-pagina-003.jpg', 1240, 1754],
  ]);
  assert.deepEqual(l.chamadas.map((c) => c.formato), ['image/jpeg', 'image/jpeg', 'image/jpeg']);
  assert.equal(l.chamadas[0].qualidade, 0.8);
  assert.deepEqual(r.reduzidas, []);
});

test('páginas de tamanhos e rotações diferentes a 72 dpi: 595×842, 842×595 e a rotacionada em 90° vira paisagem', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([595.28, 841.89]);
  documento.addPage([841.89, 595.28]);
  documento.addPage([612, 792]);
  const girada = documento.addPage([595.28, 841.89]);
  girada.setRotation(biblioteca.degrees(90));
  const r = await converter(await documento.save(), { dpi: 72 });
  assert.deepEqual(r.imagens.map((i) => [i.largura, i.altura]), [[595, 842], [842, 595], [612, 792], [842, 595]]);
});

test('uma página só: o nome não leva zeros à esquerda; várias: três algarismos, ou mais se o PDF pedir', () => {
  assert.equal(nomeDaImagem('doc', 1, 1, 'jpg'), 'doc-pagina-1.jpg');
  assert.equal(nomeDaImagem('doc', 7, 12, 'png'), 'doc-pagina-007.png');
  assert.equal(nomeDaImagem('doc', 1500, 1500, 'jpg'), 'doc-pagina-1500.jpg');
  const ordenados = [1, 2, 10, 11, 100].map((n) => nomeDaImagem('d', n, 100, 'jpg'));
  assert.deepEqual([...ordenados].sort(), ordenados, 'a ordem alfabética é a das páginas');
});

test('PNG usa o tipo certo, e a qualidade do JPG chega ao desenho', async () => {
  const png = leitor();
  const r = await converter(await pdfDeTeste(1), { leitor: png, formato: 'png' });
  assert.equal(png.chamadas[0].formato, 'image/png');
  assert.equal(r.imagens[0].nome, 'Minha Apostila-pagina-1.png');
  const jpg = leitor();
  await converter(await pdfDeTeste(1), { leitor: jpg, qualidade: 95 });
  assert.equal(jpg.chamadas[0].qualidade, 0.95);
});

test('faixa de páginas: só as pedidas são desenhadas, com o número certo no nome', async () => {
  const l = leitor();
  const r = await converter(await pdfDeTeste(6), { leitor: l, páginas: '2, 5-6' });
  assert.deepEqual(l.chamadas.map((c) => c.número), [2, 5, 6]);
  assert.deepEqual(r.imagens.map((i) => i.página), [2, 5, 6]);
  assert.deepEqual(r.imagens.map((i) => i.nome), ['Minha Apostila-pagina-002.jpg', 'Minha Apostila-pagina-005.jpg', 'Minha Apostila-pagina-006.jpg']);
  assert.equal(r.páginas, 6);
});

test('as imagens vão para um ZIP legível: nomes e conteúdo na ordem das páginas', async () => {
  const r = await converter(await pdfDeTeste(3));
  const zip = compactarZip(r.imagens.map((i) => ({ nome: i.nome, conteúdo: i.bytes })));
  const texto = new TextDecoder('latin1').decode(zip);
  for (const i of r.imagens) assert.ok(texto.includes(i.nome), i.nome);
  assert.ok(texto.indexOf('001.jpg') < texto.indexOf('002.jpg') && texto.indexOf('002.jpg') < texto.indexOf('003.jpg'));
  assert.equal(zip[0], 0x50); // "PK"
});

/* ------------------------------------------------- limites de tamanho */

test('página enorme: o lado maior é limitado a 8000 pixels e a área a 40 milhões, sem mudar a proporção', () => {
  const a0 = tamanhoDaImagem(2384, 3370, 300); // A0 a 300 dpi pediria 9933 × 14043
  assert.equal(a0.reduzida, true);
  assert.ok(Math.max(a0.largura, a0.altura) <= LADO_MÁXIMO_EM_PIXELS);
  assert.ok(a0.largura * a0.altura <= PIXELS_MÁXIMOS);
  assert.ok(Math.abs(a0.largura / a0.altura - 2384 / 3370) < 0.002);
  const quadrada = tamanhoDaImagem(7000, 7000, 72); // 7000 × 7000 = 49 MP, mas lado dentro do limite
  assert.equal(quadrada.reduzida, true);
  assert.ok(quadrada.largura * quadrada.altura <= PIXELS_MÁXIMOS);
  const normal = tamanhoDaImagem(595.28, 841.89, 150);
  assert.deepEqual([normal.largura, normal.altura, normal.reduzida], [1240, 1754, false]);
  assert.deepEqual(tamanhoDaImagem(0.1, 0.1, 72).largura, 1);
});

test('propriedade: nenhuma combinação de página e resolução passa dos limites, e a escala nunca aumenta', () => {
  for (const [l, a] of [[10, 10], [595, 842], [842, 595], [3000, 40], [40, 3000], [14400, 14400], [1, 14400]]) {
    for (const dpi of [72, 96, 150, 300]) {
      const t = tamanhoDaImagem(l, a, dpi);
      assert.ok(t.largura >= 1 && t.altura >= 1);
      assert.ok(Math.max(t.largura, t.altura) <= LADO_MÁXIMO_EM_PIXELS + 1, `${l}×${a} a ${dpi}`);
      assert.ok(t.largura * t.altura <= PIXELS_MÁXIMOS * 1.001, `${l}×${a} a ${dpi}`);
      assert.ok(t.escala <= dpi / 72 + 1e-12);
    }
  }
});

test('o resultado diz em quais páginas a resolução foi reduzida', async () => {
  const documento = await PDFDocument.create();
  documento.addPage([595.28, 841.89]);
  documento.addPage([5000, 5000]);
  const r = await converter(await documento.save(), { dpi: 300 });
  assert.deepEqual(r.reduzidas, [2]);
  assert.ok(r.imagens[1].largura <= LADO_MÁXIMO_EM_PIXELS);
});

test('mais páginas que o limite de uma vez é recusado, dizendo quantas foram pedidas', async () => {
  const pdf = await pdfDeTeste(LIMITE_DE_PÁGINAS_CONVERTIDAS + 1, { texto: false });
  const r = await converter(pdf);
  assert.deepEqual([r.erro, r.extras.pedidas], ['páginas_demais', 201]);
  assert.match(mensagemDeErroDePdfParaImagem(r.erro, r.extras), /até 200 páginas por vez, e você pediu 201/);
  const ok = await converter(pdf, { páginas: '1-200' });
  assert.equal(ok.imagens.length, 200);
});

test('saída grande demais é interrompida', async () => {
  const r = await converter(await pdfDeTeste(3), { leitor: leitor({ desenhar: () => ({ length: SAÍDA_MÁXIMA / 2 + 1 }) }) });
  assert.equal(r.erro, 'saída_grande');
  assert.match(mensagemDeErroDePdfParaImagem(r.erro), /400 MB/);
});

/* ------------------------------------------------ entradas hostis */

test('opções fora do combinado são recusadas sem abrir o PDF', async () => {
  const vazio = new Uint8Array();
  const erro = async (opções) => (await converter(vazio, opções)).erro;
  assert.equal(await erro({ formato: 'gif' }), 'formato_inválido');
  assert.equal(await erro({ dpi: 71 }), 'dpi_inválido');
  assert.equal(await erro({ dpi: 301 }), 'dpi_inválido');
  assert.equal(await erro({ dpi: 150.5 }), 'dpi_inválido');
  assert.equal(await erro({ dpi: Number.NaN }), 'dpi_inválido');
  assert.equal(await erro({ dpi: Infinity }), 'dpi_inválido');
  assert.equal(await erro({ qualidade: 70 }), 'qualidade_inválida');
  assert.equal((await converter(vazio, { formato: 'png', qualidade: 70 })).erro, 'arquivo_vazio'); // qualidade não vale para PNG
  assert.equal(DPI_MÍN, 72);
  assert.equal(DPI_MÁX, 300);
});

test('PDF vazio, texto com nome .pdf, corrompido e protegido por senha', async () => {
  assert.equal((await converter(new Uint8Array())).erro, 'arquivo_vazio');
  assert.equal((await converter(new TextEncoder().encode('só texto'))).erro, 'arquivo_nao_pdf');
  const quebrado = await converter(new TextEncoder().encode('%PDF-1.7\nconteudo quebrado'));
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'Minha Apostila.pdf']);
  // Senha de verdade: o leitor avisa com PasswordException (o pdf.js, ao ler o arquivo falso da pdf-lib, só vê dano).
  const comSenha = await converterPdfEmImagens({ nome: 'x.pdf', bytes: await pdfProtegido() }, {
    abrir: async () => { const e = new Error('No password given'); e.name = 'PasswordException'; throw e; },
  });
  assert.equal(comSenha.erro, 'pdf_protegido');
  assert.match(mensagemDeErroDePdfParaImagem('pdf_protegido', { nome: 'x.pdf' }), /"x\.pdf" está protegido por senha/);
  const semLeitor = await converterPdfEmImagens({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, {
    abrir: async () => { const e = new Error('sem rede'); e.name = 'LeitorIndisponível'; throw e; },
  });
  assert.equal(semLeitor.erro, 'leitor_indisponível');
  assert.match(mensagemDeErroDePdfParaImagem(semLeitor.erro), /Não foi possível carregar o leitor de PDF/);
});

test('faixa de páginas inválida chega com o motivo, e o leitor é fechado mesmo assim', async () => {
  let fechou = 0;
  const base = leitor();
  const abrir = async (bytes) => { const d = await base.abrir(bytes); return { ...d, fechar: async () => { fechou++; await d.fechar(); } }; };
  const r = await converterPdfEmImagens({ nome: 'x.pdf', bytes: await pdfDeTeste(3) }, { abrir, páginas: '9' });
  assert.deepEqual([r.erro, r.extras.página, r.extras.total], ['faixa_fora', 9, 3]);
  assert.equal(fechou, 1);
  assert.equal((await converterPdfEmImagens({ nome: 'x.pdf', bytes: await pdfDeTeste(3) }, { abrir, páginas: '0' })).erro, 'faixa_zero');
  assert.equal(fechou, 2);
});

test('página que não desenha vira erro com o número da página, sem entregar imagens pela metade', async () => {
  const r = await converter(await pdfDeTeste(4), {
    leitor: leitor({ desenhar: (n) => { if (n === 3) throw new Error('quebrou'); return new Uint8Array([n]); } }),
  });
  assert.deepEqual([r.erro, r.extras.página], ['página_com_erro', 3]);
  assert.equal(mensagemDeErroDePdfParaImagem(r.erro, r.extras), 'Não foi possível desenhar a página 3. O PDF pode ter um defeito nela.');
  assert.equal(r.imagens, undefined);
});

test('cancelar interrompe de verdade, mesmo com o desenho já em andamento, e o progresso conta página a página', async () => {
  const passos = [];
  await converter(await pdfDeTeste(3), { aoProgredir: (p) => passos.push([p.página, p.total]) });
  assert.deepEqual(passos, [[1, 3], [2, 3], [3, 3]]);
  let vezes = 0;
  const l = leitor();
  const r = await converter(await pdfDeTeste(10), { leitor: l, cancelado: () => ++vezes > 5 });
  assert.equal(r.erro, 'cancelado');
  assert.ok(l.chamadas.length < 10);
});

test('PDF de 300 páginas: com um intervalo pedido, só ele é desenhado', async () => {
  const l = leitor();
  const r = await converter(await pdfDeTeste(300, { texto: false }), { leitor: l, páginas: '290-300' });
  assert.equal(r.imagens.length, 11);
  assert.equal(l.chamadas.length, 11);
  assert.equal(r.imagens[0].nome, 'Minha Apostila-pagina-290.jpg');
});

/* ------------------------------------------------- recursos do pdf.js */

test('o pdf.js que a página carrega é o 6.3.289 (Apache-2.0), com a licença junto e sem eval nem new Function', async () => {
  assert.equal(pdfjs.version, '6.3.289');
  const licença = await readFile(new URL('../recursos/pdfjs/LICENSE-pdfjs.txt', import.meta.url), 'utf8');
  assert.match(licença, /Apache License\s+Version 2\.0/);
  assert.match(licença, /OpenJPEG/);
  assert.match(licença, /JBIG2/);
  for (const arquivo of ['pdf.mjs', 'pdf.worker.mjs', 'jbig2_nowasm_fallback.js', 'openjpeg_nowasm_fallback.js']) {
    const código = await readFile(new URL(`../recursos/pdfjs/${arquivo}`, import.meta.url), 'utf8');
    assert.equal(/[^a-zA-Z.]eval\(|new Function\(/.test(código), false, `${arquivo} não pode usar eval`);
  }
});

test('o leitor na tela não pede WebAssembly nem fontes de fora, para caber na política de segurança sem relaxá-la', async () => {
  const código = await readFile(new URL('../scripts/ferramentas/auxiliares/leitor-pdfjs.js', import.meta.url), 'utf8');
  assert.match(código, /useWasm: false/);
  assert.match(código, /disableFontFace: true/);
  assert.doesNotMatch(código, /standardFontDataUrl:|cMapUrl:/);
  assert.doesNotMatch(código, /https?:\/\//);
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['pdf-para-jpg'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar', 'png']);
  assert.equal(ficha.local, true);
});

test('"Como usar" traz o exemplo conferido, os limites e as perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /1240 × 1754/);
  assert.match(exemplo.texto, /595 × 842/);
  assert.match(limites, /Apache 2\.0/);
  assert.match(limites, /8\.000 pixels/);
  assert.match(limites, /100 MB/);
});
