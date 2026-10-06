/**
 * Converter planilha (F199): CSV, TSV, JSON e XLSX.
 *
 * Conferido à mão, fora do código:
 * - "ação" em Windows-1252 são os bytes E7 E3 6F (ç = E7, ã = E3); em UTF-8 seriam C3 A7 C3 A3 6F.
 * - O número do JavaScript guarda 15 dígitos decimais sem perda (2^53 = 9.007.199.254.740.992 tem 16 dígitos e já falha),
 *   por isso "123456789012345" (15) vira número e "1234567890123456" (16) continua texto.
 * - Um XLSX é um ZIP; como o gerador do portal grava sem compressão, o texto do XML aparece nos bytes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LIMITES, ErroDePlanilha, recusarSeNãoForTexto, decodificarTexto, detectarFormato, lerTabela, converterTabela,
  inferirTipo, nomesÚnicos, contarFórmulasProtegidas,
} from '../scripts/cálculos/converter-planilha.js';
import { converterNaTela } from '../scripts/ferramentas/converter-planilha.js';
import { ErroDeEntrada } from '../scripts/núcleo/montador.js';

const QUEBRA = String.fromCharCode(10);
const linhasDe = (...l) => l.join(QUEBRA);
const bytes = (...b) => new Uint8Array(b);
const textoDe = (b) => new TextDecoder('latin1').decode(b);

function recusaDe(executar) {
  try {
    executar();
  } catch (erro) {
    return erro;
  }
  return assert.fail('era esperada uma recusa');
}

const csv = linhasDe('nome;cidade;cep', 'Ana;São Paulo;01310-000', 'Bruno;Recife;50030-230');

/* ------------------------------------------------------------------ o exemplo e as conversões */

test('CSV para JSON: lista de objetos, com o CEP mantido como texto', () => {
  const tabela = lerTabela(csv, { formato: 'csv' });
  assert.deepEqual(tabela.cabeçalho, ['nome', 'cidade', 'cep']);
  assert.equal(tabela.linhas.length, 2);
  const { texto } = converterTabela(tabela, { formato: 'json' });
  assert.deepEqual(JSON.parse(texto), [
    { nome: 'Ana', cidade: 'São Paulo', cep: '01310-000' },
    { nome: 'Bruno', cidade: 'Recife', cep: '50030-230' },
  ]);
});

test('CSV, TSV, JSON e lista de listas: a ida e a volta devolvem as mesmas células', () => {
  const original = lerTabela(csv, { formato: 'csv' });
  for (const formato of ['csv', 'tsv', 'json', 'json-linhas']) {
    const { texto } = converterTabela(original, { formato });
    const lido = lerTabela(texto.replace(/^\uFEFF/, ''), { formato: formato === 'json-linhas' ? 'json' : formato });
    assert.deepEqual(lido.cabeçalho, original.cabeçalho, formato);
    assert.deepEqual(lido.linhas, original.linhas, formato);
  }
});

test('JSON para CSV: une os campos de todos os objetos, objeto aninhado vira JSON e null vira vazio', () => {
  const json = JSON.stringify([{ a: 1, b: 'x' }, { b: null, c: { d: 1 } }, { a: true }]);
  const tabela = lerTabela(json, { formato: 'json' });
  assert.deepEqual(tabela.cabeçalho, ['a', 'b', 'c']);
  assert.deepEqual(tabela.linhas, [[1, 'x', ''], ['', '', '{"d":1}'], [true, '', '']]);
  const { texto } = converterTabela(tabela, { formato: 'csv', comBom: false });
  assert.equal(texto, linhasDe('a;b;c', '1;x;', ';;"{""d"":1}"', 'true;;').replace(/\n/g, '\r\n'));
});

test('JSON de um objeto só e JSON de lista de listas', () => {
  assert.deepEqual(lerTabela('{"x":1,"y":2}', { formato: 'json' }).linhas, [[1, 2]]);
  const listas = lerTabela('[["n","v"],["a",1],["b"]]', { formato: 'json' });
  assert.deepEqual(listas.cabeçalho, ['n', 'v']);
  assert.deepEqual(listas.linhas, [['a', 1], ['b', '']]);
  assert.match(listas.avisos[0], /1 linha\(s\) tinham menos colunas/);
  const semCabeçalho = lerTabela('[["n","v"],["a",1]]', { formato: 'json', comCabeçalho: false });
  assert.equal(semCabeçalho.cabeçalho, null);
  assert.equal(semCabeçalho.linhas.length, 2);
});

