import { test } from 'node:test';
import assert from 'node:assert/strict';

import { PDFDocument, PDFName } from '../recursos/pdf-lib.esm.min.js';
import * as pdfjs from '../recursos/pdfjs/pdf.mjs';
import { montarDocumentoPdf } from '../scripts/comum/documentos/montar-documento-pdf.js';
import { criarDocumentoPdf } from '../scripts/comum/pdf/criar-documento-pdf.js';
import { normalizarCorPdf, paletaPDF } from '../scripts/comum/pdf/identidade-visual.js';
import { jpeg } from './auxiliares/imagens-de-teste.mjs';
import { conteúdoDaPágina, textosDaPágina } from './auxiliares/pdf-de-teste.mjs';
import { medirTextoHelvetica } from '../scripts/comum/pdf/medir-texto-helvetica.js';

async function abrirPdfjs(bytes) {
  const tarefa = pdfjs.getDocument({ data: bytes.slice(), useWasm: false, verbosity: 0, disableFontFace: true });
  try { return { documento: await tarefa.promise, tarefa }; }
  catch (erro) { await tarefa.destroy(); throw erro; }
}

function textos(pdf, índice) {
  return textosDaPágina(pdf, índice).map((texto) => texto.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8))));
}

test('paleta documental rejeita valores que poderiam injetar operadores PDF', () => {
  assert.equal(normalizarCorPdf('#A8472A'), '#a8472a');
  assert.equal(normalizarCorPdf('1 0 rg'), paletaPDF.tinta);
  assert.equal(normalizarCorPdf('red', '#123456'), '#123456');
  assert.deepEqual(Object.keys(paletaPDF), ['fundo', 'papel', 'tinta', 'suave', 'borda', 'marca', 'marcaFraca', 'ok']);
});

test('JPEG é preservado como XObject DCTDecode e o PDF abre no pdf-lib e no pdf.js', async () => {
  const imagem = jpeg(3, 2);
  const pdf = criarDocumentoPdf({ título: 'Logo' });
  pdf.imagemJpeg(10, 12, 18, 12, imagem, { larguraPixels: 3, alturaPixels: 2 });
  const bytes = pdf.gerarBytes();
  const reaberto = await PDFDocument.load(bytes);
  assert.equal(reaberto.getPageCount(), 1);
  const recursos = reaberto.getPage(0).node.Resources();
  const objetos = recursos.lookup(PDFName.of('XObject'));
  const imagemNoPdf = reaberto.context.lookup(objetos.get(PDFName.of('Im1')));
  assert.equal(String(imagemNoPdf.dict.get(PDFName.of('Filter'))), '/DCTDecode');
  assert.equal(imagemNoPdf.dict.get(PDFName.of('Width')).asNumber(), 3);
  assert.equal(imagemNoPdf.dict.get(PDFName.of('Height')).asNumber(), 2);
  assert.deepEqual(Array.from(imagemNoPdf.contents), Array.from(imagem));
  const lidoPeloPdfjs = await abrirPdfjs(bytes);
  assert.equal(lidoPeloPdfjs.documento.numPages, 1);
  await lidoPeloPdfjs.tarefa.destroy();
});

test('JPEG rejeita bytes malformados, dimensões falsas e caixas inválidas', () => {
  const pdf = criarDocumentoPdf();
  assert.throws(() => pdf.imagemJpeg(0, 0, 10, 10, new Uint8Array([1, 2]), { larguraPixels: 1, alturaPixels: 1 }), /JPEG válido/);
  assert.throws(() => pdf.imagemJpeg(0, 0, 10, 10, jpeg(3, 2), { larguraPixels: 2, alturaPixels: 3 }), /dimensões/);
  assert.throws(() => pdf.imagemJpeg(0, 0, -1, 10, jpeg(3, 2), { larguraPixels: 3, alturaPixels: 2 }), /posição e o tamanho/);
});

