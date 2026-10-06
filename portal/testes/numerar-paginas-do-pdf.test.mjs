/**
 * Testes de números de página no PDF.
 *
 * Os casos da pesquisa (documentação/pesquisa-ilovepdf/d-editar.md, D3) foram
 * conferidos à mão: 12 mm = 34,02 pt; página A4 = 595,28 × 841,89 pt; com a
 * fonte Helvetica a 12 pt, "Página 3 de 5" mede o que a pdf-lib calcula e fica
 * centralizado (±1 pt).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  biblioteca, pdfDeTeste, pdfProtegido, conteúdoDaPágina, textosDaPágina, matrizesDeTexto, caixaDaPágina, perto,
} from './auxiliares/pdf-de-teste.mjs';
import {
  numerarPáginas, formatarNúmero, montarTexto, conferirModelo, mensagemDeErroDeNumeração, posicionarTexto,
  POSIÇÕES, MARGENS_MM, MODELOS,
} from '../scripts/cálculos/numerar-paginas-do-pdf.js';
import { interpretarPáginas, mmParaPt, mensagemDeErroDoPdfÚnico, LIMITE_DE_PÁGINAS } from '../scripts/cálculos/pdf-páginas.js';
import ferramenta from '../scripts/ferramentas/numerar-paginas-do-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, StandardFonts, degrees } = biblioteca;

const numerar = async (bytes, opções = {}) => numerarPáginas({ nome: 'teste.pdf', bytes }, { biblioteca, ...opções });
const reabrir = (bytes) => PDFDocument.load(bytes);
/** Só os textos escritos pela ferramenta (os "Original N" do PDF de teste ficam de fora). */
const números = (documento, índice) => textosDaPágina(documento, índice).filter((t) => !t.startsWith('Original'));

async function larguraDoTexto(texto, tamanho, fonte = StandardFonts.Helvetica) {
  const documento = await PDFDocument.create();
  return (await documento.embedFont(fonte)).widthOfTextAtSize(texto, tamanho);
}

/* -------------------------------------------- casos da pesquisa (D3) */

test('"Página {n} de {p}", embaixo no centro, 12 pt: a página 3 traz "Página 3 de 5" centralizado, na linha de base a 12 mm da borda', async () => {
  const r = await numerar(await pdfDeTeste(5), { modelo: MODELOS['página-de'], posição: 'baixo-centro', tamanho: 12 });
  assert.equal(r.ok, true);
  const documento = await reabrir(r.bytes);
  assert.equal(documento.getPageCount(), 5);
  assert.deepEqual(números(documento, 2), ['Página 3 de 5']);
  const [a, b, , , x, y] = matrizesDeTexto(documento, 2).at(-1);
  assert.deepEqual([a, b], [1, 0]); // texto reto
  const largura = await larguraDoTexto('Página 3 de 5', 12);
  assert.ok(perto(x + largura / 2, 595.28 / 2, 1), `centro em ${x + largura / 2}`);
  assert.ok(perto(y, mmParaPt(12), 1), `linha de base em ${y}`);
  assert.ok(perto(y, 34.02, 0.05));
});

test('primeiro número 10, das páginas 2 a 4: só elas são numeradas, e o total {p} continua sendo o do documento', async () => {
  const r = await numerar(await pdfDeTeste(5), { modelo: MODELOS['página-de'], primeiro: 10, páginas: '2-4' });
  const documento = await reabrir(r.bytes);
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => números(documento, i)), [[], ['Página 10 de 5'], ['Página 11 de 5'], ['Página 12 de 5'], []]);
  assert.deepEqual(r.numeradas.map((n) => n.página), [2, 3, 4]);
  assert.deepEqual(r.avisos, ['total_do_documento']);
});

test('o aviso do total só aparece quando o {p} engana: sem {p}, ou numerando tudo a partir de 1, não há aviso', async () => {
  const pdf = await pdfDeTeste(3);
  assert.deepEqual((await numerar(pdf, { modelo: MODELOS['página-de'] })).avisos, []);
  assert.deepEqual((await numerar(pdf, { modelo: MODELOS['página-de'], primeiro: 2 })).avisos, ['total_do_documento']);
  assert.deepEqual((await numerar(pdf, { modelo: '{n}', primeiro: 2, páginas: '2-3' })).avisos, []);
});

