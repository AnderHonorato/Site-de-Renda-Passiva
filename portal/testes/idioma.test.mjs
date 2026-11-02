/** Testes de idioma (Onda 1): dicionários, tradutor, marcação mínima e catálogo em inglês. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pt from '../dados/traduções/pt.js';
import en from '../dados/traduções/en.js';
import jsPt from '../dados/traduções/js-pt.js';
import jsEn from '../dados/traduções/js-en.js';
import catálogoEn from '../dados/traduções/en/catálogo.js';
import categoriasEn from '../dados/traduções/en/categorias.js';
import { categorias, tarefas } from '../dados/categorias.js';
import { ferramentas } from '../dados/catálogo.js';
import { criarTradutor, chavesDe, parâmetrosDe, preencher, lista } from '../scripts/núcleo/traduzir.js';
import { blocosEmHtml, emLinha } from '../scripts/núcleo/texto-rico.js';
import { códigosDeIdioma, idiomas, normalizarIdioma } from '../dados/idiomas.js';

/** Nomes que são a mesma palavra nos dois idiomas. */
const PALAVRAS_IGUAIS = new Set(['F119']);

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

function valorDe(dicionário, chave) {
  return chave.split('.').reduce((atual, parte) => atual[parte], dicionário);
}

/** Confere que os dois dicionários têm as mesmas chaves, os mesmos {parâmetros} e nenhum texto vazio. */
function conferirParidade(nome, base, outro) {
  const chavesBase = chavesDe(base);
  assert.deepEqual(chavesDe(outro), chavesBase, `${nome}: as chaves dos dois idiomas precisam ser as mesmas`);
  for (const chave of chavesBase) {
    const a = valorDe(base, chave);
    const b = valorDe(outro, chave);
    assert.equal(Array.isArray(a), Array.isArray(b), `${nome}.${chave}: texto num idioma e lista no outro`);
    if (Array.isArray(a)) assert.equal(a.length, b.length, `${nome}.${chave}: listas de tamanhos diferentes`);
    for (const texto of [a, b].flat()) assert.ok(typeof texto === 'string' && texto.trim().length > 0, `${nome}.${chave}: texto vazio`);
    assert.deepEqual(parâmetrosDe(b), parâmetrosDe(a), `${nome}.${chave}: os {parâmetros} precisam ser os mesmos`);
  }
}

test('os textos das páginas têm as mesmas chaves e parâmetros em português e em inglês', () => {
  conferirParidade('páginas', pt, en);
});

test('os textos do navegador têm as mesmas chaves e parâmetros em português e em inglês', () => {
  conferirParidade('navegador', jsPt, jsEn);
});

test('o inglês não é o português com outro nome: nenhum texto longo é igual nos dois idiomas', () => {
  const iguais = chavesDe(pt).filter((chave) => !chave.startsWith('moldura.idioma.')).filter((chave) => {
    const a = valorDe(pt, chave);
    const b = valorDe(en, chave);
    return JSON.stringify(a) === JSON.stringify(b) && String(a).length > 12;
  });
  assert.deepEqual(iguais, [], 'texto igual nos dois idiomas (esqueceu de traduzir?)');
});

test('o inglês não deixa palavras portuguesas óbvias nas páginas', () => {
  const textos = chavesDe(en).filter((c) => !c.startsWith('moldura.idioma.')).flatMap((c) => [valorDe(en, c)].flat());
  const portuguesas = /\b(você|ferramentas?|não|também|sua|seu|para o|para a|de dados|calcular)\b/i;
  const suspeitos = textos.filter((texto) => portuguesas.test(texto) && !/Português|portal/.test(texto));
  assert.deepEqual(suspeitos, []);
});

test('toda ferramenta do catálogo tem nome, resumo, palavras de busca e intenções em inglês', () => {
  for (const f of ferramentas) {
    const e = catálogoEn[f.id];
    assert.ok(e, `${f.id}: sem tradução`);
    assert.ok(e.nome.trim() && e.resumo.trim(), `${f.id}: nome ou resumo vazio`);
    assert.ok(Array.isArray(e.tags) && e.tags.length > 0 && e.tags.every((x) => x.trim()), `${f.id}: sem palavras de busca`);
    assert.ok(Array.isArray(e.intenções) && e.intenções.length > 0 && e.intenções.every((x) => x.trim()), `${f.id}: sem intenções`);
    if (!PALAVRAS_IGUAIS.has(f.id)) assert.notEqual(e.nome, f.nome, `${f.id}: nome em inglês igual ao português`);
  }
  assert.deepEqual(Object.keys(catálogoEn).sort(), ferramentas.map((f) => f.id).sort(), 'sobra tradução de ferramenta que não existe');
  const nomes = Object.values(catálogoEn).map((e) => e.nome.toLowerCase());
  assert.equal(new Set(nomes).size, nomes.length, 'dois nomes em inglês iguais');
});

