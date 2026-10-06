/**
 * Criador de gráficos (F200): leitura da tabela, escala, desenho em SVG e acessibilidade.
 *
 * Valores de referência conferidos fora do código:
 * - Contraste WCAG: preto sobre branco = 21:1; a razão vem de (L1 + 0,05)/(L2 + 0,05) com a luminância relativa da especificação.
 * - Escala agradável: de 0 a 100 com ~5 intervalos o passo é 20 (100/5 = 20, e 20 = 2 × 10¹); de -50 a 120, a largura 170 dividida
 *   em 5 dá 34, que sobe para o passo 50, e a escala vai de -50 a 150.
 * - Pizza: fatias de 50, 30 e 20 somam 100 → 50,0%, 30,0% e 20,0%.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LIMITES, TIPOS, TAMANHOS, PALETAS, ErroDeGráfico, contraste, corDoTextoSobre, lerValor, lerDados, prepararParaOTipo,
  escalaAgradável, formatarValor, formatarPorcentagem, limparTexto, desenharGráfico, tabelaDoGráfico, nomeDoArquivo,
} from '../scripts/cálculos/criador-de-graficos.js';

const recusa = (executar, padrão, campo) => assert.throws(executar, (erro) => erro instanceof ErroDeGráfico && padrão.test(erro.message) && (campo === undefined || erro.campo === campo));

/** Confere que o texto é XML bem formado: tags balanceadas, atributos entre aspas e sem "<" ou "&" soltos. */
function conferirXml(texto) {
  const semDeclaração = texto.replace(/^<\?xml[^>]*\?>\s*/, '');
  const pilha = [];
  const padrão = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/g;
  let resto = semDeclaração.trim();
  let total = 0;
  for (const m of resto.matchAll(padrão)) {
    total += m[0].length;
    if (m[5] !== undefined) {
      assert.doesNotMatch(m[5], /&(?!(amp|lt|gt|quot|apos);)/, `"&" solto em ${m[5].slice(0, 40)}`);
      continue;
    }
    const [, fecha, nome, atributos, autoFecha] = m;
    assert.doesNotMatch(atributos, /&(?!(amp|lt|gt|quot|apos);)/, `"&" solto em atributo de <${nome}>`);
    if (fecha) assert.equal(pilha.pop(), nome, `</${nome}> sem abertura correspondente`);
    else if (!autoFecha) pilha.push(nome);
  }
  assert.equal(total, resto.length, 'sobrou texto que não é tag nem conteúdo bem formado');
  assert.deepEqual(pilha, [], 'tags abertas e não fechadas');
}

const contar = (texto, padrão) => (texto.match(padrão) ?? []).length;
const EXEMPLO = 'Mês;Vendas;Custos\nJan;1000;600\nFev;1200;700\nMar;900;650';

/* ------------------------------------------------------------------ números */

test('lê número escrito por pessoa: milhar, vírgula, moeda, porcentagem e parênteses', () => {
  const casos = [['1.234,56', 1234.56], ['R$ 1.234,56', 1234.56], ['1234.56', 1234.56], ['1,5', 1.5], ['1.5', 1.5], ['12%', 12], ['(5)', -5],
    ['-7,25', -7.25], ['  42  ', 42], ['$ 10', 10], ['0', 0], ['1.000', 1000], ['1 234', 1234], ['R$\u00a02.500', 2500]];
  for (const [bruto, esperado] of casos) assert.equal(lerValor(bruto), esperado, bruto);
});

test('lacunas viram null e texto vira NaN, inclusive o que parece número para o JavaScript', () => {
  for (const vazio of ['', ' ', '-', '—', 'n/d', 'N/A', 'null']) assert.equal(lerValor(vazio), null, JSON.stringify(vazio));
  for (const ruim of ['abc', '1e5', '0x10', '1,2,3', 'Infinity', '12abc', '=1+1', '9'.repeat(30), '9'.repeat(60), '--5', '1.2.3.4']) assert.ok(Number.isNaN(lerValor(ruim)), ruim);
  assert.equal(lerValor(undefined), null);
  assert.equal(lerValor(1e15), 1e15);
  assert.ok(Number.isNaN(lerValor(String(1e16))));
});

/* ------------------------------------------------------------------ leitura da tabela */

test('lê o exemplo com cabeçalho: categorias, séries e valores', () => {
  const d = lerDados(EXEMPLO);
  assert.deepEqual(d.categorias, ['Jan', 'Fev', 'Mar']);
  assert.deepEqual(d.séries, [{ nome: 'Vendas', valores: [1000, 1200, 900] }, { nome: 'Custos', valores: [600, 700, 650] }]);
  assert.deepEqual(d.linhasLidas, [2, 3, 4]);
  assert.deepEqual(d.avisos, []);
});

