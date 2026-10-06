/**
 * Testes de Ocultar informações do PDF.
 *
 * O PROVA que importa: depois de ocultar, o texto não está mais NO ARQUIVO. Não basta o leitor de
 * PDF não achar o texto: o arquivo de saída é aberto aqui, cada fluxo é descomprimido e o texto
 * procurado em todas as formas em que um PDF pode guardá-lo (literal, hexadecimal em WinAnsi e
 * hexadecimal em UTF-16, que é como o título e o autor ficam). O mesmo conferente é rodado no
 * ORIGINAL para provar que ele enxerga o texto quando ele existe (sem isso, "não achou" seria
 * um teste que não pode falhar).
 *
 * O Node não tem canvas: o desenho da página com a tarja é falso (devolve um JPEG de cabeçalho
 * válido), e o pdf.js de verdade lê o texto. O desenho de verdade é conferido no navegador
 * (testes/navegador/pdf-ocultar.teste.mjs): ali a página é desenhada, a tarja pintada e o PDF
 * gerado é aberto de novo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';

import { pdfDeTeste, pdfProtegido, biblioteca, perto } from './auxiliares/pdf-de-teste.mjs';
import { png, jpeg } from './auxiliares/imagens-de-teste.mjs';
import {
  ocultarInformações, procurarNoPdf, acharNaPágina, retângulosDoTrecho, textoCorridoDaPágina, termosDe,
  validarCpf, validarCnpj, passaNoLuhn, mensagemDeErroDeOcultação,
  LIMITE_DE_PÁGINAS_OCULTADAS, LIMITE_DE_TERMOS, LIMITE_DO_TERMO, LIMITE_DE_ACHADOS, DPIS, FOLGA_MÍNIMA, CORES_DA_TARJA,
} from '../scripts/cálculos/ocultar-informacoes-do-pdf.js';
import { TAMANHO_MÁXIMO_POR_ARQUIVO } from '../scripts/cálculos/pdf.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import ferramenta from '../scripts/ferramentas/ocultar-informacoes-do-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const {
  PDFDocument, PDFName, PDFRawStream, PDFString, StandardFonts, decodePDFRawStream, degrees,
} = biblioteca;

const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };

const CPF_VÁLIDO = '529.982.247-25';
const CPF_FALSO = '123.456.789-00';

/* ------------------------------------------------------- apoio */

/**
 * PDF de teste (como "numeradas-3" da pesquisa): em cada página, um nome, "PALAVRA-SECRETA-123",
 * os dois CPFs (um de verdade e o fictício inválido), e-mail e telefone. Metadados, campo de
 * formulário e comentário (anotação) também levam a palavra secreta ou nomes próprios.
 */
async function pdfSecreto({ páginas = 3, secretaEm = [1, 2, 3], rotações = [] } = {}) {
  const documento = await PDFDocument.create();
  documento.setTitle('Documento de teste');
  documento.setAuthor('Autora Secreta');
  documento.setSubject('Assunto confidencial');
  documento.setKeywords(['chave-oculta']);
  const fonte = await documento.embedFont(StandardFonts.Helvetica);
  const form = documento.getForm();
  for (let i = 1; i <= páginas; i++) {
    const página = documento.addPage([595.28, 841.89]);
    página.drawText(`Original ${i}`, { x: 50, y: 780, size: 18, font: fonte });
    página.drawText('Cliente: Maria Souza Santos', { x: 50, y: 740, size: 12, font: fonte });
    if (secretaEm.includes(i)) página.drawText('Codigo PALAVRA-SECRETA-123 do contrato', { x: 50, y: 700, size: 12, font: fonte });
    página.drawText(`CPF ${CPF_VÁLIDO} e CPF falso ${CPF_FALSO}`, { x: 50, y: 660, size: 12, font: fonte });
    página.drawText('Contato maria@exemplo.com.br ou (11) 91234-5678', { x: 50, y: 620, size: 12, font: fonte });
    if (rotações[i - 1]) página.setRotation(degrees(rotações[i - 1]));
  }
  // Campo de formulário com o segredo e um comentário no PDF: dois lugares onde "tarja" nenhuma chega.
  const campo = form.createTextField('anotacao');
  campo.setText('PALAVRA-SECRETA-123 no formulario');
  campo.addToPage(documento.getPage(0), { x: 50, y: 560, width: 300, height: 20 });
  const comentário = documento.context.register(documento.context.obj({
    Type: 'Annot', Subtype: 'Text', Rect: [400, 700, 420, 720], Contents: PDFString.of('comentario PALAVRA-SECRETA-123'), T: PDFString.of('Autora Secreta'),
  }));
  documento.getPage(páginas > 1 ? 1 : 0).node.addAnnot(comentário);
  return documento.save();
}

