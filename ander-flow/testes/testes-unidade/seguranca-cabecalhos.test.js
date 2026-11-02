// seguranca-cabecalhos.test.js — cabeçalhos de segurança, com app/res simulados
// (sem precisar subir um servidor HTTP real).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarCabecalhos } from '../../servidor/seguranca/seguranca-cabecalhos.js';

function criarAppFalso() {
  return {
    desabilitados: [],
    middlewares: [],
    disable(nome) {
      this.desabilitados.push(nome);
    },
    use(mw) {
      this.middlewares.push(mw);
    },
  };
}

function criarResFalso() {
  const cabecalhos = {};
  return {
    cabecalhos,
    setHeader(nome, valor) {
      cabecalhos[nome] = valor;
    },
    getHeader(nome) {
      return cabecalhos[nome];
    },
    removeHeader(nome) {
      delete cabecalhos[nome];
    },
  };
}

async function executarMiddlewares(app, req, res) {
  for (const mw of app.middlewares) {
    await new Promise((resolve, reject) => {
      mw(req, res, (erro) => (erro ? reject(erro) : resolve()));
    });
  }
}

describe('seguranca-cabecalhos', () => {
  test('desabilita x-powered-by', () => {
    const app = criarAppFalso();
    aplicarCabecalhos(app, { emProducao: false });
    assert.ok(app.desabilitados.includes('x-powered-by'));
  });

  test('CSP não tem unsafe-inline nem unsafe-eval, e restringe as fontes a self', async () => {
    const app = criarAppFalso();
    aplicarCabecalhos(app, { emProducao: false });
    const res = criarResFalso();
    await executarMiddlewares(app, {}, res);

    const csp = res.cabecalhos['Content-Security-Policy'];
    assert.ok(csp, 'CSP deveria estar presente');
    assert.doesNotMatch(csp, /unsafe-inline/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'/);
    assert.match(csp, /style-src 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /worker-src 'self' blob:/);
  });

  test('Referrer-Policy e Permissions-Policy vêm restritivos', async () => {
    const app = criarAppFalso();
    aplicarCabecalhos(app, { emProducao: false });
    const res = criarResFalso();
    await executarMiddlewares(app, {}, res);

    assert.equal(res.cabecalhos['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.ok(res.cabecalhos['Permissions-Policy']);
    assert.match(res.cabecalhos['Permissions-Policy'], /camera=\(\)/);
    assert.match(res.cabecalhos['Permissions-Policy'], /microphone=\(\)/);
  });

  test('HSTS ausente fora de produção, presente em produção', async () => {
    const appDev = criarAppFalso();
    aplicarCabecalhos(appDev, { emProducao: false });
    const resDev = criarResFalso();
    await executarMiddlewares(appDev, {}, resDev);
    assert.equal(resDev.cabecalhos['Strict-Transport-Security'], undefined);

    const appProd = criarAppFalso();
    aplicarCabecalhos(appProd, { emProducao: true });
    const resProd = criarResFalso();
    await executarMiddlewares(appProd, {}, resProd);
    assert.ok(resProd.cabecalhos['Strict-Transport-Security']);
    assert.match(resProd.cabecalhos['Strict-Transport-Security'], /max-age=\d+/);
  });
});