test('sem cabeçalho: o JSON de objetos usa colunaN e o CSV mantém a primeira linha como dado', () => {
  const tabela = lerTabela(linhasDe('a;b', 'c;d'), { formato: 'csv', comCabeçalho: false });
  assert.equal(tabela.cabeçalho, null);
  assert.equal(tabela.linhas.length, 2);
  assert.deepEqual(JSON.parse(converterTabela(tabela, { formato: 'json' }).texto)[0], { coluna1: 'a', coluna2: 'b' });
  assert.deepEqual(JSON.parse(converterTabela(tabela, { formato: 'json-linhas' }).texto), [['a', 'b'], ['c', 'd']]);
});

test('separadores: detecta ponto e vírgula, vírgula, tabulação e barra; aspas com quebra de linha dentro', () => {
  for (const sep of [';', ',', '\t', '|']) {
    const tabela = lerTabela(linhasDe(['a', 'b'].join(sep), ['1', '2'].join(sep)), { formato: 'csv' });
    assert.deepEqual(tabela.linhas, [['1', '2']], JSON.stringify(sep));
  }
  const comQuebra = lerTabela(`a;b${QUEBRA}"linha 1${QUEBRA}linha 2";"com ""aspas"""`, { formato: 'csv' });
  assert.deepEqual(comQuebra.linhas, [[`linha 1${QUEBRA}linha 2`, 'com "aspas"']]);
  const tsv = lerTabela(linhasDe('a\tb', '1\t2'), { formato: 'tsv' });
  assert.deepEqual(tsv.linhas, [['1', '2']]);
  // Separador escolhido à mão vale mesmo contra a detecção.
  assert.deepEqual(lerTabela(linhasDe('a,b;c', '1,2;3'), { formato: 'csv', separador: ';' }).cabeçalho, ['a,b', 'c']);
});

test('cabeçalho vazio ou repetido ganha nome único', () => {
  assert.deepEqual(nomesÚnicos(['a', 'a', '', 'a', ' b ', 'b']), ['a', 'a_2', 'coluna3', 'a_3', 'b', 'b_2']);
  const json = JSON.parse(converterTabela(lerTabela(linhasDe('x;x', '1;2'), { formato: 'csv' }), { formato: 'json' }).texto);
  assert.deepEqual(json, [{ x: '1', x_2: '2' }]);
});

test('linhas com número de colunas diferente são completadas, e a tela avisa quantas', () => {
  const tabela = lerTabela(linhasDe('a;b;c', '1;2', '3;4;5;6'), { formato: 'csv' });
  assert.equal(tabela.colunas, 4);
  assert.deepEqual(tabela.linhas, [['1', '2', '', ''], ['3', '4', '5', '6']]);
  assert.match(tabela.avisos[0], /2 linha\(s\)/);
});

/* ------------------------------------------------------------------ tipos */

test('detectar tipos: só número limpo vira número; zero à esquerda, vírgula, notação científica e 16 dígitos ficam texto', () => {
  const casos = [
    ['30', 30], ['-5.5', -5.5], ['0', 0], ['0.25', 0.25], ['123456789012345', 123456789012345],
    ['007', '007'], ['01310-000', '01310-000'], ['1e5', '1e5'], ['1,5', '1,5'], ['+5', '+5'], ['1234567890123456', '1234567890123456'],
    ['.5', '.5'], ['5.', '5.'], ['', ''], [' 5', ' 5'], ['0x10', '0x10'], ['Infinity', 'Infinity'], ['true', true], ['false', false], ['True', 'True'],
  ];
  for (const [entrada, esperado] of casos) assert.equal(inferirTipo(entrada), esperado, JSON.stringify(entrada));
  assert.equal(inferirTipo(5), 5);
  assert.equal(inferirTipo(true), true);
});

test('com "converter tipos" o JSON sai com números; sem ele, tudo texto; o que já era número no JSON continua número', () => {
  const tabela = lerTabela(linhasDe('id;ativo;cep', '12;true;01310-000'), { formato: 'csv' });
  assert.deepEqual(JSON.parse(converterTabela(tabela, { formato: 'json' }).texto), [{ id: '12', ativo: 'true', cep: '01310-000' }]);
  assert.deepEqual(JSON.parse(converterTabela(tabela, { formato: 'json', detectarTipos: true }).texto), [{ id: 12, ativo: true, cep: '01310-000' }]);
  const doJson = lerTabela('[{"n":5,"s":"5"}]', { formato: 'json' });
  assert.deepEqual(JSON.parse(converterTabela(doJson, { formato: 'json' }).texto), [{ n: 5, s: '5' }]);
});

/* ------------------------------------------------------------------ codificação e arquivo */