/** Cria o leitor com o pdf.js de verdade e um desenho falso; registra o que foi pedido ao desenho. */
function leitorFalso({ falhaNaPágina, textoNaReleitura } = {}) {
  const pedidos = [];
  let aberturas = 0;
  const abrir = async (bytes) => {
    aberturas++;
    const d = await abrirComPdfjsParaTexto(bytes);
    const releitura = aberturas > 1;
    return {
      ...d,
      async texto(n) {
        if (releitura && textoNaReleitura) return { itens: [{ str: textoNaReleitura, ox: 0, oy: 10, ux: 5, uy: 0, vx: 0, vy: -10 }] };
        return d.texto(n);
      },
      async desenharComTarjas(n, medida, tarjas, cor, formato, qualidade) {
        if (falhaNaPágina === n) throw new Error('canvas quebrou');
        pedidos.push({ n, medida, tarjas, cor, formato: formato.tipo, qualidade });
        return jpeg(medida.largura, medida.altura);
      },
    };
  };
  return { abrir, pedidos };
}

/** Todo o conteúdo de um PDF em formas pesquisáveis: o arquivo cru, cada fluxo descomprimido e cada objeto escrito. */
async function conteúdoDoArquivo(bytes) {
  const partes = [new TextDecoder('latin1').decode(bytes)];
  const documento = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: false });
  for (const [, objeto] of documento.context.enumerateIndirectObjects()) {
    if (objeto instanceof PDFRawStream) {
      let dados = objeto.contents;
      try { dados = decodePDFRawStream(objeto).decode(); } catch { try { dados = inflateSync(objeto.contents); } catch { /* imagem ou outro filtro */ } }
      partes.push(new TextDecoder('latin1').decode(dados), String(objeto.dict));
    } else {
      partes.push(String(objeto));
    }
  }
  return partes.join('\n');
}

const hex = (texto, utf16 = false) => (utf16
  ? Buffer.from(`﻿${texto}`, 'utf16le').swap16().toString('hex')
  : Buffer.from(texto, 'latin1').toString('hex')).toUpperCase();

/** O texto aparece no arquivo de qualquer forma? Literal, hexadecimal WinAnsi ou hexadecimal UTF-16. */
async function temRastro(bytes, texto) {
  const tudo = await conteúdoDoArquivo(bytes);
  const maiúsculo = tudo.toUpperCase();
  return tudo.includes(texto) || maiúsculo.includes(hex(texto)) || maiúsculo.includes(hex(texto, true).slice(4)) || maiúsculo.includes(hex(texto, true));
}

async function textoVisível(bytes, página) {
  const aberto = await abrirComPdfjsParaTexto(bytes);
  try {
    return (await aberto.texto(página)).itens.map((i) => i.str).join(' ');
  } finally {
    await aberto.fechar();
  }
}

const ocultar = (bytes, opções, leitor = leitorFalso()) => ocultarInformações({ nome: 'Contrato.pdf', bytes }, { abrir: leitor.abrir, biblioteca, ...opções });
const procurar = (bytes, opções, leitor = leitorFalso()) => procurarNoPdf({ nome: 'Contrato.pdf', bytes }, { abrir: leitor.abrir, ...opções });

/** Retângulos de todos os achados de uma busca, no formato que `ocultarInformações` pede. */
const retângulosDe = (achados) => achados.flatMap((a) => a.retângulos.map((r) => ({ página: a.página, ...r })));

/* ------------------------------ a prova: o texto sumiu do arquivo */

test('o conferente enxerga o segredo, o autor e o título no ORIGINAL (sem isso, "não achou" não prova nada)', async () => {
  const original = await pdfSecreto();
  for (const rastro of ['PALAVRA-SECRETA-123', 'SECRETA', 'Maria Souza', 'Autora Secreta', 'Documento de teste', 'Assunto confidencial', 'chave-oculta', 'comentario']) {
    assert.equal(await temRastro(original, rastro), true, `deveria achar "${rastro}" no original`);
  }
  assert.match(await textoVisível(original, 1), /PALAVRA-SECRETA-123/);
});