test('campos, assinaturas e textos longos paginam sem perder conteúdo; rodapés e marca reaparecem', async () => {
  const palavras = Array.from({ length: 400 }, (_, i) => `trecho${String(i).padStart(3, '0')}`).join(' ');
  const documento = montarDocumentoPdf({
    título: 'Documento comercial extenso', subtítulo: 'Descricao longa para verificar a quebra visual',
    marca: 'Atelie Exemplo', corMarca: '#a8472a',
  });
  documento.campo('Observação do cliente', palavras);
  documento.parágrafo(palavras, { tamanho: 10 });
  documento.assinatura(`Responsável legal ${palavras}`);
  const bytes = documento.gerarBytes();
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 3, 'conteúdo longo deve criar novas páginas');
  for (let índice = 0; índice < pdf.getPageCount(); índice += 1) {
    const páginaTexto = textos(pdf, índice).join(' ');
    assert.match(páginaTexto, /Atelie Exemplo/);
    assert.match(páginaTexto, new RegExp(`P[0-7]{3}gina ${índice + 1}`));
  }
  const todosTextos = Array.from({ length: pdf.getPageCount() }, (_, i) => textos(pdf, i).join(' ')).join(' ');
  for (const token of ['trecho000', 'trecho200', 'trecho399']) assert.ok(todosTextos.includes(token), `faltou ${token}`);
  const lidoPeloPdfjs = await abrirPdfjs(bytes);
  assert.equal(lidoPeloPdfjs.documento.numPages, pdf.getPageCount());
  await lidoPeloPdfjs.tarefa.destroy();
});

test('tabelas quebram célula longa e repetem o cabeçalho em todas as páginas', async () => {
  const textoLongo = Array.from({ length: 900 }, (_, i) => `produto${i}`).join(' ');
  const documento = montarDocumentoPdf({ título: 'Tabela paginada', marca: 'Casa da Serra' });
  documento.tabela(['Descricao do item', 'Quantidade', 'Valor total'], [
    [textoLongo, '12 unidades', 'R$ 2.340,00'],
    ['Item final', '1', 'R$ 10,00'],
  ], [58, 17, 25]);
  const bytes = documento.gerarBytes();
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 2);
  for (let índice = 0; índice < pdf.getPageCount(); índice += 1) {
    const textos = textosDaPágina(pdf, índice).join(' ');
    assert.match(textos, /Descricao do item/);
    assert.match(textos, /Quantidade/);
    assert.match(textos, /Valor total/);
  }
  const todosTextos = Array.from({ length: pdf.getPageCount() }, (_, i) => textos(pdf, i).join(' ')).join(' ');
  assert.ok(todosTextos.includes('produto0') && todosTextos.includes('produto899'));
  assert.ok(todosTextos.includes('R$ 2.340,00'));
});

test('logo reservado no cabeçalho e destaque principal permanecem vetoriais e imprimíveis', async () => {
  const bytesLogo = jpeg(40, 20);
  const documento = montarDocumentoPdf({
    título: 'Orcamento', subtítulo: 'Servicos profissionais', marca: 'Oficina Aurora',
    corMarca: '#9d4528', logo: { bytes: bytesLogo, largura: 40, altura: 20 },
  });
  documento.destaque('Total do orcamento', 'R$ 8.450,00');
  const bytes = documento.gerarBytes();
  const pdf = await PDFDocument.load(bytes);
  const conteúdo = textos(pdf, 0).join(' ');
  assert.match(conteúdo, /Oficina Aurora/);
  assert.match(conteúdo, /Total do orcamento/);
  assert.match(conteúdo, /R\$ 8\.450,00/);
  const recursos = pdf.getPage(0).node.Resources().lookup(PDFName.of('XObject'));
  assert.ok(recursos?.get(PDFName.of('Im1')));
  const parsed = await abrirPdfjs(bytes);
  assert.equal(parsed.documento.numPages, 1);
  await parsed.tarefa.destroy();
});

