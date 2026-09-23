// paginas-trabalho-rotas.test.js — acesso das páginas /trabalho (sessão), /salvos (público) e
// /avisos (público; mensagens exigem sessão), conforme docs/contratos.md §2.
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
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-paginas-trabalho-'));
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

  async function chamar(caminho, { metodo = 'GET', corpo, redirecionar = 'follow' } = {}) {
    const cabecalhos = { Cookie: cookies };
    if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
    if (metodo !== 'GET') cabecalhos['X-CSRF-Token'] = csrf;
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: cabecalhos,
      redirect: redirecionar,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
      .find((valor) => valor !== undefined);
    if (sessao !== undefined) cookies = `af_csrf=${csrf}; af_sessao=${sessao}`;
    return resposta;
  }

  return { chamar };
}

test('GET /salvos responde 200 sem sessão', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/salvos');
  assert.equal(resposta.status, 200);
});

test('GET /avisos responde 200 sem sessão', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/avisos');
  assert.equal(resposta.status, 200);
});

test('GET /trabalho sem sessão redireciona para /entrar?volta=%2Ftrabalho', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/trabalho', { redirecionar: 'manual' });
  assert.equal(resposta.status, 302);
  assert.equal(resposta.headers.get('location'), '/entrar?volta=%2Ftrabalho');
});

test('GET /trabalho com sessão responde 200', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await abrirSessao(ambiente.base);
  const criada = await usuario.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Teste', email: 'trabalho-rota@teste.dev', senha: SENHA, aceitou_termos: true },
  });
  assert.equal(criada.status, 201);

  const resposta = await usuario.chamar('/trabalho');
  assert.equal(resposta.status, 200);
});
