/**
 * Testes de Preencher formulário em PDF.
 *
 * Os PDFs de formulário são criados aqui com a pdf-lib. Os casos vêm de
 * documentação/pesquisa-ilovepdf/d-editar.md (D6): preencher nome = "Ana Teste", cidade = "Recife"
 * e aceite marcado; achatando, o PDF não tem mais campos e o texto aparece no conteúdo; sem
 * achatar, os valores se leem de volta dos campos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pdfDeTeste, pdfProtegido, biblioteca } from './auxiliares/pdf-de-teste.mjs';
import {
  lerCamposDoFormulário, preencherFormulário, mensagemDeErroDeFormulário, LIMITE_DE_CAMPOS, LIMITE_DO_VALOR,
} from '../scripts/cálculos/preencher-formulario-pdf.js';
import { TAMANHO_MÁXIMO_POR_ARQUIVO } from '../scripts/cálculos/pdf.js';
import { abrirComPdfjsParaTexto } from '../scripts/ferramentas/auxiliares/pdfjs-textos.js';
import ferramenta from '../scripts/ferramentas/preencher-formulario-pdf.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

const { PDFDocument, PDFName } = biblioteca;

const avisar = console.log;
console.log = (...args) => { if (!String(args[0]).startsWith('Warning:')) avisar(...args); };

/** Formulário de teste: nome (até 20), observações (várias linhas), aceite, sexo (opções), cidade (lista), itens (várias escolhas). */
async function formulário({ páginas = 1, extras } = {}) {
  const documento = await PDFDocument.create();
  const página = documento.addPage([400, 500]);
  const form = documento.getForm();
  const nome = form.createTextField('nome');
  nome.setMaxLength(20);
  nome.addToPage(página, { x: 20, y: 440, width: 200, height: 20 });
  const obs = form.createTextField('obs');
  obs.enableMultiline();
  obs.addToPage(página, { x: 20, y: 350, width: 200, height: 60 });
  form.createCheckBox('aceite').addToPage(página, { x: 20, y: 320, width: 15, height: 15 });
  const sexo = form.createRadioGroup('sexo');
  sexo.addOptionToPage('F', página, { x: 20, y: 290, width: 15, height: 15 });
  sexo.addOptionToPage('M', página, { x: 60, y: 290, width: 15, height: 15 });
  const cidade = form.createDropdown('cidade');
  cidade.addOptions(['Recife', 'Curitiba', 'São Paulo']);
  cidade.addToPage(página, { x: 20, y: 250, width: 120, height: 20 });
  const itens = form.createOptionList('itens');
  itens.addOptions(['a', 'b', 'c']);
  itens.enableMultiselect();
  itens.addToPage(página, { x: 20, y: 170, width: 100, height: 60 });
  for (let i = 1; i < páginas; i++) {
    const outra = documento.addPage([400, 500]);
    form.createTextField(`extra${i}`).addToPage(outra, { x: 20, y: 440, width: 200, height: 20 });
  }
  await extras?.(documento, form, página);
  return documento.save();
}

const ler = (bytes) => lerCamposDoFormulário({ nome: 'Ficha.pdf', bytes }, { biblioteca });
const preencher = (bytes, valores, opções = {}) => preencherFormulário({ nome: 'Ficha.pdf', bytes }, { biblioteca, valores, ...opções });

/** Texto da primeira página como o leitor de PDF o vê. */
async function textoVisível(bytes) {
  const abertura = await abrirComPdfjsParaTexto(bytes);
  try {
    const { itens } = await abertura.texto(1);
    return itens.map((i) => i.str).join(' ');
  } finally {
    await abertura.fechar();
  }
}

/* ------------------------------------------------------------ ler */

