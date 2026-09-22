// paginas-conta-fluxo.test.js — telas /entrar, /recuperar-senha e /conta (docs/contratos.md §2,
// §11 bloco "Autenticação"/"Conta"). Sobe o servidor real com banco em memória e confere o HTML
// que o montador devolve (sem executar o JavaScript do navegador).
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

async function subir() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-paginas-conta-'));
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

  let cookies = `af_csrf=${csrf}`;

  async function chamar(caminho, { metodo = 'GET', corpo, redirecionar = 'follow' } = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      redirect: redirecionar,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: cookies },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
      .find((valor) => valor !== undefined);
    if (sessao !== undefined) cookies = `af_csrf=${csrf}; af_sessao=${sessao}`;
    const tipo = resposta.headers.get('content-type') || '';
    const texto = await resposta.text();
    const ehJson = tipo.includes('application/json') && texto;
    return { status: resposta.status, texto, corpo: ehJson ? JSON.parse(texto) : null, resposta };
  }

  return { chamar, fechar: () => servidor.close() };
}

test('GET /entrar devolve 200 com as abas Entrar e Criar conta', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const pagina = await ambiente.chamar('/entrar');
  assert.equal(pagina.status, 200);
  assert.match(pagina.texto, /data-aba="entrar"/);
  assert.match(pagina.texto, /data-aba="criar"/);
  assert.match(pagina.texto, /role="tablist"/);
  assert.match(pagina.texto, /name="aceitou_termos"/);
});

test('GET /entrar?aba=criar continua servindo as duas abas (a troca é do navegador)', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const pagina = await ambiente.chamar('/entrar?aba=criar');
  assert.equal(pagina.status, 200);
  assert.match(pagina.texto, /data-aba="criar"/);
});

test('GET /recuperar-senha devolve 200 com o formulário de pedido e o de redefinição', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const pagina = await ambiente.chamar('/recuperar-senha');
  assert.equal(pagina.status, 200);
  assert.match(pagina.texto, /data-etapa="pedido"/);
  assert.match(pagina.texto, /data-etapa="redefinir"/);
  assert.match(pagina.texto, /name="senha"/);
  assert.match(pagina.texto, /name="confirmar"/);
});

test('GET /conta sem sessão redireciona 302 para /entrar?volta=%2Fconta', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const resposta = await ambiente.chamar('/conta', { redirecionar: 'manual' });
  assert.equal(resposta.status, 302);
  assert.equal(resposta.resposta.headers.get('location'), '/entrar?volta=%2Fconta');
});

test('GET /conta com sessão devolve 200 com o nome do usuário escapado', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const nomeComCaracteresEspeciais = 'Ana & Cia <teste>';
  const criada = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: nomeComCaracteresEspeciais, email: 'ana@teste.dev', senha: SENHA, aceitou_termos: true },
  });
  assert.equal(criada.status, 201);

  const pagina = await ambiente.chamar('/conta');
  assert.equal(pagina.status, 200);
  assert.doesNotMatch(pagina.texto, /Ana & Cia <teste>/);
  assert.match(pagina.texto, /Ana &amp; Cia &lt;teste&gt;/);
  assert.match(pagina.texto, /data-formulario="excluir"/);
  assert.match(pagina.texto, /data-formulario="senha"/);
});