test('toda categoria e todo tipo de tarefa tem tradução', () => {
  assert.deepEqual(Object.keys(categoriasEn.categorias).sort(), categorias.map((c) => c.id).sort());
  for (const c of categorias) assert.ok(categoriasEn.categorias[c.id].nome && categoriasEn.categorias[c.id].resumo, c.id);
  assert.deepEqual(Object.keys(categoriasEn.tarefas).sort(), tarefas.map((t) => t.id).sort());
});

test('o tradutor troca parâmetros, escolhe o plural e recusa chave ou parâmetro que falta', () => {
  const t = criarTradutor({ a: { b: 'Olá, {nome}!', c: '{n} item|{n} itens' }, lista: ['x', 'y'] });
  assert.equal(t('a.b', { nome: 'Ana' }), 'Olá, Ana!');
  assert.equal(t('a.c', { n: 1 }), '1 item');
  assert.equal(t('a.c', { n: 3 }), '3 itens');
  assert.throws(() => t('a.b'), /Falta o parâmetro \{nome\}/);
  assert.throws(() => t('a.nao'), /sem tradução/);
  assert.throws(() => t('lista'), /não é um texto/);
  assert.deepEqual(lista({ lista: ['x', 'y'] }, 'lista'), ['x', 'y']);
  assert.equal(preencher('a|b', { n: 2 }), 'b');
});

test('a marcação mínima escapa tudo e só aceita links seguros', () => {
  assert.equal(emLinha('a <img src=x onerror=alert(1)> b'), 'a &lt;img src=x onerror=alert(1)&gt; b');
  assert.equal(emLinha('*dica*'), '<em>dica</em>');
  assert.equal(emLinha('[[tecla:/]]'), '<kbd>/</kbd>');
  assert.equal(emLinha('[[código:portal.]]'), '<code>portal.</code>');
  assert.equal(emLinha('[Salvos](salvos.html)'), '<a href="salvos.html">Salvos</a>');
  assert.equal(emLinha('[ver](https://exemplo.com/a?b=1&c=2)'), '<a href="https://exemplo.com/a?b=1&amp;c=2">ver</a>');
  assert.equal(emLinha('[clique](javascript:alert(1))'), 'clique', 'javascript: vira texto');
  assert.equal(emLinha('[x](data:text/html,<b>)'), 'x');
  const html = blocosEmHtml(['> suave', '## Título', 'parágrafo', '- um', '- dois', 'depois'], '');
  assert.equal(html, '<p class="suave">suave</p>\n<h2>Título</h2>\n<p>parágrafo</p>\n<ul>\n  <li>um</li>\n  <li>dois</li>\n</ul>\n<p>depois</p>');
});

test('os dicionários não escrevem o nome do site: ele vem do parâmetro {nome}', async () => {
  const { site } = await import('../dados/site.js');
  for (const arquivo of ['pt.js', 'en.js', 'js-pt.js', 'js-en.js', join('en', 'catálogo.js'), join('en', 'categorias.js')]) {
    const conteúdo = await readFile(join(RAIZ, 'dados', 'traduções', arquivo), 'utf8');
    assert.ok(!conteúdo.includes(site.nome), `${arquivo} escreve o nome do site`);
  }
});

test('os idiomas declarados são português na raiz e inglês em /en/', () => {
  assert.deepEqual(códigosDeIdioma, ['pt-BR', 'en']);
  assert.equal(idiomas['pt-BR'].pasta, '');
  assert.equal(idiomas.en.pasta, 'en/');
  assert.equal(normalizarIdioma('en-US'), 'en');
  assert.equal(normalizarIdioma('pt'), 'pt-BR');
  assert.equal(normalizarIdioma(''), 'pt-BR');
});