test('lê os campos com tipo, opções, valor atual e página', async () => {
  const r = await ler(await formulário({ páginas: 2 }));
  assert.equal(r.ok, true);
  assert.equal(r.páginas, 2);
  const por = Object.fromEntries(r.campos.map((c) => [c.nome, c]));
  assert.deepEqual(Object.keys(por), ['nome', 'obs', 'aceite', 'sexo', 'cidade', 'itens', 'extra1']);
  assert.equal(por.nome.tipo, 'texto');
  assert.equal(por.nome.tamanhoMáximo, 20);
  assert.equal(por.obs.multilinha, true);
  assert.equal(por.aceite.tipo, 'caixa');
  assert.equal(por.aceite.valor, false);
  assert.deepEqual([por.sexo.tipo, por.sexo.opções, por.sexo.valor], ['opções', ['F', 'M'], null]);
  assert.deepEqual([por.cidade.tipo, por.cidade.opções, por.cidade.valor], ['lista', ['Recife', 'Curitiba', 'São Paulo'], null]);
  assert.deepEqual([por.itens.múltipla, por.itens.valor], [true, []]);
  assert.deepEqual([por.nome.página, por.extra1.página], [1, 2]);
  assert.equal(r.preenchíveis, 7);
  assert.deepEqual(r.avisos, []);
});

test('campo de assinatura e botão são listados, mas não contam como preenchíveis', async () => {
  const bytes = await formulário({
    extras: (documento, form, página) => {
      form.createButton('enviar').addToPage('Enviar', página, { x: 200, y: 20, width: 60, height: 20 });
    },
  });
  const r = await ler(bytes);
  assert.equal(r.campos.find((c) => c.nome === 'enviar').tipo, 'botão');
  assert.equal(r.preenchíveis, 6);
});

test('campo somente leitura aparece como tal e não é gravado', async () => {
  const bytes = await formulário({ extras: (d, form) => form.getTextField('nome').enableReadOnly() });
  const lido = await ler(bytes);
  assert.equal(lido.campos[0].somenteLeitura, true);
  const r = await preencher(bytes, { nome: 'Ana', obs: 'oi' });
  assert.deepEqual(r.ignorados, ['nome']);
  assert.deepEqual(r.alterados, ['obs']);
  const depois = await PDFDocument.load(r.bytes);
  assert.equal(depois.getForm().getTextField('nome').getText(), undefined);
});

/* ---------------------------------------------- preencher (D6) */

test('nome, cidade e aceite sem achatar: os valores se leem de volta e os campos continuam', async () => {
  const r = await preencher(await formulário(), { nome: 'Ana Teste', cidade: 'Recife', aceite: true });
  assert.equal(r.ok, true);
  assert.deepEqual(r.alterados, ['nome', 'aceite', 'cidade']);
  assert.equal(r.achatado, false);
  const depois = (await PDFDocument.load(r.bytes)).getForm();
  assert.equal(depois.getTextField('nome').getText(), 'Ana Teste');
  assert.equal(depois.getCheckBox('aceite').isChecked(), true);
  assert.deepEqual(depois.getDropdown('cidade').getSelected(), ['Recife']);
  assert.equal(depois.getFields().length, 6);
});

test('achatando: o PDF não tem mais campos e o texto "Ana Teste" aparece no conteúdo da página', async () => {
  const r = await preencher(await formulário(), { nome: 'Ana Teste', cidade: 'Recife', aceite: true }, { achatar: true });
  assert.equal(r.achatado, true);
  const depois = await PDFDocument.load(r.bytes);
  assert.equal(depois.getForm().getFields().length, 0);
  assert.equal(depois.getPage(0).node.Annots()?.size?.() ?? 0, 0);
  const visível = await textoVisível(r.bytes);
  assert.match(visível, /Ana Teste/);
  assert.match(visível, /Recife/);
});

test('botão de opção, lista de várias escolhas e texto de várias linhas', async () => {
  const r = await preencher(await formulário(), { sexo: 'M', itens: ['a', 'c'], obs: 'linha um\nlinha dois' });
  const form = (await PDFDocument.load(r.bytes)).getForm();
  assert.equal(form.getRadioGroup('sexo').getSelected(), 'M');
  assert.deepEqual(form.getOptionList('itens').getSelected().sort(), ['a', 'c']);
  assert.equal(form.getTextField('obs').getText(), 'linha um\nlinha dois');
});

test('acentos, cedilha e til do português são gravados e aparecem no leitor', async () => {
  const frase = 'João Ação coração';
  const r = await preencher(await formulário(), { nome: frase }, { achatar: true });
  assert.match(await textoVisível(r.bytes), /João Ação coração/);
  const sem = await preencher(await formulário(), { nome: frase });
  assert.equal((await PDFDocument.load(sem.bytes)).getForm().getTextField('nome').getText(), frase);
});

