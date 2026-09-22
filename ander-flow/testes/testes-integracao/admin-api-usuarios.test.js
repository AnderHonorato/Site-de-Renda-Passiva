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

test('busca de usuários pagina 20 por página e "%" digitado não vira curinga', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const todos = await ambiente.chamarComoAdmin('/api/admin/usuarios');
  assert.equal(todos.status, 200);
  assert.equal(todos.corpo.pagina, 1);
  assert.equal(todos.corpo.total, 2);

  const porEmail = await ambiente.chamarComoAdmin(`/api/admin/usuarios?busca=${encodeURIComponent(EMAIL_USUARIO)}`);
  assert.equal(porEmail.corpo.total, 1);
  assert.equal(porEmail.corpo.usuarios[0].email, EMAIL_USUARIO);

  // "%" literal no e-mail buscado não deve casar com nada (não é tratado como curinga SQL).
  const comCoringa = await ambiente.chamarComoAdmin('/api/admin/usuarios?busca=%25%25%25');
  assert.equal(comCoringa.corpo.total, 0);
});

test('mudar o plano do usuário para plus reflete na sessão dele', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const patch = await ambiente.chamarComoAdmin(`/api/admin/usuarios/${ambiente.usuarioComumId}`, {
    metodo: 'PATCH',
    corpo: { plano: 'plus' },
  });
  assert.equal(patch.status, 200);
  assert.equal(patch.corpo.usuario.plano, 'plus');

  const chamarComoUsuario = ambiente.criarSessao();
  await chamarComoUsuario('/api/autenticacao/entrar', { metodo: 'POST', corpo: { email: EMAIL_USUARIO, senha: SENHA } });
  const sessaoUsuario = await chamarComoUsuario('/api/autenticacao/sessao');
  assert.equal(sessaoUsuario.corpo.usuario.plano, 'plus');
});

test('admin não consegue rebaixar nem suspender a si mesmo', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const rebaixar = await ambiente.chamarComoAdmin(`/api/admin/usuarios/${ambiente.adminId}`, {
    metodo: 'PATCH',
    corpo: { papel: 'usuario' },
  });
  assert.equal(rebaixar.status, 400);
  assert.equal(rebaixar.corpo.erro, 'acao_nao_permitida');

  const suspender = await ambiente.chamarComoAdmin(`/api/admin/usuarios/${ambiente.adminId}`, {
    metodo: 'PATCH',
    corpo: { situacao: 'suspenso' },
  });
  assert.equal(suspender.status, 400);
  assert.equal(suspender.corpo.erro, 'acao_nao_permitida');
});

test('suspender um usuário encerra as sessões dele e ele deixa de conseguir entrar', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const sessoesAntes = ambiente.banco.prepare('SELECT COUNT(*) AS total FROM sessoes').get().total;
  assert.ok(sessoesAntes >= 1);

  const suspender = await ambiente.chamarComoAdmin(`/api/admin/usuarios/${ambiente.usuarioComumId}`, {
    metodo: 'PATCH',
    corpo: { situacao: 'suspenso' },
  });
  assert.equal(suspender.status, 200);
  assert.equal(suspender.corpo.usuario.situacao, 'suspenso');

  const sessoesDoUsuario = ambiente.banco
    .prepare('SELECT COUNT(*) AS total FROM sessoes WHERE usuario_id = ?')
    .get(ambiente.usuarioComumId).total;
  assert.equal(sessoesDoUsuario, 0);

  const entrar = await ambiente.chamarComoAnonimo('/api/autenticacao/entrar', {
    metodo: 'POST',
    corpo: { email: EMAIL_USUARIO, senha: SENHA },
  });
  assert.equal(entrar.status, 403);
  assert.equal(entrar.corpo.erro, 'conta_suspensa');
});

test('POST encerrar-sessoes derruba as sessões do usuário indicado', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin(`/api/admin/usuarios/${ambiente.usuarioComumId}/encerrar-sessoes`, {
    metodo: 'POST',
  });
  assert.equal(resposta.status, 204);

  const sessoesDoUsuario = ambiente.banco
    .prepare('SELECT COUNT(*) AS total FROM sessoes WHERE usuario_id = ?')
    .get(ambiente.usuarioComumId).total;
  assert.equal(sessoesDoUsuario, 0);

  const registro = ambiente.banco
    .prepare("SELECT * FROM registros_admin WHERE acao = 'sessoes_encerradas'")
    .get();
  assert.ok(registro);
});

test('usuário inexistente responde 404', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin('/api/admin/usuarios/999999', {
    metodo: 'PATCH',
    corpo: { plano: 'plus' },
  });
  assert.equal(resposta.status, 404);
  assert.equal(resposta.corpo.erro, 'usuario_inexistente');
});
