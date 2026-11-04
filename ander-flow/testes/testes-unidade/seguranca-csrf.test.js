// seguranca-csrf.test.js — CSRF de submissão dupla, com req/res simulados (sem servidor real).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { middlewareCsrf } from '../../servidor/seguranca/seguranca-csrf.js';

function criarRes() {
  const cookiesDefinidos = {};
  return {
    cookiesDefinidos,
    cookie(nome, valor) {
      cookiesDefinidos[nome] = valor;
    },
    set() {},
  };
}

function criarReq({ method = 'GET', path = '/api/teste', cookies = {}, cabecalhos = {} } = {}) {
  return {
    method,
    path,
    cookies,
    get(nome) {
      return cabecalhos[nome.toLowerCase()];
    },
  };
}

function chamar(middleware, req, res) {
  return new Promise((resolve) => {
    middleware(req, res, (erro) => resolve(erro));
  });
}

describe('seguranca-csrf', () => {
  test('sem cookie af_csrf: cria um novo token', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({ method: 'GET', cookies: {} });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro, undefined);
    assert.ok(res.cookiesDefinidos.af_csrf);
    assert.match(res.cookiesDefinidos.af_csrf, /^[A-Za-z0-9_-]{32,}$/);
  });

  test('GET não exige X-CSRF-Token mesmo em /api/*', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({ method: 'GET', path: '/api/qualquer', cookies: { af_csrf: 'token-existente' } });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro, undefined);
  });

  test('POST em /api/* sem X-CSRF-Token → 403 csrf_invalido', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({ method: 'POST', path: '/api/conta', cookies: { af_csrf: 'token-do-cookie' } });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.ok(erro);
    assert.equal(erro.status, 403);
    assert.equal(erro.codigo, 'csrf_invalido');
  });

  test('POST em /api/* com X-CSRF-Token errado → 403 csrf_invalido', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({
      method: 'POST',
      path: '/api/conta',
      cookies: { af_csrf: 'token-do-cookie' },
      cabecalhos: { 'x-csrf-token': 'token-errado' },
    });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.ok(erro);
    assert.equal(erro.status, 403);
    assert.equal(erro.codigo, 'csrf_invalido');
  });

  test('POST em /api/* com X-CSRF-Token certo → passa', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({
      method: 'POST',
      path: '/api/conta',
      cookies: { af_csrf: 'token-do-cookie' },
      cabecalhos: { 'x-csrf-token': 'token-do-cookie' },
    });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro, undefined);
  });

  test('PUT, PATCH e DELETE em /api/* também exigem o token', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const req = criarReq({ method, path: '/api/trabalhos/1', cookies: { af_csrf: 'token-do-cookie' } });
      const res = criarRes();
      const erro = await chamar(middleware, req, res);
      assert.equal(erro?.codigo, 'csrf_invalido', `método ${method} deveria exigir token`);
    }
  });

  test('/__controle/desligar fica fora da regra mesmo em POST', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({ method: 'POST', path: '/__controle/desligar', cookies: { af_csrf: 'token-do-cookie' } });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro, undefined);
  });

  test('POST fora de /api/* não exige o token', async () => {
    const middleware = middlewareCsrf({ emProducao: false });
    const req = criarReq({ method: 'POST', path: '/entrar', cookies: { af_csrf: 'token-do-cookie' } });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro, undefined);
  });

  test('cookie definido com Secure em produção', async () => {
    const middleware = middlewareCsrf({ emProducao: true });
    const req = criarReq({ method: 'GET', cookies: {} });
    let opcoesRecebidas;
    const res = {
      cookie(nome, valor, opcoes) {
        opcoesRecebidas = opcoes;
      },
      set() {},
    };
    await chamar(middleware, req, res);
    assert.equal(opcoesRecebidas.secure, true);
    assert.equal(opcoesRecebidas.httpOnly, false);
    assert.equal(opcoesRecebidas.sameSite, 'lax');
  });
  test('tokens gerados em requisições distintas são independentes e têm 256 bits', async () => {
    const middleware = middlewareCsrf({ emProducao: true });
    const tokens = new Set();
    for (let i = 0; i < 24; i += 1) {
      const req = criarReq({ method: 'GET', cookies: {} });
      const res = criarRes();
      assert.equal(await chamar(middleware, req, res), undefined);
      const token = res.cookiesDefinidos.af_csrf;
      assert.match(token, /^[A-Za-z0-9_-]{43}$/);
      assert.equal(Buffer.from(token, 'base64url').length, 32);
      assert.equal(req.cookies.af_csrf, token);
      tokens.add(token);
    }
    assert.equal(tokens.size, 24, 'não pode reutilizar tokens de outras sessões');
  });

  test('POST sem cookie é recusado mesmo quando o cliente envia um token arbitrário', async () => {
    const middleware = middlewareCsrf({ emProducao: true });
    const req = criarReq({
      method: 'POST',
      path: '/api/conta',
      cookies: {},
      cabecalhos: { 'x-csrf-token': 'valor-escolhido-pelo-cliente' },
    });
    const res = criarRes();
    const erro = await chamar(middleware, req, res);
    assert.equal(erro?.status, 403);
    assert.equal(erro?.codigo, 'csrf_invalido');
    assert.ok(res.cookiesDefinidos.af_csrf);
    assert.notEqual(res.cookiesDefinidos.af_csrf, 'valor-escolhido-pelo-cliente');
  });

});
