// seguranca-limite-trafego.test.js (integração) — servidor Express real, com uma rota
// protegida pelo limitador e uma rota de "login" simulando o grupo entrar_falhas.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarLimitador, chaveIp } from '../../servidor/seguranca/seguranca-limite-trafego.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

function criarBancoDeTeste() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
  return banco;
}

function criarRelogioFalso(inicioMs = 1_700_000_000_000) {
  let agoraMs = inicioMs;
  return { agora: () => agoraMs, avancar: (ms) => (agoraMs += ms) };
}

async function subirServidor(limitador) {
  const app = express();
  app.use(express.json());
  app.get('/api/ping', limitador.middleware('api', { chave: chaveIp }), (req, res) => res.status(200).send('pong'));

  app.post('/api/autenticacao/entrar', (req, res, next) => {
    const chave = `${chaveIp(req)}|${(req.body?.email ?? '').toLowerCase()}`;
    const status = limitador.verificar('entrar_falhas', chave);
    if (status.bloqueado) {
      res.set('Retry-After', String(status.segundosRestantes));
      return res.status(429).json({ erro: 'muitas_tentativas', tentar_de_novo_em_segundos: status.segundosRestantes });
    }
    if (req.body?.senha === 'senha-certa') {
      limitador.limparFalhas('entrar_falhas', chave);
      return res.status(200).json({ ok: true });
    }
    const resultado = limitador.registrarFalha('entrar_falhas', chave);
    if (resultado.bloqueado) {
      res.set('Retry-After', String(resultado.segundosRestantes));
      return res.status(429).json({ erro: 'muitas_tentativas', tentar_de_novo_em_segundos: resultado.segundosRestantes });
    }
    return res.status(401).json({ erro: 'credenciais_invalidas' });
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

describe('seguranca-limite-trafego (integração)', () => {
  test('estourar o limite da rota devolve 429 com Retry-After', async () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({
      banco,
      regras: { api: { limite: 2, janelaSegundos: 60 } },
      agora: relogio.agora,
    });
    const { servidor, url } = await subirServidor(limitador);
    try {
      const r1 = await fetch(`${url}/api/ping`);
      assert.equal(r1.status, 200);
      const r2 = await fetch(`${url}/api/ping`);
      assert.equal(r2.status, 200);
      const r3 = await fetch(`${url}/api/ping`);
      assert.equal(r3.status, 429);
      assert.equal(r3.headers.get('retry-after'), '60');
    } finally {
      await fechar(servidor);
      limitador._pararLimpezaParaTestes();
    }
  });

  test('6ª tentativa de login errada em 15 min → 429 com Retry-After; login certo não conta como falha', async () => {
    const banco = criarBancoDeTeste();
    const relogio = criarRelogioFalso();
    const limitador = criarLimitador({
      banco,
      regras: {
        api: { limite: 1000, janelaSegundos: 60 },
        entrar_falhas: { limiteFalhas: 5, janelaSegundos: 900 },
      },
      agora: relogio.agora,
    });
    const { servidor, url } = await subirServidor(limitador);
    try {
      const corpo = { email: 'gente@exemplo.com', senha: 'senha-errada' };
      for (let i = 1; i <= 5; i++) {
        const resposta = await fetch(`${url}/api/autenticacao/entrar`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(corpo),
        });
        assert.equal(resposta.status, 401, `tentativa ${i} deveria ser credenciais_invalidas`);
      }
      const sexta = await fetch(`${url}/api/autenticacao/entrar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      assert.equal(sexta.status, 429);
      assert.equal(sexta.headers.get('retry-after'), '60');
      const corpoResposta = await sexta.json();
      assert.equal(corpoResposta.erro, 'muitas_tentativas');
    } finally {
      await fechar(servidor);
      limitador._pararLimpezaParaTestes();
    }
  });
});
