import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarAplicativo } from '../../servidor/servidor.js';
import { abrirBanco } from '../../banco/banco.js';
import { migrar } from '../../banco/banco-migrador.js';
import { carregarConfiguracao } from '../../servidor/servidor-configuracao.js';

const SENHA = 'senha-de-teste-123';

async function subir() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-autenticacao-'));
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

  async function chamar(caminho, { metodo = 'GET', corpo, cookies = `af_csrf=${csrf}` } = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        Cookie: cookies,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, resposta };
  }

  function cookiesDe(resposta, sessaoAnterior = '') {
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]+)/.exec(linha)?.[1])
      .find(Boolean);
    return `af_csrf=${csrf}; af_sessao=${sessao ?? sessaoAnterior}`;
  }

  return { base, banco, servidor, chamar, cookiesDe, csrf, pastaExecucao, fechar: () => servidor.close() };
}

test('criar conta abre sessão e recusa e-mail repetido, senha curta e termos sem aceite', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const criada = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Anderson', email: ' Anderson@Teste.Dev ', senha: SENHA, aceitou_termos: true },
  });
  assert.equal(criada.status, 201);
  assert.equal(criada.corpo.usuario.email, 'anderson@teste.dev');
  assert.equal(criada.corpo.usuario.senha_hash, undefined);

  const repetida = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Outro', email: 'anderson@teste.dev', senha: SENHA, aceitou_termos: true },
  });
  assert.equal(repetida.corpo.erro, 'email_em_uso');

});

// Cada caso recusado consome uma das 3 criações por hora do mesmo IP, então vai em outro ambiente.
test('senha curta e termos sem aceite são recusados', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const curta = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Outro', email: 'outro@teste.dev', senha: 'curta', aceitou_termos: true },
  });
  assert.equal(curta.status, 400);

  const semTermos = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Outro', email: 'outro2@teste.dev', senha: SENHA, aceitou_termos: false },
  });
  assert.equal(semTermos.corpo.erro, 'termos_nao_aceitos');
});

test('quarta criação de conta na mesma hora e no mesmo IP é bloqueada', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  for (let n = 1; n <= 3; n++) {
    const criada = await ambiente.chamar('/api/autenticacao/criar-conta', {
      metodo: 'POST',
      corpo: { nome: `Pessoa ${n}`, email: `pessoa${n}@teste.dev`, senha: SENHA, aceitou_termos: true },
    });
    assert.equal(criada.status, 201, `criação ${n}`);
  }

  const quarta = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Pessoa 4', email: 'pessoa4@teste.dev', senha: SENHA, aceitou_termos: true },
  });
  assert.equal(quarta.status, 429);
  assert.equal(quarta.corpo.erro, 'muitas_tentativas');
});

test('login errado seis vezes em quinze minutos devolve 429 com Retry-After', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Anderson', email: 'anderson@teste.dev', senha: SENHA, aceitou_termos: true },
  });

  for (let tentativa = 1; tentativa <= 5; tentativa++) {
    const erro = await ambiente.chamar('/api/autenticacao/entrar', {
      metodo: 'POST',
      corpo: { email: 'anderson@teste.dev', senha: 'senha-errada-aqui' },
    });
    assert.equal(erro.corpo.erro, 'credenciais_invalidas', `tentativa ${tentativa}`);
  }

  const bloqueada = await ambiente.chamar('/api/autenticacao/entrar', {
    metodo: 'POST',
    corpo: { email: 'anderson@teste.dev', senha: 'senha-errada-aqui' },
  });
  assert.equal(bloqueada.status, 429);
  assert.equal(bloqueada.corpo.erro, 'muitas_tentativas');
  assert.ok(Number(bloqueada.resposta.headers.get('retry-after')) > 0);
});

test('e-mail que não existe devolve o mesmo erro de senha errada', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const semConta = await ambiente.chamar('/api/autenticacao/entrar', {
    metodo: 'POST',
    corpo: { email: 'ninguem@teste.dev', senha: SENHA },
  });
  assert.equal(semConta.corpo.erro, 'credenciais_invalidas');
});

test('POST sem o cabeçalho CSRF é recusado', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const resposta = await fetch(`${ambiente.base}/api/autenticacao/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: `af_csrf=${ambiente.csrf}` },
    body: JSON.stringify({ email: 'a@b.dev', senha: SENHA }),
  });
  assert.equal(resposta.status, 403);
  assert.equal((await resposta.json()).erro, 'csrf_invalido');
});

test('recuperar senha grava o e-mail e o token só serve uma vez', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Anderson', email: 'anderson@teste.dev', senha: SENHA, aceitou_termos: true },
  });

  const pedido = await ambiente.chamar('/api/autenticacao/recuperar-senha', {
    metodo: 'POST',
    corpo: { email: 'anderson@teste.dev' },
  });
  assert.equal(pedido.status, 202);

  const pastaEmails = join(ambiente.pastaExecucao, 'emails');
  const arquivos = readdirSync(pastaEmails);
  assert.equal(arquivos.length, 1);
  const conteudo = readFileSync(join(pastaEmails, arquivos[0]), 'utf8');
  const token = /token=([A-Za-z0-9_-]+)/.exec(conteudo)?.[1];
  assert.ok(token, 'o e-mail precisa trazer o link com token');

  const primeira = await ambiente.chamar('/api/autenticacao/redefinir-senha', {
    metodo: 'POST',
    corpo: { token, senha: 'outra-senha-boa-456' },
  });
  assert.equal(primeira.status, 204);

  const segunda = await ambiente.chamar('/api/autenticacao/redefinir-senha', {
    metodo: 'POST',
    corpo: { token, senha: 'mais-uma-senha-789' },
  });
  assert.equal(segunda.corpo.erro, 'token_invalido');

  const entrar = await ambiente.chamar('/api/autenticacao/entrar', {
    metodo: 'POST',
    corpo: { email: 'anderson@teste.dev', senha: 'outra-senha-boa-456' },
  });
  assert.equal(entrar.status, 200);
});

test('e-mail que não existe também devolve 202, sem revelar nada', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const pedido = await ambiente.chamar('/api/autenticacao/recuperar-senha', {
    metodo: 'POST',
    corpo: { email: 'ninguem@teste.dev' },
  });
  assert.equal(pedido.status, 202);
});

test('sair encerra a sessão', async (t) => {
  const ambiente = await subir();
  t.after(() => ambiente.fechar());

  const criada = await ambiente.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Anderson', email: 'anderson@teste.dev', senha: SENHA, aceitou_termos: true },
  });
  const cookies = ambiente.cookiesDe(criada.resposta);

  const comSessao = await ambiente.chamar('/api/autenticacao/sessao', { cookies });
  assert.equal(comSessao.corpo.usuario.email, 'anderson@teste.dev');

  await ambiente.chamar('/api/autenticacao/sair', { metodo: 'POST', cookies });
  const depois = await ambiente.chamar('/api/autenticacao/sessao', { cookies });
  assert.equal(depois.corpo.usuario, null);
});
