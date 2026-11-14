import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, inflateSync } from 'node:zlib';
import { biblioteca } from './auxiliares/pdf-de-teste.mjs';
import { calcularCrc32 } from '../scripts/comum/exportação/calcular-crc32.js';
import {
  extrairImagensDoPdf, LIMITE_DE_PIXELS_POR_IMAGEM, LIMITE_DE_PÁGINAS, LIMITE_DE_IMAGENS,
  TAMANHO_MÁXIMO_PDF, obterObjetoPdfjs,
} from '../scripts/cálculos/extrair-imagens-do-pdf.js';
import { pngEstáÍntegro } from '../scripts/cálculos/imagens-em-pdf.js';

function pngChunk(tipo, dados) {
  const nome = new TextEncoder().encode(tipo);
  const saída = new Uint8Array(12 + dados.length);
  const visão = new DataView(saída.buffer);
  visão.setUint32(0, dados.length); saída.set(nome, 4); saída.set(dados, 8);
  visão.setUint32(8 + dados.length, calcularCrc32(saída.subarray(4, 8 + dados.length)));
  return saída;
}
function fixturePngRGBA(largura, altura, pixels) {
  const ihdr = new Uint8Array(13), visão = new DataView(ihdr.buffer);
  visão.setUint32(0, largura); visão.setUint32(4, altura); ihdr[8] = 8; ihdr[9] = 6;
  const partes = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(Uint8Array.from([0, ...pixels]))), pngChunk('IEND', new Uint8Array())];
  const bytes = new Uint8Array(partes.reduce((n, parte) => n + parte.length, 0));
  let posição = 0; for (const parte of partes) { bytes.set(parte, posição); posição += parte.length; }
  return bytes;
}
function pngPixels(bytes) {
  assert.equal(awaitableSignature(bytes), true);
  let posição = 8, comprimido = [];
  while (posição < bytes.length) {
    const visão = new DataView(bytes.buffer, bytes.byteOffset + posição, bytes.byteLength - posição);
    const tamanho = visão.getUint32(0), tipo = new TextDecoder().decode(bytes.subarray(posição + 4, posição + 8));
    if (tipo === 'IDAT') comprimido.push(bytes.subarray(posição + 8, posição + 8 + tamanho));
    posição += 12 + tamanho;
    if (tipo === 'IEND') break;
  }
  const dados = Buffer.concat(comprimido.map(Buffer.from));
  return [...inflateSync(dados).subarray(1)];
}
function awaitableSignature(bytes) { return bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71; }
const arquivoValido = bytes => ({ nome: 'amostras.pdf', bytes: Uint8Array.from([37, 80, 68, 70, ...bytes]) });
function leitorFalso({ paginas = 1, operações = [[]], imagens = {}, imageKind = { RGB_24BPP: 2, RGBA_32BPP: 3, GRAYSCALE_1BPP: 1 }, obterImagem } = {}) {
  const chamadas = [];
  return {
    chamadas,
    abrir: async () => ({
      paginas,
      imageKind,
      operadores: { paintImageXObject: 85, paintInlineImageXObject: 86, paintImageXObjectRepeat: 88, paintInlineImageXObjectGroup: 87, paintImageMaskXObject: 83, paintImageMaskXObjectGroup: 84, paintImageMaskXObjectRepeat: 89 },
      async operadoresDaPagina(numero) {
        chamadas.push(numero);
        const operaçõesPagina = operações[numero - 1] ?? [];
        return { lista: { fnArray: operaçõesPagina.map(op => op.codigo), argsArray: operaçõesPagina.map(op => op.args) }, obterImagem: async id => obterImagem ? obterImagem(id) : imagens[id] };
      },
      async limparPagina() {}, async fechar() { chamadas.push('fechar'); },
    }),
  };
}

/* Exercita objetos e pixels do PDF.js local, não um substituto de imagem inventado pelo teste. */
test('extrai pixels PNG com transparência e consolida um mesmo objeto usado em páginas diferentes', async () => {
  const png = fixturePngRGBA(2, 1, [255, 0, 0, 255, 0, 0, 255, 128]);
  const documento = await biblioteca.PDFDocument.create();
  const imagem = await documento.embedPng(png);
  documento.addPage([200, 200]).drawImage(imagem, { x: 10, y: 10, width: 50, height: 25 });
  documento.getPage(0).drawImage(imagem, { x: 80, y: 10, width: 50, height: 25 });
  documento.addPage([200, 200]).drawImage(imagem, { x: 20, y: 20, width: 25, height: 12 });

  const resultado = await extrairImagensDoPdf({ nome: 'relatorio.pdf', bytes: await documento.save() });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.imagens.length, 1);
  assert.equal(resultado.ocorrencias, 3);
  assert.deepEqual(resultado.imagens[0].paginas, [1, 2]);
  assert.equal(resultado.imagens[0].largura, 2);
  assert.equal(resultado.imagens[0].altura, 1);
  assert.equal(await pngEstáÍntegro(resultado.imagens[0].bytes), true);
  assert.deepEqual(pngPixels(resultado.imagens[0].bytes), [255, 0, 0, 255, 0, 0, 255, 128]);
});