test('codificação: UTF-8 com e sem BOM, Windows-1252 (CSV do Excel) e UTF-16', () => {
  assert.deepEqual(decodificarTexto(bytes(0xEF, 0xBB, 0xBF, 0x61, 0xC3, 0xA7)), { texto: 'aç', codificação: 'UTF-8' });
  assert.deepEqual(decodificarTexto(bytes(0x61, 0xC3, 0xA7, 0xC3, 0xA3, 0x6F)), { texto: 'ação', codificação: 'UTF-8' });
  assert.deepEqual(decodificarTexto(bytes(0xE7, 0xE3, 0x6F)), { texto: 'ção', codificação: 'Windows-1252' });
  assert.deepEqual(decodificarTexto(bytes(0xFF, 0xFE, 0x61, 0x00, 0xE7, 0x00)), { texto: 'aç', codificação: 'UTF-16' });
  assert.deepEqual(decodificarTexto(bytes(0xFE, 0xFF, 0x00, 0x61)), { texto: 'a', codificação: 'UTF-16' });
});

test('o que não é texto é recusado dizendo o que é', () => {
  assert.match(recusarSeNãoForTexto(bytes(0x50, 0x4B, 3, 4, 0)), /ZIP \(XLSX, ODS/);
  assert.match(recusarSeNãoForTexto(bytes(0xD0, 0xCF, 0x11, 0xE0)), /XLS/);
  assert.match(recusarSeNãoForTexto(bytes(0x25, 0x50, 0x44, 0x46, 0x2D)), /PDF/);
  assert.match(recusarSeNãoForTexto(bytes(0x89, 0x50, 0x4E, 0x47)), /imagem/);
  assert.match(recusarSeNãoForTexto(bytes(0x61, 0, 0x62, 0)), /binário/);
  assert.match(recusarSeNãoForTexto(new Uint8Array(0)), /vazio/);
  assert.equal(recusarSeNãoForTexto(bytes(0x61, 0x3B, 0x62)), null);
  assert.equal(recusarSeNãoForTexto(bytes(0xFF, 0xFE, 0x61, 0)), null, 'UTF-16 tem zeros e é texto');
});

test('formato detectado pela extensão e, sem ela, pelo conteúdo', () => {
  assert.equal(detectarFormato('a;b', 'dados.json'), 'json');
  assert.equal(detectarFormato('{"a":1}', 'dados.csv'), 'csv');
  assert.equal(detectarFormato('a;b', 'x.TSV'), 'tsv');
  assert.equal(detectarFormato('[{"a":1}]'), 'json');
  assert.equal(detectarFormato('[não é json;b'), 'csv');
  assert.equal(detectarFormato(`a\tb${QUEBRA}1\t2`), 'tsv');
  assert.equal(detectarFormato(`a;b${QUEBRA}1;2`), 'csv');
});

/* ------------------------------------------------------------------ fórmulas e XLSX */

test('CSV de saída protege célula que começa como fórmula e conta quantas; número negativo não é tocado', () => {
  const tabela = lerTabela(linhasDe('a;b', '=1+1;-5', '@SOMA(A1);+x', '-1,5;ok'), { formato: 'csv' });
  assert.equal(contarFórmulasProtegidas(tabela), 3);
  const { texto } = converterTabela(tabela, { formato: 'csv', comBom: false });
  const linhas = texto.split('\r\n');
  assert.equal(linhas[1], "'=1+1;-5");
  assert.equal(linhas[2], "'@SOMA(A1);'+x");
  assert.equal(linhas[3], '"-1,5";ok'); // "-1,5" é número escrito à brasileira: preservado (e entre aspas por causa da vírgula)
  const tsv = converterTabela(tabela, { formato: 'tsv', comBom: false }).texto;
  assert.ok(tsv.includes("'=1+1\t-5"));
});

test('XLSX: é um ZIP com a aba, o cabeçalho, os números como números e texto que parece fórmula como texto', () => {
  const tabela = lerTabela(linhasDe('id;nome', '12;=HYPERLINK("x")', '007;Ana & <Cia>'), { formato: 'csv' });
  const { bytes: xlsx } = converterTabela(tabela, { formato: 'xlsx', detectarTipos: true, nomeDaAba: 'Clientes: 2026/10?' });
  assert.equal(String.fromCharCode(xlsx[0], xlsx[1]), 'PK');
  const xml = textoDe(xlsx);
  for (const trecho of ['xl/worksheets/sheet1.xml', '<v>12</v>', 'HYPERLINK', 'Ana &amp; &lt;Cia&gt;', '>007<', 'name="Clientes  2026 10"']) {
    assert.ok(xml.includes(trecho), `faltou ${trecho}`);
  }
  assert.ok(!xml.includes('<f>'), 'nada vira fórmula');
});

test('XLSX: recusa planilha com células demais e célula maior que a do Excel', () => {
  const grande = { cabeçalho: ['a'], linhas: Array.from({ length: 1000 }, () => ['x']), colunas: 1001, avisos: [] };
  assert.match(recusaDe(() => converterTabela(grande, { formato: 'xlsx' })).message, /células/);
  const longa = { cabeçalho: null, linhas: [['x'.repeat(LIMITES.célula + 1)]], colunas: 1, avisos: [] };
  assert.match(recusaDe(() => converterTabela(longa, { formato: 'xlsx' })).message, /32\.767/);
  assert.doesNotThrow(() => converterTabela({ ...longa, linhas: [['x'.repeat(LIMITES.célula)]] }, { formato: 'xlsx' }));
  assert.equal(recusaDe(() => converterTabela(longa, { formato: 'pdf' })).campo, 'saída');
});

/* ------------------------------------------------------------------ entradas hostis */

test('vazio, só espaços, JSON inválido, JSON que não é tabela e lista vazia', () => {
  assert.equal(recusaDe(() => lerTabela('', { formato: 'csv' })).campo, 'conteúdo');
  assert.match(recusaDe(() => lerTabela('   ', { formato: 'csv' })).message, /vazio/);
  assert.match(recusaDe(() => lerTabela('{"a":', { formato: 'json' })).message, /JSON inválido/);
  assert.match(recusaDe(() => lerTabela('[1,2,3]', { formato: 'json' })).message, /lista de objetos ou uma lista de listas/);
  assert.match(recusaDe(() => lerTabela('"texto"', { formato: 'json' })).message, /lista de objetos/);
  assert.match(recusaDe(() => lerTabela('[]', { formato: 'json' })).message, /lista vazia/);
  assert.match(recusaDe(() => lerTabela('[{"a":1}, 3]', { formato: 'json' })).message, /lista de objetos/);
  assert.match(recusaDe(() => lerTabela('a;b', { formato: 'csv' })).message, /Só há uma linha, e ela é o cabeçalho/);
});

test('limites: 501 colunas, 200.001 linhas e JSON profundíssimo', () => {
  assert.match(recusaDe(() => lerTabela(Array.from({ length: 501 }, (_, i) => `c${i}`).join(';'), { formato: 'csv', comCabeçalho: false })).message, /501 colunas/);
  assert.equal(lerTabela(Array.from({ length: 500 }, (_, i) => `c${i}`).join(';'), { formato: 'csv', comCabeçalho: false }).colunas, 500);
  assert.match(recusaDe(() => lerTabela(Array(LIMITES.linhas + 1).fill('a').join(QUEBRA), { formato: 'csv', comCabeçalho: false })).message, /200\.001 linhas/);
  assert.equal(lerTabela(Array(LIMITES.linhas).fill('a').join(QUEBRA), { formato: 'csv', comCabeçalho: false }).linhas.length, LIMITES.linhas);
  const fundo = recusaDe(() => lerTabela('['.repeat(200000), { formato: 'json' }));
  assert.ok(fundo instanceof ErroDePlanilha);
  assert.match(fundo.message, /JSON/);
  const objetos = JSON.stringify(Array.from({ length: 2 }, () => Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`k${i}`, i]))));
  assert.equal(lerTabela(objetos, { formato: 'json' }).colunas, 300);
  const largo = JSON.stringify([Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`k${i}`, i]))]);
  assert.match(recusaDe(() => lerTabela(largo, { formato: 'json' })).message, /501 colunas/);
});

