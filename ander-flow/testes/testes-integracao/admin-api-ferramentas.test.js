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

test('lista de ferramentas da administração traz ativa, plano_efetivo, destaque e usos_30d', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin('/api/admin/ferramentas');
  assert.equal(resposta.status, 200);
  assert.ok(resposta.corpo.ferramentas.length > 0);
  const item = resposta.corpo.ferramentas.find((f) => f.slug === 'preco-de-venda');
  assert.ok(item);
  assert.equal(item.ativa, true);
  assert.equal(item.plano_efetivo, 'gratis');
  assert.equal(item.destaque, false);
  assert.equal(item.usos_30d, 0);
});

test('desativar uma ferramenta some do catálogo público e fica gravado em registros_admin', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const antes = await ambiente.chamarComoAnonimo('/api/ferramentas');
  assert.ok(antes.corpo.ferramentas.some((f) => f.slug === 'preco-de-venda'));

  const patch = await ambiente.chamarComoAdmin('/api/admin/ferramentas/preco-de-venda', {
    metodo: 'PATCH',
    corpo: { ativa: false },
  });
  assert.equal(patch.status, 200);
  assert.equal(patch.corpo.ferramenta.ativa, false);

  const depois = await ambiente.chamarComoAnonimo('/api/ferramentas');
  assert.equal(depois.corpo.ferramentas.some((f) => f.slug === 'preco-de-venda'), false);

  const registro = ambiente.banco
    .prepare("SELECT * FROM registros_admin WHERE acao = 'ferramenta_ajustada' AND alvo = 'preco-de-venda'")
    .get();
  assert.ok(registro);
  assert.equal(registro.usuario_id, ambiente.adminId);
  assert.match(registro.detalhes, /"ativa":0/);
});

test('mudar o plano efetivo de uma ferramenta preserva o destaque já gravado', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  await ambiente.chamarComoAdmin('/api/admin/ferramentas/preco-de-venda', {
    metodo: 'PATCH',
    corpo: { destaque: true },
  });
  const segunda = await ambiente.chamarComoAdmin('/api/admin/ferramentas/preco-de-venda', {
    metodo: 'PATCH',
    corpo: { plano: 'plus' },
  });

  assert.equal(segunda.status, 200);
  assert.equal(segunda.corpo.ferramenta.plano_efetivo, 'plus');
  assert.equal(segunda.corpo.ferramenta.destaque, true);
});

test('ferramenta inexistente responde 404 e entrada inválida responde 400', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const inexistente = await ambiente.chamarComoAdmin('/api/admin/ferramentas/nao-existe', {
    metodo: 'PATCH',
    corpo: { ativa: false },
  });
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.corpo.erro, 'ferramenta_inexistente');

  const invalida = await ambiente.chamarComoAdmin('/api/admin/ferramentas/preco-de-venda', {
    metodo: 'PATCH',
    corpo: { plano: 'ouro' },
  });
  assert.equal(invalida.status, 400);
  assert.equal(invalida.corpo.campos.plano, 'formato_invalido');
});
