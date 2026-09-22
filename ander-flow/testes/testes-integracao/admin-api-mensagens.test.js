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

test('conversas trazem contagem de não lidas e abrir marca as do usuário como lidas', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  ambiente.banco
    .prepare("INSERT INTO mensagens (usuario_id, autor, corpo) VALUES (?, 'usuario', 'Oi, preciso de ajuda')")
    .run(ambiente.usuarioComumId);
  ambiente.banco
    .prepare("INSERT INTO mensagens (usuario_id, autor, corpo) VALUES (?, 'usuario', 'Segunda mensagem')")
    .run(ambiente.usuarioComumId);

  const conversas = await ambiente.chamarComoAdmin('/api/admin/mensagens');
  assert.equal(conversas.status, 200);
  assert.equal(conversas.corpo.conversas.length, 1);
  assert.equal(conversas.corpo.conversas[0].usuario_id, ambiente.usuarioComumId);
  assert.equal(conversas.corpo.conversas[0].nao_lidas, 2);

  const aberta = await ambiente.chamarComoAdmin(`/api/admin/mensagens/${ambiente.usuarioComumId}`);
  assert.equal(aberta.status, 200);
  assert.equal(aberta.corpo.mensagens.length, 2);
  assert.ok(aberta.corpo.mensagens.every((mensagem) => mensagem.lida === true));

  const conversasDepois = await ambiente.chamarComoAdmin('/api/admin/mensagens');
  assert.equal(conversasDepois.corpo.conversas[0].nao_lidas, 0);
});

test('admin responde com autor "admin" e a resposta fica gravada', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  ambiente.banco
    .prepare("INSERT INTO mensagens (usuario_id, autor, corpo) VALUES (?, 'usuario', 'Dúvida sobre planos')")
    .run(ambiente.usuarioComumId);

  const resposta = await ambiente.chamarComoAdmin(`/api/admin/mensagens/${ambiente.usuarioComumId}`, {
    metodo: 'POST',
    corpo: { corpo: 'Já te ajudo!' },
  });
  assert.equal(resposta.status, 201);
  assert.equal(resposta.corpo.mensagem.autor, 'admin');
  assert.equal(resposta.corpo.mensagem.corpo, 'Já te ajudo!');

  const linhaAdmin = ambiente.banco
    .prepare("SELECT * FROM mensagens WHERE autor = 'admin' AND usuario_id = ?")
    .get(ambiente.usuarioComumId);
  assert.ok(linhaAdmin);
  assert.equal(linhaAdmin.admin_id, ambiente.adminId);

  const registro = ambiente.banco.prepare("SELECT * FROM registros_admin WHERE acao = 'mensagem_respondida'").get();
  assert.ok(registro);
  assert.equal(registro.detalhes, null); // nunca grava o corpo da mensagem.
});

test('corpo vazio é recusado e usuário inexistente responde 404', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const vazio = await ambiente.chamarComoAdmin(`/api/admin/mensagens/${ambiente.usuarioComumId}`, {
    metodo: 'POST',
    corpo: { corpo: '' },
  });
  assert.equal(vazio.status, 400);

  const inexistente = await ambiente.chamarComoAdmin('/api/admin/mensagens/999999');
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.corpo.erro, 'usuario_inexistente');
});
