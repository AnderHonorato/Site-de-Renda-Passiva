import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';
import { gerarHashSenha } from '../../servidor/seguranca/seguranca-senha.js';

const SENHA = 'senha-de-teste-123';
const EMAIL_ADMIN = 'admin@teste.dev';
const EMAIL_USUARIO = 'comum@teste.dev';

// Ambiente comum dos testes de administração: banco `:memory:` migrado, um usuário comum
// (fluxo público normal) e um admin (inserido direto no banco — o fluxo público nunca cria
// papel "admin"). Todas as sessões compartilham o mesmo cookie `af_csrf` (docs/briefing-onda-2.md).
async function subirAmbienteAdmin() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-admin-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const inicial = await fetch(base);
  const csrf = (inicial.headers.getSetCookie?.() ?? [])
    .map((linha) => /af_csrf=([^;]+)/.exec(linha)?.[1])
    .find(Boolean);

  function criarSessao() {
    let cookies = `af_csrf=${csrf}`;
    return async function chamar(caminho, { metodo = 'GET', corpo } = {}) {
      const resposta = await fetch(base + caminho, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: cookies },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      const sessao = (resposta.headers.getSetCookie?.() ?? [])
        .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
        .find((valor) => valor !== undefined);
      if (sessao !== undefined) cookies = sessao ? `af_csrf=${csrf}; af_sessao=${sessao}` : `af_csrf=${csrf}`;
      const texto = await resposta.text();
      return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, resposta };
    };
  }

  const chamarComoAnonimo = criarSessao();

  const chamarComoUsuario = criarSessao();
  await chamarComoUsuario('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Comum', email: EMAIL_USUARIO, senha: SENHA, aceitou_termos: true },
  });
  const usuarioComumId = banco.prepare('SELECT id FROM usuarios WHERE email = ?').get(EMAIL_USUARIO).id;

  const hashAdmin = await gerarHashSenha(SENHA);
  banco
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, papel) VALUES ('Admin', ?, ?, 'admin')")
    .run(EMAIL_ADMIN, hashAdmin);
  const adminId = banco.prepare('SELECT id FROM usuarios WHERE email = ?').get(EMAIL_ADMIN).id;

  const chamarComoAdmin = criarSessao();
  await chamarComoAdmin('/api/autenticacao/entrar', { metodo: 'POST', corpo: { email: EMAIL_ADMIN, senha: SENHA } });

  return {
    banco,
    csrf,
    criarSessao,
    chamarComoAnonimo,
    chamarComoUsuario,
    chamarComoAdmin,
    usuarioComumId,
    adminId,
    fechar: () => servidor.close(),
  };
}

test('sem sessão, a administração responde 401', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAnonimo('/api/admin/resumo');
  assert.equal(resposta.status, 401);
  assert.equal(resposta.corpo.erro, 'sessao_necessaria');
});

test('usuário comum recebe 403 na administração', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoUsuario('/api/admin/resumo');
  assert.equal(resposta.status, 403);
  assert.equal(resposta.corpo.erro, 'acesso_negado');
});

test('admin recebe 200 e o resumo com as contagens esperadas', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin('/api/admin/resumo');
  assert.equal(resposta.status, 200);
  assert.equal(resposta.corpo.usuarios.total, 2); // usuário comum + admin
  assert.equal(resposta.corpo.usuarios.plus, 0);
  assert.equal(resposta.corpo.bloqueios_ativos, 0);
  assert.equal(resposta.corpo.mensagens_nao_lidas, 0);
  assert.equal(typeof resposta.corpo.ferramentas.total, 'number');
});
