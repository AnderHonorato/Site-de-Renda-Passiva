import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerValorCookie, ErroApi } from '../../frontend/compartilhado/compartilhado-api.js';

test('lerValorCookie acha o valor pelo nome', () => {
  assert.equal(lerValorCookie('af_csrf=abc123; idioma=en', 'af_csrf'), 'abc123');
  assert.equal(lerValorCookie('af_csrf=abc123; idioma=en', 'idioma'), 'en');
});

test('lerValorCookie devolve null quando o nome não existe', () => {
  assert.equal(lerValorCookie('idioma=en', 'af_csrf'), null);
});

test('lerValorCookie devolve null para string vazia', () => {
  assert.equal(lerValorCookie('', 'idioma'), null);
});

test('lerValorCookie decodifica o valor', () => {
  assert.equal(lerValorCookie('nome=Ander%20Flow', 'nome'), 'Ander Flow');
});

test('ErroApi guarda status, codigo e extras', () => {
  const erro = new ErroApi({ status: 403, codigo: 'plano_insuficiente', extras: { plano_necessario: 'plus' } });
  assert.equal(erro.status, 403);
  assert.equal(erro.codigo, 'plano_insuficiente');
  assert.deepEqual(erro.extras, { plano_necessario: 'plus' });
  assert.ok(erro instanceof Error);
});