test('coluna chamada __proto__ vira campo comum no JSON, sem mexer no protótipo', () => {
  const tabela = lerTabela(linhasDe('__proto__;constructor;a', 'x;y;z'), { formato: 'csv' });
  const objeto = JSON.parse(converterTabela(tabela, { formato: 'json' }).texto)[0];
  assert.equal(Object.getPrototypeOf(objeto), Object.prototype);
  assert.equal(({}).x, undefined);
  assert.equal(Object.keys(objeto).length, 3);
  assert.equal(objeto.constructor, 'y');
  const textoJson = converterTabela(tabela, { formato: 'json' }).texto;
  assert.ok(textoJson.includes('"__proto__": "x"'));
});

test('muitas linhas convertem em tempo razoável', () => {
  const linhas = ['id;nome;valor;cidade;obs', ...Array.from({ length: 50_000 }, (_, i) => `${i};Nome ${i};${i * 1.5};São Paulo;"a;b"`)].join(QUEBRA);
  const t0 = performance.now();
  const tabela = lerTabela(linhas, { formato: 'csv' });
  assert.equal(tabela.linhas.length, 50_000);
  converterTabela(tabela, { formato: 'json' });
  converterTabela(tabela, { formato: 'csv' });
  assert.ok(performance.now() - t0 < 8000, 'conversão de 50 mil linhas');
});