test('detecta o separador (tabulação colada do Excel, vírgula, ponto e vírgula) e aceita decimal com vírgula', () => {
  assert.deepEqual(lerDados('Item\tValor\nA\t1,5\nB\t2,5').séries[0].valores, [1.5, 2.5]);
  assert.deepEqual(lerDados('Item,Valor\nA,1.5\nB,2.5').séries[0].valores, [1.5, 2.5]);
  assert.deepEqual(lerDados('Item;Valor\nA;1,5\nB;2,5').séries[0].valores, [1.5, 2.5]);
  assert.deepEqual(lerDados('Item|Valor\nA|3\nB|4').séries[0].valores, [3, 4]);
  // Quebras de linha do Windows e aspas no nome.
  assert.deepEqual(lerDados('"Loja, centro";Valor\r\n"Loja, norte";5\r\n').categorias, ['Loja, norte']);
});

test('sem cabeçalho: nomes automáticos; "sim" e "não" forçam a leitura', () => {
  const d = lerDados('A;10\nB;20');
  assert.deepEqual(d.categorias, ['A', 'B']);
  assert.equal(d.séries[0].nome, 'Série 1');
  // Primeira linha numérica forçada a cabeçalho: vira nome da série.
  assert.equal(lerDados('Nome;100\nA;5\nB;6', { cabeçalho: 'sim' }).séries[0].nome, '100');
  // Cabeçalho de texto forçado a dado dá erro apontando a célula.
  recusa(() => lerDados('Mês;Vendas\nJan;10', { cabeçalho: 'não' }), /Linha 1 \(Mês\), coluna "Série 1": "Vendas" não é um número/);
  recusa(() => lerDados('Mês;Vendas', { cabeçalho: 'auto' }), /só há uma linha, e ela é o cabeçalho/i);
});

test('uma coluna só vira a série e as categorias são numeradas', () => {
  const d = lerDados('10\n20\n30');
  assert.deepEqual(d.categorias, ['1', '2', '3']);
  assert.deepEqual(d.séries, [{ nome: 'Valores', valores: [10, 20, 30] }]);
  assert.equal(lerDados('Total\n10\n20').séries[0].nome, 'Total');
});

test('lacunas ficam como null; linhas em branco são ignoradas com aviso; coluna sem número é descartada com aviso', () => {
  const d = lerDados('Mês;A;B\nJan;1;\n\nFev;;\nMar;3;');
  assert.deepEqual(d.séries.map((s) => s.valores), [[1, null, 3]]);
  assert.match(d.avisos.join(' '), /1 linha\(s\) em branco/);
  assert.match(d.avisos.join(' '), /"B" foi ignorada/);
  // Os números das linhas contam as linhas em branco, para as mensagens apontarem o lugar certo.
  recusa(() => lerDados('Mês;A\nJan;1\n\nFev;x'), /Linha 4 \(Fev\), coluna "A": "x" não é um número/);
});

test('recusa texto onde deveria ter número, dizendo linha, coluna e o que fazer', () => {
  recusa(() => lerDados('Mês;Vendas\nJan;mil'), /Linha 2 \(Jan\), coluna "Vendas": "mil" não é um número.*só números/);
  recusa(() => lerDados('Mês;Vendas\nJan;=1+1'), /não é um número/);
  recusa(() => lerDados('Mês;Vendas\nJan;' + 'x'.repeat(500)), /não é um número/);
  // A célula citada na mensagem é cortada: texto enorme não vira mensagem enorme.
  assert.throws(() => lerDados('Mês;Vendas\nJan;' + 'x'.repeat(500)), (e) => e.message.length < 300);
});

test('recusa vazio, só espaços, só separadores e texto grande demais', () => {
  recusa(() => lerDados(''), /Cole os dados/, 'dados');
  recusa(() => lerDados('   \n  \t '), /Cole os dados/);
  recusa(() => lerDados(undefined), /Cole os dados/);
  recusa(() => lerDados(';;;\n;;;'), /em branco/);
  recusa(() => lerDados('A;\nB;'), /Não encontrei nenhum número/);
  recusa(() => lerDados('x'.repeat(LIMITES.caracteres + 1)), /passam de 1\.000\.000 caracteres/);
});

test('o limite de linhas vale no limite (aceita) e um acima (recusa)', () => {
  const linhas = (n) => `Nome;Valor\n${Array.from({ length: n }, (_, i) => `L${i};${i}`).join('\n')}`;
  assert.equal(lerDados(linhas(LIMITES.linhas)).categorias.length, LIMITES.linhas);
  recusa(() => lerDados(linhas(LIMITES.linhas + 1)), /501 linhas e o limite é 500|têm 502 linhas|limite é 500/);
});

test('o limite de séries vale: 8 passam, 9 recusam', () => {
  const colunas = (n) => `Mês;${Array.from({ length: n }, (_, i) => `S${i}`).join(';')}\nJan;${Array.from({ length: n }, () => 1).join(';')}`;
  assert.equal(lerDados(colunas(8)).séries.length, 8);
  recusa(() => lerDados(colunas(9)), /9 colunas de valores e o limite é 8/);
});