test('página rotacionada 90°: o número gira junto e fica na borda de baixo de quem lê', async () => {
  const r = await numerar(await pdfDeTeste(1, { rotações: [90] }), { modelo: '{n}', posição: 'baixo-centro' });
  const documento = await reabrir(r.bytes);
  const [a, b, c, d, x, y] = matrizesDeTexto(documento, 0).at(-1);
  // Texto vertical subindo (ângulo 90°): a ≈ 0, b ≈ 1, c ≈ -1, d ≈ 0.
  assert.deepEqual([a, b, c, d].map((n) => Math.round(n)), [0, 1, -1, 0]);
  // A borda de baixo de quem lê é a borda direita do PDF: x = largura − 12 mm; centrado na altura.
  assert.ok(perto(x, 595.28 - mmParaPt(12), 0.05), `x ${x}`);
  const largura = await larguraDoTexto('1', 12);
  assert.ok(perto(y + largura / 2, 841.89 / 2, 0.05), `y ${y}`);
});

test('CropBox menor que a página: o número fica dentro da área que se vê', async () => {
  const bytes = await pdfDeTeste(1);
  const documento = await reabrir(bytes);
  documento.getPage(0).setCropBox(100, 200, 300, 400);
  const r = await numerar(await documento.save(), { modelo: '{n}', posição: 'baixo-centro' });
  const [, , , , x, y] = matrizesDeTexto(await reabrir(r.bytes), 0).at(-1);
  const largura = await larguraDoTexto('1', 12);
  assert.ok(perto(x + largura / 2, 100 + 150, 0.05), `x ${x}`);
  assert.ok(perto(y, 200 + mmParaPt(12), 0.05), `y ${y}`);
});

/* --------------------------------------------------- formatos */

test('numeração romana e em letras', () => {
  assert.deepEqual([1, 4, 9, 14, 40, 90, 400, 1994, 3999].map((n) => formatarNúmero(n, 'romano-maiúsculo')),
    ['I', 'IV', 'IX', 'XIV', 'XL', 'XC', 'CD', 'MCMXCIV', 'MMMCMXCIX']);
  assert.equal(formatarNúmero(8, 'romano-minúsculo'), 'viii');
  assert.deepEqual([1, 2, 26, 27, 28, 52, 53, 702, 703].map((n) => formatarNúmero(n, 'letra-minúscula')),
    ['a', 'b', 'z', 'aa', 'ab', 'az', 'ba', 'zz', 'aaa']);
  assert.equal(formatarNúmero(3, 'letra-maiúscula'), 'C');
  assert.equal(formatarNúmero(0, 'arábico'), '0');
  assert.throws(() => formatarNúmero(0, 'romano-maiúsculo'), RangeError);
  assert.throws(() => formatarNúmero(4000, 'romano-maiúsculo'), RangeError);
  assert.throws(() => formatarNúmero(1.5, 'letra-minúscula'), RangeError);
});

test('o {p} acompanha a numeração escolhida', () => {
  assert.equal(montarTexto('Pág. {n}/{p}', 2, 'romano-maiúsculo', 12), 'Pág. II/XII');
  assert.equal(montarTexto('{n}', 7, 'arábico', 9), '7');
  assert.equal(montarTexto('{n}-{n}', 7, 'arábico', 9), '7-7');
});

test('PDF numerado em romano sai com i, ii, iii', async () => {
  const r = await numerar(await pdfDeTeste(3), { formato: 'romano-minúsculo' });
  const documento = await reabrir(r.bytes);
  assert.deepEqual([0, 1, 2].map((i) => números(documento, i)[0]), ['i', 'ii', 'iii']);
});

/* ------------------------------------------- posição, frente e verso */

