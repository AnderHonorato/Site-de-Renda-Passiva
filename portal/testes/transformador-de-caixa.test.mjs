/**
 * Testes de maiúsculas e minúsculas.
 *
 * Os três primeiros casos são os da especificação do Ander Flow
 * (docs/catalogo/catalogo-texto.md, "transformador-de-caixa"); os seguintes,
 * os do teste do branch ander-flow/a15-motores, com os modos em português.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { transformarCaixa, estáTodoEmMaiúsculas, MODOS_DE_CAIXA } from '../scripts/cálculos/textos.js';
import ferramenta, { LIMITE_DE_CARACTERES } from '../scripts/ferramentas/transformador-de-caixa.js';
import { ferramentaPorSlug } from '../dados/catálogo.js';

/* ------------------------------------------------- casos do Ander Flow */

test('caso 1 do catálogo: Cada Palavra, "MARIA DA silva SOUZA" → "Maria Da Silva Souza"', () => {
  assert.equal(transformarCaixa('MARIA DA silva SOUZA', 'cada-palavra'), 'Maria Da Silva Souza');
});

test('caso 2 do catálogo: minúsculas, "SÃO PAULO" → "são paulo"', () => {
  assert.equal(transformarCaixa('SÃO PAULO', 'minúsculas'), 'são paulo');
});

test('caso 3 do catálogo: entrada vazia → saída vazia, sem erro', () => {
  for (const modo of Object.keys(MODOS_DE_CAIXA)) assert.equal(transformarCaixa('', modo), '');
});

test('maiúsculas tratam acento (à → À)', () => {
  assert.equal(transformarCaixa('à tarde, ação', 'maiúsculas'), 'À TARDE, AÇÃO');
});

test('frase: maiúscula no começo e depois de ". ", "! " e "? "; o resto em minúsculas', () => {
  assert.equal(transformarCaixa('OLÁ. TUDO BEM? SIM! ÓTIMO', 'frase'), 'Olá. Tudo bem? Sim! Ótimo');
  assert.equal(transformarCaixa('versão 2.0 saiu', 'frase'), 'Versão 2.0 saiu');
});

test('Cada Palavra respeita quebras de linha como separador', () => {
  assert.equal(transformarCaixa('linha UM\nlinha dois', 'cada-palavra'), 'Linha Um\nLinha Dois');
});

test('os modos, o padrão e o limite seguem a especificação', () => {
  assert.deepEqual(Object.keys(MODOS_DE_CAIXA), ['maiúsculas', 'minúsculas', 'cada-palavra', 'frase']);
  assert.equal(transformarCaixa('abc'), 'ABC'); // padrão: maiúsculas
  assert.equal(LIMITE_DE_CARACTERES, 50000);
  assert.throws(() => transformarCaixa('abc', 'inventado'), /desconhecido/);
});

/* ------------------------------------------------------ só do portal */

test('manter siglas deixa CPF e ONU como estão nos modos que baixam a caixa', () => {
  const texto = 'O CPF DO cliente FOI enviado À ONU. confira o RG.';
  assert.equal(transformarCaixa(texto, 'minúsculas', { manterSiglas: true }), 'o CPF DO cliente FOI enviado à ONU. confira o RG.');
  assert.equal(transformarCaixa('meu cpf e o RG', 'cada-palavra', { manterSiglas: true }), 'Meu Cpf E O RG');
  assert.equal(transformarCaixa('ENVIE O CPF. ok', 'frase', { manterSiglas: false }), 'Envie o cpf. Ok');
  assert.equal(transformarCaixa('envie o CPF. ok', 'frase', { manterSiglas: true }), 'Envie o CPF. Ok');
});

test('letra solta e número com letra não contam como sigla', () => {
  assert.equal(transformarCaixa('A REDE 4G E O É', 'minúsculas', { manterSiglas: true }), 'a REDE 4g e o é');
});

test('troca de caixa que muda o tamanho do texto não embaralha as siglas', () => {
  assert.equal(transformarCaixa('straße', 'maiúsculas'), 'STRASSE');
  // "İ" vira duas posições ao baixar a caixa; a sigla depois dele continua inteira.
  assert.equal(transformarCaixa('İstanbul e ONU', 'minúsculas', { manterSiglas: true }), 'i̇stanbul e ONU');
});

test('texto todo em maiúsculas é reconhecido, para a tela avisar que as siglas não dão para separar', () => {
  assert.equal(estáTodoEmMaiúsculas('O CPF DA MARIA'), true);
  assert.equal(estáTodoEmMaiúsculas('O CPF da Maria'), false);
  assert.equal(estáTodoEmMaiúsculas('123 - 456'), false);
  assert.equal(estáTodoEmMaiúsculas(''), false);
});

test('o exemplo de "Como usar" confere com a ferramenta', () => {
  const exemplo = ferramenta.instruções.exemplo.texto;
  assert.ok(exemplo.includes(`"${transformarCaixa('MARIA DA silva SOUZA', 'cada-palavra')}"`));
  assert.ok(exemplo.includes(`"${transformarCaixa('SÃO PAULO', 'minúsculas')}"`));
});

test('a ficha do catálogo promete só o que a ferramenta entrega', () => {
  const ficha = ferramentaPorSlug['transformador-de-caixa'];
  assert.equal(ficha.status, 'pronta');
  assert.deepEqual([...ficha.exporta], ['copiar', 'baixar']);
  assert.match(ficha.processa, /siglas/);
});
