import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

const SENHA = 'senha-de-teste-123';

async function subirServidor() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-mensagens-'));
  const configuracao = { ...carregarConfiguracao({ AMBIENTE: 'desenvolvimento' }), pastaExecucao };
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const { app } = await criarAplicativo({ configuracao, banco });
  const servidor = app.listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return { banco, base, fechar: () => servidor.close() };
}

async function abrirSessao(base) {
  const inicial = await fetch(base);
  const csrf = (inicial.headers.getSetCookie?.() ?? [])
    .map((linha) => /af_csrf=([^;]+)/.exec(linha)?.[1])
    .find(Boolean);
  let cookies = `af_csrf=${csrf}`;

  async function chamar(caminho, { metodo = 'GET', corpo, semCsrf = false } = {}) {
    const cabecalhos = { 'Content-Type': 'application/json', Cookie: cookies };
    if (!semCsrf) cabecalhos['X-CSRF-Token'] = csrf;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
      .find((valor) => valor !== undefined);
    if (sessao !== undefined) cookies = `af_csrf=${csrf}; af_sessao=${sessao}`;
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, resposta };
  }

  return { chamar };
}

async function criarUsuario(base, email) {
  const usuario = await abrirSessao(base);
  const criado = await usuario.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Teste', email, senha: SENHA, aceitou_termos: true },
  });
  return { ...usuario, id: criado.corpo.usuario.id };
}

test('envia e lista mensagens do usuário', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'mensagens-a@teste.dev');

  const enviada = await usuario.chamar('/api/mensagens', { metodo: 'POST', corpo: { corpo: 'Olá, preciso de ajuda' } });
  assert.equal(enviada.status, 201);
  assert.equal(enviada.corpo.mensagem.autor, 'usuario');
  assert.equal(enviada.corpo.mensagem.lida, false);

  const lista = await usuario.chamar('/api/mensagens');
  assert.equal(lista.status, 200);
  assert.equal(lista.corpo.mensagens.length, 1);
  assert.equal(lista.corpo.nao_lidas, 0); // mensagem do próprio usuário não conta como não lida
});

test('mensagem de 2001 caracteres é recusada', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'mensagens-b@teste.dev');

  const grande = 'a'.repeat(2001);
  const resposta = await usuario.chamar('/api/mensagens', { metodo: 'POST', corpo: { corpo: grande } });
  assert.equal(resposta.status, 400);
  assert.equal(resposta.corpo.erro, 'dados_invalidos');
  assert.equal(resposta.corpo.campos.corpo, 'formato_invalido');
});

test('mensagem vazia é recusada', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'mensagens-c@teste.dev');

  const resposta = await usuario.chamar('/api/mensagens', { metodo: 'POST', corpo: { corpo: '   ' } });
  assert.equal(resposta.status, 400);
});

test('marca como lidas apenas as mensagens do admin', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'mensagens-d@teste.dev');
  await usuario.chamar('/api/mensagens', { metodo: 'POST', corpo: { corpo: 'Mensagem do usuário' } });

  ambiente.banco
    .prepare("INSERT INTO mensagens (usuario_id, autor, corpo) VALUES (?, 'admin', ?)")
    .run(usuario.id, 'Resposta do admin');

  const antes = await usuario.chamar('/api/mensagens');
  assert.equal(antes.corpo.nao_lidas, 1);

  const marcar = await usuario.chamar('/api/mensagens/lidas', { metodo: 'POST' });
  assert.equal(marcar.status, 204);

  const depois = await usuario.chamar('/api/mensagens');
  assert.equal(depois.corpo.nao_lidas, 0);
  assert.equal(depois.corpo.mensagens.every((mensagem) => mensagem.autor !== 'admin' || mensagem.lida), true);
});

test('sem sessão responde 401 e POST sem CSRF responde 403', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'mensagens-e@teste.dev');

  await usuario.chamar('/api/autenticacao/sair', { metodo: 'POST' });
  const semSessao = await usuario.chamar('/api/mensagens');
  assert.equal(semSessao.status, 401);
  assert.equal(semSessao.corpo.erro, 'sessao_necessaria');

  const outro = await criarUsuario(ambiente.base, 'mensagens-f@teste.dev');
  const semCsrf = await outro.chamar('/api/mensagens', { metodo: 'POST', corpo: { corpo: 'Oi' }, semCsrf: true });
  assert.equal(semCsrf.status, 403);
  assert.equal(semCsrf.corpo.erro, 'csrf_invalido');
});