test('as nove posições ficam nos cantos, bordas e centro certos de uma página A4', () => {
  const área = { largura: 600, altura: 800 };
  const base = { margem: 30, larguraDoTexto: 20, alturaDasMaiúsculas: 10 };
  const esperado = {
    'cima-esquerda': [30, 760], 'cima-centro': [290, 760], 'cima-direita': [550, 760],
    'meio-esquerda': [30, 395], 'meio-centro': [290, 395], 'meio-direita': [550, 395],
    'baixo-esquerda': [30, 30], 'baixo-centro': [290, 30], 'baixo-direita': [550, 30],
  };
  for (const posição of POSIÇÕES) {
    const { x, y } = posicionarTexto(área, { ...base, posição });
    assert.deepEqual([x, y], esperado[posição], posição);
  }
});

test('espelhar: nas páginas pares o canto da direita vira o da esquerda (e o centro não muda)', async () => {
  const r = await numerar(await pdfDeTeste(4), { modelo: '{n}', posição: 'baixo-direita', espelhar: true });
  const documento = await reabrir(r.bytes);
  const xs = [0, 1, 2, 3].map((i) => matrizesDeTexto(documento, i).at(-1)[4]);
  assert.ok(xs[0] > 500 && xs[2] > 500, 'ímpares à direita');
  assert.ok(xs[1] < 100 && xs[3] < 100, 'pares à esquerda');
  const centro = await numerar(await pdfDeTeste(2), { modelo: '{n}', posição: 'baixo-centro', espelhar: true });
  const d =await reabrir(centro.bytes);
  assert.equal(matrizesDeTexto(d, 0).at(-1)[4], matrizesDeTexto(d, 1).at(-1)[4]);
});

test('propriedade: o texto inteiro cabe na área visível, em qualquer posição, margem, rotação e CropBox', async () => {
  const tamanho = 14;
  const largura = await larguraDoTexto('Página 12 de 40', tamanho);
  const alturaDasMaiúsculas = (await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica)).heightAtSize(tamanho, { descender: false });
  for (const rotação of [0, 90, 180, 270]) {
    for (const recorte of [false, true]) {
      const origem = await PDFDocument.create();
      const p = origem.addPage([500, 700]);
      p.setRotation(degrees(rotação));
      if (recorte) p.setCropBox(40, 60, 300, 450);
      const caixa = recorte ? [40, 60, 340, 510] : [0, 0, 500, 700];
      for (const posição of POSIÇÕES) {
        for (const margem of Object.keys(MARGENS_MM)) {
          const r = await numerar(await origem.save(), { modelo: 'Página {n} de {p}', primeiro: 12, posição, margem, tamanho });
          assert.equal(r.ok, true, `${rotação} ${posição} ${margem}: ${r.erro}`);
          const [a, b, c, d, x, y] = matrizesDeTexto(await reabrir(r.bytes), 0).at(-1);
          const cantos = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => [x + a * largura * i + c * alturaDasMaiúsculas * j, y + b * largura * i + d * alturaDasMaiúsculas * j]);
          const texto = `${rotação}° ${recorte ? 'recortada' : ''} ${posição} ${margem}`;
          for (const [cx, cy] of cantos) {
            assert.ok(cx >= caixa[0] - 0.5 && cx <= caixa[2] + 0.5 && cy >= caixa[1] - 0.5 && cy <= caixa[3] + 0.5, `${texto}: (${cx}, ${cy})`);
          }
          // O texto sempre lê da esquerda para a direita para quem vê a página: ângulo = rotação.
          assert.deepEqual([a, b].map((n) => Math.round(n)), [Math.round(Math.cos((rotação * Math.PI) / 180)), Math.round(Math.sin((rotação * Math.PI) / 180))], texto);
        }
      }
    }
  }
});

/* ------------------------------------------ outras opções e efeitos */