test('logo à direita não sobrepõe título ou marca; marcas longas não invadem o rodapé', async () => {
  const marca = 'Empresa '.repeat(15);
  const título = 'Monthly service proposal with comprehensive project assumptions';
  const documento = montarDocumentoPdf({
    título, subtítulo: 'A detailed service and delivery plan', marca,
    logo: { bytes: jpeg(40, 20), largura: 40, altura: 20 },
  });
  const pdf = await PDFDocument.load(documento.gerarBytes());
  const conteúdo = conteúdoDaPágina(pdf, 0);
  const pontosPorMm = 72 / 25.4;
  const logo = /q ([\d.]+) 0 0 ([\d.]+) ([\d.]+) ([\d.]+) cm \/Im1 Do Q/.exec(conteúdo);
  assert.ok(logo);
  const logoX = Number(logo[3]) / pontosPorMm;
  const logoY = 297 - (Number(logo[4]) + Number(logo[2])) / pontosPorMm;
  assert.ok(Math.abs(logoX - 173) < 0.01);
  assert.ok(Math.abs(logoY - 8) < 0.01);

  const títulos = [...conteúdo.matchAll(/BT \/F2 15 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \((.*?)\) Tj ET/g)];
  assert.ok(títulos.length >= 1 && títulos.length <= 2);
  for (const [, x, , linha] of títulos) {
    const direita = Number(x) / pontosPorMm + medirTextoHelvetica(linha, 15, true) / pontosPorMm;
    assert.ok(direita < logoX - 5, `linha do título termina em ${direita} mm, antes do logo em ${logoX} mm`);
  }
  assert.ok(títulos.map(([, , , linha]) => linha).join(' ').includes('project'));

  const linhasMarca = [...conteúdo.matchAll(/BT \/F2 8\.5 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \((.*?)\) Tj ET/g)];
  assert.equal(linhasMarca.length, 2);
  for (const [, x, , linha] of linhasMarca) {
    const direita = Number(x) / pontosPorMm + medirTextoHelvetica(linha, 8.5, true) / pontosPorMm;
    assert.ok(direita < logoX - 5, 'marca longa fica no espaço anterior à coluna do logo');
  }

  const marcaComReticências = /BT \/F1 7\.5 Tf [^\n]*? Td \((.*?)\) Tj ET/.exec(conteúdo)?.[1];
  assert.ok(marcaComReticências?.endsWith('...'));
  assert.ok(medirTextoHelvetica(marcaComReticências, 7.5, false) / pontosPorMm <= 100);
  const rodapéEsquerdo = /BT \/F1 7\.5 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \((.*?)\) Tj ET/.exec(conteúdo);
  const rodapéDireito = [...conteúdo.matchAll(/BT \/F1 7\.5 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \(P\\341gina/g)].at(-1);
  assert.ok(rodapéEsquerdo && rodapéDireito);
  const direitaMarca = Number(rodapéEsquerdo[1]) / pontosPorMm + medirTextoHelvetica(marcaComReticências, 7.5, false) / pontosPorMm;
  assert.ok(direitaMarca < Number(rodapéDireito[1]) / pontosPorMm);
});

test('marca clara mantém contraste no texto e personaliza os fundos suaves', async () => {
  const documento = montarDocumentoPdf({ título: 'Orcamento', corMarca: '#ffff00' });
  documento.seção('Resumo');
  documento.tabela(['Item', 'Valor'], [['Servico', 'R$ 15,00']], [65, 35]);
  documento.destaque('Total', 'R$ 15,00');
  const pdf = await PDFDocument.load(documento.gerarBytes());
  const conteúdo = conteúdoDaPágina(pdf, 0);
  assert.match(conteúdo, /0\.161 0\.145 0\.129 rg/); // texto da marca usa tinta segura
  assert.match(conteúdo, /1 1 0 rg/); // faixa de acento preserva o amarelo escolhido
  assert.match(conteúdo, /1 0\.992 0\.878 rg/); // fundo suave deriva da marca e do papel
});

test('destaque grande empilha rótulo e valor; divisórias de tabela não cruzam a próxima linha', async () => {
  const documento = montarDocumentoPdf({ título: 'Recibo' });
  documento.destaque('Valor recebido', 'R$ 1.234,56', { grande: true });
  documento.tabela(['Descrição', 'Valor'], [['Primeiro item', 'R$ 20,00'], ['Segundo item', 'R$ 30,00']], [70, 30]);
  const pdf = await PDFDocument.load(documento.gerarBytes());
  const conteúdo = conteúdoDaPágina(pdf, 0);
  const rótulo = /BT \/F2 9 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \(Valor recebido\) Tj ET/.exec(conteúdo);
  const valor = /BT \/F2 24 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \(R\$ 1\.234,56\) Tj ET/.exec(conteúdo);
  assert.ok(rótulo && valor);
  assert.ok(Math.abs(Number(rótulo[1]) - Number(valor[1])) < 0.001, 'rótulo e valor ficam alinhados à esquerda');
  assert.ok(Number(rótulo[2]) > Number(valor[2]), 'o valor aparece abaixo do rótulo');

  const linhaSeguinte = /BT \/F1 8\.6 Tf [^\n]*? ([-\d.]+) ([-\d.]+) Td \(Segundo item\) Tj ET/.exec(conteúdo);
  assert.ok(linhaSeguinte);
  const divisas = [...conteúdo.matchAll(/([-\d.]+) ([-\d.]+) m ([-\d.]+) ([-\d.]+) l S Q/g)];
  const yLinhaSeguinte = Number(linhaSeguinte[2]);
  const divisorAcima = divisas.map(([, , y]) => Number(y)).find((y) => y > yLinhaSeguinte && y - yLinhaSeguinte < 20);
  assert.ok(divisorAcima && divisorAcima - yLinhaSeguinte > 6, 'há espaço vertical entre a régua e os glifos seguintes');
});
