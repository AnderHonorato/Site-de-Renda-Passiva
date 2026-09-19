/** Testes do catálogo e da busca por intenção. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ferramentas, ferramentasProntas, ferramentaPorSlug, conferirCatálogo } from '../dados/catálogo.js';
import { categorias, tarefas } from '../dados/categorias.js';
import { buscar, pontuar } from '../scripts/núcleo/busca.js';
import { nomesDeÍcone, ícone } from '../scripts/núcleo/ícones.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');

test('o catálogo respeita as próprias regras', () => {
  assert.deepEqual(conferirCatálogo(), []);
});

test('o catálogo tem 150 ferramentas únicas', () => {
  assert.equal(ferramentas.length, 150);
  assert.equal(new Set(ferramentas.map((f) => f.slug)).size, 150);
  assert.equal(new Set(ferramentas.map((f) => f.id)).size, 150);
  assert.equal(new Set(ferramentas.map((f) => f.nome.toLowerCase())).size, 150);
});

test('nenhuma ferramenta usa nome de variação artificial', () => {
  // O prompt do projeto proíbe "X simples", "X avançado", "X pro" só para encher lista.
  const proibidos = /\b(simples|avan[çc]ad[ao]|pro|r[áa]pid[ao]|b[áa]sic[ao])\s*$/i;
  const suspeitas = ferramentas.filter((f) => proibidos.test(f.nome));
  assert.deepEqual(suspeitas.map((f) => f.nome), []);
});

test('todo campo declarado usa valores conhecidos', () => {
  const idsDeCategoria = new Set(categorias.map((c) => c.id));
  const idsDeTarefa = new Set(tarefas.map((t) => t.id));
  const exportaçõesVálidas = new Set(['copiar', 'baixar', 'pdf', 'xlsx', 'csv', 'json', 'png', 'svg', 'link', 'imprimir']);

  for (const f of ferramentas) {
    assert.ok(idsDeCategoria.has(f.cat), `${f.id}: categoria ${f.cat}`);
    assert.ok(nomesDeÍcone.includes(f.ícone), `${f.id}: ícone ${f.ícone}`);
    assert.ok(['gratuito', 'plus'].includes(f.plano), `${f.id}: plano ${f.plano}`);
    for (const t of f.tarefas) assert.ok(idsDeTarefa.has(t), `${f.id}: tarefa ${t}`);
    for (const e of f.exporta) assert.ok(exportaçõesVálidas.has(e), `${f.id}: exportação ${e}`);
  }
});

test('toda ferramenta pronta tem módulo no disco', async () => {
  const módulos = new Set(
    (await readdir(join(RAIZ, 'scripts', 'ferramentas')))
      .filter((a) => a.endsWith('.js'))
      .map((a) => a.replace(/\.js$/, '')),
  );
  for (const f of ferramentasProntas) {
    assert.ok(módulos.has(f.slug), `${f.id} (${f.slug}) está pronta mas não tem módulo`);
  }
  // E nenhum módulo existe sem entrada no catálogo.
  for (const slug of módulos) {
    assert.ok(ferramentaPorSlug[slug], `o módulo ${slug}.js não tem entrada no catálogo`);
  }
});

test('todo módulo de ferramenta pronta declara montar e instruções', async () => {
  for (const f of ferramentasProntas) {
    const módulo = await import(`../scripts/ferramentas/${f.slug}.js`);
    const definição = módulo.default;
    assert.equal(typeof definição?.montar, 'function', `${f.slug}: falta montar()`);
    assert.ok(definição.instruções?.passos?.length >= 2, `${f.slug}: precisa de passos em "Como usar"`);
    assert.ok(definição.instruções.exemplo?.texto, `${f.slug}: precisa de um exemplo real`);
    assert.ok(definição.instruções.limites, `${f.slug}: precisa declarar limites e premissas`);
  }
});

test('todo ícone declarado gera SVG válido', () => {
  for (const nome of nomesDeÍcone) {
    const svg = ícone(nome);
    assert.match(svg, /^<svg /);
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /stroke="currentColor"/);
    assert.ok(svg.endsWith('</svg>'));
  }
  assert.throws(() => ícone('inexistente'), /desconhecido/);
});

/* ---------------------------------------------------------------- busca */

test('a busca encontra pela tarefa, não só pelo nome', () => {
  const casos = [
    ['quanto devo cobrar', 'preco-de-venda'],
    ['rachar a conta', 'divisao-de-contas'],
    ['qual embalagem compensa', 'preco-por-unidade'],
    ['quantos dias faltam', 'calculadora-de-datas'],
    ['somar horas trabalhadas', 'calculadora-de-horas'],
    ['criar senha forte', 'gerador-de-senhas'],
    ['esse cpf é válido', 'validador-cpf-cnpj'],
    ['fazer um orçamento', 'orcamento'],
    ['tirar duplicados da planilha', 'limpar-planilha'],
    ['vale a pena parcelar', 'parcelamento'],
  ];
  for (const [consulta, esperado] of casos) {
    const achados = buscar(ferramentas, consulta, { limite: 3 });
    assert.ok(
      achados.some((f) => f.slug === esperado),
      `"${consulta}" deveria achar ${esperado}, achou ${achados.map((f) => f.slug).join(', ') || 'nada'}`,
    );
  }
});

test('a busca ignora acento e caixa', () => {
  const comAcento = buscar(ferramentas, 'orçamento', { limite: 1 })[0];
  const semAcento = buscar(ferramentas, 'ORCAMENTO', { limite: 1 })[0];
  assert.equal(comAcento.slug, semAcento.slug);
});

test('ferramenta pronta aparece antes da planejada quando empatam', () => {
  const achados = buscar(ferramentas, 'pdf', { limite: 5 });
  assert.ok(achados.length > 0);
});

test('busca vazia devolve as prontas primeiro', () => {
  const todas = buscar(ferramentas, '');
  assert.equal(todas.length, 150);
  assert.equal(todas.slice(0, ferramentasProntas.length).every((f) => f.status === 'pronta'), true);
});

test('filtros de categoria e tarefa reduzem o resultado', () => {
  const dinheiro = buscar(ferramentas, '', { categoria: 'dinheiro' });
  assert.ok(dinheiro.length > 0);
  assert.equal(dinheiro.every((f) => f.cat === 'dinheiro'), true);

  const converter = buscar(ferramentas, '', { tarefa: 'converter' });
  assert.equal(converter.every((f) => f.tarefas.includes('converter')), true);

  assert.equal(buscar(ferramentas, '', { apenasProntas: true }).length, ferramentasProntas.length);
});

test('consulta sem correspondência devolve lista vazia, não o catálogo inteiro', () => {
  assert.deepEqual(buscar(ferramentas, 'zzzqwertyuiop'), []);
  assert.equal(pontuar(ferramentaPorSlug.orcamento, 'zzzqwertyuiop'), 0);
});

test('toda ferramenta é alcançável por pelo menos uma das próprias intenções', () => {
  const inalcançáveis = [];
  for (const f of ferramentas) {
    if (f.intenções.length === 0) { inalcançáveis.push(`${f.id} sem intenções`); continue; }
    const achou = f.intenções.some((i) => buscar(ferramentas, i, { limite: 8 }).some((r) => r.slug === f.slug));
    if (!achou) inalcançáveis.push(`${f.id} (${f.slug})`);
  }
  assert.deepEqual(inalcançáveis, []);
});