test('PROVA: ocultar "PALAVRA-SECRETA-123" nas 3 páginas deixa o arquivo sem o texto, sem metadados, sem campos e sem comentários', async () => {
  const original = await pdfSecreto();
  const busca = await procurar(original, { termos: ['PALAVRA-SECRETA-123'] });
  assert.equal(busca.ok, true);
  assert.deepEqual(busca.achados.map((a) => a.página), [1, 2, 3]);
  const r = await ocultar(original, { retângulos: retângulosDe(busca.achados) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.ocultadas, [1, 2, 3]);
  assert.deepEqual(r.copiadas, []);

  // O leitor de PDF não acha letra nenhuma em página nenhuma.
  for (let p = 1; p <= 3; p++) assert.equal((await textoVisível(r.bytes, p)).trim(), '', `a página ${p} não pode ter texto`);
  // E o arquivo, esmiuçado fluxo a fluxo, não tem o segredo nem nada do que estava escrito.
  for (const rastro of ['PALAVRA-SECRETA-123', 'PALAVRA', 'SECRETA', 'Maria Souza', 'Cliente', 'Original', 'maria@exemplo', '529.982', 'Autora Secreta', 'Autora', 'Documento de teste', 'Assunto confidencial', 'chave-oculta', 'comentario', 'anotacao', 'no formulario']) {
    assert.equal(await temRastro(r.bytes, rastro), false, `o arquivo gerado não pode conter "${rastro}"`);
  }
  // Sem restos estruturais: formulário, comentários, marcadores, anexos, fontes.
  const documento = await PDFDocument.load(r.bytes);
  assert.equal(documento.catalog.has(PDFName.of('AcroForm')), false);
  assert.equal(documento.catalog.has(PDFName.of('Outlines')), false);
  assert.equal(documento.catalog.has(PDFName.of('Names')), false);
  assert.equal(documento.getTitle(), undefined);
  assert.equal(documento.getAuthor(), undefined);
  assert.equal(documento.getSubject(), undefined);
  assert.equal(documento.getKeywords(), undefined);
  for (let i = 0; i < 3; i++) {
    const página = documento.getPage(i);
    assert.equal(página.node.Annots()?.size() ?? 0, 0, `a página ${i + 1} não pode ter comentários nem campos`);
    assert.equal(página.node.Resources().lookup(PDFName.of('Font'))?.keys().length ?? 0, 0, `a página ${i + 1} não pode ter fonte`);
  }
  assert.equal(await temRastro(r.bytes, '/BaseFont'), false, 'nenhuma fonte no arquivo todo');
  assert.equal(await temRastro(r.bytes, '/FontDescriptor'), false);
});

test('só a página com o segredo vira imagem; as outras continuam com texto, mas sem comentários nem metadados', async () => {
  const original = await pdfSecreto({ secretaEm: [2] });
  const busca = await procurar(original, { termos: ['palavra-secreta-123'] });
  assert.deepEqual(busca.achados.map((a) => a.página), [2]);
  const r = await ocultar(original, { retângulos: retângulosDe(busca.achados) });
  assert.deepEqual([r.ocultadas, r.copiadas], [[2], [1, 3]]);
  assert.equal((await textoVisível(r.bytes, 2)).trim(), '');
  assert.match(await textoVisível(r.bytes, 1), /Original 1/);
  assert.match(await textoVisível(r.bytes, 3), /Original 3/);
  assert.equal(await temRastro(r.bytes, 'PALAVRA-SECRETA-123'), false);
  assert.equal(await temRastro(r.bytes, 'Autora'), false);
  const documento = await PDFDocument.load(r.bytes);
  assert.equal(documento.getPage(0).node.Annots()?.size() ?? 0, 0);
  assert.equal(documento.catalog.has(PDFName.of('AcroForm')), false);
  // A página de saída tem uma imagem do tamanho da página e nada mais.
  const imagem = documento.getPage(1).node.Resources().lookup(PDFName.of('XObject'));
  assert.equal(imagem.keys().length, 1);
  assert.deepEqual([documento.getPage(1).getWidth(), documento.getPage(1).getHeight()], [595.28, 841.89]);
});

test('ocultar tudo o que foi achado e procurar de novo no resultado: não sobra nada (idempotência da busca)', async () => {
  const original = await pdfSecreto();
  const critério = { termos: ['PALAVRA-SECRETA-123', 'maria@exemplo.com.br'], expressões: ['cpf', 'telefone'] };
  const antes = await procurar(original, critério);
  assert.ok(antes.achados.length >= 3 * 4);
  const r = await ocultar(original, { retângulos: retângulosDe(antes.achados) });
  const depois = await procurar(r.bytes, critério);
  assert.equal(depois.achados.length, 0);
  assert.deepEqual(depois.páginasSemTexto, [1, 2, 3]);
});

test('a conferência final recusa o arquivo se achar texto numa página ocultada, e nada é entregue', async () => {
  const original = await pdfSecreto();
  const busca = await procurar(original, { termos: ['PALAVRA-SECRETA-123'] });
  const r = await ocultar(original, { retângulos: retângulosDe(busca.achados) }, leitorFalso({ textoNaReleitura: 'sobrou algo' }));
  assert.equal(r.ok, false);
  assert.equal(r.erro, 'verificação_falhou');
  assert.equal(r.bytes, undefined);
  assert.match(mensagemDeErroDeOcultação(r.erro, r.extras), /achou texto na página 1.*nenhum arquivo foi entregue/);
});

test('se uma página não pode ser desenhada, não há arquivo: a página original NUNCA vai no lugar da tarja', async () => {
  const original = await pdfSecreto();
  const busca = await procurar(original, { termos: ['PALAVRA-SECRETA-123'] });
  const r = await ocultar(original, { retângulos: retângulosDe(busca.achados) }, leitorFalso({ falhaNaPágina: 2 }));
  assert.deepEqual([r.ok, r.erro, r.extras.página], [false, 'página_com_erro', 2]);
  assert.equal(r.bytes, undefined);
  assert.match(mensagemDeErroDeOcultação(r.erro, r.extras), /página 2.*Nenhum arquivo foi gerado/);
});

test('imagem que a pdf-lib não consegue incorporar também derruba a operação', async () => {
  const original = await pdfSecreto({ páginas: 1 });
  const busca = await procurar(original, { termos: ['PALAVRA-SECRETA-123'] });
  const quebrado = { abrir: async (bytes) => ({ ...(await abrirComPdfjsParaTexto(bytes)), desenharComTarjas: async () => new Uint8Array([1, 2, 3]) }) };
  const r = await ocultar(original, { retângulos: retângulosDe(busca.achados) }, quebrado);
  assert.deepEqual([r.ok, r.erro], [false, 'página_com_erro']);
});

/* ------------------------------------- tipos de dado e validadores */

test('CPF: o de verdade é marcado, o fictício de dígitos errados não (casos da pesquisa)', async () => {
  assert.equal(validarCpf(CPF_VÁLIDO), true);
  assert.equal(validarCpf(CPF_FALSO), false);
  assert.equal(validarCpf('111.444.777-35'), true);
  assert.equal(validarCpf('52998224725'), true);
  for (const ruim of ['111.111.111-11', '000.000.000-00', '529.982.247-26', '529.982.247', '', 'abc', '1234567890123']) assert.equal(validarCpf(ruim), false, ruim);
  const busca = await procurar(await pdfSecreto({ páginas: 1 }), { expressões: ['cpf'] });
  assert.deepEqual(busca.achados.map((a) => a.texto), [CPF_VÁLIDO]);
  assert.equal(busca.achados[0].rótulo, 'CPF');
  assert.equal(busca.achados[0].tipo, 'cpf');
});

test('CNPJ, cartão (Luhn), CEP, data, e-mail e telefone: o que presta é achado, o que não presta fica', () => {
  assert.equal(validarCnpj('11.222.333/0001-81'), true);
  assert.equal(validarCnpj('11.222.333/0001-82'), false);
  assert.equal(validarCnpj('00.000.000/0000-00'), false);
  assert.equal(passaNoLuhn('4111 1111 1111 1111'), true);
  assert.equal(passaNoLuhn('4111 1111 1111 1112'), false);
  assert.equal(passaNoLuhn('0000 0000 0000 0000'), false);
  assert.equal(passaNoLuhn('4111'), false);
  const item = (str, oy = 100) => ({ str, ox: 10, oy, ux: str.length * 6, uy: 0, vx: 0, vy: -12 });
  const achar = (texto, expressões) => acharNaPágina([item(texto)], { expressões }).map((a) => a.texto);
  assert.deepEqual(achar('CNPJ 11.222.333/0001-81 e 11.222.333/0001-82', ['cnpj']), ['11.222.333/0001-81']);
  assert.deepEqual(achar('cartao 4111 1111 1111 1111 ok', ['cartão']), ['4111 1111 1111 1111']);
  assert.deepEqual(achar('cartao 4111 1111 1111 1112 nao', ['cartão']), []);
  assert.deepEqual(achar('CEP 50030-230 e 5003-230', ['cep']), ['50030-230']);
  assert.deepEqual(achar('em 05/10/2026 e 45/13/2026 e 1/2/99', ['data']), ['05/10/2026', '1/2/99']);
  assert.deepEqual(achar('escreva para Ana.Souza+x@Exemplo.com.br ou @ana', ['email']), ['Ana.Souza+x@Exemplo.com.br']);
  assert.deepEqual(achar('(11) 91234-5678, 11 91234-5678, 3333-4444 e +55 11 91234-5678', ['telefone']), ['(11) 91234-5678', '11 91234-5678', '3333-4444', '+55 11 91234-5678']);
  assert.deepEqual(achar('protocolo 12345678 sem hifen', ['telefone']), []);
  // Número maior não é cortado em pedaço de CPF.
  assert.deepEqual(achar('codigo 5299822472500', ['cpf']), []);
});

test('CPF dentro de um termo maior não aparece duas vezes', () => {
  const item = { str: `CPF ${CPF_VÁLIDO} fim`, ox: 10, oy: 100, ux: 150, uy: 0, vx: 0, vy: -12 };
  const achados = acharNaPágina([item], { termos: [`CPF ${CPF_VÁLIDO}`], expressões: ['cpf'] });
  assert.equal(achados.length, 1);
  assert.equal(achados[0].texto, `CPF ${CPF_VÁLIDO}`);
});

/* ----------------------------------------------- termos escritos */

test('termos: caixa e acentos podem ser ignorados ou exigidos, e a frase pega espaços e quebras de linha entre as palavras', () => {
  const item = (str, ox, oy) => ({ str, ox, oy, ux: str.length * 6, uy: 0, vx: 0, vy: -12 });
  const itens = [item('Pedro da Conceição', 10, 100), item('Gonçalves moreira', 10, 114)];
  const achar = (termo, opções) => acharNaPágina(itens, { termos: [termo], ...opções }).map((a) => a.texto);
  assert.deepEqual(achar('PEDRO DA CONCEICAO'), ['Pedro da Conceição']);
  assert.deepEqual(achar('PEDRO DA CONCEICAO', { ignorarCaixa: false }), []);
  assert.deepEqual(achar('pedro da conceição', { ignorarCaixa: false }), []);
  assert.deepEqual(achar('Pedro da Conceição', { ignorarCaixa: false, ignorarAcentos: false }), ['Pedro da Conceição']);
  assert.deepEqual(achar('Conceicao', { ignorarAcentos: false }), []);
  assert.deepEqual(achar('conceição   gonçalves'), ['Conceição Gonçalves']);
  assert.deepEqual(achar('(11) 9'), []);
  // Caracteres de regex no termo valem como letras.
  assert.deepEqual(acharNaPágina([item('preço (R$ 5,00)', 0, 0)], { termos: ['(R$ 5,00)'] }).map((a) => a.texto), ['(R$ 5,00)']);
  assert.deepEqual(acharNaPágina([item('a.b', 0, 0)], { termos: ['a.b', '.*'] }).map((a) => a.texto), ['a.b']);
});

test('um termo dividido em dois pedaços de texto na mesma linha é achado e cada pedaço ganha a sua tarja', () => {
  const itens = [
    { str: 'Fulano de ', ox: 10, oy: 100, ux: 60, uy: 0, vx: 0, vy: -12 },
    { str: 'Tal da Silva', ox: 70, oy: 100, ux: 72, uy: 0, vx: 0, vy: -12 },
  ];
  const achados = acharNaPágina(itens, { termos: ['de Tal'] });
  assert.equal(achados.length, 1);
  assert.equal(achados[0].retângulos.length, 2);
});

test('termos: lista limpa, sem linhas vazias nem repetições; limites de quantidade e de tamanho', async () => {
  assert.deepEqual(termosDe('  um \n\n dois\r\num\n'), ['um', 'dois']);
  assert.deepEqual(termosDe(undefined), []);
  const pdf = await pdfDeTeste(1);
  assert.equal((await procurar(pdf, {})).erro, 'sem_critério');
  assert.equal((await procurar(pdf, { termos: [], expressões: ['inexistente'] })).erro, 'sem_critério');
  assert.equal((await procurar(pdf, { termos: Array.from({ length: LIMITE_DE_TERMOS + 1 }, (_, i) => `t${i}`) })).erro, 'termos_demais');
  assert.equal((await procurar(pdf, { termos: ['x'.repeat(LIMITE_DO_TERMO + 1)] })).erro, 'termo_longo');
  assert.match(mensagemDeErroDeOcultação('sem_critério'), /uma palavra ou frase por linha/);
});

test('achados demais são recusados com a orientação de procurar algo mais específico', async () => {
  const muitos = { abrir: async () => ({ páginas: 1, texto: async () => ({ itens: [{ str: 'a '.repeat(LIMITE_DE_ACHADOS + 5), ox: 0, oy: 10, ux: 900, uy: 0, vx: 0, vy: -10 }] }), fechar() {} }) };
  const r = await procurarNoPdf({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, { ...muitos, termos: ['a'] });
  assert.equal(r.erro, 'achados_demais');
  assert.match(mensagemDeErroDeOcultação(r.erro), /mais de 2\.000 trechos/);
});

test('página sem texto (escaneada) é listada: a busca não acha nada nela e o aviso orienta marcar a área à mão', async () => {
  const documento = await PDFDocument.create();
  const imagem = await documento.embedPng(png(20, 20));
  documento.addPage([200, 200]).drawImage(imagem, { x: 0, y: 0, width: 200, height: 200 });
  const r = await procurar(await documento.save(), { termos: ['qualquer'] });
  assert.deepEqual([r.ok, r.achados.length, r.páginasSemTexto], [true, 0, [1]]);
});

/* ------------------------------------------- posição das tarjas */

test('propriedade: a tarja de um trecho cobre todas as letras dele, em Helvetica, Times e Courier, com folga para os lados', async () => {
  let semente = 20260506;
  const sorteio = (n) => { semente = (semente * 1103515245 + 12345) % 2147483648; return semente % n; };
  const alfabeto = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,-/@çãéíóú';
  let conferidos = 0;
  for (const nomeDaFonte of [StandardFonts.Helvetica, StandardFonts.TimesRoman, StandardFonts.Courier]) {
    const documento = await PDFDocument.create();
    const fonte = await documento.embedFont(nomeDaFonte);
    const casos = [];
    const página = documento.addPage([600, 800]);
    for (let i = 0; i < 40; i++) {
      const tamanho = [8, 12, 18, 30][sorteio(4)];
      const texto = Array.from({ length: 12 + sorteio(40) }, () => alfabeto[sorteio(alfabeto.length)]).join('').replace(/^ +| +$/g, 'x').replace(/ {2,}/g, ' ');
      const x = 20 + sorteio(100);
      const y = 20 + i * 18;
      página.drawText(texto, { x, y, size: tamanho, font: fonte });
      const de = sorteio(texto.length - 3);
      const até = Math.min(texto.length, de + 3 + sorteio(15));
      casos.push({ texto, x, y: 800 - y, tamanho, de, até, antes: fonte.widthOfTextAtSize(texto.slice(0, de), tamanho), dentro: fonte.widthOfTextAtSize(texto.slice(0, até), tamanho) });
    }
    const aberto = await abrirComPdfjsParaTexto(await documento.save());
    const { itens } = await aberto.texto(1);
    await aberto.fechar();
    for (const caso of casos) {
      // O leitor pode juntar ou separar pedaços; só vale o caso em que o pedaço é exatamente o texto desenhado.
      const item = itens.find((i) => i.str === caso.texto && Math.abs(i.oy - caso.y) < 0.5);
      if (!item) continue;
      conferidos++;
      // Posição verdadeira do trecho = largura real das letras antes dele, medida com a fonte de verdade.
      const começoReal = item.ox + caso.antes;
      const fimReal = item.ox + caso.dentro;
      const mapa = Array.from(item.str).map((_, k) => ({ item: 0, k }));
      const [r] = retângulosDoTrecho([item], mapa, caso.de, caso.até);
      assert.ok(r.x <= começoReal, `${nomeDaFonte}: a tarja começa em ${r.x.toFixed(1)} mas a letra começa em ${começoReal.toFixed(1)} ("${caso.texto}" ${caso.de}-${caso.até})`);
      assert.ok(r.x + r.largura >= fimReal, `${nomeDaFonte}: a tarja termina em ${(r.x + r.largura).toFixed(1)} mas a letra termina em ${fimReal.toFixed(1)} ("${caso.texto}" ${caso.de}-${caso.até})`);
      // Na vertical, da descida à altura das maiúsculas.
      assert.ok(r.y <= item.oy - 0.72 * caso.tamanho + 0.01 && r.y + r.altura >= item.oy + 0.2 * caso.tamanho - 0.01, `${nomeDaFonte}: a tarja não cobre a altura da letra`);
    }
  }
  assert.ok(conferidos >= 60, `poucos casos conferidos (${conferidos}): o teste não está medindo o que diz`);
});

test('em fonte de largura fixa as partes são iguais; com "cobrir o pedaço inteiro" a tarja vai de ponta a ponta', () => {
  const item = { str: 'ABCDEFGHIJ', ox: 100, oy: 50, ux: 100, uy: 0, vx: 0, vy: -10, mono: true };
  const mapa = Array.from(item.str).map((_, k) => ({ item: 0, k }));
  const [r] = retângulosDoTrecho([item], mapa, 3, 6);
  // Letras de 10 pt: as de índice 3 a 5 ocupam de 130 a 160; a folga é 0,6 × 10 = 6.
  assert.ok(perto(r.x, 130 - 6, 1e-6) && perto(r.x + r.largura, 160 + 6, 1e-6));
  const [inteiro] = retângulosDoTrecho([item], mapa, 3, 6, { coberturaTotal: true });
  assert.ok(inteiro.x <= 100 - FOLGA_MÍNIMA + 1e-6 && inteiro.x + inteiro.largura >= 200 + FOLGA_MÍNIMA - 1e-6);
});

test('texto girado (página de lado) também recebe tarja do tamanho certo, e largura zero ainda gera tarja', () => {
  // Texto subindo: o vetor da linha aponta para cima (y menor) e o "para cima da letra" aponta para a direita.
  const item = { str: 'segredo', ox: 100, oy: 200, ux: 0, uy: -70, vx: 12, vy: 0 };
  const mapa = Array.from(item.str).map((_, k) => ({ item: 0, k }));
  const [r] = retângulosDoTrecho([item], mapa, 0, 7);
  assert.ok(r.altura >= 70 && r.largura >= 12);
  const semLargura = { str: 'abc', ox: 10, oy: 20, ux: 0, uy: 0, vx: 0, vy: -10 };
  const [z] = retângulosDoTrecho([semLargura], [0, 1, 2].map((k) => ({ item: 0, k })), 0, 3);
  assert.ok(z.largura > 0 && z.altura > 0);
});

test('o texto corrido separa linhas e vazios e não deixa os separadores entrarem nas tarjas', () => {
  const itens = [
    { str: 'Nome', ox: 10, oy: 100, ux: 24, uy: 0, vx: 0, vy: -12 },
    { str: 'Maria', ox: 80, oy: 100, ux: 30, uy: 0, vx: 0, vy: -12 },
    { str: 'Rua', ox: 10, oy: 130, ux: 18, uy: 0, vx: 0, vy: -12 },
  ];
  const { pontos, mapa } = textoCorridoDaPágina(itens);
  assert.equal(pontos.join(''), 'Nome Maria\nRua');
  assert.equal(mapa.filter((m) => m === null).length, 2);
});

/* ------------------------------------------ marcação manual e páginas */

test('áreas marcadas à mão e páginas inteiras: cada página afetada recebe as suas tarjas, cortadas para dentro da página', async () => {
  const original = await pdfSecreto();
  const leitor = leitorFalso();
  const r = await ocultar(original, {
    retângulos: [{ página: 1, x: 50, y: 100, largura: 200, altura: 30 }, { página: 1, x: 500, y: 20, largura: 400, altura: 50 }, { página: 1, x: 900, y: 900, largura: 20, altura: 20 }],
    páginasInteiras: '3', cor: 'cinza-escuro', dpi: 300,
  }, leitor);
  assert.equal(r.ok, true);
  assert.deepEqual([r.ocultadas, r.copiadas, r.tarjas], [[1, 3], [2], 3]);
  const [p1, p3] = leitor.pedidos;
  const igual = (obtida, esperada) => Object.entries(esperada).every(([k, v]) => perto(obtida[k], v, 1e-6));
  assert.equal(p1.tarjas.length, 2);
  assert.ok(igual(p1.tarjas[0], { x: 50, y: 100, largura: 200, altura: 30 }), JSON.stringify(p1.tarjas[0]));
  assert.ok(igual(p1.tarjas[1], { x: 500, y: 20, largura: 95.28, altura: 50 }), JSON.stringify(p1.tarjas[1]));
  assert.equal(p3.tarjas.length, 1);
  assert.ok(igual(p3.tarjas[0], { x: 0, y: 0, largura: 595.28, altura: 841.89 }), JSON.stringify(p3.tarjas[0]));
  assert.equal(p1.cor, CORES_DA_TARJA['cinza-escuro']);
  assert.equal(p1.formato, 'image/jpeg');
  assert.equal(p1.medida.largura, Math.round((595.28 * 300) / 72));
  assert.match(await textoVisível(r.bytes, 2), /Original 2/);
});

test('página girada: a página de saída tem o tamanho que se vê, sem rotação', async () => {
  const original = await pdfSecreto({ páginas: 2, rotações: [90, 0] });
  const r = await ocultar(original, { páginasInteiras: '1' });
  const documento = await PDFDocument.load(r.bytes);
  const p = documento.getPage(0);
  assert.deepEqual([p.getWidth(), p.getHeight(), p.getRotation().angle], [841.89, 595.28, 0]);
});

test('só duas casas decimais no tamanho; a ordem e a quantidade de páginas se mantêm', async () => {
  const r = await ocultar(await pdfSecreto({ páginas: 5 }), { páginasInteiras: '2, 4' });
  const documento = await PDFDocument.load(r.bytes);
  assert.equal(documento.getPageCount(), 5);
  assert.deepEqual(r.ocultadas, [2, 4]);
  assert.deepEqual(r.copiadas, [1, 3, 5]);
  assert.match(await textoVisível(r.bytes, 3), /Original 3/);
  assert.match(await textoVisível(r.bytes, 5), /Original 5/);
});

/* ------------------------------------------------ opções e limites */

test('opções fora do combinado são recusadas antes de abrir o PDF', async () => {
  const vazio = new Uint8Array();
  const erro = async (opções) => (await ocultar(vazio, opções)).erro;
  assert.equal(await erro({ dpi: 100 }), 'dpi_inválido');
  assert.equal(await erro({ dpi: Number.NaN }), 'dpi_inválido');
  assert.equal(await erro({ cor: 'rosa' }), 'cor_inválida');
  assert.equal(await erro({ retângulos: 'x' }), 'tarja_inválida');
  assert.equal(await erro({ retângulos: [{ página: 1, x: 0, y: 0, largura: 0, altura: 5 }] }), 'tarja_inválida');
  assert.equal(await erro({ retângulos: [{ página: 0, x: 0, y: 0, largura: 5, altura: 5 }] }), 'tarja_inválida');
  assert.equal(await erro({ retângulos: [{ página: 1, x: Number.NaN, y: 0, largura: 5, altura: 5 }] }), 'tarja_inválida');
  assert.equal(await erro({ retângulos: Array.from({ length: 20_001 }, () => ({ página: 1, x: 0, y: 0, largura: 1, altura: 1 })) }), 'tarjas_demais');
  assert.deepEqual([...DPIS], [150, 200, 300]);
  assert.match(mensagemDeErroDeOcultação('dpi_inválido'), /150, 200, 300 dpi/);
});

test('nada marcado, página que não existe e tarja numa página que não existe', async () => {
  const pdf = await pdfSecreto({ páginas: 2 });
  assert.equal((await ocultar(pdf, {})).erro, 'nada_para_ocultar');
  assert.match(mensagemDeErroDeOcultação('nada_para_ocultar'), /Nada foi marcado/);
  const fora = await ocultar(pdf, { páginasInteiras: '9' });
  assert.deepEqual([fora.erro, fora.extras.página, fora.extras.total], ['faixa_fora', 9, 2]);
  assert.equal((await ocultar(pdf, { páginasInteiras: 'abc' })).erro, 'faixa_inválida');
  assert.equal((await ocultar(pdf, { retângulos: [{ página: 3, x: 0, y: 0, largura: 5, altura: 5 }] })).erro, 'tarja_inválida');
});

test('mais de 200 páginas afetadas é recusado, dizendo quantas', async () => {
  const r = await ocultar(await pdfDeTeste(LIMITE_DE_PÁGINAS_OCULTADAS + 1, { texto: false }), { páginasInteiras: 'todas' });
  assert.deepEqual([r.erro, r.extras.pedidas], ['páginas_demais_ocultar', 201]);
  assert.match(mensagemDeErroDeOcultação(r.erro, r.extras), /até 200 páginas.*201 foram afetadas/);
  const ok = await ocultar(await pdfDeTeste(LIMITE_DE_PÁGINAS_OCULTADAS + 1, { texto: false }), { páginasInteiras: '1-200' });
  assert.equal(ok.ok, true);
});

test('saída grande demais é interrompida', async () => {
  const grande = {
    abrir: async (b) => ({
      ...(await abrirComPdfjsParaTexto(b)),
      // Um JPEG válido que diz ter 250 MB: só o tamanho importa para o limite.
      desenharComTarjas: async () => Object.defineProperty(jpeg(10, 10), 'length', { value: 250 * 1024 * 1024 }),
    }),
  };
  const r = await ocultar(await pdfDeTeste(3), { páginasInteiras: 'todas' }, grande);
  assert.equal(r.erro, 'saída_grande');
  assert.match(mensagemDeErroDeOcultação(r.erro), /400 MB/);
});

test('arquivos vazios, falsos, corrompidos, protegidos e grandes demais: a busca e a ocultação recusam do mesmo jeito', async () => {
  for (const fazer of [(b) => procurar(b, { termos: ['x'] }), (b) => ocultar(b, { páginasInteiras: '1' })]) {
    assert.equal((await fazer(new Uint8Array())).erro, 'arquivo_vazio');
    assert.equal((await fazer(new TextEncoder().encode('só texto'))).erro, 'arquivo_nao_pdf');
    assert.equal((await fazer(png(5, 5))).erro, 'arquivo_nao_pdf');
    const quebrado = await fazer(new TextEncoder().encode('%PDF-1.7\nlixo'));
    assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'Contrato.pdf']);
    const grande = new Uint8Array(TAMANHO_MÁXIMO_POR_ARQUIVO + 1);
    grande.set([0x25, 0x50, 0x44, 0x46]);
    assert.equal((await fazer(grande)).erro, 'arquivo_grande_demais');
  }
  assert.equal((await ocultar(await pdfProtegido(), { páginasInteiras: '1' })).erro, 'pdf_protegido');
  const comSenha = await procurarNoPdf({ nome: 'x.pdf', bytes: await pdfDeTeste(1) }, {
    termos: ['x'], abrir: async () => { const e = new Error('senha'); e.name = 'PasswordException'; throw e; },
  });
  assert.equal(comSenha.erro, 'pdf_protegido');
  const semLeitor = await ocultar(await pdfDeTeste(1), { páginasInteiras: '1' }, { abrir: async () => { const e = new Error('rede'); e.name = 'LeitorIndisponível'; throw e; } });
  assert.equal(semLeitor.erro, 'leitor_indisponível');
  assert.match(mensagemDeErroDeOcultação('leitor_indisponível'), /Não foi possível carregar o leitor de PDF/);
});

