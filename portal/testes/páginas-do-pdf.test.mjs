/**
 * Testes da base comum das ferramentas de páginas do PDF: abrir o arquivo, ler o campo
 * "páginas" digitado por uma pessoa e montar um PDF novo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  abrirPdf, lerTrechos, interpretarPáginas, condensarPáginas, nomeBase, mensagemDeErro, montarPdfComPáginas,
  copiarMetadados, páginas, LIMITE_DO_TEXTO, LIMITE_DA_SELEÇÃO,
} from '../scripts/cálculos/páginas-do-pdf.js';
import {
  biblioteca, pdfNumerado, origensDasPáginas, pdfProtegido, bytesDeTexto,
} from './auxiliares/pdfs-de-teste.mjs';

const { PDFDocument } = biblioteca;
const ok = (r) => { assert.equal(r.ok, true, `${r.erro ?? ''} ${JSON.stringify(r.extras ?? {})}`); return r; };

/* ---------------------------------------------------------- campo "páginas" */

test('lê números, intervalos, espaços e vários separadores', () => {
  assert.deepEqual(ok(interpretarPáginas('1, 3-5, 9', 10)).páginas, [1, 3, 4, 5, 9]);
  assert.deepEqual(ok(interpretarPáginas(' 1 ,3 - 5;9 ', 10)).páginas, [1, 3, 4, 5, 9]);
  assert.deepEqual(ok(interpretarPáginas('1 3 5', 10)).páginas, [1, 3, 5]);
  assert.deepEqual(ok(interpretarPáginas('2–4', 10)).páginas, [2, 3, 4], 'travessão vale como hífen');
  assert.deepEqual(ok(interpretarPáginas('1,,3,', 10)).páginas, [1, 3], 'vírgula sobrando não atrapalha');
  assert.deepEqual(ok(interpretarPáginas('4\n6', 10)).páginas, [4, 6], 'quebra de linha separa');
});

test('ordem crescente tira repetidas; ordem digitada guarda a ordem e as repetições', () => {
  const crescente = ok(interpretarPáginas('8, 2-3, 3', 10));
  assert.deepEqual(crescente.páginas, [2, 3, 8]);
  assert.deepEqual(crescente.repetidas, [3]);
  const digitada = ok(interpretarPáginas('8, 2-3, 3', 10, { ordem: 'digitada' }));
  assert.deepEqual(digitada.páginas, [8, 2, 3, 3]);
  assert.deepEqual(digitada.repetidas, [3]);
});

test('no limite do total vale; um acima, não', () => {
  assert.deepEqual(ok(interpretarPáginas('10', 10)).páginas, [10]);
  const r = interpretarPáginas('11', 10);
  assert.equal(r.erro, 'fora_do_total');
  assert.equal(mensagemDeErro(r.erro, r.extras), 'A página 11 não existe: o PDF tem 10 páginas.');
  const intervalo = interpretarPáginas('5-11', 10);
  assert.equal(mensagemDeErro(intervalo.erro, intervalo.extras), 'O intervalo 5-11 passa do fim: o PDF tem 10 páginas.');
  assert.match(mensagemDeErro('fora_do_total', { página: 2, total: 1 }), /tem 1 página\./);
});

test('recusa vazio, texto, zero, intervalo invertido e símbolos, com a mensagem certa', () => {
  assert.equal(interpretarPáginas('', 10).erro, 'páginas_vazio');
  assert.equal(interpretarPáginas('   ', 10).erro, 'páginas_vazio');
  assert.equal(interpretarPáginas(',,', 10).erro, 'páginas_vazio');
  assert.equal(interpretarPáginas(undefined, 10).erro, 'páginas_vazio');

  for (const texto of ['abc', '1,15-20,abc', '3-', '-3', '1.5', '1/2', '2-x', '--', '1-2-3', '#1']) {
    const r = interpretarPáginas(texto, 10);
    assert.equal(r.erro, 'páginas_inválido', texto);
    assert.match(mensagemDeErro(r.erro, r.extras), /^Não entendi ".+"\. Use só números, vírgulas e hífens/, texto);
  }
  assert.equal(interpretarPáginas('abc', 10).extras.trecho, 'abc');

  const zero = interpretarPáginas('0-3', 10);
  assert.equal(zero.erro, 'página_zero');
  assert.match(mensagemDeErro(zero.erro, zero.extras), /começam em 1/);
  assert.equal(interpretarPáginas('0', 10).erro, 'página_zero');

  const invertido = interpretarPáginas('8-3', 10);
  assert.equal(invertido.erro, 'intervalo_invertido');
  assert.match(mensagemDeErro(invertido.erro, invertido.extras), /Escreva 3-8/);
});