test('limpar: desmarcar, escolher "nenhuma" opção e esvaziar o texto', async () => {
  const cheio = (await preencher(await formulário(), { nome: 'X', aceite: true, sexo: 'F', cidade: 'Curitiba', itens: ['b'] })).bytes;
  const r = await preencher(cheio, { nome: '', aceite: false, sexo: null, cidade: null, itens: [] });
  assert.deepEqual(r.alterados, ['nome', 'aceite', 'sexo', 'cidade', 'itens']);
  const form = (await PDFDocument.load(r.bytes)).getForm();
  assert.equal(form.getTextField('nome').getText(), undefined);
  assert.equal(form.getCheckBox('aceite').isChecked(), false);
  assert.equal(form.getRadioGroup('sexo').getSelected(), undefined);
  assert.deepEqual(form.getDropdown('cidade').getSelected(), []);
  assert.deepEqual(form.getOptionList('itens').getSelected(), []);
});

test('só o que mudou é gravado; sem mudança nenhuma não há arquivo', async () => {
  const bytes = await formulário();
  const nada = await preencher(bytes, { nome: '', aceite: false, sexo: null });
  assert.deepEqual([nada.ok, nada.erro], [false, 'nada_para_preencher']);
  assert.match(mensagemDeErroDeFormulário(nada.erro), /Nenhum campo foi alterado/);
  assert.equal((await preencher(bytes, {})).erro, 'nada_para_preencher');
  const preenchido = (await preencher(bytes, { nome: 'Ana' })).bytes;
  const repetido = await preencher(preenchido, { nome: 'Ana', obs: 'novo' });
  assert.deepEqual(repetido.alterados, ['obs']);
});

test('propriedade: o que se grava é o que se lê de volta, campo a campo', async () => {
  const valores = { nome: 'Rua das Flores, 12', obs: 'a\nb', aceite: true, sexo: 'F', cidade: 'São Paulo', itens: ['b', 'c'] };
  const gravado = await preencher(await formulário(), valores);
  const lido = await ler(gravado.bytes);
  const por = Object.fromEntries(lido.campos.map((c) => [c.nome, c.valor]));
  assert.equal(por.nome, valores.nome);
  assert.equal(por.obs, valores.obs);
  assert.equal(por.aceite, true);
  assert.equal(por.sexo, 'F');
  assert.equal(por.cidade, 'São Paulo');
  assert.deepEqual(por.itens.sort(), ['b', 'c']);
});

/* ---------------------------------------------- valores inválidos */

test('valor inválido é recusado nomeando o campo, e nenhum arquivo sai pela metade', async () => {
  const bytes = await formulário();
  const falha = async (valores) => preencher(bytes, valores);
  const longo = await falha({ obs: 'ok', nome: 'x'.repeat(21) });
  assert.deepEqual([longo.erro, longo.extras.campo, longo.extras.limite], ['valor_longo', 'nome', 20]);
  assert.equal(longo.bytes, undefined);
  assert.match(mensagemDeErroDeFormulário(longo.erro, longo.extras), /O campo "nome" aceita no máximo 20 caracteres/);
  const seta = await falha({ obs: 'vai → volta' });
  assert.deepEqual([seta.erro, seta.extras.campo, seta.extras.caractere], ['valor_caractere', 'obs', '→']);
  assert.match(mensagemDeErroDeFormulário(seta.erro, seta.extras), /"→".*fonte do PDF/);
  const emoji = await falha({ obs: 'oi 😀' });
  assert.equal(emoji.erro, 'valor_caractere');
  assert.equal((await falha({ cidade: 'Lisboa' })).erro, 'opção_inexistente');
  assert.equal((await falha({ sexo: 'X' })).erro, 'opção_inexistente');
  assert.equal((await falha({ itens: ['a', 'z'] })).erro, 'opção_inexistente');
  assert.equal((await falha({ aceite: 'sim' })).erro, 'valor_inválido');
  assert.equal((await falha({ nome: 5 })).erro, 'valor_inválido');
  assert.equal((await falha({ itens: 'a' })).erro, 'valor_inválido');
  assert.deepEqual([(await falha({ fantasma: 'x' })).erro, (await falha({ fantasma: 'x' })).extras.campo], ['campo_inexistente', 'fantasma']);
});

