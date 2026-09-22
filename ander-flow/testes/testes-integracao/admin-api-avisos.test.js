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

const AVISO_BASE = {
  tipo: 'sistema',
  publico: 'todos',
  titulo_pt_br: 'Manutenção programada',
  titulo_en: 'Scheduled maintenance',
  corpo_pt_br: 'O sistema ficará fora do ar por 10 minutos.',
  corpo_en: 'The system will be down for 10 minutes.',
};

test('criar aviso com link javascript: é recusado com 400', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, link_url: 'javascript:alert(1)' },
  });
  assert.equal(resposta.status, 400);
  assert.equal(resposta.corpo.campos.link_url, 'formato_invalido');

  const total = ambiente.banco.prepare('SELECT COUNT(*) AS total FROM avisos').get().total;
  assert.equal(total, 0);
});

test('link_url absoluto disfarçado (//) também é recusado; https:// e caminho relativo são aceitos', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const disfarcado = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, link_url: '//evil.example.com' },
  });
  assert.equal(disfarcado.status, 400);

  const relativo = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, link_url: '/planos' },
  });
  assert.equal(relativo.status, 201);
  assert.equal(relativo.corpo.aviso.link_url, '/planos');

  const absoluto = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, link_url: 'https://ander-flow.example.com/planos' },
  });
  assert.equal(absoluto.status, 201);
});

test('criar, editar e excluir um aviso; toda alteração grava registros_admin', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const criado = await ambiente.chamarComoAdmin('/api/admin/avisos', { metodo: 'POST', corpo: AVISO_BASE });
  assert.equal(criado.status, 201);
  const id = criado.corpo.aviso.id;
  assert.equal(criado.corpo.aviso.ativo, true);

  const editado = await ambiente.chamarComoAdmin(`/api/admin/avisos/${id}`, {
    metodo: 'PATCH',
    corpo: { ativo: false },
  });
  assert.equal(editado.status, 200);
  assert.equal(editado.corpo.aviso.ativo, false);

  const lista = await ambiente.chamarComoAdmin('/api/admin/avisos');
  assert.equal(lista.corpo.avisos.length, 1);

  const excluido = await ambiente.chamarComoAdmin(`/api/admin/avisos/${id}`, { metodo: 'DELETE' });
  assert.equal(excluido.status, 204);

  const listaDepois = await ambiente.chamarComoAdmin('/api/admin/avisos');
  assert.equal(listaDepois.corpo.avisos.length, 0);

  const acoes = ambiente.banco
    .prepare("SELECT acao FROM registros_admin WHERE alvo = ? ORDER BY id")
    .all(String(id))
    .map((linha) => linha.acao);
  assert.deepEqual(acoes, ['aviso_criado', 'aviso_atualizado', 'aviso_excluido']);
});

test('tipo, público e data inválidos são recusados; campo obrigatório ausente também', async (t) => {
  const ambiente = await subirAmbienteAdmin();
  t.after(() => ambiente.fechar());

  const semTitulo = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, titulo_pt_br: undefined },
  });
  assert.equal(semTitulo.status, 400);
  assert.equal(semTitulo.corpo.campos.titulo_pt_br, 'campo_obrigatorio');

  const tipoInvalido = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, tipo: 'banner' },
  });
  assert.equal(tipoInvalido.status, 400);
  assert.equal(tipoInvalido.corpo.campos.tipo, 'formato_invalido');

  const dataInvalida = await ambiente.chamarComoAdmin('/api/admin/avisos', {
    metodo: 'POST',
    corpo: { ...AVISO_BASE, inicio_em: 'ontem' },
  });
  assert.equal(dataInvalida.status, 400);
  assert.equal(dataInvalida.corpo.campos.inicio_em, 'formato_invalido');
});