test('entrada hostil: números gigantes, texto enorme e seleção explosiva não travam nem passam', () => {
  const gigante = interpretarPáginas('9'.repeat(400), 10);
  assert.equal(gigante.erro, 'fora_do_total');
  assert.ok(mensagemDeErro(gigante.erro, gigante.extras).length < 120, 'a mensagem não cospe 400 dígitos');
  assert.equal(interpretarPáginas(`1-${'9'.repeat(30)}`, 10).erro, 'fora_do_total');
  assert.equal(interpretarPáginas('1,'.repeat(LIMITE_DO_TEXTO), 10).erro, 'texto_longo');
  assert.equal(interpretarPáginas('x'.repeat(40), 10).extras.trecho.length, 31, 'trecho ilegível é encurtado');

  // 1-2000 repetido muitas vezes passaria do limite de itens sem passar do limite de texto.
  const repetições = Math.ceil(LIMITE_DA_SELEÇÃO / 2000) + 1;
  const explosivo = Array.from({ length: repetições }, () => '1-2000').join(', ');
  assert.ok(explosivo.length < LIMITE_DO_TEXTO);
  assert.equal(interpretarPáginas(explosivo, 2000, { ordem: 'digitada' }).erro, 'seleção_grande');
  // Em ordem crescente a mesma entrada seria barata, mas a regra vale igual: o limite é de itens pedidos.
  assert.equal(interpretarPáginas(explosivo, 2000).erro, 'seleção_grande');
});

test('lerTrechos devolve um trecho por item digitado, na ordem', () => {
  assert.deepEqual(ok(lerTrechos('1-3, 4-10, 7', 10)).trechos, [
    { de: 1, até: 3, texto: '1-3' }, { de: 4, até: 10, texto: '4-10' }, { de: 7, até: 7, texto: '7' },
  ]);
});

test('condensarPáginas escreve do jeito mais curto e mantém a ordem', () => {
  assert.equal(condensarPáginas([1, 2, 3, 7]), '1-3, 7');
  assert.equal(condensarPáginas([1, 2]), '1, 2');
  assert.equal(condensarPáginas([5]), '5');
  assert.equal(condensarPáginas([]), '');
  assert.equal(condensarPáginas([8, 2, 3, 4]), '8, 2-4');
  assert.equal(condensarPáginas([3, 2, 1]), '3, 2, 1', 'só junta sequência crescente');
});

test('propriedade: escrever a lista e ler de volta dá a mesma lista', () => {
  const listas = [[1, 2, 3, 7, 9, 10, 11, 12], [10, 9, 8, 1], [5], [1, 3, 5, 7, 9], [8, 2, 3, 4, 3]];
  for (const lista of listas) {
    const volta = ok(interpretarPáginas(condensarPáginas(lista), 12, { ordem: 'digitada' })).páginas;
    assert.deepEqual(volta, lista);
  }
});

/* ------------------------------------------------------------ abrir o arquivo */

test('abrirPdf: PDF bom devolve documento e total', async () => {
  const r = ok(await abrirPdf({ nome: 'a.pdf', bytes: await pdfNumerado(4) }, { biblioteca }));
  assert.equal(r.total, 4);
});