test('cancelar interrompe de verdade, e o progresso conta página a página', async () => {
  const passos = [];
  const original = await pdfSecreto();
  await ocultar(original, { páginasInteiras: 'todas', aoProgredir: (p) => passos.push([p.página, p.total]) });
  assert.deepEqual(passos, [[1, 3], [2, 3], [3, 3]]);
  let vezes = 0;
  const r = await ocultar(original, { páginasInteiras: 'todas', cancelado: () => ++vezes > 2 });
  assert.equal(r.erro, 'cancelado');
  const busca = await procurar(await pdfDeTeste(8), { termos: ['Original'], cancelado: () => true });
  assert.equal(busca.erro, 'cancelado');
});

test('o original não é alterado', async () => {
  const original = await pdfSecreto();
  const cópia = original.slice();
  await ocultar(original, { páginasInteiras: '1' });
  assert.deepEqual(original, cópia);
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete a tarja real e diz o que a ferramenta não faz', () => {
  const ficha = ferramentaPorSlug['ocultar-informacoes-do-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
  assert.match(ficha.processa, /imagem/);
});

test('"Como usar" avisa que o texto das páginas ocultadas deixa de ser selecionável e que a busca não acha texto em imagem', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /PALAVRA-SECRETA/);
  assert.match(limites, /deixa de ser selecionável/);
  assert.match(limites, /ESCANEADO/);
  assert.match(limites, /confira a prévia/i);
  assert.match(limites, /MIT/);
  assert.match(limites, /Apache 2\.0/);
  assert.ok(perguntas.some((q) => /de verdade/i.test(q.p) || /apaga/i.test(q.p)));
});
