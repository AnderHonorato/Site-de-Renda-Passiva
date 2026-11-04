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

test('cookie duplicado não substitui o primeiro valor aceito', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=original; sessao=forjado; csrf=legitimo' } });
  assert.equal(resultado.sessao, 'original');
  assert.equal(resultado.csrf, 'legitimo');
});

test('nomes codificados com caracteres de controle ou separadores são rejeitados', () => {
  const resultado = cookies({ headers: { cookie: 'sessao%0Ainjetada=ruim; csrf%3Dextra=ruim; nome%3Boutro=ruim; sessao=valida' } });
  assert.deepEqual(Object.keys(resultado), ['sessao']);
  assert.equal(resultado.sessao, 'valida');
});

test('nomes de protótipo codificados também são rejeitados', () => {
  const resultado = cookies({ headers: { cookie: '%5F%5Fproto%5F%5F=ruim; sessao=valida' } });
  assert.equal(Object.hasOwn(resultado, '__proto__'), false);
  assert.equal(resultado.sessao, 'valida');
});

test('nomes equivalentes codificados não permitem sobrescrever cookies de sessão e CSRF', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=original; %73essao=forjada; csrf=primeiro; %63srf=segundo' } });
  assert.equal(resultado.sessao, 'original');
  assert.equal(resultado.csrf, 'primeiro');
  assert.equal(Object.keys(resultado).length, 2);
});

test('um cookie inválido não bloqueia cookies válidos posteriores', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=%E0%A4%A; sessao=valida; csrf=ok' } });
  assert.equal(resultado.sessao, 'valida');
  assert.equal(resultado.csrf, 'ok');
});

test('valores de cookie com controles codificados são rejeitados sem afetar os demais', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=ruim%0D%0ASet-Cookie%3Aforjado; sessao=valida; csrf=ok%00; csrf=seguro' } });
  assert.equal(resultado.sessao, 'valida');
  assert.equal(resultado.csrf, 'seguro');
  assert.equal(Object.keys(resultado).length, 2);
});

test('nomes de cookies com espaços e tabulações codificados não são aceitos', () => {
  const resultado = cookies({ headers: { cookie: 'sessao%20=forjada; %09csrf=forjado; sessao=valida; csrf=seguro' } });
  assert.deepEqual(Object.keys(resultado), ['sessao', 'csrf']);
  assert.equal(resultado.sessao, 'valida');
  assert.equal(resultado.csrf, 'seguro');
});

test('nomes reservados codificados não podem substituir cookies legítimos', () => {
  const resultado = cookies({ headers: { cookie: '%63onstructor=injetado; %70rototype=injetado; sessao=valida' } });
  assert.equal(Object.hasOwn(resultado, 'constructor'), false);
  assert.equal(Object.hasOwn(resultado, 'prototype'), false);
  assert.equal(resultado.sessao, 'valida');
});

test('cabeçalhos de cookie ausentes ou com tipo inesperado são ignorados', () => {
  for (const headers of [{}, { cookie: ['sessao=forjada'] }, { cookie: 123 }, { cookie: { valor: 'sessao=forjada' } }]) {
    const resultado = cookies({ headers });
    assert.equal(Object.getPrototypeOf(resultado), null);
    assert.deepEqual(Object.keys(resultado), []);
  }
});

test('cabeçalho de cookie excessivo não é processado', () => {
  const resultado = cookies({ headers: { cookie: 'sessao=valida;' + 'x'.repeat(16384) } });
  assert.deepEqual(Object.keys(resultado), []);
});