test('abrirPdf: vazio, falso, corrompido, protegido, sem páginas e acima do limite', async () => {
  const abrir = (nome, bytes, opções = {}) => abrirPdf({ nome, bytes }, { biblioteca, ...opções });

  const vazio = await abrir('v.pdf', new Uint8Array());
  assert.equal(vazio.erro, 'arquivo_vazio');
  assert.equal(mensagemDeErro(vazio.erro, vazio.extras), '"v.pdf" está vazio (0 bytes).');

  assert.equal((await abrir('f.pdf', bytesDeTexto('isto não é um pdf'))).erro, 'arquivo_nao_pdf');
  assert.equal((await abrir('q.pdf', bytesDeTexto('%PDF-1.7\nconteudo quebrado'))).erro, 'pdf_corrompido');
  assert.equal((await abrir('s.pdf', await pdfProtegido())).erro, 'pdf_protegido');

  // A pdf-lib sempre devolve ao menos uma página ao abrir um PDF sem páginas; a recusa
  // 'pdf_sem_páginas' fica como defesa, e a mensagem dela é conferida mais abaixo.
  const semPáginas = await PDFDocument.create();
  const aberto = await abrir('z.pdf', await semPáginas.save());
  assert.ok(aberto.ok ? aberto.total >= 1 : aberto.erro === 'pdf_sem_páginas');

  const longo = await abrir('l.pdf', await pdfNumerado(6), { limiteDePáginas: 5 });
  assert.equal(longo.erro, 'limite_de_páginas');
  assert.equal(mensagemDeErro(longo.erro, longo.extras), '"l.pdf" tem 6 páginas, e o limite desta ferramenta é 5. Separe o arquivo em partes menores antes.');
  assert.equal(ok(await abrir('l.pdf', await pdfNumerado(5), { limiteDePáginas: 5 })).total, 5, 'no limite vale');
});

test('todas as mensagens existem em português e a desconhecida cai num texto geral', () => {
  for (const código of ['arquivo_vazio', 'arquivo_nao_pdf', 'arquivo_grande_demais', 'pdf_protegido', 'pdf_corrompido', 'pdf_sem_páginas',
    'limite_de_páginas', 'sem_arquivo', 'páginas_vazio', 'texto_longo', 'páginas_inválido', 'página_zero', 'fora_do_total',
    'intervalo_invertido', 'seleção_grande', 'tudo_removido', 'nenhuma_marcada', 'saída_grande_demais', 'muitos_arquivos',
    'cancelado', 'falha_ao_montar']) {
    assert.notEqual(mensagemDeErro(código, { nome: 'x.pdf', limite: 3, total: 3, trecho: '1', de: '3', até: '2' }), 'Não foi possível processar o PDF.', código);
  }
  assert.equal(mensagemDeErro('inventado'), 'Não foi possível processar o PDF.');
  assert.match(mensagemDeErro('arquivo_grande_demais', { nome: 'g.pdf' }), /passa de 100 MB/);
});

test('páginas() e nomeBase()', () => {
  assert.equal(páginas(1), '1 página');
  assert.equal(páginas(1200), '1.200 páginas');
  assert.equal(nomeBase('Contrato Final (v2).PDF'), 'contrato-final-v2');
  assert.equal(nomeBase('Relatório São João.pdf'), 'relatorio-sao-joao');
  assert.equal(nomeBase('...pdf'), 'documento');
  assert.equal(nomeBase('', 'x'), 'x');
  assert.ok(nomeBase('a'.repeat(200)).length <= 60);
});

/* -------------------------------------------------------------- montar o PDF */

test('montarPdfComPáginas respeita a ordem e deixa o original intacto', async () => {
  const bytes = await pdfNumerado(5);
  const { documento } = ok(await abrirPdf({ nome: 'a.pdf', bytes }, { biblioteca }));
  const saída = await montarPdfComPáginas(documento, [3, 0, 0], { biblioteca });
  assert.deepEqual(await origensDasPáginas(saída), [4, 1, 1]);
  assert.equal(documento.getPageCount(), 5);
});

test('copiarMetadados leva título e autor e ignora metadado quebrado', async () => {
  const origem = await PDFDocument.create();
  origem.addPage();
  origem.setTitle('Contrato');
  origem.setAuthor('Ana');
  const destino = await PDFDocument.create();
  copiarMetadados(origem, destino);
  assert.equal(destino.getTitle(), 'Contrato');
  assert.equal(destino.getAuthor(), 'Ana');
  assert.doesNotThrow(() => copiarMetadados({ getTitle() { throw new Error('quebrado'); } }, destino));
});