test('normaliza RGB e imagem monocromática em PNG RGBA válido', async () => {
  const rgb = leitorFalso({ operações: [[{ codigo: 85, args: ['rgb'] }]], imagens: { rgb: { width: 1, height: 1, kind: 2, data: Uint8Array.of(8, 20, 40) } } });
  const r = await extrairImagensDoPdf(arquivoValido([]), { abrir: rgb.abrir });
  assert.equal(r.ok, true);
  assert.deepEqual(pngPixels(r.imagens[0].bytes), [8, 20, 40, 255]);
  const gray = leitorFalso({ operações: [[{ codigo: 86, args: [{ width: 2, height: 1, kind: 1, data: Uint8Array.of(0b10000000) }] }]] });
  const g = await extrairImagensDoPdf(arquivoValido([]), { abrir: gray.abrir });
  assert.equal(g.ok, true);
  assert.deepEqual(pngPixels(g.imagens[0].bytes), [255, 255, 255, 255, 0, 0, 0, 255]);
});

test('consolida operador Repeat e recusa arquivo sem imagens sem entregar ZIP vazio', async () => {
  const leitor = leitorFalso({
    operações: [[{ codigo: 88, args: ['a', 1, 1, [0, 0, 20, 20]] }]],
    imagens: { a: { width: 1, height: 1, kind: 2, data: Uint8Array.of(255, 0, 0) } },
  });
  const r = await extrairImagensDoPdf(arquivoValido([]), { abrir: leitor.abrir });
  assert.equal(r.ok, true); assert.equal(r.ocorrencias, 2); assert.equal(r.imagens.length, 1);
  const vazio = leitorFalso();
  const semImagem = await extrairImagensDoPdf(arquivoValido([]), { abrir: vazio.abrir });
  assert.equal(semImagem.ok, false); assert.equal(semImagem.erro, 'sem_imagens');
});

test('recorta cada subimagem de um atlas InlineImageXObjectGroup pelos pixels correspondentes', async () => {
  const atlas = { width: 2, height: 1, kind: 2, data: Uint8Array.of(255, 0, 0, 0, 0, 255) };
  const leitor = leitorFalso({ operações: [[{ codigo: 87, args: [atlas, [
    { x: 0, y: 0, w: 1, h: 1, transform: [1, 0, 0, 1, 0, 0] },
    { x: 1, y: 0, w: 1, h: 1, transform: [1, 0, 0, 1, 1, 0] },
  ]] }]] });
  const r = await extrairImagensDoPdf(arquivoValido([]), { abrir: leitor.abrir });
  assert.equal(r.ok, true); assert.equal(r.imagens.length, 2); assert.equal(r.ocorrencias, 2);
  assert.deepEqual(pngPixels(r.imagens[0].bytes), [255, 0, 0, 255]);
  assert.deepEqual(pngPixels(r.imagens[1].bytes), [0, 0, 255, 255]);
});

test('objeto de imagem pendente responde ao cancelamento e expira após cinco segundos', async () => {
  const cachePendente = { has: () => false, get: () => {} };
  const inicio = Date.now();
  let cancelado = false;
  const cancelamento = setTimeout(() => { cancelado = true; }, 60);
  await assert.rejects(obterObjetoPdfjs(cachePendente, 'pendente', cachePendente, () => cancelado), erro => erro.name === 'AbortError');
  clearTimeout(cancelamento);
  assert.ok(Date.now() - inicio < 1000);

  const começoTimeout = Date.now();
  await assert.rejects(obterObjetoPdfjs(cachePendente, 'pendente', cachePendente), erro => erro.name === 'ObjetoImagemTimeout');
  assert.ok(Date.now() - começoTimeout >= 4900);
});

test('recusa limites de entrada, páginas, dimensões, quantidade, saída e cancelamento', async () => {
  const enorme = new Uint8Array(TAMANHO_MÁXIMO_PDF + 1); enorme.set([37, 80, 68, 70]);
  assert.equal((await extrairImagensDoPdf({ nome: 'grande.pdf', bytes: enorme })).erro, 'arquivo_grande');
  const maisPaginas = leitorFalso({ paginas: LIMITE_DE_PÁGINAS + 1 });
  assert.equal((await extrairImagensDoPdf(arquivoValido([]), { abrir: maisPaginas.abrir })).erro, 'paginas_demais');
  const grande = leitorFalso({ operações: [[{ codigo: 85, args: ['x'] }]], imagens: { x: { width: LIMITE_DE_PIXELS_POR_IMAGEM + 1, height: 1, kind: 2, data: new Uint8Array() } } });
  assert.equal((await extrairImagensDoPdf(arquivoValido([]), { abrir: grande.abrir })).erro, 'imagem_grande');
  const ids = Array.from({ length: LIMITE_DE_IMAGENS + 1 }, (_, i) => 'img' + i);
  const muitasUnicas = leitorFalso({
    operações: [ids.map(id => ({ codigo: 85, args: [id] }))],
    imagens: Object.fromEntries(ids.map((id, i) => [id, { width: 1, height: 1, kind: 2, data: Uint8Array.of(i, i >> 1, i >> 2) }])),
  });
  assert.equal((await extrairImagensDoPdf(arquivoValido([]), { abrir: muitasUnicas.abrir })).erro, 'imagens_demais');
  const uma = leitorFalso({ operações: [[{ codigo: 85, args: ['x'] }]], imagens: { x: { width: 1, height: 1, kind: 2, data: Uint8Array.of(1, 2, 3) } } });
  assert.equal((await extrairImagensDoPdf(arquivoValido([]), { abrir: uma.abrir, limiteDeSaída: 10 })).erro, 'saida_grande');
  assert.equal((await extrairImagensDoPdf(arquivoValido([]), { abrir: uma.abrir, cancelado: () => true })).erro, 'cancelado');
});