test('o conteúdo original, as caixas e o número de páginas continuam como estavam', async () => {
  const original = await pdfDeTeste(3);
  const r = await numerar(original);
  const antes = await reabrir(original);
  const depois = await reabrir(r.bytes);
  assert.equal(depois.getPageCount(), 3);
  for (const i of [0, 1, 2]) {
    assert.deepEqual(caixaDaPágina(depois, i, 'MediaBox'), caixaDaPágina(antes, i, 'MediaBox'));
    assert.ok(textosDaPágina(depois, i).includes(`Original ${i + 1}`));
  }
});

test('conteúdo antigo que deixa a matriz torta não desloca o número', async () => {
  const documento = await PDFDocument.create();
  const página = documento.addPage([300, 300]);
  // Desenho que escala e nunca restaura o estado gráfico: o número não pode herdar isso.
  página.node.addContentStream(documento.context.register(documento.context.contentStream([biblioteca.concatTransformationMatrix(0.5, 0, 0, 0.5, 10, 10)])));
  const r = await numerar(await documento.save(), { modelo: '{n}', posição: 'baixo-esquerda' });
  const conteúdo = conteúdoDaPágina(await reabrir(r.bytes), 0);
  const escala = conteúdo.indexOf('0.5 0 0 0.5 10 10 cm');
  assert.ok(escala >= 0);
  const restaura = conteúdo.indexOf('\nQ', escala);
  assert.ok(restaura > escala && restaura < conteúdo.indexOf('Tm'), 'o estado é restaurado antes do número');
});

test('opacidade menor que 100 cria o estado gráfico com transparência; 100 não cria', async () => {
  const pdf = await pdfDeTeste(1);
  assert.match(conteúdoDaPágina(await reabrir((await numerar(pdf, { opacidade: 40 })).bytes), 0), / gs\b/);
  assert.doesNotMatch(conteúdoDaPágina(await reabrir((await numerar(pdf, { opacidade: 100 })).bytes), 0), / gs\b/);
});

test('fonte, cor e tamanho entram no conteúdo', async () => {
  const r = await numerar(await pdfDeTeste(1), { fonte: 'courier', cor: 'vermelho', tamanho: 20, modelo: '{n}' });
  const conteúdo = conteúdoDaPágina(await reabrir(r.bytes), 0);
  assert.match(conteúdo, /0\.78 0\.1 0\.1 rg/);
  assert.match(conteúdo, / 20 Tf/);
});

test('acentos funcionam com as fontes padrão: "Página", "nº" e "ção"', async () => {
  const r = await numerar(await pdfDeTeste(1), { modelo: 'Seção nº {n} – ação' });
  assert.equal(r.ok, true);
  assert.deepEqual(números(await reabrir(r.bytes), 0).map((t) => t.length), ['Seção nº 1 – ação'.length]);
});

test('PDF de 300 páginas é numerado inteiro, e o progresso e o cancelamento funcionam', async () => {
  const pdf = await pdfDeTeste(300, { texto: false });
  const passos = [];
  const r = await numerar(pdf, { aoProgredir: (p) => passos.push(p.página) });
  assert.equal(r.ok, true);
  assert.equal(r.numeradas.length, 300);
  assert.equal(passos.length, 300);
  assert.equal((await reabrir(r.bytes)).getPageCount(), 300);
  let vezes = 0;
  assert.equal((await numerar(pdf, { cancelado: () => ++vezes > 10 })).erro, 'cancelado');
});

test('propriedade: numerar duas vezes soma dois números por página, e a primeira numeração não se perde', async () => {
  const uma = await numerar(await pdfDeTeste(3), { posição: 'baixo-centro' });
  const duas = await numerar(uma.bytes, { posição: 'cima-centro', formato: 'romano-minúsculo' });
  const documento = await reabrir(duas.bytes);
  assert.deepEqual(números(documento, 1), ['2', 'ii']);
});

/* ------------------------------------------ faixa de páginas */

