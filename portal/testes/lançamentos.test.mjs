import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizarRegistro, montarFeed, DIAS_DE_NOVIDADE, LIMITE_DO_FEED } from '../ferramentas/lançamentos.mjs';

const prontas = (...slugs) => slugs.map((slug, i) => ({ slug, id: `F${100 + i}`, nome: `Ferramenta ${slug}`, resumo: `Resumo ${slug}` }));
const títulos = { pt: (n) => `Nova: ${n}`, en: (n) => `New: ${n}` };

test('primeira geração semeia tudo com null: nada vira novidade de uma vez', () => {
  const { registro, novos, mudou } = atualizarRegistro(null, ['b', 'a'], '2026-10-06');
  assert.deepEqual(registro, { a: null, b: null });
  assert.deepEqual(novos, []);
  assert.equal(mudou, true);
});

test('ferramenta pronta que ainda não está no registro entra com a data de hoje', () => {
  const { registro, novos, mudou } = atualizarRegistro({ a: null, b: '2026-09-01' }, ['a', 'b', 'c'], '2026-10-06');
  assert.deepEqual(registro, { a: null, b: '2026-09-01', c: '2026-10-06' });
  assert.deepEqual(novos, ['c']);
  assert.equal(mudou, true);
});

test('sem ferramenta nova o registro não muda e a data antiga não é regravada', () => {
  const { registro, mudou } = atualizarRegistro({ a: '2026-09-01' }, ['a'], '2026-10-06');
  assert.deepEqual(registro, { a: '2026-09-01' });
  assert.equal(mudou, false);
});

test('o feed traz só o que foi lançado nos últimos dias, do mais novo ao mais antigo, e ignora null', () => {
  const registro = { velho: '2026-01-01', antiga: null, a: '2026-10-05', b: '2026-10-06' };
  const feed = montarFeed(registro, prontas('velho', 'antiga', 'a', 'b'), [], títulos, '2026-10-06');
  assert.deepEqual(feed.itens.map((i) => i.slug), ['b', 'a']);
  assert.equal(feed.itens[0].link, 'f/b/');
  assert.equal(feed.itens[0].id, 'ferramenta:b');
  assert.equal(feed.itens[0].pt.título, 'Nova: Ferramenta b');
  assert.equal(feed.itens[0].en.título, 'New: Ferramenta b', 'sem catálogo em inglês usa o nome do português');
});

test('o feed usa o nome e o resumo em inglês quando existem e respeita janela e limite', () => {
  const pr = prontas('a');
  const en = [{ id: pr[0].id, nome: 'Tool A', resumo: 'Summary A' }];
  const hoje = '2026-10-06';
  const dentro = montarFeed({ a: '2026-09-07' }, pr, en, títulos, hoje); // 29 dias
  assert.equal(dentro.itens.length, 1);
  assert.equal(dentro.itens[0].en.texto, 'Summary A');
  const fora = montarFeed({ a: '2026-09-05' }, pr, en, títulos, hoje); // 31 dias
  assert.equal(fora.itens.length, 0);
  assert.ok(DIAS_DE_NOVIDADE >= 7);
  const muitas = prontas(...Array.from({ length: 50 }, (_, i) => `t${i}`));
  const registro = Object.fromEntries(muitas.map((f) => [f.slug, hoje]));
  assert.equal(montarFeed(registro, muitas, [], títulos, hoje).itens.length, LIMITE_DO_FEED);
});

test('data no futuro não vira novidade (relógio errado ou registro editado à mão)', () => {
  const feed = montarFeed({ a: '2027-01-01' }, prontas('a'), [], títulos, '2026-10-06');
  assert.equal(feed.itens.length, 0);
});
