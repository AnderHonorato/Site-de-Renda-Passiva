import test from 'node:test';
import assert from 'node:assert/strict';
import { analisarCookies, middlewareCookies } from '../../servidor/servidor-cookies.js';

test('cookies válidos continuam disponíveis', () => {
  const cookies = analisarCookies('sessao=abc; tema=escuro%20azul');
  assert.equal(cookies.sessao, 'abc');
  assert.equal(cookies.tema, 'escuro azul');
  assert.equal(Object.getPrototypeOf(cookies), null);
});

test('nomes reservados não alteram o protótipo', () => {
  const cookies = analisarCookies('__proto__=ataque; constructor=ataque; prototype=ataque; seguro=sim');
  assert.equal(cookies.seguro, 'sim');
  assert.equal(Object.hasOwn(cookies, '__proto__'), false);
  assert.equal(Object.hasOwn(cookies, 'constructor'), false);
});

test('primeiro cookie prevalece em duplicatas', () => {
  assert.equal(analisarCookies('af_csrf=primeiro; af_csrf=segundo').af_csrf, 'primeiro');
});

test('ignora valores malformados e caracteres de controle sem perder próximos cookies', () => {
  const cookies = analisarCookies('ruim=%ZZ; nulo=%00; quebra=%0D%0A; ok=sim');
  assert.equal(cookies.ok, 'sim');
  assert.equal(Object.hasOwn(cookies, 'ruim'), false);
  assert.equal(Object.hasOwn(cookies, 'nulo'), false);
  assert.equal(Object.hasOwn(cookies, 'quebra'), false);
});

test('cabeçalhos excessivos e tipos inesperados são descartados', () => {
  assert.equal(Object.keys(analisarCookies('x'.repeat(16385))).length, 0);
  assert.equal(Object.keys(analisarCookies({ cookie: 'x=1' })).length, 0);
});

test('middleware injeta cookies e chama próximo', () => {
  const req = { headers: { cookie: 'x=1' } };
  let chamado = false;
  middlewareCookies(req, {}, () => { chamado = true; });
  assert.equal(chamado, true);
  assert.equal(req.cookies.x, '1');
});
