/**
 * Testes de Organizar PDF. Casos da pesquisa do iLovePDF (documentação/pesquisa-ilovepdf/a-organizar.md, A5),
 * com PDFs gerados aqui: a página n tem largura 100 + n, o que mostra de onde cada página de saída veio.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  listaOriginal, moverItem, girarItem, duplicarItem, removerItem, inserirBranca, inverterOrdem, resumoDaLista,
  descreverPágina, tamanhoDaBranca, medirPáginas, organizarPdf, LIMITE_DE_ITENS, LIMITE_DE_PÁGINAS_DA_LISTA,
} from '../scripts/cálculos/organizar-pdf.js';
import { abrirPdf } from '../scripts/cálculos/páginas-do-pdf.js';
import ferramenta from '../scripts/ferramentas/organizar-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';
import { biblioteca, pdfNumerado, origensDasPáginas, rotaçõesDasPáginas } from './auxiliares/pdfs-de-teste.mjs';

const { PDFDocument, PDFName, PDFNumber } = biblioteca;

async function abrir(quantidade, opções) {
  const r = await abrirPdf({ nome: 'Escaneado.pdf', bytes: await pdfNumerado(quantidade, opções) }, { biblioteca, limiteDePáginas: LIMITE_DE_PÁGINAS_DA_LISTA });
  assert.equal(r.ok, true);
  return r;
}

const organizar = async (aberto, itens) => {
  const r = await organizarPdf(aberto, itens, { biblioteca });
  assert.equal(r.ok, true, r.mensagem);
  return r;
};

/** Larguras (100 + n) das páginas de saída; página em branco sai com a largura do vizinho, por isso o teste usa tamanhos conhecidos. */
const tamanhos = async (bytes) => (await PDFDocument.load(bytes)).getPages().map((p) => p.getSize());

/* --------------------------------------------------------------- operações */

test('as operações devolvem listas novas e não alteram a anterior', () => {
  const base = listaOriginal(4);
  const copiaDaBase = JSON.stringify(base);
  moverItem(base, 0, 3); girarItem(base, 1, 90); duplicarItem(base, 2); removerItem(base, 0); inserirBranca(base, 1); inverterOrdem(base);
  assert.equal(JSON.stringify(base), copiaDaBase);
});

test('mover: para o começo, para o fim, mesma posição e posições inválidas', () => {
  const origens = (itens) => itens.map((i) => i.origem);
  const base = listaOriginal(5);
  assert.deepEqual(origens(moverItem(base, 4, 0)), [4, 0, 1, 2, 3]);
  assert.deepEqual(origens(moverItem(base, 0, 4)), [1, 2, 3, 4, 0]);
  assert.deepEqual(origens(moverItem(base, 1, 2)), [0, 2, 1, 3, 4]);
  assert.equal(moverItem(base, 2, 2), base);
  for (const [de, para] of [[-1, 0], [0, 5], [5, 0], [0.5, 1], [NaN, 0], [0, undefined]]) assert.equal(moverItem(base, de, para), base, `${de} → ${para}`);
});

test('girar soma e volta ao zero na quarta vez; em página em branco não faz nada', () => {
  let itens = listaOriginal(2);
  const giros = [];
  for (let i = 0; i < 4; i++) { itens = girarItem(itens, 0, 90); giros.push(itens[0].giro); }
  assert.deepEqual(giros, [90, 180, 270, 0]);
  const comBranca = inserirBranca(listaOriginal(1), 0);
  assert.equal(girarItem(comBranca, 0, 90), comBranca);
});

test('duplicar põe a cópia logo depois; remover tira; inserir em branco respeita a posição', () => {
  const base = listaOriginal(3);
  assert.deepEqual(duplicarItem(base, 1).map((i) => i.origem), [0, 1, 1, 2]);
  assert.deepEqual(removerItem(base, 1).map((i) => i.origem), [0, 2]);
  assert.deepEqual(inserirBranca(base, 0).map((i) => i.tipo), ['branca', 'página', 'página', 'página']);
  assert.deepEqual(inserirBranca(base, 3).map((i) => i.tipo), ['página', 'página', 'página', 'branca']);
  assert.equal(inserirBranca(base, 4), base, 'posição fora da lista');
  assert.equal(removerItem(base, 9), base);
});

test('o limite de itens recusa duplicar e inserir em branco', () => {
  const cheia = Array.from({ length: LIMITE_DE_ITENS }, () => ({ tipo: 'branca' }));
  assert.equal(duplicarItem(cheia, 0), null);
  assert.equal(inserirBranca(cheia, 0), null);
  assert.equal(inserirBranca(cheia.slice(1), 0)?.length, LIMITE_DE_ITENS, 'um abaixo do limite ainda entra');
});

