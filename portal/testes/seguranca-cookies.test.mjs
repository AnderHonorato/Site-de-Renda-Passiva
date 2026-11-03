import test from 'node:test';
import assert from 'node:assert/strict';
import { cookies } from '../servidor/seguranca.mjs';

test('cookies válidos sobrevivem a um cookie com escape inválido', () => {
  const resultado = cookies({ headers: { cookie: 'invalido=%ZZ; sessao=token_valido; csrf=abc123' } });
  assert.equal(resultado.sessao, 'token_valido');
  assert.equal(resultado.csrf, 'abc123');
  assert.equal(Object.hasOwn(resultado, 'invalido'), false);
});

test('valores com sinal de igual e escapes percentuais são preservados', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=abc%3Ddef==; csrf=token%2Fvalor' } });
  assert.equal(resultado.sessao, 'abc=def==');
  assert.equal(resultado.csrf, 'token/valor');
});

test('cookies não podem alterar o protótipo do mapa de valores', () => {
  const resultado = cookies({ headers: { cookie: '__proto__=injetado; constructor=alterado; sessao=ok' } });
  assert.equal(resultado.sessao, 'ok');
  assert.equal(Object.getPrototypeOf(resultado), null);
  assert.equal(Object.hasOwn(resultado, '__proto__'), false);
  assert.equal(Object.hasOwn(resultado, 'constructor'), false);
});
