// seguranca-csrf.test.js (integração) — servidor Express real, com o mesmo fluxo que o
// navegador faria: pega o cookie af_csrf num GET e repete no cabeçalho X-CSRF-Token num POST.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { middlewareCsrf } from '../../servidor/seguranca/seguranca-csrf.js';

// Leitor de cookies simples (substitui, só para o teste, o que o A1a vai escrever em
// servidor/servidor-cookies.js — ver §8.3 dos contratos).
function leitorDeCookies(req, _res, next) {
  const cabecalho = req.headers.cookie ?? '';
  req.cookies = {};
  for (const parte of cabecalho.split(';')) {
    const texto = parte.trim();
    if (!texto) continue;
    const indice = texto.indexOf('=');
    if (indice === -1) continue;
    req.cookies[texto.slice(0, indice)] = decodeURIComponent(texto.slice(indice + 1));
  }
  next();
}

function extrairCookie(resposta, nome) {
  const cabecalhos = resposta.headers.getSetCookie ? resposta.headers.getSetCookie() : [resposta.headers.get('set-cookie')];
  for (const linha of cabecalhos) {
    if (!linha) continue;
    const [par] = linha.split(';');
    const [chave, valor] = par.split('=');
    if (chave === nome) return valor;
  }
  return undefined;
}

async function subirServidor() {
  const app = express();
  app.use(leitorDeCookies);
  app.use(middlewareCsrf({ emProducao: false }));
  app.get('/pagina', (req, res) => res.status(200).send('ok'));
  app.post('/api/teste', express.json(), (req, res) => res.status(204).end());
  // Tratador mínimo só para este teste (o real é do A1a — servidor-tratador-erros.js).
  app.use((erro, req, res, _next) => {
    res.status(erro.status ?? 500).json({ erro: erro.codigo ?? 'erro_interno' });
  });
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = servidor.address();
  return { servidor, url: `http://127.0.0.1:${port}` };
}

function fechar(servidor) {
  return new Promise((resolve) => servidor.close(resolve));
}

describe('seguranca-csrf (integração)', () => {
  test('GET cria o cookie af_csrf; POST sem o cabeçalho é recusado; com o token certo passa', async () => {
    const { servidor, url } = await subirServidor();
    try {
      const respostaGet = await fetch(`${url}/pagina`);
      const token = extrairCookie(respostaGet, 'af_csrf');
      assert.ok(token, 'deveria receber o cookie af_csrf');

      const respostaSemToken = await fetch(`${url}/api/teste`, {
        method: 'POST',
        headers: { cookie: `af_csrf=${token}` },
      });
      assert.equal(respostaSemToken.status, 403);
      const corpoErro = await respostaSemToken.json();
      assert.equal(corpoErro.erro, 'csrf_invalido');

      const respostaTokenErrado = await fetch(`${url}/api/teste`, {
        method: 'POST',
        headers: { cookie: `af_csrf=${token}`, 'x-csrf-token': 'valor-errado' },
      });
      assert.equal(respostaTokenErrado.status, 403);

      const respostaComToken = await fetch(`${url}/api/teste`, {
        method: 'POST',
        headers: { cookie: `af_csrf=${token}`, 'x-csrf-token': token },
      });
      assert.equal(respostaComToken.status, 204);
    } finally {
      await fechar(servidor);
    }
  });

  test('sem tratador de erro, um 403 ainda chega ao cliente (via next(erro) do Express)', async () => {
    const app = express();
    app.use(leitorDeCookies);
    app.use(middlewareCsrf({ emProducao: false }));
    app.post('/api/x', (req, res) => res.status(204).end());
    // Tratador mínimo, só pra este teste (o real é do A1a — servidor-tratador-erros.js).
    app.use((erro, req, res, _next) => {
      res.status(erro.status ?? 500).json({ erro: erro.codigo ?? 'erro_interno' });
    });
    const servidor = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    try {
      const { port } = servidor.address();
      const resposta = await fetch(`http://127.0.0.1:${port}/api/x`, { method: 'POST' });
      assert.equal(resposta.status, 403);
    } finally {
      await fechar(servidor);
    }
  });
});