/* ------------------------------------------------------------------ a tela */

test('a tela: resumo, prévia, arquivo gerado e avisos, para CSV colado em JSON', () => {
  const r = converterNaTela({ texto: csv, formatoDeSaída: 'json' });
  assert.equal(r.valor, '2 linhas × 3 colunas');
  assert.match(r.resumo, /CSV para JSON \(lista de objetos\), com a primeira linha como cabeçalho/);
  assert.deepEqual(r.tabela.cabeçalho, ['nome', 'cidade', 'cep']);
  assert.equal(r.tabela.linhas.length, 2);
  assert.equal(r.arquivoGerado.nome, 'planilha.json');
  assert.equal(r.arquivos[0].rótulo, 'Baixar JSON');
  assert.ok(r.observações.some((o) => /saem como texto/.test(o)));
  assert.ok(r.observações.some((o) => /nada foi enviado/.test(o)));
  assert.equal(JSON.parse(r.texto)[0].cep, '01310-000');
});

test('a tela com arquivo em Windows-1252: acentos preservados, nome do arquivo de saída e aviso de codificação', () => {
  const cp1252 = bytes(...[...'cidade;nota'].map((c) => c.charCodeAt(0)), 10, 0x53, 0xE3, 0x6F, 0x20, 0x50, 0x61, 0x75, 0x6C, 0x6F, 0x3B, 0x31, 0x30);
  const r = converterNaTela({ bytes: cp1252, nome: 'Relatório Final.csv', formatoDeSaída: 'csv', separadorDeSaída: ',' });
  assert.equal(r.arquivoGerado.nome, 'relatorio-final.csv');
  assert.ok(r.texto.includes('São Paulo'));
  assert.ok(r.observações.some((o) => /Windows-1252/.test(o)));
  assert.ok(r.texto.startsWith('\uFEFF'), 'BOM por padrão');
  assert.ok(!converterNaTela({ bytes: cp1252, nome: 'x.csv', formatoDeSaída: 'csv', comBom: false }).texto.startsWith('\uFEFF'));
});

test('a tela para XLSX: o texto copiado é a tabela em TSV e há aviso de que só os valores vão', () => {
  const r = converterNaTela({ texto: csv, formatoDeSaída: 'xlsx', detectarTipos: true });
  assert.equal(r.arquivoGerado.nome, 'planilha.xlsx');
  assert.ok(r.arquivoGerado.conteúdo instanceof Uint8Array);
  assert.ok(r.texto.startsWith('nome\tcidade\tcep'));
  assert.ok(r.observações.some((o) => /só os valores/.test(o)));
});

test('a tela: avisa das fórmulas protegidas e mostra só parte da prévia quando é grande', () => {
  const grande = ['a;b', ...Array.from({ length: 30 }, (_, i) => `=${i};x`)].join(QUEBRA);
  const r = converterNaTela({ texto: grande, formatoDeSaída: 'csv' });
  assert.equal(r.tabela.linhas.length, 20);
  assert.ok(r.observações.some((o) => /20 primeiras linhas/.test(o)));
  assert.ok(r.observações.some((o) => /30 células começavam com =, \+, - ou @/.test(o)));
});

test('a tela: erros no campo certo', () => {
  const caso = (entrada) => recusaDe(() => converterNaTela({ formatoDeSaída: 'json', ...entrada }));
  let erro = caso({ texto: '' });
  assert.ok(erro instanceof ErroDeEntrada);
  assert.equal(erro.campo, 'conteúdo');
  assert.equal(caso({ bytes: bytes(0x50, 0x4B, 3, 4), nome: 'a.xlsx' }).campo, 'arquivo');
  assert.equal(caso({ bytes: new Uint8Array(0), nome: 'a.csv' }).campo, 'arquivo');
  assert.equal(caso({ bytes: new TextEncoder().encode('{"a":'), nome: 'a.json' }).campo, 'arquivo');
  erro = caso({ texto: '{"a":', formatoDeEntrada: 'json' });
  assert.equal(erro.campo, 'conteúdo');
  assert.match(erro.message, /JSON inválido/);
  assert.equal(caso({ texto: csv, formatoDeSaída: 'xml' }).campo, 'saída');
});
