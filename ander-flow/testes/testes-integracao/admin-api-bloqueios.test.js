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

test('lista bloqueios ativos e desbloquear faz o item sumir da lista', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  ambiente.banco
    .prepare(
      `INSERT INTO limites_trafego (grupo, chave, reincidencias, bloqueado_ate, ultima_infracao_em)
       VALUES ('entrar_falhas', '127.0.0.1|alguem@teste.dev', 1, ?, ?)`,
    )
    .run(new Date(Date.now() + 5 * 60 * 1000).toISOString(), new Date().toISOString());

  const lista = await ambiente.chamarComoAdmin('/api/admin/bloqueios');
  assert.equal(lista.status, 200);
  assert.equal(lista.corpo.bloqueios.length, 1);
  assert.equal(lista.corpo.bloqueios[0].grupo, 'entrar_falhas');

  const removido = await ambiente.chamarComoAdmin('/api/admin/bloqueios', {
    metodo: 'DELETE',
    corpo: { grupo: 'entrar_falhas', chave: '127.0.0.1|alguem@teste.dev' },
  });
  assert.equal(removido.status, 204);

  const listaDepois = await ambiente.chamarComoAdmin('/api/admin/bloqueios');
  assert.equal(listaDepois.corpo.bloqueios.length, 0);

  const registro = ambiente.banco.prepare("SELECT * FROM registros_admin WHERE acao = 'bloqueio_removido'").get();
  assert.ok(registro);
  // o e-mail da chave nunca é gravado em claro no registro do admin.
  assert.equal(registro.alvo.includes('alguem@teste.dev'), false);
});

test('desbloquear sem grupo/chave válidos responde 400', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin('/api/admin/bloqueios', {
    metodo: 'DELETE',
    corpo: { grupo: '', chave: '' },
  });
  assert.equal(resposta.status, 400);
});
