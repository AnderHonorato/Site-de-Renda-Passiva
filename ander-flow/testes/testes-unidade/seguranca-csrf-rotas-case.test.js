import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { middlewareCsrf } from '../../servidor/seguranca/seguranca-csrf.js';

function simular({ metodo, caminho, cabecalho, cookie }) {
  const token = cookie ?? randomBytes(32).toString('base64url');
  const req = {
    method: metodo, path: caminho, cookies: { af_csrf: token },
    get: () => cabecalho,
  };
  const res = { cookie() { throw Error('cookie válido não deve ser renovado'); } };
  let erro;
  middlewareCsrf()(req, res, (resultado) => { erro = resultado; });
  return erro;
}

test('CSRF protege /API e subrotas com qualquer capitalização', () => {
  for (const caminho of ['/api', '/API', '/Api/usuarios', '/aPi/premium']) {
    for (const metodo of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const erro = simular({ metodo, caminho });
      assert.equal(erro?.status ?? erro?.statusCode, 403, caminho + ' ' + metodo);
    }
  }
});

test('CSRF aceita token correspondente em rotas API com maiúsculas', () => {
  const token = randomBytes(32).toString('base64url');
  assert.equal(simular({ metodo: 'POST', caminho: '/API/usuarios', cookie: token, cabecalho: token }), undefined);
});

test('CSRF não bloqueia GET e não trata prefixos parecidos como API', () => {
  assert.equal(simular({ metodo: 'GET', caminho: '/API/usuarios' }), undefined);
  assert.equal(simular({ metodo: 'POST', caminho: '/apiextra' }), undefined);
});