test('resumo da lista: alterada, giradas, brancas, cópias e páginas que ficaram de fora', () => {
  const base = listaOriginal(5);
  assert.deepEqual(resumoDaLista(base, 5), { páginas: 5, brancas: 0, giradas: 0, cópias: 0, removidas: 0, alterada: false });
  let itens = removerItem(base, 1);
  itens = girarItem(itens, 1, 90);
  itens = duplicarItem(itens, 0);
  itens = inserirBranca(itens, 1);
  assert.deepEqual(resumoDaLista(itens, 5), { páginas: 6, brancas: 1, giradas: 1, cópias: 1, removidas: 1, alterada: true });
  assert.equal(resumoDaLista(moverItem(base, 0, 1), 5).alterada, true, 'só a ordem mudou');
  assert.equal(resumoDaLista(moverItem(moverItem(base, 0, 1), 0, 1), 5).alterada, false, 'voltou ao original');
});

/* ------------------------------------------------------------------ gravar */

test('caso da pesquisa: eliminar p2, girar p3 em 90° e em branco após p1 dão [1, branco, 3 girada, 4, 5]', async () => {
  const aberto = await abrir(5);
  let itens = listaOriginal(5);
  itens = removerItem(itens, 1);          // eliminar a página 2
  itens = girarItem(itens, 1, 90);        // a página 3 virou a segunda
  itens = inserirBranca(itens, 1);        // em branco depois da página 1
  const r = await organizar(aberto, itens);
  assert.equal(r.páginas, 5);
  const origens = await origensDasPáginas(r.bytes);
  assert.equal(origens.length, 5);
  assert.deepEqual([origens[0], origens[2], origens[3], origens[4]], [1, 3, 4, 5]);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [0, 0, 90, 0, 0]);
  const branca = (await tamanhos(r.bytes))[1];
  assert.deepEqual([branca.width, branca.height], [101, 200], 'a página em branco copia o tamanho da anterior');
});

test('mover a última para a primeira: a saída começa pela página 5', async () => {
  const r = await organizar(await abrir(5), moverItem(listaOriginal(5), 4, 0));
  assert.deepEqual(await origensDasPáginas(r.bytes), [5, 1, 2, 3, 4]);
});

test('inverter a ordem de 6 páginas', async () => {
  const r = await organizar(await abrir(6), inverterOrdem(listaOriginal(6)));
  assert.deepEqual(await origensDasPáginas(r.bytes), [6, 5, 4, 3, 2, 1]);
});

test('lista sem mudança dá um PDF com as mesmas páginas na mesma ordem', async () => {
  const r = await organizar(await abrir(7), listaOriginal(7));
  assert.deepEqual(await origensDasPáginas(r.bytes), [1, 2, 3, 4, 5, 6, 7]);
});

test('duplicata girada não gira a página original (cada cópia é independente)', async () => {
  let itens = listaOriginal(3);
  itens = duplicarItem(itens, 0);          // 1, 1, 2, 3
  itens = girarItem(itens, 1, 90);         // só a cópia gira
  const r = await organizar(await abrir(3), itens);
  assert.deepEqual(await origensDasPáginas(r.bytes), [1, 1, 2, 3]);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [0, 90, 0, 0]);

  // Três ocorrências da mesma página, cada uma com o seu giro.
  let triplo = duplicarItem(duplicarItem(listaOriginal(1), 0), 0);
  triplo = girarItem(girarItem(triplo, 1, 90), 2, 180);
  const t = await organizar(await abrir(1), triplo);
  assert.deepEqual(await rotaçõesDasPáginas(t.bytes), [0, 90, 180]);
});

test('o giro soma à rotação que a página já tinha, inclusive a herdada da árvore', async () => {
  const aberto = await abrir(3, { rotações: { 1: 90, 3: 270 } });
  let itens = girarItem(girarItem(listaOriginal(3), 0, 90), 2, 180);
  const r = await organizar(aberto, itens);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [180, 0, 90]);

  const documento = await PDFDocument.create();
  documento.addPage([200, 300]);
  documento.catalog.Pages().set(PDFName.of('Rotate'), PDFNumber.of(90));
  const herdado = await abrirPdf({ nome: 'h.pdf', bytes: await documento.save({ useObjectStreams: false }) }, { biblioteca });
  const rh = await organizar(herdado, girarItem(listaOriginal(1), 0, 90));
  assert.deepEqual(await rotaçõesDasPáginas(rh.bytes), [180]);
  const sem = await organizar(herdado, listaOriginal(1));
  assert.deepEqual(await rotaçõesDasPáginas(sem.bytes), [90], 'sem giro, a rotação herdada continua valendo na cópia');
});

