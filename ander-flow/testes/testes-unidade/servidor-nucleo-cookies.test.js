import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analisarCookies, middlewareCookies } from '../../servidor/servidor-cookies.js';

test('analisarCookies: várias entradas', () => {
  const cookies = analisarCookies('af_sessao=abc123; af_csrf=xyz; idioma=pt-BR');
  assert.deepEqual(cookies, { af_sessao: 'abc123', af_csrf: 'xyz', idioma: 'pt-BR' });
});

test('analisarCookies: undefined/vazio não lança', () => {
  assert.deepEqual(analisarCookies(undefined), {});
  assert.deepEqual(analisarCookies(''), {});
});

test('analisarCookies: decodifica valores com %', () => {
  const cookies = analisarCookies('nome=Jo%C3%A3o');
  assert.equal(cookies.nome, 'João');
});

test('analisarCookies: entrada malformada é ignorada, resto funciona', () => {
  const cookies = analisarCookies('semigual; af_csrf=xyz;  ; nome=valor  ');
  assert.deepEqual(cookies, { af_csrf: 'xyz', nome: 'valor' });
});

test('middlewareCookies: preenche req.cookies e chama next()', () => {
  const req = { headers: { cookie: 'af_tema=escuro' } };
  const res = {};
  let chamado = false;
  middlewareCookies(req, res, () => {
    chamado = true;
  });
  assert.equal(chamado, true);
  assert.deepEqual(req.cookies, { af_tema: 'escuro' });
});

test('middlewareCookies: sem cabeçalho cookie devolve objeto vazio', () => {
  const req = { headers: {} };
  const res = {};
  middlewareCookies(req, res, () => {});
  assert.deepEqual(req.cookies, {});
});
