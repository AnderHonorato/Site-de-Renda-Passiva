/**
 * Testes de remover acentos.
 *
 * Os três primeiros casos são os da especificação do Ander Flow
 * (docs/catalogo/catalogo-texto.md, "removedor-de-acentos"); os seguintes,
 * os do teste do branch ander-flow/a15-motores.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { removerAcentos, contarAcentos } from '../scripts/cálculos/textos.js';
import ferramenta, { LIMITE_DE_CARACTERES, AVISO_DOS_NÚMEROS } from '../scripts/ferramentas/removedor-de-acentos.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

/* ------------------------------------------------- casos do Ander Flow */

test('caso 1 do catálogo: "São Paulo — Ação & Café" → "Sao Paulo — Acao & Cafe" (pontuação mantida)', () => {
  assert.equal(removerAcentos('São Paulo — Ação & Café', { manterPontuação: true }), 'Sao Paulo — Acao & Cafe');
});

test('caso 2 do catálogo: sem pontuação, "Preço: R$ 10,00!" → "Preco R 1000"', () => {
  assert.equal(removerAcentos('Preço: R$ 10,00!', { manterPontuação: false }), 'Preco R 1000');
});

test('caso 3 do catálogo: entrada vazia → saída vazia, sem erro', () => {
  assert.equal(removerAcentos('', { manterPontuação: true }), '');
  assert.equal(removerAcentos('', { manterPontuação: false }), '');
  assert.equal(removerAcentos(undefined), '');
});

test('ç vira c (a cedilha é um sinal combinante no NFD), maiúsculas também', () => {
  assert.equal(removerAcentos('AÇÃO, maçã e pão'), 'ACAO, maca e pao');
});

test('manter a pontuação é o padrão', () => {
  assert.equal(removerAcentos('Olá, tudo bem?'), 'Ola, tudo bem?');
});

test('quebras de linha e espaços são preservados nos dois modos', () => {
  assert.equal(removerAcentos('ação\n  café', { manterPontuação: false }), 'acao\n  cafe');
  assert.equal(removerAcentos('ação\n  café'), 'acao\n  cafe');
});

test('o limite e o aviso sobre números seguem a especificação', () => {
  assert.equal(LIMITE_DE_CARACTERES, 50000);
  assert.match(AVISO_DOS_NÚMEROS, /1000/);
  assert.ok(ferramenta.instruções.limites.includes(AVISO_DOS_NÚMEROS));
  assert.ok(ferramenta.instruções.perguntas.some((q) => /1000/.test(q.r)));
});

/* ------------------------------------------------------ só do portal */

test('texto que chega com o acento separado da letra também sai limpo', () => {
  assert.equal(removerAcentos('ação'.normalize('NFD')), 'acao');
});

test('outras escritas voltam montadas (NFC) depois de tirar os sinais latinos', () => {
  const coreano = '한국어';
  assert.equal(removerAcentos(coreano), coreano);
  assert.equal(removerAcentos('Ñandú über Øresund'), 'Nandu uber Øresund');
});

test('contagem de acentos removidos', () => {
  assert.equal(contarAcentos('São Paulo — Ação & Café'), 4);
  assert.equal(contarAcentos('sem acento'), 0);
  assert.equal(contarAcentos(''), 0);
});

test('o exemplo de "Como usar" confere com a ferramenta', () => {
  const exemplo = ferramenta.instruções.exemplo.texto;
  assert.ok(exemplo.includes(`"${removerAcentos('São Paulo — Ação & Café')}"`));
  assert.ok(exemplo.includes(`"${removerAcentos('Preço: R$ 10,00!', { manterPontuação: false })}"`));
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['removedor-de-acentos'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
});