test('página em branco do começo copia a seguinte e respeita o giro dela; sem página nenhuma, A4', async () => {
  const aberto = await abrir(2);
  const medidas = medirPáginas(aberto.documento);
  let itens = girarItem(listaOriginal(2), 0, 90);
  itens = inserirBranca(itens, 0);
  const [l, a] = tamanhoDaBranca(itens, 0, medidas);
  assert.deepEqual([l, a], [200, 101], 'a vizinha girada aparece deitada');
  assert.deepEqual(tamanhoDaBranca([{ tipo: 'branca' }], 0, medidas), [595.28, 841.89]);
  const r = await organizar(aberto, itens);
  const t = (await tamanhos(r.bytes))[0];
  assert.deepEqual([Math.round(t.width), Math.round(t.height)], [200, 101]);
});

test('lista vazia ou inválida é recusada; o original aberto não muda', async () => {
  const aberto = await abrir(3);
  const vazia = await organizarPdf(aberto, [], { biblioteca });
  assert.equal(vazia.ok, false);
  assert.match(vazia.mensagem, /pelo menos uma página/);
  assert.equal((await organizarPdf(aberto, [{ tipo: 'página', origem: 7, giro: 0 }], { biblioteca })).ok, false);
  assert.equal((await organizarPdf(aberto, [{ tipo: 'página', origem: -1, giro: 0 }], { biblioteca })).ok, false);
  assert.equal((await organizarPdf(aberto, null, { biblioteca })).ok, false);
  await organizar(aberto, [{ tipo: 'página', origem: 2, giro: 90 }]);
  assert.equal(aberto.documento.getPageCount(), 3);
  assert.deepEqual(await rotaçõesDasPáginas(await aberto.documento.save()), [0, 0, 0]);
});

test('propriedade: o PDF de saída tem tantas páginas quanto a lista, e as páginas originais saem na ordem da lista', async () => {
  const aberto = await abrir(8);
  let itens = listaOriginal(8);
  itens = moverItem(itens, 7, 2);
  itens = removerItem(itens, 4);
  itens = duplicarItem(itens, 0);
  itens = girarItem(itens, 3, 270);
  const r = await organizar(aberto, itens);
  const origens = await origensDasPáginas(r.bytes);
  assert.equal(origens.length, itens.length);
  assert.deepEqual(origens, itens.map((i) => i.origem + 1));
});

/* ---------------------------------------------------------------- descrição */

test('descreverPágina: formato, orientação e rotação', () => {
  assert.equal(descreverPágina(595.28, 841.89), 'A4 · retrato');
  assert.equal(descreverPágina(841.89, 595.28), 'A4 · paisagem');
  assert.equal(descreverPágina(595, 842, 90), 'A4 · paisagem', 'retrato com /Rotate 90 aparece deitada');
  assert.equal(descreverPágina(595, 842, 270), 'A4 · paisagem');
  assert.equal(descreverPágina(595, 842, 180), 'A4 · retrato');
  assert.equal(descreverPágina(612, 792), 'Carta · retrato');
  assert.equal(descreverPágina(612, 1008), 'Ofício · retrato');
  assert.equal(descreverPágina(200, 200), '7,1 × 7,1 cm · quadrada');
  assert.equal(descreverPágina(101, 200), '3,6 × 7,1 cm · retrato');
  assert.equal(descreverPágina(300, 150, 45), '10,6 × 5,3 cm · paisagem', 'rotação inválida conta como zero');
});

/* ------------------------------------------------------------------ catálogo */

test('a ficha do catálogo promete só o que a ferramenta entrega, sem miniaturas', () => {
  const ficha = ferramentaPorSlug['organizar-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.doesNotMatch(`${ficha.resumo} ${ficha.entra}`, /miniatura|arrast/i, 'não promete o que não existe');
  assert.doesNotMatch(ficha.processa, /PDF\.js/i);
  assert.match(ficha.processa, /Não há miniaturas/);
  assert.match(ficha.processa, /não sai do aparelho/);
});

test('"Como usar" está completo e o exemplo bate com a conta', async () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 3 && exemplo.texto && limites && perguntas.length >= 3);
  assert.match(limites, /100 MB/);
  assert.match(limites, /500 páginas/);
  // Exemplo: tira a página 2, gira a 3, leva a capa (5) para a posição 1 → 5, 1, 3 (girada), 4.
  let itens = removerItem(listaOriginal(5), 1);
  itens = girarItem(itens, 1, 90);
  itens = moverItem(itens, 3, 0);
  const r = await organizar(await abrir(5), itens);
  assert.deepEqual(await origensDasPáginas(r.bytes), [5, 1, 3, 4]);
  assert.deepEqual(await rotaçõesDasPáginas(r.bytes), [0, 0, 90, 0]);
});
