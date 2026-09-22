// seguranca-cabecalhos.test.js (integração) — sobe um servidor Express real e confere os
// cabeçalhos de uma requisição HTTP de ponta a ponta.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { aplicarCabecalhos } from '../../servidor/seguranca/seguranca-cabecalhos.js';

async function subirServidor(configuracao) {
  const app = express();
  aplicarCabecalhos(app, configuracao);
  app.get('/qualquer', (req, res) => res.status(200).send('ok'));
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = servidor.address();
  return { servidor, url: `http://127.0.0.1:${port}` };
}

function fechar(servidor) {
  return new Promise((resolve) => servidor.close(resolve));
}

describe('seguranca-cabecalhos (integração)', () => {
  test('resposta real tem CSP estrita, sem unsafe-inline/unsafe-eval, e sem x-powered-by', async () => {
    const { servidor, url } = await subirServidor({ emProducao: false });
    try {
      const resposta = await fetch(`${url}/qualquer`);
      assert.equal(resposta.status, 200);

      const csp = resposta.headers.get('content-security-policy');
      assert.ok(csp);
      assert.doesNotMatch(csp, /unsafe-inline/);
      assert.doesNotMatch(csp, /unsafe-eval/);
      assert.match(csp, /default-src 'self'/);
      assert.match(csp, /frame-ancestors 'none'/);

      assert.equal(resposta.headers.get('x-powered-by'), null);
      assert.equal(resposta.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
      assert.ok(resposta.headers.get('permissions-policy'));
      assert.equal(resposta.headers.get('strict-transport-security'), null);
    } finally {
      await fechar(servidor);
    }
  });

  test('em produção o HSTS aparece na resposta real', async () => {
    const { servidor, url } = await subirServidor({ emProducao: true });
    try {
      const resposta = await fetch(`${url}/qualquer`);
      assert.ok(resposta.headers.get('strict-transport-security'));
    } finally {
      await fechar(servidor);
    }
  });
});