test('linhas mais curtas que as outras são completadas com lacunas, nunca com lixo', () => {
  const d = lerDados('Mês;A;B\nJan;1;2\nFev;3');
  assert.deepEqual(d.séries[1].valores, [2, null]);
});

/* ------------------------------------------------------------------ preparo por tipo */

test('barras: aceita 40 categorias e recusa 41, mandando usar linhas', () => {
  const dados = (n) => ({ categorias: Array.from({ length: n }, (_, i) => `C${i}`), séries: [{ nome: 'V', valores: Array.from({ length: n }, () => 1) }], avisos: [] });
  assert.equal(prepararParaOTipo(dados(40), 'barras').categorias.length, 40);
  recusa(() => prepararParaOTipo(dados(41), 'barras'), /41 categorias.*até 40.*gráfico de linhas/, 'tipo');
  recusa(() => prepararParaOTipo(dados(41), 'barras-horizontais'), /até 40/);
  assert.equal(prepararParaOTipo(dados(500), 'linhas').categorias.length, 500);
  recusa(() => prepararParaOTipo(dados(2), 'radar'), /tipos de gráfico/, 'tipo');
});

test('pizza: usa a primeira série, recusa negativo e soma zero, tira zeros e agrupa o excesso em "Outros"', () => {
  const base = (valores, extra = []) => ({ categorias: valores.map((_, i) => `F${i}`), séries: [{ nome: 'V', valores }, ...extra], avisos: [] });
  const duas = prepararParaOTipo(base([5, 5], [{ nome: 'W', valores: [1, 1] }]), 'pizza');
  assert.equal(duas.séries.length, 1);
  assert.match(duas.avisos.join(' '), /uma coluna só: usei "V"/);
  recusa(() => prepararParaOTipo(base([5, -1]), 'pizza'), /não aceita valores negativos \(F1: -1\)/, 'tipo');
  recusa(() => prepararParaOTipo(base([0, 0]), 'pizza'), /soma dos valores é zero/);
  recusa(() => prepararParaOTipo(base([null, null]), 'pizza'), /soma dos valores é zero/);
  const zeros = prepararParaOTipo(base([5, 0, 5]), 'pizza');
  assert.deepEqual(zeros.categorias, ['F0', 'F2']);
  assert.match(zeros.avisos.join(' '), /1 categoria\(s\) com valor 0/);

  // 10 fatias: ficam as 7 maiores (na ordem original) e "Outros" soma as 3 menores.
  const dez = prepararParaOTipo(base([1, 50, 2, 40, 30, 20, 10, 9, 8, 7]), 'pizza');
  assert.equal(dez.categorias.length, LIMITES.fatiasDaPizza);
  assert.equal(dez.categorias.at(-1), 'Outros');
  assert.deepEqual(dez.séries[0].valores, [50, 40, 30, 20, 10, 9, 8, 1 + 2 + 7]);
  // Propriedade: o agrupamento nunca muda o total.
  assert.equal(dez.séries[0].valores.reduce((a, b) => a + b, 0), [1, 50, 2, 40, 30, 20, 10, 9, 8, 7].reduce((a, b) => a + b, 0));
  // 8 fatias exatas não agrupam.
  assert.equal(prepararParaOTipo(base([1, 2, 3, 4, 5, 6, 7, 8]), 'pizza').categorias.length, 8);
});

/* ------------------------------------------------------------------ escala e formato */

