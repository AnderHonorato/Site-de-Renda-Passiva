// seguranca-sessao.test.js (integração) — servidor Express real: login grava sessão, o
// cookie volta em requisições seguintes, exigirAdmin/exigirPlano protegem rotas e sair encerra.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { criarGerenciadorSessao } from '../../servidor/seguranca/seguranca-sessao.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

function criarBancoDeTeste() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
  return banco;
}

function inserirUsuario(banco, { email, papel = 'usuario', plano = 'gratis' }) {
  const info = banco
    .prepare('INSERT INTO usuarios (email, nome, senha_hash, papel, plano) VALUES (?, ?, ?, ?, ?)')
    .run(email, 'Fulano', 'scrypt$1$1$1$c2Fs$aGFzaA==', papel, plano);
  return info.lastInsertRowid;
}

// Leitor de cookies simples, só para o teste (ver nota em seguranca-csrf.test.js de integração).
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

function tratadorDeErros(erro, req, res, _next) {
  res.status(erro.status ?? 500).json({ erro: erro.codigo ?? 'erro_interno', ...erro.extras });
}

async function subirServidor(gerenciador, usuariosPorId) {
  const app = express();
  app.use(express.json());
  app.use(leitorDeCookies);
  app.use(gerenciador.middleware);

  app.post('/entrar-de-teste', (req, res) => {
    gerenciador.criarSessao(req, res, req.body.usuarioId);
    res.status(204).end();
  });
  app.get('/api/quem-sou-eu', (req, res) => res.status(200).json({ usuario: req.usuario }));
  app.get('/api/admin/algo', gerenciador.exigirAdmin, (req, res) => res.status(200).json({ ok: true }));
  app.get('/api/plus/algo', gerenciador.exigirPlano('plus'), (req, res) => res.status(200).json({ ok: true }));
  app.post('/api/sair', (req, res) => {
    gerenciador.encerrarSessao(req, res);
    res.status(204).end();
  });
  app.use(tratadorDeErros);

  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = servidor.address();
  return { servidor, url: `http://127.0.0.1:${port}` };
}

function fechar(servidor) {
  return new Promise((resolve) => servidor.close(resolve));
}

describe('seguranca-sessao (integração)', () => {
  test('fluxo completo: entrar grava cookie, requisição seguinte reconhece o usuário, sair encerra', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco, { email: 'pessoa@exemplo.com' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: { sessaoDias: 30, emProducao: false } });
    const { servidor, url } = await subirServidor(gerenciador);
    try {
      const respostaEntrar = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      });
      const cookieSessao = extrairCookie(respostaEntrar, 'af_sessao');
      assert.ok(cookieSessao);

      const respostaQuemSouEu = await fetch(`${url}/api/quem-sou-eu`, {
        headers: { cookie: `af_sessao=${cookieSessao}` },
      });
      const corpo = await respostaQuemSouEu.json();
      assert.equal(corpo.usuario.email, 'pessoa@exemplo.com');

      const respostaSemCookie = await fetch(`${url}/api/quem-sou-eu`);
      const corpoSemCookie = await respostaSemCookie.json();
      assert.equal(corpoSemCookie.usuario, null);

      const respostaSair = await fetch(`${url}/api/sair`, {
        method: 'POST',
        headers: { cookie: `af_sessao=${cookieSessao}` },
      });
      assert.equal(respostaSair.status, 204);

      const respostaDepoisDeSair = await fetch(`${url}/api/quem-sou-eu`, {
        headers: { cookie: `af_sessao=${cookieSessao}` },
      });
      const corpoDepoisDeSair = await respostaDepoisDeSair.json();
      assert.equal(corpoDepoisDeSair.usuario, null);
    } finally {
      await fechar(servidor);
    }
  });

  test('exigirAdmin: 401 sem cookie, 403 para usuário comum, 200 para admin', async () => {
    const banco = criarBancoDeTeste();
    const usuarioComumId = inserirUsuario(banco, { email: 'comum@exemplo.com', papel: 'usuario' });
    const adminId = inserirUsuario(banco, { email: 'admin@exemplo.com', papel: 'admin' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });
    const { servidor, url } = await subirServidor(gerenciador);
    try {
      const semCookie = await fetch(`${url}/api/admin/algo`);
      assert.equal(semCookie.status, 401);

      const loginComum = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId: usuarioComumId }),
      });
      const cookieComum = extrairCookie(loginComum, 'af_sessao');
      const comoComum = await fetch(`${url}/api/admin/algo`, { headers: { cookie: `af_sessao=${cookieComum}` } });
      assert.equal(comoComum.status, 403);
      assert.equal((await comoComum.json()).erro, 'acesso_negado');

      const loginAdmin = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId: adminId }),
      });
      const cookieAdmin = extrairCookie(loginAdmin, 'af_sessao');
      const comoAdmin = await fetch(`${url}/api/admin/algo`, { headers: { cookie: `af_sessao=${cookieAdmin}` } });
      assert.equal(comoAdmin.status, 200);
    } finally {
      await fechar(servidor);
    }
  });

  test("exigirPlano('plus'): 403 plano_insuficiente para conta grátis, 200 para plus", async () => {
    const banco = criarBancoDeTeste();
    const gratisId = inserirUsuario(banco, { email: 'gratis@exemplo.com', plano: 'gratis' });
    const plusId = inserirUsuario(banco, { email: 'plus@exemplo.com', plano: 'plus' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });
    const { servidor, url } = await subirServidor(gerenciador);
    try {
      const loginGratis = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId: gratisId }),
      });
      const cookieGratis = extrairCookie(loginGratis, 'af_sessao');
      const comoGratis = await fetch(`${url}/api/plus/algo`, { headers: { cookie: `af_sessao=${cookieGratis}` } });
      assert.equal(comoGratis.status, 403);
      assert.equal((await comoGratis.json()).plano_necessario, 'plus');

      const loginPlus = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId: plusId }),
      });
      const cookiePlus = extrairCookie(loginPlus, 'af_sessao');
      const comoPlus = await fetch(`${url}/api/plus/algo`, { headers: { cookie: `af_sessao=${cookiePlus}` } });
      assert.equal(comoPlus.status, 200);
    } finally {
      await fechar(servidor);
    }
  });

  test('usuário suspenso é ignorado (sessão não autentica)', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco, { email: 'suspenso@exemplo.com' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });
    const { servidor, url } = await subirServidor(gerenciador);
    try {
      const login = await fetch(`${url}/entrar-de-teste`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ usuarioId }),
      });
      const cookie = extrairCookie(login, 'af_sessao');

      banco.prepare("UPDATE usuarios SET situacao = 'suspenso' WHERE id = ?").run(usuarioId);

      const resposta = await fetch(`${url}/api/quem-sou-eu`, { headers: { cookie: `af_sessao=${cookie}` } });
      const corpo = await resposta.json();
      assert.equal(corpo.usuario, null);
    } finally {
      await fechar(servidor);
    }
  });
});
