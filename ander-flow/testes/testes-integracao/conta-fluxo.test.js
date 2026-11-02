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

async function subirComConta() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-conta-'));
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

  async function chamar(caminho, { metodo = 'GET', corpo } = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: cookies },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const sessao = (resposta.headers.getSetCookie?.() ?? [])
      .map((linha) => /af_sessao=([^;]*)/.exec(linha)?.[1])
      .find((valor) => valor !== undefined);
    if (sessao !== undefined) cookies = `af_csrf=${csrf}; af_sessao=${sessao}`;
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, resposta };
  }

  await chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Anderson', email: 'anderson@teste.dev', senha: SENHA, aceitou_termos: true },
  });

  return { banco, chamar, fechar: () => servidor.close() };
}

test('conta devolve dados, uso e limites do plano', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug: 'preco-de-venda' } });

  const conta = await ambiente.chamar('/api/conta');
  assert.equal(conta.status, 200);
  assert.equal(conta.corpo.usuario.email, 'anderson@teste.dev');
  assert.equal(conta.corpo.usuario.senha_hash, undefined);
  assert.equal(conta.corpo.uso.favoritos, 1);
  assert.equal(conta.corpo.limites.favoritos, 10);
  assert.equal(conta.corpo.limites.lote_arquivos, 3);
});

test('preferências aceitam idioma e tema válidos e recusam o resto', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  const boa = await ambiente.chamar('/api/conta', { metodo: 'PATCH', corpo: { nome: ' Ander ', idioma: 'en', tema: 'escuro' } });
  assert.equal(boa.status, 200);
  assert.equal(boa.corpo.usuario.nome, 'Ander');
  assert.equal(boa.corpo.usuario.idioma, 'en');
  assert.equal(boa.corpo.usuario.tema, 'escuro');

  const ruim = await ambiente.chamar('/api/conta', { metodo: 'PATCH', corpo: { idioma: 'fr' } });
  assert.equal(ruim.status, 400);
  assert.equal(ruim.corpo.campos.idioma, 'formato_invalido');
});

test('trocar senha exige a senha atual e encerra as outras sessões', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  const sessoesAntes = ambiente.banco.prepare('SELECT COUNT(*) AS total FROM sessoes').get().total;
  assert.equal(sessoesAntes, 1);

  const errada = await ambiente.chamar('/api/conta/senha', {
    metodo: 'POST',
    corpo: { senha_atual: 'nao-e-essa-123', senha_nova: 'outra-senha-boa-456' },
  });
  assert.equal(errada.corpo.erro, 'senha_atual_incorreta');

  const certa = await ambiente.chamar('/api/conta/senha', {
    metodo: 'POST',
    corpo: { senha_atual: SENHA, senha_nova: 'outra-senha-boa-456' },
  });
  assert.equal(certa.status, 204);

  const entrar = await ambiente.chamar('/api/autenticacao/entrar', {
    metodo: 'POST',
    corpo: { email: 'anderson@teste.dev', senha: 'outra-senha-boa-456' },
  });
  assert.equal(entrar.status, 200);
});

test('exportar traz os dados do usuário sem hash de senha', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug: 'juntar-pdf' } });
  const exportado = await ambiente.chamar('/api/conta/exportar');

  assert.equal(exportado.status, 200);
  assert.match(exportado.resposta.headers.get('content-disposition') ?? '', /ander-flow-meus-dados\.json/);
  assert.equal(exportado.corpo.favoritos.length, 1);
  assert.equal(JSON.stringify(exportado.corpo).includes('senha_hash'), false);
  assert.equal(JSON.stringify(exportado.corpo).includes('token'), false);
});

test('excluir conta exige senha e apaga tudo em cascata', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/favoritos', { metodo: 'POST', corpo: { slug: 'preco-de-venda' } });

  const semSenha = await ambiente.chamar('/api/conta/excluir', { metodo: 'POST', corpo: { senha: 'errada-errada-1' } });
  assert.equal(semSenha.corpo.erro, 'senha_atual_incorreta');

  const excluida = await ambiente.chamar('/api/conta/excluir', { metodo: 'POST', corpo: { senha: SENHA } });
  assert.equal(excluida.status, 204);

  assert.equal(ambiente.banco.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total, 0);
  assert.equal(ambiente.banco.prepare('SELECT COUNT(*) AS total FROM favoritos').get().total, 0);
  assert.equal(ambiente.banco.prepare('SELECT COUNT(*) AS total FROM sessoes').get().total, 0);

  const depois = await ambiente.chamar('/api/conta');
  assert.equal(depois.status, 401);
});

test('uso mensal conta documentos e ferramentas do mês', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/ferramentas/preco-de-venda/uso', { metodo: 'POST', corpo: { tipo: 'uso' } });
  await ambiente.chamar('/api/ferramentas/preco-de-venda/uso', { metodo: 'POST', corpo: { tipo: 'documento' } });
  await ambiente.chamar('/api/ferramentas/juntar-pdf/uso', { metodo: 'POST', corpo: { tipo: 'documento' } });

  const uso = await ambiente.chamar('/api/conta/uso-mensal');
  assert.equal(uso.status, 200);
  assert.equal(uso.corpo.documentos, 2);
  assert.equal(uso.corpo.ferramentas_usadas, 2);
  assert.match(uso.corpo.mes, /^\d{4}-\d{2}$/);
});

test('sem sessão, a conta responde 401', async (t) => {
  const ambiente = await subirComConta();
  t.after(() => ambiente.fechar());

  await ambiente.chamar('/api/autenticacao/sair', { metodo: 'POST' });
  const conta = await ambiente.chamar('/api/conta');
  assert.equal(conta.status, 401);
  assert.equal(conta.corpo.erro, 'sessao_necessaria');
});
