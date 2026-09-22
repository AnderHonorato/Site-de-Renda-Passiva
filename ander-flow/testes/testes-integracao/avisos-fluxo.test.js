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
const UM_DIA_MS = 24 * 60 * 60 * 1000;

async function subirServidor() {
  const pastaExecucao = mkdtempSync(join(tmpdir(), 'ander-flow-avisos-'));
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

  async function chamar(caminho, { metodo = 'GET', corpo, semCsrf = false, idioma } = {}) {
    const cabecalhosCookie = idioma ? `${cookies}; idioma=${idioma}` : cookies;
    const cabecalhos = { 'Content-Type': 'application/json', Cookie: cabecalhosCookie };
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

function inserirAviso(banco, sobrescrever = {}) {
  const agora = new Date();
  const base = {
    tipo: 'sistema',
    publico: 'todos',
    titulo_pt_br: 'Título PT',
    titulo_en: 'Title EN',
    corpo_pt_br: 'Corpo PT',
    corpo_en: 'Body EN',
    link_url: null,
    link_rotulo_pt_br: null,
    link_rotulo_en: null,
    inicio_em: new Date(agora.getTime() - UM_DIA_MS).toISOString(),
    fim_em: null,
    ativo: 1,
  };
  const linha = { ...base, ...sobrescrever };
  const info = banco
    .prepare(
      `INSERT INTO avisos (
        tipo, publico, titulo_pt_br, titulo_en, corpo_pt_br, corpo_en,
        link_url, link_rotulo_pt_br, link_rotulo_en, inicio_em, fim_em, ativo
      ) VALUES (@tipo, @publico, @titulo_pt_br, @titulo_en, @corpo_pt_br, @corpo_en,
        @link_url, @link_rotulo_pt_br, @link_rotulo_en, @inicio_em, @fim_em, @ativo)`,
    )
    .run(linha);
  return info.lastInsertRowid;
}

test('lista avisos vigentes e compatíveis com o público, sem sessão', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  const idTodos = inserirAviso(ambiente.banco, { titulo_pt_br: 'Todos' });
  inserirAviso(ambiente.banco, { titulo_pt_br: 'Só plus', publico: 'plus' });
  const idAnonimo = inserirAviso(ambiente.banco, { titulo_pt_br: 'Só anônimos', publico: 'anonimos' });
  inserirAviso(ambiente.banco, {
    titulo_pt_br: 'Futuro',
    inicio_em: new Date(Date.now() + UM_DIA_MS).toISOString(),
  });
  inserirAviso(ambiente.banco, {
    titulo_pt_br: 'Já terminou',
    fim_em: new Date(Date.now() - UM_DIA_MS).toISOString(),
  });

  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/api/avisos');
  assert.equal(resposta.status, 200);
  const ids = resposta.corpo.avisos.map((aviso) => aviso.id);
  assert.ok(ids.includes(idTodos));
  assert.ok(ids.includes(idAnonimo));
  assert.equal(ids.length, 2);
  assert.equal(resposta.corpo.avisos.every((aviso) => aviso.lido === false), true);
});

test('aviso "plus" não aparece para usuário grátis, mas aparece para plus', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const idPlus = inserirAviso(ambiente.banco, { titulo_pt_br: 'Recurso plus', publico: 'plus' });
  const usuario = await criarUsuario(ambiente.base, 'avisos-a@teste.dev');

  const gratis = await usuario.chamar('/api/avisos');
  assert.equal(gratis.corpo.avisos.some((aviso) => aviso.id === idPlus), false);

  ambiente.banco.prepare("UPDATE usuarios SET plano = 'plus' WHERE email = ?").run('avisos-a@teste.dev');
  const plus = await usuario.chamar('/api/avisos');
  assert.equal(plus.corpo.avisos.some((aviso) => aviso.id === idPlus), true);
});

test('idioma en devolve título e corpo em inglês', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  inserirAviso(ambiente.banco, { titulo_pt_br: 'Em português', titulo_en: 'In English' });

  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/api/avisos', { idioma: 'en' });
  assert.equal(resposta.corpo.avisos[0].titulo, 'In English');
});

test('marcar um aviso como lido e marcar todos exigem sessão', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const id1 = inserirAviso(ambiente.banco, { titulo_pt_br: 'Um' });
  const id2 = inserirAviso(ambiente.banco, { titulo_pt_br: 'Dois' });
  const usuario = await criarUsuario(ambiente.base, 'avisos-b@teste.dev');

  const semSessaoVisitante = await abrirSessao(ambiente.base);
  const semSessao = await semSessaoVisitante.chamar(`/api/avisos/${id1}/lido`, { metodo: 'POST' });
  assert.equal(semSessao.status, 401);

  const marcarUm = await usuario.chamar(`/api/avisos/${id1}/lido`, { metodo: 'POST' });
  assert.equal(marcarUm.status, 204);

  let lista = await usuario.chamar('/api/avisos');
  assert.equal(lista.corpo.nao_lidos, 1);
  assert.equal(lista.corpo.avisos.find((a) => a.id === id1).lido, true);
  assert.equal(lista.corpo.avisos.find((a) => a.id === id2).lido, false);

  const marcarTodos = await usuario.chamar('/api/avisos/marcar-todos', { metodo: 'POST' });
  assert.equal(marcarTodos.status, 204);

  lista = await usuario.chamar('/api/avisos');
  assert.equal(lista.corpo.nao_lidos, 0);
});

test('popup devolve o mais recente vigente do tipo popup', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());

  inserirAviso(ambiente.banco, {
    tipo: 'popup',
    titulo_pt_br: 'Popup antigo',
    inicio_em: new Date(Date.now() - 3 * UM_DIA_MS).toISOString(),
  });
  const idRecente = inserirAviso(ambiente.banco, {
    tipo: 'popup',
    titulo_pt_br: 'Popup recente',
    inicio_em: new Date(Date.now() - UM_DIA_MS).toISOString(),
  });
  inserirAviso(ambiente.banco, {
    tipo: 'popup',
    titulo_pt_br: 'Popup inativo',
    ativo: 0,
    inicio_em: new Date(Date.now() - UM_DIA_MS / 2).toISOString(),
  });

  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/api/avisos/popup');
  assert.equal(resposta.status, 200);
  assert.equal(resposta.corpo.aviso.id, idRecente);
});

test('sem popup vigente devolve null', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const visitante = await abrirSessao(ambiente.base);
  const resposta = await visitante.chamar('/api/avisos/popup');
  assert.equal(resposta.corpo.aviso, null);
});

test('marcar como lido sem CSRF responde 403', async (t) => {
  const ambiente = await subirServidor();
  t.after(() => ambiente.fechar());
  const id = inserirAviso(ambiente.banco);
  const usuario = await criarUsuario(ambiente.base, 'avisos-c@teste.dev');

  const resposta = await usuario.chamar(`/api/avisos/${id}/lido`, { metodo: 'POST', semCsrf: true });
  assert.equal(resposta.status, 403);
  assert.equal(resposta.corpo.erro, 'csrf_invalido');
});
