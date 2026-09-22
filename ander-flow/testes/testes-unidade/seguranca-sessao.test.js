// seguranca-sessao.test.js — sessão por cookie opaco, com req/res simulados e banco :memory:.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { criarGerenciadorSessao } from '../../servidor/seguranca/seguranca-sessao.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRACAO = join(__dirname, '..', '..', 'banco', 'migracoes', 'banco-migracao-001-inicial.sql');

function criarBancoDeTeste() {
  const banco = new Database(':memory:');
  banco.pragma('foreign_keys = ON');
  banco.exec(readFileSync(CAMINHO_MIGRACAO, 'utf8'));
  return banco;
}

function inserirUsuario(banco, { email = 'a@b.com', papel = 'usuario', plano = 'gratis', situacao = 'ativo' } = {}) {
  const info = banco
    .prepare(
      'INSERT INTO usuarios (email, nome, senha_hash, papel, plano, situacao) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(email, 'Fulano', 'scrypt$1$1$1$c2Fs$aGFzaA==', papel, plano, situacao);
  return info.lastInsertRowid;
}

function criarRes() {
  return {
    cookiesDefinidos: {},
    cookiesLimpos: [],
    cookie(nome, valor, opcoes) {
      this.cookiesDefinidos[nome] = { valor, opcoes };
    },
    clearCookie(nome) {
      this.cookiesLimpos.push(nome);
    },
  };
}

function criarReq({ cookies = {}, ip = '203.0.113.9' } = {}) {
  return { cookies, ip, get: () => undefined };
}

function chamarMiddleware(mw, req, res) {
  return new Promise((resolve) => mw(req, res, (erro) => resolve(erro)));
}

describe('seguranca-sessao', () => {
  test('criarSessao grava só o hash do token no banco (nunca o token em claro)', () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco);
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: { sessaoDias: 30, emProducao: false } });

    const req = criarReq();
    const res = criarRes();
    const token = gerenciador.criarSessao(req, res, usuarioId);

    const linha = banco.prepare('SELECT token_hash FROM sessoes WHERE usuario_id = ?').get(usuarioId);
    assert.ok(linha);
    assert.notEqual(linha.token_hash, token);
    assert.equal(linha.token_hash, createHash('sha256').update(token).digest('base64'));

    assert.equal(res.cookiesDefinidos.af_sessao.opcoes.httpOnly, true);
    assert.equal(res.cookiesDefinidos.af_sessao.opcoes.sameSite, 'lax');
    assert.equal(res.cookiesDefinidos.af_sessao.opcoes.secure, false);
  });

  test('middleware autentica com um token de sessão válido', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco, { email: 'sessao@teste.com' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const resCriacao = criarRes();
    const token = gerenciador.criarSessao(criarReq(), resCriacao, usuarioId);

    const req = criarReq({ cookies: { af_sessao: token } });
    const res = criarRes();
    await chamarMiddleware(gerenciador.middleware, req, res);

    assert.ok(req.usuario);
    assert.equal(req.usuario.id, usuarioId);
    assert.equal(req.usuario.email, 'sessao@teste.com');
    assert.equal('senha_hash' in req.usuario, false);
  });

  test('sessão expirada é ignorada (req.usuario fica null)', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco);
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const token = 'token-de-teste-expirado';
    const tokenHash = createHash('sha256').update(token).digest('base64');
    const expiraEm = new Date(Date.now() - 1000).toISOString(); // já expirou
    banco
      .prepare('INSERT INTO sessoes (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)')
      .run(usuarioId, tokenHash, expiraEm);

    const req = criarReq({ cookies: { af_sessao: token } });
    const res = criarRes();
    await chamarMiddleware(gerenciador.middleware, req, res);

    assert.equal(req.usuario, null);
  });

  test('usuário suspenso é ignorado mesmo com sessão válida', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco, { situacao: 'suspenso' });
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const resCriacao = criarRes();
    const token = gerenciador.criarSessao(criarReq(), resCriacao, usuarioId);

    const req = criarReq({ cookies: { af_sessao: token } });
    const res = criarRes();
    await chamarMiddleware(gerenciador.middleware, req, res);

    assert.equal(req.usuario, null);
  });

  test('encerrarSessao apaga a linha do banco e limpa o cookie', () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco);
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const resCriacao = criarRes();
    const token = gerenciador.criarSessao(criarReq(), resCriacao, usuarioId);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 1);

    const req = criarReq({ cookies: { af_sessao: token } });
    const res = criarRes();
    gerenciador.encerrarSessao(req, res);

    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 0);
    assert.deepEqual(res.cookiesLimpos, ['af_sessao']);
    assert.equal(req.usuario, null);
  });

  test('encerrarTodas remove todas as sessões do usuário', () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco);
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 3);

    gerenciador.encerrarTodas(usuarioId);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 0);
  });

  test('encerrarTodas com excetoAtual mantém a sessão atual', async () => {
    const banco = criarBancoDeTeste();
    const usuarioId = inserirUsuario(banco);
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const tokenA = gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    gerenciador.criarSessao(criarReq(), criarRes(), usuarioId);
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 3);

    const reqAtual = criarReq({ cookies: { af_sessao: tokenA } });
    await chamarMiddleware(gerenciador.middleware, reqAtual, criarRes());

    gerenciador.encerrarTodas(usuarioId, { excetoAtual: reqAtual });
    assert.equal(banco.prepare('SELECT COUNT(*) AS n FROM sessoes').get().n, 1);
  });

  test('exigirSessao: 401 sessao_necessaria sem usuário', async () => {
    const banco = criarBancoDeTeste();
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });
    const req = { usuario: null };
    const erro = await new Promise((resolve) => gerenciador.exigirSessao(req, {}, resolve));
    assert.equal(erro.status, 401);
    assert.equal(erro.codigo, 'sessao_necessaria');
  });

  test('exigirAdmin: 401 sem sessão, 403 sem papel admin, passa para admin', async () => {
    const banco = criarBancoDeTeste();
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });

    const semSessao = { usuario: null };
    const erro401 = await new Promise((resolve) => gerenciador.exigirAdmin(semSessao, {}, resolve));
    assert.equal(erro401.status, 401);
    assert.equal(erro401.codigo, 'sessao_necessaria');

    const comUsuario = { usuario: { papel: 'usuario' } };
    const erro403 = await new Promise((resolve) => gerenciador.exigirAdmin(comUsuario, {}, resolve));
    assert.equal(erro403.status, 403);
    assert.equal(erro403.codigo, 'acesso_negado');

    const comAdmin = { usuario: { papel: 'admin' } };
    const semErro = await new Promise((resolve) => gerenciador.exigirAdmin(comAdmin, {}, resolve));
    assert.equal(semErro, undefined);
  });

  test("exigirPlano('plus'): 403 plano_insuficiente para conta grátis, passa para plus", async () => {
    const banco = criarBancoDeTeste();
    const gerenciador = criarGerenciadorSessao({ banco, configuracao: {} });
    const exigirPlus = gerenciador.exigirPlano('plus');

    const contaGratis = { usuario: { plano: 'gratis' } };
    const erro = await new Promise((resolve) => exigirPlus(contaGratis, {}, resolve));
    assert.equal(erro.status, 403);
    assert.equal(erro.codigo, 'plano_insuficiente');
    assert.equal(erro.extras.plano_necessario, 'plus');

    const contaPlus = { usuario: { plano: 'plus' } };
    const semErro = await new Promise((resolve) => exigirPlus(contaPlus, {}, resolve));
    assert.equal(semErro, undefined);

    const semSessao = { usuario: null };
    const erro401 = await new Promise((resolve) => exigirPlus(semSessao, {}, resolve));
    assert.equal(erro401.status, 401);
  });
});