test('texto sem limite no PDF respeita o teto de 10.000 caracteres', async () => {
  const r = await preencher(await formulário(), { obs: 'x'.repeat(LIMITE_DO_VALOR + 1) });
  assert.deepEqual([r.erro, r.extras.limite], ['valor_longo', LIMITE_DO_VALOR]);
  const ok = await preencher(await formulário(), { obs: 'x'.repeat(LIMITE_DO_VALOR) });
  assert.equal(ok.ok, true);
});

test('o texto é normalizado (acento combinado vira o caractere inteiro)', async () => {
  const r = await preencher(await formulário(), { nome: 'João' });
  assert.equal((await PDFDocument.load(r.bytes)).getForm().getTextField('nome').getText(), 'João');
});

/* ------------------------------------------- PDF sem campos e XFA */

test('PDF sem campos de formulário: a mensagem diz que não cria campos', async () => {
  const r = await ler(await pdfDeTeste(2));
  assert.deepEqual([r.ok, r.erro], [false, 'sem_campos']);
  const mensagem = mensagemDeErroDeFormulário(r.erro, r.extras);
  assert.match(mensagem, /"Ficha\.pdf" não tem campos de formulário/);
  assert.match(mensagem, /não cria campos/);
  assert.equal((await preencher(await pdfDeTeste(1), { a: 'b' })).erro, 'sem_campos');
});

/** Marca o AcroForm com a chave XFA, como os formulários de governo antigos. */
async function comXfa(bytes) {
  const documento = await PDFDocument.load(bytes);
  const acroForm = documento.catalog.lookup(PDFName.of('AcroForm'));
  acroForm.set(PDFName.of('XFA'), documento.context.obj([documento.context.obj('template'), documento.context.stream('<xdp/>')]));
  // Sem tocar em getForm(): a pdf-lib apaga o XFA assim que monta o formulário.
  return documento.save({ updateFieldAppearances: false });
}

test('formulário só XFA (sem campos) é recusado como XFA; híbrido preenche e remove o XFA', async () => {
  const puro = await PDFDocument.create();
  puro.addPage([200, 200]);
  puro.catalog.set(PDFName.of('AcroForm'), puro.context.obj({ Fields: [], XFA: [puro.context.obj('template'), puro.context.stream('<xdp/>')] }));
  const r = await ler(await puro.save());
  assert.equal(r.erro, 'formulário_xfa');
  assert.match(mensagemDeErroDeFormulário(r.erro, r.extras), /formato XFA, que esta ferramenta não suporta/);

  const híbrido = await comXfa(await formulário());
  const lido = await ler(híbrido);
  assert.deepEqual(lido.avisos, ['xfa']);
  const preenchido = await preencher(híbrido, { nome: 'Ana' });
  assert.deepEqual(preenchido.avisos, ['xfa_removido']);
  const depois = await PDFDocument.load(preenchido.bytes);
  assert.equal(depois.catalog.lookup(PDFName.of('AcroForm')).has(PDFName.of('XFA')), false);
  assert.equal(depois.getForm().getTextField('nome').getText(), 'Ana');
});

test('campos calculados geram aviso', async () => {
  const bytes = await formulário({
    extras: (documento, form, página) => {
      const assinatura = form.createTextField('placeholder');
      assinatura.addToPage(página, { x: 20, y: 100, width: 50, height: 20 });
      documento.catalog.lookup(PDFName.of('AcroForm')).set(PDFName.of('CO'), documento.context.obj([]));
    },
  });
  assert.deepEqual((await ler(bytes)).avisos, ['calculado']);
});

test('assinatura digital já existente gera aviso, e o campo de assinatura não é preenchível', async () => {
  const bytes = await formulário({
    extras: (documento, form, página) => {
      const contexto = documento.context;
      const ref = contexto.register(contexto.obj({
        Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: biblioteca.PDFString.of('assinatura'), Rect: [20, 20, 120, 60], F: 4, P: página.ref,
        V: contexto.obj({ Type: 'Sig', Filter: 'Adobe.PPKLite', SubFilter: 'adbe.pkcs7.detached' }),
      }));
      página.node.addAnnot(ref);
      form.acroForm.addField(ref);
    },
  });
  const r = await ler(bytes);
  assert.deepEqual(r.avisos, ['assinado']);
  assert.equal(r.campos.find((c) => c.nome === 'assinatura').tipo, 'assinatura');
  const gravado = await preencher(bytes, { assinatura: 'x', nome: 'Ana' });
  assert.deepEqual(gravado.ignorados, ['assinatura']);
});

