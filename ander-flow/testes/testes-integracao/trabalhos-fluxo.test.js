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
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-trabalhos-'));
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
  await usuario.chamar('/api/autenticacao/criar-conta', {
    metodo: 'POST',
    corpo: { nome: 'Teste', email, senha: SENHA, aceitou_termos: true },
  });
  return usuario;
}

test('cria, lista, edita e apaga um trabalho do próprio usuário', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'trabalhos-a@teste.dev');

  const criado = await usuario.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Meu cálculo', dados: { custo: 10 } },
  });
  assert.equal(criado.status, 201);
  assert.equal(criado.corpo.trabalho.situacao, 'em_aberto');
  assert.deepEqual(criado.corpo.trabalho.dados, { custo: 10 });

  const lista = await usuario.chamar('/api/trabalhos');
  assert.equal(lista.status, 200);
  assert.equal(lista.corpo.trabalhos.length, 1);
  assert.equal(lista.corpo.limite, 3);

  const id = criado.corpo.trabalho.id;
  const editado = await usuario.chamar(`/api/trabalhos/${id}`, {
    metodo: 'PATCH',
    corpo: { situacao: 'salvo', titulo: 'Meu cálculo salvo' },
  });
  assert.equal(editado.status, 200);
  assert.equal(editado.corpo.trabalho.situacao, 'salvo');
  assert.equal(editado.corpo.trabalho.titulo, 'Meu cálculo salvo');

  const filtrado = await usuario.chamar('/api/trabalhos?situacao=salvo');
  assert.equal(filtrado.corpo.trabalhos.length, 1);
  const filtradoVazio = await usuario.chamar('/api/trabalhos?situacao=em_aberto');
  assert.equal(filtradoVazio.corpo.trabalhos.length, 0);

  const apagado = await usuario.chamar(`/api/trabalhos/${id}`, { metodo: 'DELETE' });
  assert.equal(apagado.status, 204);
  const listaFinal = await usuario.chamar('/api/trabalhos');
  assert.equal(listaFinal.corpo.trabalhos.length, 0);
});

test('dados acima de 20 kB são recusados', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'trabalhos-b@teste.dev');

  const textoGrande = 'x'.repeat(21 * 1024);
  const resposta = await usuario.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Grande', dados: { texto: textoGrande } },
  });
  assert.equal(resposta.status, 400);
  assert.equal(resposta.corpo.erro, 'dados_invalidos');
  assert.equal(resposta.corpo.campos.dados, 'formato_invalido');
});

test('4º trabalho no plano grátis é bloqueado; com plus é aceito', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'trabalhos-c@teste.dev');

  for (let i = 0; i < 3; i += 1) {
    const resposta = await usuario.chamar('/api/trabalhos', {
      metodo: 'POST',
      corpo: { ferramenta_slug: 'preco-de-venda', titulo: `Trabalho ${i}`, dados: {} },
    });
    assert.equal(resposta.status, 201);
  }

  const quarto = await usuario.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Trabalho 4', dados: {} },
  });
  assert.equal(quarto.status, 403);
  assert.equal(quarto.corpo.erro, 'limite_do_plano');
  assert.equal(quarto.corpo.limite, 3);
  assert.equal(quarto.corpo.plano_necessario, 'plus');

  ambiente.banco.prepare("UPDATE usuarios SET plano = 'plus' WHERE email = ?").run('trabalhos-c@teste.dev');

  const comPlus = await usuario.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Trabalho 4 com plus', dados: {} },
  });
  assert.equal(comPlus.status, 201);
});

test('trabalho de outro usuário responde 404 ao editar, apagar ou ver', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const dona = await criarUsuario(ambiente.base, 'trabalhos-dona@teste.dev');
  const intrusa = await criarUsuario(ambiente.base, 'trabalhos-intrusa@teste.dev');

  const criado = await dona.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Só da dona', dados: {} },
  });
  const id = criado.corpo.trabalho.id;

  const listaIntrusa = await intrusa.chamar('/api/trabalhos');
  assert.equal(listaIntrusa.corpo.trabalhos.length, 0);

  const editarAlheio = await intrusa.chamar(`/api/trabalhos/${id}`, {
    metodo: 'PATCH',
    corpo: { titulo: 'Roubado' },
  });
  assert.equal(editarAlheio.status, 404);
  assert.equal(editarAlheio.corpo.erro, 'trabalho_inexistente');

  const apagarAlheio = await intrusa.chamar(`/api/trabalhos/${id}`, { metodo: 'DELETE' });
  assert.equal(apagarAlheio.status, 404);
});

test('sem sessão responde 401 e POST sem CSRF responde 403', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const usuario = await criarUsuario(ambiente.base, 'trabalhos-d@teste.dev');

  await usuario.chamar('/api/autenticacao/sair', { metodo: 'POST' });
  const semSessao = await usuario.chamar('/api/trabalhos');
  assert.equal(semSessao.status, 401);
  assert.equal(semSessao.corpo.erro, 'sessao_necessaria');

  const outroUsuario = await criarUsuario(ambiente.base, 'trabalhos-e@teste.dev');
  const semCsrf = await outroUsuario.chamar('/api/trabalhos', {
    metodo: 'POST',
    corpo: { ferramenta_slug: 'preco-de-venda', titulo: 'Sem CSRF', dados: {} },
    semCsrf: true,
  });
  assert.equal(semCsrf.status, 403);
  assert.equal(semCsrf.corpo.erro, 'csrf_invalido');
});