test('escala agradável: passos redondos que cobrem os dados', () => {
  assert.deepEqual(escalaAgradável(0, 100).marcas, [0, 20, 40, 60, 80, 100]);
  assert.deepEqual(escalaAgradável(-50, 120).marcas, [-50, 0, 50, 100, 150]);
  assert.deepEqual(escalaAgradável(0, 1).marcas, [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.equal(escalaAgradável(0, 1).casas, 1);
  assert.equal(escalaAgradável(0, 1200).passo, 250);
  assert.equal(escalaAgradável(0, 1200).casas, 0); // passo 250: sem casas decimais
  // Mínimo igual ao máximo (um ponto só, ou tudo igual): abre uma folga em vez de dividir por zero.
  const igual = escalaAgradável(7, 7);
  assert.ok(igual.mín < 7 && igual.máx > 7 && igual.marcas.length >= 2);
  const zero = escalaAgradável(0, 0);
  assert.ok(zero.máx > zero.mín);
  // Ordem trocada, NaN e Infinity não derrubam.
  assert.deepEqual(escalaAgradável(100, 0).marcas, escalaAgradável(0, 100).marcas);
  assert.doesNotThrow(() => escalaAgradável(NaN, Infinity));
});

test('propriedade: a escala sempre cobre o intervalo, tem marcas crescentes e poucas marcas', () => {
  let semente = 99;
  const sorteio = () => { semente = (semente * 1664525 + 1013904223) >>> 0; return semente / 2 ** 32; };
  for (let i = 0; i < 300; i += 1) {
    const a = (sorteio() - 0.5) * 10 ** Math.floor(sorteio() * 12 - 3);
    const b = a + sorteio() * 10 ** Math.floor(sorteio() * 12 - 3);
    const e = escalaAgradável(a, b);
    assert.ok(e.mín <= a + 1e-6 * e.passo && e.máx >= b - 1e-6 * e.passo, `${a}..${b} → ${e.mín}..${e.máx}`);
    assert.ok(e.marcas.length >= 2 && e.marcas.length <= 13, `${e.marcas.length} marcas para ${a}..${b}`);
    for (let k = 1; k < e.marcas.length; k += 1) assert.ok(e.marcas[k] > e.marcas[k - 1]);
  }
});

test('formata valor em pt-BR, com prefixo, sufixo e forma compacta nos eixos', () => {
  assert.equal(formatarValor(1234.5), '1.234,5');
  assert.equal(formatarValor(1234.567), '1.234,57');
  assert.equal(formatarValor(1234.5, { prefixo: 'R$' }), 'R$ 1.234,5');
  assert.equal(formatarValor(12, { sufixo: '%' }), '12%');
  assert.equal(formatarValor(3, { sufixo: 'kg' }), '3 kg');
  assert.equal(formatarValor(1_500_000, { compacto: true }), '1,5 mi');
  assert.equal(formatarValor(1500, { compacto: true }), '1.500');
  assert.equal(formatarValor(0.25, { casas: 2 }), '0,25');
  assert.equal(formatarValor(-3), '-3');
  assert.equal(formatarPorcentagem(50, [50, 30, 20]), '50,0%');
  assert.equal(formatarPorcentagem(30, [50, 30, 20]), '30,0%');
  assert.equal(formatarPorcentagem(1, []), '0%');
});

test('texto livre: controles viram espaço, espaços se juntam e o tamanho é limitado', () => {
  assert.equal(limparTexto('  a\n\tb   c\u0000d ', 50), 'a b c d');
  assert.equal(limparTexto('x'.repeat(5000), 120).length, 120);
  assert.equal(limparTexto(undefined, 10), '');
  assert.equal(limparTexto(123, 10), '123');
});

/* ------------------------------------------------------------------ cores e acessibilidade */

test('o contraste segue a fórmula WCAG', () => {
  assert.ok(Math.abs(contraste('#000000', '#ffffff') - 21) < 1e-9);
  assert.ok(Math.abs(contraste('#ffffff', '#ffffff') - 1) < 1e-9);
  assert.equal(contraste('#123456', '#abcdef'), contraste('#abcdef', '#123456'));
  assert.equal(corDoTextoSobre('#ffff00'), '#111111');
  assert.equal(corDoTextoSobre('#0000aa'), '#ffffff');
});

test('toda cor de série tem 3:1 ou mais com o fundo (WCAG 1.4.11) e o texto sobre ela 4,5:1 ou mais; os textos também', () => {
  for (const [nome, p] of Object.entries(PALETAS)) {
    assert.equal(p.séries.length, 8, nome);
    assert.equal(new Set(p.séries).size, 8, `${nome}: cores repetidas`);
    for (const cor of p.séries) {
      assert.ok(contraste(cor, p.fundo) >= 3, `${nome}: ${cor} contra o fundo ${contraste(cor, p.fundo).toFixed(2)}`);
      assert.ok(contraste(cor, corDoTextoSobre(cor)) >= 4.5, `${nome}: texto sobre ${cor}`);
    }
    assert.ok(contraste(p.texto, p.fundo) >= 7, `${nome}: texto principal`);
    assert.ok(contraste(p.suave, p.fundo) >= 4.5, `${nome}: texto suave`);
    assert.ok(contraste(p.eixo, p.fundo) >= 3, `${nome}: eixo`);
  }
});

/* ------------------------------------------------------------------ desenho */

const dadosDeExemplo = () => prepararParaOTipo(lerDados(EXEMPLO), 'barras');

test('todo tipo, tamanho e fundo gera SVG bem formado, sem estilo embutido, com título, descrição e papel de imagem', () => {
  const entradas = {
    barras: lerDados(EXEMPLO), 'barras-horizontais': lerDados(EXEMPLO), linhas: lerDados(EXEMPLO), pizza: lerDados('Item;Valor\nA;50\nB;30\nC;20'),
  };
  for (const tipo of Object.keys(TIPOS)) {
    for (const tamanho of Object.keys(TAMANHOS)) {
      for (const fundo of ['claro', 'escuro']) {
        const r = desenharGráfico(prepararParaOTipo(entradas[tipo], tipo), { tipo, título: 'Vendas & custos <2026>', tamanho, fundo });
        for (const svg of [r.svg, r.svgParaArquivo]) {
          conferirXml(svg);
          assert.doesNotMatch(svg, /\sstyle=|<style|<script|javascript:|onload|href=/i);
          assert.match(svg, /role="img"/);
          assert.match(svg, /<title id="gráfico-título">Vendas &amp; custos &lt;2026&gt;<\/title>/);
          assert.match(svg, /<desc id="gráfico-descrição">/);
        }
        const { largura, altura } = TAMANHOS[tamanho];
        assert.equal([r.largura, r.altura].join('x'), `${largura}x${altura}`);
        assert.match(r.svg, new RegExp(`viewBox="0 0 ${largura} ${altura}" role="img"`));
        assert.match(r.svg, /width="100%"/);
        assert.doesNotMatch(r.svg, /<svg[^>]* height=/);
        assert.match(r.svgParaArquivo, new RegExp(`width="${largura}" height="${altura}"`));
        assert.ok(r.svgParaArquivo.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
        assert.match(r.svg, new RegExp(`<rect width="${largura}" height="${altura}" fill="${PALETAS[fundo].fundo}"/>`));
      }
    }
  }
});

test('texto hostil (tags, aspas, & e caracteres de controle) sai escapado em título, eixos, categorias e séries', () => {
  const ataque = '</text><script>alert(1)</script>"\'&';
  const d = lerDados(`"${ataque.replace(/"/g, '""')}";"${ataque.replace(/"/g, '""')}"\n"${ataque.replace(/"/g, '""')} 2";5\n"b";7`);
  const r = desenharGráfico(prepararParaOTipo(d, 'barras'), { tipo: 'barras', título: ataque, rótuloX: ataque, rótuloY: ataque, prefixo: '<b>', sufixo: '"' });
  conferirXml(r.svg);
  assert.doesNotMatch(r.svg, /<script|<\/text><script/);
  assert.match(r.svg, /&lt;script&gt;/);
  const controle = desenharGráfico(prepararParaOTipo(lerDados('A;1\nB;2'), 'barras'), { tipo: 'barras', título: 'a\u0000b\u0007c' });
  conferirXml(controle.svg);
  assert.match(controle.svg, /<title id="gráfico-título">a b c<\/title>/);
});

test('título vazio usa o nome do tipo; título gigante é cortado em 120 caracteres', () => {
  const d = prepararParaOTipo(lerDados('A;1\nB;2'), 'barras');
  assert.match(desenharGráfico(d, { tipo: 'barras' }).svg, /<title id="gráfico-título">Gráfico de barras \(verticais\)<\/title>/);
  const longo = desenharGráfico(d, { tipo: 'barras', título: 'y'.repeat(5000) }).svg;
  assert.ok(!longo.includes('y'.repeat(121)));
  assert.ok(longo.includes('y'.repeat(120)));
});

test('barras: uma barra por valor, com o valor escrito, a legenda das séries e títulos nos eixos', () => {
  const r = desenharGráfico(dadosDeExemplo(), { tipo: 'barras', título: 'Vendas', rótuloX: 'Mês', rótuloY: 'R$', valores: true });
  // 6 barras + fundo + 2 quadrados de legenda.
  assert.equal(contar(r.svg, /<rect /g), 6 + 1 + 2);
  for (const v of ['1.000', '1.200', '900', '600', '700', '650']) assert.match(r.svg, new RegExp(`>${v.replace('.', '\\.')}</text>`), v);
  assert.match(r.svg, />Vendas<\/text>/);
  assert.match(r.svg, />Custos<\/text>/);
  assert.match(r.svg, />Mês<\/text>/);
  assert.match(r.svg, /transform="rotate\(-90 /);
  assert.match(r.descrição, /barras com 3 categoria\(s\) e 2 série\(s\)/);
  assert.match(r.descrição, /Vendas: maior valor 1\.200 \(Fev\), menor 900 \(Mar\)/);
  // Sem a legenda, os quadrados somem; com uma série só, a legenda não faz falta e também some.
  assert.equal(contar(desenharGráfico(dadosDeExemplo(), { tipo: 'barras', legenda: false }).svg, /<rect /g), 6 + 1);
  assert.equal(contar(desenharGráfico(prepararParaOTipo(lerDados('A;1\nB;2'), 'barras'), { tipo: 'barras' }).svg, /<rect /g), 2 + 1);
});

test('barras empilhadas: uma barra por categoria e série, e a altura é a soma', () => {
  const d = prepararParaOTipo(lerDados('Mês;A;B\nJan;10;20\nFev;5;5'), 'barras');
  const r = desenharGráfico(d, { tipo: 'barras', empilhar: true, valores: false });
  assert.equal(contar(r.svg, /<rect /g), 4 + 1 + 2);
  assert.match(r.descrição, /empilhadas/);
  conferirXml(r.svg);
  // O eixo precisa chegar a 30 (10 + 20): há uma marca >= 30.
  assert.match(r.svg, />30<\/text>/);
});

test('valores negativos: o eixo inclui o zero e a barra fica abaixo da linha do zero', () => {
  const d = prepararParaOTipo(lerDados('A;-5\nB;10'), 'barras');
  const r = desenharGráfico(d, { tipo: 'barras', valores: false });
  assert.match(r.svg, />-5<\/text>/);
  assert.match(r.svg, />10<\/text>/);
  conferirXml(r.svg);
  const barras = [...r.svg.matchAll(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="#0b5fa5"><title>([^<]*)<\/title>/g)].map((m) => ({ y: +m[1], h: +m[2], t: m[3] }));
  assert.equal(barras.length, 2);
  const [negativa, positiva] = barras;
  // A positiva termina onde a negativa começa: a linha do zero.
  assert.ok(Math.abs(positiva.y + positiva.h - negativa.y) < 0.1, `${positiva.y + positiva.h} vs ${negativa.y}`);
  assert.ok(negativa.h > 0 && positiva.h > negativa.h);
});

test('barras horizontais: os rótulos das categorias ficam ao lado e as barras crescem para a direita', () => {
  const d = prepararParaOTipo(lerDados('Categoria longa um;30\nOutra;60'), 'barras-horizontais');
  const r = desenharGráfico(d, { tipo: 'barras-horizontais', valores: true });
  conferirXml(r.svg);
  assert.match(r.svg, /text-anchor="end"[^>]*>Categoria longa um<\/text>/);
  const larguras = [...r.svg.matchAll(/<rect x="[\d.]+" y="[\d.]+" width="([\d.]+)" height="[\d.]+" fill="#0b5fa5"/g)].map((m) => +m[1]);
  assert.equal(larguras.length, 2);
  assert.ok(Math.abs(larguras[1] / larguras[0] - 2) < 0.02, `razão ${larguras[1] / larguras[0]}`);
});

test('linhas: uma polilinha por série, marcadores de formas diferentes e lacuna interrompe a linha', () => {
  const d = prepararParaOTipo(lerDados('Mês;A;B\nJan;1;5\nFev;2;4\nMar;3;3\nAbr;4;2'), 'linhas');
  const r = desenharGráfico(d, { tipo: 'linhas', valores: false });
  assert.equal(contar(r.svg, /<polyline /g), 2);
  assert.ok(r.svg.includes('<circle'), 'a série 1 usa círculo');
  // A série 2 usa quadrado como marcador (a legenda também tem um): há 1 quadrado na legenda e 4 nos pontos, além do fundo.
  assert.equal(contar(r.svg, /<rect /g), 1 + 1 + 4 + 0 + 0 + 0, 'fundo, marcador da legenda e 4 pontos da série B');
  conferirXml(r.svg);

  // Lacuna no meio: 1, vazio, 3, 4 → um ponto solto (marcador) e uma linha de 2 pontos.
  const lacuna = prepararParaOTipo(lerDados('Mês;A\nJan;1\nFev;\nMar;3\nAbr;4'), 'linhas');
  const l = desenharGráfico(lacuna, { tipo: 'linhas', valores: false });
  assert.equal(contar(l.svg, /<polyline /g), 1);
  assert.equal(contar(l.svg, /<circle /g), 3); // um marcador por ponto: o solto e os dois da linha
  // Um ponto só: sem linha, mas com marcador.
  const um = desenharGráfico(prepararParaOTipo(lerDados('A;5'), 'linhas'), { tipo: 'linhas', valores: false });
  assert.equal(contar(um.svg, /<polyline /g), 0);
  assert.equal(contar(um.svg, /<circle /g), 1);
});

test('linhas com valores quase iguais não começam em zero e avisam; com valores espalhados, começam', () => {
  const quase = desenharGráfico(prepararParaOTipo(lerDados('A;100\nB;102\nC;101'), 'linhas'), { tipo: 'linhas', valores: false });
  assert.match(quase.avisos.join(' '), /não começa em zero/);
  const espalhado = desenharGráfico(prepararParaOTipo(lerDados('A;10\nB;100\nC;50'), 'linhas'), { tipo: 'linhas', valores: false });
  assert.deepEqual(espalhado.avisos, []);
  // Barras sempre começam em zero.
  assert.deepEqual(desenharGráfico(prepararParaOTipo(lerDados('A;100\nB;102'), 'barras'), { tipo: 'barras', valores: false }).avisos, []);
});

test('linhas com 500 pontos e 8 séries são rápidas, sem marcadores, e dão SVG bem formado de tamanho razoável', () => {
  const linhas = Array.from({ length: 500 }, (_, i) => `P${i};${Array.from({ length: 8 }, (__, s) => Math.round(Math.sin(i / 20 + s) * 100)).join(';')}`);
  const texto = `Ponto;${Array.from({ length: 8 }, (_, s) => `S${s}`).join(';')}\n${linhas.join('\n')}`;
  const inicio = performance.now();
  const r = desenharGráfico(prepararParaOTipo(lerDados(texto), 'linhas'), { tipo: 'linhas', título: 'Ondas', tamanho: 'grande' });
  assert.ok(performance.now() - inicio < 2000, 'demorou demais');
  assert.equal(contar(r.svg, /<polyline /g), 8);
  assert.ok(contar(r.svg, /<circle /g) <= 2, 'só os marcadores da legenda');
  assert.ok(r.svg.length < 1_500_000, `${r.svg.length} bytes`);
  // Muitos pontos: os valores não cabem e a mensagem diz isso. Os rótulos do eixo X ficam espaçados, sem se sobrepor.
  assert.match(r.avisos.join(' '), /omitidos/);
  assert.ok(contar(r.svg, /fill="#4b5563"[^>]*>P\d+<\/text>/g) < 60);
  conferirXml(r.svg);
});

test('pizza: uma fatia por categoria, com porcentagem e legenda; 100% vira círculo', () => {
  const d = prepararParaOTipo(lerDados('Item;Valor\nA;50\nB;30\nC;20'), 'pizza');
  const r = desenharGráfico(d, { tipo: 'pizza', título: 'Partes' });
  assert.equal(contar(r.svg, /<path /g), 3);
  for (const t of ['50,0%', '30,0%', '20,0%']) assert.ok(r.svg.includes(`>${t}</text>`), t);
  assert.match(r.svg, />A: 50,0%<\/text>/);
  assert.match(r.descrição, /Maior fatia: A \(50,0%\)/);
  assert.match(r.descrição, /Total: 100/);
  conferirXml(r.svg);
  const único = desenharGráfico(prepararParaOTipo(lerDados('Item;Valor\nA;7'), 'pizza'), { tipo: 'pizza' });
  assert.equal(contar(único.svg, /<path /g), 0);
  assert.ok(único.svg.includes('<circle'));
  conferirXml(único.svg);
  // Fatias de menos de 5% não ganham texto sobre elas (só na legenda).
  const pequena = desenharGráfico(prepararParaOTipo(lerDados('A;97\nB;3'), 'pizza'), { tipo: 'pizza' });
  assert.ok(pequena.svg.includes('>97,0%</text>'));
  assert.equal(contar(pequena.svg, />3,0%<\/text>/g), 0, 'a fatia pequena não ganha texto');
  assert.ok(pequena.svg.includes('>B: 3,0%</text>'), 'a legenda cita a fatia');
  // Legenda da pizza não desliga: sem ela, as cores não dizem nada.
  assert.ok(desenharGráfico(d, { tipo: 'pizza', legenda: false }).svg.includes('>A: 50,0%</text>'));
});

test('pizza: a soma dos ângulos fecha a volta (a última fatia termina onde a primeira começa)', () => {
  const d = prepararParaOTipo(lerDados('A;1\nB;2\nC;3\nD;4'), 'pizza');
  const r = desenharGráfico(d, { tipo: 'pizza', valores: false });
  const caminhos = [...r.svg.matchAll(/<path d="M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)A([\d.]+) [\d.]+ 0 [01] 1 ([\d.]+) ([\d.]+)Z"/g)].map((m) => m.slice(1).map(Number));
  assert.equal(caminhos.length, 4);
  // O fim de cada fatia é o começo da próxima.
  for (let i = 0; i < 3; i += 1) {
    assert.ok(Math.abs(caminhos[i][5] - caminhos[i + 1][2]) < 0.02 && Math.abs(caminhos[i][6] - caminhos[i + 1][3]) < 0.02, `fatia ${i}`);
  }
  assert.ok(Math.abs(caminhos[3][5] - caminhos[0][2]) < 0.02 && Math.abs(caminhos[3][6] - caminhos[0][3]) < 0.02, 'a volta fecha');
});

test('valores que não cabem são omitidos todos juntos, com aviso; cabendo, aparecem todos', () => {
  const nomes = Array.from({ length: 40 }, (_, i) => `Categoria ${i}`);
  const muitas = prepararParaOTipo(lerDados(`Nome;V\n${nomes.map((n, i) => `${n};${1_000_000 + i}`).join('\n')}`), 'barras');
  const r = desenharGráfico(muitas, { tipo: 'barras', valores: true, tamanho: 'pequeno' });
  assert.match(r.avisos.join(' '), /não cabem escritos sobre as barras/);
  assert.equal(contar(r.svg, /fill="#1a1a1a"[^>]*>[\d.]+<\/text>/g), 0, 'nenhum valor escrito');
  conferirXml(r.svg);
  const poucas = desenharGráfico(dadosDeExemplo(), { tipo: 'barras', valores: true, tamanho: 'médio' });
  assert.deepEqual(poucas.avisos, []);
  assert.equal(contar(poucas.svg, /fill="#1a1a1a"[^>]*>[\d.]+<\/text>/g), 6);
  // Desligado: nada escrito, sem aviso.
  const semValores = desenharGráfico(dadosDeExemplo(), { tipo: 'barras', valores: false });
  assert.equal(contar(semValores.svg, /fill="#1a1a1a"[^>]*>[\d.]+<\/text>/g), 0);
  assert.deepEqual(semValores.avisos, []);
});

test('rótulos de categoria longos giram no eixo e são abreviados com reticências', () => {
  const d = prepararParaOTipo(lerDados(`Nome;V\n${Array.from({ length: 12 }, (_, i) => `Departamento de Operações ${i}`).join(';1\n')};1`), 'barras');
  const r = desenharGráfico(d, { tipo: 'barras', valores: false });
  assert.match(r.svg, /transform="rotate\(-40 /);
  assert.match(r.svg, /Departamento de …|Departamento de O…/);
  conferirXml(r.svg);
});

test('opções inválidas são recusadas com a mensagem no campo certo', () => {
  const d = dadosDeExemplo();
  recusa(() => desenharGráfico(d, { tipo: 'radar' }), /tipos de gráfico/, 'tipo');
  recusa(() => desenharGráfico(d, { tipo: 'barras', tamanho: 'gigante' }), /tamanhos/, 'tamanho');
  recusa(() => desenharGráfico(d, { tipo: 'barras', fundo: 'rosa' }), /fundo/, 'fundo');
  assert.doesNotThrow(() => desenharGráfico(d, { tipo: 'barras', título: null, rótuloX: undefined, prefixo: 5 }));
});

test('valores gigantes, minúsculos e todos iguais desenham sem NaN nem Infinity', () => {
  for (const texto of ['A;1000000000000000\nB;999999999999999', 'A;0,000001\nB;0,000002', 'A;5\nB;5\nC;5', 'A;0\nB;0']) {
    for (const tipo of ['barras', 'barras-horizontais', 'linhas']) {
      const r = desenharGráfico(prepararParaOTipo(lerDados(texto), tipo), { tipo });
      assert.doesNotMatch(r.svg, /NaN|Infinity|undefined/, `${texto} / ${tipo}`);
      conferirXml(r.svg);
    }
  }
});

/* ------------------------------------------------------------------ tabela e arquivo */

test('a tabela equivalente traz os mesmos números do gráfico, formatados', () => {
  const t = tabelaDoGráfico(lerDados(EXEMPLO), 'barras', { prefixo: 'R$', rótuloDasCategorias: 'Mês' });
  assert.deepEqual(t.cabeçalho, ['Mês', 'Vendas', 'Custos']);
  assert.deepEqual(t.linhas[0], ['Jan', 'R$ 1.000', 'R$ 600']);
  const lacuna = tabelaDoGráfico(lerDados('Mês;A\nJan;1\nFev;\nMar;3'), 'linhas');
  assert.deepEqual(lacuna.linhas[1], ['Fev', '']);
  assert.equal(lacuna.cabeçalho[0], 'Categoria');
  const pizza = tabelaDoGráfico(prepararParaOTipo(lerDados('Item;Valor\nA;50\nB;50'), 'pizza'), 'pizza');
  assert.deepEqual(pizza.cabeçalho, ['Categoria', 'Valor', 'Participação']);
  assert.deepEqual(pizza.linhas, [['A', '50', '50,0%'], ['B', '50', '50,0%']]);
});

test('o nome do arquivo sai do título, sem acento nem caracteres perigosos', () => {
  assert.equal(nomeDoArquivo('Vendas do 1º Semestre!', 'png'), 'vendas-do-1-semestre.png');
  assert.equal(nomeDoArquivo('', 'svg'), 'grafico.svg');
  assert.equal(nomeDoArquivo('../../etc/passwd', 'svg'), 'etc-passwd.svg');
  assert.equal(nomeDoArquivo('a'.repeat(300), 'png').length, 60 + 4);
  assert.equal(nomeDoArquivo(undefined, 'png'), 'grafico.png');
});

test('linhas: os valores só são escritos quando nenhum rótulo encosta em outro rótulo ou em outro ponto', () => {
  const juntas = desenharGráfico(prepararParaOTipo(lerDados('Mês;A;B\nJan;100;101\nFev;110;111\nMar;120;121'), 'linhas'), { tipo: 'linhas', valores: true, tamanho: 'médio' });
  assert.match(juntas.avisos.join(' '), /não cabem escritos sobre os pontos/);
  assert.equal(contar(juntas.svg, /fill="#1a1a1a"[^>]*>1\d\d<\/text>/g), 0);
  const separadas = desenharGráfico(prepararParaOTipo(lerDados('Mês;A\nJan;10\nFev;50\nMar;20'), 'linhas'), { tipo: 'linhas', valores: true, tamanho: 'médio' });
  assert.deepEqual(separadas.avisos, []);
  assert.equal(contar(separadas.svg, /fill="#1a1a1a"[^>]*>(10|50|20)<\/text>/g), 3);
});