test('faixa de páginas: números, intervalos, abertos, pares, ímpares, espaços e repetições', () => {
  const faixa = (texto, total = 10) => {
    const r = interpretarPáginas(texto, total);
    return r.ok ? r.índices.map((i) => i + 1) : r.erro;
  };
  assert.deepEqual(faixa(''), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(faixa('  Todas '), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(faixa('1-3, 5, 8-'), [1, 2, 3, 5, 8, 9, 10]);
  assert.deepEqual(faixa('-4'), [1, 2, 3, 4]);
  assert.deepEqual(faixa('3 - 5'), [3, 4, 5]);
  assert.deepEqual(faixa('3–5'), [3, 4, 5]); // meio-traço do teclado do celular
  assert.deepEqual(faixa('5,5,3-5,1'), [1, 3, 4, 5]); // sem repetição, em ordem
  assert.deepEqual(faixa('pares'), [2, 4, 6, 8, 10]);
  assert.deepEqual(faixa('Ímpares'), [1, 3, 5, 7, 9]);
  assert.deepEqual(faixa('1; 2 3'), [1, 2, 3]);
  assert.equal(faixa('abc'), 'faixa_inválida');
  assert.equal(faixa('1-3-5'), 'faixa_inválida');
  assert.equal(faixa('-'), 'faixa_inválida');
  assert.equal(faixa('1.5'), 'faixa_inválida');
  assert.equal(faixa('0'), 'faixa_zero');
  assert.equal(faixa('0-3'), 'faixa_zero');
  assert.equal(faixa('5-3'), 'faixa_invertida');
  assert.equal(faixa('11'), 'faixa_fora');
  assert.equal(faixa('2-99'), 'faixa_fora');
  assert.equal(faixa('99999999999999999999'), 'faixa_inválida');
  assert.equal(faixa('pares', 1), 'faixa_sem_páginas');
  assert.equal(interpretarPáginas('1-10', 10).todas, true);
  assert.equal(interpretarPáginas('1-9', 10).todas, false);
});

test('erros de faixa chegam ao cálculo com o número da página e o total', async () => {
  const r = await numerar(await pdfDeTeste(5), { páginas: '3-9' });
  assert.deepEqual([r.erro, r.extras.página, r.extras.total], ['faixa_fora', 9, 5]);
  assert.equal(mensagemDeErroDeNumeração(r.erro, r.extras), 'A página 9 não existe: o PDF tem 5 páginas.');
  assert.match(mensagemDeErroDeNumeração('faixa_inválida', { trecho: 'abc' }), /Não entendi "abc"/);
});

/* ------------------------------------------------ entradas hostis */

test('texto do número: vazio, sem {n}, grande demais e com caracteres que a fonte não tem', async () => {
  assert.equal(conferirModelo(''), 'modelo_vazio');
  assert.equal(conferirModelo('   '), 'modelo_vazio');
  assert.equal(conferirModelo('Página'), 'modelo_sem_numero');
  assert.equal(conferirModelo('{n}'), null);
  assert.equal(conferirModelo(`{n}${'x'.repeat(80)}`), 'modelo_longo');
  assert.equal(conferirModelo('→ {n}'), 'modelo_caractere');
  assert.equal(conferirModelo('{n} 😀'), 'modelo_caractere');
  assert.equal(conferirModelo('Ωmega {n}'), 'modelo_caractere');
  const r = await numerar(await pdfDeTeste(1), { modelo: '→ {n}' });
  assert.equal(r.erro, 'modelo_caractere');
  assert.match(mensagemDeErroDeNumeração(r.erro, r.extras), /"→" não existe na fonte do PDF/);
});

test('opções fora do combinado são recusadas com mensagem, sem abrir o PDF', async () => {
  const pdf = new Uint8Array(); // se abrisse, daria arquivo_vazio: o teste prova que a opção é conferida antes
  const erro = async (opções) => (await numerar(pdf, opções)).erro;
  assert.equal(await erro({ posição: 'em-cima-de-tudo' }), 'posição_inválida');
  assert.equal(await erro({ formato: 'maia' }), 'formato_inválido');
  assert.equal(await erro({ margem: 'zero' }), 'margem_inválida');
  assert.equal(await erro({ cor: 'rosa' }), 'cor_inválida');
  assert.equal(await erro({ fonte: 'comic' }), 'fonte_inválida');
  assert.equal(await erro({ tamanho: 5 }), 'tamanho_inválido');
  assert.equal(await erro({ tamanho: 73 }), 'tamanho_inválido');
  assert.equal(await erro({ tamanho: Number.NaN }), 'tamanho_inválido');
  assert.equal(await erro({ tamanho: Infinity }), 'tamanho_inválido');
  assert.equal(await erro({ opacidade: 0 }), 'opacidade_inválida');
  assert.equal(await erro({ opacidade: 101 }), 'opacidade_inválida');
  assert.equal(await erro({ primeiro: 1.5 }), 'primeiro_inválido');
  assert.equal(await erro({ primeiro: Number.NaN }), 'primeiro_inválido');
  assert.equal(await erro({ primeiro: -1 }), 'primeiro_negativo');
  assert.equal(await erro({ primeiro: 0, formato: 'romano-minúsculo' }), 'primeiro_romano');
  assert.equal(await erro({ primeiro: 100000 }), 'primeiro_grande');
  assert.equal(await erro({ modelo: '' }), 'modelo_vazio');
});

test('primeiro número 0 é aceito na numeração comum; romano que passaria de 3999 é recusado', async () => {
  const zero = await numerar(await pdfDeTeste(2), { primeiro: 0 });
  assert.deepEqual(zero.numeradas.map((n) => n.texto), ['0', '1']);
  assert.equal((await numerar(await pdfDeTeste(2), { primeiro: 3999, formato: 'romano-maiúsculo' })).erro, 'romano_estoura');
});

test('letra grande demais para o texto caber na largura da página é recusada, dizendo a página', async () => {
  const r = await numerar(await pdfDeTeste(2, { largura: 150 }), { modelo: 'Página {n} de {p} do documento todo', tamanho: 40 });
  assert.equal(r.erro, 'texto_largo');
  assert.equal(r.extras.página, 1);
  assert.match(mensagemDeErroDeNumeração(r.erro, r.extras), /Na página 1 o texto é mais largo que a página/);
});

// Obs.: a pdf-lib acrescenta sozinha uma página em branco ao abrir um PDF sem nenhuma página,
// então esse caso não chega a ser detectável aqui; o código `pdf_sem_paginas` é só uma defesa.
test('PDF vazio, texto com nome .pdf, corrompido e protegido por senha', async () => {
  assert.equal((await numerar(new Uint8Array())).erro, 'arquivo_vazio');
  assert.equal((await numerar(new TextEncoder().encode('isto é só texto'))).erro, 'arquivo_nao_pdf');
  const quebrado = await numerar(new TextEncoder().encode('%PDF-1.7\nconteudo quebrado'));
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'teste.pdf']);
  assert.equal((await numerar(await pdfProtegido())).erro, 'pdf_protegido');
  assert.match(mensagemDeErroDeNumeração('pdf_protegido', { nome: 'x.pdf' }), /"x\.pdf" está protegido por senha/);
  assert.match(mensagemDeErroDeNumeração('arquivo_vazio', { nome: 'x.pdf' }), /"x\.pdf" está vazio/);
});

test('PDF com mais páginas que o limite é recusado com o número de páginas', async () => {
  const r = await numerar(await pdfDeTeste(5, { texto: false }), { limiteDePáginas: 4 });
  assert.deepEqual([r.erro, r.extras.total, r.extras.limite], ['pdf_páginas_demais', 5, 4]);
  assert.equal(mensagemDeErroDoPdfÚnico(r.erro, r.extras), '"teste.pdf" tem 5 páginas. O limite desta ferramenta é 4.');
  assert.equal(LIMITE_DE_PÁGINAS, 3000);
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['numerar-paginas-do-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('o "Como usar" traz o exemplo da pesquisa e avisa dos limites e da assinatura digital', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /Página 3 de 5.*12 mm/s);
  assert.match(exemplo.texto, /Página 10 de 5/);
  assert.match(limites, /Assinaturas digitais/);
  assert.match(limites, /100 MB/);
});