/* ------------------------------------------------ entradas hostis */

test('arquivo vazio, falso, corrompido, protegido por senha e grande demais', async () => {
  assert.equal((await ler(new Uint8Array())).erro, 'arquivo_vazio');
  assert.equal((await ler(new TextEncoder().encode('só texto'))).erro, 'arquivo_nao_pdf');
  const quebrado = await ler(new TextEncoder().encode('%PDF-1.7\nconteudo quebrado'));
  assert.deepEqual([quebrado.erro, quebrado.extras.nome], ['pdf_corrompido', 'Ficha.pdf']);
  assert.equal((await ler(await pdfProtegido())).erro, 'pdf_protegido');
  assert.match(mensagemDeErroDeFormulário('pdf_protegido', { nome: 'Ficha.pdf' }), /protegido por senha/);
  const grande = new Uint8Array(TAMANHO_MÁXIMO_POR_ARQUIVO + 1);
  grande.set([0x25, 0x50, 0x44, 0x46]);
  assert.equal((await ler(grande)).erro, 'arquivo_grande_demais');
  assert.equal((await preencher(new Uint8Array(), { a: 'b' })).erro, 'arquivo_vazio');
});

test('formulário com campos demais é recusado, dizendo quantos', async () => {
  const documento = await PDFDocument.create();
  const página = documento.addPage([200, 200]);
  const form = documento.getForm();
  for (let i = 0; i <= LIMITE_DE_CAMPOS; i++) form.createTextField(`c${i}`).addToPage(página, { x: 0, y: 0, width: 10, height: 10 });
  const r = await ler(await documento.save());
  assert.deepEqual([r.erro, r.extras.total], ['campos_demais', LIMITE_DE_CAMPOS + 1]);
  assert.match(mensagemDeErroDeFormulário(r.erro, r.extras), /1\.001 campos\. O limite é 1\.000/);
});

test('nome de campo estranho, com HTML e acentos, é lido como texto puro', async () => {
  const nome = '<img src=x onerror=alert(1)> Nome do Cônjuge';
  const documento = await PDFDocument.create();
  documento.getForm().createTextField(nome).addToPage(documento.addPage([200, 200]), { x: 0, y: 0, width: 100, height: 20 });
  const r = await ler(await documento.save());
  assert.equal(r.campos[0].nome, nome);
  const gravado = await preencher(await documento.save(), { [nome]: 'ok' });
  assert.equal(gravado.ok, true);
});

test('cancelar interrompe antes de gravar, e o progresso conta campo a campo', async () => {
  const passos = [];
  await preencher(await formulário(), { nome: 'a', obs: 'b', aceite: true }, { aoProgredir: (p) => passos.push([p.campo, p.total]) });
  assert.deepEqual(passos, [[1, 3], [2, 3], [3, 3]]);
  const r = await preencher(await formulário(), { nome: 'a' }, { cancelado: () => true });
  assert.equal(r.erro, 'cancelado');
});

test('pdf.js ainda abre o PDF preenchido (arquivo íntegro)', async () => {
  const r = await preencher(await formulário(), { nome: 'Ana' });
  const abertura = await abrirComPdfjsParaTexto(r.bytes);
  assert.equal(abertura.páginas, 1);
  await abertura.fechar();
});

/* ----------------------------------------------------- ficha e tela */

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['preencher-formulario-pdf'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['baixar']);
  assert.equal(ficha.local, true);
});

test('"Como usar" traz o exemplo, o aviso de PDF sem campos, o XFA e as perguntas', () => {
  const { passos, exemplo, limites, perguntas } = ferramenta.instruções;
  assert.ok(passos.length >= 4 && perguntas.length >= 3);
  assert.match(exemplo.texto, /Ana Teste/);
  assert.match(limites, /JÁ TÊM campos/);
  assert.match(limites, /XFA/);
  assert.match(limites, /MIT/);
  assert.match(limites, /100 MB/);
});
